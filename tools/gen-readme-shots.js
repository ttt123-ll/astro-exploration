// 生成 README 展示截图（docs/screenshots）：新版界面，1200px 宽 JPEG
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE = process.env.BASE || 'http://127.0.0.1:3000';
const OUT = path.resolve(__dirname, '..', 'docs/screenshots');
const W = 1440, H = 900, QUALITY = 82;

const sleep = ms => new Promise(r => setTimeout(r, ms));

const SHOTS = [
    ['01-home', '/', () => window.scrollTo(0, 0)],
    ['02-encyclopedia', '/encyclopedia', () => window.scrollTo(0, 0)],
    ['03-community', '/community?tab=quiz', () => window.scrollTo(0, 0)],
    ['04-news', '/news', () => window.scrollTo(0, 0)],
    ['05-gallery', '/gallery', () => window.scrollTo(0, 0)],
    ['06-timeline', '/timeline', () => window.scrollTo(0, 0)],
    ['07-planet-show', '/planet-show', null],
    ['08-constellations', '/constellations', () => window.scrollTo(0, 0)]
];

(async () => {
    if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

    const b = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox'] });
    const p = await b.newPage();
    await p.setViewport({ width: W, height: H, deviceScaleFactor: 1 });

    // 登录管理员，让页头状态完整
    await p.goto(BASE + '/login', { waitUntil: 'networkidle2' });
    await p.type('input[autocomplete="username"]', 'admin');
    await p.type('input[autocomplete="current-password"]', 'admin123');
    await p.click('button[type="submit"]');
    await sleep(2600);

    for (const [name, url, scroll] of SHOTS) {
        await p.goto(BASE + url, { waitUntil: 'networkidle2' });
        await sleep(2200);
        if (scroll) await p.evaluate(scroll);
        await sleep(900);
        const file = path.join(OUT, name + '.jpg');
        await p.screenshot({ path: file, type: 'jpeg', quality: QUALITY });
        const kb = Math.round(fs.statSync(file).size / 1024);
        console.log('  ✓ ' + name + '.jpg  ' + kb + ' KB');
    }

    await b.close();

    const total = fs.readdirSync(OUT).filter(f => f.endsWith('.jpg'))
        .reduce((s, f) => s + fs.statSync(path.join(OUT, f)).size, 0);
    console.log('\n截图已生成到 docs/screenshots，合计 ' + Math.round(total / 1024) + ' KB');
})().catch(e => { console.error('截图失败:', e.message); process.exit(1); });
