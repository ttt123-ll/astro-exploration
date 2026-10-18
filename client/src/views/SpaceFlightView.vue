<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue';
import * as THREE from 'three';

/* ===================== 天体（真实轨道要素） =====================
   a：半长轴（天文单位 AU）  period：公转周期（地球日）  r：渲染半径（单位）
   incl：轨道倾角系数（视觉倾斜）  phase：初始相位角                  */
const BODIES = [
    { key: 'sun', name: '太阳', a: 0, period: 0, r: 700, color: '#ffcf6b', gravity: '274 m/s²', desc: '太阳系的心脏，质量占整个太阳系的 99.86%' },
    { key: 'mercury', name: '水星', a: 0.387, period: 87.97, r: 60, incl: 0.045, phase: 2.1, color: '#b5b5b5', gravity: '3.7 m/s²', desc: '离太阳最近、最小的行星，一年只有 88 天' },
    { key: 'venus', name: '金星', a: 0.723, period: 224.7, r: 110, incl: 0.02, phase: 4.2, color: '#e6c87a', gravity: '8.87 m/s²', desc: '表面 465℃，太阳系最热的行星' },
    { key: 'earth', name: '地球', a: 1.0, period: 365.25, r: 120, incl: 0, phase: 1.1, color: '#4a90d9', gravity: '9.81 m/s²', desc: '唯一已知存在生命的行星' },
    { key: 'moon', name: '月球', a: 0, period: 27.32, r: 34, color: '#cfd6e0', gravity: '1.62 m/s²', desc: '地球唯一的天然卫星，绕地球公转周期 27.3 天' },
    { key: 'mars', name: '火星', a: 1.524, period: 686.98, r: 68, incl: 0.03, phase: 0.5, color: '#d06b4a', gravity: '3.71 m/s²', desc: '红色星球，拥有太阳系最高的火山' },
    { key: 'jupiter', name: '木星', a: 5.203, period: 4332.6, r: 320, incl: 0.018, phase: 3.4, color: '#d9a066', gravity: '24.79 m/s²', desc: '太阳系最大的行星，能装下 1300 个地球' },
    { key: 'saturn', name: '土星', a: 9.537, period: 10759, r: 270, incl: 0.025, phase: 5.1, color: '#e0c68a', gravity: '10.44 m/s²', desc: '公转一圈要 29.5 年，以壮观光环闻名' },
    { key: 'uranus', name: '天王星', a: 19.19, period: 30687, r: 170, incl: 0.012, phase: 2.7, color: '#8fd3e8', gravity: '8.69 m/s²', desc: '自转轴几乎"躺"着指向太阳，公转 84 年' },
    { key: 'neptune', name: '海王星', a: 30.07, period: 60190, r: 165, incl: 0.008, phase: 6.0, color: '#5b7be0', gravity: '11.15 m/s²', desc: '太阳系最遥远的行星，绕日一圈要 165 年' }
];

const cv = ref(null);
const loading = ref(true);
const warping = ref(false);

/* 被「星球投影」页内嵌时，给顶部模式切换让出空间 */
const props = defineProps({ embedded: { type: Boolean, default: false } });
const coordText = ref('X 0  Y 0  Z 0');
const isDragging = ref(false);

/* 时间与比例控制 */
const timePct = ref(8);         // 0~100 时间流速
const distPct = ref(22);        // 0~100 距离比例（0=教学压缩，100=真实 AU）

const daysPerSec = computed(() => Math.pow(timePct.value / 100, 3) * 3000);
const timeLabel = computed(() => {
    const d = daysPerSec.value;
    if (d < 0.5) return '暂停';
    if (d < 400) return d.toFixed(0) + ' 天/秒';
    return (d / 365.25).toFixed(1) + ' 年/秒';
});
const simLabel = ref('0.0 年');

const nearest = reactive({ name: '地球', dist: 0, gravity: '9.81 m/s²', desc: '' });
const speedText = ref('0.0 km/s');
const clock = ref('');

let renderer, scene, camera, raf;
let W = 0, H = 0;
let planets = [];
let orbitLines = [];
let routeLine = null, routeGeo = null;
let farStars, dust;
let tetherGeo = null, tetherLine = null;

/* 相机 */
const camPos = new THREE.Vector3(2200, 400, 2600);
const vel = new THREE.Vector3();
let yaw = 0, pitch = 0, thrust = 0, turn = 0;
const keys = {};

/* 模拟时间（天） */
let simDays = 0;
/* 当前跃迁目标（HUD 优先显示） */
let focusKey = null;

