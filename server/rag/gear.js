/**
 * 天文观测装备知识库（本地静态数据，零 API 依赖）
 * - 价格为国内电商常见参考价（元），带「参考」字样，不构成购买承诺
 * - 用途标签用于导购匹配；audience 表示适合的受众
 */

/* ---------- 受众模式 ---------- */
const AUDIENCES = [
    { key: 'child', label: '儿童', icon: 'fa-child-reaching', desc: '比喻多、句子短、少术语' },
    { key: 'amateur', label: '业余爱好者', icon: 'fa-binoculars', desc: '讲清参数与理由' },
    { key: 'pro', label: '专业人士', icon: 'fa-microscope', desc: '规格、权衡与工程细节' }
];

/* ---------- 观测用途 ---------- */
const PURPOSES = [
    { key: 'kid', label: '儿童入门', icon: 'fa-child', desc: '安全、轻便、易上手' },
    { key: 'moon', label: '看月亮/行星', icon: 'fa-moon', desc: '高倍率，口径优先' },
    { key: 'visual', label: '目视深空', icon: 'fa-star', desc: '大口径，暗环境观测' },
    { key: 'ap', label: '深空摄影', icon: 'fa-camera', desc: '赤道仪精度 + 跟踪导星' },
    { key: 'wide', label: '星野/银河', icon: 'fa-mountain-sun', desc: '广角 + 星野赤道仪' },
    { key: 'planet', label: '月面/行星摄影', icon: 'fa-video', desc: '长焦 + 行星相机' },
    { key: 'travel', label: '便携巡天', icon: 'fa-suitcase', desc: '轻便可携带' }
];

/* ---------- 预算档位 ---------- */
const BUDGET_TIERS = [
    { max: 1000, label: '1000 元以内', tier: 'entry' },
    { max: 3000, label: '1000–3000 元', tier: 'basic' },
    { max: 6000, label: '3000–6000 元', tier: 'mid' },
    { max: 12000, label: '6000–12000 元', tier: 'advanced' },
    { max: 30000, label: '12000–30000 元', tier: 'pro' },
    { max: Infinity, label: '30000 元以上', tier: 'flagship' }
];

