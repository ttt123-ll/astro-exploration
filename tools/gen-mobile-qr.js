/**
 * 生成移动端扫码访问的二维码（PNG）
 * 用法：node tools/gen-mobile-qr.js [url]
 * 不传 url 时读取 F:\离线分发包\在线演示地址.txt
 * 默认追加 /m 路径，扫码进入移动端入口（电脑打开为手机预览，手机自动进入响应式版）
 */
const fs = require('fs');
const path = require('path');
const QRCode = require(path.join(__dirname, 'node_modules', 'qrcode'));

const ADDR_FILE = 'F:/离线分发包/在线演示地址.txt';
const OUT_DIR = 'F:/离线分发包/提交材料';
const OUT_ROOT = 'F:/离线分发包/移动端-扫码访问.png';

function resolveBase() {
    const arg = process.argv[2];
    let url = '';
    if (arg) url = arg.trim();
    else if (fs.existsSync(ADDR_FILE)) {
        const m = fs.readFileSync(ADDR_FILE, 'utf8').match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
        if (m) url = m[0];
    }
    if (!url) {
        console.error('未找到公网地址：请传入 URL 参数，或先启动隧道生成 在线演示地址.txt');
        process.exit(1);
    }
    return url.replace(/\/+$/, '');
}

/** 生成移动端入口地址：https://host/m */
function mobileUrl(base) {
    if (/\/m$/.test(base) || /\/m\.html$/.test(base)) return base;
    return base + '/m';
}

(async () => {
    const base = resolveBase();
    const url = mobileUrl(base);
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
    await QRCode.toFile(path.join(OUT_DIR, '移动端-扫码访问-打印版.png'), url, { ...opts, color: { dark: '#000000', light: '#ffffff' } });

    console.log('✓ 二维码已生成（移动端入口）');
    console.log('  地址:', url);
    console.log('  文件:', OUT_ROOT);
})().catch(e => { console.error('生成失败:', e.message); process.exit(1); });
