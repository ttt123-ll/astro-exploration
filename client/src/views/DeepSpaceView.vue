<script setup>
import { computed } from 'vue';
import content from '../data/content';
import VideoSection from '../components/VideoSection.vue';
import BookSection from '../components/BookSection.vue';
import PageHeader from '../components/PageHeader.vue';

const objects = Object.entries(content.object).map(([k, v]) => ({ key: k, ...v }));
const telescopes = Object.entries(content.telescope).map(([k, v]) => ({ key: k, ...v }));

/* ===================== 摘要断句：按句号/逗号找完整断点，不硬截断 ===================== */
function smartSnippet(text, max = 60) {
    const s = String(text || '').trim();
    if (!s) return '';
    if (s.length <= max) return s;
    const window = s.slice(0, max + 16);
    // 优先在句末标点断开
    const sentence = window.lastIndexOf('。');
    if (sentence >= max * 0.5) return window.slice(0, sentence + 1);
    // 其次在逗号/分号断开
    const comma = Math.max(window.lastIndexOf('，'), window.lastIndexOf('；'), window.lastIndexOf('、'));
    if (comma >= max * 0.5) return window.slice(0, comma) + '……';
    // 再退到空格或直接截断
    const space = window.lastIndexOf(' ');
    if (space >= max * 0.5) return window.slice(0, space) + '…';
    return s.slice(0, max) + '…';
}

/* ===================== 类型角标：按天体特征归类 ===================== */
const TYPE_RULES = [
    { type: '星云', icon: 'fa-cloud', re: /星云|nebula/i, color: '#c084fc' },
    { type: '星系', icon: 'fa-hurricane', re: /星系|galaxy/i, color: '#6ea4e8' },
    { type: '星团', icon: 'fa-circle-nodes', re: /星团|cluster/i, color: '#6ec8a8' },
    { type: '望远镜', icon: 'fa-satellite', re: /望远镜|telescope|哈勃|韦伯|钱德拉/i, color: '#e8a06e' }
];

function typeOf(item, group) {
    if (group === 'telescope') return TYPE_RULES[3];
    const hay = [item.title, item.sections?.[0]?.title, item.sections?.[0]?.paras?.[0], item.key]
        .filter(Boolean).join(' ');
    return TYPE_RULES.find(r => r.re.test(hay)) || { type: '深空天体', icon: 'fa-meteor', color: '#9d8cf0' };
}

const objectCards = computed(() => objects.map(o => ({
    ...o, type: typeOf(o, 'object'), snippet: smartSnippet(o.sections?.[0]?.paras?.[0], 58)
})));

const telescopeCards = computed(() => telescopes.map(t => ({
    ...t, type: typeOf(t, 'telescope'), snippet: smartSnippet(t.sections?.[0]?.paras?.[0], 58)
})));

/* 分类计数（用于页头数据卡与筛选） */
const typeCount = computed(() => {
    const m = {};
    [...objectCards.value].forEach(c => { m[c.type.type] = (m[c.type.type] || 0) + 1; });
    return m;
});
</script>

<template>
    <div class="container">
        <PageHeader kicker="DEEP SPACE" title="深空天体" icon="fa-meteor" deco="nebula"
                    :stats="[
                        { v: String(objects.length), l: '深空天体' },
                        { v: String(telescopes.length), l: '太空望远镜' },
                        { v: String(Object.keys(typeCount).length), l: '天体类型' }
                    ]"
                    subtitle="星云、星系、星团等深空天体图鉴——梅西耶天体与著名深空影像，以及改变人类宇宙观的太空望远镜。" />

        <div class="section-head"><h2 class="section-title">深空天体图鉴</h2></div>
        <div class="obj-grid">
            <router-link v-for="o in objectCards" :key="o.key" :to="'/detail/object/' + o.key" class="obj-card" v-reveal>
                <div class="obj-media">
                    <img v-if="o.hero" :src="'/' + o.hero.src" :alt="o.title" loading="lazy">
                    <!-- 类型角标 -->
                    <span class="obj-type" :style="{ '--t-color': o.type.color }">
                        <i class="fas" :class="o.type.icon"></i> {{ o.type.type }}
                    </span>
                </div>
                <div class="obj-body">
                    <h4>{{ o.title }}</h4>
                    <p>{{ o.snippet }}</p>
                </div>
            </router-link>
        </div>

        <div class="section-head" style="margin-top:3rem;"><h2 class="section-title">伟大的太空望远镜</h2></div>
        <div class="obj-grid">
            <router-link v-for="t in telescopeCards" :key="t.key" :to="'/detail/telescope/' + t.key" class="obj-card" v-reveal>
                <div class="obj-media">
                    <img v-if="t.hero" :src="'/' + t.hero.src" :alt="t.title" loading="lazy">
                    <span class="obj-type" :style="{ '--t-color': t.type.color }">
                        <i class="fas" :class="t.type.icon"></i> {{ t.type.type }}
                    </span>
                </div>
                <div class="obj-body">
                    <h4>{{ t.title }}</h4>
                    <p>{{ t.snippet }}</p>
                </div>
            </router-link>
        </div>

        <VideoSection context="deepspace" title="深空天体科普视频" />
        <BookSection topic="deep" />
    </div>
</template>

<style scoped>
.obj-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.5rem; }
.obj-card {
    background: var(--bg-card);
    border-radius: var(--radius-md);
    overflow: hidden;
    border: 1px solid rgba(159, 212, 248, 0.2);
    text-decoration: none;
    color: inherit;
    transition: all 0.35s ease;
}
.obj-card:hover { transform: translateY(-6px); border-color: var(--color-primary); box-shadow: var(--shadow-glow-primary); }

.obj-media { position: relative; }
.obj-card img { width: 100%; height: 180px; object-fit: cover; display: block; }

/* 类型角标 */
.obj-type {
    position: absolute;
    top: 0.7rem;
    left: 0.7rem;
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.18rem 0.6rem;
    border-radius: 50px;
    font-size: 0.7rem;
    letter-spacing: 0.06em;
    color: var(--t-color, #9d8cf0);
    background: rgba(6, 10, 20, 0.72);
    border: 1px solid color-mix(in srgb, var(--t-color, #9d8cf0) 60%, transparent);
    backdrop-filter: blur(6px);
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.45);
}

.obj-body { padding: 1rem 1.2rem 1.3rem; }
.obj-body h4 { color: var(--color-gold); font-family: var(--font-title); font-size: 1.05rem; margin-bottom: 0.4rem; }
.obj-body p { color: var(--color-text-secondary); font-size: 0.85rem; line-height: 1.7; }
</style>
