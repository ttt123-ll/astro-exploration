<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import constellations from '../data/constellations';
import { facts } from '../data/site';
import VideoSection from '../components/VideoSection.vue';
import BookSection from '../components/BookSection.vue';
import PageHeader from '../components/PageHeader.vue';

const season = ref('all');
const seasons = ['all', '春季', '夏季', '秋季', '冬季'];
const list = computed(() => season.value === 'all' ? constellations : constellations.filter(c => c.season === season.value));
const img = c => '/assets/images/constellation_' + (c.latinName || '').toLowerCase() + '.jpg';

/* —— 天文冷知识（原首页区块移入） —— */
const factIdx = ref(0);
let factAuto;
function nextFact() { factIdx.value = (factIdx.value + 1) % facts.length; }
onMounted(() => { factAuto = setInterval(nextFact, 4200); });
onBeforeUnmount(() => clearInterval(factAuto));

/* —— 宇宙尺度之旅（原首页区块移入） —— */
const stages = [
    { name: '地球', size: '直径 12,742 公里', w: 56, cls: 'planet', desc: '我们唯一的家园——一颗蓝色的岩石行星。对人类而言它浩瀚无边，但在宇宙尺度下，它只是一粒微尘。' },
    { name: '木星', size: '直径 139,820 公里', w: 74, cls: 'planet', desc: '太阳系最大的行星，体积能装下1300多个地球。它的大红斑风暴已咆哮了至少300年。' },
    { name: '太阳', size: '直径 139 万公里', w: 118, cls: '', desc: '太阳系的心脏，质量占整个太阳系的99.86%。它的光芒要8分多钟才能抵达地球。' },
    { name: '太阳系', size: '直径约 90 亿公里（海王星轨道内）', w: 140, cls: '', desc: '八大行星的家园。以光速横穿海王星轨道也要约8小时——而这只是宇宙中一个微不足道的角落。' },
    { name: '比邻星', size: '距离 4.2 光年', w: 158, cls: '', desc: '离太阳最近的恒星。目前最快的人类探测器飞过去也需要7万年以上——星际旅行任重道远。' },
    { name: '银河系', size: '直径约 10 万光年', w: 205, cls: 'galaxy', desc: '我们所在的星系，包含1000亿到4000亿颗恒星。太阳只是其中一颗普通的中年恒星。' },
    { name: '本星系群', size: '直径约 1000 万光年', w: 248, cls: 'galaxy', desc: '包含银河系、仙女座星系在内的约80个星系组成的"宇宙社区"，它们相互吸引、缓慢聚拢。' },
    { name: '可观测宇宙', size: '直径约 930 亿光年', w: 300, cls: 'universe', desc: '我们所能看到的宇宙边界，其中藏着约2万亿个星系。而可观测宇宙之外，还有更广阔的未知。' }
];
const scaleIdx = ref(0);

</script>

