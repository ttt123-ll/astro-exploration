// 校验「返回首页 + 当前位置」导航条
const puppeteer = require('puppeteer-core');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE = process.env.BASE || 'http://127.0.0.1:3000';

let pass = 0, fail = 0;
const check = (n, c, e) => {
    if (c) { pass++; console.log('  [OK] ' + n); }
    else { fail++; console.log('  [FAIL] ' + n + (e !== undefined ? '  -> ' + JSON.stringify(e) : '')); }
};

const PAGES = [
    ['/planet-show', '星球投影'],
    ['/community', '互动社区'],
    ['/news', '宇宙新闻'],
    ['/gallery', '星空图集'],
    ['/timeline', '宇宙时间线'],
    ['/solar-system', '太阳系行星']
];

// 首页没有入口的页面：不应出现导航条
const NO_NAV = ['/encyclopedia', '/constellations', '/credits', '/explore', '/deep-space'];

(async () => {
    const b = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox'] });
    const p = await b.newPage();
    await p.setViewport({ width: 1440, height: 900 });

    await p.goto(BASE + '/login', { waitUntil: 'networkidle2' });
    await p.type('input[autocomplete="username"]', 'admin');
    await p.type('input[autocomplete="current-password"]', 'admin123');
    await p.click('button[type="submit"]');
    await new Promise(r => setTimeout(r, 2500));

    console.log('\n=== 各页面导航条 ===');
    for (const [url, title] of PAGES) {
        await p.goto(BASE + url, { waitUntil: 'networkidle2' });
        await new Promise(r => setTimeout(r, 1200));
        const info = await p.evaluate(() => {
            const nav = document.querySelector('.page-nav');
            if (!nav) return null;
            return {
                home: nav.querySelector('.pn-home')?.textContent.trim() || '',
                homeHref: nav.querySelector('.pn-home')?.getAttribute('href') || '',
                current: nav.querySelector('.pn-current')?.textContent.trim() || '',
                label: nav.querySelector('.pn-label')?.textContent.trim() || ''
            };
        });
        check(`${url} 有导航条`, !!info, info);
        if (info) {
            check(`${url} 当前页 = ${title}`, info.current === title, info.current);
            check(`${url} 返回首页链接 = /`, info.homeHref === '/', info.homeHref);
        }
    }

    console.log('\n=== 首页不应出现导航条 ===');
    await p.goto(BASE + '/', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1500));
    check('首页无导航条', await p.evaluate(() => !document.querySelector('.page-nav')));

    console.log('\n=== 首页没有入口的页面不应出现导航条 ===');
    for (const url of NO_NAV) {
        await p.goto(BASE + url, { waitUntil: 'networkidle2' });
        await new Promise(r => setTimeout(r, 900));
        const n = await p.evaluate(() => document.querySelectorAll('.page-nav').length);
        check(url + ' 无导航条', n === 0, n);
    }

    console.log('\n=== 点击「返回首页」 ===');
    await p.goto(BASE + '/planet-show', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1200));
    await p.click('.pn-home');
    await new Promise(r => setTimeout(r, 1800));
    check('点击后回到首页', new URL(p.url()).pathname === '/', p.url());

    await p.goto(BASE + '/planet-show', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1500));
    await p.screenshot({ path: 'F:\\天文科普\\shots\\pagenav.png' });

    const errs = [];
    p.on('pageerror', e => errs.push(String(e.message)));
    await p.reload({ waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1200));
    check('无 JS 错误', errs.length === 0, errs.slice(0, 2));

    await b.close();
    console.log('\n========================================');
    console.log(`  通过 ${pass} 项，失败 ${fail} 项`);
    console.log('========================================');
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('异常:', e); process.exit(1); });
