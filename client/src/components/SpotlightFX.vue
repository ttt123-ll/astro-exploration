<script setup>
/**
 * 聚光灯边框：鼠标在卡片上移动时，更新 --mx / --my，
 * 由 CSS 用径向渐变绘制跟随光标的描边高光。
 * 采用事件委托，只注册一个 mousemove 监听，不给每张卡单独绑定。
 */
import { onMounted, onBeforeUnmount } from 'vue';

const SELECTOR = [
    '.news-card',
    '.gallery-item',
    '.book-card',
    '.type-card',
    '.bh-card',
    '.stat-box',
    '.hero-stat',
    '.cons-card',
    '.u-event-card',
    '.planet-card',
    '.obj-card',
    '.entry-orb',
    '.grade-ring'
].join(',');

let last = null;

function onMove(e) {
    const el = e.target && e.target.closest ? e.target.closest(SELECTOR) : null;
    if (!el) { last = null; return; }
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', (e.clientX - r.left).toFixed(1) + 'px');
    el.style.setProperty('--my', (e.clientY - r.top).toFixed(1) + 'px');
    last = el;
}

function onLeave() {
    if (last) { last = null; }
}

onMounted(() => {
    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('mouseleave', onLeave, { passive: true });
});

onBeforeUnmount(() => {
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseleave', onLeave);
});
</script>

<template>
    <!-- 纯逻辑组件，不渲染任何节点 -->
    <span class="spotlight-fx" aria-hidden="true"></span>
</template>

<style scoped>
.spotlight-fx { display: none; }
</style>
