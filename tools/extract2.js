// 从旧站内联 JS 数组提取数据，输出为 ES 模块
const fs = require('fs');
const path = require('path');
const SRC = 'E:\\地球';
const OUT = 'E:\\astro-vue\\client\\src\\data';

function read(p) { return fs.readFileSync(p, 'utf8'); }

function extractArray(file, varName) {
    const html = read(path.join(SRC, file));
    const re = new RegExp('(?:const|var)\\s+' + varName + '\\s*=\\s*\\[');
    const m0 = html.match(re);
    if (!m0) { console.log('未找到 ' + varName + ' in ' + file); return null; }
    const arrStart = m0.index + m0[0].lastIndexOf('[');
    const tail = html.slice(arrStart);
    const m = tail.match(/\n\s*\];/);
    if (!m) { console.log('找不到数组结尾 ' + varName); return null; }
    const text = tail.slice(0, m.index + m[0].lastIndexOf(']') + 1);
    try {
        return eval('(' + text + ')');
    } catch (e) {
        console.log('解析失败 ' + varName + ': ' + e.message);
        return null;
    }
}

function gallery() {
    const html = read(path.join(SRC, 'gallery.html'));
    // 定位图集网格区域
    const gridStart = html.indexOf('<div class="gallery-grid"');
    const gridEnd = html.indexOf('<div class="gallery-empty"', gridStart);
    const region = html.slice(gridStart, gridEnd > 0 ? gridEnd : html.length);
    const items = [];
    const chunks = region.split('<div class="gallery-item');
    for (let i = 1; i < chunks.length; i++) {
        const chunk = chunks[i];
        const headEnd = chunk.indexOf('>');
        const head = chunk.slice(0, headEnd);
        const body = chunk.slice(headEnd + 1);
        const cat = (head.match(/data-category="([^"]+)"/) || [])[1] || '';
        const detail = (head.match(/data-detail-url="([^"]+)"/) || [])[1] || '';
        const img = body.match(/<img[^>]*src="([^"]+)"[^>]*alt="([^"]*)"/);
        const h4 = body.match(/<h4>([\s\S]*?)<\/h4>/);
        const p = body.match(/<p>([\s\S]*?)<\/p>/);
        if (img) items.push({
            category: cat,
            detailUrl: detail,
            src: img[1],
            alt: img[2] || '',
            title: h4 ? h4[1].trim() : '',
            desc: p ? p[1].trim() : ''
        });
    }
    return items;
}

const planets = extractArray('solar-system.html', 'planetsData');
const cons = extractArray('constellations.html', 'constellationsData');
const quiz = extractArray('quiz.html', 'QUESTIONS');
const timeline = extractArray('timeline.html', 'EVENTS');
const galleryItems = gallery();

function write(name, arr) {
    const p = path.join(OUT, name + '.js');
    fs.writeFileSync(p, '// 自动生成（tools/extract2.js）\nexport default ' + JSON.stringify(arr, null, 2) + ';\n', 'utf8');
    console.log(name + ': ' + arr.length + ' 条 -> ' + p);
}
if (planets) write('planets', planets);
if (cons) write('constellations', cons);
if (quiz) write('quiz', quiz);
if (timeline) write('timeline', timeline);
if (galleryItems.length) write('gallery', galleryItems);
