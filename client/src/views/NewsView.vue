<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import api from '../api';
import { relTime, clockTime } from '../utils/time';
import PageNav from '../components/PageNav.vue';
import BookSection from '../components/BookSection.vue';
import PageHeader from '../components/PageHeader.vue';

const rows = ref([]);
const tags = ref([]);
const total = ref(0);
const matched = ref(0);
const loading = ref(false);
const lastUpdate = ref('');
const live = ref(true);
const fresh = ref(false);

/* ---- 筛选条件 ---- */
const active = ref('all');        // 标签
const keyword = ref('');          // 输入框内容
const q = ref('');                // 已生效的搜索词
const days = ref(0);              // 0=不限，1/3/7/30 天
const sort = ref('new');          // new | old

const DAY_OPTIONS = [
    { v: 0, label: '不限时间' },
    { v: 1, label: '今天' },
    { v: 3, label: '近 3 天' },
    { v: 7, label: '近 7 天' },
    { v: 30, label: '近 30 天' }
];

/* ---- 搜索历史（localStorage） ---- */
const HISTORY_KEY = 'astro_news_search_history';
const history = ref([]);
const showHistory = ref(false);
const searchInput = ref(null);

function loadHistory() {
    try {
        const raw = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
        history.value = Array.isArray(raw) ? raw.filter(x => typeof x === 'string').slice(0, 8) : [];
    } catch (e) { history.value = []; }
}
function saveHistory() {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history.value)); } catch (e) { /* 忽略 */ }
}
function pushHistory(word) {
    const w = String(word || '').trim();
    if (!w) return;
    history.value = [w, ...history.value.filter(x => x !== w)].slice(0, 8);
    saveHistory();
}
function clearHistory() {
    history.value = [];
    saveHistory();
}
function removeHistory(w) {
    history.value = history.value.filter(x => x !== w);
    saveHistory();
}
function useHistory(w) {
    keyword.value = w;
    runSearch();
}

function runSearch() {
    q.value = keyword.value.trim();
    showHistory.value = false;
    pushHistory(q.value);
    load();
}
function clearSearch() {
    keyword.value = '';
    q.value = '';
    load();
}
function onFocus() {
    showHistory.value = true;
    loadHistory();
}
function onBlur() {
    // 延迟收起，保证点击历史项能触发
    setTimeout(() => { showHistory.value = false; }, 180);
}

function pickTag(t) { active.value = t; load(); }
function pickDays(d) { days.value = d; load(); }
function pickSort(s) { sort.value = s; load(); }
function resetAll() {
    active.value = 'all'; keyword.value = ''; q.value = ''; days.value = 0; sort.value = 'new';
    load();
}

const hasFilter = computed(() => active.value !== 'all' || q.value || days.value || sort.value !== 'new');

/* ---- 数据加载 ---- */
let timer = null;
const REFRESH_MS = 30000;

async function load(silent = false) {
    if (!silent) loading.value = true;
    try {
        const { data } = await api.get('/news', {
            params: {
                tag: active.value,
                q: q.value || undefined,
                days: days.value || undefined,
                sort: sort.value
            }
        });
        const changed = data.rows.length !== rows.value.length
            || (data.rows[0] && rows.value[0] && data.rows[0].id !== rows.value[0].id);
        rows.value = data.rows;
        tags.value = data.tags;
        total.value = data.total;
        matched.value = data.matched;
        lastUpdate.value = clockTime();
        if (changed && silent) {
            fresh.value = true;
            setTimeout(() => { fresh.value = false; }, 1600);
        }
    } catch (e) {
        /* 静默失败，保留上次数据 */
    } finally {
        loading.value = false;
    }
}

function startAuto() {
    stopAuto();
    if (live.value) timer = setInterval(() => load(true), REFRESH_MS);
}
function stopAuto() { if (timer) { clearInterval(timer); timer = null; } }
function toggleLive() { live.value = !live.value; live.value ? startAuto() : stopAuto(); }

