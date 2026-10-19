// 留言板：浏览公开，发布需登录
const express = require('express');
const { pool } = require('../db');
const { auth } = require('../middleware/auth');
const wrap = require('../asyncRoute');

const router = express.Router();

router.get('/messages', wrap(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const per = 10;
    const [[{ c }]] = await pool.query('SELECT COUNT(*) AS c FROM messages');
    const [rows] = await pool.query(
        'SELECT id, username, content, created_at FROM messages ORDER BY id DESC LIMIT ? OFFSET ?',
        [per, (page - 1) * per]
    );
    res.json({ ok: true, rows, total: c, pages: Math.max(1, Math.ceil(c / per)), page });
}));

router.post('/messages', auth, wrap(async (req, res) => {
    const content = String(req.body.content || '').trim();
    if (!content) return res.status(400).json({ ok: false, error: '留言内容不能为空' });
    if (content.length > 500) return res.status(400).json({ ok: false, error: '留言最多 500 字' });
    await pool.query(
        'INSERT INTO messages (user_id, username, content) VALUES (?, ?, ?)',
        [req.user.id, req.user.username, content]
    );
    res.json({ ok: true });
}));

module.exports = router;