/* 各天体实时位置 */
const posMap = {};
BODIES.forEach(b => { posMap[b.key] = new THREE.Vector3(); });

/* 跃迁状态 */
let warp = null;
let warpGroup = null, warpGeo = null, warpMat = null;
const WARP_N = 240;
const warpBase = [];

function lerpAngle(a, b, t) {
    let d = (b - a) % (Math.PI * 2);
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    return a + d * t;
}

/* 距离映射：0 → 教学压缩；1 → 真实 AU 比例 */
function orbitalDist(a) {
    const teach = 1150 * Math.pow(a, 0.52);
    const real = 4200 * a;
    const t = distPct.value / 100;
    return teach + (real - teach) * t;
}

/* 按当前模拟时间计算所有天体位置 */
function computePositions() {
    for (const b of BODIES) {
        const p = posMap[b.key];
        if (b.key === 'sun') { p.set(0, 0, 0); continue; }
        if (b.key === 'moon') {
            const e = posMap.earth;
            const ang = b.phase + (Math.PI * 2) * (simDays / b.period);
            const d = 430;
            p.set(e.x + Math.cos(ang) * d, e.y + Math.sin(ang) * d * 0.18, e.z + Math.sin(ang) * d);
            continue;
        }
        const ang = b.phase + (Math.PI * 2) * (simDays / b.period);
        const d = orbitalDist(b.a);
        const incl = b.incl || 0;
        p.set(Math.cos(ang) * d, Math.sin(ang) * d * incl, Math.sin(ang) * d);
    }
}

/* ===================== 工具 ===================== */
function glowTexture(rgb) {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    grd.addColorStop(0, 'rgba(' + rgb + ',1)');
    grd.addColorStop(0.28, 'rgba(' + rgb + ',0.55)');
    grd.addColorStop(0.55, 'rgba(' + rgb + ',0.18)');
    grd.addColorStop(1, 'rgba(' + rgb + ',0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 256, 256);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
}

function hexToRgb(hex) {
    const h = (hex || '#7fb0ee').replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map(x => x + x).join('') : h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255].join(',');
}

/* 远景星空 */
function addFarStars() {
    const N = 4200;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(N * 3);
    const col = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
        const u = Math.random(), v = Math.random();
        const theta = 2 * Math.PI * u;
        const phi = Math.acos(2 * v - 1);
        const r = 260000 + Math.random() * 90000;
        pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        pos[i * 3 + 1] = r * Math.cos(phi);
        pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
        const t = Math.random();
        const c = new THREE.Color().setHSL(t > 0.85 ? 0.09 : (t < 0.15 ? 0.6 : 0.58), 0.35, 0.6 + Math.random() * 0.4);
        col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({
        size: 620, sizeAttenuation: true, vertexColors: true,
        transparent: true, opacity: 0.8, depthWrite: false, fog: false
    });
    farStars = new THREE.Points(geo, mat);
    scene.add(farStars);
}

/* 近景尘埃（视差） */
function addDust() {
    const N = 1100, L = 70000;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(N * 3);
    const col = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
        pos[i * 3] = (Math.random() - 0.5) * L;
        pos[i * 3 + 1] = (Math.random() - 0.5) * L * 0.6;
        pos[i * 3 + 2] = (Math.random() - 0.5) * L;
        const t = Math.random();
        const c = new THREE.Color().setHSL(t > 0.8 ? 0.1 : 0.58, 0.4, 0.6 + Math.random() * 0.35);
        col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({
        size: 6, sizeAttenuation: true, vertexColors: true,
        transparent: true, opacity: 0.75, depthWrite: false
    });
    dust = new THREE.Points(geo, mat);
    scene.add(dust);
}

/* 星云 */
function addNebula() {
    const conf = [
        { c: '120,80,220', s: 95000, p: [-90000, 30000, -110000] },
        { c: '40,110,200', s: 105000, p: [110000, -40000, -90000] },
        { c: '180,60,150', s: 80000, p: [30000, 50000, -160000] },
        { c: '50,140,180', s: 85000, p: [-120000, -30000, 70000] }
    ];
    for (const n of conf) {
        const mat = new THREE.SpriteMaterial({
            map: glowTexture(n.c), blending: THREE.AdditiveBlending,
            transparent: true, opacity: 0.09, depthWrite: false, fog: false
        });
        const sp = new THREE.Sprite(mat);
        sp.position.set(...n.p);
        sp.scale.set(n.s, n.s, 1);
        scene.add(sp);
    }
}

