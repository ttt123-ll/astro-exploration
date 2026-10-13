// 搜索 Wikimedia Commons 上的官方天文素材（图片 + 讲解视频），输出候选 URL
const BASE = 'https://commons.wikimedia.org/w/api.php';

async function search(query, limit = 5) {
    const params = new URLSearchParams({
        action: 'query', format: 'json', generator: 'search',
        gsrsearch: query, gsrnamespace: '6', gsrlimit: String(limit),
        prop: 'imageinfo', iiprop: 'url|size|mime', iiurlwidth: '1600'
    });
    const r = await fetch(BASE + '?' + params, { headers: { 'User-Agent': 'astro-doc/1.0' } });
    const j = await r.json();
    const out = [];
    if (j.query && j.query.pages) {
        for (const p of Object.values(j.query.pages)) {
            const ii = p.imageinfo && p.imageinfo[0];
            out.push({
                title: p.title,
                mime: ii ? ii.mime : '',
                w: ii ? ii.width : 0,
                h: ii ? ii.height : 0,
                mb: ii ? (ii.size / 1048576).toFixed(2) : 0,
                thumb: ii ? ii.thumburl : '',
                url: ii ? ii.url : ''
            });
        }
    }
    return out;
}

(async () => {
    console.log('===== 官方图片 =====');
    const imgs = [
        'Butterfly Nebula Hubble', 'Cat Eye Nebula Hubble', 'Cartwheel Galaxy James Webb',
        'Southern Ring Nebula James Webb', 'Stephans Quintet James Webb', 'Tarantula Nebula Hubble',
        'Helix Nebula Hubble', 'Veil Nebula Hubble', 'Trifid Nebula Hubble', 'Pillars of Creation James Webb'
    ];
    for (const q of imgs) {
        const res = await search(q);
        const img = res.find(x => x.mime === 'image/jpeg' || x.mime === 'image/png');
        console.log(`\n[${q}]`);
        if (img) console.log('  OK:', img.title, `(${img.w}x${img.h}, ${img.mb}MB)`, img.thumb);
        else console.log('  (未找到图片)', res.slice(0, 2).map(x => x.title));
    }

    console.log('\n===== 讲解视频 =====');
    const vids = [
        'Hubble Inside The Image Eagle Nebula',
        'Hubble Inside The Image Crab Nebula',
        'Hubble 34th Anniversary Little Dumbbell Nebula'
    ];
    for (const q of vids) {
        const res = await search(q);
        const v = res.find(x => x.mime && x.mime.startsWith('video/webm') && parseFloat(x.mb) < 40);
        console.log(`\n[${q}]`);
        if (v) console.log('  OK:', v.title, `(${v.mb}MB)`, v.url);
        else console.log('  (未找到合适视频)', res.slice(0, 3).map(x => `${x.title} ${x.mb}MB`));
    }
})().catch(e => { console.error('搜索失败:', e.message); process.exit(1); });
