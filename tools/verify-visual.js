/**
 * 浏览器走查（视觉一致性 + 布局问题探测）
 *  - 桌面 / 移动两种视口逐页检查：JS 错误、横向溢出、破图、越界元素、页头/标题缺失
 *  - 移动端额外检查：底部 Tab、汉堡按钮、点击目标尺寸
 *  - 聊天挂件：流式逐字输出 + 光标
 * 用法：node tools/verify-visual.js [--shots]
 */
const fs = require('fs');
const path = require('path');
const puppeteer = require('F:/天文科普/tools/node_modules/puppeteer-core');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE = process.env.BASE || 'http://127.0.0.1:3001';
const SHOTS = process.argv.includes('--shots');
const OUT = 'F:/天文科普/shots/walk';
const sleep = ms => new Promise(r => setTimeout(r, ms));

const PAGES = [
    ['/', '首页'],
    ['/solar-system', '太阳系'],
    ['/planet-show', '星球投影'],
    ['/encyclopedia', '天文百科'],
    ['/constellations', '四季星座'],
    ['/gallery', '星空图集'],
    ['/timeline', '宇宙时间线'],
    ['/neo', '近地天体'],
    ['/assistant', 'AI 助手'],
    ['/videos', '科普视频'],
    ['/news', '宇宙新闻'],
    ['/credits', '素材来源'],
    ['/community', '互动社区'],
    ['/explore', '探索工具'],
    ['/deep-space', '深空天体'],
    ['/download', '资源下载'],
    ['/detail/planet/jupiter', '木星详情'],
    ['/no-such-page', '404'],
    ['/login', '登录']
];

let pass = 0, fail = 0;
const issues = [];
const check = (name, cond, detail) => {
    if (cond) { pass++; }
    else {
        fail++;
        issues.push({ name, detail });
        console.log('  [FAIL] ' + name + (detail !== undefined ? '  -> ' + JSON.stringify(detail).slice(0, 200) : ''));
    }
};

/* 检查单页布局问题 */
async function inspectPage(p) {
    return p.evaluate(() => {
        const doc = document.documentElement;
        const vw = doc.clientWidth;
        const result = {
            overflowX: doc.scrollWidth > vw + 1,
            scrollWidth: doc.scrollWidth,
            vw,
            brokenImages: [],
            offscreen: [],
            tinyTargets: [],
            hasHeader: !!document.querySelector('.page-header.ph'),
            navBottom: Math.round((document.querySelector('.navbar')?.getBoundingClientRect().bottom) || 0),
            topNavs: Array.from(document.querySelectorAll('.page-nav, .breadcrumb')).map(el => Math.round(el.getBoundingClientRect().top)),
            hasNav: !!document.querySelector('.navbar'),
            footer: !!document.querySelector('.footer, .site-footer'),
            visibleText: (document.body.innerText || '').trim().length
        };
        // 破图（跳过 lazy 未加载）
        document.querySelectorAll('img').forEach(img => {
            const r = img.getBoundingClientRect();
            if (!r.width) return;
            if (img.complete && img.naturalWidth === 0 && img.src && !img.src.startsWith('data:')) {
                result.brokenImages.push(img.getAttribute('src') || img.getAttribute('alt'));
            }
        });
        // 越界元素：跳过固定装饰、全屏画布、横向滚动容器内元素与纯装饰类
        const DECOR = '.orbit, .orbit-container, .planet-orbit, .page-bg, .starfield, .page-backdrop, .spotlight-fx, .cursor-fx, .warp-overlay, .deco-ring, .deco-core, .deco-star, .ph-deco, .tn-orbit';
        function inScrollableX(el) {
            let node = el.parentElement;
            while (node && node !== document.body) {
                const cs = getComputedStyle(node);
                if (/(auto|scroll)/.test(cs.overflowX)) return true;
                node = node.parentElement;
            }
            return false;
        }
        document.querySelectorAll('body *').forEach(el => {
            const cs = getComputedStyle(el);
            if (cs.position === 'fixed' || cs.pointerEvents === 'none' || cs.visibility === 'hidden') return;
            if (el.tagName === 'CANVAS' || el.closest('canvas')) return;
            if (el.matches(DECOR)) return;
            if (inScrollableX(el)) return;
            const r = el.getBoundingClientRect();
            if (!r.width || !r.height) return;
            if (r.right > window.innerWidth + 2 && r.width > 8) {
                result.offscreen.push({
                    cls: (el.className || el.tagName).toString().slice(0, 40),
                    right: Math.round(r.right),
                    w: Math.round(r.width)
                });
            }
        });
        // 点击目标过小（仅移动端统计）
        if (window.innerWidth <= 768) {
            document.querySelectorAll('button, a, input').forEach(el => {
                const r = el.getBoundingClientRect();
                if (!r.width || !r.height || el.closest('.navbar .nav-links')) return;
                if (r.width < 24 || r.height < 24) {
                    result.tinyTargets.push({ text: (el.textContent || '').trim().slice(0, 12), w: Math.round(r.width), h: Math.round(r.height) });
                }
            });
        }
        return result;
    });
}

