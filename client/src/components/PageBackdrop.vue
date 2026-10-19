<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();

/* 路由名 → 背景主题 */
const THEME = {
    home: 'home',
    solar: 'solar',
    planetshow: 'project',
    spaceflight: 'flight',
    encyclopedia: 'encyclopedia',
    constellations: 'cons',
    gallery: 'gallery',
    timeline: 'timeline',
    news: 'news',
    credits: 'credits',
    community: 'community',
    videos: 'gallery',
    admin: 'admin',
    login: 'auth',
    register: 'auth',
    detail: 'detail',
    deepspace: 'stars',
    explore: 'detail',
    download: 'detail',
    notfound: 'detail'
};

const theme = computed(() => THEME[route.name] || 'detail');
</script>

<template>
    <div class="page-bg" :class="'pb-' + theme"></div>
</template>
