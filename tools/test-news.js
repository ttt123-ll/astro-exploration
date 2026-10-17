// 验证新闻页：分类筛选 + 头条 + 列表
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

    // 导航栏含"宇宙新闻"且单行
    const nav = await page.evaluate(() => ({
        has: (document.querySelector('.nav-links')?.innerText || '').includes('宇宙新闻'),
        linksH: Math.round(document.querySelector('.nav-links')?.getBoundingClientRect().height || 0)
    }));
    console.log('导航含"宇宙新闻":', nav.has, '| 链接区高度:', nav.linksH + 'px');

    // 新闻页
    await page.goto('http://127.0.0.1:3000/news', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 2500));
    let st = await page.evaluate(() => ({
        tabs: document.querySelectorAll('.filter-tab').length,
        cards: document.querySelectorAll('.news-card').length,
        head: !!document.querySelector('.news-head'),
        headTitle: document.querySelector('.news-head-body h2')?.textContent || ''
    }));
    console.log('分类标签数:', st.tabs, '| 列表卡片:', st.cards, '| 头条:', st.head, '|', st.headTitle);

    // 点一个分类筛选
    await page.evaluate(() => {
        const t = Array.from(document.querySelectorAll('.filter-tab')).find(x => x.textContent.includes('中国航天'));
        if (t) t.click();
    });
    await new Promise(r => setTimeout(r, 1500));
    const filtered = await page.evaluate(() => ({
        cards: document.querySelectorAll('.news-card').length + (document.querySelector('.news-head') ? 1 : 0),
        head: document.querySelector('.news-head-body h2')?.textContent || ''
    }));
    console.log('筛选「中国航天」后条数:', filtered.cards, '| 头条:', filtered.head);
    await page.screenshot({ path: 'F:\\天文科普\\shots\\news-page.png' });

    // 首页有"查看全部"入口
    await page.goto('http://127.0.0.1:3000/', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 2500));
    const home = await page.evaluate(() => ({
        cards: document.querySelectorAll('#news .news-card').length,
        more: !!document.querySelector('.section-more a')
    }));
    console.log('首页新闻卡片:', home.cards, '| 有查看全部入口:', home.more);

    await browser.close();
    console.log('完成');
})().catch(e => { console.error('异常:', e.message); process.exit(1); });
