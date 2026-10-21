// AI 天文问答：RAG 检索增强（多轮会话 + 溯源 + 本地降级）
const express = require('express');
const { reply, usingLLM } = require('../chat');
const { kbStats } = require('../rag/data');
const { embeddingsReady } = require('../rag/search');
const wrap = require('../asyncRoute');

const router = express.Router();

router.get('/chat/mode', (req, res) => {
    res.json({
        ok: true,
        mode: usingLLM() ? 'llm' : 'rag-local',
        vector: embeddingsReady(),
        kb: kbStats()
    });
});

router.post('/chat', wrap(async (req, res) => {
    const message = String(req.body.message || '').trim();
    if (!message) return res.json({ ok: false, reply: '请输入你想问的天文问题～' });
    if (message.length > 200) return res.json({ ok: false, reply: '问题有点长，请精简到 200 字以内哦～' });
    const sessionId = String(req.body.sessionId || '').trim().slice(0, 64) || undefined;
    const result = await reply(message, sessionId);
    res.json(result);
}));

module.exports = router;
