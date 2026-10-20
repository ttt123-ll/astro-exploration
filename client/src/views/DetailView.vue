<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import content from '../data/content';
import VideoSection from '../components/VideoSection.vue';
import BookSection from '../components/BookSection.vue';
import { GROUP_TOPIC } from '../data/pageBooks';

const route = useRoute();
const group = computed(() => route.params.group);
const key = computed(() => route.params.key);

const data = computed(() => {
    const g = content[group.value];
    return g ? (g[key.value] || null) : null;
});

const groupLabel = { planet: '太阳系行星', star: '恒星与星系', constellation: '四季星座', galaxy: '恒星与星系', blackhole: '黑洞科普', object: '深空天体', telescope: '星空图集' };
const backPath = { planet: '/solar-system', star: '/encyclopedia?tab=stars', constellation: '/constellations', galaxy: '/encyclopedia?tab=stars', blackhole: '/encyclopedia?tab=bh', object: '/deep-space', telescope: '/gallery' };
// 详情页按所属分组匹配科普视频
const videoTopic = computed(() => ({
    planet: 'planet', star: 'star', galaxy: 'star', constellation: 'constellation',
    blackhole: 'blackhole', object: 'deepspace', telescope: 'telescope'
}[group.value] || 'deepspace'));
// 详情页按所属分组匹配主题书单
const bookTopic = computed(() => GROUP_TOPIC[group.value] || 'deep');
</script>

<template>
    <div class="container" v-if="data">
        <div class="breadcrumb">
            <router-link to="/">首页</router-link>
            <i class="fas fa-angle-right"></i>
            <router-link :to="backPath[group]">{{ groupLabel[group] }}</router-link>
            <i class="fas fa-angle-right"></i>
            <span>{{ data.title }}</span>
        </div>

        <div class="detail-header">
            <h1>{{ data.title }}</h1>
            <p class="subtitle">{{ data.subtitle }}</p>
        </div>

        <div class="detail-content">
            <router-link :to="backPath[group]" class="back-btn"><i class="fas fa-arrow-left"></i> 返回{{ groupLabel[group] }}</router-link>
            <img v-if="data.hero" class="hero-image" :src="'/' + data.hero.src" :alt="data.hero.alt || data.title">
            <div v-for="(s, i) in data.sections" :key="i" class="detail-section" v-reveal>
                <h2><i class="fas" :class="'fa-' + ['info-circle','lightbulb','book-open','chart-bar','star'][i % 5]"></i> {{ s.title }}</h2>
                <p v-for="(p, j) in s.paras" :key="j">{{ p }}</p>
            </div>
            <div v-if="data.stats.length" class="stats-grid" v-reveal>
                <div v-for="(s, i) in data.stats" :key="i" class="stat-box">
                    <div class="value">{{ s.value }}</div>
                    <div class="label">{{ s.label }}</div>
                </div>
            </div>

            <VideoSection :topic="videoTopic" title="相关科普视频" />
            <BookSection :topic="bookTopic" />
        </div>
    </div>
    <div class="container" v-else>
        <div class="page-header"><h1>404</h1><p>这颗星不存在——你访问的内容迷失在宇宙深处了。</p></div>
    </div>
</template>

<style scoped>
.detail-header { padding: 1rem 0 1.5rem; text-align: center; }
.detail-header h1 { font-family: var(--font-title); font-size: 3rem; color: var(--color-gold); margin-bottom: 0.5rem; }
.detail-header .subtitle { color: var(--color-text-secondary); font-size: 1.1rem; font-style: italic; }
.detail-content { max-width: 1000px; margin: 0 auto 4rem; }
.hero-image { width: 100%; border-radius: var(--radius-md); box-shadow: var(--shadow-card); margin-bottom: 2.5rem; }
.detail-section { background: var(--bg-card); border-radius: var(--radius-md); padding: 2rem; margin-bottom: 2rem; border: 1px solid rgba(159,212,248,0.15); }
.detail-section h2 { font-family: var(--font-title); color: var(--color-gold); margin-bottom: 1rem; font-size: 1.6rem; display: flex; align-items: center; gap: 0.5rem; }
.detail-section p { color: var(--color-text-secondary); line-height: 1.9; margin-bottom: 1rem; }
.back-btn { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1.5rem; background: rgba(159,212,248,0.1); border: 1px solid rgba(159,212,248,0.3); border-radius: 25px; color: var(--color-cyan); text-decoration: none; margin-bottom: 2rem; transition: all 0.3s; }
.back-btn:hover { background: var(--gradient-primary); color: #fff; border-color: transparent; }
.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 1.2rem; }
.stat-box { background: rgba(159,212,248,0.08); padding: 1.2rem; border-radius: 12px; text-align: center; border: 1px solid rgba(159,212,248,0.2); }
.stat-box .value { font-family: var(--font-title); font-size: 1.25rem; color: var(--color-cyan); margin-bottom: 0.3rem; }
.stat-box .label { color: var(--color-text-secondary); font-size: 0.85rem; }
@media (max-width: 768px) { .detail-header h1 { font-size: 2rem; } .detail-section { padding: 1.2rem; } }
</style>
