/**
 * 生成移动端扫码访问的二维码（PNG）
 * 用法：node tools/gen-mobile-qr.js [url]
 * 不传 url 时读取 F:\离线分发包\在线演示地址.txt
 */
const fs = require('fs');
const path = require('path');
const QRCode = require(path.join(__dirname, 'node_modules', 'qrcode'));

const ADDR_FILE = 'F:/离线分发包/在线演示地址.txt';
const OUT_DIR = 'F:/离线分发包/提交材料';
const OUT_ROOT = 'F:/离线分发包/移动端-扫码访问.png';

function resolveUrl() {
    const arg = process.argv[2];
    if (arg) return arg.trim();
    if (fs.existsSync(ADDR_FILE)) {
        const m = fs.readFileSync(ADDR_FILE, 'utf8').match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
        if (m) return m[0];
    }
    console.error('未找到公网地址：请传入 URL 参数，或先启动隧道生成 在线演示地址.txt');
    process.exit(1);
}

(async () => {
    const url = resolveUrl();
    fs.mkdirSync(OUT_DIR, { recursive: true });

    const opts = {
        errorCorrectionLevel: 'H',
        type: 'png',
        margin: 2,
        width: 1200,
        color: { dark: '#0b1220', light: '#ffffff' }
    };

    await QRCode.toFile(OUT_ROOT, url, opts);
    await QRCode.toFile(path.join(OUT_DIR, '移动端-扫码访问.png'), url, opts);

    /* 同时输出一份纯黑二维码，方便打印/贴到 PPT */
    await QRCode.toFile(path.join(OUT_DIR, '移动端-扫码访问-打印版.png'), url, { ...opts, color: { dark: '#000000', light: '#ffffff' } });

    console.log('✓ 二维码已生成');
    console.log('  地址:', url);
    console.log('  文件:', OUT_ROOT);
})().catch(e => { console.error('生成失败:', e.message); process.exit(1); });
