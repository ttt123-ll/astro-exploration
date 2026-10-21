/**
 * 观测装备导购与参数助手（规则引擎，本地运行，零 API 依赖）
 *
 * 输入：预算（自然语言或数字）+ 用途（可多个）+ 受众（child/amateur/pro）
 * 输出：结构化方案（主镜/赤道仪/相机/附件 + 总价 + 参数 + 理由 + 升级路径）
 *      以及按受众语气生成的自然语言回答
 */
const gear = require('./gear');

const { AUDIENCES, PURPOSES, BUDGET_TIERS, TELESCOPES, MOUNTS, CAMERAS, ACCESSORIES, BUNDLES } = gear;

/* ---------- 文本解析 ---------- */
const CN_NUM = { 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };

function toNumber(s) {
    if (/^\d+(\.\d+)?$/.test(s)) return Number(s);
    // 简单中文数字：十 / 十五 / 二十 / 两千（不支持复杂组合，够用）
    if (CN_NUM[s]) return CN_NUM[s];
    const m = s.match(/^([一二两三四五六七八九十])([十])?$/);
    if (m) {
        const n = CN_NUM[m[1]];
        return m[2] ? n * 10 : n;
    }
    return null;
}

/** 解析预算：支持「3000」「3千」「1万」「3000-5000」「5000以内」「一万左右」 */
function parseBudget(text) {
    const s = String(text || '');
    const unit = (num, u) => {
        const n = Number(num);
        if (!Number.isFinite(n)) return null;
        if (u === '万' || u === 'w') return n * 10000;
        if (u === '千' || u === 'k') return n * 1000;
        return n;
    };

    // 区间：3000-5000 / 3000~5000 / 3000到5000
    const range = s.match(/(\d+(?:\.\d+)?)\s*(万|千|[kKwW])?\s*(?:-|–|~|到|至)\s*(\d+(?:\.\d+)?)\s*(万|千|[kKwW])?/);
    if (range) {
        const a = unit(range[1], range[2] || range[4]);
        const b = unit(range[3], range[4] || range[2]);
        if (a && b) return { min: Math.min(a, b), max: Math.max(a, b), raw: range[0] };
    }

    // 单值 + 单位：3千 / 1万 / 5000元
    const single = s.match(/(\d+(?:\.\d+)?)\s*(万|千|[kKwW])/);
    if (single) {
        const v = unit(single[1], single[2]);
        if (v) return { min: null, max: v, raw: single[0] };
    }

    // 「一万左右」等中文数字
    const cn = s.match(/([一二两三四五六七八九十])\s*(万|千)/);
    if (cn) {
        const n = toNumber(cn[1]);
        const v = n ? n * (cn[2] === '万' ? 10000 : 1000) : null;
        if (v) return { min: null, max: v, raw: cn[0] };
    }

    // 纯数字（≥200 视为预算，避免把口径当预算）
    const plain = s.match(/(\d{3,6})/);
    if (plain) {
        const v = Number(plain[1]);
        if (v >= 200) return { min: null, max: v, raw: plain[0] };
    }
    return null;
}

/** 解析用途（多选） */
function parsePurposes(text) {
    const s = String(text || '');
    const RULES = [
        { key: 'kid', re: /儿童|孩子|小朋友|小学生|亲子|入门/ },
        { key: 'moon', re: /月亮|月面|月球|环形山/ },
        { key: 'planet', re: /行星|木星|土星|火星|大红斑|土星环/ },
        { key: 'planet-photo', re: /行星摄影|月面摄影|拍月|拍行星|叠加/ },
        { key: 'visual', re: /目视|深空|星云|星系|星团|梅西耶/ },
        { key: 'ap', re: /深空摄影|深空拍摄|拍深空|拍星星|摄影|拍星|导星|叠加|长曝光/ },
        { key: 'wide', re: /星野|银河|广角|风光/ },
        { key: 'travel', re: /便携|出摊|旅行|带出去|轻便/ }
    ];
    const hit = RULES.filter(r => r.re.test(s)).map(r => r.key);
    // 摄影包含深空摄影时，同时补 visual 以便推荐主镜
    if (hit.includes('ap') && !hit.includes('visual')) hit.push('visual');
    return [...new Set(hit)];
}

