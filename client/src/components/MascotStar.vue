<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';

/**
 * 星语看板娘：纯 SVG 原创绘制（无第三方素材，避免版权问题）
 * - 待机动画：轻微浮动 + 周期眨眼 + 点击挥手
 * - 交互：点击弹出提示气泡，给一句使用建议；首次进入自动问候一次
 * - 无障碍：可键盘聚焦、aria-label、respect prefers-reduced-motion
 */
const props = defineProps({
    /** 尺寸（像素宽度），移动端可传更小值 */
    size: { type: Number, default: 132 },
    /** 首次进入是否自动打招呼 */
    autoGreet: { type: Boolean, default: true }
});

const TIPS = [
    '试试问我：今晚能看到什么星座？',
    '想知道月相适不适合观星？点我让我算给你看～',
    '预算 3000 想给孩子入门，问我怎么配望远镜！',
    '8000 拍深空？主镜和赤道仪我可以帮你算配比～',
    '问「80mm 和 130mm 口径差多少」，我直接给你算集光倍数',
    '想看三维的太阳系？说「带我去木星」就行',
    '儿童 / 业余 / 专业三种讲法，右上角随时切换哦'
];

const bubble = ref('');
const bubbleOpen = ref(false);
const waving = ref(false);
const tipIndex = ref(0);

let greetTimer = null;
let hideTimer = null;
let waveTimer = null;

const styleVars = computed(() => ({ '--mascot-size': props.size + 'px' }));

function pickTip() {
    tipIndex.value = (tipIndex.value + 1) % TIPS.length;
    return TIPS[tipIndex.value];
}

function showBubble(text, duration = 7000) {
    if (hideTimer) clearTimeout(hideTimer);
    bubble.value = text;
    bubbleOpen.value = true;
    if (duration > 0) {
        hideTimer = setTimeout(() => { bubbleOpen.value = false; }, duration);
    }
}

function waveOnce() {
    waving.value = true;
    if (waveTimer) clearTimeout(waveTimer);
    waveTimer = setTimeout(() => { waving.value = false; }, 1400);
}

function onMascotClick() {
    waveOnce();
    showBubble(pickTip(), 7000);
}

function closeBubble() {
    bubbleOpen.value = false;
    if (hideTimer) clearTimeout(hideTimer);
}

onMounted(() => {
    if (!props.autoGreet) return;
    let greeted = false;
    try { greeted = sessionStorage.getItem('mascot_greeted') === '1'; } catch (e) { /* 隐私模式 */ }
    if (greeted) return;
    greetTimer = setTimeout(() => {
        showBubble('你好呀，我是星语 ✨ 点我可以看小提示，也可以直接在下面提问～', 6500);
        try { sessionStorage.setItem('mascot_greeted', '1'); } catch (e) { /* 忽略 */ }
    }, 1200);
});

onBeforeUnmount(() => {
    if (greetTimer) clearTimeout(greetTimer);
    if (hideTimer) clearTimeout(hideTimer);
    if (waveTimer) clearTimeout(waveTimer);
});
</script>

