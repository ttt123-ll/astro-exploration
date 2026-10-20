<script setup>
import NavBar from './components/NavBar.vue';
import SiteFooter from './components/SiteFooter.vue';
import StarField from './components/StarField.vue';
import VideoBg from './components/VideoBg.vue';
import SearchOverlay from './components/SearchOverlay.vue';
import BackToTop from './components/BackToTop.vue';
import ToastHost from './components/ToastHost.vue';
import CursorFX from './components/CursorFX.vue';
import ChatWidget from './components/ChatWidget.vue';
import PageBackdrop from './components/PageBackdrop.vue';
import SpotlightFX from './components/SpotlightFX.vue';
import { useAuth } from './store/auth';

const auth = useAuth();
auth.fetchMe();
</script>

<template>
    <!-- 键盘用户第一个 Tab 焦点：跳转到主要内容 -->
    <a class="skip-link" href="#main-content">跳到主要内容</a>

    <VideoBg />
    <PageBackdrop />
    <StarField />
    <NavBar />
    <SearchOverlay />
    <div id="main-content" tabindex="-1">
        <router-view />
    </div>
    <SiteFooter />
    <BackToTop />
    <ChatWidget />
    <CursorFX />
    <SpotlightFX />
    <ToastHost />
</template>

<style>
/* 路由切换不再使用 mode="out-in" 过渡，避免页面内容不渲染 */
</style>
