const puppeteer = require('puppeteer-core');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PAGES = [
    ['/', 'bg-home'],
    ['/solar-system', 'bg-solar'],
    ['/black-hole', 'bg-blackhole'],
    ['/gallery', 'bg-gallery'],
    ['/leaderboard', 'bg-board'],
    ['/admin', 'bg-admin']
];
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

    for (const [url, name] of PAGES) {
        await p.goto('http://127.0.0.1:3000' + url, { waitUntil: 'domcontentloaded' });
        await new Promise(r => setTimeout(r, 2600));
        const cls = await p.evaluate(() => document.querySelector('.page-bg')?.className || '');
        console.log(url, '→', cls);
        await p.screenshot({ path: 'F:\\天文科普\\shots\\' + name + '.png' });
    }
    await b.close();
    console.log('完成');
})().catch(e => { console.error('异常:', e.message); process.exit(1); });
