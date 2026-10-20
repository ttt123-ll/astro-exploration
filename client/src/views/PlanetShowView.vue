<script setup>
import { ref, computed } from 'vue';
import projection from '../data/projection';
import VideoSection from '../components/VideoSection.vue';
import PageNav from '../components/PageNav.vue';
import SpaceFlight from './SpaceFlightView.vue';

/* 两种模式：星球投影 / 3D 遨游太空 */
const mode = ref('project');

const CATS = ['行星', '星座', '黑洞', '恒星', '星系', '深空'];
const activeCat = ref('行星');
const items = computed(() => projection.filter(x => x.cat === activeCat.value));
const selected = ref(null);

const topicMap = { 行星: 'solar', 星座: 'constellation', 黑洞: 'blackhole', 恒星: 'star', 星系: 'star', 深空: 'deepspace' };
const videoTopic = computed(() => topicMap[activeCat.value] || 'deepspace');

function switchCat(c) {
    activeCat.value = c;
    selected.value = null;   // 切分类后需重新点击才会投影
}
function pick(i) {
    selected.value = items.value[i];
}
</script>

<template>
    <div class="space-wrap">
        <!-- 模式切换 -->
        <div class="mode-switch">
            <button :class="{ active: mode === 'project' }" @click="mode = 'project'">
                <i class="fas fa-cube"></i> 星球投影
            </button>
            <button :class="{ active: mode === 'flight' }" @click="mode = 'flight'">
                <i class="fas fa-rocket"></i> 3D 遨游太空
            </button>
        </div>

        <div v-show="mode === 'project'" class="proj-page">
        <!-- 返回首页 / 当前位置 -->
        <PageNav title="星球投影" />
        <!-- 分类 -->
        <div class="cat-tabs">
            <button v-for="c in CATS" :key="c" class="cat-tab" :class="{ active: c === activeCat }" @click="switchCat(c)">{{ c }}</button>
        </div>
        <!-- 天体选择（点击即投影） -->
        <div class="item-picker">
            <button v-for="(it, i) in items" :key="it.name" class="pick-btn"
                    :class="{ active: selected && selected.name === it.name }" @click="pick(i)">
                <i class="fas fa-hand-pointer"></i> {{ it.name }}
            </button>
        </div>

        <!-- 未点击：提示 -->
        <div v-if="!selected" class="proj-empty">
            <div class="empty-orb"><i class="fas fa-satellite-dish"></i></div>
            <h2>点击上面的天体，开始全息投影</h2>
            <p>选一个星球、星座、黑洞或深空天体，投影仪会立刻为你投射出立体影像，并在下方展示详细介绍。</p>
        </div>

        <!-- 已点击：铺满页面的立体投影 -->
        <div v-else class="proj-output">
            <div class="big-stage">
                <!-- 行星：3D 自转球体 -->
                <div v-if="selected.tex" class="globe3d" :key="'g' + selected.name"
                     :style="{ backgroundImage: 'url(' + selected.tex + ')' }">
                    <span class="globe-shade"></span>
                    <span class="globe-scan"></span>
                    <span class="holo-ring"></span>
                </div>
                <!-- 其他天体：3D 透视全息投影板 -->
                <div v-else class="holo-wrap" :key="'p' + selected.name">
                    <div class="holo-panel">
                        <img :src="selected.img" :alt="selected.name">
                        <span class="panel-scan"></span>
                    </div>
                    <span class="holo-ring"></span>
                </div>

                <div class="proj-beam"></div>
                <div class="projector"><span class="proj-lens"></span></div>
                <div class="stage-label">{{ selected.name }} · {{ selected.en }}</div>
            </div>

            <!-- 下方：详细文字介绍 -->
            <div class="proj-detail" :key="'d' + selected.name">
                <div class="intro-head">
                    <h2>{{ selected.name }}</h2>
                    <span class="intro-en">{{ selected.en }}</span>
                </div>
                <div class="intro-stats">
                    <div v-for="s in selected.stats" :key="s.l" class="intro-stat">
                        <div class="v">{{ s.v }}</div>
                        <div class="l">{{ s.l }}</div>
                    </div>
                </div>
                <div class="intro-desc" v-for="(para, i) in selected.desc.split(/(?<=。)/).filter(Boolean)" :key="i">
                    <p>{{ para }}</p>
                </div>
            </div>

            <!-- 该天体所属分类的科普视频 -->
            <VideoSection :topic="videoTopic" :title="activeCat + '科普视频'" />
        </div>
        </div>

        <!-- 3D 遨游太空（复用同一套 Three.js 场景） -->
        <SpaceFlight v-if="mode === 'flight'" embedded />
    </div>
</template>

<style scoped>
.proj-page { padding: 9rem 1.5rem 3rem; max-width: 1240px; margin: 0 auto; }