/* ---------- 主镜 ---------- */
const TELESCOPES = [
    {
        id: 'binocular-10x50', name: '10×50 双筒望远镜', type: '双筒', price: 350,
        aperture: 50, focal: 0, mount: '手持', weight: 0.9,
        tags: ['kid', 'travel', 'wide', 'visual'],
        pros: '轻便、上手零门槛、适合找星座和扫银河', cons: '不能上高倍率，看不到行星细节',
        audience: ['child', 'amateur']
    },
    {
        id: 'refractor-70', name: '70mm 折射式（星特朗 70AZ 一类）', type: '折射', price: 700,
        aperture: 70, focal: 700, mount: '经纬仪', weight: 4,
        tags: ['kid', 'moon', 'travel'],
        pros: '装好就能用、维护简单、看月亮清晰', cons: '口径小，深空目标偏暗；三脚架偏轻会晃',
        audience: ['child', 'amateur']
    },
    {
        id: 'refractor-80eq', name: '80mm 折射 + EQ1 套装（星特朗 80EQ 一类）', type: '折射', price: 1100,
        aperture: 80, focal: 900, mount: 'EQ1 赤道仪', weight: 8,
        tags: ['kid', 'moon', 'planet'],
        pros: '性价比高，月面与土星环能看到轮廓，赤道仪可手动跟踪', cons: '赤道仪入门级、调平衡费时',
        audience: ['child', 'amateur']
    },
    {
        id: 'reflector-130', name: '130mm 反射 + EQ2 套装（信达 130/650 一类）', type: '反射', price: 1600,
        aperture: 130, focal: 650, mount: 'EQ2 赤道仪', weight: 9,
        tags: ['moon', 'visual', 'planet'],
        pros: '同价位口径最大，深空目标亮度明显提升', cons: '需定期校准光轴，开放镜筒易积灰',
        audience: ['amateur']
    },
    {
        id: 'reflector-150', name: '150mm 反射 + EQ3 套装（信达小黑 150/750 一类）', type: '反射', price: 2900,
        aperture: 150, focal: 750, mount: 'EQ3 赤道仪', weight: 14,
        tags: ['visual', 'moon', 'planet', 'ap'],
        pros: '入门深空摄影的经典组合，配件生态成熟', cons: '整机约 14kg，搬运需要体力',
        audience: ['amateur']
    },
    {
        id: 'reflector-200', name: '200mm 反射 + EQ5 套装（信达大黑 200/1000 一类）', type: '反射', price: 5200,
        aperture: 200, focal: 1000, mount: 'EQ5 赤道仪', weight: 28,
        tags: ['visual', 'ap', 'planet'],
        pros: '目视深空与行星细节都强，可升级导星做深空摄影', cons: '重、需要较好的赤道仪与配重',
        audience: ['amateur', 'pro']
    },
    {
        id: 'mak-127', name: '127mm 马卡（星特朗 C127 一类）', type: '马卡', price: 3600,
        aperture: 127, focal: 1500, mount: '经纬仪/赤道仪', weight: 6,
        tags: ['moon', 'planet', 'planet-photo', 'travel'],
        pros: '焦距长、体积小，行星与月面摄影很省空间', cons: '焦比大（f/12），深空摄影曝光时间长',
        audience: ['amateur', 'pro']
    },
    {
        id: 'sct-8', name: '8 英寸施卡（C8 一类）', type: '施卡', price: 9000,
        aperture: 203, focal: 2032, mount: '赤道仪/经纬仪', weight: 12,
        tags: ['planet', 'visual', 'planet-photo', 'travel'],
        pros: '口径大而体积可控，行星摄影利器', cons: '价格高，需要稳定赤道仪',
        audience: ['pro']
    },
    {
        id: 'apo-80', name: '80mm APO 折射（深空摄影入门）', type: 'APO 折射', price: 4200,
        aperture: 80, focal: 480, mount: '需另配赤道仪', weight: 3,
        tags: ['ap', 'wide'],
        pros: '星点锐利、无色差，深空摄影经典入门镜', cons: '口径小，目视深空偏弱',
        audience: ['amateur', 'pro']
    },
    {
        id: 'newton-200-f4', name: '200mm f/4 摄影牛反（如 200/800）', type: '反射', price: 6800,
        aperture: 200, focal: 800, mount: '需另配赤道仪', weight: 11,
        tags: ['ap', 'visual'],
        pros: '焦比快，深空摄影效率高', cons: '对光轴校准与调焦要求高',
        audience: ['pro']
    }
];

/* ---------- 赤道仪 / 跟踪 ---------- */
const MOUNTS = [
    { id: 'eq1', name: 'EQ1/EQ2 入门赤道仪', price: 400, payload: 4, tags: ['moon', 'kid'], note: '手动跟踪，精度有限' },
    { id: 'eq3', name: 'EQ3 赤道仪', price: 900, payload: 6, tags: ['moon', 'visual'], note: '可加单轴电跟' },
    { id: 'eq5', name: 'EQ5 / HEQ5 赤道仪', price: 3800, payload: 13, tags: ['ap', 'visual'], note: '双轴电跟 + 导星接口，深空摄影主流' },
    { id: 'eq6r', name: 'EQ6-R 赤道仪', price: 8500, payload: 20, tags: ['ap', 'planet'], note: '载重大、跟踪稳，可上大口径' },
    { id: 'staradventurer', name: 'Star Adventurer 2i 星野赤道仪', price: 2200, payload: 5, tags: ['wide', 'ap'], note: '轻便，专为广角星野与长焦跟踪' },
    { id: 'harmonic-am5', name: '谐波赤道仪（AM5 一类）', price: 12000, payload: 13, tags: ['ap', 'travel'], note: '无需配重、便携，适合出摊拍星' }
];

