<script setup>
import videos from '../data/videos';
import official from '../data/official';
import gallery from '../data/gallery';
import BookSection from '../components/BookSection.vue';

// 图片出处统计
const creditCount = {};
gallery.forEach(g => { creditCount[g.credit] = (creditCount[g.credit] || 0) + 1; });
const creditList = Object.entries(creditCount).sort((a, b) => b[1] - a[1]);

const categories = [
    {
        icon: 'fa-circle-play', name: '科普讲解视频', count: videos.length + ' 个',
        source: 'NASA 官方媒体库（images.nasa.gov）', license: '公有领域（Public Domain）',
        note: '通过 NASA 官方 API 下载，原始英文标题完整保留，可在官网按标题检索到同一视频。'
    },
    {
        icon: 'fa-image', name: '官方图库图片', count: official.length + ' 张',
        source: 'NASA / ESA / CSA / JPL 官方媒体库', license: '公有领域',
        note: '均为哈勃、韦伯等望远镜拍摄的真实官方影像，每张已标注拍摄机构。'
    },
    {
        icon: 'fa-newspaper', name: '新闻配图', count: '8 张',
        source: 'NASA 官方媒体库（images.nasa.gov）', license: '公有领域',
        note: '月球、太阳、彗星、国际空间站、帕克探测器、SLS 火箭、船底座星云等。'
    },
    {
        icon: 'fa-globe', name: '行星球面贴图', count: '8 张',
        source: 'SolarSystemScope 公开贴图库', license: 'CC BY 4.0',
        note: '用于「星球投影」页的 3D 自转球体（水星～海王星）。'
    },
    {
        icon: 'fa-images', name: '图集图片', count: gallery.length + ' 张',
        source: 'NASA / ESA 公开影像（部分为原站素材）', license: '公有领域',
        note: '均为真实天文影像，已按拍摄机构逐张标注来源。'
    },
    {
        icon: 'fa-newspaper', name: '新闻文字', count: '24 条',
        source: '依据 NASA / ESA / CNSA 等官方公开项目整理', license: '本站原创整理',
        note: '所述航天项目与观测成果均真实存在；文字为科普性整理，非新闻原文转载。每条新闻均提供官方来源链接，可点击「查看原文」核验。'
    },
    {
        icon: 'fa-font', name: '图标字体', count: 'Font Awesome 6 Free',
        source: 'Font Awesome 官方', license: 'CC BY 4.0 / SIL OFL 1.1 / MIT',
        note: '已本地化部署，无外部 CDN 依赖。'
    },
    {
        icon: 'fa-film', name: '首页视频背景', count: '4 个 WebM',
        source: 'NASA / ESA 公有领域素材 + 维基共享资源', license: '公有领域 / CC 授权',
        note: '用于首页深空氛围背景。'
    }
];

const verify = [
    { t: '视频核验', d: '打开 images.nasa.gov，把下面表格里的英文标题粘贴进搜索框，即可找到同一个视频并查看其官方说明与下载选项。' },
    { t: '图片核验', d: '图集中每张图片都标注了拍摄机构（NASA / ESA / 哈勃 / 韦伯等）。在 images.nasa.gov 或 esahubble.org 按天体名称（如 NGC 6302、M42）检索即可找到原始影像。' },
    { t: '新闻核验', d: '每条新闻卡片的「查看原文」按钮直达对应官方页面（NASA 任务主页、ESA 项目页、国家航天局或 FAST 官网等）。' },
    { t: '数据核验', d: '所有新闻以数据库记录存储于 MySQL 的 news 表，可在后台管理面板查看、比对发布时间与来源链接。' }
];
</script>

