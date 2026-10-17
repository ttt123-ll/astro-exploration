// 截取首页「天文资讯」区域
const puppeteer = require('puppeteer-core');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

(async () => {
    const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 1000 });
    await page.goto('http://127.0.0.1:3000/login', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 2500));
    await page.type('input[autocomplete="username"]', 'admin');
    await page.type('input[autocomplete="current-password"]', 'admin123');
    await page.click('button[type="submit"]');
    await new Promise(r => setTimeout(r, 3000));

    const n = await page.evaluate(() => document.querySelectorAll('.news-card').length);
    console.log('首页新闻卡片数:', n);

    await page.evaluate(() => {
        const el = document.querySelector('#news');
        if (el) el.scrollIntoView();
    });
    await new Promise(r => setTimeout(r, 1800));
    await page.screenshot({ path: 'F:\\天文科普\\shots\\news.png' });
    console.log('已截图 news.png');
    await browser.close();
    console.log('完成');
})().catch(e => { console.error('异常:', e.message); process.exit(1); });
