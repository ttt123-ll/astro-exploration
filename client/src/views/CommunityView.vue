<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import quiz from '../data/quiz';
import { useAuth } from '../store/auth';
import { useUi } from '../store/ui';
import api from '../api';
import { fmtDateTime } from '../utils/time';
import PageNav from '../components/PageNav.vue';
import BookSection from '../components/BookSection.vue';
import PageHeader from '../components/PageHeader.vue';

const auth = useAuth();
const ui = useUi();
const route = useRoute();
const router = useRouter();

/* ============ 上方：知识竞赛 / 留言板 切换 ============ */
const TOP_TABS = [
    { key: 'quiz', label: '知识竞赛', icon: 'fa-graduation-cap' },
    { key: 'messages', label: '留言板', icon: 'fa-comments' }
];
const topTab = ref(TOP_TABS.some(t => t.key === route.query.tab) ? route.query.tab : 'quiz');
watch(() => route.query.tab, v => { if (TOP_TABS.some(t => t.key === v)) topTab.value = v; });
function setTopTab(k) {
    topTab.value = k;
    router.replace({ query: { ...route.query, tab: k } });
}

/* ============ 知识竞赛 ============ */
const CAT_NAMES = { all: '全部主题', solar: '太阳系', star: '恒星与星系', bh: '黑洞', cosmos: '宇宙探索' };
const CAT_ICONS = { all: 'fa-globe', solar: 'fa-sun', star: 'fa-wand-magic-sparkles', bh: 'fa-circle-dot', cosmos: 'fa-atom' };

const stage = ref('start');
const cat = ref('all');
const pool = ref([]);
const idx = ref(0);
const correct = ref(0);
const streak = ref(0);
const maxStreak = ref(0);
const wrongList = ref([]);
const answered = ref(false);
const chosenIdx = ref(-1);
const startTime = ref(0);
const elapsed = ref(0);
const timerText = ref('00:00');
const rankNote = ref('');
let timer;

const q = computed(() => pool.value[idx.value]);
const letters = ['A', 'B', 'C', 'D'];

function shuffle(a) {
    const x = a.slice();
    for (let i = x.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [x[i], x[j]] = [x[j], x[i]];
    }
    return x;
}
function fmt(ms) {
    const s = Math.floor(ms / 1000), m = Math.floor(s / 60);
    return String(m).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
}

function start() {
    const bank = cat.value === 'all' ? quiz : quiz.filter(x => x.c === cat.value);
    pool.value = shuffle(bank).slice(0, 20);
    idx.value = 0; correct.value = 0; streak.value = 0; maxStreak.value = 0; wrongList.value = [];
    answered.value = false; chosenIdx.value = -1; rankNote.value = '';
    startTime.value = Date.now();
    stage.value = 'run';
    timer = setInterval(() => { elapsed.value = Date.now() - startTime.value; timerText.value = fmt(elapsed.value); }, 500);
}

function choose(i) {
    if (answered.value) return;
    answered.value = true; chosenIdx.value = i;
    if (i === q.value.a) {
        correct.value++; streak.value++;
        maxStreak.value = Math.max(maxStreak.value, streak.value);
    } else {
        streak.value = 0;
        wrongList.value.push({ q: q.value, mine: i });
    }
}

function next() {
    idx.value++;
    if (idx.value >= pool.value.length) finish();
    else { answered.value = false; chosenIdx.value = -1; }
}

function finish() {
    clearInterval(timer);
    stage.value = 'result';
    upload();
}

async function upload() {
    const total = pool.value.length;
    if (!auth.loggedIn) { rankNote.value = 'login'; return; }
    try {
        const { data } = await api.post('/scores', {
            category: cat.value, total, correct: correct.value, duration_sec: Math.round(elapsed.value / 1000)
        });
        rankNote.value = '第 ' + data.rank + ' 名（共 ' + data.players + ' 位挑战者）';
        // 刚提交的成绩立刻出现在下方排行榜
        if (data.category && data.category !== lbCat.value) lbCat.value = data.category;
        await loadLb();
    } catch (e) { /* 忽略 */ }
}

