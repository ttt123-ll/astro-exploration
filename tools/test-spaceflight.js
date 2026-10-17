// 验证「遨游太空」页：canvas 渲染 + HUD + 交互
const puppeteer = require('puppeteer-core');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

(async () => {
    const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto('http://127.0.0.1:3000/login', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 2500));
    await page.type('input[autocomplete="username"]', 'admin');
    await page.type('input[autocomplete="current-password"]', 'admin123');
    await page.click('button[type="submit"]');
    await new Promise(r => setTimeout(r, 3000));

    // 导航栏含"遨游太空"且单行
    const nav = await page.evaluate(() => ({
        has: (document.querySelector('.nav-links')?.innerText || '').includes('遨游太空'),
        h: Math.round(document.querySelector('.nav-links')?.getBoundingClientRect().height || 0)
    }));
    console.log('导航含"遨游太空":', nav.has, '| 链接区高度:', nav.h + 'px');

    await page.goto('http://127.0.0.1:3000/space-flight', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 3500));

    const st = await page.evaluate(() => {
        const cv = document.querySelector('.flight canvas');
        let gl = null;
        try { gl = cv.getContext('webgl2') || cv.getContext('webgl'); } catch (e) {}
        return {
            canvas: !!cv,
            w: cv?.width, h: cv?.height,
            webgl: !!gl,
            loading: !!document.querySelector('.flight-loading'),
            hud: document.querySelectorAll('.hud').length,
            nearest: document.querySelector('.hud-tl .hud-row .v.accent')?.textContent || '',
            speed: document.querySelector('.hud-tr .v.speed')?.textContent || '',
            clock: document.querySelector('.hud-tr .v.small')?.textContent || '',
            buttons: document.querySelectorAll('.ctl-btn').length,
            bodies: document.querySelectorAll('.ctl-select option').length - 1
        };
    });
    console.log('Canvas:', st.canvas, st.w + 'x' + st.h, '| WebGL:', st.webgl, '| 加载中:', st.loading);
    console.log('HUD 面板:', st.hud, '| 最近天体:', st.nearest, '| 速度:', st.speed, '| 星历:', st.clock);
    console.log('控制按钮:', st.buttons, '| 可跃迁天体:', st.bodies);

    await page.screenshot({ path: 'F:\\天文科普\\shots\\spaceflight.png' });

    // 测试加速：按住 W 后速度应变化
    const before = st.speed;
    await page.keyboard.down('w');
    await new Promise(r => setTimeout(r, 1500));
    await page.keyboard.up('w');
    await new Promise(r => setTimeout(r, 300));
    const after = await page.evaluate(() => document.querySelector('.hud-tr .v.speed')?.textContent || '');
    console.log('加速测试: 速度', before, '→', after, before !== after ? '✅ 生效' : '❌ 未变化');

    // 测试跃迁到木星（带跃迁动画，需要等待）
    await page.evaluate(() => {
        const sel = document.querySelector('.ctl-select');
        sel.value = 'jupiter';
        sel.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await new Promise(r => setTimeout(r, 650));
    await page.screenshot({ path: 'F:\\天文科普\\shots\\spaceflight-warp.png' });
    console.log('已截取跃迁过程截图');
    await new Promise(r => setTimeout(r, 3600));
    const near = await page.evaluate(() => document.querySelector('.hud-tl .hud-row .v.accent')?.textContent || '');
    console.log('跃迁到木星后最近天体:', near, near.includes('木星') ? '✅' : '❌');
    await page.screenshot({ path: 'F:\\天文科普\\shots\\spaceflight-jupiter.png' });

    await browser.close();
    console.log('完成');
})().catch(e => { console.error('异常:', e.message); process.exit(1); });
