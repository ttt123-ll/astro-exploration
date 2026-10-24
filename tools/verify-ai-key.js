/**
 * AI 连接设置验证
 *  - 接口：/chat/status、/chat/verify-key（无效 Key / 有效 Key）
 *  - 界面：连接设置弹窗、状态切换（站点内置 Key ↔ 我的 Key）、本地持久化、清除
 *  - 移动端弹窗可用
 */
const fs = require('fs');
const puppeteer = require('F:/天文科普/tools/node_modules/puppeteer-core');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE = process.env.BASE || 'http://127.0.0.1:3001';
const sleep = ms => new Promise(r => setTimeout(r, ms));

let pass = 0, fail = 0;
const check = (n, c, e) => {
    if (c) { pass++; console.log('  [OK] ' + n); }
    else { fail++; console.log('  [FAIL] ' + n + (e !== undefined ? '  -> ' + JSON.stringify(e).slice(0, 240) : '')); }
};

/* 本机已保存的 DeepSeek Key（仅用于本地测试，不写入仓库） */
function readKey() {
    try {
        const raw = fs.readFileSync('C:/Users/30798/.dsh/.credentials.yaml', 'utf8');
        const m = raw.match(/DEEPSEEK_API_KEY:\s*(\S+)/);
        return m ? m[1].trim() : '';
    } catch (e) { return ''; }
}

