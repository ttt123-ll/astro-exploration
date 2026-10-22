import { ref, onMounted, onBeforeUnmount } from 'vue';

/**
 * 移动端判定（响应式）：以 768px 为界，兼容横竖屏切换与桌面窗口缩放
 * - isMobile：是否为手机/小屏
 * - isTouch：是否触屏设备（用于触控交互增强）
 */
const query = typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(max-width: 768px)')
    : null;

const isMobile = ref(query ? query.matches : false);
const isTouch = ref(typeof window !== 'undefined' &&
    ('ontouchstart' in window || (navigator.maxTouchPoints || 0) > 0));

function sync(e) {
    isMobile.value = e ? e.matches : (query ? query.matches : false);
}

export function useMobile() {
    onMounted(() => {
        if (query && query.addEventListener) query.addEventListener('change', sync);
        else if (query && query.addListener) query.addListener(sync);
        sync(query);
    });
    onBeforeUnmount(() => {
        if (query && query.removeEventListener) query.removeEventListener('change', sync);
        else if (query && query.removeListener) query.removeListener(sync);
    });
    return { isMobile, isTouch };
}

/** 非组件环境（如 store / util）直接读取当前值 */
export function isMobileNow() {
    return !!(query && query.matches);
}
