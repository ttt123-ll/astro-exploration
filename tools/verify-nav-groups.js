/**
 * 导航分组 + 老页面主题统一验证
 *  1) 桌面：3 个分组（探索/观测/社区），下拉展开、6 个条目、点击跳转、分组高亮
 *  2) 移动端：汉堡菜单内分组展开、条目可见、点击跳转、无横向溢出
 *  3) 主题一致：视频页/详情页/404 均使用 PageHeader；视频页用共享 info-card（无旧 sys-card）；
 *     404 用统一信息卡；详情页显示页头统计
 */
const puppeteer = require('F:/天文科普/tools/node_modules/puppeteer-core');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE = process.env.BASE || 'http://127.0.0.1:3001';
const sleep = ms => new Promise(r => setTimeout(r, ms));

let pass = 0, fail = 0;
const check = (n, c, e) => {
    if (c) { pass++; console.log('  [OK] ' + n); }
    else { fail++; console.log('  [FAIL] ' + n + (e !== undefined ? '  -> ' + JSON.stringify(e).slice(0, 240) : '')); }
};

(async () => {
    const b = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox'] });

    /* ================= 桌面导航 ================= */
    console.log('=== 桌面导航 ===');
    const p = await b.newPage();
    await p.setViewport({ width: 1440, height: 900 });
    const errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await p.goto(BASE + '/', { waitUntil: 'networkidle2', timeout: 45000 });
    await sleep(1800);

    const base = await p.evaluate(() => ({
        groups: Array.from(document.querySelectorAll('.nav-group-btn')).map(x => x.textContent.replace(/\s+/g, ' ').trim()),
        dropsHidden: Array.from(document.querySelectorAll('.nav-drop')).every(x => getComputedStyle(x).display === 'none'),
        topLinks: Array.from(document.querySelectorAll('.nav-links > li > a, .nav-links > li > .nav-group-btn')).map(x => x.textContent.replace(/\s+/g, ' ').trim()),
        totalItems: document.querySelectorAll('.nav-drop a').length
    }));
    check('导航分为 3 组', base.groups.length === 3, base.groups);
    check('分组为 探索 / 观测 / 社区',
        ['探索', '观测', '社区'].every(k => base.groups.some(g => g.includes(k))), base.groups);
    check('下拉默认收起', base.dropsHidden === true, base.dropsHidden);
    check('下拉条目共 14 个', base.totalItems === 14, base.totalItems);
    check('首项为首页', (base.topLinks[0] || '').includes('首页'), base.topLinks);

    /* 点击「探索」展开 */
    await p.evaluate(() => document.querySelectorAll('.nav-group-btn')[0].click());
    await sleep(500);
    const opened = await p.evaluate(() => {
        const drop = document.querySelectorAll('.nav-drop')[0];
        return {
            visible: drop ? getComputedStyle(drop).display !== 'none' : false,
            items: Array.from(drop.querySelectorAll('a')).map(x => x.textContent.replace(/\s+/g, ' ').trim()),
            expanded: document.querySelectorAll('.nav-group-btn')[0].getAttribute('aria-expanded')
        };
    });
    check('点击分组可展开下拉', opened.visible, opened);
    check('探索组含 6 个入口', opened.items.length === 6, opened.items);
    check('展开状态写入 aria-expanded', opened.expanded === 'true', opened.expanded);
    await p.screenshot({ path: 'E:/dsh/nav-groups-final.png' });

    /* 点击条目跳转 */
    await p.evaluate(() => {
        const a = Array.from(document.querySelectorAll('.nav-drop a')).find(x => /天文百科/.test(x.textContent));
        if (a) a.click();
    });
    await sleep(1200);
    check('点击分组条目可跳转', /\/encyclopedia/.test(p.url()), p.url());
    const active = await p.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('.nav-group-btn')).find(x => x.classList.contains('active'));
        return { activeText: btn?.textContent.replace(/\s+/g, ' ').trim() };
    });
    check('当前页所属分组长亮', /探索/.test(active.activeText || ''), active);

    /* ================= 老页面主题统一 ================= */
    console.log('\n=== 老页面主题统一 ===');
    for (const [route, name] of [['/videos', '视频页'], ['/detail/planet/jupiter', '详情页'], ['/no-such-page', '404 页']]) {
        await p.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await sleep(1600);
        const info = await p.evaluate(() => ({
            header: !!document.querySelector('.page-header.ph'),
            legacySys: document.querySelectorAll('.sys-card').length,
            infoCard: document.querySelectorAll('.info-card').length,
            notfound: document.querySelectorAll('.notfound-card').length,
            stats: document.querySelectorAll('.ph-stats .ph-stat').length
        }));
        check(name + ' 使用统一 PageHeader', info.header, info);
        check(name + ' 不再出现旧 .sys-card', info.legacySys === 0, info.legacySys);
        if (route === '/videos') check('视频页版权说明用共享 info-card', info.infoCard === 1, info);
        if (route === '/detail/planet/jupiter') check('详情页页头显示关键数据卡', info.stats === 3, info.stats);
        if (route === '/no-such-page') check('404 页使用统一信息卡', info.notfound === 1, info);
    }

    check('桌面无 JS 错误', errs.length === 0, errs.slice(0, 2));
    await p.close();

    /* ================= 移动端导航 ================= */
    console.log('\n=== 移动端导航 ===');
    const m = await b.newPage();
    await m.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    await m.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await sleep(1800);
    await m.evaluate(() => document.querySelector('.menu-toggle').click());
    await sleep(500);
    const mobile = await m.evaluate(() => ({
        groups: Array.from(document.querySelectorAll('.nav-group-btn')).map(x => x.textContent.replace(/\s+/g, ' ').trim()),
        links: document.querySelectorAll('.nav-links a').length,
        overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
        firstItemVisible: (() => {
            const a = document.querySelector('.nav-drop a');
            if (!a) return false;
            const r = a.getBoundingClientRect();
            return r.width > 0 && r.height > 0;
        })()
    }));
    check('移动端菜单含 3 个分组', mobile.groups.length === 3, mobile.groups);
    check('移动端菜单导航项 ≥ 12', mobile.links >= 12, mobile.links);
    check('移动端分组条目可见', mobile.firstItemVisible);
    check('移动端无横向溢出', mobile.overflow === false, mobile.overflow);
    await m.screenshot({ path: 'E:/dsh/nav-mobile-groups.png' });

    /* 移动端点击分组条目 */
    await m.evaluate(() => {
        const a = Array.from(document.querySelectorAll('.nav-drop a')).find(x => /科普视频/.test(x.textContent));
        if (a) a.click();
    });
    await sleep(1200);
    check('移动端点击条目可跳转', /\/videos/.test(m.url()), m.url());

    await m.close();
    await b.close();
    console.log('\n========================================');
    console.log(`  通过 ${pass} 项，失败 ${fail} 项`);
    console.log('========================================');
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('异常:', e); process.exit(1); });
