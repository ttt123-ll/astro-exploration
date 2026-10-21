// 天文工具调用：月相计算 / 今夜观星 / 页面导航
// 全部为本地纯 JS 计算，无外部依赖，离线可用
const { loadEsmForTools } = require('./data');

/* ---------- 月相 ---------- */
const SYNODIC = 29.530588853;           // 朔望月（天）
const KNOWN_NEW_MOON_JD = 2451550.1;   // 2000-01-06 18:14 UTC 新月

function julianDay(date) {
    return date.getTime() / 86400000 + 2440587.5;
}

const PHASE_NAMES = [
    [1.84, '新月'], [5.53, '娥眉月'], [9.22, '上弦月'], [12.91, '盈凸月'],
    [16.61, '满月'], [20.30, '亏凸月'], [23.99, '下弦月'], [27.68, '残月'], [29.54, '新月']
];

function moonPhase(date = new Date()) {
    const age = ((julianDay(date) - KNOWN_NEW_MOON_JD) % SYNODIC + SYNODIC) % SYNODIC;
    const illumination = (1 - Math.cos(2 * Math.PI * age / SYNODIC)) / 2;
    const name = PHASE_NAMES.find(p => age < p[0])[1];
    const percent = Math.round(illumination * 100);
    const advice = percent < 35
        ? '月光干扰小，是观测深空天体和流星雨的好时机'
        : percent > 70
            ? '月光较强，适合观测月面细节和亮行星，深空天体建议避开月光'
            : '月光适中，可以欣赏月相变化，深空观测需选择后半夜';
    return `今晚月相：${name}（月龄 ${age.toFixed(1)} 天，照亮约 ${percent}%）。${advice}。`;
}

/* ---------- 当季星座 ---------- */
const SEASON_MONTH = ['冬季', '冬季', '春季', '春季', '春季', '夏季', '夏季', '夏季', '秋季', '秋季', '秋季', '冬季'];

function currentSeason(date = new Date()) {
    return SEASON_MONTH[date.getMonth()];
}

function seasonConstellations(date = new Date()) {
    const constellations = loadEsmForTools('constellations.js');
    const season = currentSeason(date);
    const list = constellations.filter(c => c.season === season);
    const names = list.map(c => `${c.name}（${c.bestView}，最亮星 ${c.brightestStar}）`).join('；');
    return `现在正值${season}。${season}夜空的代表星座：${names}。` +
        `天黑后朝正南方向（北半球中纬度）抬头寻找，避开灯光与月光效果更好。`;
}

/* ---------- 页面导航意图 ---------- */
const NAV_PAGES = [
    { re: /太阳系|行星列表/, route: '/solar-system', label: '太阳系行星' },
    { re: /星球投影|全息投影/, route: '/planet-show', label: '星球投影' },
    { re: /百科|恒星与星系|黑洞科普/, route: '/encyclopedia', label: '天文百科' },
    { re: /四季星座|星座页/, route: '/constellations', label: '四季星座' },
    { re: /图集|星空图/, route: '/gallery', label: '星空图集' },
    { re: /时间线/, route: '/timeline', label: '宇宙时间线' },
    { re: /近地天体|小行星.*(观察|监测)/, route: '/neo', label: '近地天体观察' },
    { re: /新闻/, route: '/news', label: '宇宙新闻' },
    { re: /测验|答题|比赛/, route: '/community', label: '知识测验', query: { tab: 'quiz' } },
    { re: /留言|社区/, route: '/community', label: '互动社区' },
    { re: /排行榜|榜单/, route: '/community', label: '星际排行榜', query: { tab: 'leaderboard' } },
    { re: /视频/, route: '/videos', label: '科普视频' },
    { re: /深空天体/, route: '/deep-space', label: '深空天体' },
    { re: /探索工具|工具/, route: '/explore', label: '探索工具' }
];

/* 行星详情直达：比如"带我去看木星" */
const PLANET_EN = { 水星: 'mercury', 金星: 'venus', 地球: 'earth', 火星: 'mars', 木星: 'jupiter', 土星: 'saturn', 天王星: 'uranus', 海王星: 'neptune' };

function matchNavigation(msg) {
    // "带我去/看看/打开 X" 的意图
    const nav = NAV_PAGES.find(n => n.re.test(msg));
    if (nav) return { type: 'navigate', route: nav.route, query: nav.query || null, label: nav.label };

    const planet = Object.keys(PLANET_EN).find(name => msg.includes(name));
    if (planet && /带我去|看看|看|打开|去.*页/.test(msg)) {
        return { type: 'navigate', route: `/detail/planet/${PLANET_EN[planet]}`, query: null, label: `${planet}详情页` };
    }
    return null;
}

/* ---------- 工具分发 ---------- */
const TONIGHT_RE = /今晚|今夜|现在.*(看|观)|这个季节|本月.*(星座|看)|能看到什么|观星/;
const MOON_RE = /月相|月亮.*(圆|缺|变化)|今晚.*月亮/;

function runTools(msg) {
    const results = [];
    let action = null;

    if (MOON_RE.test(msg) || TONIGHT_RE.test(msg)) results.push(moonPhase());
    if (TONIGHT_RE.test(msg) && /星|观星|看|什么/.test(msg)) results.push(seasonConstellations());

    action = matchNavigation(msg);
    return { results, action };
}

module.exports = { runTools, moonPhase, currentSeason };
