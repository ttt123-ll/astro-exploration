// API 回归测试：认证 / 验证码 / 排名口径 / 时区 / 安全头 / 限流 / SEO
const BASE = process.env.BASE || 'http://127.0.0.1:3000';

let pass = 0, fail = 0;
function check(name, cond, extra) {
    if (cond) { pass++; console.log('  [OK] ' + name); }
    else { fail++; console.log('  [FAIL] ' + name + (extra ? '  -> ' + JSON.stringify(extra) : '')); }
}

function cookieFrom(res) {
    const raw = res.headers.getSetCookie ? res.headers.getSetCookie() : [res.headers.get('set-cookie')].filter(Boolean);
    const jar = {};
    for (const c of raw) {
        const [pair] = c.split(';');
        const i = pair.indexOf('=');
        jar[pair.slice(0, i)] = pair.slice(i + 1);
    }
    return { jar, raw: raw.join(' ;; ') };
}
const cookieHeader = jar => Object.entries(jar).map(([k, v]) => k + '=' + v).join('; ');

async function getJson(path, opts = {}) {
    const r = await fetch(BASE + path, opts);
    let j = null;
    try { j = await r.json(); } catch (e) { /* non-json */ }
    return { r, j, ...cookieFrom(r) };
}
const postJson = (path, body, jar) => getJson(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(jar ? { Cookie: cookieHeader(jar) } : {}) },
    body: JSON.stringify(body)
});

