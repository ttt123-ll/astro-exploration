<script setup>
import { ref, watch } from 'vue';
import api from '../api';
import { useUi } from '../store/ui';

const props = defineProps({ modelValue: Boolean });
const emit = defineEmits(['update:modelValue']);
const ui = useUi();

const step = ref(1);
const email = ref('');
const code = ref('');
const password = ref('');
const password2 = ref('');
const devCode = ref('');
const error = ref('');
const sending = ref(false);
const cooldown = ref(0);
let timer = null;

watch(() => props.modelValue, (v) => {
    if (v) {
        step.value = 1;
        code.value = '';
        password.value = '';
        password2.value = '';
        devCode.value = '';
        error.value = '';
    } else {
        clearInterval(timer);
        cooldown.value = 0;
    }
});

function close() { emit('update:modelValue', false); }

function validEmail() {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim());
}

function startCooldown() {
    cooldown.value = 60;
    clearInterval(timer);
    timer = setInterval(() => {
        cooldown.value -= 1;
        if (cooldown.value <= 0) clearInterval(timer);
    }, 1000);
}

async function sendCode() {
    error.value = '';
    if (!validEmail()) { error.value = '请输入正确的邮箱地址'; return; }
    if (cooldown.value > 0) return;
    sending.value = true;
    try {
        const { data } = await api.post('/forgot-password', { email: email.value.trim().toLowerCase() });
        if (data.demo) { error.value = data.error || '演示模式不支持邮箱验证'; return; }
        devCode.value = data.devCode || '';
        step.value = 2;
        startCooldown();
        ui.toastMsg(data.message || '验证码已发送，请查收邮箱');
    } catch (e) {
        error.value = e.response?.data?.error || '发送失败，请稍后重试';
    } finally {
        sending.value = false;
    }
}

async function resetPassword() {
    error.value = '';
    if (!/^\d{6}$/.test(code.value.trim())) { error.value = '请输入 6 位数字验证码'; return; }
    if (password.value.length < 8) { error.value = '新密码至少需要 8 位'; return; }
    if (password.value !== password2.value) { error.value = '两次输入的密码不一致'; return; }
    sending.value = true;
    try {
        const { data } = await api.post('/reset-password', {
            email: email.value.trim().toLowerCase(),
            code: code.value.trim(),
            password: password.value
        });
        ui.toastMsg(data.message || '密码已重置，请用新密码登录');
        close();
    } catch (e) {
        error.value = e.response?.data?.error || '重置失败，请稍后重试';
    } finally {
        sending.value = false;
    }
}
</script>

<template>
    <div v-if="modelValue" class="fp-mask" @click.self="close">
        <div class="fp-card" role="dialog" aria-modal="true" aria-label="找回密码">
            <button class="fp-close" type="button" aria-label="关闭" @click="close"><i class="fas fa-xmark"></i></button>
            <h3 class="fp-title"><i class="fas fa-key"></i> 找回密码</h3>
            <p class="fp-sub">
                {{ step === 1 ? '输入注册时绑定的邮箱，我们会发送 6 位验证码（10 分钟内有效）' : '输入邮箱收到的验证码，并设置新密码' }}
            </p>

            <div v-if="step === 1" class="fp-form">
                <label class="sys-label"><i class="fas fa-envelope"></i> 绑定邮箱</label>
                <div class="input-wrap">
                    <i class="fas fa-envelope input-ico"></i>
                    <input class="sys-input" v-model="email" type="email" autocomplete="email"
                           placeholder="name@example.com" maxlength="120" @keyup.enter="sendCode">
                </div>
                <button class="btn btn-gold sys-btn" type="button" :disabled="sending" @click="sendCode">
                    <i class="fas" :class="sending ? 'fa-circle-notch fa-spin' : 'fa-paper-plane'"></i>
                    {{ sending ? '发送中…' : '发送验证码' }}
                </button>
            </div>

            <div v-else class="fp-form">
                <label class="sys-label"><i class="fas fa-shield-halved"></i> 邮箱验证码</label>
                <div class="input-wrap">
                    <i class="fas fa-shield-halved input-ico"></i>
                    <input class="sys-input" v-model="code" inputmode="numeric" maxlength="6" placeholder="6 位数字验证码">
                </div>
                <div v-if="devCode" class="fp-dev">
                    <i class="fas fa-flask"></i> 未配置 SMTP，开发模式验证码：<b>{{ devCode }}</b>
                </div>
                <label class="sys-label"><i class="fas fa-lock"></i> 新密码</label>
                <div class="input-wrap">
                    <i class="fas fa-lock input-ico"></i>
                    <input class="sys-input" v-model="password" type="password" autocomplete="new-password" maxlength="64" placeholder="至少 8 位">
                </div>
                <label class="sys-label"><i class="fas fa-lock"></i> 确认新密码</label>
                <div class="input-wrap">
                    <i class="fas fa-lock input-ico"></i>
                    <input class="sys-input" v-model="password2" type="password" autocomplete="new-password" maxlength="64" placeholder="再次输入新密码">
                </div>
                <button class="btn btn-gold sys-btn" type="button" :disabled="sending" @click="resetPassword">
                    <i class="fas" :class="sending ? 'fa-circle-notch fa-spin' : 'fa-check'"></i>
                    {{ sending ? '提交中…' : '重置密码' }}
                </button>
                <button class="fp-resend" type="button" :disabled="cooldown > 0 || sending" @click="sendCode">
                    {{ cooldown > 0 ? cooldown + ' 秒后可重发' : '重新发送验证码' }}
                </button>
            </div>

            <p v-if="error" class="fp-error"><i class="fas fa-circle-exclamation"></i> {{ error }}</p>
        </div>
    </div>
