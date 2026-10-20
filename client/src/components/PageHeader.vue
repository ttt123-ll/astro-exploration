<script setup>
/**
 * 增强版页头
 * 用法：<PageHeader kicker="COSMIC NEWS" title="宇宙新闻" subtitle="..." icon="fa-newspaper" :stats="[{v:'24',l:'新闻记录'}]" />
 * 副标题需要富文本/动态插值时用默认插槽：
 *   <PageHeader ...><template #default>欢迎回来，<b>{{ name }}</b></template></PageHeader>
 */
defineProps({
    kicker: { type: String, default: '' },
    title: { type: String, required: true },
    subtitle: { type: String, default: '' },
    icon: { type: String, default: '' },      // Font Awesome 类名，如 fa-newspaper
    stats: { type: Array, default: () => [] }, // [{ v: '24', l: '新闻记录' }]
    deco: { type: String, default: '' }       // 页头装饰：galaxy | stars | orbit | grid | nebula
});
</script>

<template>
    <header class="page-header ph">
        <!-- 每页专属装饰 -->
        <div v-if="deco" class="ph-deco" :class="'deco-' + deco" aria-hidden="true">
            <template v-if="deco === 'galaxy'">
                <span class="deco-ring r1"></span>
                <span class="deco-ring r2"></span>
                <span class="deco-core"></span>
            </template>
            <template v-else-if="deco === 'orbit'">
                <span class="deco-ring r1"></span>
                <span class="deco-ring r2"></span>
                <span class="deco-ring r3"></span>
            </template>
            <template v-else-if="deco === 'stars'">
                <span v-for="i in 16" :key="i" class="deco-star" :style="{ '--i': i }"></span>
            </template>
        </div>

        <span v-if="kicker" class="page-kicker ph-kicker">
            <span class="ph-dot"></span>
            <i v-if="icon" class="fas" :class="icon"></i>
            {{ kicker }}
        </span>
        <h1 class="ph-title">{{ title }}</h1>
        <p class="ph-sub"><slot>{{ subtitle }}</slot></p>

        <div v-if="stats.length" class="ph-divider"><span>✦</span></div>

        <div v-if="stats.length" class="ph-stats">
            <div v-for="(s, i) in stats" :key="i" class="ph-stat">
                <div class="ph-v">{{ s.v }}</div>
                <div class="ph-l">{{ s.l }}</div>
            </div>
        </div>
    </header>
</template>

<style scoped>
.ph {
    padding: 2.4rem 0 1.4rem;
    position: relative;
}

/* kicker：呼吸光点 + 图标 */
.ph-kicker {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
}

.ph-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--color-cyan);
    box-shadow: 0 0 10px var(--color-cyan);
    animation: phPulse 2.4s ease-in-out infinite;
}

@keyframes phPulse {
    0%, 100% { opacity: 0.45; transform: scale(0.85); }
    50% { opacity: 1; transform: scale(1.2); }
}

.ph-title {
    letter-spacing: 2px;
    background: linear-gradient(180deg, #fff 10%, var(--color-gold) 120%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    filter: drop-shadow(0 0 24px rgba(206, 216, 240, 0.35));
}

.ph-sub {
    max-width: 820px;
    margin-left: auto;
    margin-right: auto;
    line-height: 1.9;
}

/* 分隔线 + 小星 */
.ph-divider {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.8rem;
    margin: 1.6rem auto 0;
    max-width: 420px;
    color: var(--color-gold);
    font-size: 0.8rem;
}

.ph-divider::before,
.ph-divider::after {
    content: '';
    flex: 1;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(206, 216, 240, 0.45), transparent);
}

/* 关键数据卡 */
.ph-stats {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 0.9rem;
    margin-top: 1.1rem;
}

.ph-stat {
    min-width: 128px;
    padding: 0.85rem 1.3rem;
    border-radius: 14px;
    background: rgba(159, 212, 248, 0.06);
    border: 1px solid rgba(159, 212, 248, 0.18);
    backdrop-filter: blur(6px);
    transition: transform 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
}

.ph-stat:hover {
    transform: translateY(-3px);
    border-color: rgba(159, 212, 248, 0.45);
    box-shadow: 0 10px 26px rgba(0, 0, 0, 0.35);
}

.ph-v {
    /* 数值含中文单位（如「138 亿年」「30 秒」），用正文字体避免与数字字体混排错位 */
    font-family: var(--font-body);
    font-weight: 700;
    font-size: 1.35rem;
    line-height: 1.25;
    letter-spacing: 0.01em;
    color: var(--color-gold);
    font-variant-numeric: tabular-nums;
}

.ph-l {
    margin-top: 0.3rem;
    font-size: 0.76rem;
    letter-spacing: 0.06em;
    color: var(--color-text-muted);
}

@media (max-width: 640px) {
    .ph { padding: 1.6rem 0 1rem; }
    .ph-stat { min-width: 104px; padding: 0.65rem 0.9rem; }
    .ph-v { font-size: 1.15rem; }
    .ph-divider { max-width: 240px; margin-top: 1.2rem; }
}

