// 校验：冷知识 + 宇宙尺度之旅已从「四季星座」移到「探索工具」
const puppeteer = require('F:/天文科普/tools/node_modules/puppeteer-core');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE = process.env.BASE || 'http://127.0.0.1:3000';
const sleep = ms => new Promise(r => setTimeout(r, ms));

let pass = 0, fail = 0;
const check = (n, c, e) => {
    if (c) { pass++; console.log('  [OK] ' + n); }
    else { fail++; console.log('  [FAIL] ' + n + (e !== undefined ? '  -> ' + JSON.stringify(e) : '')); }
};

(async () => {
    const b = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox'] });
    const p = await b.newPage();
    await p.setViewport({ width: 1440, height: 900 });
    const errs = [];
    p.on('pageerror', e => errs.push(e.message));

    console.log('=== 探索工具页（冷知识 + 尺度之旅新家）===');
    await p.goto(BASE + '/explore', { waitUntil: 'domcontentloaded' });
    await sleep(1800);

    const tool = await p.evaluate(() => ({
        hasFacts: !!document.querySelector('.facts-widget'),
        hasScale: !!document.querySelector('.scale-section'),
        scaleTicks: document.querySelectorAll('.scale-ticks span').length,
        factText: document.querySelector('.facts-text')?.textContent.trim().slice(0, 20) || ''
    }));
    check('探索工具页有「天文冷知识」', tool.hasFacts, tool);
    check('探索工具页有「宇宙尺度之旅」', tool.hasScale, tool);
    check('尺度滑块含 8 个刻度', tool.scaleTicks === 8, tool.scaleTicks);
    check('冷知识有内容', tool.factText.length > 3, tool.factText);

    const t0 = await p.evaluate(() => document.querySelector('.facts-text')?.textContent.trim());
    await p.click('.facts-actions button');
    await sleep(700);
    const t1 = await p.evaluate(() => document.querySelector('.facts-text')?.textContent.trim());
    check('「换一条」可切换冷知识', t0 !== t1);

    await p.evaluate(() => {
        const r = document.querySelector('.scale-slider');
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(r, '7');
        r.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await sleep(600);
    const scaleName = await p.evaluate(() => document.querySelector('.scale-name')?.textContent.trim());
    check('拖动滑块后尺度变化', scaleName === '可观测宇宙', scaleName);
    await p.screenshot({ path: 'F:/天文科普/shots/moved-explore.png' });

    console.log('\n=== 四季星座页只保留星座内容 ===');
    await p.goto(BASE + '/constellations', { waitUntil: 'domcontentloaded' });
    await sleep(1800);
    const cons = await p.evaluate(() => ({
        hasFacts: !!document.querySelector('.facts-widget'),
        hasScale: !!document.querySelector('.scale-section'),
        cards: document.querySelectorAll('.cons-card').length,
        hasBooks: !!document.querySelector('.book-section')
    }));
    check('星座页不再有冷知识', !cons.hasFacts);
    check('星座页不再有尺度之旅', !cons.hasScale);
    check('星座卡片保留（默认当季筛选）', cons.cards >= 2, cons.cards);

    // 切到「全部星座」应显示全部 8 个
    await p.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('.season-tab')).find(x => /全部/.test(x.textContent));
        if (btn) btn.click();
    });
    await sleep(800);
    const allCards = await p.evaluate(() => document.querySelectorAll('.cons-card').length);
    check('切换「全部星座」显示 8 个', allCards === 8, allCards);
    check('星座页仍有书单', cons.hasBooks);

    console.log('\n=== 首页 ===');
    await p.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    await sleep(1500);
    const home = await p.evaluate(() => ({
        facts: !!document.querySelector('.facts-widget'),
        scale: !!document.querySelector('.scale-section'),
        books: !!document.querySelector('.book-section')
    }));
    check('首页无冷知识/尺度/书单', !home.facts && !home.scale && !home.books, home);

    check('无 JS 错误', errs.length === 0, errs.slice(0, 3));

    await b.close();
    console.log('\n========================================');
    console.log(`  通过 ${pass} 项，失败 ${fail} 项`);
    console.log('========================================');
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('异常:', e); process.exit(1); });
