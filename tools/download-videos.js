// 从 NASA 官方图像库下载讲解视频（公有领域）
const fs = require('fs');
const path = require('path');

const OUT = 'F:\\天文科普\\client\\public\\assets\\videos\\explain';
fs.mkdirSync(OUT, { recursive: true });

async function jget(url) {
    const r = await fetch(url);
    return await r.json();
}

async function download(url, dest) {
    const r = await fetch(url);
    if (!r.ok) return 0;
    const buf = Buffer.from(await r.arrayBuffer());
    fs.writeFileSync(dest, buf);
    return buf.length;
}

// 递归从 manifest/collection 里提取 mp4 URL
function collectUrls(node, out = []) {
    if (typeof node === 'string') { out.push(node); return out; }
    if (Array.isArray(node)) { node.forEach(x => collectUrls(x, out)); return out; }
    if (node && typeof node === 'object') {
        for (const k of ['collection', 'items', 'assets']) {
            if (node[k]) collectUrls(node[k], out);
        }
        if (node.href) out.push(node.href);
    }
    return out;
}

const targets = [
    { name: 'explain_blackhole', q: 'What is a Black Hole NASA expert' },
    { name: 'explain_solarsystem', q: 'solar system tour NASA' },
    { name: 'explain_hubble', q: 'Hubble Space Telescope NASA video' },
    { name: 'explain_webb', q: 'James Webb Space Telescope NASA video' }
];

(async () => {
    const meta = [];
    for (const t of targets) {
        try {
            const sr = await jget(`https://images-api.nasa.gov/search?q=${encodeURIComponent(t.q)}&media_type=video`);
            const items = (sr.collection && sr.collection.items) || [];
            let done = false;
            for (const it of items) {
                const href = it.href;
                if (!href || done) continue;
                const title = (it.data && it.data[0] && it.data[0].title) || '';
                let mf;
                try { mf = await jget(href); } catch (e) { continue; }
                const urls = collectUrls(mf);
                const mp4s = urls.filter(u => /\.mp4$/i.test(u));
                const pick = mp4s.find(u => /~(small|mobile)\.mp4$/i.test(u))
                    || mp4s.find(u => /~medium\.mp4$/i.test(u))
                    || mp4s[0];
                if (!pick) continue;
                const dest = path.join(OUT, t.name + '.mp4');
                const size = await download(pick, dest);
                if (size > 100000) {
                    console.log('OK:', t.name + '.mp4', (size / 1048576).toFixed(1) + 'MB', '|', title.slice(0, 50));
                    meta.push({ name: t.name, title, src: '/assets/videos/explain/' + t.name + '.mp4' });
                    done = true;
                } else {
                    fs.rmSync(dest, { force: true });
                }
            }
            if (!done) console.log('未获取到:', t.name);
        } catch (e) {
            console.log('异常:', t.name, e.message);
        }
    }
    fs.writeFileSync(path.join(OUT, 'meta.json'), JSON.stringify(meta, null, 2), 'utf8');
    console.log('\n完成，共', meta.length, '个视频');
})().catch(e => { console.error('失败:', e.message); process.exit(1); });
