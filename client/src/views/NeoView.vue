<script setup>
/**
 * 近地天体观察站（NEO Watch）
 * 数据来自服务端 /api/neo：优先 NASA NeoWs 实时数据，取不到时回退内置离线数据，
 * 并据此计算倒计时。页面对「实时 / 离线」两种来源都有明确标识。
 */
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import api from '../api';
import PageHeader from '../components/PageHeader.vue';
import PageNav from '../components/PageNav.vue';
import BookSection from '../components/BookSection.vue';

const loading = ref(true);
const source = ref('local');       // 'nasa' | 'local'
const objects = ref([]);
const windowRange = ref(null);
const fetchedAt = ref('');
const now = ref(Date.now());

let tick = null;
onMounted(async () => {
    tick = setInterval(() => { now.value = Date.now(); }, 1000);
    try {
        const { data } = await api.get('/neo');
        objects.value = data.objects || [];
        source.value = data.source === 'nasa' ? 'nasa' : 'local';
        windowRange.value = data.window || null;
        fetchedAt.value = data.fetchedAt || '';
    } catch (e) {
        source.value = 'local';
    } finally {
        loading.value = false;
    }
});
onBeforeUnmount(() => clearInterval(tick));

/* —— 倒计时：取下一个未来的接近日期 —— */
function parseDate(s) {
    if (!s) return null;
    const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(s) ? s + 'T12:00:00+08:00' : s);
    return isNaN(d.getTime()) ? null : d;
}

const nextApproach = computed(() => {
    const list = objects.value
        .map(o => ({ ...o, date: parseDate(o.approach) }))
        .filter(o => o.date)
        .sort((a, b) => a.date - b.date);
    const future = list.find(o => o.date.getTime() > now.value);
    return future || list[list.length - 1] || null;
});

const countdown = computed(() => {
    const target = nextApproach.value;
    if (!target) return null;
    let diff = Math.max(0, target.date.getTime() - now.value);
    const day = Math.floor(diff / 86400000); diff -= day * 86400000;
    const hour = Math.floor(diff / 3600000); diff -= hour * 3600000;
    const min = Math.floor(diff / 60000); diff -= min * 60000;
    const sec = Math.floor(diff / 1000);
    return { day, hour, min, sec, past: target.date.getTime() <= now.value };
});

const hazardCount = computed(() => objects.value.filter(o => o.hazardous).length);
const sourceLabel = computed(() => source.value === 'nasa' ? 'NASA NeoWs 实时' : '内置离线数据库');
</script>

