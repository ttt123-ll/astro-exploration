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
    await p.goto('http://127.0.0.1:3000/space-flight', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 4000));

    const read = () => p.evaluate(() => ({
        sim: document.querySelectorAll('.hud-tr .hud-row')[2]?.innerText.replace(/\s+/g, ' ') || '',
        coord: document.querySelector('.hud-tl .v.coord')?.textContent || '',
        near: document.querySelector('.hud-tl .v.accent')?.textContent || '',
        timeLabel: document.querySelectorAll('.slider-group .ctl-label em')[0]?.textContent || ''
    }));

    const a = await read();
    console.log('起始:', JSON.stringify(a));

    // 把时间流速拉到最大
    await p.evaluate(() => {
        const r = document.querySelectorAll('.ctl-range')[0];
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(r, '100');
        r.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await new Promise(r => setTimeout(r, 4000));
    const c = await read();
    console.log('加速 4 秒后:', JSON.stringify(c));
    console.log('模拟时间增长:', a.sim !== c.sim ? '✅ ' + a.sim + ' → ' + c.sim : '❌ 未变化');
    console.log('时间流速标签:', c.timeLabel);

    // 距离比例拉到真实
    await p.evaluate(() => {
        const r = document.querySelectorAll('.ctl-range')[1];
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(r, '100');
        r.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await new Promise(r => setTimeout(r, 2500));
    await p.screenshot({ path: 'F:\\天文科普\\shots\\spaceflight-true-scale.png' });
    console.log('已截取真实比例截图');

    await b.close();
})().catch(e => { console.error('异常:', e.message); process.exit(1); });
