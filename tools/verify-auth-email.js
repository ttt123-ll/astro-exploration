/**
 * 注册绑定邮箱 + 忘记密码（邮箱验证码）验证
 *  - 接口：注册必须邮箱、邮箱格式/重复校验、发送验证码、错误码、重置密码、旧密码失效
 *  - 页面：注册页有邮箱字段；登录页「忘记密码」弹窗完成发送/重置流程
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

    /* 1) 缺邮箱 */
    const noEmail = await post('/api/register', {
        username, password: oldPwd, captcha: { ...cap, answer: cap.a + cap.b }
    });
    check('注册必须填写邮箱', noEmail.status === 400 && /邮箱/.test(noEmail.data.error || ''), noEmail);

    /* 2) 邮箱格式错误 */
    const cap2 = (await get('/api/captcha')).data;
    const badEmail = await post('/api/register', {
        username, email: 'not-an-email', password: oldPwd, captcha: { ...cap2, answer: cap2.a + cap2.b }
    });
    check('邮箱格式校验', badEmail.status === 400 && /邮箱/.test(badEmail.data.error || ''), badEmail);

    /* 3) 正常注册并绑定邮箱 */
    const cap3 = (await get('/api/captcha')).data;
    const reg = await post('/api/register', {
        username, email, password: oldPwd, captcha: { ...cap3, answer: cap3.a + cap3.b }
    });
    check('注册成功并返回绑定邮箱', reg.status === 200 && reg.data.ok && reg.data.user.email === email, reg.data.user);
    const token = reg.data.token;

    /* 4) 邮箱重复 */
    const cap4 = (await get('/api/captcha')).data;
    const dup = await post('/api/register', {
        username: username + 'x', email, password: oldPwd, captcha: { ...cap4, answer: cap4.a + cap4.b }
    });
    check('同一邮箱不可重复绑定', dup.status === 409 && /邮箱/.test(dup.data.error || ''), dup);

    /* 5) /me 返回邮箱 */
    const me = await get('/api/me');
    const meWithToken = await (await fetch(BASE + '/api/me', { headers: { Cookie: 'astro_token=' + token } })).json();
    check('/me 返回绑定邮箱', meWithToken.ok && meWithToken.user.email === email, meWithToken.user);
    void me;

    /* 6) 发送验证码 */
    const forgot = await post('/api/forgot-password', { email });
    check('发送验证码成功', forgot.status === 200 && forgot.data.ok, forgot.data);
    check('未配置 SMTP 时返回开发模式验证码', forgot.data.dev === true && /^\d{6}$/.test(forgot.data.devCode || ''), forgot.data);
    const devCode = forgot.data.devCode;

    /* 7) 60 秒内重复发送被限流 */
    const again = await post('/api/forgot-password', { email });
    check('重复发送触发限流', again.status === 429, again);

    /* 8) 错误验证码 */
    const wrong = await post('/api/reset-password', { email, code: '000000', password: newPwd });
    check('错误验证码被拒绝', wrong.status === 400 && /验证码/.test(wrong.data.error || ''), wrong);

    /* 9) 正确验证码重置 */
    const reset = await post('/api/reset-password', { email, code: devCode, password: newPwd });
    check('正确验证码重置成功', reset.status === 200 && reset.data.ok, reset.data);

    /* 10) 旧密码失效 / 新密码可登录 */
    const oldLogin = await post('/api/login', { username, password: oldPwd });
    check('旧密码已失效', oldLogin.status === 401, oldLogin);
    const newLogin = await post('/api/login', { username, password: newPwd });
    check('新密码可登录', newLogin.status === 200 && newLogin.data.ok, newLogin.status);

    /* 11) 验证码不可复用 */
    const reuse = await post('/api/reset-password', { email, code: devCode, password: 'Another!2025' });
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

    /* 登录页 → 忘记密码弹窗 → 发送验证码 */
    const email2 = 'ui' + stamp + '@test.local';
    const cap5 = (await get('/api/captcha')).data;
    const reg2 = await post('/api/register', {
        username: 'ui' + stamp, email: email2, password: oldPwd,
        captcha: { ...cap5, answer: cap5.a + cap5.b }
    });
    check('准备 UI 测试账号', reg2.status === 200 && reg2.data.ok, reg2.status);

    await p.goto(BASE + '/login', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await sleep(1500);
    await p.evaluate(() => {
        const link = Array.from(document.querySelectorAll('a')).find(a => /忘记密码/.test(a.textContent));
        if (link) link.click();
    });
    await sleep(500);
    const dialog = await p.evaluate(() => ({
        card: !!document.querySelector('.fp-card'),
        title: document.querySelector('.fp-title')?.textContent.trim() || ''
    }));
    check('点击「忘记密码」打开弹窗', dialog.card && /找回密码/.test(dialog.title), dialog);

    await p.type('.fp-card input[type="email"]', email2);
    await p.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('.fp-card button')).find(x => /发送验证码/.test(x.textContent));
        if (btn) btn.click();
    });
    await sleep(1800);
    const sent = await p.evaluate(() => ({
        dev: document.querySelector('.fp-dev')?.textContent.trim() || '',
        step2: !!document.querySelector('.fp-card input[inputmode="numeric"]')
    }));
    check('弹窗发送验证码并进入第二步', sent.step2, sent);
    check('开发模式验证码显示在弹窗', /开发模式验证码/.test(sent.dev) && /\d{6}/.test(sent.dev), sent.dev);

    const codeFromUi = (sent.dev.match(/\d{6}/) || [])[0];
    await p.type('.fp-card input[inputmode="numeric"]', codeFromUi);
    const pwInputs = await p.$$('.fp-card input[type="password"]');
    await pwInputs[0].type(newPwd);
    await pwInputs[1].type(newPwd);
    await p.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('.fp-card button')).find(x => /重置密码/.test(x.textContent));
        if (btn) btn.click();
    });
    await sleep(1800);
    const closed = await p.evaluate(() => !document.querySelector('.fp-card'));
    check('重置成功后弹窗关闭', closed);

    const uiLogin = await post('/api/login', { username: 'ui' + stamp, password: newPwd });
    check('UI 重置后的新密码可登录', uiLogin.status === 200 && uiLogin.data.ok, uiLogin.status);

    check('页面无 JS 错误', errs.length === 0, errs.slice(0, 2));
    await b.close();

    console.log('\n========================================');
    console.log(`  通过 ${pass} 项，失败 ${fail} 项`);
    console.log('========================================');
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('异常:', e); process.exit(1); });
