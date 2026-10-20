<script setup>
/**
 * 主题书单区块
 * 用法：<BookSection topic="solar" />
 *      <BookSection topic="constellations" title="自定义标题" :limit="3" />
 */
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import books from '../data/books';
import { PAGE_BOOKS, getBooks } from '../data/pageBooks';

const props = defineProps({
    topic: { type: String, required: true },
    title: { type: String, default: '' },
    desc: { type: String, default: '' },
    limit: { type: Number, default: 0 }
});

const conf = computed(() => PAGE_BOOKS[props.topic] || { title: '延伸阅读', desc: '', books: [] });
const list = computed(() => {
    const all = getBooks(books, conf.value.books);
    return props.limit > 0 ? all.slice(0, props.limit) : all;
});
const heading = computed(() => props.title || conf.value.title);
const subtitle = computed(() => props.desc || conf.value.desc);

/* 横向滚动：箭头 / 拖拽 / 滚轮 */
const trackRef = ref(null);
const scrollable = ref(false);

// 内容不足一屏时隐藏左右箭头，避免点了没反应
function updateScrollable() {
    const el = trackRef.value;
    scrollable.value = !!el && el.scrollWidth > el.clientWidth + 4;
}
function onResize() { updateScrollable(); }

function scroll(dir) {
    const el = trackRef.value;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(220, el.clientWidth * 0.7), behavior: 'smooth' });
}
function onWheel(e) {
    const el = trackRef.value;
    if (!el) return;
    if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
    const atStart = el.scrollLeft <= 0 && e.deltaY < 0;
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1 && e.deltaY > 0;
    if (atStart || atEnd) return;
    e.preventDefault();
    el.scrollLeft += e.deltaY;
}
let dragging = false, startX = 0, startLeft = 0;
function dragStart(e) {
    const el = trackRef.value;
    if (!el) return;
    dragging = true; startX = e.pageX; startLeft = el.scrollLeft;
    el.classList.add('dragging');
}
function dragMove(e) {
    const el = trackRef.value;
    if (!dragging || !el) return;
    el.scrollLeft = startLeft - (e.pageX - startX);
}
function dragEnd() {
    const el = trackRef.value;
    if (!el) return;
    dragging = false; el.classList.remove('dragging');
}
onMounted(() => {
    const el = trackRef.value;
    if (el) el.addEventListener('wheel', onWheel, { passive: false });
    updateScrollable();
    window.addEventListener('resize', onResize);
    // 字体/图片加载后布局可能变化，稍后再测一次
    setTimeout(updateScrollable, 300);
});
onBeforeUnmount(() => {
    const el = trackRef.value;
    if (el) el.removeEventListener('wheel', onWheel);
    window.removeEventListener('resize', onResize);
});
</script>

<template>
    <section v-if="list.length" class="books-strip book-section">
        <div class="section-head">
            <h2 class="section-title">
                <span class="title-icon"><i class="fas fa-book-open"></i></span>{{ heading }}
            </h2>
            <p class="section-subtitle">{{ subtitle }}</p>
        </div>
        <div class="books-wrap">
            <button v-if="scrollable" class="books-arrow prev" @click="scroll(-1)" aria-label="上一本"><i class="fas fa-chevron-left"></i></button>
            <div class="books-track" ref="trackRef"
                 @mousedown="dragStart" @mousemove="dragMove" @mouseup="dragEnd" @mouseleave="dragEnd">
                <div v-for="b in list" :key="b.id" class="book-card">
                    <div class="book-cover" :style="{ background: 'linear-gradient(160deg,' + b.color + ',#101320)', color: '#fff' }">{{ b.icon }}</div>
                    <h4>{{ b.title }}</h4>
                    <div class="book-author">{{ b.author }}</div>
                    <div class="book-en">{{ b.en }}</div>
                    <p class="book-intro">{{ b.intro }}</p>
                </div>
            </div>
            <button v-if="scrollable" class="books-arrow next" @click="scroll(1)" aria-label="下一本"><i class="fas fa-chevron-right"></i></button>
        </div>
    </section>
</template>

<style scoped>
/* 只补充布局间距，卡片样式复用全局 .books-strip / .book-card */
.book-section { margin-top: 3.2rem; }
</style>
