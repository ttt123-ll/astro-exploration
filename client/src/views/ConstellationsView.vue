<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import constellations from '../data/constellations';
import BookSection from '../components/BookSection.vue';
import PageHeader from '../components/PageHeader.vue';
import content from '../data/content';
import { projectFigure, CONSTELLATION_FIGURES } from '../data/constellationLines';
import {
    METEOR_SHOWERS, SEASON_DEEP_SKY, SEASON_TIPS,
    FOUR_SYMBOLS, IAU_88, STAR_MNEMONICS, EAST_WEST_NOTE
} from '../data/skyCalendar';
import {
    moonPhase, stargazingScore, sunTimes, localSiderealTime, altAz,
    azToDir, fmtClock, tonightAt21
} from '../utils/sky';

/* ===================== 四季配色体系 ===================== */
const SEASONS = [
    { key: '春季', color: '#6ec8a8', rgb: '110,200,168', months: [3, 4, 5], icon: 'fa-seedling', name: '春 · 狮子与室女' },
    { key: '夏季', color: '#6ea4e8', rgb: '110,164,232', months: [6, 7, 8], icon: 'fa-sun', name: '夏 · 天蝎与天鹅' },
    { key: '秋季', color: '#e8a06e', rgb: '232,160,110', months: [9, 10, 11], icon: 'fa-leaf', name: '秋 · 飞马与仙后' },
    { key: '冬季', color: '#9fd8f0', rgb: '159,216,240', months: [12, 1, 2], icon: 'fa-snowflake', name: '冬 · 猎户与金牛' }
];
const SEASON_MAP = Object.fromEntries(SEASONS.map(s => [s.key, s]));

/* 按当前月份自动选中当季 */
const nowMonth = new Date().getMonth() + 1;
const currentSeason = (SEASONS.find(s => s.months.includes(nowMonth)) || SEASONS[3]).key;
const season = ref(currentSeason);
const tabs = ['全部', '春季', '夏季', '秋季', '冬季'];

/* "12月-2月" → [12,1,2] */
function viewMonths(bestView) {
    const nums = String(bestView || '').match(/\d{1,2}/g) || [];
    if (nums.length < 2) return [];
    let a = Number(nums[0]), b = Number(nums[1]);
    const out = [];
    for (let i = 0; i < 12; i++) {
        const m = (a + i - 1) % 12 + 1;
        out.push(m);
        if (m === b) break;
    }
    return out;
}

const isRecommended = c => viewMonths(c.bestView).includes(nowMonth);

/* 当季星座排前 + 本月推荐优先 */
const list = computed(() => {
    const base = season.value === '全部' ? constellations.slice() : constellations.filter(c => c.season === season.value);
    const order = season.value === '全部'
        ? (c) => (c.season === currentSeason ? 0 : 1)
        : () => 0;
    return base.sort((a, b) => {
        const oa = order(a), ob = order(b);
        if (oa !== ob) return oa - ob;
        const ra = isRecommended(a) ? 0 : 1, rb = isRecommended(b) ? 0 : 1;
        if (ra !== rb) return ra - rb;
        return 0;
    });
});

/* ===================== 真实星座连线 ===================== */
const figureCache = new Map();
function figureOf(c) {
    if (!figureCache.has(c.latinName)) figureCache.set(c.latinName, projectFigure(c.latinName));
    return figureCache.get(c.latinName);
}
const img = c => '/assets/images/constellation_' + (c.latinName || '').toLowerCase() + '.jpg';

/* ===================== 卡片 3D 微倾斜 ===================== */
function tilt(e) {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty('--ry', (px * 9).toFixed(2) + 'deg');
    el.style.setProperty('--rx', (-py * 7).toFixed(2) + 'deg');
}
function resetTilt(e) {
    const el = e.currentTarget;
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--ry', '0deg');
}

/* ===================== 今晚观星指南 ===================== */
const OBS_LAT = 35;   // 观测地纬度（默认北纬 35°，可自行调整）
const OBS_LON = 110;  // 观测地经度（默认东经 110°）

const now = ref(new Date());
let clockTimer = null;
onMounted(() => { clockTimer = setInterval(() => { now.value = new Date(); }, 60000); });
onBeforeUnmount(() => { if (clockTimer) clearInterval(clockTimer); });

const moon = computed(() => moonPhase(now.value));
const score = computed(() => stargazingScore(moon.value));
const verdict = computed(() => {
    const s = score.value;
    if (s >= 80) return { text: '非常适合观星', tone: 'good', icon: 'fa-check' };
    if (s >= 55) return { text: '适合观星（月光略有干扰）', tone: 'ok', icon: 'fa-circle-check' };
    if (s >= 30) return { text: '可以看亮天体，深空目标受影响', tone: 'warn', icon: 'fa-triangle-exclamation' };
    return { text: '月光较强，建议改看月亮或改天再来', tone: 'bad', icon: 'fa-circle-exclamation' };
});

const sun = computed(() => sunTimes(now.value, OBS_LAT, OBS_LON));
const bestWindow = computed(() => {
    const s = sun.value;
    if (!s) return '—';
    const start = Math.max(s.dusk, s.sunset + 1);
    const end = Math.min(start + 4, 27);
    return fmtClock(start) + ' — ' + fmtClock(end);
});

