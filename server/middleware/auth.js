// 认证中间件：优先 httpOnly Cookie，其次 Authorization Bearer
// 每次请求都从数据库读取最新角色 —— 管理员改权限后立即生效，无需重新登录
const jwt = require('jsonwebtoken');
const config = require('../config');
const { pool } = require('../db');

function extractToken(req) {
    const c = req.cookies && req.cookies[config.cookieName];
    if (c) return c;
    const h = req.headers.authorization || '';
    return h.startsWith('Bearer ') ? h.slice(7) : '';
}

async function auth(req, res, next) {
    const token = extractToken(req);
    if (!token) return res.status(401).json({ ok: false, error: 'unauthorized' });

    let payload;
    try {
        payload = jwt.verify(token, config.jwtSecret);
    } catch (e) {
        return res.status(401).json({ ok: false, error: 'unauthorized' });
    }

    try {
        const [rows] = await pool.query(
            'SELECT id, username, email, role, token_version FROM users WHERE id = ?', [payload.id]
        );
        if (!rows.length) return res.status(401).json({ ok: false, error: 'unauthorized' });
        // 令牌版本校验：退出登录后旧 token 立即失效
        const u = rows[0];
        if ((payload.tv || 0) !== (u.token_version || 0)) {
            return res.status(401).json({ ok: false, error: 'unauthorized' });
        }
        req.user = { id: u.id, username: u.username, email: u.email || '', role: u.role };
        next();
    } catch (e) {
        next(e);
    }
}

function admin(req, res, next) {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ ok: false, error: 'forbidden' });
    }
    next();
}

module.exports = { auth, admin, extractToken };
