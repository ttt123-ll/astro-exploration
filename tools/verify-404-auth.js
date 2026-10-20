// 批次 D 验证：404 趣味页 + 登录/注册星云与玻璃卡片
const puppeteer = require('F:/天文科普/tools/node_modules/puppeteer-core');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE = 'http://127.0.0.1:3000';
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

    // ===== 404 =====
    console.log('=== 404 星际漂流页 ===');
    await p.goto(BASE + '/this-page-does-not-exist', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await sleep(1500);
    const nf = await p.evaluate(() => {
        const astro = document.querySelector('.nf-astro');
        const orbits = document.querySelectorAll('.nf-orbit');
        const stars = document.querySelectorAll('.nf-star');
        return {
            code: document.querySelector('.nf-code')?.textContent.trim(),
            hasAstro: !!astro,
            astroAnim: astro ? getComputedStyle(astro).animationName : null,
            orbits: orbits.length,
            stars: stars.length,
            buttons: Array.from(document.querySelectorAll('.nf-actions .btn')).map(x => x.textContent.trim())
        };
    });
    check('404 页显示 404', nf.code === '404', nf.code);
    check('有漂浮小宇航员', nf.hasAstro && nf.astroAnim.startsWith('nfFloat'), nf);
    check('有轨道环（3 圈）', nf.orbits === 3, nf.orbits);
    check('有星点背景（40 颗）', nf.stars === 40, nf.stars);
    check('有返回首页与上一页按钮', nf.buttons.length === 2, nf.buttons);
    const shape = await p.evaluate(() => {
        const a = Array.from(document.querySelectorAll('.nf-actions .btn')).find(x => x.textContent.includes('返回首页'));
        return a ? a.tagName : null;
    });
    check('返回首页按钮存在', shape === 'BUTTON', shape);

    // ===== 登录页 =====
    console.log('\n=== 登录页星云与玻璃卡片 ===');
    await p.goto(BASE + '/login', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await sleep(1500);
    const login = await p.evaluate(() => {
        const neb = document.querySelector('.auth-nebula');
        const card = document.querySelector('.auth-card');
        const cs = card ? getComputedStyle(card) : null;
        return {
            hasNebula: !!neb,
            blobs: document.querySelectorAll('.auth-nebula .an-blob').length,
            blur: cs ? cs.backdropFilter || cs.webkitBackdropFilter : null,
            bg: cs ? cs.backgroundColor : null,
            zIndex: cs ? cs.zIndex : null
        };
    });
    check('登录页有星云背景', login.hasNebula, login);
    check('星云有 3 个光团', login.blobs === 3, login.blobs);
    check('卡片为玻璃拟态（backdrop blur）', login.blur && login.blur.includes('blur'), login.blur);
    check('卡片半透明背景', login.bg && login.bg.startsWith('rgba'), login.bg);

    // ===== 注册页 =====
    console.log('\n=== 注册页 ===');
    await p.goto(BASE + '/register', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await sleep(1500);
    const reg = await p.evaluate(() => ({
        hasNebula: !!document.querySelector('.auth-nebula'),
        blobs: document.querySelectorAll('.auth-nebula .an-blob').length,
        blur: (() => { const c = document.querySelector('.auth-card'); return c ? getComputedStyle(c).backdropFilter : null; })()
    }));
    check('注册页有星云背景', reg.hasNebula, reg);
    check('注册页卡片玻璃拟态', reg.blur && reg.blur.includes('blur'), reg.blur);

    check('无 JS 错误', errs.length === 0, errs.slice(0, 3));

    // 截图
    await p.goto(BASE + '/this-page-does-not-exist', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await sleep(1200);
    await p.screenshot({ path: 'F:/天文科普/shots/batch-d-404.png' });
    await p.goto(BASE + '/login', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await sleep(1200);
    await p.screenshot({ path: 'F:/天文科普/shots/batch-d-login.png' });

    await b.close();
    console.log('\n========================================');
    console.log(`  通过 ${pass} 项，失败 ${fail} 项`);
    console.log('========================================');
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('异常:', e); process.exit(1); });
