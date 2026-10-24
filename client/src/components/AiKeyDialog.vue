<script setup>
/**
 * AI 连接设置：站点内置 Key / 我的 DeepSeek Key
 * - Key 仅保存在本机浏览器 localStorage，不上传服务器数据库
 * - 保存前调用 /api/chat/verify-key 做连通性校验（顺便读取余额）
 */
import { ref, computed, onMounted } from 'vue';
import api from '../api';

const emit = defineEmits(['close', 'changed']);
const STORAGE_KEY = 'astro_ai_key';

const site = ref({ available: false, masked: '', model: 'deepseek-chat' });
const myKey = ref('');
const input = ref('');
const loading = ref(false);
const error = ref('');
const success = ref('');
const balanceText = ref('');

const mode = computed(() => (myKey.value ? 'mine' : site.value.available ? 'site' : 'none'));
const maskedMine = computed(() => (myKey.value ? myKey.value.slice(0, 7) + '****' + myKey.value.slice(-4) : ''));

function readLocal() {
    try { return localStorage.getItem(STORAGE_KEY) || ''; } catch (e) { return ''; }
}

async function loadSite() {
    try {
        const { data } = await api.get('/chat/status');
        site.value = {
            available: !!data.siteKeyAvailable,
            masked: data.siteKeyMasked || '',
            model: data.model || 'deepseek-chat'
        };
    } catch (e) { /* 接口不可用时保持默认 */ }
}

function formatBalance(b) {
    if (!b || !b.infos || !b.infos.length) return '';
    const info = b.infos[0];
    const cur = info.currency === 'CNY' ? '¥' : info.currency + ' ';
    return cur + info.total + '（赠送 ' + info.granted + ' / 充值 ' + info.toppedUp + '）';
}

async function connect() {
    const key = input.value.trim();
    error.value = '';
    success.value = '';
    balanceText.value = '';
    if (!key) { error.value = '请先粘贴你的 DeepSeek API Key'; return; }
    loading.value = true;
    try {
        const { data } = await api.post('/chat/verify-key', { apiKey: key });
        if (!data.valid) { error.value = data.message || '校验失败，请检查 Key'; return; }
        try { localStorage.setItem(STORAGE_KEY, key); } catch (e) { /* 隐私模式忽略 */ }
        myKey.value = key;
        input.value = '';
        balanceText.value = formatBalance(data.balance);
        success.value = (data.message || '连接成功') + (data.responseTimeMs ? '（' + data.responseTimeMs + 'ms）' : '');
        emit('changed');
    } catch (e) {
        error.value = (e.response && e.response.data && e.response.data.error) || '校验失败，请稍后再试';
    } finally {
        loading.value = false;
    }
}

function useSiteKey() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* 忽略 */ }
    myKey.value = '';
    input.value = '';
    error.value = '';
    success.value = '';
    balanceText.value = '';
    emit('changed');
}

function close() { emit('close'); }

onMounted(() => {
    myKey.value = readLocal();
    loadSite();
});
</script>

