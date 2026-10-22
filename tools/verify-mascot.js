/**
 * 看板娘（星语）验证
 * - 桌面常驻显示、SVG 原创绘制、尺寸合理
 * - 点击弹出提示气泡、可关闭、多次点击轮换提示
 * - 首次进入自动问候（session 级只问候一次）
 * - 移动端仅在欢迎态显示，且不遮挡输入区
 * - 无障碍：按钮可聚焦、aria-label 存在
 */
const puppeteer = require('F:/天文科普/tools/node_modules/puppeteer-core');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE = process.env.BASE || 'http://127.0.0.1:3000';
const sleep = ms => new Promise(r => setTimeout(r, ms));

let pass = 0, fail = 0;
const check = (n, c, e) => {
    if (c) { pass++; console.log('  [OK] ' + n); }
    else { fail++; console.log('  [FAIL] ' + n + (e !== undefined ? '  -> ' + JSON.stringify(e).slice(0, 240) : '')); }
};

(async () => {
    const b = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox'] });

    /* ================= 桌面 ================= */
    console.log('=== 桌面端（1440×1000）===');
    const p = await b.newPage();
    await p.setViewport({ width: 1440, height: 1000 });
    const errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await p.goto(BASE + '/assistant', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await sleep(2600);

    const base = await p.evaluate(() => {
        const el = document.querySelector('.ai-mascot');
        const btn = document.querySelector('.mascot-btn');
        const svg = document.querySelector('.mascot-svg');
        const r = el ? el.getBoundingClientRect() : null;
        return {
            exists: !!el,
            hasBtn: !!btn,
            btnLabel: btn ? btn.getAttribute('aria-label') : null,
            hasSvg: !!svg,
            svgShapes: svg ? svg.querySelectorAll('path, ellipse, circle').length : 0,
            w: r ? Math.round(r.width) : 0,
            right: r ? Math.round(r.right) : 0,
            bottom: r ? Math.round(r.bottom) : 0,
            viewport: { w: window.innerWidth, h: window.innerHeight },
            bubbleOpen: !!document.querySelector('.mascot-bubble')
        };
    });
    check('看板娘存在', base.exists, base);
    check('使用原创 SVG 绘制（≥20 个图形）', base.hasSvg && base.svgShapes >= 20, base.svgShapes);
    check('按钮可访问（aria-label）', !!base.btnLabel, base.btnLabel);
    check('尺寸合理（100~200px）', base.w >= 100 && base.w <= 200, base.w);
    check('位于视口右下区域', base.right > base.viewport.w * 0.7 && base.bottom > base.viewport.h * 0.6, base);

    /* 自动问候 */
    check('首次进入自动问候（气泡出现）', base.bubbleOpen, base.bubbleOpen);
    const greeting = await p.evaluate(() => document.querySelector('.mascot-bubble p')?.textContent.trim());
    check('问候语包含自我介绍', /星语/.test(greeting || ''), greeting);

    // 关闭气泡
    await p.evaluate(() => document.querySelector('.mb-close')?.click());
    await sleep(400);
    const closed = await p.evaluate(() => !document.querySelector('.mascot-bubble'));
    check('可关闭气泡', closed);

    /* 点击轮换提示 */
    const tips = [];
    for (let i = 0; i < 2; i++) {
        await p.evaluate(() => document.querySelector('.mascot-btn')?.click());
        await sleep(450);
        tips.push(await p.evaluate(() => document.querySelector('.mascot-bubble p')?.textContent.trim()));
    }
    check('点击后弹出提示', tips.every(t => t && t.length > 8), tips);
    check('多次点击提示会轮换', tips[0] !== tips[1], tips);

    /* 键盘可聚焦 */
    const focusable = await p.evaluate(() => {
        const btn = document.querySelector('.mascot-btn');
        if (!btn) return false;
        btn.focus();
        return document.activeElement === btn;
    });
    check('看板娘可键盘聚焦', focusable);

    check('桌面端无 JS 错误', errs.length === 0, errs.slice(0, 2));
    await p.close();

    /* ================= 移动端 ================= */
    console.log('\n=== 移动端（390×844）===');
    const m = await b.newPage();
    await m.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    await m.goto(BASE + '/assistant', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await sleep(2600);
    const mobile = await m.evaluate(() => {
        const el = document.querySelector('.ai-mascot');
        const r = el ? el.getBoundingClientRect() : null;
        const input = document.querySelector('.ai-input-row')?.getBoundingClientRect();
        const bar = document.querySelector('.mobile-tabbar')?.getBoundingClientRect();
        return {
            exists: !!el,
            w: r ? Math.round(r.width) : 0,
            bottom: r ? Math.round(r.bottom) : 0,
            inputTop: input ? Math.round(input.top) : null,
            barTop: bar ? Math.round(bar.top) : null
        };
    });
    check('移动端欢迎态显示看板娘', mobile.exists, mobile);
    check('移动端尺寸更小（<110px）', mobile.w < 110, mobile.w);
    check('不遮挡输入区（在输入区上方）', mobile.inputTop !== null && mobile.bottom <= mobile.inputTop + 2, mobile);

    // 发消息后应隐藏，避免遮挡对话
    await m.evaluate(() => {
        const input = document.querySelector('.ai-input-row input');
        input.value = '';
    });
    await m.click('.ai-input-row input');
    await m.type('.ai-input-row input', '黑洞是怎么形成的？', { delay: 8 });
    await sleep(150);
    await m.keyboard.press('Enter');
    await sleep(2500);
    const afterChat = await m.evaluate(() => ({
        mascotVisible: !!document.querySelector('.ai-mascot'),
        hasBot: document.querySelectorAll('.ai-msg.bot .ai-bubble').length > 0
    }));
    check('对话开始后移动端隐藏看板娘', afterChat.hasBot && !afterChat.mascotVisible, afterChat);

    await m.close();
    await b.close();

    console.log('\n========================================');
    console.log(`  通过 ${pass} 项，失败 ${fail} 项`);
    console.log('========================================');
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('异常:', e); process.exit(1); });
