/**
 * AI 助手界面验证：受众模式选择器 + 装备导购面板 + 方案卡
 */
const puppeteer = require('F:/天文科普/tools/node_modules/puppeteer-core');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE = process.env.BASE || 'http://127.0.0.1:3000';
const sleep = ms => new Promise(r => setTimeout(r, ms));

let pass = 0, fail = 0;
const check = (n, c, e) => {
    if (c) { pass++; console.log('  [OK] ' + n); }
    else { fail++; console.log('  [FAIL] ' + n + (e !== undefined ? '  -> ' + JSON.stringify(e).slice(0, 240) : '')); }
};

(async () => {
    const b = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox'] });
    const p = await b.newPage();
    await p.setViewport({ width: 1440, height: 1000 });
    const errs = [];
    p.on('pageerror', e => errs.push(e.message));

    await p.goto(BASE + '/assistant', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await sleep(2000);

    /* ---------- 1. 受众选择器 ---------- */
    console.log('=== 受众模式选择器 ===');
    const aud = await p.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('.ai-audience-btn'));
        return {
            count: btns.length,
            labels: btns.map(x => x.textContent.trim()),
            active: btns.find(x => x.classList.contains('active'))?.textContent.trim(),
            hint: document.querySelector('.ai-audience-hint')?.textContent.trim()
        };
    });
    check('三个受众按钮', aud.count === 3, aud.labels);
    check('包含儿童/业余爱好者/专业人士',
        ['儿童', '业余爱好者', '专业人士'].every(k => aud.labels.includes(k)), aud.labels);
    check('默认选中业余爱好者', aud.active === '业余爱好者', aud.active);
    check('有模式说明', /回答的详略/.test(aud.hint || ''), aud.hint);

    // 切换到儿童
    await p.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('.ai-audience-btn')).find(x => x.textContent.includes('儿童'));
        btn.click();
    });
    await sleep(400);
    const afterSwitch = await p.evaluate(() => ({
        active: document.querySelector('.ai-audience-btn.active')?.textContent.trim(),
        hint: document.querySelector('.ai-audience-hint')?.textContent.trim(),
        saved: localStorage.getItem('ai_audience')
    }));
    check('切换到儿童模式', afterSwitch.active === '儿童', afterSwitch.active);
    check('选择写入 localStorage', afterSwitch.saved === 'child', afterSwitch.saved);
    check('提示文案更新', /儿童模式/.test(afterSwitch.hint || ''), afterSwitch.hint);

    // 刷新后保持
    await p.reload({ waitUntil: 'domcontentloaded' });
    await sleep(1800);
    const persisted = await p.evaluate(() => document.querySelector('.ai-audience-btn.active')?.textContent.trim());
    check('刷新后仍保持儿童模式', persisted === '儿童', persisted);

    /* ---------- 2. 装备导购面板 ---------- */
    console.log('\n=== 装备导购面板 ===');
    await p.evaluate(() => {
        /* 能力卡片顺序会随功能调整，按文案定位「装备导购」卡片 */
        const caps = Array.from(document.querySelectorAll('.ai-cap-btn'));
        const cap = caps.find(x => /装备/.test(x.textContent)) || caps[0];
        if (cap) cap.click();
    });
    await sleep(500);
    const panel = await p.evaluate(() => {
        const el = document.querySelector('.ai-gear');
        if (!el) return null;
        return {
            open: true,
            budgets: Array.from(el.querySelectorAll('.ag-budgets .ag-chip')).map(x => x.textContent.trim()),
            purposes: Array.from(el.querySelectorAll('.ag-purposes .ag-chip')).map(x => x.textContent.trim()),
            hasInput: !!el.querySelector('.ag-input'),
            submitText: el.querySelector('.ag-submit')?.textContent.trim()
        };
    });
    check('面板可打开', !!panel, panel);
    if (panel) {
        check('预算档位 ≥5', panel.budgets.length >= 5, panel.budgets.length);
        check('用途标签 ≥6', panel.purposes.length >= 6, panel.purposes.length);
        check('支持自定义预算输入', panel.hasInput);
        check('有生成按钮', /生成/.test(panel.submitText || ''), panel.submitText);
    }

    // 选预算 + 用途并生成
    await p.evaluate(() => {
        const chips = Array.from(document.querySelectorAll('.ag-budgets .ag-chip'));
        const target = chips.find(c => c.textContent.includes('6000'));
        if (target) target.click();
        const purpose = Array.from(document.querySelectorAll('.ag-purposes .ag-chip')).find(c => c.textContent.includes('深空摄影'));
        if (purpose) purpose.click();
        document.querySelector('.ag-submit').click();
    });
    // 等待方案卡出现
    let card = null;
    for (let i = 0; i < 40; i++) {
        await sleep(300);
        card = await p.evaluate(() => {
            const el = document.querySelector('.gear-card');
            if (!el) return null;
            const plan = el.querySelector('.gc-plan');
            if (!plan) return null;
            return {
                head: el.querySelector('.gc-head b')?.textContent.trim(),
                budget: el.querySelector('.gc-head span')?.textContent.trim(),
                planName: plan.querySelector('.gc-plan-head b')?.textContent.trim(),
                total: plan.querySelector('.gc-total')?.textContent.trim(),
                items: Array.from(plan.querySelectorAll('.gc-items li')).map(li => li.textContent.replace(/\s+/g, ' ').trim()),
                spec: plan.querySelector('.gc-spec')?.textContent.replace(/\s+/g, ' ').trim(),
                why: plan.querySelector('.gc-why')?.textContent.trim()
            };
        });
        if (card) break;
    }
    check('生成后出现方案卡', !!card, card);
    if (card) {
        check('方案卡有标题与预算', /装备方案/.test(card.head || '') && /6000/.test(card.budget || ''), { head: card.head, budget: card.budget });
        check('方案含主镜等条目（≥2）', card.items.length >= 2, card.items);
        check('显示总价', /≈\s*\d+/.test(card.total || ''), card.total);
        check('显示光学参数', /口径|焦比/.test(card.spec || ''), card.spec);
        check('显示推荐理由', (card.why || '').length > 5, card.why);
    }

    // 用户提问气泡
    const userBubble = await p.evaluate(() => {
        const users = Array.from(document.querySelectorAll('.ai-msg.user .ai-bubble'));
        return users.length ? users[users.length - 1].textContent.trim() : '';
    });
    check('对话区记录提问（预算+用途）', /预算/.test(userBubble) && /深空摄影/.test(userBubble), userBubble);

    /* ---------- 3. 三档受众实际回答差异（界面） ---------- */
    console.log('\n=== 对话区三档回答差异 ===');
    const answerLens = {};
    for (const key of ['child', 'amateur', 'pro']) {
        await p.evaluate((k) => {
            const btn = Array.from(document.querySelectorAll('.ai-audience-btn')).find(x => {
                const map = { child: '儿童', amateur: '业余爱好者', pro: '专业人士' };
                return x.textContent.includes(map[k]);
            });
            if (btn) btn.click();
        }, key);
        await sleep(300);
        await p.evaluate(() => {
            const input = document.querySelector('.ai-input-row input');
            input.value = '';
        });
        await p.click('.ai-input-row input');
        await p.type('.ai-input-row input', '黑洞是怎么形成的？', { delay: 8 });
        await sleep(120);
        await p.keyboard.press('Enter');
        for (let i = 0; i < 40; i++) {
            await sleep(250);
            const done = await p.evaluate(() => {
                const bots = document.querySelectorAll('.ai-msg.bot .ai-bubble');
                const last = bots[bots.length - 1];
                return last && !last.classList.contains('ai-typing') ? last.textContent.trim() : '';
            });
            if (done) { answerLens[key] = done.length; break; }
        }
    }
    check('三档都拿到回答', Object.keys(answerLens).length === 3, answerLens);
    check('儿童回答明显更短', (answerLens.child || 999) < (answerLens.amateur || 0), answerLens);

    await p.screenshot({ path: 'F:/天文科普/shots/ai-gear.png' });
    check('无 JS 错误', errs.length === 0, errs.slice(0, 3));

    await b.close();
    console.log('\n========================================');
    console.log(`  通过 ${pass} 项，失败 ${fail} 项`);
    console.log('========================================');
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('异常:', e); process.exit(1); });
