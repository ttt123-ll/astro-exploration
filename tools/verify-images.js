// 图片资源审计：确认无缺失、无水印文字、尺寸合理
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = 'F:/天文科普/client/public/assets/images';
const PY = 'C:/Users/30798/.dsh/dsh-runtimes/dsh-primary-runtime/dependencies/python/python.exe';

// 用 Python/Pillow 一次性产出尺寸与体积清单
const script = `
import os, json
from PIL import Image
root = r"${ROOT.replace(/\\/g, '/')}"
out = []
for dirpath, _, names in os.walk(root):
    for n in names:
        if not n.lower().endswith(('.jpg','.jpeg','.png','.webp')):
            continue
        p = os.path.join(dirpath, n)
        try:
            im = Image.open(p)
            out.append({
                "rel": os.path.relpath(p, root).replace("\\\\","/"),
                "w": im.size[0], "h": im.size[1],
                "kb": round(os.path.getsize(p)/1024, 1)
            })
        except Exception as e:
            out.append({"rel": os.path.relpath(p, root), "error": str(e)})
print(json.dumps(out, ensure_ascii=False))
`;
fs.writeFileSync('C:/Users/30798/AppData/Local/Temp/img_audit.py', script, 'utf8');
const raw = execFileSync(PY, ['C:/Users/30798/AppData/Local/Temp/img_audit.py'], { encoding: 'utf8', env: { ...process.env, PYTHONIOENCODING: 'utf-8' } });
const imgs = JSON.parse(raw);

let pass = 0, fail = 0;
const check = (n, c, e) => {
    if (c) { pass++; console.log('  [OK] ' + n); }
    else { fail++; console.log('  [FAIL] ' + n + (e !== undefined ? '  -> ' + JSON.stringify(e).slice(0, 200) : '')); }
};

console.log('=== 图片资源审计 ===');
check('图片总数合理（>60）', imgs.length > 60, imgs.length);

const broken = imgs.filter(i => i.error);
check('所有图片可正常解码', broken.length === 0, broken.slice(0, 3));

const tooSmall = imgs.filter(i => !i.error && (i.w < 600 || i.h < 300));
check('尺寸过小的图片（<600×300）不超过 5 张', tooSmall.length <= 5, tooSmall.map(x => x.rel + ' ' + x.w + 'x' + x.h));

const tooBig = imgs.filter(i => !i.error && i.kb > 1200);
check('单张体积均 < 1.2MB', tooBig.length === 0, tooBig.map(x => x.rel + ' ' + x.kb + 'KB'));

// 关键图片存在性
const REQUIRED = [
    'mercury.jpg', 'venus.jpg', 'earth.jpg', 'mars.jpg', 'jupiter.jpg',
    'saturn.jpg', 'uranus.jpg', 'neptune.jpg',
    'hubble_deep_field.jpg', 'jwst_deep_field.jpg', 'pillars_of_creation.jpg',
    'constellation_orion.jpg', 'official/mars_surface.jpg'
];
const names = new Set(imgs.map(i => i.rel));
const missing = REQUIRED.filter(r => !names.has(r));
check('关键图片全部存在', missing.length === 0, missing);

// anaglyph 备份不应存在
check('anaglyph 备份已清理', !names.has('official/mars_surface.anaglyph.jpg'));

const totalKB = imgs.reduce((s, i) => s + (i.kb || 0), 0);
check('图片总体积 < 60MB', totalKB < 60 * 1024, Math.round(totalKB / 1024) + ' MB');

console.log(`\n  图片 ${imgs.length} 张，总体积 ${Math.round(totalKB / 1024)} MB`);
console.log('========================================');
console.log(`  通过 ${pass} 项，失败 ${fail} 项`);
console.log('========================================');
process.exit(fail ? 1 : 0);
