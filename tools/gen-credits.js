// 生成素材与授权清单（docs/素材与授权清单.md），用于参赛合规说明
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CLIENT = path.join(ROOT, 'client');
const OUT = path.join(ROOT, 'docs/素材与授权清单.md');

const read = p => fs.readFileSync(p, 'utf8');
const exists = p => fs.existsSync(p);

// ---- 数据文件里的条目（含 credit 字段）----
function parseEntries(file, label) {
    if (!exists(file)) return [];
    const src = read(file);
    const out = [];
    // 逐条抓取对象里的 title/name + credit
    const blocks = src.split(/\},\s*\{/);
    for (const b of blocks) {
        const title = (b.match(/"?title"?\s*:\s*'([^']+)'/) || b.match(/"title"\s*:\s*"([^"]+)"/) ||
                       b.match(/"name"\s*:\s*"([^"]+)"/) || b.match(/name:\s*'([^']+)'/) || [])[1];
        const credit = (b.match(/credit:\s*'([^']+)'/) || b.match(/"credit"\s*:\s*"([^"]+)"/) || [])[1];
        const srcPath = (b.match(/src:\s*'([^']+)'/) || b.match(/"src"\s*:\s*"([^"]+)"/) || [])[1];
        if (title || srcPath) out.push({ label, title: title || '', credit: credit || '', src: srcPath || '' });
    }
    return out;
}

const gallery = parseEntries(path.join(CLIENT, 'src/data/gallery.js'), '星空图集');
const official = parseEntries(path.join(CLIENT, 'src/data/official.js'), '官方影像');
const videos = parseEntries(path.join(CLIENT, 'src/data/videos.js'), '科普视频');

// ---- 本地素材统计 ----
function walk(dir, exts, out = []) {
    if (!exists(dir)) return out;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p, exts, out);
        else if (exts.test(e.name)) out.push(p);
    }
    return out;
}
const rel = p => path.relative(ROOT, p).replace(/\\/g, '/');
const sizeMB = arr => (arr.reduce((s, f) => s + fs.statSync(f).size, 0) / 1024 / 1024).toFixed(1);

const images = walk(path.join(CLIENT, 'public/assets/images'), /\.(jpg|jpeg|png|webp)$/i);
const textures = walk(path.join(CLIENT, 'public/assets/textures'), /\.(jpg|jpeg|png|webp)$/i);
const vids = walk(path.join(CLIENT, 'public/assets/videos'), /\.(mp4|webm)$/i);