function tierOf(budget) {
    const max = budget ? budget.max : 3000;
    const t = BUDGET_TIERS.find(x => max <= x.max) || BUDGET_TIERS[BUDGET_TIERS.length - 1];
    return { ...t, max };
}

/* ---------- 光学参数计算 ---------- */
function optics(aperture, focal) {
    if (!aperture) return null;
    const limitMag = (2.7 + 5 * Math.log10(aperture)).toFixed(1);        // 极限星等经验公式
    const resolution = (116 / aperture).toFixed(2);                     // 道斯极限（角秒）
    const minMag = Math.round(aperture / 7);
    const maxMag = Math.round(aperture * 2);
    const ratio = focal ? (focal / aperture).toFixed(1) : null;
    return { limitMag, resolution, minMag, maxMag, ratio };
}

/** 比较两个口径：集光倍数、分辨率提升 */
function compareAperture(a, b) {
    const light = Math.pow(b / a, 2);
    return { light: light.toFixed(2), resGain: (b / a).toFixed(2) };
}

/* ---------- 推荐引擎 ---------- */
function findItem(id) {
    return [...TELESCOPES, ...MOUNTS, ...CAMERAS, ...ACCESSORIES].find(x => x.id === id);
}

/** 逐个挑选附件，保证不超剩余预算 */
function pickExtras(tags, budgetLeft, max = 2) {
    const out = [];
    for (const a of ACCESSORIES) {
        if (out.length >= max) break;
        if (a.price <= budgetLeft && a.tags.some(t => tags.includes(t))) {
            out.push(a);
            budgetLeft -= a.price;
        }
    }
    return out;
}

function priceOf(ids) {
    return ids.reduce((sum, id) => {
        const it = findItem(id);
        return sum + (it ? it.price : 0);
    }, 0);
}

/* 摄影类定制方案：主镜 + 赤道仪 + 相机，按「赤道仪优先」分配预算 */
function buildPhotoPlan(budgetMax, purposes) {
    const wantPlanet = purposes.includes('planet-photo') && !purposes.includes('ap');
    const photoTags = wantPlanet ? ['planet-photo', 'planet'] : ['ap', 'visual', 'wide'];
    const mountTags = wantPlanet ? ['planet', 'ap'] : ['ap', 'wide'];

    const scopes = TELESCOPES
        .filter(t => t.price <= budgetMax && t.tags.some(tag => photoTags.includes(tag)))
        .sort((a, b) => b.aperture - a.aperture);

    for (const scope of scopes) {
        const needMount = !scope.mount || scope.mount.includes('需另配');
        let mount = null;
        if (needMount) {
            mount = MOUNTS
                .filter(m => m.tags.some(tag => mountTags.includes(tag)) && m.price + scope.price <= budgetMax)
                .sort((a, b) => b.payload - a.payload)[0];
            if (!mount) continue;
        }
        const hasTracking = !!mount || /赤道仪/.test(scope.mount || '');
        // 深空摄影必须有赤道仪跟踪；行星摄影至少需要长焦（焦距 ≥ 1000mm）
        if (!wantPlanet && !hasTracking) continue;
        if (wantPlanet && !hasTracking && !(scope.focal >= 1000)) continue;
        let rest = budgetMax - scope.price - (mount ? mount.price : 0);
        const cam = CAMERAS
            .filter(c => c.tags.some(tag => photoTags.includes(tag)) && c.price <= rest)
            .sort((a, b) => b.price - a.price)[0];
        if (!cam) continue;              // 没有相机预算就不算摄影配置
        rest -= cam.price;
        const extras = pickExtras(photoTags, rest);

        return {
            id: 'photo-custom',
            name: wantPlanet ? '行星摄影定制组合' : '深空摄影定制组合',
            tier: tierOf({ max: budgetMax }).tier,
            items: [
                [scope.id, '主镜'],
                ...(mount ? [[mount.id, '赤道仪']] : []),
                [cam.id, '相机'],
                ...extras.map(e => [e.id, '附件'])
            ],
            why: wantPlanet
                ? '长焦主镜 + 高帧率相机是行星摄影的关键，赤道仪负责让目标稳定在视场内。'
                : '摄影配置按「赤道仪优先、主镜其次、相机最后」分配预算，保证跟踪精度不拖后腿。',
            upgrade: '后续可加导星镜与导星相机，把单次曝光从 30 秒延长到数分钟。'
        };
    }
    return null;
}

