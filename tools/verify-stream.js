/**
 * 流式输出验证：
 *  - 回答不是一次性出现：文本长度随时间递增（≥3 个不同阶段）
 *  - 打字过程中有闪烁光标（.ai-cursor）
 *  - 结束后光标消失、级别/来源/工具徽标正常
 *  - 移动端同样生效
 */
const puppeteer = require('F:/天文科普/tools/node_modules/puppeteer-core');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE = process.env.BASE || 'http://127.0.0.1:3001';
const sleep = ms => new Promise(r => setTimeout(r, ms));

let pass = 0, fail = 0;
const check = (n, c, e) => {
    if (c) { pass++; console.log('  [OK] ' + n); }
    else { fail++; console.log('  [FAIL] ' + n + (e !== undefined ? '  -> ' + JSON.stringify(e).slice(0, 240) : '')); }
};

async function streamSamples(p, waitMs = 6000) {
    const samples = [];
    const t0 = Date.now();
    while (Date.now() - t0 < waitMs) {
        const s = await p.evaluate(() => {
            const bots = document.querySelectorAll('.ai-msg.bot');
            const last = bots[bots.length - 1];
            const bubble = last?.querySelector('.ai-bubble');
            return {
                len: (bubble?.textContent || '').length,
                cursor: !!last?.querySelector('.ai-cursor'),
                typing: !!(bubble && bubble.classList.contains('ai-typing')),
                done: !!last && !!bubble && !last.querySelector('.ai-typing') && !last.querySelector('.ai-cursor')
            };
        });
        samples.push({ t: Date.now() - t0, ...s });
        if (s.done && s.len > 10) break;
        await sleep(120);
    }
    return samples;
}

(async () => {
    const b = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox'] });

    for (const mode of ['desktop', 'mobile']) {
        const p = await b.newPage();
        const isMobile = mode === 'mobile';
        await p.setViewport(isMobile
            ? { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }
            : { width: 1440, height: 1000 });
        const errs = [];
        p.on('pageerror', e => errs.push(e.message));

        console.log(`\n=== ${mode} ===`);
        await p.goto(BASE + '/assistant', { waitUntil: 'domcontentloaded', timeout: 45000 });
        await sleep(2200);

        await p.click('.ai-input-row input');
        await p.type('.ai-input-row input', '黑洞是怎么形成的？', { delay: 8 });
        await sleep(100);
        await p.keyboard.press('Enter');

        // 等首字出现（LLM 首 token 通常 0.3~1.5s），在中途截图
        let mid = { len: 0, cursor: false };
        for (let i = 0; i < 30; i++) {
            await sleep(100);
            mid = await p.evaluate(() => {
                const bots = document.querySelectorAll('.ai-msg.bot');
                const last = bots[bots.length - 1];
                return {
                    len: (last?.querySelector('.ai-bubble')?.textContent || '').length,
                    cursor: !!last?.querySelector('.ai-cursor')
                };
            });
            if (mid.len > 10 && mid.cursor) break;
        }
        await p.screenshot({ path: `E:/dsh/stream-${mode}-mid.png` });

        const samples = await streamSamples(p, 15000);
        const final = samples[samples.length - 1];
        const lens = [...new Set(samples.map(s => s.len).filter(n => n > 0))];

        check('回答不是一次性出现（出现 ≥3 个递增长度）', lens.length >= 3, lens.slice(0, 12));
        check('开始输出后可见部分文字（>10 字）', mid.len > 10, mid);
        check('打字过程中出现光标', samples.some(s => s.cursor), samples.filter(s => s.cursor).length);
        check('结束后光标消失', !final.cursor, final);
        check('最终回答完整（>60 字）', final.len > 60, final.len);

        const meta = await p.evaluate(() => {
            const bots = document.querySelectorAll('.ai-msg.bot');
            const last = bots[bots.length - 1];
            return {
                level: last?.querySelector('.ai-level')?.textContent.trim(),
                sources: last?.querySelectorAll('.ai-src').length || 0,
                text: last?.querySelector('.ai-bubble')?.textContent.slice(0, 40)
            };
        });
        check('结束后显示级别标签', /大模型生成|本地知识库检索/.test(meta.level || ''), meta.level);
        check('结束后显示溯源来源', meta.sources >= 1, meta.sources);
        check('回答内容与黑洞相关', /黑洞/.test(meta.text || ''), meta.text);
        check('无 JS 错误', errs.length === 0, errs.slice(0, 2));

        await p.screenshot({ path: `E:/dsh/stream-${mode}-final.png` });
        await p.close();
    }

    await b.close();
    console.log('\n========================================');
    console.log(`  通过 ${pass} 项，失败 ${fail} 项`);
    console.log('========================================');
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('异常:', e); process.exit(1); });
