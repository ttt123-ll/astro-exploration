# 宇宙探索 · 天文科普网站系统

基于 **Vue 3 + Node.js Express + MySQL** 的天文科普全栈系统。
内容完整迁移自原静态站点（太阳系 / 恒星与星系 / 黑洞 / 星座 / 图集 / 时间线 / 测验 / 探索工具），
并新增用户认证、知识测验、成绩排行、留言板、**3D 星球投影 / 遨游太空**、**AI 天文问答**、科普视频与后台管理。

> 📘 完整文档见 [`项目文档.md`](./项目文档.md)
> 🐳 Docker 部署与分发见 [`README-Docker.md`](./README-Docker.md)

---

## 一分钟启动

### 方式 A：本机运行

1. 双击 **`start.bat`**（自动：启动 MySQL → 安装依赖 → 构建前端 → 启动后端 → 打开浏览器）
2. 浏览器访问 `http://127.0.0.1:3000`
3. 需要管理后台时用 **`admin / admin123`** 登录

> 内容页（首页 / 太阳系 / 恒星 / 黑洞 / 星座 / 图集 / 时间线 / 新闻 / 星球投影……）**无需登录即可浏览**，
> 只有留言发布、成绩上传、后台管理需要登录。

### 方式 B：Docker（推荐用于交付/演示）

```bash
cp .env.example .env     # 修改其中的密码与 JWT_SECRET
docker compose up -d --build
```

详见 [README-Docker.md](./README-Docker.md)，含**完全离线部署包**的制作与使用。

---

## 技术栈

| 层次 | 技术 | 版本 |
| --- | --- | --- |
| 前端 | Vue 3 + Vite + Vue Router + Pinia + Axios | 3.5 / 5.4 / 4.5 / 2.3 / 1.7 |
| 3D | Three.js | 0.186 |
| 后端 | Node.js + Express + JWT + bcryptjs + mysql2 | 24 / 4.19 / 9.0 / 2.4 / 3.11 |
| 安全 | helmet + express-rate-limit + httpOnly Cookie + CSP | — |
| 数据库 | MySQL 8.0 | 8.0.41 |
| 视觉 | 原生 CSS + Font Awesome 6 + Canvas 星空 + WebM 视频背景 | — |

## 目录结构

```
F:\天文科普\
├── client\                 # Vue 3 前端
│   ├── public\assets\      # 图片 / 球面贴图 / 视频 / 图标字体
│   └── src\
│       ├── api\            # Axios 封装（Cookie 认证）
│       ├── router\         # 路由（内容页公开，受控页需登录）
│       ├── store\          # Pinia（auth / ui）
│       ├── components\     # 导航/页脚/星空/AI对话/视频区块/页面背景…
│       ├── data\           # 内容数据（46 详情页 / 38 投影对象 / 9 视频…）
│       └── views\          # 20 个页面视图
├── server\                 # Express 后端
│   ├── index.js            # 入口（41 行）
│   ├── app.js              # 中间件装配 + 静态托管（压缩/缓存/安全头）
│   ├── routes\             # auth / scores / messages / news / admin / chat / misc
│   ├── middleware\         # auth（Cookie+DB 实时权限）/ security（helmet+限流）
│   ├── db.js               # 连接池 + 建表 + 种子数据
│   ├── logger.js           # 结构化 JSON 日志
│   ├── config.js           # 全部配置来自环境变量 / .env
│   └── chat.js             # 知识库 + 可选 LLM
├── tools\                  # 内容提取 / 素材下载 / 自动化测试 / 预压缩
├── Dockerfile              # 多阶段构建（含预压缩与 sitemap）
├── docker-compose.yml      # 生产编排
├── docker-compose.offline.yml
├── .env.example            # 配置模板
├── start.bat               # 本机一键启动
├── 项目文档.md              # 完整项目文档
├── README-Docker.md        # Docker 部署与离线分发
└── README.md
```

## 功能清单

