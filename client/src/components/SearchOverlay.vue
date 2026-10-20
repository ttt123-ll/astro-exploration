<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { useUi } from '../store/ui';
import { navLinks } from '../data/site';
import planets from '../data/planets';
import constellations from '../data/constellations';
import content from '../data/content';
import timeline from '../data/timeline';
import gallery from '../data/gallery';

const router = useRouter();
const ui = useUi();
const query = ref('');
const sel = ref(0);
const inputEl = ref(null);

const index = computed(() => {
    const list = [];
    navLinks.forEach(n => list.push({ t: n.label, d: '栏目入口', c: '导航', p: n.path, i: 'fa-compass' }));
    planets.forEach(p => list.push({
        t: p.name, d: p.description || '', c: '行星', i: 'fa-circle',
        p: '/detail/planet/' + (p.englishName || '').toLowerCase()
    }));
    constellations.forEach(c => list.push({
        t: c.name, d: c.legend || '', c: '星座', i: 'fa-star',
        p: '/detail/constellation/' + (c.latinName || '').toLowerCase()
    }));
    Object.entries(content).forEach(([group, map]) => {
        Object.entries(map).forEach(([key, v]) => {
            list.push({ t: v.title, d: v.subtitle || '', c: groupLabel(group), i: groupIcon(group), p: '/detail/' + group + '/' + key });
        });
    });
    timeline.forEach(e => list.push({ t: e.title, d: e.desc, c: '时间线', i: 'fa-hourglass-half', p: '/timeline' }));
    gallery.forEach(g => list.push({ t: g.title, d: g.desc, c: '图集', i: 'fa-image', p: '/gallery' }));
    list.push({ t: '互动社区', d: '知识竞赛 · 留言板 · 实时排行榜', c: '专题', i: 'fa-trophy', p: '/community' });
    list.push({ t: '天文百科', d: '恒星与星系 · 黑洞科普', c: '专题', i: 'fa-book', p: '/encyclopedia' });
    return list;
});

const results = computed(() => {
    const q = query.value.trim().toLowerCase();
    if (!q) return [];
    return index.value.filter(x => (x.t + ' ' + x.d + ' ' + x.c).toLowerCase().includes(q)).slice(0, 12);
});

function groupLabel(g) {
    return { planet: '行星', star: '恒星', constellation: '星座', galaxy: '星系', blackhole: '黑洞', object: '深空', telescope: '望远镜' }[g] || '内容';
}
function groupIcon(g) {
    return { planet: 'fa-circle', star: 'fa-star', constellation: 'fa-star', galaxy: 'fa-wand-magic-sparkles', blackhole: 'fa-circle-dot', object: 'fa-image', telescope: 'fa-satellite' }[g] || 'fa-circle';
}

function open() {
    query.value = '';
    sel.value = 0;
    nextTick(() => inputEl.value && inputEl.value.focus());
}
function close() { ui.closeSearch(); }
function go(item) { close(); router.push(item.p); }

function onKey(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); sel.value = (sel.value + 1) % Math.max(results.value.length, 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); sel.value = (sel.value - 1 + Math.max(results.value.length, 1)) % Math.max(results.value.length, 1); }
    else if (e.key === 'Enter') { e.preventDefault(); if (results.value[sel.value]) go(results.value[sel.value]); }
    else if (e.key === 'Escape') { close(); }
}

watch(() => ui.searchOpen, (v) => { if (v) open(); });
onMounted(() => document.addEventListener('keydown', onKey));
onBeforeUnmount(() => document.removeEventListener('keydown', onKey));
</script>

<template>
    <div class="search-overlay" :class="{ active: ui.searchOpen }" @click.self="close()">
        <div class="search-panel">
            <div class="search-input-wrap">
                <i class="fas fa-magnifying-glass"></i>
                <input ref="inputEl" v-model="query" type="text" placeholder="搜索天文知识、行星、星系、星座…" autocomplete="off">
                <button type="button" class="search-clear" @click="query = ''" title="清空"><i class="fas fa-xmark"></i></button>
            </div>
            <div v-if="results.length" class="search-results">
                <div v-for="(r, idx) in results" :key="idx"
                     class="search-result-item" :class="{ selected: idx === sel }"
                     @click="go(r)" @mouseenter="sel = idx">
                    <div class="r-icon"><i class="fas" :class="r.i"></i></div>
                    <div class="search-result-body">
                        <div class="search-result-title">{{ r.t }}</div>
                        <div class="search-result-desc">{{ r.d }}</div>
                    </div>
                    <span class="search-result-cat">{{ r.c }}</span>
                </div>
            </div>
            <div v-else class="search-empty">
                <i class="fas fa-meteor"></i>
                {{ query ? '没有找到相关内容，换个关键词试试？' : '输入关键词开始探索（如：黑洞、土星、星座、韦伯）' }}
            </div>
            <div class="search-hints">
                <span><kbd>↑</kbd><kbd>↓</kbd> 选择</span>
                <span><kbd>Enter</kbd> 打开</span>
                <span><kbd>Esc</kbd> 关闭</span>
            </div>
        </div>
    </div>
</template>
