// 测试 RAG 问答：三级降级 + 工具调用 + 混合检索 + 角标溯源
const BASE = process.env.BASE || 'http://127.0.0.1:3000';

/* LLM 可用时（配置了 AI_API_KEY）级别为 1；离线时降级到 2/3 */
let LLM = false;
function questions() {
    const sc = LLM ? 1 : 2;   // 知识库类问题的期望级别
    return [
        { q: '今晚能看到什么星座？', expect: { tools: ['tonight-sky', 'moon-phase'], hasText: ['星座', '月相'], level: sc } },
        { q: '现在的月相适合观星吗？', expect: { tools: ['moon-phase'], hasText: ['月相', '照亮'], level: sc } },
        { q: '带我去看木星', expect: { action: '/detail/planet/jupiter', tools: ['navigate'] } },
        { q: '黑洞是怎么形成的？', expect: { hasText: ['黑洞'], minSources: 1, level: sc } },
        { q: '猎户座有什么著名的星云？', expect: { hasText: ['猎户'], minSources: 1 } },
        { q: '光年是什么单位？', expect: { minSources: 1 } },
        LLM
            ? { q: '如何做红烧肉？', expect: { level: 1, hasText: ['天文'] } }
            : { q: '如何做红烧肉？', expect: { level: 3, noSources: true, hasText: ['知识库'] } }
    ];
}

(async () => {
    let pass = 0, fail = 0;
    const check = (n, c, e) => {
        if (c) { pass++; console.log('  [OK] ' + n); }
        else { fail++; console.log('  [FAIL] ' + n + (e !== undefined ? '  -> ' + JSON.stringify(e).slice(0, 300) : '')); }
    };

    console.log('=== 模式接口 ===');
    const mode = await (await fetch(BASE + '/api/chat/mode')).json();
    check('返回三级降级说明', Array.isArray(mode.levels) && mode.levels.length === 3, mode.levels);
    check('向量模式为 local（离线）', mode.vector === 'local', mode.vector);
    check('知识库已建库（>100 块）', mode.kb.chunks > 100, mode.kb);
    LLM = !!(mode.levels && mode.levels[0] && mode.levels[0].available);
    check('当前可用级别与配置一致（LLM=' + LLM + '）', mode.level === (LLM ? 1 : 2), mode.level);

    console.log('\n=== 问答测试 ===');
    for (const { q, expect } of questions()) {
        const res = await fetch(BASE + '/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: q })
        });
        const j = await res.json();
        console.log(`\nQ: ${q}`);
        console.log(`   level=${j.level} mode=${j.mode} vector=${j.vector} tools=${(j.tools || []).join(',')} sources=${(j.sources || []).length}`);

        if (expect.level) check('  级别正确 = ' + expect.level, j.level === expect.level, j.level);
        if (expect.tools) check('  触发工具：' + expect.tools.join('+'), expect.tools.every(t => (j.tools || []).includes(t)), j.tools);
        if (expect.action) check('  导航动作 = ' + expect.action, j.action && j.action.route === expect.action, j.action);
        if (expect.hasText) check('  回答包含 ' + expect.hasText.join('/'), expect.hasText.every(t => (j.reply || '').includes(t)), (j.reply || '').slice(0, 80));
        if (expect.minSources) check('  溯源来源 ≥ ' + expect.minSources, (j.sources || []).length >= expect.minSources, j.sources);
        if (expect.noSources) check('  兜底时无来源', (j.sources || []).length === 0, j.sources);

        check('  回答非空', (j.reply || '').length > 10, (j.reply || '').length);
        if (j.sources && j.sources.length) {
            check('  来源均带路由', j.sources.every(s => s.route && s.title), j.sources);
        }
    }

    console.log('\n=== 多轮上下文 ===');
    const sid = 'test-session-' + Date.now();
    await fetch(BASE + '/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: '木星有多大？', sessionId: sid }) });
    const r2 = await (await fetch(BASE + '/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: '那土星呢？', sessionId: sid }) })).json();
    check('多轮会话可继续（第二轮有回答）', (r2.reply || '').length > 5, r2.reply);
    check('第二轮检索到土星资料', /土星/.test(r2.reply || ''), (r2.reply || '').slice(0, 80));

    console.log('\n=== 边界 ===');
    const empty = await (await fetch(BASE + '/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: '' }) })).json();
    check('空消息返回提示', /请输入/.test(empty.reply || ''), empty.reply);
    const long = await (await fetch(BASE + '/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: 'a'.repeat(300) }) })).json();
    check('超长消息被拦截', /精简|200/.test(long.reply || ''), long.reply);

    console.log('\n========================================');
    console.log(`  通过 ${pass} 项，失败 ${fail} 项`);
    console.log('========================================');
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('异常:', e); process.exit(1); });
