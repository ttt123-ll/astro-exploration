// 验证视频背景按需加载：首屏只应请求 1 段视频，而不是全部 4 段
const puppeteer = require('puppeteer-core');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE = process.env.BASE || 'http://127.0.0.1:3000';

(async () => {
    const b = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox'] });
    const p = await b.newPage();
    await p.setViewport({ width: 1440, height: 900 });
    await p.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await new Promise(r => setTimeout(r, 4000));

    const info = await p.evaluate(() => {
        const vids = Array.from(document.querySelectorAll('video'));
        const reqs = performance.getEntriesByType('resource')
            .filter(r => /\/assets\/videos\//.test(r.name));
        return {
            videoCount: vids.length,
            preloadAuto: vids.filter(v => v.preload === 'auto').length,
            preloadNone: vids.filter(v => v.preload === 'none').length,
            videoRequests: reqs.length,
            bytes: reqs.reduce((s, r) => s + (r.transferSize || 0), 0)
        };
    });

    console.log('video 元素数:', info.videoCount);
    console.log('preload=auto:', info.preloadAuto, '| preload=none:', info.preloadNone);
    console.log('实际请求视频数:', info.videoRequests, '（含 range 分段请求，仅作参考）');
    console.log(info.preloadAuto <= 1 && info.preloadNone >= 3
        ? '✅ 按需加载生效（仅 1 段 auto，其余 none）'
        : '❌ 多段视频仍在预加载');

    await b.close();
})().catch(e => { console.error('异常:', e.message); process.exit(1); });