const head = computed(() => rows.value[0]);
const rest = computed(() => rows.value.slice(1));

onMounted(async () => {
    loadHistory();
    await load();
    startAuto();
});
onBeforeUnmount(stopAuto);
</script>

<template>
    <div class="container">
        <PageNav title="宇宙新闻" />
        <PageHeader kicker="COSMIC NEWS" title="宇宙新闻" icon="fa-newspaper" deco="nebula" :stats="[{ v: String(total || 24), l: '新闻记录' }, { v: '30 秒', l: '自动同步' }]" subtitle="新闻以数据库记录实时更新——按关键词搜索、按时间与主题筛选，追踪人类探索宇宙的最新足迹。" />

        <!-- 实时状态条 -->
        <div class="live-bar" :class="{ fresh }">
            <span class="live-dot" :class="{ on: live }"></span>
            <span class="live-text">
                {{ live ? '实时更新中' : '已暂停更新' }}
                <em v-if="lastUpdate">· 最后同步 {{ lastUpdate }}</em>
            </span>
            <span class="live-count">共 {{ total }} 条记录</span>
            <div class="live-actions">
                <button class="live-btn" @click="load()" :disabled="loading">
                    <i class="fas" :class="loading ? 'fa-spinner fa-spin' : 'fa-rotate-right'"></i> 立即刷新
                </button>
                <button class="live-btn" :class="{ active: live }" @click="toggleLive">
                    <i class="fas" :class="live ? 'fa-pause' : 'fa-play'"></i> {{ live ? '暂停' : '开启' }}实时
                </button>
            </div>
        </div>

        <!-- 搜索 -->
        <div class="search-wrap">
            <div class="search-box">
                <i class="fas fa-magnifying-glass search-ico"></i>
                <input
                    ref="searchInput"
                    v-model="keyword"
                    class="search-input"
                    type="search"
                    placeholder="搜索新闻标题、摘要、来源或标签…"
                    maxlength="50"
                    @keyup.enter="runSearch"
                    @focus="onFocus"
                    @blur="onBlur">
                <button v-if="keyword" class="search-clear" title="清空" @click="clearSearch"><i class="fas fa-xmark"></i></button>
                <button class="search-btn" @click="runSearch"><i class="fas fa-magnifying-glass"></i> 搜索</button>
            </div>

            <!-- 搜索记录 -->
            <div class="history-panel" v-if="showHistory && history.length">
                <div class="history-head">
                    <span><i class="fas fa-clock-rotate-left"></i> 搜索记录</span>
                    <button class="history-clear" @click="clearHistory"><i class="fas fa-trash-can"></i> 清空</button>
                </div>
                <div class="history-chips">
                    <span v-for="h in history" :key="h" class="history-chip" @mousedown.prevent="useHistory(h)">
                        {{ h }}
                        <i class="fas fa-xmark" @mousedown.prevent.stop="removeHistory(h)"></i>
                    </span>
                </div>
            </div>
        </div>

        <!-- 筛选 -->
        <div class="filter-block">
            <div class="filter-row">
                <span class="filter-label"><i class="fas fa-tags"></i> 主题</span>
                <div class="filter-tabs">
                    <button class="filter-tab" :class="{ active: active === 'all' }" @click="pickTag('all')">
                        全部 <span class="tab-num">{{ total }}</span>
                    </button>
                    <button v-for="t in tags" :key="t.tag" class="filter-tab" :class="{ active: active === t.tag }" @click="pickTag(t.tag)">
                        {{ t.tag }} <span class="tab-num">{{ t.c }}</span>
                    </button>
                </div>
            </div>
            <div class="filter-row">
                <span class="filter-label"><i class="fas fa-calendar-days"></i> 时间</span>
                <div class="filter-tabs">
                    <button v-for="d in DAY_OPTIONS" :key="d.v" class="filter-tab" :class="{ active: days === d.v }" @click="pickDays(d.v)">{{ d.label }}</button>
                </div>
                <span class="filter-label" style="margin-left:1.2rem;"><i class="fas fa-arrow-down-wide-short"></i> 排序</span>
                <div class="filter-tabs">
                    <button class="filter-tab" :class="{ active: sort === 'new' }" @click="pickSort('new')">最新优先</button>
                    <button class="filter-tab" :class="{ active: sort === 'old' }" @click="pickSort('old')">最早优先</button>
                </div>
                <button v-if="hasFilter" class="filter-reset" @click="resetAll"><i class="fas fa-rotate-left"></i> 重置</button>
            </div>
        </div>

        <!-- 结果概要 -->
        <div class="result-bar" v-if="q || active !== 'all' || days">
            <span>
                筛选结果 <b>{{ matched }}</b> 条
                <em v-if="q">· 关键词「{{ q }}」</em>
                <em v-if="active !== 'all'">· 主题「{{ active }}」</em>
                <em v-if="days">· 近 {{ days }} 天</em>
            </span>
        </div>

        <div v-if="loading && !rows.length" class="news-loading"><i class="fas fa-spinner fa-spin"></i> 正在加载新闻…</div>

        <!-- 头条 -->
        <article v-if="head" class="news-head" v-reveal>
            <div class="news-head-img"><img :src="head.img" :alt="head.title"><span class="news-tag">{{ head.tag }}</span></div>
            <div class="news-head-body">
                <span class="news-date"><i class="fas fa-clock"></i> {{ relTime(head.published_at) }}<em v-if="head.source"> · {{ head.source }}</em></span>
                <h2>{{ head.title }}</h2>
                <p>{{ head.summary }}</p>
                <a v-if="head.source_url" class="news-src" :href="head.source_url" target="_blank" rel="noopener">
                    <i class="fas fa-circle-check"></i> 查看官方原文 <i class="fas fa-arrow-up-right-from-square"></i>
                </a>
            </div>
        </article>

        <!-- 列表 -->
        <div class="news-grid news-grid-all">
            <article v-for="n in rest" :key="n.id" class="news-card" v-reveal>
                <div class="news-image"><img :src="n.img" :alt="n.title"><span class="news-tag">{{ n.tag }}</span></div>
                <div class="news-content">
                    <h3>{{ n.title }}</h3>
                    <p>{{ n.summary }}</p>
                    <div class="news-foot">
                        <span class="news-date"><i class="fas fa-clock"></i> {{ relTime(n.published_at) }}</span>
                        <a v-if="n.source_url" class="news-src" :href="n.source_url" target="_blank" rel="noopener">
                            查看原文 <i class="fas fa-arrow-up-right-from-square"></i>
                        </a>
                    </div>
                </div>
            </article>
        </div>

        <p v-if="!loading && !rows.length" class="news-empty">
            <i class="fas fa-satellite-dish" style="display:block;font-size:2.2rem;margin-bottom:0.8rem;opacity:0.5;"></i>
            没有找到匹配的新闻{{ q ? '：试试更换关键词' : '' }}
            <button v-if="hasFilter" class="filter-reset" style="margin-left:0.6rem;" @click="resetAll">清空筛选</button>
        </p>
        <BookSection topic="news" />
    </div>