/* 轨道环 + 天体连线 */
function addLines() {
    for (const b of BODIES) {
        if (b.key === 'sun' || b.key === 'moon') continue;
        const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(1, 0, 0)]);
        const mat = new THREE.LineBasicMaterial({ color: 0x6f9fd8, transparent: true, opacity: 0.17, depthWrite: false });
        const line = new THREE.LineLoop(geo, mat);
        line.frustumCulled = false;
        scene.add(line);
        b.ring = line;
        orbitLines.push(line);
    }
    routeGeo = new THREE.BufferGeometry().setFromPoints(
        BODIES.filter(b => b.key !== 'moon').map(() => new THREE.Vector3())
    );
    const rm = new THREE.LineBasicMaterial({ color: 0x7fd4ff, transparent: true, opacity: 0.22, depthWrite: false });
    routeLine = new THREE.Line(routeGeo, rm);
    routeLine.frustumCulled = false;
    scene.add(routeLine);
    rebuildOrbitRings();
}

/* 重建轨道环几何（距离比例变化时调用） */
function rebuildOrbitRings() {
    for (const b of BODIES) {
        if (!b.ring) continue;
        const d = orbitalDist(b.a);
        const incl = b.incl || 0;
        const pts = [];
        for (let i = 0; i <= 160; i++) {
            const ang = (i / 160) * Math.PI * 2;
            pts.push(new THREE.Vector3(Math.cos(ang) * d, Math.sin(ang) * d * incl, Math.sin(ang) * d));
        }
        b.ring.geometry.dispose();
        b.ring.geometry = new THREE.BufferGeometry().setFromPoints(pts);
    }
}

/* 行星 */
function addPlanets() {
    const loader = new THREE.TextureLoader();
    for (const b of BODIES) {
        let mesh;
        if (b.key === 'sun') {
            mesh = new THREE.Mesh(
                new THREE.SphereGeometry(b.r, 64, 64),
                new THREE.MeshBasicMaterial({ color: 0xfff0c0 })
            );
            const halo = new THREE.Sprite(new THREE.SpriteMaterial({
                map: glowTexture('255,190,90'), blending: THREE.AdditiveBlending,
                transparent: true, depthWrite: false, fog: false, opacity: 0.7
            }));
            halo.scale.set(b.r * 4.2, b.r * 4.2, 1);
            mesh.add(halo);
        } else {
            const tex = loader.load('/assets/textures/' + b.key + '.jpg');
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.anisotropy = 4;
            mesh = new THREE.Mesh(
                new THREE.SphereGeometry(b.r, 56, 56),
                new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95, metalness: 0.02 })
            );
            const atmo = new THREE.Sprite(new THREE.SpriteMaterial({
                map: glowTexture(hexToRgb(b.color)), blending: THREE.AdditiveBlending,
                transparent: true, depthWrite: false, opacity: 0.3
            }));
            atmo.scale.set(b.r * 3.4, b.r * 3.4, 1);
            mesh.add(atmo);
            if (b.key === 'saturn') {
                const ring = new THREE.Mesh(
                    new THREE.RingGeometry(b.r * 1.35, b.r * 2.15, 96),
                    new THREE.MeshBasicMaterial({
                        color: 0xe6cf9a, transparent: true, opacity: 0.42,
                        side: THREE.DoubleSide, depthWrite: false
                    })
                );
                ring.rotation.x = Math.PI / 2 - 0.28;
                mesh.add(ring);
            }
        }
        scene.add(mesh);
        planets.push({ mesh, data: b, spin: 0.02 + Math.random() * 0.06 });
        b.mesh = mesh;
    }
}

/* 相机 → 最近天体引导线 */
function addTether() {
    tetherGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0, 0)]);
    tetherLine = new THREE.Line(tetherGeo, new THREE.LineDashedMaterial({
        color: 0x86efac, dashSize: 90, gapSize: 70,
        transparent: true, opacity: 0.6, depthWrite: false
    }));
    tetherLine.frustumCulled = false;
    scene.add(tetherLine);
}

/* 跃迁光速线 */
function warpSpawn(b, deep) {
    b.z = deep ? (-2600 - Math.random() * 900) : (-160 - Math.random() * 2600);
    const ang = Math.random() * Math.PI * 2;
    const rad = Math.abs(b.z) * (0.04 + Math.random() * 0.46);
    b.x = Math.cos(ang) * rad;
    b.y = Math.sin(ang) * rad;
    b.len = 110 + Math.random() * 640;
    b.spd = 0.7 + Math.random() * 0.9;
}

