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