/* ---------- 相机 ---------- */
const CAMERAS = [
    { id: 'dslr-old', name: '二手单反（如 6D/200D，改机更佳）', price: 2500, tags: ['wide', 'ap'], note: '可换镜头，性价比路线' },
    { id: 'asi533mc', name: 'ZWO ASI533MC（彩色制冷相机）', price: 4500, tags: ['ap'], note: '深空摄影入门制冷相机' },
    { id: 'asi2600mc', name: 'ZWO ASI2600MC（APS-C 制冷）', price: 9500, tags: ['ap'], note: '大画幅、低噪声，进阶之选' },
    { id: 'asi678mc', name: 'ZWO ASI678MC（行星相机）', price: 1500, tags: ['planet', 'planet-photo'], note: '高帧率，适合月面/行星视频叠加' },
    { id: 'asi290mm', name: 'ZWO ASI290MM（黑白行星/导星）', price: 1800, tags: ['planet', 'ap'], note: '灵敏度高，也可做导星相机' }
];

/* ---------- 附件 ---------- */
const ACCESSORIES = [
    { id: 'eyepiece-set', name: '目镜套装（PL 或广角目镜 2-3 只）', price: 300, tags: ['moon', 'visual', 'kid'], note: '补齐高低倍率' },
    { id: 'barlow', name: '2× 巴洛镜', price: 150, tags: ['moon', 'planet'], note: '把倍率翻倍，行星观测必备' },
    { id: 'moon-filter', name: '月亮滤镜', price: 90, tags: ['moon', 'kid'], note: '降低月面亮度，保护眼睛' },
    { id: 'uhc', name: 'UHC / 光害滤镜', price: 400, tags: ['visual', 'ap'], note: '城市观测星云时提升对比度' },
    { id: 'dew-heater', name: '除露加热带', price: 250, tags: ['ap', 'visual'], note: '防止镜片结露，出摊必备' },
    { id: 'polar-scope', name: '极轴镜（部分赤道仪已内置）', price: 300, tags: ['ap'], note: '提高对极轴精度' },
    { id: 'power', name: '12V 锂电池 + 电源线', price: 500, tags: ['ap', 'planet'], note: '野外供电，避免中途断电' },
    { id: 'tripod-bag', name: '三脚架包 / 防潮箱', price: 200, tags: ['travel', 'kid'], note: '收纳与防潮' }
];

