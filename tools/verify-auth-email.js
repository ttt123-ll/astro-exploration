/**
 * 注册绑定邮箱 + 忘记密码（页面弹窗验证码）验证
 *  接口：邮箱不存在提示「没有该用户」、验证码生成/校验、原密码校验、重置、旧密码失效
 *  页面：注册页邮箱字段；登录页「忘记密码」弹窗 → 邮箱 → 弹窗显示验证码 → 修改密码 → 弹窗提示
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

async function post(path, body, headers = {}) {
    const r = await fetch(BASE + path, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(body)
    });
    let data = null;
    try { data = await r.json(); } catch (e) { /* ignore */ }
    return { status: r.status, data };
}
async function get(path) {
    const r = await fetch(BASE + path);
    let data = null;
    try { data = await r.json(); } catch (e) { /* ignore */ }
    return { status: r.status, data };
}

(async () => {
    const stamp = Date.now().toString().slice(-7);
    const username = 'mail' + stamp;
    const email = username + '@test.local';
    const oldPwd = 'OldPass!2025';
    const newPwd = 'NewPass!2025';

    console.log('=== 接口 ===');
    const cap = (await get('/api/captcha')).data;
    check('获取验证码题', cap && Number.isFinite(cap.a) && Number.isFinite(cap.b), cap);

    /* 1) 缺邮箱 / 格式错误 */
    const noEmail = await post('/api/register', {
        username, password: oldPwd, captcha: { ...cap, answer: cap.a + cap.b }
    });
    check('注册必须填写邮箱', noEmail.status === 400 && /邮箱/.test(noEmail.data.error || ''), noEmail);

    const cap2 = (await get('/api/captcha')).data;
    const badEmail = await post('/api/register', {
        username, email: 'not-an-email', password: oldPwd, captcha: { ...cap2, answer: cap2.a + cap2.b }
    });
    check('邮箱格式校验', badEmail.status === 400 && /邮箱/.test(badEmail.data.error || ''), badEmail);

    /* 2) 注册成功 + 邮箱唯一 */
    const cap3 = (await get('/api/captcha')).data;
    const reg = await post('/api/register', {
        username, email, password: oldPwd, captcha: { ...cap3, answer: cap3.a + cap3.b }
    });
    check('注册成功并返回绑定邮箱', reg.status === 200 && reg.data.ok && reg.data.user.email === email, reg.data.user);

    const cap4 = (await get('/api/captcha')).data;
    const dup = await post('/api/register', {
        username: username + 'x', email, password: oldPwd, captcha: { ...cap4, answer: cap4.a + cap4.b }
    });
    check('同一邮箱不可重复绑定', dup.status === 409 && /邮箱/.test(dup.data.error || ''), dup);

    /* 3) 未注册邮箱 → 明确提示没有该用户 */
    const missing = await post('/api/forgot-password', { email: 'nobody' + stamp + '@test.local' });
    check('未注册邮箱提示「没有该用户」', missing.status === 404 && /没有该用户/.test(missing.data.error || ''), missing);

    /* 4) 已注册邮箱 → 生成 6 位验证码（页面弹窗用） */
    const forgot = await post('/api/forgot-password', { email });
    check('生成 6 位验证码', forgot.status === 200 && /^\d{6}$/.test(forgot.data.code || ''), forgot.data);
    const code = forgot.data.code;

    /* 5) 60 秒冷却 */
    const again = await post('/api/forgot-password', { email });
    check('重复生成触发冷却', again.status === 429, again);

    /* 6) 错误验证码 */
    const wrong = await post('/api/reset-password', { email, code: '000000', password: newPwd });
    check('错误验证码被拒绝', wrong.status === 400 && /验证码/.test(wrong.data.error || ''), wrong);

    /* 7) 新密码与原密码相同 → 拒绝 */
    const same = await post('/api/reset-password', { email, code, password: oldPwd });
    check('新密码不能与原密码相同', same.status === 400 && /原密码/.test(same.data.error || ''), same);

    /* 8) 正确验证码 + 新密码 → 成功，旧密码失效 */
    const reset = await post('/api/reset-password', { email, code, password: newPwd });
    check('正确验证码修改成功', reset.status === 200 && reset.data.ok, reset.data);
    const oldLogin = await post('/api/login', { username, password: oldPwd });
    check('原密码已失效', oldLogin.status === 401, oldLogin.status);
    const newLogin = await post('/api/login', { username, password: newPwd });
    check('新密码可登录', newLogin.status === 200 && newLogin.data.ok, newLogin.status);
    const reuse = await post('/api/reset-password', { email, code, password: 'Another!2025' });
    check('验证码一次性使用', reuse.status === 400, reuse);

    console.log('\n=== 页面 ===');
    const b = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox'] });
    const p = await b.newPage();
    await p.setViewport({ width: 1440, height: 950 });
    const errs = [];
    p.on('pageerror', e => errs.push(e.message));

    /* 注册页邮箱字段 */
    await p.goto(BASE + '/register', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await sleep(1500);
    const regUi = await p.evaluate(() => ({
        emailInput: !!document.querySelector('input[type="email"]'),
        label: /邮箱/.test(document.body.innerText),
        note: /找回密码/.test(document.body.innerText)
    }));
    check('注册页包含邮箱输入框', regUi.emailInput, regUi);
    check('注册页标注邮箱用途', regUi.label && regUi.note, regUi);

    /* 准备一个 UI 测试账号 */
    const uiUser = 'ui' + stamp;
    const uiEmail = uiUser + '@test.local';
    const cap5 = (await get('/api/captcha')).data;
    const reg2 = await post('/api/register', {
        username: uiUser, email: uiEmail, password: oldPwd,
        captcha: { ...cap5, answer: cap5.a + cap5.b }
    });
    check('准备 UI 测试账号', reg2.status === 200 && reg2.data.ok, reg2.status);

    async function openForgot() {
        const dlg = await p.evaluate(() => !!document.querySelector('.fp-card'));
        if (!dlg) {
            await p.evaluate(() => {
                const link = Array.from(document.querySelectorAll('a')).find(a => /忘记密码/.test(a.textContent));
                if (link) link.click();
            });
            await sleep(500);
        }
    }
    async function typeEmail(emailValue) {
        await p.evaluate(() => { const i = document.querySelector('.fp-card input[type="email"]'); if (i) i.value = ''; });
        await p.type('.fp-card input[type="email"]', emailValue);
    }
    async function clickBtn(text) {
        await p.evaluate((t) => {
            const btn = Array.from(document.querySelectorAll('.fp-card button, .fp-alert button')).find(x => new RegExp(t).test(x.textContent));
            if (btn) btn.click();
        }, text);
    }

    /* 不存在邮箱 → 弹窗提示没有该用户 */
    await p.goto(BASE + '/login', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await sleep(1500);
    await openForgot();
    await typeEmail('nobody' + stamp + '@test.local');
    await clickBtn('下一步');
    await sleep(1200);
    const missUi = await p.evaluate(() => ({
        alert: !!document.querySelector('.fp-alert'),
        text: document.querySelector('.fp-alert-text')?.textContent.trim() || ''
    }));
    check('页面弹窗提示没有该用户', missUi.alert && /没有该用户/.test(missUi.text), missUi);
    await clickBtn('知道了');
    await sleep(400);

    /* 正确邮箱 → 弹窗展示 6 位验证码 */
    await typeEmail(uiEmail);
    await clickBtn('下一步');
    await sleep(1400);
    const codeUi = await p.evaluate(() => ({
        codeText: document.querySelector('.fp-code')?.textContent.trim() || '',
        alert: document.querySelector('.fp-alert-text')?.textContent.trim() || ''
    }));
    check('弹窗生成并展示 6 位验证码', /^\d{6}$/.test(codeUi.codeText), codeUi.codeText);
    check('验证码生成提示为弹窗', /验证码已生成/.test(codeUi.alert), codeUi.alert);
    await clickBtn('知道了');
    await sleep(400);

    /* 输入相同密码 → 弹窗拒绝 */
    const uiCode = codeUi.codeText;
    await p.evaluate((c) => {
        const i = document.querySelector('.fp-card input[inputmode="numeric"]');
        i.value = c;
        i.dispatchEvent(new Event('input', { bubbles: true }));
    }, uiCode);
    const pwInputs = await p.$$('.fp-card input[type="password"]');
    await pwInputs[0].type(oldPwd);
    await pwInputs[1].type(oldPwd);
    await clickBtn('修改密码');
    await sleep(1200);
    const sameUi = await p.evaluate(() => document.querySelector('.fp-alert-text')?.textContent.trim() || '');
    check('页面弹窗提示新密码不能与原密码相同', /原密码/.test(sameUi), sameUi);
    await clickBtn('知道了');
    await sleep(400);

    /* 修改为新密码 → 成功弹窗 */
    await p.evaluate(() => {
        document.querySelectorAll('.fp-card input[type="password"]').forEach(i => {
            i.value = '';
            i.dispatchEvent(new Event('input', { bubbles: true }));
        });
    });
    await pwInputs[0].type(newPwd);
    await pwInputs[1].type(newPwd);
    await clickBtn('修改密码');
    await sleep(1400);
    const successUi = await p.evaluate(() => ({
        text: document.querySelector('.fp-alert-text')?.textContent.trim() || '',
        ok: !!document.querySelector('.fp-alert-ico.ok')
    }));
    check('修改成功提示为弹窗', /修改成功/.test(successUi.text) && successUi.ok, successUi);
    await clickBtn('知道了');
    await sleep(500);
    const closed = await p.evaluate(() => !document.querySelector('.fp-card'));
    check('确认后弹窗关闭', closed);

    const uiLogin = await post('/api/login', { username: uiUser, password: newPwd });
    check('页面修改后的新密码可登录', uiLogin.status === 200 && uiLogin.data.ok, uiLogin.status);

    check('页面无 JS 错误', errs.length === 0, errs.slice(0, 2));
    await b.close();

    console.log('\n========================================');
    console.log(`  通过 ${pass} 项，失败 ${fail} 项`);
    console.log('========================================');
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('异常:', e); process.exit(1); });
