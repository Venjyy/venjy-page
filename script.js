// =========================================================
// VENJY · El mapa de Venjy
// Todo lo pixelado de la página (mapa, texturas, íconos y
// estandartes) se genera aquí, sin imágenes externas.
// =========================================================

// Este archivo se carga como módulo (<script type="module">): es estricto,
// diferido y sin globales implícitas. Nada de index.html lo llama por nombre.
import { azar, generarDatos } from './mundo/mundo-datos.js';
import { pintarBitmap } from './mundo/pintado.js';

document.documentElement.classList.add('js');

const reducirMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------------------------------------------------------
// Utilidades (el azar con semilla viene de mundo-datos.js)
// ---------------------------------------------------------
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
// El mundo: la generación del terreno vive en mundo/mundo-datos.js
// (única fuente de verdad, compartida con el mundo 3D) y la paleta
// y el sombreado en mundo/pintado.js. Aquí solo se pinta en canvas.
// ---------------------------------------------------------
function generarMundo(orient) {
    const datos = generarDatos(orient);
    const { W, H, P, tramos, titulo } = datos;
    const c = lienzo(W, H);
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(W, H);
    img.data.set(pintarBitmap(datos));
    ctx.putImageData(img, 0, 0);
    const tituloCaja = { x: titulo.tx0 / W, y: titulo.ty0 / H, w: titulo.anchoT / W, h: titulo.altoT / H };
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
