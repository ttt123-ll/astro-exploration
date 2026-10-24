<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuth } from '../store/auth';
import { useUi } from '../store/ui';
import api from '../api';

const router = useRouter();
const auth = useAuth();
const ui = useUi();

const username = ref('');
const email = ref('');
const password = ref('');
const password2 = ref('');
const showPw = ref(false);
const showPw2 = ref(false);
const loading = ref(false);

/* 算术验证码 */
const captcha = ref({ a: 0, b: 0, t: '' });
const captchaAnswer = ref('');
async function loadCaptcha() {
    try {
        const { data } = await api.get('/captcha');
        captcha.value = { a: data.a, b: data.b, t: data.t };
        captchaAnswer.value = '';
    } catch (e) {
        captcha.value = { a: 3, b: 4, t: '' };
    }
}
onMounted(loadCaptcha);

const strength = computed(() => {
    const v = password.value;
    let s = 0;
    if (v.length >= 8) s++;
    if (v.length >= 12) s++;
    if (/[A-Z]/.test(v) && /[a-z]/.test(v)) s++;
    if (/\d/.test(v) || /[^A-Za-z0-9]/.test(v)) s++;
    const texts = ['', '太短', '较弱', '一般', '较强'];
    return { s, label: texts[s] };
});

async function submit() {
    if (!username.value.trim() || !email.value.trim() || !password.value || !password2.value) {
        ui.toastMsg('请完整填写注册信息', 'error'); return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim())) {
        ui.toastMsg('请填写正确的邮箱地址（用于找回密码）', 'error'); return;
    }
    if (password.value.length < 8) { ui.toastMsg('密码至少需要 8 位', 'error'); return; }
    if (password.value !== password2.value) { ui.toastMsg('两次输入的密码不一致', 'error'); return; }
    if (!captchaAnswer.value) { ui.toastMsg('请回答验证码', 'error'); return; }

    loading.value = true;
    try {
        await auth.register({
            username: username.value.trim(),
            email: email.value.trim().toLowerCase(),
            password: password.value,
            captcha: { ...captcha.value, answer: Number(captchaAnswer.value) }
        });
        ui.toastMsg('注册成功，欢迎加入星际探索！');
        router.push('/');
    } catch (e) {
        ui.toastMsg(e.response?.data?.error || '注册失败', 'error');
        loadCaptcha();
        loading.value = false;
    }
}
</script>

