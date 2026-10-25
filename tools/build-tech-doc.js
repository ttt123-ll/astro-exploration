/**
 * 生成《技术文档》PDF：docs/技术文档.md → docs/技术文档.pdf
 * 用 Edge/Chrome 无头打印，A4、页脚页码，自动压缩到 ≤30 页
 */
const fs = require('fs');
const path = require('path');
const puppeteer = require('F:/天文科普/tools/node_modules/puppeteer-core');
const { PDFDocument } = require('F:/天文科普/tools/node_modules/pdf-lib');

const ROOT = 'F:/天文科普';
const MD = path.join(ROOT, 'docs/技术文档.md');
const PDF = path.join(ROOT, 'docs/技术文档.pdf');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

/* ---------------- Markdown → HTML（本项目文档所需的子集） ---------------- */
function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function inline(s) {
    let out = escapeHtml(s);
    out = out.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<figure><img src="$2" alt="$1"><figcaption>$1</figcaption></figure>');
    out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
    out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
    return out;
}

function parseTable(lines, start) {
    const rows = [];
    let i = start;
    let header = null;
    while (i < lines.length && /^\s*\|/.test(lines[i])) {
        const line = lines[i].trim();
        if (/^\|[\s:\-|]+\|?$/.test(line)) { i++; continue; }
        const cells = line.replace(/^\||\|$/g, '').split('|').map(c => c.trim());
        if (header === null) header = cells; else rows.push(cells);
        i++;
    }
    let html = '<table><thead><tr>' + header.map(c => `<th>${inline(c)}</th>`).join('') + '</tr></thead><tbody>';
    for (const r of rows) {
        html += '<tr>' + r.map(c => `<td>${inline(c)}</td>`).join('') + '</tr>';
    }
    html += '</tbody></table>';
    return { html, next: i };
}

