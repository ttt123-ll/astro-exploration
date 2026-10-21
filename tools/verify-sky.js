// 验证「当季天象台」新模块：月相/观星指南、天象日历、四象二十八宿、认星口诀
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
    p.on('console', m => { if (m.type() === 'error') errs.push('[console] ' + m.text().slice(0, 120)); });

    await p.goto(BASE + '/constellations', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await sleep(2200);

    // ===== ① 今晚观星指南 + 月相 =====
    console.log('=== ① 今晚观星指南 / 月相 ===');
    const guide = await p.evaluate(() => {
        const g = document.querySelector('.obs-guide');
        if (!g) return null;
        const stats = Array.from(g.querySelectorAll('.og-stat')).map(s => ({
            k: s.querySelector('.k')?.textContent.trim(),
            v: s.querySelector('.v')?.textContent.trim()
        }));
        const path = g.querySelector('.og-moon-lit')?.getAttribute('d') || '';
        return {
            hasGuide: true,
            moonName: g.querySelector('.og-moon-meta strong')?.textContent.trim(),
            moonEn: g.querySelector('.og-moon-meta span')?.textContent.trim(),
            path,
            stats,
            verdict: g.querySelector('.og-verdict strong')?.textContent.trim(),
            score: g.querySelector('.og-verdict span')?.textContent.trim(),
            window: g.querySelector('.og-window strong')?.textContent.trim(),
            sunInfo: g.querySelector('.og-window span')?.textContent.trim(),
            positions: Array.from(g.querySelectorAll('.og-pos-item')).map(i => ({
                name: i.querySelector('.og-name')?.textContent.trim(),
                val: i.querySelector('.og-pos-val')?.textContent.trim(),
                visible: !i.classList.contains('dim')
            })),
            tip: g.querySelector('.og-tip')?.textContent.trim() || ''
        };
    });
    check('观星指南卡片存在', !!guide, guide);
    if (guide) {
        check('显示月相名称', !!guide.moonName && guide.moonName.length >= 2, guide.moonName);
        check('月相有英文名', !!guide.moonEn, guide.moonEn);
        check('月相 SVG 路径有效', /^M 50 5/.test(guide.path), guide.path.slice(0, 40));
        check('三项月相数据（照亮/月龄/满月）', guide.stats.length === 3, guide.stats);
        check('照亮百分比为数字', /%$/.test(guide.stats[0]?.v || ''), guide.stats[0]);
        check('给出观星结论', !!guide.verdict, guide.verdict);
        check('给出观星指数', /\/ 100/.test(guide.score || ''), guide.score);
        check('给出最佳观测窗口', /—/.test(guide.window || ''), guide.window);
        check('给日落/暮光时刻', /日落/.test(guide.sunInfo || ''), guide.sunInfo);
        check('当季星座位置（≥2 个）', guide.positions.length >= 2, guide.positions.length);
        check('位置含方位与高度', guide.positions.every(x => /[东南西北]/.test(x.val) || x.val === '—'), guide.positions);
        check('有季节观测提示', guide.tip.length > 5, guide.tip);
    }

    // ===== ② 当季天象日历 =====
    console.log('\n=== ② 当季天象日历 ===');
    const cal = await p.evaluate(() => {
        const sec = document.querySelector('.sky-calendar');
        if (!sec) return null;
        return {
            title: sec.querySelector('.section-title')?.textContent.trim(),
            showers: Array.from(sec.querySelectorAll('.shower-item')).map(s => ({
                name: s.querySelector('.shower-head strong')?.textContent.trim(),
                zhr: s.querySelector('.shower-zhr')?.textContent.trim(),
                peak: s.querySelector('.shower-meta span')?.textContent.trim()
            })),
            deepTargets: Array.from(sec.querySelectorAll('.deep-item')).map(d => ({
                name: d.querySelector('.deep-body strong')?.textContent.trim(),
                img: d.querySelector('img')?.getAttribute('src') || '',
                href: d.getAttribute('href') || ''
            })),
            tip: sec.querySelector('.cal-tip')?.textContent.trim() || ''
        };
    });
    check('天象日历模块存在', !!cal, cal);
    if (cal) {
        check('标题含当季', /天象日历/.test(cal.title || ''), cal.title);
        check('当季流星雨已渲染', cal.showers.length >= 1, cal.showers);
        check('流星雨含 ZHR 与峰值', cal.showers.every(s => /ZHR/.test(s.zhr || '') && /月/.test(s.peak || '')), cal.showers.slice(0, 2));
        check('当季深空目标已渲染', cal.deepTargets.length >= 1, cal.deepTargets.length);
        check('深空目标有图与链接', cal.deepTargets.every(d => d.img && /\/detail\/object\//.test(d.href)), cal.deepTargets);
        check('有观测建议条', /观测建议/.test(cal.tip || ''), cal.tip);
    }

    // 切换季节后日历内容应变化
    const beforeNames = await p.evaluate(() => Array.from(document.querySelectorAll('.shower-head strong')).map(x => x.textContent.trim()).join('|'));
    await p.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('.season-tab')).find(x => /夏季/.test(x.textContent));
        if (btn) btn.click();
    });
    await sleep(900);
    const afterNames = await p.evaluate(() => Array.from(document.querySelectorAll('.shower-head strong')).map(x => x.textContent.trim()).join('|'));
    check('切换季节后流星雨联动变化', beforeNames !== afterNames, { beforeNames, afterNames });

    // ===== ③ 四象二十八宿 =====
    console.log('\n=== ③ 三垣四象二十八宿 ===');
    const sym = await p.evaluate(() => {
        const sec = document.querySelector('.four-symbols');
        if (!sec) return null;
        return {
            tabs: Array.from(sec.querySelectorAll('.symbol-tab')).map(t => t.textContent.replace(/\s+/g, ' ').trim()),
            activeIdx: Array.from(sec.querySelectorAll('.symbol-tab')).findIndex(t => t.classList.contains('active')),
            title: sec.querySelector('.symbol-intro h3')?.textContent.trim(),
            desc: sec.querySelector('.symbol-intro p')?.textContent.trim().slice(0, 30),
            mansions: Array.from(sec.querySelectorAll('.mansion-card')).map(m => ({
                name: m.querySelector('h4')?.textContent.trim(),
                star: m.querySelector('.mansion-star')?.textContent.trim(),
                meaning: m.querySelector('.mansion-meaning')?.textContent.trim()
            })),
            note: sec.querySelector('.ew-note')?.textContent.trim(),
            has88: !!sec.querySelector('.iau-toggle')
        };
    });
    check('四象模块存在', !!sym, sym);
    if (sym) {
        check('四个象切换按钮', sym.tabs.length === 4, sym.tabs);
        check('四象含青龙/朱雀/白虎/玄武', ['青龙', '朱雀', '白虎', '玄武'].every(k => sym.tabs.join('').includes(k)), sym.tabs);
        check('当前象有 7 宿', sym.mansions.length === 7, sym.mansions.length);
        check('每宿有星官对应与寓意', sym.mansions.every(m => m.star && m.meaning), sym.mansions.slice(0, 2));
        check('有中西对照说明', /参宿|昴宿|心宿/.test(sym.note || ''), sym.note);
        check('有 88 星座展开入口', sym.has88);
    }

    // 切换象
    const firstTitle = await p.evaluate(() => document.querySelector('.symbol-intro h3')?.textContent.trim());
    await p.evaluate(() => document.querySelectorAll('.symbol-tab')[2]?.click());
    await sleep(700);
    const secondTitle = await p.evaluate(() => document.querySelector('.symbol-intro h3')?.textContent.trim());
    check('切换四象后内容变化', firstTitle !== secondTitle, { firstTitle, secondTitle });

    // 88 星座展开
    await p.evaluate(() => document.querySelector('.iau-toggle')?.click());
    await sleep(600);
    const iau = await p.evaluate(() => ({
        visible: (() => { const el = document.querySelector('.iau-body'); return el ? getComputedStyle(el).display !== 'none' : false; })(),
        count: document.querySelectorAll('.iau-item').length,
        chips: Array.from(document.querySelectorAll('.iau-chip')).map(c => c.textContent.trim())
    }));
    check('88 星座全表可展开', iau.visible, iau.visible);
    check('88 星座数量 = 88', iau.count === 88, iau.count);
    check('有天区筛选（全部/北/南/黄道）', iau.chips.length === 4, iau.chips);

    // ===== ④ 认星口诀 =====
    console.log('\n=== ④ 认星口诀 ===');
    const mn = await p.evaluate(() => Array.from(document.querySelectorAll('.mn-card')).map(c => ({
        title: c.querySelector('.mn-head h4')?.textContent.trim(),
        steps: c.querySelectorAll('.mn-steps li').length,
        tip: c.querySelector('.mn-tip')?.textContent.trim().slice(0, 20)
    })));
    check('认星口诀卡片（4 个）', mn.length === 4, mn.length);
    check('含找北极星/夏季大三角/冬季六边形/秋季四边形',
        ['北极星', '夏季大三角', '冬季六边形', '秋季四边形'].every(k => mn.map(x => x.title).join('').includes(k)),
        mn.map(x => x.title));
    check('每张有多步指引', mn.every(x => x.steps >= 3), mn.map(x => x.steps));
    check('每张有口诀提示', mn.every(x => x.tip && x.tip.length > 3), mn.map(x => x.tip));

    await p.screenshot({ path: 'F:/天文科普/shots/sky-guide.png', fullPage: false });
    await p.evaluate(() => document.querySelector('.sky-calendar')?.scrollIntoView({ block: 'start' }));
    await sleep(700);
    await p.screenshot({ path: 'F:/天文科普/shots/sky-calendar.png' });
    await p.evaluate(() => document.querySelector('.four-symbols')?.scrollIntoView({ block: 'start' }));
    await sleep(700);
    await p.screenshot({ path: 'F:/天文科普/shots/sky-symbols.png' });

    check('无 JS 错误', errs.length === 0, errs.slice(0, 3));

    await b.close();
    console.log('\n========================================');
    console.log(`  通过 ${pass} 项，失败 ${fail} 项`);
    console.log('========================================');
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('异常:', e); process.exit(1); });