/* 月相 SVG 路径（新月到满月再到新月） */
const moonPath = computed(() => {
    const p = moon.value.phase;
    const rx = Math.max(0.5, Math.abs(Math.cos(2 * Math.PI * p)) * 45);
    if (p <= 0.5) {
        // 盈：亮面在右
        const sweepInner = p < 0.25 ? 0 : 1;
        return 'M 50 5 A 45 45 0 0 1 50 95 A ' + rx + ' 45 0 0 ' + sweepInner + ' 50 5 Z';
    }
    // 亏：亮面在左
    const sweepInner = p < 0.75 ? 1 : 0;
    return 'M 50 5 A 45 45 0 0 0 50 95 A ' + rx + ' 45 0 0 ' + sweepInner + ' 50 5 Z';
});

/* 当季星座今晚 21:00 的方位与高度 */
const seasonConstellations = computed(() => {
    const key = season.value === '全部' ? currentSeason : season.value;
    return constellations.filter(c => c.season === key);
});

const tonightLst = computed(() => localSiderealTime(tonightAt21(now.value), OBS_LON));

function figureCenter(latinName) {
    const fig = CONSTELLATION_FIGURES[latinName];
    if (!fig) return null;
    const ras = fig.stars.map(s => s[0]);
    // 处理跨 0 点赤经
    const minRa = Math.min(...ras), maxRa = Math.max(...ras);
    const shift = maxRa - minRa > 12 ? 24 : 0;
    const ra = ras.reduce((a, r) => a + (r < 12 && shift ? r + shift : r), 0) / ras.length;
    const dec = fig.stars.reduce((a, s) => a + s[1], 0) / fig.stars.length;
    return { ra: ra % 24, dec };
}

const skyPositions = computed(() => seasonConstellations.value.map(c => {
    const center = figureCenter(c.latinName);
    if (!center) return { name: c.name, alt: null, dir: '—', visible: false, color: SEASON_MAP[c.season].color };
    const { alt, az } = altAz(center.ra, center.dec, tonightLst.value, OBS_LAT);
    return {
        name: c.name,
        alt: Math.round(alt),
        dir: azToDir(az),
        visible: alt > 10,
        color: SEASON_MAP[c.season].color
    };
}));

/* ===================== 当季天象日历 ===================== */
const calendarSeason = computed(() => season.value === '全部' ? currentSeason : season.value);
const seasonTip = computed(() => SEASON_TIPS[calendarSeason.value] || null);
const seasonShowers = computed(() => METEOR_SHOWERS.filter(s => s.season === calendarSeason.value));
const seasonDeepSky = computed(() => (SEASON_DEEP_SKY[calendarSeason.value] || []).map(d => {
    const obj = content.object && content.object[d.key];
    return {
        ...d,
        title: obj ? obj.title : d.name,
        img: obj && obj.hero ? '/' + obj.hero.src : '',
        key: d.key
    };
}));

/* ===================== 三垣四象二十八宿 ===================== */
const symbolIdx = ref(0);
const activeSymbol = computed(() => FOUR_SYMBOLS[symbolIdx.value]);
function pickSymbolBySeason(s) {
    const idx = FOUR_SYMBOLS.findIndex(f => f.season === s);
    symbolIdx.value = idx >= 0 ? idx : 0;
}
// 季节 tab 变化时，四象模板跟随联动
watch(season, (v) => { if (v !== '全部') pickSymbolBySeason(v); });
onMounted(() => pickSymbolBySeason(currentSeason));

/* ===================== 88 星座（选做） ===================== */
const show88 = ref(false);
const iau88 = computed(() => IAU_88.map(([cn, latin, zone]) => ({ cn, latin, zone })));
const iauZone = ref('全部');
const iauFiltered = computed(() => iauZone.value === '全部' ? iau88.value : iau88.value.filter(x => x.zone === iauZone.value));

</script>