const pct = computed(() => pool.value.length ? Math.round(correct.value / pool.value.length * 100) : 0);
const grade = computed(() => {
    if (pct.value >= 90) return { l: 'S', c: '宇宙大师级！浩瀚宇宙都为你点赞。' };
    if (pct.value >= 80) return { l: 'A', c: '非常出色！你的天文知识储备相当扎实。' };
    if (pct.value >= 70) return { l: 'B', c: '不错的成绩！再补一补错题就更完美了。' };
    if (pct.value >= 60) return { l: 'C', c: '及格线以上！宇宙很大，未知很多。' };
    return { l: 'D', c: '新手宇航员，别灰心！从太阳系板块开始探索吧。' };
});

/* ============ 留言板 ============ */
const rows = ref([]);
const total = ref(0);
const page = ref(1);
const pages = ref(1);
const content = ref('');
const posting = ref(false);

async function loadMessages() {
    const { data } = await api.get('/messages', { params: { page: page.value } });
    rows.value = data.rows; total.value = data.total; pages.value = data.pages;
}
async function postMessage() {
    const c = content.value.trim();
    if (!c) { ui.toastMsg('留言内容不能为空', 'error'); return; }
    posting.value = true;
    try {
        await api.post('/messages', { content: c });
        content.value = '';
        ui.toastMsg('留言发布成功！');
        page.value = 1;
        await loadMessages();
    } catch (e) {
        ui.toastMsg(e.response?.data?.error || '发布失败', 'error');
    } finally { posting.value = false; }
}
async function delMessage(id) {
    await api.delete('/admin/messages/' + id);
    await loadMessages();
}

/* ============ 下方：排行榜（实时） ============ */
const lbCat = ref('all');
const lbRows = ref([]);
const mine = ref([]);
const live = ref(true);
const updatedAt = ref('');
const loadingLb = ref(false);
const newIds = ref(new Set());
const LB_CATS = { all: '全部主题', solar: '太阳系', star: '恒星与星系', bh: '黑洞', cosmos: '宇宙探索' };
let pollTimer = null;
let flashTimer = null;
let prevIds = new Set();

