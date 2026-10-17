// 验证：点击才投影 + 各页面嵌入视频 + 无单独视频页
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
    await new Promise(r => setTimeout(r, 2500));

    // 1) 导航栏不含"科普视频"
    const navTxt = await page.evaluate(() => document.querySelector('.nav-links')?.innerText || '');
    console.log('导航栏含"科普视频":', navTxt.includes('科普视频'));

    // 2) 投影页：初始无投影
    await page.goto('http://127.0.0.1:3000/planet-show', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 3000));
    let st = await page.evaluate(() => ({
        empty: !!document.querySelector('.proj-empty'),
        globe: !!document.querySelector('.globe3d'),
        stage: !!document.querySelector('.big-stage')
    }));
    console.log('初始状态 → 提示区:', st.empty, '| 有无投影:', st.globe || st.stage);

    // 3) 点击"地球"后出现大投影 + 详细文字
    await page.evaluate(() => {
        const b = Array.from(document.querySelectorAll('.pick-btn')).find(x => x.textContent.includes('地球'));
        if (b) b.click();
    });
    await new Promise(r => setTimeout(r, 2500));
    st = await page.evaluate(() => {
        const stage = document.querySelector('.big-stage');
        const detail = document.querySelector('.proj-detail');
        const secs = document.querySelectorAll('.proj-detail .intro-desc p').length;
        return {
            globe: !!document.querySelector('.globe3d'),
            stageH: stage ? Math.round(stage.getBoundingClientRect().height) : 0,
            detail: !!detail,
            paras: secs,
            video: !!document.querySelector('.proj-detail ~ .video-section, .video-section')
        };
    });
    console.log('点击后 → 3D球体:', st.globe, '| 投影台高度:', st.stageH + 'px', '| 介绍段落:', st.paras, '| 含视频区:', st.video);
    await page.screenshot({ path: 'F:\\天文科普\\shots\\proj-click.png' });

    // 4) 各页面是否嵌入了视频
    const pages = ['/black-hole', '/stars-galaxies', '/constellations', '/solar-system', '/gallery', '/deep-space', '/timeline', '/detail/planet/mars'];
    for (const p of pages) {
        await page.goto('http://127.0.0.1:3000' + p, { waitUntil: 'domcontentloaded' });
        await new Promise(r => setTimeout(r, 2200));
        const n = await page.evaluate(() => document.querySelectorAll('.video-section video').length);
        console.log(p, '→ 视频数:', n);
    }
    await browser.close();
    console.log('完成');
})().catch(e => { console.error('异常:', e.message); process.exit(1); });
