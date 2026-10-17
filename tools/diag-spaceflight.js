const puppeteer = require('puppeteer-core');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
(async () => {
    const b = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
    const p = await b.newPage();
    await p.setViewport({ width: 1440, height: 900 });
    const errs = [];
    p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push('[' + m.type() + '] ' + m.text().slice(0, 300)); });
    p.on('pageerror', e => errs.push('[pageerror] ' + String(e).slice(0, 500)));
    await p.goto('http://127.0.0.1:3000/login', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 2500));
    await p.type('input[autocomplete="username"]', 'admin');
    await p.type('input[autocomplete="current-password"]', 'admin123');
    await p.click('button[type="submit"]');
    await new Promise(r => setTimeout(r, 3000));
    await p.goto('http://127.0.0.1:3000/space-flight', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 4000));
    const st = await p.evaluate(() => ({
        loading: !!document.querySelector('.flight-loading'),
        speed: document.querySelector('.hud-tr .v.speed')?.textContent || '',
        coord: document.querySelector('.hud-tl .v.coord')?.textContent || '',
        near: document.querySelector('.hud-tl .v.accent')?.textContent || ''
    }));
    console.log('状态:', JSON.stringify(st));
    console.log('--- 控制台错误 ---');
    console.log(errs.length ? errs.slice(0, 8).join('\n') : '（无错误）');
    await b.close();
})().catch(e => { console.error('异常:', e.message); process.exit(1); });
