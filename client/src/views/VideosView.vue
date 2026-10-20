<script setup>
import videos from '../data/videos';
import PageNav from '../components/PageNav.vue';
</script>

<template>
    <div class="container">
        <PageNav title="科普视频" />
        <div class="page-header">
            <span class="page-kicker">EXPLAINER VIDEOS</span>
            <h1>科普讲解视频</h1>
            <p>精选 NASA 官方讲解视频（公有领域），带你直观了解黑洞、哈勃与韦伯望远镜的奥秘。</p>
        </div>

        <div class="video-grid">
            <div v-for="(v, i) in videos" :key="i" class="video-card" v-reveal>
                <video :src="v.src" controls preload="metadata" playsinline></video>
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
    </div>
</template>

<style scoped>
.video-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 1.8rem; }
.video-card { background: var(--bg-card); border: 1px solid rgba(159,212,248,0.22); border-radius: var(--radius-lg); overflow: hidden; transition: all 0.35s ease; }
.video-card:hover { transform: translateY(-6px); border-color: var(--color-primary); box-shadow: var(--shadow-glow-primary); }
.video-card video { width: 100%; aspect-ratio: 16/9; background: #000; display: block; }
.video-body { padding: 1.3rem 1.4rem 1.5rem; }
.video-credit { display: inline-block; font-size: 0.75rem; color: #c4b5fd; border: 1px solid rgba(167,139,250,0.5); background: rgba(167,139,250,0.1); padding: 0.15rem 0.7rem; border-radius: 50px; margin-bottom: 0.8rem; }
.video-body h3 { color: var(--color-gold); font-family: var(--font-title); font-size: 1.12rem; margin-bottom: 0.35rem; }
.video-en { color: var(--color-text-muted); font-size: 0.82rem; font-style: italic; margin-bottom: 0.7rem; }
.video-desc { color: var(--color-text-secondary); font-size: 0.9rem; line-height: 1.8; }
</style>
