// 诊断：验证 Vue 前端能否正常加载（避免 PowerShell 编码干扰）
const BASE = 'http://127.0.0.1:3000';

(async () => {
    const idx = await (await fetch(BASE + '/')).text();
    console.log('首页 HTML 字节:', idx.length, '| 含 #app:', idx.includes('id="app"'));

    const jsMatch = idx.match(/src="(\/assets\/[^"]+\.js)"/);
    const cssMatch = idx.match(/href="(\/assets\/index-[^"]+\.css)"/);
    console.log('JS 入口:', jsMatch && jsMatch[1]);
    console.log('CSS 打包:', cssMatch && cssMatch[1]);

    const js = await (await fetch(BASE + (jsMatch[1]))).text();
    console.log('JS 字节:', js.length);
    console.log('JS 是 HTML 回退(错误):', js.includes('<!DOCTYPE'));
    for (const s of ['nav-auth-slot', 'nav-auth-link', '登录', '注册', 'auth-card', 'solar-system', 'SearchOverlay']) {
        console.log('  JS 含 "' + s + '":', js.includes(s));
    }

    // 模拟浏览器加载 main bundle 的依赖（验证是否有明显问题）
    const css = await (await fetch(BASE + (cssMatch[1]))).text();
    console.log('CSS 字节:', css.length, '| 含 nav-auth-slot:', css.includes('nav-auth-slot'));
})().catch(e => console.error('诊断失败:', e.message));
