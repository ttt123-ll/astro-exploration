// AI 天文问答：默认走内置知识库；配置 AI_API_KEY 后切换真实大模型
const express = require('express');
const { reply, usingLLM } = require('../chat');
const wrap = require('../asyncRoute');

const router = express.Router();

router.get('/chat/mode', (req, res) => {
    res.json({ ok: true, mode: usingLLM() ? 'llm' : 'knowledge-base' });
});

router.post('/chat', wrap(async (req, res) => {
    const message = String(req.body.message || '').trim();
    if (!message) return res.json({ ok: false, reply: '请输入你想问的天文问题～' });
    if (message.length > 200) return res.json({ ok: false, reply: '问题有点长，请精简到 200 字以内哦～' });
    const answer = await reply(message);
    res.json({ ok: true, reply: answer, mode: usingLLM() ? 'llm' : 'knowledge-base' });
}));

module.exports = router;
