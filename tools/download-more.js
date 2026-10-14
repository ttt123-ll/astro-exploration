// 增量下载：更多 NASA 科普视频 + 真实图片（公有领域）
const fs = require('fs');
const path = require('path');

const VID = 'F:\\天文科普\\client\\public\\assets\\videos\\explain';
const IMG = 'F:\\天文科普\\client\\public\\assets\\images\\official';
fs.mkdirSync(VID, { recursive: true });
fs.mkdirSync(IMG, { recursive: true });

async function jget(url) { const r = await fetch(url); return await r.json(); }
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

// ---------- 视频 ----------
const vids = [
    { name: 'explain_moon', q: 'Moon Apollo NASA' },
    { name: 'explain_mars', q: 'Mars rover NASA video' },
    { name: 'explain_sun', q: 'Sun solar NASA video' }
];
(async () => {
    const vmeta = [];
    for (const t of vids) {
        try {
            const sr = await jget(`https://images-api.nasa.gov/search?q=${encodeURIComponent(t.q)}&media_type=video`);
            const items = (sr.collection && sr.collection.items) || [];
            let done = false;
            for (const it of items) {
                if (done || !it.href) continue;
                const title = (it.data && it.data[0] && it.data[0].title) || '';
                let mf; try { mf = await jget(it.href); } catch (e) { continue; }
                const mp4s = collectUrls(mf).filter(u => /\.mp4$/i.test(u));
                const pick = mp4s.find(u => /~(small|mobile)\.mp4$/i.test(u)) || mp4s.find(u => /~medium\.mp4$/i.test(u)) || mp4s[0];
                if (!pick) continue;
                const dest = path.join(VID, t.name + '.mp4');
                const size = await dl(pick, dest);
                if (size > 100000) {
                    console.log('视频 OK:', t.name + '.mp4', (size / 1048576).toFixed(1) + 'MB |', title.slice(0, 50));
                    vmeta.push({ name: t.name, title, src: '/assets/videos/explain/' + t.name + '.mp4' });
                    done = true;
                } else fs.rmSync(dest, { force: true });
            }
            if (!done) console.log('视频未获取:', t.name);
        } catch (e) { console.log('视频异常:', t.name, e.message); }
    }
    fs.writeFileSync(path.join(VID, 'meta2.json'), JSON.stringify(vmeta, null, 2), 'utf8');

    // ---------- 图片 ----------
    const imgs = [
        { name: 'jupiter_redspot', q: 'Jupiter Great Red Spot Hubble' },
        { name: 'saturn_rings', q: 'Saturn rings Cassini' },
        { name: 'mars_surface', q: 'Mars surface panorama' },
        { name: 'orion_nasa', q: 'Orion Nebula Hubble' },
        { name: 'andromeda_nasa', q: 'Andromeda Galaxy' },
        { name: 'crab_nasa', q: 'Crab Nebula Hubble' }
    ];
    const imeta = [];
    for (const t of imgs) {
        try {
            const sr = await jget(`https://images-api.nasa.gov/search?q=${encodeURIComponent(t.q)}&media_type=image`);
            const items = (sr.collection && sr.collection.items) || [];
            let got = false;
            for (const it of items) {
                if (got) break;
                const d = it.data && it.data[0];
                if (!d || !d.nasa_id) continue;
                const id = d.nasa_id;
                const title = d.title || '';
                for (const size of ['large', 'orig', 'medium', 'small']) {
                    const url = `https://images-assets.nasa.gov/image/${id}/${id}~${size}.jpg`;
                    const dest = path.join(IMG, t.name + '.jpg');
                    const sz = await dl(url, dest);
                    if (sz > 15000) {
                        console.log('图片 OK:', t.name + '.jpg', (sz / 1024).toFixed(0) + 'KB |', title.slice(0, 50));
                        imeta.push({ name: t.name, title });
                        got = true;
                        break;
                    } else fs.rmSync(dest, { force: true });
                }
            }
            if (!got) console.log('图片未获取:', t.name);
        } catch (e) { console.log('图片异常:', t.name, e.message); }
    }
    fs.writeFileSync(path.join(IMG, 'meta2.json'), JSON.stringify(imeta, null, 2), 'utf8');
    console.log('\n完成。视频', vmeta.length, '个；图片', imeta.length, '张');
})().catch(e => { console.error('失败:', e.message); process.exit(1); });