</template>

<style scoped>
.tab-num { font-size: 0.72rem; opacity: 0.7; margin-left: 0.2rem; }

/* 实时状态条 */
.live-bar {
    display: flex; align-items: center; gap: 0.7rem; flex-wrap: wrap;
    padding: 0.7rem 1.1rem; margin-bottom: 1.6rem;
    background: rgba(159, 212, 248, 0.07);
    border: 1px solid rgba(159, 212, 248, 0.22); border-radius: 50px;
    font-size: 0.85rem; transition: all 0.4s ease;
}
.live-bar.fresh { border-color: #86efac; box-shadow: 0 0 22px rgba(134, 239, 172, 0.35); }
.live-dot { width: 9px; height: 9px; border-radius: 50%; background: #64748b; flex-shrink: 0; }
.live-dot.on { background: #4ade80; box-shadow: 0 0 10px #4ade80; animation: pulse 1.8s ease-in-out infinite; }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
.live-text { color: var(--color-text-secondary); }
.live-text em { font-style: normal; color: var(--color-text-muted); }
.live-count { color: var(--color-cyan); margin-left: auto; }
.live-actions { display: flex; gap: 0.5rem; }
.live-btn {
    padding: 0.3rem 0.9rem; border-radius: 50px; font-size: 0.8rem;
    border: 1px solid rgba(159, 212, 248, 0.35); background: rgba(159, 212, 248, 0.08);
    color: var(--color-text-secondary); cursor: pointer; transition: all 0.3s ease;
}
.live-btn:hover:not(:disabled) { border-color: var(--color-cyan); color: #fff; }
.live-btn.active { background: var(--gradient-primary); border-color: transparent; color: #fff; }
.live-btn:disabled { opacity: 0.6; cursor: default; }

/* 搜索 */
.search-wrap { position: relative; margin-bottom: 1.2rem; }
.search-box {
    display: flex; align-items: center; gap: 0.5rem;
    background: rgba(8, 14, 28, 0.72); border: 1px solid rgba(159, 212, 248, 0.28);
    border-radius: 50px; padding: 0.35rem 0.45rem 0.35rem 1.1rem;
    transition: all 0.3s ease;
}
.search-box:focus-within { border-color: var(--color-cyan); box-shadow: 0 0 22px rgba(159, 212, 248, 0.22); }
.search-ico { color: var(--color-cyan); font-size: 0.9rem; }
.search-input {
    flex: 1; min-width: 0; background: transparent; border: none; outline: none;
    color: #e8eefc; font-family: inherit; font-size: 0.92rem; padding: 0.45rem 0;
}
.search-input::placeholder { color: var(--color-text-muted); }
.search-input::-webkit-search-cancel-button { display: none; }
.search-clear {
    border: none; background: transparent; color: var(--color-text-muted);
    cursor: pointer; font-size: 0.9rem; padding: 0.3rem; transition: color 0.3s ease;
}
.search-clear:hover { color: #fff; }
.search-btn {
    display: inline-flex; align-items: center; gap: 0.35rem;
    padding: 0.5rem 1.3rem; border-radius: 50px; border: none; cursor: pointer;
    background: var(--gradient-primary); color: #fff; font-family: inherit; font-size: 0.85rem;
    transition: all 0.3s ease; white-space: nowrap;
}
.search-btn:hover { filter: brightness(1.12); }

/* 搜索记录 */
.history-panel {
    position: absolute; left: 0; right: 0; top: calc(100% + 0.5rem); z-index: 30;
    background: rgba(8, 12, 24, 0.97); border: 1px solid rgba(159, 212, 248, 0.3);
    border-radius: var(--radius-md); padding: 0.9rem 1.1rem;
    box-shadow: 0 18px 48px rgba(0, 0, 0, 0.55);
    backdrop-filter: blur(14px);
}
.history-head {
    display: flex; align-items: center; justify-content: space-between;
    font-size: 0.8rem; color: var(--color-text-secondary); margin-bottom: 0.7rem;
}
.history-clear {
    border: none; background: transparent; color: var(--color-text-muted);
    cursor: pointer; font-size: 0.75rem; font-family: inherit; transition: color 0.3s ease;
}
.history-clear:hover { color: #f87171; }
.history-chips { display: flex; flex-wrap: wrap; gap: 0.5rem; }
.history-chip {
    display: inline-flex; align-items: center; gap: 0.4rem;
    padding: 0.28rem 0.8rem; border-radius: 50px; cursor: pointer;
    background: rgba(159, 212, 248, 0.1); border: 1px solid rgba(159, 212, 248, 0.28);
    color: var(--color-text-secondary); font-size: 0.8rem; transition: all 0.3s ease;
}
.history-chip:hover { background: var(--gradient-primary); color: #fff; border-color: transparent; }
.history-chip i { font-size: 0.66rem; opacity: 0.6; }
.history-chip i:hover { opacity: 1; }

/* 筛选 */
.filter-block { margin-bottom: 1.2rem; display: flex; flex-direction: column; gap: 0.7rem; }
.filter-row { display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; }
.filter-label { font-size: 0.8rem; color: var(--color-text-muted); white-space: nowrap; }
.filter-tabs { display: flex; gap: 0.45rem; flex-wrap: wrap; }
.filter-tab {
    padding: 0.32rem 0.95rem; border-radius: 50px; font-size: 0.82rem;
    border: 1px solid rgba(159, 212, 248, 0.25); background: rgba(159, 212, 248, 0.05);
    color: var(--color-text-secondary); cursor: pointer; transition: all 0.3s ease;
    font-family: inherit;
}
.filter-tab:hover { border-color: var(--color-cyan); color: #fff; }
.filter-tab.active { background: var(--gradient-primary); border-color: transparent; color: #fff; }
.filter-reset {
    padding: 0.32rem 0.95rem; border-radius: 50px; font-size: 0.8rem; cursor: pointer;
    border: 1px solid rgba(248, 113, 113, 0.4); background: rgba(248, 113, 113, 0.08);
    color: #fca5a5; font-family: inherit; transition: all 0.3s ease;
}
.filter-reset:hover { background: rgba(248, 113, 113, 0.18); color: #fff; }

.result-bar {
    font-size: 0.85rem; color: var(--color-text-secondary);
    padding: 0.5rem 0; margin-bottom: 0.8rem;
}
.result-bar b { color: var(--color-cyan); }
.result-bar em { font-style: normal; color: var(--color-text-muted); }

.news-loading { text-align: center; color: var(--color-cyan); padding: 3rem 0; }

/* 头条 */
.news-head {
    display: grid; grid-template-columns: 1.1fr 1fr;
    background: var(--bg-card); border: 1px solid rgba(159, 212, 248, 0.25);
    border-radius: var(--radius-lg); overflow: hidden; margin-bottom: 2.4rem;
}
.news-head-img { position: relative; min-height: 300px; }
.news-head-img img { width: 100%; height: 100%; object-fit: cover; }
.news-head-body { padding: 2rem 2.2rem; display: flex; flex-direction: column; justify-content: center; }
.news-head-body h2 { font-family: var(--font-title); color: var(--color-gold); font-size: 1.5rem; line-height: 1.5; margin: 0.6rem 0 0.9rem; }
.news-head-body p { color: var(--color-text-secondary); line-height: 1.9; font-size: 0.94rem; }

.news-grid-all { grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); }
.news-empty { text-align: center; color: var(--color-text-muted); padding: 3rem 0; }

/* 来源链接 */
.news-src {
    display: inline-flex; align-items: center; gap: 0.35rem; margin-top: 0.7rem;
    font-size: 0.8rem; color: var(--color-cyan); text-decoration: none;
    border: 1px solid rgba(159, 212, 248, 0.35); background: rgba(159, 212, 248, 0.08);
    padding: 0.3rem 0.85rem; border-radius: 50px; transition: all 0.3s ease; width: fit-content;
}
.news-src:hover { background: var(--gradient-primary); color: #fff; border-color: transparent; }
.news-foot { display: flex; align-items: center; justify-content: space-between; gap: 0.6rem; flex-wrap: wrap; margin-top: 0.5rem; }
.news-foot .news-src { margin-top: 0; }

@media (max-width: 900px) {
    .news-head { grid-template-columns: 1fr; }
    .news-head-img { min-height: 200px; }
    .news-head-body { padding: 1.4rem 1.2rem; }
    .live-count { margin-left: 0; }
    .search-btn { padding: 0.5rem 0.9rem; }
    .search-btn { font-size: 0; }
    .search-btn i { font-size: 0.9rem; }
}
</style>