/* 模式切换（页内融合：星球投影 / 3D 遨游太空） */
.space-wrap { position: relative; min-height: calc(100vh - 73px); }
.mode-switch {
    position: fixed; left: 50%; transform: translateX(-50%);
    top: calc(73px + 14px);
    z-index: 60; display: flex; gap: 5px; padding: 5px;
    border-radius: 50px;
    background: rgba(8, 12, 24, 0.85);
    border: 1px solid rgba(159, 212, 248, 0.3);
    backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
    box-shadow: 0 8px 28px rgba(0, 0, 0, 0.45);
}
.mode-switch button {
    display: inline-flex; align-items: center; gap: 0.4rem;
    padding: 0.45rem 1.15rem; border-radius: 50px; font-size: 0.87rem;
    border: none; background: transparent; color: var(--color-text-secondary);
    cursor: pointer; transition: all 0.3s ease; font-family: inherit; white-space: nowrap;
}
.mode-switch button:hover { color: #fff; }
.mode-switch button.active { background: var(--gradient-primary); color: #fff; }

.cat-tabs { display: flex; justify-content: center; gap: 0.7rem; margin-bottom: 1rem; flex-wrap: wrap; }
.cat-tab {
    padding: 0.55rem 1.4rem; border-radius: 50px; font-size: 0.95rem;
    border: 1px solid rgba(159, 212, 248, 0.35); background: rgba(159, 212, 248, 0.06);
    color: var(--color-text-secondary); cursor: pointer; transition: all 0.3s ease;
}
.cat-tab:hover { border-color: var(--color-cyan); color: #fff; }
.cat-tab.active { background: var(--gradient-primary); border-color: transparent; color: #fff; box-shadow: 0 6px 20px rgba(157, 140, 240, 0.45); }

.item-picker { display: flex; flex-wrap: wrap; justify-content: center; gap: 0.6rem; margin-bottom: 1.6rem; }
.pick-btn {
    padding: 0.5rem 1.15rem; border-radius: 50px; font-size: 0.88rem;
    border: 1px solid rgba(159, 212, 248, 0.35); background: rgba(159, 212, 248, 0.07);
    color: var(--color-text-secondary); cursor: pointer; transition: all 0.3s ease;
}
.pick-btn i { opacity: 0.45; font-size: 0.75rem; margin-right: 0.25rem; }
.pick-btn:hover { border-color: var(--color-cyan); color: #fff; transform: translateY(-2px); }
.pick-btn:hover i, .pick-btn.active i { opacity: 1; }
.pick-btn.active { background: var(--gradient-primary); border-color: transparent; color: #fff; box-shadow: 0 6px 20px rgba(157, 140, 240, 0.45); }

/* 未点击提示 */
.proj-empty { text-align: center; padding: 4rem 1rem 5rem; }
.empty-orb {
    width: 110px; height: 110px; margin: 0 auto 1.6rem; border-radius: 50%;
    display: flex; align-items: center; justify-content: center; font-size: 2.4rem;
    color: var(--color-cyan); border: 1px dashed rgba(159, 212, 248, 0.5);
    background: radial-gradient(circle, rgba(159, 212, 248, 0.12), transparent 70%);
    animation: floatY 3.5s ease-in-out infinite;
}
.proj-empty h2 { font-family: var(--font-title); color: var(--color-gold); font-size: 1.35rem; margin-bottom: 0.7rem; }
.proj-empty p { color: var(--color-text-secondary); font-size: 0.92rem; line-height: 1.9; max-width: 560px; margin: 0 auto; }

/* 铺满页面的大投影台 */
.big-stage {
    position: relative; min-height: 64vh;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    padding: 2rem 0 0;
}
.stage-label {
    margin-top: 1.2rem; font-family: var(--font-title); color: #cfe0f8;
    letter-spacing: 0.12em; font-size: 1rem; text-shadow: 0 0 18px rgba(159, 212, 248, 0.6);
}

/* 3D 自转球体 */
.globe3d {
    position: relative; width: 400px; height: 400px; border-radius: 50%;
    background-size: 800px 400px; background-repeat: repeat-x; background-position: 0 0;
    animation: globeSpin 30s linear infinite, popIn 0.6s ease both;
    box-shadow:
        inset -68px -34px 105px 8px rgba(0, 0, 0, 0.93),
        inset 38px 30px 85px rgba(255, 255, 255, 0.10),
        0 0 90px rgba(159, 212, 248, 0.5), 0 0 190px rgba(157, 140, 240, 0.32);
    z-index: 2;
}
.globe-shade {
    position: absolute; inset: 0; border-radius: 50%; pointer-events: none;
    background:
        radial-gradient(circle at 32% 28%, rgba(255, 255, 255, 0.30), transparent 36%),
        radial-gradient(circle at 76% 78%, rgba(0, 0, 0, 0.6), transparent 64%);
}
.globe-scan {
    position: absolute; left: 0; right: 0; height: 3px; border-radius: 2px;
    background: linear-gradient(90deg, transparent, rgba(159, 212, 248, 0.85), transparent);
    animation: scanMove 3s ease-in-out infinite;
    box-shadow: 0 0 12px rgba(159, 212, 248, 0.8); pointer-events: none;
}

/* 3D 全息投影板 */
.holo-wrap { position: relative; animation: floatY 5s ease-in-out infinite; z-index: 2; }
.holo-panel {
    position: relative; width: 560px; height: 400px;
    transform: perspective(1400px) rotateY(-15deg) rotateX(4deg);
    border: 1px solid rgba(159, 212, 248, 0.55); border-radius: 12px; overflow: hidden;
    box-shadow: 0 0 70px rgba(159, 212, 248, 0.45), 0 0 150px rgba(157, 140, 240, 0.25),
                inset 0 0 80px rgba(159, 212, 248, 0.18);
    animation: fadeIn 0.5s ease both;
}
.holo-panel img { width: 100%; height: 100%; object-fit: cover; display: block; }
.panel-scan {
    position: absolute; inset: 0; pointer-events: none;
    background: repeating-linear-gradient(0deg, rgba(159, 212, 248, 0.12) 0 2px, transparent 2px 5px);
}
.holo-ring {
    position: absolute; inset: -20px; border-radius: 50%;
    border: 1px solid rgba(159, 212, 248, 0.35); border-top-color: rgba(159, 212, 248, 0.9);
    animation: ringSpin 5s linear infinite; pointer-events: none;
}

/* 投影仪 */
.proj-beam {
    width: 340px; height: 140px; margin-top: 14px;
    background: linear-gradient(to bottom, rgba(159, 212, 248, 0.28), rgba(159, 212, 248, 0.02));
    clip-path: polygon(50% 0, 80% 100%, 20% 100%); z-index: 1;
    animation: beamFlicker 4s ease-in-out infinite;
}
.projector {
    width: 230px; height: 60px; background: linear-gradient(180deg, #2a3550, #141a30);
    border-radius: 14px 14px 22px 22px; display: flex; align-items: center; justify-content: center;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5); z-index: 2; margin-top: -2px;
}
.proj-lens {
    width: 66px; height: 30px; border-radius: 50%;
    background: radial-gradient(circle, #e6ecf8, #9fd4f8 45%, #6ea4e8);
    box-shadow: 0 0 24px rgba(159, 212, 248, 0.9), 0 0 50px rgba(157, 140, 240, 0.5);
    animation: lensGlow 2.5s ease-in-out infinite;
}

/* 下方详细介绍 */
.proj-detail {
    background: var(--bg-card); border: 1px solid rgba(159, 212, 248, 0.22);
    border-radius: var(--radius-lg); padding: 2.2rem 2.4rem; margin-top: 2rem;
    animation: fadeIn 0.5s ease both;
}
.intro-head { display: flex; align-items: baseline; gap: 0.9rem; margin-bottom: 1.4rem; flex-wrap: wrap; }
.intro-head h2 { font-family: var(--font-title); color: var(--color-gold); font-size: 1.9rem; }
.intro-en { color: var(--color-text-muted); font-style: italic; font-size: 1rem; }
.intro-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 0.9rem; margin-bottom: 1.6rem; }
.intro-stat { background: rgba(159, 212, 248, 0.08); border: 1px solid rgba(159, 212, 248, 0.2); border-radius: 12px; padding: 0.95rem; text-align: center; }
.intro-stat .v { font-family: var(--font-title); color: var(--color-cyan); font-size: 1.02rem; word-break: break-all; }
.intro-stat .l { color: var(--color-text-muted); font-size: 0.78rem; margin-top: 0.25rem; }
.intro-desc p { color: var(--color-text-secondary); line-height: 2; font-size: 0.96rem; margin-bottom: 0.9rem; text-indent: 2em; }

@keyframes globeSpin { from { background-position: 0 0; } to { background-position: -800px 0; } }
@keyframes popIn { from { opacity: 0; transform: scale(0.5); } to { opacity: 1; transform: scale(1); } }
@keyframes floatY { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes scanMove { 0%, 100% { top: 4%; } 50% { top: 94%; } }
@keyframes ringSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes beamFlicker { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
@keyframes lensGlow { 0%, 100% { box-shadow: 0 0 24px rgba(159,212,248,0.9), 0 0 50px rgba(157,140,240,0.5); } 50% { box-shadow: 0 0 36px rgba(159,212,248,1), 0 0 70px rgba(157,140,240,0.8); } }

@media (max-width: 900px) {
    .big-stage { min-height: auto; transform: scale(0.82); }
    .holo-panel { width: 340px; height: 250px; }
    .proj-detail { padding: 1.4rem 1.2rem; }
}
</style>
