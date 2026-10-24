<script setup>
import { ref, watch } from 'vue';
import api from '../api';

const props = defineProps({ modelValue: Boolean });
const emit = defineEmits(['update:modelValue']);

const step = ref(1);            // 1=输入邮箱 2=验证码+新密码
const email = ref('');
const issuedCode = ref('');     // 页面弹窗展示的 6 位验证码
const code = ref('');
const password = ref('');
const password2 = ref('');
const loading = ref(false);
const cooldown = ref(0);
let timer = null;

/* 统一弹窗提示（所有校验/结果都用弹窗，不用 toast） */
const alert = ref({ show: false, title: '提示', text: '', success: false });
function showAlert(text, { title = '提示', success = false } = {}) {
    alert.value = { show: true, title, text, success };
}

watch(() => props.modelValue, (v) => {
    if (v) {
        step.value = 1;
        email.value = '';
        issuedCode.value = '';
        code.value = '';
        password.value = '';
        password2.value = '';
        alert.value.show = false;
    } else {
        clearInterval(timer);
        cooldown.value = 0;
        alert.value.show = false;
    }
});

function close() { emit('update:modelValue', false); }

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function startCooldown() {
    cooldown.value = 60;
    clearInterval(timer);
    timer = setInterval(() => {
        cooldown.value -= 1;
        if (cooldown.value <= 0) clearInterval(timer);
    }, 1000);
}

/* 第一步：校验邮箱并生成验证码 */
async function next() {
    if (loading.value) return;
    if (!EMAIL_RE.test(email.value.trim())) {
        showAlert('请输入正确的邮箱地址');
        return;
    }
    loading.value = true;
    try {
        const { data } = await api.post('/forgot-password', { email: email.value.trim().toLowerCase() });
        issuedCode.value = String(data.code || '');
        step.value = 2;
        startCooldown();
        showAlert('验证码已生成，请在当前弹窗中查看并完成验证（10 分钟内有效）', { title: '验证码已生成' });
    } catch (e) {
        showAlert(e.response?.data?.error || '操作失败，请稍后重试');
    } finally {
        loading.value = false;
    }
}

/* 第二步：校验验证码并修改密码 */
async function submit() {
    if (loading.value) return;
    const c = code.value.trim();
    if (!/^\d{6}$/.test(c)) { showAlert('请输入 6 位数字验证码'); return; }
    if (password.value.length < 8) { showAlert('新密码至少需要 8 位'); return; }
    if (password.value !== password2.value) { showAlert('两次输入的新密码不一致'); return; }

    loading.value = true;
    try {
        const { data } = await api.post('/reset-password', {
            email: email.value.trim().toLowerCase(),
            code: c,
            password: password.value
        });
        showAlert(data.message || '密码修改成功，请使用新密码登录', { title: '修改成功', success: true });
    } catch (e) {
        showAlert(e.response?.data?.error || '修改失败，请稍后重试');
    } finally {
        loading.value = false;
    }
}

function confirmAlert() {
    const wasSuccess = alert.value.success;
    alert.value.show = false;
    if (wasSuccess) close();
}

function back() {
    step.value = 1;
    issuedCode.value = '';
    code.value = '';
    password.value = '';
    password2.value = '';
}

async function resend() {
    if (cooldown.value > 0 || loading.value) return;
    await next();
}
</script>

