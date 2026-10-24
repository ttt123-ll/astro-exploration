// 认证路由：注册 / 登录 / 退出 / 当前用户 / 验证码
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const config = require('../config');
const { pool } = require('../db');
const { auth, extractToken } = require('../middleware/auth');
const { sendCodeMail } = require('../mailer');
const log = require('../logger');
const { authLimiter } = require('../middleware/security');
const wrap = require('../asyncRoute');

const router = express.Router();

function sign(user) {
    return jwt.sign(
        { id: user.id, username: user.username, tv: user.token_version || 0 },
        config.jwtSecret,
        { expiresIn: config.jwtExpires }
    );
}

function publicUser(u) {
    return { id: u.id, username: u.username, email: u.email || '', role: u.role, created_at: u.created_at };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
function normalizeEmail(v) { return String(v || '').trim().toLowerCase(); }
/* 验证码 HMAC 哈希存储：数据库泄露也无法直接反推验证码 */
function codeHash(code) {
    return crypto.createHmac('sha256', config.jwtSecret).update('mail-code:' + code).digest('hex');
}
function genCode() {
    return String(crypto.randomInt(100000, 1000000));
}

function setAuthCookie(res, token, username) {
    res.cookie(config.cookieName, token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: config.cookieSecure,
        maxAge: 7 * 24 * 3600 * 1000,
        path: '/'
    });
    // 仅作"是否可能已登录"的提示，避免游客每页都发 401 请求；不含任何凭据
    res.cookie('astro_uid', String(username || ''), {
        httpOnly: false,
        sameSite: 'lax',
        secure: config.cookieSecure,
        maxAge: 7 * 24 * 3600 * 1000,
        path: '/'
    });
}

/* 简单算术验证码（防脚本批量注册） */
function captchaToken(a, b) {
    return crypto.createHmac('sha256', config.jwtSecret).update(a + '+' + b).digest('hex').slice(0, 12);
}

router.get('/captcha', (req, res) => {
    const a = 2 + Math.floor(Math.random() * 8);
    const b = 1 + Math.floor(Math.random() * 8);
    res.json({ ok: true, a, b, t: captchaToken(a, b) });
});

function verifyCaptcha(c) {
    if (!c) return false;
    const a = Number(c.a), b = Number(c.b), ans = Number(c.answer);
    if (!Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(ans)) return false;
    if (ans !== a + b) return false;
    return c.t === captchaToken(a, b);
}

/* 注册 */
router.post('/register', authLimiter, wrap(async (req, res) => {
    const username = String(req.body.username || '').trim();
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || '');

    if (!/^[\w\u4e00-\u9fa5]{3,20}$/.test(username)) {
        return res.status(400).json({ ok: false, error: '用户名需为 3-20 位中文、字母、数字或下划线' });
    }
    if (!EMAIL_RE.test(email)) {
        return res.status(400).json({ ok: false, error: '请填写正确的邮箱地址（用于找回密码）' });
    }
    if (password.length < 8) {
        return res.status(400).json({ ok: false, error: '密码至少需要 8 位' });
    }
    if (!verifyCaptcha(req.body.captcha)) {
        return res.status(400).json({ ok: false, error: '验证码不正确' });
    }

    try {
        const hash = await bcrypt.hash(password, 10);   // 异步，不阻塞事件循环
        const [exist] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
        if (exist.length) return res.status(409).json({ ok: false, error: '该邮箱已被其他账号绑定' });
        const [r] = await pool.query(
            'INSERT INTO users (username, password_hash, email) VALUES (?, ?, ?)', [username, hash, email]
        );
        const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [r.insertId]);
        const user = rows[0];
        const token = sign(user);
        setAuthCookie(res, token, user.username);
        res.json({ ok: true, token, user: publicUser(user) });
    } catch (e) {
        if (e.code === 'ER_DUP_ENTRY') {
            const msg = /email/.test(e.sqlMessage || '') ? '该邮箱已被其他账号绑定' : '该用户名已被注册';
            return res.status(409).json({ ok: false, error: msg });
        }
        throw e;
    }
}));

