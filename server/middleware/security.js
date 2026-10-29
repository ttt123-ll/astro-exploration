// 安全中间件：helmet 安全头、CORS 白名单、限流、请求日志
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const config = require('../config');
const log = require('../logger');

/* CORS：默认只允许同源；配置了 CORS_ORIGINS 才放行白名单 */
function corsMiddleware() {
    const origins = config.corsOrigins;
    if (!origins.length) {
        // 同源部署（Express 同时托管前端）：不开启跨域
        return (req, res, next) => next();
    }
    return cors({
        origin: origins,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
    });
}

/* 安全响应头 */
function helmetMiddleware() {
    return helmet({
        contentSecurityPolicy: {
            useDefaults: true,
            directives: {
                'default-src': ["'self'"],
                'img-src': ["'self'", 'data:', 'blob:'],
                'media-src': ["'self'", 'blob:', 'data:'],
                'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
                'script-src': ["'self'"],
                'font-src': ["'self'", 'data:', 'https://fonts.gstatic.com'],
                'connect-src': ["'self'"],
                'manifest-src': ["'self'"],
                'worker-src': ["'self'"],
                'frame-ancestors': ["'self'"],
                // 手机通过局域网 http://<IP>:3001 访问时，浏览器会把子资源强制升级到 https
                // （局域网无证书 → ERR_SSL_PROTOCOL_ERROR，整站白屏）。
                // 关闭 helmet 默认的 upgrade-insecure-requests；生产强制 HTTPS 可交给反向代理 301。
                'upgrade-insecure-requests': null
            }
        },
        crossOriginEmbedderPolicy: false,
        crossOriginResourcePolicy: { policy: 'same-origin' }
    });
}

/* 限流器实例（必须在启动时创建一次，不能放进请求里） */
const globalLimiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { ok: false, error: '请求过于频繁，请稍后再试' }
});

const authLimiter = rateLimit({
    windowMs: config.rateLimit.windowMs * 5,
    max: config.rateLimit.authMax,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    message: { ok: false, error: '尝试次数过多，请 5 分钟后再试' }
});

/* 访问日志 */
function accessLog() {
    return (req, res, next) => {
        const t0 = process.hrtime.bigint();
        res.on('finish', () => {
            const ms = Number(process.hrtime.bigint() - t0) / 1e6;
            if (req.path.startsWith('/api/')) log.request(req, res, Math.round(ms));
        });
        next();
    };
}

module.exports = { corsMiddleware, helmetMiddleware, globalLimiter, authLimiter, accessLog };
