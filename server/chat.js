// AI 问答编排升级：三级降级（LLM → 本地 RAG → 兜底）、工具调用、角标溯源
const config = require('./config');
const { search, vectorMode } = require('./rag/search');
const { runTools } = require('./rag/tools');
const gearAdvisor = require('./rag/gearAdvisor');
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

/* ---------- 多受众提示词：同样的内容，不同表达方式 ---------- */
const SYSTEM_PROMPTS = {
    child:
        '你是"星语"，面向儿童的天文科普助手。规则：\n' +
        '1. 用小学生能听懂的话，多用比喻，句子要短；\n' +
        '2. 尽量不用专业术语，必须用时立刻用一句话解释；\n' +
        '3. 回答控制在 120 字以内；\n' +
        '4. 引用资料用【1】【2】角标；\n' +
        '5. 与天文无关的问题，礼貌引导回天文话题。',
    amateur:
        '你是"星语"，面向天文爱好者的科普助手。规则：\n' +
        '1. 优先依据【资料】作答，不编造数据；\n' +
        '2. 引用资料时用【1】【2】角标；\n' +
        '3. 结构清晰：先给结论，再讲参数与理由；\n' +
        '4. 控制在 220 字以内；\n' +
        '5. 与天文无关的问题，礼貌引导回天文话题。',
    pro:
        '你是"星语"，面向有经验的天文爱好者与从业者。规则：\n' +
        '1. 可以使用专业术语，给出规格、数量级与取舍权衡；\n' +
        '2. 引用资料时用【1】【2】角标；\n' +
        '3. 不确定的数据要明确说明不确定；\n' +
        '4. 控制在 300 字以内；\n' +
        '5. 与天文无关的问题，礼貌引导回天文话题。'
};

const AUDIENCE_KEYS = ['child', 'amateur', 'pro'];
function normalizeAudience(v) {
    return AUDIENCE_KEYS.includes(v) ? v : 'amateur';
}

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

/* ---------- 第 2 级降级：直接组装检索资料（按受众调整详略与措辞） ---------- */
function composeFromChunks(chunks, audience) {
    const firstSentence = s => {
        const m = String(s || '').match(/^[^。！？!?]{6,}[。！？!?]?/);
        return (m ? m[0] : String(s || '')).trim();
    };

    if (audience === 'child') {
        const top = chunks.slice(0, 2);
        const body = top.map((c, i) => `【${i + 1}】${firstSentence(c.text)}`).join('\n');
        return `简单说：\n${body}\n（这是站内资料里的说法，角标对应下面来源）`;
    }
    if (audience === 'pro') {
        const top = chunks.slice(0, 4);
        const body = top.map((c, i) => `【${i + 1}】${c.text}`).join('\n');
        return `检索到的站内资料（原文摘录，可按角标核对）：\n${body}`;
    }
    const top = chunks.slice(0, 3);
    const body = top.map((c, i) => `【${i + 1}】${c.text}`).join('\n');
    return `根据站内天文资料：\n${body}\n（以上为本地知识库原文摘录，角标对应下方来源）`;
}

/* 第 3 级降级：知识库无命中时的引导语 */
const FALLBACK_REPLY =
    '这个问题超出了站内知识库的范围 🤔 可以试试问我：今晚能看到什么星座、现在的月相适合观星吗、' +
    '黑洞是怎么形成的、木星有多大、光年是什么单位——或者点下面的推荐问题开始探索。';

const SUGGESTIONS = ['今晚能看到什么星座？', '现在的月相适合观星吗？', '黑洞是怎么形成的？', '带我去看木星'];

/* ---------- 大模型流式调用：边生成边回调，用于 SSE 打字机效果 ---------- */
async function llmChatStream(messages, maxTokens, onDelta) {
    if (!llmEnabled()) return false;
    const { apiKey, baseUrl, model } = config.ai;
    try {
        const r = await fetch(baseUrl.replace(/\/+$/, '') + '/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + apiKey },
            body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature: 0.6, stream: true }),
            signal: AbortSignal.timeout(60000)
        });
        if (!r.ok || !r.body) return false;

        const reader = r.body.getReader();
        const decoder = new TextDecoder();
        let buf = '';
        let got = false;
        for (;;) {
            const { value, done } = await reader.read();
            if (done) break;
            buf += decoder.decode(value, { stream: true });
            let idx;
            while ((idx = buf.indexOf('\n')) >= 0) {
                const line = buf.slice(0, idx).trim();
                buf = buf.slice(idx + 1);
                if (!line.startsWith('data:')) continue;
                const data = line.slice(5).trim();
                if (!data || data === '[DONE]') continue;
                try {
                    const j = JSON.parse(data);
                    const delta = j.choices && j.choices[0] && j.choices[0].delta;
                    if (delta && delta.content) { got = true; onDelta(delta.content); }
                } catch (e) { /* 忽略非 JSON 行（心跳等） */ }
            }
        }
        return got;
    } catch (e) {
        return false;
    }
}

/* ---------- 流式主流程：meta → delta… → done ----------
 * handlers: { meta(obj), delta(text), done(obj) }
 * 装备/工具/本地检索分支把完整文本作为一段 delta 发送，前端统一做逐字打字机；
 * 大模型分支按 token 实时回调，前端边收边显示。 */
