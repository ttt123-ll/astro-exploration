/**
 * 生成数据库结构说明 + 种子数据：docs/schema.sql
 * - 表结构与 server/db.js 完全一致（含 email / token_version / 索引 / 外键）
 * - 首次初始化用种子数据：24 条新闻 + 演示管理员账号
 */
const fs = require('fs');
const path = require('path');
const bcrypt = require(path.join(__dirname, '..', 'server', 'node_modules', 'bcryptjs'));
const newsSeed = require(path.join(__dirname, '..', 'server', 'newsSeed'));

const OUT = path.join(__dirname, '..', 'docs', 'schema.sql');

const esc = v => String(v == null ? '' : v).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');
const adminUser = process.env.ADMIN_USER || 'admin';
const adminPwd = process.env.ADMIN_PASSWORD || 'admin123';
const adminHash = bcrypt.hashSync(adminPwd, 10);

const tables = `-- ============================================================
-- 宇宙探索 · 天文科普网站系统  数据库结构（MySQL 8.0）
-- 说明：
--  1) 本文件与 server/db.js 的建表逻辑一致，可直接用于建库/查看结构；
--  2) 正式部署推荐使用 Docker 离线包，启动时由 server/db.js 自动建表并写入种子数据，
--     无需手动执行本文件；
--  3) 若手动初始化，请先创建数据库（示例）：
--       CREATE DATABASE IF NOT EXISTS astro DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
--       USE astro;
--     再执行本文件。
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------
-- 1. 用户表：账号、密码哈希、绑定邮箱、角色、令牌版本号
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id            INT AUTO_INCREMENT PRIMARY KEY COMMENT '用户 ID',
    username      VARCHAR(20)  NOT NULL UNIQUE COMMENT '用户名（3-20 位中文/字母/数字/下划线）',
    password_hash VARCHAR(100) NOT NULL COMMENT '密码哈希（bcrypt）',
    email         VARCHAR(120) NULL UNIQUE COMMENT '绑定邮箱（找回密码用，全站唯一）',
    token_version INT NOT NULL DEFAULT 0 COMMENT '令牌版本号：+1 可使旧登录态立即失效',
    role          ENUM('user','admin') NOT NULL DEFAULT 'user' COMMENT '角色',
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '注册时间',
    UNIQUE KEY uk_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

-- ------------------------------------------------------------
-- 2. 找回密码验证码表：验证码只存 HMAC 哈希，10 分钟有效、一次性
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS password_resets (
    id         INT AUTO_INCREMENT PRIMARY KEY COMMENT '记录 ID',
    user_id    INT NOT NULL COMMENT '用户 ID',
    email      VARCHAR(120) NOT NULL COMMENT '邮箱',
    code_hash  CHAR(64) NOT NULL COMMENT '验证码 HMAC 哈希（不存明文）',
    expires_at DATETIME NOT NULL COMMENT '过期时间',
    used       TINYINT NOT NULL DEFAULT 0 COMMENT '是否已使用',
    attempts   TINYINT NOT NULL DEFAULT 0 COMMENT '尝试次数（最多 5 次）',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    KEY idx_reset_email (email),
    KEY idx_reset_expires (expires_at),
    CONSTRAINT fk_resets_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='找回密码验证码表';

-- ------------------------------------------------------------
-- 3. 测验成绩表
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS scores (
    id           INT AUTO_INCREMENT PRIMARY KEY COMMENT '成绩 ID',
    user_id      INT NOT NULL COMMENT '用户 ID',
    category     VARCHAR(20) NOT NULL DEFAULT 'all' COMMENT '测验分类',
    total        INT NOT NULL DEFAULT 0 COMMENT '总题数',
    correct      INT NOT NULL DEFAULT 0 COMMENT '答对题数',
    pct          INT NOT NULL DEFAULT 0 COMMENT '正确率（%）',
    duration_sec INT NOT NULL DEFAULT 0 COMMENT '用时（秒）',
    created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '提交时间',
    KEY idx_pct (pct),
    CONSTRAINT fk_scores_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='测验成绩表';

-- ------------------------------------------------------------
-- 4. 留言板表
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS messages (
    id         INT AUTO_INCREMENT PRIMARY KEY COMMENT '留言 ID',
    user_id    INT NULL COMMENT '用户 ID（可为空表示游客）',
    username   VARCHAR(20) NOT NULL COMMENT '显示昵称',
    content    TEXT NOT NULL COMMENT '留言内容',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '留言时间',
    CONSTRAINT fk_messages_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='留言板表';

-- ------------------------------------------------------------
-- 5. 访问统计表
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS visits (
    id         INT AUTO_INCREMENT PRIMARY KEY COMMENT '记录 ID',
    path       VARCHAR(200) NOT NULL COMMENT '访问路径',
    ip         VARCHAR(45) NOT NULL DEFAULT '' COMMENT 'IP（支持 IPv6）',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '访问时间',
    KEY idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='访问统计表';

-- ------------------------------------------------------------
-- 6. 新闻表：支持标签、置顶、来源链接与时间排序
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS news (
    id          INT AUTO_INCREMENT PRIMARY KEY COMMENT '新闻 ID',
    tag         VARCHAR(30) NOT NULL DEFAULT '深空探测' COMMENT '标签',
    title       VARCHAR(200) NOT NULL COMMENT '标题',
    summary     TEXT NOT NULL COMMENT '摘要',
    img         VARCHAR(300) NOT NULL DEFAULT '' COMMENT '配图路径',
    source      VARCHAR(100) NOT NULL DEFAULT '本站整理' COMMENT '来源',
    source_url  VARCHAR(300) NOT NULL DEFAULT '' COMMENT '原文链接',
    is_top      TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否置顶',
    published_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '发布时间',
    updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    KEY idx_pub (published_at),
    KEY idx_tag (tag)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='宇宙新闻表';

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- 种子数据（仅在空库首次初始化时使用）
-- ============================================================

-- 演示管理员账号：用户名 ${adminUser}，密码 ${adminPwd}
-- 说明：正式部署时密码来自 .env 的 ADMIN_PASSWORD，此处仅用于手动初始化演示。
INSERT INTO users (username, password_hash, role)
SELECT '${adminUser}', '${adminHash}', 'admin'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = '${adminUser}');
`;

let newsSql = '\n-- 24 条宇宙新闻种子数据（发布时间按当前时间向前偏移）\n';
for (const n of newsSeed) {
    newsSql += `INSERT INTO news (tag, title, summary, img, source, source_url, published_at)\n` +
        `SELECT '${esc(n.tag)}', '${esc(n.title)}', '${esc(n.summary)}', '${esc(n.img)}', '${esc(n.source || '本站整理')}', '${esc(n.url || '')}', DATE_SUB(NOW(), INTERVAL ${Number(n.minutesAgo) || 0} MINUTE)\n` +
        `WHERE NOT EXISTS (SELECT 1 FROM news WHERE title = '${esc(n.title)}');\n`;
}

fs.writeFileSync(OUT, tables + newsSql, 'utf8');
console.log('OK saved:', OUT, '新闻条数:', newsSeed.length, '大小:', (fs.statSync(OUT).size / 1024).toFixed(1), 'KB');