<template>
    <div v-if="modelValue" class="fp-mask" @click.self="close">
        <div class="fp-card" role="dialog" aria-modal="true" aria-label="找回密码">
            <button class="fp-close" type="button" aria-label="关闭" @click="close"><i class="fas fa-xmark"></i></button>
            <h3 class="fp-title"><i class="fas fa-key"></i> 找回密码</h3>

            <!-- 第一步：输入绑定邮箱 -->
            <template v-if="step === 1">
                <p class="fp-sub">请输入注册时绑定的邮箱，系统会为你在当前页面生成 6 位验证码</p>
                <div class="fp-form">
                    <label class="sys-label"><i class="fas fa-envelope"></i> 绑定邮箱</label>
                    <div class="input-wrap">
                        <i class="fas fa-envelope input-ico"></i>
                        <input class="sys-input" v-model="email" type="email" autocomplete="email"
                               placeholder="name@example.com" maxlength="120" @keyup.enter="next">
                    </div>
                    <button class="btn btn-gold sys-btn" type="button" :disabled="loading" @click="next">
                        <i class="fas" :class="loading ? 'fa-circle-notch fa-spin' : 'fa-arrow-right'"></i>
                        {{ loading ? '验证中…' : '下一步' }}
                    </button>
                </div>
            </template>

            <!-- 第二步：弹窗展示验证码 + 设置新密码 -->
            <template v-else>
                <p class="fp-sub">验证码已生成（10 分钟内有效），输入验证码后设置新密码</p>

                <div class="fp-codebox">
                    <span class="fp-code-label"><i class="fas fa-shield-halved"></i> 你的验证码</span>
                    <b class="fp-code">{{ issuedCode }}</b>
                </div>

                <div class="fp-form">
                    <label class="sys-label"><i class="fas fa-keyboard"></i> 输入验证码</label>
                    <div class="input-wrap">
                        <i class="fas fa-keyboard input-ico"></i>
                        <input class="sys-input" v-model="code" inputmode="numeric" maxlength="6" placeholder="请输入上方 6 位数字">
                    </div>

                    <label class="sys-label"><i class="fas fa-lock"></i> 新密码</label>
                    <div class="input-wrap">
                        <i class="fas fa-lock input-ico"></i>
                        <input class="sys-input" v-model="password" type="password" autocomplete="new-password"
                               maxlength="64" placeholder="至少 8 位，且不能与原密码相同">
                    </div>

                    <label class="sys-label"><i class="fas fa-lock"></i> 确认新密码</label>
                    <div class="input-wrap">
                        <i class="fas fa-lock input-ico"></i>
                        <input class="sys-input" v-model="password2" type="password" autocomplete="new-password"
                               maxlength="64" placeholder="再次输入新密码">
                    </div>

                    <button class="btn btn-gold sys-btn" type="button" :disabled="loading" @click="submit">
                        <i class="fas" :class="loading ? 'fa-circle-notch fa-spin' : 'fa-check'"></i>
                        {{ loading ? '提交中…' : '修改密码' }}
                    </button>
                    <div class="fp-links">
                        <button type="button" class="fp-link" @click="back">换个邮箱</button>
                        <button type="button" class="fp-link" :disabled="cooldown > 0 || loading" @click="resend">
                            {{ cooldown > 0 ? cooldown + ' 秒后可重新生成' : '重新生成验证码' }}
                        </button>
                    </div>
                </div>
            </template>
        </div>

        <!-- 统一提示弹窗 -->
        <div v-if="alert.show" class="fp-alert-mask" @click.self="confirmAlert">
            <div class="fp-alert" role="alertdialog" aria-modal="true">
                <div class="fp-alert-ico" :class="{ ok: alert.success }">
                    <i class="fas" :class="alert.success ? 'fa-circle-check' : 'fa-circle-exclamation'"></i>
                </div>
                <h4 class="fp-alert-title">{{ alert.title }}</h4>
                <p class="fp-alert-text">{{ alert.text }}</p>
                <button class="btn btn-gold sys-btn" type="button" @click="confirmAlert">知道了</button>
            </div>
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
    width: min(440px, 100%);
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
.fp-sub { color: var(--color-text-muted, #8b98b5); font-size: 0.84rem; line-height: 1.7; margin: 0 0 1.1rem; }
.fp-form { display: flex; flex-direction: column; }
.fp-form .sys-btn { margin-top: 0.4rem; }

/* 验证码展示框 */
.fp-codebox {
    display: flex; flex-direction: column; align-items: center; gap: 0.35rem;
    margin: 0 0 1rem; padding: 0.8rem 1rem;
    border-radius: 12px;
    border: 1px dashed rgba(159, 212, 248, 0.5);
    background: rgba(159, 212, 248, 0.08);
}
.fp-code-label { color: var(--color-text-muted, #8b98b5); font-size: 0.76rem; letter-spacing: 0.04em; }
.fp-code-label i { color: var(--color-cyan, #9fd8f0); margin-right: 0.3rem; }
.fp-code {
    color: var(--color-cyan, #9fd8f0);
    font-family: ui-monospace, SFMono-Regular, monospace;
    font-size: 1.9rem; letter-spacing: 0.32em; line-height: 1.2;
    text-shadow: 0 0 18px rgba(159, 212, 248, 0.45);
}

.fp-links { display: flex; justify-content: space-between; margin-top: 0.7rem; }
.fp-link {
    border: none; background: none; cursor: pointer; font-family: inherit;
    color: var(--color-text-muted, #8b98b5); font-size: 0.8rem; padding: 0;
}
.fp-link:hover:not(:disabled) { color: var(--color-cyan, #9fd8f0); }
.fp-link:disabled { opacity: 0.6; cursor: default; }

/* 提示弹窗（覆盖在找回密码弹窗之上） */
.fp-alert-mask {
    position: absolute; inset: 0; z-index: 2;
    display: flex; align-items: center; justify-content: center;
    background: rgba(2, 4, 10, 0.55);
    padding: 1rem;
}
.fp-alert {
    width: min(340px, 100%);
    padding: 1.5rem 1.3rem 1.2rem;
    border-radius: 16px;
    background: #101a2e;
    border: 1px solid rgba(159, 212, 248, 0.32);
    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.65);
    text-align: center;
}
.fp-alert-ico {
    width: 46px; height: 46px; margin: 0 auto 0.7rem;
    display: flex; align-items: center; justify-content: center;
    border-radius: 50%;
    color: #fca5a5; background: rgba(252, 165, 165, 0.12);
    font-size: 1.25rem;
}
.fp-alert-ico.ok { color: #86efac; background: rgba(134, 239, 172, 0.12); }
.fp-alert-title { color: var(--color-gold, #d8e3f8); font-size: 1.02rem; margin: 0 0 0.4rem; }
.fp-alert-text { color: #c7d3e8; font-size: 0.88rem; line-height: 1.7; margin: 0 0 1rem; }
.fp-alert .sys-btn { margin: 0 auto; }
</style>