async function streamReply(message, sessionId, audienceInput, handlers) {
    const h = handlers || {};
    const meta = h.meta || (() => {});
    const delta = h.delta || (() => {});
    const done = h.done || (() => {});

    const audience = normalizeAudience(audienceInput);
    const q = String(message || '').trim().slice(0, 200);
    if (!q) {
        meta({ level: 3, levelLabel: '超出知识库范围', sources: [], tools: [], audience });
        delta('请输入你想问的天文问题～');
        done({ suggestions: SUGGESTIONS, action: null, stats: kbStats() });
        return;
    }

    const history = getSession(sessionId)?.msgs || [];
    const finish = (answer, extra) => {
        if (sessionId) {
            pushTurn(sessionId, 'user', q);
            pushTurn(sessionId, 'assistant', String(answer).slice(0, 2000));
        }
        done({ ...extra, stats: kbStats() });
    };

    // 0) 装备导购：规则引擎直接作答
    if (gearAdvisor.isGearQuery(q)) {
        const g = gearAdvisor.advise(q, { audience });
        if (g.handled) {
            meta({
                level: 2, levelLabel: '装备导购引擎', mode: 'rag-local',
                audience, sources: [], tools: g.tools || [], vector: vectorMode(),
                action: null, gear: g.gear || null
            });
            delta(g.reply);
            finish(g.reply, { gear: g.gear || null, tools: g.tools || [], sources: [], suggestions: [], action: null });
            return;
        }
    }

    // 1) 工具调用（月相 / 今夜观星 / 页面导航）
    const { results: toolResults, action, tools } = runTools(q);
    const toolNote = toolResults.length ? toolResults.join('\n') : '';

    // 2) RAG 检索
    const rawChunks = await search(q, 4);
    const chunks = rawChunks.filter(c => (c._score || 0) >= MIN_RELEVANCE);
    const sources = chunks.map(c => ({ title: c.title, route: c.route, score: c._score }));

    let level = llmEnabled() ? 1 : 2;
    meta({
        level,
        levelLabel: level === 1 ? '大模型生成' : '本地知识库检索',
        mode: level === 1 ? 'llm' : 'rag-local',
        audience, sources: sources.slice(0, 4), tools: tools || [], vector: vectorMode(),
        action, gear: null
    });

    // 工具结论先发（如果有），让用户第一时间看到月相/观星结果
    if (toolNote) delta(toolNote + '\n');

    // 第 1 级：大模型流式生成
    if (level === 1) {
        const ctx = chunks.length
            ? '【资料】\n' + chunks.map((c, i) => `【${i + 1}】${c.title}：${c.text}`).join('\n') + '\n\n'
            : '';
        const messages = [
            { role: 'system', content: SYSTEM_PROMPTS[audience] || SYSTEM_PROMPTS.amateur },
            ...history.slice(-8),
            { role: 'user', content: (toolNote ? '【工具计算结果】\n' + toolNote + '\n\n' : '') + ctx + q }
        ];
        let streamed = '';
        const ok = await llmChatStream(messages, 500, t => { streamed += t; delta(t); });
        if (ok && streamed.trim()) {
            const parsed = parseCitations(streamed, sources);
            finish(toolNote + '\n' + parsed.text, {
                sources: (parsed.sources.length ? parsed.sources : sources).slice(0, 4),
                tools: tools || [], suggestions: [], action
            });
            return;
        }
        level = 2;
    }

    // 第 2 / 3 级：本地检索或兜底（整段发送，前端逐字显示）
    let answer;
    let usedSources = sources;
    if (toolNote && chunks.length) answer = toolNote + '\n\n' + composeFromChunks(chunks, audience);
    else if (toolNote) answer = toolNote;
    else if (chunks.length) answer = composeFromChunks(chunks, audience);
    else { answer = FALLBACK_REPLY; usedSources = []; level = 3; }

    if (!toolNote) delta(answer);
    else delta(toolNote && chunks.length ? composeFromChunks(chunks, audience) : '');

    finish(answer, {
        level,
        levelLabel: level === 2 ? '本地知识库检索' : '超出知识库范围',
        mode: level === 2 ? 'rag-local' : 'fallback',
        sources: usedSources.slice(0, 4),
        suggestions: level === 3 ? SUGGESTIONS : [],
        tools: tools || [], action
    });
}

/* ---------- 主流程 ---------- */
async function reply(message, sessionId, audienceInput) {
    const audience = normalizeAudience(audienceInput);
    const q = String(message || '').trim().slice(0, 200);
    if (!q) return { ok: false, reply: '请输入你想问的天文问题～', sources: [], level: 3 };

    const history = getSession(sessionId)?.msgs || [];

    // 0) 装备导购 / 参数助手：规则引擎直接作答，结果可结构化展示
    if (gearAdvisor.isGearQuery(q)) {
        const g = gearAdvisor.advise(q, { audience });
        if (g.handled) {
            if (sessionId) {
                pushTurn(sessionId, 'user', q);
                pushTurn(sessionId, 'assistant', String(g.reply).slice(0, 2000));
            }
            return {
                ok: true,
                reply: g.reply,
                mode: 'rag-local',
                level: 2,
                levelLabel: '装备导购引擎',
                audience,
                tools: g.tools || [],
                vector: vectorMode(),
                action: null,
                sources: [],
                gear: g.gear || null,
                stats: kbStats()
            };
        }
    }

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
            { role: 'system', content: SYSTEM_PROMPTS[audience] || SYSTEM_PROMPTS.amateur },
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
        // 第 2 级：工具结论 + 知识库原文（本地抽取式回答，按受众调整）
        if (toolNote && chunks.length) {
            answer = toolNote + '\n\n' + composeFromChunks(chunks, audience);
            level = 2;
        } else if (toolNote) {
            answer = toolNote;
            level = 2;
        } else if (chunks.length) {
            answer = composeFromChunks(chunks, audience);
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
        audience,
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

module.exports = { reply, streamReply, usingLLM };
