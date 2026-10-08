// 后端 API 端到端测试（Node 24 自带 fetch）
const BASE = 'http://127.0.0.1:3000';
let pass = 0, fail = 0;
function ok(name, cond, extra = '') {
    if (cond) { pass++; console.log('  ✓ ' + name + ' ' + extra); }
    else { fail++; console.log('  ✗ ' + name + ' ' + extra); }
}
async function j(method, path, body, token) {
    const r = await fetch(BASE + path, {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: 'Bearer ' + token } : {})
        },
        body: body ? JSON.stringify(body) : undefined
    });
    let data = null;
    try { data = await r.json(); } catch (e) {}
    return { status: r.status, data };
}

(async () => {
    console.log('== 后端端到端测试 ==');

    // 注册
    let r = await j('POST', '/api/register', { username: 'vue_user', password: '123456' });
    ok('注册', r.data && r.data.ok, JSON.stringify(r.data));
    const utoken = r.data && r.data.token;

    // 重复注册
    r = await j('POST', '/api/register', { username: 'vue_user', password: '123456' });
    ok('重复注册被拒(409)', r.status === 409);

    // 登录（管理员）
    r = await j('POST', '/api/login', { username: 'admin', password: 'admin123' });
    ok('管理员登录', r.data && r.data.ok);
    const atoken = r.data && r.data.token;

    // 错误密码
    r = await j('POST', '/api/login', { username: 'admin', password: 'bad' });
    ok('错误密码被拒(401)', r.status === 401);

    // me
    r = await j('GET', '/api/me', null, utoken);
    ok('me 返回用户', r.data && r.data.user && r.data.user.username === 'vue_user');

    // 上传成绩
    r = await j('POST', '/api/scores', { category: 'solar', total: 20, correct: 17, duration_sec: 200 }, utoken);
    ok('上传成绩', r.data && r.data.ok, 'rank=' + (r.data && r.data.rank));
    await j('POST', '/api/scores', { category: 'cosmos', total: 20, correct: 10, duration_sec: 300 }, utoken);

    // 排行榜
    r = await j('GET', '/api/leaderboard?cat=solar');
    ok('排行榜包含 vue_user', r.data && r.data.rows.some(x => x.username === 'vue_user'));

    // 我的成绩
    r = await j('GET', '/api/my-scores', null, utoken);
    ok('我的成绩 >=1', r.data && r.data.rows && r.data.rows.length >= 1);

    // 留言
    r = await j('POST', '/api/messages', { content: 'Vue 系统留言测试' }, utoken);
    ok('发留言', r.data && r.data.ok);
    r = await j('GET', '/api/messages?page=1');
    ok('留言列表包含内容', r.data && r.data.rows.some(x => x.content.includes('Vue 系统留言测试')));

    // 访问统计
    r = await j('POST', '/api/visit', { path: '/home' });
    ok('记录访问', r.data && r.data.ok);

    // 后台概览
    r = await j('GET', '/api/admin/overview', null, atoken);
    ok('后台概览', r.data && r.data.ok && 'users' in r.data.stats && Array.isArray(r.data.trend) && Array.isArray(r.data.pages));

    // 后台用户/成绩/留言列表
    r = await j('GET', '/api/admin/users', null, atoken);
    ok('后台用户列表', r.data && r.data.ok && r.data.rows.some(x => x.username === 'vue_user'));
    r = await j('GET', '/api/admin/messages', null, atoken);
    ok('后台留言列表', r.data && r.data.ok && r.data.rows.length >= 1);

    // 权限校验
    r = await j('GET', '/api/admin/overview', null, utoken);
    ok('普通用户访问后台被拒(403)', r.status === 403);
    r = await j('GET', '/api/me');
    ok('未登录访问 me 被拒(401)', r.status === 401);

    // 管理员删除留言
    const [msgList] = [await j('GET', '/api/admin/messages', null, atoken)];
    const mid = msgList.data.rows.find(x => x.content.includes('Vue 系统留言测试')).id;
    r = await j('DELETE', '/api/admin/messages/' + mid, null, atoken);
    ok('删除留言', r.data && r.data.ok);

    console.log(`\n结果: ${pass} 通过, ${fail} 失败`);
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('测试异常:', e); process.exit(1); });
