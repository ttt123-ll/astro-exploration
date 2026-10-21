// AI 天文问答：RAG 检索增强 + 装备导购 + 多受众模式（多轮会话 / 溯源 / 三级降级）
const express = require('express');
const { reply, usingLLM } = require('../chat');
const { kbStats } = require('../rag/data');
const { vectorMode, indexStats } = require('../rag/search');
const gearAdvisor = require('../rag/gearAdvisor');
const wrap = require('../asyncRoute');

const router = express.Router();

/* ---------- 受众模式与装备导购元数据 ---------- */
router.get('/chat/audiences', (req, res) => {
    res.json({
        ok: true,
        audiences: gearAdvisor.AUDIENCES,
        purposes: gearAdvisor.PURPOSES,
        budgets: gearAdvisor.BUDGET_TIERS
    });
});

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
        audiences: gearAdvisor.AUDIENCES,      // 多受众模式
        gear: {                                // 装备导购能力
            purposes: gearAdvisor.PURPOSES,
            budgets: gearAdvisor.BUDGET_TIERS
        },
        kb: kbStats()
    });
});

/* ---------- 装备导购（结构化，供前端表单直接调用） ---------- */
router.post('/chat/gear', wrap(async (req, res) => {
    const audience = ['child', 'amateur', 'pro'].includes(req.body.audience) ? req.body.audience : 'amateur';
    const budgetText = String(req.body.budget || '').trim();
    const priorities = Array.isArray(req.body.priorities) ? req.body.priorities.slice(0, 4) : [];
    const parsed = budgetText ? gearAdvisor.parseBudget(budgetText) : null;
    const result = gearAdvisor.advise('', { audience, budget: parsed, priorities });
    res.json({ ok: true, level: 2, levelLabel: '装备导购引擎', audience, ...result });
}));

router.post('/chat', wrap(async (req, res) => {
    const message = String(req.body.message || '').trim();
    if (!message) return res.json({ ok: false, reply: '请输入你想问的天文问题～', sources: [], level: 3 });
    if (message.length > 200) return res.json({ ok: false, reply: '问题有点长，请精简到 200 字以内哦～', sources: [], level: 3 });
    const sessionId = String(req.body.sessionId || '').trim().slice(0, 64) || undefined;
    const audience = ['child', 'amateur', 'pro'].includes(req.body.audience) ? req.body.audience : 'amateur';
    const result = await reply(message, sessionId, audience);
    res.json(result);
}));

module.exports = router;
