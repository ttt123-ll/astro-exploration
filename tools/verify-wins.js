// 快赢批次验证：聚光灯边框 / 骨架屏 / 测验徽章 / 星座连线
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

    // ===== 1. 聚光灯边框 =====
    console.log('=== 聚光灯边框 ===');
    await p.goto(BASE + '/gallery', { waitUntil: 'networkidle2' });
    await sleep(2000);
    await p.evaluate(() => document.querySelector('.gallery-item')?.scrollIntoView({ block: 'center' }));
    await sleep(600);
    const spot = await p.evaluate(() => {
        const card = document.querySelector('.gallery-item');
        if (!card) return null;
        const r = card.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2, hasPseudo: getComputedStyle(card, '::before').opacity };
    });
    check('图集卡片存在', !!spot, spot);
    await p.mouse.move(spot.x, spot.y);
    await sleep(700);
    const spot2 = await p.evaluate(() => {
        const card = document.querySelector('.gallery-item');
        const cs = getComputedStyle(card, '::before');
        return {
            mx: card.style.getPropertyValue('--mx'),
            my: card.style.getPropertyValue('--my'),
            opacity: cs.opacity,
            background: cs.backgroundImage.slice(0, 50)
        };
    });
    check('鼠标坐标已写入 CSS 变量', spot2.mx !== '' && spot2.my !== '', spot2);
    check('hover 时描边可见', parseFloat(spot2.opacity) > 0.5, spot2.opacity);
    check('描边为径向渐变', spot2.background.includes('radial-gradient'), spot2.background);

    // ===== 2. 骨架屏 =====
    console.log('\n=== 骨架屏 ===');
    // 新闻页：拦截接口延迟以观察骨架
    await p.setRequestInterception(true);
    const delayHandler = async (req) => {
        if (req.url().includes('/api/news')) {
            await sleep(1200);
            req.continue().catch(() => {});
        } else req.continue().catch(() => {});
    };
    p.on('request', delayHandler);
    const navPromise = p.goto(BASE + '/news', { waitUntil: 'domcontentloaded' });
    await sleep(500);
    const skel = await p.evaluate(() => ({
        count: document.querySelectorAll('.skel-news .skel-card').length,
        hasShine: document.querySelectorAll('.skel-news .skel').length > 0,
        anim: (() => {
            const s = document.querySelector('.skel');
            return s ? getComputedStyle(s, '::after').animationName : null;
        })()
    }));
    check('新闻页加载时显示骨架卡片', skel.count >= 3, skel);
    check('骨架有光影扫过动画', skel.anim === 'skelShine', skel.anim);
    await navPromise;
    await sleep(2200);
    const afterLoad = await p.evaluate(() => document.querySelectorAll('.skel-news').length);
    check('加载完成后骨架消失', afterLoad === 0, afterLoad);
    p.off('request', delayHandler);
    await p.setRequestInterception(false);

    // ===== 3. 测验徽章 =====
    console.log('\n=== 测验徽章 ===');
    await p.goto(BASE + '/login', { waitUntil: 'networkidle2' });
    await p.type('input[autocomplete="username"]', 'admin');
    await p.type('input[autocomplete="current-password"]', 'admin123');
    await p.click('button[type="submit"]');
    await sleep(2600);
    await p.goto(BASE + '/community?tab=quiz', { waitUntil: 'networkidle2' });
    await sleep(1800);

    // 开始答题并全部选 A（快速完成）
    const startBtn = await p.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const b = btns.find(x => /开始/.test(x.textContent));
        if (b) { b.click(); return true; }
        return false;
    });
    check('进入答题流程', startBtn);
    await sleep(1200);

    // 逐题作答：选第一个选项 → 点「下一题 / 查看成绩」，直到出现成绩单
    for (let i = 0; i < 30; i++) {
        const done = await p.evaluate(() => !!document.querySelector('.quiz-result'));
        if (done) break;
        const clicked = await p.evaluate(() => {
            const opt = document.querySelector('.quiz-option');
            if (!opt) return false;
            opt.click();
            return true;
        });
        if (!clicked) break;
        await sleep(450);
        await p.evaluate(() => {
            const btn = Array.from(document.querySelectorAll('.quiz-next-wrap button, button'))
                .find(x => /下一题|查看成绩/.test(x.textContent));
            if (btn) btn.click();
        });
        await sleep(500);
    }
    await sleep(1600);

    const badgeInfo = await p.evaluate(() => {
        const el = document.querySelector('.rank-badge');
        if (!el) return null;
        return {
            title: el.querySelector('.rank-badge-title')?.textContent.trim(),
            en: el.querySelector('.rank-badge-sub')?.textContent.trim(),
            hasEmblem: !!el.querySelector('.rank-badge-emblem i'),
            color: el.style.getPropertyValue('--badge-color'),
            anim: getComputedStyle(el).animationName
        };
    });
    check('成绩单显示段位徽章', !!badgeInfo, badgeInfo);
    if (badgeInfo) {
        check('徽章有段位名称', badgeInfo.title && badgeInfo.title.length >= 2, badgeInfo.title);
        check('徽章有英文副标', badgeInfo.en && badgeInfo.en.length > 3, badgeInfo.en);
        check('徽章有徽记图标', badgeInfo.hasEmblem);
        check('徽章有专属配色', !!badgeInfo.color, badgeInfo.color);
        check('徽章有人场动画', badgeInfo.anim.startsWith('badgeIn'), badgeInfo.anim);
    }
    await p.screenshot({ path: 'F:/天文科普/shots/win-badge.png' });

    // ===== 4. 星座连线 =====
    console.log('\n=== 星座连线动画 ===');
    await p.goto(BASE + '/constellations', { waitUntil: 'networkidle2' });
    await sleep(1800);
    const cons = await p.evaluate(() => {
        const card = document.querySelector('.cons-card');
        if (!card) return null;
        const line = card.querySelector('.cons-lines polyline');
        const dots = card.querySelectorAll('.cons-lines circle');
        const wm = card.querySelector('.cons-watermark');
        return {
            hasSvg: !!card.querySelector('.cons-lines'),
            points: line ? line.getAttribute('points') : null,
            dashOffset: line ? getComputedStyle(line).strokeDashoffset : null,
            dots: dots.length,
            watermark: wm ? wm.textContent.trim() : null
        };
    });
    check('星座卡有 SVG 连线层', cons && cons.hasSvg, cons);
    check('折线有多个坐标点', cons && cons.points && cons.points.split(' ').length >= 5, cons && cons.points);
    check('连点为虚线起始状态（未描绘）', cons && parseFloat(cons.dashOffset) > 100, cons && cons.dashOffset);
    check('有星点与拉丁名水印', cons && cons.dots >= 5 && cons.watermark, cons);

    const consBox = await p.evaluate(() => {
        const c = document.querySelector('.cons-card');
        c.scrollIntoView({ block: 'center' });
        const r = c.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    });
    await sleep(500);
    const consBox2 = await p.evaluate(() => {
        const c = document.querySelector('.cons-card');
        const r = c.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    });
    await p.mouse.move(consBox2.x, consBox2.y);
    await sleep(1600);
    const consHover = await p.evaluate(() => {
        const line = document.querySelector('.cons-card .cons-lines polyline');
        const wm = document.querySelector('.cons-card .cons-watermark');
        return { dashOffset: getComputedStyle(line).strokeDashoffset, wmOpacity: getComputedStyle(wm).opacity };
    });
    check('hover 后连线描绘完成', parseFloat(consHover.dashOffset) === 0, consHover.dashOffset);
    check('hover 后拉丁名水印浮现', parseFloat(consHover.wmOpacity) > 0.5, consHover.wmOpacity);
    await p.screenshot({ path: 'F:/天文科普/shots/win-cons.png' });

    check('无 JS 错误', errs.length === 0, errs.slice(0, 3));

    await b.close();
    console.log('\n========================================');
    console.log(`  通过 ${pass} 项，失败 ${fail} 项`);
    console.log('========================================');
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('异常:', e); process.exit(1); });
