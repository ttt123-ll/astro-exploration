// 验证：登录页无导航栏，登录后导航栏出现
const puppeteer = require('puppeteer-core');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

(async () => {
    const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    await page.goto('http://127.0.0.1:3000/login', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 2500));
    const before = await page.evaluate(() => !!document.querySelector('.navbar'));
    const beforeLinks = await page.evaluate(() => !!Array.from(document.querySelectorAll('a')).find(a => a.textContent.trim() === '太阳系行星'));
    console.log('登录页 有导航栏:', before, '| 有「太阳系行星」链接:', beforeLinks);

    await page.type('input[autocomplete="username"]', 'admin');
    await page.type('input[autocomplete="current-password"]', 'admin123');
    await page.click('button[type="submit"]');
    await new Promise(r => setTimeout(r, 3000));
    const after = await page.evaluate(() => !!document.querySelector('.navbar'));
    const afterLinks = await page.evaluate(() => !!Array.from(document.querySelectorAll('a')).find(a => a.textContent.trim() === '太阳系行星'));
    const txt = await page.evaluate(() => document.body.innerText);
    console.log('登录后 URL:', page.url());
    console.log('登录后 有导航栏:', after, '| 有「太阳系行星」链接:', afterLinks);
    console.log('登录后 显示首页内容:', txt.includes('探索') || txt.includes('宇宙'));

    await browser.close();
    console.log('测试完成');
})().catch(e => { console.error('异常:', e.message); process.exit(1); });
