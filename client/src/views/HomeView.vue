<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import planets from '../data/planets';
import api from '../api';

/* —— 首页新闻（实时读取数据库） —— */
const newsList = ref([]);
const newsTotal = ref(0);
async function loadHomeNews() {
    try {
        const { data } = await api.get('/news', { params: { limit: 6 } });
        newsList.value = data.rows;
        newsTotal.value = data.total;
        if (newsList.value.length) restartHn();
    } catch (e) { /* 静默 */ }
}

/* —— 顶部新闻轮播 —— */
const heroNews = computed(() => newsList.value.slice(0, 4));
const hnIdx = ref(0);
let hnTimer = null;
function hnGo(i) { hnIdx.value = i; restartHn(); }
function hnNext() { if (heroNews.value.length) hnIdx.value = (hnIdx.value + 1) % heroNews.value.length; }
function hnPrev() { if (heroNews.value.length) hnIdx.value = (hnIdx.value - 1 + heroNews.value.length) % heroNews.value.length; }
function restartHn() {
    if (hnTimer) clearInterval(hnTimer);
    hnTimer = setInterval(hnNext, 5200);
}
/* 鼠标停在轮播上时暂停自动播放与进度条 */
function pauseHn() { if (hnTimer) { clearInterval(hnTimer); hnTimer = null; } }
function resumeHn() { if (!hnTimer) restartHn(); }
onMounted(loadHomeNews);
onBeforeUnmount(() => { if (hnTimer) clearInterval(hnTimer); });

/* —— 宇宙尺度滑块 / 书籍轮播已移至「四季星座」页 —— */

/* —— 首页互动星球：点击放大穿越，进入星球投影 —— */
const router = useRouter();
const launching = ref(false);
const launchImg = ref('/assets/textures/earth.jpg');
let launchTarget = '';

function launch(target, img) {
    if (launching.value) return;
    launchTarget = target;
    launchImg.value = img || '/assets/textures/earth.jpg';
    launching.value = true;
    setTimeout(() => {
        router.push(launchTarget);
        setTimeout(() => { launching.value = false; }, 600);
    }, 720);
}
function launchProjection() { launch('/planet-show', '/assets/textures/earth.jpg'); }

/* —— 首页迷你太阳系：点行星直接进入详情 —— */
const ORBIT = [
    { key: 'mercury', size: 96, spin: 7, delay: -0.6 },
    { key: 'venus', size: 132, spin: 10, delay: -2.1 },
    { key: 'earth', size: 168, spin: 13, delay: -4.3 },
    { key: 'mars', size: 204, spin: 17, delay: -7.8 },
    { key: 'jupiter', size: 262, spin: 26, delay: -15.2 },
    { key: 'saturn', size: 318, spin: 38, delay: -26.9 },
    { key: 'uranus', size: 374, spin: 52, delay: -43.3 },
    { key: 'neptune', size: 430, spin: 68, delay: -9.4 }
];
const planetName = k => {
    const p = planets.find(x => (x.englishName || '').toLowerCase() === k);
    return p ? p.name : k;
};
function enterPlanet(key) {
    launch('/detail/planet/' + key, '/assets/textures/' + key + '.jpg');
}
</script>