<template>
    <div class="container">
        <PageHeader kicker="CONSTELLATIONS" title="四季星座" icon="fa-star" deco="stars"
                    :stats="[
                        { v: String(constellations.length), l: '代表星座' },
                        { v: '4', l: '观测季节' },
                        { v: currentSeason, l: '当季推荐' }
                    ]"
                    subtitle="春季看狮子座，夏季寻天蝎座，秋季望飞马座，冬季观猎户座——每一季都有属于自己的星空故事。" />

        <!-- ===== 今晚观星指南（纯 JS 计算，无 API） ===== -->
        <section class="obs-guide" v-reveal>
            <div class="og-left">
                <div class="og-moon">
                    <svg viewBox="0 0 100 100" class="og-moon-svg" aria-hidden="true">
                        <circle cx="50" cy="50" r="45" class="og-moon-dark"></circle>
                        <path :d="moonPath" class="og-moon-lit"></path>
                    </svg>
                    <div class="og-moon-meta">
                        <strong>{{ moon.name }}</strong>
                        <span>{{ moon.en }}</span>
                    </div>
                </div>
                <div class="og-moon-stats">
                    <div class="og-stat"><span class="k">照亮</span><span class="v">{{ Math.round(moon.illumination * 100) }}%</span></div>
                    <div class="og-stat"><span class="k">月龄</span><span class="v">{{ moon.age.toFixed(1) }} 天</span></div>
                    <div class="og-stat"><span class="k">下次满月</span><span class="v">{{ moon.daysToFull < 1 ? '今夜' : moon.daysToFull.toFixed(1) + ' 天' }}</span></div>
                </div>
            </div>

            <div class="og-mid">
                <div class="og-verdict" :class="verdict.tone">
                    <i class="fas" :class="verdict.icon"></i>
                    <div>
                        <strong>{{ verdict.text }}</strong>
                        <span>观星指数 {{ score }} / 100</span>
                    </div>
                </div>
                <div class="og-window">
                    <i class="fas fa-clock"></i>
                    <div>
                        <strong>今晚最佳观测窗口 {{ bestWindow }}</strong>
                        <span>日落 {{ fmtClock(sun && sun.sunset) }} · 天文暮光结束 {{ fmtClock(sun && sun.dusk) }}（按北纬 35° 估算）</span>
                    </div>
                </div>
                <p class="og-tip" v-if="seasonTip"><i class="fas fa-lightbulb"></i> {{ seasonTip.note }}</p>
            </div>

            <div class="og-right">
                <h4 class="og-sub"><i class="fas fa-location-arrow"></i> 今晚 21:00 · {{ calendarSeason }}星座位置</h4>
                <div class="og-pos">
                    <div v-for="p in skyPositions" :key="p.name" class="og-pos-item" :class="{ dim: !p.visible }">
                        <span class="og-dot" :style="{ background: p.color }"></span>
                        <span class="og-name">{{ p.name }}</span>
                        <span class="og-pos-val">{{ p.alt === null ? '—' : p.dir + ' · ' + p.alt + '°' }}</span>
                        <i v-if="p.visible" class="fas fa-eye og-eye"></i>
                        <i v-else class="fas fa-eye-slash og-eye dim"></i>
                    </div>
                </div>
                <p class="og-note">高度角 &gt; 10° 视为可观测；数据按当地恒星时实时计算</p>
            </div>
        </section>


        <!-- 季节切换：每个季节有自己的颜色 -->
        <div class="season-tabs">
            <button v-for="t in tabs" :key="t" class="season-tab"
                    :class="{ active: season === t }"
                    :style="{ '--s-color': t === '全部' ? '#d8e0f4' : SEASON_MAP[t].color, '--s-rgb': t === '全部' ? '216,224,244' : SEASON_MAP[t].rgb }"
                    @click="season = t">
                <i v-if="t !== '全部'" class="fas" :class="SEASON_MAP[t].icon"></i>
                {{ t === '全部' ? '全部星座' : t }}
                <span v-if="t === currentSeason" class="tab-now">当季</span>
            </button>
        </div>

        <p class="season-hint">
            <i class="fas fa-location-dot"></i>
            当前 {{ nowMonth }} 月，属于<b>{{ currentSeason }}</b>星空 · 本季共 {{ list.length }} 个星座{{ season === '全部' ? '，当季已置顶' : '' }}，带「本月推荐」的是此刻最值得看的
        </p>

        <!-- 星座卡片 -->
        <div class="cons-grid">
            <router-link v-for="c in list" :key="c.name"
                         :to="'/detail/constellation/' + c.latinName.toLowerCase()"
                         class="cons-card" v-reveal
                         :style="{ '--c-color': SEASON_MAP[c.season].color, '--c-rgb': SEASON_MAP[c.season].rgb }"
                         @mousemove="tilt" @mouseleave="resetTilt">
                <div class="cons-img">
                    <img :src="img(c)" :alt="c.name" loading="lazy">

                    <!-- 真实星座连线：hover 时逐段点亮 -->
                    <svg v-if="figureOf(c)" class="cons-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                        <line v-for="(seg, si) in figureOf(c).lines" :key="'l' + si"
                              :x1="figureOf(c).points[seg[0]].x" :y1="figureOf(c).points[seg[0]].y"
                              :x2="figureOf(c).points[seg[1]].x" :y2="figureOf(c).points[seg[1]].y"
                              pathLength="1" class="seg" :style="{ transitionDelay: (si * 0.1) + 's' }"></line>
                        <circle v-for="(pt, pi) in figureOf(c).points" :key="'p' + pi"
                                :cx="pt.x" :cy="pt.y" r="1.5" class="star" :style="{ transitionDelay: (pi * 0.05) + 's' }"></circle>
                    </svg>

                    <!-- 顶部：季节角标 + 最佳观测月份 -->
                    <div class="cons-badges">
                        <span class="cons-season" :style="{ '--c-color': SEASON_MAP[c.season].color }">
                            <i class="fas" :class="SEASON_MAP[c.season].icon"></i> {{ c.season }}
                        </span>
                        <span v-if="isRecommended(c)" class="cons-now"><i class="fas fa-bolt"></i> 本月推荐</span>
                    </div>
                    <span class="cons-view"><i class="fas fa-binoculars"></i> 最佳观测 {{ c.bestView }}</span>
                    <span class="cons-watermark">{{ c.latinName }}</span>
                </div>

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


        <!-- ===== 当季天象日历（跟随季节 tab） ===== -->
        <section class="sky-calendar" v-reveal>
            <div class="section-head">
                <h2 class="section-title"><span class="title-icon"><i class="fas fa-calendar-days"></i></span>{{ calendarSeason }}天象日历</h2>
                <p class="section-subtitle">流星雨峰值 · 本季最佳深空目标 · 静态数据，断网可用</p>
            </div>

            <div class="cal-grid">
                <!-- 流星雨 -->
                <div class="cal-card">
                    <h3 class="cal-h"><i class="fas fa-meteor"></i> 流星雨</h3>
                    <div v-if="!seasonShowers.length" class="cal-empty">本季暂无主要流星雨</div>
                    <div v-for="m in seasonShowers" :key="m.name" class="shower-item">
                        <div class="shower-head">
                            <strong>{{ m.name }}</strong>
                            <span class="shower-zhr">ZHR {{ m.zhr }}</span>
                        </div>
                        <div class="shower-meta">
                            <span><i class="fas fa-calendar-day"></i> {{ m.peak }}</span>
                            <span><i class="fas fa-crosshairs"></i> {{ m.radiant }}</span>
                        </div>
                        <p class="shower-desc">{{ m.desc }}</p>
                        <span class="shower-parent"><i class="fas fa-star-of-life"></i> 母体：{{ m.parent }}</span>
                    </div>
                </div>

                <!-- 深空目标 -->
                <div class="cal-card">
                    <h3 class="cal-h"><i class="fas fa-hurricane"></i> 本季最佳深空目标</h3>
                    <div class="deep-targets">
                        <router-link v-for="d in seasonDeepSky" :key="d.key" :to="'/detail/object/' + d.key" class="deep-item">
                            <img v-if="d.img" :src="d.img" :alt="d.title" loading="lazy">
                            <div class="deep-body">
                                <strong>{{ d.name }}</strong>
                                <p>{{ d.desc }}</p>
                            </div>
                        </router-link>
                    </div>
                </div>
            </div>

            <!-- 观测建议 -->
            <div class="cal-tip" v-if="seasonTip">
                <i class="fas fa-binoculars"></i>
                <span>{{ calendarSeason }}观测建议：最佳时段约 <b>{{ seasonTip.bestHour }}:00</b>，主要看 <b>{{ seasonTip.direction }}</b> 天空。</span>
            </div>
        </section>


        <!-- ===== 三垣四象二十八宿（中西对照 · 文化差异化模块） ===== -->
        <section class="four-symbols" v-reveal>
            <div class="section-head">
                <h2 class="section-title"><span class="title-icon"><i class="fas fa-dragon"></i></span>三垣四象二十八宿</h2>
                <p class="section-subtitle">中国古人把黄道附近的星空分成二十八宿，再按四季方位归为四象——与西方 88 星座形成中西对照</p>
            </div>

            <div class="symbol-tabs">
                <button v-for="(s, i) in FOUR_SYMBOLS" :key="s.key" class="symbol-tab"
                        :class="{ active: symbolIdx === i }"
                        :style="{ '--f-color': s.color }"
                        @click="symbolIdx = i">
                    <i class="fas fa-compass"></i>
                    <strong>{{ s.key }}</strong>
                    <span>{{ s.season }} · {{ s.direction }}方 · {{ s.element }}</span>
                </button>
            </div>

            <div class="symbol-panel" :style="{ '--f-color': activeSymbol.color }">
                <div class="symbol-intro">
                    <h3>{{ activeSymbol.key }}七宿 <span class="symbol-en">{{ activeSymbol.season }} · {{ activeSymbol.direction }}方 · 属{{ activeSymbol.element }}</span></h3>
                    <p>{{ activeSymbol.desc }}</p>
                </div>
                <div class="mansion-grid">
                    <div v-for="(m, i) in activeSymbol.mansions" :key="m.name" class="mansion-card">
                        <span class="mansion-no">{{ i + 1 }}</span>
                        <h4>{{ m.name }}宿</h4>
                        <p class="mansion-star"><i class="fas fa-star"></i> {{ m.star }}</p>
                        <p class="mansion-meaning">{{ m.meaning }}</p>
                    </div>
                </div>
            </div>

            <div class="ew-note"><i class="fas fa-scale-balanced"></i> {{ EAST_WEST_NOTE }}</div>

            <!-- 西方 88 星座（可展开） -->
            <div class="iau-panel">
                <button class="iau-toggle" @click="show88 = !show88">
                    <i class="fas" :class="show88 ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
                    {{ show88 ? '收起' : '展开' }}西方 88 星座全表（IAU 1922 年划定）
                </button>
                <div v-show="show88" class="iau-body">
                    <div class="iau-filter">
                        <button v-for="z in ['全部', '北', '南', '黄道']" :key="z" class="iau-chip"
                                :class="{ active: iauZone === z }" @click="iauZone = z">
                            {{ z }}{{ z === '全部' ? '' : '天' }}
                        </button>
                        <span class="iau-count">共 {{ iauFiltered.length }} 个</span>
                    </div>
                    <div class="iau-grid">
                        <span v-for="x in iauFiltered" :key="x.latin" class="iau-item" :title="x.zone + '天区'">
                            <b>{{ x.cn }}</b><em>{{ x.latin }}</em>
                        </span>
                    </div>
                </div>
            </div>
        </section>

        <!-- ===== 认星口诀 ===== -->
        <section class="mnemonics" v-reveal>
            <div class="section-head">
                <h2 class="section-title"><span class="title-icon"><i class="fas fa-lightbulb"></i></span>认星口诀</h2>
                <p class="section-subtitle">四个最实用的「怎么找」——比背星图更快上手</p>
            </div>
            <div class="mn-grid">
                <div v-for="m in STAR_MNEMONICS" :key="m.title" class="mn-card">
                    <div class="mn-head">
                        <span class="mn-icon"><i class="fas" :class="m.icon"></i></span>
                        <div><h4>{{ m.title }}</h4><span class="mn-season">{{ m.season }}</span></div>
                    </div>
                    <ol class="mn-steps">
                        <li v-for="(s, i) in m.steps" :key="i">{{ s }}</li>
                    </ol>
                    <p class="mn-tip"><i class="fas fa-quote-left"></i> {{ m.tip }}</p>
                </div>
            </div>
        </section>

        <!-- 星座页暂无专属视频，按要求不硬塞 -->
        <BookSection topic="constellations" />
    </div>
