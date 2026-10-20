// 内容提取脚本：把旧站 HTML 详情页解析为结构化数据，输出到 client/src/data/content.js
// 运行：node tools/extract.js
const fs = require('fs');
const path = require('path');

const SRC = 'E:\\地球';
const OUT = 'E:\\astro-vue\\client\\src\\data\\content.js';

function read(p) { try { return fs.readFileSync(p, 'utf8'); } catch (e) { return ''; } }
function stripTags(s) {
    return s.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'").replace(/&times;/g, '×').replace(/&deg;/g, '°')
        .replace(/\s+/g, ' ').trim();
}

function extractSections(html) {
    const sections = [];
    let m;
    const body = html;
    // 更稳健：先取出 detail-content 区域
    const dc = body.match(/<div class="detail-content">([\s\S]*?)<\/div>\s*(?=<footer|<\/div>\s*<\/div>\s*<script|$)/);
    const region = dc ? dc[1] : body;
    const secRe = /<div class="detail-section">([\s\S]*?)<\/div>\s*(?=<div class="detail-section">|<div class="stats-grid"|$)/g;
    while ((m = secRe.exec(region)) !== null) {
        const block = m[1];
        const h2 = (block.match(/<h2[^>]*>([\s\S]*?)<\/h2>/) || [])[1] || '';
        const title = stripTags(h2);
        const paras = [];
        const pRe = /<p[^>]*>([\s\S]*?)<\/p>/g;
        let pm;
        while ((pm = pRe.exec(block)) !== null) {
            const t = stripTags(pm[1]);
            if (t) paras.push(t);
        }
        if (title && paras.length) sections.push({ title, paras });
    }
    return sections;
}

function extractStats(html) {
    const stats = [];
    const m = html.match(/<div class="stats-grid">([\s\S]*?)<\/div>\s*(?=<footer|$)/);
    if (!m) return stats;
    const re = /<div class="stat-box">\s*<div class="value">([\s\S]*?)<\/div>\s*<div class="label">([\s\S]*?)<\/div>/g;
    let sm;
    while ((sm = re.exec(m[1])) !== null) {
        stats.push({ label: stripTags(sm[2]), value: stripTags(sm[1]) });
    }
    return stats;
}

function extractHero(html) {
    const tag = html.match(/<img[^>]*class="hero-image"[^>]*>/);
    if (!tag) return null;
    const src = (tag[0].match(/src="([^"]+)"/) || [])[1] || '';
    const alt = (tag[0].match(/alt="([^"]*)"/) || [])[1] || '';
    return { src, alt };
}

function parseDetail(file) {
    const html = read(path.join(SRC, file));
    const title = (html.match(/<div class="detail-header">\s*<h1>([\s\S]*?)<\/h1>/) || [])[1] || '';
    const subtitle = (html.match(/<p class="subtitle">([\s\S]*?)<\/p>/) || [])[1] || '';
    const back = (html.match(/<a[^>]*class="back-btn"[^>]*>([\s\S]*?)<\/a>/) || [])[1] || '';
    const backHref = (html.match(/<a[^>]*class="back-btn"[^>]*href="([^"]+)"/) || [])[1] || '';
    return {
        title: stripTags(title),
        subtitle: stripTags(subtitle),
        backText: stripTags(back),
        backHref,
        hero: extractHero(html),
        sections: extractSections(html),
        stats: extractStats(html)
    };
}

const groups = {
    planet: ['mercury','venus','earth','mars','jupiter','saturn','uranus','neptune'],
    star: ['blue-giant','red-giant','yellow-dwarf','white-dwarf','neutron-star','pulsar'],
    constellation: ['orion','scorpius','leo','cassiopeia','taurus','cygnus','virgo','pegasus'],
    galaxy: ['spiral','elliptical','barred-spiral','irregular'],
    blackhole: ['stellar','intermediate','supermassive','primordial'],
    object: ['andromeda','carina','crab-nebula','eagle-nebula','hubble-deep-field','jupiter','large-magellanic','mars','orion-nebula','pinwheel','ring-nebula','saturn','sombrero'],
    telescope: ['hubble','webb','chandra']
};

const result = {};
for (const [g, keys] of Object.entries(groups)) {
    result[g] = {};
    for (const k of keys) {
        let file;
        if (g === 'object') file = `object-${k}.html`;
        else if (g === 'telescope') file = `telescope-${k}.html`;
        else file = `${g}-${k}.html`;
        result[g][k] = parseDetail(file);
    }
}

const js = `// 自动生成的内容数据（由 tools/extract.js 从旧站解析）
// 结构：{ title, subtitle, backText, backHref, hero, sections:[{title,paras}], stats:[{label,value}] }
export default ${JSON.stringify(result, null, 2)};
`;
fs.writeFileSync(OUT, js, 'utf8');
console.log('已生成 ' + OUT + '  （大小 ' + (js.length / 1024).toFixed(1) + ' KB）');
console.log('各组条目：', Object.fromEntries(Object.entries(result).map(([k, v]) => [k, Object.keys(v).length])));
