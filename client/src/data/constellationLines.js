/**
 * 真实星座连线数据（J2000 历元，赤经 RA 单位：小时；赤纬 Dec 单位：度）
 * 数据来源：依巴谷星表 / 亮星表公开坐标，仅取构成「星座连线」的主要亮星。
 * 连线（lines）为星索引对，用于绘制真实星座骨架，而非装饰性假线条。
 */

export const CONSTELLATION_FIGURES = {
    /* 猎户座 Orion：腰带三星 + 两肩两脚 + 头 */
    Orion: {
        stars: [
            [5.9195, 7.407],    // 0 参宿四 Betelgeuse
            [5.4188, 6.350],    // 1 参宿五 Bellatrix
            [5.5334, -0.299],   // 2 参宿三 Mintaka
            [5.6036, -1.202],   // 3 参宿二 Alnilam
            [5.6793, -1.943],   // 4 参宿一 Alnitak
            [5.7959, -9.670],   // 5 参宿六 Saiph
            [5.2423, -8.202],   // 6 参宿七 Rigel
            [5.5850, 9.934]     // 7 觜宿一 Meissa
        ],
        lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0], [4, 5], [2, 6], [5, 6], [0, 7], [7, 1]]
    },

    /* 天蝎座 Scorpius：头部 + 心宿二 + 弯曲尾部 */
    Scorpius: {
        stars: [
            [16.4901, -26.432],  // 0 心宿二 Antares
            [16.3533, -25.593],  // 1 σ Sco
            [16.5985, -28.216],  // 2 τ Sco
            [16.8361, -34.293],  // 3 ε Sco
            [16.8644, -38.047],  // 4 μ Sco
            [16.9097, -42.361],  // 5 ζ Sco
            [17.2025, -43.239],  // 6 η Sco
            [17.6221, -42.998],  // 7 θ Sco
            [17.7931, -40.127],  // 8 ι Sco
            [17.7086, -39.030],  // 9 κ Sco
            [17.5601, -37.104],  // 10 λ Sco (Shaula)
            [17.5126, -37.296],  // 11 υ Sco (Lesath)
            [16.0906, -19.805],  // 12 β Sco
            [16.0056, -22.622],  // 13 δ Sco
            [15.9810, -26.114]   // 14 π Sco
        ],
        lines: [[12, 13], [13, 14], [14, 0], [0, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 10], [10, 11]]
    },

    /* 狮子座 Leo：镰刀 + 后身三角 */
    Leo: {
        stars: [
            [10.1395, 11.967],   // 0 轩辕十四 Regulus
            [10.1222, 16.763],   // 1 η Leo
            [10.3329, 19.842],   // 2 轩辕十二 Algieba
            [10.2781, 23.417],   // 3 轩辕十一 Adhafera
            [9.8797, 26.007],    // 4 轩辕十 Rasalas
            [9.7642, 23.774],    // 5 ε Leo
            [11.2351, 20.524],   // 6 西上相 Zosma
            [11.2373, 15.430],   // 7 西次相 Chertan
            [11.8177, 14.572]    // 8 五帝座一 Denebola
        ],
        lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0], [2, 6], [6, 7], [7, 8], [8, 6]]
    },

    /* 仙后座 Cassiopeia：经典 W 形 */
    Cassiopeia: {
        stars: [
            [0.1529, 59.150],    // 0 王良一 Caph
            [0.6751, 56.537],    // 1 王良四 Schedar
            [0.9451, 60.717],    // 2 王良三 γ Cas
            [1.4303, 60.235],    // 3 阁道三 Ruchbah
            [1.9065, 63.670]     // 4 阁道二 Segin
        ],
        lines: [[0, 1], [1, 2], [2, 3], [3, 4]]
    },

    /* 金牛座 Taurus：毕宿五 + V 形毕星团 + 双角 */
    Taurus: {
        stars: [
            [4.5987, 16.509],    // 0 毕宿五 Aldebaran
            [4.4779, 15.871],    // 1 毕宿四
            [4.3299, 15.628],    // 2 毕宿六
            [4.3822, 17.542],    // 3 毕宿三
            [4.4767, 19.180],    // 4 毕宿一
            [3.9993, 12.490],    // 5 天廪四
            [5.4382, 28.608],    // 6 五车五 Elnath
            [5.6274, 21.143]     // 7 天关 ζ Tau
        ],
        lines: [[2, 3], [3, 4], [4, 6], [0, 7], [7, 6], [0, 5], [1, 0], [2, 1]]
    },

    /* 天鹅座 Cygnus：北十字 */
    Cygnus: {
        stars: [
            [20.6905, 45.280],   // 0 天津四 Deneb
            [20.3705, 40.257],   // 1 天津一 Sadr
            [19.5120, 27.960],   // 2 辇道增七 Albireo
            [19.7496, 45.131],   // 3 天津二 δ Cyg
            [20.7701, 33.970],   // 4 天津九 Gienah
            [21.2149, 30.227]    // 5 天津五 ζ Cyg
        ],
        lines: [[0, 1], [1, 2], [3, 1], [1, 4], [4, 5]]
    },

    /* 室女座 Virgo：Spica + 上方 Y 形 */
    Virgo: {
        stars: [
            [13.4199, -11.161],  // 0 角宿一 Spica
            [12.6943, -1.449],   // 1 东上相 Porrima
            [13.5785, -0.596],   // 2 角宿二 ζ Vir
            [12.9266, 3.398],    // 3 东次相 δ Vir
            [13.0362, 10.959],   // 4 东次将 ε Vir
            [12.3222, -0.667],   // 5 右执法 η Vir
            [11.8447, 1.765]     // 6 左执法 β Vir
        ],
        lines: [[6, 5], [5, 1], [1, 2], [2, 0], [1, 3], [3, 4]]
    },

    /* 飞马座 Pegasus：秋季四边形 + 头颈与前腿 */
    Pegasus: {
        stars: [
            [23.0794, 15.205],   // 0 室宿一 Markab
            [23.0629, 28.083],   // 1 室宿二 Scheat
            [0.2206, 15.184],    // 2 壁宿一 Algenib
            [0.1398, 29.091],    // 3 壁宿二 Alpheratz
            [21.7364, 9.875],    // 4 危宿三 Enif
            [22.6911, 10.831],   // 5 离宫四 ζ Peg
            [22.7169, 30.221],   // 6 离宫二 η Peg
            [22.1696, 6.198]     // 7 离宫五 θ Peg
        ],
        lines: [[0, 1], [1, 3], [3, 2], [2, 0], [1, 6], [6, 5], [0, 7], [7, 4], [4, 5]]
    }
};