/**
 * 生成 1~3 套方案
 * @param {{budgetMax?:number, priorities:string[], audience?:string}} opts
 */
function recommend(opts = {}) {
    const budgetMax = opts.budgetMax || 3000;
    const purposes = opts.priorities && opts.priorities.length ? opts.priorities : ['moon'];
    const audience = opts.audience || 'amateur';
    const tier = tierOf({ max: budgetMax });
    const wantsPhoto = purposes.includes('ap') || purposes.includes('planet-photo');

    let plans = [];

    // 1) 摄影类用途：先给一套严格控预算的定制方案
    if (wantsPhoto) {
        const photo = buildPhotoPlan(budgetMax, purposes);
        if (photo) plans.push(photo);
    }

    // 2) 现成整套方案（预算内，按用途命中数排序）
    const matched = BUNDLES
        .filter(b => b.tags.some(t => purposes.includes(t)))
        .filter(b => priceOf(b.items.map(i => i[0])) <= budgetMax)
        .sort((a, b) => {
            const hitsA = a.tags.filter(t => purposes.includes(t)).length;
            const hitsB = b.tags.filter(t => purposes.includes(t)).length;
            if (hitsB !== hitsA) return hitsB - hitsA;
            return priceOf(b.items.map(i => i[0])) - priceOf(a.items.map(i => i[0]));
        });
    for (const b of matched) {
        if (plans.length >= 3) break;
        if (plans.some(p => p.id === b.id)) continue;
        // 摄影类用途下，避免把纯目视套装排在摄影方案前面
        if (wantsPhoto && !b.tags.some(t => ['ap', 'planet-photo'].includes(t)) && plans.length > 0) continue;
        plans.push({ ...b });
    }

    // 3) 仍无方案：按用途 + 预算临时组一套（主镜 + 必要赤道仪 + 附件）
    //    摄影类不给「只买主镜」的凑数方案，直接交给预算不足提示
    if (!plans.length && !wantsPhoto) {
        const candidates = TELESCOPES
            .filter(t => t.tags.some(tag => purposes.includes(tag)) && t.price <= budgetMax)
            .sort((a, b) => b.aperture - a.aperture);

        let primary = null;
        let mount = null;
        for (const cand of candidates) {
            const needMount = !cand.mount || cand.mount.includes('需另配');
            const m = needMount
                ? MOUNTS.filter(x => x.tags.some(tag => purposes.includes(tag)) && x.price + cand.price <= budgetMax)
                    .sort((a, b) => b.payload - a.payload)[0]
                : null;
            if (needMount && !m) continue;                       // 配不起赤道仪就换小一档主镜
            primary = cand;
            mount = m;
            break;
        }
        if (primary) {
            const rest = budgetMax - primary.price - (mount ? mount.price : 0);
            const extras = pickExtras(purposes, rest);
            plans.push({
                id: 'custom',
                name: '按预算定制的组合',
                tier: tier.tier,
                items: [[primary.id, '主镜'], ...(mount ? [[mount.id, '赤道仪']] : []), ...extras.map(e => [e.id, '附件'])],
                why: '按你的预算与用途，优先保证口径与稳定性，其余预算补齐必要附件。',
                upgrade: '下一步可加导星或相机，逐步过渡到摄影。'
            });
        }
    }

    plans = plans.slice(0, 3);

    const result = plans.map(p => {
        const items = p.items.map(([id, role]) => {
            const it = findItem(id);
            return {
                role,
                id,
                name: it ? it.name : id,
                price: it ? it.price : 0,
                note: it ? (it.note || it.cons || '') : ''
            };
        });
        const total = items.reduce((s, i) => s + i.price, 0);
        const scope = items.map(i => findItem(i.id)).find(i => i && i.aperture);
        return {
            id: p.id,
            name: p.name,
            tier: p.tier,
            total,
            withinBudget: total <= budgetMax,
            items,
            optics: scope ? optics(scope.aperture, scope.focal) : null,
            aperture: scope ? scope.aperture : null,
            why: p.why,
            upgrade: p.upgrade,
            pros: scope ? scope.pros : '',
            cons: scope ? scope.cons : ''
        };
    });

    return { budgetMax, tier, purposes, audience, plans: result };
}

