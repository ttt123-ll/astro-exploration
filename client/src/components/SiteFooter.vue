<script setup>
import { useUi } from '../store/ui';
const ui = useUi();
</script>

<template>
    <footer class="footer">
        <div class="container">
            <div class="footer-content">
                <div class="footer-section">
                    <h3>关于我们</h3>
                    <p>宇宙探索是一个致力于普及天文知识的科普网站。我们相信，好奇心是人类最宝贵的探测器——让更多人了解宇宙的奥秘，是我们不变的使命。</p>
                    <div class="social-links" style="margin-top:1.2rem;">
                        <a href="#" title="微博"><i class="fab fa-weibo"></i></a>
                        <a href="#" title="微信"><i class="fab fa-weixin"></i></a>
                        <a href="#" title="GitHub"><i class="fab fa-github"></i></a>
                        <a href="#" title="哔哩哔哩"><i class="fab fa-bilibili"></i></a>
                    </div>
                </div>
                <div class="footer-section">
                    <h3>快速链接</h3>
                    <ul>
                        <li><router-link to="/"><i class="fas fa-angle-right"></i>首页</router-link></li>
                        <li><router-link to="/solar-system"><i class="fas fa-angle-right"></i>太阳系行星</router-link></li>
                        <li><router-link to="/planet-show"><i class="fas fa-angle-right"></i>星球投影</router-link></li>
                        <li><router-link to="/encyclopedia"><i class="fas fa-angle-right"></i>天文百科</router-link></li>
                        <li><router-link to="/constellations"><i class="fas fa-angle-right"></i>四季星座</router-link></li>
                        <li><router-link to="/gallery"><i class="fas fa-angle-right"></i>星空图集</router-link></li>
                    </ul>
                </div>
                <div class="footer-section">
                    <h3>互动专题</h3>
                    <ul>
                        <li><router-link to="/timeline"><i class="fas fa-angle-right"></i>宇宙时间线</router-link></li>
                        <li><router-link to="/community"><i class="fas fa-angle-right"></i>互动社区</router-link></li>
                        <li><router-link to="/explore"><i class="fas fa-angle-right"></i>探索工具</router-link></li>
                        <li><router-link to="/deep-space"><i class="fas fa-angle-right"></i>深空天体</router-link></li>
                        <li><router-link to="/news"><i class="fas fa-angle-right"></i>宇宙新闻</router-link></li>
                        <li><router-link to="/credits"><i class="fas fa-angle-right"></i>素材来源与版权</router-link></li>
                        <li><router-link to="/download"><i class="fas fa-angle-right"></i>资料下载</router-link></li>
                    </ul>
                </div>
                <div class="footer-section">
                    <h3>订阅星际快讯</h3>
                    <p>不定期推送天文热点与观星指南，一起不错过每一次宇宙大事。</p>
                    <div class="footer-newsletter">
                        <input type="email" placeholder="输入你的邮箱" aria-label="邮箱地址">
                        <button type="button" @click="ui.toastMsg('订阅成功！星际快讯即将启程 ✦')">订阅</button>
                    </div>
                </div>
            </div>
            <div class="footer-bottom">
                <p>&copy; 2026 宇宙探索 - 天文科普网站系统 | 传智杯参赛作品</p>
                <p style="color:var(--color-text-muted);font-size:0.78rem;">Vue 3 + Node.js Express + MySQL · 背景视频素材：NASA / ESA 公有领域与维基共享（CC 授权）</p>
            </div>
        </div>
    </footer>
</template>
