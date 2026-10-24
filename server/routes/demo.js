// 演示模式（DEMO_MODE=1）降级接口：不依赖 MySQL，保证所有页面可浏览
const express = require('express');
const newsSeed = require('../newsSeed');

const router = express.Router();
const DEMO_MSG = '演示模式未启用账号 / 数据库功能，可直接浏览全部页面并使用 AI 助手';

function normalizeNews(n) {
    return {
        id: n.id || n.title,
        tag: n.tag || '天文',
        title: n.title,
        summary: n.summary || '',
        img: n.img || '',
        source: n.source || '',
        source_url: n.source_url || '',
        is_top: n.is_top ? 1 : 0,
        published_at: n.published_at || new Date().toISOString(),
        updated_at: n.updated_at || n.published_at || new Date().toISOString()
    };
}

const NEWS = newsSeed.map(normalizeNews);

/* 新闻：用内置种子数据 */
router.get('/news', (req, res) => {
    const tag = req.query.tag && req.query.tag !== 'all' ? String(req.query.tag) : '';
    const q = String(req.query.q || '').trim();
    let rows = NEWS.slice();
    if (tag) rows = rows.filter(n => n.tag === tag);
    if (q) rows = rows.filter(n => (n.title + n.summary + n.source).includes(q));
    rows.sort((a, b) => (b.is_top - a.is_top) || String(b.published_at).localeCompare(String(a.published_at)));
    const limit = Math.min(Number(req.query.limit) || 100, 200);
    rows = rows.slice(0, limit);
    const tagMap = new Map();
    NEWS.forEach(n => tagMap.set(n.tag, (tagMap.get(n.tag) || 0) + 1));
    res.json({
        ok: true,
        demo: true,
        total: NEWS.length,
        matched: rows.length,
        tags: [...tagMap].map(([tag, c]) => ({ tag, c })),
        rows,
        query: { tag: req.query.tag || 'all', q, days: 0, sort: req.query.sort === 'old' ? 'old' : 'new' }
    });
});

/* 账号：只读游客态 */
router.get('/me', (req, res) => res.json({ ok: true, demo: true, user: null }));
router.post('/logout', (req, res) => res.json({ ok: true, demo: true }));
router.all(['/login', '/register', '/forgot-password', '/reset-password'], (req, res) => res.status(200).json({ ok: false, demo: true, error: DEMO_MSG }));
router.get('/captcha', (req, res) => res.json({ ok: false, demo: true, error: DEMO_MSG }));

/* 社区数据：空列表 + 提示 */
const emptyList = (req, res) => res.json({ ok: true, demo: true, total: 0, rows: [], list: [], items: [], message: DEMO_MSG });
['/scores', '/leaderboard', '/my-scores', '/messages'].forEach(path => router.get(path, emptyList));

/* 管理后台：演示模式不可用 */
router.use('/admin', (req, res) => res.status(401).json({ ok: false, demo: true, error: DEMO_MSG }));

/* 访问统计：直接成功 */
router.post('/visit', (req, res) => res.json({ ok: true, demo: true }));

module.exports = router;