</template>

<style scoped>
.fp-mask {
    position: fixed; inset: 0; z-index: 300;
    display: flex; align-items: center; justify-content: center;
    background: rgba(2, 4, 10, 0.72);
    backdrop-filter: blur(6px);
    padding: 1.2rem;
}
.fp-card {
    position: relative;
    width: min(420px, 100%);
    max-height: 90vh; overflow-y: auto;
    padding: 1.8rem 1.6rem 1.5rem;
    border-radius: var(--radius-lg, 18px);
    background: var(--bg-card, #0d1322);
    border: 1px solid rgba(159, 212, 248, 0.28);
    box-shadow: 0 30px 80px rgba(0, 0, 0, 0.6);
}
.fp-close {
    position: absolute; top: 0.9rem; right: 0.9rem;
    width: 32px; height: 32px; border-radius: 50%;
    border: 1px solid rgba(159, 212, 248, 0.25);
    background: rgba(159, 212, 248, 0.08);
    color: var(--color-text-secondary, #b9c6df);
    cursor: pointer; transition: all 0.25s ease;
}
.fp-close:hover { color: #fff; border-color: var(--color-cyan, #9fd8f0); }
.fp-title {
    font-family: var(--font-title, inherit);
    color: var(--color-gold, #d8e3f8);
    font-size: 1.2rem; margin: 0 0 0.4rem;
}
.fp-title i { color: var(--color-cyan, #9fd8f0); margin-right: 0.4rem; }
.fp-sub { color: var(--color-text-muted, #8b98b5); font-size: 0.84rem; line-height: 1.7; margin: 0 0 1.2rem; }
.fp-form { display: flex; flex-direction: column; }
.fp-form .sys-btn { margin-top: 0.4rem; }
.fp-dev {
    margin: 0.1rem 0 0.9rem;
    padding: 0.55rem 0.75rem;
    border-radius: 10px;
    border: 1px dashed rgba(159, 212, 248, 0.45);
    background: rgba(159, 212, 248, 0.08);
    color: var(--color-cyan, #9fd8f0);
    font-size: 0.8rem; line-height: 1.6;
}
.fp-dev b { letter-spacing: 0.18em; font-size: 0.95rem; }
.fp-resend {
    margin-top: 0.8rem; border: none; background: none;
    color: var(--color-text-muted, #8b98b5);
    font-size: 0.8rem; cursor: pointer; font-family: inherit;
}
.fp-resend:hover:not(:disabled) { color: var(--color-cyan, #9fd8f0); }
.fp-resend:disabled { opacity: 0.6; cursor: default; }
.fp-error {
    margin: 0.9rem 0 0; color: #fca5a5; font-size: 0.82rem;
    display: flex; align-items: center; gap: 0.4rem;
}
</style>
