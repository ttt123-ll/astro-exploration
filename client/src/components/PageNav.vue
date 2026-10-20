<script setup>
/**
 * 页面导航条：返回首页 + 当前位置（面包屑）
 * 用法：
 *   <PageNav title="星球投影" />
 *   <PageNav title="详情" :parent="{ label: '天文百科', path: '/encyclopedia' }" />
 */
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const props = defineProps({
    title: { type: String, default: '' },
    parent: { type: Object, default: null }
});

const route = useRoute();
const current = computed(() => props.title || route.meta.title || '页面');
</script>

<template>
    <nav class="page-nav" aria-label="位置导航">
        <router-link to="/" class="pn-home">
            <i class="fas fa-arrow-left"></i>
            <span>返回首页</span>
        </router-link>

        <span class="pn-divider"></span>

        <div class="pn-crumb">
            <i class="fas fa-location-dot"></i>
            <span class="pn-label">当前位置</span>
            <router-link to="/" class="pn-link">首页</router-link>
            <template v-if="parent">
                <i class="fas fa-angle-right pn-arrow"></i>
                <router-link :to="parent.path" class="pn-link">{{ parent.label }}</router-link>
            </template>
            <i class="fas fa-angle-right pn-arrow"></i>
            <span class="pn-current">{{ current }}</span>
        </div>
    </nav>
</template>

<style scoped>
.page-nav {
    display: flex;
    align-items: center;
    gap: 0.9rem;
    flex-wrap: wrap;
    margin-bottom: 1.4rem;
}

/* 返回首页按钮 */
.pn-home {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.42rem 1.05rem;
    border-radius: 50px;
    font-size: 0.84rem;
    color: var(--color-text-secondary);
    text-decoration: none;
    border: 1px solid rgba(159, 212, 248, 0.3);
    background: rgba(159, 212, 248, 0.07);
    transition: all 0.3s ease;
    white-space: nowrap;
}
.pn-home i { font-size: 0.78rem; transition: transform 0.3s ease; }
.pn-home:hover {
    background: var(--gradient-primary);
    border-color: transparent;
    color: #fff;
    box-shadow: var(--shadow-glow-primary);
}
.pn-home:hover i { transform: translateX(-3px); }

.pn-divider {
    width: 1px;
    height: 16px;
    background: rgba(159, 212, 248, 0.2);
}

/* 面包屑 */
.pn-crumb {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.82rem;
    color: var(--color-text-muted);
    flex-wrap: wrap;
}
.pn-crumb > i.fa-location-dot { color: var(--color-cyan); font-size: 0.75rem; }
.pn-label { color: var(--color-text-muted); }
.pn-link {
    color: var(--color-text-secondary);
    text-decoration: none;
    transition: color 0.25s ease;
}
.pn-link:hover { color: var(--color-cyan); }
.pn-arrow { font-size: 0.62rem; opacity: 0.6; }
.pn-current { color: #e8eefc; font-weight: 600; }

@media (max-width: 640px) {
    .page-nav { gap: 0.6rem; }
    .pn-divider { display: none; }
    .pn-label { display: none; }
}
</style>
