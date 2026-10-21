// 移动端验证：手机/平板视口下的横向溢出、导航展开、关键页面可用性
const puppeteer = require('F:/天文科普/tools/node_modules/puppeteer-core');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE = process.env.BASE || 'http://127.0.0.1:3000';
const sleep = ms => new Promise(r => setTimeout(r, ms));

let pass = 0, fail = 0;
const check = (n, c, e) => {
    if (c) { pass++; console.log('  [OK] ' + n); }
    else { fail++; console.log('  [FAIL] ' + n + (e !== undefined ? '  -> ' + JSON.stringify(e).slice(0, 260) : '')); }
};

const ROUTES = [
    ['/', '首页'],
    ['/solar-system', '太阳系'],
    ['/encyclopedia', '天文百科'],
    ['/constellations', '四季星座'],
    ['/gallery', '星空图集'],
    ['/timeline', '宇宙时间线'],
    ['/neo', '近地天体'],
    ['/news', '宇宙新闻'],
    ['/community', '互动社区'],
    ['/assistant', 'AI 助手'],
    ['/videos', '科普视频'],
    ['/download', '系统部署'],
    ['/deep-space', '深空天体'],
    ['/credits', '素材来源'],
    ['/explore', '探索工具'],
    ['/detail/planet/jupiter', '详情页'],
    ['/planet-show', '3D 星球投影']
];

const DEVICES = [
    { name: 'iPhone 12', width: 390, height: 844, mobile: true },
    { name: '小屏 Android', width: 360, height: 780, mobile: true },
    { name: 'iPad', width: 768, height: 1024, mobile: true }
];

