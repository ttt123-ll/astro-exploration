/**
 * 装备导购 + 多受众模式验证
 * - /api/chat/audiences 元数据
 * - 三档预算 × 用途 → 结构化方案（不超预算、含主镜/参数）
 * - 同一问题在 child / amateur / pro 下的表达差异（长度、术语、结构）
 * - 装备意图识别（预算+用途、口径对比）与科普问题不误判
 * - /api/chat 集成返回 gear
 */
const BASE = process.env.BASE || 'http://127.0.0.1:3000';

let pass = 0, fail = 0;
const check = (n, c, e) => {
    if (c) { pass++; console.log('  [OK] ' + n); }
    else { fail++; console.log('  [FAIL] ' + n + (e !== undefined ? '  -> ' + JSON.stringify(e).slice(0, 240) : '')); }
};

async function post(path, body) {
    const r = await fetch(BASE + path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    return r.json();
}

(async () => {
    /* ---------- 1. 元数据 ---------- */
    console.log('=== 受众 / 用途 / 预算元数据 ===');
    const meta = await (await fetch(BASE + '/api/chat/audiences')).json();
    check('返回三档受众', meta.audiences && meta.audiences.length === 3, meta.audiences && meta.audiences.map(a => a.key));
    check('受众包含儿童/业余/专业',
        ['child', 'amateur', 'pro'].every(k => (meta.audiences || []).some(a => a.key === k)),
        meta.audiences && meta.audiences.map(a => a.key));
    check('返回用途列表（≥6）', (meta.purposes || []).length >= 6, meta.purposes && meta.purposes.length);
    check('返回预算档位（≥5）', (meta.budgets || []).length >= 5, meta.budgets && meta.budgets.length);

    /* ---------- 2. 结构化方案 ---------- */
    console.log('\n=== 结构化装备方案 ===');
    const cases = [
        { budget: '3000', priorities: ['kid'], name: '3000 儿童入门' },
        { budget: '8000', priorities: ['ap'], name: '8000 深空摄影' },
        { budget: '6000', priorities: ['moon', 'planet-photo'], name: '6000 月面行星摄影' },
        { budget: '12000', priorities: ['visual'], name: '12000 目视深空' }
    ];
    for (const c of cases) {
        const j = await post('/api/chat/gear', { budget: c.budget, priorities: c.priorities, audience: 'amateur' });
        const plans = (j.gear && j.gear.plans) || [];
        const p = plans[0];
        check(`${c.name}：生成方案`, plans.length >= 1, plans.length);
        if (p) {
            check(`${c.name}：总价不超预算`, p.total <= Number(c.budget), { total: p.total, budget: c.budget });
            check(`${c.name}：含主镜与参考价`, p.items.some(i => i.role === '主镜') && p.items.every(i => i.price >= 0), p.items);
            check(`${c.name}：回答含参数或理由`, /口径|理由|升级/.test(j.reply || ''), (j.reply || '').slice(0, 60));
        }
    }

    /* ---------- 3. 三档受众表达差异 ---------- */
    console.log('\n=== 同一问题 × 三档受众 ===');
    const q = '预算 5000，想给孩子买第一台望远镜';
    const replies = {};
    for (const aud of ['child', 'amateur', 'pro']) {
        const j = await post('/api/chat', { message: q, audience: aud });
        replies[aud] = j.reply || '';
        check(`[${aud}] 返回 gear 方案`, !!(j.gear && j.gear.plans && j.gear.plans.length), j.gear ? 'ok' : 'null');
        check(`[${aud}] 回显受众`, j.audience === aud, j.audience);
    }
    check('三档回答互不相同', new Set([replies.child, replies.amateur, replies.pro]).size === 3, Object.keys(replies).map(k => replies[k].length));
    check('儿童版更短（≤业余版）', replies.child.length <= replies.amateur.length, { child: replies.child.length, amateur: replies.amateur.length });
    check('儿童版使用通俗比喻或安全提示', /大白话|比喻|大碗|安全|眼睛/.test(replies.child), replies.child.slice(0, 60));
    check('专业版出现规格参数', /f\/|D=|道斯|载重|采样|口径/.test(replies.pro), replies.pro.slice(0, 80));

    /* 普通科普问题也要有差异 */
    const sci = {};
    for (const aud of ['child', 'amateur', 'pro']) {
        const j = await post('/api/chat', { message: '黑洞是怎么形成的？', audience: aud });
        sci[aud] = j.reply || '';
    }
    check('科普问答同样分档（长度递增）', sci.child.length < sci.amateur.length && sci.amateur.length <= sci.pro.length,
        { child: sci.child.length, amateur: sci.amateur.length, pro: sci.pro.length });
    check('儿童版科普更短（<200 字）', sci.child.length < 200, sci.child.length);

    /* ---------- 4. 意图识别 ---------- */
    console.log('\n=== 意图识别 ===');
    const gearQs = [
        '预算 5000，想给孩子买第一台望远镜',
        '8000 预算拍深空，主镜和赤道仪怎么配？',
        '6000 左右，要求便携又能看行星，给个专业点的建议',
        '2000 以内，只是看看月亮'
    ];
    for (const gq of gearQs) {
        const j = await post('/api/chat', { message: gq, audience: 'amateur' });
        check(`识别为装备问题：${gq.slice(0, 22)}…`, (j.tools || []).includes('gear-advisor'), j.tools);
    }
    const specJ = await post('/api/chat', { message: '80mm 和 130mm 口径差多少？', audience: 'amateur' });
    check('口径对比走参数助手', (specJ.tools || []).includes('gear-spec') && /集光/.test(specJ.reply || ''), specJ.tools);

    const sciQs = ['黑洞是怎么形成的？', '行星为什么是圆的？', '光年是什么单位？'];
    for (const sq of sciQs) {
        const j = await post('/api/chat', { message: sq, audience: 'amateur' });
        check(`科普问题不误判为导购：${sq.slice(0, 14)}…`, !(j.tools || []).includes('gear-advisor'), j.tools);
    }

    /* ---------- 5. 预算不足兜底 ---------- */
    console.log('\n=== 预算不足 / 边界 ===');
    const low = await post('/api/chat', { message: '预算 500，想拍深空', audience: 'amateur' });
    check('低预算不硬凑方案或给出说明', (low.reply || '').length > 20, (low.reply || '').slice(0, 60));
    check('低预算说明门槛', /入门|双筒|门槛|赤道仪/.test(low.reply || ''), (low.reply || '').slice(0, 80));

    const empty = await post('/api/chat/gear', { budget: '', priorities: [] });
    check('空参数返回引导而非报错', (empty.reply || '').length > 10, (empty.reply || '').slice(0, 60));

    console.log('\n========================================');
    console.log(`  通过 ${pass} 项，失败 ${fail} 项`);
    console.log('========================================');
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('异常:', e); process.exit(1); });
