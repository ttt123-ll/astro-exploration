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
    stats: { type: Array, default: () => [] } // [{ v: '24', l: '新闻记录' }]
});
</script>

<template>
    <header class="page-header ph">
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
</style>
