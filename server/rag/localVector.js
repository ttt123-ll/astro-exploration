/**
 * 本地向量索引（离线可用，零 API 依赖）
 *
 * 原理：文本切成中文二元组 + 英文单词，FNV-1a 哈希映射到固定维度（1024），
 * TF-IDF 加权后归一化；查询时与知识块余弦相似度。相当于确定性随机投影（hashing trick），
 * 不需要任何外部 embedding 服务，与词法 bigram 组合即为「词法 + 向量」混合检索。
 *
 * 持久化：索引以 gzip+base64 写入 server/rag/.local-index.json，
 * 内容 hash 不变则直接复用（启动/请求零重建）；知识库变化时自动重建并回写，
 * 可视为一个轻量「向量库」（1024 维 × N 条，带版本 hash 与增量重建）。
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');

const DIM = 1024;
const INDEX_FILE = path.join(__dirname, '.local-index.json');
const INDEX_VERSION = 2;

function fnv1a(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
}

/** 分词：中文按二元组，英文/数字按单词 */
function tokenize(text) {
    const s = String(text || '').toLowerCase();
    const tokens = [];
    for (const m of s.matchAll(/[a-z0-9]{2,}/g)) tokens.push('w:' + m[0]);
    const cjk = s.replace(/[^\u4e00-\u9fa5]+/g, ' ');
    for (const seg of cjk.split(/\s+/)) {
        if (!seg) continue;
        if (seg.length === 1) { tokens.push('c:' + seg); continue; }
        for (let i = 0; i < seg.length - 1; i++) tokens.push('c:' + seg.slice(i, i + 2));
    }
    return tokens;
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

/** 知识库内容 hash（用于判断索引是否过期） */
function chunksHash(chunks) {
    const h = crypto.createHash('md5');
    for (const c of chunks) h.update(String(c.id) + '\u0001' + (c.title || '') + '\u0001' + (c.text || '') + '\u0002');
    return h.digest('hex').slice(0, 16);
}

function buildIndex(chunks) {
    const n = chunks.length || 1;
    const tokenized = chunks.map(c => tokenize((c.title || '') + ' ' + (c.text || '') + ' ' + (c.tags || []).join(' ')));

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
    return { dim: DIM, idf, vectors, hash: chunksHash(chunks), builtAt: new Date().toISOString() };
}

/* ---------- 持久化 ---------- */
function encode(index) {
    const b64 = buf => Buffer.from(buf.buffer, buf.byteOffset, buf.byteLength).toString('base64');
    return {
        version: INDEX_VERSION,
        dim: index.dim,
        hash: index.hash,
        builtAt: index.builtAt,
        idf: b64(index.idf),
        vectors: index.vectors.map(b64)
    };
}

function decode(raw) {
    const toBuf = s => {
        const b = Buffer.from(s, 'base64');
        return new Float32Array(b.buffer, b.byteOffset, b.byteLength / 4);
    };
    return {
        dim: raw.dim,
        idf: toBuf(raw.idf),
        vectors: raw.vectors.map(toBuf),
        hash: raw.hash,
        builtAt: raw.builtAt
    };
}

function saveToDisk(index) {
    try {
        const payload = zlib.gzipSync(Buffer.from(JSON.stringify(encode(index)), 'utf8'), { level: 6 });
        fs.writeFileSync(INDEX_FILE, payload);
        return true;
    } catch (e) {
        return false;                       // 只读镜像/无权限时静默降级（内存索引仍可用）
    }
}

function loadFromDisk(hash) {
    try {
        if (!fs.existsSync(INDEX_FILE)) return null;
        const raw = JSON.parse(zlib.gunzipSync(fs.readFileSync(INDEX_FILE)).toString('utf8'));
        if (raw.version !== INDEX_VERSION || raw.hash !== hash || raw.dim !== DIM) return null;
        return decode(raw);
    } catch (e) {
        return null;
    }
}

/* ---------- 缓存与对外接口 ---------- */
let cache = { hash: null, index: null, source: null };

/** 获取索引：内存 → 磁盘 → 重建（并回写磁盘） */
function ensureIndex(chunks) {
    const hash = chunksHash(chunks);
    if (cache.hash === hash && cache.index) return cache;

    let index = loadFromDisk(hash);
    let source = 'disk';
    if (!index) {
        index = buildIndex(chunks);
        source = 'built';
        const saved = saveToDisk(index);
        if (saved) source = 'built+saved';
    }
    cache = { hash, index, source };
    return cache;
}

/** 给每个知识块打向量分（0~1） */
function scoreChunks(query, chunks) {
    const { index } = ensureIndex(chunks);
    const qv = vecFromTokens(tokenize(query), index.idf);
    return index.vectors.map(v => {
        let dot = 0;
        for (let i = 0; i < DIM; i++) dot += qv[i] * v[i];
        return dot;
    });
}

/** 索引状态（供 /api/chat/mode 展示，也用于答辩时说明「向量库」规模） */
function stats(chunks) {
    if (!chunks || !chunks.length) {
        return { dim: DIM, chunks: 0, hash: null, source: 'empty', file: path.basename(INDEX_FILE), sizeKB: 0 };
    }
    const { index, source } = ensureIndex(chunks);
    let sizeKB = 0;
    try { sizeKB = Math.round(fs.statSync(INDEX_FILE).size / 1024); } catch (e) { /* 无文件 */ }
    return {
        dim: index.dim,
        chunks: index.vectors.length,
        hash: index.hash,
        source,
        builtAt: index.builtAt,
        file: path.basename(INDEX_FILE),
        sizeKB
    };
}

/** 强制重建（工具脚本/知识库更新用） */
function rebuild(chunks) {
    const index = buildIndex(chunks);
    saveToDisk(index);
    cache = { hash: index.hash, index, source: 'rebuilt' };
    return index;
}

function invalidate() {
    cache = { hash: null, index: null, source: null };
}

module.exports = { scoreChunks, tokenize, stats, rebuild, invalidate, DIM, INDEX_FILE, chunksHash };