/* ================= 每页专属装饰 ================= */
.ph-deco {
    position: absolute;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
    z-index: 0;
    mask-image: radial-gradient(ellipse 78% 92% at 50% 42%, #000 30%, transparent 76%);
    -webkit-mask-image: radial-gradient(ellipse 78% 92% at 50% 42%, #000 30%, transparent 76%);
}

.ph > *:not(.ph-deco) {
    position: relative;
    z-index: 1;
}

/* 星系：两层旋转椭圆环 + 明亮核心 */
.deco-galaxy .deco-ring {
    position: absolute;
    left: 50%;
    top: 46%;
    border-radius: 50%;
    border: 1px solid rgba(157, 140, 240, 0.35);
    box-shadow: 0 0 32px rgba(157, 140, 240, 0.22) inset;
}

.deco-galaxy .r1 {
    width: 620px; height: 210px;
    margin: -105px 0 0 -310px;
    transform: rotate(-14deg);
    animation: galaxySpin 42s linear infinite;
}

.deco-galaxy .r2 {
    width: 460px; height: 150px;
    margin: -75px 0 0 -230px;
    border-color: rgba(120, 220, 255, 0.28);
    transform: rotate(16deg);
    animation: galaxySpin 28s linear infinite reverse;
}

.deco-galaxy .deco-core {
    position: absolute;
    left: 50%;
    top: 46%;
    width: 190px; height: 190px;
    margin: -95px 0 0 -95px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(216, 224, 244, 0.28), rgba(157, 140, 240, 0.16) 45%, transparent 70%);
    animation: corePulse 7s ease-in-out infinite;
}

@keyframes galaxySpin {
    to { transform: rotate(346deg); }
}

@keyframes corePulse {
    0%, 100% { opacity: 0.7; transform: scale(1); }
    50% { opacity: 1; transform: scale(1.08); }
}

/* 轨道：三层同心环 */
.deco-orbit .deco-ring {
    position: absolute;
    left: 50%;
    top: 48%;
    border-radius: 50%;
    border: 1px dashed rgba(159, 212, 248, 0.26);
    transform: translate(-50%, -50%);
}

.deco-orbit .r1 { width: 300px; height: 300px; animation: orbitSpin 26s linear infinite; }
.deco-orbit .r2 { width: 480px; height: 480px; border-style: solid; border-color: rgba(157, 140, 240, 0.16); animation: orbitSpin 44s linear infinite reverse; }
.deco-orbit .r3 { width: 680px; height: 680px; animation: orbitSpin 68s linear infinite; }

.deco-orbit .deco-ring::after {
    content: '';
    position: absolute;
    top: -4px; left: 50%;
    width: 8px; height: 8px;
    margin-left: -4px;
    border-radius: 50%;
    background: var(--color-cyan);
    box-shadow: 0 0 12px var(--color-cyan);
}

@keyframes orbitSpin {
    to { transform: translate(-50%, -50%) rotate(360deg); }
}

/* 星点：散射微光 */
.deco-stars .deco-star {
    position: absolute;
    width: 3px; height: 3px;
    border-radius: 50%;
    background: #dfe8ff;
    box-shadow: 0 0 8px rgba(216, 224, 244, 0.9);
    left: calc((var(--i) * 37) % 100 * 1%);
    top: calc((var(--i) * 61) % 90 * 1%);
    animation: starTwinkle calc(3s + (var(--i) * 0.22s)) ease-in-out infinite;
    animation-delay: calc(var(--i) * -0.35s);
}

@keyframes starTwinkle {
    0%, 100% { opacity: 0.25; transform: scale(0.8); }
    50% { opacity: 1; transform: scale(1.35); }
}

/* 网格：透视星图网格 */
.deco-grid {
    background-image:
        linear-gradient(rgba(120, 200, 255, 0.1) 1px, transparent 1px),
        linear-gradient(90deg, rgba(120, 200, 255, 0.1) 1px, transparent 1px);
    background-size: 64px 64px;
    transform: perspective(600px) rotateX(58deg);
    transform-origin: center 20%;
    opacity: 0.55;
}

/* 星云：柔和漂移的彩色光团 */
.deco-nebula {
    background:
        radial-gradient(ellipse 42% 58% at 22% 34%, rgba(157, 140, 240, 0.3), transparent 62%),
        radial-gradient(ellipse 38% 52% at 78% 30%, rgba(110, 164, 232, 0.26), transparent 62%),
        radial-gradient(ellipse 46% 42% at 52% 76%, rgba(110, 200, 168, 0.18), transparent 64%);
    animation: nebulaDrift 18s ease-in-out infinite alternate;
}

@keyframes nebulaDrift {
    from { transform: scale(1) translate(0, 0); }
    to { transform: scale(1.08) translate(-1.5%, 1.5%); }
}

@media (prefers-reduced-motion: reduce) {
    .ph-deco * { animation: none !important; }
}
</style>