<template>
    <div class="container auth-wrap">
        <!-- 星云背景 -->
        <div class="auth-nebula" aria-hidden="true">
            <span class="an-blob b1"></span>
            <span class="an-blob b2"></span>
            <span class="an-blob b3"></span>
        </div>
        <div class="auth-card">
            <div class="auth-left">
                <div class="auth-planet"><span class="auth-ring"></span></div>
                <h2 class="auth-slogan">加入星际探索者行列<br>你的名字将闪耀榜单</h2>
                <ul class="auth-bullets">
                    <li><i class="fas fa-rocket"></i> 30 秒完成注册</li>
                    <li><i class="fas fa-envelope"></i> 绑定邮箱可自助找回密码</li>
                    <li><i class="fas fa-star"></i> 即刻开始答题上榜</li>
                </ul>
            </div>
            <div class="auth-right">
                <h2 class="auth-title"><i class="fas fa-user-plus" style="color:var(--color-cyan);font-size:1.3rem;margin-right:0.5rem;"></i>创建账号</h2>
                <p class="auth-sub">注册后成绩自动保存并参与排行榜</p>
                <form @submit.prevent="submit">
                    <label class="sys-label"><i class="fas fa-user"></i> 用户名</label>
                    <div class="input-wrap">
                        <i class="fas fa-user input-ico"></i>
                        <input class="sys-input" v-model="username" autocomplete="username" placeholder="3-20 位中文、字母、数字或下划线" maxlength="20">
                    </div>
                    <label class="sys-label"><i class="fas fa-envelope"></i> 邮箱（用于找回密码）</label>
                    <div class="input-wrap">
                        <i class="fas fa-envelope input-ico"></i>
                        <input class="sys-input" v-model="email" type="email" autocomplete="email" placeholder="name@example.com" maxlength="120">
                    </div>
                    <label class="sys-label"><i class="fas fa-lock"></i> 密码</label>
                    <div class="input-wrap">
                        <i class="fas fa-lock input-ico"></i>
                        <input class="sys-input" v-model="password" :type="showPw ? 'text' : 'password'" autocomplete="new-password" placeholder="至少 8 位" maxlength="64">
                        <button type="button" class="pw-toggle" @click="showPw = !showPw"><i class="fas" :class="showPw ? 'fa-eye-slash' : 'fa-eye'"></i></button>
                    </div>
                    <div class="pw-strength"><span v-for="i in 4" :key="i" class="bar" :class="{ on: i <= strength.s }"></span><span class="label">{{ strength.label }}</span></div>
                    <label class="sys-label"><i class="fas fa-shield-halved"></i> 确认密码</label>
                    <div class="input-wrap">
                        <i class="fas fa-shield-halved input-ico"></i>
                        <input class="sys-input" v-model="password2" :type="showPw2 ? 'text' : 'password'" autocomplete="new-password" placeholder="再次输入密码" maxlength="64">
                        <button type="button" class="pw-toggle" @click="showPw2 = !showPw2"><i class="fas" :class="showPw2 ? 'fa-eye-slash' : 'fa-eye'"></i></button>
                    </div>

                    <label class="sys-label"><i class="fas fa-shield-halved"></i> 验证码</label>
                    <div class="captcha-row">
                        <span class="captcha-q">{{ captcha.a }} + {{ captcha.b }} = ?</span>
                        <input class="sys-input captcha-input" v-model="captchaAnswer" type="text" inputmode="numeric" placeholder="请输入答案" maxlength="3">
                        <button type="button" class="captcha-refresh" title="换一题" @click="loadCaptcha"><i class="fas fa-rotate-right"></i></button>
                    </div>

                    <button class="btn btn-gold sys-btn" type="submit" :class="{ loading }" :disabled="loading">
                        <span class="btn-text"><i class="fas" :class="loading ? 'fa-circle-notch fa-spin' : 'fa-star'"></i> {{ loading ? '正在创建账号…' : '注 册' }}</span>
                        <span class="spinner"></span>
                    </button>
                </form>
                <div class="auth-divider"><span>已有账号？</span></div>
                <router-link to="/login" class="btn btn-ghost auth-reg-btn"><i class="fas fa-right-to-bracket"></i> 直接登录</router-link>
                <p class="sys-foot"><router-link to="/"><i class="fas fa-house"></i> 返回首页</router-link></p>
            </div>
        </div>
    </div>
</template>

<style scoped>
.captcha-row { display: flex; align-items: center; gap: 0.6rem; margin-bottom: 1rem; }
.captcha-q {
    flex-shrink: 0; padding: 0.55rem 0.9rem; border-radius: 10px;
    background: rgba(159, 212, 248, 0.1); border: 1px dashed rgba(159, 212, 248, 0.4);
    color: var(--color-cyan); font-family: ui-monospace, monospace; font-size: 0.95rem;
    letter-spacing: 0.08em; user-select: none;
}
.captcha-input { flex: 1; min-width: 0; }
.captcha-refresh {
    flex-shrink: 0; width: 38px; height: 38px; border-radius: 10px;
    border: 1px solid rgba(159, 212, 248, 0.35); background: rgba(159, 212, 248, 0.08);
    color: var(--color-cyan); cursor: pointer; transition: all 0.3s ease;
}
.captcha-refresh:hover { background: var(--gradient-primary); color: #fff; border-color: transparent; }
</style>
