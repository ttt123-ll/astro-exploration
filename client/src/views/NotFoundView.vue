<script setup>
import { useRouter } from 'vue-router';
import PageHeader from '../components/PageHeader.vue';

const router = useRouter();

function goBack() {
    // 有历史返回则上一页，直接打开 404 时回首页
    const st = window.history.state;
    if (st && st.back) router.back();
    else router.push('/');
}
</script>

<template>
    <div class="container">
        <PageHeader kicker="ERROR 404 · LOST IN SPACE" title="你迷失在宇宙深处了"
                    subtitle="这颗星球不存在——它或许已经坍缩成黑洞，或许从未被点亮。别担心，我们为你保留了一条返回轨道。"
                    icon="fa-user-astronaut" deco="nebula" />

        <div class="notfound-card">
            <div class="nf-code" aria-hidden="true">404</div>
            <p class="nf-hint">
                <i class="fas fa-satellite"></i> 坐标丢失 · 正在重新定位…
            </p>
            <div class="nf-actions">
                <button class="btn btn-gold" type="button" @click="router.push('/')">
                    <i class="fas fa-house"></i> 返回首页
                </button>
                <button class="btn btn-ghost page-back" type="button" @click="goBack">
                    <i class="fas fa-rotate-left"></i> 返回上一页
                </button>
            </div>
        </div>
    </div>
</template>

<style scoped>
.notfound-card {
    position: relative;
    margin: 1.6rem 0 4rem;
    padding: 2.4rem 1.5rem 2rem;
    border-radius: var(--radius-lg);
    border: 1px solid rgba(159, 212, 248, 0.22);
    background: var(--bg-card);
    text-align: center;
    overflow: hidden;
}
.notfound-card::before {
    content: '';
    position: absolute;
    inset: -30% -10% auto;
    height: 280px;
    background:
        radial-gradient(ellipse 42% 60% at 30% 40%, rgba(157, 140, 240, 0.22), transparent 70%),
        radial-gradient(ellipse 38% 55% at 72% 55%, rgba(110, 164, 232, 0.2), transparent 70%);
    pointer-events: none;
}
.nf-code {
    position: relative;
    font-family: var(--font-title);
    font-size: clamp(4rem, 14vw, 7rem);
    line-height: 1;
    letter-spacing: 0.08em;
    background: linear-gradient(135deg, #eaf4ff, #9fd8f0 45%, #c4b5fd);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    filter: drop-shadow(0 10px 30px rgba(159, 212, 248, 0.25));
}
.nf-hint {
    position: relative;
    margin: 0.4rem 0 1.4rem;
    color: var(--color-text-muted);
    font-size: 0.86rem;
    letter-spacing: 0.06em;
}
.nf-hint i { color: var(--color-cyan); margin-right: 0.3rem; }
.nf-actions {
    position: relative;
    display: flex;
    justify-content: center;
    gap: 0.8rem;
    flex-wrap: wrap;
}
.nf-actions .page-back { margin: 0; }
</style>
