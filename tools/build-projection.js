// 从现有数据构建"投影目录"（行星 + 星座 + 黑洞 + 恒星 + 星系 + 深空天体）
const fs = require('fs');
const path = require('path');

const D = 'F:\\天文科普\\client\\src\\data';
const read = f => fs.readFileSync(path.join(D, f), 'utf8');

function evalExport(file) {
    const txt = read(file);
    const m = txt.match(/export default\s*([\[{])/);
    const start = m.index + m[0].lastIndexOf(m[1]);
    // 去掉结尾的 ";\n"
    const body = txt.slice(start).replace(/;\s*$/, '').trim();
    return eval('(' + body + ')');
}

const planets = evalExport('planets.js');
const cons = evalExport('constellations.js');
const content = evalExport('content.js');

const cat = [];
// 行星
for (const p of planets) {
    const en = p.englishName.toLowerCase();
    const detail = content.planet && content.planet[en];
    let desc = p.description;
    if (detail && detail.sections) {
        desc = detail.sections.flatMap(s => s.paras || []).slice(0, 3).join('');
    }
    cat.push({
        cat: '行星', name: p.name, en: p.englishName,
        img: '/assets/images/' + en + '.jpg',
        tex: '/assets/textures/' + en + '.jpg',
        stats: [
            { l: '直径', v: p.diameter.toLocaleString() + ' km' },
            { l: '距太阳', v: p.distance + ' 百万 km' },
            { l: '自转', v: p.rotation + (p.englishName === 'Earth' ? ' 小时' : ' 天') },
            { l: '公转', v: p.revolution + ' 年' },
            { l: '卫星', v: p.moons + ' 颗' }
        ],
        desc
    });
}
// 星座
for (const c of cons) {
    cat.push({
        cat: '星座', name: c.name, en: c.latinName,
        img: '/assets/images/constellation_' + c.latinName.toLowerCase() + '.jpg',
        stats: [
            { l: '季节', v: c.season },
            { l: '最亮恒星', v: c.brightestStar },
            { l: '面积', v: c.area },
            { l: '最佳观测', v: c.bestView }
        ],
        desc: c.legend + (c.mythology ? ' ' + c.mythology : '')
    });
}
// 黑洞 / 恒星 / 星系 / 深空天体（来自 content.js）
function pushGroup(groupKey, catName, keys) {
    for (const k of keys) {
        const o = content[groupKey] && content[groupKey][k];
        if (!o) continue;
        const stats = (o.stats || []).slice(0, 5).map(s => ({ l: s.label, v: s.value }));
        const desc = (o.sections || []).flatMap(s => s.paras || []).slice(0, 3).join('');
        cat.push({
            cat: catName, name: o.title, en: o.subtitle || '',
            img: o.hero ? '/' + o.hero.src : '',
            stats, desc
        });
    }
}
pushGroup('blackhole', '黑洞', ['stellar', 'intermediate', 'supermassive', 'primordial']);
pushGroup('star', '恒星', ['blue-giant', 'red-giant', 'yellow-dwarf', 'white-dwarf', 'neutron-star', 'pulsar']);
pushGroup('galaxy', '星系', ['spiral', 'elliptical', 'barred-spiral', 'irregular']);
pushGroup('object', '深空', ['eagle-nebula', 'orion-nebula', 'crab-nebula', 'ring-nebula', 'andromeda', 'sombrero', 'carina', 'hubble-deep-field']);

const out = '// 投影目录（自动生成 tools/build-projection.js）\nexport default ' + JSON.stringify(cat, null, 2) + ';\n';
fs.writeFileSync(path.join(D, 'projection.js'), out, 'utf8');
console.log('投影目录条目:', cat.length);
const byCat = {};
cat.forEach(x => byCat[x.cat] = (byCat[x.cat] || 0) + 1);
console.log(byCat);
