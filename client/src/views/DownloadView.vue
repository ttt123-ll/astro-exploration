<script setup>
import { ref } from 'vue';
import BookSection from '../components/BookSection.vue';
import PageHeader from '../components/PageHeader.vue';

/*
 * 开发者备注（不在页面上展示本机路径）：
 * 本机开发时 MySQL 数据目录位于 E:\mysql\data，服务名 MySQL80；
 * 正式部署请使用 .env 中的 DB_* 配置，不要把本机绝对路径写进页面文案。
 */

const showDoc = ref(false);

/* 三步部署 */
const steps = [
    {
        no: '01',
        icon: 'fa-database',
        title: '启动数据库',
        desc: '启动 MySQL 8（Windows 可双击 start-db.bat，或使用 Docker 时由容器自动拉起）',
        tip: '首次运行会自动建表，并写入 24 条新闻与默认管理员账号'
    },
    {
        no: '02',
        icon: 'fa-play',
        title: '一键启动服务',
        desc: '双击项目根目录的 start.bat，或在命令行执行 npm start',
        tip: '后端会同时托管前端构建产物，无需再单独启动前端'
    },
    {
        no: '03',
        icon: 'fa-globe',
        title: '浏览器访问',
        desc: '打开 http://127.0.0.1:3000 即可看到首页',
        tip: '默认管理员 admin / admin123，首次登录后请及时修改密码'
    }
];

/* 技术栈（面向访客，不暴露本机路径） */
const stacks = [
    { icon: 'fa-display', name: '前端', detail: 'Vue 3 + Vite + Vue Router + Pinia + Three.js' },
    { icon: 'fa-server', name: '后端', detail: 'Node.js + Express + JWT + bcryptjs' },
    { icon: 'fa-database', name: '数据库', detail: 'MySQL 8.0（utf8mb4，自动建表）' },
    { icon: 'fa-cube', name: '部署', detail: 'Docker 多阶段构建 / 一键脚本 / 完全离线包' }
];
</script>

<template>
    <div class="container">
        <PageHeader kicker="DEPLOYMENT" title="系统部署说明" icon="fa-download" deco="grid"
                    :stats="[{ v: '3', l: '部署步骤' }, { v: '3', l: '部署方式' }, { v: '1 键', l: '一键启动' }]"
                    subtitle="本系统采用 Vue 3 前端 + Node.js Express 后端 + MySQL 数据库，三步即可在本地跑起来。" />

        <!-- 三步部署 -->
        <section class="deploy-steps">
            <div v-for="(s, i) in steps" :key="s.no" class="step-wrap">
                <div class="step-card" v-reveal>
                    <div class="step-no">{{ s.no }}</div>
                    <div class="step-icon"><i class="fas" :class="s.icon"></i></div>
                    <h3>{{ s.title }}</h3>
                    <p>{{ s.desc }}</p>
                    <span class="step-tip"><i class="fas fa-circle-info"></i> {{ s.tip }}</span>
                </div>
                <div v-if="i < steps.length - 1" class="step-link" aria-hidden="true">
                    <span class="line"></span>
                    <i class="fas fa-chevron-right"></i>
                </div>
            </div>
        </section>

        <!-- 操作按钮 -->
        <div class="deploy-actions">
            <button class="btn btn-primary" @click="showDoc = true"><i class="fas fa-book-open"></i> 查看完整部署文档</button>
            <a class="btn btn-ghost" href="https://github.com/ttt123-ll/astro-exploration/blob/main/README.md"
               target="_blank" rel="noopener"><i class="fab fa-github"></i> 在 GitHub 查看 README</a>
            <a class="btn btn-ghost" href="https://github.com/ttt123-ll/astro-exploration" target="_blank" rel="noopener">
                <i class="fas fa-code-branch"></i> 开源仓库
            </a>
        </div>

        <!-- 技术栈 -->
        <div class="stack-grid">
            <div v-for="s in stacks" :key="s.name" class="stack-card" v-reveal>
                <div class="stack-icon"><i class="fas" :class="s.icon"></i></div>
                <h4>{{ s.name }}</h4>
                <p>{{ s.detail }}</p>
            </div>
        </div>

        <BookSection topic="download" />

        <!-- 完整文档弹窗 -->
        <transition name="doc">
            <div v-if="showDoc" class="doc-mask" @click.self="showDoc = false">
                <div class="doc-panel" role="dialog" aria-modal="true" aria-label="完整部署文档">
                    <div class="doc-head">
                        <h3><i class="fas fa-book-open"></i> 完整部署文档</h3>
                        <button class="doc-close" @click="showDoc = false" aria-label="关闭"><i class="fas fa-xmark"></i></button>
                    </div>
                    <div class="doc-body">
                        <h4>方式一：Docker（推荐，免安装 MySQL）</h4>
                        <pre>cp .env.example .env        # 修改 DB_PASSWORD / JWT_SECRET
