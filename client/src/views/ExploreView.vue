<script setup>
import { ref, computed } from 'vue';
import BookSection from '../components/BookSection.vue';

// 光年换算
const ly = ref(1);
const lyKm = computed(() => (ly.value * 9.4607e12).toExponential(3) + ' 公里');
const lyAu = computed(() => (ly.value * 63241).toLocaleString('zh-CN') + ' 天文单位');

// 秒差距换算
const pc = ref(1);
const pcLy = computed(() => (pc.value * 3.2616).toFixed(2) + ' 光年');

// 日地距离光行时间
const dist = ref(1.5e8);
const lightTime = computed(() => (dist.value / 299792.458).toFixed(1) + ' 秒');
</script>

<template>
    <div class="container">
        <div class="page-header">
            <span class="page-kicker">ASTRO TOOLS</span>
            <h1>探索工具</h1>
            <p>把天文数字变成可以动手玩的小工具——换算宇宙的尺度与时间。</p>
        </div>

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
</style>