/* 忘记密码：校验邮箱是否已注册，并生成 6 位验证码（页面弹窗展示） */
router.post('/forgot-password', authLimiter, wrap(async (req, res) => {
    const email = normalizeEmail(req.body.email);
    if (!EMAIL_RE.test(email)) {
        return res.status(400).json({ ok: false, error: '请输入正确的邮箱地址' });
    }

    const [users] = await pool.query('SELECT id, username, email FROM users WHERE email = ?', [email]);
    const user = users[0];
    /* 按需求：未找到对应邮箱时明确提示「没有该用户」 */
    if (!user) return res.status(404).json({ ok: false, error: '没有该用户' });

    const [[last]] = await pool.query(
        'SELECT created_at FROM password_resets WHERE email = ? ORDER BY id DESC LIMIT 1', [email]
    );
    if (last && Date.now() - new Date(last.created_at).getTime() < 60 * 1000) {
        return res.status(429).json({ ok: false, error: '验证码已生成，请 60 秒后再获取' });
    }

    const code = genCode();
    const expires = new Date(Date.now() + 10 * 60 * 1000);
    await pool.query(
        'INSERT INTO password_resets (user_id, email, code_hash, expires_at) VALUES (?, ?, ?, ?)',
        [user.id, email, codeHash(code), expires]
    );
    await pool.query('DELETE FROM password_resets WHERE expires_at < DATE_SUB(NOW(), INTERVAL 1 DAY)');

    /* 可选增强：配置了 SMTP 时同时真实发信（不影响页面弹窗展示验证码） */
    if (config.mail.enabled) {
        try {
            await sendCodeMail(email, code, 'reset');
        } catch (e) {
            log.error('forgot_mail_failed', { email, message: e.message });
        }
    }

    res.json({
        ok: true,
        code,
        expiresIn: 600,
        message: '验证码已生成，请按弹窗提示完成验证（10 分钟内有效）'
    });
}));

/* 重置密码：校验邮箱验证码后更新密码 */
router.post('/reset-password', authLimiter, wrap(async (req, res) => {
    const email = normalizeEmail(req.body.email);
    const code = String(req.body.code || '').trim();
    const password = String(req.body.password || '');

    if (!EMAIL_RE.test(email)) return res.status(400).json({ ok: false, error: '请输入正确的邮箱地址' });
    if (!/^\d{6}$/.test(code)) return res.status(400).json({ ok: false, error: '验证码为 6 位数字' });
    if (password.length < 8) return res.status(400).json({ ok: false, error: '密码至少需要 8 位' });

    const [rows] = await pool.query(
        'SELECT * FROM password_resets WHERE email = ? AND used = 0 ORDER BY id DESC LIMIT 1', [email]
    );
    const rec = rows[0];
    if (!rec) return res.status(400).json({ ok: false, error: '验证码已失效，请重新获取' });
    if (new Date(rec.expires_at).getTime() < Date.now()) {
        return res.status(400).json({ ok: false, error: '验证码已过期，请重新获取' });
    }
    if (rec.attempts >= 5) {
        return res.status(429).json({ ok: false, error: '尝试次数过多，请重新获取验证码' });
    }
    if (rec.code_hash !== codeHash(code)) {
        await pool.query('UPDATE password_resets SET attempts = attempts + 1 WHERE id = ?', [rec.id]);
        return res.status(400).json({ ok: false, error: '验证码不正确' });
    }

    /* 新密码不能与原密码相同 */
    const [[cur]] = await pool.query('SELECT password_hash FROM users WHERE id = ?', [rec.user_id]);
    if (cur && await bcrypt.compare(password, cur.password_hash)) {
        return res.status(400).json({ ok: false, error: '新密码不能与原密码相同' });
    }

    const hash = await bcrypt.hash(password, 10);
    await pool.query('UPDATE users SET password_hash = ?, token_version = token_version + 1 WHERE id = ?', [hash, rec.user_id]);
    await pool.query('UPDATE password_resets SET used = 1 WHERE id = ?', [rec.id]);
    log.info('password_reset', { email });
    res.json({ ok: true, message: '密码修改成功，请使用新密码登录' });
}));

/* 登录 */
router.post('/login', authLimiter, wrap(async (req, res) => {
    const username = String(req.body.username || '').trim();
    const password = String(req.body.password || '');

    const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
    const user = rows[0];
    const ok = user ? await bcrypt.compare(password, user.password_hash) : false;
    if (!ok) return res.status(401).json({ ok: false, error: '用户名或密码错误' });

    const token = sign(user);
    setAuthCookie(res, token, user.username);
    res.json({ ok: true, token, user: publicUser(user) });
}));

/* 退出：服务端令牌版本 +1（旧 token 立即失效），并清除 Cookie */
router.post('/logout', wrap(async (req, res) => {
    const token = extractToken(req);
    if (token) {
        try {
            const payload = jwt.verify(token, config.jwtSecret);
            await pool.query('UPDATE users SET token_version = token_version + 1 WHERE id = ?', [payload.id]);
        } catch (e) { /* token 已无效则忽略 */ }
    }
    res.clearCookie(config.cookieName, { path: '/' });
    res.clearCookie('astro_uid', { path: '/' });
    res.json({ ok: true });
}));

/* 当前用户 */
router.get('/me', auth, (req, res) => {
    res.json({ ok: true, user: { id: req.user.id, username: req.user.username, email: req.user.email || '', role: req.user.role } });
});

module.exports = router;
