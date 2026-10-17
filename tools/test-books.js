// 验证书籍轮播：箭头 / 拖拽 / 滚轮
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

    const info = await page.evaluate(() => {
        const el = document.querySelector('.books-track');
        return {
            exists: !!el,
            arrows: document.querySelectorAll('.books-arrow').length,
            scrollW: el ? el.scrollWidth : 0,
            clientW: el ? el.clientWidth : 0
        };
    });
    console.log('轮播存在:', info.exists, '| 箭头数:', info.arrows, '| 内容宽:', info.scrollW, '> 可视宽:', info.clientW);

    // 点右箭头
    const before = await page.evaluate(() => document.querySelector('.books-track').scrollLeft);
    await page.click('.books-arrow.next');
    await new Promise(r => setTimeout(r, 1200));
    const afterNext = await page.evaluate(() => document.querySelector('.books-track').scrollLeft);
    console.log('点右箭头: scrollLeft', before, '→', afterNext, afterNext > before ? '✅ 生效' : '❌ 无效');

    // 点左箭头
    await page.click('.books-arrow.prev');
    await new Promise(r => setTimeout(r, 1200));
    const afterPrev = await page.evaluate(() => document.querySelector('.books-track').scrollLeft);
    console.log('点左箭头: →', afterPrev, afterPrev < afterNext ? '✅ 生效' : '❌ 无效');

    // 拖拽
    const box = await page.evaluate(() => {
        const r = document.querySelector('.books-track').getBoundingClientRect();
        return { x: r.x, y: r.y, w: r.width, h: r.height };
    });
    await page.mouse.move(box.x + box.w * 0.7, box.y + box.h * 0.5);
    await page.mouse.down();
    await page.mouse.move(box.x + box.w * 0.2, box.y + box.h * 0.5, { steps: 12 });
    await page.mouse.up();
    await new Promise(r => setTimeout(r, 800));
    const afterDrag = await page.evaluate(() => document.querySelector('.books-track').scrollLeft);
    console.log('拖拽后: scrollLeft', afterPrev, '→', afterDrag, afterDrag > afterPrev ? '✅ 生效' : '❌ 无效');

    // 滚轮横滑
    const beforeWheel = afterDrag;
    await page.mouse.move(box.x + box.w / 2, box.y + box.h / 2);
    await page.mouse.wheel({ deltaY: -300 });
    await new Promise(r => setTimeout(r, 800));
    const afterWheel = await page.evaluate(() => document.querySelector('.books-track').scrollLeft);
    console.log('滚轮后: scrollLeft', beforeWheel, '→', afterWheel, afterWheel !== beforeWheel ? '✅ 生效' : '⚠️ 未变化');

    await page.screenshot({ path: 'F:\\天文科普\\shots\\books.png' });
    await browser.close();
    console.log('完成');
})().catch(e => { console.error('异常:', e.message); process.exit(1); });
