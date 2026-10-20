<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import gallery from '../data/gallery';
import official from '../data/official';
import VideoSection from '../components/VideoSection.vue';
import PageNav from '../components/PageNav.vue';
import BookSection from '../components/BookSection.vue';
import PageHeader from '../components/PageHeader.vue';

const officialItems = official.map(o => ({
    category: 'official',
    src: o.src.replace(/^\/+/, ''),
    alt: o.title,
    title: o.title,
    desc: o.desc,
    credit: o.credit,
    detailUrl: ''
}));
const allItems = [...gallery, ...officialItems];

const cat = ref('all');
const cats = [['all', '全部'], ['nebula', '星云'], ['galaxy', '星系'], ['planet', '行星与日食'], ['deep', '深空与望远镜'], ['official', '官方图库']];
const list = computed(() => cat.value === 'all' ? allItems : allItems.filter(g => g.category === cat.value));

const lightbox = ref(null);
const lbIdx = ref(0);
function open(i) { lbIdx.value = i; lightbox.value = true; }
function close() { lightbox.value = false; }
function prev() { lbIdx.value = (lbIdx.value - 1 + list.value.length) % list.value.length; }
function next() { lbIdx.value = (lbIdx.value + 1) % list.value.length; }

/* —— 今日天文图片（APOD 轮播） —— */
const apod = [
    { img: '/assets/images/pillars_of_creation.jpg', k: '鹰星云 · 创生之柱', t: '鹰星云 · 创生之柱', d: '鹰星云位于巨蛇座，距离地球约7000光年。其最著名的"创生之柱"是巨大的星际气体和尘埃柱，无数新恒星正在其中孕育。', m: '哈勃太空望远镜', loc: '巨蛇座 · 7000光年', date: '2026年6月23日' },
    { img: '/assets/images/jwst_deep_field.jpg', k: '韦伯深场', t: '韦伯深场', d: '詹姆斯·韦伯太空望远镜对准一小片"空白"天区长时间曝光，数千个遥远星系浮现而出，其中一些诞生于宇宙仅3亿岁时。', m: '詹姆斯·韦伯望远镜', loc: '深空 · 130亿光年外', date: '2026年6月22日' },
    { img: '/assets/images/andromeda_galaxy.jpg', k: '仙女座星系', t: '仙女座星系 M31', d: '距离地球254万光年的仙女座星系，是本星系群中最大的星系。约40亿年后，它将与银河系相撞合并。', m: '地面天文台', loc: '仙女座 · 254万光年', date: '2026年6月21日' },
    { img: '/assets/images/carina_nebula.jpg', k: '船底座星云', t: '船底座星云 · 宇宙悬崖', d: '韦伯望远镜拍下的"宇宙悬崖"——船底座星云边缘的气体尘埃峭壁，高度可达数光年。', m: '詹姆斯·韦伯望远镜', loc: '船底座 · 7600光年', date: '2026年6月20日' }
];
const apodIdx = ref(0);
let apodTimer;
function apodGo(i) { apodIdx.value = (i + apod.length) % apod.length; }
function apodRestart() { clearInterval(apodTimer); apodTimer = setInterval(() => apodGo(apodIdx.value + 1), 6500); }

// 把旧站详情文件名映射为 Vue 路由
function toRoute(url) {
    if (!url) return '';
    const groups = ['object', 'planet', 'star', 'constellation', 'galaxy', 'blackhole', 'telescope'];
    for (const g of groups) {
        const m = url.match(new RegExp('^' + g + '-(.+)\\.html$'));
        if (m) return '/detail/' + g + '/' + m[1];
    }
    const map = { 'stars-galaxies.html': '/encyclopedia?tab=stars', 'black-hole.html': '/encyclopedia?tab=bh', 'index.html': '/' };
    return map[url] || '';
}
function onKey(e) {
    if (!lightbox.value) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') prev();
    if (e.key === 'ArrowRight') next();
}
onMounted(() => {
    document.addEventListener('keydown', onKey);
    apodRestart();
});
onBeforeUnmount(() => {
    document.removeEventListener('keydown', onKey);
    clearInterval(apodTimer);
});
</script>

