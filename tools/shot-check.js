// 验证导航栏单行 + 投影页
const puppeteer = require('puppeteer-core');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

(async () => {
    const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto('http://127.0.0.1:3000/login', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 2500));
    await page.type('input[autocomplete="username"]', 'admin');
    await page.type('input[autocomplete="current-password"]', 'admin123');
    await page.click('button[type="submit"]');
    await new Promise(r => setTimeout(r, 3000));
    await page.goto('http://127.0.0.1:3000/planet-show', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 4000));

    // 检查导航栏是否超高（换行）
    const nav = await page.evaluate(() => {
        const n = document.querySelector('.navbar');
        const links = document.querySelector('.nav-links');
        return {
            navH: n ? Math.round(n.getBoundingClientRect().height) : 0,
            linksH: links ? Math.round(links.getBoundingClientRect().height) : 0
        };
    });
    console.log('导航栏高度:', nav.navH, 'px | 链接区高度:', nav.linksH, 'px (单行约40以内)');
    await page.screenshot({ path: 'F:\\天文科普\\shots\\proj-earth.png' });
    console.log('已截图 proj-earth.png');
    await browser.close();
    console.log('完成');
})().catch(e => { console.error('异常:', e.message); process.exit(1); });