<template>
    <!-- ============ 顶部：新闻轮播 ============ -->
    <section class="hero-news" v-if="heroNews.length" @mouseenter="pauseHn" @mouseleave="resumeHn"
             @touchstart.passive="hnTouchStart" @touchend.passive="hnTouchEnd">
        <div class="hn-slides">
            <article v-for="(n, i) in heroNews" :key="n.id"
                     class="hn-slide" :class="{ active: i === hnIdx }"
                     :style="{ backgroundImage: 'url(' + n.img + ')' }">
                <div class="hn-mask"></div>
                <div class="hn-body">
                    <span class="hn-tag"><i class="fas fa-bolt"></i> {{ n.tag }}</span>
                    <h2>{{ n.title }}</h2>
                    <p>{{ n.summary }}</p>
                    <div class="hn-actions">
                        <router-link to="/news" class="btn btn-primary"><i class="fas fa-newspaper"></i> 查看全部新闻</router-link>
                        <a v-if="n.source_url" :href="n.source_url" target="_blank" rel="noopener" class="btn btn-ghost">
                            <i class="fas fa-arrow-up-right-from-square"></i> 官方原文
                        </a>
                    </div>
                </div>
            </article>
        </div>

        <button class="hn-arrow hn-left" @click="hnPrev" aria-label="上一条"><i class="fas fa-chevron-left"></i></button>
        <button class="hn-arrow hn-right" @click="hnNext" aria-label="下一条"><i class="fas fa-chevron-right"></i></button>

        <div class="hn-dots">
            <button v-for="(n, i) in heroNews" :key="n.id" class="hn-dot" :class="{ active: i === hnIdx }"
                    :aria-label="'第 ' + (i + 1) + ' 条'" @click="hnGo(i)"></button>
        </div>

        <!-- 自动播放进度条：切换时重置 -->
        <div class="hn-progress" v-if="heroNews.length > 1">
            <span :key="hnIdx" class="hn-progress-bar"></span>
        </div>

        <div class="hn-live"><span class="hn-live-dot"></span>实时新闻 · 共 {{ newsTotal }} 条</div>

        <a href="#stats" class="scroll-hint" aria-label="向下探索">
            <span>向下探索</span>
            <i class="fas fa-chevron-down"></i>
        </a>
    </section>

    <!-- ============ 宇宙数据条 ============ -->
    <section class="stats-strip" id="stats">
        <div class="container">
            <div class="hero-stats">
                <div class="hero-stat">
                    <div class="hero-stat-icon"><i class="fas fa-hourglass-half"></i></div>
                    <div class="hero-stat-value" v-count:亿年="138">0</div>
                    <div class="hero-stat-label">宇宙年龄</div>
                </div>
                <div class="hero-stat">
                    <div class="hero-stat-icon"><i class="fas fa-arrows-left-right"></i></div>
                    <div class="hero-stat-value" v-count:亿光年="930">0</div>
                    <div class="hero-stat-label">可观测宇宙直径</div>
                </div>
                <div class="hero-stat">
                    <div class="hero-stat-icon"><i class="fas fa-circle-nodes"></i></div>
                    <div class="hero-stat-value" v-count:万亿="2">0</div>
                    <div class="hero-stat-label">已知星系数量</div>
                </div>
                <div class="hero-stat">
                    <div class="hero-stat-icon"><i class="fas fa-globe"></i></div>
                    <div class="hero-stat-value" v-count="8">0</div>
                    <div class="hero-stat-label">太阳系行星</div>
                </div>
            </div>
        </div>
    </section>

    <!-- 互动星球入口 -->
    <section class="entry-orb-section">
        <div class="container">
            <div class="entry-inner">
                <div class="entry-left" v-reveal>
                    <span class="page-kicker">INTERACTIVE ENTRY</span>
                    <h2>点一下这颗星球<br>进入全息投影</h2>
                    <p>点击右侧的蓝色星球——它会旋转、放大、穿越，带你进入<b>星球投影</b>空间。在那里可以逐一点亮太阳系每一颗行星、星座、黑洞与深空天体，看它们的立体影像与详细资料，还能直接飞进 3D 宇宙亲自遨游。</p>
                    <button class="btn btn-primary" @click="launchProjection"><i class="fas fa-cube"></i> 进入星球投影</button>
                </div>
                <div class="entry-right">
                    <button class="entry-orb" :class="{ launching }" @click="launchProjection" aria-label="进入星球投影">
                        <span class="orb-ring"></span>
                        <span class="entry-hint"><i class="fas fa-hand-pointer"></i> 点击星球进入</span>
                    </button>
                </div>
            </div>
        </div>
    </section>

    <!-- 迷你太阳系入口：点行星直接进入 -->
    <section class="entry-solar-section">
        <div class="container">
            <div class="entry-inner solar-inner">
                <div class="entry-left" v-reveal>
                    <span class="page-kicker">SOLAR SYSTEM</span>
                    <h2>点一颗行星<br>直接飞过去</h2>
                    <p>这八颗星球正绕着太阳运行——每一秒都在动。点任意一颗，穿越进去看它的介绍：直径、距太阳、公转周期、卫星数量，还有真实的表面影像与科普视频。</p>
                    <div class="entry-actions">
                        <router-link to="/solar-system" class="btn btn-ghost"><i class="fas fa-sun"></i> 查看完整太阳系</router-link>
                    </div>
                </div>
                <div class="entry-right">
                    <div class="solar-stage">
                        <div class="solar-sun"></div>
                        <div v-for="p in ORBIT" :key="p.key" class="orbit"
                             :style="{ width: p.size + 'px', height: p.size + 'px', animationDuration: p.spin + 's', animationDelay: p.delay + 's' }">
                            <button class="orbit-planet" @click="enterPlanet(p.key)"
                                    :title="planetName(p.key)" :aria-label="planetName(p.key)"
                                    :style="{ backgroundImage: 'url(/assets/textures/' + p.key + '.jpg)' }"></button>
                        </div>
                    </div>
                    <div class="solar-legend">
                        <button v-for="p in ORBIT" :key="p.key" @click="enterPlanet(p.key)">{{ planetName(p.key) }}</button>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <section id="cta" class="cta-band">
        <div class="container">
            <div class="cta-inner" v-reveal>
                <h2>准备好开启你的宇宙之旅了吗？</h2>
                <p>从家门口的太阳系，到138亿光年外的宇宙边疆——宇宙探索网站为你准备了行星图鉴、深空美图、互动测验与宇宙编年史，就差一个好奇的你。</p>
                <div class="btn-row">
                    <router-link to="/community?tab=quiz" class="btn btn-gold"><i class="fas fa-trophy"></i> 开始知识测验</router-link>
                    <router-link to="/gallery" class="btn btn-ghost"><i class="fas fa-images"></i> 浏览星空图集</router-link>
                    <router-link to="/timeline" class="btn btn-ghost"><i class="fas fa-hourglass-half"></i> 穿越宇宙时间线</router-link>
                </div>
            </div>
        </div>
    </section>

    <!-- 穿越放大遮罩 -->
    <div v-if="launching" class="launch-overlay" :style="{ backgroundImage: 'url(' + launchImg + ')' }"></div>
</template>