(async () => {
    console.log('=== 接口 ===');
    const status = await (await fetch(BASE + '/api/chat/status')).json();
    check('status 返回站点 Key 状态', typeof status.siteKeyAvailable === 'boolean', status);
    check('status 返回掩码 Key', /sk-.*\*\*\*\*/.test(status.siteKeyMasked || ''), status.siteKeyMasked);

    const bad = await (await fetch(BASE + '/api/chat/verify-key', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: 'sk-invalid-key-000000000000' })
    })).json();
    check('无效 Key 校验失败', bad.valid === false, bad);
    check('无效 Key 返回原因', /Key 无效|校验失败/.test(bad.message || ''), bad.message);

    const malformed = await (await fetch(BASE + '/api/chat/verify-key', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: 'not-a-key' })
    })).json();
    check('格式错误 Key 被拦截', malformed.valid === false && /格式/.test(malformed.message || ''), malformed);

    const key = readKey();
    if (!key) { console.log('  （本机未找到 DeepSeek Key，跳过后半部分）'); process.exit(fail ? 1 : 0); }

    const good = await (await fetch(BASE + '/api/chat/verify-key', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: key })
    })).json();
    check('有效 Key 校验通过', good.valid === true, good.message);
    check('返回掩码与响应耗时', /sk-.*\*\*\*\*/.test(good.maskedKey || '') && good.responseTimeMs >= 0, good);

    /* 带用户 Key 请求：应正常走大模型 */
    const chat = await (await fetch(BASE + '/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-AI-Key': key },
        body: JSON.stringify({ message: '光年是什么单位？', audience: 'amateur' })
    })).json();
    check('带用户 Key 请求可用', chat.ok === true && (chat.reply || '').length > 10, (chat.reply || '').slice(0, 40));

    console.log('\n=== 界面（桌面）===');
    const b = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox'] });
    const p = await b.newPage();
    await p.setViewport({ width: 1440, height: 1000 });
    const errs = [];
    p.on('pageerror', e => errs.push(e.message));

    await p.goto(BASE + '/assistant', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await sleep(2200);

    const bar = await p.evaluate(() => ({
        badge: document.querySelector('.ai-key-badge')?.textContent.trim(),
        btn: document.querySelector('.ai-key-btn')?.textContent.trim()
    }));
    check('AI 页显示连接状态徽标', /Key/.test(bar.badge || ''), bar.badge);
    check('有「AI 连接设置」按钮', /AI 连接设置/.test(bar.btn || ''), bar.btn);

    await p.click('.ai-key-btn');
    await sleep(500);
    const dlg = await p.evaluate(() => {
        const d = document.querySelector('.ak-panel');
        return d ? {
            title: d.querySelector('h3')?.textContent.trim(),
            status: d.querySelector('.ak-status b')?.textContent.trim(),
            hasInput: !!d.querySelector('.ak-input-row input'),
            hasConnect: Array.from(d.querySelectorAll('button')).some(x => /验证并连接/.test(x.textContent))
        } : null;
    });
    check('弹窗打开且有标题', dlg && dlg.title === 'AI 连接设置', dlg);
    check('弹窗显示当前连接状态', /已连接/.test(dlg.status || ''), dlg.status);
    check('弹窗有 Key 输入框与连接按钮', dlg.hasInput && dlg.hasConnect, dlg);
    await p.screenshot({ path: 'E:/dsh/ai-key-dialog-site.png' });

    /* 无效 Key：应显示错误 */
    await p.click('.ak-input-row input');
    await p.type('.ak-input-row input', 'sk-invalid-key-000000000000', { delay: 4 });
    await p.click('.ak-primary');
    await sleep(1600);
    const badUi = await p.evaluate(() => document.querySelector('.ak-error')?.textContent.trim());
    check('无效 Key 在界面提示失败', /失败|无效/.test(badUi || ''), badUi);

    /* 有效 Key：连接成功 */
    await p.evaluate(() => { const i = document.querySelector('.ak-input-row input'); i.value = ''; i.dispatchEvent(new Event('input', { bubbles: true })); });
    await p.click('.ak-input-row input');
    await p.type('.ak-input-row input', key, { delay: 2 });
    await p.click('.ak-primary');
    await sleep(2500);
    const okUi = await p.evaluate(() => ({
        success: document.querySelector('.ak-success')?.textContent.trim(),
        status: document.querySelector('.ak-status b')?.textContent.trim(),
        stored: (() => { try { return !!localStorage.getItem('astro_ai_key'); } catch (e) { return false; } })()
    }));
    check('有效 Key 连接成功提示', /连接成功/.test(okUi.success || ''), okUi.success);
    check('状态切换为「我的 API Key」', /我的 API Key/.test(okUi.status || ''), okUi.status);
    check('Key 已写入浏览器本地存储', okUi.stored === true, okUi.stored);
    await p.screenshot({ path: 'E:/dsh/ai-key-dialog-mine.png' });

    await p.click('.ak-close');
    await sleep(500);
    const afterClose = await p.evaluate(() => document.querySelector('.ai-key-badge')?.textContent.trim());
    check('关闭后页面徽标为「我的 Key」', /我的 Key/.test(afterClose || ''), afterClose);

    /* 重新打开 → 状态保留 */
    await p.click('.ai-key-btn');
    await sleep(500);
    const reopened = await p.evaluate(() => document.querySelector('.ak-status b')?.textContent.trim());
    check('重新打开状态保留（我的 API Key）', /我的 API Key/.test(reopened || ''), reopened);

    /* 清除我的 Key → 回站点内置 */
    await p.evaluate(() => {
        Array.from(document.querySelectorAll('.ak-ghost')).find(x => /清除我的 Key/.test(x.textContent))?.click();
    });
    await sleep(700);
    const cleared = await p.evaluate(() => ({
        status: document.querySelector('.ak-status b')?.textContent.trim(),
        badge: document.querySelector('.ai-key-badge')?.textContent.trim(),
        stored: (() => { try { return localStorage.getItem('astro_ai_key'); } catch (e) { return 'err'; } })()
    }));
    check('清除后回到站点内置 Key', /站点内置 Key/.test(cleared.status || ''), cleared.status);
    check('清除后本地存储已删除', cleared.stored === null, cleared.stored);
    check('清除后页面徽标同步', /站点内置 Key/.test(cleared.badge || ''), cleared.badge);

    check('桌面无 JS 错误', errs.length === 0, errs.slice(0, 2));
    await p.close();

    /* 移动端弹窗 */
    console.log('\n=== 界面（移动端）===');
    const m = await b.newPage();
    await m.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    await m.goto(BASE + '/assistant', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await sleep(2200);
    await m.evaluate(() => document.querySelector('.ai-key-btn')?.click());
    await sleep(600);
    const mobile = await m.evaluate(() => {
        const d = document.querySelector('.ak-panel');
        const r = d ? d.getBoundingClientRect() : null;
        return {
            open: !!d,
            fits: r ? r.width <= window.innerWidth + 1 && r.height <= window.innerHeight + 1 : false,
            btnVisible: !!document.querySelector('.ak-primary')
        };
    });
    check('移动端弹窗打开', mobile.open, mobile.open);
    check('弹窗不超出视口', mobile.fits, mobile);
    check('移动端连接按钮可见', mobile.btnVisible);
    await m.screenshot({ path: 'E:/dsh/ai-key-dialog-mobile.png' });

    await m.close();
    await b.close();

    console.log('\n========================================');
    console.log(`  通过 ${pass} 项，失败 ${fail} 项`);
    console.log('========================================');
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('异常:', e); process.exit(1); });
