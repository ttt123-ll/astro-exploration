// Express 应用装配：安全中间件 → 路由 → 静态托管（含 brotli/gzip 预压缩与缓存策略）
const express = require('express');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const path = require('path');
const fs = require('fs');
const log = require('./logger');
const { corsMiddleware, helmetMiddleware, globalLimiter, accessLog } = require('./middleware/security');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(helmetMiddleware());
app.use(corsMiddleware());
app.use(accessLog());
app.use(compression({ threshold: 1024 }));
app.use(express.json({ limit: '64kb' }));
app.use(cookieParser());

// ---------------- API ----------------
// 限流只作用于 API：静态资源（JS/CSS/图片/视频）不计数，否则正常浏览几页就会 429
app.use('/api', globalLimiter);
app.use('/api', require('./routes/auth'));
app.use('/api', require('./routes/scores'));
app.use('/api', require('./routes/messages'));
app.use('/api', require('./routes/news'));
app.use('/api', require('./routes/chat'));
app.use('/api', require('./routes/admin'));
app.use('/api', require('./routes/misc'));

app.use('/api', (req, res) => res.status(404).json({ ok: false, error: 'not_found' }));

// ---------------- 静态资源 ----------------
const distDir = path.join(__dirname, '..', 'client', 'dist');
const INDEX = path.join(distDir, 'index.html');

const MIME = {
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.txt': 'text/plain; charset=utf-8',
    '.xml': 'application/xml; charset=utf-8',
    '.webmanifest': 'application/manifest+json'
};

/* 预压缩文件直出：优先 .br，其次 .gz */
function precompressed(root) {
    return (req, res, next) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') return next();
        const ext = path.extname(req.path);
        if (!MIME[ext]) return next();

        const accept = req.headers['accept-encoding'] || '';
        const variants = [];
        if (/\bbr\b/.test(accept)) variants.push('.br');
        if (/\bgzip\b/.test(accept)) variants.push('.gz');
        if (!variants.length) return next();

        const rel = decodeURIComponent(req.path).replace(/^\/+/, '');
        for (const v of variants) {
            const file = path.join(root, rel + v);
            if (!file.startsWith(root)) return next();
            let st;
            try { st = fs.statSync(file); } catch (e) { continue; }
            if (!st.isFile()) continue;

            const hashed = /\/assets\//.test(req.path);
            res.writeHead(200, {
                'Content-Type': MIME[ext],
                'Content-Encoding': v === '.br' ? 'br' : 'gzip',
                'Content-Length': st.size,
                Vary: 'Accept-Encoding',
                'Cache-Control': hashed
                    ? 'public, max-age=31536000, immutable'
                    : 'public, max-age=0, must-revalidate'
            });
            const stream = fs.createReadStream(file);
            stream.on('error', () => res.destroy());
            stream.pipe(res);
            return;
        }
        next();
    };
}

if (fs.existsSync(distDir)) {
    app.use(precompressed(distDir));

    // 带内容哈希的构建产物 → 一年强缓存
    app.use('/assets', express.static(path.join(distDir, 'assets'), {
        maxAge: '1y',
        immutable: true,
        setHeaders(res) { res.setHeader('Cache-Control', 'public, max-age=31536000, immutable'); }
    }));

    // 其余静态文件（favicon、robots、sitemap 等）→ 短缓存
    app.use(express.static(distDir, {
        index: false,
        setHeaders(res, file) {
            const isIndex = file.endsWith('index.html');
            res.setHeader('Cache-Control', isIndex ? 'no-cache' : 'public, max-age=3600');
        }
    }));

    // SPA 回退：入口 HTML 不缓存，保证发版后立即生效
    app.get('*', (req, res) => {
        res.setHeader('Cache-Control', 'no-cache');
        res.sendFile(INDEX);
    });
} else {
    app.get('*', (req, res) => res.status(503).send('前端尚未构建（client/dist 不存在）'));
}

// ---------------- 统一错误处理 ----------------
app.use((err, req, res, next) => {
    // 客户端请求体格式错误 → 400，不当作服务端错误
    if (err && (err.type === 'entity.parse.failed' || (err instanceof SyntaxError && err.status === 400))) {
        return res.status(400).json({ ok: false, error: '请求体不是合法的 JSON' });
    }
    if (err && err.type === 'entity.too.large') {
        return res.status(413).json({ ok: false, error: '请求体过大' });
    }

    log.error('unhandled_error', {
        message: err && err.message,
        stack: err && err.stack ? String(err.stack).split('\n').slice(0, 3).join(' | ') : undefined,
        path: req.originalUrl
    });
    if (res.headersSent) return next(err);
    res.status(500).json({ ok: false, error: '服务器内部错误' });
});

module.exports = app;
