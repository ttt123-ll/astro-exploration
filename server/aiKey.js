// 用户自带 AI Key：格式校验、掩码、连通性验证（不落库、不写日志）
const config = require('./config');

function maskKey(key) {
    const k = String(key || '');
    if (!k) return '';
    if (k.length <= 10) return '****';
    return k.slice(0, 7) + '****' + k.slice(-4);
}

/* 只接受常见的 sk- 开头 Key 形态，避免把任意字符串发到上游 */
function normalizeKey(value) {
    const k = String(value || '').trim();
    if (!k || k.length > 200) return '';
    return /^sk-[A-Za-z0-9_-]{8,}$/.test(k) ? k : '';
}

function siteKey() {
    return config.ai.apiKey || '';
}

/* 验证 Key：DeepSeek 用 /user/balance，兼容 OpenAI 用 /models */
async function verifyKey(value) {
    const key = normalizeKey(value);
    if (!key) return { valid: false, message: 'Key 格式不正确，应以 sk- 开头' };

    const base = config.ai.baseUrl.replace(/\/+$/, '');
    const t0 = Date.now();
    const timeout = () => AbortSignal.timeout(12000);
    try {
        let r = await fetch(base + '/user/balance', { headers: { Authorization: 'Bearer ' + key }, signal: timeout() });
        if (r.status === 404) {
            r = await fetch(base + '/models', { headers: { Authorization: 'Bearer ' + key }, signal: timeout() });
        }
        if (!r.ok) {
            const hint = r.status === 401 ? 'Key 无效或已过期' : r.status === 429 ? '请求过于频繁，请稍后再试' : '上游返回 HTTP ' + r.status;
            return { valid: false, message: '校验失败：' + hint };
        }
        let balance = null;
        try {
            const j = await r.json();
            if (typeof j.is_available === 'boolean') {
                balance = {
                    available: j.is_available,
                    infos: (j.balance_infos || []).map(b => ({
                        currency: b.currency,
                        total: b.total_balance,
                        granted: b.granted_balance,
                        toppedUp: b.topped_up_balance
                    }))
                };
            }
        } catch (e) { /* 非 JSON 响应忽略 */ }
        return {
            valid: true,
            maskedKey: maskKey(key),
            model: config.ai.model,
            responseTimeMs: Date.now() - t0,
            balance,
            message: '连接成功，该 Key 可用'
        };
    } catch (e) {
        const msg = e && e.name === 'TimeoutError' ? '请求超时，请检查网络' : '无法连接上游服务';
        return { valid: false, message: '校验失败：' + msg };
    }
}

module.exports = { maskKey, normalizeKey, siteKey, verifyKey };
