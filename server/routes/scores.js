// 成绩与排行榜：名次口径与排行榜排序完全一致
const express = require('express');
const { pool } = require('../db');
const { auth } = require('../middleware/auth');
const wrap = require('../asyncRoute');

const router = express.Router();
const CATS = ['all', 'solar', 'star', 'bh', 'cosmos'];

/* 统一排序口径：正确率 → 答对题数 → 用时短 → 提交早 */

/* 同一口径下的名次：统计"排在我前面"的记录数（rank 是 MySQL 8 保留字，别名用 rank_no） */
const RANK_SQL = `
    SELECT COUNT(*) + 1 AS rank_no FROM scores
    WHERE category = ? AND id <> ?
      AND (
        pct > ?
        OR (pct = ? AND correct > ?)
        OR (pct = ? AND correct = ? AND duration_sec < ?)
        OR (pct = ? AND correct = ? AND duration_sec = ? AND id < ?)
      )
`;

router.post('/scores', auth, wrap(async (req, res) => {
    const category = CATS.includes(req.body.category) ? req.body.category : 'all';
    const total = Math.max(1, Math.min(Number(req.body.total) || 1, 200));
    const correct = Math.max(0, Math.min(Number(req.body.correct) || 0, total));
    const duration = Math.max(0, Math.min(Number(req.body.duration_sec) || 0, 86400));
    const pct = Math.round((correct / total) * 100);

    const [r] = await pool.query(
        'INSERT INTO scores (user_id, category, total, correct, pct, duration_sec) VALUES (?, ?, ?, ?, ?, ?)',
        [req.user.id, category, total, correct, pct, duration]
    );

    // 名次：限定同一 category，与排行榜排序口径一致
    const p = [category, r.insertId, pct, pct, correct, pct, correct, duration, pct, correct, duration, r.insertId];
    const [rankRows] = await pool.query(RANK_SQL, p);
    const [[players]] = await pool.query(
        'SELECT COUNT(DISTINCT user_id) AS c FROM scores WHERE category = ?', [category]
    );

    res.json({ ok: true, rank: rankRows[0].rank_no, players: players.c, category });
}));

/* 排行榜：每个分类（含 all）只看该分类的成绩，与名次算法完全一致 */
router.get('/leaderboard', wrap(async (req, res) => {
    const cat = CATS.includes(req.query.cat) ? req.query.cat : 'all';
    const [rows] = await pool.query(
        `SELECT s.id, s.category, s.total, s.correct, s.pct, s.duration_sec, s.created_at, u.username
         FROM scores s JOIN users u ON u.id = s.user_id
         WHERE s.category = ?
         ORDER BY s.pct DESC, s.correct DESC, s.duration_sec ASC, s.id ASC
         LIMIT 100`, [cat]
    );
    res.json({ ok: true, rows, cat });
}));

router.get('/my-scores', auth, wrap(async (req, res) => {
    const [rows] = await pool.query(
        'SELECT * FROM scores WHERE user_id = ? ORDER BY id DESC LIMIT 20', [req.user.id]
    );
    res.json({ ok: true, rows });
}));

module.exports = router;
