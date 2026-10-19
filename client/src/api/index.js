import axios from 'axios';

/**
 * 统一 API 客户端
 * - 认证使用 httpOnly Cookie（前端拿不到 token，XSS 无法窃取）
 * - withCredentials 让浏览器自动携带同源 Cookie
 */
const api = axios.create({
    baseURL: '/api',
    timeout: 15000,
    withCredentials: true
});

export default api;