</template>

<style scoped>
/* ===================== 季节切换 ===================== */
.season-tabs {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.7rem;
    margin: 0.6rem 0 0.9rem;
}

.season-tab {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.55rem 1.15rem;
    border-radius: 50px;
    cursor: pointer;
    font-family: inherit;
    font-size: 0.86rem;
    letter-spacing: 0.04em;
    color: var(--color-text-secondary);
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(var(--s-rgb), 0.3);
    transition: all 0.3s ease;
    position: relative;
}

.season-tab i { color: var(--s-color); }

.season-tab:hover {
    color: #fff;
    border-color: rgba(var(--s-rgb), 0.7);
    transform: translateY(-2px);
}

.season-tab.active {
    color: #0a0d18;
    font-weight: 600;
    background: linear-gradient(135deg, rgba(var(--s-rgb), 0.95), rgba(var(--s-rgb), 0.7));
    border-color: transparent;
    box-shadow: 0 8px 24px rgba(var(--s-rgb), 0.35);
}

.season-tab.active i { color: #0a0d18; }

.tab-now {
    font-size: 0.62rem;
    padding: 0.05rem 0.35rem;
    border-radius: 50px;
    background: rgba(0, 0, 0, 0.35);
    color: inherit;
    letter-spacing: 0.05em;
}

.season-hint {
    text-align: center;
    font-size: 0.8rem;
    color: var(--color-text-muted);
    margin-bottom: 2rem;
    line-height: 1.8;
}

.season-hint b { color: var(--color-gold); }
.season-hint i { color: var(--color-cyan); margin-right: 0.3rem; }

/* ===================== 星座卡片 ===================== */
.cons-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1.5rem;
    perspective: 1200px;
}

