<script setup>
import { ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import content from '../data/content';
import VideoSection from '../components/VideoSection.vue';
import BookSection from '../components/BookSection.vue';
import PageHeader from '../components/PageHeader.vue';

const route = useRoute();
const router = useRouter();

/* 天文百科 = 恒星与星系 + 黑洞科普 */
const TABS = [
    {
        key: 'stars', label: '恒星与星系', icon: 'fa-wand-magic-sparkles', desc: '恒星的一生与宇宙中的岛宇宙',
        color: '#9d8cf0', grad: 'linear-gradient(135deg, rgba(157,140,240,0.22), rgba(110,164,232,0.16))'
    },
    {
        key: 'bh', label: '黑洞', icon: 'fa-circle-dot', desc: '连光都无法逃脱的天体',
        color: '#e8846e', grad: 'linear-gradient(135deg, rgba(232,132,110,0.22), rgba(157,140,240,0.14))'
    }
];

const validTab = k => TABS.some(t => t.key === k);
const tab = ref(validTab(route.query.tab) ? route.query.tab : 'stars');

watch(() => route.query.tab, v => {
    if (validTab(v)) tab.value = v;
});

function setTab(k) {
    tab.value = k;
    router.replace({ query: { ...route.query, tab: k } });
}

const stars = Object.entries(content.star).map(([k, v]) => ({ key: k, ...v }));
const galaxies = Object.entries(content.galaxy).map(([k, v]) => ({ key: k, ...v }));
const blackholes = Object.entries(content.blackhole).map(([k, v]) => ({ key: k, ...v }));

const BH_STATS = [
    { value: '65 亿倍', label: 'M87 黑洞质量（太阳质量）' },
    { value: '400 万倍', label: '银河系中心黑洞质量' },
    { value: '5500 万光年', label: 'M87 黑洞距离地球' }
];
</script>

<template>
    <div class="container">
        <PageHeader kicker="ASTRONOMY ENCYCLOPEDIA" title="天文百科" icon="fa-book-open" deco="galaxy" :stats="[{ v: '6', l: '恒星演化阶段' }, { v: '4', l: '星系类型' }, { v: '4', l: '黑洞类型' }]" subtitle="从恒星的诞生与死亡，到星系的宏大聚落，再到连光都无法逃脱的黑洞——这里收录了宇宙中最主要的天体类型与演化历程。" />

        <!-- 分类切换 -->
        <div class="enc-tabs">
            <button v-for="t in TABS" :key="t.key" class="enc-tab" :class="{ active: tab === t.key }"
                    :style="{ '--tab-color': t.color, '--tab-grad': t.grad }" @click="setTab(t.key)">
                <span class="enc-tab-icon"><i class="fas" :class="t.icon"></i></span>
                <span class="enc-tab-main">{{ t.label }}</span>
                <span class="enc-tab-sub">{{ t.desc }}</span>
            </button>
        </div>

        <!-- 恒星与星系 -->
        <div v-show="tab === 'stars'" class="enc-panel">
            <div class="section-head">
                <h2 class="section-title"><span class="title-icon"><i class="fas fa-star"></i></span>恒星的一生</h2>
                <p class="section-subtitle">从黄矮星到红巨星，再到白矮星或超新星——恒星也有生老病死</p>
            </div>
            <div class="type-grid">
                <router-link v-for="s in stars" :key="s.key" :to="'/detail/star/' + s.key" class="type-card" v-reveal>
                    <img v-if="s.hero" :src="'/' + s.hero.src" :alt="s.title">
                    <h4>{{ s.title }}</h4>
                    <p>{{ s.sections[0]?.paras[0]?.slice(0, 60) || '' }}…</p>
                </router-link>
            </div>

            <div class="section-head" style="margin-top:3rem;">
                <h2 class="section-title"><span class="title-icon"><i class="fas fa-hurricane"></i></span>星系类型</h2>
                <p class="section-subtitle">旋涡、椭圆、棒旋与不规则——宇宙中的「岛宇宙」</p>
            </div>
            <div class="type-grid">
                <router-link v-for="g in galaxies" :key="g.key" :to="'/detail/galaxy/' + g.key" class="type-card" v-reveal>
                    <img v-if="g.hero" :src="'/' + g.hero.src" :alt="g.title">
                    <h4>{{ g.title }}</h4>
                    <p>{{ g.sections[0]?.paras[0]?.slice(0, 60) || '' }}…</p>
                </router-link>
            </div>

            <VideoSection context="star" title="恒星的一生科幻视频" />
        </div>

        <!-- 黑洞 -->
        <div v-show="tab === 'bh'" class="enc-panel">
            <div class="section-head">
                <h2 class="section-title"><span class="title-icon"><i class="fas fa-circle-dot"></i></span>四类黑洞</h2>
                <p class="section-subtitle">按质量划分：恒星级、中等质量、超大质量与原初黑洞</p>
            </div>
            <div class="type-grid bh-grid">
                <router-link v-for="b in blackholes" :key="b.key" :to="'/detail/blackhole/' + b.key" class="bh-card" v-reveal>
                    <img v-if="b.hero" :src="'/' + b.hero.src" :alt="b.title">
                    <h4>{{ b.title }}</h4>
                    <p>{{ b.sections[0]?.paras[0]?.slice(0, 70) || '' }}…</p>
                </router-link>
            </div>

            <div class="section-head" style="margin-top:3rem;">
                <h2 class="section-title"><span class="title-icon"><i class="fas fa-chart-simple"></i></span>有趣的黑洞数据</h2>
            </div>
            <div class="stats-grid">
                <div v-for="s in BH_STATS" :key="s.label" class="stat-box">
                    <div class="value">{{ s.value }}</div>
                    <div class="label">{{ s.label }}</div>
                </div>
            </div>

            <VideoSection context="blackhole" title="黑洞科普视频" />
        </div>
        <BookSection topic="encyclopedia" />
    </div>
</template>

<style scoped>
/* 分类切换 */
.enc-tabs { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; margin-bottom: 2.6rem; }
.enc-tab {
    display: flex; flex-direction: column; align-items: flex-start; gap: 0.2rem;
    padding: 1.1rem 1.4rem; border-radius: var(--radius-md); cursor: pointer;
    background: var(--tab-grad, rgba(159, 212, 248, 0.06));
    border: 1px solid color-mix(in srgb, var(--tab-color, #9d8cf0) 30%, transparent);
    color: var(--color-text-secondary); text-align: left; transition: all 0.35s ease;
    font-family: inherit; position: relative; overflow: hidden;
}
.enc-tab::before {
    content: '';
    position: absolute; inset: 0;
    background: radial-gradient(circle at 88% 12%, color-mix(in srgb, var(--tab-color, #9d8cf0) 26%, transparent), transparent 58%);
    opacity: 0.7; transition: opacity 0.35s ease; pointer-events: none;
}
.enc-tab-icon {
    width: 34px; height: 34px; border-radius: 10px;
    display: inline-flex; align-items: center; justify-content: center;
    background: color-mix(in srgb, var(--tab-color, #9d8cf0) 20%, transparent);
    border: 1px solid color-mix(in srgb, var(--tab-color, #9d8cf0) 42%, transparent);
    color: var(--tab-color, var(--color-cyan));
    font-size: 1rem; margin-bottom: 0.45rem;
    transition: all 0.35s ease;
}
.enc-tab-main { font-family: var(--font-title); font-size: 1.05rem; color: #e8eefc; }
.enc-tab-sub { font-size: 0.8rem; }
.enc-tab:hover { border-color: var(--tab-color, var(--color-primary)); transform: translateY(-3px); }
.enc-tab:hover::before { opacity: 1; }
.enc-tab:hover .enc-tab-icon { transform: scale(1.08) rotate(-6deg); }
.enc-tab.active {
    background: linear-gradient(135deg, color-mix(in srgb, var(--tab-color, #9d8cf0) 55%, transparent), rgba(14, 18, 34, 0.9));
    border-color: color-mix(in srgb, var(--tab-color, #9d8cf0) 70%, transparent);
    box-shadow: 0 12px 34px color-mix(in srgb, var(--tab-color, #9d8cf0) 34%, transparent);
}
.enc-tab.active .enc-tab-icon { background: rgba(255, 255, 255, 0.18); border-color: rgba(255, 255, 255, 0.4); color: #fff; }
.enc-tab.active i, .enc-tab.active .enc-tab-main { color: #fff; }
.enc-tab.active .enc-tab-sub { color: rgba(255, 255, 255, 0.82); }

/* 卡片网格 */
.type-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1.6rem; }
.bh-grid { grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); }
.type-card, .bh-card {
    background: var(--bg-card); border-radius: var(--radius-md); overflow: hidden;
    text-decoration: none; color: inherit; transition: all 0.35s ease;
}
.type-card { border: 1px solid rgba(159, 212, 248, 0.2); }
.bh-card { border: 1px solid rgba(167, 139, 250, 0.25); }
.type-card:hover { transform: translateY(-6px); border-color: var(--color-primary); box-shadow: var(--shadow-glow-primary); }
.bh-card:hover { transform: translateY(-6px); border-color: var(--color-accent); box-shadow: 0 16px 40px rgba(157, 140, 240, 0.3); }
.type-card img, .bh-card img { width: 100%; height: 170px; object-fit: cover; }
.type-card h4, .bh-card h4 {
    color: var(--color-gold); font-family: var(--font-title);
    padding: 1rem 1.2rem 0.4rem; font-size: 1.05rem;
}
.type-card p, .bh-card p {
    color: var(--color-text-secondary); font-size: 0.85rem;
    line-height: 1.7; padding: 0 1.2rem 1.2rem;
}

/* 黑洞数据 */
.stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; }
.stat-box {
    background: rgba(167, 139, 250, 0.08); padding: 1.5rem; border-radius: var(--radius-md);
    text-align: center; border: 1px solid rgba(167, 139, 250, 0.25);
}
.stat-box .value { font-family: var(--font-title); font-size: 1.5rem; color: var(--color-accent); margin-bottom: 0.5rem; }
.stat-box .label { color: var(--color-text-secondary); font-size: 0.88rem; }

@media (max-width: 768px) {
    .stats-grid { grid-template-columns: 1fr; }
}
</style>
