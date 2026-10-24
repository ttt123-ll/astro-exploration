<script setup>
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import content from '../data/content';
import planets from '../data/planets';
import VideoSection from '../components/VideoSection.vue';
import BookSection from '../components/BookSection.vue';
import PageHeader from '../components/PageHeader.vue';
import { GROUP_TOPIC } from '../data/pageBooks';

const route = useRoute();
const router = useRouter();
const group = computed(() => route.params.group);
const key = computed(() => route.params.key);

const data = computed(() => {
    const g = content[group.value];
    return g ? (g[key.value] || null) : null;
});

const headerStats = computed(() => ((data.value && data.value.stats) || []).slice(0, 3)
    .map(s => ({ v: String(s.value), l: String(s.label) })));

const groupLabel = {
    planet: '太阳系行星', star: '恒星与星系', constellation: '四季星座', galaxy: '恒星与星系',
    blackhole: '黑洞科普', object: '深空天体', telescope: '星空图集'
};
const backPath = {
    planet: '/solar-system', star: '/encyclopedia?tab=stars', constellation: '/constellations',
    galaxy: '/encyclopedia?tab=stars', blackhole: '/encyclopedia?tab=bh', object: '/deep-space', telescope: '/gallery'
};
/* 视频与天体一一对应：只有确实匹配的视频才展示，其余页面不硬塞 */
const VIDEO_GROUP = { star: 'star', blackhole: 'blackhole', object: 'deepspace', telescope: 'gallery' };
const PLANET_VIDEO = { mars: 'planet-mars', jupiter: 'planet-jupiter', saturn: 'planet-saturn' };
const videoContext = computed(() => {
    if (group.value === 'planet') return PLANET_VIDEO[key.value] || '';
    return VIDEO_GROUP[group.value] || '';
});
const bookTopic = computed(() => GROUP_TOPIC[group.value] || 'deep');

/* ===================== 段落图标：按标题语义映射，而不是按序号轮换 ===================== */
const SECTION_ICONS = [
    { re: /趣味|冷知识|你知道吗|小知识/, icon: 'fa-lightbulb' },
    { re: /神话|传说|故事|文化|命名/, icon: 'fa-scroll' },
    { re: /观测|观看|如何看|观测建议|最佳/, icon: 'fa-binoculars' },
    { re: /结构|内部|分层|构造/, icon: 'fa-layer-group' },
    { re: /大气|组成|成分|化学/, icon: 'fa-wind' },
    { re: /历史|发现|探索|任务|探测/, icon: 'fa-clock-rotate-left' },
    { re: /演化|形成|诞生|死亡|一生|未来/, icon: 'fa-arrow-trend-up' },
    { re: /数据|参数|物理|特征|指标/, icon: 'fa-chart-simple' },
    { re: /环|卫星|月|家族/, icon: 'fa-circle-nodes' },
    { re: /星座|星图|亮星|连线/, icon: 'fa-star' },
    { re: /黑洞|引力|视界|潮汐/, icon: 'fa-circle-dot' },
    { re: /概述|简介|总览|概况/, icon: 'fa-circle-info' }
];
function sectionIcon(title) {
    const hit = SECTION_ICONS.find(s => s.re.test(title || ''));
    return hit ? hit.icon : 'fa-book-open';
}

/* ===================== 行星大小对比 ===================== */
const planetInfo = computed(() => {
    if (group.value !== 'planet') return null;
    const name = data.value && data.value.title;
    const en = data.value && data.value.subtitle;
    return planets.find(p => p.name === name || (p.englishName || '').toLowerCase() === String(en || '').toLowerCase()) || null;
});

const EARTH_D = 12742;
const sizeCompare = computed(() => {
    if (!planetInfo.value) return [];
    const max = Math.max(...planets.map(p => p.diameter));
    return planets.map(p => ({
        name: p.name,
        diameter: p.diameter,
        barPct: Math.max(3, Math.round((p.diameter / max) * 100)),
        self: p.name === planetInfo.value.name,
        color: p.name === planetInfo.value.name ? 'var(--color-gold)' : 'rgba(159, 212, 248, 0.55)'
    }));
});

const sizeNote = computed(() => {
    const p = planetInfo.value;
    if (!p) return '';
    const dRatio = p.diameter / EARTH_D;
    if (Math.abs(dRatio - 1) < 0.05) return '与地球大小相当（直径约 1.0 倍地球）';
    if (dRatio < 1) return '直径约为地球的 ' + dRatio.toFixed(2) + ' 倍，体积约为地球的 ' + Math.pow(dRatio, 3).toFixed(2) + ' 倍';
    return '直径约为地球的 ' + dRatio.toFixed(1) + ' 倍，体积约为地球的 ' + Math.round(Math.pow(dRatio, 3)).toLocaleString('zh-CN') + ' 倍';
});
</script>