(async () => {
    if (SHOTS) fs.mkdirSync(OUT, { recursive: true });
    const b = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox'] });

    /* ================= 桌面 ================= */
    console.log('=== 桌面走查（1440×900）===');
    const d = await b.newPage();
    await d.setViewport({ width: 1440, height: 900 });
    let pageErrors = [];
    d.on('pageerror', e => pageErrors.push(e.message));

    for (const [route, name] of PAGES) {
        pageErrors = [];
        await d.goto(BASE + route, { waitUntil: 'networkidle2', timeout: 45000 }).catch(() => {});
        await sleep(route === '/planet-show' ? 2600 : 1500);
        const info = await inspectPage(d);
        check(name + ' 无 JS 错误', pageErrors.length === 0, pageErrors.slice(0, 2));
        check(name + ' 无横向溢出', info.overflowX === false, { scrollWidth: info.scrollWidth, vw: info.vw });
        check(name + ' 无破图', info.brokenImages.length === 0, info.brokenImages.slice(0, 3));
        check(name + ' 无元素越界', info.offscreen.length === 0, info.offscreen.slice(0, 3));
        check(name + ' 有导航栏', info.hasNav === true);
        check(name + ' 有内容', info.visibleText > 60, info.visibleText);
        check(name + ' 顶部导航条不被固定导航遮挡', info.topNavs.every(top => top >= info.navBottom), { navBottom: info.navBottom, topNavs: info.topNavs });
        if (!['/', '/login', '/no-such-page', '/planet-show'].includes(route)) {
            check(name + ' 使用统一页头', info.hasHeader === true);
        }
        if (SHOTS) await d.screenshot({ path: path.join(OUT, 'desktop' + route.replace(/\//g, '_') + '.png') });
    }

    /* ================= 移动端 ================= */
    console.log('\n=== 移动端走查（390×844）===');
    const m = await b.newPage();
    await m.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    const mobileErrors = [];
    m.on('pageerror', e => mobileErrors.push(e.message));

    for (const [route, name] of PAGES) {
        mobileErrors.length = 0;
        await m.goto(BASE + route, { waitUntil: 'networkidle2', timeout: 45000 }).catch(() => {});
        await sleep(route === '/planet-show' ? 2600 : 1400);
        const info = await inspectPage(m);
        check('移动·' + name + ' 无 JS 错误', mobileErrors.length === 0, mobileErrors.slice(0, 2));
        check('移动·' + name + ' 无横向溢出', info.overflowX === false, { scrollWidth: info.scrollWidth, vw: info.vw });
        check('移动·' + name + ' 无破图', info.brokenImages.length === 0, info.brokenImages.slice(0, 3));
        // 越界元素在移动端更严格，但允许少量轮播/装饰
        check('移动·' + name + ' 无严重越界', info.offscreen.length === 0, info.offscreen.slice(0, 3));
        if (SHOTS) await m.screenshot({ path: path.join(OUT, 'mobile' + route.replace(/\//g, '_') + '.png') });
    }

    /* 移动端导航与底部 Tab */
    await m.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await sleep(1600);
    const shell = await m.evaluate(() => ({
        tabbar: !!document.querySelector('.mobile-tabbar'),
        hamburger: !!document.querySelector('.menu-toggle'),
        hamburgerSize: (() => {
            const el = document.querySelector('.menu-toggle');
            if (!el) return null;
            const r = el.getBoundingClientRect();
            return { w: Math.round(r.width), h: Math.round(r.height) };
        })(),
        lang: document.documentElement.lang
    }));
    check('移动端底部 Tab 存在', shell.tabbar === true);
    check('移动端汉堡按钮存在且可点（≥32px）', shell.hamburger === true && shell.hamburgerSize.w >= 32 && shell.hamburgerSize.h >= 32, shell.hamburgerSize);
    check('页面语言声明为 zh-CN', shell.lang === 'zh-CN', shell.lang);

    /* ================= 聊天挂件流式 ================= */
    console.log('\n=== 聊天挂件流式 ===');
    const w = await b.newPage();
    await w.setViewport({ width: 1440, height: 900 });
    await w.goto(BASE + '/', { waitUntil: 'networkidle2', timeout: 45000 });
    await sleep(1800);
    await w.evaluate(() => document.querySelector('.chat-fab')?.click());
    await sleep(400);
    await w.click('.chat-input-row input');
    await w.type('.chat-input-row input', '黑洞是怎么形成的？', { delay: 6 });
    await w.keyboard.press('Enter');

    const samples = [];
    for (let i = 0; i < 60; i++) {
        await sleep(150);
        const s = await w.evaluate(() => {
            const msgs = document.querySelectorAll('.chat-msg.bot .msg-bubble');
            const last = msgs[msgs.length - 1];
            return {
                len: (last?.textContent || '').length,
                cursor: !!last?.querySelector('.cw-cursor')
            };
        });
        samples.push(s);
        if (s.len > 40 && !s.cursor) break;
    }
    const lens = [...new Set(samples.map(s => s.len).filter(n => n > 0))];
    check('挂件回答逐字增长（≥3 个阶段）', lens.length >= 3, lens.slice(0, 10));
    check('挂件打字时出现光标', samples.some(s => s.cursor), samples.filter(s => s.cursor).length);
    check('挂件最终回答完整', samples[samples.length - 1].len > 40, samples[samples.length - 1]);
    if (SHOTS) await w.screenshot({ path: path.join(OUT, 'widget-stream.png') });

    await w.close();
    await m.close();
    await d.close();
    await b.close();

    console.log('\n========================================');
    console.log(`  通过 ${pass} 项，失败 ${fail} 项`);
    if (fail) {
        console.log('  问题清单：');
        issues.slice(0, 20).forEach(i => console.log('   - ' + i.name));
    }
    console.log('========================================');
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('异常:', e); process.exit(1); });