/* ---------- 典型整套方案（按预算档 × 用途，导购核心数据） ---------- */
const BUNDLES = [
    /* 儿童 / 入门 */
    {
        id: 'kid-bino', tier: 'entry', tags: ['kid', 'travel'], audience: ['child'],
        name: '亲子观星入门套装', items: [['binocular-10x50', '主镜'], ['moon-filter', '滤镜'], ['tripod-bag', '收纳']],
        why: '双筒最安全轻便，孩子能自己举着找星座，先建立兴趣再升级望远镜。',
        upgrade: '能坚持用半年以上，再升级 70–80mm 折射镜。'
    },
    {
        id: 'kid-refractor', tier: 'basic', tags: ['kid', 'moon'], audience: ['child', 'amateur'],
        name: '儿童第一台望远镜', items: [['refractor-70', '主镜'], ['eyepiece-set', '增倍目镜'], ['moon-filter', '滤镜']],
        why: '70mm 折射装好即用，看月亮环形山很有成就感，维护成本低。',
        upgrade: '预算再加 500 可升级 80mm 折射，口径提升约 30%。'
    },
    /* 目视 / 行星 */
    {
        id: 'vis-80eq', tier: 'basic', tags: ['moon', 'planet'], audience: ['child', 'amateur'],
        name: '月面行星入门组合', items: [['refractor-80eq', '主镜'], ['barlow', '巴洛镜'], ['moon-filter', '滤镜']],
        why: '80mm 折射 + 2× 巴洛能看清土星环与木星条纹，赤道仪可手动跟踪。',
        upgrade: '口径升级到 130mm 反射，深空目标会明显变亮。'
    },
    {
        id: 'vis-130', tier: 'mid', tags: ['visual', 'moon', 'planet'], audience: ['amateur'],
        name: '目视进阶：130mm 反射', items: [['reflector-130', '主镜'], ['eyepiece-set', '目镜'], ['barlow', '巴洛镜']],
        why: '130mm 口径是目视深空的起点，M42、M31 都能看出结构。',
        upgrade: '直接上 150mm 或 200mm 反射，口径每提升 1.5 倍，集光面积翻倍。'
    },
    {
        id: 'vis-200', tier: 'advanced', tags: ['visual', 'planet'], audience: ['amateur', 'pro'],
        name: '目视深空主力：200mm 反射 + EQ5', items: [['reflector-200', '主镜'], ['eq5', '赤道仪'], ['uhc', '光害滤镜']],
        why: '200mm 口径在城市边缘也能看到不少深空天体，EQ5 可后续加导星。',
        upgrade: '加导星相机即可过渡到深空摄影。'
    },
    /* 深空摄影 */
    {
        id: 'ap-entry', tier: 'advanced', tags: ['ap'], audience: ['amateur', 'pro'],
        name: '深空摄影入门：80APO + HEQ5', items: [['apo-80', '主镜'], ['eq5', '赤道仪'], ['dslr-old', '相机'], ['polar-scope', '极轴镜'], ['dew-heater', '除露']],
        why: '小口径 APO 星点锐利，HEQ5 跟踪稳定，是公认的深空入门黄金组合。',
        upgrade: '下一步加导星镜 + 导星相机，曝光时间可延长到数分钟。'
    },
    {
        id: 'ap-mid', tier: 'pro', tags: ['ap'], audience: ['pro'],
        name: '深空摄影进阶：200mm f/4 + EQ6-R', items: [['newton-200-f4', '主镜'], ['eq6r', '赤道仪'], ['asi533mc', '相机'], ['dew-heater', '除露'], ['power', '电源']],
        why: 'f/4 焦比进光快，EQ6-R 载重余量充足，能带动导星与滤镜轮。',
        upgrade: '升级 ASI2600 大画幅相机或更长焦距的反射镜。'
    },
    /* 星野 */
    {
        id: 'wide-entry', tier: 'basic', tags: ['wide'], audience: ['amateur', 'pro'],
        name: '星野银河入门：单反 + 星野赤道仪', items: [['staradventurer', '赤道仪'], ['dslr-old', '相机（可先用自有）'], ['power', '电源']],
        why: '用广角镜头拍银河不需要望远镜，星野赤道仪能让单张曝光从 20 秒延长到数分钟。',
        upgrade: '换 f/1.8 或 f/1.4 广角定焦，进光量翻倍。'
    },
    /* 行星摄影 */
    {
        id: 'planet-mid', tier: 'mid', tags: ['planet', 'planet-photo'], audience: ['amateur', 'pro'],
        name: '月面行星摄影：马卡 + 行星相机', items: [['mak-127', '主镜'], ['asi678mc', '行星相机'], ['barlow', '巴洛镜'], ['power', '电源']],
        why: '长焦马卡 + 高帧率相机拍视频叠加，能拍到月面细节与木星条纹。',
        upgrade: '口径升级到 8 英寸施卡，行星分辨率提升约 60%。'
    },
    /* 便携 */
    {
        id: 'travel-compact', tier: 'mid', tags: ['travel', 'visual'], audience: ['amateur'],
        name: '便携巡天套装', items: [['mak-127', '主镜'], ['tripod-bag', '背包'], ['eyepiece-set', '目镜']],
        why: '马卡体积小、焦距长，塞进背包就能带去郊外。',
        upgrade: '想拍深空再补消费级赤道仪。'
    }
];

module.exports = {
    AUDIENCES, PURPOSES, BUDGET_TIERS,
    TELESCOPES, MOUNTS, CAMERAS, ACCESSORIES, BUNDLES
};
