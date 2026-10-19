// 构建后预压缩：为静态资源生成 .br / .gz，后端优先直出压缩版本
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const DIST = path.join(__dirname, '..', 'client', 'dist');
const EXTS = new Set(['.js', '.css', '.html', '.json', '.svg', '.txt', '.xml', '.webmanifest']);
const MIN_SIZE = 1024;

let count = 0, saved = 0;

function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) { walk(full); continue; }
        if (!EXTS.has(path.extname(entry.name))) continue;
        if (entry.name.endsWith('.br') || entry.name.endsWith('.gz')) continue;

        const buf = fs.readFileSync(full);
        if (buf.length < MIN_SIZE) continue;

        const gz = zlib.gzipSync(buf, { level: 9 });
        const br = zlib.brotliCompressSync(buf, {
            params: {
                [zlib.constants.BROTLI_PARAM_QUALITY]: 11,
                [zlib.constants.BROTLI_PARAM_SIZE_HINT]: buf.length
            }
        });

        fs.writeFileSync(full + '.gz', gz);
        fs.writeFileSync(full + '.br', br);
        count++;
        saved += buf.length - br.length;
    }
}

if (!fs.existsSync(DIST)) {
    console.error('client/dist 不存在，请先构建前端');
    process.exit(1);
}

walk(DIST);
console.log('预压缩完成：' + count + ' 个文件，brotli 共节省 ' + (saved / 1024).toFixed(1) + ' KB');
