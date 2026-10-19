// 宇宙新闻：公开读取（数据库记录，支持标签 / 关键词搜索 / 时间范围 / 排序）
const express = require('express');
const { pool } = require('../db');
const wrap = require('../asyncRoute');

const router = express.Router();

router.get('/news', wrap(async (req, res) => {
    const { tag, limit, since, q, days, sort } = req.query;
    const where = [];
    const args = [];

    if (tag && tag !== 'all') { where.push('tag = ?'); args.push(tag); }

    // 关键词搜索：标题 / 摘要 / 来源 / 标签
    const kw = String(q || '').trim().slice(0, 50);
    if (kw) {
        const like = '%' + kw.replace(/[%_]/g, m => '\\' + m) + '%';
        where.push('(title LIKE ? OR summary LIKE ? OR source LIKE ? OR tag LIKE ?)');
        args.push(like, like, like, like);
    }

    // 时间范围：最近 N 天
    const d = Number(days);
    if (d > 0 && d <= 3650) {
        where.push('published_at >= DATE_SUB(NOW(), INTERVAL ? DAY)');
        args.push(d);
    }

    if (since) { where.push('updated_at > ?'); args.push(since); }

    let sql = 'SELECT id, tag, title, summary, img, source, source_url, is_top, published_at, updated_at FROM news';
    if (where.length) sql += ' WHERE ' + where.join(' AND ');
    sql += sort === 'old'
        ? ' ORDER BY is_top DESC, published_at ASC'
        : ' ORDER BY is_top DESC, published_at DESC';
    sql += ' LIMIT ' + Math.min(Number(limit) || 100, 200);

    const [rows] = await pool.query(sql, args);
    const [tags] = await pool.query('SELECT tag, COUNT(*) AS c FROM news GROUP BY tag ORDER BY c DESC');
    const [[tot]] = await pool.query('SELECT COUNT(*) AS n FROM news');

    res.json({
        ok: true,
        total: tot.n,
        matched: rows.length,
        tags,
        rows,
        query: { tag: tag || 'all', q: kw, days: d > 0 ? d : 0, sort: sort === 'old' ? 'old' : 'new' },
        serverTime: new Date().toISOString()
    });
}));

module.exports = router;
