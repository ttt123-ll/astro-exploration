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
    limit: { type: Number, default: 3 }
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
            <span class="books-count">精选 {{ list.length }} 本</span>
        </div>
        <div class="books-wrap">
            <button v-if="scrollable" class="books-arrow prev" @click="scroll(-1)" aria-label="上一本"><i class="fas fa-chevron-left"></i></button>
            <div class="books-track" ref="trackRef"
                 @mousedown="dragStart" @mousemove="dragMove" @mouseup="dragEnd" @mouseleave="dragEnd">
                <div v-for="(b, bi) in list" :key="b.id" class="book-card">
                    <span class="book-idx">0{{ bi + 1 }}</span>
                    <!-- 排版式书封：竖排书名 + 作者 + 装饰线，更接近真实书籍 -->
                    <div class="book-cover" :style="{ '--bc-color': b.color }">
                        <span class="bc-topline"></span>
                        <span class="bc-title">{{ b.title }}</span>
                        <span class="bc-author">{{ b.author }}</span>
                        <span class="bc-mark">{{ b.icon }}</span>
                        <span class="bc-botline"></span>
                    </div>
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

/* 精选数量标签 */
.books-count {
    margin-left: auto;
    font-size: 0.72rem;
    color: var(--color-cyan);
    border: 1px solid rgba(159, 212, 248, 0.3);
    background: rgba(159, 212, 248, 0.08);
    padding: 0.12rem 0.6rem;
    border-radius: 50px;
    white-space: nowrap;
}

/* 卡片层次与编号 */
.book-card {
    position: relative;
    transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;
}
.book-card:hover {
    transform: translateY(-6px);
    box-shadow: 0 18px 40px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(159, 212, 248, 0.28);
}
.book-idx {
    position: absolute;
    top: 8px;
    right: 10px;
    z-index: 2;
    font-family: var(--font-title);
    font-size: 0.72rem;
    letter-spacing: 0.06em;
    color: rgba(207, 224, 248, 0.75);
    background: rgba(6, 10, 20, 0.55);
    border: 1px solid rgba(159, 212, 248, 0.22);
    border-radius: 50px;
    padding: 0.05rem 0.42rem;
}
.book-intro {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

/* —— 排版式书封 —— */
.book-cover {
    height: 132px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.35rem;
    padding: 0.7rem 0.4rem;
    background:
        linear-gradient(150deg, color-mix(in srgb, var(--bc-color, #8b7ec8) 68%, #0a0d18), #0b0f1c 92%);
    border: 1px solid color-mix(in srgb, var(--bc-color, #8b7ec8) 45%, transparent);
    box-shadow: inset 0 0 30px rgba(0, 0, 0, 0.45);
    overflow: hidden;
}

/* 书脊阴影 */
.book-cover::after {
    left: 8px;
    width: 4px;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.32), rgba(255, 255, 255, 0.05));
    box-shadow: 1px 0 8px rgba(0, 0, 0, 0.55);
}

.bc-title {
    writing-mode: vertical-rl;
    text-orientation: upright;
    font-family: var(--font-title);
    font-size: 0.92rem;
    letter-spacing: 0.16em;
    color: #f5f7ff;
    text-shadow: 0 2px 12px rgba(0, 0, 0, 0.75);
    max-height: 92px;
    overflow: hidden;
}

.bc-author {
    writing-mode: vertical-rl;
    font-size: 0.62rem;
    letter-spacing: 0.12em;
    color: rgba(240, 244, 255, 0.72);
    max-height: 66px;
    overflow: hidden;
}

.bc-topline,
.bc-botline {
    position: absolute;
    left: 22%;
    right: 12%;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.55), transparent);
}

.bc-topline { top: 9px; }
.bc-botline { bottom: 9px; }

.bc-mark {
    position: absolute;
    right: 10px;
    bottom: 10px;
    font-size: 1rem;
    opacity: 0.42;
    filter: drop-shadow(0 0 6px rgba(255, 255, 255, 0.4));
}

.book-card:hover .book-cover {
    border-color: color-mix(in srgb, var(--bc-color, #8b7ec8) 80%, transparent);
    box-shadow: inset 0 0 30px rgba(0, 0, 0, 0.35), 0 12px 26px color-mix(in srgb, var(--bc-color, #8b7ec8) 34%, transparent);
}

.book-card:hover .book-cover::after {
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.55), rgba(255, 255, 255, 0.1));
}
</style>
