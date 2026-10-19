// 数据库连接池 + 初始化（建表、种子管理员、种子新闻）
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const config = require('./config');
const newsSeed = require('./newsSeed');
const log = require('./logger');

const pool = mysql.createPool({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database,
    waitForConnections: true,
    connectionLimit: 10,
    charset: 'utf8mb4',
    // DATETIME ↔ JS Date 统一按站点时区解释（避免容器 UTC 导致 8 小时偏差）
    timezone: config.tzOffset
});

// 每条连接显式设置会话时区，保证 NOW()/CURDATE() 与站点时区一致
pool.pool.on('connection', (conn) => {
    conn.query("SET time_zone = '" + config.tzOffset + "'", () => {});
});

async function init() {
    const c = await pool.getConnection();
    try {
        await c.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(20) NOT NULL UNIQUE,
                password_hash VARCHAR(100) NOT NULL,
                role ENUM('user','admin') NOT NULL DEFAULT 'user',
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);
        await c.query(`
            CREATE TABLE IF NOT EXISTS scores (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                category VARCHAR(20) NOT NULL DEFAULT 'all',
                total INT NOT NULL DEFAULT 0,
                correct INT NOT NULL DEFAULT 0,
                pct INT NOT NULL DEFAULT 0,
                duration_sec INT NOT NULL DEFAULT 0,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                KEY idx_pct (pct),
                CONSTRAINT fk_scores_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);
        await c.query(`
            CREATE TABLE IF NOT EXISTS messages (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NULL,
                username VARCHAR(20) NOT NULL,
                content TEXT NOT NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT fk_messages_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);
        await c.query(`
            CREATE TABLE IF NOT EXISTS visits (
                id INT AUTO_INCREMENT PRIMARY KEY,
                path VARCHAR(200) NOT NULL,
                ip VARCHAR(45) NOT NULL DEFAULT '',
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                KEY idx_created (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);
        await c.query(`
            CREATE TABLE IF NOT EXISTS news (
                id INT AUTO_INCREMENT PRIMARY KEY,
                tag VARCHAR(30) NOT NULL DEFAULT '深空探测',
                title VARCHAR(200) NOT NULL,
                summary TEXT NOT NULL,
                img VARCHAR(300) NOT NULL DEFAULT '',
                source VARCHAR(100) NOT NULL DEFAULT '本站整理',
                source_url VARCHAR(300) NOT NULL DEFAULT '',
                is_top TINYINT(1) NOT NULL DEFAULT 0,
                published_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                KEY idx_pub (published_at),
                KEY idx_tag (tag)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);
        // 兼容旧表：若缺 source_url 列则补上
        const [ncols] = await c.query("SHOW COLUMNS FROM news LIKE 'source_url'");
        if (!ncols.length) {
            await c.query("ALTER TABLE news ADD COLUMN source_url VARCHAR(300) NOT NULL DEFAULT '' AFTER source");
            log.info('news_source_url_added');
        }

        // 兼容旧表：令牌版本号（退出登录可服务端失效所有旧 token）
        const [ucols] = await c.query("SHOW COLUMNS FROM users LIKE 'token_version'");
        if (!ucols.length) {
            await c.query('ALTER TABLE users ADD COLUMN token_version INT NOT NULL DEFAULT 0 AFTER role');
            log.info('users_token_version_added');
        }

        // 种子管理员：密码来自环境变量；未配置则随机生成并打印一次
        const [rows] = await c.query('SELECT id FROM users WHERE username = ?', [config.adminSeed.username]);
        if (!rows.length) {
            let pwd = config.adminSeed.password;
            let generated = false;
            if (!pwd) {
                pwd = crypto.randomBytes(9).toString('base64').replace(/[^A-Za-z0-9]/g, '').slice(0, 12);
                generated = true;
            }
            const hash = await bcrypt.hash(pwd, 10);
            await c.query(
                "INSERT INTO users (username, password_hash, role) VALUES (?, ?, 'admin')",
                [config.adminSeed.username, hash]
            );
            if (generated) {
                log.warn('admin_created_random_password', {
                    username: config.adminSeed.username,
                    password: pwd,
                    hint: '请立即用该密码登录并修改，或设置 ADMIN_PASSWORD 后重建数据卷'
                });
            } else {
                log.info('admin_created', { username: config.adminSeed.username });
            }
        }

        // 种子新闻（仅当新闻表为空时写入）
        const [nrows] = await c.query('SELECT COUNT(*) AS n FROM news');
        if (!nrows[0].n) {
            for (const n of newsSeed) {
                await c.query(
                    'INSERT INTO news (tag, title, summary, img, source, source_url, published_at) VALUES (?, ?, ?, ?, ?, ?, DATE_SUB(NOW(), INTERVAL ? MINUTE))',
                    [n.tag, n.title, n.summary, n.img, n.source || '本站整理', n.url || '', n.minutesAgo]
                );
            }
            log.info('news_seeded', { count: newsSeed.length });
        } else {
            // 回填缺失的来源链接（按标题匹配，幂等）
            const [empty] = await c.query("SELECT COUNT(*) AS n FROM news WHERE source_url = '' OR source_url IS NULL");
            if (empty[0].n) {
                let filled = 0;
                for (const n of newsSeed) {
                    if (!n.url) continue;
                    const [r] = await c.query(
                        "UPDATE news SET source_url = ? WHERE title = ? AND (source_url = '' OR source_url IS NULL)",
                        [n.url, n.title]
                    );
                    filled += r.affectedRows;
                }
                if (filled) log.info('news_source_backfilled', { count: filled });
            }
        }
    } finally {
        c.release();
    }
}

module.exports = { pool, init };