<template>
    <div class="container">
        <div class="page-header">
            <span class="page-kicker">SOURCES & LICENSES</span>
            <h1>素材来源与版权说明</h1>
            <p>本站所有视频、图片、新闻素材均来自公开渠道，来源与授权在此完整说明，便于核验。</p>
        </div>

        <!-- 总览 -->
        <div class="credit-grid">
            <div v-for="c in categories" :key="c.name" class="credit-card" v-reveal>
                <div class="credit-head">
                    <span class="credit-icon"><i class="fas" :class="c.icon"></i></span>
                    <div>
                        <h3>{{ c.name }}</h3>
                        <span class="credit-count">{{ c.count }}</span>
                    </div>
                </div>
                <div class="credit-line"><span class="l">来源</span><span class="v">{{ c.source }}</span></div>
                <div class="credit-line"><span class="l">授权</span><span class="v license">{{ c.license }}</span></div>
                <p class="credit-note">{{ c.note }}</p>
            </div>
        </div>

        <!-- 视频清单 -->
        <div class="sys-card" style="margin-top:2.4rem;">
            <h3 class="admin-h"><i class="fas fa-circle-play"></i> 讲解视频官方出处清单（{{ videos.length }} 个）</h3>
            <table class="sys-table">
                <thead><tr><th>#</th><th>本站标题</th><th>NASA 原始标题（可检索核验）</th><th>来源</th></tr></thead>
                <tbody>
                    <tr v-for="(v, i) in videos" :key="v.src">
                        <td>{{ i + 1 }}</td>
                        <td class="cell-path">{{ v.title }}</td>
                        <td class="credit-en">{{ v.en }}</td>
                        <td><span class="badge-user">{{ v.credit }}</span></td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- 图片出处统计 -->
        <div class="sys-card" style="margin-top:1.6rem;">
            <h3 class="admin-h"><i class="fas fa-camera"></i> 图集图片来源统计（共 {{ gallery.length }} 张）</h3>
            <table class="sys-table">
                <thead><tr><th>拍摄 / 来源机构</th><th>张数</th></tr></thead>
                <tbody>
                    <tr v-for="[name, n] in creditList" :key="name">
                        <td class="cell-path">{{ name }}</td>
                        <td><b class="pct-cell">{{ n }}</b></td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- 如何核验 -->
        <div class="sys-card" style="margin-top:1.6rem;">
            <h3 class="admin-h"><i class="fas fa-magnifying-glass-chart"></i> 如何核验这些素材</h3>
            <div class="verify-list">
                <div v-for="v in verify" :key="v.t" class="verify-item">
                    <span class="verify-t"><i class="fas fa-check-circle"></i> {{ v.t }}</span>
                    <p>{{ v.d }}</p>
                </div>
            </div>
        </div>

        <!-- 声明 -->
        <div class="sys-card" style="margin-top:1.6rem;">
            <h3 class="admin-h"><i class="fas fa-shield-halved"></i> 版权声明</h3>
            <p style="color:var(--color-text-secondary);line-height:2;font-size:0.94rem;">
                本站为「传智杯」参赛作品，仅用于教学与科普演示，所有第三方素材均来自公有领域或开放授权渠道，
                并已在页面中保留来源标注，未用于任何商业用途。NASA 素材使用遵循
                <a href="https://www.nasa.gov/nasa-brand-center/images-and-media/" target="_blank" rel="noopener" style="color:var(--color-cyan);">NASA 媒体使用指南</a>；
                SolarSystemScope 贴图遵循 CC BY 4.0 授权；Font Awesome 遵循其开源许可。
                如权利人认为本站使用方式不妥，请联系我们，我们将立即处理。
            </p>
        </div>
        <BookSection topic="credits" />
    </div>
</template>

<style scoped>
.credit-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.4rem; }
.credit-card {
    background: var(--bg-card); border: 1px solid rgba(159, 212, 248, 0.22);
    border-radius: var(--radius-lg); padding: 1.5rem 1.6rem; transition: all 0.35s ease;
}
.credit-card:hover { transform: translateY(-5px); border-color: var(--color-primary); box-shadow: var(--shadow-glow-primary); }
.credit-head { display: flex; align-items: center; gap: 0.9rem; margin-bottom: 1rem; }
.credit-icon {
    width: 44px; height: 44px; border-radius: 12px; flex-shrink: 0;
    background: var(--gradient-primary); color: #fff;
    display: flex; align-items: center; justify-content: center; font-size: 1.1rem;
}
.credit-head h3 { font-family: var(--font-title); color: var(--color-gold); font-size: 1.08rem; }
.credit-count { color: var(--color-cyan); font-size: 0.82rem; }
.credit-line { display: flex; gap: 0.7rem; font-size: 0.85rem; margin-bottom: 0.45rem; }
.credit-line .l { color: var(--color-text-muted); flex-shrink: 0; width: 2.4rem; }
.credit-line .v { color: var(--color-text-secondary); }
.credit-line .license { color: #86efac; }
.credit-note { color: var(--color-text-muted); font-size: 0.83rem; line-height: 1.8; margin-top: 0.8rem; padding-top: 0.8rem; border-top: 1px dashed rgba(159, 212, 248, 0.2); }
.credit-en { color: var(--color-text-secondary); font-size: 0.84rem; font-style: italic; }
.verify-list { display: flex; flex-direction: column; gap: 1rem; }
.verify-item p { color: var(--color-text-secondary); font-size: 0.9rem; line-height: 1.9; margin-top: 0.3rem; }
.verify-t { color: var(--color-cyan); font-size: 0.95rem; font-weight: 600; }
.verify-t i { margin-right: 0.3rem; }
</style>