(async () => {
    const b = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox'] });

    for (const d of DEVICES) {
        console.log(`\n===== ${d.name}（${d.width}×${d.height}）=====`);
        const p = await b.newPage();
        await p.setViewport({ width: d.width, height: d.height, isMobile: d.mobile, hasTouch: d.mobile, deviceScaleFactor: 2 });
        const errs = [];
        p.on('pageerror', e => errs.push(e.message));

        // 1) 各页面横向溢出检查
        const overflow = [];
        for (const [route, name] of ROUTES) {
            await p.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 45000 });
            await sleep(route === '/constellations' || route === '/assistant' ? 1800 : 1100);
            const r = await p.evaluate(() => {
                const docW = document.documentElement.scrollWidth;
                // 移动端以 clientWidth 为准：innerWidth 会被内容撑宽，不能作为基准
                const winW = Math.min(window.innerWidth, document.documentElement.clientWidth);
                // 找出超出视口右边界最多的元素（用于定位）
                let worst = null;
                document.querySelectorAll('body *').forEach(el => {
                    const b = el.getBoundingClientRect();
                    if (b.width === 0 || b.height === 0) return;
                    const over = Math.round(b.right - winW);
                    if (over > 2 && (!worst || over > worst.over)) {
                        worst = {
                            over,
                            tag: el.tagName.toLowerCase(),
                            cls: String(el.className || '').split(' ').filter(Boolean).slice(0, 3).join('.')
                        };
                    }
                });
                return { docW, winW, worst };
            });
            const ok = r.docW <= r.winW + 2;
            if (!ok) overflow.push({ route, name, ...r });
            check(`${name}（${route}）无横向溢出`, ok, ok ? undefined : { docW: r.docW, winW: r.winW, worst: r.worst });
        }

        // 2) 导航菜单可展开
        await p.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 45000 });
        await sleep(1200);
        const nav = await p.evaluate(() => {
            const btn = document.querySelector('.menu-toggle');
            if (!btn) return { hasBtn: false, visible: false };
            const r = btn.getBoundingClientRect();
            const limit = document.documentElement.clientWidth;
            const cx = r.left + r.width / 2;
            const cy = r.top + r.height / 2;
            const hit = (cx >= 0 && cx <= limit && cy >= 0 && cy <= window.innerHeight)
                ? document.elementFromPoint(cx, cy) : null;
            return {
                hasBtn: true,
                visible: getComputedStyle(btn).display !== 'none',
                rect: { left: Math.round(r.left), right: Math.round(r.right), w: Math.round(r.width) },
                limit,
                inViewport: r.left >= 0 && r.right <= limit + 1,
                clickable: !!(hit && (hit === btn || btn.contains(hit)))
            };
        });
        check('移动端显示汉堡菜单', nav.hasBtn && nav.visible, nav);
        check('汉堡按钮在视口内', nav.inViewport, nav.rect);
        check('汉堡按钮可点击（未被遮挡）', nav.clickable, nav);
        if (nav.hasBtn) {
            try { await p.click('.menu-toggle'); }
            catch (e) { console.log('    （真实点击失败，改用 JS 点击继续验证）'); await p.evaluate(() => document.querySelector('.menu-toggle').click()); }
            await sleep(500);
            const opened = await p.evaluate(() => {
                const ul = document.querySelector('.nav-links');
                const st = ul ? getComputedStyle(ul) : null;
                const btn = document.querySelector('.menu-toggle');
                return {
                    expanded: btn?.getAttribute('aria-expanded'),
                    visible: st ? (st.display !== 'none' && st.visibility !== 'hidden' && st.opacity !== '0') : false,
                    links: document.querySelectorAll('.nav-links a').length
                };
            });
            check('菜单可展开且含导航项', opened.expanded === 'true' && opened.links >= 8, opened);
            // 关闭
            await p.click('.menu-toggle');
            await sleep(300);
        }

        // 3) 星座页新模块在移动端堆叠正常
        await p.goto(BASE + '/constellations', { waitUntil: 'domcontentloaded', timeout: 45000 });
        await sleep(2000);
        const cons = await p.evaluate(() => {
            const g = document.querySelector('.obs-guide');
            const cols = g ? getComputedStyle(g).gridTemplateColumns.split(' ').length : 0;
            const mansion = document.querySelector('.mansion-grid');
            const mCols = mansion ? getComputedStyle(mansion).gridTemplateColumns.split(' ').length : 0;
            const tabs = document.querySelectorAll('.symbol-tab').length;
            return { cols, mCols, tabs, obsVisible: !!g };
        });
        check('观星指南在移动端单列堆叠', cons.cols === 1, cons.cols);
        check('二十八宿网格自适应（≤2 列）', cons.mCols <= 2, cons.mCols);
        check('四象切换按钮可用', cons.tabs === 4, cons.tabs);

        // 4) AI 助手输入可用
        await p.goto(BASE + '/assistant', { waitUntil: 'domcontentloaded', timeout: 45000 });
        await sleep(1500);
        const ai = await p.evaluate(() => {
            const input = document.querySelector('.ai-input-row input');
            const send = document.querySelector('.ai-send');
            const panel = document.querySelector('.ai-panel');
            const rect = panel ? panel.getBoundingClientRect() : null;
            return {
                hasInput: !!input,
                inputWidth: input ? Math.round(input.getBoundingClientRect().width) : 0,
                hasSend: !!send,
                panelFits: rect ? rect.width <= window.innerWidth + 2 : false
            };
        });
        check('AI 输入框存在且宽度合理', ai.hasInput && ai.inputWidth > 120, ai);
        check('AI 发送按钮存在', ai.hasSend);
        check('AI 面板不超出视口', ai.panelFits, ai);

        // 5) 3D 页面画布铺满且不溢出（需先切到 3D 遨游模式）
        await p.goto(BASE + '/planet-show', { waitUntil: 'domcontentloaded', timeout: 45000 });
        await sleep(1800);
        await p.evaluate(() => {
            const btn = Array.from(document.querySelectorAll('button')).find(b => /遨游|3D/.test(b.textContent));
            if (btn) btn.click();
        });
        await sleep(3000);
        const canvas = await p.evaluate(() => {
            const c = document.querySelector('.flight canvas') || document.querySelector('canvas');
            if (!c) return { has: false };
            const r = c.getBoundingClientRect();
            return { has: true, w: Math.round(r.width), h: Math.round(r.height), winW: window.innerWidth };
        });
        check('3D 画布正常渲染尺寸', canvas.has && canvas.w > 100 && canvas.h > 100, canvas);
        check('3D 画布不超出视口', canvas.has && canvas.w <= canvas.winW + 2, canvas);

        check(`无 JS 错误（${d.name}）`, errs.length === 0, errs.slice(0, 3));

        if (d.name === 'iPhone 12') {
            await p.goto(BASE + '/constellations', { waitUntil: 'domcontentloaded', timeout: 45000 });
            await sleep(2000);
            await p.screenshot({ path: 'F:/天文科普/shots/mobile-constellations.png' });
            await p.goto(BASE + '/assistant', { waitUntil: 'domcontentloaded', timeout: 45000 });
            await sleep(1500);
            await p.screenshot({ path: 'F:/天文科普/shots/mobile-assistant.png' });
        }

        if (overflow.length) {
            console.log('  溢出明细：');
            overflow.slice(0, 5).forEach(o => console.log('    ' + o.route + ' doc=' + o.docW + ' win=' + o.winW + ' worst=' + JSON.stringify(o.worst)));
        }
        await p.close();
    }

    await b.close();
    console.log('\n========================================');
    console.log(`  通过 ${pass} 项，失败 ${fail} 项`);
    console.log('========================================');
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('异常:', e); process.exit(1); });