<template>
    <div class="ak-mask" @click.self="close">
        <div class="ak-panel" role="dialog" aria-modal="true" aria-label="AI 连接设置">
            <div class="ak-head">
                <span class="ak-head-icon"><i class="fas fa-plug-circle-bolt"></i></span>
                <div>
                    <h3>AI 连接设置</h3>
                    <p>选择用站点内置 Key，或填入你自己的 DeepSeek Key</p>
                </div>
                <button class="ak-close" type="button" aria-label="关闭" @click="close"><i class="fas fa-xmark"></i></button>
            </div>

            <!-- 当前状态 -->
            <div class="ak-status" :class="'is-' + mode">
                <div class="ak-status-main">
                    <i class="fas" :class="mode === 'mine' ? 'fa-key' : mode === 'site' ? 'fa-cloud' : 'fa-triangle-exclamation'"></i>
                    <div>
                        <b>{{ mode === 'mine' ? '已连接：我的 API Key' : mode === 'site' ? '已连接：站点内置 Key' : '未连接：请填入 Key 或联系管理员' }}</b>
                        <span v-if="mode === 'mine'">之后的 AI 对话会使用这把 Key，计入你自己的账户额度</span>
                        <span v-else-if="mode === 'site'">使用服务器配置的 Key，无需你付费；填入自己的 Key 可优先使用你的额度</span>
                        <span v-else>站点未配置内置 Key，请填入你自己的 Key 后使用</span>
                    </div>
                </div>
                <code v-if="mode === 'mine'">{{ maskedMine }}</code>
                <code v-else-if="mode === 'site'">{{ site.masked || '已配置' }}</code>
            </div>

            <!-- 使用自己的 Key -->
            <div class="ak-block">
                <h4><i class="fas fa-key"></i> 使用你自己的 DeepSeek API Key</h4>
                <div class="ak-input-row">
                    <input v-model="input" type="password" autocomplete="off" spellcheck="false"
                           placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                           :disabled="loading" @keydown.enter="connect">
                    <button class="ak-primary" type="button" :disabled="loading" @click="connect">
                        <i class="fas" :class="loading ? 'fa-spinner fa-spin' : 'fa-link'"></i>
                        {{ loading ? '校验中…' : '验证并连接' }}
                    </button>
                </div>
                <p class="ak-tip"><i class="fas fa-circle-info"></i> Key 只保存在本机浏览器，验证通过后才启用；不会写入服务器数据库。</p>
                <p v-if="error" class="ak-error"><i class="fas fa-circle-exclamation"></i> {{ error }}</p>
                <p v-if="success" class="ak-success"><i class="fas fa-circle-check"></i> {{ success }}<span v-if="balanceText"> 余额 {{ balanceText }}</span></p>

                <div class="ak-foot">
                    <button v-if="mode === 'mine'" class="ak-ghost" type="button" @click="useSiteKey">
                        <i class="fas fa-rotate-left"></i> 清除我的 Key，改用站点内置 Key
                    </button>
                    <span v-else class="ak-foot-hint">当前未使用个人 Key</span>
                    <button class="ak-ghost" type="button" @click="close">完成</button>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.ak-mask {
    position: fixed;
    inset: 0;
    z-index: 300;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.2rem;
    background: rgba(3, 5, 12, 0.72);
    backdrop-filter: blur(6px);
}
.ak-panel {
    width: min(560px, 100%);
    max-height: 88vh;
    overflow-y: auto;
    border-radius: 18px;
    border: 1px solid rgba(159, 212, 248, 0.28);
    background: linear-gradient(165deg, #101828, #0a0f1c 70%);
    box-shadow: 0 28px 60px rgba(0, 0, 0, 0.6);
    padding: 1.2rem 1.3rem 1.1rem;
}
.ak-head { display: flex; align-items: flex-start; gap: 0.8rem; position: relative; }
.ak-head-icon {
    width: 38px; height: 38px; border-radius: 11px; flex: 0 0 auto;
    display: inline-flex; align-items: center; justify-content: center;
    background: linear-gradient(135deg, #9fd8f0, #c4b5fd);
    color: #0a0d18; font-size: 1rem;
}
.ak-head h3 { font-family: var(--font-title); font-size: 1.1rem; color: #f2f6ff; }
.ak-head p { margin: 0.15rem 0 0; font-size: 0.76rem; color: var(--color-text-muted); }
.ak-close {
    position: absolute; top: -4px; right: -4px;
    width: 28px; height: 28px; border: none; border-radius: 50%;
    background: rgba(255, 255, 255, 0.06); color: #b9c8e6; cursor: pointer;
}
.ak-close:hover { background: rgba(255, 255, 255, 0.14); color: #fff; }

.ak-status {
    margin-top: 1rem;
    padding: 0.8rem 0.9rem;
    border-radius: 12px;
    border: 1px solid rgba(159, 212, 248, 0.22);
    background: rgba(159, 212, 248, 0.06);
    display: flex; align-items: center; justify-content: space-between; gap: 0.8rem;
    flex-wrap: wrap;
}
.ak-status.is-mine { border-color: rgba(110, 231, 183, 0.4); background: rgba(16, 185, 129, 0.1); }
.ak-status.is-site { border-color: rgba(159, 212, 248, 0.35); }
.ak-status.is-none { border-color: rgba(248, 180, 120, 0.45); background: rgba(248, 180, 120, 0.08); }
.ak-status-main { display: flex; align-items: flex-start; gap: 0.6rem; }
.ak-status-main i { margin-top: 0.15rem; color: var(--color-cyan); }
.ak-status.is-mine .ak-status-main i { color: #6ee7b7; }
.ak-status.is-none .ak-status-main i { color: #f8b478; }
.ak-status-main b { display: block; font-size: 0.86rem; color: #eef4ff; }
.ak-status-main span { display: block; margin-top: 0.1rem; font-size: 0.73rem; color: var(--color-text-muted); line-height: 1.5; }
.ak-status code { font-size: 0.72rem; color: #cfe0f8; background: rgba(0, 0, 0, 0.25); padding: 0.18rem 0.5rem; border-radius: 6px; }

.ak-block {
    margin-top: 1rem;
    padding: 0.95rem;
    border-radius: 12px;
    border: 1px solid rgba(159, 212, 248, 0.16);
    background: rgba(255, 255, 255, 0.02);
}
.ak-block h4 { font-size: 0.86rem; color: #dfe8fb; margin-bottom: 0.65rem; }
.ak-block h4 i { color: var(--color-gold); margin-right: 0.35rem; }
.ak-input-row { display: flex; gap: 0.55rem; }
.ak-input-row input {
    flex: 1; min-width: 0;
    padding: 0.6rem 0.75rem;
    border-radius: 9px;
    border: 1px solid rgba(159, 212, 248, 0.28);
    background: rgba(4, 8, 18, 0.75);
    color: #eef4ff;
    font-size: 0.82rem;
}
.ak-input-row input:focus { outline: none; border-color: var(--color-cyan); box-shadow: 0 0 0 3px rgba(159, 212, 248, 0.12); }
.ak-primary {
    flex: 0 0 auto;
    padding: 0.6rem 1rem;
    border: none; border-radius: 9px;
    background: linear-gradient(135deg, #9fd8f0, #c4b5fd);
    color: #0a0d18; font-weight: 700; font-size: 0.8rem;
    cursor: pointer; display: inline-flex; align-items: center; gap: 0.35rem;
}
.ak-primary:disabled { opacity: 0.65; cursor: default; }
.ak-ghost {
    padding: 0.45rem 0.85rem;
    border-radius: 50px;
    border: 1px solid rgba(159, 212, 248, 0.26);
    background: transparent;
    color: var(--color-text-secondary);
    font-size: 0.76rem; cursor: pointer;
    display: inline-flex; align-items: center; gap: 0.35rem;
}
.ak-ghost:hover { color: var(--color-cyan); border-color: var(--color-cyan); }
.ak-tip { margin: 0.55rem 0 0; font-size: 0.72rem; color: var(--color-text-muted); line-height: 1.6; }
.ak-tip i { color: var(--color-cyan); margin-right: 0.25rem; }
.ak-error { margin: 0.5rem 0 0; font-size: 0.76rem; color: #fca5a5; }
.ak-success { margin: 0.5rem 0 0; font-size: 0.76rem; color: #6ee7b7; }
.ak-foot { margin-top: 0.8rem; display: flex; align-items: center; justify-content: space-between; gap: 0.6rem; flex-wrap: wrap; }
.ak-foot-hint { font-size: 0.72rem; color: var(--color-text-muted); }

@media (max-width: 560px) {
    .ak-input-row { flex-direction: column; }
    .ak-primary { width: 100%; justify-content: center; }
    .ak-status code { margin-left: 1.6rem; }
}
</style>
