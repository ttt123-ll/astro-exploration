// RAG 检索：中文二元组（bigram）词法评分 + 向量余弦相似度（混合检索）
// 向量来源优先级：外部 embedding API（配置 AI_EMBED_*）→ 本地哈希向量（离线可用）
// 两路都存在时按权重融合，实现真正的「词法 + 向量」混合检索
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('../config');
const { getChunks } = require('./data');
const localVector = require('./localVector');

const CACHE_FILE = path.join(__dirname, '.embed-cache.json');

/* ---------- 词法索引 ---------- */
function bigrams(text) {
    const t = String(text).toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, '');
    const set = new Set();
    for (let i = 0; i < t.length - 1; i++) set.add(t.slice(i, i + 2));
    if (t.length === 1) set.add(t);
    return set;
}

let index = null;
function getIndex() {
    if (index) return index;
    const chunks = getChunks();
    index = chunks.map(c => ({
        bg: bigrams(c.title + ' ' + c.text + ' ' + c.tags.join(' ')),
        tags: c.tags
    }));
    return index;
}

/* 词法相似度：query 与 chunk 的 bigram 重合度（0~1），命中标签额外加权 */
function lexScore(query, chunk, idx) {
    const qbg = bigrams(query);
    if (!qbg.size) return 0;
    let hit = 0;
    for (const b of qbg) if (idx.bg.has(b)) hit++;
    let score = hit / qbg.size;
    // 标签完整命中：天文专名（如"猎户座""光年"）短而准，直接顶到前排
    for (const tag of idx.tags) {
        if (tag && tag.length >= 2 && query.includes(tag)) score += 0.35;
    }
    return Math.min(score, 1.5);
}

/* ---------- 外部向量索引（可选） ---------- */
let embedState = null; // { hash, vectors: number[][] }

function chunksHash() {
    const chunks = getChunks();
    return crypto.createHash('md5').update(chunks.map(c => c.text).join('')).digest('hex');
}

async function callEmbeddingApi(texts) {
    const { url, key, model } = config.embed;
    const r = await fetch(url.replace(/\/+$/, '') + '/embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
        body: JSON.stringify({ model, input: texts }),
        signal: AbortSignal.timeout(30000)
    });
    if (!r.ok) throw new Error('embed http ' + r.status);
    const j = await r.json();
    return j.data.map(d => d.embedding);
}

async function ensureEmbeddings() {
    if (!config.embed.enabled) return false;
    const hash = chunksHash();

    // 磁盘缓存命中直接复用（知识库不变就不重复调用 API）
    if (!embedState) {
        try {
            const raw = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
            if (raw.hash === hash && Array.isArray(raw.vectors)) embedState = raw;
        } catch (e) { /* 无缓存或损坏，重新构建 */ }
    }
    if (embedState && embedState.hash === hash) return true;

    const chunks = getChunks();
    const vectors = [];
    for (let i = 0; i < chunks.length; i += 32) {
        const batch = chunks.slice(i, i + 32).map(c => c.title + '\n' + c.text);
        vectors.push(...await callEmbeddingApi(batch));
    }
    embedState = { hash, vectors };
    try {
        fs.writeFileSync(CACHE_FILE, JSON.stringify(embedState));
    } catch (e) { /* 缓存写盘失败不影响检索 */ }
    return true;
}

function cosine(a, b) {
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i];
    }
    return (na && nb) ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
}

/**
 * 向量检索模式：
 * - 'api'   ：已配置外部 embedding，使用语义向量
 * - 'local' ：未配置外部服务，使用本地哈希向量（离线可用）
 */
function vectorMode() {
    return config.embed.enabled ? 'api' : 'local';
}

/* ---------- 对外检索 ---------- */
async function search(query, topK = 4) {
    const chunks = getChunks();
    if (!chunks.length) return [];
    const idx = getIndex();

    // 外部向量（可选）：配置并调用成功时优先使用
    let apiVecs = null;
    let qvecApi = null;
    try {
        if (await ensureEmbeddings()) {
            apiVecs = embedState.vectors;
            qvecApi = (await callEmbeddingApi([query]))?.[0] || null;
        }
    } catch (e) { apiVecs = null; qvecApi = null; }

    // 本地向量：始终构建（成本很低），作为离线语义信号
    let localScores = null;
    if (!(apiVecs && qvecApi)) {
        try { localScores = localVector.scoreChunks(query, chunks); } catch (e) { localScores = null; }
    }

    const scored = chunks.map((c, i) => {
        const lex = lexScore(query, c, idx[i]);
        let vec = 0;
        if (apiVecs && qvecApi && apiVecs[i]) {
            vec = (cosine(qvecApi, apiVecs[i]) + 1) / 2;      // 归一化到 0~1
        } else if (localScores && localScores[i]) {
            vec = localScores[i];                              // 已在 0~1
        }
        // 混合权重：有语义向量时提高其占比；纯本地时以词法为主、向量为辅
        const wLex = apiVecs && qvecApi ? 0.55 : 0.62;
        const wVec = 1 - wLex;
        const score = lex * wLex + vec * wVec;
        return { chunk: c, score, lex, vec };
    });

    const ranked = scored
        .filter(s => s.score > 0.12)
        .sort((a, b) => b.score - a.score);

    // 去重：不同来源页面可能收录同一段文字，只保留首个（按正文前缀判断）
    const picked = [];
    const seen = new Set();
    for (const s of ranked) {
        const key = String(s.chunk.text || '').replace(/\s+/g, '').slice(0, 40);
        if (seen.has(key)) continue;
        seen.add(key);
        picked.push({ ...s.chunk, _score: Number(s.score.toFixed(3)) });
        if (picked.length >= topK) break;
    }
    return picked;
}

function embeddingsReady() {
    // 兼容旧字段：任一向量通道可用即视为已启用
    return !!config.embed.enabled || true;
}

module.exports = { search, embeddingsReady, vectorMode };
