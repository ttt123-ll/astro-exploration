/**
 * 流式问答工具：SSE 解析 + 普通接口降级。
 * onMeta / onDelta / onReasoning / onDone 回调；返回 done 事件数据。
 * 失败（不支持流式 / 网络错误）时抛出，由调用方决定是否降级到非流式接口。
 */
export async function streamChat({
    message,
    sessionId,
    audience = 'amateur',
    model = 'deepseek-chat',
    headers = {},
    signal,
    onMeta,
    onDelta,
    onReasoning,
    onDone
}) {
    const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ message, sessionId, audience, model }),
        signal
    });
    if (!res.ok || !res.body) throw new Error('stream-unavailable');

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    let doneData = null;

    for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = buf.indexOf('\n\n')) >= 0) {
            const raw = buf.slice(0, idx).trim();
            buf = buf.slice(idx + 2);
            if (!raw.startsWith('data:')) continue;
            let evt;
            try { evt = JSON.parse(raw.slice(5).trim()); } catch (e) { continue; }
            if (evt.type === 'meta') { if (onMeta) onMeta(evt); }
            else if (evt.type === 'delta') { if (onDelta) onDelta(evt.text || ''); }
            else if (evt.type === 'reasoning') { if (onReasoning) onReasoning(evt.text || ''); }
            else if (evt.type === 'done') { doneData = evt; if (onDone) onDone(evt); }
            else if (evt.type === 'error') throw new Error(evt.message || '生成失败');
        }
    }
    return doneData;
}

/** 读取本地 AI 连接配置（我的 Key / 模型） */
export function readAiPrefs() {
    let key = '';
    let model = 'deepseek-chat';
    try {
        key = localStorage.getItem('astro_ai_key') || '';
        const m = localStorage.getItem('astro_ai_model');
        if (m === 'deepseek-reasoner' || m === 'deepseek-chat') model = m;
    } catch (e) { /* 隐私模式 */ }
    return {
        key,
        model,
        headers: key ? { 'X-AI-Key': key } : {}
    };
}
