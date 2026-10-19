// 时间工具：后端统一返回 ISO 8601（带 Z / 偏移），前端按浏览器本地时区展示
export function toDate(v) {
    if (!v) return null;
    if (v instanceof Date) return v;
    // 兼容 "2026-10-17 06:58:41"（无时区）与 ISO 字符串
    const s = String(v);
    const d = s.includes('T') || s.endsWith('Z') ? new Date(s) : new Date(s.replace(' ', 'T') + '+08:00');
    return isNaN(d.getTime()) ? null : d;
}

export function relTime(v) {
    const d = toDate(v);
    if (!d) return '';
    const diff = Math.max(0, (Date.now() - d.getTime()) / 1000);
    if (diff < 60) return '刚刚';
    if (diff < 3600) return Math.floor(diff / 60) + ' 分钟前';
    if (diff < 86400) return Math.floor(diff / 3600) + ' 小时前';
    if (diff < 86400 * 30) return Math.floor(diff / 86400) + ' 天前';
    return Math.floor(diff / (86400 * 30)) + ' 个月前';
}

/** 完整日期时间：2026-10-17 14:30 */
export function fmtDateTime(v) {
    const d = toDate(v);
    if (!d) return '';
    const p = n => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
        + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
}

/** 仅日期：2026-10-17 */
export function fmtDate(v) {
    const d = toDate(v);
    if (!d) return '';
    const p = n => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

export function clockTime(d = new Date()) {
    const p = n => String(n).padStart(2, '0');
    return p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
}