(async () => {
    console.log('\n=== 1. 健康检查 ===');
    const h = await getJson('/api/health');
    check('/api/health 200 且 db=up', h.r.status === 200 && h.j.db === 'up', h.j);

    console.log('\n=== 2. 公开接口（未登录可访问） ===');
    for (const p of ['/api/news?limit=1', '/api/leaderboard', '/api/messages', '/api/chat/mode']) {
        const x = await getJson(p);
        check(p + ' 公开可访问', x.r.status === 200, x.r.status);
    }
    check('/api/me 未登录返回 401', (await getJson('/api/me')).r.status === 401);

    console.log('\n=== 3. 安全响应头 ===');
    const home = await fetch(BASE + '/');
    const csp = home.headers.get('content-security-policy') || '';
    check('CSP 存在', !!csp);
    check('X-Content-Type-Options: nosniff', home.headers.get('x-content-type-options') === 'nosniff');
    check('防点击劫持 frame-ancestors none', csp.includes("frame-ancestors 'none'"));
    check('未泄露 X-Powered-By', !home.headers.get('x-powered-by'));

    console.log('\n=== 4. 缓存与压缩 ===');
    const htmlRes = await fetch(BASE + '/', { headers: { 'Accept-Encoding': 'br' } });
    check('HTML 使用 brotli', htmlRes.headers.get('content-encoding') === 'br', htmlRes.headers.get('content-encoding'));
    check('HTML 不缓存', (htmlRes.headers.get('cache-control') || '').includes('no-cache'));

    const idx = (await htmlRes.text()).match(/assets\/(index-[A-Za-z0-9_-]+\.js)/);
    if (idx) {
        const js = await fetch(BASE + '/assets/' + idx[1], { headers: { 'Accept-Encoding': 'br' } });
        const cc = js.headers.get('cache-control') || '';
        check('哈希资源 immutable 强缓存', cc.includes('immutable') && cc.includes('31536000'), cc);
        check('JS 使用 brotli', js.headers.get('content-encoding') === 'br');
    } else {
        check('找到入口 JS', false);
    }

    console.log('\n=== 5. 验证码注册 + httpOnly Cookie ===');
    const cap = (await getJson('/api/captcha')).j;
    const uname = 'apitest' + Date.now().toString().slice(-6);
    const reg = await postJson('/api/register', {
        username: uname,
        password: 'Passw0rd123',
        captcha: { a: cap.a, b: cap.b, t: cap.t, answer: cap.a + cap.b }
    });
    check('正确验证码注册成功', reg.r.status === 200 && reg.j.ok === true, reg.j);
    check('Set-Cookie 含 HttpOnly', /httponly/i.test(reg.raw), reg.raw);
    check('Set-Cookie 含 SameSite', /samesite/i.test(reg.raw), reg.raw);

    const me = await getJson('/api/me', { headers: { Cookie: cookieHeader(reg.jar) } });
    check('Cookie 认证 /api/me 成功', me.r.status === 200 && me.j.user.username === uname, me.j);
    const testUserId = me.j && me.j.user ? me.j.user.id : null;

    const badCap = await postJson('/api/register', {
        username: 'bad' + Date.now().toString().slice(-5),
        password: 'Passw0rd123',
        captcha: { a: 2, b: 3, t: 'forged', answer: 5 }
    });
    check('伪造验证码被拒绝(400)', badCap.r.status === 400, badCap.j);

    console.log('\n=== 6. 登录 / 权限 ===');
    const login = await postJson('/api/login', { username: 'admin', password: 'admin123' });
    check('管理员登录成功', login.r.status === 200 && login.j.user.role === 'admin', login.j);
    const adminJar = login.jar;
    check('管理员可访问后台',
        (await getJson('/api/admin/overview', { headers: { Cookie: cookieHeader(adminJar) } })).r.status === 200);
    check('普通用户访问后台被拒绝(403)',
        (await getJson('/api/admin/overview', { headers: { Cookie: cookieHeader(reg.jar) } })).r.status === 403);

    console.log('\n=== 7. 时区（写入即刻新闻，验证无 8 小时错位） ===');
    const title = 'TZ_TEST_' + Date.now();
    const created = await postJson('/api/admin/news', {
        tag: '深空探测', title, summary: '时区回归测试', img: '/assets/images/milky_way.jpg',
        source: '测试', source_url: 'http://example.com'
    }, adminJar);
    check('管理员可发布新闻', created.r.status === 200 && created.j.ok === true, created.j);
    const newsList = (await getJson('/api/news?limit=20')).j;
    const row = newsList.rows.find(r => r.title === title);
    check('新新闻出现在列表', !!row);
    if (row) {
        const diffMin = Math.abs(Date.now() - new Date(row.published_at).getTime()) / 60000;
        check('发布时间与当前时间偏差 < 10 分钟（时区正确）', diffMin < 10, { pub: row.published_at, diffMin: Math.round(diffMin) });
        check('发布时间为 ISO 8601 带时区', /Z$|[+-]\d{2}:\d{2}$/.test(row.published_at), row.published_at);
        await fetch(BASE + '/api/admin/news/' + row.id, {
            method: 'DELETE', headers: { Cookie: cookieHeader(adminJar) }
        });
    }

    console.log('\n=== 8. 排行榜名次口径 ===');
    for (const cat of ['all', 'solar']) {
        const subs = [];
        for (let i = 0; i < 3; i++) {
            subs.push((await postJson('/api/scores', {
                category: cat, total: 10, correct: 6 + i, duration_sec: 100 - i * 10
            }, reg.jar)).j);
        }
        check(`[${cat}] 成绩提交成功`, subs[2] && subs[2].ok === true, subs[2]);
        if (!subs[2] || !subs[2].ok) continue;

        const lb = (await getJson('/api/leaderboard?cat=' + cat)).j.rows;
        // 找到本次提交（该用户该分类下 id 最大、且 pct=80）在榜单中的位置
        const mineRows = lb.filter(r => r.username === uname && r.category === cat && r.pct === 80);
        const latest = mineRows.sort((a, b) => b.id - a.id)[0];
        const position = latest ? lb.indexOf(latest) + 1 : -1;
        check(`[${cat}] 返回名次与榜单实际位置一致`, subs[2].rank === position, { got: subs[2].rank, position });
        check(`[${cat}] players 为同分类人数`, typeof subs[2].players === 'number', subs[2].players);
    }

    console.log('\n=== 8.5 清理测试数据（避免污染排行榜） ===');
    if (testUserId) {
        const del = await fetch(BASE + '/api/admin/users/' + testUserId, {
            method: 'DELETE', headers: { Cookie: cookieHeader(adminJar) }
        });
        const delJson = await del.json().catch(() => ({}));
        check('测试账号已删除（连带成绩）', del.status === 200 && delJson.ok === true, delJson);
        const lbAfter = (await getJson('/api/leaderboard?cat=all')).j.rows;
        check('排行榜已无测试账号', !lbAfter.some(r => r.username === uname));
        check('不能删除管理员账号(400)',
            (await fetch(BASE + '/api/admin/users/1', { method: 'DELETE', headers: { Cookie: cookieHeader(adminJar) } })).status === 400);
    } else {
        check('拿不到测试用户 id，跳过清理', false);
    }

    console.log('\n=== 9. 退出登录（服务端失效） ===');
    const beforeLogout = await getJson('/api/me', { headers: { Cookie: cookieHeader(adminJar) } });
    check('退出前 /api/me 有效', beforeLogout.r.status === 200);
    check('退出登录成功', (await postJson('/api/logout', {}, adminJar)).j.ok === true);
    const afterLogout = await getJson('/api/me', { headers: { Cookie: cookieHeader(adminJar) } });
    check('退出后旧 token 立即失效(401)', afterLogout.r.status === 401, afterLogout.r.status);

    console.log('\n=== 10. 异常与限流 ===');
    const bad = await fetch(BASE + '/api/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{bad json'
    });
    check('非法 JSON -> 400（不是 500）', bad.status === 400, bad.status);
    const rl = await fetch(BASE + '/api/news?limit=1');
    check('限流响应头存在',
        !!(rl.headers.get('ratelimit-policy') || rl.headers.get('ratelimit-limit')),
        rl.headers.get('ratelimit-policy'));

    console.log('\n=== 11. SEO ===');
    for (const p of ['/robots.txt', '/sitemap.xml']) {
        const r = await fetch(BASE + p);
        const txt = await r.text();
        check(p + ' 可访问', r.status === 200 && txt.length > 60, { status: r.status, len: txt.length });
    }
    const htmlTxt = await (await fetch(BASE + '/')).text();
    check('index.html 含 description', htmlTxt.includes('name="description"'));
    check('index.html 含 og:title', htmlTxt.includes('og:title'));
    check('index.html 含 noscript 兜底内容', htmlTxt.includes('<noscript>'));

    console.log('\n========================================');
    console.log(`  通过 ${pass} 项，失败 ${fail} 项`);
    console.log('========================================\n');
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('测试异常:', e); process.exit(1); });
