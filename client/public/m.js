// 移动端预览页：真机跳转 + 手机框自适应缩放（外层不滚动，手机完整可见）
(function () {
    // 只在“真正的手机/平板”上自动进入响应式版；电脑窄窗口仍显示手机预览
    var ua = navigator.userAgent || '';
    var isMobileDevice = /Android|iPhone|iPad|iPod|Mobile|HarmonyOS/i.test(ua) ||
        (navigator.maxTouchPoints > 1 && window.innerWidth < 900 && /Macintosh|Windows/.test(ua) === false);
    if (isMobileDevice && window.innerWidth < 1024) {
        location.replace('/');
        return;
    }

    var phone = document.getElementById('phone');
    if (!phone) return;

    var PHONE_W = 424;
    var PHONE_H = 880;
    var MARGIN_X = 24;
    var MARGIN_Y = 26;
    var MAX_SCALE = 0.88;   // 不撑满全屏，保留更多背景，看起来更像真实手机设备

    function fit() {
        var scale = Math.min(
            (window.innerWidth - MARGIN_X * 2) / PHONE_W,
            (window.innerHeight - MARGIN_Y * 2) / PHONE_H,
            MAX_SCALE
        );
        scale = Math.max(scale, 0.2);
        phone.style.setProperty('--scale', String(scale));
    }

    fit();
    window.addEventListener('resize', fit, { passive: true });
    window.addEventListener('orientationchange', function () {
        setTimeout(fit, 120);
    });
})();