<template>
    <!-- ===== 正常内容 ===== -->
    <div class="container" v-if="data">
        <!-- 面包屑（唯一返回入口，保留它去掉返回按钮） -->
        <nav class="breadcrumb" aria-label="位置导航">
            <router-link to="/">首页</router-link>
            <i class="fas fa-angle-right"></i>
            <router-link :to="backPath[group]">{{ groupLabel[group] }}</router-link>
            <i class="fas fa-angle-right"></i>
            <span aria-current="page">{{ data.title }}</span>
        </nav>

        <PageHeader :kicker="groupLabel[group] + ' · ' + group.toUpperCase()"
                    :title="data.title" :subtitle="data.subtitle"
                    icon="fa-globe" deco="orbit" :stats="headerStats" />

        <div class="detail-layout">
            <!-- 左：正文 -->
            <div class="detail-main">
                <img v-if="data.hero" class="hero-image" :src="'/' + data.hero.src" :alt="data.hero.alt || data.title">

                <section v-for="(s, i) in data.sections" :key="i" class="detail-section" v-reveal>
                    <h2><i class="fas" :class="sectionIcon(s.title)"></i> {{ s.title }}</h2>
                    <p v-for="(p, j) in s.paras" :key="j">{{ p }}</p>
                </section>

                <VideoSection v-if="videoContext" :context="videoContext" title="相关科普视频" />
                <BookSection :topic="bookTopic" />
            </div>

            <!-- 右：关键数据（sticky） -->
            <aside class="detail-side">
                <div class="side-card">
                    <h3 class="side-title"><i class="fas fa-chart-simple"></i> 关键数据</h3>
                    <div class="side-stats">
                        <div v-for="(s, i) in data.stats" :key="i" class="side-stat">
                            <span class="k">{{ s.label }}</span>
                            <span class="v">{{ s.value }}</span>
                        </div>
                    </div>

                    <!-- 行星：大小对比横条图 -->
                    <div v-if="planetInfo" class="size-compare">
                        <h3 class="side-title"><i class="fas fa-ruler-combined"></i> 大小对比</h3>
                        <div class="sc-rows">
                            <div v-for="p in sizeCompare" :key="p.name" class="sc-row" :class="{ self: p.self }">
                                <span class="sc-name">{{ p.name }}</span>
                                <span class="sc-track"><span class="sc-bar" :style="{ width: p.barPct + '%', background: p.color }"></span></span>
                                <span class="sc-val">{{ p.diameter.toLocaleString('zh-CN') }}</span>
                            </div>
                        </div>
                        <p class="sc-note">{{ sizeNote }}</p>
                    </div>

                    <div class="side-links">
                        <router-link :to="backPath[group]" class="side-link">
                            <i class="fas fa-arrow-left"></i> 返回{{ groupLabel[group] }}
                        </router-link>
                        <router-link to="/glossary" class="side-link" v-if="false">天文名词</router-link>
                    </div>
                </div>
            </aside>
        </div>
    </div>

    <!-- ===== 404 兜底（已统一为 PageHeader 组件） ===== -->
    <div class="container" v-else>
        <PageHeader kicker="LOST IN SPACE" title="404 · 找不到这个天体" icon="fa-satellite-dish" deco="stars"
                    :stats="[{ v: '404', l: '坐标丢失' }, { v: '0', l: '匹配结果' }]"
                    subtitle="这颗星不存在——它可能已经坍缩成黑洞，或者从未被点亮。" />
        <div class="nf-actions">
            <button class="btn btn-gold" @click="router.push('/')"><i class="fas fa-house"></i> 返回首页</button>
            <button class="btn btn-ghost" @click="router.back()"><i class="fas fa-rotate-left"></i> 返回上一页</button>
        </div>
    </div>
</template>

<style scoped>
/* 面包屑 */
.breadcrumb {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    padding: 1.6rem 0 0.2rem;
    font-size: 0.82rem;
    color: var(--color-text-muted);
    flex-wrap: wrap;
}
.breadcrumb a { color: var(--color-cyan); text-decoration: none; }
.breadcrumb a:hover { color: var(--color-gold); }
.breadcrumb i { font-size: 0.62rem; opacity: 0.6; }
.breadcrumb span { color: var(--color-text-secondary); }


