/**
 * 轻量天文计算（纯 JS，无任何外部依赖）
 * - 月相：基于朔望月周期推算，误差在数小时内，足够观星指南使用
 * - 日出日落 / 天文暮光：NOAA 简化算法
 * - 恒星时与地平坐标：用于判断「今晚此时某星座在哪个方向、多高」
 */

export const DAY_MS = 86400000;
export const SYNODIC_MONTH = 29.530588853;   // 朔望月（天）
const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

/* 已知新月时刻：2000-01-06 18:14 UTC */
const REF_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14, 0);

/* ===================== 月相 ===================== */
const PHASE_NAMES = [
    { name: '新月', en: 'New Moon', icon: 'fa-circle' },
    { name: '峨眉月', en: 'Waxing Crescent', icon: 'fa-moon' },
    { name: '上弦月', en: 'First Quarter', icon: 'fa-circle-half-stroke' },
    { name: '盈凸月', en: 'Waxing Gibbous', icon: 'fa-moon' },
    { name: '满月', en: 'Full Moon', icon: 'fa-circle' },
    { name: '亏凸月', en: 'Waning Gibbous', icon: 'fa-moon' },
    { name: '下弦月', en: 'Last Quarter', icon: 'fa-circle-half-stroke' },
    { name: '残月', en: 'Waning Crescent', icon: 'fa-moon' }
];

/**
 * 计算某时刻的月相
 * @param {Date} date
 * @returns {{age:number, phase:number, illumination:number, name:string, en:string, icon:string, waxing:boolean, daysToFull:number, daysToNew:number}}
 */
export function moonPhase(date = new Date()) {
    let age = ((date.getTime() - REF_NEW_MOON) / DAY_MS) % SYNODIC_MONTH;
    if (age < 0) age += SYNODIC_MONTH;
    const phase = age / SYNODIC_MONTH;                       // 0 新月 → 0.5 满月 → 1 新月
    const illumination = (1 - Math.cos(2 * Math.PI * phase)) / 2;
    const idx = Math.floor(((phase + 1 / 16) % 1) * 8) % 8;
    const info = PHASE_NAMES[idx];
    return {
        age,
        phase,
        illumination,
        name: info.name,
        en: info.en,
        icon: info.icon,
        waxing: phase < 0.5,
        daysToFull: phase <= 0.5 ? (0.5 - phase) * SYNODIC_MONTH : (1.5 - phase) * SYNODIC_MONTH,
        daysToNew: (1 - phase) * SYNODIC_MONTH
    };
}

/**
 * 观星适宜度（0~100）：月光越弱越适合看星
 */
export function stargazingScore(moon) {
    const moonPenalty = moon.illumination * 70;              // 满月扣 70 分
    return Math.max(0, Math.round(100 - moonPenalty));
}

/* ===================== 日出日落 / 暮光 ===================== */
function dayOfYear(date) {
    const start = Date.UTC(date.getFullYear(), 0, 0);
    return Math.floor((date.getTime() - start) / DAY_MS);
}

/**
 * 日出、日落与天文暮光时刻（返回本地小时数，默认东八区、北纬 35°）
 * @param {Date} date
 * @param {number} lat 纬度（北正）
 * @param {number} lon 经度（东正）
 */
export function sunTimes(date = new Date(), lat = 35, lon = 110) {
    const N = dayOfYear(date);
    const decl = -23.44 * Math.cos(RAD * (360 / 365) * (N + 10));
    const cosH = -Math.tan(RAD * lat) * Math.tan(RAD * decl);
    if (cosH <= -1 || cosH >= 1) return null;                // 极昼 / 极夜
    const H = Math.acos(cosH) * DEG;                         // 地平高度角对应时角（度）

    // 均时差（分钟）
    const B = RAD * (360 / 365) * (N - 81);
    const eot = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
    const noon = 12 - (lon - 120) / 15 - eot / 60;            // 东八区中央经线 120°E

    // 天文暮光：太阳高度 -18°
    const sin18 = Math.sin(-18 * RAD);
    const cosH18 = (sin18 - Math.sin(RAD * lat) * Math.sin(RAD * decl)) /
        (Math.cos(RAD * lat) * Math.cos(RAD * decl));
    const H18 = Math.abs(cosH18) <= 1 ? Math.acos(cosH18) * DEG : H;

    return {
        sunrise: noon - H / 15,
        sunset: noon + H / 15,
        dusk: noon + H18 / 15,        // 天文暮光结束（天完全黑）
        dawn: noon - H18 / 15
    };
}

/* ===================== 恒星时 & 地平坐标 ===================== */
/** 当地恒星时（小时，0~24） */
export function localSiderealTime(date = new Date(), lon = 110) {
    const jd = date.getTime() / DAY_MS + 2440587.5;
    const T = (jd - 2451545.0) / 36525;
    let gmst = 280.46061837 + 360.98564736629 * (jd - 2451545.0) +
        0.000387933 * T * T - (T * T * T) / 38710000;
    gmst = ((gmst % 360) + 360) % 360;
    const lst = (gmst + lon) / 15;
    return ((lst % 24) + 24) % 24;
}

/**
 * 赤道坐标 → 地平坐标
 * @param {number} raH 赤经（小时）
 * @param {number} decDeg 赤纬（度）
 * @param {number} lstH 当地恒星时（小时）
 * @param {number} latDeg 纬度（度）
 */
export function altAz(raH, decDeg, lstH, latDeg) {
    const H = (lstH - raH) * 15 * RAD;
    const d = decDeg * RAD;
    const phi = latDeg * RAD;
    const sinAlt = Math.sin(d) * Math.sin(phi) + Math.cos(d) * Math.cos(phi) * Math.cos(H);
    const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt))) * DEG;
    let cosAz = (Math.sin(d) - Math.sin(alt * RAD) * Math.sin(phi)) /
        (Math.cos(alt * RAD) * Math.cos(phi));
    if (!Number.isFinite(cosAz)) cosAz = 0;
    let az = Math.acos(Math.max(-1, Math.min(1, cosAz))) * DEG;
    if (Math.sin(H) > 0) az = 360 - az;                      // 时角为正 → 位于子午线以西
    return { alt, az };
}

const DIRS = ['北', '东北', '东', '东南', '南', '西南', '西', '西北'];
/** 方位角 → 中文方位 */
export function azToDir(az) {
    const idx = Math.round(((az % 360) + 360) % 360 / 45) % 8;
    return DIRS[idx];
}

/** 时刻 → 「HH:MM」 */
export function fmtClock(hours) {
    if (hours == null || !Number.isFinite(hours)) return '—';
    let h = ((hours % 24) + 24) % 24;
    const m = Math.round((h % 1) * 60);
    h = Math.floor(h);
    const mm = m === 60 ? 0 : m;
    const hh = m === 60 ? (h + 1) % 24 : h;
    return String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
}

/** 今晚 21:00（若已过 21 点则用明天 21 点） */
export function tonightAt21(now = new Date()) {
    const d = new Date(now);
    d.setHours(21, 0, 0, 0);
    if (d.getTime() < now.getTime()) d.setDate(d.getDate() + 1);
    return d;
}
