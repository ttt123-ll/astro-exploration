// 截图：四季星座页的宇宙尺度 / 书籍推荐区域
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

    await p.goto(BASE + '/constellations', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));
    await p.evaluate(() => document.querySelector('.scale-section')?.scrollIntoView({ block: 'start' }));
    await new Promise(r => setTimeout(r, 1200));
    await p.screenshot({ path: 'F:\\天文科普\\shots\\cons-scale.png' });
    console.log('已截图 cons-scale');

    await p.evaluate(() => document.querySelector('.books-strip')?.scrollIntoView({ block: 'center' }));
    await new Promise(r => setTimeout(r, 1000));
    await p.screenshot({ path: 'F:\\天文科普\\shots\\cons-books.png' });
    console.log('已截图 cons-books');

    // 首页整体
    await p.goto(BASE + '/', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));
    await p.screenshot({ path: 'F:\\天文科普\\shots\\home-final.png' });
    console.log('已截图 home-final');

    await b.close();
})().catch(e => { console.error('异常:', e.message); process.exit(1); });
