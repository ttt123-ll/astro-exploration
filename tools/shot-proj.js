// 登录后截取星球投影页（3D 球体 + 全息板）
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
    await new Promise(r => setTimeout(r, 2500));
    await page.goto('http://127.0.0.1:3000/planet-show', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 4000));
    await page.screenshot({ path: 'F:\\天文科普\\shots\\proj-earth.png' });
    console.log('已截图: 行星(默认水星)');
    // 点土星
    await page.evaluate(() => {
        const b = Array.from(document.querySelectorAll('.pick-btn')).find(x => x.textContent.trim() === '土星');
        if (b) b.click();
    });
    await new Promise(r => setTimeout(r, 2500));
    await page.screenshot({ path: 'F:\\天文科普\\shots\\proj-saturn.png' });
    console.log('已截图: 土星');
    // 切黑洞
    await page.evaluate(() => {
        const t = Array.from(document.querySelectorAll('.cat-tab')).find(x => x.textContent.trim() === '黑洞');
        if (t) t.click();
    });
    await new Promise(r => setTimeout(r, 2500));
    await page.screenshot({ path: 'F:\\天文科普\\shots\\proj-blackhole.png' });
    console.log('已截图: 黑洞');
    await browser.close();
    console.log('完成');
})().catch(e => { console.error('异常:', e.message); process.exit(1); });