.cons-card {
    position: relative;
    display: block;
    text-decoration: none;
    color: inherit;
    border-radius: var(--radius-md);
    background: var(--bg-card);
    border: 1px solid rgba(var(--c-rgb), 0.28);
    overflow: hidden;
    transform: rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg));
    transform-style: preserve-3d;
    transition: transform 0.25s ease, border-color 0.3s ease, box-shadow 0.3s ease;
    will-change: transform;
}

.cons-card:hover {
    border-color: rgba(var(--c-rgb), 0.8);
    box-shadow: 0 18px 46px rgba(0, 0, 0, 0.5), 0 0 34px rgba(var(--c-rgb), 0.22);
}

.cons-img {
    position: relative;
    height: 178px;
    overflow: hidden;
    background: #060a14;
}

.cons-img img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    transition: transform 0.6s ease, filter 0.4s ease;
    filter: brightness(0.72) saturate(0.9);
}

.cons-card:hover .cons-img img {
    transform: scale(1.07);
    filter: brightness(0.55) saturate(1.05);
}

/* 底部渐变，保证文字可读 */
.cons-img::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(4, 7, 14, 0.15) 0%, rgba(4, 7, 14, 0.55) 55%, rgba(4, 7, 14, 0.92) 100%);
    pointer-events: none;
}

/* 顶部角标 */
.cons-badges {
    position: absolute;
    top: 0.7rem;
    left: 0.7rem;
    right: 0.7rem;
    z-index: 4;
    display: flex;
    align-items: center;
    gap: 0.4rem;
    flex-wrap: wrap;
}

.cons-season {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.16rem 0.6rem;
    border-radius: 50px;
    font-size: 0.7rem;
    letter-spacing: 0.08em;
    color: var(--c-color);
    background: rgba(6, 10, 20, 0.72);
    border: 1px solid color-mix(in srgb, var(--c-color) 62%, transparent);
    backdrop-filter: blur(6px);
}

.cons-now {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.16rem 0.55rem;
    border-radius: 50px;
    font-size: 0.68rem;
    color: #1a1206;
    font-weight: 600;
    background: linear-gradient(135deg, #ffd98a, #f0a860);
    box-shadow: 0 0 14px rgba(240, 168, 96, 0.5);
    animation: nowPulse 2.4s ease-in-out infinite;
}

@keyframes nowPulse {
    0%, 100% { box-shadow: 0 0 10px rgba(240, 168, 96, 0.35); }
    50% { box-shadow: 0 0 20px rgba(240, 168, 96, 0.75); }
}

.cons-view {
    position: absolute;
    left: 0.7rem;
    bottom: 0.55rem;
    z-index: 4;
    font-size: 0.7rem;
    letter-spacing: 0.04em;
    color: rgba(226, 236, 255, 0.9);
    text-shadow: 0 1px 8px rgba(0, 0, 0, 0.9);
}

.cons-view i { color: var(--c-color); margin-right: 0.25rem; }

/* 真实连线：逐段描绘 */
.cons-lines {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    z-index: 3;
    pointer-events: none;
}

.cons-lines .seg {
    stroke: rgba(226, 240, 255, 0.95);
    stroke-width: 1.1;
    stroke-linecap: round;
    stroke-dasharray: 1;
    stroke-dashoffset: 1;
    filter: drop-shadow(0 0 4px rgba(140, 220, 255, 0.9));
    transition: stroke-dashoffset 0.55s ease;
}

.cons-card:hover .cons-lines .seg {
    stroke-dashoffset: 0;
}

.cons-lines .star {
    fill: #fff;
    opacity: 0;
    filter: drop-shadow(0 0 5px rgba(170, 225, 255, 0.95));
    transition: opacity 0.4s ease;
}

.cons-card:hover .cons-lines .star {
    opacity: 1;
}

/* 拉丁名水印 */
.cons-watermark {
    position: absolute;
    right: 0.7rem;
    bottom: 0.5rem;
    z-index: 4;
    font-family: var(--font-title);
    font-size: 0.7rem;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: rgba(var(--c-rgb), 0.85);
    text-shadow: 0 1px 10px rgba(0, 0, 0, 0.9);
    opacity: 0;
    transform: translateY(6px);
    transition: opacity 0.4s ease, transform 0.4s ease;
    pointer-events: none;
}

.cons-card:hover .cons-watermark {
    opacity: 1;
    transform: translateY(0);
}

/* 卡片正文 */
.cons-body { padding: 1.05rem 1.15rem 1.2rem; }

.cons-head {
    display: flex;
    align-items: baseline;
    gap: 0.55rem;
    margin-bottom: 0.5rem;
}

.cons-head h3 {
    font-family: var(--font-title);
    font-size: 1.06rem;
    color: var(--color-gold);
}

.cons-head .latin {
    font-size: 0.72rem;
    color: var(--c-color);
    letter-spacing: 0.12em;
    text-transform: uppercase;
    opacity: 0.85;
}

.cons-body p {
    color: var(--color-text-secondary);
    font-size: 0.8rem;
    line-height: 1.75;
    margin-bottom: 0.8rem;
}

.cons-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem 1rem;
    font-size: 0.72rem;
    color: var(--color-text-muted);
}

