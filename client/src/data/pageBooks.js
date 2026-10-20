// 各页面的主题书单配置：页面 key → 标题 / 导语 / 推荐书籍 id
export const PAGE_BOOKS = {
    solar: {
        title: '延伸阅读 · 认识太阳系',
        desc: '想更系统地了解行星、太阳系的形成与我们在宇宙中的位置？这几本值得一读。',
        books: ['universe-in-hand', 'pale-blue-dot', 'cosmos']
    },
    project: {
        title: '延伸阅读 · 认识这些天体',
        desc: '看完 3D 投影，如果对行星与恒星的真实面貌好奇，可以从这几本书继续。',
        books: ['pale-blue-dot', 'billion-suns', 'universe-in-hand']
    },
    encyclopedia: {
        title: '延伸阅读 · 恒星、星系与黑洞',
        desc: '从恒星的一生到星系的演化，再到黑洞与引力——三本书带你从经典走到前沿。',
        books: ['billion-suns', 'brief-history', 'science-of-interstellar', 'elegant-universe']
    },
    constellations: {
        title: '延伸阅读 · 观星与星座',
        desc: '从认星到深空摄影，从西方星座到中国古代星官，这几本是观星者的常备书。',
        books: ['nightwatch', 'star-dictionary', 'star-empire', 'soul-of-night']
    },
    gallery: {
        title: '延伸阅读 · 星空之美与天文摄影',
        desc: '想亲手拍出这样的星空？从观测入门到摄影技巧，这两本书能帮上忙。',
        books: ['nightwatch', 'soul-of-night', 'pale-blue-dot']
    },
    timeline: {
        title: '延伸阅读 · 宇宙的过去与未来',
        desc: '138 亿年太长，这几本书用不同的视角讲述宇宙如何走到今天，又将去向何方。',
        books: ['brief-history', 'short-history-nearly-everything', 'last-three-minutes', 'illustrated-brief-history']
    },
    news: {
        title: '延伸阅读 · 跟上航天前沿',
        desc: '新闻背后的原理与历史，这几本书能帮你把碎片信息连成体系。',
        books: ['cosmos', 'science-of-interstellar', 'short-history-nearly-everything', 'last-three-minutes']
    },
    community: {
        title: '延伸阅读 · 天文入门书单',
        desc: '刚接触天文不知道从哪本开始？按这个顺序读，循序渐进不掉队。',
        books: ['illustrated-brief-history', 'universe-in-hand', 'short-history-nearly-everything', 'star-dictionary']
    },
    credits: {
        title: '延伸阅读 · 科普与素材背后',
        desc: '一张天文照片的背后是几代人的观测与写作，这几本书讲述了那些故事。',
        books: ['cosmos', 'soul-of-night']
    },
    deep: {
        title: '延伸阅读 · 深空探索',
        desc: '星云、星团与遥远星系——想读懂这些深空天体，可以从这里开始。',
        books: ['cosmos', 'billion-suns', 'pale-blue-dot']
    },
    explore: {
        title: '延伸阅读 · 观测与工具',
        desc: '用好手上的工具，再配一册观星指南，普通人也能看见银河与星团。',
        books: ['nightwatch', 'star-dictionary']
    },
    download: {
        title: '延伸阅读 · 系统学习',
        desc: '下载资料之外，这几本书适合作为长期翻阅的系统读物。',
        books: ['illustrated-brief-history', 'universe-in-hand', 'star-dictionary']
    },
    neo: {
        title: '延伸阅读 · 小行星与行星防御',
        desc: '近地天体既是威胁也是资源——想了解人类如何发现、追踪并应对它们，可以从这几本书读起。',
        books: ['cosmos', 'last-three-minutes', 'pale-blue-dot']
    }
};

// 详情页按分组映射到主题
export const GROUP_TOPIC = {
    planet: 'solar',
    star: 'encyclopedia',
    galaxy: 'encyclopedia',
    blackhole: 'blackhole',
    constellation: 'constellations',
    object: 'deep',
    telescope: 'explore'
};

// 黑洞主题单独一组，补充到 PAGE_BOOKS
PAGE_BOOKS.blackhole = {
    title: '延伸阅读 · 黑洞与引力',
    desc: '黑洞是广义相对论最极端的预言，这两本书把它的来龙去脉讲得很清楚。',
    books: ['science-of-interstellar', 'brief-history', 'elegant-universe']
};

export function getBooks(bookList, ids) {
    return ids.map(id => bookList.find(b => b.id === id)).filter(Boolean);
}
