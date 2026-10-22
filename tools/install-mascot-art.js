/**
 * 看板娘立绘接入脚本
 *
 * 用法：
 *   node tools/install-mascot-art.js "源图片路径"
 *
 * 处理内容：
 *   1) 白底/绿幕背景自动抠除（从四边泛洪，保留角色内部白色）
 *   2) 去除透明边距，按高度 720px 等比缩放（2x 清晰度）
 *   3) 输出 public/assets/mascot/star-girl.png（透明 PNG）
 *   4) 同时输出 star-girl.webp 与 og 用方形图
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'client/public/assets/mascot');
const SRC = process.argv[2];

if (!SRC || !fs.existsSync(SRC)) {
    console.error('用法: node tools/install-mascot-art.js "<源图片路径>"');
    process.exit(1);
}

fs.mkdirSync(OUT_DIR, { recursive: true });
const outPng = path.join(OUT_DIR, 'star-girl.png');
const outWebp = path.join(OUT_DIR, 'star-girl.webp');
const outSquare = path.join(OUT_DIR, 'star-girl-square.png');

// 复用项目里的 Python 运行时（含 Pillow）
const PY = process.env.DSH_PYTHON || 'C:\\Users\\30798\\.dsh\\dsh-runtimes\\dsh-primary-runtime\\dependencies\\python\\python.exe';

const pyCode = `
import sys
from PIL import Image, ImageChops

src, out_png, out_webp, out_square = sys.argv[1:5]
im = Image.open(src).convert('RGBA')
w, h = im.size

# ---- 1) 背景处理：白底或绿幕从边缘泛洪抠除 ----
px = im.load()
corner = px[0, 0]
is_white = corner[0] > 235 and corner[1] > 235 and corner[2] > 235
is_green = corner[1] > 150 and corner[0] < 120 and corner[2] < 120

if is_white or is_green:
    # 用「与背景色接近」判定 + 从四边 BFS 泛洪，保护角色内部同色区域
    from collections import deque
    tol = 34 if is_white else 60
    target = corner[:3]
    seen = bytearray(w * h)
    q = deque()
    for x in range(w):
        q.append((x, 0)); q.append((x, h - 1))
    for y in range(h):
        q.append((0, y)); q.append((w - 1, y))
    while q:
        x, y = q.popleft()
        if x < 0 or y < 0 or x >= w or y >= h:
            continue
        i = y * w + x
        if seen[i]:
            continue
        r, g, b, a = px[x, y]
        if a == 0 or (abs(r - target[0]) <= tol and abs(g - target[1]) <= tol and abs(b - target[2]) <= tol):
            seen[i] = 1
            px[x, y] = (r, g, b, 0)
            q.append((x + 1, y)); q.append((x - 1, y)); q.append((x, y + 1)); q.append((x, y - 1))

# ---- 2) 裁掉透明边距 ----
bbox = im.split()[3].getbbox()
if bbox:
    im = im.crop(bbox)

# ---- 3) 缩放到高度 720（2x） ----
target_h = 720
ratio = target_h / im.height
im = im.resize((max(1, round(im.width * ratio)), target_h), Image.LANCZOS)

im.save(out_png)
im.save(out_webp, 'WEBP', quality=88)

# ---- 4) 方形版本（用于分享卡片/导航装饰） ----
side = max(im.width, im.height)
sq = Image.new('RGBA', (side, side), (0, 0, 0, 0))
sq.paste(im, ((side - im.width) // 2, (side - im.height) // 2), im)
sq.resize((512, 512), Image.LANCZOS).save(out_square)

print('尺寸: %dx%d' % im.size)
`;

try {
    const out = execFileSync(PY, ['-c', pyCode, SRC, outPng, outWebp, outSquare], { encoding: 'utf8' });
    console.log('✓ 立绘已处理:', outPng);
    console.log('  WebP:', outWebp);
    console.log('  方形:', outSquare);
    console.log(' ', out.trim());
} catch (e) {
    console.error('处理失败（需要 Python + Pillow）:', e.message);
    process.exit(1);
}
