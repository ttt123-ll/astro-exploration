// 校验四季星座页的区块：天文冷知识 / 宇宙尺度 / 书籍推荐（知识挑战已删除）
const puppeteer = require('puppeteer-core');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE = process.env.BASE || 'http://127.0.0.1:3000';

let pass = 0, fail = 0;
const check = (n, c, e) => {
    if (c) { pass++; console.log('  [OK] ' + n); }
    else { fail++; console.log('  [FAIL] ' + n + (e !== undefined ? '  -> ' + JSON.stringify(e) : '')); }
};
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
    const b = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox'] });
    const p = await b.newPage();
    await p.setViewport({ width: 1440, height: 900 });

    await p.goto(BASE + '/login', { waitUntil: 'networkidle2' });
    await p.type('input[autocomplete="username"]', 'admin');
    await p.type('input[autocomplete="current-password"]', 'admin123');
    await p.click('button[type="submit"]');
    await sleep(2500);

    console.log('\n=== 四季星座页 ===');
    await p.goto(BASE + '/constellations', { waitUntil: 'networkidle2' });
    await sleep(2200);
    const cons = await p.evaluate(() => {
        const container = document.querySelector('.container');
        const kids = container ? Array.from(container.children) : [];
        const factsSec = document.querySelector('.facts-widget');
        return {
            hasFacts: !!factsSec,
            factsIdx: kids.indexOf(factsSec),
            headerIdx: kids.indexOf(document.querySelector('.page-header')),
            quizSec: document.querySelectorAll('.quiz-teaser').length,
            teaserQ: document.querySelectorAll('.teaser-question').length,
            hasScale: !!document.querySelector('.scale-section'),
            hasBooks: !!document.querySelector('.books-strip'),
            scaleLabels: document.querySelectorAll('.scale-labels span').length,
            bookCards: document.querySelectorAll('.book-card').length,
            cards: document.querySelectorAll('.cons-card').length,
            scaleName: document.querySelector('.scale-name')?.textContent.trim() || ''
        };
    });
    check('有「天文冷知识」', cons.hasFacts === true);
    check('冷知识紧跟页头（第一位）', cons.factsIdx === cons.headerIdx + 1, { facts: cons.factsIdx, header: cons.headerIdx });
    check('「知识挑战」已删除', cons.quizSec === 0 && cons.teaserQ === 0, { quiz: cons.quizSec, q: cons.teaserQ });
    check('有「宇宙尺度之旅」', cons.hasScale === true);
    check('有「天文书籍推荐」', cons.hasBooks === true);
    check('尺度滑块含 8 个刻度', cons.scaleLabels === 8, cons.scaleLabels);
    check('书籍卡片已渲染', cons.bookCards > 0, cons.bookCards);
    check('星座卡片列表保留', cons.cards > 0, cons.cards);

    // 冷知识「换一条」
    const before = await p.evaluate(() => document.querySelector('.facts-text')?.textContent.trim());
    await p.click('.facts-actions .btn-gold');
    await sleep(700);
    const after = await p.evaluate(() => document.querySelector('.facts-text')?.textContent.trim());
    check('点击「换一条」切换冷知识', before !== after, { before: before?.slice(0, 12), after: after?.slice(0, 12) });

    // 尺度滑块
    await p.evaluate(() => {
        const r = document.querySelector('.scale-slider');
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(r, '7');
        r.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await sleep(700);
    const scaleAfter = await p.evaluate(() => document.querySelector('.scale-name')?.textContent.trim() || '');
    check('拖动滑块后尺度变化', scaleAfter === '可观测宇宙', { before: cons.scaleName, after: scaleAfter });

    // 书籍箭头
    const hasArrow = await p.evaluate(() => !!document.querySelector('.books-arrow.next'));
    const s0 = await p.evaluate(() => document.querySelector('.books-track')?.scrollLeft || 0);
    if (hasArrow) await p.click('.books-arrow.next');
    await sleep(900);
    const s1 = await p.evaluate(() => document.querySelector('.books-track')?.scrollLeft || 0);
    check(hasArrow ? '点击箭头可横向滚动书籍' : '书籍不足一屏时自动隐藏箭头', hasArrow ? s1 > s0 : true, { hasArrow, s0, s1 });

    await p.evaluate(() => document.querySelector('.facts-widget')?.scrollIntoView({ block: 'start' }));
    await sleep(900);
    await p.screenshot({ path: 'F:\\天文科普\\shots\\cons-facts.png' });

    console.log('\n=== 首页不应出现这些区块 ===');
    await p.goto(BASE + '/', { waitUntil: 'networkidle2' });
    await sleep(1800);
    const home = await p.evaluate(() => ({
        facts: document.querySelectorAll('.facts-widget').length,
        quiz: document.querySelectorAll('.quiz-teaser').length,
        scale: document.querySelectorAll('.scale-section').length,
        books: document.querySelectorAll('.books-strip').length
    }));
    check('首页无冷知识/知识挑战/尺度/书籍', home.facts + home.quiz + home.scale + home.books === 0, home);

    const errs = [];
    p.on('pageerror', e => errs.push(String(e.message)));
    await p.goto(BASE + '/constellations', { waitUntil: 'networkidle2' });
    await sleep(1500);
    check('无 JS 错误', errs.length === 0, errs.slice(0, 2));

    await b.close();
    console.log('\n========================================');
    console.log(`  通过 ${pass} 项，失败 ${fail} 项`);
    console.log('========================================');
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('异常:', e); process.exit(1); });