<template>
    <div class="container">
        <PageHeader kicker="CONSTELLATIONS" title="四季星座" icon="fa-star" :stats="[{ v: String(constellations.length), l: '代表星座' }, { v: '4', l: '观测季节' }]" subtitle="春季看狮子座，夏季寻天蝎座，秋季望飞马座，冬季观猎户座——每一季都有属于自己的星座故事。" />

        <!-- 天文冷知识（原首页区块移入） -->
        <section class="facts-widget">
            <div class="section-head">
                <h2 class="section-title"><span class="title-icon"><i class="fas fa-star"></i></span>天文冷知识</h2>
                <p class="section-subtitle">你知道吗？宇宙里藏着许多让人惊呼的小秘密</p>
            </div>
            <div class="facts-card" v-reveal>
                <div class="facts-icon"><i class="fas fa-lightbulb"></i></div>
                <div class="facts-tag">✦ {{ facts[factIdx].c }}</div>
                <p class="facts-text">{{ facts[factIdx].t }}</p>
                <div class="facts-actions">
                    <button class="btn btn-gold" @click="nextFact"><i class="fas fa-shuffle"></i> 换一条</button>
                    <router-link to="/timeline" class="btn btn-ghost"><i class="fas fa-hourglass-half"></i> 看宇宙编年史</router-link>
                </div>
            </div>
        </section>

        <div class="filter-tabs">
            <button v-for="s in seasons" :key="s" class="filter-tab" :class="{ active: season === s }" @click="season = s">
                {{ s === 'all' ? '全部' : s + '星座' }}
            </button>
        </div>

        <div class="cons-grid">
            <router-link v-for="c in list" :key="c.name" :to="'/detail/constellation/' + c.latinName.toLowerCase()" class="cons-card" v-reveal>
                <div class="cons-img"><img :src="img(c)" :alt="c.name"></div>
                <div class="cons-body">
                    <div class="cons-head"><h3>{{ c.name }}</h3><span class="latin">{{ c.latinName }}</span></div>
                    <p>{{ c.legend.slice(0, 66) }}…</p>
                    <div class="cons-meta">
                        <span><i class="fas fa-calendar"></i> {{ c.bestView }}</span>
                        <span><i class="fas fa-star"></i> {{ c.brightestStar }}</span>
                    </div>
                </div>
            </router-link>
        </div>

        <!-- 宇宙尺度之旅（原首页区块移入） -->
        <section class="scale-section">
            <div class="section-head">
                <h2 class="section-title"><span class="title-icon"><i class="fas fa-expand"></i></span>宇宙尺度之旅</h2>
                <p class="section-subtitle">拖动滑块，从地球出发，感受宇宙到底有多大</p>
            </div>
            <div class="scale-card" v-reveal>
                <div class="scale-stage">
                    <div class="scale-object" :class="stages[scaleIdx].cls" :style="{ width: stages[scaleIdx].w + 'px', height: stages[scaleIdx].w + 'px' }"></div>
                </div>
                <div class="scale-info">
                    <div class="scale-name">{{ stages[scaleIdx].name }}</div>
                    <div class="scale-size">{{ stages[scaleIdx].size }}</div>
                    <p class="scale-desc">{{ stages[scaleIdx].desc }}</p>
                </div>
                <div class="scale-controls">
                    <button class="scale-btn" @click="scaleIdx = Math.max(0, scaleIdx - 1)"><i class="fas fa-minus"></i></button>
                    <input type="range" class="scale-slider" min="0" max="7" step="1" v-model.number="scaleIdx">
                    <button class="scale-btn" @click="scaleIdx = Math.min(7, scaleIdx + 1)"><i class="fas fa-plus"></i></button>
                </div>
                <div class="scale-labels">
                    <span v-for="s in stages" :key="s.name">{{ s.name }}</span>
                </div>
            </div>
        </section>

        <!-- 天文书籍推荐（原首页区块移入） -->
        <BookSection topic="constellations" />

        <VideoSection topic="constellation" title="星座与星空科普视频" />
    </div>
</template>

<style scoped>
.cons-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.6rem; }
.cons-card { background: var(--bg-card); border-radius: var(--radius-md); overflow: hidden; border: 1px solid rgba(159,212,248,0.2); text-decoration: none; color: inherit; transition: all 0.35s ease; }
.cons-card:hover { transform: translateY(-6px); border-color: var(--color-primary); box-shadow: var(--shadow-glow-primary); }
.cons-img img { width: 100%; height: 170px; object-fit: cover; }
.cons-body { padding: 1.2rem 1.3rem 1.4rem; }
.cons-head { display: flex; align-items: baseline; gap: 0.6rem; margin-bottom: 0.5rem; }
.cons-head h3 { font-family: var(--font-title); color: var(--color-gold); font-size: 1.15rem; }
.cons-head .latin { color: var(--color-text-muted); font-size: 0.85rem; font-style: italic; }
.cons-body p { color: var(--color-text-secondary); font-size: 0.85rem; line-height: 1.7; margin-bottom: 0.9rem; }
.cons-meta { display: flex; gap: 1.2rem; color: var(--color-text-muted); font-size: 0.8rem; flex-wrap: wrap; }
.cons-meta i { color: var(--color-cyan); margin-right: 0.3rem; }
</style>
