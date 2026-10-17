// 补充下载更多 NASA 视频（让各页面视频尽量不重复）
const fs = require('fs');
const path = require('path');

const OUT = 'F:\\天文科普\\client\\public\\assets\\videos\\explain';
fs.mkdirSync(OUT, { recursive: true });

async function jget(url) { const r = await fetch(url); return await r.json(); }
async function head(url) {
    try { const r = await fetch(url, { method: 'HEAD' }); return parseInt(r.headers.get('content-length') || '0', 10); }
    catch (e) { return 0; }
}
async function dl(url, dest) {
    const r = await fetch(url);
    if (!r.ok) return 0;
    const b = Buffer.from(await r.arrayBuffer());
    fs.writeFileSync(dest, b);
    return b.length;
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

const targets = [
    { name: 'explain_jupiter', q: 'Jupiter NASA', topics: ['solar', 'planet'] },
    { name: 'explain_saturn', q: 'Saturn Cassini NASA', topics: ['solar', 'planet'] },
    { name: 'explain_galaxy', q: 'Milky Way galaxy NASA', topics: ['galaxy', 'gallery', 'deepspace'] },
    { name: 'explain_supernova', q: 'supernova remnant NASA', topics: ['star', 'deepspace'] },
    { name: 'explain_nebula', q: 'nebula Hubble NASA', topics: ['deepspace', 'gallery'] },
    { name: 'explain_universe', q: 'universe expansion NASA', topics: ['timeline', 'deepspace'] },
    { name: 'explain_sky', q: 'night sky stars NASA', topics: ['constellation', 'star'] }
];

const MAX = 25 * 1024 * 1024;

(async () => {
    const meta = [];
    for (const t of targets) {
        try {
            const sr = await jget(`https://images-api.nasa.gov/search?q=${encodeURIComponent(t.q)}&media_type=video`);
            const items = (sr.collection && sr.collection.items) || [];
            let done = false;
            for (const it of items) {
                if (done || !it.href) continue;
                const title = (it.data && it.data[0] && it.data[0].title) || '';
                let mf; try { mf = await jget(it.href); } catch (e) { continue; }
                const mp4s = collectUrls(mf).filter(u => /\.mp4$/i.test(u));
                // 由小到大排序，优先小文件
                const order = ['~small.mp4', '~mobile.mp4', '~preview.mp4', '~medium.mp4', '~large.mp4', '~orig.mp4'];
                const sorted = mp4s.slice().sort((a, b) => {
                    const ra = order.findIndex(x => a.endsWith(x)), rb = order.findIndex(x => b.endsWith(x));
                    return (ra < 0 ? 99 : ra) - (rb < 0 ? 99 : rb);
                });
                for (const u of sorted) {
                    const size = await head(u);
                    if (!size || size > MAX) continue;
                    const dest = path.join(OUT, t.name + '.mp4');
                    const got = await dl(u, dest);
                    if (got > 80000) {
                        console.log('OK:', t.name + '.mp4', (got / 1048576).toFixed(1) + 'MB |', title.slice(0, 45));
                        meta.push({ name: t.name, title, topics: t.topics });
                        done = true;
                        break;
                    } else fs.rmSync(dest, { force: true });
                }
            }
            if (!done) console.log('未获取:', t.name);
        } catch (e) { console.log('异常:', t.name, e.message); }
    }
    fs.writeFileSync(path.join(OUT, 'meta3.json'), JSON.stringify(meta, null, 2), 'utf8');
    console.log('\n新增视频:', meta.length);
})().catch(e => { console.error('失败:', e.message); process.exit(1); });
