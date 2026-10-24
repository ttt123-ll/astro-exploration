/**
 * 内容事实校订回归（哈勃深空场面积 / 创生之柱 / 参宿四直径 + quiz 题库合法性）
 * 注意：旧的 verify-facts.js 是「冷知识/宇宙尺度」页面测试，本文件专测事实表述。
 */
const fs = require('fs');
const BASE = process.env.BASE || 'http://127.0.0.1:3001';

let pass = 0, fail = 0;
const check = (n, c, e) => {
    if (c) { pass++; console.log('  [OK] ' + n); }
    else { fail++; console.log('  [FAIL] ' + n + (e !== undefined ? '  -> ' + JSON.stringify(e).slice(0, 240) : '')); }
};
const read = f => fs.readFileSync('F:/天文科普/' + f, 'utf8');

(async () => {
    console.log('=== 源数据 ===');
    const content = read('client/src/data/content.js');
    const projection = read('client/src/data/projection.js');
    const all = content + projection;

    check('深空场面积已改为满月 1/130', /满月的 1\/130|满月的1\/130/.test(all), 'missing 1/130');
    check('深空场补充全天比例', /两千四百万分之一/.test(all));
    check('不再出现 1/2400', !/1\/2400/.test(all));
    check('创生之柱改为“推测/假说”', /有研究推测[\s\S]{0,120}假说/.test(all) && /尚未成为定论/.test(all));
    check('不再出现“最新观测表明…摧毁”', !/最新观测表明[\s\S]{0,40}摧毁/.test(all));
    check('参宿四直径写为 800–1000 倍', /800–1000 倍/.test(all));
    check('参宿四不再写单向“1000倍”', !/直径约为太阳的1000倍/.test(all));
    check('参宿四轨道表述带 AU 数值', /3–4 天文单位/.test(all));

    console.log('\n=== quiz.js ===');
    let quiz = null;
    try {
        const src = read('client/src/data/quiz.js').replace(/^[\s\S]*?export default /, '').replace(/;\s*$/, '');
        quiz = JSON.parse(src);
    } catch (e) { quiz = null; }
    check('题库可解析', Array.isArray(quiz), quiz && quiz.length);
    if (quiz) {
        check('题目数量 ≥ 20', quiz.length >= 20, quiz.length);
        const badIndex = quiz.filter(x => !Number.isInteger(x.a) || x.a < 0 || x.a >= (x.o || []).length);
        check('所有答案索引合法', badIndex.length === 0, badIndex.map(x => x.q));
        const badExplain = quiz.filter(x => !x.e || x.e.length < 8);
        check('每题都有解析', badExplain.length === 0, badExplain.map(x => x.q));
        const badOptions = quiz.filter(x => !Array.isArray(x.o) || x.o.length < 2);
        check('每题选项完整', badOptions.length === 0, badOptions.map(x => x.q));
        const dup = quiz.map(x => x.q).filter((q, i, arr) => arr.indexOf(q) !== i);
        check('无重复题干', dup.length === 0, dup);
        check('分类字段完整', quiz.every(x => typeof x.c === 'string' && x.c.length > 0));
    }

    console.log('\n=== RAG 回答复述 ===');
    async function ask(m) {
        const r = await fetch(BASE + '/api/chat', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: m, audience: 'amateur' })
        });
        return r.json();
    }

    const a = await ask('哈勃深空场有多大？');
    const at = a.reply || '';
    check('回答面积用 1/130 或全天比例', /1\/130|两千四百万分之一/.test(at), at.slice(0, 100));
    check('回答不含 1/2400', !/1\/2400/.test(at));

    const b = await ask('创生之柱被摧毁了吗？');
    const bt = b.reply || '';
    check('回答强调尚无定论/假说/有争议', /尚无定论|假说|推测|有争议|未成为定论/.test(bt), bt.slice(0, 120));
    check('回答不把摧毁写成确定事实', !/确认被摧毁|已经确定被摧毁|事实(证明|表明)已被摧毁|确定已毁/.test(bt));

    const c = await ask('参宿四的直径是太阳的多少倍？');
    const ct = c.reply || '';
    check('回答给出 800–1000 倍', /800[\s\S]{0,8}1000/.test(ct), ct.slice(0, 120));

    console.log('\n========================================');
    console.log(`  通过 ${pass} 项，失败 ${fail} 项`);
    console.log('========================================');
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('异常:', e); process.exit(1); });
