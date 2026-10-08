<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { navLinks } from '../data/site';
import { useAuth } from '../store/auth';
import { useUi } from '../store/ui';

const route = useRoute();
const router = useRouter();
const auth = useAuth();
const ui = useUi();
const menuOpen = ref(false);
const scrolled = ref(false);

const isActive = (p) => route.path === p;

function onScroll() { scrolled.value = window.scrollY > 40; }
onMounted(() => window.addEventListener('scroll', onScroll, { passive: true }));
onBeforeUnmount(() => window.removeEventListener('scroll', onScroll));

function logout() {
    auth.logout();
    ui.toastMsg('已安全退出');
    router.push('/');
}

function onKey(e) {
    if (e.key === '/' && !/INPUT|TEXTAREA/.test(e.target.tagName)) {
        e.preventDefault();
        ui.openSearch();
    }
}
onMounted(() => document.addEventListener('keydown', onKey));
onBeforeUnmount(() => document.removeEventListener('keydown', onKey));
</script>

<template>
    <nav class="navbar" :class="{ scrolled }" id="navbar">
        <div class="nav-container">
            <router-link to="/" class="nav-logo">
                <span class="logo-orb"><span class="logo-ring"></span></span>
                <span>宇宙探索</span>
            </router-link>
            <ul class="nav-links" :class="{ active: menuOpen }">
                <li v-for="n in navLinks" :key="n.path">
                    <router-link :to="n.path" :class="{ active: isActive(n.path) }" @click="menuOpen = false">{{ n.label }}</router-link>
                </li>
            </ul>
            <div class="nav-actions">
                <div class="nav-auth-slot" v-if="auth.loggedIn">
                    <span class="nav-user"><i class="fas fa-user-astronaut"></i> {{ auth.user.username }}
                        <em class="nav-admin-badge" v-if="auth.isAdmin">管理员</em>
                    </span>
                    <router-link v-if="auth.isAdmin" to="/admin" class="nav-auth-link" title="后台管理">
                        <i class="fas fa-gauge-high"></i> 后台管理
                    </router-link>
                    <a class="nav-auth-link" href="#" title="退出登录" @click.prevent="logout">
                        <i class="fas fa-right-from-bracket"></i> 退出
                    </a>
                </div>
                <div class="nav-auth-slot" v-else>
                    <router-link to="/login" class="nav-auth-link">登录</router-link>
                    <router-link to="/register" class="nav-auth-link nav-auth-primary">注册</router-link>
                </div>
                <button class="search-open-btn" title="全站搜索（快捷键 / ）" @click="ui.openSearch()"><i class="fas fa-magnifying-glass"></i></button>
                <button class="menu-toggle" @click="menuOpen = !menuOpen"><i class="fas fa-bars"></i></button>
            </div>
        </div>
    </nav>
</template>
