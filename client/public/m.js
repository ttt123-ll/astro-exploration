// 移动端预览页：真机跳转 + 按视口缩放手机框，保证外层不滚动
(function () {
    // 真机访问 /m 时自动进入响应式手机版（避免“手机中的手机”）
    if (window.innerWidth < 768) {
        location.replace('/');
        return;
    }

    var phone = document.getElementById('phone');
    if (!phone) return;

    var PHONE_W = 414;
    var PHONE_H = 872;
    var MARGIN = 16;

    function fit() {
        var scale = Math.min(
            (window.innerWidth - MARGIN * 2) / PHONE_W,
            (window.innerHeight - MARGIN * 2) / PHONE_H,
            1
        );
        // 避免极小窗口下缩放为 0
        scale = Math.max(scale, 0.2);
        phone.style.setProperty('--scale', String(scale));
    }

    fit();
    window.addEventListener('resize', fit, { passive: true });
    window.addEventListener('orientationchange', function () {
        setTimeout(fit, 120);
    });
})();
