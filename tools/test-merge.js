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
        hasFlight: (document.querySelector('.nav-links')?.innerText || '').includes('遨游太空'),
        h: Math.round(document.querySelector('.nav-links')?.getBoundingClientRect().height || 0)
    }));
    console.log('导航项数:', nav.count, '| 含"遨游太空":', nav.hasFlight, '| 单行高度:', nav.h + 'px');
    console.log('导航:', nav.items);

    // 星球投影页
    await p.goto('http://127.0.0.1:3000/planet-show', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 2800));
    const st = await p.evaluate(() => ({
        switch: document.querySelectorAll('.mode-switch button').length,
        active: document.querySelector('.mode-switch button.active')?.textContent.trim() || '',
        proj: !!document.querySelector('.proj-page'),
        flight: !!document.querySelector('.flight')
    }));
    console.log('模式切换按钮:', st.switch, '| 当前:', st.active, '| 投影可见:', st.proj, '| 3D可见:', st.flight);

    // 切到 3D 遨游
    await p.evaluate(() => {
        const bs = Array.from(document.querySelectorAll('.mode-switch button'));
        const t = bs.find(x => x.textContent.includes('3D'));
        if (t) t.click();
    });
    await new Promise(r => setTimeout(r, 3500));
    const st2 = await p.evaluate(() => ({
        active: document.querySelector('.mode-switch button.active')?.textContent.trim() || '',
        canvas: !!document.querySelector('.flight canvas'),
        webgl: !!(document.querySelector('.flight canvas')?.getContext('webgl2')),
        hud: document.querySelectorAll('.flight .hud').length,
        near: document.querySelector('.flight .hud-tl .v.accent')?.textContent || ''
    }));
    console.log('切换后:', st2.active, '| Canvas:', st2.canvas, '| WebGL:', st2.webgl, '| HUD:', st2.hud, '| 最近:', st2.near);
    await p.screenshot({ path: 'F:\\天文科普\\shots\\merged-flight.png' });

    // 旧地址重定向
    await p.goto('http://127.0.0.1:3000/space-flight', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 2500));
    console.log('/space-flight 重定向到:', p.url());

    await b.close();
    console.log('完成');
})().catch(e => { console.error('异常:', e.message); process.exit(1); });
