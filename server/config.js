// 配置：全部来自环境变量 / .env，代码里不再硬编码任何口令或密钥
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// 本地（非容器）运行时读取项目根目录的 .env
(function loadEnv() {
    const p = path.join(__dirname, '..', '.env');
    if (!fs.existsSync(p)) return;
    for (const raw of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
        const line = raw.trim();
        if (!line || line.startsWith('#')) continue;
        const i = line.indexOf('=');
        if (i < 1) continue;
        const k = line.slice(0, i).trim();
        const v = line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
        if (!(k in process.env)) process.env[k] = v;
    }
})();

const isProd = process.env.NODE_ENV === 'production';
/* 演示模式：跳过 MySQL，提供只读降级接口（供无 Docker / 无数据库的评审环境） */
const demoMode = process.env.DEMO_MODE === '1';

/* JWT 密钥：优先环境变量；没有则随机生成并告警（绝不写死） */
let jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
    jwtSecret = crypto.randomBytes(32).toString('hex');
    console.warn('[config] 未设置 JWT_SECRET，已随机生成（重启后所有登录态失效）');
}
if (isProd && jwtSecret.length < 24) {
    console.warn('[config] JWT_SECRET 过短，建议至少 32 位随机字符串');
}

/* 时区：全站统一，默认 Asia/Shanghai */
const tz = process.env.TZ || 'Asia/Shanghai';
const tzOffset = process.env.TZ_OFFSET || '+08:00';

module.exports = {
    demoMode,
    isProd,
    port: Number(process.env.PORT || 3000),
    tz,
    tzOffset,

    db: {
        host: process.env.DB_HOST || '127.0.0.1',
        port: Number(process.env.DB_PORT || 3306),
        user: process.env.DB_USER || 'astro',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'astro'
    },

    jwtSecret,
    jwtExpires: process.env.JWT_EXPIRES || '7d',
    cookieName: process.env.COOKIE_NAME || 'astro_token',
    cookieSecure: process.env.COOKIE_SECURE === '1',

    adminSeed: {
        username: process.env.ADMIN_USER || 'admin',
        password: process.env.ADMIN_PASSWORD || ''
    },

    /* 允许的跨域来源；为空表示只允许同源（推荐） */
    corsOrigins: (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean),

    /* 限流 */
    rateLimit: {
        windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60000),
        max: Number(process.env.RATE_LIMIT_MAX || 240),
        authMax: Number(process.env.RATE_LIMIT_AUTH_MAX || 20)
    },

    /* AI 问答（可选）：配置后自动切换为真实大模型 */
    ai: {
        apiKey: process.env.AI_API_KEY || '',
        baseUrl: process.env.AI_BASE_URL || 'https://api.deepseek.com/v1',
        model: process.env.AI_MODEL || 'deepseek-chat',
        /* 前端可切换的模型白名单（第一个为默认） */
        models: (process.env.AI_MODELS || 'deepseek-chat,deepseek-reasoner')
            .split(',').map(s => s.trim()).filter(Boolean)
    },

    /* 邮箱验证码（注册绑定邮箱 / 忘记密码）：
       配置 SMTP_* 后真实发信；未配置时自动进入开发模式（验证码打印日志并随接口返回，便于演示） */
    mail: {
        host: process.env.SMTP_HOST || '',
        port: Number(process.env.SMTP_PORT || 465),
        secure: process.env.SMTP_SECURE !== '0',
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
        from: process.env.MAIL_FROM || '宇宙探索 <no-reply@astro.local>',
        devMode: process.env.MAIL_DEV_MODE === '1',
        get enabled() { return !!(this.host && this.user && this.pass); }
    },

    /* 向量检索（可选）：OpenAI 兼容 /embeddings 接口；不配置则使用纯词法检索 */
    embed: {
        url: process.env.AI_EMBED_URL || '',
        key: process.env.AI_EMBED_KEY || process.env.AI_API_KEY || '',
        model: process.env.AI_EMBED_MODEL || '',
        get enabled() { return !!(this.url && this.key && this.model); }
    }
};
