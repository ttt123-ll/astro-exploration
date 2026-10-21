<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import videos from '../data/videos';
import PageHeader from '../components/PageHeader.vue';
import BookSection from '../components/BookSection.vue';

/* ===================== 视频懒加载 =====================
   初始只显示封面（poster），进入视口后才真正加载视频数据，
   避免一次请求 9 个 mp4 拖慢首屏。 */
const cardRefs = ref([]);
let observer = null;

function setCardRef(el, i) {
    if (el) cardRefs.value[i] = el;
}

function loadVideo(card) {
    const v = card.querySelector('video');
    if (!v || v.dataset.loaded === '1') return;
    v.dataset.loaded = '1';
    v.preload = 'metadata';
    // 触发加载（src 已在 DOM 上，重新赋值可让浏览器开始请求）
    const src = v.getAttribute('src');
    if (src) v.src = src;
    card.classList.add('video-ready');
}

onMounted(() => {
    if (typeof IntersectionObserver === 'undefined') {
        // 兜底：不支持时全部直接加载
        cardRefs.value.forEach(card => card && loadVideo(card));
        return;
    }
    observer = new IntersectionObserver((entries) => {
        entries.forEach(e => {
            if (e.isIntersecting) {
                loadVideo(e.target);
                observer.unobserve(e.target);
            }
        });
    }, { rootMargin: '200px 0px' });
    cardRefs.value.forEach(card => card && observer.observe(card));
});

onBeforeUnmount(() => { if (observer) observer.disconnect(); });

</script>

<template>
    <div class="container">
        <PageHeader kicker="EXPLAINER VIDEOS" title="科普讲解视频" icon="fa-circle-play" deco="nebula"
                    :stats="[{ v: String(videos.length), l: '官方视频' }, { v: 'NASA', l: '素材来源' }, { v: '公有领域', l: '授权类型' }]"
                    subtitle="精选 NASA 官方讲解视频（公有领域），带你直观了解黑洞、哈勃与韦伯望远镜的奥秘。" />

        <div class="video-grid">
            <div v-for="(v, i) in videos" :key="v.src" class="video-card" :ref="el => setCardRef(el, i)" v-reveal>
                <div class="video-frame">
                    <video :src="v.src" :poster="v.poster" controls preload="none" playsinline></video>
                    <span class="video-lazy" aria-hidden="true">
                        <i class="fas fa-circle-play"></i>
                        <em>进入视口后自动加载</em>
                    </span>
                </div>
                <div class="video-body">
                    <span class="video-credit"><i class="fas fa-satellite-dish"></i> {{ v.credit }} 官方视频</span>
                    <h3>{{ v.title }}</h3>
                    <p class="video-en">{{ v.en }}</p>
                    <p class="video-desc">{{ v.desc }}</p>
                </div>
            </div>
        </div>

        <div class="sys-card" style="margin-top:2rem;">
            <h3 style="font-family:var(--font-title);color:var(--color-gold);font-size:1.05rem;margin-bottom:0.8rem;">
                <i class="fas fa-circle-info"></i> 版权说明
            </h3>
            <p style="color:var(--color-text-secondary);line-height:1.9;font-size:0.92rem;">
                本页面视频均来自 NASA（美国国家航空航天局）官方媒体库，属于公有领域作品，可自由用于科普与教育用途。视频素材来源：images.nasa.gov。
            </p>
        </div>

        <BookSection topic="explore" />
    </div>
</template>

<style scoped>
.video-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 1.8rem; }
.video-card {
    background: var(--bg-card);
    border: 1px solid rgba(159, 212, 248, 0.22);
    border-radius: var(--radius-lg);
    overflow: hidden;
    transition: all 0.35s ease;
}
.video-card:hover { transform: translateY(-6px); border-color: var(--color-primary); box-shadow: var(--shadow-glow-primary); }

/* 视频框：poster 作为封面，加载前的提示层 */
.video-frame { position: relative; background: #000; }
.video-frame video { width: 100%; aspect-ratio: 16/9; display: block; background: #000; }
.video-lazy {
    position: absolute; inset: 0;
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.4rem;
    color: rgba(226, 236, 255, 0.85);
    background: linear-gradient(180deg, rgba(4, 7, 14, 0.15), rgba(4, 7, 14, 0.55));
    pointer-events: none;
    font-size: 1.6rem;
    transition: opacity 0.4s ease;
}
.video-lazy em { font-size: 0.72rem; font-style: normal; letter-spacing: 0.1em; opacity: 0.75; }
.video-card.video-ready .video-lazy { opacity: 0; }

.video-body { padding: 1.3rem 1.4rem 1.5rem; }
.video-credit {
    display: inline-block; font-size: 0.75rem; color: #c4b5fd;
    border: 1px solid rgba(167, 139, 250, 0.5); background: rgba(167, 139, 250, 0.1);
    padding: 0.15rem 0.7rem; border-radius: 50px; margin-bottom: 0.8rem;
}
.video-body h3 { color: var(--color-gold); font-family: var(--font-title); font-size: 1.12rem; margin-bottom: 0.35rem; }
.video-en { color: var(--color-text-muted); font-size: 0.82rem; font-style: italic; margin-bottom: 0.7rem; }
.video-desc { color: var(--color-text-secondary); font-size: 0.9rem; line-height: 1.8; }
</style>
