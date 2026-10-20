// 生成网站截图：静态网站页面 → PNG（用于作品说明文档配图）
const http = require('http');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const ROOT = 'F:\\rj\\sxy\\天文12website';
const OUT = 'E:\\astro-vue\\shots';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 8899;

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css', '.js': 'text/javascript', '.jpg': 'image/jpeg',
    '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2',
    '.woff': 'font/woff', '.ttf': 'font/ttf'
};

function serve() {
    http.createServer((req, res) => {
        let p = decodeURIComponent(req.url.split('?')[0]);
        if (p === '/') p = '/index.html';
        const file = path.join(ROOT, p);
        if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
            res.writeHead(404); res.end('not found'); return;
        }
        res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' });
        fs.createReadStream(file).pipe(res);
    }).listen(PORT, () => console.log('静态服务: http://127.0.0.1:' + PORT));
}

const PAGES = [
    ['index.html', 'home', '首页'],
    ['solar-system.html', 'solar', '太阳系行星'],
    ['stars-galaxies.html', 'stars', '恒星与星系'],
    ['black-hole.html', 'blackhole', '黑洞科普'],
    ['constellations.html', 'constellations', '四季星座'],
    ['gallery.html', 'gallery', '星空图集'],
    ['quiz.html', 'quiz', '知识测验'],
    ['explore.html', 'explore', '探索工具']
];

(async () => {
    fs.mkdirSync(OUT, { recursive: true });
    serve();
    await new Promise(r => setTimeout(r, 800));

    const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 1500 });

    for (const [file, name] of PAGES) {
        await page.goto(`http://127.0.0.1:${PORT}/${file}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await new Promise(r => setTimeout(r, 2200)); // 等动画/图片
        await page.evaluate(() => window.scrollTo(0, 0));
        await new Promise(r => setTimeout(r, 300));
        const out = path.join(OUT, name + '.png');
        await page.screenshot({ path: out });  // 视口截图
        console.log('已截图:', name + '.png');
    }
    await browser.close();
    console.log('全部截图完成 →', OUT);
    process.exit(0);
})().catch(e => { console.error('截图失败:', e.message); process.exit(1); });