/* ---------- 按受众生成回答 ---------- */
const PURPOSE_LABEL = Object.fromEntries(PURPOSES.map(p => [p.key, p.label]));

function audienceIntro(audience) {
    if (audience === 'child') return '我们先用大白话说，不用记术语～';
    if (audience === 'pro') return '按工程参数给结论，附关键规格与权衡。';
    return '先说结论，再讲参数与理由。';
}

function money(n) {
    if (n >= 10000) return (n / 10000).toFixed(n % 10000 === 0 ? 0 : 1) + ' 万';
    return n + ' 元';
}

/** 面向儿童的简化解释 */
function explainChild(rec) {
    const p = rec.plans[0];
    if (!p) return '这个预算下暂时没有合适的组合，可以先从双筒望远镜开始～';
    const lines = [];
    lines.push(`如果预算是 ${money(rec.budgetMax)}，我推荐「${p.name}」，一共大约 ${money(p.total)}。`);
    lines.push('里面包含：');
    p.items.forEach(i => lines.push(`· ${i.role}：${i.name}`));
    lines.push(`为什么推荐它：${p.why}`);
    if (p.optics) {
        lines.push(`小知识：口径 ${p.aperture} 毫米，就像用一个大碗接星星的光，碗越大看到的越暗的星星越多。`);
    }
    lines.push('注意：看太阳一定要用专门的太阳滤镜，千万不要直接看，会伤眼睛！');
    if (p.upgrade) lines.push(`以后想升级：${p.upgrade}`);
    return lines.join('\n');
}

/** 业余爱好者 */
function explainAmateur(rec) {
    const lines = [`预算 ${money(rec.budgetMax)}（${rec.tier.label}），用途：${rec.purposes.map(k => PURPOSE_LABEL[k] || k).join('、')}。`];
    rec.plans.forEach((p, idx) => {
        lines.push(`\n方案 ${idx + 1}｜${p.name} 合计约 ${money(p.total)}${p.withinBudget ? '' : '（略超预算）'}`);
        lines.push('组成：' + p.items.map(i => `${i.role} ${i.name}（约 ${i.price} 元）`).join('；'));
        if (p.optics) {
            lines.push(`参数：口径 ${p.aperture}mm，焦比 f/${p.optics.ratio}，极限星等约 ${p.optics.limitMag} 等，理论分辨率 ${p.optics.resolution}″，建议倍率 ${p.optics.minMag}–${p.optics.maxMag}×`);
        }
        lines.push(`理由：${p.why}`);
        if (p.cons) lines.push(`注意：${p.cons}`);
        if (p.upgrade) lines.push(`升级：${p.upgrade}`);
    });
    lines.push('\n提醒：价格为参考区间，实际以电商活动价为准；先看评测再下单。');
    return lines.join('\n');
}

