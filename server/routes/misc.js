// 健康检查 & 访问统计
const express = require('express');
const { pool } = require('../db');
const wrap = require('../asyncRoute');
const log = require('../logger');

const router = express.Router();
const startedAt = Date.now();

router.get('/health', wrap(async (req, res) => {
    // 演示模式不依赖数据库，健康检查直接通过
    if (require('../config').demoMode) {
        return res.json({
            ok: true,
            status: 'healthy',
            mode: 'demo',
            db: 'disabled',
            uptime: Math.round(process.uptime()),
            version: require('../../package.json').version,
            time: new Date().toISOString()
        });
    }
    let db = 'down';
    try {
        const [r] = await pool.query('SELECT 1 AS ok');
        db = r[0].ok === 1 ? 'up' : 'down';
    } catch (e) {
        log.error('health.db_failed', { message: e.message });
    }
    const ok = db === 'up';
    res.status(ok ? 200 : 503).json({
        ok,
        status: ok ? 'healthy' : 'degraded',
        db,
        uptime: Math.floor((Date.now() - startedAt) / 1000),
        version: process.env.APP_VERSION || '1.0.0',
        time: new Date().toISOString()
    });
}));

router.post('/visit', wrap(async (req, res) => {
    const path = String(req.body.path || '/').slice(0, 200);
    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].slice(0, 45);
    await pool.query('INSERT INTO visits (path, ip) VALUES (?, ?)', [path, ip]);
    res.json({ ok: true });
}));

module.exports = router;