function mdToHtml(md) {
    const lines = md.split('\n');
    let out = '';
    let i = 0;
    let inList = null;
    const closeList = () => { if (inList) { out += `</${inList}>`; inList = null; } };

    while (i < lines.length) {
        const raw = lines[i];
        const line = raw.trim();

        if (/^```/.test(line)) {
            closeList();
            const buf = [];
            i++;
            while (i < lines.length && !/^```/.test(lines[i].trim())) { buf.push(lines[i]); i++; }
            i++;
            out += `<pre><code>${escapeHtml(buf.join('\n'))}</code></pre>`;
            continue;
        }
        if (!line) { closeList(); i++; continue; }
        if (/^---+\s*$/.test(line)) { closeList(); out += '<hr>'; i++; continue; }

        if (line.startsWith('|')) {
            closeList();
            const t = parseTable(lines, i);
            out += t.html;
            i = t.next;
            continue;
        }

        const h = line.match(/^(#{1,4})\s+(.*)$/);
        if (h) {
            closeList();
            const level = h[1].length;
            const text = h[2];
            if (level === 1) out += `<h1>${inline(text)}</h1>`;
            else if (level === 2) out += `<h2>${inline(text)}</h2>`;
            else if (level === 3) out += `<h3>${inline(text)}</h3>`;
            else out += `<h4>${inline(text)}</h4>`;
            i++;
            continue;
        }

        if (/^>\s?/.test(line)) {
            closeList();
            out += `<blockquote>${inline(line.replace(/^>\s?/, ''))}</blockquote>`;
            i++;
            continue;
        }

        if (/^- /.test(line)) {
            if (inList !== 'ul') { closeList(); out += '<ul>'; inList = 'ul'; }
            out += `<li>${inline(line.slice(2))}</li>`;
            i++;
            continue;
        }
        if (/^\d+\.\s/.test(line)) {
            if (inList !== 'ol') { closeList(); out += '<ol>'; inList = 'ol'; }
            out += `<li>${inline(line.replace(/^\d+\.\s/, ''))}</li>`;
            i++;
            continue;
        }

        closeList();
        // 「**赛道**：...」这类元信息行
        out += `<p>${inline(line)}</p>`;
        i++;
    }
    closeList();
    return out;
}

function buildHtml(body, fontSize, margin) {
    return `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8">
<base href="file:///${ROOT.replace(/\\/g, '/')}/docs/">
<title>宇宙探索 · 技术文档</title>
<style>
  * { box-sizing: border-box; }
  body {
    font-family: "Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", sans-serif;
    font-size: ${fontSize}pt; line-height: 1.68; color: #1c2333; margin: 0;
  }
  h1 { font-size: 22pt; text-align: center; color: #0b1a3a; margin: 0 0 6pt; letter-spacing: 1px; }
  h2 { font-size: 15pt; color: #0b1a3a; margin: 16pt 0 8pt; padding-bottom: 4pt;
       border-bottom: 1.6pt solid #2f6fd0; page-break-before: always; page-break-after: avoid; }
  h2:first-of-type { page-break-before: avoid; }
  h3 { font-size: 12.5pt; color: #12356e; margin: 12pt 0 5pt; page-break-after: avoid; }
  h4 { font-size: 11pt; color: #173d7a; margin: 9pt 0 4pt; }
  p { margin: 4pt 0; text-align: justify; }
  ul, ol { margin: 4pt 0 6pt; padding-left: 18pt; }
  li { margin: 2pt 0; }
  strong { color: #0f3d91; }
  code { font-family: Consolas, "Courier New", monospace; font-size: ${(fontSize - 1.4).toFixed(1)}pt;
         background: #eef3fb; color: #13407f; padding: 0 2pt; border-radius: 2pt; }
  pre { background: #0e1728; color: #d7e3f7; padding: 8pt 10pt; border-radius: 4pt;
        font-size: ${(fontSize - 2).toFixed(1)}pt; line-height: 1.5; white-space: pre-wrap; page-break-inside: avoid; }
  pre code { background: none; color: inherit; padding: 0; }
  table { width: 100%; border-collapse: collapse; margin: 6pt 0 10pt; font-size: ${(fontSize - 1.2).toFixed(1)}pt; page-break-inside: auto; }
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; }
  th, td { border: 0.6pt solid #9fb1cc; padding: 3.2pt 5pt; text-align: left; vertical-align: top; }
  th { background: #e7eefb; color: #0b1a3a; font-weight: 700; }
  tr:nth-child(even) td { background: #f7faff; }
  blockquote { margin: 6pt 0; padding: 6pt 10pt; background: #eef3fb; border-left: 3pt solid #2f6fd0; color: #33415e; }
  hr { border: none; border-top: 0.8pt solid #c8d5e8; margin: 10pt 0; }
  figure { margin: 8pt auto; text-align: center; page-break-inside: avoid; }
  figure img { max-width: 88%; max-height: 300pt; border: 0.8pt solid #b9c8dd; border-radius: 4pt; }
  figcaption { font-size: 8.5pt; color: #64748b; margin-top: 3pt; }
  a { color: #1f5fbf; text-decoration: none; }
  table, pre, figure { page-break-inside: avoid; }
  @page { margin: ${margin}; }
</style></head><body>${body}</body></html>`;
}

async function pdfPageCount(buf) {
    const doc = await PDFDocument.load(buf);
    return doc.getPageCount();
}

(async () => {
    const md = fs.readFileSync(MD, 'utf8');
    const body = mdToHtml(md);

    const b = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox'] });

    let fontSize = 10.5;
    let margin = '18mm 16mm 16mm';
    let ok = false;
    let pages = 0;

    for (let attempt = 0; attempt < 6; attempt++) {
        const html = buildHtml(body, fontSize, margin);
        const p = await b.newPage();
        await p.setContent(html, { waitUntil: 'load' });
        await new Promise(r => setTimeout(r, 400));
        const buf = await p.pdf({
            format: 'A4', printBackground: true,
            margin: { top: '16mm', bottom: '14mm', left: '15mm', right: '15mm' },
            displayHeaderFooter: true,
            headerTemplate: '<div style="font-size:7.5pt;color:#94a3b8;width:100%;text-align:center;font-family:Microsoft YaHei;">宇宙探索 · 天文科普网站　技术文档</div>',
            footerTemplate: '<div style="font-size:7.5pt;color:#94a3b8;width:100%;text-align:center;font-family:Microsoft YaHei;"><span class="pageNumber"></span> / <span class="totalPages"></span></div>'
        });
        pages = await pdfPageCount(buf);
        await p.close();
        console.log(`  尝试 ${attempt + 1}: ${fontSize}pt → ${pages} 页`);
        if (pages > 0 && pages <= 30) {
            fs.writeFileSync(PDF, buf);
            ok = true;
            break;
        }
        // 超过 30 页则缩小字号与行距
        fontSize -= 0.5;
        margin = '16mm 14mm 14mm';
        if (fontSize < 8.5) break;
    }

    await b.close();
    if (!ok) { console.error('✗ 无法压缩到 30 页以内'); process.exit(1); }
    console.log(`✓ 已生成 ${PDF}（${pages} 页，${(fs.statSync(PDF).size / 1024).toFixed(0)} KB）`);
})().catch(e => { console.error('异常:', e); process.exit(1); });
