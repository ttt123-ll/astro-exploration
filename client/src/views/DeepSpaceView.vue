<script setup>
import content from '../data/content';
import VideoSection from '../components/VideoSection.vue';
import BookSection from '../components/BookSection.vue';
const objects = Object.entries(content.object).map(([k, v]) => ({ key: k, ...v }));
const telescopes = Object.entries(content.telescope).map(([k, v]) => ({ key: k, ...v }));
</script>

<template>
    <div class="container">
        <div class="page-header">
            <span class="page-kicker">DEEP SPACE</span>
            <h1>深空天体</h1>
            <p>星云、星系、星团等深空天体图鉴——梅西耶天体与著名深空影像。</p>
        </div>

        <div class="section-head"><h2 class="section-title">深空天体图鉴</h2></div>
        <div class="obj-grid">
            <router-link v-for="o in objects" :key="o.key" :to="'/detail/object/' + o.key" class="obj-card" v-reveal>
                <img v-if="o.hero" :src="'/' + o.hero.src" :alt="o.title">
                <div class="obj-body"><h4>{{ o.title }}</h4><p>{{ o.sections[0]?.paras[0]?.slice(0, 55) || '' }}…</p></div>
            </router-link>
        </div>

        <div class="section-head" style="margin-top:3rem;"><h2 class="section-title">伟大的太空望远镜</h2></div>
        <div class="obj-grid">
            <router-link v-for="t in telescopes" :key="t.key" :to="'/detail/telescope/' + t.key" class="obj-card" v-reveal>
                <img v-if="t.hero" :src="'/' + t.hero.src" :alt="t.title">
                <div class="obj-body"><h4>{{ t.title }}</h4><p>{{ t.sections[0]?.paras[0]?.slice(0, 55) || '' }}…</p></div>
            </router-link>
        </div>

        <VideoSection topic="deepspace" title="深空与望远镜科普视频" />
        <BookSection topic="deep" />
    </div>
</template>

<style scoped>
.obj-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.5rem; }
.obj-card { background: var(--bg-card); border-radius: var(--radius-md); overflow: hidden; border: 1px solid rgba(159,212,248,0.2); text-decoration: none; color: inherit; transition: all 0.35s ease; }
.obj-card:hover { transform: translateY(-6px); border-color: var(--color-primary); box-shadow: var(--shadow-glow-primary); }
.obj-card img { width: 100%; height: 180px; object-fit: cover; }
.obj-body { padding: 1rem 1.2rem 1.3rem; }
.obj-body h4 { color: var(--color-gold); font-family: var(--font-title); font-size: 1.05rem; margin-bottom: 0.4rem; }
.obj-body p { color: var(--color-text-secondary); font-size: 0.85rem; line-height: 1.7; }
</style>
