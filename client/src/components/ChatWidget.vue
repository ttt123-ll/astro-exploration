<script setup>
import { ref, reactive, nextTick, onMounted } from 'vue';
import api from '../api';
import { streamChat, readAiPrefs } from '../utils/streamChat';

const open = ref(false);
const input = ref('');
const sending = ref(false);
const messages = ref([
    { role: 'bot', text: '你好，我是天文小助手 ✨ 关于黑洞、恒星、行星、星系、星座、宇宙起源……都可以问我。' }
]);
const listEl = ref(null);
const QUICK = ['黑洞是什么？', '宇宙有多大？', '什么是光年？', '火星上有生命吗？', '什么是星座？'];

/* 问答模式：knowledge-base（内置知识库）/ llm（真实大模型） */
const mode = ref('knowledge-base');
async function loadMode() {
    try {
        const { data } = await api.get('/chat/mode');
        mode.value = data.mode;
    } catch (e) { /* 忽略 */ }
}
onMounted(loadMode);

function scrollBottom() {
    nextTick(() => { if (listEl.value) listEl.value.scrollTop = listEl.value.scrollHeight; });
}

/* 会话 id：多轮上下文标识（与整页 AI 助手相互独立） */
function getWidgetSession() {
    let id = null;
    try { id = sessionStorage.getItem('ai_widget_session'); } catch (e) { /* 隐私模式 */ }
    if (!id) {
        id = crypto.randomUUID();
        try { sessionStorage.setItem('ai_widget_session', id); } catch (e) { /* 忽略 */ }
    }
    return id;
}
const widgetSessionId = getWidgetSession();

let lastScroll = 0;
function throttledScroll() {
    const now = performance.now();
    if (now - lastScroll > 90) { lastScroll = now; scrollBottom(); }
}

async function send(text) {
    const q = (text !== undefined ? text : input.value).trim();
    if (!q || sending.value) return;
    input.value = '';
    messages.value.push({ role: 'user', text: q });

    // 响应式对象：流式追加才能实时渲染
    const botMsg = reactive({ role: 'bot', text: '', typing: true, sources: [], navHint: '', levelLabel: '' });
    messages.value.push(botMsg);
    scrollBottom();
    sending.value = true;

    const prefs = readAiPrefs();
    try {
        const doneInfo = await streamChat({
            message: q,
            sessionId: widgetSessionId,
            model: prefs.model,
            headers: prefs.headers,
            onMeta(evt) {
                if (evt.levelLabel) botMsg.levelLabel = evt.levelLabel;
                if (Array.isArray(evt.sources)) botMsg.sources = evt.sources;
                if (evt.action && evt.action.type === 'navigate' && evt.action.label) {
                    botMsg.navHint = '正在带你去' + evt.action.label + '…';
                }
            },
            onDelta(chunk) {
                botMsg.text += chunk;
                throttledScroll();
            },
            onDone(evt) {
                if (Array.isArray(evt.sources) && evt.sources.length) botMsg.sources = evt.sources;
                if (evt.action && evt.action.type === 'navigate' && evt.action.label) {
                    botMsg.navHint = '正在带你去' + evt.action.label + '…';
                }
            }
        });
        if (!botMsg.text && doneInfo && doneInfo.reply) botMsg.text = doneInfo.reply;
        if (!botMsg.text) botMsg.text = '（没有收到回复）';
    } catch (e) {
        // 降级：不支持流式时走普通接口
        try {
            const { data } = await api.post('/chat', { message: q, sessionId: widgetSessionId, model: prefs.model }, { headers: prefs.headers });
            botMsg.text = data.reply || '（没有收到回复）';
            botMsg.sources = Array.isArray(data.sources) ? data.sources.filter(s => s && s.title) : [];
            botMsg.levelLabel = data.levelLabel || '';
            if (data.action && data.action.type === 'navigate' && data.action.label) {
                botMsg.navHint = '正在带你去' + data.action.label + '…';
            }
        } catch (e2) {
            botMsg.text = '连接失败，请确认后端服务已启动。';
        }
    } finally {
        botMsg.typing = false;
        sending.value = false;
        scrollBottom();
    }
}

function toggle() {
    open.value = !open.value;
    if (open.value) scrollBottom();
}
</script>