/* 双栏布局 */
.detail-layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 320px;
    gap: 2.2rem;
    align-items: start;
    margin-bottom: 4rem;
}
.detail-main { min-width: 0; }
.hero-image {
    width: 100%;
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-card);
    margin-bottom: 2rem;
}
.detail-section {
    background: var(--bg-card);
    border-radius: var(--radius-md);
    padding: 1.8rem 2rem;
    margin-bottom: 1.6rem;
    border: 1px solid rgba(159, 212, 248, 0.15);
}
.detail-section h2 {
    font-family: var(--font-title);
    color: var(--color-gold);
    margin-bottom: 1rem;
    font-size: 1.4rem;
    display: flex;
    align-items: center;
    gap: 0.6rem;
}
.detail-section h2 i {
    width: 30px; height: 30px;
    display: inline-grid; place-items: center;
    border-radius: 9px;
    font-size: 0.85rem;
    background: rgba(159, 212, 248, 0.1);
    border: 1px solid rgba(159, 212, 248, 0.22);
    color: var(--color-cyan);
}
.detail-section p { color: var(--color-text-secondary); line-height: 1.95; margin-bottom: 1rem; }
.detail-section p:last-child { margin-bottom: 0; }

/* 右侧 sticky 数据栏 */
.detail-side { position: sticky; top: 96px; }
.side-card {
    background: var(--bg-card);
    border: 1px solid rgba(159, 212, 248, 0.2);
    border-radius: var(--radius-md);
    padding: 1.3rem 1.2rem 1.2rem;
    backdrop-filter: blur(10px);
}
.side-title {
    display: flex; align-items: center; gap: 0.45rem;
    font-family: var(--font-title);
    font-size: 0.92rem;
    color: var(--color-gold);
    margin-bottom: 0.9rem;
    letter-spacing: 0.06em;
}
.side-title i { color: var(--color-cyan); font-size: 0.85rem; }
.side-stats { display: flex; flex-direction: column; gap: 0.55rem; }
.side-stat {
    display: flex; justify-content: space-between; gap: 0.8rem;
    padding: 0.5rem 0.65rem;
    border-radius: 9px;
    background: rgba(159, 212, 248, 0.06);
    border: 1px solid rgba(159, 212, 248, 0.1);
    font-size: 0.84rem;
}
.side-stat .k { color: var(--color-text-muted); flex-shrink: 0; }
.side-stat .v { color: var(--color-gold); text-align: right; font-variant-numeric: tabular-nums; }

/* 大小对比 */
.size-compare { margin-top: 1.4rem; padding-top: 1.2rem; border-top: 1px dashed rgba(159, 212, 248, 0.18); }
.sc-rows { display: flex; flex-direction: column; gap: 0.35rem; }
.sc-row { display: grid; grid-template-columns: 44px 1fr 56px; align-items: center; gap: 0.5rem; font-size: 0.72rem; color: var(--color-text-muted); }
.sc-row.self { color: var(--color-gold); font-weight: 600; }
.sc-name { white-space: nowrap; }
.sc-track { height: 8px; border-radius: 6px; background: rgba(159, 212, 248, 0.08); overflow: hidden; }
.sc-bar { display: block; height: 100%; border-radius: 6px; transition: width 0.6s ease; }
.sc-val { text-align: right; font-variant-numeric: tabular-nums; }
.sc-note { margin-top: 0.8rem; font-size: 0.74rem; line-height: 1.7; color: var(--color-text-secondary); }

/* 侧栏底部链接 */
.side-links { margin-top: 1.2rem; display: flex; flex-direction: column; gap: 0.5rem; }
.side-link {
    display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem;
    padding: 0.6rem 0.8rem;
    border-radius: 10px;
    font-size: 0.82rem;
    text-decoration: none;
    color: var(--color-cyan);
    background: rgba(159, 212, 248, 0.08);
    border: 1px solid rgba(159, 212, 248, 0.25);
    transition: all 0.3s ease;
}
.side-link:hover { background: var(--gradient-primary); color: #fff; border-color: transparent; }

/* 404 兜底 */
.nf-actions { display: flex; justify-content: center; gap: 1rem; flex-wrap: wrap; padding-bottom: 4rem; }

@media (max-width: 1024px) {
    .detail-layout { grid-template-columns: 1fr; gap: 1.6rem; }
    .detail-side { position: static; }
    .side-card { max-width: 100%; }
}
@media (max-width: 768px) {
    .detail-header h1 { font-size: 1.9rem; }
    .detail-section { padding: 1.2rem 1.1rem; }
    .detail-section h2 { font-size: 1.15rem; }
}
</style>
