// 图标审计：确保项目里用到的 Font Awesome 图标都存在于本地 FA Free 版本
// 避免误用 Pro 图标（如 fa-sparkles / fa-galaxy）导致图标渲染为空白
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'client/src');
const FA_ROOT = path.join(ROOT, 'client/public/assets/lib/font-awesome/css');

function fail(msg) {
    console.error('  [FAIL] ' + msg);
    process.exitCode = 1;
}

console.log('=== Font Awesome 图标审计 ===');

if (!fs.existsSync(FA_ROOT)) {
    fail('找不到 Font Awesome 样式目录: ' + FA_ROOT);
    process.exit(1);
}

const cssFile = fs.readdirSync(FA_ROOT).find(f => f.endsWith('.min.css') || f === 'all.css');
if (!cssFile) {
    fail('找不到 all.min.css');
    process.exit(1);
}

const css = fs.readFileSync(path.join(FA_ROOT, cssFile), 'utf8');
const verMatch = css.match(/Font Awesome Free ([\d.]+)/);
console.log('  版本: Font Awesome Free ' + (verMatch ? verMatch[1] : '未知'));
console.log('  样式表: ' + cssFile);

// 忽略的类名（非图标）
const IGNORE = new Set([
    'fa-solid', 'fa-regular', 'fa-brands', 'fa-fw', 'fa-lg', 'fa-sm', 'fa-xs',
    'fa-2x', 'fa-3x', 'fa-spin', 'fa-pulse', 'fa-ul', 'fa-li', 'fa-border'
]);

const files = [];
(function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name);
        if (e.isDirectory()) walk(p);
        else if (/\.(vue|js)$/.test(e.name)) files.push(p);
    }
})(SRC);

const used = new Map();
for (const f of files) {
    fs.readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
        for (const m of line.matchAll(/\bfa-[a-z0-9-]+/g)) {
            const icon = m[0];
            if (IGNORE.has(icon)) continue;
            if (!used.has(icon)) used.set(icon, path.relative(ROOT, f).replace(/\\/g, '/') + ':' + (i + 1));
        }
    });
}

const missing = [];
for (const [icon, where] of used) {
    const re = new RegExp('\\.' + icon + '\\s*(\\.fa-solid)?:before|\\.' + icon + ':before');
    if (!re.test(css)) missing.push({ icon, where });
}

console.log('  使用图标: ' + used.size + ' 个');
console.log('  缺失图标: ' + missing.length + ' 个');

if (missing.length) {
    missing.forEach(m => fail(m.icon + ' 不存在  (' + m.where + ')'));
} else {
    console.log('  [OK] 全部图标均存在于当前 Font Awesome 版本');
}

console.log('\n========================================');
console.log(`  通过 ${used.size - missing.length} 项，失败 ${missing.length} 项`);
console.log('========================================');
process.exit(missing.length ? 1 : 0);
