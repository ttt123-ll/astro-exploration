/**
 * 预构建本地向量索引（构建镜像 / 部署时执行，避免首次请求时重建）
 * 用法：node server/rag/build-index.js
 */
const { getChunks, kbStats } = require('./data');
const localVector = require('./localVector');

const chunks = getChunks();
const index = localVector.rebuild(chunks);
const st = localVector.stats(chunks);

console.log('[rag] 向量索引已生成');
console.log('  知识块: ' + chunks.length + '  维度: ' + index.dim + '  内容 hash: ' + index.hash);
console.log('  文件: ' + localVector.INDEX_FILE + '  (' + st.sizeKB + ' KB)');
console.log('  来源页面: ' + kbStats().sources);
