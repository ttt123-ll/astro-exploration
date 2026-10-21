// 天文工具调用：月相计算 / 今夜观星 / 页面导航
// 全部为本地纯 JS 计算，无外部依赖，断网也能演示（比赛的三个「哇」时刻）
const { loadEsmForTools } = require('./data');

/* ---------- 月相 ---------- */
const SYNODIC = 29.530588853;            // 朔望月（天）
const KNOWN_NEW_MOON_JD = 2451550.1;    // 2000-01-06 18:14 UTC 新月
const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

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
    const found = PHASE_NAMES.find(p => age < p[0]);
    const name = found ? found[1] : '新月';
    const percent = Math.round(illumination * 100);
    const score = Math.max(0, Math.round(100 - illumination * 70));
    const advice = percent < 35
        ? '月光干扰小，是观测深空天体和流星雨的好时机'
        : percent > 70
            ? '月光较强，适合观测月面细节和亮行星，深空天体建议避开月光'
            : '月光适中，可以欣赏月相变化，深空观测需选择后半夜';
    return `今晚月相：${name}（月龄 ${age.toFixed(1)} 天，照亮约 ${percent}%，观星指数 ${score}/100）。${advice}。`;
}

/* ---------- 日出日落 / 天文暮光 ---------- */
function dayOfYear(date) {
    const start = Date.UTC(date.getFullYear(), 0, 0);
    return Math.floor((date.getTime() - start) / 86400000);
}

function sunTimes(date = new Date(), lat = 35, lon = 110) {
    const N = dayOfYear(date);
    const decl = -23.44 * Math.cos(RAD * (360 / 365) * (N + 10));
    const cosH = -Math.tan(RAD * lat) * Math.tan(RAD * decl);
    if (cosH <= -1 || cosH >= 1) return null;
    const H = Math.acos(cosH) * DEG;

    const B = RAD * (360 / 365) * (N - 81);
    const eot = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
    const noon = 12 - (lon - 120) / 15 - eot / 60;

    const sin18 = Math.sin(-18 * RAD);
    const cosH18 = (sin18 - Math.sin(RAD * lat) * Math.sin(RAD * decl)) /
        (Math.cos(RAD * lat) * Math.cos(RAD * decl));
    const H18 = Math.abs(cosH18) <= 1 ? Math.acos(cosH18) * DEG : H;

    return { sunset: noon + H / 15, dusk: noon + H18 / 15 };
}

function fmtClock(hours) {
    if (hours == null || !Number.isFinite(hours)) return '—';
    let h = ((hours % 24) + 24) % 24;
    let m = Math.round((h % 1) * 60);
    if (m === 60) { m = 0; h += 1; }
    return String(Math.floor(h) % 24).padStart(2, '0') + ':' + String(m).padStart(2, '0');
}

/* ---------- 恒星时与地平坐标（判断星座方位/高度） ---------- */
function localSiderealTime(date = new Date(), lon = 110) {
    const jd = date.getTime() / 86400000 + 2440587.5;
    const T = (jd - 2451545.0) / 36525;
    let gmst = 280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * T * T - (T * T * T) / 38710000;
    gmst = ((gmst % 360) + 360) % 360;
    return (((gmst + lon) / 15) % 24 + 24) % 24;
}

function altAz(raH, decDeg, lstH, latDeg) {
    const H = (lstH - raH) * 15 * RAD;
    const d = decDeg * RAD, phi = latDeg * RAD;
    const sinAlt = Math.sin(d) * Math.sin(phi) + Math.cos(d) * Math.cos(phi) * Math.cos(H);
    const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt))) * DEG;
    let cosAz = (Math.sin(d) - Math.sin(alt * RAD) * Math.sin(phi)) / (Math.cos(alt * RAD) * Math.cos(phi));
    if (!Number.isFinite(cosAz)) cosAz = 0;
    let az = Math.acos(Math.max(-1, Math.min(1, cosAz))) * DEG;
    if (Math.sin(H) > 0) az = 360 - az;
    return { alt, az };
}

const DIRS = ['北', '东北', '东', '东南', '南', '西南', '西', '西北'];
function azToDir(az) { return DIRS[Math.round((((az % 360) + 360) % 360) / 45) % 8]; }

