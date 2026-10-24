<script setup>
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuth } from '../store/auth';
import { useUi } from '../store/ui';
import ForgotPasswordDialog from '../components/ForgotPasswordDialog.vue';

const router = useRouter();
const route = useRoute();
const auth = useAuth();
const ui = useUi();

const username = ref('');
const password = ref('');
const showPw = ref(false);
const caps = ref(false);
const loading = ref(false);
const forgotOpen = ref(false);

async function submit() {
    if (!username.value.trim() || !password.value) { ui.toastMsg('请填写用户名和密码', 'error'); return; }
    loading.value = true;
    try {
        await auth.login(username.value.trim(), password.value);
        ui.toastMsg('欢迎回来，' + auth.user.username + '！');
        const next = route.query.next;
        router.push(typeof next === 'string' && next.startsWith('/') ? next : '/');
    } catch (e) {
        ui.toastMsg(e.response?.data?.error || '登录失败', 'error');
        loading.value = false;
    }
}
function demo() {
    username.value = 'admin';
    password.value = 'admin123';
    ui.toastMsg('演示账号已填充，点击「登录」即可进入');
}
function forgot() { forgotOpen.value = true; }
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
                <h2 class="auth-slogan">仰望星空的人<br>终将成为星辰</h2>
                <ul class="auth-bullets">
                    <li><i class="fas fa-save"></i> 保存每一次测验成绩</li>
                    <li><i class="fas fa-trophy"></i> 冲击全站知识排行榜</li>
                    <li><i class="fas fa-comments"></i> 与星友在留言板交流</li>
                </ul>
            </div>
            <div class="auth-right">
                <h2 class="auth-title"><i class="fas fa-rocket" style="color:var(--color-cyan);font-size:1.3rem;margin-right:0.5rem;"></i>欢迎回来</h2>
                <p class="auth-sub">登录后继续你的星际探索之旅</p>
                <form @submit.prevent="submit">
                    <label class="sys-label"><i class="fas fa-user"></i> 用户名</label>
                    <div class="input-wrap">
                        <i class="fas fa-user input-ico"></i>
                        <input class="sys-input" v-model="username" autocomplete="username" placeholder="输入用户名" maxlength="20">
                    </div>
                    <label class="sys-label"><i class="fas fa-lock"></i> 密码</label>
                    <div class="input-wrap">
                        <i class="fas fa-lock input-ico"></i>
                        <input class="sys-input" v-model="password" :type="showPw ? 'text' : 'password'" autocomplete="current-password" placeholder="输入密码" maxlength="64"
                               @keydown="caps = $event.getModifierState && $event.getModifierState('CapsLock')" @blur="caps = false">
                        <button type="button" class="pw-toggle" @click="showPw = !showPw" title="显示 / 隐藏密码">
                            <i class="fas" :class="showPw ? 'fa-eye-slash' : 'fa-eye'"></i>
                        </button>
                    </div>
                    <div class="caps-hint" :class="{ show: caps }"><i class="fas fa-triangle-exclamation"></i> 大写锁定已开启</div>
                    <button class="btn btn-gold sys-btn" type="submit" :class="{ loading }" :disabled="loading">
                        <span class="btn-text"><i class="fas" :class="loading ? 'fa-circle-notch fa-spin' : 'fa-rocket'"></i> {{ loading ? '正在验证身份…' : '登 录' }}</span>
                        <span class="spinner"></span>
                    </button>
                </form>
                <button type="button" class="auth-demo" @click="demo"><i class="fas fa-wand-magic-sparkles"></i> 演示账号一键填充：admin / admin123</button>
                <div class="auth-divider"><span>还没有账号？</span></div>
                <router-link to="/register" class="btn btn-ghost auth-reg-btn"><i class="fas fa-user-plus"></i> 创建新账号</router-link>
                <p class="sys-foot"><router-link to="/"><i class="fas fa-house"></i> 返回首页</router-link> · <a href="#" @click.prevent="forgot">忘记密码？</a></p>
            </div>
        </div>
    </div>

    <ForgotPasswordDialog v-model="forgotOpen" />
</template>