<template>
    <div class="container">
        <PageNav title="近地天体观察" />
        <PageHeader kicker="NEO WATCH" title="近地天体观察站" icon="fa-meteor" deco="nebula"
                    :stats="[
                        { v: String(objects.length), l: '监测目标' },
                        { v: String(hazardCount), l: '潜在威胁' },
                        { v: source === 'nasa' ? '实时' : '离线', l: '数据来源' }
                    ]"
                    subtitle="追踪正在接近地球的小行星——实时倒计时、尺寸、速度与最近距离，数据优先取自 NASA NeoWs。" />

        <!-- 倒计时主卡 -->
        <section class="neo-hero" v-if="nextApproach && countdown">
            <div class="neo-hero-bg"></div>
            <div class="neo-hero-inner">
                <div class="neo-hero-left">
                    <span class="neo-kicker"><i class="fas fa-satellite"></i> 下一次近距离接近</span>
                    <h2 class="neo-name">{{ nextApproach.name }}</h2>
                    <p class="neo-note">{{ nextApproach.note }}</p>
                    <div class="neo-meta">
                        <span><i class="fas fa-ruler-combined"></i> 直径 {{ nextApproach.diameter }}</span>
                        <span><i class="fas fa-gauge-high"></i> {{ nextApproach.velocity }}</span>
                        <span><i class="fas fa-arrows-left-right"></i> 最近距离 {{ nextApproach.miss }}</span>
                    </div>
                </div>
                <div class="neo-count">
                    <p class="neo-count-label">{{ countdown.past ? '最近一次接近（已过去）' : '距离接近还有' }}</p>
                    <div class="neo-count-grid">
                        <div class="nc-cell"><b>{{ countdown.day }}</b><span>天</span></div>
                        <div class="nc-cell"><b>{{ String(countdown.hour).padStart(2, '0') }}</b><span>时</span></div>
                        <div class="nc-cell"><b>{{ String(countdown.min).padStart(2, '0') }}</b><span>分</span></div>
                        <div class="nc-cell"><b>{{ String(countdown.sec).padStart(2, '0') }}</b><span>秒</span></div>
                    </div>
                    <p class="neo-count-date"><i class="fas fa-calendar-day"></i> {{ nextApproach.approach }}</p>
                </div>
            </div>
        </section>

        <!-- 数据来源 -->
        <div class="neo-source" :class="{ live: source === 'nasa' }">
            <span class="neo-dot"></span>
            <span>数据来源：<b>{{ sourceLabel }}</b></span>
            <span v-if="windowRange" class="neo-window">观测窗口 {{ windowRange.from }} ~ {{ windowRange.to }}</span>
            <span v-else class="neo-window">离线数据 · 连接恢复后自动切换为实时</span>
            <span v-if="fetchedAt" class="neo-window">同步于 {{ new Date(fetchedAt).toLocaleString('zh-CN') }}</span>
        </div>

        <!-- 目标列表 -->
        <section class="neo-list">
            <div class="section-head">
                <h2 class="section-title"><span class="title-icon"><i class="fas fa-list-ul"></i></span>监测目标</h2>
                <p class="section-subtitle">按接近日期排序 · 红色标记为潜在威胁天体（PHA）</p>
            </div>

            <div v-if="loading" class="neo-skel">
                <div v-for="i in 4" :key="i" class="skel-card">
                    <div class="skel skel-title"></div>
                    <div class="skel skel-line w100"></div>
                    <div class="skel skel-line w60"></div>
                </div>
            </div>

            <div v-else class="neo-grid">
                <article v-for="o in objects" :key="o.id" class="neo-card" :class="{ hazard: o.hazardous }">
                    <div class="neo-card-head">
                        <span class="neo-orb"></span>
                        <div>
                            <h3>{{ o.name }}</h3>
                            <span class="neo-date"><i class="fas fa-calendar-day"></i> {{ o.approach }}</span>
                        </div>
                        <span v-if="o.hazardous" class="neo-flag"><i class="fas fa-triangle-exclamation"></i> PHA</span>
                    </div>
                    <div class="neo-rows">
                        <div><span class="k">直径</span><span class="v">{{ o.diameter }}</span></div>
                        <div><span class="k">相对速度</span><span class="v">{{ o.velocity }}</span></div>
                        <div><span class="k">最近距离</span><span class="v">{{ o.miss }}</span></div>
                    </div>
                    <p class="neo-desc">{{ o.note }}</p>
                </article>
            </div>
        </section>

        <BookSection topic="neo" />
    </div>
</template>

<style scoped>
/* —— 倒计时主卡 —— */
.neo-hero {
    position: relative;
    margin: 0.4rem 0 1.6rem;
    border-radius: 20px;
    overflow: hidden;
    border: 1px solid rgba(232, 132, 110, 0.32);
    background: rgba(10, 13, 26, 0.62);
    backdrop-filter: blur(14px);
}

.neo-hero-bg {
    position: absolute;
    inset: 0;
    background:
        radial-gradient(ellipse 40% 70% at 82% 30%, rgba(232, 132, 110, 0.28), transparent 62%),
        radial-gradient(ellipse 36% 60% at 14% 76%, rgba(157, 140, 240, 0.22), transparent 64%);
    animation: neoDrift 14s ease-in-out infinite alternate;
}

@keyframes neoDrift {
    from { transform: scale(1); }
    to { transform: scale(1.12) translate(-1.5%, 1%); }
}

.neo-hero-inner {
    position: relative;
    display: grid;
    grid-template-columns: 1.35fr 0.85fr;
    gap: 2rem;
    padding: 1.8rem 2rem;
    align-items: center;
}

.neo-kicker {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    font-size: 0.76rem;
    letter-spacing: 0.18em;
    color: #f0a08a;
    margin-bottom: 0.6rem;
}

.neo-name {
    font-family: var(--font-title);
    font-size: 1.7rem;
    color: #fff;
    letter-spacing: 0.04em;
    margin-bottom: 0.7rem;
}

.neo-note {
    color: var(--color-text-secondary);
    font-size: 0.86rem;
    line-height: 1.85;
    margin-bottom: 0.9rem;
}

.neo-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 1.3rem;
    font-size: 0.8rem;
    color: var(--color-text-muted);
}

.neo-meta i { color: var(--color-cyan); margin-right: 0.3rem; }

.neo-count { text-align: center; }

