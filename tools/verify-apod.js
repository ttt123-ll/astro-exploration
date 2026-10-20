// 校验「今日天文图片」已从首页移到星空图集页顶部
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

    await p.goto(BASE + '/login', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await p.type('input[autocomplete="username"]', 'admin');
    await p.type('input[autocomplete="current-password"]', 'admin123');
    await p.click('button[type="submit"]');
    await new Promise(r => setTimeout(r, 2500));

    console.log('\n=== 首页 ===');
    await p.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await new Promise(r => setTimeout(r, 2200));
    const home = await p.evaluate(() => ({
        apod: document.querySelectorAll('.apod-card').length,
        apodSection: !!document.getElementById('apod')
    }));
    check('首页已无 APOD 卡片', home.apod === 0, home.apod);
    check('首页已无 #apod 区块', home.apodSection === false);

    console.log('\n=== 星空图集页 ===');
    await p.goto(BASE + '/gallery', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await new Promise(r => setTimeout(r, 2200));
    const gal = await p.evaluate(() => {
        const apod = document.querySelector('.apod');
        const header = document.querySelector('.page-header');
        const container = document.querySelector('.container');
        const kids = container ? Array.from(container.children) : [];
        return {
            hasApod: !!apod,
            slides: document.querySelectorAll('.apod-slide').length,
            kicker: document.querySelector('.apod-kicker')?.textContent.trim() || '',
            order: { headerIdx: kids.indexOf(header), apodIdx: kids.indexOf(apod) },
            grid: document.querySelectorAll('.gallery-item').length
        };
    });
    check('星空图集有 APOD 区块', gal.hasApod === true);
    check('APOD 含 4 张图片', gal.slides === 4, gal.slides);
    check('紧跟在页头之后的第一个内容块', gal.order.apodIdx === gal.order.headerIdx + 1, gal.order);
    check('仍保留原图集网格', gal.grid > 0, gal.grid);

    // 轮播交互
    const first = await p.evaluate(() => document.querySelector('.apod-slide.active .apod-info h3')?.textContent.trim() || '');
    await p.click('.apod-nav button:last-child');
    await new Promise(r => setTimeout(r, 900));
    const second = await p.evaluate(() => document.querySelector('.apod-slide.active .apod-info h3')?.textContent.trim() || '');
    check('点击右箭头可切换图片', first !== '' && second !== '' && first !== second, { first, second });

    await p.screenshot({ path: 'F:\\天文科普\\shots\\gallery-apod.png' });

    const errs = [];
    p.on('pageerror', e => errs.push(String(e.message)));
    await p.reload({ waitUntil: 'domcontentloaded', timeout: 45000 });
    await new Promise(r => setTimeout(r, 1500));
    check('无 JS 错误', errs.length === 0, errs.slice(0, 2));

    await b.close();
    console.log('\n========================================');
    console.log(`  通过 ${pass} 项，失败 ${fail} 项`);
    console.log('========================================');
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('异常:', e); process.exit(1); });
