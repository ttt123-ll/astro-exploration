// 校验增强版页头：每页有 kicker/标题/统计卡，且无 JS 错误
const puppeteer = require('F:/天文科普/tools/node_modules/puppeteer-core');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE = 'http://127.0.0.1:3000';
const sleep = ms => new Promise(r => setTimeout(r, ms));

let pass = 0, fail = 0;
const check = (n, c, e) => {
    if (c) { pass++; console.log('  [OK] ' + n); }
    else { fail++; console.log('  [FAIL] ' + n + (e !== undefined ? '  -> ' + JSON.stringify(e) : '')); }
};

const PAGES = [
    ['/solar-system', '太阳系', 3],
    ['/encyclopedia', '天文百科', 3],
    ['/constellations', '四季星座', 3],
    ['/gallery', '星空图集', 2],
    ['/timeline', '宇宙时间线', 2],
    ['/news', '宇宙新闻', 2],
    ['/community', '互动社区', 2],
    ['/credits', '素材来源与版权说明', 2],
    ['/deep-space', '深空天体', 3],
    ['/explore', '探索工具', 3],
    ['/download', '系统部署说明', 3]
];

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

    console.log('=== 各页面页头 ===');
    for (const [url, title, statCount] of PAGES) {
        await p.goto(BASE + url, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await sleep(1300);
        const info = await p.evaluate(() => {
            const h = document.querySelector('.page-header.ph');
            return {
                has: !!h,
                title: h?.querySelector('.ph-title')?.textContent.trim() || '',
                kicker: h?.querySelector('.page-kicker')?.textContent.trim() || '',
                dot: !!h?.querySelector('.ph-dot'),
                icon: !!h?.querySelector('.page-kicker .fas'),
                subtitle: h?.querySelector('.ph-sub')?.textContent.trim() || '',
                stats: h ? Array.from(h.querySelectorAll('.ph-stat')).map(s => s.querySelector('.ph-v')?.textContent.trim() + '|' + s.querySelector('.ph-l')?.textContent.trim()) : []
            };
        });
        check(url + ' 页头存在', info.has, info);
        if (!info.has) continue;
        check(url + ' 标题', info.title === title, { got: info.title });
        check(url + ' kicker 有光点与图标', info.dot && info.icon);
        check(url + ' 副标题非空', info.subtitle.length > 5, info.subtitle);
        check(url + ' 数据卡数量', info.stats.length === statCount, { got: info.stats, want: statCount });
        check(url + ' 数据卡有数值', info.stats.every(s => s.split('|')[0].length > 0 && s.split('|')[1].length > 0), info.stats);
    }

    console.log('\n=== 后台页（含动态用户名）===');
    await p.goto(BASE + '/admin', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await sleep(1800);
    const admin = await p.evaluate(() => ({
        has: !!document.querySelector('.page-header.ph'),
        sub: document.querySelector('.ph-sub')?.textContent.trim() || '',
        title: document.querySelector('.ph-title')?.textContent.trim() || ''
    }));
    check('/admin 页头存在', admin.has);
    check('/admin 副标题保留用户名', admin.sub.includes('admin'), admin.sub);
    check('/admin 标题', admin.title === '后台管理面板', admin.title);

    console.log('\n=== 首页不应有页头组件 ===');
    await p.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await sleep(1500);
    check('首页无 .page-header.ph', await p.evaluate(() => document.querySelectorAll('.page-header.ph').length === 0));

    check('无 JS 错误', errs.length === 0, errs.slice(0, 3));

    // 截图（新闻页页头 + 百科页页头）
    for (const [url, name] of [['/news', 'header-news'], ['/encyclopedia', 'header-encyclopedia']]) {
        await p.goto(BASE + url, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await sleep(1600);
        await p.screenshot({ path: 'F:/天文科普/shots/' + name + '.png' });
    }

    await b.close();
    console.log('\n========================================');
    console.log(`  通过 ${pass} 项，失败 ${fail} 项`);
    console.log('========================================');
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('异常:', e); process.exit(1); });
