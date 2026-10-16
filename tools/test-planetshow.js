// 登录后验证星球投影页（分类 + 大投影 + 旁边介绍）
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
    await new Promise(r => setTimeout(r, 3000));

    const txt = await page.evaluate(() => document.body.innerText);
    console.log('分类标签齐全:', ['行星','星座','黑洞','恒星','星系','深空'].every(c => txt.includes(c)));
    console.log('默认显示行星(水星):', txt.includes('水星'));
    console.log('介绍面板含"直径":', txt.includes('直径'));

    const layout = await page.evaluate(() => {
        const main = document.querySelector('.proj-main');
        const left = document.querySelector('.proj-left');
        const right = document.querySelector('.proj-right');
        if (!main || !left || !right) return null;
        const g = getComputedStyle(main).gridTemplateColumns;
        return { cols: g, hasBig: !!document.querySelector('.holo-planet') };
    });
    console.log('网格两列布局:', layout && layout.cols.split(' ').length >= 2, '| 大投影元素:', layout && layout.hasBig);

    await page.evaluate(() => {
        const tabs = Array.from(document.querySelectorAll('.cat-tab'));
        const t = tabs.find(b => b.textContent.trim() === '黑洞');
        if (t) t.click();
    });
    await new Promise(r => setTimeout(r, 1200));
    const txt2 = await page.evaluate(() => document.body.innerText);
    console.log('切到黑洞分类:', txt2.includes('黑洞') && (txt2.includes('恒星级') || txt2.includes('超大质量')));

    await page.evaluate(() => {
        const tabs = Array.from(document.querySelectorAll('.cat-tab'));
        const t = tabs.find(b => b.textContent.trim() === '星座');
        if (t) t.click();
    });
    await new Promise(r => setTimeout(r, 1200));
    const txt3 = await page.evaluate(() => document.body.innerText);
    console.log('切到星座分类(猎户座):', txt3.includes('猎户座'));

    await browser.close();
    console.log('测试完成');
})().catch(e => { console.error('异常:', e.message); process.exit(1); });
