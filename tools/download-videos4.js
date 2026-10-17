// 精确重下：按标题关键词过滤，避免拿到不相关的视频
const fs = require('fs');
const path = require('path');
const OUT = 'F:\\天文科普\\client\\public\\assets\\videos\\explain';

async function jget(url) { const r = await fetch(url); return await r.json(); }
async function head(url) {
    try { const r = await fetch(url, { method: 'HEAD' }); return parseInt(r.headers.get('content-length') || '0', 10); }
    catch (e) { return 0; }
}
async function dl(url, dest) {
    const r = await fetch(url);
    if (!r.ok) return 0;
    const b = Buffer.from(await r.arrayBuffer());
    fs.writeFileSync(dest, b); return b.length;
}
function collectUrls(node, out = []) {
    if (typeof node === 'string') { out.push(node); return out; }
    if (Array.isArray(node)) { node.forEach(x => collectUrls(x, out)); return out; }
    if (node && typeof node === 'object') {
        for (const k of ['collection', 'items', 'assets']) if (node[k]) collectUrls(node[k], out);
        if (node.href) out.push(node.href);
    }
    return out;
}
const MAX = 22 * 1024 * 1024;

const targets = [
    { name: 'explain_saturn', q: 'Saturn rings Cassini', must: /saturn/i },
    { name: 'explain_universe', q: 'Big Bang cosmology universe', must: /big bang|universe|cosmic|expansion/i },
    { name: 'explain_starsky', q: 'constellations night sky stars', must: /constellation|night sky|star/i }
];

(async () => {
    for (const t of targets) {
        try {
            const sr = await jget(`https://images-api.nasa.gov/search?q=${encodeURIComponent(t.q)}&media_type=video`);
            const items = (sr.collection && sr.collection.items) || [];
            let done = false;
            for (const it of items) {
                if (done) continue;
                const title = (it.data && it.data[0] && it.data[0].title) || '';
                if (!t.must.test(title)) continue;   // 标题必须命中关键词
                if (!it.href) continue;
                let mf; try { mf = await jget(it.href); } catch (e) { continue; }
                const mp4s = collectUrls(mf).filter(u => /\.mp4$/i.test(u));
                const order = ['~small.mp4', '~mobile.mp4', '~preview.mp4', '~medium.mp4', '~large.mp4', '~orig.mp4'];
                mp4s.sort((a, b) => {
                    const ra = order.findIndex(x => a.endsWith(x)), rb = order.findIndex(x => b.endsWith(x));
                    return (ra < 0 ? 99 : ra) - (rb < 0 ? 99 : rb);
                });
                for (const u of mp4s) {
                    const size = await head(u);
                    if (!size || size > MAX) continue;
                    const dest = path.join(OUT, t.name + '.mp4');
                    const got = await dl(u, dest);
                    if (got > 80000) {
                        console.log('OK:', t.name + '.mp4', (got / 1048576).toFixed(1) + 'MB |', title.slice(0, 55));
                        done = true; break;
                    } else fs.rmSync(dest, { force: true });
                }
            }
            if (!done) console.log('未获取:', t.name);
        } catch (e) { console.log('异常:', t.name, e.message); }
    }
    console.log('完成');
})().catch(e => { console.error('失败:', e.message); process.exit(1); });
