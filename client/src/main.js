import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import './style.css';

document.documentElement.classList.add('js');

const app = createApp(App);
app.use(createPinia());
app.use(router);

// 全局滚动显现指令 v-reveal
const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
        if (e.isIntersecting) {
            e.target.classList.add('in');
            io.unobserve(e.target);
            setTimeout(() => e.target.classList.remove('reveal', 'in'), 1300);
        }
    });
}, { threshold: 0.12, rootMargin: '0px 0px -30px 0px' });

app.directive('reveal', {
    mounted(el) {
        el.classList.add('reveal');
        io.observe(el);
    }
});

// 数字滚动指令 v-count
app.directive('count', {
    mounted(el, binding) {
        const target = Number(binding.value) || 0;
        const suffix = binding.arg ? ' ' + binding.arg : '';
        const start = performance.now();
        const dur = 1600;
        function tick(now) {
            const p = Math.min((now - start) / dur, 1);
            const eased = 1 - Math.pow(1 - p, 3);
            el.textContent = Math.round(target * eased).toLocaleString('zh-CN') + suffix;
            if (p < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
    }
});

app.mount('#app');
