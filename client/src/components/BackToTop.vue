<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';

const visible = ref(false);
function onScroll() { visible.value = window.scrollY > 420; }
onMounted(() => window.addEventListener('scroll', onScroll, { passive: true }));
onBeforeUnmount(() => window.removeEventListener('scroll', onScroll));

function top() { window.scrollTo({ top: 0, behavior: 'smooth' }); }
</script>

<template>
    <button class="back-to-top" :class="{ visible }" @click="top" title="回到顶部">
        <i class="fas fa-rocket rocket"></i>
    </button>
</template>
