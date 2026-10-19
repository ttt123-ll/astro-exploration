import { defineStore } from 'pinia';
import api from '../api';

/**
 * 认证状态：token 存在 httpOnly Cookie 里，前端只保存用户信息
 * （页面刷新后通过 /api/me 恢复会话）
 */
export const useAuth = defineStore('auth', {
    state: () => ({
        user: null,
        loaded: false
    }),
    getters: {
        loggedIn: (s) => !!s.user,
        isAdmin: (s) => !!s.user && s.user.role === 'admin'
    },
    actions: {
        async login(username, password) {
            const { data } = await api.post('/login', { username, password });
            this.user = data.user;
            this.loaded = true;
            return data;
        },
        async register(payload) {
            const { data } = await api.post('/register', payload);
            this.user = data.user;
            this.loaded = true;
            return data;
        },
        async logout() {
            try { await api.post('/logout'); } catch (e) { /* 忽略 */ }
            this.user = null;
        },
        async fetchMe() {
            if (this.loaded) return;
            // 没有登录提示 Cookie 时不必请求（避免游客每次访问都产生 401 噪声）
            if (!document.cookie.split(';').some(c => c.trim().startsWith('astro_uid='))) {
                this.user = null;
                this.loaded = true;
                return;
            }
            try {
                const { data } = await api.get('/me');
                this.user = data.user;
            } catch (e) {
                this.user = null;
            } finally {
                this.loaded = true;
            }
        }
    }
});
