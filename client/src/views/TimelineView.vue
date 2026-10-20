<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import timeline from '../data/timeline';
import VideoSection from '../components/VideoSection.vue';
import PageNav from '../components/PageNav.vue';
import BookSection from '../components/BookSection.vue';
import PageHeader from '../components/PageHeader.vue';

const eras = [
    ['all', '全部事件', 'fa-infinity'],
    ['origin', '宇宙起源', 'fa-bolt'],
    ['galaxy', '星系与恒星', 'fa-wand-magic-sparkles'],
    ['solar', '太阳系与地球', 'fa-sun'],
    ['life', '生命演化', 'fa-dna'],
    ['future', '未来远景', 'fa-hourglass-end']
];
const eraNames = { origin: '宇宙起源', galaxy: '星系与恒星', solar: '太阳系与地球', life: '生命演化', future: '未来远景' };
const era = ref('all');
const list = computed(() => era.value === 'all' ? timeline : timeline.filter(e => e.era === era.value));
const tlPre = computed(() => timeline.slice(0, 8));
const expanded = ref({});
function toggle(i) { expanded.value[i] = !expanded.value[i]; }

/* —— 年代进度标尺：随滚动位置移动 —— */
const rulerPct = ref(0);
function updateRuler() {
    const el = document.getElementById('tl-full');
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const vh = window.innerHeight;
    const passed = vh * 0.55 - rect.top;          // 列表顶部进入视口 55% 处开始计数
    const total = rect.height + vh * 0.55;
    rulerPct.value = Math.min(100, Math.max(0, (passed / Math.max(total, 1)) * 100));
}
onMounted(() => {
    window.addEventListener('scroll', updateRuler, { passive: true });
    window.addEventListener('resize', updateRuler);
    updateRuler();
});
onBeforeUnmount(() => {
    window.removeEventListener('scroll', updateRuler);
    window.removeEventListener('resize', updateRuler);
});
</script>

<template>
    <div class="container">
        <PageNav title="宇宙时间线" />
        <PageHeader kicker="COSMIC CHRONICLE" title="宇宙时间线" icon="fa-hourglass-half" deco="orbit" :stats="[{ v: String(timeline.length), l: '关键节点' }, { v: '138 亿年', l: '时间跨度' }]" subtitle="从138亿年前的大爆炸，到遥远未来的热寂——点击事件可展开更多细节。" />

        <!-- 宇宙编年史：八个关键瞬间（横向滑动） -->
        <section class="timeline-strip">
            <div class="section-head">
                <h2 class="section-title"><span class="title-icon"><i class="fas fa-hourglass-half"></i></span>宇宙编年史</h2>
                <p class="section-subtitle">138亿年浓缩成八个瞬间（左右滑动查看更多）</p>
            </div>
            <div class="tl-strip">
                <div class="tl-strip-track">
                    <a v-for="e in tlPre" :key="e.time" href="#tl-full" class="tl-card">
                        <div class="tl-year">{{ e.time }}</div>
                        <div class="tl-title">{{ e.title }}</div>
                        <div class="tl-desc">{{ e.desc }}</div>
                    </a>
                </div>
            </div>
        </section>

        <div class="cosmic-calendar" v-reveal>
            <div class="cal-icon"><i class="fas fa-calendar-days"></i></div>
            <p><strong>宇宙年历：</strong>如果把138亿年的宇宙历史压缩成一年，那么大爆炸发生在1月1日0点，银河系在3月成形，太阳系9月诞生，恐龙在12月30日灭绝，而全部人类文明只出现在12月31日晚上11点59分的最后几十秒。</p>
        </div>

        <div class="era-filters">
            <button v-for="[k, label, icon] in eras" :key="k" class="era-chip" :class="{ active: era === k }" @click="era = k">
                <i class="fas" :class="icon"></i> {{ label }}
            </button>
        </div>

        <!-- 年代进度标尺：随滚动前进 -->
        <div class="tl-ruler" v-show="list.length > 1">
            <div class="tl-ruler-track">
                <span class="tl-ruler-fill" :style="{ width: rulerPct + '%' }"></span>
                <span class="tl-ruler-head" :style="{ left: rulerPct + '%' }"></span>
            </div>
            <div class="tl-ruler-labels">
                <span>大爆炸</span>
                <span>第一批恒星</span>
                <span>太阳系诞生</span>
                <span>生命出现</span>
                <span>今天</span>
                <span>未来</span>
            </div>
        </div>

        <div class="universe-timeline" id="tl-full">
            <div v-for="(e, i) in list" :key="i" class="u-event"
                 :class="['era-' + e.era, { future: e.future, expanded: expanded[i] }]" v-reveal>
                <div class="u-dot"></div>
                <div class="u-event-card">
                    <div class="u-head">
                        <span class="u-time">{{ e.time }}</span>
                        <span class="u-tag" :class="'era-' + e.era">{{ eraNames[e.era] }}</span>
                    </div>
                    <div class="u-title"><i class="fas" :class="e.icon" style="color:var(--color-accent);margin-right:0.5rem;"></i>{{ e.title }}</div>
                    <p class="u-desc">{{ e.desc }}</p>
                    <button class="u-more" @click="toggle(i)"><span>{{ expanded[i] ? '收起详情' : '展开详情' }}</span> <i class="fas fa-chevron-down"></i></button>
                    <div class="u-detail" v-if="e.detail">{{ e.detail }}</div>
                </div>
            </div>
        </div>

        <VideoSection topic="timeline" title="宇宙与望远镜科普视频" />
        <BookSection topic="timeline" />
    </div>
</template>
