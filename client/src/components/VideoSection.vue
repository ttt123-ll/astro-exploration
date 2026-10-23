<script setup>
import { computed } from 'vue';
import videos from '../data/videos';

const props = defineProps({
    /* 页面上下文：与 videos.js 中每个视频唯一的 context 对应；
       没有匹配视频时整段自动隐藏（各页面不重复复用同一个视频） */
    context: { type: String, required: true },
    title: { type: String, default: '科普讲解视频' },
    limit: { type: Number, default: 1 }
});

const list = computed(() => videos.filter(v => v.context === props.context).slice(0, props.limit));
</script>

<template>
    <section v-if="list.length" class="video-section">
        <div class="vs-head">
            <h3 class="vs-title"><i class="fas fa-circle-play"></i> {{ title }}</h3>
            <span class="vs-sub">NASA 官方视频 · 公有领域</span>
            <router-link to="/videos" class="vs-more">查看全部 <i class="fas fa-arrow-right"></i></router-link>
        </div>
        <div class="vs-grid" :class="{ single: list.length === 1 }">
            <div v-for="v in list" :key="v.src" class="vs-card">
                <video :src="v.src" controls preload="metadata" playsinline></video>
                <div class="vs-body">
                    <span class="vs-credit">{{ v.credit }}</span>
                    <h4>{{ v.title }}</h4>
                    <p class="vs-en">{{ v.en }}</p>
                    <p class="vs-desc">{{ v.desc }}</p>
                </div>
            </div>
        </div>
    </section>
</template>

<style scoped>
.video-section { margin-top: 2.6rem; }
.vs-head { display: flex; align-items: baseline; gap: 0.9rem; margin-bottom: 1.2rem; flex-wrap: wrap; }
.vs-title { font-family: var(--font-title); color: var(--color-gold); font-size: 1.3rem; }
.vs-title i { color: var(--color-cyan); margin-right: 0.4rem; }
.vs-sub { color: var(--color-text-muted); font-size: 0.8rem; }
.vs-more { margin-left: auto; font-size: 0.78rem; color: var(--color-cyan); text-decoration: none; display: inline-flex; align-items: center; gap: 0.3rem; transition: color 0.3s ease; }
.vs-more:hover { color: var(--color-gold); }
.vs-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.5rem; }
.vs-grid.single { grid-template-columns: minmax(0, 620px); }
.vs-card {
    background: var(--bg-card); border: 1px solid rgba(159, 212, 248, 0.22);
    border-radius: var(--radius-lg); overflow: hidden; transition: all 0.35s ease;
}
.vs-card:hover { transform: translateY(-5px); border-color: var(--color-primary); box-shadow: var(--shadow-glow-primary); }
.vs-card video { width: 100%; aspect-ratio: 16/9; background: #000; display: block; }
.vs-body { padding: 1.1rem 1.2rem 1.3rem; }
.vs-credit {
    display: inline-block; font-size: 0.72rem; color: #c4b5fd;
    border: 1px solid rgba(167, 139, 250, 0.5); background: rgba(167, 139, 250, 0.1);
    padding: 0.12rem 0.6rem; border-radius: 50px; margin-bottom: 0.6rem;
}
.vs-body h4 { color: var(--color-gold); font-family: var(--font-title); font-size: 1.02rem; margin-bottom: 0.3rem; }
.vs-en { color: var(--color-text-muted); font-size: 0.78rem; font-style: italic; margin-bottom: 0.55rem; }
.vs-desc { color: var(--color-text-secondary); font-size: 0.87rem; line-height: 1.75; }
</style>
