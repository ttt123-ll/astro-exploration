// 校验「返回首页」恢复上次滚动位置
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

    await p.goto(BASE + '/login', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await p.type('input[autocomplete="username"]', 'admin');
    await p.type('input[autocomplete="current-password"]', 'admin123');
    await p.click('button[type="submit"]');
    await sleep(2500);

    console.log('\n=== 场景 1：在首页滚动后离开，再返回 ===');
    await p.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await sleep(2000);
    // 记录页面可滚动高度，选一个靠下的位置
    const info = await p.evaluate(() => ({
        max: document.documentElement.scrollHeight - window.innerHeight
    }));
    const target = Math.min(1400, Math.max(600, info.max - 400));
    await p.evaluate(y => window.scrollTo(0, y), target);
    await sleep(700);
    const before = await p.evaluate(() => Math.round(window.scrollY));
    check('首页已滚动到目标位置', Math.abs(before - target) < 30, { target, before });

    // 点导航进入星空图集
    await p.evaluate(() => {
        const a = Array.from(document.querySelectorAll('.nav-links a')).find(x => x.textContent.includes('星空图集'));
        if (a) a.click();
    });
    await sleep(1600);
    check('已进入星空图集页', p.url().includes('/gallery'), p.url());

    // 点「返回首页」
    await p.evaluate(() => {
        const a = Array.from(document.querySelectorAll('.nav-links a')).find(x => x.textContent.trim() === '首页');
        if (a) a.click();
    });
    await sleep(2200);
    const after = await p.evaluate(() => ({ y: Math.round(window.scrollY), path: location.pathname }));
    check('已回到首页', after.path === '/', after.path);
    check('回到首页后恢复了原滚动位置', Math.abs(after.y - before) < 80, { before, after: after.y });

    console.log('\n=== 场景 2：从首页顶部离开，返回仍应在顶部 ===');
    await p.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await sleep(1800);
    await p.evaluate(() => window.scrollTo(0, 0));
    await sleep(600);
    await p.evaluate(() => {
        const a = Array.from(document.querySelectorAll('.nav-links a')).find(x => x.textContent.includes('宇宙新闻'));
        if (a) a.click();
    });
    await sleep(1500);
    await p.evaluate(() => {
        const a = Array.from(document.querySelectorAll('.nav-links a')).find(x => x.textContent.trim() === '首页');
        if (a) a.click();
    });
    await sleep(2000);
    const topAfter = await p.evaluate(() => Math.round(window.scrollY));
    check('首页顶部离开 → 返回也在顶部', topAfter < 60, topAfter);

    console.log('\n=== 场景 3：普通页面跳转仍从顶部开始 ===');
    await p.goto(BASE + '/gallery', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await sleep(1200);
    await p.evaluate(() => window.scrollTo(0, 800));
    await sleep(600);
    await p.evaluate(() => {
        const a = Array.from(document.querySelectorAll('.nav-links a')).find(x => x.textContent.includes('天文百科'));
        if (a) a.click();
    });
    await sleep(1800);
    const encY = await p.evaluate(() => Math.round(window.scrollY));
    check('切换到其他页从顶部开始', encY < 60, encY);

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
