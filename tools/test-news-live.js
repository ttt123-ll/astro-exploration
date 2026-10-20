// 端到端：后台发布新闻 → 新闻页/首页实时出现
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

    // 1) 新闻页：是否从接口加载 + 实时状态条
    await page.goto('http://127.0.0.1:3000/news', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 3000));
    let st = await page.evaluate(() => ({
        live: !!document.querySelector('.live-bar'),
        liveText: document.querySelector('.live-text')?.innerText.replace(/\s+/g, ' ') || '',
        cards: document.querySelectorAll('.news-card').length,
        head: document.querySelector('.news-head-body h2')?.textContent || '',
        tabs: document.querySelectorAll('.filter-tab').length
    }));
    console.log('新闻页 实时条:', st.live, '|', st.liveText);
    console.log('新闻页 卡片:', st.cards, '| 头条:', st.head, '| 标签:', st.tabs);

    // 2) 后台发布一条新闻
    const title = '自动化测试新闻 ' + Date.now().toString().slice(-5);
    await page.goto('http://127.0.0.1:3000/admin', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 3500));
    const hasForm = await page.evaluate(() => !!document.querySelector('.news-form'));
    console.log('后台含新闻表单:', hasForm);

    await page.evaluate((t) => {
        const setVal = (el, v) => {
            const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            setter.call(el, v);
            el.dispatchEvent(new Event('input', { bubbles: true }));
        };
        const setArea = (el, v) => {
            const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
            setter.call(el, v);
            el.dispatchEvent(new Event('input', { bubbles: true }));
        };
        // inputs: [0]=title, [1]=source ; textarea = summary
        const titleEl = document.querySelector('.news-form input[placeholder="新闻标题"]');
        const srcEl = document.querySelector('.news-form input[placeholder^="来源"]');
        const area = document.querySelector('.news-form .nf-area');
        setVal(titleEl, t);
        setArea(area, '这是由后台管理面板发布的测试新闻，用于验证新闻记录实时更新功能。');
        setVal(srcEl, '自动化测试');
    }, title);
    await new Promise(r => setTimeout(r, 500));
    await page.evaluate(() => {
        const b = Array.from(document.querySelectorAll('.nf-actions button')).find(x => x.textContent.includes('发布新闻'));
        if (b) b.click();
    });
    await new Promise(r => setTimeout(r, 3000));
    const inAdmin = await page.evaluate((t) => document.querySelector('.sys-table')?.innerText.includes(t), title);
    console.log('后台列表出现新新闻:', inAdmin, '|', title);

    // 3) 回新闻页看是否出现（接口实时）
    await page.goto('http://127.0.0.1:3000/news', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 3000));
    const onNews = await page.evaluate((t) => document.body.innerText.includes(t), title);
    console.log('新闻页出现该新闻:', onNews);

    // 4) 首页也出现
    await page.goto('http://127.0.0.1:3000/', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 3000));
    const onHome = await page.evaluate((t) => document.body.innerText.includes(t), title);
    console.log('首页出现该新闻(最新6条):', onHome);

    await browser.close();
    console.log('完成 | 测试标题:', title);
})().catch(e => { console.error('异常:', e.message); process.exit(1); });
