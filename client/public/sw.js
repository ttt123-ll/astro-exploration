/**
 * Service Worker：网络优先 + 缓存兜底
 *
 * 策略选择理由：
 * - HTML / 导航请求：network-first（保证每次拿到最新页面；断网时回退缓存）
 * - 静态资源（js/css/图片/字体）：stale-while-revalidate（先快后新）
 * - /api/*：不缓存，直接放行（数据实时性优先）
 * - 3D 大资源与视频：不预缓存，仅运行时按需缓存
 */
const CACHE_VERSION = 'astro-v1';
const SHELL_CACHE = `shell-${CACHE_VERSION}`;
const ASSET_CACHE = `asset-${CACHE_VERSION}`;

const PRECACHE = [
    '/',
    '/manifest.webmanifest',
    '/assets/brand/icon-192.png',
    '/assets/brand/icon-512.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(SHELL_CACHE)
            .then(cache => cache.addAll(PRECACHE).catch(() => null))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys.filter(k => ![SHELL_CACHE, ASSET_CACHE].includes(k)).map(k => caches.delete(k))
        )).then(() => self.clients.claim())
    );
});

function isAsset(url) {
    return /\.(?:js|css|png|jpe?g|webp|svg|gif|woff2?|ttf|ico)$/i.test(url.pathname);
}

self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;

    const url = new URL(req.url);

    // 只处理同源请求
    if (url.origin !== self.location.origin) return;

    // API 不缓存
    if (url.pathname.startsWith('/api/')) return;

    // 页面导航：network-first，失败回退缓存首页
    if (req.mode === 'navigate') {
        event.respondWith(
            fetch(req)
                .then(res => {
                    const copy = res.clone();
                    caches.open(SHELL_CACHE).then(c => c.put(req, copy)).catch(() => null);
                    return res;
                })
                .catch(() => caches.match(req).then(hit => hit || caches.match('/')))
        );
        return;
    }

    // 静态资源：stale-while-revalidate
    if (isAsset(url)) {
        event.respondWith(
            caches.open(ASSET_CACHE).then(async (cache) => {
                const cached = await cache.match(req);
                const network = fetch(req).then(res => {
                    if (res && res.ok) cache.put(req, res.clone()).catch(() => null);
                    return res;
                }).catch(() => null);
                return cached || network || new Response('', { status: 504 });
            })
        );
    }
});
