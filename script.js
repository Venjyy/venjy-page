// =========================================================
// VENJY · El mapa de Venjy
// Todo lo pixelado de la página (mapa, texturas, íconos y
// estandartes) se genera aquí, sin imágenes externas.
// =========================================================

document.documentElement.classList.add('js');

const reducirMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------------------------------------------------------
// Utilidades: azar con semilla y ruido de valor
// ---------------------------------------------------------
function azar(semilla) {
    let a = semilla >>> 0;
    return function () {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function crearRuido(semilla) {
    const r = azar(semilla);
    const tam = 256;
    const valores = new Float32Array(tam * tam);
    for (let i = 0; i < valores.length; i++) valores[i] = r();
    const suave = t => t * t * (3 - 2 * t);
    const v = (x, y) => valores[(y & (tam - 1)) * tam + (x & (tam - 1))];
    function ruido(x, y) {
        const x0 = Math.floor(x), y0 = Math.floor(y);
        const fx = suave(x - x0), fy = suave(y - y0);
        const a = v(x0, y0), b = v(x0 + 1, y0), c = v(x0, y0 + 1), d = v(x0 + 1, y0 + 1);
        return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
    }
    return function fbm(x, y, octavas = 4) {
        let suma = 0, amp = 0.5, frec = 1, total = 0;
        for (let o = 0; o < octavas; o++) {
            suma += ruido(x * frec, y * frec) * amp;
            total += amp;
            amp *= 0.5;
            frec *= 2;
        }
        return suma / total;
    };
}

function lienzo(w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
}

const hex = c => {
    const n = parseInt(c.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

// ---------------------------------------------------------
// Texturas de bloques (16×16) generadas en canvas
// ---------------------------------------------------------
function textura(semilla, pintor, tam = 16) {
    const c = lienzo(tam, tam);
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(tam, tam);
    const r = azar(semilla);
    for (let y = 0; y < tam; y++) {
        for (let x = 0; x < tam; x++) {
            const [cr, cg, cb] = pintor(x, y, r);
            const i = (y * tam + x) * 4;
            img.data[i] = cr;
            img.data[i + 1] = cg;
            img.data[i + 2] = cb;
            img.data[i + 3] = 255;
        }
    }
    ctx.putImageData(img, 0, 0);
    return c;
}

const ajustar = ([r, g, b], f) => [Math.min(255, r * f), Math.min(255, g * f), Math.min(255, b * f)];

function tablones(base, semilla) {
    const col = hex(base);
    const desfase = [0, 9, 4, 12];
    return textura(semilla, (x, y, r) => {
        const fila = Math.floor(y / 4);
        if (y % 4 === 3) return ajustar(col, 0.62);
        if ((x + desfase[fila]) % 16 === 0) return ajustar(col, 0.7);
        const veta = (y % 4 === 1 && r() < 0.35) ? 0.86 : 1;
        return ajustar(col, (0.93 + r() * 0.12) * veta);
    });
}

function ruidoso(base, semilla, rango = 0.22, motas = null) {
    const col = hex(base);
    return textura(semilla, (x, y, r) => {
        if (motas && r() < motas.p) return ajustar(hex(motas.color), 0.85 + r() * 0.3);
        return ajustar(col, 1 - rango / 2 + r() * rango);
    });
}

function aURL(c) {
    return `url(${c.toDataURL()})`;
}

function aplicarTexturas() {
    const raiz = document.documentElement.style;
    raiz.setProperty('--tex-abeto', aURL(tablones('#3a2a1c', 11)));
    raiz.setProperty('--tex-letrero', aURL(tablones('#b08c58', 12)));
    raiz.setProperty('--tex-piedra', aURL(ruidoso('#717171', 13, 0.28)));
    raiz.setProperty('--tex-pizarra', aURL(textura(14, (x, y, r) => {
        const base = y % 5 === 0 ? 0.78 : 1;
        return ajustar([70, 70, 77], base * (0.85 + r() * 0.3));
    })));
    raiz.setProperty('--tex-tierra', aURL(ruidoso('#4a3423', 15, 0.3, { p: 0.06, color: '#2e2016' })));
    raiz.setProperty('--tex-lecho', aURL(textura(16, (x, y, r) => {
        const v = r();
        return v < 0.3 ? [22, 22, 22] : v < 0.6 ? [58, 58, 58] : v < 0.85 ? [92, 92, 92] : [130, 130, 130];
    })));
    raiz.setProperty('--tex-camino', aURL(ruidoso('#94693f', 17, 0.3, { p: 0.08, color: '#6d4c2c' })));
}

// ---------------------------------------------------------
// Íconos pixelados (16×16) → SVG
// ---------------------------------------------------------
const ICONOS = {
    pasto: {
        p: { G: '#7fb238', L: '#9bd04a', g: '#5d8a26', D: '#8b5e3a', d: '#6b4529' },
        m: [
            'GGGGLGGGGGGLGGGG',
            'GLGGGGGGLGGGGGLG',
            'GGGGGgGGGGGGgGGG',
            'gGGgDgGGgGgDDgGg',
            'DgDDDDgDDDgDDDDD',
            'DDDdDDDDDDDDdDDD',
            'DdDDDDDdDDDDDDdD',
            'DDDDDdDDDDdDDDDD',
            'DDdDDDDDDDDDDdDD',
            'DDDDDDDdDDDDDDDD',
            'dDDDDDDDDDdDDDDd',
            'DDDDdDDDDDDDDDDD',
            'DDDDDDDDdDDDDdDD',
            'DdDDDDDDDDDDDDDD',
            'DDDDDDdDDDDdDDDD',
            'DDDDDDDDDDDDDDDD'
        ]
    },
    cabeza: {
        p: { H: '#2a1f1a', h: '#3d2e26', S: '#d9a77f', s: '#c38f68', K: '#111111', W: '#ffffff', E: '#3b2a20', M: '#9a5b48', C: '#1d1d22', T: '#f2f2f2', N: '#0b0b0b' },
        m: [
            '..hHHhHHHhHHh...',
            '.HHhHHHHHHHhHH..',
            '.HHHHhHHhHHHHHh.',
            '.HhSSSSSSSSSShH.',
            '.HSSSSSSSSSSSSH.',
            '.HKKKKKSSKKKKKH.',
            '.SKWEWKKKKWEWKS.',
            '.SKKKKKSSKKKKKS.',
            '.SSSSSSssSSSSSS.',
            '.SSSSSMMMMSSSSS.',
            '..SSSSSSSSSSSS..',
            '...ssSSSSSSss...',
            '..CCCCTNNTCCCC..',
            '.CCCCCTNNTCCCCC.',
            'CCCCCCTNNTCCCCCC',
            'CCCCCCTNNTCCCCCC'
        ]
    },
    libro: {
        p: { B: '#4a2a16', b: '#7a4524', Y: '#e8c34a', y: '#a8822c', P: '#f1ead7', p: '#c9bfa4' },
        m: [
            '................',
            '.BBBBBBBBBBBBP..',
            '.BbbbbbbbbbbBPp.',
            '.BbbbbbbbbbbBPp.',
            '.BbbYYYYYYbbBPp.',
            '.BbbYyyyyYbbBPp.',
            '.BbbYYYYYYbbBPp.',
            '.BbbbbbbbbbbBPp.',
            '.BbbbbbbbbbbBPp.',
            '.BbbbbbbbbbbBPp.',
            '.BbbbbbbbbbbBPp.',
            '.BbbbbbbbbbbBPp.',
            '.BbbbbbbbbbbBPp.',
            '.BBBBBBBBBBBBPp.',
            '..ppppppppppppp.',
            '................'
        ]
    },
    pico: {
        p: { C: '#5cdbd5', c: '#2a9c96', K: '#0f3e3c', H: '#8a5a2b', h: '#5c3a19' },
        m: [
            '................',
            '....KKKKK.......',
            '...KCCCCCKK.....',
            '..KCccccCCCK....',
            '...KK...KcCCK...',
            '........HKcCK...',
            '.......HhKKcCK..',
            '......HhH..KCK..',
            '.....HhH...KcK..',
            '....HhH.....KK..',
            '...HhH..........',
            '..HhH...........',
            '.HhH............',
            '.hH.............',
            '................',
            '................'
        ]
    },
    esmeralda: {
        p: { K: '#0a4d22', E: '#17dd62', L: '#a8f5c2', e: '#0c8b3a' },
        m: [
            '................',
            '................',
            '......KKKK......',
            '.....KELLEK.....',
            '....KELLEEeK....',
            '...KELLEEEEeK...',
            '...KELEEEEEeK...',
            '...KEEEEEEEeK...',
            '...KEEEEEEeeK...',
            '....KEEEEeeK....',
            '.....KEEeeK.....',
            '......KeeK......',
            '.......KK.......',
            '................',
            '................',
            '................'
        ]
    },
    gato: {
        p: { K: '#1a1412', O: '#e0892f', o: '#b8661e', W: '#f4ead8', G: '#8fd14f', P: '#e98aa0', N: '#000000' },
        m: [
            '................',
            '..K.........K...',
            '..KK.......KK...',
            '..KOK.....KKK...',
            '..KOOKKKKKKKK...',
            '..KOOOOKKKKKK...',
            '.KOOOOOKKKKKKK..',
            '.KOGNOOKKKNGKK..',
            '.KOOOOOKKKKKKK..',
            '.KOOOOWPWKKKKK..',
            '..KOOWWWWWKKK...',
            '...KKOWWWKKK....',
            '.....KKKKK......',
            '................',
            '................',
            '................'
        ]
    },
    carta: {
        p: { W: '#f4f1e8', g: '#9a9688', R: '#c0392b', r: '#7d1f16' },
        m: [
            '................',
            '................',
            '................',
            '.gggggggggggggg.',
            '.gWgWWWWWWWWgWg.',
            '.gWWgWWWWWWgWWg.',
            '.gWWWgWWWWgWWWg.',
            '.gWWWWgRRgWWWWg.',
            '.gWWWWWRrWWWWWg.',
            '.gWWWWWWWWWWWWg.',
            '.gWWWWWWWWWWWWg.',
            '.gWWWWWWWWWWWWg.',
            '.gggggggggggggg.',
            '................',
            '................',
            '................'
        ]
    },
    portal: {
        p: { K: '#14101e', O: '#2b1a4a', V: '#8932b8', v: '#b86be0', P: '#5d217e' },
        m: [
            '................',
            '..KKKKKKKKKKKK..',
            '..KOOOOOOOOOOK..',
            '..KOVvVPVvVPOK..',
            '..KOPVvVPVvVOK..',
            '..KOVPVvVPVvOK..',
            '..KOvVPVvVPVOK..',
            '..KOVvVPVvVPOK..',
            '..KOPVvVPVvVOK..',
            '..KOVPVvVPVvOK..',
            '..KOvVPVvVPVOK..',
            '..KOVvVPVvVPOK..',
            '..KOOOOOOOOOOK..',
            '..KKKKKKKKKKKK..',
            '................',
            '................'
        ]
    },
    cofre: {
        p: { K: '#2a1708', B: '#a86c2a', b: '#7c4b1b', Y: '#d6d6d6', y: '#7a7a7a' },
        m: [
            '................',
            '................',
            '.KKKKKKKKKKKKKK.',
            '.KBBBBBBBBBBBBK.',
            '.KBbbbbbbbbbbBK.',
            '.KBbbbbbbbbbbBK.',
            '.KKKKKKYYKKKKKK.',
            '.KBBBBBYyBBBBBK.',
            '.KBbbbbyybbbbBK.',
            '.KBbbbbbbbbbbBK.',
            '.KBbbbbbbbbbbBK.',
            '.KBbbbbbbbbbbBK.',
            '.KBBBBBBBBBBBBK.',
            '.KKKKKKKKKKKKKK.',
            '................',
            '................'
        ]
    },
    papel: {
        p: { W: '#f4f1e8', g: '#8f8a7c', L: '#3c3c3c' },
        m: [
            '................',
            '...gggggggggg...',
            '...gWWWWWWWWgg..',
            '...gWLLLLLWWWg..',
            '...gWWWWWWWWWg..',
            '...gWLLLLLLLWg..',
            '...gWWWWWWWWWg..',
            '...gWLLLLLLWWg..',
            '...gWWWWWWWWWg..',
            '...gWLLLLLLLWg..',
            '...gWWWWWWWWWg..',
            '...gWLLLLWWWWg..',
            '...gWWWWWWWWWg..',
            '...ggggggggggg..',
            '................',
            '................'
        ]
    },
    mapa: {
        p: { P: '#d9c49a', p: '#a68f62', G: '#7fb238', B: '#4040ff', S: '#f7e9a3', R: '#c0392b' },
        m: [
            '................',
            '.pppppppppppppp.',
            '.pPPPPPPPPPPPPp.',
            '.pPGGGGGSBBBBPp.',
            '.pPGGGGGSSBBBPp.',
            '.pPGGRGGGSBBBPp.',
            '.pPGGGGGGSSBBPp.',
            '.pPGGGGGGGSBBPp.',
            '.pPGGGGGGGSSBPp.',
            '.pPGGGGGGGGSBPp.',
            '.pPGGGGGGGGSSPp.',
            '.pPGGGGGGGGGSPp.',
            '.pPPPPPPPPPPPPp.',
            '.pppppppppppppp.',
            '................',
            '................'
        ]
    },
    faro: {
        p: { C: '#5cdbd5', c: '#c9fffb', K: '#0e3b39', O: '#1b1b2f', G: '#7a7a7a' },
        m: [
            '.......cc.......',
            '.......cc.......',
            '......cCCc......',
            '......cCCc......',
            '.......CC.......',
            '.......CC.......',
            '....KKKKKKKK....',
            '....KcccccccK...',
            '....KcCCCCCcK...',
            '....KcCOOCCcK...',
            '....KcCOOCCcK...',
            '....KcCCCCCcK...',
            '....KcccccccK...',
            '...GGGGGGGGGGG..',
            '...GGGGGGGGGGG..',
            '................'
        ]
    }
};

function svgDeMatriz({ p, m }) {
    const rects = [];
    m.forEach((fila, y) => {
        let x = 0;
        while (x < fila.length) {
            const ch = fila[x];
            if (ch === '.' || !p[ch]) { x++; continue; }
            let w = 1;
            while (fila[x + w] === ch) w++;
            rects.push(`<rect x="${x}" y="${y}" width="${w}" height="1" fill="${p[ch]}"/>`);
            x += w;
        }
    });
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">${rects.join('')}</svg>`;
}

function pintarIconos() {
    document.querySelectorAll('[data-icono]').forEach(el => {
        const def = ICONOS[el.dataset.icono];
        if (def) el.innerHTML = svgDeMatriz(def);
    });
}

// Estandartes de mapa (8×13 → escalados)
const COLORES_ESTANDARTE = {
    rojo: ['#b02e26', '#7a1f1a'],
    azul: ['#3c44aa', '#262c73'],
    cian: ['#169c9c', '#0e6a6a'],
    verde: ['#5e7c16', '#3f540e'],
    naranjo: ['#f9801d', '#b35c12'],
    morado: ['#8932b8', '#5d217e'],
    oro: ['#e0b400', '#9a7b00']
};

function estandarte(color) {
    const [tela, sombra] = COLORES_ESTANDARTE[color];
    const c = lienzo(9, 14);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#5c3a19';
    ctx.fillRect(0, 0, 9, 1);
    ctx.fillRect(4, 0, 1, 14);
    ctx.fillStyle = '#1b1208';
    ctx.fillRect(0, 1, 9, 10);
    ctx.fillStyle = tela;
    ctx.fillRect(1, 1, 7, 9);
    ctx.fillStyle = sombra;
    ctx.fillRect(1, 8, 7, 2);
    ctx.fillStyle = '#1b1208';
    ctx.fillRect(4, 10, 1, 1);
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.25;
    ctx.fillRect(1, 1, 7, 1);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#5c3a19';
    ctx.fillRect(4, 11, 1, 3);
    return c;
}

function flecha() {
    const c = lienzo(9, 9);
    const ctx = c.getContext('2d');
    const forma = [
        '....K....',
        '...KWK...',
        '...KWK...',
        '..KWWWK..',
        '..KWWWK..',
        '.KWWWWWK.',
        '.KWWKWWK.',
        'KWWK.KWWK',
        'KKK...KKK'
    ];
    forma.forEach((f, y) => [...f].forEach((ch, x) => {
        if (ch === '.') return;
        ctx.fillStyle = ch === 'K' ? '#000' : '#fff';
        ctx.fillRect(x, y, 1, 1);
    }));
    return c;
}

function mena(color) {
    const col = hex(color);
    return textura(color.length * 7 + col[0], (x, y, r) => {
        const borde = x === 0 || y === 0 || x === 15 || y === 15;
        if (borde) return [40, 40, 40];
        const cx = ((x * 7 + y * 3) % 5 === 0) || ((x + y * 5) % 7 === 0);
        if (cx && x > 2 && x < 13 && y > 2 && y < 13 && r() < 0.8) {
            return ajustar(col, 0.8 + r() * 0.35);
        }
        return ajustar([118, 118, 118], 0.82 + r() * 0.3);
    });
}

function aplicarEstandartes() {
    const raiz = document.documentElement.style;
    raiz.setProperty('--flecha', aURL(flecha()));
    raiz.setProperty('--estandarte-azul', aURL(estandarte('azul')));
    raiz.setProperty('--estandarte-oro', aURL(estandarte('oro')));
    document.querySelectorAll('.marcador[data-color]').forEach(m => {
        const e = m.querySelector('.estandarte');
        if (e) e.style.backgroundImage = aURL(estandarte(m.dataset.color));
    });
    const MINERAL = { diamante: '#5cdbd5', oro: '#fcee4b', redstone: '#ff2a1a', esmeralda: '#17dd62', lapis: '#2a5bd8' };
    document.querySelectorAll('.veta').forEach(v => {
        v.style.setProperty('--mena-img', aURL(mena(MINERAL[v.dataset.mineral])));
    });
}

// ---------------------------------------------------------
// El mundo: un mapa de Minecraft generado con la paleta real
// ---------------------------------------------------------
const MC = {
    pasto: [127, 178, 56], arena: [247, 233, 163], agua: [64, 64, 255], piedra: [112, 112, 112],
    nieve: [255, 255, 255], hojas: [0, 124, 0], tierra: [151, 109, 77], madera: [143, 119, 72],
    cuarzo: [255, 252, 245], rojo: [153, 51, 51], azul: [51, 76, 178], naranjo: [216, 127, 51],
    negro: [25, 25, 25], oro: [250, 238, 77], diamante: [92, 219, 213], esmeralda: [0, 217, 58],
    podzol: [129, 86, 49], arcilla: [164, 168, 184], gris: [76, 76, 76]
};
const TONOS = [180, 220, 255, 135];

const LETRAS = {
    V: ['X...X', 'X...X', 'X...X', 'X...X', '.X.X.', '.X.X.', '..X..'],
    E: ['XXXXX', 'X....', 'X....', 'XXXX.', 'X....', 'X....', 'XXXXX'],
    N: ['X...X', 'XX..X', 'X.X.X', 'X..XX', 'X...X', 'X...X', 'X...X'],
    J: ['..XXX', '...X.', '...X.', '...X.', 'X..X.', 'X..X.', '.XX..'],
    Y: ['X...X', 'X...X', '.X.X.', '..X..', '..X..', '..X..', '..X..']
};

const DISENOS = {
    h: {
        W: 384, H: 256, celda: 8, titulo: [0.5, 0.3], mar: [1.08, 1.12, 0.36],
        lago: [0.05, 0.98, 0.1],
        puntos: {
            spawn: [0.06, 0.47], casa: [0.15, 0.13], registro: [0.47, 0.11], mina: [0.84, 0.15],
            aldea: [0.73, 0.8], gatera: [0.49, 0.84], correo: [0.22, 0.8], faro: [0.935, 0.9]
        },
        desvios: { 'mina-aldea': [[0.92, 0.42], [0.86, 0.62]] }
    },
    v: {
        W: 256, H: 384, celda: 6, titulo: [0.434, 0.5], mar: [1.1, 1.06, 0.42],
        lago: [0.02, 0.97, 0.14],
        puntos: {
            spawn: [0.1, 0.38], casa: [0.2, 0.12], registro: [0.64, 0.1], mina: [0.8, 0.27],
            aldea: [0.78, 0.74], gatera: [0.5, 0.86], correo: [0.2, 0.76], faro: [0.87, 0.94]
        },
        desvios: { 'mina-aldea': [[0.93, 0.5]], 'spawn-casa': [], 'gatera-correo': [] }
    }
};

const RUTA = ['spawn', 'casa', 'registro', 'mina', 'aldea', 'gatera', 'correo'];

function generarMundo(orient) {
    const d = DISENOS[orient];
    const { W, H, celda } = d;
    const fbm = crearRuido(1424);
    const humedad = crearRuido(77);
    const r = azar(2026);
    const E = new Float32Array(W * H);
    const T = new Array(W * H).fill('pasto');
    const idx = (x, y) => y * W + x;
    const P = {};
    for (const k in d.puntos) P[k] = [Math.round(d.puntos[k][0] * W), Math.round(d.puntos[k][1] * H)];

    const NIVEL_MAR = 14;

    // Relieve base
    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            let e = fbm(x / 70, y / 70, 5);
            const mx = x / W - d.mar[0], my = y / H - d.mar[1];
            const dm = Math.hypot(mx * (W / H), my);
            e -= Math.max(0, (d.mar[2] + 0.28) - dm) * 1.4;
            const lx = x / W - d.lago[0], ly = y / H - d.lago[1];
            const dl = Math.hypot(lx * (W / H), ly);
            e -= Math.max(0, d.lago[2] - dl) * 2.2;
            E[idx(x, y)] = Math.floor(e * 40) + 2;
        }
    }

    // Montaña de la mina
    const [mx, my] = P.mina;
    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            const dd = Math.hypot(x - mx, y - my) / (W * 0.16);
            if (dd < 1) E[idx(x, y)] += Math.round((1 - dd * dd) * 22 * (0.8 + fbm(x / 9, y / 9, 2) * 0.4));
        }
    }

    // Isla del faro (ProcedimientoSeguro)
    const [fx, fy] = P.faro;
    const radioIsla = Math.round(W * 0.034);
    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            const dd = Math.hypot(x - fx, y - fy);
            if (dd < radioIsla) E[idx(x, y)] = Math.max(E[idx(x, y)], NIVEL_MAR + 1 + Math.round((1 - dd / radioIsla) * 4));
            else if (dd < radioIsla + 7) E[idx(x, y)] = Math.min(E[idx(x, y)], NIVEL_MAR - 2);
        }
    }

    // Zonas habitables: tierra firme y pareja
    const aplanar = (cx, cy, radio, alto) => {
        for (let y = Math.max(0, cy - radio); y < Math.min(H, cy + radio); y++) {
            for (let x = Math.max(0, cx - radio); x < Math.min(W, cx + radio); x++) {
                const dd = Math.hypot(x - cx, y - cy) / radio;
                if (dd > 1) continue;
                const i = idx(x, y);
                const w = Math.min(1, (1 - dd) * 2.2);
                E[i] = Math.round(E[i] * (1 - w) + alto * w);
            }
        }
    };
    ['spawn', 'casa', 'registro', 'aldea', 'gatera', 'correo'].forEach(k => aplanar(P[k][0], P[k][1], Math.round(W * 0.07), 18));

    // Llanura del título
    const letras = 'VENJY';
    const anchoT = (letras.length * 5 + (letras.length - 1)) * celda;
    const altoT = 7 * celda;
    const tx0 = Math.round(d.titulo[0] * W - anchoT / 2);
    const ty0 = Math.round(d.titulo[1] * H - altoT / 2);
    const margen = celda * 2;
    const ecx = tx0 + anchoT / 2, ecy = ty0 + altoT / 2;
    const erx = anchoT / 2 + margen * 2.2, ery = altoT / 2 + margen * 2.2;
    for (let y = Math.floor(ecy - ery); y < ecy + ery; y++) {
        for (let x = Math.floor(ecx - erx); x < ecx + erx; x++) {
            if (x < 0 || y < 0 || x >= W || y >= H) continue;
            const dd = Math.pow(Math.pow(Math.abs(x - ecx) / erx, 4) + Math.pow(Math.abs(y - ecy) / ery, 4), 0.25)
                + (fbm(x / 11, y / 11, 2) - 0.5) * 0.35;
            const w = Math.max(0, Math.min(1, (1 - dd) * 3));
            if (w === 0) continue;
            const i = idx(x, y);
            E[i] = Math.round(E[i] * (1 - w) + 18 * w);
        }
    }

    // Biomas
    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            const i = idx(x, y);
            const e = E[i];
            const hu = humedad(x / 40, y / 40, 3);
            if (e < NIVEL_MAR) T[i] = 'agua';
            else if (e <= NIVEL_MAR + 1) T[i] = 'arena';
            else if (e > 37) T[i] = 'nieve';
            else if (e > 30) T[i] = 'piedra';
            else if (hu > 0.56) {
                if (r() < 0.5) { T[i] = 'hojas'; E[i] = e + 2 + Math.floor(r() * 2); }
                else T[i] = 'pasto';
            } else {
                T[i] = 'pasto';
                if (r() < 0.06) E[i] = e + 1;
                if (hu > 0.5 && r() < 0.05) { T[i] = 'hojas'; E[i] = e + 3; }
            }
        }
    }

    // El título queda limpio de árboles
    for (let y = Math.floor(ecy - ery); y < ecy + ery; y++) {
        for (let x = Math.floor(ecx - erx); x < ecx + erx; x++) {
            if (x < 0 || y < 0 || x >= W || y >= H) continue;
            const dd = Math.pow(Math.pow(Math.abs(x - ecx) / erx, 4) + Math.pow(Math.abs(y - ecy) / ery, 4), 0.25)
                + (fbm(x / 11, y / 11, 2) - 0.5) * 0.35;
            if (dd > 0.82) continue;
            const i = idx(x, y);
            if (T[i] === 'hojas' || T[i] === 'agua' || T[i] === 'arena') T[i] = 'pasto';
            E[i] = 18 + (r() < 0.07 ? 1 : 0);
        }
    }

    // Caminos de tierra entre zonas (con bordes irregulares)
    const tramos = [];
    for (let s = 0; s < RUTA.length - 1; s++) {
        const a = RUTA[s], b = RUTA[s + 1];
        const desvio = (d.desvios[`${a}-${b}`] || []).map(([px, py]) => [Math.round(px * W), Math.round(py * H)]);
        const vertices = [P[a], ...desvio, P[b]];
        const pixeles = [];
        for (let v = 0; v < vertices.length - 1; v++) {
            const [x0, y0] = vertices[v], [x1, y1] = vertices[v + 1];
            const pasos = Math.ceil(Math.hypot(x1 - x0, y1 - y0));
            for (let k = 0; k <= pasos; k++) {
                const t = k / pasos;
                const ondula = (fbm((x0 + k) / 13, (y0 + k) / 17, 2) - 0.5) * 10 * Math.sin(Math.PI * t);
                const nx = -(y1 - y0) / pasos, ny = (x1 - x0) / pasos;
                const x = Math.round(x0 + (x1 - x0) * t + nx * ondula);
                const y = Math.round(y0 + (y1 - y0) * t + ny * ondula);
                const ultimo = pixeles[pixeles.length - 1];
                if (!ultimo || ultimo[0] !== x || ultimo[1] !== y) pixeles.push([x, y]);
            }
        }
        tramos.push(pixeles);
        pixeles.forEach(([x, y]) => {
            for (let oy = 0; oy <= 1; oy++) {
                for (let ox = 0; ox <= (orient === 'h' ? 1 : 0); ox++) {
                    const xx = x + ox, yy = y + oy;
                    if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
                    const i = idx(xx, yy);
                    if (T[i] === 'agua') { T[i] = 'madera'; E[i] = NIVEL_MAR + 1; }
                    else if (T[i] !== 'nieve' && T[i] !== 'piedra') { T[i] = 'tierra'; E[i] = Math.min(E[i], 18); }
                    else T[i] = 'gris';
                }
            }
        });
    }

    // Construcciones
    const bloque = (x, y, w, h, tipo, alto) => {
        for (let yy = y; yy < y + h; yy++) {
            for (let xx = x; xx < x + w; xx++) {
                if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
                const i = idx(xx, yy);
                T[i] = tipo;
                E[i] = 18 + alto;
            }
        }
    };
    const casa = (cx, cy, w, h, techo) => {
        bloque(cx, cy, w, h, techo, 4);
        bloque(cx + 1, cy + 1, w - 2, 1, techo, 5);
        bloque(cx + Math.floor(w / 2), cy + h, 1, 1, 'madera', 1);
    };
    const [cax, cay] = P.casa;
    casa(cax - 4, cay - 9, 8, 6, 'rojo');
    bloque(cax + 6, cay - 6, 3, 3, 'hojas', 4);
    const [rx, ry] = P.registro;
    casa(rx - 6, ry - 10, 12, 7, 'azul');
    bloque(rx - 8, ry - 9, 2, 5, 'madera', 2);
    const [mix, miy] = P.mina;
    bloque(mix - 2, miy - 4, 4, 3, 'negro', -2);
    bloque(mix - 3, miy - 5, 6, 1, 'madera', 2);
    const [ax, ay] = P.aldea;
    casa(ax - 12, ay - 12, 6, 5, 'madera');
    casa(ax + 3, ay - 13, 7, 5, 'podzol');
    casa(ax - 4, ay - 20, 6, 5, 'madera');
    for (let k = 0; k < 4; k++) bloque(ax + 4, ay + 2 + k * 2, 8, 1, k % 2 ? 'tierra' : 'hojas', 0);
    bloque(ax - 1, ay - 5, 2, 2, 'oro', 3);
    const [gx, gy] = P.gatera;
    casa(gx - 4, gy - 10, 7, 5, 'naranjo');
    bloque(gx + 5, gy - 4, 1, 1, 'naranjo', 1);
    bloque(gx + 6, gy - 4, 1, 1, 'negro', 1);
    bloque(gx - 7, gy - 3, 1, 1, 'negro', 1);
    bloque(gx - 6, gy - 3, 1, 1, 'naranjo', 1);
    const [cx, cy] = P.correo;
    bloque(cx - 3, cy - 10, 5, 5, 'cuarzo', 6);
    bloque(cx - 2, cy - 9, 3, 3, 'arcilla', 7);
    bloque(cx - 3, cy - 5, 1, 1, 'rojo', 2);
    bloque(fx - 2, fy - 2, 4, 4, 'cuarzo', 3);
    bloque(fx - 1, fy - 1, 2, 2, 'diamante', 5);

    // Letras del título: cuarzo en relieve
    [...letras].forEach((ch, n) => {
        LETRAS[ch].forEach((fila, fy2) => {
            [...fila].forEach((v, fx2) => {
                if (v !== 'X') return;
                const x0 = tx0 + (n * 6 + fx2) * celda, y0 = ty0 + fy2 * celda;
                for (let y = y0; y < y0 + celda; y++) {
                    for (let x = x0; x < x0 + celda; x++) {
                        const i = idx(x, y);
                        T[i] = 'cuarzo';
                        E[i] = 24;
                    }
                }
            });
        });
    });

    // Pintar con el sombreado de los mapas: más claro si sube hacia el norte
    const c = lienzo(W, H);
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(W, H);
    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            const i = idx(x, y);
            const tipo = T[i];
            const base = MC[tipo];
            let tono;
            if (tipo === 'agua') {
                const prof = NIVEL_MAR - E[i];
                const v = prof * 0.1 + ((x + y) & 1) * 0.2;
                tono = v < 0.5 ? 2 : v > 0.9 ? 0 : 1;
            } else {
                const norte = y > 0 ? E[idx(x, y - 1)] : E[i];
                const dif = E[i] - norte;
                tono = dif > 0 ? 2 : dif === 0 ? 1 : dif < -2 ? 3 : 0;
            }
            const f = TONOS[tono] / 255;
            const o = i * 4;
            img.data[o] = base[0] * f;
            img.data[o + 1] = base[1] * f;
            img.data[o + 2] = base[2] * f;
            img.data[o + 3] = 255;
        }
    }
    ctx.putImageData(img, 0, 0);

    // Uniones entre mapas (cada mapa es un marco de 128×128)

    const tituloCaja = { x: tx0 / W, y: ty0 / H, w: anchoT / W, h: altoT / H };
    return { orient, W, H, P, tramos, lienzo: c, tituloCaja };
}

