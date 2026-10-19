// 结构化日志：单行 JSON，便于容器日志采集
function emit(level, msg, extra) {
    const rec = {
        ts: new Date().toISOString(),
        level,
        msg,
        ...(extra || {})
    };
    const line = JSON.stringify(rec);
    if (level === 'error') console.error(line);
    else if (level === 'warn') console.warn(line);
    else console.log(line);
}

module.exports = {
    info: (msg, extra) => emit('info', msg, extra),
    warn: (msg, extra) => emit('warn', msg, extra),
    error: (msg, extra) => emit('error', msg, extra),

    // 简易请求日志
    request(req, res, ms) {
        emit(res.statusCode >= 500 ? 'error' : 'info', 'http', {
            method: req.method,
            path: req.originalUrl,
            status: res.statusCode,
            ms,
            ip: (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0]
        });
    }
};