.cons-meta i { color: var(--c-color); margin-right: 0.25rem; }

@media (max-width: 640px) {
    .cons-grid { perspective: none; }
    .cons-card { transform: none !important; }
}

/* ==================================================================
   今晚观星指南
   ================================================================== */
.obs-guide {
    display: grid;
    grid-template-columns: 0.9fr 1.1fr 1fr;
    gap: 1.4rem;
    margin: 0.4rem 0 1.8rem;
    padding: 1.4rem 1.5rem;
    border-radius: 18px;
    background: linear-gradient(140deg, rgba(20, 28, 48, 0.9), rgba(8, 12, 24, 0.85));
    border: 1px solid rgba(159, 212, 248, 0.2);
    box-shadow: 0 18px 48px rgba(0, 0, 0, 0.45);
}

/* 月相 */
.og-left { display: flex; align-items: center; gap: 1.1rem; }
.og-moon { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; }
.og-moon-svg { width: 92px; height: 92px; filter: drop-shadow(0 0 18px rgba(216, 224, 244, 0.35)); }
.og-moon-dark { fill: #10182c; stroke: rgba(159, 212, 248, 0.25); stroke-width: 1; }
.og-moon-lit { fill: #eef2fb; }
.og-moon-meta { text-align: center; line-height: 1.35; }
.og-moon-meta strong { display: block; font-family: var(--font-title); font-size: 1rem; color: var(--color-gold); }
.og-moon-meta span { font-size: 0.68rem; color: var(--color-text-muted); letter-spacing: 0.04em; }

.og-moon-stats { display: flex; flex-direction: column; gap: 0.45rem; flex: 1; }
.og-stat {
    display: flex; justify-content: space-between; gap: 0.6rem;
    padding: 0.4rem 0.6rem;
    border-radius: 8px;
    background: rgba(159, 212, 248, 0.06);
    border: 1px solid rgba(159, 212, 248, 0.12);
    font-size: 0.78rem;
}
.og-stat .k { color: var(--color-text-muted); }
.og-stat .v { color: var(--color-gold); font-variant-numeric: tabular-nums; }

/* 结论与时段 */
.og-mid { display: flex; flex-direction: column; gap: 0.7rem; justify-content: center; }
.og-verdict, .og-window {
    display: flex; align-items: center; gap: 0.75rem;
    padding: 0.7rem 0.9rem;
    border-radius: 12px;
    border: 1px solid rgba(159, 212, 248, 0.18);
    background: rgba(159, 212, 248, 0.05);
}
.og-verdict i, .og-window i { font-size: 1.1rem; }
.og-verdict div, .og-window div { display: flex; flex-direction: column; line-height: 1.5; }
.og-verdict strong, .og-window strong { font-size: 0.88rem; }
.og-verdict span, .og-window span { font-size: 0.72rem; color: var(--color-text-muted); }

.og-verdict.good { border-color: rgba(110, 200, 168, 0.5); background: rgba(110, 200, 168, 0.08); }
.og-verdict.good i, .og-verdict.good strong { color: #6ec8a8; }
.og-verdict.ok { border-color: rgba(159, 212, 248, 0.5); }
.og-verdict.ok i, .og-verdict.ok strong { color: #8fd3e8; }
.og-verdict.warn { border-color: rgba(232, 160, 110, 0.5); background: rgba(232, 160, 110, 0.08); }
.og-verdict.warn i, .og-verdict.warn strong { color: #e8a06e; }
.og-verdict.bad { border-color: rgba(232, 132, 110, 0.55); background: rgba(232, 132, 110, 0.1); }
.og-verdict.bad i, .og-verdict.bad strong { color: #e8846e; }
.og-window i { color: var(--color-cyan); }
.og-tip { font-size: 0.76rem; line-height: 1.7; color: var(--color-text-secondary); }
.og-tip i { color: var(--color-gold); margin-right: 0.3rem; }

/* 星座位置 */
.og-right { border-left: 1px dashed rgba(159, 212, 248, 0.18); padding-left: 1.3rem; }
.og-sub { font-size: 0.78rem; color: var(--color-text-secondary); letter-spacing: 0.04em; margin-bottom: 0.7rem; }
.og-sub i { color: var(--color-cyan); margin-right: 0.3rem; }
.og-pos { display: flex; flex-direction: column; gap: 0.6rem; }
.og-pos-item { display: grid; grid-template-columns: 10px 1fr auto 16px; align-items: center; gap: 0.55rem; font-size: 0.82rem; }
.og-pos-item.dim { opacity: 0.45; }
.og-dot { width: 8px; height: 8px; border-radius: 50%; }
.og-name { color: var(--color-gold); }
.og-pos-val { color: var(--color-text-muted); font-size: 0.76rem; font-variant-numeric: tabular-nums; }
.og-eye { font-size: 0.7rem; color: var(--color-cyan); }
.og-eye.dim { color: var(--color-text-muted); }
.og-note { margin-top: 0.7rem; font-size: 0.68rem; color: var(--color-text-muted); line-height: 1.6; }

/* ==================================================================
   当季天象日历
   ================================================================== */
.sky-calendar { margin-top: 3.2rem; }
.cal-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.4rem; }
.cal-card {
    background: var(--bg-card);
    border: 1px solid rgba(159, 212, 248, 0.18);
    border-radius: var(--radius-md);
    padding: 1.3rem 1.4rem 1.4rem;
}
.cal-h { font-family: var(--font-title); font-size: 1rem; color: var(--color-gold); margin-bottom: 1rem; display: flex; align-items: center; gap: 0.45rem; }
.cal-h i { color: var(--color-cyan); }
.cal-empty { color: var(--color-text-muted); font-size: 0.82rem; }

.shower-item { padding: 0.8rem 0; border-bottom: 1px dashed rgba(159, 212, 248, 0.14); }
.shower-item:last-child { border-bottom: none; padding-bottom: 0; }
.shower-head { display: flex; align-items: baseline; justify-content: space-between; gap: 0.6rem; margin-bottom: 0.35rem; }
.shower-head strong { color: var(--color-gold); font-size: 0.92rem; }
.shower-zhr {
    font-size: 0.68rem; color: #8fd3e8;
    border: 1px solid rgba(143, 211, 232, 0.4);
    border-radius: 50px; padding: 0.05rem 0.45rem;
}
.shower-meta { display: flex; flex-wrap: wrap; gap: 0.35rem 1rem; font-size: 0.74rem; color: var(--color-text-muted); margin-bottom: 0.4rem; }
.shower-meta i { color: var(--color-cyan); margin-right: 0.25rem; }
.shower-desc { font-size: 0.8rem; line-height: 1.75; color: var(--color-text-secondary); margin-bottom: 0.4rem; }
.shower-parent { font-size: 0.7rem; color: var(--color-text-muted); }
.shower-parent i { margin-right: 0.25rem; }

.deep-targets { display: flex; flex-direction: column; gap: 0.9rem; }
.deep-item {
    display: grid; grid-template-columns: 84px 1fr; gap: 0.85rem;
    padding: 0.7rem;
    border-radius: 12px;
    background: rgba(159, 212, 248, 0.05);
    border: 1px solid rgba(159, 212, 248, 0.14);
    text-decoration: none; color: inherit;
    transition: all 0.3s ease;
}
.deep-item:hover { border-color: var(--color-primary); transform: translateX(4px); }
.deep-item img { width: 84px; height: 68px; object-fit: cover; border-radius: 8px; }
.deep-body strong { display: block; color: var(--color-gold); font-size: 0.88rem; margin-bottom: 0.25rem; }
.deep-body p { font-size: 0.76rem; line-height: 1.7; color: var(--color-text-secondary); }

.cal-tip {
    display: flex; align-items: center; gap: 0.6rem;
    margin-top: 1rem; padding: 0.7rem 1rem;
    border-radius: 50px;
    background: rgba(159, 212, 248, 0.07);
    border: 1px solid rgba(159, 212, 248, 0.18);
    font-size: 0.8rem; color: var(--color-text-secondary);
}
.cal-tip i { color: var(--color-cyan); }
.cal-tip b { color: var(--color-gold); }

/* ==================================================================
   三垣四象二十八宿
   ================================================================== */
.four-symbols { margin-top: 3.4rem; }
.symbol-tabs { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.8rem; margin-bottom: 1.2rem; }
.symbol-tab {
    display: flex; flex-direction: column; align-items: flex-start; gap: 0.15rem;
    padding: 0.8rem 1rem;
    border-radius: 12px;
    cursor: pointer;
    font-family: inherit;
    text-align: left;
    color: var(--color-text-secondary);
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(var(--s-rgb, 159, 212, 248), 0.25);
    border-color: color-mix(in srgb, var(--f-color) 35%, transparent);
    transition: all 0.3s ease;
}
.symbol-tab i { color: var(--f-color); font-size: 0.85rem; }
.symbol-tab strong { font-family: var(--font-title); font-size: 1rem; color: var(--color-gold); }
.symbol-tab span { font-size: 0.7rem; color: var(--color-text-muted); }
.symbol-tab:hover { transform: translateY(-3px); border-color: var(--f-color); }
.symbol-tab.active {
    background: linear-gradient(135deg, color-mix(in srgb, var(--f-color) 28%, transparent), rgba(10, 14, 26, 0.9));
    border-color: var(--f-color);
    box-shadow: 0 10px 28px color-mix(in srgb, var(--f-color) 25%, transparent);
}
.symbol-tab.active strong { color: #fff; }

.symbol-panel {
    padding: 1.4rem 1.5rem 1.6rem;
    border-radius: 16px;
    background: var(--bg-card);
    border: 1px solid color-mix(in srgb, var(--f-color) 40%, transparent);
}
.symbol-intro h3 { font-family: var(--font-title); font-size: 1.15rem; color: var(--f-color); margin-bottom: 0.5rem; }
.symbol-en { font-size: 0.72rem; color: var(--color-text-muted); letter-spacing: 0.08em; margin-left: 0.5rem; }
.symbol-intro p { font-size: 0.84rem; line-height: 1.85; color: var(--color-text-secondary); margin-bottom: 1.1rem; }

.mansion-grid { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 0.7rem; }
.mansion-card {
    position: relative;
    padding: 0.85rem 0.9rem;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(159, 212, 248, 0.14);
    transition: all 0.3s ease;
}
.mansion-card:hover { border-color: var(--f-color); transform: translateY(-3px); }
.mansion-no {
    position: absolute; top: 0.5rem; right: 0.7rem;
    font-family: var(--font-title); font-size: 0.9rem;
    color: color-mix(in srgb, var(--f-color) 55%, transparent);
}
.mansion-card h4 { font-family: var(--font-title); font-size: 1rem; color: var(--color-gold); margin-bottom: 0.35rem; }
.mansion-star { font-size: 0.72rem; color: var(--color-text-muted); margin-bottom: 0.3rem; }
.mansion-star i { color: var(--f-color); margin-right: 0.2rem; }
.mansion-meaning { font-size: 0.78rem; line-height: 1.65; color: var(--color-text-secondary); }

.ew-note {
    margin-top: 1.1rem;
    padding: 0.9rem 1.1rem;
    border-radius: 12px;
    background: rgba(159, 212, 248, 0.05);
    border: 1px dashed rgba(159, 212, 248, 0.25);
    font-size: 0.8rem;
    line-height: 1.9;
    color: var(--color-text-secondary);
}
.ew-note i { color: var(--color-cyan); margin-right: 0.4rem; }

/* 88 星座 */
.iau-panel { margin-top: 1rem; }
.iau-toggle {
    width: 100%;
    padding: 0.7rem 1rem;
    border-radius: 50px;
    cursor: pointer;
    font-family: inherit;
    font-size: 0.82rem;
    color: var(--color-cyan);
    background: rgba(159, 212, 248, 0.07);
    border: 1px solid rgba(159, 212, 248, 0.22);
    transition: all 0.3s ease;
}
.iau-toggle:hover { border-color: var(--color-cyan); color: #fff; }
.iau-toggle i { margin-right: 0.35rem; }
.iau-body { margin-top: 0.9rem; }
.iau-filter { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; margin-bottom: 0.9rem; }
.iau-chip {
    padding: 0.28rem 0.75rem;
    border-radius: 50px;
    cursor: pointer;
    font-family: inherit;
    font-size: 0.76rem;
    color: var(--color-text-secondary);
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(159, 212, 248, 0.2);
    transition: all 0.25s ease;
}
.iau-chip:hover { color: #fff; border-color: var(--color-cyan); }
.iau-chip.active { color: #0a0d18; background: var(--color-cyan); border-color: transparent; font-weight: 600; }
.iau-count { margin-left: auto; font-size: 0.74rem; color: var(--color-text-muted); }

.iau-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 0.4rem; max-height: 320px; overflow-y: auto; padding-right: 0.3rem; }
.iau-item {
    display: flex; align-items: baseline; gap: 0.35rem;
    padding: 0.32rem 0.55rem;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(159, 212, 248, 0.1);
    font-size: 0.76rem;
    overflow: hidden;
}
.iau-item b { color: var(--color-gold); font-weight: 500; white-space: nowrap; }
.iau-item em { color: var(--color-text-muted); font-size: 0.66rem; font-style: italic; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* ==================================================================
   认星口诀
   ================================================================== */
.mnemonics { margin-top: 3.4rem; }
.mn-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.2rem; }
.mn-card {
    padding: 1.2rem 1.3rem 1.3rem;
    border-radius: var(--radius-md);
    background: var(--bg-card);
    border: 1px solid rgba(159, 212, 248, 0.16);
    transition: all 0.3s ease;
}
.mn-card:hover { transform: translateY(-4px); border-color: rgba(159, 212, 248, 0.4); }
.mn-head { display: flex; align-items: center; gap: 0.7rem; margin-bottom: 0.8rem; }
.mn-icon {
    width: 36px; height: 36px; border-radius: 10px;
    display: grid; place-items: center;
    background: var(--gradient-primary);
    color: #fff; font-size: 0.95rem;
    box-shadow: 0 0 18px rgba(157, 140, 240, 0.35);
}
.mn-head h4 { font-family: var(--font-title); font-size: 0.98rem; color: var(--color-gold); }
.mn-season { font-size: 0.68rem; color: var(--color-text-muted); letter-spacing: 0.08em; }
.mn-steps { margin: 0 0 0.8rem; padding-left: 1.15rem; }
.mn-steps li { font-size: 0.79rem; line-height: 1.85; color: var(--color-text-secondary); margin-bottom: 0.25rem; }
.mn-tip { font-size: 0.76rem; color: var(--color-cyan); line-height: 1.7; }
.mn-tip i { opacity: 0.7; margin-right: 0.25rem; }

/* ==================================================================
   响应式
   ================================================================== */
@media (max-width: 1100px) {
    .obs-guide { grid-template-columns: 1fr 1fr; }
    .og-right { grid-column: 1 / -1; border-left: none; border-top: 1px dashed rgba(159, 212, 248, 0.18); padding-left: 0; padding-top: 1rem; }
}
@media (max-width: 1180px) {
    .mansion-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
}
@media (max-width: 860px) {
    .obs-guide { grid-template-columns: 1fr; }
    .mansion-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .cal-grid { grid-template-columns: 1fr; }
    .symbol-tabs { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 560px) {
    .symbol-tabs { grid-template-columns: 1fr; }
    .mansion-grid { grid-template-columns: 1fr 1fr; }
}

</style>
