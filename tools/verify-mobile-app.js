/**
 * 移动端 H5 专版 + PWA 验证
 * - 底部 Tab 导航（显示/高亮/跳转/不遮挡内容）
 * - 移动端页面适配（AI 输入区、3D 画布像素比、首页轮播）
 * - PWA：manifest / Service Worker 注册 / 图标 / 元信息
 * - 桌面端不应出现底部导航
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

    /* ================= 移动端 ================= */
    console.log('=== 移动端（390×844）===');
    const p = await b.newPage();
    await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    const errs = [];
    p.on('pageerror', e => errs.push(e.message));

    await p.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await sleep(2200);

    /* 1) 底部导航 */
    const tab = await p.evaluate(() => {
        const el = document.querySelector('.mobile-tabbar');
        if (!el) return { exists: false };
        const r = el.getBoundingClientRect();
        const tabs = Array.from(el.querySelectorAll('.mtab')).map(a => ({
            text: a.textContent.trim(),
            href: a.getAttribute('href'),
            active: a.classList.contains('active')
        }));
        const main = document.querySelector('.mobile-main');
        return {
            exists: true,
            fixed: getComputedStyle(el).position === 'fixed',
            bottom: Math.round(window.innerHeight - r.bottom),
            width: Math.round(r.width),
            tabs,
            mainPadBottom: main ? parseInt(getComputedStyle(main).paddingBottom, 10) : 0
        };
    });
    check('底部 Tab 导航存在', tab.exists, tab);
    check('固定在视口底部', tab.fixed && Math.abs(tab.bottom) <= 1, { fixed: tab.fixed, bottom: tab.bottom });
    check('宽度铺满视口', tab.width >= 388, tab.width);
    check('包含 5 个入口', (tab.tabs || []).length === 5, (tab.tabs || []).map(t => t.text));
    check('入口为 首页/星座/图集/AI/社区',
        ['首页', '星座', '图集', 'AI', '社区'].every(k => (tab.tabs || []).some(t => t.text.includes(k))),
        (tab.tabs || []).map(t => t.text));
    check('首页 Tab 高亮', (tab.tabs || []).find(t => t.text.includes('首页'))?.active === true, tab.tabs);
    check('主内容有底部留白（不被遮挡）', tab.mainPadBottom >= 60, tab.mainPadBottom);

    /* 2) Tab 跳转 */
    await p.evaluate(() => {
        const a = Array.from(document.querySelectorAll('.mtab')).find(x => x.textContent.includes('AI'));
        a.click();
    });
    await sleep(1800);
    const aiTab = await p.evaluate(() => ({
        path: location.pathname,
        active: Array.from(document.querySelectorAll('.mtab')).find(a => a.classList.contains('active'))?.textContent.trim()
    }));
    check('点击 AI Tab 跳转 /assistant', aiTab.path === '/assistant', aiTab.path);
    check('AI Tab 高亮', (aiTab.active || '').includes('AI'), aiTab.active);

    /* 3) AI 页面移动端适配（面板内滚动，输入区应初始可见） */
    await p.waitForSelector('.ai-input-row', { timeout: 8000 });
    const ai = await p.evaluate(() => {
        const input = document.querySelector('.ai-input-row');
        const bar = document.querySelector('.mobile-tabbar');
        const aud = document.querySelector('.ai-audience');
        const gearBtn = document.querySelector('.ai-gear-btn');
        const ir = input ? input.getBoundingClientRect() : null;
        const br = bar ? bar.getBoundingClientRect() : null;
        return {
            hasInput: !!input,
            inputInViewport: ir ? (ir.bottom <= window.innerHeight + 2 && ir.top >= 0) : false,
            inputAboveBar: ir && br ? ir.bottom <= br.top + 2 : false,
            audienceVisible: !!aud && aud.getBoundingClientRect().height > 0,
            gearBtnVisible: !!gearBtn && gearBtn.getBoundingClientRect().width > 0
        };
    });
    check('输入区存在', ai.hasInput);
    check('输入区初始即在视口内（面板内滚动）', ai.inputInViewport, ai);
    check('输入区不被底部导航遮挡', ai.inputAboveBar, ai);
    check('受众选择器可见', ai.audienceVisible);
    check('装备导购按钮可见', ai.gearBtnVisible);

    /* 4) 3D 页面：画布适配与像素比限制 */
    await p.goto(BASE + '/planet-show', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await sleep(1800);
    await p.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(x => /遨游|3D/.test(x.textContent));
        if (btn) btn.click();
    });
    await sleep(3500);
    const three = await p.evaluate(() => {
        const c = document.querySelector('.flight canvas') || document.querySelector('canvas');
        if (!c) return { has: false };
        const r = c.getBoundingClientRect();
        return {
            has: true,
            ratio: +(c.width / r.width).toFixed(2),
            w: Math.round(r.width),
            winW: document.documentElement.clientWidth,
            hudTrHidden: (() => {
                const el = document.querySelector('.hud-tr');
                return el ? getComputedStyle(el).display === 'none' : true;
            })(),
            ctlAboveBar: (() => {
                const ctl = document.querySelector('.flight-ctl');
                const bar = document.querySelector('.mobile-tabbar');
                if (!ctl || !bar) return true;
                return ctl.getBoundingClientRect().bottom <= bar.getBoundingClientRect().top + 4;
            })()
        };
    });
    check('3D 画布存在且铺满宽度', three.has && three.w >= three.winW - 2, three);
    check('移动端像素比受限（≤1.3）', three.ratio <= 1.3, three.ratio);
    check('3D 右侧 HUD 已隐藏（避免重叠）', three.hudTrHidden, three);
    check('3D 控制条不被底部导航遮挡', three.ctlAboveBar, three);

    /* 5) 首页轮播：移动端隐藏箭头、显示圆点 */
    await p.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await sleep(1800);
    const hero = await p.evaluate(() => {
        const arrow = document.querySelector('.hn-arrow');
        const dots = document.querySelectorAll('.hn-dot');
        return {
            arrowHidden: arrow ? getComputedStyle(arrow).display === 'none' : true,
            dots: dots.length
        };
    });
    check('移动端隐藏轮播箭头（改用滑动）', hero.arrowHidden, hero);
    check('轮播圆点存在', hero.dots >= 2, hero.dots);

    /* 6) PWA */
    console.log('\n=== PWA ===');
    const manifest = await p.evaluate(async () => {
        const link = document.querySelector('link[rel="manifest"]');
        if (!link) return { hasLink: false };
        const res = await fetch(link.href);
        const j = await res.json();
        return {
            hasLink: true,
            name: j.name,
            short: j.short_name,
            display: j.display,
            icons: (j.icons || []).map(i => i.sizes),
            start: j.start_url,
            ok: res.ok
        };
    });
    check('页面声明 manifest', manifest.hasLink, manifest);
    check('manifest 可访问', manifest.ok === true);
    check('display 为 standalone', manifest.display === 'standalone', manifest.display);
    check('包含 192 与 512 图标',
        (manifest.icons || []).includes('192x192') && (manifest.icons || []).includes('512x512'),
        manifest.icons);

    const sw = await p.evaluate(async () => {
        const res = await fetch('/sw.js');
        const text = await res.text();
        let regs = 0;
        try {
            // 等待 SW 注册完成（生产构建会自动注册）
            await Promise.race([
                navigator.serviceWorker.ready,
                new Promise(r => setTimeout(r, 8000))
            ]);
            const list = await navigator.serviceWorker.getRegistrations();
            regs = list.length;
        } catch (e) { regs = -1; }
        return { ok: res.ok, hasFetchHandler: /addEventListener\('fetch'/.test(text), regs };
    });
    check('sw.js 可访问且含 fetch 处理', sw.ok && sw.hasFetchHandler, sw);
    check('Service Worker 已注册', sw.regs >= 1, sw.regs);

    const icons = await p.evaluate(async () => {
        const urls = ['/assets/brand/icon-192.png', '/assets/brand/icon-512.png', '/assets/brand/apple-touch-icon.png'];
        const out = [];
        for (const u of urls) {
            const r = await fetch(u);
            out.push({ u, ok: r.ok, type: r.headers.get('content-type') });
        }
        return out;
    });
    check('PWA 图标可访问', icons.every(i => i.ok && i.type.includes('image')), icons);

    const meta = await p.evaluate(() => ({
        apple: !!document.querySelector('link[rel="apple-touch-icon"]'),
        capable: !!document.querySelector('meta[name="apple-mobile-web-app-capable"]'),
        theme: document.querySelector('meta[name="theme-color"]')?.getAttribute('content')
    }));
    check('apple-touch-icon 已声明', meta.apple);
    check('iOS 全屏元信息存在', meta.capable);
    check('theme-color 已设置', !!meta.theme, meta.theme);

    check('移动端无 JS 错误', errs.length === 0, errs.slice(0, 3));
    await p.close();

    /* ================= 桌面端 ================= */
    console.log('\n=== 桌面端（1440×900）===');
    const d = await b.newPage();
    await d.setViewport({ width: 1440, height: 900 });
    await d.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await sleep(1800);
    const desktop = await d.evaluate(() => {
        const el = document.querySelector('.mobile-tabbar');
        return { tabbar: el ? getComputedStyle(el).display !== 'none' : false };
    });
    check('桌面端不显示底部导航', desktop.tabbar === false, desktop);
    await d.close();

    await b.close();
    console.log('\n========================================');
    console.log(`  通过 ${pass} 项，失败 ${fail} 项`);
    console.log('========================================');
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('异常:', e); process.exit(1); });