/**
 * 把赤经赤纬投影到 0~100 的 SVG 坐标（保持近似视角比例，留边距）
 * @param {string} latinName 星座拉丁名
 * @returns {{points: {x:number,y:number}[], lines: number[][] } | null}
 */
export function projectFigure(latinName) {
    const fig = CONSTELLATION_FIGURES[latinName];
    if (!fig) return null;

    // 赤经跨 0 点（如飞马座）时统一平移，避免坐标撕裂
    let ras = fig.stars.map(s => s[0]);
    const maxRa = Math.max(...ras);
    const minRa = Math.min(...ras);
    const needShift = maxRa - minRa > 12;
    const shift = needShift ? 24 : 0;
    const norm = fig.stars.map(s => ({ ra: s[0] + (needShift && s[0] < 12 ? shift : 0), dec: s[1] }));

    const midDec = norm.reduce((a, s) => a + s.dec, 0) / norm.length;
    const cosD = Math.cos((midDec * Math.PI) / 180);

    // 投影：x 用赤经（按纬度压缩），y 用赤纬
    const xs = norm.map(s => s.ra * 15 * cosD);
    const ys = norm.map(s => -s.dec);
    const x0 = Math.min(...xs), x1 = Math.max(...xs);
    const y0 = Math.min(...ys), y1 = Math.max(...ys);
    const spanX = Math.max(x1 - x0, 1e-6);
    const spanY = Math.max(y1 - y0, 1e-6);
    // 等比缩放并居中，四周留 12% 边距
    const scale = Math.min(76 / spanX, 76 / spanY);
    const offX = 50 - ((x0 + x1) / 2) * scale;
    const offY = 50 - ((y0 + y1) / 2) * scale;

    return {
        points: xs.map((x, i) => ({
            x: +(x * scale + offX).toFixed(2),
            y: +(ys[i] * scale + offY).toFixed(2)
        })),
        lines: fig.lines
    };
}
