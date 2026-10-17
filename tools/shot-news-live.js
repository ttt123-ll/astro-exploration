const puppeteer = require('puppeteer-core');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
(async () => {
    const b = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox'] });
    const p = await b.newPage();
    await p.setViewport({ width: 1440, height: 1000 });
    await p.goto('http://127.0.0.1:3000/login', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 2500));
    await p.type('input[autocomplete="username"]', 'admin');
    await p.type('input[autocomplete="current-password"]', 'admin123');
    await p.click('button[type="submit"]');
    await new Promise(r => setTimeout(r, 3000));
    await p.goto('http://127.0.0.1:3000/news', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 3500));
    await p.screenshot({ path: 'F:\\天文科普\\shots\\news-live.png' });
    console.log('已截图 news-live.png');
    await b.close();
})().catch(e => { console.error(e.message); process.exit(1); });
