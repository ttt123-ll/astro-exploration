<script setup>
import { useRouter } from 'vue-router';
const router = useRouter();
</script>

<template>
    <div class="container sys-narrow">
        <div class="sys-card" style="text-align:center;">
            <div class="sys-logo"><i class="fas fa-satellite-dish"></i></div>
            <h2 style="font-family:var(--font-title);color:var(--color-gold);font-size:2.6rem;margin-bottom:0.6rem;">404</h2>
            <p class="sys-sub">这颗星不存在——你访问的页面迷失在宇宙深处了。</p>
            <div style="display:flex;justify-content:center;gap:1rem;margin-top:1.4rem;">
                <button class="btn btn-gold" @click="router.push('/')"><i class="fas fa-house"></i> 返回首页</button>
                <button class="btn btn-ghost" @click="router.back()"><i class="fas fa-rotate-left"></i> 返回上一页</button>
            </div>
        </div>
    </div>
</template>
