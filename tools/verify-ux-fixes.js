/**
 * 本轮 UX 修复验证：
 *  1) 视频页返回键（含直接打开时回首页）
 *  2) 视频按主题唯一匹配、无重复、无匹配则隐藏
 *  3) 书籍推荐精简为 3 本 + 编号/计数标签
 *  4) AI 页四张能力卡全部可交互（快捷提问 / 导航面板）
 */
const puppeteer = require('F:/天文科普/tools/node_modules/puppeteer-core');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE = process.env.BASE || 'http://127.0.0.1:3001';
const sleep = ms => new Promise(r => setTimeout(r, ms));

let pass = 0, fail = 0;
const check = (n, c, e) => {
    if (c) { pass++; console.log('  [OK] ' + n); }
    else { fail++; console.log('  [FAIL] ' + n + (e !== undefined ? '  -> ' + JSON.stringify(e).slice(0, 240) : '')); }
};

(async () => {
    const b = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox'] });
    const p = await b.newPage();
    await p.setViewport({ width: 1440, height: 1000 });
    const errs = [];
    p.on('pageerror', e => errs.push(e.message));

    /* ---------- 1) 视频页返回键 ---------- */
    console.log('=== 视频页返回键 ===');
    await p.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await sleep(1200);
    await p.goto(BASE + '/videos', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await sleep(1800);
    const v = await p.evaluate(() => ({
        back: !!document.querySelector('.page-back'),
        text: document.querySelector('.page-back')?.textContent.trim(),
        cards: document.querySelectorAll('.video-card').length
    }));
    check('视频页有返回按钮', v.back, v);
    check('返回按钮文案为「返回」', /返回/.test(v.text || ''), v.text);
    check('视频总数 9', v.cards === 9, v.cards);

    await p.click('.page-back');
    await sleep(1200);
    check('返回键可回到上一页（首页）', p.url().replace(/\/$/, '') === BASE.replace(/\/$/, ''), p.url());

    /* 直接打开视频页再返回 → 应回首页而不是空白页 */
    await p.goto(BASE + '/videos', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await sleep(1500);
    await p.click('.page-back');
    await sleep(1200);
    check('直接打开时返回键回首页', p.url().replace(/\/$/, '') === BASE.replace(/\/$/, ''), p.url());

    /* ---------- 2) 视频主题唯一性 ---------- */
    console.log('\n=== 视频主题匹配 ===');
    const pages = ['/solar-system', '/encyclopedia', '/gallery', '/deep-space', '/timeline'];
    const seen = {};
    for (const route of pages) {
        await p.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await sleep(1500);
        const titles = await p.evaluate(() =>
            Array.from(document.querySelectorAll('.video-section .vs-card h4')).map(x => x.textContent.trim())
        );
        check(route + ' 有匹配视频', titles.length >= 1, titles);
        titles.forEach(t => { seen[t] = (seen[t] || []).concat(route); });
    }
    const dup = Object.entries(seen).filter(([, arr]) => arr.length > 1);
    check('跨页面无重复视频', dup.length === 0, dup);

    for (const route of ['/constellations', '/planet-show']) {
        await p.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await sleep(1500);
        const n = await p.evaluate(() => document.querySelectorAll('.video-section').length);
        check(route + ' 无匹配时不显示视频区', n === 0, n);
    }

    /* ---------- 3) 书籍精简 ---------- */
    console.log('\n=== 书籍推荐 ===');
    await p.goto(BASE + '/solar-system', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await sleep(1800);
    await p.evaluate(() => document.querySelector('.book-section')?.scrollIntoView({ block: 'center' }));
    await sleep(600);
    const books = await p.evaluate(() => ({
        cards: document.querySelectorAll('.book-card').length,
        idx: Array.from(document.querySelectorAll('.book-idx')).map(x => x.textContent.trim()),
        tag: document.querySelector('.books-count')?.textContent.trim()
    }));
    check('每页书籍不超过 3 本', books.cards > 0 && books.cards <= 3, books.cards);
    check('书籍带有序号徽标', books.idx.length === books.cards && books.idx[0] === '01', books.idx);
    check('显示「精选 N 本」标签', /精选 \d+ 本/.test(books.tag || ''), books.tag);

    /* ---------- 4) AI 能力卡交互 ---------- */
    console.log('\n=== AI 能力卡 ===');
    await p.goto(BASE + '/assistant', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await sleep(2200);
    const caps = await p.evaluate(() => Array.from(document.querySelectorAll('.ai-caps .ai-cap')).map(x => ({
        tag: x.tagName,
        label: x.querySelector('b')?.textContent.trim()
    })));
    check('四张能力卡均为可点击按钮', caps.length === 4 && caps.every(c => c.tag === 'BUTTON'), caps);

    await p.evaluate(() => {
        Array.from(document.querySelectorAll('.ai-caps .ai-cap')).find(x => /月相计算/.test(x.textContent))?.click();
    });
    for (let i = 0; i < 60; i++) {
        await sleep(300);
        const done = await p.evaluate(() => {
            const bots = document.querySelectorAll('.ai-msg.bot');
            const last = bots[bots.length - 1];
            return !!(last && last.querySelector('.ai-bubble') && !last.querySelector('.ai-bubble.ai-typing'));
        });
        if (done) break;
    }
    const moon = await p.evaluate(() => {
        const bots = document.querySelectorAll('.ai-msg.bot');
        const last = bots[bots.length - 1];
        return {
            bots: bots.length,
            text: last?.querySelector('.ai-bubble')?.textContent || '',
            tools: Array.from(last?.querySelectorAll('.ai-tool') || []).map(x => x.textContent.trim())
        };
    });
    check('点击「月相计算」自动发起提问并得到回答', moon.bots >= 1 && /月相|月亮|照亮/.test(moon.text), moon.text.slice(0, 60));
    check('回答带月相工具徽标', moon.tools.some(t => /月相/.test(t)), moon.tools);

    /* 页面导航面板 */
    await p.evaluate(() => {
        Array.from(document.querySelectorAll('.ai-caps .ai-cap')).find(x => /页面导航/.test(x.textContent))?.click();
    });
    await sleep(700);
    const nav = await p.evaluate(() => ({
        open: !!document.querySelector('.ai-nav-panel'),
        links: Array.from(document.querySelectorAll('.ai-nav-item b')).map(x => x.textContent.trim())
    }));
    check('页面导航面板可展开', nav.open, nav.open);
    check('导航面板含 8 个入口', nav.links.length === 8, nav.links);

    await p.evaluate(() => document.querySelector('.ai-nav-item[href="/deep-space"]')?.click());
    await sleep(1500);
    check('点击导航项可跳转', /\/deep-space/.test(p.url()), p.url());

    check('无 JS 错误', errs.length === 0, errs.slice(0, 3));
    await b.close();

    console.log('\n========================================');
    console.log(`  通过 ${pass} 项，失败 ${fail} 项`);
    console.log('========================================');
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('异常:', e); process.exit(1); });
