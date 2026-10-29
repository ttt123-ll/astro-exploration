// 移动端预览页交互（独立文件，避免 CSP 内联脚本限制）
(function () {
    // 真机访问 /m 时自动进入响应式手机版（避免“手机中的手机”）
    if (window.innerWidth < 768) {
        location.replace('/');
        return;
    }

    var copyBtn = document.getElementById('copy-link');
    if (copyBtn) {
        copyBtn.addEventListener('click', function () {
            var url = location.origin + '/m';
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(url).then(function () {
                    copyBtn.textContent = '已复制';
                    setTimeout(function () { copyBtn.textContent = '复制本页地址'; }, 1500);
                }, function () { prompt('复制下面的地址：', url); });
            } else {
                prompt('复制下面的地址：', url);
            }
        });
    }
})();
