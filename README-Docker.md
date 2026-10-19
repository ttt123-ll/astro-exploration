# 用 Docker 运行 / 分发「宇宙探索 · 天文科普网站系统」

整套系统（Vue 前端 + Express 后端 + MySQL 8）已容器化。
对方**不需要安装 Node.js、npm、MySQL**，只要装了 Docker 即可运行。

---

## 一、快速启动（有网络）

```bash
cp .env.example .env        # 然后修改其中的密码与密钥
docker compose up -d --build
```

打开 <http://localhost:3000>

> 首次构建约 3~5 分钟（下载基础镜像 + 依赖）。之后启动只需几秒。

---

## 二、完全离线部署（推荐用打包好的离线包）

离线包 `天文科普-Docker离线包.zip` 内含：

```
astro-web-image.tar         应用镜像（本系统 + 前端构建产物）
mysql-image.tar             MySQL 8.0 镜像（关键：没有它离线部署会卡在拉取）
docker-compose.offline.yml  离线编排（不重新构建）
.env                        已预填的运行配置
一键导入运行.bat             双击自动完成导入 + 启动 + 打开浏览器
source.tar.gz               完整源码（含 Dockerfile，可自行重建镜像）
README-Docker.md            本文档
```

### 对方操作（3 步）

1. 解压到一个**没有中文路径**的目录，例如 `D:\astro\`
2. 双击 `一键导入运行.bat`
3. 浏览器打开 <http://localhost:3000>（脚本会自动打开）

脚本内部执行：

```bash
docker load -i astro-web-image.tar
docker load -i mysql-image.tar
docker compose -f docker-compose.offline.yml up -d
```

### 手动方式（等价）

```bash
docker load -i astro-web-image.tar
docker load -i mysql-image.tar
docker compose -f docker-compose.offline.yml up -d
```

---

## 三、容器结构

```
┌──────────────────────────────────────┐
│  astro-app  (astro-web:latest)       │  Node 22 + Express
│  端口 3000（可映射到宿主机任意端口）    │  托管 Vue 产物 + 全部 API
│  HEALTHCHECK: /api/health 每 20s      │  非 root 用户运行
└──────────────────┬───────────────────┘
                   │ mysql2 (TCP 3306)
┌──────────────────▼───────────────────┐
│  astro-db   (mysql:8.0)              │  数据卷 db_data 持久化
│  时区 +08:00，不对外暴露端口           │  自动建库 astro
└──────────────────────────────────────┘
```

启动后会自动建表（users / scores / messages / visits / news）并写入 24 条新闻种子数据。

---

## 四、配置说明（全部来自 `.env`，代码中无硬编码口令）

| 变量 | 说明 | 是否必填 |
|---|---|---|
| `DB_PASSWORD` | 应用连接 MySQL 的密码 | 必填 |
| `MYSQL_ROOT_PASSWORD` | MySQL root 密码（仅容器内部） | 必填 |
| `JWT_SECRET` | 登录令牌签名密钥，建议 32 位随机 | 必填 |
| `ADMIN_USER` / `ADMIN_PASSWORD` | 初始管理员账号 | 建议设置 |
| `HOST_PORT` | 宿主机端口，默认 3000 | 可选 |
| `SITE_URL` | sitemap / OG 中使用的站点地址 | 可选 |
| `TZ` / `TZ_OFFSET` | 站点时区，默认 `Asia/Shanghai` / `+08:00` | 可选 |
| `CORS_ORIGINS` | 跨域白名单，同源部署留空 | 可选 |
| `COOKIE_SECURE` | 走 HTTPS 反代时设 1 | 可选 |
| `RATE_LIMIT_MAX` / `RATE_LIMIT_AUTH_MAX` | 全局限流 / 登录限流阈值 | 可选 |
| `AI_API_KEY` | 填了就走真实大模型，留空走内置知识库 | 可选 |

生成一个 JWT 密钥：

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

> 离线包里预填的 `admin/admin123` 仅用于演示，**正式使用请立即修改**
> （改 `.env` 后 `docker compose down -v` 重建数据卷，或登录后在数据库中更新密码）。

---

## 五、安全设计

| 项 | 做法 |
|---|---|
| 认证 | JWT 存在 **httpOnly + SameSite=Lax Cookie**，前端 JS 读不到，XSS 无法窃取 |
| 退出登录 | 服务端 `token_version + 1`，旧 token **立即失效**（不只是前端删 Cookie） |
| 权限 | 每次请求从数据库读取最新角色，改权限**无需重新登录** |
| 密码 | bcrypt（异步哈希，不阻塞事件循环），最少 8 位 |
| 注册 | 算术验证码 + 登录/注册单独限流（5 分钟 20 次） |
| 请求 | helmet 安全头 + CSP + 全局限流 + 请求体 64KB 上限 |
| 错误 | 统一错误处理，非法 JSON 返回 400，不泄露堆栈 |
| 运行 | 容器内使用非 root 用户 |

---

## 六、性能优化

| 项 | 做法 |
|---|---|
| 压缩 | 构建时预生成 **brotli + gzip**，后端按 `Accept-Encoding` 直出 |
| 缓存 | `assets/*` 内容哈希 → `max-age=31536000, immutable`；入口 HTML → `no-cache` |
| 分包 | 路由级懒加载，Three.js 单独成块（仅 3D 页面加载） |
| 体积 | 入口 JS 227KB → brotli 后约 82KB |

---

## 七、时区

全站统一 `Asia/Shanghai`：

- 容器 `TZ=Asia/Shanghai`
- MySQL `--default-time-zone=+08:00`
- 后端连接池 `timezone: '+08:00'`，并对每条连接执行 `SET time_zone`
- API 返回 **ISO 8601（带 Z/偏移）**，前端按浏览器本地时区解析，不会出现 8 小时偏差

---

## 八、健康检查与日志

```bash
curl http://localhost:3000/api/health
# {"ok":true,"status":"healthy","db":"up","uptime":123,"version":"1.1.0",...}

docker compose ps          # 会显示 (healthy)
docker compose logs -f app # 结构化 JSON 日志
```

日志为单行 JSON：`{"ts":"...","level":"info","msg":"http","method":"GET","path":"/api/news","status":200,"ms":12}`

---

## 九、常见问题

| 现象 | 解决 |
|---|---|
| `port is already allocated` | 改 `.env` 里 `HOST_PORT=8080`，访问 `http://localhost:8080` |
| **改了 `.env` 的数据库密码后启动失败**（日志 `Access denied for user 'astro'`） | 旧数据卷里仍是旧密码。执行 `docker compose down -v` 清空卷后重启（会清空数据） |
| `app` 起来但日志报 `ECONNREFUSED 3306` | 数据库尚未就绪，等 20 秒或 `docker compose restart app` |
| 页面 200 但白屏 | 检查浏览器控制台 CSP / 路由；本系统已内置 SPA 回退 |
| 想清空所有数据 | `docker compose down -v`（会删数据库卷，慎用） |
| 想改成自己的域名 | 改 `.env` 的 `SITE_URL`，重新 `docker compose build` 以更新 sitemap |
| 构建时 npm 很慢 | Dockerfile 已默认使用 `registry.npmmirror.com` |

---

## 十、与「本机直接运行」的关系

| 方式 | 命令 | 说明 |
|---|---|---|
| Docker | `docker compose up -d` | 自带 MySQL 容器，和宿主机 MySQL 无关 |
| 本机 | 双击 `start.bat` | 使用 `E:\mysql` 的 MySQL80 服务 |

两者**不能同时占用 3000 端口**。切换前先 `docker compose down` 或停止本机后端。
