/**
 * 本地向量检索（离线可用，零 API 依赖）
 *
 * 原理：把文本切成中文二元组 + 英文单词，用 FNV-1a 哈希映射到固定维度（1024 维），
 * 以 TF-IDF 加权后归一化，得到稀疏向量；查询时与知识块做余弦相似度。
 * 这相当于一次确定性随机投影（hashing trick），无需任何外部 embedding 服务，
 * 与词法 bigram 检索组合即为「词法 + 向量」混合检索。
 */

const DIM = 1024;

function fnv1a(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
}

/** 分词：中文按二元组，英文/数字按单词，过滤标点与空白 */
function tokenize(text) {
    const s = String(text || '').toLowerCase();
    const tokens = [];

    // 英文/数字单词
    for (const m of s.matchAll(/[a-z0-9]{2,}/g)) tokens.push('w:' + m[0]);

    // 中文连续片段 → 二元组（单字也保留）
    const cjk = s.replace(/[^\u4e00-\u9fa5]+/g, ' ');
    for (const seg of cjk.split(/\s+/)) {
        if (!seg) continue;
        if (seg.length === 1) { tokens.push('c:' + seg); continue; }
        for (let i = 0; i < seg.length - 1; i++) tokens.push('c:' + seg.slice(i, i + 2));
    }
    return tokens;
}

/** 构建索引：idf + 已归一化的块向量 */
function buildIndex(chunks) {
    const n = chunks.length || 1;
    const tokenized = chunks.map(c => tokenize((c.title || '') + ' ' + (c.text || '') + ' ' + (c.tags || []).join(' ')));

    // 文档频率
    const df = new Uint32Array(DIM);
    for (const toks of tokenized) {
        const seen = new Set();
        for (const t of toks) {
            const h = fnv1a(t) % DIM;
            if (!seen.has(h)) { seen.add(h); df[h]++; }
        }
    }

    const idf = new Float32Array(DIM);
    for (let i = 0; i < DIM; i++) idf[i] = Math.log(1 + n / (1 + df[i]));

    const vectors = tokenized.map(toks => vecFromTokens(toks, idf));
    return { idf, vectors, hash: String(n) };
}

function vecFromTokens(tokens, idf) {
    const tf = new Float32Array(DIM);
    for (const t of tokens) tf[fnv1a(t) % DIM]++;

    const v = new Float32Array(DIM);
    let norm = 0;
    for (let i = 0; i < DIM; i++) {
        if (!tf[i]) continue;
        const val = (1 + Math.log(tf[i])) * idf[i];
        v[i] = val;
        norm += val * val;
    }
    if (norm > 0) {
        const inv = 1 / Math.sqrt(norm);
        for (let i = 0; i < DIM; i++) if (v[i]) v[i] *= inv;
    }
    return v;
}

/** 查询向量（IDF 来自索引，保证与块向量同一空间） */
function queryVector(text, idf) {
    return vecFromTokens(tokenize(text), idf);
}

function cosine(a, b) {
    let dot = 0;
    for (let i = 0; i < DIM; i++) dot += a[i] * b[i];
    return dot; // 两边都已归一化
}

let cache = { key: null, index: null };

/** 获取（或重建）本地向量索引 */
function getLocalVectors(chunks) {
    const key = chunks.length + ':' + (chunks[0] ? chunks[0].id : 0) + ':' + (chunks[chunks.length - 1] ? chunks[chunks.length - 1].id : 0);
    if (cache.key === key && cache.index) return cache.index;
    cache = { key, index: buildIndex(chunks) };
    return cache.index;
}

/** 给每个块打分（0~1） */
function scoreChunks(query, chunks) {
    const index = getLocalVectors(chunks);
    const qv = queryVector(query, index.idf);
    return index.vectors.map(v => cosine(qv, v));
}

module.exports = { scoreChunks, tokenize, DIM };