async function loadLb(silent = false) {
    if (!silent) loadingLb.value = true;
    try {
        const { data } = await api.get('/leaderboard', { params: { cat: lbCat.value } });
        const fresh = data.rows.filter(r => !prevIds.has(r.id)).map(r => r.id);
        prevIds = new Set(data.rows.map(r => r.id));
        lbRows.value = data.rows;
        updatedAt.value = new Date().toLocaleTimeString('zh-CN', { hour12: false });
        if (silent && fresh.length) {
            newIds.value = new Set(fresh);
            clearTimeout(flashTimer);
            flashTimer = setTimeout(() => { newIds.value = new Set(); }, 8000);
        }
        if (auth.loggedIn) {
            try {
                const m = await api.get('/my-scores');
                mine.value = m.data.rows;
            } catch (e) { mine.value = []; }
        }
    } catch (e) { /* 忽略 */ } finally { loadingLb.value = false; }
}
function setLbCat(k) { lbCat.value = k; loadLb(); }
function catName(c) { return LB_CATS[c] || c; }
function dur(s) {
    const m = Math.floor(s / 60), x = s % 60;
    return String(m).padStart(2, '0') + ':' + String(x).padStart(2, '0');
}
function goLeaderboard() {
    document.getElementById('community-leaderboard')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

onMounted(() => {
    if (route.query.play === '1') start();
    loadMessages();
    loadLb();
    pollTimer = setInterval(() => { if (live.value && !document.hidden) loadLb(true); }, 15000);
});
onBeforeUnmount(() => {
    clearInterval(timer);
    clearInterval(pollTimer);
    clearTimeout(flashTimer);
});
</script>

<template>
    <div class="container">
        <PageNav title="互动社区" />
        <PageHeader kicker="INTERACTIVE COMMUNITY" title="互动社区" icon="fa-users" deco="stars" :stats="[{ v: String(quiz.length), l: '竞赛题目' }, { v: '15 秒', l: '排行榜刷新' }]" subtitle="参加天文知识竞赛检验你的宇宙认知，在留言板留下观星足迹，成绩与留言都会实时汇总到下方的星际排行榜。" />

        <!-- 上方：知识竞赛 / 留言板 -->
        <div class="comm-tabs">
            <button v-for="t in TOP_TABS" :key="t.key" class="comm-tab" :class="{ active: topTab === t.key }" @click="setTopTab(t.key)">
                <i class="fas" :class="t.icon"></i> {{ t.label }}
            </button>
            <span class="comm-tab-hint">
                <i class="fas fa-arrow-down"></i> 下方为实时排行榜
            </span>
        </div>

        <!-- 知识竞赛 -->
        <div v-show="topTab === 'quiz'" class="quiz-shell">
            <div class="quiz-panel quiz-start" v-if="stage === 'start'">
                <div class="quiz-logo"><i class="fas fa-graduation-cap"></i></div>
                <h2>挑战开始前，先了解规则</h2>
                <p class="quiz-intro">题目从题库中随机抽取并按主题分类，每一题都会给出即时反馈与解析，成绩会保存并实时上榜。</p>
                <div class="quiz-rules">
                    <div class="quiz-rule"><i class="fas fa-list-ol"></i>共 20 道选择题</div>
                    <div class="quiz-rule"><i class="fas fa-clock"></i>不限时 · 记录用时</div>
                    <div class="quiz-rule"><i class="fas fa-lightbulb"></i>每题即时解析</div>
                    <div class="quiz-rule"><i class="fas fa-medal"></i>登录后可上榜</div>
                </div>
                <div class="quiz-cats">
                    <button v-for="(n, k) in CAT_NAMES" :key="k" class="cat-chip" :class="{ active: cat === k }" @click="cat = k">
                        <i class="fas" :class="CAT_ICONS[k]"></i> {{ n }}
                    </button>
                </div>
                <div class="quiz-start-btn-wrap">
                    <button class="btn btn-gold" style="font-size:1.1rem;padding:1rem 2.6rem;" @click="start">
                        <i class="fas fa-rocket"></i> 开始挑战
                    </button>
                </div>
            </div>

            <div class="quiz-panel" v-if="stage === 'run'">
                <div class="quiz-topbar">
                    <div class="quiz-progress"><div class="quiz-progress-fill" :style="{ width: (idx / pool.length * 100) + '%' }"></div></div>
                    <span class="quiz-qcount">{{ idx + 1 }} / {{ pool.length }}</span>
                    <span class="quiz-score-chip"><i class="fas fa-star"></i> 得分 {{ correct }}</span>
                    <span class="quiz-timer"><i class="fas fa-stopwatch"></i> {{ timerText }}</span>
                </div>
                <span class="quiz-cat-tag"><i class="fas" :class="CAT_ICONS[q.c]"></i> {{ CAT_NAMES[q.c] }}</span>
                <div class="quiz-question">{{ q.q }}</div>
                <div class="quiz-options">
                    <button v-for="(o, i) in q.o" :key="i" class="quiz-option"
                            :class="{ correct: answered && i === q.a, wrong: answered && i === chosenIdx && i !== q.a, disabled: answered }"
                            @click="choose(i)">
                        <span class="letter">{{ letters[i] }}</span><span>{{ o }}</span>
                    </button>
                </div>
                <div class="quiz-explain show" v-if="answered">
                    <span class="ex-label">{{ chosenIdx === q.a ? '✓ 回答正确！' : '✗ 回答错误' }}</span>{{ q.e }}
                </div>
                <div class="quiz-next-wrap">
                    <button class="btn btn-primary" v-if="answered" @click="next">
                        {{ idx === pool.length - 1 ? '查看成绩' : '下一题' }} <i class="fas fa-arrow-right"></i>
                    </button>
                </div>
            </div>

            <div class="quiz-panel quiz-result" v-if="stage === 'result'">
                <div class="grade-ring" :style="{ '--p': pct }">
                    <div class="grade-inner"><div class="grade-letter">{{ grade.l }}</div><div class="grade-percent">{{ pct }}%</div></div>
                </div>
                <h2>{{ grade.l === 'S' ? '恭喜，完美通关！' : '成绩单已生成' }}</h2>
                <div class="best-score" v-if="rankNote && rankNote !== 'login'" style="display:inline-flex;">
                    <i class="fas fa-trophy"></i> 成绩已上传 · 全站 {{ rankNote }}
                    <a href="#community-leaderboard" style="color:var(--color-cyan);margin-left:0.4rem;" @click.prevent="goLeaderboard">查看排行榜</a>
                </div>
                <div class="best-score" v-if="rankNote === 'login'" style="display:inline-flex;">
                    <i class="fas fa-user-plus"></i> <router-link to="/login" style="color:var(--color-cyan);">登录</router-link>后成绩即可上传排行榜
                </div>
                <p class="grade-comment">{{ grade.c }}</p>
                <div class="quiz-result-stats">
                    <div class="result-stat"><div class="v">{{ correct }}</div><div class="l">答对题数</div></div>
                    <div class="result-stat"><div class="v">{{ pool.length }}</div><div class="l">总题数</div></div>
                    <div class="result-stat"><div class="v">{{ timerText }}</div><div class="l">用时</div></div>
                    <div class="result-stat"><div class="v">{{ maxStreak }}</div><div class="l">最长连对</div></div>
                </div>
                <div class="quiz-review" v-if="wrongList.length">
                    <h3><i class="fas fa-book-open"></i> 错题回顾（{{ wrongList.length }} 题）</h3>
                    <div v-for="(w, i) in wrongList" :key="i" class="review-item">
                        <div class="review-q">{{ w.q.q }}</div>
                        <div class="review-ans">
                            你的答案：<span class="mine">{{ letters[w.mine] }}. {{ w.q.o[w.mine] }}</span>
                            ｜ 正确答案：<span class="right">{{ letters[w.q.a] }}. {{ w.q.o[w.q.a] }}</span><br>{{ w.q.e }}
                        </div>
                    </div>
                </div>
                <div class="quiz-actions">
                    <button class="btn btn-gold" @click="stage = 'start'"><i class="fas fa-rotate-right"></i> 再来一次</button>
                    <button class="btn btn-ghost" @click="goLeaderboard"><i class="fas fa-trophy"></i> 查看排行榜</button>
                </div>
            </div>
        </div>

        <!-- 留言板 -->
        <div v-show="topTab === 'messages'" class="comm-msg">
            <div class="sys-card msg-form-card" v-if="auth.loggedIn">
                <h3 style="font-family:var(--font-title);color:var(--color-gold);font-size:1.1rem;margin-bottom:0.9rem;">
                    <i class="fas fa-pen-to-square"></i> 发布留言
                </h3>
                <textarea class="sys-input" v-model="content" rows="3" maxlength="500"
                          placeholder="写下你的观星经历、天文问题或对本站的建议（最多 500 字）"></textarea>
                <div class="sys-form-actions">
                    <span class="sys-hint">以 <b>{{ auth.user.username }}</b> 的身份发布</span>
                    <button class="btn btn-gold" style="padding:0.6rem 1.6rem;font-size:0.9rem;" :disabled="posting" @click="postMessage">
                        <i class="fas fa-paper-plane"></i> 发布留言
                    </button>
                </div>
            </div>
            <div class="sys-card msg-form-card" v-else style="text-align:center;">
                <p style="color:var(--color-text-secondary);">
                    <i class="fas fa-lock-open" style="margin-right:0.5rem;color:var(--color-cyan);"></i>登录后即可发布留言
                    <router-link to="/login" class="btn btn-gold" style="margin-left:1rem;padding:0.5rem 1.5rem;font-size:0.88rem;">去登录</router-link>
                </p>
            </div>

            <p class="comm-msg-count">共 {{ total }} 条留言</p>
            <div class="msg-list">
                <div v-for="m in rows" :key="m.id" class="msg-card">
                    <div class="msg-avatar">{{ m.username[0] }}</div>
                    <div class="msg-body">
                        <div class="msg-head">
                            <span class="msg-name">{{ m.username }}</span>
                            <span class="msg-time"><i class="fas fa-clock"></i> {{ fmtDateTime(m.created_at) }}</span>
                            <button v-if="auth.isAdmin" class="sys-del-btn" style="margin-left:auto;" title="删除留言" @click="delMessage(m.id)">
                                <i class="fas fa-trash-can"></i>
                            </button>
                        </div>
                        <p class="msg-content">{{ m.content }}</p>
                    </div>
                </div>
                <div v-if="!rows.length" class="sys-card" style="text-align:center;color:var(--color-text-muted);padding:3rem;">
                    <i class="fas fa-satellite-dish" style="font-size:2.4rem;display:block;margin-bottom:0.9rem;opacity:0.5;"></i>
                    还没有留言，成为第一个在星空下留言的人吧 ✦
                </div>
            </div>

            <div class="pager" v-if="pages > 1">
                <a class="page-btn" v-if="page > 1" href="#" @click.prevent="page--; loadMessages()">
                    <i class="fas fa-chevron-left"></i> 上一页
                </a>
                <span class="page-info">{{ page }} / {{ pages }}</span>
                <a class="page-btn" v-if="page < pages" href="#" @click.prevent="page++; loadMessages()">
                    下一页 <i class="fas fa-chevron-right"></i>
                </a>
            </div>
        </div>

        <!-- 下方：实时排行榜 -->
        <section id="community-leaderboard" class="lb-section">
            <div class="lb-head">
                <div class="section-head" style="margin:0;">
                    <h2 class="section-title">
                        <span class="title-icon"><i class="fas fa-trophy"></i></span>星际排行榜
                    </h2>
                    <p class="section-subtitle">按正确率排名，同分依次比较答对题数与用时</p>
                </div>
                <div class="lb-live">
                    <span class="live-dot" :class="{ on: live }"></span>
                    <span class="lb-live-text">{{ live ? '实时更新' : '已暂停' }}</span>
                    <span class="lb-updated" v-if="updatedAt">· {{ updatedAt }}</span>
                    <button class="lb-toggle" @click="live = !live">
                        <i class="fas" :class="live ? 'fa-pause' : 'fa-play'"></i> {{ live ? '暂停' : '继续' }}
                    </button>
                    <button class="lb-toggle" :class="{ spinning: loadingLb }" @click="loadLb()">
                        <i class="fas fa-rotate-right"></i> 刷新
                    </button>
                </div>
            </div>

            <div class="era-filters">
                <button v-for="(n, k) in LB_CATS" :key="k" class="era-chip" :class="{ active: lbCat === k }" @click="setLbCat(k)">{{ n }}</button>
            </div>

            <div class="sys-card">
                <table class="sys-table" v-if="lbRows.length">
                    <thead>
                        <tr><th>排名</th><th>宇航员</th><th>主题</th><th>正确率</th><th>得分</th><th>用时</th><th>提交时间</th></tr>
                    </thead>
                    <tbody>
                        <tr v-for="(r, i) in lbRows" :key="r.id" :class="{ 'row-new': newIds.has(r.id) }">
                            <td><span class="rank" :class="'rank-' + (i < 3 ? i + 1 : 'n')">{{ i === 0 ? '👑' : i + 1 }}</span></td>
                            <td class="cell-user"><i class="fas fa-user-astronaut"></i> {{ r.username }}</td>
                            <td>{{ catName(r.category) }}</td>
                            <td><b class="pct-cell">{{ r.pct }}%</b></td>
                            <td>{{ r.correct }} / {{ r.total }}</td>
                            <td>{{ dur(r.duration_sec) }}</td>
                            <td class="cell-time">{{ fmtDateTime(r.created_at) }}</td>
                        </tr>
                    </tbody>
                </table>
                <div v-else style="text-align:center;color:var(--color-text-muted);padding:3rem;">
                    <i class="fas fa-trophy" style="font-size:2.4rem;display:block;margin-bottom:0.9rem;opacity:0.5;"></i>
                    榜单虚位以待——去上方挑战知识竞赛，成为第一个上榜的人！
                </div>
            </div>

            <div class="sys-card" style="margin-top:2rem;" v-if="auth.loggedIn && mine.length">
                <h3 style="font-family:var(--font-title);color:var(--color-gold);font-size:1.05rem;margin-bottom:1rem;">
                    <i class="fas fa-star"></i> 我的最近成绩
                </h3>
                <table class="sys-table">
                    <thead><tr><th>主题</th><th>正确率</th><th>得分</th><th>用时</th><th>提交时间</th></tr></thead>
                    <tbody>
                        <tr v-for="r in mine" :key="r.id">
                            <td>{{ catName(r.category) }}</td>
                            <td><b class="pct-cell">{{ r.pct }}%</b></td>
                            <td>{{ r.correct }} / {{ r.total }}</td>
                            <td>{{ dur(r.duration_sec) }}</td>
                            <td class="cell-time">{{ fmtDateTime(r.created_at) }}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </section>
        <BookSection topic="community" />
    </div>
</template>

<style scoped>
/* 顶部切换 */
.comm-tabs { display: flex; align-items: center; gap: 0.6rem; margin-bottom: 2rem; flex-wrap: wrap; }
.comm-tab {
    display: inline-flex; align-items: center; gap: 0.45rem;
    padding: 0.6rem 1.5rem; border-radius: 50px; cursor: pointer;
    border: 1px solid rgba(159, 212, 248, 0.3); background: rgba(159, 212, 248, 0.07);
    color: var(--color-text-secondary); font-family: inherit; font-size: 0.92rem;
    transition: all 0.3s ease;
}
.comm-tab:hover { border-color: var(--color-cyan); color: #fff; }
.comm-tab.active { background: var(--gradient-primary); border-color: transparent; color: #fff; box-shadow: var(--shadow-glow-primary); }
.comm-tab-hint { margin-left: auto; font-size: 0.8rem; color: var(--color-text-muted); }

.comm-msg-count { color: var(--color-text-secondary); font-size: 0.85rem; margin: 1.4rem 0 0.8rem; }

/* 排行榜 */
.lb-section { margin-top: 4rem; padding-top: 2.6rem; border-top: 1px solid rgba(159, 212, 248, 0.14); scroll-margin-top: 90px; }
.lb-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 1.2rem; flex-wrap: wrap; margin-bottom: 1.4rem; }
.lb-live { display: flex; align-items: center; gap: 0.45rem; font-size: 0.8rem; color: var(--color-text-secondary); }
.live-dot { width: 8px; height: 8px; border-radius: 50%; background: #6b7280; }
.live-dot.on { background: #34d399; box-shadow: 0 0 0 0 rgba(52, 211, 153, 0.7); animation: livePulse 2s infinite; }
@keyframes livePulse {
    0% { box-shadow: 0 0 0 0 rgba(52, 211, 153, 0.6); }
    70% { box-shadow: 0 0 0 8px rgba(52, 211, 153, 0); }
    100% { box-shadow: 0 0 0 0 rgba(52, 211, 153, 0); }
}
.lb-updated { color: var(--color-text-muted); }
.lb-toggle {
    display: inline-flex; align-items: center; gap: 0.3rem;
    padding: 0.28rem 0.7rem; border-radius: 50px; cursor: pointer; font-family: inherit;
    border: 1px solid rgba(159, 212, 248, 0.25); background: rgba(159, 212, 248, 0.06);
    color: var(--color-text-secondary); font-size: 0.76rem; transition: all 0.3s ease;
}
.lb-toggle:hover { border-color: var(--color-cyan); color: #fff; }
.lb-toggle.spinning i { animation: spinOnce 0.8s linear infinite; }
@keyframes spinOnce { to { transform: rotate(360deg); } }

/* 新上榜行高亮 */
:deep(.sys-table tr.row-new) {
    animation: rowFlash 1.6s ease 2;
}
@keyframes rowFlash {
    0%, 100% { background: transparent; }
    50% { background: rgba(52, 211, 153, 0.14); }
}

@media (max-width: 768px) {
    .comm-tab-hint { width: 100%; margin-left: 0; }
    .lb-head { align-items: flex-start; }
}
</style>
