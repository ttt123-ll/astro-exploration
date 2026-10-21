// AI 天文问答：RAG 检索增强（多轮会话 + 溯源 + 三级降级）
const express = require('express');
const { reply, usingLLM } = require('../chat');
const { kbStats } = require('../rag/data');
const { vectorMode, indexStats } = require('../rag/search');
const wrap = require('../asyncRoute');

const router = express.Router();

router.get('/chat/mode', (req, res) => {
    res.json({
        ok: true,
        mode: usingLLM() ? 'llm' : 'rag-local',
        level: usingLLM() ? 1 : 2,             // 当前可用的最高回答级别
        levels: [
            { level: 1, name: '大模型生成', available: usingLLM(), note: usingLLM() ? '已配置 AI_API_KEY' : '未配置 AI_API_KEY，自动降级' },
            { level: 2, name: '本地知识库检索', available: true, note: '词法 + 向量混合检索，离线可用' },
            { level: 3, name: '兜底引导', available: true, note: '无命中时给出推荐问题' }
        ],
        vector: vectorMode(),                  // 'api' | 'local'
        index: indexStats(),                   // 向量库：维度 / 知识块数 / 来源(disk|built) / 文件大小
        kb: kbStats()
    });
});

router.post('/chat', wrap(async (req, res) => {
    const message = String(req.body.message || '').trim();
    if (!message) return res.json({ ok: false, reply: '请输入你想问的天文问题～', sources: [], level: 3 });
    if (message.length > 200) return res.json({ ok: false, reply: '问题有点长，请精简到 200 字以内哦～', sources: [], level: 3 });
    const sessionId = String(req.body.sessionId || '').trim().slice(0, 64) || undefined;
    const result = await reply(message, sessionId);
    res.json(result);
}));

module.exports = router;
