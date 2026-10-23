// 批次 C 验证：百科分类卡 / 时间线标尺与色带 / 书封 / 页头装饰
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

    await p.goto(BASE + '/login', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await p.type('input[autocomplete="username"]', 'admin');
    await p.type('input[autocomplete="current-password"]', 'admin123');
    await p.click('button[type="submit"]');
    await sleep(2500);

    // ===== 百科：分类卡图标 + 渐变 =====
    console.log('=== 百科分类切换 ===');
    await p.goto(BASE + '/encyclopedia', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await sleep(1500);
    const tabs = await p.evaluate(() => {
        const list = Array.from(document.querySelectorAll('.enc-tab'));
        return list.map(t => {
            const cs = getComputedStyle(t);
            const icon = t.querySelector('.enc-tab-icon i');
            return {
                label: t.querySelector('.enc-tab-main')?.textContent.trim(),
                hasIcon: !!icon,
                bg: cs.backgroundImage !== 'none',
                border: cs.borderTopColor,
                active: t.classList.contains('active')
            };
        });
    });
    check('分类卡数量 = 2', tabs.length === 2, tabs.length);
    check('每个分类有专属图标', tabs.every(t => t.hasIcon), tabs);
    check('未激活卡也有渐变底色', tabs.every(t => t.bg), tabs);
    check('激活卡有独立配色', tabs.some(t => t.active), tabs);

    // ===== 时间线：进度标尺 + 纪元色带 =====
    console.log('\n=== 时间线进度标尺与纪元色带 ===');
    await p.goto(BASE + '/timeline', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await sleep(1500);
    const ruler = await p.evaluate(() => ({
        exists: !!document.querySelector('.tl-ruler'),
        segments: document.querySelectorAll('.tl-ruler-labels span').length,
        width: document.querySelector('.tl-ruler-fill')?.style.width || ''
    }));
    check('存在年代进度标尺', ruler.exists, ruler);
    check('标尺有 6 个年代刻度', ruler.segments === 6, ruler.segments);

    // 滚动后进度应变化
    await p.evaluate(() => document.getElementById('tl-full')?.scrollIntoView({ block: 'start' }));
    await sleep(800);
    const w1 = await p.evaluate(() => document.querySelector('.tl-ruler-fill')?.style.width || '');
    await p.evaluate(() => window.scrollBy(0, 1200));
    await sleep(800);
    const w2 = await p.evaluate(() => document.querySelector('.tl-ruler-fill')?.style.width || '');
    check('标尺随滚动前进', w1 !== w2, { w1, w2 });

    const eraColors = await p.evaluate(() => {
        const events = Array.from(document.querySelectorAll('.u-event')).slice(0, 30);
        const set = new Set();
        events.forEach(e => {
            const card = e.querySelector('.u-event-card');
            if (card) set.add(getComputedStyle(card).borderLeftColor);
        });
        return { total: events.length, colors: [...set] };
    });
    check('事件卡按纪元有多色边带', eraColors.colors.length >= 3, eraColors);

    // ===== 书封 =====
    console.log('\n=== 排版式书封 ===');
    await p.goto(BASE + '/community', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await sleep(1600);
    await p.evaluate(() => document.querySelector('.book-section')?.scrollIntoView({ block: 'center' }));
    await sleep(700);
    const cover = await p.evaluate(() => {
        const c = document.querySelector('.book-cover');
        if (!c) return null;
        const title = c.querySelector('.bc-title');
        const author = c.querySelector('.bc-author');
        const top = c.querySelector('.bc-topline');
        return {
            h: Math.round(c.getBoundingClientRect().height),
            titleMode: title ? getComputedStyle(title).writingMode : null,
            titleText: title?.textContent.trim(),
            hasAuthor: !!author,
            hasLine: !!top,
            hasMark: !!c.querySelector('.bc-mark')
        };
    });
    check('书封为排版式（>=120px 高）', cover && cover.h >= 120, cover);
    check('书名竖排', cover && cover.titleMode && cover.titleMode.startsWith('vertical'), cover && cover.titleMode);
    check('书封含作者/装饰线/印记', cover && cover.hasAuthor && cover.hasLine && cover.hasMark, cover);

    // ===== 页头装饰 =====
    console.log('\n=== 页头专属装饰 ===');
    const decos = [
        ['/encyclopedia', 'deco-galaxy'], ['/gallery', 'deco-stars'], ['/timeline', 'deco-orbit'],
        ['/news', 'deco-nebula'], ['/credits', 'deco-grid']
    ];
    for (const [url, cls] of decos) {
        await p.goto(BASE + url, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await sleep(1200);
        const ok = await p.evaluate((c) => !!document.querySelector('.ph-deco.' + c), cls);
        check(url + ' 有 ' + cls + ' 装饰', ok);
    }

    check('无 JS 错误', errs.length === 0, errs.slice(0, 3));

    // 截图
    for (const [url, name] of [['/encyclopedia', 'c-encyclopedia'], ['/timeline', 'c-timeline'], ['/community', 'c-books']]) {
        await p.goto(BASE + url, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await sleep(1500);
        if (name === 'c-books') await p.evaluate(() => document.querySelector('.book-section')?.scrollIntoView({ block: 'center' }));
        if (name === 'c-timeline') await p.evaluate(() => document.getElementById('tl-full')?.scrollIntoView({ block: 'start' }));
        await sleep(700);
        await p.screenshot({ path: 'F:/天文科普/shots/batch-' + name + '.png' });
    }

    await b.close();
    console.log('\n========================================');
    console.log(`  通过 ${pass} 项，失败 ${fail} 项`);
    console.log('========================================');
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('异常:', e); process.exit(1); });
