// 校验：四季星座页的四季配色、自动当季、真实连线、3D 倾斜
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

    await p.goto(BASE + '/constellations', { waitUntil: 'domcontentloaded' });
    await sleep(2000);

    // ===== 季节 tab =====
    console.log('=== 四季配色 tab ===');
    const tabs = await p.evaluate(() => Array.from(document.querySelectorAll('.season-tab')).map(t => ({
        text: t.textContent.replace(/\s+/g, ' ').trim(),
        color: getComputedStyle(t).getPropertyValue('--s-color').trim(),
        active: t.classList.contains('active'),
        hasNow: !!t.querySelector('.tab-now')
    })));
    check('有 5 个 tab（全部 + 四季）', tabs.length === 5, tabs.length);
    const seasonTabs = tabs.filter(t => t.text !== '全部星座');
    check('四季各有独立配色', new Set(seasonTabs.map(t => t.color)).size === 4, seasonTabs.map(t => t.color));
    check('当季 tab 自动选中', tabs.some(t => t.active && t.hasNow), tabs.filter(t => t.active));

    // 自动选中是否与实际月份一致
    const expected = await p.evaluate(() => {
        const m = new Date().getMonth() + 1;
        if ([3, 4, 5].includes(m)) return '春季';
        if ([6, 7, 8].includes(m)) return '夏季';
        if ([9, 10, 11].includes(m)) return '秋季';
        return '冬季';
    });
    const activeText = tabs.find(t => t.active)?.text || '';
    check('自动选中的季节与当前月份一致', activeText.includes(expected), { activeText, expected });

    // ===== 本月推荐角标 =====
    console.log('\n=== 本月推荐与排序 ===');
    const rec = await p.evaluate(() => {
        const cards = Array.from(document.querySelectorAll('.cons-card'));
        const first = cards[0];
        return {
            count: cards.length,
            badges: document.querySelectorAll('.cons-now').length,
            firstHasBadge: !!first?.querySelector('.cons-now'),
            firstSeason: first?.querySelector('.cons-season')?.textContent.trim()
        };
    });
    check('有「本月推荐」角标', rec.badges >= 1, rec);
    check('当季星座排在前面', (rec.firstSeason || '').includes(expected), { firstSeason: rec.firstSeason, expected });

    // ===== 真实连线 =====
    console.log('\n=== 真实星座连线 ===');
    const lines = await p.evaluate(() => {
        const card = document.querySelector('.cons-card');
        const segs = card.querySelectorAll('.cons-lines .seg');
        const stars = card.querySelectorAll('.cons-lines .star');
        const s = segs[0];
        return {
            segs: segs.length,
            stars: stars.length,
            x1: s && s.getAttribute('x1'),
            x2: s && s.getAttribute('x2'),
            dashOffset: s ? getComputedStyle(s).strokeDashoffset : null,
            delay0: segs[0] ? getComputedStyle(segs[0]).transitionDelay : null,
            delay2: segs[2] ? getComputedStyle(segs[2]).transitionDelay : null,
            hasPolyline: card.querySelectorAll('.cons-lines polyline').length
        };
    });
    check('使用 <line> 逐段连线（非 polyline）', lines.hasPolyline === 0 && lines.segs >= 3, lines);
    check('连线有真实坐标', lines.x1 !== null && lines.x1 !== '0', { x1: lines.x1, x2: lines.x2 });
    check('每段起始为未描绘状态', parseFloat(lines.dashOffset) === 1, lines.dashOffset);
    check('各段有阶梯延迟（逐段点亮）', lines.delay0 !== lines.delay2, { delay0: lines.delay0, delay2: lines.delay2 });
    check('星点数量匹配', lines.stars >= lines.segs, { stars: lines.stars, segs: lines.segs });

    // hover 后全部描绘完成
    await p.evaluate(() => document.querySelector('.cons-card')?.scrollIntoView({ block: 'center' }));
    await sleep(500);
    const box = await p.evaluate(() => {
        const r = document.querySelector('.cons-card').getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 3 };
    });
    await p.mouse.move(box.x, box.y);
    await sleep(1600);
    const after = await p.evaluate(() => {
        const card = document.querySelector('.cons-card');
        const segs = Array.from(card.querySelectorAll('.cons-lines .seg'));
        const star = card.querySelector('.cons-lines .star');
        return {
            offsets: segs.map(s => getComputedStyle(s).strokeDashoffset),
            starOpacity: star ? getComputedStyle(star).opacity : null,
            rx: document.querySelector('.cons-card').style.getPropertyValue('--rx'),
            ry: document.querySelector('.cons-card').style.getPropertyValue('--ry'),
            transform: getComputedStyle(document.querySelector('.cons-card')).transform
        };
    });
    check('hover 后所有线段描绘完成', after.offsets.every(o => parseFloat(o) === 0), after.offsets);
    check('hover 后星点亮起', parseFloat(after.starOpacity) > 0.5, after.starOpacity);
    check('卡片 3D 微倾斜生效', after.rx !== '' && after.ry !== '' && after.transform !== 'none', { rx: after.rx, ry: after.ry });
    await p.screenshot({ path: 'F:/天文科普/shots/cons-season.png' });

    console.log('\n=== 卡片信息 ===');
    const cardInfo = await p.evaluate(() => {
        const c = document.querySelector('.cons-card');
        return {
            seasonBadge: c.querySelector('.cons-season')?.textContent.trim(),
            view: c.querySelector('.cons-view')?.textContent.trim(),
            watermark: c.querySelector('.cons-watermark')?.textContent.trim(),
            img: c.querySelector('.cons-img img')?.getAttribute('src')
        };
    });
    check('卡片有季节角标', !!cardInfo.seasonBadge, cardInfo.seasonBadge);
    check('卡片有最佳观测月份', /最佳观测/.test(cardInfo.view || ''), cardInfo.view);
    check('卡片有真实星图背景', /constellation_.*\.jpg/.test(cardInfo.img || ''), cardInfo.img);
    check('卡片有拉丁名水印', !!cardInfo.watermark, cardInfo.watermark);

    check('无 JS 错误', errs.length === 0, errs.slice(0, 3));

    await b.close();
    console.log('\n========================================');
    console.log(`  通过 ${pass} 项，失败 ${fail} 项`);
    console.log('========================================');
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('异常:', e); process.exit(1); });