.neo-count-label {
    font-size: 0.76rem;
    letter-spacing: 0.16em;
    color: var(--color-text-muted);
    margin-bottom: 0.7rem;
}

.neo-count-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.5rem;
}

.nc-cell {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    padding: 0.6rem 0.3rem;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.1);
}

.nc-cell b {
    /* 中文语境下用正文字体，避免 Orbitron 数字字形与中文混排错位 */
    font-family: var(--font-body);
    font-size: 1.5rem;
    color: #ffd7c9;
    font-variant-numeric: tabular-nums;
    line-height: 1.1;
}

.nc-cell span { font-size: 0.68rem; color: var(--color-text-muted); }

.neo-count-date {
    margin-top: 0.7rem;
    font-size: 0.78rem;
    color: var(--color-text-secondary);
    letter-spacing: 0.05em;
}

/* —— 数据来源条 —— */
.neo-source {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.8rem;
    padding: 0.7rem 1.1rem;
    margin-bottom: 2rem;
    border-radius: 50px;
    background: rgba(159, 212, 248, 0.06);
    border: 1px solid rgba(159, 212, 248, 0.16);
    font-size: 0.78rem;
    color: var(--color-text-secondary);
}

.neo-source b { color: var(--color-gold); }

.neo-dot {
    width: 8px; height: 8px;
    border-radius: 50%;
    background: #f0a060;
    box-shadow: 0 0 10px #f0a060;
}

.neo-source.live .neo-dot { background: #4ade80; box-shadow: 0 0 10px #4ade80; }

.neo-window { color: var(--color-text-muted); font-size: 0.72rem; }

/* —— 目标卡片 —— */
.neo-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1.2rem;
}

.neo-card {
    position: relative;
    padding: 1.2rem 1.3rem;
    border-radius: 16px;
    background: var(--bg-card);
    border: 1px solid rgba(159, 212, 248, 0.16);
    transition: transform 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
    overflow: hidden;
}

.neo-card:hover {
    transform: translateY(-5px);
    border-color: rgba(159, 212, 248, 0.5);
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.45);
}

.neo-card.hazard { border-color: rgba(232, 132, 110, 0.38); }
.neo-card.hazard:hover { border-color: rgba(232, 132, 110, 0.75); box-shadow: 0 16px 40px rgba(232, 132, 110, 0.25); }

.neo-card-head {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.9rem;
}

.neo-orb {
    width: 34px; height: 34px;
    border-radius: 50%;
    flex-shrink: 0;
    background: radial-gradient(circle at 32% 30%, #fff 0%, #9a9488 45%, #10131c 100%);
    box-shadow: 0 0 14px rgba(159, 212, 248, 0.25);
}

.neo-card.hazard .neo-orb {
    background: radial-gradient(circle at 32% 30%, #ffe0d0 0%, #c96f4a 46%, #180d0a 100%);
    box-shadow: 0 0 16px rgba(232, 132, 110, 0.5);
}

.neo-card-head h3 {
    font-family: var(--font-title);
    font-size: 0.98rem;
    color: var(--color-gold);
    line-height: 1.35;
}

.neo-date { font-size: 0.72rem; color: var(--color-text-muted); }
.neo-date i { margin-right: 0.25rem; }

.neo-flag {
    margin-left: auto;
    font-size: 0.66rem;
    letter-spacing: 0.1em;
    color: #ffb59f;
    border: 1px solid rgba(232, 132, 110, 0.5);
    border-radius: 50px;
    padding: 0.15rem 0.5rem;
    white-space: nowrap;
}

.neo-rows {
    display: grid;
    gap: 0.4rem;
    margin-bottom: 0.8rem;
}

.neo-rows > div {
    display: flex;
    justify-content: space-between;
    gap: 0.8rem;
    font-size: 0.8rem;
    padding-bottom: 0.35rem;
    border-bottom: 1px dashed rgba(159, 212, 248, 0.12);
}

.neo-rows .k { color: var(--color-text-muted); }
.neo-rows .v { color: #e8eefc; font-variant-numeric: tabular-nums; }

.neo-desc {
    font-size: 0.78rem;
    line-height: 1.75;
    color: var(--color-text-secondary);
}

.neo-skel { display: grid; gap: 1rem; }

@media (max-width: 860px) {
    .neo-hero-inner { grid-template-columns: 1fr; padding: 1.4rem; }
    .neo-count { margin-top: 0.4rem; }
    .neo-name { font-size: 1.35rem; }
}
</style>
