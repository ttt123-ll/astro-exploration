/**
 * 免 Docker 演示模式验证（DEMO_MODE=1，不连 MySQL）
 *  - 页面可访问；健康检查通过且标记 demo
 *  - 新闻用内置数据；账号/社区返回友好降级
 *  - AI 助手可用（离线知识库），聊天接口正常
 */
const { spawn } = require('child_process');
const BASE = 'http://127.0.0.1:3002';

let pass = 0, fail = 0;
const check = (n, c, e) => {
    if (c) { pass++; console.log('  [OK] ' + n); }
    else { fail++; console.log('  [FAIL] ' + n + (e !== undefined ? '  -> ' + JSON.stringify(e).slice(0, 200) : '')); }
};
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
    const child = spawn(process.execPath, ['server/index.js'], {
        cwd: 'F:/天文科普',
        env: { ...process.env, DEMO_MODE: '1', PORT: '3002', NO_OPEN: '1', NODE_ENV: 'production' },
        stdio: 'ignore'
    });

    try {
        // 等端口就绪
        let ready = false;
        for (let i = 0; i < 40; i++) {
            await sleep(400);
            try {
                const r = await fetch(BASE + '/api/health');
                if (r.ok) { ready = true; break; }
            } catch (e) { /* 继续等 */ }
        }
        check('演示模式服务启动', ready);

        const health = await (await fetch(BASE + '/api/health')).json();
        check('健康检查通过且标记 demo', health.ok === true && health.mode === 'demo' && health.db === 'disabled', health);

        const home = await fetch(BASE + '/');
        check('首页可访问', home.status === 200);

        const news = await (await fetch(BASE + '/api/news')).json();
        check('新闻使用内置数据', news.ok === true && news.demo === true && Array.isArray(news.rows) && news.rows.length > 10, news.rows && news.rows.length);
        check('新闻含标签统计', Array.isArray(news.tags) && news.tags.length > 0, news.tags && news.tags.length);

        const me = await (await fetch(BASE + '/api/me')).json();
        check('账号接口降级为游客', me.ok === true && me.user === null && me.demo === true, me);

        const board = await (await fetch(BASE + '/api/leaderboard')).json();
        check('社区接口友好降级', board.ok === true && board.demo === true, board);

        const mode = await (await fetch(BASE + '/api/chat/mode')).json();
        check('AI 助手可用（离线知识库）', mode.ok === true && Array.isArray(mode.levels), mode.mode);

        const chatRes = await fetch(BASE + '/api/chat', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: '光年是什么单位？', audience: 'amateur' })
        });
        const chat = await chatRes.json();
        check('AI 问答返回内容', chat.ok === true && (chat.reply || '').length > 10, (chat.reply || '').slice(0, 50));
        check('AI 问答带溯源来源', Array.isArray(chat.sources) && chat.sources.length >= 1, chat.sources && chat.sources.length);

        const streamRes = await fetch(BASE + '/api/chat/stream', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: '黑洞是什么？', audience: 'amateur' })
        });
        check('流式接口可用', streamRes.status === 200 && (streamRes.headers.get('content-type') || '').includes('event-stream'));
        const text = await streamRes.text();
        check('流式返回 delta 与 done', text.includes('"type":"delta"') && text.includes('"type":"done"'));
    } finally {
        child.kill('SIGTERM');
        await sleep(800);
        try { child.kill('SIGKILL'); } catch (e) { /* 已退出 */ }
    }

    console.log('\n========================================');
    console.log(`  通过 ${pass} 项，失败 ${fail} 项`);
    console.log('========================================');
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('异常:', e); process.exit(1); });
