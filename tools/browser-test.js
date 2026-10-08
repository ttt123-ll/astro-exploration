// 用真实 Edge 浏览器自动化：打开首页，点击「登录」，观察 URL 和页面内容
const puppeteer = require('puppeteer-core');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

(async () => {
    const browser = await puppeteer.launch({
        executablePath: EDGE,
        headless: 'new',
        args: ['--no-sandbox', '--disable-gpu']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    const errors = [];
    page.on('pageerror', e => errors.push('pageerror: ' + e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

    await page.goto('http://127.0.0.1:3000/', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await new Promise(r => setTimeout(r, 4000)); // 等 Vue 挂载 + 视频背景加载
    console.log('首页标题:', await page.title());
    console.log('初始 URL:', page.url());
    console.log('初始滚动Y:', await page.evaluate(() => window.scrollY));

    // 找登录链接并点击
    const loginHref = await page.evaluate(() => {
        const els = Array.from(document.querySelectorAll('a'));
        const l = els.find(a => a.textContent.includes('登录'));
        return l ? { href: l.getAttribute('href'), text: l.textContent.trim() } : null;
    });
    console.log('登录链接:', JSON.stringify(loginHref));

    // 点击登录
    const clicked = await page.evaluate(() => {
        const els = Array.from(document.querySelectorAll('a'));
        const l = els.find(a => a.textContent.trim() === '登录');
        if (l) { l.click(); return true; }
        return false;
    });
    console.log('已点击登录:', clicked);
    await new Promise(r => setTimeout(r, 3000));
    console.log('点击后 URL:', page.url());
    console.log('点击后滚动Y:', await page.evaluate(() => window.scrollY));
    const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 300));
    console.log('点击后 body 文本前300字:', JSON.stringify(bodyText));
    console.log('登录页含"欢迎回来":', await page.evaluate(() => document.body.innerText.includes('欢迎回来')));
    console.log('登录页含用户名输入框:', await page.evaluate(() => !!document.querySelector('input[autocomplete="username"]')));

    // 直接刷新 /login（模拟直接访问）
    await page.goto('http://127.0.0.1:3000/login', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 3500));
    console.log('\n直接访问 /login 后:');
    console.log('  URL:', page.url());
    console.log('  含"欢迎回来":', await page.evaluate(() => document.body.innerText.includes('欢迎回来')));
    console.log('  含用户名输入框:', await page.evaluate(() => !!document.querySelector('input[autocomplete="username"]')));

    console.log('\n页面 JS 错误:');
    errors.forEach(e => console.log('  ' + e));
    if (!errors.length) console.log('  (无)');

    await browser.close();
})().catch(e => { console.error('测试异常:', e.message); process.exit(1); });
