// 后台管理：概览 / 用户 / 成绩 / 留言 / 新闻
const express = require('express');
const { pool } = require('../db');
const { auth, admin } = require('../middleware/auth');
const wrap = require('../asyncRoute');

const router = express.Router();
router.use('/admin', auth, admin);

/* 概览统计 */
router.get('/admin/overview', wrap(async (req, res) => {
    const [[users]] = await pool.query('SELECT COUNT(*) AS c FROM users');
    const [[scores]] = await pool.query('SELECT COUNT(*) AS c FROM scores');
    const [[messages]] = await pool.query('SELECT COUNT(*) AS c FROM messages');
    const [[visits]] = await pool.query('SELECT COUNT(*) AS c FROM visits');
    const [[today]] = await pool.query('SELECT COUNT(*) AS c FROM visits WHERE DATE(created_at) = CURDATE()');
    const [[ips]] = await pool.query('SELECT COUNT(DISTINCT ip) AS c FROM visits');
    const [trend] = await pool.query(
        `SELECT DATE_FORMAT(created_at, '%m-%d') AS day, COUNT(*) AS c
         FROM visits WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
         GROUP BY day ORDER BY day`
    );
    const [pages] = await pool.query(
        'SELECT path, COUNT(*) AS c FROM visits GROUP BY path ORDER BY c DESC LIMIT 10'
    );
    res.json({
        ok: true,
        stats: {
            users: users.c, scores: scores.c, messages: messages.c,
            visits_total: visits.c, visits_today: today.c, ips: ips.c
        },
        trend,
        pages
    });
}));

/* 用户列表 */
router.get('/admin/users', wrap(async (req, res) => {
    const [rows] = await pool.query('SELECT id, username, role, created_at FROM users ORDER BY id');
    res.json({ ok: true, rows });
}));

/* 成绩列表 */
router.get('/admin/scores', wrap(async (req, res) => {
    const [rows] = await pool.query(
        `SELECT s.id, s.category, s.pct, s.correct, s.total, s.created_at, u.username
         FROM scores s JOIN users u ON u.id = s.user_id ORDER BY s.id DESC LIMIT 50`
    );
    res.json({ ok: true, rows });
}));

/* 删除用户（连带其成绩与留言），用于清理论坛/测试产生的账号 */
router.delete('/admin/users/:id', wrap(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ ok: false, error: '无效的用户 ID' });
    // 不能删除自己，也不能删除管理员账号，避免把自己锁在门外
    if (id === req.user.id) return res.status(400).json({ ok: false, error: '不能删除当前登录账号' });

    const [[target]] = await pool.query('SELECT id, username, role FROM users WHERE id = ?', [id]);
    if (!target) return res.status(404).json({ ok: false, error: '用户不存在' });
    if (target.role === 'admin') return res.status(400).json({ ok: false, error: '不能删除管理员账号' });

    // 先清关联数据再删用户，保证没有孤儿记录
    await pool.query('DELETE FROM scores WHERE user_id = ?', [id]);
    await pool.query('DELETE FROM messages WHERE user_id = ?', [id]);
    await pool.query('DELETE FROM users WHERE id = ?', [id]);

    res.json({ ok: true, deleted: { id, username: target.username } });
}));

router.delete('/admin/scores/:id', wrap(async (req, res) => {
    await pool.query('DELETE FROM scores WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
}));

/* 留言管理 */
router.get('/admin/messages', wrap(async (req, res) => {
    const [rows] = await pool.query('SELECT * FROM messages ORDER BY id DESC LIMIT 50');
    res.json({ ok: true, rows });
}));

router.delete('/admin/messages/:id', wrap(async (req, res) => {
    await pool.query('DELETE FROM messages WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
}));

/* 新闻管理 */
router.post('/admin/news', wrap(async (req, res) => {
    const { tag, title, summary, img, source, source_url, is_top } = req.body || {};
    if (!title || !String(title).trim()) return res.status(400).json({ ok: false, msg: '标题不能为空' });
    if (!summary || !String(summary).trim()) return res.status(400).json({ ok: false, msg: '摘要不能为空' });

    const [r] = await pool.query(
        `INSERT INTO news (tag, title, summary, img, source, source_url, is_top, published_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
            String(tag || '深空探测').slice(0, 30),
            String(title).slice(0, 200),
            String(summary),
            String(img || '/assets/images/milky_way.jpg').slice(0, 300),
            String(source || '本站整理').slice(0, 100),
            String(source_url || '').slice(0, 300),
            is_top ? 1 : 0
        ]
    );
    res.json({ ok: true, id: r.insertId });
}));

router.put('/admin/news/:id', wrap(async (req, res) => {
    const { tag, title, summary, img, source, source_url, is_top } = req.body || {};
    const [r] = await pool.query(
        `UPDATE news SET tag = ?, title = ?, summary = ?, img = ?, source = ?, source_url = ?, is_top = ?
         WHERE id = ?`,
        [
            String(tag || '深空探测').slice(0, 30),
            String(title || '').slice(0, 200),
            String(summary || ''),
            String(img || '').slice(0, 300),
            String(source || '本站整理').slice(0, 100),
            String(source_url || '').slice(0, 300),
            is_top ? 1 : 0,
            req.params.id
        ]
    );
    res.json({ ok: true, changed: r.affectedRows });
}));

router.delete('/admin/news/:id', wrap(async (req, res) => {
    await pool.query('DELETE FROM news WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
}));

module.exports = router;
