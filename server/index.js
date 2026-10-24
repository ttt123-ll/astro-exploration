// 后端入口（精简）：装配好的 app + 数据库初始化 + 优雅退出
const app = require('./app');
const config = require('./config');
const log = require('./logger');
const { init } = require('./db');

(async () => {
    if (config.demoMode) {
        log.info('demo_mode', { note: '跳过 MySQL 初始化，使用只读降级接口' });
    } else {
        await init();
    }

    const server = app.listen(config.port, () => {
        log.info('server_started', {
            port: config.port,
            env: process.env.NODE_ENV || 'development',
            tz: config.tz,
            ai: config.ai.apiKey ? 'llm' : 'knowledge-base'
        });

        // Windows 桌面运行时自动打开浏览器；容器内跳过
        try {
            if (process.platform === 'win32' && !process.env.NO_OPEN) {
                require('child_process').exec('start http://127.0.0.1:' + config.port);
            }
        } catch (e) { /* 忽略 */ }
    });

    const shutdown = (sig) => {
        log.info('shutdown', { sig });
        server.close(() => process.exit(0));
        setTimeout(() => process.exit(1), 8000).unref();
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
})().catch((err) => {
    log.error('startup_failed', { message: err.message });
    process.exit(1);
});

process.on('unhandledRejection', (e) => {
    log.error('unhandled_rejection', { message: String((e && e.message) || e) });
});
process.on('uncaughtException', (e) => {
    log.error('uncaught_exception', { message: e.message, stack: String(e.stack || '').split('\n')[0] });
});
