<script setup>
import { useUi } from '../store/ui';
import BookSection from '../components/BookSection.vue';
const ui = useUi();
</script>

<template>
    <div class="container" style="max-width:760px;">
        <div class="page-header">
            <span class="page-kicker">DEPLOYMENT</span>
            <h1>系统部署说明</h1>
            <p>本系统采用 Vue 3 前端 + Node.js Express 后端 + MySQL 数据库，一键启动即可运行。</p>
        </div>

        <div class="scale-card" style="text-align:center;">
            <div class="facts-icon" style="margin-bottom:1.4rem;"><i class="fas fa-rocket"></i></div>
            <h2 class="section-title" style="font-size:1.5rem;margin-bottom:0.8rem;">启动方式</h2>
            <p style="color:var(--color-text-secondary);margin-bottom:1.8rem;line-height:2;">
                1. 先启动 MySQL（双击 start-db.bat）；<br>
                2. 双击 start.bat 一键启动前后端；<br>
                3. 浏览器访问 http://127.0.0.1:5173
            </p>
            <button class="btn btn-gold" @click="ui.toastMsg('已复制启动说明，详见项目根目录 README.md')">
                <i class="fas fa-copy"></i> 查看完整文档
            </button>
            <div style="margin-top:2rem;text-align:left;background:rgba(159,212,248,0.08);border:1px solid rgba(159,212,248,0.25);border-radius:12px;padding:1.2rem 1.4rem;color:var(--color-text-secondary);font-size:0.9rem;line-height:1.9;">
                <strong style="color:var(--color-gold);">技术栈</strong><br>
                前端：Vue 3 + Vite + Vue Router + Pinia + Axios<br>
                后端：Node.js + Express + JWT + bcryptjs<br>
                数据库：MySQL 8.0（数据目录位于 E:\mysql\data）<br>
                默认管理员：admin / admin123
            </div>
        </div>

        <BookSection topic="download" />
    </div>
</template>
