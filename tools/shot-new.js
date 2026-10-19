// 新页面截图
const puppeteer = require('puppeteer-core');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE = process.env.BASE || 'http://127.0.0.1:3000';

(async () => {
    const b = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox'] });
    const p = await b.newPage();
    await p.setViewport({ width: 1440, height: 900 });

    await p.goto(BASE + '/login', { waitUntil: 'networkidle2' });
    await p.type('input[autocomplete="username"]', 'admin');
    await p.type('input[autocomplete="current-password"]', 'admin123');
    await p.click('button[type="submit"]');
    await new Promise(r => setTimeout(r, 2500));

    const shots = [
        ['/', 'new-home'],
        ['/encyclopedia', 'new-encyclopedia'],
        ['/encyclopedia?tab=bh', 'new-encyclopedia-bh'],
        ['/community', 'new-community'],
        ['/news', 'new-news']
    ];
    for (const [url, name] of shots) {
        await p.goto(BASE + url, { waitUntil: 'networkidle2' });
        await new Promise(r => setTimeout(r, 2200));
        await p.screenshot({ path: 'F:\\天文科普\\shots\\' + name + '.png' });
        console.log('已截图:', name);
    }

    // 新闻搜索后截图
    await p.type('.search-input', '黑洞');
    await p.click('.search-btn');
    await new Promise(r => setTimeout(r, 1600));
    await p.screenshot({ path: 'F:\\天文科普\\shots\\new-news-search.png' });
    console.log('已截图: new-news-search');

    await b.close();
})().catch(e => { console.error('异常:', e.message); process.exit(1); });
