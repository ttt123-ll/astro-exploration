// AI 天文问答编排：工具调用 → RAG 检索 → 大模型生成 → 本地降级回答
// 降级策略（无 API key / 断网 / 超时）：直接基于检索到的站内资料作答，离线可演示
const config = require('./config');
const { search, embeddingsReady } = require('./rag/search');
const { runTools } = require('./rag/tools');
const { kbStats } = require('./rag/data');

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

/* ---------- 降级回答：直接组装检索资料 ---------- */
function composeFromChunks(chunks, _query) {
    const top = chunks.slice(0, 2);
    const body = top.map((c, i) => `【${i + 1}】${c.text}`).join('\n\n');
    return `根据站内天文资料：\n${body}\n\n—— 以上来自站内知识库（当前为离线模式，可配置 AI_API_KEY 启用大模型深度回答）。`;
}

/* ---------- 主流程 ---------- */
async function reply(message, sessionId) {
    const q = String(message || '').trim().slice(0, 200);
    if (!q) return { ok: false, reply: '请输入你想问的天文问题～', sources: [] };

    const history = getSession(sessionId)?.msgs || [];

    // 1) 工具调用（月相 / 今夜观星 / 页面导航）
    const { results: toolResults, action } = runTools(q);

    // 2) RAG 检索站内知识库
    const chunks = await search(q, 4);
    const sources = chunks.map(c => ({ title: c.title, route: c.route }));

    let answer = null;
    const toolNote = toolResults.length ? '【工具计算结果】\n' + toolResults.join('\n') + '\n\n' : '';

    if (llmEnabled()) {
        const ctx = chunks.length
            ? '【资料】\n' + chunks.map((c, i) => `【${i + 1}】${c.title}：${c.text}`).join('\n') + '\n\n'
            : '';
        const messages = [
            { role: 'system', content: SYSTEM_PROMPT },
            ...history.slice(-8),
            { role: 'user', content: toolNote + ctx + q }
        ];
        answer = await llmChat(messages);
    }

    let mode = llmEnabled() ? 'llm' : 'rag-local';
    let usedSources = sources;

    if (!answer) {
        // 降级：工具结果 + 检索资料直出
        if (toolResults.length && !chunks.length) {
            answer = toolNote.trim();
        } else if (chunks.length) {
            answer = toolNote + composeFromChunks(chunks, q);
        } else if (toolResults.length) {
            answer = toolNote.trim();
        } else {
            answer = '这个问题超出了站内知识库的范围 🤔 可以试试问我：今晚能看到什么星座、月相、黑洞、木星、猎户座、光年、超新星……或者点击推荐问题开始探索。';
        }
        usedSources = sources;
    } else {
        const parsed = parseCitations(answer, sources);
        answer = (toolNote.trim() ? toolNote + parsed.text : parsed.text) || answer;
        usedSources = parsed.sources.length ? parsed.sources : sources;
    }

    // 记录会话
    if (sessionId) {
        pushTurn(sessionId, 'user', q);
        pushTurn(sessionId, 'assistant', answer.slice(0, 2000));
    }

    return {
        ok: true,
        reply: answer,
        mode,
        action,
        sources: usedSources.slice(0, 4),
        stats: kbStats(),
        vector: embeddingsReady()
    };
}

function usingLLM() { return llmEnabled(); }

module.exports = { reply, usingLLM };
