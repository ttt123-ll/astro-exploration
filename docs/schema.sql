-- ============================================================
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

-- 演示管理员账号：用户名 admin，密码 admin123
-- 说明：正式部署时密码来自 .env 的 ADMIN_PASSWORD，此处仅用于手动初始化演示。
INSERT INTO users (username, password_hash, role)
SELECT 'admin', '$2a$10$USngvq.c5gC1PPJ68pbOKu.MB2jv/.XDSFdanW44N4bp/37r/OD1.', 'admin'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin');

-- 24 条宇宙新闻种子数据（发布时间按当前时间向前偏移）
INSERT INTO news (tag, title, summary, img, source, source_url, published_at)
SELECT '深空探测', '韦伯望远镜发现迄今最遥远星系', '美国宇航局宣布，詹姆斯·韦伯太空望远镜发现了迄今为止最遥远的星系，其光芒来自宇宙大爆炸后仅约3亿年的时代。', '/assets/images/jwst_deep_field.jpg', '本站整理', 'https://webb.nasa.gov/', DATE_SUB(NOW(), INTERVAL 120 MINUTE)
WHERE NOT EXISTS (SELECT 1 FROM news WHERE title = '韦伯望远镜发现迄今最遥远星系');
INSERT INTO news (tag, title, summary, img, source, source_url, published_at)
SELECT '天象与观测', '2026年日全食即将上演', '天文学家预测，2026年8月将发生一次壮观的日全食，最佳观测地点在南美洲。届时白昼将短暂变为黑夜，日冕清晰可见。', '/assets/images/solar_eclipse.jpg', '本站整理', 'https://science.nasa.gov/eclipses/', DATE_SUB(NOW(), INTERVAL 1440 MINUTE)
WHERE NOT EXISTS (SELECT 1 FROM news WHERE title = '2026年日全食即将上演');
INSERT INTO news (tag, title, summary, img, source, source_url, published_at)
SELECT '行星科学', '毅力号在火星发现重要有机分子', '美国宇航局宣布，毅力号火星车在杰泽罗撞击坑发现了重要的有机分子，为火星曾经可能存在生命提供了新的线索。', '/assets/images/mars.jpg', '本站整理', 'https://science.nasa.gov/mission/mars-2020-perseverance/', DATE_SUB(NOW(), INTERVAL 4320 MINUTE)
WHERE NOT EXISTS (SELECT 1 FROM news WHERE title = '毅力号在火星发现重要有机分子');
INSERT INTO news (tag, title, summary, img, source, source_url, published_at)
SELECT '恒星与银河', '盖亚任务绘制银河系最精细地图', '欧洲航天局的盖亚卫星发布了超过18亿颗恒星的数据，包含位置、亮度与运动信息，人类第一次如此清晰地看清银河系的骨架。', '/assets/images/milky_way.jpg', '本站整理', 'https://www.esa.int/Science_Exploration/Space_Science/Gaia', DATE_SUB(NOW(), INTERVAL 7200 MINUTE)
WHERE NOT EXISTS (SELECT 1 FROM news WHERE title = '盖亚任务绘制银河系最精细地图');
INSERT INTO news (tag, title, summary, img, source, source_url, published_at)
SELECT '黑洞与引力波', '事件视界望远镜升级后再度瞄准黑洞', '事件视界望远镜（EHT）团队宣布新一代观测计划，将联合更多射电望远镜，拍摄更清晰的黑洞影像并制作首部黑洞"电影"。', '/assets/images/blackhole.jpg', '本站整理', 'https://eventhorizontelescope.org/', DATE_SUB(NOW(), INTERVAL 10080 MINUTE)
WHERE NOT EXISTS (SELECT 1 FROM news WHERE title = '事件视界望远镜升级后再度瞄准黑洞');
INSERT INTO news (tag, title, summary, img, source, source_url, published_at)
SELECT '空间望远镜', '欧几里得望远镜发布首批宇宙地图', '欧洲航天局欧几里得望远镜发布首批巡天图像，覆盖数百万个星系。它将在6年内测绘三分之一天空，追踪暗物质与暗能量的分布。', '/assets/images/hubble_deep_field.jpg', '本站整理', 'https://www.esa.int/Science_Exploration/Space_Science/Euclid', DATE_SUB(NOW(), INTERVAL 20160 MINUTE)
WHERE NOT EXISTS (SELECT 1 FROM news WHERE title = '欧几里得望远镜发布首批宇宙地图');
INSERT INTO news (tag, title, summary, img, source, source_url, published_at)
SELECT '恒星与银河', '"中国天眼"FAST 发现脉冲星突破 900 颗', '500 米口径球面射电望远镜 FAST 累计发现脉冲星已超过 900 颗，超过同期全球其他望远镜发现数量的总和，为检验广义相对论提供了珍贵样本。', '/assets/images/star_pulsar.jpg', '本站整理', 'https://fast.bao.ac.cn/', DATE_SUB(NOW(), INTERVAL 30240 MINUTE)
WHERE NOT EXISTS (SELECT 1 FROM news WHERE title = '"中国天眼"FAST 发现脉冲星突破 900 颗');
INSERT INTO news (tag, title, summary, img, source, source_url, published_at)
SELECT '深空探测', '欧罗巴快帆飞向木星冰卫星', 'NASA 的欧罗巴快帆探测器正高速飞向木星，计划 2030 年抵达。它将用雷达穿透冰壳，探寻欧罗巴地下海洋是否具备孕育生命的条件。', '/assets/images/official/jupiter_redspot.jpg', '本站整理', 'https://science.nasa.gov/mission/europa-clipper/', DATE_SUB(NOW(), INTERVAL 43200 MINUTE)
WHERE NOT EXISTS (SELECT 1 FROM news WHERE title = '欧罗巴快帆飞向木星冰卫星');
INSERT INTO news (tag, title, summary, img, source, source_url, published_at)
SELECT '中国航天', '天问三号将于 2028 年实施火星采样返回', '中国计划在 2028 年前后发射天问三号，通过两次发射完成火星表面采样并返回地球，有望实现人类首次火星样品返回。', '/assets/images/official/mars_surface.jpg', '本站整理', 'https://www.cnsa.gov.cn/', DATE_SUB(NOW(), INTERVAL 44000 MINUTE)
WHERE NOT EXISTS (SELECT 1 FROM news WHERE title = '天问三号将于 2028 年实施火星采样返回');
INSERT INTO news (tag, title, summary, img, source, source_url, published_at)
SELECT '黑洞与引力波', 'LISA 空间引力波天文台正式立项', '欧洲航天局正式批准 LISA 空间引力波天文台。它将在太空中展开三条 250 万公里的激光臂，捕捉超大质量黑洞并合产生的低频引力波。', '/assets/images/blackhole_stellar.jpg', '本站整理', 'https://www.esa.int/Science_Exploration/Space_Science/LISA', DATE_SUB(NOW(), INTERVAL 86400 MINUTE)
WHERE NOT EXISTS (SELECT 1 FROM news WHERE title = 'LISA 空间引力波天文台正式立项');
INSERT INTO news (tag, title, summary, img, source, source_url, published_at)
SELECT '空间望远镜', '罗曼太空望远镜进入总装测试阶段', 'NASA 的南希·格雷斯·罗曼太空望远镜已进入总装测试，其视场是哈勃的 100 倍，将开展大规模巡天，深入研究暗能量与系外行星。', '/assets/images/telescope_webb.jpg', '本站整理', 'https://science.nasa.gov/mission/roman-space-telescope/', DATE_SUB(NOW(), INTERVAL 87000 MINUTE)
WHERE NOT EXISTS (SELECT 1 FROM news WHERE title = '罗曼太空望远镜进入总装测试阶段');
INSERT INTO news (tag, title, summary, img, source, source_url, published_at)
SELECT '黑洞与引力波', '银河系中心黑洞首次拍到偏振光', '事件视界望远镜团队发布银河系中心超大质量黑洞"人马座 A*"的偏振光图像，首次揭示其周围强磁场结构，磁场强度远超理论预期。', '/assets/images/blackhole_supermassive.jpg', '本站整理', 'https://eventhorizontelescope.org/', DATE_SUB(NOW(), INTERVAL 129600 MINUTE)
WHERE NOT EXISTS (SELECT 1 FROM news WHERE title = '银河系中心黑洞首次拍到偏振光');
INSERT INTO news (tag, title, summary, img, source, source_url, published_at)
SELECT '中国航天', '嫦娥六号完成人类首次月背采样返回', '嫦娥六号探测器从月球背面南极-艾特肯盆地采集样品并成功返回地球，这是人类历史上首次实现月球背面采样返回，为研究月球早期演化提供了关键样本。', '/assets/images/news/moon.jpg', '本站整理', 'https://www.cnsa.gov.cn/', DATE_SUB(NOW(), INTERVAL 172800 MINUTE)
WHERE NOT EXISTS (SELECT 1 FROM news WHERE title = '嫦娥六号完成人类首次月背采样返回');
INSERT INTO news (tag, title, summary, img, source, source_url, published_at)
SELECT '太阳与空间天气', '帕克太阳探测器刷新最接近太阳纪录', '帕克太阳探测器以约每小时 69 万公里的速度飞掠太阳日冕层，成为人类历史上最接近恒星、飞行速度最快的人造物体。', '/assets/images/news/parker.jpg', '本站整理', 'https://science.nasa.gov/mission/parker-solar-probe/', DATE_SUB(NOW(), INTERVAL 175000 MINUTE)
WHERE NOT EXISTS (SELECT 1 FROM news WHERE title = '帕克太阳探测器刷新最接近太阳纪录');
INSERT INTO news (tag, title, summary, img, source, source_url, published_at)
SELECT '载人航天', '阿耳忒弥斯计划推进人类重返月球', 'NASA 阿耳忒弥斯计划正持续推进，新一代 SLS 火箭与猎户座飞船已完成总装测试，目标是将宇航员再次送上月球表面并建立可持续驻留。', '/assets/images/news/rocket.jpg', '本站整理', 'https://www.nasa.gov/humans-in-space/artemis/', DATE_SUB(NOW(), INTERVAL 216000 MINUTE)
WHERE NOT EXISTS (SELECT 1 FROM news WHERE title = '阿耳忒弥斯计划推进人类重返月球');
INSERT INTO news (tag, title, summary, img, source, source_url, published_at)
SELECT '行星科学', '人类确认的系外行星数量突破 6000 颗', '随着新一代巡天望远镜陆续投入观测，人类已确认的系外行星数量突破 6000 颗，其中数十颗位于恒星宜居带内，可能拥有液态水。', '/assets/images/news/exoplanet.jpg', '本站整理', 'https://exoplanets.nasa.gov/', DATE_SUB(NOW(), INTERVAL 219000 MINUTE)
WHERE NOT EXISTS (SELECT 1 FROM news WHERE title = '人类确认的系外行星数量突破 6000 颗');
INSERT INTO news (tag, title, summary, img, source, source_url, published_at)
SELECT '天象与观测', '星际访客彗星穿越太阳系', '一颗来自太阳系外的星际彗星被天文台捕捉到，它沿双曲线轨道高速穿越内太阳系。这是人类探测到的少数几颗星际天体之一。', '/assets/images/news/comet.jpg', '本站整理', 'https://science.nasa.gov/solar-system/comets/', DATE_SUB(NOW(), INTERVAL 259200 MINUTE)
WHERE NOT EXISTS (SELECT 1 FROM news WHERE title = '星际访客彗星穿越太阳系');
INSERT INTO news (tag, title, summary, img, source, source_url, published_at)
SELECT '中国航天', '中国空间站科学实验成果丰硕', '中国空间站在生命科学、流体物理、材料科学等领域完成数百项实验，先后有多批航天员进驻，成为长期稳定运行的太空实验室。', '/assets/images/news/station.jpg', '本站整理', 'https://www.cmse.gov.cn/', DATE_SUB(NOW(), INTERVAL 262000 MINUTE)
WHERE NOT EXISTS (SELECT 1 FROM news WHERE title = '中国空间站科学实验成果丰硕');
INSERT INTO news (tag, title, summary, img, source, source_url, published_at)
SELECT '深空探测', '韦伯望远镜拍摄船底座星云新影像', '詹姆斯·韦伯望远镜以红外之眼拍摄船底座星云，首次清晰呈现恒星诞生区域的"宇宙悬崖"，数以百计的新生恒星藏于尘埃之中。', '/assets/images/news/nebula_new.jpg', '本站整理', 'https://webb.nasa.gov/', DATE_SUB(NOW(), INTERVAL 302400 MINUTE)
WHERE NOT EXISTS (SELECT 1 FROM news WHERE title = '韦伯望远镜拍摄船底座星云新影像');
INSERT INTO news (tag, title, summary, img, source, source_url, published_at)
SELECT '太阳与空间天气', '太阳活动进入第 25 周期极大期', '太阳黑子数持续攀升，耀斑与日冕物质抛射频繁发生，高纬度地区多次出现绚丽极光。科学家提醒关注空间天气对卫星与电网的影响。', '/assets/images/news/sun.jpg', '本站整理', 'https://science.nasa.gov/sun/', DATE_SUB(NOW(), INTERVAL 305000 MINUTE)
WHERE NOT EXISTS (SELECT 1 FROM news WHERE title = '太阳活动进入第 25 周期极大期');
INSERT INTO news (tag, title, summary, img, source, source_url, published_at)
SELECT '黑洞与引力波', '双中子星并合引力波新观测', '引力波天文台再次捕捉到双中子星并合事件，并同步观测到其产生的千新星辐射，为研究重元素（如黄金）的宇宙起源提供了直接证据。', '/assets/images/star_neutron.jpg', '本站整理', 'https://www.ligo.org/', DATE_SUB(NOW(), INTERVAL 345600 MINUTE)
WHERE NOT EXISTS (SELECT 1 FROM news WHERE title = '双中子星并合引力波新观测');
INSERT INTO news (tag, title, summary, img, source, source_url, published_at)
SELECT '行星科学', '木星探测器发现新的极地风暴与卫星', '木星探测器在木星极区拍摄到排列成规则多边形的新风暴，同时在其轨道附近发现此前未被记录的小型卫星，刷新了木星卫星家族的名单。', '/assets/images/jupiter.jpg', '本站整理', 'https://science.nasa.gov/mission/juno/', DATE_SUB(NOW(), INTERVAL 349000 MINUTE)
WHERE NOT EXISTS (SELECT 1 FROM news WHERE title = '木星探测器发现新的极地风暴与卫星');
INSERT INTO news (tag, title, summary, img, source, source_url, published_at)
SELECT '行星科学', '韦伯望远镜首次探测系外行星大气水汽', '詹姆斯·韦伯望远镜通过凌星光谱法，在一颗近距离系外行星的大气中探测到水蒸气信号，为寻找宜居世界迈出重要一步。', '/assets/images/official/saturn_rings.jpg', '本站整理', 'https://webb.nasa.gov/', DATE_SUB(NOW(), INTERVAL 388800 MINUTE)
WHERE NOT EXISTS (SELECT 1 FROM news WHERE title = '韦伯望远镜首次探测系外行星大气水汽');
INSERT INTO news (tag, title, summary, img, source, source_url, published_at)
SELECT '恒星与银河', '银河系外围发现新的恒星结构', '天文学家在银河系外缘发现一条此前未知的恒星流，它可能是被银河系引力撕碎的矮星系残骸，为理解银河系的形成与并合历史提供了新线索。', '/assets/images/ngc1300_barred_spiral.jpg', '本站整理', 'https://www.esa.int/Science_Exploration/Space_Science/Gaia', DATE_SUB(NOW(), INTERVAL 432000 MINUTE)
WHERE NOT EXISTS (SELECT 1 FROM news WHERE title = '银河系外围发现新的恒星结构');
