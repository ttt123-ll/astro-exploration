<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { navGroups } from '../data/site';
import { useMobile } from '../composables/useMobile';
import { useAuth } from '../store/auth';
import { useUi } from '../store/ui';

const route = useRoute();
const router = useRouter();
const auth = useAuth();
const ui = useUi();
const menuOpen = ref(false);
const scrolled = ref(false);

const isActive = (p) => route.path === p;
const { isMobile } = useMobile();

/* 分组下拉：桌面 hover/点击，移动端在汉堡菜单内展开 */
const openGroup = ref(null);
function toggleGroup(key) {
    openGroup.value = openGroup.value === key ? null : key;
}
function closeMenus() {
    menuOpen.value = false;
    openGroup.value = null;
}
function groupActive(g) {
    return g.items.some(i => isActive(i.path));
}
function onGroupEsc(e) {
    if (e.key === 'Escape') openGroup.value = null;
}

function onScroll() { scrolled.value = window.scrollY > 40; }
onMounted(() => window.addEventListener('scroll', onScroll, { passive: true }));
onMounted(() => document.addEventListener('keydown', onGroupEsc));
onBeforeUnmount(() => window.removeEventListener('scroll', onScroll));
onBeforeUnmount(() => document.removeEventListener('keydown', onGroupEsc));

watch(() => route.path, () => { openGroup.value = null; menuOpen.value = false; });

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
                <li class="nav-home">
                    <router-link to="/" :class="{ active: isActive('/') }" @click="closeMenus">首页</router-link>
                </li>
                <li v-for="g in navGroups" :key="g.key" class="nav-group"
                    :class="{ open: openGroup === g.key }"
                    @mouseenter="openGroup = g.key" @mouseleave="openGroup = null">
                    <button class="nav-group-btn" type="button" :class="{ active: groupActive(g) }"
                            :aria-expanded="openGroup === g.key" @click="toggleGroup(g.key)">
                        <i class="fas" :class="g.icon"></i><span>{{ g.label }}</span>
                        <i class="fas fa-chevron-down nav-group-caret"></i>
                    </button>
                    <ul class="nav-drop" v-show="openGroup === g.key || (isMobile && menuOpen)">
                        <li v-for="it in g.items" :key="it.path">
                            <router-link :to="it.path" :class="{ active: isActive(it.path) }" @click="closeMenus">
                                <i class="fas" :class="it.icon"></i>
                                <span class="nav-drop-text"><b>{{ it.label }}</b><em>{{ it.desc }}</em></span>
                            </router-link>
                        </li>
                    </ul>
                </li>
                <!-- 移动端：AI 助手入口（桌面端单列在右侧） -->
                <li class="nav-mobile-ai">
                    <router-link to="/assistant" class="nav-mobile-ai-link" @click="menuOpen = false">
                        <i class="fas fa-wand-magic-sparkles"></i> 星穹 AI 天文助手
                    </router-link>
                </li>
                <!-- 移动端：登录/注册入口（桌面端在右侧 nav-actions 中） -->
                <li class="nav-mobile-auth">
                    <template v-if="auth.loggedIn">
                        <span class="nav-user"><i class="fas fa-user-astronaut"></i> {{ auth.user.username }}</span>
                        <router-link v-if="auth.isAdmin" to="/admin" @click="menuOpen = false">后台管理</router-link>
                        <a href="#" @click.prevent="logout(); menuOpen = false">退出登录</a>
                    </template>
                    <template v-else>
                        <router-link to="/login" @click="menuOpen = false">登录</router-link>
                        <router-link to="/register" class="nav-mobile-primary" @click="menuOpen = false">注册</router-link>
                    </template>
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
                <!-- AI 助手：单独一栏的独立入口 -->
                <router-link to="/assistant" class="nav-ai-btn" :class="{ active: isActive('/assistant') }"
                             title="星穹 AI 天文助手">
                    <i class="fas fa-wand-magic-sparkles"></i>
                    <span>AI 助手</span>
                </router-link>
                <button class="search-open-btn" title="全站搜索（快捷键 / ）" aria-label="全站搜索" @click="ui.openSearch()"><i class="fas fa-magnifying-glass"></i></button>
                <button class="menu-toggle" :class="{ open: menuOpen }" :aria-expanded="menuOpen" aria-label="展开导航菜单"
                        @click="menuOpen = !menuOpen">
                    <i class="fas" :class="menuOpen ? 'fa-xmark' : 'fa-bars'"></i>
                </button>
            </div>
        </div>
    </nav>
</template>
