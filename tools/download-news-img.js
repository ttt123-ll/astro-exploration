// 下载新闻配图（NASA 官方，公有领域）
const fs = require('fs');
const path = require('path');
const OUT = 'F:\\天文科普\\client\\public\\assets\\images\\news';
fs.mkdirSync(OUT, { recursive: true });

async function jget(u) { const r = await fetch(u); return await r.json(); }
async function tryDl(url, dest) {
    try {
        const r = await fetch(url);
        if (!r.ok) return 0;
        const b = Buffer.from(await r.arrayBuffer());
        if (b.length < 15000) return 0;
        fs.writeFileSync(dest, b);
        return b.length;
    } catch (e) { return 0; }
}

const targets = [
    { name: 'moon', q: 'full moon lunar surface' },
    { name: 'sun', q: 'solar dynamics observatory sun' },
    { name: 'comet', q: 'comet NEOWISE' },
    { name: 'station', q: 'international space station orbit' },
    { name: 'parker', q: 'Parker Solar Probe' },
    { name: 'exoplanet', q: 'exoplanet illustration' },
    { name: 'rocket', q: 'Artemis launch rocket' },
    { name: 'nebula_new', q: 'Carina Nebula Webb' }
];

(async () => {
    for (const t of targets) {
        try {
            const sr = await jget(`https://images-api.nasa.gov/search?q=${encodeURIComponent(t.q)}&media_type=image`);
            const items = (sr.collection && sr.collection.items) || [];
            let done = false;
            for (const it of items) {
                if (done) break;
                const d = it.data && it.data[0];
                if (!d || !d.nasa_id) continue;
                const id = d.nasa_id;
                for (const size of ['large', 'orig', 'medium']) {
                    const url = `https://images-assets.nasa.gov/image/${id}/${id}~${size}.jpg`;
                    const dest = path.join(OUT, t.name + '.jpg');
                    const got = await tryDl(url, dest);
                    if (got) {
                        console.log('OK:', t.name + '.jpg', (got / 1024).toFixed(0) + 'KB |', (d.title || '').slice(0, 45));
                        done = true; break;
                    }
                }
            }
            if (!done) console.log('未获取:', t.name);
        } catch (e) { console.log('异常:', t.name, e.message); }
    }
    console.log('完成');
})().catch(e => { console.error(e.message); process.exit(1); });
