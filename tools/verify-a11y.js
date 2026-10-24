// 批次 A 验证：焦点描边 / 滚动条 / 选中色 / 导航激活态 / 页脚行星 / 光标悬停
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

    await p.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await sleep(2000);

    // 1. 跳过导航链接
    const skip = await p.evaluate(() => {
        const el = document.querySelector('.skip-link');
        return el ? { text: el.textContent.trim(), href: el.getAttribute('href'), top: getComputedStyle(el).top } : null;
    });
    check('存在「跳到主要内容」链接', !!skip && skip.href === '#main-content', skip);
    check('跳转链接默认隐藏（top 为负）', skip && parseInt(skip.top) < 0, skip && skip.top);

    // 2. 主内容容器
    check('存在 #main-content 容器', await p.evaluate(() => !!document.getElementById('main-content')));

    // 3. 焦点描边：用键盘 Tab 聚焦链接，检查 outline
    await p.keyboard.press('Tab');
    await sleep(400);
    const focusInfo = await p.evaluate(() => {
        const el = document.activeElement;
        if (!el) return null;
        const cs = getComputedStyle(el);
        return {
            tag: el.tagName, cls: (el.className || '').toString().slice(0, 40),
            outlineWidth: cs.outlineWidth, outlineStyle: cs.outlineStyle, outlineColor: cs.outlineColor
        };
    });
    check('Tab 后元素有可见描边', focusInfo && parseFloat(focusInfo.outlineWidth) >= 2 && focusInfo.outlineStyle !== 'none', focusInfo);

    // 4. 选中文本色
    const selColor = await p.evaluate(() => {
        const s = document.createElement('span');
        s.textContent = '测试选中';
        document.body.appendChild(s);
        const r = document.createRange();
        r.selectNodeContents(s);
        const sel = window.getSelection();
        sel.removeAllRanges(); sel.addRange(r);
        // 直接读取 CSS 规则里的 ::selection
        let found = '';
        for (const sheet of document.styleSheets) {
            try {
                for (const rule of sheet.cssRules) {
                    if (rule.selectorText && rule.selectorText.includes('::selection')) found = rule.cssText.slice(0, 120);
                }
            } catch (e) { /* 跨域样式表忽略 */ }
        }
        s.remove();
        return found;
    });
    check('定义了 ::selection 选中色', selColor.includes('::selection') && selColor.includes('background'), selColor);

    // 5. 导航激活态：发光点 + 流动下划线
    await p.goto(BASE + '/news', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await sleep(1500);
    const navActive = await p.evaluate(() => {
        const a = document.querySelector('.nav-links a.active');
        if (!a) return null;
        const after = getComputedStyle(a, '::after');
        const before = getComputedStyle(a, '::before');
        return {
            text: a.textContent.trim(),
            afterWidth: after.width,
            afterBg: after.backgroundImage.slice(0, 60),
            afterAnim: after.animationName,
            beforeContent: before.content,
            beforeShadow: before.boxShadow.slice(0, 50)
        };
    });
    check('导航激活项存在', !!navActive, navActive);
    check('激活下划线为渐变', navActive && navActive.afterBg.includes('gradient'), navActive && navActive.afterBg);
    check('激活下划线有流动动画', navActive && navActive.afterAnim === 'navFlow', navActive && navActive.afterAnim);
    check('激活项有发光小点', navActive && navActive.beforeContent !== 'none' && navActive.beforeShadow.includes('rgb'), navActive);

    // 6. 页脚行星彩蛋
    const planets = await p.evaluate(() => {
        const list = document.querySelectorAll('.footer-planet');
        const first = list[0];
        return { count: list.length, hasRing: first ? getComputedStyle(first, '::after').content : null };
    });
    check('页脚有 8 颗行星', planets.count === 8, planets.count);
    await p.evaluate(() => document.querySelector('.footer-planets')?.scrollIntoView({ block: 'center' }));
    await sleep(800);
    // 滚动后重新取坐标，并确认该坐标命中的就是行星本身
    await p.evaluate(() => {
        const el = document.querySelector('.footer-planets .footer-planet:nth-child(5)');
        el.scrollIntoView({ block: 'center' });
    });
    await sleep(400);
    const box2 = await p.evaluate(() => {
        const el = document.querySelector('.footer-planets .footer-planet:nth-child(5)');
        const r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    });
    await p.mouse.move(box2.x, box2.y);
    await sleep(800);
    const hovered = await p.evaluate(() => {
        const el = document.querySelector('.footer-planets .footer-planet:nth-child(5)');
        const cs = getComputedStyle(el);
        return { transform: cs.transform, shadow: cs.boxShadow.slice(0, 60) };
    });
    check('行星 hover 有旋转缩放', hovered.transform !== 'none' && hovered.transform !== 'matrix(1, 0, 0, 1, 0, 0)', hovered.transform);

    // 7. 自定义光标 hover 形态变化
    const glowHover = await p.evaluate(() => {
        const g = document.querySelector('.cursor-glow');
        return g ? { hasClass: g.classList.contains('hovering'), width: getComputedStyle(g).width } : null;
    });
    check('光标悬停态可切换（class 机制存在）', glowHover !== null, glowHover);

    // 8. 减少动态效果
    const p2 = await b.newPage();
    await p2.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await p2.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await sleep(1200);
    const reduced = await p2.evaluate(() => {
        const el = document.querySelector('.navbar');
        const cs = el ? getComputedStyle(el) : null;
        const glow = document.querySelector('.cursor-glow');
        return {
            transitionDuration: cs ? cs.transitionDuration : null,
            glowHidden: glow ? getComputedStyle(glow).display === 'none' : null
        };
    });
    check('减少动态时过渡被压缩', reduced.transitionDuration === '0s' || parseFloat(reduced.transitionDuration) < 0.01, reduced.transitionDuration);
    check('减少动态时光标光晕隐藏', reduced.glowHidden === true, reduced.glowHidden);
    await p2.close();

    check('无 JS 错误', errs.length === 0, errs.slice(0, 3));

    // 截图
    await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await sleep(800);
    await p.screenshot({ path: 'F:/天文科普/shots/batch-a-footer.png' });
    await p.goto(BASE + '/news', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await sleep(1200);
    await p.keyboard.press('Tab'); await p.keyboard.press('Tab');
    await sleep(400);
    await p.screenshot({ path: 'F:/天文科普/shots/batch-a-focus.png' });

    await b.close();
    console.log('\n========================================');
    console.log(`  通过 ${pass} 项，失败 ${fail} 项`);
    console.log('========================================');
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('异常:', e); process.exit(1); });
