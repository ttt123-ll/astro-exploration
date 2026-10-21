// 验证 3D 跃迁卡死修复：点击天体后画面正常、复位可用、R 键可用
const puppeteer = require('F:/天文科普/tools/node_modules/puppeteer-core');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE = 'http://127.0.0.1:3000';
const sleep = ms => new Promise(r => setTimeout(r, ms));

let pass = 0, fail = 0;
const check = (n, c, e) => {
    if (c) { pass++; console.log('  [OK] ' + n); }
    else { fail++; console.log('  [FAIL] ' + n + (e !== undefined ? '  -> ' + JSON.stringify(e) : '')); }
};

const brightness = p => p.evaluate(() => {
    const c = document.querySelector('.flight canvas');
    const tmp = document.createElement('canvas');
    tmp.width = 160; tmp.height = 100;
    const g = tmp.getContext('2d');
    g.drawImage(c, 0, 0, 160, 100);
    const d = g.getImageData(0, 0, 160, 100).data;
    let sum = 0, max = 0;
    for (let i = 0; i < d.length; i += 4) { const v = (d[i] + d[i + 1] + d[i + 2]) / 3; sum += v; if (v > max) max = v; }
    return { avg: Math.round(sum / (d.length / 4)), max: Math.round(max) };
});

const state = p => p.evaluate(() => ({
    overlayOn: document.querySelector('.warp-overlay')?.classList.contains('on') || false,
    panel: !!document.querySelector('.body-panel'),
    hudSpeed: document.querySelector('.hud .speed')?.textContent.trim() || '',
    hint: document.querySelector('.hud-hint')?.textContent.trim() || ''
}));

(async () => {
    const b = await puppeteer.launch({
        executablePath: EDGE, headless: 'new',
        args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader']
    });
    const p = await b.newPage();
    await p.setViewport({ width: 1440, height: 900 });
    const errs = [];
    p.on('pageerror', e => errs.push(e.message));

    await p.goto(BASE + '/planet-show', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await sleep(2500);
    await p.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => /遨游|3D/.test(b.textContent));
        if (btn) btn.click();
    });
    await sleep(4500);

    const init = await brightness(p);
    check('初始画面有内容', init.avg > 5 && init.max > 100, init);

    // 进场会做一次跃迁动画；软件渲染下耗时更久，轮询等待其结束
    let introCleared = false;
    for (let i = 0; i < 16; i++) {
        const s = await state(p);
        if (!s.overlayOn) { introCleared = true; break; }
        await sleep(1000);
    }
    check('进场跃迁结束后遮罩自动收起', introCleared, await state(p));

    // 点击地球标签 → 飞掠
    await p.evaluate(() => {
        const el = Array.from(document.querySelectorAll('.planet-label')).find(x => x.textContent.includes('地球'));
        if (el) el.click();
    });
    await sleep(4000);
    const afterWarp = await state(p);
    const afterBright = await brightness(p);
    check('飞掠后遮罩已收起（关键修复）', !afterWarp.overlayOn, afterWarp);
    check('飞掠后信息面板打开', afterWarp.panel, afterWarp);
    check('飞掠后画面正常（非纯黑）', afterBright.max > 80, afterBright);
    await p.screenshot({ path: 'F:/天文科普/shots/fix-3d-warped.png' });

    // 点击复位
    await p.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => /复位/.test(b.textContent));
        if (btn) btn.click();
    });
    await sleep(2500);
    const afterReset = await state(p);
    const resetBright = await brightness(p);
    check('复位后面板关闭', !afterReset.panel, afterReset);
    check('复位后遮罩关闭', !afterReset.overlayOn, afterReset);
    check('复位后回到初始视角（画面变亮，能看到太阳）', resetBright.avg > 5, resetBright);
    await p.screenshot({ path: 'F:/天文科普/shots/fix-3d-reset.png' });

    // R 键复位
    await p.evaluate(() => {
        const el = Array.from(document.querySelectorAll('.planet-label')).find(x => x.textContent.includes('地球'));
        if (el) el.click();
    });
    await sleep(3500);
    await p.keyboard.press('r');
    await sleep(2000);
    const afterR = await state(p);
    check('R 键也能复位（面板关闭）', !afterR.panel, afterR);
    check('R 键复位后遮罩关闭', !afterR.overlayOn, afterR);

    check('HUD 提示含 R 复位', afterR.hint.includes('R 复位'), afterR.hint);
    check('无 JS 错误', errs.length === 0, errs.slice(0, 3));

    await b.close();
    console.log('\n========================================');
    console.log(`  通过 ${pass} 项，失败 ${fail} 项`);
    console.log('========================================');
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('异常:', e); process.exit(1); });
