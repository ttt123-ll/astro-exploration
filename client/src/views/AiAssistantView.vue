<script setup>
import { ref, computed, nextTick, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import api from '../api';
import PageHeader from '../components/PageHeader.vue';

const router = useRouter();
const currentRoute = useRoute();

/* ===================== 会话：多轮上下文标识 ===================== */
function getSessionId() {
    let id = null;
    try { id = sessionStorage.getItem('ai_session'); } catch (e) { /* 隐私模式 */ }
    if (!id) {
        id = crypto.randomUUID();
        try { sessionStorage.setItem('ai_session', id); } catch (e) { /* 忽略 */ }
    }
    return id;
}
const sessionId = getSessionId();

/* ===================== 模式与知识库规模 ===================== */
const mode = ref('llm');
const kb = ref(null);
const vector = ref('local');
const levels = ref([]);
async function loadMode() {
    try {
        const { data } = await api.get('/chat/mode');
        mode.value = data.mode || 'llm';
        kb.value = data.kb || null;
        vector.value = data.vector || 'local';
        levels.value = Array.isArray(data.levels) ? data.levels : [];
    } catch (e) { /* 接口不可用时保持默认展示 */ }
}
const vectorLabel = computed(() => vector.value === 'api' ? '语义向量' : '本地向量');

/* ===================== 受众模式：同样的内容，不同的讲法 ===================== */
const AUDIENCES = [
    { key: 'child', label: '儿童', icon: 'fa-child-reaching', desc: '比喻、短句、少术语' },
    { key: 'amateur', label: '业余爱好者', icon: 'fa-binoculars', desc: '结论 + 参数与理由' },
    { key: 'pro', label: '专业人士', icon: 'fa-microscope', desc: '规格、权衡与工程细节' }
];
const audience = ref('amateur');
try {
    const saved = localStorage.getItem('ai_audience');
    if (['child', 'amateur', 'pro'].includes(saved)) audience.value = saved;
} catch (e) { /* 隐私模式忽略 */ }
function pickAudience(key) {
    audience.value = key;
    try { localStorage.setItem('ai_audience', key); } catch (e) { /* 忽略 */ }
}
const audienceLabel = computed(() => (AUDIENCES.find(a => a.key === audience.value) || AUDIENCES[1]).label);

/* ===================== 装备导购面板 ===================== */
const gearOpen = ref(false);
const gearLoading = ref(false);
const gearBudgets = ref([
    { max: 1000, label: '1000 元以内' },
    { max: 3000, label: '1000–3000 元' },
    { max: 6000, label: '3000–6000 元' },
    { max: 12000, label: '6000–12000 元' },
    { max: 30000, label: '12000–30000 元' }
]);
const gearPurposes = ref([
    { key: 'kid', label: '儿童入门', icon: 'fa-child' },
    { key: 'moon', label: '看月亮', icon: 'fa-moon' },
    { key: 'planet', label: '看行星', icon: 'fa-circle' },
    { key: 'visual', label: '目视深空', icon: 'fa-star' },
    { key: 'ap', label: '深空摄影', icon: 'fa-camera' },
    { key: 'wide', label: '星野银河', icon: 'fa-mountain-sun' },
    { key: 'planet-photo', label: '行星摄影', icon: 'fa-video' },
    { key: 'travel', label: '便携出行', icon: 'fa-suitcase' }
]);
const budgetText = ref('3000');
const pickedPurposes = ref(['moon']);

function togglePurpose(key) {
    const i = pickedPurposes.value.indexOf(key);
    if (i >= 0) pickedPurposes.value.splice(i, 1);
    else pickedPurposes.value.push(key);
}

async function loadGearMeta() {
    try {
        const { data } = await api.get('/chat/audiences');
        if (Array.isArray(data.purposes) && data.purposes.length) gearPurposes.value = data.purposes;
        if (Array.isArray(data.budgets) && data.budgets.length) {
            gearBudgets.value = data.budgets.filter(b => Number.isFinite(b.max)).map(b => ({ max: b.max, label: b.label }));
        }
    } catch (e) { /* 用内置默认值 */ }
}

async function submitGear() {
    if (gearLoading.value) return;
    gearLoading.value = true;
    const priorities = pickedPurposes.value.slice();
    const question = `预算 ${budgetText.value}，用途：${priorities.map(k => (gearPurposes.value.find(p => p.key === k) || {}).label || k).join('、') || '看月亮'}`;
    messages.value.push({ role: 'user', text: question });
    scrollBottom();
    try {
        const { data } = await api.post('/chat/gear', {
            budget: budgetText.value,
            priorities,
            audience: audience.value
        });
        messages.value.push({
            role: 'bot',
            text: data.reply || '暂时没有合适的组合。',
            sources: [],
            suggestions: [],
            level: 2,
            levelLabel: '装备导购引擎',
            tools: ['gear-advisor'],
            gear: data.gear || null,
            nav: null
        });
        gearOpen.value = false;
    } catch (e) {
        messages.value.push({ role: 'bot', text: '装备导购服务暂时不可用，请稍后再试。', sources: [], nav: null });
    } finally {
        gearLoading.value = false;
        scrollBottom();
    }
}

onMounted(loadMode);
onMounted(loadGearMeta);

/* ===================== 消息与发送 ===================== */
const input = ref('');
const sending = ref(false);
const messages = ref([]);
const listEl = ref(null);

const QUICK = [
    '今晚能看到什么星座？',
    '现在的月相适合观星吗？',
    '黑洞是怎么形成的？',
    '预算 3000 想给孩子入门买望远镜，怎么选？',
    '8000 预算拍深空，主镜和赤道仪怎么配？',
    '80mm 和 130mm 口径差多少？'
];

function scrollBottom() {
    nextTick(() => { if (listEl.value) listEl.value.scrollTop = listEl.value.scrollHeight; });
}

/* bot 文本：先 HTML 转义，再把 **加粗** 转成 <b>，配合 v-html 渲染 */
function renderBot(text) {
    const esc = String(text || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    return esc
        .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
        // 角标溯源：【1】→ 上标徽标，与下方来源列表一一对应
        .replace(/【(\d+)】/g, '<sup class="ai-cite">$1</sup>');
}

/* navigate 动作：提示 + 600ms 后跳转；已在该路由则只提示 */
function handleNavigate(msg, action) {
    msg.nav = { hint: '正在带你去' + (action.label || '目标页面') + '…' };
    if (currentRoute.path === action.route) return;
    setTimeout(() => {
        router.push({ path: action.route, query: action.query || {} });
    }, 600);
}

async function send(text) {
    const q = (text !== undefined ? text : input.value).trim();
    if (!q || sending.value) return;
    input.value = '';
    messages.value.push({ role: 'user', text: q });
    scrollBottom();
    sending.value = true;
    try {
        const { data } = await api.post('/chat', { message: q, sessionId, audience: audience.value });
        const botMsg = {
            role: 'bot',
            text: data.reply || '（没有收到回复）',
            sources: Array.isArray(data.sources) ? data.sources.filter(s => s && s.title) : [],
            suggestions: Array.isArray(data.suggestions) ? data.suggestions : [],
            level: data.level || 2,
            levelLabel: data.levelLabel || '',
            tools: Array.isArray(data.tools) ? data.tools : [],
            gear: data.gear || null,
            nav: null
        };
        messages.value.push(botMsg);
        if (data.action && data.action.type === 'navigate' && data.action.route) {
            handleNavigate(botMsg, data.action);
        }
    } catch (e) {
        messages.value.push({ role: 'bot', text: '连接失败，请确认后端服务已启动。', sources: [], nav: null });
    } finally {
        sending.value = false;
        scrollBottom();
    }
}
</script>

<template>
    <div class="container">
        <PageHeader kicker="AI · RAG 检索增强" title="星语 AI 天文助手" icon="fa-robot" deco="orbit"
                    subtitle="基于站内自建天文知识库，回答可溯源" />

        <!-- 状态条：运行模式 + 知识库规模 -->
        <div class="ai-statusbar">
            <span class="ai-mode-badge">
                <span class="ai-dot" :class="mode === 'llm' ? 'on' : 'local'"></span>
                {{ mode === 'llm' ? 'AI 大模型 · 在线' : '本地知识库 · 离线可用' }}
            </span>
            <span class="ai-kb">
                <i class="fas fa-vector-square"></i>{{ vectorLabel }}检索
            </span>
            <span v-if="kb" class="ai-kb">
                <i class="fas fa-database"></i>{{ kb.chunks }} 知识块 · {{ kb.sources }} 来源页面
            </span>
            <span v-if="levels.length" class="ai-kb ai-levels">
                <i class="fas fa-layer-group"></i>{{ levels.map(l => l.name).join(' → ') }}
            </span>
        </div>

        <!-- 受众模式：同样的内容，不同的讲法 -->
        <div class="ai-audience">
            <span class="ai-audience-label"><i class="fas fa-users"></i> 回答对象</span>
            <button v-for="a in AUDIENCES" :key="a.key" class="ai-audience-btn"
                    :class="{ active: audience === a.key }" :title="a.desc"
                    @click="pickAudience(a.key)">
                <i class="fas" :class="a.icon"></i>
                <span>{{ a.label }}</span>
            </button>
            <span class="ai-audience-hint">当前：{{ audienceLabel }}模式，回答的详略与用词会随之调整</span>
        </div>

        <!-- 能力展示 -->
        <div class="ai-caps">
            <div class="ai-cap">
                <i class="fas fa-moon"></i>
                <div><b>月相计算</b><span>实时月相与观星建议</span></div>
            </div>
            <div class="ai-cap">
                <i class="fas fa-star-and-crescent"></i>
                <div><b>今夜观星</b><span>当季星座与看点推荐</span></div>
            </div>
            <div class="ai-cap">
                <i class="fas fa-location-arrow"></i>
                <div><b>页面导航</b><span>一句话直达站内页面</span></div>
            </div>
            <button class="ai-cap ai-cap-btn" :class="{ active: gearOpen }" @click="gearOpen = !gearOpen">
                <i class="fas fa-binoculars"></i>
                <div><b>装备导购</b><span>预算 + 用途 → 专业配置方案</span></div>
            </button>
        </div>

        <!-- 装备导购面板 -->
        <transition name="gear">
            <div v-if="gearOpen" class="ai-gear">
                <div class="ag-head">
                    <h4><i class="fas fa-binoculars"></i> 观测装备导购</h4>
                    <button class="ag-close" @click="gearOpen = false" aria-label="关闭"><i class="fas fa-xmark"></i></button>
                </div>
                <div class="ag-row">
                    <span class="ag-label">预算</span>
                    <div class="ag-budgets">
                        <button v-for="b in gearBudgets" :key="b.max" class="ag-chip"
                                :class="{ active: budgetText === String(b.max) }" @click="budgetText = String(b.max)">
                            {{ b.label }}
                        </button>
                        <input v-model="budgetText" class="ag-input" placeholder="或直接输入，如 8000" aria-label="预算">
                    </div>
                </div>
                <div class="ag-row">
                    <span class="ag-label">想做什么</span>
                    <div class="ag-purposes">
                        <button v-for="p in gearPurposes" :key="p.key" class="ag-chip"
                                :class="{ active: pickedPurposes.includes(p.key) }" @click="togglePurpose(p.key)">
                            <i class="fas" :class="p.icon"></i> {{ p.label }}
                        </button>
                    </div>
                </div>
                <div class="ag-foot">
                    <span class="ag-tip"><i class="fas fa-circle-info"></i> 价格为参考区间，按「{{ audienceLabel }}」模式讲解</span>
                    <button class="ag-submit" :disabled="gearLoading" @click="submitGear">
                        {{ gearLoading ? '生成中…' : '生成配置方案' }}
                    </button>
                </div>
            </div>
        </transition>

        <!-- 聊天面板 -->
        <div class="ai-panel">
            <div class="ai-list" ref="listEl">
                <!-- 空状态欢迎区 -->
                <div v-if="!messages.length && !sending" class="ai-welcome">
                    <div class="ai-orbit" aria-hidden="true">
                        <span class="ai-orbit-ring r1"></span>
                        <span class="ai-orbit-ring r2"></span>
                        <span class="ai-orbit-core"><i class="fas fa-robot"></i></span>
                    </div>
                    <h3>你好，我是星语 ✨</h3>
                    <p>问我任何天文问题——月相、星座、黑洞、行星……每条回答都可溯源到站内知识库。</p>
                    <div class="ai-quick">
                        <button v-for="q in QUICK" :key="q" @click="send(q)">{{ q }}</button>
                    </div>
                </div>

                <!-- 消息列表 -->
                <div v-for="(m, i) in messages" :key="i" class="ai-msg" :class="m.role">
                    <span v-if="m.role === 'bot'" class="ai-avatar"><i class="fas fa-robot"></i></span>
                    <div class="ai-stack">
                        <div v-if="m.role === 'user'" class="ai-bubble">{{ m.text }}</div>
                        <div v-else class="ai-bubble" v-html="renderBot(m.text)"></div>

                        <!-- 三级降级可视化：本条回答的级别 + 调用的工具 -->
                        <div v-if="m.role === 'bot' && (m.levelLabel || (m.tools && m.tools.length))" class="ai-meta">
                            <span v-if="m.levelLabel" class="ai-level" :class="'lv' + m.level">
                                <i class="fas fa-circle-nodes"></i>{{ m.levelLabel }}
                            </span>
                            <span v-for="tool in m.tools" :key="tool" class="ai-tool">
                                <i class="fas" :class="{
                                    'fa-moon': tool === 'moon-phase',
                                    'fa-star-and-crescent': tool === 'tonight-sky',
                                    'fa-location-arrow': tool === 'navigate'
                                }"></i>{{ tool === 'moon-phase' ? '月相计算' : tool === 'tonight-sky' ? '今夜观星' : '页面导航' }}
                            </span>
                        </div>

                        <!-- 装备方案卡（结构化） -->
                        <div v-if="m.gear && m.gear.plans && m.gear.plans.length" class="gear-card">
                            <div class="gc-head">
                                <i class="fas fa-binoculars"></i>
                                <div>
                                    <b>装备方案</b>
                                    <span>预算 {{ m.gear.budgetMax }} 元 · {{ m.gear.tier ? m.gear.tier.label : '' }}</span>
                                </div>
                            </div>
                            <div v-for="p in m.gear.plans" :key="p.id" class="gc-plan">
                                <div class="gc-plan-head">
                                    <b>{{ p.name }}</b>
                                    <span class="gc-total">≈ {{ p.total }} 元</span>
                                </div>
                                <ul class="gc-items">
                                    <li v-for="it in p.items" :key="it.role + it.id">
                                        <span class="gc-role">{{ it.role }}</span>
                                        <span class="gc-name">{{ it.name }}</span>
                                        <em class="gc-price">{{ it.price }} 元</em>
                                    </li>
                                </ul>
                                <div v-if="p.optics" class="gc-spec">
                                    口径 {{ p.aperture }}mm · 焦比 f/{{ p.optics.ratio }} · 极限星等 {{ p.optics.limitMag }} · 分辨率 {{ p.optics.resolution }}″
                                </div>
                                <p class="gc-why">{{ p.why }}</p>
                                <p v-if="p.upgrade" class="gc-up"><i class="fas fa-arrow-trend-up"></i> {{ p.upgrade }}</p>
                            </div>
                        </div>

                        <!-- 第 3 级兜底：给出可点的推荐问题 -->
                        <div v-if="m.role === 'bot' && m.suggestions && m.suggestions.length" class="ai-quick ai-quick-inline">
                            <button v-for="q in m.suggestions" :key="q" @click="send(q)">{{ q }}</button>
                        </div>

                        <!-- 溯源来源 -->
                        <div v-if="m.sources && m.sources.length" class="ai-sources">
                            <router-link v-for="(s, si) in m.sources" :key="si" class="ai-src" :to="s.route || '/'">
                                <i class="fas fa-book-open"></i><span>{{ s.title }}</span>
                            </router-link>
                        </div>

                        <!-- 页面导航动作 -->
                        <div v-if="m.nav" class="ai-navhint">
                            <i class="fas fa-wand-magic-sparkles"></i>{{ m.nav.hint }}
                        </div>
                    </div>
                </div>

                <!-- 发送中：三点 typing -->
                <div v-if="sending" class="ai-msg bot">
                    <span class="ai-avatar"><i class="fas fa-robot"></i></span>
                    <div class="ai-bubble ai-typing"><span></span><span></span><span></span></div>
                </div>
            </div>

            <!-- 输入栏 -->
            <div class="ai-input-row">
                <input v-model="input" type="text" placeholder="问一个天文问题，比如「今晚能看到什么星座？」…"
                       maxlength="200" :disabled="sending" @keydown.enter="send()">
                <button class="ai-gear-btn" :class="{ active: gearOpen }" title="装备导购"
                        @click="gearOpen = !gearOpen">
                    <i class="fas fa-binoculars"></i>
                </button>
                <button class="ai-send" :disabled="sending || !input.trim()" @click="send()">
                    <i class="fas fa-paper-plane"></i>
                </button>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* ===== 受众模式选择器 ===== */
.ai-audience {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.5rem;
    justify-content: center;
    margin: 0 auto 0.9rem;
}
.ai-audience-label { font-size: 0.8rem; color: var(--color-text-muted); }
.ai-audience-label i { color: var(--color-cyan); margin-right: 0.25rem; }
.ai-audience-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.35rem 0.85rem;
    border-radius: 50px;
    font-family: inherit;
    font-size: 0.8rem;
    cursor: pointer;
    color: var(--color-text-secondary);
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(159, 212, 248, 0.25);
    transition: all 0.25s ease;
}
.ai-audience-btn:hover { color: #fff; border-color: var(--color-cyan); }
.ai-audience-btn.active {
    color: #0a0d18;
    font-weight: 600;
    background: linear-gradient(135deg, #9fd8f0, #c4b5fd);
    border-color: transparent;
    box-shadow: 0 4px 16px rgba(159, 212, 248, 0.35);
}
.ai-audience-hint { font-size: 0.72rem; color: var(--color-text-muted); }

/* ===== 装备导购面板 ===== */
.ai-cap-btn { cursor: pointer; font-family: inherit; text-align: left; }
.ai-cap-btn.active { border-color: var(--color-cyan); box-shadow: 0 0 20px rgba(159, 212, 248, 0.25); }

.ai-gear {
    margin: 0 auto 1.2rem;
    padding: 1.1rem 1.2rem 1.2rem;
    border-radius: 16px;
    background: linear-gradient(140deg, rgba(20, 28, 48, 0.95), rgba(8, 12, 24, 0.92));
    border: 1px solid rgba(159, 212, 248, 0.28);
    box-shadow: 0 18px 48px rgba(0, 0, 0, 0.45);
}
.ag-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.9rem; }
.ag-head h4 { font-family: var(--font-title); font-size: 1rem; color: var(--color-gold); }
.ag-head i { color: var(--color-cyan); margin-right: 0.35rem; }
.ag-close {
    width: 28px; height: 28px; border-radius: 8px; cursor: pointer;
    color: var(--color-text-secondary); background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(159, 212, 248, 0.25); transition: all 0.25s ease;
}
.ag-close:hover { color: #fff; border-color: var(--color-cyan); }
.ag-row { display: flex; gap: 0.8rem; align-items: flex-start; margin-bottom: 0.85rem; }
.ag-label { flex: 0 0 4.5rem; font-size: 0.82rem; color: var(--color-text-muted); padding-top: 0.35rem; }
.ag-budgets, .ag-purposes { display: flex; flex-wrap: wrap; gap: 0.45rem; flex: 1; }
.ag-chip {
    display: inline-flex; align-items: center; gap: 0.3rem;
    padding: 0.32rem 0.78rem; border-radius: 50px;
    font-family: inherit; font-size: 0.78rem; cursor: pointer;
    color: var(--color-text-secondary);
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(159, 212, 248, 0.22);
    transition: all 0.22s ease;
}
.ag-chip:hover { color: #fff; border-color: var(--color-cyan); }
.ag-chip.active {
    color: #0a0d18; font-weight: 600;
    background: var(--color-cyan);
    border-color: transparent;
}
.ag-input {
    width: 9rem; padding: 0.32rem 0.6rem; border-radius: 8px;
    font-family: inherit; font-size: 0.8rem;
    color: var(--color-text); background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(159, 212, 248, 0.25);
}
.ag-input:focus { outline: none; border-color: var(--color-cyan); }
.ag-foot { display: flex; align-items: center; justify-content: space-between; gap: 0.8rem; flex-wrap: wrap; }
.ag-tip { font-size: 0.74rem; color: var(--color-text-muted); }
.ag-tip i { color: var(--color-cyan); margin-right: 0.25rem; }
.ag-submit {
    padding: 0.5rem 1.3rem; border-radius: 50px; cursor: pointer;
    font-family: var(--font-title); font-size: 0.84rem; font-weight: 600;
    color: #0a0d18; background: var(--gradient-primary);
    border: none; transition: all 0.25s ease;
}
.ag-submit:disabled { opacity: 0.6; cursor: default; }
.ag-submit:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 22px rgba(157, 140, 240, 0.45); }

.gear-enter-active, .gear-leave-active { transition: opacity 0.25s ease, transform 0.25s ease; }
.gear-enter-from, .gear-leave-to { opacity: 0; transform: translateY(-8px); }

/* ===== 装备方案卡 ===== */
.gear-card {
    margin-top: 0.6rem;
    padding: 0.9rem 1rem 1rem;
    border-radius: 12px;
    background: rgba(159, 212, 248, 0.06);
    border: 1px solid rgba(159, 212, 248, 0.22);
}
.gc-head { display: flex; align-items: center; gap: 0.55rem; margin-bottom: 0.7rem; }
.gc-head i { color: var(--color-gold); font-size: 1.05rem; }
.gc-head div { display: flex; flex-direction: column; line-height: 1.4; }
.gc-head b { font-family: var(--font-title); font-size: 0.92rem; color: var(--color-gold); }
.gc-head span { font-size: 0.72rem; color: var(--color-text-muted); }
.gc-plan { padding: 0.7rem 0; border-top: 1px dashed rgba(159, 212, 248, 0.18); }
.gc-plan:first-of-type { border-top: none; padding-top: 0; }
.gc-plan-head { display: flex; align-items: baseline; justify-content: space-between; gap: 0.6rem; margin-bottom: 0.45rem; }
.gc-plan-head b { font-size: 0.9rem; color: #e8eefc; }
.gc-total { font-size: 0.8rem; color: var(--color-gold); font-variant-numeric: tabular-nums; }
.gc-items { list-style: none; margin: 0 0 0.45rem; padding: 0; }
.gc-items li {
    display: grid; grid-template-columns: 4.2rem 1fr auto; gap: 0.5rem;
    font-size: 0.78rem; line-height: 1.8; color: var(--color-text-secondary);
}
.gc-role { color: var(--color-cyan); }
.gc-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.gc-price { font-style: normal; color: var(--color-text-muted); font-variant-numeric: tabular-nums; }
.gc-spec { font-size: 0.72rem; color: #bfe3f5; margin-bottom: 0.4rem; }
.gc-why { font-size: 0.78rem; line-height: 1.75; color: var(--color-text-secondary); }
.gc-up { font-size: 0.74rem; color: var(--color-text-muted); margin-top: 0.3rem; }
.gc-up i { color: #6ec8a8; margin-right: 0.2rem; }

.ai-gear-btn {
    width: 40px; height: 40px; border-radius: 50%; cursor: pointer;
    color: var(--color-cyan); background: rgba(159, 212, 248, 0.08);
    border: 1px solid rgba(159, 212, 248, 0.3);
    transition: all 0.25s ease; flex-shrink: 0;
}
.ai-gear-btn:hover, .ai-gear-btn.active {
    color: #0a0d18; background: var(--color-cyan); border-color: transparent;
}

/* 角标溯源：回答中的上标数字，对应下方来源列表 */
:deep(.ai-cite) {
    display: inline-grid;
    place-items: center;
    min-width: 16px;
    height: 16px;
    padding: 0 4px;
    margin: 0 2px;
    border-radius: 5px;
    font-size: 0.62rem;
    font-weight: 700;
    line-height: 1;
    color: #0a0d18;
    background: var(--color-cyan);
    vertical-align: super;
}

/* 回答级别 / 工具标签 */
.ai-meta { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-top: 0.45rem; }
.ai-level, .ai-tool {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.18rem 0.55rem;
    border-radius: 50px;
    font-size: 0.68rem;
    letter-spacing: 0.02em;
}
.ai-level.lv1 { color: #4ade80; background: rgba(74, 222, 128, 0.1); border: 1px solid rgba(74, 222, 128, 0.35); }
.ai-level.lv2 { color: #8fd3e8; background: rgba(143, 211, 232, 0.1); border: 1px solid rgba(143, 211, 232, 0.3); }
.ai-level.lv3 { color: #e8a06e; background: rgba(232, 160, 110, 0.1); border: 1px solid rgba(232, 160, 110, 0.32); }
.ai-tool {
    color: #c4b5fd;
    background: rgba(167, 139, 250, 0.09);
    border: 1px solid rgba(167, 139, 250, 0.28);
}
.ai-quick-inline { margin-top: 0.55rem; }

/* ===================== 状态条 ===================== */
.ai-statusbar {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
    gap: 0.7rem;
    margin: 0 auto 1.1rem;
}

.ai-mode-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.4rem 0.95rem;
    border-radius: 50px;
    font-size: 0.8rem;
    color: #cfe0f8;
    background: var(--bg-glass);
    border: 1px solid rgba(159, 212, 248, 0.28);
}

.ai-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
}
.ai-dot.on {
    background: #4ade80;
    box-shadow: 0 0 10px #4ade80;
    animation: aiDotPulse 2s ease-in-out infinite;
}
.ai-dot.local {
    background: #a78bfa;
    box-shadow: 0 0 10px #a78bfa;
}
@keyframes aiDotPulse {
    0%, 100% { opacity: 0.6; }
    50% { opacity: 1; }
}

.ai-kb {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.4rem 0.95rem;
    border-radius: 50px;
    font-size: 0.8rem;
    color: #c4b5fd;
    background: rgba(167, 139, 250, 0.08);
    border: 1px solid rgba(167, 139, 250, 0.3);
}
.ai-kb i { font-size: 0.72rem; }

/* ===================== 能力 chip ===================== */
.ai-caps {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.8rem;
    max-width: 860px;
    margin: 0 auto 1.2rem;
}

.ai-cap {
    display: flex;
    align-items: center;
    gap: 0.7rem;
    padding: 0.75rem 0.95rem;
    border-radius: var(--radius-md);
    background: var(--bg-card);
    border: 1px solid rgba(159, 212, 248, 0.16);
    transition: transform 0.3s ease, border-color 0.3s ease;
}
.ai-cap:hover {
    transform: translateY(-3px);
    border-color: rgba(159, 212, 248, 0.4);
}

.ai-cap i {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.9rem;
    color: var(--color-cyan);
    background: rgba(159, 212, 248, 0.1);
    border: 1px solid rgba(159, 212, 248, 0.22);
}

.ai-cap b {
    display: block;
    font-size: 0.85rem;
    color: #e8eefc;
}

.ai-cap span {
    font-size: 0.72rem;
    color: var(--color-text-muted);
}

/* ===================== 聊天面板 ===================== */
.ai-panel {
    max-width: 860px;
    margin: 0 auto 3rem;
    background: linear-gradient(165deg, rgba(20, 24, 44, 0.9), rgba(10, 12, 20, 0.94));
    border: 1px solid rgba(167, 139, 250, 0.35);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-card);
    overflow: hidden;
    display: flex;
    flex-direction: column;
}

.ai-list {
    flex: 1;
    overflow-y: auto;
    padding: 1.4rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    min-height: 400px;
    max-height: 62vh;
}

/* ===================== 空状态欢迎区 ===================== */
.ai-welcome {
    margin: auto;
    text-align: center;
    padding: 1.5rem 1rem;
    max-width: 520px;
}

.ai-orbit {
    position: relative;
    width: 120px;
    height: 120px;
    margin: 0 auto 1.4rem;
}

.ai-orbit-ring {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    border: 1px dashed rgba(159, 212, 248, 0.35);
    animation: aiSpin 16s linear infinite;
}
.ai-orbit-ring::after {
    content: '';
    position: absolute;
    top: -4px;
    left: 50%;
    width: 8px;
    height: 8px;
    margin-left: -4px;
    border-radius: 50%;
    background: var(--color-cyan);
    box-shadow: 0 0 12px var(--color-cyan);
}
.ai-orbit-ring.r2 {
    inset: 16px;
    border-color: rgba(167, 139, 250, 0.3);
    animation-duration: 10s;
    animation-direction: reverse;
}
.ai-orbit-ring.r2::after {
    background: #a78bfa;
    box-shadow: 0 0 12px #a78bfa;
}

.ai-orbit-core {
    position: absolute;
    inset: 34px;
    border-radius: 50%;
    background: var(--gradient-primary);
    color: #fff;
    font-size: 1.3rem;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 0 30px rgba(157, 140, 240, 0.55);
    animation: aiCoreFloat 4s ease-in-out infinite;
}
@keyframes aiSpin {
    to { transform: rotate(360deg); }
}
@keyframes aiCoreFloat {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.06); }
}

.ai-welcome h3 {
    font-size: 1.25rem;
    letter-spacing: 1px;
    background: linear-gradient(180deg, #fff 10%, var(--color-gold) 120%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    margin-bottom: 0.5rem;
}

.ai-welcome p {
    font-size: 0.86rem;
    color: var(--color-text-secondary);
    line-height: 1.9;
    margin-bottom: 1.2rem;
}

.ai-quick {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    justify-content: center;
}
.ai-quick button {
    padding: 0.4rem 0.9rem;
    border-radius: 50px;
    font-size: 0.8rem;
    font-family: inherit;
    border: 1px solid rgba(159, 212, 248, 0.4);
    background: rgba(159, 212, 248, 0.08);
    color: #bcd9fb;
    cursor: pointer;
    transition: all 0.3s ease;
}
.ai-quick button:hover {
    background: rgba(159, 212, 248, 0.2);
    border-color: var(--color-cyan);
    transform: translateY(-2px);
}

/* ===================== 消息气泡 ===================== */
.ai-msg {
    display: flex;
    gap: 0.6rem;
    align-items: flex-end;
}
.ai-msg.user { justify-content: flex-end; }

.ai-avatar {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.85rem;
    color: #c4b5fd;
    background: rgba(157, 140, 240, 0.18);
    border: 1px solid rgba(157, 140, 240, 0.4);
}

.ai-stack {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
    max-width: 78%;
    align-items: flex-start;
}
.ai-msg.user .ai-stack { align-items: flex-end; }

.ai-bubble {
    padding: 0.7rem 1rem;
    border-radius: 14px;
    font-size: 0.92rem;
    line-height: 1.8;
    color: #e8eefc;
    background: rgba(159, 212, 248, 0.08);
    border: 1px solid rgba(159, 212, 248, 0.22);
    white-space: pre-wrap;
    word-break: break-word;
}
.ai-msg.bot .ai-bubble { border-bottom-left-radius: 4px; }
.ai-msg.user .ai-bubble {
    background: var(--gradient-primary);
    border: none;
    color: #fff;
    border-bottom-right-radius: 4px;
}
.ai-bubble b {
    color: var(--color-gold);
    font-weight: 700;
}

/* ===================== 溯源来源 chip ===================== */
.ai-sources {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
}
.ai-src {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.26rem 0.7rem;
    border-radius: 50px;
    font-size: 0.74rem;
    text-decoration: none;
    color: #9fd4f8;
    background: rgba(159, 212, 248, 0.07);
    border: 1px solid rgba(159, 212, 248, 0.28);
    transition: all 0.25s ease;
}
.ai-src:hover {
    background: rgba(159, 212, 248, 0.18);
    border-color: var(--color-cyan);
}
.ai-src i { font-size: 0.66rem; }

/* ===================== 导航动作提示 ===================== */
.ai-navhint {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.3rem 0.75rem;
    border-radius: 50px;
    font-size: 0.78rem;
    color: var(--color-gold);
    background: rgba(216, 224, 244, 0.06);
    border: 1px dashed rgba(216, 224, 244, 0.35);
    animation: aiFadeIn 0.4s ease;
}
@keyframes aiFadeIn {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
}

/* ===================== typing 三点动画 ===================== */
.ai-typing {
    display: flex;
    gap: 4px;
    align-items: center;
    padding: 0.9rem 1.05rem;
}
.ai-typing span {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #9fd4f8;
    animation: aiTyping 1.2s ease-in-out infinite;
}
.ai-typing span:nth-child(2) { animation-delay: 0.15s; }
.ai-typing span:nth-child(3) { animation-delay: 0.3s; }
@keyframes aiTyping {
    0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
    30% { transform: translateY(-4px); opacity: 1; }
}

/* ===================== 输入栏 ===================== */
.ai-input-row {
    display: flex;
    gap: 0.6rem;
    padding: 0.9rem 1.1rem;
    border-top: 1px solid rgba(167, 139, 250, 0.22);
    background: rgba(167, 139, 250, 0.05);
}
.ai-input-row input {
    flex: 1;
    min-width: 0;
    padding: 0.7rem 1.1rem;
    border-radius: 50px;
    border: 1px solid rgba(159, 212, 248, 0.3);
    background: rgba(255, 255, 255, 0.05);
    color: #fff;
    font-family: inherit;
    font-size: 0.9rem;
    transition: border-color 0.3s ease;
}
.ai-input-row input::placeholder { color: var(--color-text-muted); }
.ai-input-row input:focus {
    outline: none;
    border-color: var(--color-cyan);
}
.ai-input-row input:disabled { opacity: 0.6; }

.ai-send {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    border: none;
    flex-shrink: 0;
    background: var(--gradient-primary);
    color: #fff;
    font-size: 0.95rem;
    cursor: pointer;
    transition: all 0.3s ease;
}
.ai-send:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: var(--shadow-glow-primary);
}
.ai-send:disabled {
    opacity: 0.5;
    cursor: default;
}

/* ===================== 响应式 ===================== */
@media (max-width: 720px) {
    .ai-caps { grid-template-columns: 1fr; }
    .ai-stack { max-width: 88%; }
    .ai-list { padding: 1rem; min-height: 320px; }
    .ai-panel { margin-bottom: 2rem; }
}
</style>