// ---- 生成 markdown ----
const lines = [];
lines.push('# 素材与授权清单');
lines.push('');
lines.push('> 本文件由 `tools/gen-credits.js` 自动扫描项目数据与素材生成，用于参赛材料说明第三方素材来源。');
lines.push('> 代码为项目原创实现（详见 README「原创性与参考说明」），以下仅列出**第三方素材与依赖**。');
lines.push('');
lines.push('## 一、代码与依赖（均为开源库，非"包装开源项目"）');
lines.push('');
lines.push('| 依赖 | 版本 | 许可证 | 用途 |');
lines.push('|---|---|---|---|');
lines.push('| Vue 3 | ^3.5.13 | MIT | 前端框架 |');
lines.push('| Vue Router | ^4.5.0 | MIT | 前端路由 |');
lines.push('| Pinia | ^2.3.0 | MIT | 状态管理 |');
lines.push('| Axios | ^1.7.9 | MIT | HTTP 客户端 |');
lines.push('| Three.js | ^0.186.1 | MIT | 3D 渲染 |');
lines.push('| Vite | ^5.4.11 | MIT | 构建工具 |');
lines.push('| Express | ^4.19.2 | MIT | Web 框架 |');
lines.push('| mysql2 | ^3.11.0 | MIT | MySQL 驱动 |');
lines.push('| jsonwebtoken | ^9.0.2 | MIT | JWT |');
lines.push('| bcryptjs | ^2.4.3 | MIT | 密码哈希 |');
lines.push('| helmet | ^8.0.0 | MIT | 安全响应头 |');
lines.push('| express-rate-limit | ^7.4.1 | MIT | 接口限流 |');
lines.push('| compression | ^1.7.5 | MIT | 压缩 |');
lines.push('| cookie-parser | ^1.4.7 | MIT | Cookie 解析 |');
lines.push('| cors | ^2.8.5 | MIT | 跨域 |');
lines.push('| Font Awesome Free | 6.4.0 | 图标 CC BY 4.0 / 字体 SIL OFL 1.1 / 代码 MIT | 图标字体 |');
lines.push('| Orbitron / Noto Sans SC | - | SIL OFL 1.1 | 字体（Google Fonts） |');
lines.push('');
lines.push('## 二、图像素材');
lines.push('');
lines.push('### 2.1 星空图集（' + gallery.length + ' 条）');
lines.push('');
lines.push('| 标题 | 出处 |');
lines.push('|---|---|');
gallery.forEach(e => lines.push('| ' + (e.title || '-') + ' | ' + (e.credit || '-') + ' |'));
lines.push('');
lines.push('### 2.2 NASA / ESA 官方影像（' + official.length + ' 条）');
lines.push('');
lines.push('| 标题 | 出处 |');
lines.push('|---|---|');
official.forEach(e => lines.push('| ' + (e.title || '-') + ' | ' + (e.credit || '-') + ' |'));
lines.push('');
lines.push('### 2.3 行星球面贴图（' + textures.length + ' 个）');
lines.push('');
lines.push('- 来源：**SolarSystemScope**（https://www.solarsystemscope.com/textures/）');
lines.push('- 授权：**CC BY 4.0**（允许商用与修改，需署名）');
lines.push('');
lines.push('### 2.4 其它图片');
lines.push('');
lines.push('- 星座配图：`assets/images/constellation_*.jpg`，公共示意素材');
lines.push('- 页面背景 / 新闻配图：NASA、ESA、维基共享资源等公开影像');
lines.push('- 星空背景与自定义光标：CSS / SVG 原创绘制');
lines.push('');
lines.push('## 三、视频素材（' + vids.length + ' 个，' + sizeMB(vids) + ' MB）');
lines.push('');
lines.push('| 标题 | 出处 |');
lines.push('|---|---|');
videos.forEach(e => lines.push('| ' + (e.title || '-') + ' | ' + (e.credit || '-') + ' |'));
lines.push('');
lines.push('视频均来自 **NASA / ESA** 官方公开频道，属于公有领域或允许教育用途的公开素材。');
lines.push('');
lines.push('## 四、数据接口');
lines.push('');
lines.push('| 接口 | 说明 |');
lines.push('|---|---|');
lines.push('| NASA NeoWs API | 近地天体数据（https://api.nasa.gov/），仅作为**数据来源**调用，未复制其代码 |');
lines.push('');
lines.push('## 五、原创部分');
lines.push('');
lines.push('- 全部前端页面、组件、路由、状态管理与样式（`client/src`）');
lines.push('- 全部后端接口、数据库设计、认证与安全中间件（`server`）');
lines.push('- 3D 星球投影 / 遨游太空场景与交互（Three.js 自写实现）');
lines.push('- 内容组织与文案、书籍推荐、冷知识与时间线数据整理');
lines.push('');
lines.push('## 六、参考与致谢');
lines.push('');
lines.push('- **NASA Eyes on Asteroids**（https://eyes.nasa.gov/apps/asteroids/）：参考其"点击天体 → 相机飞掠 + 信息面板"的**交互思路**，');
lines.push('  本项目为独立实现（Vue + Three.js 自写代码），未使用其任何源代码、素材或界面资源。');
lines.push('- **NASA / ESA / STScI**：天文影像与科普视频');
lines.push('- **SolarSystemScope**：行星球面贴图（CC BY 4.0）');
lines.push('- **Font Awesome**：图标字体');
lines.push('');

const md = lines.join('\n');
fs.mkdirSync(path.join(ROOT, 'docs'), { recursive: true });
fs.writeFileSync(OUT, md, 'utf8');
console.log('✓ 已生成 ' + rel(OUT));
console.log('  图集 ' + gallery.length + ' 条 / 官方影像 ' + official.length + ' 条 / 视频 ' + videos.length + ' 条');
console.log('  本地图片 ' + images.length + ' 张 / 贴图 ' + textures.length + ' 张 / 视频 ' + vids.length + ' 个');
