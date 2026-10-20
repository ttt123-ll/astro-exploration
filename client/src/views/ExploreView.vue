<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { facts } from '../data/site';
import BookSection from '../components/BookSection.vue';
import PageHeader from '../components/PageHeader.vue';

/* —— 光年换算 —— */
const ly = ref(1);
const lyKm = computed(() => (ly.value * 9.4607e12).toExponential(3) + ' 公里');
const lyAu = computed(() => (ly.value * 63241).toLocaleString('zh-CN') + ' 天文单位');

/* —— 秒差距换算 —— */
const pc = ref(1);
const pcLy = computed(() => (pc.value * 3.2616).toFixed(2) + ' 光年');

/* —— 光行时间 —— */
const dist = ref(1.5e8);
const lightTime = computed(() => (dist.value / 299792.458).toFixed(1) + ' 秒');

/* —— 天文冷知识（原四季星座页移入） —— */
const factIdx = ref(0);
let factAuto;
function nextFact() { factIdx.value = (factIdx.value + 1) % facts.length; }
onMounted(() => { factAuto = setInterval(nextFact, 4200); });
onBeforeUnmount(() => clearInterval(factAuto));

/* —— 宇宙尺度之旅（原四季星座页移入） —— */
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
        <PageHeader kicker="ASTRO TOOLS" title="探索工具" icon="fa-calculator" deco="grid"
                    :stats="[{ v: '3', l: '换算工具' }, { v: String(stages.length), l: '尺度层级' }, { v: String(facts.length), l: '天文冷知识' }]"
                    subtitle="把天文数字变成可以动手玩的小工具——换算宇宙的尺度与时间，顺便看看那些让人惊呼的冷知识。" />

        <div class="tool-grid">
            <div class="tool-card" v-reveal>
                <div class="tool-icon"><i class="fas fa-ruler"></i></div>
                <h3>光年换算</h3>
                <label>光年：<input type="number" v-model.number="ly" min="0"></label>
                <p class="result">{{ lyKm }}</p>
                <p class="result">{{ lyAu }}</p>
            </div>
            <div class="tool-card" v-reveal>
                <div class="tool-icon"><i class="fas fa-arrows-left-right"></i></div>
                <h3>秒差距 ↔ 光年</h3>
                <label>秒差距：<input type="number" v-model.number="pc" min="0"></label>
                <p class="result">{{ pcLy }}</p>
                <p class="hint">1 秒差距 ≈ 3.26 光年，是测量恒星距离的常用单位。</p>
            </div>
            <div class="tool-card" v-reveal>
                <div class="tool-icon"><i class="fas fa-stopwatch"></i></div>
                <h3>光行时间</h3>
                <label>距离（公里）：<input type="number" v-model.number="dist" min="0"></label>
                <p class="result">光需要 {{ lightTime }}</p>
                <p class="hint">日地平均距离约 1.5 亿公里，光要走 8 分多钟。</p>
            </div>
        </div>

        <!-- 天文冷知识 -->
        <section class="facts-widget">
            <div class="section-head">
                <h2 class="section-title"><span class="title-icon"><i class="fas fa-lightbulb"></i></span>天文冷知识</h2>
                <p class="section-subtitle">你知道吗？宇宙里藏着许多让人惊呼的小秘密</p>
            </div>
            <div class="facts-card" v-reveal>
                <div class="facts-icon"><i class="fas fa-lightbulb"></i></div>
                <div class="facts-tag">✦ {{ facts[factIdx].c }}</div>
                <p class="facts-text">{{ facts[factIdx].t }}</p>
                <div class="facts-actions">
                    <button class="btn btn-gold" @click="nextFact"><i class="fas fa-shuffle"></i> 换一条</button>
                </div>
            </div>
        </section>

        <!-- 宇宙尺度之旅 -->
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
                    <input class="scale-slider" type="range" min="0" max="7" step="1" v-model.number="scaleIdx">
                    <div class="scale-ticks">
                        <span v-for="(s, i) in stages" :key="s.name" :class="{ on: scaleIdx === i }">{{ s.name }}</span>
                    </div>
                </div>
            </div>
        </section>

        <BookSection topic="explore" />
    </div>
</template>

<style scoped>
.tool-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.6rem; }
.tool-card { background: var(--bg-card); border: 1px solid rgba(159,212,248,0.22); border-radius: var(--radius-lg); padding: 2rem; text-align: center; }
.tool-icon { width: 70px; height: 70px; border-radius: 50%; background: var(--gradient-primary); display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem; font-size: 1.7rem; color: #fff; box-shadow: 0 0 26px rgba(157,140,240,0.45); }
.tool-card h3 { color: var(--color-gold); font-family: var(--font-title); margin-bottom: 1rem; }
.tool-card label { display: block; color: var(--color-text-secondary); font-size: 0.9rem; margin-bottom: 0.8rem; }
.tool-card input { width: 120px; padding: 0.5rem; border-radius: 8px; border: 1px solid rgba(159,212,248,0.4); background: rgba(255,255,255,0.05); color: #fff; font-size: 1rem; text-align: center; }
.tool-card .result { color: var(--color-cyan); font-family: var(--font-title); font-size: 1.05rem; margin: 0.5rem 0; }
.tool-card .hint { color: var(--color-text-muted); font-size: 0.8rem; line-height: 1.6; margin-top: 0.8rem; }

/* 冷知识 / 尺度之旅：区块上下间距 */
.facts-widget { margin-top: 3.4rem; }
.scale-section { margin-top: 3.4rem; }
</style>
