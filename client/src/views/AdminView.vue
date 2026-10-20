<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuth } from '../store/auth';
import { useUi } from '../store/ui';
import api from '../api';
import { fmtDateTime } from '../utils/time';
import PageHeader from '../components/PageHeader.vue';

const auth = useAuth();
const ui = useUi();
const router = useRouter();
const stats = ref(null);
const trend = ref([]);
const pages = ref([]);
const users = ref([]);
const scores = ref([]);
const messages = ref([]);
const maxTrend = ref(1);

/* —— 新闻管理 —— */
const newsRows = ref([]);
const saving = ref(false);
const TAGS = ['深空探测', '中国航天', '载人航天', '行星科学', '太阳与空间天气', '黑洞与引力波', '恒星与银河', '空间望远镜', '天象与观测'];
const IMGS = [
    '/assets/images/milky_way.jpg', '/assets/images/jwst_deep_field.jpg', '/assets/images/andromeda_galaxy.jpg',
    '/assets/images/carina_nebula.jpg', '/assets/images/blackhole.jpg', '/assets/images/mars.jpg',
    '/assets/images/solar_eclipse.jpg', '/assets/images/star_pulsar.jpg', '/assets/images/telescope_webb.jpg',
    '/assets/images/news/moon.jpg', '/assets/images/news/sun.jpg', '/assets/images/news/station.jpg',
    '/assets/images/news/rocket.jpg', '/assets/images/news/comet.jpg', '/assets/images/news/exoplanet.jpg',
    '/assets/images/news/parker.jpg', '/assets/images/news/nebula_new.jpg',
    '/assets/images/official/jupiter_redspot.jpg', '/assets/images/official/saturn_rings.jpg', '/assets/images/official/webb_pillars.jpg'
];
const blankForm = () => ({ id: null, tag: '深空探测', title: '', summary: '', img: IMGS[0], source: '本站整理', source_url: '', is_top: false });
const form = ref(blankForm());

async function loadNews() {
    try {
        const { data } = await api.get('/news', { params: { limit: 200 } });
        newsRows.value = data.rows;
    } catch (e) { /* 静默 */ }
}
function editNews(n) {
    form.value = { id: n.id, tag: n.tag, title: n.title, summary: n.summary, img: n.img, source: n.source, source_url: n.source_url || '', is_top: !!n.is_top };
}
function resetForm() { form.value = blankForm(); }
async function saveNews() {
    if (!form.value.title.trim()) { ui.toastMsg('请填写新闻标题', 'error'); return; }
    if (!form.value.summary.trim()) { ui.toastMsg('请填写新闻摘要', 'error'); return; }
    saving.value = true;
    try {
        if (form.value.id) {
            await api.put('/admin/news/' + form.value.id, form.value);
            ui.toastMsg('新闻已更新，网站实时生效');
        } else {
            await api.post('/admin/news', form.value);
            ui.toastMsg('新闻已发布，网站实时生效');
        }
        resetForm();
        await loadNews();
    } catch (e) {
        ui.toastMsg(e.response?.data?.msg || '保存失败', 'error');
    } finally {
        saving.value = false;
    }
}
async function delNews(id) {
    if (!confirm('确定删除这条新闻吗？')) return;
    await api.delete('/admin/news/' + id);
    ui.toastMsg('已删除');
    await loadNews();
}

async function load() {
    try {
        const ov = await api.get('/admin/overview');
        stats.value = ov.data.stats; trend.value = ov.data.trend; pages.value = ov.data.pages;
        maxTrend.value = Math.max(...ov.data.trend.map(t => t.c), 1);
        const [u, s, m] = await Promise.all([
            api.get('/admin/users'), api.get('/admin/scores'), api.get('/admin/messages')
        ]);
        users.value = u.data.rows; scores.value = s.data.rows; messages.value = m.data.rows;
        await loadNews();
    } catch (e) {
        if (e.response?.status === 403 || e.response?.status === 401) {
            ui.toastMsg('需要管理员权限', 'error');
            router.push('/login');
        }
    }
}
async function del(path, id) {
    if (!confirm('确定删除吗？')) return;
    try {
        await api.delete(path + id);
        ui.toastMsg('已删除');
        load();
    } catch (e) {
        ui.toastMsg(e.response?.data?.error || '删除失败', 'error');
    }
}
onMounted(load);
</script>

