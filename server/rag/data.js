// RAG 知识库构建：读取前端数据文件 → 切分为知识块（chunk）
// 每个 chunk：{ id, title, text, route, tags }
// 数据来源全部为站内自建内容（planets / constellations / content / timeline），无外部依赖
const path = require('path');
const fs = require('fs');
const FAQ = require('./faq');

const DATA_DIR = path.join(__dirname, '..', '..', 'client', 'src', 'data');

/* 前端数据文件是 ESM（export default），服务端是 CommonJS。
   数据文件均为纯数据，这里用函数作用域安全地求值，避免引入打包器 */
function loadEsmDefault(file) {
    const full = path.join(DATA_DIR, file);
    if (!fs.existsSync(full)) {
        // 数据文件缺失（如精简部署镜像未携带 client/src/data）时安全降级，
        // 返回空数组让知识库跳过该来源，而不是抛错导致接口 500
        return [];
    }
    try {
        const src = fs.readFileSync(full, 'utf8')
            .replace(/export\s+default\s+/, 'module.exports = ');
        const m = { exports: {} };
        new Function('module', 'exports', 'require', src)(m, m.exports, require);
        return m.exports;
    } catch (e) {
        return [];
    }
}

let cached = null;

function buildChunks() {
    const chunks = [];
    const add = (title, text, route, tags) => {
        const t = (text || '').trim();
        if (!t) return;
        chunks.push({
            id: chunks.length + 1,
            title,
            text: t.length > 520 ? t.slice(0, 520) + '…' : t,
            route,
            tags: tags || []
        });
    };

    // 1. 八大行星（planets.js）
    const planets = loadEsmDefault('planets.js');
    for (const p of planets) {
        const key = String(p.englishName || '').toLowerCase();
        add(
            `${p.name}（${p.englishName}）`,
            `${p.name}：${p.description} 基本数据——直径 ${p.diameter} 公里，质量 ${p.mass}，` +
            `距太阳 ${p.distance} 百万公里，自转周期 ${p.rotation} 天，公转周期 ${p.revolution} 年，已知卫星 ${p.moons} 颗。`,
            `/detail/planet/${key}`,
            [p.name, p.englishName, '行星', '太阳系']
        );
    }

    // 2. 星座（constellations.js：神话 + 观测要点）
    const constellations = loadEsmDefault('constellations.js');
    for (const c of constellations) {
        const key = String(c.latinName || '').toLowerCase();
        add(
            `星座·${c.name}（${c.latinName}）`,
            `${c.name}（拉丁名 ${c.latinName}）是${c.season}代表星座，最佳观测期 ${c.bestView}，` +
            `面积约 ${c.area}，主要亮星 ${c.starCount} 颗，最亮星为 ${c.brightestStar}。观测要点：${c.legend}`,
            `/detail/constellation/${key}`,
            [c.name, c.latinName, '星座', c.season]
        );
        if (c.mythology) {
            add(
                `${c.name}的神话故事`,
                `${c.name}神话：${c.mythology}`,
                `/detail/constellation/${key}`,
                [c.name, c.latinName, '神话', '故事']
            );
        }
    }

    // 3. 百科长文（content.js：恒星/星系/黑洞/深空天体/望远镜）
    const content = loadEsmDefault('content.js');
    const GROUP_LABEL = {
        star: '恒星', constellation: '星座', galaxy: '星系',
        blackhole: '黑洞', object: '深空天体', telescope: '望远镜'
    };
    for (const [group, items] of Object.entries(content)) {
        if (group === 'planet') continue; // 行星已由 planets.js 覆盖
        for (const [key, item] of Object.entries(items)) {
            if (!item || !Array.isArray(item.sections)) continue;
            for (const sec of item.sections) {
                const paras = (sec.paras || []).join(' ');
                if (!paras.trim()) continue;
                add(
                    `${item.title}·${sec.title}`,
                    `${item.title}——${sec.title}：${paras}`,
                    `/detail/${group}/${key}`,
                    [item.title, item.subtitle, GROUP_LABEL[group] || group, sec.title]
                );
            }
        }
    }

    // 4. 宇宙时间线（timeline.js）
    const timeline = loadEsmDefault('timeline.js');
    for (const e of timeline) {
        const body = [e.desc, e.detail].filter(Boolean).join(' ');
        add(
            `宇宙时间线·${e.title}（${e.time}）`,
            `${e.time}：${e.title}。${body}`,
            '/timeline',
            [e.title, e.time, '时间线', '宇宙历史']
        );
    }

    // 5. 常见概念 FAQ（补充高频提问，如光年/引力波/星等）
    for (const item of FAQ) {
        add(item.title, item.text, item.route, item.tags);
    }

    // 6. 观测装备选择原则（与装备导购引擎互补，供普通问答检索）
    const GEAR_FAQ = [
        {
            title: '望远镜口径越大越好吗',
            text: '口径决定集光能力与理论分辨率：口径越大，能看到越暗的天体、分辨出越细的细节。' +
                '但口径增大也带来重量、价格与对赤道仪载重的要求，行星细节还受大气视宁度限制。' +
                '经验上：70-80mm 适合看月亮与入门；130-150mm 是目视深空起点；200mm 以上能兼顾细节与摄影。',
            route: '/assistant', tags: ['口径', '望远镜', '装备', '分辨率']
        },
        {
            title: '折射、反射、马卡、施卡有什么区别',
            text: '折射镜用透镜成像，星点锐利、免维护，适合月面行星与深空摄影，但同口径价格最高；' +
                '反射镜（牛顿式）用凹面镜，同价位口径最大，适合目视深空，需要定期校准光轴；' +
                '马卡与施卡是折反结合，焦距长、体积小，适合行星观测与携带。',
            route: '/assistant', tags: ['折射', '反射', '马卡', '施卡', '装备']
        },
        {
            title: '赤道仪和经纬仪怎么选',
            text: '经纬仪结构简单、上手快，适合目视与儿童入门，但高倍率下目标会因地球自转漂移；' +
                '赤道仪对准极轴后可抵消地球自转，适合长时间观测与摄影，双轴电跟 + 导星接口是深空摄影的必要条件。' +
                '深空摄影建议赤道仪优先级高于主镜，载重留 30% 以上余量。',
            route: '/assistant', tags: ['赤道仪', '经纬仪', '跟踪', '装备', '摄影']
        },
        {
            title: '焦比与深空摄影的关系',
            text: '焦比 = 焦距 ÷ 口径（如 f/5、f/10）。焦比越小单位时间收集到的光子越多，深空摄影曝光效率越高；' +
                '焦比越大则相同口径下焦距更长，更适合行星与月面高倍率成像。' +
                '快焦比系统对光轴校准、调焦精度要求更高，常需彗差校正镜。',
            route: '/assistant', tags: ['焦比', '焦距', '深空摄影', '装备']
        },
        {
            title: '目镜与放大倍率怎么选',
            text: '放大倍率 = 物镜焦距 ÷ 目镜焦距。有效倍率一般不超过口径（mm）的 2 倍，最低约口径 ÷ 7，超过上限只会变暗变糊。' +
                '看月亮行星常用 100-250 倍，目视深空反而适合低倍率大视场。建议备 2-3 只目镜（低/中/高倍）加一只 2x 巴洛镜。',
            route: '/assistant', tags: ['目镜', '倍率', '巴洛镜', '装备']
        },
        {
            title: '城市光害下怎么观测与拍照',
            text: '城市光害会显著降低深空天体的对比度。目视时可选 UHC/OIII 等窄带滤镜提升星云对比；' +
                '摄影时用光害滤镜或多张短曝光叠加，并尽量选择城郊、山顶等暗夜环境；' +
                '月亮与行星受光害影响较小，城市里也能获得不错效果。',
            route: '/assistant', tags: ['光害', '滤镜', '城市', '观测', '摄影']
        }
    ];
    for (const item of GEAR_FAQ) {
        add(item.title, item.text, item.route, item.tags);
    }

    return chunks;
}

function getChunks() {
    if (!cached) cached = buildChunks();
    return cached;
}

/* 知识库统计（答辩/调试用） */
function kbStats() {
    const chunks = getChunks();
    const routes = new Set(chunks.map(c => c.route));
    return { chunks: chunks.length, sources: routes.size };
}

module.exports = { getChunks, kbStats, loadEsmForTools: loadEsmDefault };
