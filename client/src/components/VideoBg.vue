<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';

const scenes = [
    { local: '/assets/videos/nebula.webm', remote: 'https://upload.wikimedia.org/wikipedia/commons/9/9e/Carina_Nebula_Webb_vs_Hubble_%28SVS31197_-_carina_nebula_720p30%29.webm', poster: '/assets/images/carina_nebula.jpg', label: '船底座星云 · 哈勃与韦伯影像' },
    { local: '/assets/videos/galaxy.webm', remote: 'https://upload.wikimedia.org/wikipedia/commons/4/48/Timelapse_of_Milky_way_changing_colors_during_Aurora_-_53921478021.webm', poster: '/assets/images/milky_way.jpg', label: '银河横跨夜空 · 延时摄影' },
    { local: '/assets/videos/planet.webm', remote: 'https://upload.wikimedia.org/wikipedia/commons/9/94/DSCOVR_EPIC_Earth_Rotation.webm', poster: '/assets/images/earth.jpg', label: '地球自转 · DSCOVR 卫星影像' },
    { local: '/assets/videos/deepspace.webm', remote: 'https://upload.wikimedia.org/wikipedia/commons/6/63/Milky_Way_Timelapse.webm', poster: '/assets/images/star_cluster.jpg', label: '深空星野 · 延时摄影' }
];

const wrap = ref(null);
const vids = [];
let current = 0, timer = null, started = false;
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// 省流模式 / 弱网下不加载视频背景，避免 100MB 级流量
const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
const lowData = !!(conn && (conn.saveData || /^(slow-)?2g$|^3g$/.test(conn.effectiveType || '')));

function alive() { return vids.filter(v => !v.dataset.dead).length; }

function play(i) {
    if (!wrap.value) return;
    current = i % vids.length;
    vids.forEach((v, idx) => {
        v.classList.toggle('active', idx === current);
        if (idx === current) {
            // 按需加载：只有真正要播放的视频才下载，避免首屏拉取全部 4 段视频
            if (v.preload !== 'auto') v.preload = 'auto';
            const p = v.play(); if (p && p.catch) p.catch(() => {});
        } else {
            v.pause();
        }
    });
    vids[current].currentTime = 0;
}

function schedule() {
    if (timer) clearInterval(timer);
    timer = setInterval(() => play(current + 1), 26000);
}

onMounted(() => {
    document.body.classList.add('has-video-bg');
    // 省流 / 弱网 / 减少动效：直接放弃视频背景（页面渐变背景仍然有效）
    if (reduced || lowData) {
        if (wrap.value) { wrap.value.remove(); wrap.value = null; }
        document.body.classList.remove('has-video-bg');
        return;
    }
    schedule();
    document.addEventListener('visibilitychange', () => {
        if (!wrap.value) return;
        if (document.hidden) { vids.forEach(v => v.pause()); clearInterval(timer); }
        else { play(current); schedule(); }
    });
});
onBeforeUnmount(() => {
    document.body.classList.remove('has-video-bg');
    if (timer) clearInterval(timer);
});

function onReady(i) {
    if (vids[i].dataset.started) return;
    vids[i].dataset.started = '1';
    delete vids[i].dataset.dead;
    if (!started) {
        started = true; current = i;
        if (!reduced) play(i); else vids[i].classList.add('active');
    }
}
</script>

<template>
    <div id="videoBg" ref="wrap" aria-hidden="true">
        <video v-for="(s, i) in scenes" :key="i"
               muted loop playsinline :preload="i === 0 ? 'auto' : 'none'" crossorigin="anonymous"
               :poster="s.poster" :title="s.label"
               @error="vids[i].dataset.dead = '1'; if (alive() === 0 && wrap) { wrap.remove(); wrap = null; document.body.classList.remove('has-video-bg'); }"
               @canplay="onReady(i)"
               :ref="el => { if (el) vids[i] = el; }">
            <source :src="s.local" type="video/webm">
            <source :src="s.remote" type="video/webm">
        </video>
    </div>
</template>