function addWarp() {
    warpGeo = new THREE.BufferGeometry();
    warpGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(WARP_N * 6), 3));
    for (let i = 0; i < WARP_N; i++) {
        const b = { x: 0, y: 0, z: 0, len: 0, spd: 1 };
        warpSpawn(b, false);
        warpBase.push(b);
    }
    warpMat = new THREE.LineBasicMaterial({
        color: 0xdff0ff, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, fog: false
    });
    warpGroup = new THREE.LineSegments(warpGeo, warpMat);
    warpGroup.visible = false;
    warpGroup.frustumCulled = false;
    scene.add(warpGroup);
}

function updateWarpLines(dt, intensity) {
    if (!warpGroup) return;
    warpGroup.visible = intensity > 0.02;
    warpMat.opacity = Math.min(1, intensity * 0.95);
    warpGroup.position.copy(camPos);
    warpGroup.quaternion.copy(camera.quaternion);
    const arr = warpGeo.attributes.position.array;
    for (let i = 0; i < WARP_N; i++) {
        const b = warpBase[i];
        b.z += (320 + 4600 * intensity) * b.spd * dt;
        if (b.z > -8) warpSpawn(b, true);
        const len = b.len * (0.2 + intensity * 3.4);
        const o = i * 6;
        arr[o] = b.x; arr[o + 1] = b.y; arr[o + 2] = b.z;
        arr[o + 3] = b.x; arr[o + 4] = b.y; arr[o + 5] = b.z - len;
    }
    warpGeo.attributes.position.needsUpdate = true;
}

/* ===================== 初始化 ===================== */
function init() {
    const canvas = cv.value;
    W = canvas.clientWidth; H = canvas.clientHeight;

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, logarithmicDepthBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(W, H, false);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x05070f, 0.000012);

    camera = new THREE.PerspectiveCamera(62, W / H, 1, 3000000);
    camera.rotation.order = 'YXZ';

    computePositions();

    addFarStars();
    addDust();
    addNebula();
    addLines();
    addPlanets();
    addTether();
    addWarp();

    const sunLight = new THREE.PointLight(0xfff0d0, 4.2, 0, 0);
    sunLight.position.set(0, 0, 0);
    scene.add(sunLight);
    scene.add(new THREE.AmbientLight(0x33466e, 1.1));

    setTimeout(() => { loading.value = false; }, 800);
}

/* ===================== 主循环 ===================== */
let last = 0;
let coordAcc = 0;
let fpsAcc = 0, fpsCount = 0, renderScale = 1;

