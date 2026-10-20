<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';

// 鼠标光晕拖尾 + 点击星尘粒子
const glow = ref(null);
const particles = ref([]);
const hovering = ref(false);
let mx = -100, my = -100, gx = -100, gy = -100, raf;

function loop() {
    gx += (mx - gx) * 0.12;
    gy += (my - gy) * 0.12;
    if (glow.value) {
        glow.value.style.transform = `translate(${gx}px, ${gy}px)`;
    }
    raf = requestAnimationFrame(loop);
}

function onMove(e) {
    mx = e.clientX; my = e.clientY;
}

// 悬停在可交互元素上时，光晕放大并变亮
const INTERACTIVE = 'a, button, [role="button"], .gallery-item, .news-card, .book-card, .cons-card, .obj-card, .quiz-option, .planet-card';
function onOver(e) {
    hovering.value = !!(e.target && e.target.closest && e.target.closest(INTERACTIVE));
}

function onClick(e) {
    // 点击处生成星尘粒子
    const x = e.clientX, y = e.clientY;
    const n = 10;
    const arr = [];
    for (let i = 0; i < n; i++) {
        const angle = (Math.PI * 2 * i) / n + Math.random() * 0.6;
        const dist = 30 + Math.random() * 50;
        arr.push({
            id: Date.now() + i,
            x, y,
            dx: Math.cos(angle) * dist,
            dy: Math.sin(angle) * dist,
            r: 2 + Math.random() * 3,
            char: ['✦', '·', '✧'][Math.floor(Math.random() * 3)],
            life: 1
        });
    }
    particles.value.push(...arr);
    // 清理
    setTimeout(() => {
        particles.value = particles.value.filter(p => !arr.includes(p));
    }, 900);
}

onMounted(() => {
    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('mouseover', onOver, { passive: true });
    window.addEventListener('click', onClick);
    loop();
});
onBeforeUnmount(() => {
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseover', onOver);
    window.removeEventListener('click', onClick);
    cancelAnimationFrame(raf);
});
</script>

<template>
    <div class="cursor-glow" :class="{ hovering }" ref="glow"></div>
    <transition-group name="spark" tag="div">
        <span v-for="p in particles" :key="p.id" class="click-spark"
              :style="{ left: p.x + 'px', top: p.y + 'px', fontSize: p.r * 4 + 'px',
                        '--dx': p.dx + 'px', '--dy': p.dy + 'px' }">{{ p.char }}</span>
    </transition-group>
</template>

<style>
.cursor-glow {
    position: fixed;
    left: 0; top: 0;
    width: 16px; height: 16px;
    margin: -8px 0 0 -8px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(216, 224, 244, 0.9), rgba(157, 140, 240, 0.35) 55%, transparent 75%);
    pointer-events: none;
    z-index: 9999;
    box-shadow: 0 0 14px rgba(157, 140, 240, 0.6);
    mix-blend-mode: screen;
    transition: width 0.22s ease, height 0.22s ease, margin 0.22s ease, box-shadow 0.22s ease, opacity 0.22s ease;
}

/* 悬停在可点击元素上：光晕变大、变亮、带青色边缘 */
.cursor-glow.hovering {
    width: 30px; height: 30px;
    margin: -15px 0 0 -15px;
    background: radial-gradient(circle, rgba(226, 240, 255, 0.95), rgba(120, 220, 255, 0.45) 50%, transparent 72%);
    box-shadow: 0 0 24px rgba(120, 220, 255, 0.85), 0 0 6px rgba(255, 255, 255, 0.7);
}
.click-spark {
    position: fixed;
    color: #e6ecf8;
    pointer-events: none;
    z-index: 9998;
    transform: translate(-50%, -50%);
    animation: sparkFly 0.85s ease-out forwards;
    text-shadow: 0 0 8px rgba(216, 224, 244, 0.9);
}
@keyframes sparkFly {
    0% { opacity: 1; transform: translate(-50%, -50%) translate(0, 0) scale(1); }
    100% { opacity: 0; transform: translate(-50%, -50%) translate(var(--dx), var(--dy)) scale(0.3); }
}
@media (prefers-reduced-motion: reduce) {
    .cursor-glow, .click-spark { display: none; }
}
</style>
