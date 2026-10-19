// 校验「宇宙编年史」已从首页移到时间线页顶部
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
        strip: document.querySelectorAll('.tl-card').length,
        section: !!document.getElementById('timeline'),
        sections: Array.from(document.querySelectorAll('section')).map(s => s.id).filter(Boolean)
    }));
    check('首页已无「宇宙编年史」卡片', home.strip === 0, home.strip);
    check('首页已无 #timeline 区块', home.section === false);
    console.log('    首页剩余区块:', home.sections.join(', '));

    console.log('\n=== 宇宙时间线页 ===');
    await p.goto(BASE + '/timeline', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2200));
    const tl = await p.evaluate(() => {
        const strip = document.querySelector('.timeline-strip');
        const header = document.querySelector('.page-header');
        const cards = document.querySelectorAll('.tl-card').length;
        const yearTexts = Array.from(document.querySelectorAll('.tl-year')).map(e => e.textContent);
        const firstYearStyle = (() => {
            const el = document.querySelector('.tl-year');
            return el ? getComputedStyle(el).fontFamily : '';
        })();
        // 判断顺序：轮播条是否在页头之后、其余内容之前
        let order = null;
        if (strip && header) {
            const all = Array.from(document.querySelector('.container').children);
            order = {
                headerIdx: all.indexOf(header),
                stripIdx: all.indexOf(strip),
                total: all.length
            };
        }
        return { cards, yearTexts, firstYearStyle, order };
    });
    check('时间线页有 8 张编年史卡片', tl.cards === 8, tl.cards);
    check('位于页面头部之后的第一个内容块', tl.order && tl.order.stripIdx === tl.order.headerIdx + 1, tl.order);
    check('时间文本含 138亿年前', tl.yearTexts.some(t => t.includes('138亿年前')), tl.yearTexts.slice(0, 3));
    check('时间文本含 10⁻³²秒（上标不丢失）', tl.yearTexts.some(t => t.includes('⁻³²')), tl.yearTexts.slice(0, 3));
    check('时间改用正文字体（非 Orbitron）', !/Orbitron/i.test(tl.firstYearStyle), tl.firstYearStyle);

    await p.screenshot({ path: 'F:\\天文科普\\shots\\timeline-top.png', fullPage: false });

    console.log('\n=== 控制台错误 ===');
    const errs = [];
    p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    p.on('pageerror', e => errs.push(String(e.message)));
    await p.reload({ waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1500));
    check('时间线页无 JS 错误', errs.length === 0, errs.slice(0, 2));

    await b.close();
    console.log('\n========================================');
    console.log(`  通过 ${pass} 项，失败 ${fail} 项`);
    console.log('========================================');
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('异常:', e); process.exit(1); });