<template>
    <div class="mascot" :style="styleVars">
        <!-- 提示气泡 -->
        <transition name="mascot-bubble">
            <div v-if="bubbleOpen" class="mascot-bubble" role="status">
                <button class="mb-close" aria-label="关闭提示" @click="closeBubble"><i class="fas fa-xmark"></i></button>
                <p>{{ bubble }}</p>
                <span class="mb-tail" aria-hidden="true"></span>
            </div>
        </transition>

        <!-- 角色本体（纯 SVG 原创） -->
        <button class="mascot-btn" :class="{ waving }" type="button"
                aria-label="星语看板娘，点击查看使用提示" @click="onMascotClick">
            <svg class="mascot-svg" viewBox="0 0 200 230" role="img" aria-hidden="true">
                <defs>
                    <linearGradient id="hairGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="#8fb8f7" />
                        <stop offset="55%" stop-color="#5c86d6" />
                        <stop offset="100%" stop-color="#3c5fa8" />
                    </linearGradient>
                    <linearGradient id="hairDark" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="#4f79c4" />
                        <stop offset="100%" stop-color="#2c4680" />
                    </linearGradient>
                    <linearGradient id="eyeGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="#2b4a8c" />
                        <stop offset="60%" stop-color="#4f7fd6" />
                        <stop offset="100%" stop-color="#9fd8f0" />
                    </linearGradient>
                    <linearGradient id="dressGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="#2b3a63" />
                        <stop offset="100%" stop-color="#171f3a" />
                    </linearGradient>
                    <radialGradient id="blushGrad" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stop-color="rgba(255,150,160,0.55)" />
                        <stop offset="100%" stop-color="rgba(255,150,160,0)" />
                    </radialGradient>
                    <radialGradient id="glowGrad" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stop-color="rgba(159,212,248,0.35)" />
                        <stop offset="100%" stop-color="rgba(159,212,248,0)" />
                    </radialGradient>
                </defs>

                <!-- 光晕 -->
                <circle cx="100" cy="120" r="86" fill="url(#glowGrad)" />

                <!-- 后发 -->
                <path d="M52 92 C48 40 76 24 100 24 C126 24 152 42 148 92
                         C156 130 150 168 138 196 C128 210 112 204 100 206
                         C88 204 72 210 62 196 C50 168 44 130 52 92 Z"
                      fill="url(#hairDark)" />

                <!-- 侧发 -->
                <path d="M54 96 C40 116 38 152 46 184 C52 196 62 198 66 188 C74 160 72 124 70 100 Z" fill="url(#hairGrad)" />
                <path d="M146 96 C160 116 162 152 154 184 C148 196 138 198 134 188 C126 160 128 124 130 100 Z" fill="url(#hairGrad)" />

                <!-- 脸 -->
                <ellipse cx="100" cy="112" rx="46" ry="44" fill="#ffe7d9" />
                <ellipse cx="56" cy="116" rx="7" ry="10" fill="#ffddcb" />
                <ellipse cx="144" cy="116" rx="7" ry="10" fill="#ffddcb" />

                <!-- 刘海 -->
                <path d="M53 100 C54 62 74 46 100 46 C126 46 146 62 147 100
                         C140 86 132 76 122 72 C126 84 124 94 120 100
                         C112 82 106 74 100 72 C94 74 88 82 80 100
                         C76 94 74 84 78 72 C68 76 60 86 53 100 Z"
                      fill="url(#hairGrad)" />
                <path d="M100 46 C96 30 104 20 112 16 C110 26 108 34 106 44 Z" fill="url(#hairGrad)" />

                <!-- 星星发饰 -->
                <g class="mascot-star" transform="translate(62 58)">
                    <path d="M0 -11 L3.2 -3.4 L11 -3.4 L4.8 1.6 L7.2 9.4 L0 4.6 L-7.2 9.4 L-4.8 1.6 L-11 -3.4 L-3.2 -3.4 Z"
                          fill="#f5d17a" stroke="#e8b84f" stroke-width="1.2" />
                </g>
                <!-- 发带蝴蝶结 -->
                <g transform="translate(140 78)">
                    <path d="M0 0 C-10 -8 -18 0 -10 8 C-6 11 -2 8 0 4 Z" fill="#9fd8f0" />
                    <path d="M0 0 C10 -8 18 0 10 8 C6 11 2 8 0 4 Z" fill="#9fd8f0" />
                    <circle cx="0" cy="3" r="3" fill="#e8f4ff" />
                </g>

                <!-- 眉毛 -->
                <path d="M72 92 C78 88 86 88 92 91" stroke="#5c86d6" stroke-width="2.4" fill="none" stroke-linecap="round" />
                <path d="M108 91 C114 88 122 88 128 92" stroke="#5c86d6" stroke-width="2.4" fill="none" stroke-linecap="round" />

                <!-- 眼睛 -->
                <g class="mascot-eyes">
                    <ellipse cx="82" cy="112" rx="12" ry="14" fill="#ffffff" />
                    <ellipse cx="118" cy="112" rx="12" ry="14" fill="#ffffff" />
                    <ellipse cx="82" cy="113" rx="9.5" ry="12" fill="url(#eyeGrad)" />
                    <ellipse cx="118" cy="113" rx="9.5" ry="12" fill="url(#eyeGrad)" />
                    <ellipse cx="82" cy="115" rx="5" ry="6.5" fill="#22315c" />
                    <ellipse cx="118" cy="115" rx="5" ry="6.5" fill="#22315c" />
                    <circle cx="78" cy="106" r="3.4" fill="#ffffff" />
                    <circle cx="114" cy="106" r="3.4" fill="#ffffff" />
                    <circle cx="86" cy="120" r="1.8" fill="#cfe0f8" opacity="0.9" />
                    <circle cx="122" cy="120" r="1.8" fill="#cfe0f8" opacity="0.9" />
                </g>

                <!-- 腮红 -->
                <ellipse cx="66" cy="124" rx="10" ry="6" fill="url(#blushGrad)" />
                <ellipse cx="134" cy="124" rx="10" ry="6" fill="url(#blushGrad)" />

                <!-- 嘴 -->
                <path d="M96 130 C99 134 101 134 104 130" stroke="#d9798a" stroke-width="2.2" fill="none" stroke-linecap="round" />

                <!-- 脖颈与衣服 -->
                <path d="M86 148 C92 156 108 156 114 148 L118 160 L82 160 Z" fill="#ffddcb" />
                <path d="M56 230 C56 190 74 168 100 168 C126 168 144 190 144 230 Z" fill="url(#dressGrad)" />
                <path d="M84 166 C92 176 108 176 116 166 C112 180 88 180 84 166 Z" fill="#eef4ff" />
                <g transform="translate(100 182)">
                    <path d="M0 0 C-12 -7 -20 2 -11 9 C-6 13 -2 9 0 5 Z" fill="#9fd8f0" />
                    <path d="M0 0 C12 -7 20 2 11 9 C6 13 2 9 0 5 Z" fill="#9fd8f0" />
                    <circle cx="0" cy="4" r="3.6" fill="#f5d17a" />
                </g>

                <!-- 望远镜徽章 -->
                <g transform="translate(100 208)" opacity="0.95">
                    <rect x="-14" y="-5" width="20" height="9" rx="3" fill="#9fb8e8" />
                    <rect x="4" y="-3.5" width="10" height="7" rx="2" fill="#7c9cf5" />
                    <circle cx="15" cy="0" r="3.2" fill="#cfe0f8" />
                </g>

                <!-- 挥手 -->
                <g class="mascot-hand">
                    <path d="M146 198 C160 190 172 182 178 170 C182 162 174 156 168 162 C162 170 152 180 142 186 Z" fill="url(#dressGrad)" />
                    <circle cx="180" cy="165" r="8" fill="#ffe7d9" />
                </g>

                <!-- 装饰星点 -->
                <g class="mascot-sparkles" fill="#cfe0f8">
                    <circle cx="34" cy="62" r="2.2" />
                    <circle cx="170" cy="52" r="1.8" />
                    <circle cx="26" cy="150" r="1.6" />
                    <circle cx="176" cy="132" r="2" />
                </g>
            </svg>
        </button>
    </div>