<template>
    <button class="chat-fab" :class="{ active: open }" @click="toggle" title="AI 天文助手">
        <i class="fas" :class="open ? 'fa-xmark' : 'fa-comment-dots'"></i>
    </button>

    <div class="chat-panel" :class="{ open }">
        <div class="chat-head">
            <span class="chat-avatar"><i class="fas fa-robot"></i></span>
            <div class="chat-head-txt">
                <b>AI 天文助手</b>
                <small>{{ mode === 'llm' ? 'AI 大模型 · 在线' : '本地知识库 · 离线可用' }}</small>
            </div>
            <button class="chat-close" @click="open = false"><i class="fas fa-chevron-down"></i></button>
        </div>

        <div class="chat-list" ref="listEl">
            <div v-for="(m, i) in messages" :key="i" class="chat-msg" :class="m.role">
                <span v-if="m.role === 'bot'" class="msg-avatar"><i class="fas fa-robot"></i></span>
                <div class="msg-stack">
                    <div class="msg-bubble" :class="{ 'is-typing': m.typing }">
                        <template v-if="m.text">{{ m.text }}<span v-if="m.typing" class="cw-cursor" aria-hidden="true"></span></template>
                        <span v-else class="typing"><span></span><span></span><span></span></span>
                    </div>
                    <div v-if="m.levelLabel" class="msg-level">{{ m.levelLabel }}</div>
                    <div v-if="m.sources && m.sources.length" class="msg-sources">
                        <router-link v-for="(s, si) in m.sources" :key="si" class="msg-src" :to="s.route || '/'">
                            <i class="fas fa-book-open"></i><span>{{ s.title }}</span>
                        </router-link>
                    </div>
                    <div v-if="m.navHint" class="msg-navhint">
                        <i class="fas fa-wand-magic-sparkles"></i>{{ m.navHint }}
                    </div>
                </div>
            </div>
        </div>

        <div class="chat-quick" v-if="messages.length <= 1">
            <button v-for="q in QUICK" :key="q" @click="send(q)">{{ q }}</button>
        </div>

        <div class="chat-input-row">
            <input v-model="input" type="text" placeholder="问一个天文问题…" maxlength="200"
                   @keydown.enter="send()">
            <button class="chat-send" :disabled="sending || !input.trim()" @click="send()">
                <i class="fas fa-paper-plane"></i>
            </button>
        </div>
    </div>
</template>

