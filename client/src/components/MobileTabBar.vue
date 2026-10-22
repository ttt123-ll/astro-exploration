<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useMobile } from '../composables/useMobile';

const route = useRoute();
const { isMobile } = useMobile();

/* 底部 4+1 导航：核心入口全部一键直达 */
const TABS = [
    { path: '/', label: '首页', icon: 'fa-house' },
    { path: '/constellations', label: '星座', icon: 'fa-star' },
    { path: '/gallery', label: '图集', icon: 'fa-images' },
    { path: '/assistant', label: 'AI', icon: 'fa-wand-magic-sparkles' },
    { path: '/community', label: '社区', icon: 'fa-comments' }
];

/* 详情页等归属到对应 Tab，保持高亮 */
const activePath = computed(() => {
    const p = route.path;
    if (p === '/') return '/';
    const hit = TABS.find(t => t.path !== '/' && p.startsWith(t.path));
    if (hit) return hit.path;
    if (p.startsWith('/detail/constellation') || p.startsWith('/constellations')) return '/constellations';
    if (p.startsWith('/detail/telescope') || p.startsWith('/gallery')) return '/gallery';
    if (p.startsWith('/ai') || p.startsWith('/assistant')) return '/assistant';
    return '';
});
</script>

<template>
    <nav v-if="isMobile" class="mobile-tabbar" aria-label="移动端底部导航">
        <router-link v-for="t in TABS" :key="t.path" :to="t.path" class="mtab"
                     :class="{ active: activePath === t.path }"
                     :aria-current="activePath === t.path ? 'page' : undefined">
            <i class="fas" :class="t.icon"></i>
            <span>{{ t.label }}</span>
        </router-link>
    </nav>
</template>

<style scoped>
.mobile-tabbar {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 120;
    display: flex;
    align-items: stretch;
    justify-content: space-around;
    height: calc(58px + env(safe-area-inset-bottom, 0px));
    padding-bottom: env(safe-area-inset-bottom, 0px);
    background: rgba(6, 9, 18, 0.94);
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
    border-top: 1px solid rgba(159, 212, 248, 0.18);
    box-shadow: 0 -12px 32px rgba(0, 0, 0, 0.5);
}

.mtab {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.18rem;
    text-decoration: none;
    color: rgba(200, 214, 238, 0.62);
    font-size: 0.68rem;
    letter-spacing: 0.04em;
    transition: color 0.22s ease, transform 0.22s ease;
    -webkit-tap-highlight-color: transparent;
}
.mtab i {
    font-size: 1.02rem;
    transition: transform 0.22s ease;
}
.mtab.active {
    color: var(--color-cyan);
}
.mtab.active i {
    transform: translateY(-2px) scale(1.12);
    filter: drop-shadow(0 0 8px rgba(159, 212, 248, 0.65));
}
.mtab.active::after {
    content: '';
    position: absolute;
    bottom: 4px;
    width: 18px;
    height: 3px;
    border-radius: 3px;
    background: var(--color-cyan);
    box-shadow: 0 0 10px var(--color-cyan);
}
.mtab { position: relative; }
</style>