function animate(t) {
    raf = requestAnimationFrame(animate);
    const dt = Math.min(0.05, (t - last) / 1000 || 0.016);
    last = t;

    // 模拟时间推进（跃迁飞行中冻结，保证落点准确）
    const dDays = warp ? 0 : dt * daysPerSec.value;
    simDays += dDays;
    if (dDays > 0) computePositions();

    // 更新星球位置
    for (const p of planets) {
        const pos = posMap[p.data.key];
        if (pos) p.mesh.position.copy(pos);
        if (p.data.key !== 'sun') p.mesh.rotation.y += p.spin * dt;
    }

    // 更新轨道连线（把天体串联起来）
    if (routeGeo) {
        const list = BODIES.filter(b => b.key !== 'moon');
        const arr = routeGeo.attributes.position.array;
        list.forEach((b, i) => {
            const p = posMap[b.key];
            arr[i * 3] = p.x; arr[i * 3 + 1] = p.y; arr[i * 3 + 2] = p.z;
        });
        routeGeo.attributes.position.needsUpdate = true;
    }

    // ===== 跃迁动画 =====
    if (warp) {
        warp.t += dt;
        const k = Math.min(1, warp.t / warp.dur);
        const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        camPos.lerpVectors(warp.from, warp.to, e);
        yaw = lerpAngle(warp.yawFrom, warp.yawTo, e);
        pitch = warp.pitchFrom + (warp.pitchTo - warp.pitchFrom) * e;

        const intensity = Math.pow(Math.max(0, Math.sin(Math.PI * k)), 0.7);
        updateWarpLines(dt, intensity);
        const wSpeed = (warp.from.distanceTo(warp.to) / warp.dur) / 10;
        speedText.value = Math.max(0, wSpeed * Math.sin(Math.PI * k)).toFixed(1) + ' km/s';

        if (k >= 1) {
            warp = null;
            warping.value = false;
            warpGroup.visible = false;
            warpMat.opacity = 0;
        }
    } else {
        // 转向
        if (keys['a'] || keys['arrowleft']) yaw += 1.5 * dt;
        if (keys['d'] || keys['arrowright']) yaw -= 1.5 * dt;
        if (turn) yaw -= turn * 1.4 * dt;
        if (keys['q']) pitch = Math.min(1.25, pitch + 1.1 * dt);
        if (keys['e']) pitch = Math.max(-1.25, pitch - 1.1 * dt);

        // 推进
        let th = 0;
        if (keys['w'] || keys['arrowup']) th += 1;
        if (keys['s'] || keys['arrowdown']) th -= 1;
        th += thrust;

        camera.position.copy(camPos);
        camera.rotation.y = yaw;
        camera.rotation.x = pitch;
        camera.updateMatrixWorld();

        const fwd = new THREE.Vector3();
        camera.getWorldDirection(fwd);
        vel.addScaledVector(fwd, th * 2600 * dt);
        vel.multiplyScalar(Math.pow(0.986, dt * 60));
        camPos.addScaledVector(vel, dt);

        speedText.value = (vel.length() / 10).toFixed(1) + ' km/s';
    }

    // 同步相机
    camera.position.copy(camPos);
    camera.rotation.y = yaw;
    camera.rotation.x = pitch;
    camera.updateMatrixWorld();

    farStars.position.copy(camPos);

    // ===== HUD =====
    let best = null, bestAlt = Infinity;
    for (const b of BODIES) {
        const p = posMap[b.key];
        const d = camPos.distanceTo(p);
        const alt = Math.max(0, d - b.r);
        if (alt < bestAlt) { bestAlt = alt; best = b; }
    }
    // 跃迁目标优先：避免压缩比例下内外行星挨得太近导致显示跳变
    if (focusKey) {
        const fb = BODIES.find(x => x.key === focusKey);
        if (fb) {
            const fa = Math.max(0, camPos.distanceTo(posMap[fb.key]) - fb.r);
            if (fa < bestAlt * 2.4) { best = fb; bestAlt = fa; }
        }
    }
    if (best) {
        nearest.name = best.name;
        nearest.dist = bestAlt;
        nearest.gravity = best.gravity;
        nearest.desc = best.desc;

        if (tetherLine) {
            const arr = tetherGeo.attributes.position.array;
            const p = posMap[best.key];
            arr[0] = camPos.x; arr[1] = camPos.y; arr[2] = camPos.z;
            arr[3] = p.x; arr[4] = p.y; arr[5] = p.z;
            tetherGeo.attributes.position.needsUpdate = true;
            tetherLine.computeLineDistances();
        }
    }

    // 实时坐标
    coordAcc += dt;
    if (coordAcc > 0.08) {
        coordAcc = 0;
        coordText.value = 'X ' + camPos.x.toFixed(0) + '  Y ' + camPos.y.toFixed(0) + '  Z ' + camPos.z.toFixed(0);
        simLabel.value = (simDays / 365.25).toFixed(1) + ' 年';
    }

    // 自适应分辨率
    fpsAcc += dt; fpsCount++;
    if (fpsAcc >= 1) {
        const fps = fpsCount / fpsAcc;
        if (fps < 40 && renderScale > 0.6) { renderScale -= 0.1; renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5) * renderScale); }
        else if (fps > 55 && renderScale < 1) { renderScale = Math.min(1, renderScale + 0.05); renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5) * renderScale); }
        fpsAcc = 0; fpsCount = 0;
    }

    renderer.render(scene, camera);
}

