<script setup>
import planets from '../data/planets';
import VideoSection from '../components/VideoSection.vue';
import PageNav from '../components/PageNav.vue';
import BookSection from '../components/BookSection.vue';
import PageHeader from '../components/PageHeader.vue';
const key = p => (p.englishName || '').toLowerCase();
const fmt = n => Number(n).toLocaleString('zh-CN');
</script>

<template>
    <div class="container">
        <PageNav title="太阳系行星" />
        <PageHeader kicker="SOLAR SYSTEM" title="太阳系" icon="fa-sun" deco="orbit" :stats="[{ v: '8', l: '行星' }, { v: '99.86%', l: '太阳质量占比' }, { v: '46 亿年', l: '太阳系年龄' }]" subtitle="探索我们所在的恒星系统——八大行星围绕太阳运行，点击行星卡片查看详细介绍。" />

        <div class="solar-system-view">
            <div class="sun"></div>
            <div class="orbit orbit-mercury"><div class="orbit-container"><router-link class="planet mercury" to="/detail/planet/mercury"></router-link></div></div>
            <div class="orbit orbit-venus"><div class="orbit-container"><router-link class="planet venus" to="/detail/planet/venus"></router-link></div></div>
            <div class="orbit orbit-earth"><div class="orbit-container"><router-link class="planet earth" to="/detail/planet/earth"></router-link></div></div>
            <div class="orbit orbit-mars"><div class="orbit-container"><router-link class="planet mars" to="/detail/planet/mars"></router-link></div></div>
            <div class="orbit orbit-jupiter"><div class="orbit-container"><router-link class="planet jupiter" to="/detail/planet/jupiter"></router-link></div></div>
            <div class="orbit orbit-saturn"><div class="orbit-container"><router-link class="planet saturn" to="/detail/planet/saturn"><span class="saturn-rings"></span></router-link></div></div>
            <div class="orbit orbit-uranus"><div class="orbit-container"><router-link class="planet uranus" to="/detail/planet/uranus"></router-link></div></div>
            <div class="orbit orbit-neptune"><div class="orbit-container"><router-link class="planet neptune" to="/detail/planet/neptune"></router-link></div></div>
        </div>

        <div class="planets-grid">
            <router-link v-for="p in planets" :key="p.name" :to="'/detail/planet/' + key(p)" class="planet-card" v-reveal>
                <div class="planet-card-header">
                    <div class="planet-icon" :style="{ background: p.color || '#7fb0ee' }"></div>
                    <div>
                        <h3>{{ p.name }}</h3>
                        <span class="english-name">{{ p.englishName }}</span>
                    </div>
                </div>
                <div class="planet-stats">
                    <div class="stat-item"><div class="stat-label">直径</div><div class="stat-value">{{ fmt(p.diameter) }} km</div></div>
                    <div class="stat-item"><div class="stat-label">距离太阳</div><div class="stat-value">{{ p.distance }} Mkm</div></div>
                    <div class="stat-item"><div class="stat-label">公转</div><div class="stat-value">{{ p.revolution }} 年</div></div>
                    <div class="stat-item"><div class="stat-label">卫星</div><div class="stat-value">{{ p.moons }}</div></div>
                </div>
            </router-link>
        </div>

        <VideoSection topic="solar" title="太阳系科普视频" />
        <BookSection topic="solar" />
    </div>
</template>

