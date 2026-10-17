// 验证：新闻来源链接 / 图集出处 / 素材来源页
const puppeteer = require('puppeteer-core');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

(async () => {
    const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 1000 });
    await page.goto('http://127.0.0.1:3000/login', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 2500));
    await page.type('input[autocomplete="username"]', 'admin');
    await page.type('input[autocomplete="current-password"]', 'admin123');
    await page.click('button[type="submit"]');
    await new Promise(r => setTimeout(r, 3000));

    // 1) 新闻页来源链接
    await page.goto('http://127.0.0.1:3000/news', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 3000));
    const news = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('.news-src'));
        return {
            count: links.length,
            sample: links.slice(0, 3).map(a => a.getAttribute('href')),
            headLink: !!document.querySelector('.news-head .news-src')
        };
    });
    console.log('新闻页来源链接数:', news.count, '| 头条有链接:', news.headLink);
    console.log('示例链接:', news.sample.join(' , '));

    // 2) 图集出处
    await page.goto('http://127.0.0.1:3000/gallery', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 3000));
    const gal = await page.evaluate(() => {
        const c = Array.from(document.querySelectorAll('.gallery-credit')).map(e => e.textContent.trim());
        return { count: c.length, samples: c.slice(0, 4) };
    });
    console.log('图集出处标注数:', gal.count, '| 示例:', gal.samples.join(' / '));

    // 3) 素材来源页
    await page.goto('http://127.0.0.1:3000/credits', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 3000));
    const cr = await page.evaluate(() => ({
        title: document.querySelector('.page-header h1')?.textContent || '',
        cards: document.querySelectorAll('.credit-card').length,
        videoRows: document.querySelectorAll('.sys-table tbody tr').length,
        hasVerify: document.body.innerText.includes('如何核验'),
        hasLicense: document.body.innerText.includes('公有领域')
    }));
    console.log('素材页标题:', cr.title, '| 素材卡:', cr.cards, '| 表格行:', cr.videoRows);
    console.log('含核验说明:', cr.hasVerify, '| 含授权说明:', cr.hasLicense);
    await page.screenshot({ path: 'F:\\天文科普\\shots\\credits.png' });

    await browser.close();
    console.log('完成');
})().catch(e => { console.error('异常:', e.message); process.exit(1); });
