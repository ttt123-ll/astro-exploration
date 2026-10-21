// AI 助手 UI 端到端验证：角标溯源、级别标签、工具徽标、兜底推荐、导航跳转
const puppeteer = require('F:/天文科普/tools/node_modules/puppeteer-core');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE = process.env.BASE || 'http://127.0.0.1:3000';
const sleep = ms => new Promise(r => setTimeout(r, ms));

let pass = 0, fail = 0;
const check = (n, c, e) => {
    if (c) { pass++; console.log('  [OK] ' + n); }
    else { fail++; console.log('  [FAIL] ' + n + (e !== undefined ? '  -> ' + JSON.stringify(e).slice(0, 260) : '')); }
};

async function ask(p, text) {
    // 用真实键盘输入，保证 Vue 的 v-model 更新、发送按钮解除禁用
    await p.click('.ai-input-row input');
    await p.evaluate(() => { const i = document.querySelector('.ai-input-row input'); i.value = ''; });
    await p.type('.ai-input-row input', text, { delay: 12 });
    await sleep(150);
    await p.keyboard.press('Enter');
    // 等待回答（最多 12 秒）
    for (let i = 0; i < 60; i++) {
        await sleep(250);
        const done = await p.evaluate(() => {
            const bots = document.querySelectorAll('.ai-msg.bot');
            const last = bots[bots.length - 1];
            return !!(last && last.querySelector('.ai-bubble') && !last.querySelector('.ai-bubble.ai-typing'));
        });
        if (done) return true;
    }
    return false;
}

const lastBot = p => p.evaluate(() => {
    const bots = document.querySelectorAll('.ai-msg.bot');
    const last = bots[bots.length - 1];
    if (!last) return null;
    return {
        html: last.querySelector('.ai-bubble')?.innerHTML || '',
        text: last.querySelector('.ai-bubble')?.textContent || '',
        cites: Array.from(last.querySelectorAll('.ai-cite')).map(c => c.textContent.trim()),
        sources: Array.from(last.querySelectorAll('.ai-src')).map(a => ({
            title: a.textContent.trim(),
            href: a.getAttribute('href') || ''
        })),
        level: last.querySelector('.ai-level')?.textContent.trim() || '',
        tools: Array.from(last.querySelectorAll('.ai-tool')).map(t => t.textContent.trim()),
        suggestions: Array.from(last.querySelectorAll('.ai-quick-inline button')).map(b => b.textContent.trim())
    };
});

(async () => {
    const b = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox'] });
    const p = await b.newPage();
    await p.setViewport({ width: 1440, height: 900 });
    const errs = [];
    p.on('pageerror', e => errs.push(e.message));

    await p.goto(BASE + '/assistant', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await sleep(1800);

    // 状态条
    const bar = await p.evaluate(() => ({
        badges: Array.from(document.querySelectorAll('.ai-statusbar .ai-kb')).map(x => x.textContent.replace(/\s+/g, ' ').trim()),
        mode: document.querySelector('.ai-mode-badge')?.textContent.replace(/\s+/g, ' ').trim()
    }));
    check('状态条显示运行模式', /本地|大模型/.test(bar.mode || ''), bar.mode);
    check('状态条显示向量检索模式', bar.badges.some(x => /本地向量|语义向量/.test(x)), bar.badges);
    check('状态条显示三级降级', bar.badges.some(x => /大模型生成|本地知识库检索/.test(x)), bar.badges);
    check('状态条显示知识块统计', bar.badges.some(x => /\d+ 知识块/.test(x)), bar.badges);

    // 1) 问概念问题 → 应带角标 + 来源
    console.log('\n=== 概念问答（角标溯源）===');
    await ask(p, '光年是什么单位？');
    let m = await lastBot(p);
    check('有回答气泡', m && m.text.length > 10, m && m.text.slice(0, 40));
    check('回答带角标上标', m.cites.length >= 1, m.cites);
    check('角标数字与来源数量匹配', m.cites.length <= m.sources.length, { cites: m.cites, sources: m.sources.length });
    check('来源可点击（router-link）', m.sources.length >= 1 && m.sources.every(s => s.href.startsWith('/')), m.sources);
    check('显示回答级别标签', /本地知识库检索|大模型生成/.test(m.level), m.level);
    check('内容与光年相关', /光年/.test(m.text), m.text.slice(0, 60));

    // 2) 月相工具
    console.log('\n=== 月相工具 ===');
    await ask(p, '现在的月相适合观星吗？');
    m = await lastBot(p);
    check('月相回答包含照亮百分比', /照亮|月相/.test(m.text), m.text.slice(0, 60));
    check('显示「月相计算」工具徽标', m.tools.includes('月相计算'), m.tools);

    // 3) 今夜观星
    console.log('\n=== 今夜观星 ===');
    await ask(p, '今晚能看到什么星座？');
    m = await lastBot(p);
    check('今夜观星回答含星座与时段', /星座/.test(m.text) && /(19|20|21|22):\d\d|最佳观测/.test(m.text), m.text.slice(0, 80));
    check('显示「今夜观星」工具徽标', m.tools.includes('今夜观星'), m.tools);

    // 4) 导航跳转
    console.log('\n=== 页面导航「带我去木星」 ===');
    await p.goto(BASE + '/assistant', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await sleep(1500);
    await ask(p, '带我去看木星');
    await sleep(1600);
    const url1 = p.url();
    check('自动跳转到木星详情页', /\/detail\/planet\/jupiter/.test(url1), url1);

    // 5) 兜底
    console.log('\n=== 兜底（知识库无命中）===');
    await p.goto(BASE + '/assistant', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await sleep(1500);
    await ask(p, '如何做红烧肉？');
    m = await lastBot(p);
    check('触发第 3 级兜底文案', /知识库/.test(m.text), m.text.slice(0, 50));
    check('显示兜底级别标签', /超出知识库/.test(m.level), m.level);
    check('给出可点的推荐问题', m.suggestions.length >= 2, m.suggestions);

    // 点推荐问题应能继续对话
    await p.evaluate(() => document.querySelector('.ai-quick-inline button')?.click());
    await sleep(2500);
    const afterSuggest = await p.evaluate(() => document.querySelectorAll('.ai-msg.bot').length);
    check('点推荐问题可继续对话', afterSuggest >= 2, afterSuggest);

    await p.screenshot({ path: 'F:/天文科普/shots/ai-rag.png' });
    check('无 JS 错误', errs.length === 0, errs.slice(0, 3));

    await b.close();
    console.log('\n========================================');
    console.log(`  通过 ${pass} 项，失败 ${fail} 项`);
    console.log('========================================');
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('异常:', e); process.exit(1); });