</template>

<style scoped>
.mascot {
    position: relative;
    width: var(--mascot-size, 132px);
    user-select: none;
    z-index: 25;
}

.mascot-btn {
    display: block;
    width: 100%;
    padding: 0;
    border: none;
    background: none;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    animation: mascotFloat 4.5s ease-in-out infinite;
}
.mascot-btn:focus-visible {
    outline: 2px solid var(--color-cyan);
    outline-offset: 6px;
    border-radius: 50%;
}

.mascot-svg {
    width: 100%;
    height: auto;
    display: block;
    filter: drop-shadow(0 10px 24px rgba(0, 0, 0, 0.45));
}

@keyframes mascotFloat {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-6px); }
}

.mascot-eyes { transform-origin: 100px 112px; animation: mascotBlink 5.2s infinite; }
@keyframes mascotBlink {
    0%, 92%, 100% { transform: scaleY(1); }
    94%, 96% { transform: scaleY(0.08); }
    98% { transform: scaleY(1); }
}

.mascot-star { transform-origin: 62px 58px; animation: mascotStarSpin 12s linear infinite; }
@keyframes mascotStarSpin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}

.mascot-btn.waving .mascot-hand { animation: mascotWave 0.7s ease-in-out 2; transform-origin: 148px 192px; }
@keyframes mascotWave {
    0%, 100% { transform: rotate(0deg); }
    50% { transform: rotate(-16deg); }
}

.mascot-sparkles { animation: mascotTwinkle 3.4s ease-in-out infinite; }
@keyframes mascotTwinkle {
    0%, 100% { opacity: 0.45; }
    50% { opacity: 1; }
}

/* 提示气泡 */
.mascot-bubble {
    position: absolute;
    right: calc(100% - 12px);
    top: 6%;
    width: max(190px, 11rem);
    max-width: 15rem;
    padding: 0.7rem 0.9rem;
    border-radius: 14px;
    background: rgba(10, 16, 32, 0.97);
    border: 1px solid rgba(159, 212, 248, 0.4);
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.55);
    font-size: 0.8rem;
    line-height: 1.7;
    color: #dfe8fb;
    z-index: 30;
}
.mascot-bubble p { margin: 0; padding-right: 1rem; }
.mb-close {
    position: absolute;
    top: 4px;
    right: 5px;
    width: 20px;
    height: 20px;
    border: none;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.08);
    color: #b9c8e6;
    font-size: 0.65rem;
    cursor: pointer;
}
.mb-close:hover { color: #fff; background: rgba(255, 255, 255, 0.18); }
.mb-tail {
    position: absolute;
    right: -6px;
    top: 26px;
    width: 12px;
    height: 12px;
    background: inherit;
    border-right: 1px solid rgba(159, 212, 248, 0.4);
    border-bottom: 1px solid rgba(159, 212, 248, 0.4);
    transform: rotate(-45deg);
    border-radius: 2px;
}

.mascot-bubble-enter-active, .mascot-bubble-leave-active { transition: opacity 0.22s ease, transform 0.22s ease; }
.mascot-bubble-enter-from, .mascot-bubble-leave-to { opacity: 0; transform: translateX(8px) scale(0.96); }

/* 移动端：更小、气泡贴右 */
@media (max-width: 768px) {
    .mascot { width: calc(var(--mascot-size, 132px) * 0.82); }
    .mascot-bubble {
        right: 0;
        left: auto;
        top: auto;
        bottom: calc(100% + 8px);
        width: min(70vw, 15rem);
    }
    .mb-tail { display: none; }
}

@media (prefers-reduced-motion: reduce) {
    .mascot-btn, .mascot-eyes, .mascot-star, .mascot-sparkles { animation: none !important; }
}
</style>