// ---------------------------------------------------------
// Portada: dibuja el mapa y ubica estandartes
// ---------------------------------------------------------
let mundo = null;
const mapaEl = document.getElementById('mapa');
const mapaCanvas = document.getElementById('mapa-canvas');
const letreroInicio = document.querySelector('.letrero-inicio');
const muroEl = document.querySelector('.muro');

function orientacionDeseada() {
    return window.innerWidth / window.innerHeight < 0.9 ? 'v' : 'h';
}

function construirPortada() {
    const orient = orientacionDeseada();
    if (mundo && mundo.orient === orient) return false;
    mundo = generarMundo(orient);
    mapaEl.dataset.orient = orient;
    mapaCanvas.width = mundo.W;
    mapaCanvas.height = mundo.H;
    mapaCanvas.getContext('2d').drawImage(mundo.lienzo, 0, 0);

    if (orient === 'v') muroEl.appendChild(letreroInicio);
    else mapaEl.appendChild(letreroInicio);

    document.querySelectorAll('.marcador').forEach(m => {
        const p = mundo.P[m.dataset.punto];
        if (!p) return;
        m.style.left = `${(p[0] / mundo.W) * 100}%`;
        m.style.top = `${(p[1] / mundo.H) * 100}%`;
    });

    const jugador = document.getElementById('jugador');
    jugador.style.left = `${(mundo.P.spawn[0] / mundo.W) * 100}%`;
    jugador.style.top = `${(mundo.P.spawn[1] / mundo.H) * 100}%`;

    const caja = mundo.tituloCaja;
    const splash = document.getElementById('splash');
    if (orient === 'h') {
        splash.style.left = `${(caja.x + caja.w) * 100 + 4}%`;
        splash.style.top = `${(caja.y + caja.h * 0.8) * 100}%`;
    } else {
        splash.style.left = '60%';
        splash.style.top = `${(caja.y + caja.h) * 100 + 4}%`;
    }
    if (orient === 'h') letreroInicio.style.top = `${(caja.y + caja.h) * 100 + 4}%`;
    else letreroInicio.style.top = '';

    explorados = new Set();
    const marcar = (x, y) => {
        const cx = Math.floor(x / CHUNK), cy = Math.floor(y / CHUNK);
        for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) explorados.add(`${cx + ox},${cy + oy}`);
    };
    const x0 = caja.x * mundo.W;
    const y0 = caja.y * mundo.H;
    const x1 = (caja.x + caja.w) * mundo.W;
    const y1 = (caja.y + caja.h) * mundo.H;
    const margen = 50;
    for (let x = x0 - margen; x < x1 + margen; x += CHUNK * 0.75) {
        for (let y = y0 - margen; y < y1 + margen; y += CHUNK * 0.75) {
            marcar(x, y);
        }
    }
    return true;
}

