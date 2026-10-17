// 列出各页面实际渲染的视频标题，检查是否有重复
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

    const pages = ['/solar-system', '/stars-galaxies', '/black-hole', '/constellations', '/gallery', '/deep-space', '/timeline'];
    for (const p of pages) {
        await page.goto('http://127.0.0.1:3000' + p, { waitUntil: 'domcontentloaded' });
        await new Promise(r => setTimeout(r, 2200));
        const info = await page.evaluate(() => {
            const vids = Array.from(document.querySelectorAll('.video-section video'));
            const srcs = vids.map(v => (v.getAttribute('src') || '').split('/').pop());
            const dup = srcs.length !== new Set(srcs).size;
            const titles = Array.from(document.querySelectorAll('.video-section .vs-body h4')).map(h => h.textContent.trim());
            return { srcs, dup, titles };
        });
        console.log(p, '| 本页重复:', info.dup, '| 视频:', info.srcs.join(', '));
    }
    await browser.close();
    console.log('完成');
})().catch(e => { console.error('异常:', e.message); process.exit(1); });