docker compose up -d --build
# 浏览器访问 http://localhost:3000</pre>

                        <h4>方式二：本机运行</h4>
                        <pre># 1. 准备 MySQL 8，创建数据库与账号（utf8mb4）
# 2. 配置环境变量
cp .env.example .env
# 3. 安装依赖
npm run install:all
# 4. 构建前端
npm run build
# 5. 启动服务
npm start</pre>

                        <h4>方式三：开发模式（热更新）</h4>
                        <pre>npm run dev:server   # 终端 1：后端 http://127.0.0.1:3000
npm run dev:client   # 终端 2：前端 http://127.0.0.1:5173</pre>

                        <h4>环境变量（核心项）</h4>
                        <ul>
                            <li><code>DB_HOST / DB_PORT / DB_NAME / DB_USER / DB_PASSWORD</code>：数据库连接</li>
                            <li><code>JWT_SECRET</code>：令牌签名密钥（必填，建议 32 位随机字符串）</li>
                            <li><code>PORT</code>：服务端口，默认 3000</li>
                            <li><code>ADMIN_USER / ADMIN_PASSWORD</code>：初始管理员账号</li>
                        </ul>

                        <h4>常见问题</h4>
                        <ul>
                            <li>数据库连不上：检查 <code>.env</code> 的 <code>DB_*</code> 配置与 MySQL 是否已启动</li>
                            <li>端口被占用：修改 <code>PORT</code>（本机）或 <code>HOST_PORT</code>（Docker）</li>
                            <li>改动数据库密码后启动失败：Docker 下执行 <code>docker compose down -v</code> 重建数据卷</li>
                            <li>3D 页面黑屏：浏览器需支持 WebGL2，或在地址后加 <code>?nolog=1</code> 关闭对数深度缓冲</li>
                        </ul>
                    </div>
                </div>
            </div>
        </transition>
    </div>
</template>

<style scoped>
/* ===== 三步部署 ===== */
.deploy-steps {
    display: flex;
    align-items: stretch;
    gap: 0.4rem;
    margin: 0.6rem 0 2.4rem;
    flex-wrap: wrap;
}
.step-wrap { display: flex; align-items: center; flex: 1 1 260px; min-width: 0; }
.step-card {
    position: relative;
    flex: 1;
    background: var(--bg-card);
    border: 1px solid rgba(159, 212, 248, 0.22);
    border-radius: var(--radius-md);
    padding: 1.5rem 1.3rem 1.3rem;
    transition: all 0.35s ease;
}
.step-card:hover { transform: translateY(-5px); border-color: var(--color-primary); box-shadow: var(--shadow-glow-primary); }
.step-no {
    position: absolute; top: 0.7rem; right: 0.9rem;
    font-family: var(--font-title); font-size: 1.5rem; font-weight: 700;
    color: rgba(159, 212, 248, 0.18);
    letter-spacing: 0.06em;
}
.step-icon {
    width: 46px; height: 46px; border-radius: 13px;
    display: grid; place-items: center;
    font-size: 1.1rem; color: #fff;
    background: var(--gradient-primary);
    box-shadow: 0 0 22px rgba(157, 140, 240, 0.4);
    margin-bottom: 0.9rem;
}
.step-card h3 { font-family: var(--font-title); font-size: 1.05rem; color: var(--color-gold); margin-bottom: 0.45rem; }
.step-card p { color: var(--color-text-secondary); font-size: 0.85rem; line-height: 1.8; margin-bottom: 0.7rem; }
.step-tip {
    display: inline-flex; align-items: flex-start; gap: 0.35rem;
    font-size: 0.74rem; line-height: 1.65; color: var(--color-text-muted);
}
.step-tip i { color: var(--color-cyan); margin-top: 0.18rem; }