/* ===================== 交互 ===================== */
function onKey(e, down) {
    const k = e.key.toLowerCase();
    keys[k] = down;
    if (['w', 'a', 's', 'd', 'q', 'e', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
}
const kd = e => onKey(e, true);
const ku = e => onKey(e, false);

let dragging = false, lx = 0, ly = 0;
function pDown(e) {
    dragging = true; isDragging.value = true;
    const t = e.touches ? e.touches[0] : e;
    lx = t.clientX; ly = t.clientY;
}
function pMove(e) {
    if (!dragging) return;
    const t = e.touches ? e.touches[0] : e;
    yaw -= (t.clientX - lx) * 0.0038;
    pitch = Math.max(-1.25, Math.min(1.25, pitch + (t.clientY - ly) * 0.0038));
    lx = t.clientX; ly = t.clientY;
}
function pUp() { dragging = false; isDragging.value = false; }

function fmtDist(d) {
    const km = d * 100;
    if (km < 1000) return km.toFixed(0) + ' km';
    if (km < 1e6) return (km / 1e4).toFixed(1) + ' 万 km';
    if (km < 1e9) return (km / 1e8).toFixed(2) + ' 亿 km';
    return (km / 1.496e8).toFixed(2) + ' AU';
}

function setThrust(v) { thrust = v; }
function brake() { vel.set(0, 0, 0); }

function jump(bodyKey) {
    const b = BODIES.find(x => x.key === bodyKey) || BODIES[3];
    const target = posMap[b.key].clone();
    const d = b.r * 4.6 + 320;
    let dirX = 0, dirY = 0, dirZ = 1;
    if (b.key !== 'sun') {
        const v = new THREE.Vector3(-target.x, -target.y, -target.z);
        if (v.length() > 1e-6) v.normalize();
        // 侧向 74°：既能看到半明半暗的晨昏线，又不会贴到太阳上
        const a = 1.3;
        dirX = v.x * Math.cos(a) - v.z * Math.sin(a);
        dirZ = v.x * Math.sin(a) + v.z * Math.cos(a);
        dirY = v.y;
    }
    const to = new THREE.Vector3(target.x + dirX * d, target.y + dirY * d + d * 0.12, target.z + dirZ * d);

    const dv = new THREE.Vector3(target.x - to.x, target.y - to.y, target.z - to.z);
    const dl = dv.length();
    const dir = dl > 1e-6 ? dv.divideScalar(dl) : new THREE.Vector3(0, 0, -1);
    const yawTo = Math.atan2(-dir.x, -dir.z);
    const pitchTo = Math.asin(Math.max(-1, Math.min(1, dir.y)));

    const dist = camPos.distanceTo(to);
    if (dist < 400) {
        camPos.copy(to); yaw = yawTo; pitch = pitchTo;
        if (camera) { camera.position.copy(camPos); camera.rotation.y = yaw; camera.rotation.x = pitch; }
        return;
    }

    warp = {
        from: camPos.clone(), to,
        yawFrom: yaw, yawTo,
        pitchFrom: pitch, pitchTo,
        t: 0, dur: Math.min(3.0, 1.5 + dist / 11000)
    };
    vel.set(0, 0, 0);
    warping.value = true;
    focusKey = b.key;
}
function reset() { jump('earth'); }

function onDistChange() {
    rebuildOrbitRings();
    // 位置变了，跳到当前位置最近的天体附近避免卡进星球里
    computePositions();
}

let clockTimer = null;
function tickClock() {
    const d = new Date();
    const p = n => String(n).padStart(2, '0');
    clock.value = d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
}

function resize() {
    if (!renderer || !camera) return;
    W = cv.value.clientWidth; H = cv.value.clientHeight;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
}

onMounted(() => {
    init();
    tickClock();
    clockTimer = setInterval(tickClock, 1000);
    window.addEventListener('resize', resize);
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    last = performance.now();
    raf = requestAnimationFrame(animate);
    // 入场：先到地球附近
    setTimeout(() => jump('earth'), 60);
});

onBeforeUnmount(() => {
    cancelAnimationFrame(raf);
    clearInterval(clockTimer);
    window.removeEventListener('resize', resize);
    window.removeEventListener('keydown', kd);
    window.removeEventListener('keyup', ku);
    if (renderer) { renderer.dispose(); renderer = null; }
    if (scene) {
        scene.traverse(o => {
            if (o.geometry) o.geometry.dispose();
            if (o.material) {
                if (o.material.map) o.material.map.dispose();
                if (o.material.dispose) o.material.dispose();
            }
        });
        scene = null;
    }
});
</script>

<template>
    <div class="flight" :class="{ embedded: props.embedded }">
        <canvas
            ref="cv"
            @mousedown="pDown" @mousemove="pMove" @mouseup="pUp" @mouseleave="pUp"
            @touchstart.prevent="pDown" @touchmove.prevent="pMove" @touchend.prevent="pUp"
        ></canvas>

        <div v-if="loading" class="flight-loading">
            <div class="loading-orb"></div>
            <p>正在生成 3D 宇宙…</p>
        </div>

        <div class="warp-overlay" :class="{ on: warping }"></div>

        <div class="hud hud-tl" :class="{ 'hud-live': isDragging }">
            <div class="hud-title"><i class="fas fa-location-crosshairs"></i> 航行状态</div>
            <div class="hud-row"><span class="k">最近天体</span><span class="v accent">{{ nearest.name }}</span></div>
            <div class="hud-row"><span class="k">高度</span><span class="v">{{ fmtDist(nearest.dist) }}</span></div>
            <div class="hud-row"><span class="k">表面重力</span><span class="v">{{ nearest.gravity }}</span></div>
            <div class="hud-row"><span class="k">坐标</span><span class="v coord">{{ coordText }}</span></div>
            <div class="hud-desc">{{ nearest.desc }}</div>
        </div>

        <div class="hud hud-tr">
            <div class="hud-row"><span class="k">速度</span><span class="v speed">{{ speedText }}</span></div>
            <div class="hud-row"><span class="k">星历</span><span class="v small">{{ clock }}</span></div>
            <div class="hud-row"><span class="k">模拟经过</span><span class="v small">{{ simLabel }}</span></div>
        </div>

        <div class="hud-hint">拖拽环视 · W/S 加速减速 · A/D 转向 · Q/E 俯仰</div>

        <div class="flight-ctl">
            <div class="ctl-group">
                <span class="ctl-label">推进</span>
                <button class="ctl-btn" @pointerdown="setThrust(1)" @pointerup="setThrust(0)" @pointerleave="setThrust(0)">
                    <i class="fas fa-rocket"></i> 加速
                </button>
                <button class="ctl-btn" @pointerdown="setThrust(-1)" @pointerup="setThrust(0)" @pointerleave="setThrust(0)">
                    <i class="fas fa-rotate-left"></i> 减速
                </button>
                <button class="ctl-btn" @click="brake"><i class="fas fa-hand"></i> 刹停</button>
            </div>
            <div class="ctl-group">
                <span class="ctl-label">转向</span>
                <button class="ctl-btn" @pointerdown="turn = 1" @pointerup="turn = 0" @pointerleave="turn = 0"><i class="fas fa-arrow-left"></i></button>
                <button class="ctl-btn" @pointerdown="turn = -1" @pointerup="turn = 0" @pointerleave="turn = 0"><i class="fas fa-arrow-right"></i></button>
            </div>
            <div class="ctl-group">
                <span class="ctl-label">跃迁</span>
                <select class="ctl-select" @change="jump($event.target.value); $event.target.value = ''">
                    <option value="">选择天体…</option>
                    <option v-for="b in BODIES" :key="b.key" :value="b.key">{{ b.name }}</option>
                </select>
                <button class="ctl-btn" @click="reset"><i class="fas fa-arrows-rotate"></i> 复位</button>
            </div>
            <div class="ctl-group slider-group">
                <span class="ctl-label">时间 <em>{{ timeLabel }}</em></span>
                <input class="ctl-range" type="range" min="0" max="100" v-model.number="timePct">
            </div>
            <div class="ctl-group slider-group">
                <span class="ctl-label">距离比例 <em>{{ distPct }}%</em></span>
                <input class="ctl-range" type="range" min="0" max="100" v-model.number="distPct" @change="onDistChange">
            </div>
        </div>
    </div>
</template>

<style scoped>
.flight {
    position: relative;
    height: calc(100vh - 73px);
    margin-top: 73px;
    overflow: hidden;
    background: #03040a;
}
.flight canvas { display: block; width: 100%; height: 100%; cursor: grab; }
.flight canvas:active { cursor: grabbing; }

/* 内嵌模式：顶部让出模式切换空间 */
.flight.embedded .hud-tl,
.flight.embedded .hud-tr { top: 4.4rem; }
.flight.embedded .hud-hint { top: 5.2rem; }

.flight-loading {
    position: absolute; inset: 0; display: flex; flex-direction: column;
    align-items: center; justify-content: center; gap: 1.2rem;
    background: #03040a; z-index: 20; color: var(--color-cyan);
}
.loading-orb {
    width: 60px; height: 60px; border-radius: 50%;
    background: radial-gradient(circle at 34% 30%, #fff, #7fb0ee 45%, #2d5a87);
    box-shadow: 0 0 40px rgba(127, 176, 238, 0.7);
    animation: spinOrb 1.6s ease-in-out infinite;
}
@keyframes spinOrb { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.12); } }
.flight-loading p { font-size: 0.9rem; letter-spacing: 0.08em; }

.warp-overlay {
    position: absolute; inset: -12%; pointer-events: none; z-index: 5;
    opacity: 0; transition: opacity 0.28s ease;
    background: repeating-conic-gradient(from 0deg at 50% 50%,
        rgba(196, 228, 255, 0.14) 0deg 0.45deg, transparent 0.45deg 2.2deg);
    -webkit-mask-image: radial-gradient(circle at 50% 50%, transparent 14%, #000 52%, transparent 84%);
    mask-image: radial-gradient(circle at 50% 50%, transparent 14%, #000 52%, transparent 84%);
    animation: warpPulse 0.85s linear infinite;
}
.warp-overlay.on { opacity: 1; }
@keyframes warpPulse { 0% { transform: scale(1); } 100% { transform: scale(1.3); } }

.hud {
    position: absolute;
    background: rgba(8, 12, 24, 0.6);
    border: 1px solid rgba(159, 212, 248, 0.25);
    border-radius: 14px; padding: 0.85rem 1.1rem;
    backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
    font-size: 0.82rem; min-width: 210px; pointer-events: none;
}
.hud-tl { top: 1.2rem; left: 1.2rem; }
.hud-tr { top: 1.2rem; right: 1.2rem; }
.hud-title { color: var(--color-cyan); font-size: 0.78rem; margin-bottom: 0.55rem; letter-spacing: 0.06em; }
.hud-row { display: flex; justify-content: space-between; gap: 1rem; padding: 0.2rem 0; }
.hud-row .k { color: var(--color-text-muted); }
.hud-row .v { color: #e8eefc; font-weight: 600; }
.hud-row .v.accent { color: var(--color-gold); }
.hud-row .v.speed { color: #86efac; font-family: ui-monospace, monospace; }
.hud-row .v.small { font-size: 0.76rem; color: var(--color-text-secondary); }
.hud-row .v.coord { font-family: ui-monospace, monospace; font-size: 0.74rem; color: #9fd4f8; }
.hud.hud-live { border-color: rgba(134, 239, 172, 0.65); box-shadow: 0 0 26px rgba(134, 239, 172, 0.28); }
.hud.hud-live .hud-row .v.coord { color: #86efac; }
.hud-desc { margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px dashed rgba(159, 212, 248, 0.2); color: var(--color-text-muted); font-size: 0.75rem; line-height: 1.6; max-width: 230px; }

.hud-hint {
    position: absolute; left: 50%; transform: translateX(-50%); top: 1.5rem;
    color: rgba(200, 214, 240, 0.5); font-size: 0.78rem;
    pointer-events: none; white-space: nowrap; letter-spacing: 0.04em;
}

.flight-ctl {
    position: absolute; left: 1.2rem; right: 1.2rem; bottom: 1.2rem;
    display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;
    background: rgba(8, 12, 24, 0.72);
    border: 1px solid rgba(159, 212, 248, 0.28);
    border-radius: 16px; padding: 0.8rem 1rem;
    backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
}
.ctl-group { display: flex; align-items: center; gap: 0.5rem; }
.ctl-label { color: var(--color-text-muted); font-size: 0.75rem; letter-spacing: 0.06em; white-space: nowrap; }
.ctl-label em { font-style: normal; color: var(--color-cyan); }
.ctl-btn {
    display: inline-flex; align-items: center; gap: 0.35rem;
    padding: 0.5rem 1rem; border-radius: 50px; font-size: 0.85rem;
    border: 1px solid rgba(159, 212, 248, 0.4); background: rgba(159, 212, 248, 0.08);
    color: #cfe0f8; cursor: pointer; transition: all 0.25s ease; user-select: none;
}
.ctl-btn:hover { background: rgba(159, 212, 248, 0.2); border-color: var(--color-cyan); color: #fff; }
.ctl-btn:active { transform: scale(0.96); background: var(--gradient-primary); border-color: transparent; }
.ctl-select {
    padding: 0.5rem 1rem; border-radius: 50px; font-size: 0.85rem;
    border: 1px solid rgba(159, 212, 248, 0.4); background: rgba(159, 212, 248, 0.08);
    color: #cfe0f8; cursor: pointer; font-family: inherit;
}
.ctl-select option { background: #0d0f18; color: #fff; }

.slider-group { flex: 1; min-width: 180px; }
.ctl-range {
    flex: 1; min-width: 90px; height: 4px; -webkit-appearance: none; appearance: none;
    background: rgba(159, 212, 248, 0.25); border-radius: 4px; outline: none; cursor: pointer;
}
.ctl-range::-webkit-slider-thumb {
    -webkit-appearance: none; appearance: none;
    width: 14px; height: 14px; border-radius: 50%;
    background: var(--gradient-primary); border: 1px solid rgba(200, 230, 255, 0.7);
    box-shadow: 0 0 10px rgba(157, 140, 240, 0.6); cursor: pointer;
}
.ctl-range::-moz-range-thumb {
    width: 14px; height: 14px; border-radius: 50%; border: none;
    background: #9d8cf0; cursor: pointer;
}

@media (max-width: 900px) {
    .hud { font-size: 0.75rem; min-width: 0; padding: 0.6rem 0.8rem; }
    .hud-desc { display: none; }
    .flight-ctl { padding: 0.6rem; gap: 0.5rem; }
    .ctl-btn { padding: 0.45rem 0.8rem; font-size: 0.78rem; }
    .hud-hint { display: none; }
    .slider-group { min-width: 140px; }
}
</style>
