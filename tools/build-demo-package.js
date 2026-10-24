/**
 * 构建「免安装演示包」：内置 Node 运行时 + 后端 + 前端构建产物，无需 Docker / MySQL
 * 输出：F:/离线分发包/天文科普-免安装演示包/  + 同名 zip
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = 'F:/天文科普';
const OUT_PARENT = 'F:/离线分发包';
const OUT = path.join(OUT_PARENT, '天文科普-免安装演示包');
const NODE_EXE = 'E:/nodejs/node.exe';

function copyDir(src, dest, filter) {
    fs.mkdirSync(dest, { recursive: true });
    for (const it of fs.readdirSync(src, { withFileTypes: true })) {
        if (filter && !filter(it, src)) continue;
        const s = path.join(src, it.name);
        const d = path.join(dest, it.name);
        if (it.isDirectory()) copyDir(s, d, filter);
        else fs.copyFileSync(s, d);
    }
}

function copyFile(src, dest) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
}

console.log('清理旧目录…');
if (fs.existsSync(OUT)) fs.rmSync(OUT, { recursive: true, force: true });

/* 1) Node 运行时 */
console.log('复制 Node 运行时（约 89MB）…');
copyFile(NODE_EXE, path.join(OUT, 'node', 'node.exe'));
if (fs.existsSync('E:/nodejs/LICENSE')) copyFile('E:/nodejs/LICENSE', path.join(OUT, 'node', 'LICENSE'));

/* 2) 应用本体 */
console.log('复制后端与依赖…');
copyDir(path.join(ROOT, 'server'), path.join(OUT, 'app', 'server'), (it) => {
    if (it.name === 'out.log' || it.name === 'err.log') return false;
    return true;
});
copyFile(path.join(ROOT, 'package.json'), path.join(OUT, 'app', 'package.json'));

console.log('复制前端构建产物…');
copyDir(path.join(ROOT, 'client', 'dist'), path.join(OUT, 'app', 'client', 'dist'));

/* RAG 运行时需要读取 client/src/data（与 Docker 镜像一致） */
console.log('复制站点数据（RAG 索引依赖）…');
copyDir(path.join(ROOT, 'client', 'src', 'data'), path.join(OUT, 'app', 'client', 'src', 'data'));

/* 3) 启动脚本与说明 */
const bat = `@echo off
chcp 65001 >nul
title 宇宙探索 · 免安装演示（无需 Docker / MySQL）
cd /d "%~dp0app"

set DEMO_MODE=1
set NODE_ENV=production
set PORT=3000
set AI_API_KEY=

echo.
echo   宇宙探索 · 天文科普网站
echo   --------------------------------------------
echo   演示模式：无需安装 Docker / MySQL
echo   浏览器会自动打开  http://127.0.0.1:3000
echo   关闭本窗口即停止网站
echo   --------------------------------------------
echo.

"%~dp0node\\node.exe" server\\index.js

if errorlevel 1 (
  echo.
  echo 启动失败：可能是 3000 端口被占用。
  echo 请右键编辑本文件，把 set PORT=3000 改成 3001 后重试。
  pause
)
`;

const readme = `宇宙探索 · 天文科普网站 —— 免安装演示包
========================================

【怎么打开】
1. 解压本压缩包到任意目录（路径不要含特殊符号即可）
2. 双击「启动演示.bat」
3. 会自动打开浏览器；若没有，请手动访问 http://127.0.0.1:3000
4. 关闭黑色命令行窗口即停止网站

【这个包为什么不用装 Docker / MySQL】
- 包内自带 Node.js 运行时（node\\node.exe），无需安装任何软件
- 启动时以「演示模式」运行：跳过 MySQL，新闻使用内置数据，
  社区/登录/后台等依赖数据库的功能会给出友好提示，不影响浏览
- 全部页面、3D 星球投影与遨游、AI 天文助手（本地知识库离线模式）均可正常演示

【关于 AI 助手】
- 默认离线模式：使用站内 149 个知识块做检索问答，断网也能用
- 想体验真实大模型：进入 AI 助手页 →「AI 连接设置」→
  粘贴你自己的 DeepSeek API Key →「验证并连接」（Key 只保存在本机浏览器）

【常见问题】
- 双击没反应 / 被拦截：Windows 可能对未签名程序提示，选择「仍要运行」；
  或右键「启动演示.bat」→ 以管理员身份运行
- 3000 端口被占用：右键编辑「启动演示.bat」，把 set PORT=3000 改成 3001 后重试
- 浏览器提示不安全：这是本机演示地址，可忽略；本包仅在本机 127.0.0.1 提供服务
- 需要 Windows 10 / 11 64 位

【作品信息】
- 项目：宇宙探索 · 天文科普网站
- 技术栈：Vue 3 + Vite + Express + MySQL + Three.js + RAG
- 仓库：https://github.com/ttt123-ll/astro-exploration
`;

fs.writeFileSync(path.join(OUT, '启动演示.bat'), bat, 'utf8');
fs.writeFileSync(path.join(OUT, '使用说明.txt'), readme, 'utf8');

/* 4) 统计与打包 */
function dirSize(p) {
    let total = 0;
    for (const it of fs.readdirSync(p, { withFileTypes: true })) {
        const f = path.join(p, it.name);
        total += it.isDirectory() ? dirSize(f) : fs.statSync(f).size;
    }
    return total;
}
const sizeMB = (dirSize(OUT) / 1024 / 1024).toFixed(1);
console.log('目录大小:', sizeMB, 'MB');

const zipPath = path.join(OUT_PARENT, '天文科普-免安装演示包.zip');
if (fs.existsSync(zipPath)) fs.rmSync(zipPath, { force: true });
console.log('压缩中（约 1-2 分钟）…');
execSync(`powershell -NoProfile -Command "Compress-Archive -Path '${OUT}\\*' -DestinationPath '${zipPath}' -CompressionLevel Optimal"`, { stdio: 'inherit' });
console.log('✓ 演示包:', zipPath, (fs.statSync(zipPath).size / 1024 / 1024).toFixed(1), 'MB');