<style>
/* 流式输出：打字光标 */
.cw-cursor {
    display: inline-block;
    width: 2px;
    height: 1em;
    margin-left: 2px;
    vertical-align: -0.15em;
    background: var(--color-cyan, #9fd8f0);
    animation: cwBlink 1s steps(2, start) infinite;
}
@keyframes cwBlink { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }
.msg-level {
    display: inline-block;
    margin-top: 0.3rem;
    font-size: 0.66rem;
    color: #c4b5fd;
    border: 1px solid rgba(196, 181, 253, 0.35);
    border-radius: 50px;
    padding: 0.05rem 0.45rem;
}
@media (prefers-reduced-motion: reduce) {
    .cw-cursor { animation: none; }
}

.chat-fab {
    position: fixed;
    left: 24px;
    bottom: 24px;
    width: 54px;
    height: 54px;
    border-radius: 50%;
    border: 1px solid rgba(167, 139, 250, 0.6);
    background: linear-gradient(135deg, #6ea4e8, #9d8cf0);
    color: #fff;
    font-size: 1.25rem;
    cursor: pointer;
    z-index: 96;
    box-shadow: 0 6px 24px rgba(157, 140, 240, 0.5);
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
}
.chat-fab:hover { transform: translateY(-3px) scale(1.05); }
.chat-fab.active { background: rgba(13, 15, 24, 0.9); }

.chat-panel {
    position: fixed;
    left: 24px;
    bottom: 90px;
    width: 360px;
    max-width: calc(100vw - 40px);
    height: 520px;
    max-height: calc(100vh - 120px);
    background: linear-gradient(165deg, rgba(20, 24, 44, 0.98), rgba(10, 12, 20, 0.98));
    border: 1px solid rgba(167, 139, 250, 0.4);
    border-radius: 18px;
    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.6);
    z-index: 96;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    opacity: 0;
    visibility: hidden;
    transform: translateY(16px) scale(0.96);
    transition: all 0.3s ease;
}
.chat-panel.open { opacity: 1; visibility: visible; transform: translateY(0) scale(1); }

.chat-head {
    display: flex;
    align-items: center;
    gap: 0.7rem;
    padding: 0.9rem 1rem;
    border-bottom: 1px solid rgba(167, 139, 250, 0.25);
    background: rgba(167, 139, 250, 0.08);
}
.chat-avatar {
    width: 36px; height: 36px; border-radius: 50%;
    background: var(--gradient-primary);
    color: #fff; display: flex; align-items: center; justify-content: center;
    font-size: 0.95rem; flex-shrink: 0;
}
.chat-head-txt { flex: 1; min-width: 0; }
.chat-head-txt b { display: block; font-size: 0.95rem; color: #e8eefc; }
.chat-head-txt small { color: #86efac; font-size: 0.72rem; }
.chat-close { background: none; border: none; color: var(--color-text-muted); cursor: pointer; font-size: 1rem; }

.chat-list { flex: 1; overflow-y: auto; padding: 1rem; display: flex; flex-direction: column; gap: 0.8rem; }
.chat-msg { display: flex; gap: 0.5rem; align-items: flex-end; }
.chat-msg.user { justify-content: flex-end; }
.msg-avatar {
    width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0;
    background: rgba(157, 140, 240, 0.2); color: #c4b5fd;
    display: flex; align-items: center; justify-content: center; font-size: 0.75rem;
}
.msg-stack {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    max-width: 75%;
    align-items: flex-start;
}
.chat-msg.user .msg-stack { align-items: flex-end; }
.msg-bubble {
    padding: 0.65rem 0.9rem;
    border-radius: 14px;
    font-size: 0.88rem;
    line-height: 1.7;
    color: #e8eefc;
    background: rgba(159, 212, 248, 0.1);
    border: 1px solid rgba(159, 212, 248, 0.25);
    white-space: pre-wrap;
    word-break: break-word;
}
.chat-msg.user .msg-bubble {
    background: var(--gradient-primary);
    border: none;
    color: #fff;
    border-bottom-right-radius: 4px;
}
.chat-msg.bot .msg-bubble { border-bottom-left-radius: 4px; }

.msg-sources { display: flex; flex-wrap: wrap; gap: 0.35rem; }
.msg-src {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.22rem 0.6rem;
    border-radius: 50px;
    font-size: 0.68rem;
    text-decoration: none;
    color: #9fd4f8;
    background: rgba(159, 212, 248, 0.07);
    border: 1px solid rgba(159, 212, 248, 0.25);
    transition: all 0.25s ease;
}
.msg-src:hover { background: rgba(159, 212, 248, 0.18); border-color: var(--color-cyan); }
.msg-src i { font-size: 0.62rem; }

.msg-navhint {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.7rem;
    color: var(--color-gold);
}
.msg-navhint i { font-size: 0.66rem; }

.typing { display: flex; gap: 4px; align-items: center; padding: 0.85rem 1rem; }
.typing span {
    width: 6px; height: 6px; border-radius: 50%; background: #9fd4f8;
    animation: typingBounce 1.2s ease-in-out infinite;
}
.typing span:nth-child(2) { animation-delay: 0.15s; }
.typing span:nth-child(3) { animation-delay: 0.3s; }
@keyframes typingBounce { 0%, 60%, 100% { transform: translateY(0); opacity: 0.4; } 30% { transform: translateY(-4px); opacity: 1; } }

.chat-quick { display: flex; flex-wrap: wrap; gap: 0.5rem; padding: 0 1rem 0.7rem; }
.chat-quick button {
    padding: 0.35rem 0.8rem; border-radius: 50px; font-size: 0.78rem;
    border: 1px solid rgba(159, 212, 248, 0.4); background: rgba(159, 212, 248, 0.08);
    color: #bcd9fb; cursor: pointer; transition: all 0.3s ease;
}
.chat-quick button:hover { background: rgba(159, 212, 248, 0.2); border-color: var(--color-cyan); }

.chat-input-row {
    display: flex; gap: 0.6rem; padding: 0.8rem 1rem;
    border-top: 1px solid rgba(167, 139, 250, 0.2);
}
.chat-input-row input {
    flex: 1; min-width: 0; padding: 0.65rem 1rem; border-radius: 50px;
    border: 1px solid rgba(159, 212, 248, 0.3); background: rgba(255, 255, 255, 0.05);
    color: #fff; font-family: inherit; font-size: 0.88rem;
}
.chat-input-row input:focus { outline: none; border-color: var(--color-cyan); }
.chat-send {
    width: 40px; height: 40px; border-radius: 50%; border: none;
    background: var(--gradient-primary); color: #fff; cursor: pointer; font-size: 0.9rem;
    transition: all 0.3s ease; flex-shrink: 0;
}
.chat-send:hover:not(:disabled) { transform: translateY(-2px); }
.chat-send:disabled { opacity: 0.5; cursor: default; }
</style>
