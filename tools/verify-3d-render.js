// 验证 3D 渲染修复：画布内容亮度 + 截图 + nolog 兜底模式
const puppeteer = require('F:/天文科普/tools/node_modules/puppeteer-core');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const sleep = ms => new Promise(r => setTimeout(r, ms));

let pass = 0, fail = 0;
const check = (n, c, e) => {
    if (c) { pass++; console.log('  [OK] ' + n); }
    else { fail++; console.log('  [FAIL] ' + n + (e !== undefined ? '  -> ' + JSON.stringify(e) : '')); }
};

async function measure(p) {
    return p.evaluate(() => {
        const c = document.querySelector('.flight canvas');
        if (!c) return { err: 'no canvas' };
        const tmp = document.createElement('canvas');
        tmp.width = 240; tmp.height = 150;
        const g = tmp.getContext('2d');
        g.drawImage(c, 0, 0, 240, 150);
        const d = g.getImageData(0, 0, 240, 150).data;
        let sum = 0, max = 0, brightPixels = 0;
        for (let i = 0; i < d.length; i += 4) {
            const v = (d[i] + d[i + 1] + d[i + 2]) / 3;
            sum += v;
            if (v > max) max = v;
            if (v > 30) brightPixels++;
        }
        return {
            avg: Math.round(sum / (d.length / 4)),
            max: Math.round(max),
            brightRatio: +(brightPixels / (d.length / 4)).toFixed(3),
            dataUrlLen: c.toDataURL ? c.toDataURL('image/png').length : 0,
            canvas: c.width + 'x' + c.height
        };
    });
}

(async () => {
    const b = await puppeteer.launch({
        executablePath: EDGE, headless: 'new',
        args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader']
    });
    const p = await b.newPage();
    await p.setViewport({ width: 1440, height: 900 });
    const errs = [];
    p.on('pageerror', e => errs.push(e.message));

    console.log('=== 默认模式（对数深度缓冲） ===');
    await p.goto('http://127.0.0.1:3000/planet-show', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await sleep(2500);
    await p.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => /遨游|3D/.test(b.textContent));
        if (btn) btn.click();
    });
    await sleep(5000);
    const m1 = await measure(p);
    console.log('  ' + JSON.stringify(m1));
    check('画布可读取（preserveDrawingBuffer 生效）', m1.dataUrlLen > 5000, m1.dataUrlLen);
    check('画面有内容（非纯黑）', m1.avg >= 1 && m1.max > 60, m1);
    check('存在明亮像素（太阳/行星）', m1.brightRatio > 0.002, m1.brightRatio);
    await p.screenshot({ path: 'F:/天文科普/shots/3d-fixed.png' });

    console.log('\n=== 兜底模式 ?nolog=1 ===');
    await p.goto('http://127.0.0.1:3000/planet-show?nolog=1', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await sleep(2500);
    await p.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => /遨游|3D/.test(b.textContent));
        if (btn) btn.click();
    });
    await sleep(5000);
    const m2 = await measure(p);
    console.log('  ' + JSON.stringify(m2));
    check('兜底模式同样有画面', m2.avg >= 1 && m2.max > 60, m2);
    await p.screenshot({ path: 'F:/天文科普/shots/3d-fixed-nolog.png' });

    check('无 JS 错误', errs.length === 0, errs.slice(0, 3));

    await b.close();
    console.log('\n========================================');
    console.log(`  通过 ${pass} 项，失败 ${fail} 项`);
    console.log('========================================');
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('异常:', e); process.exit(1); });
