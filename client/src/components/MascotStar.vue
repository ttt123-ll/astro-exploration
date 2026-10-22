<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';

/**
 * 星语看板娘 v2：纯 SVG 原创绘制（无第三方素材）
 * 画风：Q 版动漫比例 + 线稿描边 + 赛璐璐阴影 + 蕾丝头饰
 * 动画：呼吸浮动、周期眨眼、星星转动、点击挥手
 */
const props = defineProps({
    size: { type: Number, default: 128 },
    autoGreet: { type: Boolean, default: true },
    /** 立绘图片地址：存在则用图片模式（由 AI 绘图生成后置入 public/assets/mascot/） */
    imageSrc: { type: String, default: '/assets/mascot/star-girl.png' }
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

const artReady = ref(false);
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
    if (duration > 0) hideTimer = setTimeout(() => { bubbleOpen.value = false; }, duration);
}
function waveOnce() {
    waving.value = true;
    if (waveTimer) clearTimeout(waveTimer);
    waveTimer = setTimeout(() => { waving.value = false; }, 1500);
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
    // 预加载立绘：成功则用图片，失败则保持 SVG，不会出现白屏
    if (props.imageSrc) {
        const img = new Image();
        img.onload = () => { artReady.value = true; };
        img.onerror = () => { artReady.value = false; };
        img.src = props.imageSrc;
    }
    if (!props.autoGreet) return;
    let greeted = false;
    try { greeted = sessionStorage.getItem('mascot_greeted') === '1'; } catch (e) { /* 隐私模式 */ }
    if (greeted) return;
    greetTimer = setTimeout(() => {
        showBubble('你好呀，我是星语 ✨ 点我看小提示，也可以直接在下面提问～', 6500);
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
        <transition name="mascot-bubble">
            <div v-if="bubbleOpen" class="mascot-bubble" role="status">
                <button class="mb-close" aria-label="关闭提示" @click="closeBubble"><i class="fas fa-xmark"></i></button>
                <p>{{ bubble }}</p>
                <span class="mb-tail" aria-hidden="true"></span>
            </div>
        </transition>

        <button class="mascot-btn" :class="{ waving }" type="button"
                aria-label="星语看板娘，点击查看使用提示" @click="onMascotClick">
            <!-- 立绘模式：由 AI 绘图生成后放入 public/assets/mascot/star-girl.png 即自动启用 -->
            <img v-if="artReady" class="mascot-img" :src="imageSrc" alt="星语看板娘" draggable="false">
            <svg v-else class="mascot-svg" viewBox="0 0 240 300" role="img" aria-hidden="true">
                <defs>
                    <!-- 发色：顶部亮青蓝 → 深蓝 -->
                    <linearGradient id="hairTop" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="#a8cbff" />
                        <stop offset="42%" stop-color="#6f9be0" />
                        <stop offset="100%" stop-color="#3d5f9f" />
                    </linearGradient>
                    <linearGradient id="hairBack" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="#527bc0" />
                        <stop offset="100%" stop-color="#263a66" />
                    </linearGradient>
                    <linearGradient id="hairTail" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="#7ba6e8" />
                        <stop offset="100%" stop-color="#33517f" />
                    </linearGradient>
                    <!-- 皮肤 -->
                    <radialGradient id="skin" cx="42%" cy="34%" r="72%">
                        <stop offset="0%" stop-color="#fff4ea" />
                        <stop offset="65%" stop-color="#ffe4d4" />
                        <stop offset="100%" stop-color="#f8cdba" />
                    </radialGradient>
                    <!-- 眼睛 -->
                    <linearGradient id="iris" x1="0" y1="0" x2="0.2" y2="1">
                        <stop offset="0%" stop-color="#22406f" />
                        <stop offset="45%" stop-color="#3f74c8" />
                        <stop offset="80%" stop-color="#7fc4ef" />
                        <stop offset="100%" stop-color="#d6f2ff" />
                    </linearGradient>
                    <!-- 衣服 -->
                    <linearGradient id="dress" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="#39496f" />
                        <stop offset="55%" stop-color="#222f52" />
                        <stop offset="100%" stop-color="#141c33" />
                    </linearGradient>
                    <linearGradient id="frill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="#ffffff" />
                        <stop offset="100%" stop-color="#dbe4f7" />
                    </linearGradient>
                    <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="#ffe9a8" />
                        <stop offset="55%" stop-color="#f3c95c" />
                        <stop offset="100%" stop-color="#d9a334" />
                    </linearGradient>
                    <radialGradient id="blush" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stop-color="#ff8ea0" stop-opacity="0.5" />
                        <stop offset="100%" stop-color="#ff8ea0" stop-opacity="0" />
                    </radialGradient>
                    <radialGradient id="glow" cx="50%" cy="46%" r="52%">
                        <stop offset="0%" stop-color="#9fd8f0" stop-opacity="0.32" />
                        <stop offset="70%" stop-color="#7c9cf5" stop-opacity="0.1" />
                        <stop offset="100%" stop-color="#7c9cf5" stop-opacity="0" />
                    </radialGradient>
                    <filter id="softShadow" x="-30%" y="-30%" width="160%" height="160%">
                        <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#0b1020" flood-opacity="0.28" />
                    </filter>
                </defs>

                <!-- 背景光晕 -->
                <circle cx="120" cy="150" r="128" fill="url(#glow)" />

                <!-- ===== 后方双马尾 ===== -->
                <g stroke="#25345c" stroke-width="2.4" stroke-linejoin="round">
                    <path d="M62 120 C36 152 30 208 46 252 C54 272 70 278 80 264 C92 246 92 196 88 160 Z"
                          fill="url(#hairTail)" />
                    <path d="M178 120 C204 152 210 208 194 252 C186 272 170 278 160 264 C148 246 148 196 152 160 Z"
                          fill="url(#hairTail)" />
                </g>
                <!-- 马尾高光 -->
                <path d="M58 140 C46 176 46 220 58 246" stroke="#b9d8ff" stroke-width="5" fill="none"
                      stroke-linecap="round" opacity="0.5" />
                <path d="M182 140 C194 176 194 220 182 246" stroke="#b9d8ff" stroke-width="5" fill="none"
                      stroke-linecap="round" opacity="0.5" />

                <!-- ===== 后发底座 ===== -->
                <path d="M66 108 C64 52 92 28 120 28 C148 28 176 52 174 108
                         C180 140 172 168 160 182 L80 182 C68 168 60 140 66 108 Z"
                      fill="url(#hairBack)" stroke="#25345c" stroke-width="2.6" stroke-linejoin="round" />

                <!-- ===== 身体：肩膀与连衣裙 ===== -->
                <g stroke="#1d2946" stroke-width="2.4" stroke-linejoin="round">
                    <path d="M120 186 L120 200" stroke="#e8b7a4" stroke-width="16" stroke-linecap="round" />
                    <path d="M74 300 C74 244 94 208 120 208 C146 208 166 244 166 300 Z" fill="url(#dress)" />
                    <!-- 袖子 -->
                    <path d="M74 236 C58 242 50 262 54 282 C58 296 74 298 80 286 C88 270 86 246 82 234 Z" fill="url(#dress)" />
                    <path d="M166 236 C182 242 190 262 186 282 C182 296 166 298 160 286 C152 270 154 246 158 234 Z" fill="url(#dress)" />
                </g>
                <!-- 领口白边 -->
                <path d="M100 206 C108 218 132 218 140 206 C137 224 103 224 100 206 Z"
                      fill="url(#frill)" stroke="#b9c6e2" stroke-width="1.8" />
                <!-- 领结 -->
                <g transform="translate(120 226)" stroke="#1d2946" stroke-width="1.8">
                    <path d="M0 0 C-16 -10 -28 2 -15 12 C-7 17 -2 12 0 6 Z" fill="#8fd0ec" />
                    <path d="M0 0 C16 -10 28 2 15 12 C7 17 2 12 0 6 Z" fill="#8fd0ec" />
                    <circle cx="0" cy="5" r="5" fill="url(#gold)" />
                </g>

                <!-- ===== 脸 ===== -->
                <path d="M74 104 C74 64 94 46 120 46 C146 46 166 64 166 104
                         C166 138 146 166 120 166 C94 166 74 138 74 104 Z"
                      fill="url(#skin)" stroke="#e5b3a0" stroke-width="2" stroke-linejoin="round" />
                <!-- 耳朵 -->
                <ellipse cx="72" cy="112" rx="9" ry="13" fill="#ffe0cf" stroke="#e5b3a0" stroke-width="2" />
                <ellipse cx="168" cy="112" rx="9" ry="13" fill="#ffe0cf" stroke="#e5b3a0" stroke-width="2" />

                <!-- 下巴阴影 -->
                <path d="M92 138 C102 152 138 152 148 138 C142 160 98 160 92 138 Z" fill="#f6c7b4" opacity="0.7" />

                <!-- ===== 刘海 ===== -->
                <g fill="url(#hairTop)" stroke="#25345c" stroke-width="2.6" stroke-linejoin="round">
                    <!-- 左侧长刘海 -->
                    <path d="M70 112 C66 76 82 50 104 42 C96 62 92 84 94 104
                             C88 100 84 108 86 122 C80 128 74 124 70 112 Z" />
                    <!-- 中间刘海 -->
                    <path d="M100 44 C112 36 128 36 140 44 C134 62 130 80 132 98
                             C126 94 122 84 120 70 C118 84 114 92 108 98
                             C110 80 106 62 100 44 Z" />
                    <!-- 右侧长刘海 -->
                    <path d="M146 46 C168 56 176 78 172 112 C168 124 162 128 156 122
                             C158 108 154 100 148 104 C150 84 150 64 146 46 Z" />
                </g>
                <!-- 发丝高光 -->
                <g stroke="#d6ecff" fill="none" stroke-linecap="round" opacity="0.75">
                    <path d="M86 84 C86 70 92 58 102 50" stroke-width="4" />
                    <path d="M140 52 C150 60 156 74 156 88" stroke-width="3.4" />
                    <path d="M112 46 C118 42 126 42 132 46" stroke-width="3" />
                </g>
                <!-- 呆毛 -->
                <path d="M120 40 C116 20 128 8 142 6 C134 18 130 30 130 42 Z"
                      fill="url(#hairTop)" stroke="#25345c" stroke-width="2.4" stroke-linejoin="round" />

                <!-- ===== 蕾丝头饰（女仆发带） ===== -->
                <path d="M78 66 C96 46 144 46 162 66" stroke="#e7eefc" stroke-width="12" fill="none" stroke-linecap="round" />
                <path d="M78 66 C96 46 144 46 162 66" stroke="#c3cfe6" stroke-width="12" fill="none"
                      stroke-linecap="round" stroke-dasharray="1 9" opacity="0.9" />
                <!-- 荷叶边 -->
                <g fill="url(#frill)" stroke="#c3cfe6" stroke-width="1.6">
                    <circle cx="86" cy="58" r="8" />
                    <circle cx="106" cy="50" r="8.6" />
                    <circle cx="128" cy="49" r="8.6" />
                    <circle cx="150" cy="57" r="8" />
                </g>

                <!-- ===== 星星发饰（左） ===== -->
                <g class="mascot-star" transform="translate(78 88) rotate(-12)">
                    <path class="mascot-star-shape"
                          d="M0 -15 L4.4 -4.6 L15 -4.6 L6.6 2.2 L9.8 12.8 L0 6.4 L-9.8 12.8 L-6.6 2.2 L-15 -4.6 L-4.4 -4.6 Z"
                          fill="url(#gold)" stroke="#b8842a" stroke-width="1.8" stroke-linejoin="round" />
                    <circle cx="-3" cy="-4" r="2.2" fill="#fff6d8" opacity="0.9" />
                </g>
                <!-- 蝴蝶结（右） -->
                <g transform="translate(166 96)" stroke="#1d2946" stroke-width="1.8">
                    <path d="M0 0 C-14 -9 -24 2 -13 11 C-6 15 -2 11 0 5 Z" fill="#9fd8f0" />
                    <path d="M0 0 C14 -9 24 2 13 11 C6 15 2 11 0 5 Z" fill="#9fd8f0" />
                    <circle cx="0" cy="5" r="4.6" fill="url(#gold)" />
                </g>

                <!-- ===== 眉毛 ===== -->
                <g stroke="#4b6da8" stroke-width="3" fill="none" stroke-linecap="round">
                    <path d="M88 108 C94 102 104 102 110 106" />
                    <path d="M130 106 C136 102 146 102 152 108" />
                </g>

                <!-- ===== 大眼睛 ===== -->
                <g class="mascot-eyes">
                    <!-- 眼白 -->
                    <ellipse cx="100" cy="130" rx="17" ry="20" fill="#ffffff" stroke="#3a4a72" stroke-width="1.6" />
                    <ellipse cx="140" cy="130" rx="17" ry="20" fill="#ffffff" stroke="#3a4a72" stroke-width="1.6" />
                    <!-- 虹膜 -->
                    <ellipse cx="100" cy="132" rx="13.5" ry="17" fill="url(#iris)" />
                    <ellipse cx="140" cy="132" rx="13.5" ry="17" fill="url(#iris)" />
                    <!-- 瞳孔 -->
                    <ellipse cx="100" cy="134" rx="6.6" ry="8.6" fill="#16223f" />
                    <ellipse cx="140" cy="134" rx="6.6" ry="8.6" fill="#16223f" />
                    <!-- 虹膜下缘亮光 -->
                    <path d="M92 140 C96 148 104 148 108 140 C104 144 96 144 92 140 Z" fill="#eaf8ff" opacity="0.85" />
                    <path d="M132 140 C136 148 144 148 148 140 C144 144 136 144 132 140 Z" fill="#eaf8ff" opacity="0.85" />
                    <!-- 高光 -->
                    <circle cx="94" cy="122" r="5.2" fill="#ffffff" />
                    <circle cx="134" cy="122" r="5.2" fill="#ffffff" />
                    <circle cx="106" cy="143" r="2.4" fill="#ffffff" opacity="0.9" />
                    <circle cx="146" cy="143" r="2.4" fill="#ffffff" opacity="0.9" />
                    <!-- 上睫毛 -->
                    <path d="M83 118 C90 106 110 106 117 118" stroke="#2b3a63" stroke-width="3.4" fill="none" stroke-linecap="round" />
                    <path d="M123 118 C130 106 150 106 157 118" stroke="#2b3a63" stroke-width="3.4" fill="none" stroke-linecap="round" />
                    <!-- 外眼角睫毛 -->
                    <path d="M82 116 L76 111" stroke="#2b3a63" stroke-width="2.6" stroke-linecap="round" />
                    <path d="M158 116 L164 111" stroke="#2b3a63" stroke-width="2.6" stroke-linecap="round" />
                    <!-- 下睫毛 -->
                    <path d="M88 148 C92 152 98 153 104 151" stroke="#6d7fa8" stroke-width="1.8" fill="none" stroke-linecap="round" />
                    <path d="M136 151 C142 153 148 152 152 148" stroke="#6d7fa8" stroke-width="1.8" fill="none" stroke-linecap="round" />
                </g>

                <!-- ===== 鼻子 / 嘴 / 腮红 ===== -->
                <path d="M119 142 C120 144 122 144 123 142" stroke="#e0a493" stroke-width="2" fill="none" stroke-linecap="round" />
                <path d="M110 152 C115 159 125 159 130 152" stroke="#d9708a" stroke-width="2.8" fill="none" stroke-linecap="round" />
                <ellipse cx="82" cy="144" rx="14" ry="8" fill="url(#blush)" />
                <ellipse cx="158" cy="144" rx="14" ry="8" fill="url(#blush)" />

                <!-- ===== 举起的小手（点击挥手） ===== -->
                <g class="mascot-hand">
                    <path d="M64 250 C52 236 48 216 56 202 C60 194 70 196 72 206 C74 218 74 232 78 242 Z"
                          fill="url(#dress)" stroke="#1d2946" stroke-width="2" stroke-linejoin="round" />
                    <circle cx="58" cy="198" r="10" fill="url(#skin)" stroke="#e5b3a0" stroke-width="2" />
                </g>

                <!-- ===== 装饰星点 ===== -->
                <g class="mascot-sparkles" fill="#cfe0f8">
                    <path d="M40 150 l2.4 5.6 5.6 2.4 -5.6 2.4 -2.4 5.6 -2.4 -5.6 -5.6 -2.4 5.6 -2.4 Z" opacity="0.9" />
                    <circle cx="204" cy="120" r="2.6" />
                    <circle cx="34" cy="96" r="2" />
                    <circle cx="200" cy="196" r="2.2" />
                </g>
            </svg>
        </button>
    </div>
</template>

<style scoped>
.mascot {
    position: relative;
    width: var(--mascot-size, 128px);
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
    animation: mascotFloat 4.8s ease-in-out infinite;
    transform-origin: 50% 90%;
}
.mascot-btn:focus-visible {
    outline: 2px solid var(--color-cyan);
    outline-offset: 6px;
    border-radius: 40%;
}
.mascot-svg {
    width: 100%;
    height: auto;
    display: block;
    filter: drop-shadow(0 12px 26px rgba(0, 0, 0, 0.45));
}

/* 立绘模式 */
.mascot-img {
    width: 100%;
    height: auto;
    display: block;
    object-fit: contain;
    -webkit-user-drag: none;
    filter: drop-shadow(0 12px 26px rgba(0, 0, 0, 0.5));
    transition: transform 0.25s ease;
}
.mascot-btn:hover .mascot-img { transform: scale(1.03); }
.mascot-btn.waving .mascot-img { animation: mascotImgWave 0.75s ease-in-out 2; }
@keyframes mascotImgWave {
    0%, 100% { transform: rotate(0deg) translateY(0); }
    50% { transform: rotate(-3deg) translateY(-4px); }
}

/* 呼吸浮动 */
@keyframes mascotFloat {
    0%, 100% { transform: translateY(0) scale(1); }
    50% { transform: translateY(-5px) scale(1.012); }
}

/* 眨眼 */
.mascot-eyes { transform-origin: 120px 130px; animation: mascotBlink 5.4s infinite; }
@keyframes mascotBlink {
    0%, 91%, 100% { transform: scaleY(1); }
    93%, 96% { transform: scaleY(0.06); }
    98% { transform: scaleY(1); }
}

/* 星星缓慢转动 + 微光 */
.mascot-star { transform-box: fill-box; transform-origin: center; animation: mascotStarSpin 14s linear infinite; }
@keyframes mascotStarSpin {
    from { transform: rotate(-12deg); }
    to { transform: rotate(348deg); }
}
.mascot-star-shape { animation: mascotStarGlow 3.2s ease-in-out infinite; }
@keyframes mascotStarGlow {
    0%, 100% { filter: drop-shadow(0 0 0 rgba(255, 220, 130, 0)); }
    50% { filter: drop-shadow(0 0 6px rgba(255, 220, 130, 0.9)); }
}

/* 点击挥手 */
.mascot-btn.waving .mascot-hand { animation: mascotWave 0.72s ease-in-out 2; transform-box: fill-box; transform-origin: 30% 90%; }
@keyframes mascotWave {
    0%, 100% { transform: rotate(0deg); }
    50% { transform: rotate(-18deg); }
}

/* 星点闪烁 */
.mascot-sparkles { animation: mascotTwinkle 3.6s ease-in-out infinite; }
@keyframes mascotTwinkle {
    0%, 100% { opacity: 0.4; }
    50% { opacity: 1; }
}

/* 气泡 */
.mascot-bubble {
    position: absolute;
    right: calc(100% - 6px);
    top: 2%;
    width: max(200px, 11.5rem);
    max-width: 15rem;
    padding: 0.7rem 0.95rem;
    border-radius: 16px;
    background: rgba(10, 16, 32, 0.97);
    border: 1px solid rgba(159, 212, 248, 0.42);
    box-shadow: 0 18px 44px rgba(0, 0, 0, 0.6);
    font-size: 0.8rem;
    line-height: 1.7;
    color: #dfe8fb;
    z-index: 30;
}
.mascot-bubble p { margin: 0; padding-right: 1rem; }
.mb-close {
    position: absolute; top: 4px; right: 5px;
    width: 20px; height: 20px; border: none; border-radius: 50%;
    background: rgba(255, 255, 255, 0.08); color: #b9c8e6;
    font-size: 0.65rem; cursor: pointer;
}
.mb-close:hover { color: #fff; background: rgba(255, 255, 255, 0.18); }
.mb-tail {
    position: absolute; right: -6px; top: 24px;
    width: 12px; height: 12px; background: inherit;
    border-right: 1px solid rgba(159, 212, 248, 0.42);
    border-bottom: 1px solid rgba(159, 212, 248, 0.42);
    transform: rotate(-45deg); border-radius: 2px;
}

.mascot-bubble-enter-active, .mascot-bubble-leave-active { transition: opacity 0.22s ease, transform 0.22s ease; }
.mascot-bubble-enter-from, .mascot-bubble-leave-to { opacity: 0; transform: translateX(8px) scale(0.96); }

@media (max-width: 768px) {
    .mascot { width: calc(var(--mascot-size, 128px) * 0.78); }
    .mascot-bubble {
        right: 0; left: auto; top: auto;
        bottom: calc(100% + 8px);
        width: min(72vw, 15rem);
    }
    .mb-tail { display: none; }
}

@media (prefers-reduced-motion: reduce) {
    .mascot-btn, .mascot-eyes, .mascot-star, .mascot-star-shape, .mascot-sparkles { animation: none !important; }
}
</style>