<style>
.solar-system-header { padding: 4rem 0; text-align: center; }
.solar-system-view { padding: 2rem 0; position: relative; min-height: 560px; display: flex; justify-content: center; align-items: center; overflow: hidden; }
.sun { position: absolute; width: 100px; height: 100px; border-radius: 50%; background: radial-gradient(circle, #f4f7fd 0%, #9fc4f0 50%, #5b7ba8 100%); box-shadow: 0 0 60px rgba(159,212,248,0.6), 0 0 100px rgba(159,212,248,0.3); animation: pulse 4s ease-in-out infinite; }
@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
.orbit { position: absolute; border: 1px solid rgba(159,212,248,0.25); border-radius: 50%; }
.orbit-mercury { width: 150px; height: 150px; animation: orbit 8s linear infinite; }
.orbit-venus { width: 220px; height: 220px; animation: orbit 12s linear infinite; }
.orbit-earth { width: 300px; height: 300px; animation: orbit 20s linear infinite; }
.orbit-mars { width: 400px; height: 400px; animation: orbit 30s linear infinite; }
.orbit-jupiter { width: 550px; height: 550px; animation: orbit 40s linear infinite; }
.orbit-saturn { width: 700px; height: 700px; animation: orbit 50s linear infinite; }
.orbit-uranus { width: 850px; height: 850px; animation: orbit 60s linear infinite; }
.orbit-neptune { width: 1000px; height: 1000px; animation: orbit 70s linear infinite; }
@keyframes orbit { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
.orbit-container { position: absolute; width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; }
.planet { position: absolute; border-radius: 50%; cursor: pointer; transition: transform 0.3s ease; top: -6px; left: 50%; }
.planet:hover { transform: scale(1.3); }
.mercury { width: 12px; height: 12px; background: #b5b5b5; margin-left: -6px; top: -6px; }
.venus { width: 20px; height: 20px; background: linear-gradient(135deg, #e6c87a, #c9a227); margin-left: -10px; top: -10px; }
.earth { width: 22px; height: 22px; background: linear-gradient(135deg, #6db0ee, #2d5a87); margin-left: -11px; top: -11px; box-shadow: 0 0 10px rgba(110,164,232,0.5); }
.mars { width: 14px; height: 14px; background: linear-gradient(135deg, #e27b58, #c1440e); margin-left: -7px; top: -7px; }
.jupiter { width: 45px; height: 45px; background: linear-gradient(135deg, #d4a574, #c4956a, #8b7355); margin-left: -22px; top: -22px; }
.saturn { width: 38px; height: 38px; background: linear-gradient(135deg, #f4d59e, #e8c89a); margin-left: -19px; top: -19px; }
.saturn-rings { position: absolute; width: 55px; height: 10px; border: 3px solid rgba(244,213,158,0.6); border-radius: 50%; top: 50%; left: 50%; transform: translate(-50%, -50%); }
.uranus { width: 28px; height: 28px; background: linear-gradient(135deg, #c9e4e9, #98d4e0); margin-left: -14px; top: -14px; }
.neptune { width: 27px; height: 27px; background: linear-gradient(135deg, #6b7fd7, #4a67c9); margin-left: -13px; top: -13px; }
.planets-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 2rem; margin-top: 2rem; }
.planet-card { background: var(--bg-card); border-radius: 20px; padding: 2rem; border: 1px solid rgba(159,212,248,0.2); cursor: pointer; transition: all 0.3s ease; text-decoration: none; color: inherit; }
.planet-card:hover { transform: translateY(-5px); border-color: var(--color-primary); box-shadow: var(--shadow-glow-primary); }
.planet-card-header { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem; }
.planet-icon { width: 60px; height: 60px; border-radius: 50%; }
.planet-card h3 { font-family: var(--font-title); font-size: 1.5rem; color: var(--color-gold); }
.english-name { color: var(--color-text-secondary); font-size: 0.9rem; }
.planet-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.stat-item { background: rgba(159,212,248,0.08); padding: 0.75rem; border-radius: 10px; text-align: center; }
.stat-label { color: var(--color-text-muted); font-size: 0.75rem; margin-bottom: 0.25rem; }
.stat-value { color: #fff; font-size: 0.9rem; font-weight: 600; }
@media (max-width: 1100px) {
    .orbit-mercury { width: 100px; height: 100px; } .orbit-venus { width: 160px; height: 160px; }
    .orbit-earth { width: 220px; height: 220px; } .orbit-mars { width: 280px; height: 280px; }
    .orbit-jupiter { width: 380px; height: 380px; } .orbit-saturn { width: 480px; height: 480px; }
    .orbit-uranus { width: 580px; height: 580px; } .orbit-neptune { width: 680px; height: 680px; }
    .jupiter { width: 32px; height: 32px; } .saturn { width: 26px; height: 26px; }
}
</style>
