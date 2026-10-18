const puppeteer = require('puppeteer-core');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
(async () => {
    const b = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox'] });
    const p = await b.newPage();
    await p.setViewport({ width: 1440, height: 900 });
    await p.goto('http://127.0.0.1:3000/login', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 2500));
    await p.type('input[autocomplete="username"]', 'admin');
    await p.type('input[autocomplete="current-password"]', 'admin123');
    await p.click('button[type="submit"]');
    await new Promise(r => setTimeout(r, 3000));

    const nav = await p.evaluate(() => ({
        count: document.querySelectorAll('.nav-links li').length,
        items: Array.from(document.querySelectorAll('.nav-links li a')).map(a => a.textContent.trim()).join(' / ')
    }));
    console.log('导航项数:', nav.count, '|', nav.items);

    const solar = await p.evaluate(() => ({
        section: !!document.querySelector('.entry-solar-section'),
        orbits: document.querySelectorAll('.orbit').length,
        planets: document.querySelectorAll('.orbit-planet').length,
        legend: Array.from(document.querySelectorAll('.solar-legend button')).map(x => x.textContent.trim()).join(' ')
    }));
    console.log('迷你太阳系: 区块', solar.section, '| 轨道', solar.orbits, '| 行星', solar.planets);
    console.log('图例:', solar.legend);

    await p.evaluate(() => document.querySelector('.entry-solar-section')?.scrollIntoView({ block: 'center' }));
    await new Promise(r => setTimeout(r, 1200));
    await p.screenshot({ path: 'F:\\天文科普\\shots\\home-solar.png' });

    // 点火星
    await p.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('.solar-legend button')).find(x => x.textContent.trim() === '火星');
        if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 260));
    console.log('点击后遮罩:', await p.evaluate(() => !!document.querySelector('.launch-overlay')));
    await new Promise(r => setTimeout(r, 2400));
    console.log('跳转后 URL:', p.url());

    await b.close();
    console.log('完成');
})().catch(e => { console.error('异常:', e.message); process.exit(1); });