- **首页**：顶部**新闻轮播**（自动播放 + 指示点 + 左右切换）、可点击地球穿越进投影页、迷你太阳系点行星直达详情、宇宙数据条
- **天文百科**（合并「恒星与星系」+「黑洞科普」）：恒星的一生、星系类型、四类黑洞与黑洞数据，分类切换带 URL 同步
- **科普内容**：太阳系行星、四季星座、星空图集、宇宙时间线、深空天体
- **3D 互动**：星球投影（38 个天体 3D 全息投影）+ 遨游太空（真实公转周期、时间/距离比例滑杆）
- **宇宙新闻**：数据库驱动、实时刷新，支持**关键词搜索 + 搜索记录**（localStorage）、主题 / 时间 / 排序多维筛选
- **互动社区**（合并「知识测验」+「留言板」+「排行榜」）：上方知识竞赛与留言板切换，下方**实时排行榜**（15 秒轮询、新上榜高亮）
- **AI 天文问答**：内置 27+ 主题知识库（离线可用），配置 `AI_API_KEY` 后自动切换真实大模型
- **科普视频**：9 个 NASA 官方讲解视频，按主题嵌入；视频背景**按需加载**
- **后台管理**：概览统计、7 日访问趋势、热门页面、用户/成绩/留言/新闻管理

## 安全与工程实践

| 项 | 做法 |
|---|---|
| 认证 | JWT 存 **httpOnly + SameSite Cookie**，前端 JS 不可读 |
| 退出 | 服务端 `token_version + 1`，旧 token 立即失效 |
| 权限 | 每次请求从数据库读取最新角色，改权限无需重新登录 |
| 密码 | bcrypt 异步哈希，最少 8 位 |
| 注册 | 算术验证码 + 限流 |
| 请求 | helmet + CSP + API 限流 + 64KB 请求体上限 |
| 压缩 | 构建期 brotli/gzip 预压缩，入口 JS 227KB → 约 82KB |
| 缓存 | 哈希资源 `immutable` 一年，入口 HTML `no-cache` |
| 时区 | 全站 `Asia/Shanghai`，API 返回 ISO 8601 |
| 观测 | `/api/health` + 容器 HEALTHCHECK + 结构化 JSON 日志 |
| SEO | description / OG / JSON-LD / robots.txt / sitemap.xml / noscript 兜底 |

## 数据库

- 库名：`astro`（utf8mb4）
- 表：`users` / `scores` / `messages` / `visits` / `news`（后端首次启动自动创建）
- 本机账号见 `.env`（默认 `astro / astro123`，root `root123`）
- Docker 部署时为独立实例，账号由 `.env` 决定

## 接口一览（/api）

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/health` | 公开 | 健康检查（含数据库状态） |
| GET | `/captcha` | 公开 | 算术验证码 |
| POST | `/register` | 公开 | 注册（需验证码） |
| POST | `/login` | 公开 | 登录（下发 httpOnly Cookie） |
| POST | `/logout` | 公开 | 退出（服务端失效 token） |
| GET | `/me` | 登录 | 当前用户 |
| POST | `/scores` | 登录 | 上传成绩（返回同口径名次） |
| GET | `/my-scores` | 登录 | 我的成绩 |
| GET | `/leaderboard?cat=` | 公开 | 排行榜 |
| GET | `/messages` | 公开 | 留言列表 |
| POST | `/messages` | 登录 | 发布留言 |
| GET | `/news` | 公开 | 宇宙新闻 |
| GET | `/chat/mode` · POST `/chat` | 公开 | 问答模式 / 提问 |
| POST | `/visit` | 公开 | 记录访问 |
| GET | `/admin/overview` · `/admin/users` 等 | 管理员 | 后台数据 |
| POST/PUT/DELETE | `/admin/news/:id` | 管理员 | 新闻管理 |

## 常见问题

- **想看后台？** 用 `admin / admin123` 登录，导航右侧会出现「后台管理」。
- **端口被占用？** 改 `.env` 的 `PORT`（本机）或 `HOST_PORT`（Docker）。
- **MySQL 未启动？** 双击 `start-db.bat`，或执行 `net start MySQL80`。
- **重置数据库？** Docker：`docker compose down -v`；本机：删除库后重启后端自动重建。
- **AI 问答是真人 AI 吗？** 未配置 `AI_API_KEY` 时是内置知识库（27+ 主题规则），页面上会如实标注；
  配置后自动调用真实大模型。
- **SEO 情况？** 已提供 meta / OG / JSON-LD / sitemap / noscript 兜底；当前仍是 SPA，
  如需更彻底的搜索引擎友好，可再加预渲染（prerender）或 SSR。
- **开发模式（热更新）？** 终端分别运行 `cd server && node index.js` 和 `cd client && npm run dev`，
  前端开发端口 5173，已代理 `/api` 到 3000。
