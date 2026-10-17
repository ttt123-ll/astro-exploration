// 为图集图片补充出处（credit）字段
const fs = require('fs');
const path = require('path');
const D = 'F:\\天文科普\\client\\src\\data\\gallery.js';

const txt = fs.readFileSync(D, 'utf8');
const m = txt.match(/export default\s*(\[)/);
const start = m.index + m[0].lastIndexOf('[');
const arr = eval('(' + txt.slice(start).replace(/;\s*$/, '').trim() + ')');

// 按文件名给出处
const MAP = {
    pillars_of_creation: 'NASA / ESA 哈勃',
    orion_nebula: 'NASA / ESA 哈勃',
    crab_nebula: 'NASA / ESA 哈勃',
    carina_nebula: 'NASA / ESA / CSA 韦伯',
    ring_nebula: 'NASA / ESA 哈勃',
    veil_nebula: 'NASA / ESA 哈勃',
    helix_nebula: 'NASA / ESA 哈勃',
    trifid_nebula: 'NASA / ESA',
    tarantula_nebula: 'NASA / ESA 哈勃',
    cats_eye_nebula: 'NASA / ESA 哈勃',
    butterfly_nebula: 'NASA / ESA 哈勃',
    jwst_deep_field: 'NASA / ESA / CSA 韦伯',
    hubble_deep_field: 'NASA / ESA 哈勃',
    abell2218_cluster: 'NASA / ESA 哈勃',
    andromeda_galaxy: 'NASA',
    milky_way: 'NASA / ESO',
    large_magellanic_cloud: 'NASA / ESA',
    star_cluster: 'NASA / ESA 哈勃',
    solar_eclipse: 'NASA',
    sombrero_galaxy: 'NASA / ESA 哈勃',
    whirlpool_galaxy: 'NASA / ESA 哈勃',
    pinwheel_galaxy: 'NASA / ESA 哈勃',
    m82_galaxy: 'NASA / ESA 哈勃',
    m83_galaxy: 'NASA / ESA 哈勃',
    ngc1300_barred_spiral: 'NASA / ESA 哈勃',
    ngc2841_galaxy: 'NASA / ESA 哈勃',
    ngc5866_galaxy: 'NASA / ESA 哈勃',
    mars: 'NASA / JPL', jupiter: 'NASA / JPL', saturn: 'NASA / JPL',
    uranus: 'NASA / JPL', neptune: 'NASA / JPL', mercury: 'NASA / JPL',
    venus: 'NASA / JPL', earth: 'NASA'
};
function creditFor(src) {
    const f = String(src).split('/').pop().replace(/\.(jpg|png)$/i, '');
    if (MAP[f]) return MAP[f];
    if (/^blackhole/.test(f)) return 'NASA / 事件视界望远镜';
    if (/^star_/.test(f)) return 'NASA / ESA';
    if (/^telescope_/.test(f)) return 'NASA';
    if (/^constellation_/.test(f)) return '公共星空示意素材';
    return 'NASA / ESA 公开影像';
}

arr.forEach(g => { g.credit = creditFor(g.src); });

const out = '// 自动生成（tools/extract2.js）\n// credit：图片出处（NASA/ESA 等公开影像；星座线图为公共示意素材）\nexport default ' + JSON.stringify(arr, null, 2) + ';\n';
fs.writeFileSync(D, out, 'utf8');
console.log('已为', arr.length, '张图集图片补充出处');
console.log('示例:', arr[0].title, '→', arr[0].credit);
console.log('示例:', arr[arr.length - 1].title, '→', arr[arr.length - 1].credit);
