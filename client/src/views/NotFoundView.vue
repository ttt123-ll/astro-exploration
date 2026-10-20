<script setup>
import { useRouter } from 'vue-router';
const router = useRouter();
</script>

<template>
    <div class="nf-wrap">
        <!-- 星际背景 -->
        <div class="nf-stars" aria-hidden="true">
            <span v-for="i in 40" :key="i" class="nf-star" :style="{ '--i': i }"></span>
        </div>
        <div class="nf-nebula" aria-hidden="true"></div>

        <!-- 漂浮的小宇航员 -->
        <div class="nf-astro" aria-hidden="true">
            <i class="fas fa-user-astronaut"></i>
            <span class="nf-tether"></span>
        </div>

        <!-- 轨道环 -->
        <div class="nf-orbits" aria-hidden="true">
            <span class="nf-orbit o1"></span>
            <span class="nf-orbit o2"></span>
            <span class="nf-orbit o3"></span>
        </div>

        <div class="nf-content">
            <div class="nf-code">404</div>
            <h1 class="nf-title">你迷失在宇宙深处了</h1>
            <p class="nf-desc">
                这颗星球不存在——它或许已经坍缩成黑洞，或许从未被点亮。<br>
                别担心，我们为你保留了一条返回轨道。
            </p>
            <div class="nf-actions">
                <button class="btn btn-gold" @click="router.push('/')"><i class="fas fa-house"></i> 返回首页</button>
                <button class="btn btn-ghost" @click="router.back()"><i class="fas fa-rotate-left"></i> 返回上一页</button>
            </div>
            <p class="nf-tip"><i class="fas fa-satellite"></i> 坐标丢失 · 正在重新定位…</p>
        </div>
    </div>
</template>

<style scoped>
.nf-wrap {
    position: relative;
    min-height: calc(100vh - 73px);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    padding: 4rem 1.5rem 6rem;
    text-align: center;
}

/* —— 星点 —— */
.nf-stars { position: absolute; inset: 0; pointer-events: none; }
.nf-star {
    position: absolute;
    width: 2px; height: 2px;
    border-radius: 50%;
    background: #e6ecf8;
    left: calc((var(--i) * 29) % 100 * 1%);
    top: calc((var(--i) * 53) % 100 * 1%);
    animation: nfTwinkle calc(2.6s + var(--i) * 0.09s) ease-in-out infinite;
    animation-delay: calc(var(--i) * -0.17s);
}

@keyframes nfTwinkle {
    0%, 100% { opacity: 0.15; transform: scale(0.7); }
    50% { opacity: 1; transform: scale(1.4); }
}

/* —— 星云 —— */
.nf-nebula {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background:
        radial-gradient(ellipse 46% 40% at 24% 30%, rgba(157, 140, 240, 0.24), transparent 64%),
        radial-gradient(ellipse 42% 38% at 76% 66%, rgba(110, 164, 232, 0.2), transparent 64%);
    animation: nfDrift 16s ease-in-out infinite alternate;
}

@keyframes nfDrift {
    from { transform: scale(1); }
    to { transform: scale(1.1) translate(-1%, 1%); }
}

/* —— 漂浮宇航员 —— */
.nf-astro {
    position: relative;
    font-size: 4.6rem;
    color: var(--color-cyan);
    filter: drop-shadow(0 0 26px rgba(120, 220, 255, 0.55));
    animation: nfFloat 6s ease-in-out infinite;
    z-index: 2;
}

.nf-tether {
    position: absolute;
    left: 50%;
    bottom: -34px;
    width: 1px;
    height: 34px;
    background: linear-gradient(180deg, rgba(206, 216, 240, 0.6), transparent);
}

@keyframes nfFloat {
    0%, 100% { transform: translateY(0) rotate(-4deg); }
    50% { transform: translateY(-16px) rotate(5deg); }
}

/* —— 轨道环 —— */
.nf-orbits {
    position: absolute;
    inset: 0;
    pointer-events: none;
    display: grid;
    place-items: center;
}

.nf-orbit {
    position: absolute;
    border-radius: 50%;
    border: 1px dashed rgba(159, 212, 248, 0.14);
    animation: nfOrbit 40s linear infinite;
}

.nf-orbit.o1 { width: 420px; height: 420px; }
.nf-orbit.o2 { width: 640px; height: 640px; border-style: solid; border-color: rgba(157, 140, 240, 0.1); animation-duration: 64s; animation-direction: reverse; }
.nf-orbit.o3 { width: 880px; height: 880px; animation-duration: 92s; }

@keyframes nfOrbit { to { transform: rotate(360deg); } }

/* —— 内容 —— */
.nf-content { position: relative; z-index: 2; }

.nf-code {
    font-family: var(--font-title);
    font-size: clamp(3.6rem, 10vw, 7rem);
    font-weight: 700;
    letter-spacing: 0.14em;
    line-height: 1;
    background: linear-gradient(180deg, #fff 8%, var(--color-gold) 62%, rgba(157, 140, 240, 0.65));
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    filter: drop-shadow(0 0 34px rgba(206, 216, 240, 0.35));
}

.nf-title {
    font-family: var(--font-title);
    font-size: clamp(1.3rem, 3vw, 1.9rem);
    color: var(--color-gold);
    margin: 0.8rem 0 1rem;
    letter-spacing: 0.08em;
}

.nf-desc {
    color: var(--color-text-secondary);
    line-height: 2;
    font-size: 0.95rem;
    max-width: 560px;
    margin: 0 auto 2rem;
}

.nf-actions {
    display: flex;
    justify-content: center;
    gap: 1rem;
    flex-wrap: wrap;
}

.nf-tip {
    margin-top: 2.4rem;
    font-size: 0.76rem;
    letter-spacing: 0.16em;
    color: var(--color-text-muted);
    animation: nfPulse 2.6s ease-in-out infinite;
}

@keyframes nfPulse {
    0%, 100% { opacity: 0.45; }
    50% { opacity: 1; }
}

@media (max-width: 640px) {
    .nf-astro { font-size: 3.4rem; }
    .nf-orbit.o2, .nf-orbit.o3 { display: none; }
}
</style>
