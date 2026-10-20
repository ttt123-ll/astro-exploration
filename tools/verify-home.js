// 批次 B 验证：轮播进度条 / 指示点 / Ken Burns / 数据条图标 / 向下探索
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

    await p.goto(BASE + '/', { waitUntil: 'networkidle2' });
    await sleep(2500);

    // 1. 进度条
    const prog = await p.evaluate(() => {
        const bar = document.querySelector('.hn-progress-bar');
        if (!bar) return null;
        const cs = getComputedStyle(bar);
        return { animation: cs.animationName, duration: cs.animationDuration, bg: cs.backgroundImage.slice(0, 60) };
    });
    check('轮播有进度条', !!prog, prog);
    check('进度条有 5.2s 动画', prog && prog.duration === '5.2s' && prog.animation === 'hnProgress', prog);
    check('进度条为渐变', prog && prog.bg.includes('gradient'), prog && prog.bg);

    // 2. 指示点对比度（尺寸/边框）
    const dots = await p.evaluate(() => {
        const list = Array.from(document.querySelectorAll('.hn-dot'));
        const d = list[0], a = list.find(x => x.classList.contains('active')) || list[0];
        const cs = getComputedStyle(d), ca = getComputedStyle(a);
        return {
            count: list.length,
            width: cs.width, height: cs.height,
            border: cs.borderTopWidth,
            activeWidth: ca.width, activeShadow: ca.boxShadow.slice(0, 40)
        };
    });
    check('指示点数量 = 轮播数', dots.count >= 2, dots.count);
    check('指示点已加大（>=12px）', parseFloat(dots.width) >= 12, dots.width);
    check('指示点有边框对比', parseFloat(dots.border) >= 1, dots.border);
    check('激活点加长且有发光', parseFloat(dots.activeWidth) > 12 && dots.activeShadow.includes('rgb'), dots);

    // 3. Ken Burns
    const ken = await p.evaluate(() => {
        const s = document.querySelector('.hn-slide.active');
        const cs = getComputedStyle(s);
        return { animation: cs.animationName, duration: cs.animationDuration };
    });
    check('当前幻灯片有 Ken Burns 缩放', ken.animation.startsWith('hnKen'), ken);

    // 4. 数据条图标
    const stats = await p.evaluate(() => {
        const cards = Array.from(document.querySelectorAll('.hero-stat'));
        return cards.map(c => ({
            icon: c.querySelector('.hero-stat-icon i') ? c.querySelector('.hero-stat-icon i').className : null,
            label: c.querySelector('.hero-stat-label')?.textContent.trim()
        }));
    });
    check('数据条 4 张卡片', stats.length === 4, stats.length);
    check('每张卡片都有图标', stats.every(s => s.icon && s.icon.includes('fa-')), stats);

    // hover 数字发光
    await p.evaluate(() => document.querySelector('.stats-strip')?.scrollIntoView({ block: 'center' }));
    await sleep(600);
    const box2 = await p.evaluate(() => {
        const el = document.querySelector('.hero-stat');
        const r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    });
    await p.mouse.move(box2.x, box2.y);
    await sleep(600);
    const glow = await p.evaluate(() => {
        const v = document.querySelector('.hero-stat .hero-stat-value');
        return getComputedStyle(v).textShadow;
    });
    check('hover 时数字发光', glow && glow !== 'none' && glow.includes('px'), glow);

    // 5. 向下探索提示
    const hint = await p.evaluate(() => {
        const h = document.querySelector('.scroll-hint');
        if (!h) return null;
        return {
            text: h.textContent.trim(),
            href: h.getAttribute('href'),
            scrollBehavior: getComputedStyle(document.documentElement).scrollBehavior,
            exists: !!document.querySelector('#stats')
        };
    });
    check('有「向下探索」提示', !!hint && hint.text.includes('向下探索'), hint);
    check('提示锚点指向 #stats 且目标存在', hint && hint.href === '#stats' && hint.exists, hint);
    check('页面支持平滑滚动', hint && hint.scrollBehavior === 'smooth', hint && hint.scrollBehavior);

    check('无 JS 错误', errs.length === 0, errs.slice(0, 3));

    // 截图
    await p.evaluate(() => window.scrollTo(0, 0));
    await sleep(800);
    await p.screenshot({ path: 'F:/天文科普/shots/batch-b-home.png' });
    await p.evaluate(() => document.querySelector('.stats-strip')?.scrollIntoView({ block: 'center' }));
    await sleep(500);
    await p.screenshot({ path: 'F:/天文科普/shots/batch-b-stats.png' });

    await b.close();
    console.log('\n========================================');
    console.log(`  通过 ${pass} 项，失败 ${fail} 项`);
    console.log('========================================');
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('异常:', e); process.exit(1); });
