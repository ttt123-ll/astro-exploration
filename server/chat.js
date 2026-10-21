// AI 问答编排升级：三级降级（LLM → 本地 RAG → 兜底）、工具调用、角标溯源
const config = require('./config');
const { search, vectorMode } = require('./rag/search');
const { runTools } = require('./rag/tools');
const { kbStats } = require('./rag/data');

/* 相关性门槛：最高分低于该值时视为「知识库无命中」，走第 3 级兜底引导 */
const MIN_RELEVANCE = 0.26;

function llmEnabled() {
    return !!(config.ai && config.ai.apiKey);
}

/* ---------- 多轮会话（内存态，30 分钟闲置过期，保留最近 8 轮） ---------- */
const sessions = new Map();
const SESSION_TTL = 30 * 60 * 1000;

function getSession(sid) {
    if (!sid) return null;
    const s = sessions.get(sid);
    if (!s) return null;
    if (Date.now() - s.ts > SESSION_TTL) { sessions.delete(sid); return null; }
    return s;
}

function pushTurn(sid, role, content) {
    let s = getSession(sid);
    if (!s) { s = { msgs: [], ts: 0 }; sessions.set(sid, s); }
    s.msgs.push({ role, content });
    if (s.msgs.length > 16) s.msgs = s.msgs.slice(-16);
    s.ts = Date.now();
}

/* ---------- 大模型调用（OpenAI 兼容接口） ---------- */
async function llmChat(messages, maxTokens = 500) {
    if (!llmEnabled()) return null;
    const { apiKey, baseUrl, model } = config.ai;
    try {
        const r = await fetch(baseUrl.replace(/\/+$/, '') + '/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + apiKey },
            body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature: 0.6 }),
            signal: AbortSignal.timeout(15000)
        });
        if (!r.ok) return null;
        const j = await r.json();
        return (j.choices && j.choices[0] && j.choices[0].message.content) || null;
    } catch (e) {
        return null;
    }
}

const SYSTEM_PROMPT =
    '你是"星语"，一个天文科普问答助手。规则：\n' +
    '1. 优先依据【资料】段落回答，不要编造资料中没有的数据；\n' +
    '2. 回答中引用资料时使用角标【1】【2】，对应资料编号；\n' +
    '3. 语言简洁通俗，控制在 220 字以内；\n' +
    '4. 用户的问题若与天文无关，礼貌引导回天文话题。';

/* 解析回答中的角标，映射为可点击的来源列表 */
function parseCitations(reply, sources) {
    const used = new Set();
    const text = String(reply).replace(/【(\d+)】/g, (_, n) => {
        const i = Number(n) - 1;
        if (sources[i]) { used.add(i); return ''; }
        return '';
    }).trim();
    return { text, sources: [...used].sort((a, b) => a - b).map(i => sources[i]) };
}

/* ---------- 第 2 级降级：直接组装检索资料（带角标，可溯源） ---------- */
function composeFromChunks(chunks) {
    const top = chunks.slice(0, 3);
    const body = top.map((c, i) => `【${i + 1}】${c.text}`).join('\n');
    return `根据站内天文资料：\n${body}\n（以上为本地知识库原文摘录，角标对应下方来源）`;
}

/* 第 3 级降级：知识库无命中时的引导语 */
const FALLBACK_REPLY =
    '这个问题超出了站内知识库的范围 🤔 可以试试问我：今晚能看到什么星座、现在的月相适合观星吗、' +
    '黑洞是怎么形成的、木星有多大、光年是什么单位——或者点下面的推荐问题开始探索。';

const SUGGESTIONS = ['今晚能看到什么星座？', '现在的月相适合观星吗？', '黑洞是怎么形成的？', '带我去看木星'];

/* ---------- 主流程 ---------- */
async function reply(message, sessionId) {
    const q = String(message || '').trim().slice(0, 200);
    if (!q) return { ok: false, reply: '请输入你想问的天文问题～', sources: [], level: 3 };

    const history = getSession(sessionId)?.msgs || [];

    // 1) 工具调用（月相 / 今夜观星 / 页面导航）——「哇」时刻都在这一层，不依赖大模型
    const { results: toolResults, action, tools } = runTools(q);
    const toolNote = toolResults.length ? toolResults.join('\n') : '';

    // 2) RAG 检索站内知识库（词法 + 向量混合）
    const rawChunks = await search(q, 4);
    // 只保留与问题足够相关的片段；全部不相关时交给第 3 级兜底
    const chunks = rawChunks.filter(c => (c._score || 0) >= MIN_RELEVANCE);
    const sources = chunks.map(c => ({ title: c.title, route: c.route, score: c._score }));

    let answer = null;
    let level = 2;

    // 第 1 级：大模型（配置了 AI_API_KEY 时）
    if (llmEnabled()) {
        const ctx = chunks.length
            ? '【资料】\n' + chunks.map((c, i) => `【${i + 1}】${c.title}：${c.text}`).join('\n') + '\n\n'
            : '';
        const messages = [
            { role: 'system', content: SYSTEM_PROMPT },
            ...history.slice(-8),
            { role: 'user', content: (toolNote ? '【工具计算结果】\n' + toolNote + '\n\n' : '') + ctx + q }
        ];
        answer = await llmChat(messages);
        if (answer) level = 1;
    }

    let usedSources = sources;

    if (level === 1 && answer) {
        // 第 1 级成功：保留工具结论 + 模型回答，角标映射为来源
        const parsed = parseCitations(answer, sources);
        answer = toolNote ? toolNote + '\n' + parsed.text : parsed.text;
        usedSources = parsed.sources.length ? parsed.sources : sources;
    } else {
        // 第 2 级：工具结论 + 知识库原文（本地抽取式回答）
        if (toolNote && chunks.length) {
            answer = toolNote + '\n\n' + composeFromChunks(chunks);
            level = 2;
        } else if (toolNote) {
            answer = toolNote;
            level = 2;
        } else if (chunks.length) {
            answer = composeFromChunks(chunks);
            level = 2;
        } else {
            // 第 3 级：兜底引导
            answer = FALLBACK_REPLY;
            usedSources = [];
            level = 3;
        }
    }

    // 记录会话
    if (sessionId) {
        pushTurn(sessionId, 'user', q);
        pushTurn(sessionId, 'assistant', answer.slice(0, 2000));
    }

    const modeMap = { 1: 'llm', 2: 'rag-local', 3: 'fallback' };

    return {
        ok: true,
        reply: answer,
        mode: modeMap[level],
        level,
        levelLabel: level === 1 ? '大模型生成' : level === 2 ? '本地知识库检索' : '超出知识库范围',
        tools: tools || [],
        vector: vectorMode(),
        action,
        sources: usedSources.slice(0, 4),
        suggestions: level === 3 ? SUGGESTIONS : [],
        stats: kbStats()
    };
}

function usingLLM() { return llmEnabled(); }

module.exports = { reply, usingLLM };
