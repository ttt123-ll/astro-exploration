// 批次 2 验证：3D 小行星带 / 行星标签 / 点击飞掠信息面板 / NEO 观察页
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
    // ===== NEO 接口 =====
    console.log('=== NEO 接口 ===');
    const neo = await fetch(BASE + '/api/neo').then(r => r.json());
    check('接口返回 ok', neo.ok === true);
    check('数据来源字段存在', ['nasa', 'local'].includes(neo.source), neo.source);
    check('有目标列表', Array.isArray(neo.objects) && neo.objects.length >= 5, neo.objects && neo.objects.length);
    const first = neo.objects && neo.objects[0];
    check('目标含关键字段', !!(first && first.name && first.diameter && first.velocity && first.miss), first);

    // ===== 页面 =====
    const b = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox'] });
    const p = await b.newPage();
    await p.setViewport({ width: 1440, height: 900 });
    const errs = [];
    p.on('pageerror', e => errs.push(e.message));

    console.log('\n=== NEO 观察页 ===');
    await p.goto(BASE + '/neo', { waitUntil: 'networkidle2' });
    await sleep(2200);
    const page = await p.evaluate(() => {
        const hero = document.querySelector('.neo-hero');
        const cells = document.querySelectorAll('.nc-cell b');
        return {
            title: document.querySelector('.ph-title')?.textContent.trim(),
            hasHero: !!hero,
            name: document.querySelector('.neo-name')?.textContent.trim(),
            countdown: Array.from(cells).map(c => c.textContent.trim()),
            cards: document.querySelectorAll('.neo-card').length,
            hazardFlags: document.querySelectorAll('.neo-flag').length,
            source: document.querySelector('.neo-source b')?.textContent.trim(),
            hasBook: !!document.querySelector('.book-section')
        };
    });
    check('页面标题正确', page.title === '近地天体观察站', page.title);
    check('有倒计时主卡', page.hasHero && !!page.name, page);
    check('倒计时为 4 段（天时分秒）', page.countdown.length === 4, page.countdown);
    check('倒计时数值为数字', page.countdown.every(v => /^\d+$/.test(v)), page.countdown);
    check('目标卡片已渲染', page.cards >= 5, page.cards);
    check('PHA 威胁标记存在', page.hazardFlags >= 1, page.hazardFlags);
    check('显示数据来源', !!page.source, page.source);
    check('页面含主题书单', page.hasBook);

    // 倒计时会走动
    const t1 = await p.evaluate(() => document.querySelectorAll('.nc-cell b')[3]?.textContent.trim());
    await sleep(2200);
    const t2 = await p.evaluate(() => document.querySelectorAll('.nc-cell b')[3]?.textContent.trim());
    check('倒计时秒数在走动', t1 !== t2, { t1, t2 });

    await p.screenshot({ path: 'F:/天文科普/shots/batch2-neo.png' });

    // ===== 3D 飞掠 =====
    console.log('\n=== 3D 小行星带 / 标签 / 点击飞掠 ===');
    await p.goto(BASE + '/planet-show', { waitUntil: 'networkidle2' });
    await sleep(3000);
    // 切到 3D 遨游模式
    const switched = await p.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => /遨游|3D/.test(b.textContent));
        if (btn) { btn.click(); return true; }
        return false;
    });
    check('进入 3D 遨游模式', switched);
    await sleep(4500);

    const scene = await p.evaluate(() => ({
        canvas: !!document.querySelector('.flight canvas'),
        loading: !!document.querySelector('.flight-loading'),
        labelCount: document.querySelectorAll('.planet-label').length,
        labelTexts: Array.from(document.querySelectorAll('.planet-label')).slice(0, 4).map(x => x.textContent.trim()),
        hasPanel: !!document.querySelector('.body-panel')
    }));
    check('3D 画布已渲染', scene.canvas, scene);
    check('行星标签已显示', scene.labelCount >= 1, scene.labelTexts);
    check('标签包含行星名', scene.labelTexts.some(t => /地球|火星|木星|土星|金星|水星|天王|海王/.test(t)), scene.labelTexts);
    check('初始无信息面板', !scene.hasPanel);

    // 点击标签 → 飞掠 + 面板
    await p.evaluate(() => document.querySelector('.planet-label')?.click());
    await sleep(1200);
    const panel = await p.evaluate(() => {
        const el = document.querySelector('.body-panel');
        if (!el) return null;
        return {
            name: el.querySelector('.bp-name')?.textContent.trim(),
            desc: el.querySelector('.bp-desc')?.textContent.trim(),
            stats: el.querySelectorAll('.bp-stat').length,
            actions: el.querySelectorAll('.bp-actions a, .bp-actions button').length,
            color: el.style.getPropertyValue('--body-color')
        };
    });
    check('点击后弹出信息面板', !!panel, panel);
    if (panel) {
        check('面板显示天体名', !!panel.name, panel.name);
        check('面板显示描述', panel.desc && panel.desc.length > 5, panel.desc);
        check('面板有 2 项数据', panel.stats === 2, panel.stats);
        check('面板有 2 个操作按钮', panel.actions === 2, panel.actions);
    }
    await sleep(1600);
    await p.screenshot({ path: 'F:/天文科普/shots/batch2-flyby.png' });

    // 关闭面板
    await p.evaluate(() => document.querySelector('.bp-close')?.click());
    await sleep(900);
    check('面板可关闭', await p.evaluate(() => !document.querySelector('.body-panel')));

    check('无 JS 错误', errs.length === 0, errs.slice(0, 3));

    await b.close();
    console.log('\n========================================');
    console.log(`  通过 ${pass} 项，失败 ${fail} 项`);
    console.log('========================================');
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('异常:', e); process.exit(1); });
