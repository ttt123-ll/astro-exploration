import { createRouter, createWebHistory } from 'vue-router';
import api from '../api';
import { useAuth } from '../store/auth';

const routes = [
    { path: '/', name: 'home', component: () => import('../views/HomeView.vue'), meta: { title: '首页' } },
    { path: '/solar-system', name: 'solar', component: () => import('../views/SolarSystemView.vue'), meta: { title: '太阳系行星' } },
    { path: '/planet-show', name: 'planetshow', component: () => import('../views/PlanetShowView.vue'), meta: { title: '星球投影' } },
    { path: '/space-flight', redirect: '/planet-show' },
    // 天文百科 = 恒星与星系 + 黑洞科普
    { path: '/encyclopedia', name: 'encyclopedia', component: () => import('../views/EncyclopediaView.vue'), meta: { title: '天文百科' } },
    { path: '/stars-galaxies', redirect: () => ({ path: '/encyclopedia', query: { tab: 'stars' } }) },
    { path: '/black-hole', redirect: () => ({ path: '/encyclopedia', query: { tab: 'bh' } }) },
    { path: '/constellations', name: 'constellations', component: () => import('../views/ConstellationsView.vue'), meta: { title: '四季星座' } },
    { path: '/gallery', name: 'gallery', component: () => import('../views/GalleryView.vue'), meta: { title: '星空图集' } },
    { path: '/timeline', name: 'timeline', component: () => import('../views/TimelineView.vue'), meta: { title: '宇宙时间线' } },
    { path: '/neo', name: 'neo', component: () => import('../views/NeoView.vue'), meta: { title: '近地天体观察' } },
    { path: '/videos', name: 'videos', component: () => import('../views/VideosView.vue'), meta: { title: '科普视频' } },
    { path: '/news', name: 'news', component: () => import('../views/NewsView.vue'), meta: { title: '宇宙新闻' } },
    { path: '/credits', name: 'credits', component: () => import('../views/CreditsView.vue'), meta: { title: '素材来源' } },
    // 互动社区 = 知识测验 + 留言板 + 排行榜
    { path: '/community', name: 'community', component: () => import('../views/CommunityView.vue'), meta: { title: '互动社区' } },
    { path: '/quiz', redirect: () => ({ path: '/community', query: { tab: 'quiz' } }) },
    { path: '/messages', redirect: () => ({ path: '/community', query: { tab: 'messages' } }) },
    { path: '/leaderboard', redirect: '/community' },
    { path: '/explore', name: 'explore', component: () => import('../views/ExploreView.vue'), meta: { title: '探索工具' } },
    { path: '/deep-space', name: 'deepspace', component: () => import('../views/DeepSpaceView.vue'), meta: { title: '深空天体' } },
    { path: '/download', name: 'download', component: () => import('../views/DownloadView.vue'), meta: { title: '资料下载' } },
    { path: '/login', name: 'login', component: () => import('../views/LoginView.vue'), meta: { title: '登录' } },
    { path: '/register', name: 'register', component: () => import('../views/RegisterView.vue'), meta: { title: '注册' } },
    { path: '/admin', name: 'admin', component: () => import('../views/AdminView.vue'), meta: { title: '后台管理', requiresAuth: true, requiresAdmin: true } },
    { path: '/detail/:group/:key', name: 'detail', component: () => import('../views/DetailView.vue'), meta: { title: '详情' } },
    { path: '/:pathMatch(.*)*', name: 'notfound', component: () => import('../views/NotFoundView.vue'), meta: { title: '404' } }
];

/* ---- 首页滚动位置记忆 ---- */
let homeScroll = 0;   // 离开首页时的滚动位置，返回首页时恢复

// 首页内容异步加载、高度会变化，等页面足够高再落位，避免滚不到目标位置
function restoreHomeScroll() {
    const target = homeScroll;
    return new Promise((resolve) => {
        let tries = 0;
        const attempt = () => {
            const maxTop = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
            if (maxTop >= target - 4 || tries >= 24) {
                resolve({ top: Math.min(target, maxTop), behavior: 'smooth' });
                return;
            }
            tries++;
            setTimeout(attempt, 60);
        };
        setTimeout(attempt, 40);
    });
}

const router = createRouter({
    history: createWebHistory(),
    routes,
    scrollBehavior(to, from, savedPosition) {
        // 1. 浏览器前进/后退：优先恢复原位置
        if (savedPosition) return savedPosition;

        // 2. 回到首页：恢复离开首页时的滚动位置（不从头开始）
        if (to.name === 'home' && homeScroll > 0) {
            return restoreHomeScroll();
        }

        // 3. 其余页面：回到顶部
        return { top: 0, behavior: 'smooth' };
    }
});

// 全局路由守卫：内容页完全公开（利于传播与 SEO），仅受控页面要求登录
router.beforeEach(async (to, from) => {
    // 记录离开首页时的滚动位置，供「返回首页」恢复
    if (from.name === 'home' && to.name !== 'home') {
        homeScroll = Math.max(0, Math.round(window.scrollY || window.pageYOffset || 0));
    }

    const auth = useAuth();
    if (!auth.loaded) {
        await auth.fetchMe();
    }

    // 1. 显式声明需要登录的页面
    if (to.meta.requiresAuth && !auth.loggedIn) {
        return { path: '/login', query: { next: to.fullPath } };
    }
    // 2. 需要管理员权限
    if (to.meta.requiresAdmin && !auth.isAdmin) {
        return { path: '/' };
    }
    // 3. 已登录再访问登录/注册页 → 回首页
    if ((to.path === '/login' || to.path === '/register') && auth.loggedIn) {
        return { path: '/' };
    }
});

router.afterEach((to) => {
    document.title = (to.meta.title ? to.meta.title + ' - ' : '') + '宇宙探索';
    // 访问统计（后台静默记录，失败不影响页面）
    api.post('/visit', { path: to.fullPath }).catch(() => {});
});

export default router;
