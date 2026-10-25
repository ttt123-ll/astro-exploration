/**
 * AI Function Calling 工具层验证
 *  - 工具单元：月相（指定日期）/ 观星 / 装备 / 知识检索 / 页面导航
 *  - LLM 规划：模型返回 tool_calls → 服务端执行 → 回答中体现工具结果
 *  - 流式：meta.toolsUsed 携带调用记录
 *  - 前端：AI 页面回答下方显示工具徽标
 */
const puppeteer = require('F:/天文科普/tools/node_modules/puppeteer-core');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE = process.env.BASE || 'http://127.0.0.1:3001';
const sleep = ms => new Promise(r => setTimeout(r, ms));

let pass = 0, fail = 0;
const check = (n, c, e) => {
    if (c) { pass++; console.log('  [OK] ' + n); }
    else { fail++; console.log('  [FAIL] ' + n + (e !== undefined ? '  -> ' + JSON.stringify(e).slice(0, 240) : '')); }
};

async function ask(message, audience = 'amateur') {
    const r = await fetch(BASE + '/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, audience })
    });
    return r.json();
}
const toolNames = j => (j.toolsUsed || []).map(t => t.name);

(async () => {
    console.log('=== 工具单元（离线可用）===');
    const { executeTool, TOOL_DEFS, mightNeedTools } = require('../server/aiFunctions');
    check('工具定义包含 5 个函数', TOOL_DEFS.length >= 5, TOOL_DEFS.map(t => t.function.name));
    check('工具名覆盖核心能力',
        ['moon_phase', 'tonight_sky', 'gear_advice', 'search_knowledge', 'navigate_page']
            .every(n => TOOL_DEFS.some(t => t.function.name === n)),
        TOOL_DEFS.map(t => t.function.name));

    const moon = await executeTool('moon_phase', { date: '2027-03-20' });
    check('月相工具支持指定日期', moon.ok && /2027-03-20/.test(moon.summary), moon.summary);
    check('月相工具输出月龄/照亮比例', /月龄/.test(moon.summary) && /照亮/.test(moon.summary), moon.summary);

    const sky = await executeTool('tonight_sky', {});
    check('观星工具输出当季星空', sky.ok && /星座|观测/.test(sky.summary), (sky.summary || '').slice(0, 60));

    const gear = await executeTool('gear_advice', { budget: 600, purpose: '入门观星' });
    check('装备工具返回方案', gear.ok && /元|望远镜|双筒/.test(gear.summary), (gear.summary || '').slice(0, 60));

    const search = await executeTool('search_knowledge', { query: '参宿四' });
    check('知识检索工具命中站内资料', search.ok && search.payload.items.length > 0, search.payload && search.payload.items && search.payload.items.length);
    check('检索结果可溯源（带页面路径）', (search.payload.items[0] || {}).route && /^\//.test(search.payload.items[0].route), search.payload.items[0]);

    const nav = await executeTool('navigate_page', { page: 'detail-planet', planet: '木星' });
    check('导航工具生成跳转动作', nav.ok && nav.action && nav.action.route === '/detail/planet/jupiter', nav.action);
    check('意图判断能识别工具类问题', mightNeedTools('帮我算一下 2027-03-20 的月相') && !mightNeedTools('光年是什么单位'));

    console.log('\n=== LLM 规划调用（非流式）===');
    const m1 = await ask('帮我算一下 2027-03-20 的月相');
    check('月相问题触发 moon_phase', toolNames(m1).includes('moon_phase'), toolNames(m1));
    check('回答包含日期与月相结果', /2027[-年]0?3[-月]20/.test(m1.reply || '') && /月相|月龄|盈|亏/.test(m1.reply || ''), (m1.reply || '').slice(0, 80));

    const m2 = await ask('搜索站内关于参宿四的资料');
    check('检索问题触发 search_knowledge', toolNames(m2).includes('search_knowledge'), toolNames(m2));
    check('回答提到参宿四', /参宿四/.test(m2.reply || ''), (m2.reply || '').slice(0, 60));

    const m3 = await ask('今晚适合观星吗？');
    check('观星问题触发工具（月相/观星）',
        toolNames(m3).some(n => ['moon_phase', 'tonight_sky'].includes(n)), toolNames(m3));
    check('回答给出观星结论', /适合|不建议|月光|观测/.test(m3.reply || ''), (m3.reply || '').slice(0, 60));

    const m4 = await ask('带我去木星看看');
    check('导航问题触发 navigate_page', toolNames(m4).includes('navigate_page'), toolNames(m4));
    check('导航动作指向木星详情', m4.action && m4.action.type === 'navigate' && m4.action.route === '/detail/planet/jupiter', m4.action);

    const m5 = await ask('光年是什么单位？');
    check('普通知识问题不调用工具', toolNames(m5).length === 0, toolNames(m5));
    check('普通问题仍有正常回答', (m5.reply || '').length > 20, (m5.reply || '').slice(0, 40));

    /* 装备：规则引擎优先 → 结构化 gear 或工具调用 */
    const m6 = await ask('预算 600 元，新手想入门观星，买什么望远镜？');
    check('装备问题给出导购结果', /望远镜|双筒|预算|元/.test(m6.reply || ''), (m6.reply || '').slice(0, 60));

    console.log('\n=== 流式 SSE ===');
    const res = await fetch(BASE + '/api/chat/stream', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: '帮我算一下 2027-03-20 的月相', audience: 'amateur' })
    });
    check('流式接口可用', res.ok && (res.headers.get('content-type') || '').includes('event-stream'));
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = '';
    let meta = null;
    let text = '';
    let done = null;
    for (;;) {
        const { value, done: end } = await reader.read();
        if (end) break;
        buf += dec.decode(value, { stream: true });
        let idx;
        while ((idx = buf.indexOf('\n\n')) >= 0) {
            const raw = buf.slice(0, idx).trim();
            buf = buf.slice(idx + 2);
            if (!raw.startsWith('data:')) continue;
            let evt;
            try { evt = JSON.parse(raw.slice(5).trim()); } catch (e) { continue; }
            if (evt.type === 'meta') meta = evt;
            if (evt.type === 'delta') text += evt.text || '';
            if (evt.type === 'done') done = evt;
        }
    }
    check('流式 meta 携带 toolsUsed', meta && toolNames(meta).includes('moon_phase'), meta && toolNames(meta));
    check('流式 done 携带 toolsUsed', done && toolNames(done).includes('moon_phase'), done && toolNames(done));
    check('流式正文包含月相结果', /2027-03-20/.test(text) && /月相|月龄/.test(text), text.slice(0, 60));

    console.log('\n=== 前端工具徽标 ===');
    const b = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox'] });
    const p = await b.newPage();
    await p.setViewport({ width: 1440, height: 950 });
    const errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await p.goto(BASE + '/assistant', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await sleep(2200);
    await p.click('.ai-input-row input');
    await p.type('.ai-input-row input', '帮我算一下 2027-03-20 的月相', { delay: 5 });
    await p.keyboard.press('Enter');
    let ui = null;
    for (let i = 0; i < 100; i++) {
        await sleep(400);
        ui = await p.evaluate(() => {
            const bots = document.querySelectorAll('.ai-msg.bot');
            const last = bots[bots.length - 1];
            if (!last) return null;
            const bubble = last.querySelector('.ai-bubble');
            const done = bubble && !bubble.classList.contains('ai-typing') && !last.querySelector('.ai-cursor') && (bubble.textContent || '').length > 20;
            return {
                done,
                tools: Array.from(last.querySelectorAll('.ai-tool')).map(x => x.textContent.trim()),
                text: (bubble?.textContent || '').slice(0, 80)
            };
        });
        if (ui && ui.done) break;
    }
    check('AI 页面回答完成', ui && ui.done, ui);
    check('页面展示工具徽标（月相计算）', ui && ui.tools.some(t => /月相/.test(t)), ui && ui.tools);
    check('页面回答包含月相结果', ui && /2027-03-20|月相|月龄/.test(ui.text), ui && ui.text);
    check('页面无 JS 错误', errs.length === 0, errs.slice(0, 2));
    await b.close();

    console.log('\n========================================');
    console.log(`  通过 ${pass} 项，失败 ${fail} 项`);
    console.log('========================================');
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('异常:', e); process.exit(1); });