/** 专业人士：给规格、权衡与工程细节 */
function explainPro(rec) {
    const lines = [`预算上限 ${rec.budgetMax} 元（${rec.tier.label}），目标用途：${rec.purposes.map(k => PURPOSE_LABEL[k] || k).join('、')}。`];
    rec.plans.forEach((p, idx) => {
        const mount = p.items.map(i => findItem(i.id)).find(i => i && i.payload);
        lines.push(`\n方案 ${idx + 1}｜${p.name} 合计 ${p.total} 元`);
        p.items.forEach(i => lines.push(`  · ${i.role}：${i.name}（${i.price} 元）${i.note ? '｜' + i.note : ''}`));
        if (p.optics) {
            lines.push(`  光学：D=${p.aperture}mm，f/${p.optics.ratio}，道斯极限 ${p.optics.resolution}″，极限星等 ${p.optics.limitMag}`);
        }
        if (mount) {
            lines.push(`  载荷：${mount.name}，标称载重 ${mount.payload}kg；建议总重控制在载重 60–70% 以内`);
        }
        if (p.optics && p.optics.ratio && Number(p.optics.ratio) <= 5) {
            lines.push('  提示：快焦比系统对光轴与调焦更敏感，需配彗差校正镜与精细调焦。');
        }
        if (rec.purposes.includes('ap')) {
            lines.push('  采样：建议相机像元尺寸与焦距匹配（约 1–2″/px），并预留导星与滤镜轮接口。');
        }
        lines.push(`  取舍：${p.pros || ''}${p.cons ? '｜' + p.cons : ''}`);
        if (p.upgrade) lines.push(`  演进：${p.upgrade}`);
    });
    lines.push('\n价格说明：为国内常见参考价，不含运费与关税；建议按「赤道仪优先、口径其次、相机最后」的优先级分配预算。');
    return lines.join('\n');
}

function explain(rec) {
    const a = rec.audience;
    const body = a === 'child' ? explainChild(rec) : a === 'pro' ? explainPro(rec) : explainAmateur(rec);
    return audienceIntro(a) + '\n\n' + body;
}

/* ---------- 参数问答（例如「80mm 和 130mm 差多少」） ---------- */
function specAnswer(text) {
    const mm = [...String(text).matchAll(/(\d{2,3})\s*(?:mm|毫米)/g)].map(m => Number(m[1]));
    if (mm.length >= 2) {
        const [a, b] = [Math.min(mm[0], mm[1]), Math.max(mm[0], mm[1])];
        const cmp = compareAperture(a, b);
        return `口径 ${a}mm → ${b}mm：集光面积约 ${cmp.light} 倍，理论分辨率提升约 ${cmp.resGain} 倍（道斯极限从 ${(116 / a).toFixed(2)}″ 提升到 ${(116 / b).toFixed(2)}″）。` +
            `实际观感上，深空天体的亮度提升最明显，行星细节受大气视宁度限制通常不会线性提升。`;
    }
    return null;
}

/* ---------- 意图识别 ---------- */
const GEAR_NOUN = /望远镜|赤道仪|经纬仪|目镜|巴洛|相机|装备|设备|双筒|马卡|施卡|反射镜|折射镜|口径|焦比|焦距/;
const MONEY_SIGNAL = /预算|多少钱|价格|价位|以内|不超过|左右|元|块|万|\d{3,6}/;
const INTENT_VERB = /推荐|选|买|配|入坑|挑|哪个好|求|建议|导购/;
const PURPOSE_WORD = /看月亮|看行星|拍月|拍行星|拍深空|深空摄影|星野|拍银河|观星|便携|出摊|巡天/;
const SPEC_QUERY = /\d{2,3}\s*(mm|毫米)[\s\S]*\d{2,3}\s*(mm|毫米)/;
const SCIENCE_ONLY = /为什么|原理|历史|是谁|怎么发现|什么是|是什么|怎么形成|如何形成/;