<template>
    <div class="container">
        <PageNav title="星空图集" />
        <PageHeader kicker="COSMIC GALLERY" title="星空图集" icon="fa-images" deco="stars" :stats="[{ v: String(allItems.length), l: '宇宙影像' }, { v: '6', l: '分类' }]">
            精选哈勃、韦伯等望远镜拍摄的精美宇宙照片，共 {{ allItems.length }} 张。点击任意图片放大欣赏。
        </PageHeader>

        <!-- 今日天文图片（原首页区块移入） -->
        <section class="apod">
            <div class="section-head">
                <h2 class="section-title"><span class="title-icon"><i class="fas fa-camera"></i></span>今日天文图片</h2>
                <p class="section-subtitle">每天一张宇宙大片，配上一段天文故事</p>
            </div>
            <div class="apod-card" v-reveal>
                <div class="apod-slides">
                    <div class="apod-slide" :class="{ active: apodIdx === i }" v-for="(a, i) in apod" :key="i">
                        <div class="apod-image"><img :src="a.img" :alt="a.t"></div>
                        <div class="apod-info">
                            <div class="apod-kicker">APOD · 第 {{ i + 1 }} 张 / 共 {{ apod.length }} 张</div>
                            <h3>{{ a.t }}</h3>
                            <p>{{ a.d }}</p>
                            <div class="apod-meta">
                                <span><i class="fas fa-calendar"></i> {{ a.date }}</span>
                                <span><i class="fas fa-binoculars"></i> {{ a.m }}</span>
                                <span><i class="fas fa-location-dot"></i> {{ a.loc }}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="apod-controls">
                    <div class="apod-nav">
                        <button @click="apodGo(apodIdx - 1); apodRestart()"><i class="fas fa-chevron-left"></i></button>
                        <button @click="apodGo(apodIdx + 1); apodRestart()"><i class="fas fa-chevron-right"></i></button>
                    </div>
                    <div class="apod-dots">
                        <button v-for="(a, i) in apod" :key="i" class="dot" :class="{ active: apodIdx === i }" @click="apodIdx = i; apodRestart()"></button>
                    </div>
                </div>
            </div>
        </section>

        <div class="filter-tabs">
            <button v-for="[k, label] in cats" :key="k" class="filter-tab" :class="{ active: cat === k }" @click="cat = k">{{ label }}</button>
        </div>

        <div class="gallery-grid">
            <div v-for="(g, i) in list" :key="i" class="gallery-item" @click="open(i)" v-reveal>
                <img :src="'/' + g.src" :alt="g.alt">
                <div class="gallery-overlay"><h4>{{ g.title }}</h4><p>{{ g.desc }}</p><span class="gallery-credit"><i class="fas fa-camera"></i> {{ g.credit }}</span></div>
                <div class="gallery-hint"><i class="fas fa-magnifying-glass-plus"></i></div>
            </div>
        </div>

        <VideoSection topic="gallery" title="望远镜科普视频" />
        <BookSection topic="gallery" />
    </div>

    <div class="lightbox" :class="{ active: lightbox }" @click.self="close">
        <button class="lightbox-btn lightbox-prev" @click="prev"><i class="fas fa-chevron-left"></i></button>
        <div class="lightbox-stage">
            <button class="lightbox-close" @click="close"><i class="fas fa-xmark"></i></button>
            <img class="lightbox-img" :src="'/' + list[lbIdx]?.src" :alt="list[lbIdx]?.alt">
            <div class="lightbox-caption">
                <div class="lightbox-title">{{ list[lbIdx]?.title }}</div>
                <div class="lightbox-desc">{{ list[lbIdx]?.desc }}</div>
                <div class="lightbox-credit"><i class="fas fa-camera"></i> 图片来源：{{ list[lbIdx]?.credit }}</div>
                <div class="lightbox-counter">{{ lbIdx + 1 }} / {{ list.length }}</div>
                <div class="lightbox-actions" v-if="list[lbIdx]?.detailUrl">
                    <router-link class="btn btn-primary" style="padding:0.55rem 1.4rem;font-size:0.88rem;" :to="toRoute(list[lbIdx].detailUrl)"><i class="fas fa-book-open"></i> 查看详情</router-link>
                </div>
            </div>
        </div>
        <button class="lightbox-btn lightbox-next" @click="next"><i class="fas fa-chevron-right"></i></button>
    </div>
</template>