/* 八个代表星座的中心赤经/赤纬（J2000，从星图连线数据归纳） */
const CONS_CENTER = {
    Orion: { cn: '猎户座', ra: 5.6, dec: 5 },
    Scorpius: { cn: '天蝎座', ra: 16.9, dec: -30 },
    Leo: { cn: '狮子座', ra: 10.5, dec: 15 },
    Cassiopeia: { cn: '仙后座', ra: 1.0, dec: 60 },
    Taurus: { cn: '金牛座', ra: 4.5, dec: 17 },
    Cygnus: { cn: '天鹅座', ra: 20.5, dec: 42 },
    Virgo: { cn: '室女座', ra: 13.4, dec: -4 },
    Pegasus: { cn: '飞马座', ra: 22.7, dec: 20 }
};

/* ---------- 当季星座 ---------- */
const SEASON_MONTH = ['冬季', '冬季', '春季', '春季', '春季', '夏季', '夏季', '夏季', '秋季', '秋季', '秋季', '冬季'];

function currentSeason(date = new Date()) {
    return SEASON_MONTH[date.getMonth()];
}

function seasonConstellations(date = new Date(), opts = {}) {
    const lat = opts.lat || 35;
    const lon = opts.lon || 110;
    let constellations = [];
    try { constellations = loadEsmForTools('constellations.js'); } catch (e) { constellations = []; }
    const season = currentSeason(date);
    const list = constellations.filter(c => c.season === season);

    // 今晚 21:00 的位置
    const tonight = new Date(date);
    tonight.setHours(21, 0, 0, 0);
    if (tonight.getTime() < date.getTime()) tonight.setDate(tonight.getDate() + 1);
    const lst = localSiderealTime(tonight, lon);

    const parts = list.map(c => {
        const center = CONS_CENTER[c.latinName];
        if (!center) return `${c.name}（${c.bestView}）`;
        const { alt, az } = altAz(center.ra, center.dec, lst, lat);
        const visible = alt > 10;
        return `${c.name}（${c.bestView}，今晚 21 点约在${azToDir(az)}方、高度 ${Math.round(alt)}°${visible ? '，可观测' : '，位置偏低'}）`;
    });

    const sun = sunTimes(date, lat, lon);
    const window = sun ? `今夜日落后天文暮光约 ${fmtClock(sun.dusk)} 结束，` +
        `最佳观测窗口约 ${fmtClock(Math.max(sun.dusk, sun.sunset + 1))} 到 ${fmtClock(Math.max(sun.dusk, sun.sunset + 1) + 4)}` : '';

    return `现在正值${season}。${window}。${season}夜空的代表星座：${parts.join('；')}。` +
        `建议朝南方天空寻找，避开城市灯光与月光，眼睛适应黑暗约需 20 分钟。`;
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
    const nav = NAV_PAGES.find(n => n.re.test(msg));
    if (nav) return { type: 'navigate', route: nav.route, query: nav.query || null, label: nav.label };

    const planet = Object.keys(PLANET_EN).find(name => msg.includes(name));
    if (planet && /带我去|看看|看|打开|去.*页/.test(msg)) {
        return { type: 'navigate', route: `/detail/planet/${PLANET_EN[planet]}`, query: null, label: `${planet}详情页` };
    }
    return null;
}

/* ---------- 工具分发 ---------- */
const TONIGHT_RE = /今晚|今夜|现在.*(看|观)|这个季节|本月.*(星座|看)|能看到什么|观星|适合.*观测/;
const MOON_RE = /月相|月亮.*(圆|缺|变化)|今晚.*月亮/;

function runTools(msg) {
    const results = [];
    const tools = [];

    if (MOON_RE.test(msg)) { results.push(moonPhase()); tools.push('moon-phase'); }
    if (TONIGHT_RE.test(msg)) {
        // 「今晚观星」= 月相 + 星座方位 + 观测窗口，三合一
        if (!tools.includes('moon-phase')) { results.push(moonPhase()); tools.push('moon-phase'); }
        results.push(seasonConstellations());
        tools.push('tonight-sky');
    }

    const action = matchNavigation(msg);
    if (action) tools.push('navigate');

    return { results, action, tools };
}

module.exports = {
    runTools, moonPhase, seasonConstellations, currentSeason,
    sunTimes, fmtClock, altAz, localSiderealTime
};
