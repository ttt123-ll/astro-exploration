// Function Calling 工具层：把站内能力暴露为 LLM 可调用的函数（工具）
// 说明：DeepSeek 等 OpenAI 兼容模型支持 tools/tool_calls；本地知识库模式仍走规则工具（rag/tools.js）
const { moonPhase, seasonConstellations } = require('./rag/tools');
const gearAdvisor = require('./rag/gearAdvisor');
const { search } = require('./rag/search');

/* ---------- 工具定义（OpenAI / DeepSeek 兼容 JSON Schema） ---------- */
const TOOL_DEFS = [
    {
        type: 'function',
        function: {
            name: 'moon_phase',
            description: '计算指定日期（默认今天）的月相：月龄、照亮比例、观星指数与观测建议。',
            parameters: {
                type: 'object',
                properties: {
                    date: { type: 'string', description: '日期，格式 YYYY-MM-DD；不传则用今天' }
                },
                required: []
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'tonight_sky',
            description: '获取今夜/当季可见星座与方位、天文暮光结束时间与最佳观测窗口。',
            parameters: {
                type: 'object',
                properties: {
                    lat: { type: 'number', description: '观测地纬度（默认 35，代表华北）' },
                    lon: { type: 'number', description: '观测地经度（默认 110，代表东八区中部）' }
                },
                required: []
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'gear_advice',
            description: '观星/摄影装备导购：根据预算（元）与用途（入门观星、拍月亮、拍深空、亲子）给出具体器材与理由。',
            parameters: {
                type: 'object',
                properties: {
                    budget: { type: 'number', description: '预算，单位元' },
                    purpose: {
                        type: 'string',
                        enum: ['入门观星', '拍月亮', '拍深空', '亲子', '进阶'],
                        description: '使用场景'
                    },
                    query: { type: 'string', description: '用户原始问题（可选，便于保留上下文）' }
                },
                required: []
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'search_knowledge',
            description: '在站内天文知识库中检索相关资料，返回可溯源的片段（标题、摘要、页面路径、相关度）。',
            parameters: {
                type: 'object',
                properties: {
                    query: { type: 'string', description: '检索关键词或问题' },
                    topK: { type: 'number', description: '返回条数，默认 3，最多 5' }
                },
                required: ['query']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'navigate_page',
            description: '根据用户意图返回站内页面跳转动作（如“带我去看木星”“打开星空图集”）。',
            parameters: {
                type: 'object',
                properties: {
                    page: {
                        type: 'string',
                        enum: ['home', 'solar-system', 'planet-show', 'encyclopedia', 'constellations', 'gallery', 'timeline', 'neo', 'news', 'community', 'videos', 'deep-space', 'explore', 'detail-planet'],
                        description: '目标页面标识'
                    },
                    planet: { type: 'string', description: '当 page=detail-planet 时，指定行星中文名，如 木星' }
                },
                required: ['page']
            }
        }
    }
];

/* ---------- 页面路由表 ---------- */
const PAGE_ROUTES = {
    home: { route: '/', label: '首页' },
    'solar-system': { route: '/solar-system', label: '太阳系行星' },
    'planet-show': { route: '/planet-show', label: '星球投影' },
    encyclopedia: { route: '/encyclopedia', label: '天文百科' },
    constellations: { route: '/constellations', label: '四季星座' },
    gallery: { route: '/gallery', label: '星空图集' },
    timeline: { route: '/timeline', label: '宇宙时间线' },
    neo: { route: '/neo', label: '近地天体' },
    news: { route: '/news', label: '宇宙新闻' },
    community: { route: '/community', label: '互动社区' },
    videos: { route: '/videos', label: '科普视频' },
    'deep-space': { route: '/deep-space', label: '深空天体' },
    explore: { route: '/explore', label: '探索工具' }
};
const PLANET_EN = { 水星: 'mercury', 金星: 'venus', 地球: 'earth', 火星: 'mars', 木星: 'jupiter', 土星: 'saturn', 天王星: 'uranus', 海王星: 'neptune' };

function safeDate(input) {
    const s = String(input || '').trim();
    if (!s) return new Date();
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? new Date() : d;
}

/* ---------- 工具执行器：统一返回 { ok, summary, payload, action, label } ---------- */
async function executeTool(name, args = {}) {
    try {
        switch (name) {
            case 'moon_phase': {
                const date = safeDate(args.date);
                const raw = moonPhase(date);
                const dateLabel = String(args.date || '').trim()
                    ? date.toISOString().slice(0, 10) + ' 的月相：'
                    : '今晚月相：';
                const summary = raw.replace(/^今晚月相：/, dateLabel);
                return {
                    ok: true,
                    summary,
                    label: '月相计算',
                    payload: {
                        date: date.toISOString().slice(0, 10),
                        summary,
                        start: '今天',
                        result: summary
                    }
                };
            }
            case 'tonight_sky': {
                const lat = Number(args.lat) || 35;
                const lon = Number(args.lon) || 110;
                /* 月相由 moon_phase 单独提供，这里只返回星座/观测窗口，避免重复 */
                const summary = seasonConstellations(new Date(), { lat, lon });
                return {
                    ok: true,
                    summary,
                    label: '今夜观星',
                    payload: { lat, lon, summary }
                };
            }
            case 'gear_advice': {
                const budget = Number(args.budget);
                const purpose = String(args.purpose || '').trim();
                const query = [args.query || '', budget ? `预算 ${budget} 元` : '', purpose].join(' ').trim();
                const g = gearAdvisor.advise(query || '推荐一套观星装备');
                if (!g || !g.handled) {
                    return { ok: false, summary: '装备引擎暂未匹配到合适方案，请补充预算与用途', label: '装备导购' };
                }
                return {
                    ok: true,
                    summary: g.reply,
                    label: '装备导购',
                    payload: { budget: budget || null, purpose: purpose || null, gear: g.gear || null, tools: g.tools || [] }
                };
            }
            case 'search_knowledge': {
                const q = String(args.query || '').trim();
                if (!q) return { ok: false, summary: '缺少检索关键词', label: '知识检索' };
                const topK = Math.min(Math.max(Number(args.topK) || 3, 1), 5);
                const chunks = ((await search(q, topK)) || []).filter(c => (c._score || 0) >= 0.26);
                const items = chunks.map(c => ({
                    title: c.title,
                    route: c.route,
                    score: c._score,
                    text: String(c.text || '').slice(0, 220)
                }));
                const summary = items.length
                    ? '站内检索到相关资料：\n' + items.map((c, i) => `【${i + 1}】${c.title}（相关度 ${c.score.toFixed(2)}，${c.route}）：${c.text}`).join('\n')
                    : '站内知识库没有检索到足够相关的资料。';
                return { ok: items.length > 0, summary, label: '知识检索', payload: { query: q, items } };
            }
            case 'navigate_page': {
                const page = String(args.page || '');
                if (page === 'detail-planet') {
                    const planet = String(args.planet || '').trim();
                    if (!PLANET_EN[planet]) return { ok: false, summary: '没有识别到要前往的行星', label: '页面导航' };
                    const route = `/detail/planet/${PLANET_EN[planet]}`;
                    return {
                        ok: true,
                        summary: `正在带你去${planet}详情页。`,
                        label: '页面导航',
                        action: { type: 'navigate', route, query: null, label: `${planet}详情页` },
                        payload: { route, label: `${planet}详情页` }
                    };
                }
                const target = PAGE_ROUTES[page];
                if (!target) return { ok: false, summary: '没有匹配到目标页面', label: '页面导航' };
                return {
                    ok: true,
                    summary: `正在带你去${target.label}。`,
                    label: '页面导航',
                    action: { type: 'navigate', route: target.route, query: null, label: target.label },
                    payload: target
                };
            }
            default:
                return { ok: false, summary: `未知工具：${name}`, label: '工具' };
        }
    } catch (e) {
        return { ok: false, summary: `工具 ${name} 执行失败：${e.message}`, label: '工具' };
    }
}

/** 是否需要先做「工具规划」：命中工具相关意图时才多花一次规划调用 */
const TOOL_HINT_RE = /月相|月亮|圆缺|今晚|今夜|观星|观测|预算|元|块钱|望远镜|装备|推荐|导航|带我去|打开|搜索|查一下|资料|站内|\d{4}年|\d{1,2}月\d{1,2}日|明天|下周/;
function mightNeedTools(text) {
    return TOOL_HINT_RE.test(String(text || ''));
}

/** 供前端展示：把工具结果压成简短摘要 */
function summarizeTools(toolsUsed) {
    return (toolsUsed || []).map(t => ({ name: t.name, label: t.label, ok: t.ok !== false }));
}

module.exports = { TOOL_DEFS, executeTool, mightNeedTools, summarizeTools, PAGE_ROUTES, PLANET_EN };
