/**
 * RAG 检索评估（方向②考核用）
 * - 10 条标注查询：Hit@1 / Hit@3 / MRR + 平均分
 * - 校验向量库持久化状态（/api/chat/mode 的 index 字段）
 * - 校验本地索引文件生成
 */
const BASE = process.env.BASE || 'http://127.0.0.1:3000';

/* [查询, 期望来源路由包含的关键字] */
const LABELED = [
    ['黑洞是怎么形成的？', '/encyclopedia'],
    ['猎户座有什么著名的星云？', '/detail/constellation/orion'],
    ['光年是什么单位？', '/encyclopedia'],
    ['木星有多大？', '/detail/planet/jupiter'],
    ['英仙座流星雨什么时候出现？', '/constellations'],
    ['引力波是什么？', '/encyclopedia'],
    ['土星环由什么组成？', '/detail/planet/saturn'],
    ['宇宙的年龄是多少？', '/timeline'],
    ['什么是星座？', '/detail/constellation'],
    ['太阳系有几颗行星？', '/solar-system']
];

let pass = 0, fail = 0;
const check = (n, c, e) => {
    if (c) { pass++; console.log('  [OK] ' + n); }
    else { fail++; console.log('  [FAIL] ' + n + (e !== undefined ? '  -> ' + JSON.stringify(e).slice(0, 260) : '')); }
};

async function ask(q) {
    const r = await fetch(BASE + '/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: q })
    });
    return r.json();
}

(async () => {
    console.log('=== 向量库状态（/api/chat/mode）===');
    const mode = await (await fetch(BASE + '/api/chat/mode')).json();
    const idx = mode.index || {};
    console.log('  ' + JSON.stringify(idx));
    check('索引维度 1024', idx.dim === 1024, idx.dim);
    check('索引包含全部知识块（>100）', idx.chunks > 100, idx.chunks);
    check('索引来源为 disk 或 built', ['disk', 'built', 'built+saved'].includes(idx.source), idx.source);
    check('索引文件已生成（sizeKB > 0）', idx.sizeKB > 0, idx.sizeKB);
    check('向量模式为 local 或 api', ['local', 'api'].includes(mode.vector), mode.vector);

    console.log('\n=== 标注查询检索评估（10 条）===');
    let hit1 = 0, hit3 = 0, mrrSum = 0;
    for (const [q, expect] of LABELED) {
        const res = await ask(q);
        const routes = (res.sources || []).map(s => s.route || '');
        const rank = routes.findIndex(r => r.includes(expect));
        const ok1 = rank === 0;
        const ok3 = rank >= 0 && rank < 3;
        if (ok1) hit1++;
        if (ok3) hit3++;
        if (rank >= 0) mrrSum += 1 / (rank + 1);
        console.log(`  ${ok3 ? '✓' : '✗'} 「${q}」 rank=${rank < 0 ? '-' : rank + 1}  期望=${expect}`);
        if (!ok3) console.log('     实际来源: ' + JSON.stringify(routes));
    }

    const n = LABELED.length;
    const H1 = hit1 / n, H3 = hit3 / n, MRR = mrrSum / n;
    console.log(`\n  Hit@1 = ${(H1 * 100).toFixed(0)}%   Hit@3 = ${(H3 * 100).toFixed(0)}%   MRR = ${MRR.toFixed(3)}`);
    check('Hit@1 ≥ 40%', H1 >= 0.4, (H1 * 100).toFixed(0) + '%');
    check('Hit@3 ≥ 70%', H3 >= 0.7, (H3 * 100).toFixed(0) + '%');
    check('MRR ≥ 0.50', MRR >= 0.5, MRR.toFixed(3));

    console.log('\n=== 端到端问答可用性 ===');
    const black = await ask('黑洞是怎么形成的？');
    check('问答返回内容', (black.reply || '').length > 20, (black.reply || '').slice(0, 40));
    check('返回溯源来源', (black.sources || []).length >= 1, black.sources);
    check('回答带角标或资料编号', /【\d】/.test(black.reply || '') || (black.sources || []).length > 0, (black.reply || '').slice(0, 60));

    const tools = await ask('今晚能看到什么星座？');
    check('工具调用仍可用（今夜观星）', (tools.tools || []).includes('tonight-sky'), tools.tools);

    const fallback = await ask('如何做红烧肉？');
    check('无关问题走兜底（level 3）', fallback.level === 3, fallback.level);

    console.log('\n========================================');
    console.log(`  通过 ${pass} 项，失败 ${fail} 项`);
    console.log('========================================');
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('异常:', e); process.exit(1); });
