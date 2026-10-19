// 认证路由：注册 / 登录 / 退出 / 当前用户 / 验证码
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const config = require('../config');
const { pool } = require('../db');
const { auth, extractToken } = require('../middleware/auth');
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
    return { id: u.id, username: u.username, role: u.role, created_at: u.created_at };
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
    const password = String(req.body.password || '');

    if (!/^[\w\u4e00-\u9fa5]{3,20}$/.test(username)) {
        return res.status(400).json({ ok: false, error: '用户名需为 3-20 位中文、字母、数字或下划线' });
    }
    if (password.length < 8) {
        return res.status(400).json({ ok: false, error: '密码至少需要 8 位' });
    }
    if (!verifyCaptcha(req.body.captcha)) {
        return res.status(400).json({ ok: false, error: '验证码不正确' });
    }

    try {
        const hash = await bcrypt.hash(password, 10);   // 异步，不阻塞事件循环
        const [r] = await pool.query(
            'INSERT INTO users (username, password_hash) VALUES (?, ?)', [username, hash]
        );
        const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [r.insertId]);
        const user = rows[0];
        const token = sign(user);
        setAuthCookie(res, token, user.username);
        res.json({ ok: true, token, user: publicUser(user) });
    } catch (e) {
        if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ ok: false, error: '该用户名已被注册' });
        throw e;
    }
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
    res.json({ ok: true, user: { id: req.user.id, username: req.user.username, role: req.user.role } });
});

module.exports = router;
