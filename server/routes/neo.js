// 近地天体（NEO）观察：优先取 NASA NeoWs 实时数据，失败时回退到内置离线数据
// 说明：NeoWs 需要 API Key，这里由服务端代理请求，前端不暴露 Key；
//       无网络 / 超限 / 无 Key 时返回本地精选数据，页面仍可完整演示。
const express = require('express');
const router = express.Router();
const wrap = require('../asyncRoute');

const NASA_KEY = process.env.NASA_API_KEY || 'DEMO_KEY';
const CACHE_MS = 6 * 60 * 60 * 1000;   // 6 小时缓存，避免打满 DEMO_KEY 限流

let cache = { at: 0, payload: null };

/* 内置离线数据：真实天体 + 真实/公认的近距离接近记录与预测 */
const FALLBACK = [
    {
        id: '99942', name: '(99942) 阿波菲斯 Apophis', hazardous: true,
        diameter: '370 m', velocity: '7.4 km/s', miss: '0.00026 AU（约 3.1 万 km）',
        approach: '2029-04-13', note: '2029 年将从地球同步卫星轨道内侧掠过，是近几十年最著名的一次近地相遇。'
    },
    {
        id: '2024YR4', name: '2024 YR4', hazardous: true,
        diameter: '约 55 m', velocity: '13.2 km/s', miss: '待精确观测',
        approach: '2032-12-22', note: '2024 年底发现的小行星，曾被评估有极小的撞击概率，后续观测已大幅下调。'
    },
    {
        id: '101955', name: '(101955) 贝努 Bennu', hazardous: true,
        diameter: '约 490 m', velocity: '6.3 km/s', miss: '0.003 AU（约 45 万 km）',
        approach: '2135-09-24', note: 'OSIRIS-REx 采样返回的目标天体，是本世纪最受关注的潜在威胁小行星之一。'
    },
    {
        id: '7482', name: '(7482) 1994 PC1', hazardous: true,
        diameter: '约 1.1 km', velocity: '19.6 km/s', miss: '0.013 AU（约 193 万 km）',
        approach: '2022-01-18', note: '2022 年近距离飞掠，亮度短时可达 10 等，是当年最亮的近地小行星之一。'
    },
    {
        id: '2023DZ2', name: '2023 DZ2', hazardous: false,
        diameter: '约 55 m', velocity: '6.8 km/s', miss: '0.00116 AU（约 17.3 万 km）',
        approach: '2023-03-25', note: '在月球轨道以内飞掠，因发现晚、距离近而广受关注，但并无撞击风险。'
    },
    {
        id: '2001FO32', name: '(231937) 2001 FO32', hazardous: true,
        diameter: '约 1.0 km', velocity: '34.4 km/s', miss: '0.0134 AU（约 200 万 km）',
        approach: '2021-03-21', note: '2021 年最快的近地飞掠之一，相对速度超过 34 km/s。'
    },
    {
        id: '162082', name: '(162082) 1998 HL1', hazardous: false,
        diameter: '约 550 m', velocity: '11.2 km/s', miss: '0.0413 AU（约 618 万 km）',
        approach: '2019-10-25', note: '体型较大但距离较远，被列为观测优先级较高的目标。'
    },
    {
        id: '2020VT4', name: '2020 VT4', hazardous: false,
        diameter: '约 10 m', velocity: '6.9 km/s', miss: '0.000034 AU（约 5,100 km）',
        approach: '2020-11-13', note: '有记录以来最近的非撞击飞掠之一，从地球表面上方约 370 km 处掠过。'
    }
];

function toLocalIso(d) {
    return new Date(d).toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' }).replace(/\//g, '-');
}

/* 把 NeoWs 返回的数据整理成前端需要的结构 */
function normalizeNeoWs(json) {
    const near = json.near_earth_objects || {};
    const list = [];
    for (const date of Object.keys(near).sort()) {
        for (const o of near[date]) {
            const d = o.estimated_diameter && o.estimated_diameter.meters;
            const diam = d ? (d.estimated_diameter_min + d.estimated_diameter_max) / 2 : 0;
            const v = (o.close_approach_data && o.close_approach_data[0]) || {};
            list.push({
                id: o.id,
                name: o.name,
                hazardous: !!o.is_potentially_hazardous_asteroid,
                diameter: diam >= 1000 ? (diam / 1000).toFixed(1) + ' km' : Math.round(diam) + ' m',
                velocity: v.relative_velocity ? Number(v.relative_velocity.kilometers_per_second).toFixed(1) + ' km/s' : '—',
                miss: v.miss_distance ? Number(v.miss_distance.astronomical).toFixed(5) + ' AU' : '—',
                approach: v.close_approach_date || date,
                note: o.is_potentially_hazardous_asteroid ? '被列为潜在威胁天体（尺寸与轨道满足预警标准）' : '尺寸或轨道不满足潜在威胁标准'
            });
        }
    }
    list.sort((a, b) => String(a.approach).localeCompare(String(b.approach)));
    return list;
}

async function fetchNeoWs() {
    const now = Date.now();
    if (cache.payload && now - cache.at < CACHE_MS) return cache.payload;

    const start = new Date();
    const end = new Date(start.getTime() + 7 * 24 * 3600 * 1000);
    const fmt = d => d.toISOString().slice(0, 10);
    const url = 'https://api.nasa.gov/neo/rest/v1/feed?start_date=' + fmt(start)
        + '&end_date=' + fmt(end) + '&api_key=' + encodeURIComponent(NASA_KEY);

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    try {
        const r = await fetch(url, { signal: ctrl.signal });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const json = await r.json();
        const objects = normalizeNeoWs(json);
        const payload = {
            source: 'nasa',
            window: { from: fmt(start), to: fmt(end) },
            count: objects.length,
            fetchedAt: new Date().toISOString(),
            objects
        };
        cache = { at: now, payload };
        return payload;
    } finally {
        clearTimeout(timer);
    }
}

router.get('/neo', wrap(async (req, res) => {
    try {
        const live = await fetchNeoWs();
        if (live.count > 0) return res.json({ ok: true, ...live });
        throw new Error('empty');
    } catch (e) {
        // 网络不可用 / 限流 / Key 无效：回退内置数据，页面照常可用
        return res.json({
            ok: true,
            source: 'local',
            fallbackReason: e.message,
            window: null,
            count: FALLBACK.length,
            fetchedAt: new Date().toISOString(),
            objects: FALLBACK.map(o => ({ ...o, approach: typeof o.approach === 'string' ? o.approach : toLocalIso(o.approach) }))
        });
    }
}));

module.exports = router;
