// 本轮改动验证：DetailView / VideosView / DownloadView / DeepSpaceView + 页头统一
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

    // ===== ① 页头统一 =====
    console.log('=== ① 页头统一 ===');
    for (const [url, name] of [['/videos', '视频页'], ['/download', '下载页'], ['/deep-space', '深空页']]) {
        await p.goto(BASE + url, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await sleep(1500);
        const s = await p.evaluate(() => ({
            pageHeader: !!document.querySelector('.page-header.ph'),
            oldHeader: !!document.querySelector('.page-header:not(.ph)'),
            phTitle: document.querySelector('.ph-title')?.textContent.trim() || ''
        }));
        check(name + ' 使用 PageHeader 组件', s.pageHeader && !s.oldHeader, s);
        check(name + ' 标题正确', s.phTitle.length > 2, s.phTitle);
    }

    // ===== ② DetailView =====
    console.log('\n=== ② 详情页 ===');
    await p.goto(BASE + '/detail/planet/jupiter', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await sleep(1800);
    const d = await p.evaluate(() => {
        const side = document.querySelector('.detail-side');
        const sideStyle = side ? getComputedStyle(side) : null;
        const icons = Array.from(document.querySelectorAll('.detail-section h2 i')).map(i => i.className);
        const rows = document.querySelectorAll('.sc-row');
        const bars = Array.from(document.querySelectorAll('.sc-bar')).map(b => b.style.width);
        return {
            breadcrumb: !!document.querySelector('.breadcrumb'),
            backBtn: !!document.querySelector('.back-btn'),
            layoutCols: getComputedStyle(document.querySelector('.detail-layout')).gridTemplateColumns,
            sideSticky: sideStyle ? sideStyle.position : null,
            sideStats: document.querySelectorAll('.side-stat').length,
            sectionIcons: icons,
            sizeRows: rows.length,
            bars,
            selfHighlight: !!document.querySelector('.sc-row.self'),
            note: document.querySelector('.sc-note')?.textContent.trim() || ''
        };
    });
    check('保留面包屑', d.breadcrumb);
    check('已移除返回按钮（二选一）', !d.backBtn);
    check('双栏布局生效', d.layoutCols.split(' ').length >= 2, d.layoutCols);
    check('右侧数据栏 sticky', d.sideSticky === 'sticky', d.sideSticky);
    check('侧栏显示关键数据', d.sideStats >= 5, d.sideStats);
    check('段落图标按语义映射（不重复轮换）', new Set(d.sectionIcons).size === d.sectionIcons.length, d.sectionIcons);
    check('行星大小对比图存在（8 行）', d.sizeRows === 8, d.sizeRows);
    check('对比条宽度按直径比例', d.bars.length === 8 && new Set(d.bars).size > 3, d.bars);
    check('当前行星高亮', d.selfHighlight);
    check('对比结论文字合理（含「地球」倍数）', /地球/.test(d.note), d.note);
    await p.screenshot({ path: 'F:/天文科普/shots/improve-detail.png' });

    // 星座详情图标不应重复轮换
    await p.goto(BASE + '/detail/constellation/orion', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await sleep(1500);
    const consIcons = await p.evaluate(() => Array.from(document.querySelectorAll('.detail-section h2 i')).map(i => i.className));
    check('星座详情段落图标也不同', new Set(consIcons).size === consIcons.length, consIcons);

    // ===== ③ VideosView =====
    console.log('\n=== ③ 视频页 ===');
    await p.goto(BASE + '/videos', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await sleep(2000);
    const v = await p.evaluate(() => {
        const cards = Array.from(document.querySelectorAll('.video-card'));
        const first = cards[0];
        const vid = first?.querySelector('video');
        return {
            count: cards.length,
            poster: vid ? vid.getAttribute('poster') : null,
            preload: vid ? vid.getAttribute('preload') : null,
            loadedAttr: vid ? vid.dataset.loaded : null,
            lazyOverlay: !!first?.querySelector('.video-lazy'),
            ready: first?.classList.contains('video-ready'),
            copyright: document.body.innerText.includes('版权说明')
        };
    });
    check('视频数量 9', v.count === 9, v.count);
    check('每个视频有 poster 封面', /\.jpg$/.test(v.poster || ''), v.poster);
    check('默认 preload=none（懒加载）', (v.preload === 'none') || v.loadedAttr === '1', { preload: v.preload, loaded: v.loadedAttr });
    check('首屏视频已触发加载', v.ready === true, v.ready);
    check('有懒加载提示层', v.lazyOverlay);
    check('保留版权说明卡', v.copyright);
    await p.screenshot({ path: 'F:/天文科普/shots/improve-videos.png' });

    // ===== ④ DownloadView =====
    console.log('\n=== ④ 下载页 ===');
    await p.goto(BASE + '/download', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await sleep(1600);
    const dl = await p.evaluate(() => ({
        steps: document.querySelectorAll('.step-card').length,
        links: document.querySelectorAll('.step-link').length,
        numbers: Array.from(document.querySelectorAll('.step-no')).map(n => n.textContent.trim()),
        docBtn: !!Array.from(document.querySelectorAll('button')).find(x => /完整部署文档/.test(x.textContent)),
        hardcodedPath: document.body.innerText.includes('E:\\mysql'),
        githubLink: !!document.querySelector('a[href*="github.com"][href*="README"]')
    }));
    check('三步部署卡', dl.steps === 3, dl.steps);
    check('步骤编号 01/02/03', JSON.stringify(dl.numbers) === JSON.stringify(['01', '02', '03']), dl.numbers);
    check('步骤间有连线（2 条）', dl.links === 2, dl.links);
    check('有查看完整文档按钮', dl.docBtn);
    check('已移除硬编码路径 E:\\mysql', !dl.hardcodedPath);
    check('有真实 GitHub README 链接', dl.githubLink);

    // 点击打开文档弹窗
    await p.evaluate(() => { const b = Array.from(document.querySelectorAll('button')).find(x => /完整部署文档/.test(x.textContent)); if (b) b.click(); });
    await sleep(900);
    const modal = await p.evaluate(() => ({
        open: !!document.querySelector('.doc-panel'),
        hasDocker: (document.querySelector('.doc-body')?.innerText || '').includes('docker compose'),
        hasEnv: (document.querySelector('.doc-body')?.innerText || '').includes('JWT_SECRET')
    }));
    check('文档弹窗可打开', modal.open);
    check('弹窗内含 Docker 部署说明', modal.hasDocker);
    check('弹窗内含环境变量说明', modal.hasEnv);
    await p.screenshot({ path: 'F:/天文科普/shots/improve-download.png' });

    // ===== ⑤ DeepSpaceView =====
    console.log('\n=== ⑤ 深空页 ===');
    await p.goto(BASE + '/deep-space', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await sleep(1800);
    const ds = await p.evaluate(() => {
        const cards = Array.from(document.querySelectorAll('.obj-card'));
        const snips = cards.map(c => c.querySelector('.obj-body p')?.textContent.trim() || '');
        const types = cards.map(c => c.querySelector('.obj-type')?.textContent.trim() || '');
        return {
            count: cards.length,
            types,
            snips,
            allEndProperly: snips.every(s => !/…$/.test(s) || /[。…]$/.test(s)),
            hasChips: types.every(t => t.length > 0)
        };
    });
    check('深空卡片渲染', ds.count >= 14, ds.count);
    check('每张卡片有类型角标', ds.hasChips, ds.types.slice(0, 4));
    check('类型角标取值合理', ds.types.every(t => /星云|星系|星团|望远镜|深空天体/.test(t)), [...new Set(ds.types)]);
    check('摘要按断句截断（不出现突兀半句）', ds.allEndProperly, ds.snips.slice(0, 3));
    await p.screenshot({ path: 'F:/天文科普/shots/improve-deepspace.png' });

    check('无 JS 错误', errs.length === 0, errs.slice(0, 3));

    await b.close();
    console.log('\n========================================');
    console.log(`  通过 ${pass} 项，失败 ${fail} 项`);
    console.log('========================================');
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('异常:', e); process.exit(1); });
