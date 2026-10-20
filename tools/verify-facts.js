// 校验「天文冷知识」+「知识挑战」已从首页移到四季星座页
const puppeteer = require('puppeteer-core');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE = process.env.BASE || 'http://127.0.0.1:3000';

let pass = 0, fail = 0;
const check = (n, c, e) => {
    if (c) { pass++; console.log('  [OK] ' + n); }
    else { fail++; console.log('  [FAIL] ' + n + (e !== undefined ? '  -> ' + JSON.stringify(e) : '')); }
};

(async () => {
    const b = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox'] });
    const p = await b.newPage();
    await p.setViewport({ width: 1440, height: 900 });

    await p.goto(BASE + '/login', { waitUntil: 'networkidle2' });
    await p.type('input[autocomplete="username"]', 'admin');
    await p.type('input[autocomplete="current-password"]', 'admin123');
    await p.click('button[type="submit"]');
    await new Promise(r => setTimeout(r, 2500));

    console.log('\n=== 首页 ===');
    await p.goto(BASE + '/', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2200));
    const home = await p.evaluate(() => ({
        facts: document.querySelectorAll('.facts-card').length,
        quiz: document.querySelectorAll('.quiz-teaser').length,
        factsSec: !!document.getElementById('facts'),
        quizSec: !!document.getElementById('quiz')
    }));
    check('首页已无「天文冷知识」', home.facts === 0 && home.factsSec === false, home);
    check('首页已无「知识挑战」', home.quiz === 0 && home.quizSec === false, home);

    console.log('\n=== 四季星座页 ===');
    await p.goto(BASE + '/constellations', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2200));
    const cons = await p.evaluate(() => {
        const container = document.querySelector('.container');
        const kids = container ? Array.from(container.children) : [];
        const header = document.querySelector('.page-header');
        const factsSec = document.querySelector('.facts-widget');
        const quizSec = document.querySelector('.quiz-teaser');
        return {
            hasFacts: !!factsSec,
            hasQuiz: !!quizSec,
            factsIdx: kids.indexOf(factsSec),
            quizIdx: kids.indexOf(quizSec),
            headerIdx: kids.indexOf(header),
            factText: document.querySelector('.facts-text')?.textContent.trim().slice(0, 20) || '',
            questions: document.querySelectorAll('.teaser-question').length,
            cards: document.querySelectorAll('.cons-card').length
        };
    });
    check('四季星座有「天文冷知识」', cons.hasFacts === true);
    check('四季星座有「知识挑战」', cons.hasQuiz === true);
    check('冷知识紧跟页头（第一位）', cons.factsIdx === cons.headerIdx + 1, cons);
    check('知识挑战在冷知识之后', cons.quizIdx === cons.factsIdx + 1, cons);
    check('保留星座卡片列表', cons.cards > 0, cons.cards);
    check('热身题为 3 道', cons.questions === 3, cons.questions);

    // 冷知识「换一条」
    const before = await p.evaluate(() => document.querySelector('.facts-text')?.textContent.trim());
    await p.click('.facts-actions .btn-gold');
    await new Promise(r => setTimeout(r, 700));
    const after = await p.evaluate(() => document.querySelector('.facts-text')?.textContent.trim());
    check('点击「换一条」切换冷知识', before !== after, { before: before?.slice(0, 12), after: after?.slice(0, 12) });

    // 答题交互
    await p.evaluate(() => {
        const opt = document.querySelector('.teaser-options .option');
        if (opt) opt.click();
    });
    await new Promise(r => setTimeout(r, 400));
    await p.evaluate(() => {
        const btn = document.querySelector('.teaser-card button.btn-primary');
        if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 700));
    check('答题后可显示解析', await p.evaluate(() => !!document.querySelector('.teaser-result.show')));

    await p.screenshot({ path: 'F:\\天文科普\\shots\\constellations-facts.png' });

    console.log('\n=== 四季星座页 · 宇宙尺度 / 书籍推荐 ===');
    const extra = await p.evaluate(() => ({
        hasScale: !!document.querySelector('.scale-section'),
        hasBooks: !!document.querySelector('.books-strip'),
        scaleLabels: document.querySelectorAll('.scale-labels span').length,
        bookCards: document.querySelectorAll('.book-card').length,
        scaleName: document.querySelector('.scale-name')?.textContent.trim() || ''
    }));
    check('四季星座有「宇宙尺度之旅」', extra.hasScale === true);
    check('四季星座有「天文书籍推荐」', extra.hasBooks === true);
    check('尺度滑块含 8 个刻度', extra.scaleLabels === 8, extra.scaleLabels);
    check('书籍卡片已渲染', extra.bookCards > 0, extra.bookCards);

    // 拖动尺度滑块到最远
    await p.evaluate(() => {
        const r = document.querySelector('.scale-slider');
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(r, '7');
        r.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await new Promise(r => setTimeout(r, 700));
    const scaleAfter = await p.evaluate(() => document.querySelector('.scale-name')?.textContent.trim() || '');
    check('拖动滑块后尺度变化', scaleAfter === '可观测宇宙', { before: extra.scaleName, after: scaleAfter });

    // 书籍箭头滚动
    const scrollBefore = await p.evaluate(() => document.querySelector('.books-track')?.scrollLeft || 0);
    await p.click('.books-arrow.next');
    await new Promise(r => setTimeout(r, 900));
    const scrollAfter = await p.evaluate(() => document.querySelector('.books-track')?.scrollLeft || 0);
    check('点击箭头可横向滚动书籍', scrollAfter > scrollBefore, { scrollBefore, scrollAfter });

    console.log('\n=== 首页不应出现这两块 ===');
    await p.goto(BASE + '/', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1800));
    const homeExtra = await p.evaluate(() => ({
        scale: document.querySelectorAll('.scale-section').length,
        books: document.querySelectorAll('.books-strip').length
    }));
    check('首页已无「宇宙尺度之旅」', homeExtra.scale === 0, homeExtra.scale);
    check('首页已无「天文书籍推荐」', homeExtra.books === 0, homeExtra.books);

    const errs = [];
    p.on('pageerror', e => errs.push(String(e.message)));
    await p.reload({ waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1500));
    check('无 JS 错误', errs.length === 0, errs.slice(0, 2));

    await b.close();
    console.log('\n========================================');
    console.log(`  通过 ${pass} 项，失败 ${fail} 项`);
    console.log('========================================');
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('异常:', e); process.exit(1); });
