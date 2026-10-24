/**
 * 角色设定验证（星穹）
 *  - 人设：只答天文/宇宙/航天相关，无关问题俏皮引回
 *  - 上下文：多轮代词指代能正确延续（「它」= 上一轮天体）
 *  - 语气：结构化、粗体/列表、结尾引导提问
 *  - 边界：前沿不确定问题声明「目前科学界尚无定论」
 *  - 多受众：儿童模式更短
 */
const BASE = process.env.BASE || 'http://127.0.0.1:3001';

async function ask(message, sessionId, audience = 'amateur') {
    const r = await fetch(BASE + '/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, sessionId, audience })
    });
    return r.json();
}

let pass = 0, fail = 0;
const check = (n, c, e) => {
    if (c) { pass++; console.log('  [OK] ' + n); }
    else { fail++; console.log('  [FAIL] ' + n + (e !== undefined ? '  -> ' + JSON.stringify(e).slice(0, 220) : '')); }
};

(async () => {
    const mode = await (await fetch(BASE + '/api/chat/mode')).json();
    const LLM = !!(mode.levels && mode.levels[0] && mode.levels[0].available);
    if (!LLM) {
        console.log('当前为离线知识库模式，角色行为测试需要大模型；跳过。');
        process.exit(0);
    }

    const sid = 'persona-' + Date.now();

    console.log('=== 代词指代（多轮上下文）===');
    const r1 = await ask('木星有多大？', sid);
    const r2 = await ask('那它有几颗卫星？', sid);
    check('第一轮回答木星', /木星/.test(r1.reply || ''), (r1.reply || '').slice(0, 60));
    check('「它」被理解为木星', /卫星/.test(r2.reply || '') && /木星/.test(r2.reply || ''), (r2.reply || '').slice(0, 100));

    console.log('\n=== 无关问题：俏皮引回宇宙 ===');
    const cook = await ask('红烧肉怎么做？');
    check('不正经回答菜谱', !/生抽|老抽|冰糖|五花肉/.test(cook.reply || ''), (cook.reply || '').slice(0, 80));
    check('把话题引回天文/宇宙', /天文|宇宙|火星|观测|星空|行星/.test(cook.reply || ''), (cook.reply || '').slice(0, 100));

    console.log('\n=== 前沿不确定问题：声明尚无定论 ===');
    const frontier = await ask('宇宙大爆炸之前是什么？');
    check('声明尚无定论或等价表述', /尚无定论|没有定论|尚不清楚|仍是开放问题|未知/.test(frontier.reply || ''), (frontier.reply || '').slice(0, 140));

    console.log('\n=== 语气风格 ===');
    const mars = await ask('火星适合人类居住吗？');
    const text = mars.reply || '';
    check('结构化表达（列表或粗体）', /(\n\s*[-•]|\*\*|1\.)/.test(text), text.slice(0, 100));
    check('结尾引导继续提问', /[？?]\s*$/.test(text.trim()) || /你想|要不要|想了解/.test(text.slice(-60)), text.slice(-80));

    console.log('\n=== 儿童模式更简短 ===');
    const kid = await ask('黑洞是什么？', 'kid-' + Date.now(), 'child');
    check('儿童模式 ≤200 字', (kid.reply || '').length <= 200, (kid.reply || '').length);
    check('回答切题', /黑洞/.test(kid.reply || ''), (kid.reply || '').slice(0, 60));

    console.log('\n========================================');
    console.log(`  通过 ${pass} 项，失败 ${fail} 项`);
    console.log('========================================');
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('异常:', e); process.exit(1); });