<template>
    <div class="container">
        <PageHeader kicker="CONTROL CENTER" title="后台管理面板" icon="fa-gauge-high" :stats="[{ v: '5', l: '管理模块' }, { v: '实时', l: '数据监控' }]">
            欢迎回来，指挥官 <b style="color:var(--color-cyan);">{{ auth.user?.username }}</b>。这里监控着整个空间站的运行状况。
        </PageHeader>

        <div class="admin-stats" v-if="stats">
            <div class="admin-stat"><div class="v">{{ stats.users }}</div><div class="l"><i class="fas fa-users"></i> 注册用户</div></div>
            <div class="admin-stat"><div class="v">{{ stats.scores }}</div><div class="l"><i class="fas fa-trophy"></i> 测验提交</div></div>
            <div class="admin-stat"><div class="v">{{ stats.messages }}</div><div class="l"><i class="fas fa-comments"></i> 留言总数</div></div>
            <div class="admin-stat"><div class="v">{{ stats.visits_today }}</div><div class="l"><i class="fas fa-eye"></i> 今日访问</div></div>
            <div class="admin-stat"><div class="v">{{ stats.visits_total }}</div><div class="l"><i class="fas fa-chart-line"></i> 累计访问</div></div>
            <div class="admin-stat"><div class="v">{{ stats.ips }}</div><div class="l"><i class="fas fa-satellite-dish"></i> 独立访客</div></div>
        </div>

        <div class="admin-cols">
            <div class="sys-card">
                <h3 class="admin-h"><i class="fas fa-chart-column"></i> 近 7 日访问趋势</h3>
                <div class="trend-bars">
                    <div class="trend-col" v-for="t in trend" :key="t.day">
                        <div class="trend-bar" :style="{ height: Math.max(t.c / maxTrend * 100, 4) + '%' }" :title="t.c + ' 次'"></div>
                        <span class="trend-day">{{ t.day }}</span>
                        <span class="trend-num">{{ t.c }}</span>
                    </div>
                </div>
            </div>
            <div class="sys-card">
                <h3 class="admin-h"><i class="fas fa-fire"></i> 热门页面 TOP 10</h3>
                <table class="sys-table">
                    <thead><tr><th>#</th><th>页面</th><th>访问</th></tr></thead>
                    <tbody>
                        <tr v-for="(p, i) in pages" :key="p.path"><td>{{ i + 1 }}</td><td class="cell-path">{{ p.path }}</td><td><b class="pct-cell">{{ p.c }}</b></td></tr>
                    </tbody>
                </table>
            </div>
        </div>

        <div class="sys-card" style="margin-top:1.6rem;">
            <h3 class="admin-h"><i class="fas fa-comments"></i> 留言管理（最近 50 条）</h3>
            <div class="msg-list">
                <div v-for="m in messages" :key="m.id" class="msg-card">
                    <div class="msg-avatar">{{ m.username[0] }}</div>
                    <div class="msg-body">
                        <div class="msg-head">
                            <span class="msg-name">{{ m.username }}</span>
                            <span class="msg-time"><i class="fas fa-clock"></i> {{ fmtDateTime(m.created_at) }}</span>
                            <button class="sys-del-btn" style="margin-left:auto;" @click="del('/admin/messages/', m.id)"><i class="fas fa-trash-can"></i></button>
                        </div>
                        <p class="msg-content">{{ m.content }}</p>
                    </div>
                </div>
                <p v-if="!messages.length" style="color:var(--color-text-muted);text-align:center;padding:1.5rem;">暂无留言</p>
            </div>
        </div>

        <div class="sys-card" style="margin-top:1.6rem;">
            <h3 class="admin-h"><i class="fas fa-newspaper"></i> 新闻管理 <span class="admin-h-note">发布 / 修改后，网站新闻页会在 30 秒内自动同步</span></h3>

            <div class="news-form">
                <div class="nf-row">
                    <select v-model="form.tag" class="nf-input nf-select">
                        <option v-for="t in TAGS" :key="t" :value="t">{{ t }}</option>
                    </select>
                    <input v-model="form.title" class="nf-input" placeholder="新闻标题" maxlength="200">
                </div>
                <textarea v-model="form.summary" class="nf-input nf-area" placeholder="新闻摘要 / 正文简介" rows="3"></textarea>
                <div class="nf-row">
                    <select v-model="form.img" class="nf-input nf-select">
                        <option v-for="i in IMGS" :key="i" :value="i">{{ i.split('/').pop() }}</option>
                    </select>
                    <input v-model="form.source" class="nf-input" placeholder="来源（如 NASA / 本站整理）" maxlength="100">
                    <label class="nf-check"><input type="checkbox" v-model="form.is_top"> 置顶显示</label>
                </div>
                <input v-model="form.source_url" class="nf-input" placeholder="官方来源链接（可核验，如 https://webb.nasa.gov/）" maxlength="300">
                <div class="nf-actions">
                    <button class="btn btn-primary" style="padding:0.6rem 1.6rem;" :disabled="saving" @click="saveNews">
                        <i class="fas" :class="form.id ? 'fa-pen' : 'fa-plus'"></i> {{ form.id ? '保存修改' : '发布新闻' }}
                    </button>
                    <button class="btn btn-ghost" style="padding:0.6rem 1.4rem;" v-if="form.id" @click="resetForm">取消编辑</button>
                </div>
            </div>

            <table class="sys-table" style="margin-top:1.6rem;">
                <thead><tr><th>ID</th><th>分类</th><th>标题</th><th>发布时间</th><th></th></tr></thead>
                <tbody>
                    <tr v-for="n in newsRows" :key="n.id">
                        <td>{{ n.id }}</td>
                        <td><span class="badge-user">{{ n.tag }}</span></td>
                        <td class="cell-path">{{ n.title }}<span v-if="n.is_top" class="badge-admin" style="margin-left:0.4rem;">置顶</span></td>
                        <td class="cell-time">{{ fmtDateTime(n.published_at) }}</td>
                        <td>
                            <button class="sys-edit-btn" title="编辑" @click="editNews(n)"><i class="fas fa-pen"></i></button>
                            <button class="sys-del-btn" title="删除" @click="delNews(n.id)"><i class="fas fa-trash-can"></i></button>
                        </td>
                    </tr>
                    <tr v-if="!newsRows.length"><td colspan="5" style="color:var(--color-text-muted);text-align:center;">暂无新闻</td></tr>
                </tbody>
            </table>
        </div>

        <div class="admin-cols" style="margin-top:1.6rem;">
            <div class="sys-card">
                <h3 class="admin-h"><i class="fas fa-users"></i> 用户列表</h3>
                <table class="sys-table">
                    <thead><tr><th>ID</th><th>用户名</th><th>角色</th><th>注册时间</th><th></th></tr></thead>
                    <tbody>
                        <tr v-for="u in users" :key="u.id">
                            <td>{{ u.id }}</td><td><i class="fas fa-user-astronaut"></i> {{ u.username }}</td>
                            <td><span :class="u.role === 'admin' ? 'badge-admin' : 'badge-user'">{{ u.role === 'admin' ? '管理员' : '用户' }}</span></td>
                            <td class="cell-time">{{ fmtDateTime(u.created_at) }}</td>
                            <td>
                                <button v-if="u.role !== 'admin'" class="sys-del-btn" title="删除用户（连带其成绩与留言）"
                                        @click="del('/admin/users/', u.id)"><i class="fas fa-trash-can"></i></button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div class="sys-card">
                <h3 class="admin-h"><i class="fas fa-trophy"></i> 成绩记录（最近 50 条）</h3>
                <table class="sys-table">
                    <thead><tr><th>用户</th><th>正确率</th><th>提交</th><th></th></tr></thead>
                    <tbody>
                        <tr v-for="s in scores" :key="s.id">
                            <td>{{ s.username }}</td><td><b class="pct-cell">{{ s.pct }}%</b></td><td class="cell-time">{{ fmtDateTime(s.created_at) }}</td>
                            <td><button class="sys-del-btn" @click="del('/admin/scores/', s.id)"><i class="fas fa-trash-can"></i></button></td>
                        </tr>
                        <tr v-if="!scores.length"><td colspan="4" style="color:var(--color-text-muted);text-align:center;">暂无成绩</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</template>
