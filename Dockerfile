# ============================================================
#  宇宙探索 · 天文科普网站系统  —— 生产镜像
#  多阶段构建：生成 sitemap → 编译 Vue → 预压缩 → Node 托管
# ============================================================

# ---------- Stage 1: 构建前端 ----------
FROM node:22-alpine AS client-build

WORKDIR /app/client

# 中国镜像源，保证国内构建速度
ARG NPM_REGISTRY=https://registry.npmmirror.com
# 生成 sitemap 时使用的站点地址（构建时可覆盖）
ARG SITE_URL=http://localhost:3000

COPY client/package.json client/package-lock.json ./
RUN npm config set registry $NPM_REGISTRY \
 && npm ci --no-audit --no-fund

COPY client/ ./
COPY tools/ /app/tools/

# 先生成 sitemap（写入 client/public，会被 Vite 一起打包）
RUN SITE_URL=$SITE_URL node /app/tools/gen-sitemap.js

# 构建 + 预压缩（brotli/gzip）
RUN npm run build && node /app/tools/precompress.js

# ---------- Stage 2: 运行时 ----------
FROM node:22-alpine

ENV NODE_ENV=production \
    TZ=Asia/Shanghai \
    NO_OPEN=1 \
    APP_VERSION=1.1.0

WORKDIR /app

ARG NPM_REGISTRY=https://registry.npmmirror.com
COPY server/package.json server/package-lock.json ./server/
RUN cd server \
 && npm config set registry $NPM_REGISTRY \
 && npm ci --omit=dev --no-audit --no-fund \
 && npm cache clean --force

# server/app.js 期望 ../client/dist 相对自身
COPY server/ ./server/
COPY --from=client-build /app/client/dist ./client/dist
# RAG 知识库需要读取前端数据文件（planets/constellations/content/timeline）
COPY --from=client-build /app/client/src/data ./client/src/data
# 构建期预生成本地向量索引（离线 RAG 用，避免首次请求重建）
RUN node server/rag/build-index.js

# 非 root 运行
RUN addgroup -S app && adduser -S app -G app && chown -R app:app /app
USER app

EXPOSE 3000

# 健康检查：命中 /api/health 且数据库可用才算健康
HEALTHCHECK --interval=20s --timeout=5s --start-period=30s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server/index.js"]
