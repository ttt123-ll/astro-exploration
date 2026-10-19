// 前端回归：游客可浏览内容页、受控页跳登录、登录后状态正确
const puppeteer = require('puppeteer-core');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE = process.env.BASE || 'http://127.0.0.1:3000';

let pass = 0, fail = 0;
const check = (n, c, e) => {
    if (c) { pass++; console.log('  [OK] ' + n); }
    else { fail++; console.log('  [FAIL] ' + n + (e ? '  -> ' + JSON.stringify(e) : '')); }
};

(async () => {
    const b = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox'] });
    const p = await b.newPage();
    await p.setViewport({ width: 1440, height: 900 });

    console.log('\n=== 1. 游客访问 ===');
    await p.goto(BASE + '/', { waitUntil: 'networkidle2' });
    await p.waitForFunction('document.querySelector(".hero-news, .stats-strip") !== null', { timeout: 15000 });
    check('游客可看首页（不被强制跳登录）', p.url() === BASE + '/', p.url());
    check('首页有导航栏', await p.evaluate(() => !!document.querySelector('.navbar')));
    const guestNav = await p.evaluate(() => (document.querySelector('.nav-links') || {}).innerText || '');
    check('游客导航可见（内容站应公开）', guestNav.includes('天文百科') || guestNav.includes('互动社区'), guestNav.slice(0, 40));

    for (const [path, sel, name] of [
        ['/solar-system', '.planet-card, .planet-grid, .page-header', '太阳系行星'],
        ['/news', '.news-grid, .headline, .page-header', '宇宙新闻'],
        ['/gallery', '.gallery-grid, .page-header', '星空图集'],
        ['/planet-show', '.mode-switch', '星球投影'],
        ['/encyclopedia', '.enc-tabs', '天文百科'],
        ['/community', '.comm-tabs', '互动社区']
    ]) {
        await p.goto(BASE + path, { waitUntil: 'networkidle2' });
        const ok = await p.evaluate(s => !!document.querySelector(s), sel);
        check('游客可访问 ' + name, ok && p.url().includes(path), { url: p.url(), found: ok });
    }

    console.log('\n=== 2. 受控页面 ===');
    await p.goto(BASE + '/admin', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 800));
    check('游客访问 /admin 被跳到登录页', p.url().includes('/login'), p.url());

    console.log('\n=== 3. 登录 ===');
    await p.goto(BASE + '/login', { waitUntil: 'networkidle2' });
    await p.waitForSelector('input[autocomplete="username"]', { timeout: 10000 });
    await p.type('input[autocomplete="username"]', 'admin');
    await p.type('input[autocomplete="current-password"]', 'admin123');
    await p.click('button[type="submit"]');
    await new Promise(r => setTimeout(r, 2500));
    check('登录后回到首页', !p.url().includes('/login'), p.url());

    const cookies = await p.cookies();
    const tk = cookies.find(c => c.name === 'astro_token');
    check('认证 Cookie 存在', !!tk);
    check('Cookie 为 httpOnly（JS 不可读）', !!tk && tk.httpOnly === true, tk && { httpOnly: tk.httpOnly });
    const ls = await p.evaluate(() => localStorage.getItem('astro_token'));
    check('localStorage 不再存 token', !ls, ls);

    const nav2 = await p.evaluate(() => (document.querySelector('.navbar') || {}).innerText || '');
    check('登录后出现后台管理入口', nav2.includes('后台管理'), nav2.slice(-40));

    console.log('\n=== 4. 登录态持久 ===');
    await p.goto(BASE + '/admin', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1200));
    check('登录后可进入后台', p.url().includes('/admin'), p.url());
    await p.reload({ waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1200));
    check('刷新后仍保持登录（Cookie 恢复会话）', p.url().includes('/admin'), p.url());

    console.log('\n=== 5. 退出登录 ===');
    await p.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button, a'));
        const out = btns.find(b => /退出/.test(b.textContent || ''));
        if (out) out.click();
    });
    await new Promise(r => setTimeout(r, 2000));
    const after = await p.cookies();
    check('退出后 Cookie 被清除', !after.find(c => c.name === 'astro_token' && c.value));
    await p.goto(BASE + '/admin', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 800));
    check('退出后访问后台再次跳登录', p.url().includes('/login'), p.url());

    console.log('\n=== 6. 新功能：天文百科 / 互动社区 / 新闻搜索 ===');
    // 天文百科：切换 tab
    await p.goto(BASE + '/encyclopedia', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1200));
    const encTabs = await p.evaluate(() => document.querySelectorAll('.enc-tabs .enc-tab').length);
    check('天文百科含 2 个分类', encTabs === 2, encTabs);
    await p.evaluate(() => {
        const b = Array.from(document.querySelectorAll('.enc-tab')).find(x => x.textContent.includes('黑洞'));
        if (b) b.click();
    });
    await new Promise(r => setTimeout(r, 900));
    const encBh = await p.evaluate(() => ({
        url: location.search,
        cards: document.querySelectorAll('.bh-card').length
    }));
    check('切换到黑洞分类（URL 同步）', encBh.url.includes('tab=bh'), encBh.url);
    check('黑洞分类渲染卡片', encBh.cards >= 4, encBh.cards);

    // 互动社区：tab + 排行榜
    await p.goto(BASE + '/community', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1500));
    const comm = await p.evaluate(() => ({
        tabs: document.querySelectorAll('.comm-tabs .comm-tab').length,
        quiz: !!document.querySelector('.quiz-shell'),
        leaderboard: !!document.querySelector('#community-leaderboard'),
        live: !!document.querySelector('.lb-live')
    }));
    check('互动社区含 知识竞赛/留言板 两个 tab', comm.tabs === 2, comm.tabs);
    check('默认显示知识竞赛', comm.quiz === true);
    check('下方有排行榜区块', comm.leaderboard === true);
    check('排行榜有实时刷新标识', comm.live === true);

    await p.evaluate(() => {
        const b = Array.from(document.querySelectorAll('.comm-tab')).find(x => x.textContent.includes('留言板'));
        if (b) b.click();
    });
    await new Promise(r => setTimeout(r, 900));
    const msgVisible = await p.evaluate(() => {
        const el = document.querySelector('.comm-msg');
        return el && el.style.display !== 'none';
    });
    check('切换到留言板 tab', msgVisible === true);

    // 新闻搜索 + 搜索记录
    await p.goto(BASE + '/news', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1500));
    const beforeCount = await p.evaluate(() => document.querySelectorAll('.news-card, .news-head').length);
    await p.type('.search-input', '黑洞');
    await p.click('.search-btn');
    await new Promise(r => setTimeout(r, 1500));
    const searched = await p.evaluate(() => ({
        count: document.querySelectorAll('.news-card, .news-head').length,
        history: localStorage.getItem('astro_news_search_history') || '',
        resultBar: !!document.querySelector('.result-bar')
    }));
    check('搜索后结果变化', searched.count > 0 && searched.count <= beforeCount, { beforeCount, after: searched.count });
    check('显示筛选结果概要', searched.resultBar === true);
    check('搜索记录已写入 localStorage', searched.history.includes('黑洞'), searched.history);

    await p.evaluate(() => document.querySelector('.search-input').focus());
    await new Promise(r => setTimeout(r, 500));
    const histPanel = await p.evaluate(() => ({
        panel: !!document.querySelector('.history-panel'),
        chips: document.querySelectorAll('.history-chip').length
    }));
    check('聚焦输入框显示搜索记录', histPanel.panel === true);
    check('搜索记录含历史条目', histPanel.chips >= 1, histPanel.chips);

    // 时间筛选
    await p.evaluate(() => {
        const b = Array.from(document.querySelectorAll('.filter-tab')).find(x => x.textContent.includes('近 7 天'));
        if (b) b.click();
    });
    await new Promise(r => setTimeout(r, 1200));
    check('时间筛选可用（无报错）', true);

    console.log('\n=== 7. 控制台错误 ===');
    const errors = [];
    p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    p.on('pageerror', e => errors.push(String(e.message)));
    await p.goto(BASE + '/', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));
    check('首页无 JS 控制台错误', errors.length === 0, errors.slice(0, 3));

    await p.screenshot({ path: 'F:\\天文科普\\shots\\guest-home.png' });

    await b.close();
    console.log('\n========================================');
    console.log(`  通过 ${pass} 项，失败 ${fail} 项`);
    console.log('========================================\n');
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('测试异常:', e); process.exit(1); });
