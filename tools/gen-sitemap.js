// 生成 sitemap.xml（读取前端数据文件，列出所有公开页面）
const fs = require('fs');
const path = require('path');

const D = path.join(__dirname, '..', 'client', 'src', 'data');
const OUT = path.join(__dirname, '..', 'client', 'public', 'sitemap.xml');
const SITE = process.env.SITE_URL || 'http://localhost:3000';

function readExport(file) {
    const txt = fs.readFileSync(path.join(D, file), 'utf8');
    const m = txt.match(/export default\s*([\[{])/);
    if (!m) return null;
    const start = m.index + m[0].lastIndexOf(m[1]);
    return eval('(' + txt.slice(start).replace(/;\s*$/, '').trim() + ')');
}

const pages = [];
const add = (loc, priority = '0.7', changefreq = 'weekly') => pages.push({ loc, priority, changefreq });

// 顶级页面
[
    ['/', '1.0', 'daily'],
    ['/planet-show', '0.9', 'weekly'],
    ['/solar-system', '0.9', 'weekly'],
    ['/encyclopedia', '0.9', 'weekly'],
    ['/constellations', '0.8', 'weekly'],
    ['/gallery', '0.8', 'weekly'],
    ['/timeline', '0.7', 'monthly'],
    ['/news', '0.9', 'daily'],
    ['/community', '0.9', 'daily'],
    ['/deep-space', '0.7', 'monthly'],
    ['/explore', '0.6', 'monthly'],
    ['/download', '0.5', 'monthly'],
    ['/credits', '0.4', 'yearly']
].forEach(([p, pr, cf]) => add(p, pr, cf));

// 详情页
try {
    const content = readExport('content.js');
    const groups = ['planet', 'star', 'galaxy', 'blackhole', 'constellation', 'object', 'telescope'];
    for (const g of groups) {
        const group = content[g];
        if (!group) continue;
        for (const key of Object.keys(group)) add('/detail/' + g + '/' + key, '0.6', 'monthly');
    }
} catch (e) {
    console.warn('读取 content.js 失败，仅生成顶级页面：', e.message);
}

const now = new Date().toISOString();
const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(p => `  <url>
    <loc>${SITE}${p.loc}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join('\n')}
</urlset>
`;

fs.writeFileSync(OUT, xml, 'utf8');
console.log('sitemap 已生成：' + OUT + '（' + pages.length + ' 条 URL）');
