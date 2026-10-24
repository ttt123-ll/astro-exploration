/**
 * 模型切换验证（极速问答 deepseek-chat ↔ 深度推理 deepseek-reasoner）
 *  - 接口：白名单校验、非法模型回退、响应 model 字段、推理模型可用
 *  - 流式：reasoner 的 meta/done 带 model，可能出现 reasoning 事件
 *  - 界面：切换按钮、选中态、localStorage 持久化、回答元信息标签、移动端
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

async function post(path, body, timeoutMs = 120000) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), timeoutMs);
    try {
        const r = await fetch(BASE + path, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body), signal: ctl.signal
        });
        return await r.json();
    } finally { clearTimeout(timer); }
}

(async () => {
    console.log('=== 接口 ===');
    const status = await (await fetch(BASE + '/api/chat/status')).json();
    check('模型白名单包含 chat 与 reasoner',
        Array.isArray(status.models) && status.models.includes('deepseek-chat') && status.models.includes('deepseek-reasoner'),
        status.models);
    check('默认模型为 deepseek-chat', status.model === 'deepseek-chat', status.model);

    const fast = await post('/api/chat', { message: '光年是什么单位？', model: 'deepseek-chat', audience: 'amateur' });
    check('极速模型请求成功', fast.ok === true && (fast.reply || '').length > 10, (fast.reply || '').slice(0, 40));
    check('响应回传模型 = deepseek-chat', fast.model === 'deepseek-chat', fast.model);

    const invalid = await post('/api/chat', { message: '光年是什么单位？', model: 'gpt-4o', audience: 'amateur' });
    check('非法模型自动回退默认', invalid.model === 'deepseek-chat', invalid.model);

    const t0 = Date.now();
    const deep = await post('/api/chat', { message: '为什么木星有这么大的磁场？简短回答', model: 'deepseek-reasoner', audience: 'amateur' }, 180000);
    const cost = Date.now() - t0;
    check('深度推理模型请求成功', deep.ok === true && (deep.reply || '').length > 10, (deep.reply || '').slice(0, 60));
    check('响应回传模型 = deepseek-reasoner', deep.model === 'deepseek-reasoner', deep.model);
    check('深度推理级别标签', /深度推理|大模型生成/.test(deep.levelLabel || ''), deep.levelLabel);
    console.log('    （reasoner 非流式耗时 ' + cost + 'ms）');

    /* 流式：reasoner */
    console.log('\n=== 流式（reasoner）===');
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 180000);
    const res = await fetch(BASE + '/api/chat/stream', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: '太阳为什么会发光？简短回答', model: 'deepseek-reasoner', audience: 'amateur' }),
        signal: ctl.signal
    });
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = '';
    const types = new Set();
    let text = '';
    let reasoning = '';
    let metaModel = '';
    let doneModel = '';
    for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let idx;
        while ((idx = buf.indexOf('\n\n')) >= 0) {
            const raw = buf.slice(0, idx).trim();
            buf = buf.slice(idx + 2);
            if (!raw.startsWith('data:')) continue;
            let evt;
            try { evt = JSON.parse(raw.slice(5).trim()); } catch (e) { continue; }
            types.add(evt.type);
            if (evt.type === 'meta') metaModel = evt.model || '';
            if (evt.type === 'delta') text += evt.text || '';
            if (evt.type === 'reasoning') reasoning += evt.text || '';
            if (evt.type === 'done') doneModel = evt.model || '';
        }
    }
    clearTimeout(timer);
    check('流式 meta 带模型', metaModel === 'deepseek-reasoner', metaModel);
    check('流式 done 带模型', doneModel === 'deepseek-reasoner', doneModel);
    check('流式有正文输出', text.length > 10, text.slice(0, 50));
    console.log('    事件类型:', [...types].join(', '), ' 正文长度:', text.length, ' 推理长度:', reasoning.length);

    /* ===== 界面 ===== */
    console.log('\n=== 界面（桌面）===');
    const b = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox'] });
    const p = await b.newPage();
    await p.setViewport({ width: 1440, height: 1000 });
    const errs = [];
    p.on('pageerror', e => errs.push(e.message));

    await p.goto(BASE + '/assistant', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await sleep(2200);

    const ui = await p.evaluate(() => ({
        btns: Array.from(document.querySelectorAll('.ai-model-btn')).map(x => ({ text: x.textContent.trim(), active: x.classList.contains('active') })),
        stored: (() => { try { return localStorage.getItem('astro_ai_model'); } catch (e) { return 'err'; } })()
    }));
    check('界面有两个模型按钮', ui.btns.length === 2, ui.btns);
    check('默认选中极速问答', ui.btns.some(x => /极速问答/.test(x.text) && x.active), ui.btns);

    await p.evaluate(() => {
        Array.from(document.querySelectorAll('.ai-model-btn')).find(x => /深度推理/.test(x.textContent))?.click();
    });
    await sleep(400);
    const afterSwitch = await p.evaluate(() => ({
        active: Array.from(document.querySelectorAll('.ai-model-btn')).find(x => x.classList.contains('active'))?.textContent.trim(),
        stored: (() => { try { return localStorage.getItem('astro_ai_model'); } catch (e) { return 'err'; } })()
    }));
    check('可切换到深度推理', /深度推理/.test(afterSwitch.active || ''), afterSwitch.active);
    check('选择已持久化到 localStorage', afterSwitch.stored === 'deepseek-reasoner', afterSwitch.stored);

    /* 发一条短问题，验证元信息模型标签 */
    await p.click('.ai-input-row input');
    await p.type('.ai-input-row input', '月球为什么总是同一面朝向地球？', { delay: 6 });
    await p.keyboard.press('Enter');
    let final = null;
    for (let i = 0; i < 240; i++) {
        await sleep(500);
        final = await p.evaluate(() => {
            const bots = document.querySelectorAll('.ai-msg.bot');
            const last = bots[bots.length - 1];
            const bubble = last && last.querySelector('.ai-bubble');
            if (!bubble) return null;
            return {
                done: !bubble.classList.contains('ai-typing') && !last.querySelector('.ai-cursor') && (bubble.textContent || '').length > 0,
                tag: last.querySelector('.ai-model-tag')?.textContent.trim() || '',
                reasoning: !!last.querySelector('.ai-reasoning'),
                text: bubble.textContent.slice(0, 60)
            };
        });
        if (final && final.done) break;
    }
    check('深度推理回答完成', final && final.done && (final.text || '').length > 5, final);
    check('回答显示模型标签「深度推理」', /深度推理/.test(final?.tag || ''), final?.tag);
    check('展示思考过程区块', final?.reasoning === true, final?.reasoning);
    await p.screenshot({ path: 'E:/dsh/ai-model-reasoner.png' });

    /* 刷新后保持 */
    await p.reload({ waitUntil: 'domcontentloaded' });
    await sleep(2200);
    const persisted = await p.evaluate(() => Array.from(document.querySelectorAll('.ai-model-btn')).find(x => x.classList.contains('active'))?.textContent.trim());
    check('刷新后仍为深度推理', /深度推理/.test(persisted || ''), persisted);

    /* 切回极速 */
    await p.evaluate(() => {
        Array.from(document.querySelectorAll('.ai-model-btn')).find(x => /极速问答/.test(x.textContent))?.click();
    });
    await sleep(400);
    const back = await p.evaluate(() => Array.from(document.querySelectorAll('.ai-model-btn')).find(x => x.classList.contains('active'))?.textContent.trim());
    check('可切回极速问答', /极速问答/.test(back || ''), back);

    check('桌面无 JS 错误', errs.length === 0, errs.slice(0, 2));
    await p.close();

    /* 移动端 */
    console.log('\n=== 界面（移动端）===');
    const m = await b.newPage();
    await m.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    await m.goto(BASE + '/assistant', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await sleep(2200);
    const mobile = await m.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('.ai-model-btn'));
        return {
            count: btns.length,
            visible: btns.every(x => x.getBoundingClientRect().width > 0),
            overflow: btns.some(x => x.getBoundingClientRect().right > window.innerWidth + 1)
        };
    });
    check('移动端模型按钮可见', mobile.count === 2 && mobile.visible, mobile);
    check('移动端不横向溢出', mobile.overflow === false, mobile);
    await m.screenshot({ path: 'E:/dsh/ai-model-mobile.png' });
    await m.close();

    await b.close();
    console.log('\n========================================');
    console.log(`  通过 ${pass} 项，失败 ${fail} 项`);
    console.log('========================================');
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('异常:', e); process.exit(1); });
