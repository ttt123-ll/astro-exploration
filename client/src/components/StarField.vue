<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';

const canvas = ref(null);
let ctx, stars = [], meteors = [], raf, w, h, dpr;
let mx = 0, my = 0, tx = 0, ty = 0;
let lastMeteor = 0, nextMeteor = 2500;
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const palette = ['255,255,255', '200,212,240', '160,190,245', '205,190,250'];

function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth; h = window.innerHeight;
    canvas.value.width = w * dpr; canvas.value.height = h * dpr;
    canvas.value.style.width = w + 'px'; canvas.value.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    initStars();
}

function initStars() {
    const count = Math.min(Math.floor((w * h) / 2600), 420);
    stars = [];
    for (let i = 0; i < count; i++) {
        const layer = Math.random();
        stars.push({
            x: Math.random() * w, y: Math.random() * h,
            r: (layer < 0.75 ? Math.random() * 0.9 : Math.random() * 1.7) + 0.4,
            a: Math.random() * 0.7 + 0.3,
            ac: (Math.random() - 0.5) * 0.02,
            c: palette[(Math.random() * palette.length) | 0],
            depth: 0.2 + layer * 0.8,
            tw: Math.random() * Math.PI * 2
        });
    }
}

function draw() {
    ctx.clearRect(0, 0, w, h);
    const px = mx * 14, py = my * 14;
    for (const s of stars) {
        s.tw += 0.008 + s.depth * 0.01;
        let a = Math.max(0.08, Math.min(1, s.a + Math.sin(s.tw) * s.ac * 14));
        const sx = s.x + px * s.depth * 0.5, sy = s.y + py * s.depth * 0.5;
        const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, s.r * 2.2);
        g.addColorStop(0, `rgba(${s.c}, ${a})`);
        g.addColorStop(0.5, `rgba(157, 140, 240, ${a * 0.4})`);
        g.addColorStop(1, 'rgba(110, 164, 232, 0)');
        ctx.beginPath(); ctx.arc(sx, sy, s.r * 2.2, 0, Math.PI * 2);
        ctx.fillStyle = g; ctx.fill();
        ctx.beginPath(); ctx.arc(sx, sy, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${s.c}, ${a})`; ctx.fill();
    }
    // 流星
    if (!reduced) {
        const now = performance.now();
        if (now - lastMeteor > nextMeteor) {
            lastMeteor = now; nextMeteor = 3200 + Math.random() * 5200;
            const fl = Math.random() > 0.5;
            meteors.push({ x: fl ? Math.random() * w * 0.5 : w * (0.55 + Math.random() * 0.45), y: Math.random() * h * 0.35,
                vx: fl ? 5 + Math.random() * 4 : -(5 + Math.random() * 4), vy: 2.6 + Math.random() * 2.4, life: 1, trail: [] });
        }
        meteors = meteors.filter(m => m.life > 0);
        for (const m of meteors) {
            m.trail.push({ x: m.x, y: m.y });
            if (m.trail.length > 22) m.trail.shift();
            m.x += m.vx; m.y += m.vy; m.life -= 0.013;
            const ha = Math.max(m.life, 0);
            for (let i = 0; i < m.trail.length - 1; i++) {
                const p = m.trail[i], a = (i / m.trail.length) * ha * 0.7;
                if (a <= 0.005) continue;
                ctx.beginPath(); ctx.arc(p.x, p.y, 1.1 * (i / m.trail.length) + 0.3, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(190, 220, 255, ${a})`; ctx.fill();
            }
            if (ha > 0.02) {
                const g = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, 14);
                g.addColorStop(0, `rgba(255,255,255,${ha})`);
                g.addColorStop(0.4, `rgba(180,205,255,${ha * 0.6})`);
                g.addColorStop(1, 'rgba(157,140,240,0)');
                ctx.fillStyle = g; ctx.beginPath(); ctx.arc(m.x, m.y, 14, 0, Math.PI * 2); ctx.fill();
            }
        }
    }
}

function loop() {
    mx += (tx - mx) * 0.04; my += (ty - my) * 0.04;
    draw();
    raf = requestAnimationFrame(loop);
}

function onMouse(e) { tx = (e.clientX / w - 0.5) * 2; ty = (e.clientY / h - 0.5) * 2; }

onMounted(() => {
    ctx = canvas.value.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
    if (!reduced) window.addEventListener('mousemove', onMouse);
    loop();
});
onBeforeUnmount(() => {
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', resize);
    window.removeEventListener('mousemove', onMouse);
});
</script>

<template>
    <canvas id="starsCanvas" ref="canvas"></canvas>
</template>