/* 步骤连线 */
.step-link {
    display: flex; align-items: center; justify-content: center;
    width: 44px; flex: 0 0 44px;
    color: var(--color-primary);
    opacity: 0.65;
}
.step-link .line {
    width: 18px; height: 1px;
    background: linear-gradient(90deg, rgba(159, 212, 248, 0.2), rgba(159, 212, 248, 0.7));
}
.step-link i { font-size: 0.7rem; }

/* 操作按钮 */
.deploy-actions { display: flex; gap: 0.8rem; flex-wrap: wrap; justify-content: center; margin-bottom: 3rem; }

/* 技术栈 */
.stack-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.2rem; }
.stack-card {
    background: rgba(159, 212, 248, 0.05);
    border: 1px solid rgba(159, 212, 248, 0.18);
    border-radius: var(--radius-md);
    padding: 1.2rem 1.3rem;
    transition: all 0.3s ease;
}
.stack-card:hover { border-color: rgba(159, 212, 248, 0.45); transform: translateY(-3px); }
.stack-icon { font-size: 1.1rem; color: var(--color-cyan); margin-bottom: 0.6rem; }
.stack-card h4 { font-family: var(--font-title); font-size: 0.95rem; color: var(--color-gold); margin-bottom: 0.35rem; }
.stack-card p { color: var(--color-text-muted); font-size: 0.8rem; line-height: 1.7; }

/* ===== 文档弹窗 ===== */
.doc-mask {
    position: fixed; inset: 0; z-index: 300;
    background: rgba(3, 5, 12, 0.78);
    backdrop-filter: blur(6px);
    display: flex; align-items: center; justify-content: center;
    padding: 2rem 1rem;
}
.doc-panel {
    width: min(720px, 100%);
    max-height: 82vh;
    display: flex; flex-direction: column;
    background: #0a0d1a;
    border: 1px solid rgba(159, 212, 248, 0.28);
    border-radius: 16px;
    box-shadow: 0 30px 80px rgba(0, 0, 0, 0.7);
    overflow: hidden;
}
.doc-head {
    display: flex; align-items: center; justify-content: space-between;
    padding: 1rem 1.3rem;
    border-bottom: 1px solid rgba(159, 212, 248, 0.16);
}
.doc-head h3 { font-family: var(--font-title); font-size: 1.05rem; color: var(--color-gold); }
.doc-head i { color: var(--color-cyan); margin-right: 0.4rem; }
.doc-close {
    width: 30px; height: 30px; border-radius: 8px;
    border: 1px solid rgba(159, 212, 248, 0.25);
    background: rgba(255, 255, 255, 0.04);
    color: var(--color-text-secondary); cursor: pointer;
    transition: all 0.25s ease;
}
.doc-close:hover { color: #fff; border-color: var(--color-cyan); }
.doc-body { padding: 1.2rem 1.4rem 1.8rem; overflow-y: auto; }
.doc-body h4 { font-family: var(--font-title); font-size: 0.92rem; color: var(--color-cyan); margin: 1.1rem 0 0.6rem; }
.doc-body h4:first-child { margin-top: 0; }
.doc-body pre {
    background: rgba(159, 212, 248, 0.06);
    border: 1px solid rgba(159, 212, 248, 0.14);
    border-radius: 10px;
    padding: 0.8rem 1rem;
    font-size: 0.78rem;
    line-height: 1.75;
    color: #cfe0f7;
    overflow-x: auto;
    margin: 0;
}
.doc-body ul { margin: 0.3rem 0 0; padding-left: 1.2rem; }
.doc-body li { color: var(--color-text-secondary); font-size: 0.82rem; line-height: 1.85; }
.doc-body code {
    background: rgba(159, 212, 248, 0.1);
    border-radius: 4px;
    padding: 0.08rem 0.35rem;
    font-size: 0.78rem;
    color: var(--color-gold);
}

.doc-enter-active, .doc-leave-active { transition: opacity 0.28s ease; }
.doc-enter-from, .doc-leave-to { opacity: 0; }
.doc-enter-active .doc-panel, .doc-leave-active .doc-panel { transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1); }
.doc-enter-from .doc-panel, .doc-leave-to .doc-panel { transform: translateY(18px) scale(0.97); }

@media (max-width: 900px) {
    .step-link { display: none; }
    .deploy-steps { flex-direction: column; }
}
</style>
