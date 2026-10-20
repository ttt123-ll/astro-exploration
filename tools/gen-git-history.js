// 生成可视化的 Git 提交历史页面（git-history.html）
// 用法：node tools/gen-git-history.js
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'git-history.html');

function git(args) {
    return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

function esc(s) {
    return String(s == null ? '' : s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/* ---- 1. 读取提交元信息（用 %x01 分隔字段，%x02 分隔记录，正文取剩余部分） ---- */
const REC = '\x02';
const SEP = '\x01';
const raw = git([
    'log',
    '--pretty=format:%x02%H%x01%h%x01%ad%x01%an%x01%s%x01%b',
    '--date=format:%Y-%m-%d %H:%M'
]);

const commits = raw.split(REC).filter(s => s.trim()).map(chunk => {
    const f = [];
    let rest = chunk;
    for (let i = 0; i < 5; i++) {
        const idx = rest.indexOf(SEP);
        if (idx < 0) { f.push(rest); rest = ''; break; }
        f.push(rest.slice(0, idx));
        rest = rest.slice(idx + 1);
    }
    return {
        hash: f[0] || '', short: f[1] || '', date: f[2] || '', author: f[3] || '',
        subject: f[4] || '(无标题)', body: (rest || '').trim(),
        files: 0, add: 0, del: 0, changed: []
    };
});

/* ---- 2. 逐个提交读取文件变动统计 ---- */
for (const c of commits) {
    try {
        const out = git(['show', '--numstat', '--format=', c.hash]);
        for (const ln of out.split('\n')) {
            const t = ln.trim();
            if (!t) continue;
            const parts = t.split('\t');
            if (parts.length < 3) continue;
            const a = parts[0] === '-' ? 0 : Number(parts[0]) || 0;
            const d = parts[1] === '-' ? 0 : Number(parts[1]) || 0;
            c.files++;
            c.add += a;
            c.del += d;
            if (c.changed.length < 60) c.changed.push({ add: a, del: d, file: parts[2] });
        }
    } catch (e) { /* 忽略单个提交的统计失败 */ }
}

const branch = git(['branch', '--show-current']).trim() || 'main';
const fileCount = git(['ls-files']).split('\n').filter(Boolean).length;

const rows = commits.map((c, i) => {
    const bodyHtml = c.body
        ? '<ul class="body">' + c.body.split('\n').filter(l => l.trim()).map(l => {
            const t = l.trim();
            const isItem = /^[-*•]/.test(t);
            return `<li class="${isItem ? 'item' : 'line'}">${esc(isItem ? t.replace(/^[-*•]\s*/, '') : t)}</li>`;
        }).join('') + '</ul>'
        : '';

    const filesHtml = c.changed.slice(0, 8).map(f =>
        `<div class="file"><span class="fname">${esc(f.file)}</span><span class="fstat"><b class="add">+${f.add}</b><b class="del">-${f.del}</b></span></div>`
    ).join('') + (c.changed.length > 8 ? `<div class="file more">… 另有 ${c.changed.length - 8} 个文件</div>` : '');

    return `
    <article class="commit">
      <div class="node"><span class="idx">${commits.length - i}</span></div>
      <div class="card">
        <div class="head">
          <code class="hash">${esc(c.short)}</code>
          <time>${esc(c.date)}</time>
          <span class="author">${esc(c.author)}</span>
          <span class="stat"><i>${c.files}</i> 文件 <b class="add">+${c.add}</b> <b class="del">-${c.del}</b></span>
        </div>
        <h3>${esc(c.subject)}</h3>
        ${bodyHtml}
        <details><summary>涉及文件（${c.changed.length}）</summary><div class="files">${filesHtml}</div></details>
      </div>
    </article>`;
}).join('');

const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Git 提交记录 · 宇宙探索天文科普网站</title>
<style>
  :root { --bg:#06080f; --card:#0d1220; --line:#1e2a45; --txt:#e8eefc; --dim:#8b96ad; --cyan:#93c5fd; --gold:#e2c98f; --green:#6ee7a8; --red:#f87171; }
  * { box-sizing: border-box; }
  body { margin:0; background:radial-gradient(ellipse at 50% 0%, #131a33 0%, #05070d 60%); color:var(--txt);
         font-family:"Noto Sans SC","Microsoft YaHei",system-ui,sans-serif; padding:48px 24px 80px; }
  .wrap { max-width: 1000px; margin: 0 auto; }
  header { text-align:center; margin-bottom: 44px; }
  header .kicker { letter-spacing:.4em; font-size:.75rem; color:var(--cyan); }
  header h1 { font-size:2rem; margin:.5rem 0 .8rem; }
  header .meta { color:var(--dim); font-size:.88rem; }
  header .meta b { color:var(--gold); font-size:1rem; }
  .timeline { position:relative; }
  .timeline::before { content:''; position:absolute; left:19px; top:8px; bottom:8px; width:2px;
                      background:linear-gradient(180deg,var(--cyan),var(--line) 60%,transparent); }
  .commit { display:flex; gap:18px; margin-bottom:18px; }
  .node { position:relative; flex:0 0 40px; display:flex; justify-content:center; }
  .node .idx { width:38px; height:38px; border-radius:50%; display:grid; place-items:center;
               background:var(--card); border:1px solid var(--line); color:var(--dim);
               font-size:.78rem; font-family:ui-monospace,monospace; z-index:1; }
  .commit:first-child .node .idx { border-color:var(--cyan); color:var(--cyan); box-shadow:0 0 18px rgba(147,197,253,.35); }
  .card { flex:1; background:var(--card); border:1px solid var(--line); border-radius:12px; padding:16px 20px;
          transition:border-color .3s, transform .3s; }
  .card:hover { border-color:rgba(147,197,253,.45); transform:translateX(3px); }
  .commit:first-child .card { border-color:rgba(147,197,253,.4); }
  .head { display:flex; flex-wrap:wrap; align-items:center; gap:12px; font-size:.78rem; color:var(--dim); }
  .hash { background:rgba(147,197,253,.1); color:var(--cyan); padding:2px 8px; border-radius:5px;
          font-family:ui-monospace,monospace; }
  .stat { margin-left:auto; }
  .stat b { font-weight:600; }
  .add { color:var(--green); } .del { color:var(--red); }
  h3 { font-size:1.02rem; margin:.6rem 0 .3rem; line-height:1.6; font-weight:600; }
  .body { margin:.5rem 0 0; padding-left:1.1rem; color:var(--dim); font-size:.85rem; line-height:1.9; }
  .body .item { list-style:disc; }
  .body .line { list-style:none; margin-left:-1.1rem; }
  details { margin-top:.8rem; }
  summary { cursor:pointer; color:var(--cyan); font-size:.8rem; }
  .files { margin-top:.6rem; border-top:1px dashed var(--line); padding-top:.6rem; }
  .file { display:flex; justify-content:space-between; gap:12px; font-size:.78rem; padding:2px 0;
          font-family:ui-monospace,monospace; color:var(--dim); }
  .fname { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .fstat { flex:0 0 auto; display:flex; gap:8px; }
  .more { color:var(--dim); font-style:italic; }
  footer { text-align:center; color:var(--dim); font-size:.8rem; margin-top:40px; }
</style>
</head>
<body>
<div class="wrap">
  <header>
    <div class="kicker">GIT COMMIT HISTORY</div>
    <h1>宇宙探索 · 天文科普网站</h1>
    <div class="meta">
      分支 <b>${esc(branch)}</b> · 提交 <b>${commits.length}</b> 条 · 跟踪文件 <b>${fileCount}</b> 个
    </div>
  </header>
  <div class="timeline">${rows}</div>
  <footer>本页面由 tools/gen-git-history.js 根据 git log 自动生成 · ${new Date().toLocaleString('zh-CN')}</footer>
</div>
</body>
</html>`;

fs.writeFileSync(OUT, html, 'utf8');
console.log('已生成提交记录页面：' + OUT);
console.log('共 ' + commits.length + ' 条提交');
