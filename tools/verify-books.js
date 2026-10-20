// 校验：除首页外每个页面都有各自主题的书单
const puppeteer = require('F:/天文科普/tools/node_modules/puppeteer-core');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE = process.env.BASE || 'http://127.0.0.1:3000';

let pass = 0, fail = 0;
const check = (n, c, e) => {
    if (c) { pass++; console.log('  [OK] ' + n); }
    else { fail++; console.log('  [FAIL] ' + n + (e !== undefined ? '  -> ' + JSON.stringify(e) : '')); }
};
const sleep = ms => new Promise(r => setTimeout(r, ms));

const PAGES = [
    ['/solar-system', '延伸阅读 · 认识太阳系'],
    ['/planet-show', '延伸阅读 · 认识这些天体'],
    ['/encyclopedia', '延伸阅读 · 恒星、星系与黑洞'],
    ['/constellations', '延伸阅读 · 观星与星座'],
    ['/gallery', '延伸阅读 · 星空之美与天文摄影'],
    ['/timeline', '延伸阅读 · 宇宙的过去与未来'],
    ['/news', '延伸阅读 · 跟上航天前沿'],
    ['/community', '延伸阅读 · 天文入门书单'],
    ['/credits', '延伸阅读 · 科普与素材背后'],
    ['/deep-space', '延伸阅读 · 深空探索'],
    ['/explore', '延伸阅读 · 观测与工具'],
    ['/download', '延伸阅读 · 系统学习']
];

(async () => {
    const b = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox'] });
    const p = await b.newPage();
    await p.setViewport({ width: 1440, height: 900 });

    await p.goto(BASE + '/login', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await p.type('input[autocomplete="username"]', 'admin');
    await p.type('input[autocomplete="current-password"]', 'admin123');
    await p.click('button[type="submit"]');
    await sleep(2500);

    console.log('=== 各页面主题书单 ===');
    for (const [url, title] of PAGES) {
        await p.goto(BASE + url, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await sleep(1300);
        const info = await p.evaluate(() => {
            const sec = document.querySelector('.book-section');
            return {
                has: !!sec,
                title: sec ? (sec.querySelector('.section-title')?.textContent || '').trim() : '',
                cards: sec ? sec.querySelectorAll('.book-card').length : 0,
                subtitle: sec ? (sec.querySelector('.section-subtitle')?.textContent || '').trim() : ''
            };
        });
        check(url + ' 有书单', info.has, info);
        if (info.has) {
            check(url + ' 标题正确', info.title === title, { got: info.title, want: title });
            check(url + ' 有推荐书籍', info.cards > 0, info.cards);
            check(url + ' 有导语', info.subtitle.length > 5, info.subtitle);
        }
    }

    console.log('\n=== 首页不应有书单 ===');
    await p.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await sleep(1800);
    check('首页无书单', await p.evaluate(() => document.querySelectorAll('.book-section').length === 0));

    console.log('\n=== 详情页按分组匹配书单 ===');
    for (const [url, expect] of [
        ['/detail/planet/mars', '延伸阅读 · 认识太阳系'],
        ['/detail/star/yellow-dwarf', '延伸阅读 · 恒星、星系与黑洞'],
        ['/detail/constellation/orion', '延伸阅读 · 观星与星座']
    ]) {
        await p.goto(BASE + url, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await sleep(1200);
        const t = await p.evaluate(() => (document.querySelector('.book-section .section-title')?.textContent || '').trim());
        check(url + ' 书单正确', t === expect, { got: t, want: expect });
    }

    // 横向滚动交互
    await p.goto(BASE + '/community', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await sleep(1500);
    const hasArrow = await p.evaluate(() => !!document.querySelector('.book-section .books-arrow.next'));
    const s0 = await p.evaluate(() => document.querySelector('.book-section .books-track')?.scrollLeft || 0);
    if (hasArrow) await p.click('.book-section .books-arrow.next');
    await sleep(900);
    const s1 = await p.evaluate(() => document.querySelector('.book-section .books-track')?.scrollLeft || 0);
    check(hasArrow ? '书单可横向滚动' : '书单不足一屏时自动隐藏箭头', hasArrow ? s1 > s0 : true, { hasArrow, s0, s1 });

    await p.evaluate(() => document.querySelector('.book-section')?.scrollIntoView({ block: 'center' }));
    await sleep(800);
    await p.screenshot({ path: 'F:/天文科普/shots/books-community.png' });

    const errs = [];
    p.on('pageerror', e => errs.push(String(e.message)));
    await sleep(500);
    check('无 JS 错误', errs.length === 0, errs.slice(0, 2));

    await b.close();
    console.log('\n========================================');
    console.log(`  通过 ${pass} 项，失败 ${fail} 项`);
    console.log('========================================');
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('异常:', e); process.exit(1); });
