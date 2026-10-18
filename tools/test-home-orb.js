const puppeteer = require('puppeteer-core');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
(async () => {
    const b = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox'] });
    const p = await b.newPage();
    await p.setViewport({ width: 1440, height: 900 });
    await p.goto('http://127.0.0.1:3000/login', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 2500));
    await p.type('input[autocomplete="username"]', 'admin');
    await p.type('input[autocomplete="current-password"]', 'admin123');
    await p.click('button[type="submit"]');
    await new Promise(r => setTimeout(r, 3000));

    const nav = await p.evaluate(() => ({
        count: document.querySelectorAll('.nav-links li').length,
        items: Array.from(document.querySelectorAll('.nav-links li a')).map(a => a.textContent.trim()).join(' / '),
        h: Math.round(document.querySelector('.nav-links')?.getBoundingClientRect().height || 0)
    }));
    console.log('导航项数:', nav.count, '| 单行高度:', nav.h + 'px');
    console.log('导航:', nav.items);

    const entry = await p.evaluate(() => ({
        section: !!document.querySelector('.entry-orb-section'),
        orb: !!document.querySelector('.entry-orb'),
        hint: document.querySelector('.entry-hint')?.textContent.trim() || ''
    }));
    console.log('首页互动星球: 区块', entry.section, '| 星球按钮', entry.orb, '| 提示:', entry.hint);

    // 滚动到该区块截图
    await p.evaluate(() => document.querySelector('.entry-orb-section')?.scrollIntoView({ block: 'center' }));
    await new Promise(r => setTimeout(r, 1200));
    await p.screenshot({ path: 'F:\\天文科普\\shots\\home-orb.png' });

    // 点击星球，检查遮罩 + 跳转
    await p.click('.entry-orb');
    await new Promise(r => setTimeout(r, 260));
    const overlay = await p.evaluate(() => !!document.querySelector('.launch-overlay'));
    console.log('点击后出现穿越遮罩:', overlay);
    await p.screenshot({ path: 'F:\\天文科普\\shots\\home-launch.png' });
    await new Promise(r => setTimeout(r, 2200));
    console.log('跳转后 URL:', p.url());

    await b.close();
    console.log('完成');
})().catch(e => { console.error('异常:', e.message); process.exit(1); });