function isGearQuery(text) {
    const s = String(text || '');
    if (!s) return false;
    // 口径对比类问题直接进导购（参数助手）
    if (SPEC_QUERY.test(s) && /口径|差多少|对比|哪个/.test(s)) return true;
    const hasMoney = MONEY_SIGNAL.test(s);
    const hasGear = GEAR_NOUN.test(s);
    const hasIntent = INTENT_VERB.test(s);
    const hasPurpose = PURPOSE_WORD.test(s);

    // 纯科普问题（问原理/是什么）且没有预算与购买意图 → 交给 RAG
    if (SCIENCE_ONLY.test(s) && !hasMoney && !hasIntent) return false;

    if (hasMoney && (hasPurpose || hasGear)) return true;       // 预算 + 用途/器材
    if (hasGear && hasIntent) return true;                       // 器材 + 购买意图
    if (hasPurpose && hasIntent && /预算|钱|价位|多少/.test(s)) return true;
    return false;
}

/**
 * 主入口：处理装备相关提问
 * @returns {{handled:boolean, reply?:string, gear?:object, tools?:string[]}}
 */
function advise(text, opts = {}) {
    const s = String(text || '');
    const audience = opts.audience || 'amateur';
    const budget = opts.budget || parseBudget(s);
    const purposes = (opts.priorities && opts.priorities.length) ? opts.priorities : parsePurposes(s);

    // 纯参数对比问题
    const spec = specAnswer(s);
    if (spec && !budget) {
        return { handled: true, reply: spec, tools: ['gear-spec'], gear: null };
    }

    if (!budget && !purposes.length) {
        return {
            handled: true,
            tools: ['gear-advisor'],
            reply: '想让我推荐装备的话，告诉我两件事就能给出方案：\n1）预算大概多少（例如「3000 左右」「1 万以内」）\n2）主要想做什么（看月亮 / 行星 / 目视深空 / 星野银河 / 深空摄影 / 儿童入门）',
            gear: null
        };
    }

    const budgetMax = budget ? budget.max : 3000;
    const rec = recommend({
        budgetMax,
        priorities: purposes.length ? purposes : ['moon'],
        audience
    });

    // 预算明显不够达成目标用途：先说明门槛，再给当前预算下的最优起步方案
    if (!rec.plans.length) {
        const wantPhoto = purposes.includes('ap') || purposes.includes('planet-photo');
        const starter = recommend({ budgetMax, priorities: ['moon', 'travel'], audience });
        const base = starter.plans[0];
        const needNote = wantPhoto
            ? '天文摄影的门槛主要在赤道仪：可跟踪的赤道仪 + 相机起步约 3000–5000 元，深空摄影稳定出片一般需要 8000 元以上。'
            : '这个预算可以先从双筒或入门折射镜开始。';
        const lines = [
            `预算 ${money(budgetMax)} 想达成「${purposes.map(k => PURPOSE_LABEL[k] || k).join('、')}」，目前没有能完整覆盖的方案。`,
            needNote
        ];
        if (base) {
            lines.push(`\n先起步的推荐：${base.name}（约 ${money(base.total)}）`);
            lines.push(base.items.map(i => `· ${i.role}：${i.name}（约 ${i.price} 元）`).join('\n'));
            lines.push(`理由：${base.why}`);
        }
        lines.push('\n等预算到位再按目标升级，会少走弯路（先赤道仪、后主镜、最后相机）。');
        return { handled: true, reply: lines.join('\n'), tools: ['gear-advisor'], gear: null };
    }
    rec.budgetText = budget ? budget.raw : null;
    return {
        handled: true,
        reply: explain(rec),
        tools: ['gear-advisor'],
        gear: rec
    };
}

module.exports = {
    advise, recommend, parseBudget, parsePurposes, optics, compareAperture,
    isGearQuery, specAnswer, AUDIENCES, PURPOSES, BUDGET_TIERS
};