// Franjas de zona: el mapa ampliado alrededor de cada lugar
function pintarFranjas() {
    if (!mundo) return;
    document.querySelectorAll('.franja').forEach(f => {
        const canvas = f.querySelector('.franja-canvas');
        const p = mundo.P[f.dataset.punto];
        if (!canvas || !p) return;
        const ancho = f.clientWidth, alto = f.clientHeight;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.round(ancho * dpr);
        canvas.height = Math.round(alto * dpr);
        const anchoRecorte = Math.min(mundo.W, ancho < 700 ? 64 : 120);
        const altoRecorte = anchoRecorte * (alto / ancho);
        let sx = p[0] - anchoRecorte * 0.62;
        let sy = p[1] - altoRecorte * 0.55;
        sx = Math.max(0, Math.min(mundo.W - anchoRecorte, sx));
        sy = Math.max(0, Math.min(mundo.H - altoRecorte, sy));
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(mundo.lienzo, sx, sy, anchoRecorte, altoRecorte, 0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'rgba(12, 8, 4, 0.34)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const escala = canvas.width / anchoRecorte;
        const color = f.closest('.zona').querySelector('.franja') && document.querySelector(`.marcador[data-punto="${f.dataset.punto}"]`)?.dataset.color;
        if (color) {
            const e = estandarte(color);
            const bx = (p[0] - sx) * escala, by = (p[1] - sy) * escala;
            const tam = Math.max(3, Math.round(escala * 0.5));
            ctx.drawImage(e, Math.round(bx - 4.5 * tam), Math.round(by - 14 * tam), 9 * tam, 14 * tam);
        }
        const coords = f.querySelector('.coords');
        if (coords) coords.textContent = coordenadas(p[0], p[1]);
    });
}

function coordenadas(x, y) {
    const X = Math.round((x - mundo.P.spawn[0]) * 4);
    const Z = Math.round((y - mundo.P.spawn[1]) * 4);
    return `X ${X} · Z ${Z}`;
}

// ---------------------------------------------------------
// Minimapa con niebla de exploración y barra de ítems
// ---------------------------------------------------------
const minimapa = document.getElementById('minimapa');
const miniCanvas = document.getElementById('minimapa-canvas');
const miniFlecha = document.getElementById('minimapa-flecha');
const miniCoords = document.getElementById('minimapa-coords');
const zonas = [...document.querySelectorAll('[data-zona]')];
const ranurasZona = [...document.querySelectorAll('.barra a.ranura')];
const CHUNK = 16;
let explorados = new Set();
let zonaActiva = -1;
let posAnterior = null;

function posicionEnRuta() {
    const vh = window.innerHeight;
    const linea = window.scrollY + vh * 0.35;
    let i = 0;
    for (let k = 0; k < zonas.length; k++) {
        if (zonas[k].offsetTop <= linea) i = k;
    }
    const z = zonas[i];
    let f = (linea - z.offsetTop) / Math.max(1, z.offsetHeight);
    f = Math.max(0, Math.min(1, f));
    if (i >= mundo.tramos.length) {
        const ult = mundo.tramos[mundo.tramos.length - 1];
        return { i, punto: ult[ult.length - 1], previo: ult[ult.length - 2] };
    }
    const tramo = mundo.tramos[i];
    const k = Math.min(tramo.length - 1, Math.floor(f * (tramo.length - 1)));
    return { i, punto: tramo[k], previo: tramo[Math.max(0, k - 2)], tramo, k };
}

function pintarMinimapa(estado) {
    if (!mundo) return;
    const { W, H } = mundo;
    if (miniCanvas.width !== W) {
        miniCanvas.width = W;
        miniCanvas.height = H;
    }
    // Revela los chunks recorridos hasta ahora
    const marcar = (x, y) => {
        const cx = Math.floor(x / CHUNK), cy = Math.floor(y / CHUNK);
        for (let oy = -3; oy <= 3; oy++) for (let ox = -3; ox <= 3; ox++) explorados.add(`${cx + ox},${cy + oy}`);
    };
    for (let t = 0; t < estado.i && t < mundo.tramos.length; t++) mundo.tramos[t].forEach(([x, y], n) => n % 6 === 0 && marcar(x, y));
    if (estado.tramo) for (let n = 0; n <= estado.k; n += 4) marcar(...estado.tramo[n]);
    marcar(...estado.punto);

    const ctx = miniCanvas.getContext('2d');
    ctx.drawImage(mundo.lienzo, 0, 0);
    for (let cy = 0; cy < H / CHUNK; cy++) {
        for (let cx = 0; cx < W / CHUNK; cx++) {
            if (explorados.has(`${cx},${cy}`)) continue;
            ctx.fillStyle = (cx + cy) % 2 ? '#d4bf8e' : '#cdb784';
            ctx.fillRect(cx * CHUNK, cy * CHUNK, CHUNK, CHUNK);
        }
    }

    const [px, py] = estado.punto;
    const [qx, qy] = estado.previo || estado.punto;
    const angulo = Math.atan2(py - qy, px - qx) * 180 / Math.PI + 90;
    const rect = miniCanvas.getBoundingClientRect();
    const escala = rect.width / W;
    miniFlecha.style.left = `${px * escala + 6}px`;
    miniFlecha.style.top = `${py * escala + 6}px`;
    if (posAnterior === null || Math.abs(px - qx) + Math.abs(py - qy) > 0) {
        miniFlecha.style.transform = `translate(-50%, -50%) rotate(${Math.round(angulo / 45) * 45}deg)`;
    }
    posAnterior = estado.punto;
    miniCoords.textContent = coordenadas(px, py);
}

const itemNombre = document.getElementById('item-nombre');
let temporizadorNombre;

function mostrarNombre(texto) {
    itemNombre.textContent = texto;
    itemNombre.classList.add('visible');
    clearTimeout(temporizadorNombre);
    temporizadorNombre = setTimeout(() => itemNombre.classList.remove('visible'), 1800);
}

function nombreRanura(el) {
    return el.getAttribute(idioma === 'en' ? 'data-en-nombre' : 'data-es-nombre');
}

let pendienteScroll = false;
function alHacerScroll() {
    if (pendienteScroll || !mundo) return;
    pendienteScroll = true;
    requestAnimationFrame(() => {
        pendienteScroll = false;
        const estado = posicionEnRuta();
        if (estado.i !== zonaActiva) {
            zonaActiva = estado.i;
            ranurasZona.forEach((r, n) => r.classList.toggle('activa', n === zonaActiva));
            ranurasZona.forEach((r, n) => n === zonaActiva ? r.setAttribute('aria-current', 'location') : r.removeAttribute('aria-current'));
            if (window.scrollY > window.innerHeight * 0.8) mostrarNombre(nombreRanura(ranurasZona[zonaActiva]));
        }
        minimapa.classList.toggle('visible', window.scrollY > window.innerHeight * 0.6);
        pintarMinimapa(estado);
    });
}

// ---------------------------------------------------------
// Idioma (español por defecto)
// ---------------------------------------------------------
let idioma = 'es';

function idiomaPreferido() {
    const param = new URLSearchParams(window.location.search).get('lang');
    if (param === 'es' || param === 'en') return param;
    try {
        const guardado = localStorage.getItem('preferredLanguage');
        if (guardado === 'es' || guardado === 'en') return guardado;
    } catch (e) { /* almacenamiento no disponible */ }
    return 'es';
}

function actualizarCV() {
    const sufijo = idioma === 'en' ? 'EN' : 'ES';
    document.querySelectorAll('.cv-link').forEach(a => {
        const archivo = `CV_BenjaminFloresB_${sufijo}.${a.dataset.fmt}`;
        a.href = `images/cv/${archivo}`;
        a.setAttribute('download', archivo);
    });
}

function cambiarIdioma(nuevo, guardar = true) {
    idioma = nuevo;
    document.documentElement.lang = nuevo;
    document.querySelectorAll('[data-es]').forEach(el => {
        const t = el.getAttribute(`data-${nuevo}`);
        if (t !== null) el.textContent = t;
    });
    document.querySelectorAll('[data-aria-es]').forEach(el => el.setAttribute('aria-label', el.getAttribute(`data-aria-${nuevo}`)));
    document.querySelectorAll('[data-alt-es]').forEach(el => el.setAttribute('alt', el.getAttribute(`data-alt-${nuevo}`)));
    document.querySelectorAll('.barra .ranura').forEach(r => {
        const sr = r.querySelector('.sr');
        if (sr && !sr.hasAttribute('data-es')) sr.textContent = nombreRanura(r);
    });
    document.getElementById('idioma-texto').textContent = nuevo.toUpperCase();
    document.querySelectorAll('a[data-mundo]').forEach(a => a.setAttribute('href', `mundo.html?lang=${nuevo}`));
    actualizarCV();
    reiniciarMaquina();
    elegirSplash();
    if (guardar) {
        try { localStorage.setItem('preferredLanguage', nuevo); } catch (e) { /* sin almacenamiento */ }
        const url = new URL(window.location.href);
        url.searchParams.set('lang', nuevo);
        window.history.replaceState({}, '', url);
    }
}

// ---------------------------------------------------------
// Máquina de escribir y frase splash
// ---------------------------------------------------------
const ROLES = {
    es: ['Desarrollador full stack', 'Creador de juegos indie', 'Estudiante de Ing. en Informática', 'Aprendiz de pentesting'],
    en: ['Full stack developer', 'Indie game creator', 'Computer Engineering student', 'Pentesting learner']
};
const SPLASH = {
    es: ['¡Con dos gatas!', '¡Hecho en Chile!', '¡Compila a la primera!', '¡100 % pixeles!', '¡Ahora en producción!', '¡Funciona sin señal!', '¡También en inglés!', '¡Café incluido!'],
    en: ['Now with two cats!', 'Made in Chile!', 'Compiles first try!', '100% pixels!', 'Now in production!', 'Works offline!', 'Also in Spanish!', 'Coffee included!']
};

const maquina = document.getElementById('typewriter');
let temporizadorMaquina;

function reiniciarMaquina() {
    clearTimeout(temporizadorMaquina);
    const lista = ROLES[idioma];
    if (reducirMovimiento) {
        maquina.textContent = lista[0];
        return;
    }
    let n = 0, c = lista[0].length, borrando = false;
    maquina.textContent = lista[0];
    const paso = () => {
        const texto = lista[n];
        if (borrando) {
            c--;
            maquina.textContent = texto.slice(0, c);
            if (c === 0) {
                borrando = false;
                n = (n + 1) % lista.length;
                temporizadorMaquina = setTimeout(paso, 400);
                return;
            }
            temporizadorMaquina = setTimeout(paso, 40);
        } else {
            c++;
            maquina.textContent = texto.slice(0, c);
            if (c >= texto.length) {
                borrando = true;
                temporizadorMaquina = setTimeout(paso, 2200);
                return;
            }
            temporizadorMaquina = setTimeout(paso, 85);
        }
    };
    borrando = true;
    temporizadorMaquina = setTimeout(paso, 2200);
}

let indiceSplash = Math.floor(Math.random() * SPLASH.es.length);
function elegirSplash() {
    document.getElementById('splash').textContent = SPLASH[idioma][indiceSplash];
}

// ---------------------------------------------------------
// Sonidos (Web Audio)
// ---------------------------------------------------------
let audio;
function iniciarAudio() {
    if (!audio) {
        try { audio = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { audio = null; }
    }
    if (audio && audio.state === 'suspended') audio.resume();
}

function tono(frecuencia, duracion, tipo = 'square', volumen = 0.08, deslizar = null) {
    if (!audio) return;
    const t = audio.currentTime;
    const osc = audio.createOscillator();
    const gan = audio.createGain();
    osc.type = tipo;
    osc.frequency.setValueAtTime(frecuencia, t);
    if (deslizar) osc.frequency.exponentialRampToValueAtTime(deslizar, t + duracion);
    gan.gain.setValueAtTime(volumen, t);
    gan.gain.exponentialRampToValueAtTime(0.001, t + duracion);
    osc.connect(gan).connect(audio.destination);
    osc.start(t);
    osc.stop(t + duracion);
}

const sonidoClic = () => tono(800, 0.08, 'square', 0.07);
const sonidoHover = () => tono(600, 0.05, 'sine', 0.04);
const sonidoLogro = () => {
    tono(784, 0.12, 'triangle', 0.08);
    setTimeout(() => tono(1175, 0.22, 'triangle', 0.08), 110);
};

function sonidoPicar() {
    if (!audio) return;
    const t = audio.currentTime;
    const buffer = audio.createBuffer(1, audio.sampleRate * 0.12, audio.sampleRate);
    const datos = buffer.getChannelData(0);
    for (let i = 0; i < datos.length; i++) datos[i] = (Math.random() * 2 - 1) * (1 - i / datos.length);
    const fuente = audio.createBufferSource();
    const filtro = audio.createBiquadFilter();
    const gan = audio.createGain();
    filtro.type = 'bandpass';
    filtro.frequency.value = 1400;
    gan.gain.setValueAtTime(0.22, t);
    gan.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    fuente.buffer = buffer;
    fuente.connect(filtro).connect(gan).connect(audio.destination);
    fuente.start(t);
}

// ---------------------------------------------------------
// Toasts de logro
// ---------------------------------------------------------
function toast(titulo, texto, icono = 'esmeralda') {
    const li = document.createElement('li');
    li.className = 'logro';
    li.innerHTML = `<span class="icono" aria-hidden="true">${svgDeMatriz(ICONOS[icono])}</span><span class="logro-titulo"></span><span class="logro-texto"></span>`;
    li.querySelector('.logro-titulo').textContent = titulo;
    li.querySelector('.logro-texto').textContent = texto;
    document.getElementById('toasts').appendChild(li);
    sonidoLogro();
    setTimeout(() => li.remove(), 4400);
}

// ---------------------------------------------------------
// Partículas al picar una mena
// ---------------------------------------------------------
function particulas(x, y, color) {
    if (reducirMovimiento) return;
    for (let i = 0; i < 10; i++) {
        const p = document.createElement('span');
        p.className = 'particula';
        const ang = (Math.PI * 2 * i) / 10 + Math.random() * 0.4;
        const dist = 30 + Math.random() * 40;
        p.style.left = `${x - 4}px`;
        p.style.top = `${y - 4}px`;
        p.style.background = i % 3 === 0 ? '#5a5a5a' : color;
        p.style.setProperty('--dx', `${Math.cos(ang) * dist}px`);
        p.style.setProperty('--dy', `${Math.sin(ang) * dist + 24}px`);
        document.body.appendChild(p);
        setTimeout(() => p.remove(), 750);
    }
}

// ---------------------------------------------------------
// Arranque
// ---------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    aplicarTexturas();
    pintarIconos();
    aplicarEstandartes();
    construirPortada();
    pintarFranjas();
    cambiarIdioma(idiomaPreferido(), false);
    alHacerScroll();

    window.addEventListener('scroll', alHacerScroll, { passive: true });

    let temporizadorResize;
    window.addEventListener('resize', () => {
        clearTimeout(temporizadorResize);
        temporizadorResize = setTimeout(() => {
            construirPortada();
            pintarFranjas();
            zonaActiva = -1;
            alHacerScroll();
        }, 150);
    });

    // Sonido: se activa con la primera interacción
    document.addEventListener('pointerdown', iniciarAudio, { once: true });
    document.addEventListener('keydown', iniciarAudio, { once: true });
    document.addEventListener('click', e => {
        if (e.target.closest('a, button')) sonidoClic();
    });
    document.querySelectorAll('.marcador, .ranura, .canal').forEach(el => el.addEventListener('mouseenter', sonidoHover));
    document.querySelectorAll('.barra .ranura').forEach(el => {
        el.addEventListener('mouseenter', () => mostrarNombre(nombreRanura(el)));
        el.addEventListener('focus', () => mostrarNombre(nombreRanura(el)));
    });

    // Menas: picar
    const COLOR_MENA = { diamante: '#5cdbd5', oro: '#fcee4b', redstone: '#ff3b30', esmeralda: '#17dd62', lapis: '#4a80ff' };
    document.querySelectorAll('.mena').forEach(m => {
        m.setAttribute('tabindex', '0');
        m.addEventListener('mouseenter', sonidoHover);
        const picar = (x, y) => {
            sonidoPicar();
            m.classList.remove('picando');
            void m.offsetWidth;
            m.classList.add('picando');
            particulas(x, y, COLOR_MENA[m.closest('.veta').dataset.mineral]);
        };
        m.addEventListener('click', e => picar(e.clientX, e.clientY));
        m.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                const r = m.getBoundingClientRect();
                picar(r.left + 18, r.top + r.height / 2);
            }
        });
    });

    // Inventario del CV
    const botonCV = document.getElementById('boton-cv');
    const inventario = document.getElementById('inventario-cv');
    const alternarCV = abrir => {
        const abierto = abrir ?? inventario.hidden;
        inventario.hidden = !abierto;
        botonCV.setAttribute('aria-expanded', String(abierto));
        if (abierto) mostrarNombre(nombreRanura(botonCV));
    };
    botonCV.addEventListener('click', () => alternarCV());
    document.getElementById('ficha-cv').addEventListener('click', e => {
        e.stopPropagation();
        alternarCV(true);
        inventario.querySelector('a').focus();
    });
    document.addEventListener('click', e => {
        if (!inventario.hidden && !e.target.closest('#inventario-cv, #boton-cv, #ficha-cv')) alternarCV(false);
    });

    // Idioma
    document.getElementById('boton-idioma').addEventListener('click', () => {
        cambiarIdioma(idioma === 'es' ? 'en' : 'es');
        mostrarNombre(nombreRanura(document.getElementById('boton-idioma')));
    });

    // Teclas 1–9 como en el juego
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && !inventario.hidden) { alternarCV(false); botonCV.focus(); return; }
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        if (e.target.closest('input, textarea, select, [contenteditable], video')) return;
        const n = Number(e.key);
        if (!n) return;
        if (n >= 1 && n <= 7) {
            const destino = document.querySelector(ranurasZona[n - 1].getAttribute('href'));
            destino.scrollIntoView({ behavior: reducirMovimiento ? 'auto' : 'smooth' });
            sonidoClic();
        } else if (n === 8) {
            alternarCV();
            sonidoClic();
        } else if (n === 9) {
            document.getElementById('boton-idioma').click();
        }
    });

    // Logros que entran al ver la casa
    const logros = document.querySelector('.casa .logros');
    if ('IntersectionObserver' in window) {
        const obs = new IntersectionObserver(entradas => {
            entradas.forEach(en => {
                if (en.isIntersecting) {
                    logros.classList.add('visto');
                    obs.disconnect();
                }
            });
        }, { threshold: 0.25 });
        obs.observe(logros);
    } else {
        logros.classList.add('visto');
    }

    // Video de ProcedimientoSeguro: corre solo cuando se ve
    const video = document.getElementById('video-ps');
    if (video && 'IntersectionObserver' in window && !reducirMovimiento) {
        new IntersectionObserver(entradas => {
            entradas.forEach(en => {
                if (en.isIntersecting) {
                    video.preload = 'auto';
                    video.play().catch(() => { /* el navegador puede bloquearlo */ });
                } else {
                    video.pause();
                }
            });
        }, { threshold: 0.4 }).observe(video);
    }

    // Visor de fotos
    const visor = document.getElementById('visor');
    const visorImg = document.getElementById('visor-img');
    document.querySelectorAll('.foto').forEach(b => {
        b.addEventListener('click', () => {
            const img = b.querySelector('img');
            visorImg.src = b.dataset.foto || img.src;
            visorImg.alt = img.alt;
            visor.showModal();
        });
    });
    visor.addEventListener('click', e => {
        if (e.target === visor) visor.close();
    });

    // Formulario: arma el correo y abre la app de correo
    const MENSAJES = {
        es: {
            nombre: 'Escribe tu nombre para saber a quién responder.',
            correo: 'Escribe tu correo para poder responderte.',
            correoMalo: 'Ese correo no parece válido: revisa que tenga @ y un dominio, como nombre@correo.cl.',
            mensaje: 'Escribe tu mensaje antes de enviarlo.',
            asunto: 'Contacto desde el portafolio',
            listo: ['¡Mensaje listo!', 'Revisa tu app de correo para enviarlo.']
        },
        en: {
            nombre: 'Enter your name so I know who to reply to.',
            correo: 'Enter your email so I can reply.',
            correoMalo: "That email doesn't look valid: check it has an @ and a domain, like name@mail.com.",
            mensaje: 'Write your message before sending it.',
            asunto: 'Contact from the portfolio',
            listo: ['Message ready!', 'Check your email app to send it.']
        }
    };
    const formulario = document.getElementById('formulario');
    formulario.addEventListener('submit', e => {
        e.preventDefault();
        const t = MENSAJES[idioma];
        const campos = {
            nombre: formulario.elements.nombre,
            correo: formulario.elements.correo,
            mensaje: formulario.elements.mensaje
        };
        const errores = {};
        if (!campos.nombre.value.trim()) errores.nombre = t.nombre;
        if (!campos.correo.value.trim()) errores.correo = t.correo;
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(campos.correo.value.trim())) errores.correo = t.correoMalo;
        if (!campos.mensaje.value.trim()) errores.mensaje = t.mensaje;
        let primero = null;
        Object.entries(campos).forEach(([k, el]) => {
            const salida = el.closest('.campo').querySelector('.campo-error');
            if (errores[k]) {
                el.setAttribute('aria-invalid', 'true');
                salida.textContent = errores[k];
                primero = primero || el;
            } else {
                el.removeAttribute('aria-invalid');
                salida.textContent = '';
            }
        });
        if (primero) {
            primero.focus();
            return;
        }
        const nombre = campos.nombre.value.trim();
        const asunto = `${t.asunto}: ${nombre}`;
        const cuerpo = `${campos.mensaje.value.trim()}\n\n— ${nombre} (${campos.correo.value.trim()})`;
        window.location.href = `mailto:benjaf243@gmail.com?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
        toast(t.listo[0], t.listo[1], 'carta');
    });

    // Secreto: cinco clics en el retrato
    let clics = 0, temporizadorClics;
    document.getElementById('retrato').addEventListener('click', () => {
        clics++;
        clearTimeout(temporizadorClics);
        temporizadorClics = setTimeout(() => { clics = 0; }, 1000);
        if (clics >= 5) {
            clics = 0;
            toast(idioma === 'es' ? '¡Desafío completado!' : 'Challenge complete!',
                idioma === 'es' ? 'Encontraste el secreto de Venjy' : "You found Venjy's secret", 'cabeza');
        }
    });
});
