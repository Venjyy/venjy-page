// =========================================================
// VENJY · Supervivencia · Duelo de Cartas Pixel: arte de las cartas (7h-2b, PR 2)
// Cada carta es un lienzo de 50×76 píxeles de arte: marco por familia, retrato con
// fondo, cinta con insignia, placa de texto y placas de ATK/DEF. Los textos (nombre,
// familia, efecto, números) los pone el panel encima, en el DOM con PixelCraft: así se
// leen nítidos, cambian de idioma y muestran el ATK/DEF vivo de la mesa.
// El panel escala solo por enteros (×2 en la mesa, ×3 en la mano) con
// image-rendering: pixelated. Las zonas de abajo (ZONAS) las repite supervivencia.css.
// dibujarCarta/dibujarReverso son puros (búfer RGBA); arteCarta/arteReverso los pasan a
// dataURL una vez y los guardan. Sin canvas (pruebas de Node) devuelven null.
// Todo el arte es propio: ninguna carta copia marcos ni dibujos de juegos reales.
// =========================================================
import { CARTAS } from './cartas-datos.js';

export const ANCHO = 50, ALTO = 76;
// Rectángulos [x, y, ancho, alto] en píxeles de arte, con su borde hundido incluido.
export const ZONAS = {
    nombre: [4, 4, 42, 8],
    retrato: [4, 13, 42, 28],
    texto: [4, 47, 42, 17],
    textoHechizo: [4, 47, 42, 25],
    atk: [4, 65, 20, 7],
    def: [26, 65, 20, 7]
};

// ---------- Paletas ----------
const MARCOS = {
    monstruo: { claro: '#9ad65e', base: ['#4f8f2f', '#4f8f2f', '#4a882c', '#579a34'], oscuro: '#2c5a1a', sombra: '#13280b', cinta: '#3a7022' },
    mito: { claro: '#86c8ec', base: ['#2f6f9a', '#2f6f9a', '#2b6890', '#3577a3'], oscuro: '#1a3f5e', sombra: '#0a1b2b', cinta: '#24587c' },
    amigo: { claro: '#ffd98a', base: ['#c98a2e', '#c98a2e', '#c0822a', '#d39434'], oscuro: '#7a4c14', sombra: '#3a2208', cinta: '#a2671f' },
    animal: { claro: '#ffab84', base: ['#c0532e', '#c0532e', '#b84e2b', '#c95b33'], oscuro: '#6e2a14', sombra: '#341208', cinta: '#9a3f20' },
    hechizo: { claro: '#c9a2ff', base: ['#6a32d1', '#6a32d1', '#6430c6', '#7039da'], oscuro: '#3a1580', sombra: '#1a0840', cinta: '#5226a8' }
};
const CONTORNO = '#0c0806';
const PLACA = ['#1d1813', '#1d1813', '#211b15', '#19140f'];
const PERGAMINO = ['#eadcb4', '#eadcb4', '#e4d4a8', '#f0e4c2', '#e7d8ae'];
const PERGAMINO_BORDE = ['#6b5232', '#fff4d0'];

// Insignias de familia (5×5)
const INSIGNIAS = {
    monstruo: ['.WWW.', 'WWWWW', 'W.W.W', 'WWWWW', '.W.W.'],
    mito: ['.WWW.', 'WW...', 'WW...', 'WW...', '.WWW.'],
    amigo: ['WW.WW', 'WWWWW', 'WWWWW', '.WWW.', '..W..'],
    animal: ['W.W.W', '.....', '.WWW.', 'WWWWW', '.WWW.'],
    hechizo: ['..W..', '.WWW.', 'WWWWW', '.WWW.', '.W.W.']
};
const ESPADA = ['....W', '...W.', 'W.W..', '.W...', 'W.W..'];
const ESCUDO = ['WWWWW', 'WCCCW', 'WCCCW', '.WCW.', '..W..'];

// ---------- Lienzo puro ----------
const cache = new Map();
const rgb = h => {
    let c = cache.get(h);
    if (!c) { c = [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; cache.set(h, c); }
    return c;
};
// Ruido determinista: la misma carta siempre sale igual.
const azar = (x, y, s = 0) => {
    let n = Math.imul(x + 101, 374761393) ^ Math.imul(y + 37, 668265263) ^ Math.imul(s + 7, 2246822519);
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
};
const elegir = (v, x, y, s) => (Array.isArray(v) ? v[Math.floor(azar(x, y, s) * v.length)] : v);
const semillaDe = txt => [...txt].reduce((a, ch) => (Math.imul(a, 31) + ch.charCodeAt(0)) | 0, 17);

function lienzo(w, h) {
    const d = new Uint8ClampedArray(w * h * 4);
    return {
        w, h, d,
        px(x, y, c, a = 1) {
            x |= 0; y |= 0;
            if (!c || x < 0 || y < 0 || x >= w || y >= h) return;
            const [r, g, b] = rgb(c), i = (y * w + x) * 4;
            if (a >= 1 || d[i + 3] === 0) { d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = a >= 1 ? 255 : Math.round(a * 255); return; }
            d[i] += (r - d[i]) * a; d[i + 1] += (g - d[i + 1]) * a; d[i + 2] += (b - d[i + 2]) * a;
        },
        lleno(x, y) { return x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] > 0; },
        rect(x, y, rw, rh, c, s = 0) { for (let j = 0; j < rh; j++) for (let i = 0; i < rw; i++) this.px(x + i, y + j, elegir(c, x + i, y + j, s)); }
    };
}
function matriz(L, filas, paleta, ox, oy, s = 0) {
    filas.forEach((fila, y) => {
        for (let x = 0; x < fila.length; x++) {
            const ch = fila[x];
            if (ch !== '.' && paleta[ch]) L.px(ox + x, oy + y, elegir(paleta[ch], ox + x, oy + y, s));
        }
    });
}
// Contorno de 1 píxel alrededor de lo dibujado (sin diagonales: estilo ítem de Minecraft).
function contorno(L, c) {
    const marcar = [];
    for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) {
        if (L.lleno(x, y)) continue;
        if (L.lleno(x - 1, y) || L.lleno(x + 1, y) || L.lleno(x, y - 1) || L.lleno(x, y + 1)) marcar.push(x, y);
    }
    for (let i = 0; i < marcar.length; i += 2) L.px(marcar[i], marcar[i + 1], c);
}
function pegar(dest, src, ox, oy) {
    for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) {
        const i = (y * src.w + x) * 4, a = src.d[i + 3];
        if (!a) continue;
        const hex = '#' + [src.d[i], src.d[i + 1], src.d[i + 2]].map(v => v.toString(16).padStart(2, '0')).join('');
        dest.px(ox + x, oy + y, hex, a / 255);
    }
}
// Degradado por bandas con tramado ordenado (Bayer 4×4), como los cielos pixelados.
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
function degradado(L, colores, x0 = 0, y0 = 0, w = L.w, h = L.h) {
    for (let y = 0; y < h; y++) {
        const t = (y / Math.max(1, h - 1)) * (colores.length - 1), i = Math.min(colores.length - 2, Math.floor(t)), f = t - i;
        for (let x = 0; x < w; x++) L.px(x0 + x, y0 + y, f * 16 > BAYER[((y & 3) << 2) | (x & 3)] + 0.5 ? colores[i + 1] : colores[i]);
    }
}
// Línea gruesa entre puntos (para el rayo y los mangos).
function linea(L, x0, y0, x1, y1, c, grosor = 0, a = 1) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1;
    for (let k = 0; k <= n; k++) {
        const x = Math.round(x0 + (x1 - x0) * k / n), y = Math.round(y0 + (y1 - y0) * k / n);
        for (let j = -grosor; j <= grosor; j++) for (let i = -grosor; i <= grosor; i++) if (Math.abs(i) + Math.abs(j) <= grosor) L.px(x + i, y + j, c, a);
    }
}
// Panel hundido: sombra arriba e izquierda, luz abajo y derecha.
function hundido(L, [x, y, w, h], relleno, sombra, luz, s = 0) {
    if (relleno) L.rect(x + 1, y + 1, w - 2, h - 2, relleno, s);
    for (let i = 0; i < w; i++) { L.px(x + i, y, sombra); L.px(x + i, y + h - 1, luz); }
    for (let j = 0; j < h; j++) { L.px(x, y + j, sombra); L.px(x + w - 1, y + j, luz); }
    L.px(x + w - 1, y, sombra); L.px(x, y + h - 1, sombra);
}

// ---------- Fondos de retrato (40×26) ----------
const FONDOS = {
    monstruo(F, s) { // noche con luna
        degradado(F, ['#07061a', '#120f33', '#231a4d', '#33245c']);
        for (let i = 0; i < 14; i++) { const x = Math.floor(azar(i, 1, s) * 40), y = Math.floor(azar(i, 2, s) * 16); F.px(x, y, azar(i, 3, s) > 0.7 ? '#ffffff' : '#9a96c8'); }
        matriz(F, ['.MMM.', 'MMMMm', 'MMMmm', 'MMMMm', '.MMM.'], { M: '#efeccb', m: '#c9c4a0' }, 32, 2);
        for (let x = 0; x < 40; x++) { const alto = 3 + Math.round(azar(x >> 1, 9, s) * 1.4); F.rect(x, 26 - alto, 1, alto, ['#1b3312', '#22401a', '#1b3312']); }
    },
    mito(F, s) { // niebla del sur
        degradado(F, ['#16303e', '#2a4c5c', '#4d7280', '#7b9aa3']);
        for (const [y, a] of [[8, 0.25], [15, 0.35], [21, 0.45]]) for (let x = 0; x < 40; x++) if (azar(x >> 2, y, s) > 0.3) F.px(x, y + (azar(x >> 3, y, s) > 0.5 ? 1 : 0), '#c8dde0', a);
    },
    amigo(F, s) { // atardecer en el campamento
        degradado(F, ['#ffb35c', '#f08a4a', '#c9604a', '#7a3a4a']);
        for (let x = 0; x < 40; x++) { const alto = 6 + Math.round(3 * Math.sin(x / 6 + 1) + azar(x >> 2, 5, s) * 2); F.rect(x, 26 - alto, 1, alto, ['#4a2e2a', '#432926']); }
        for (let x = 0; x < 40; x++) F.rect(x, 23, 1, 3, ['#3d6b22', '#467a28', '#355f1d']);
        for (let i = 0; i < 6; i++) F.px(Math.floor(azar(i, 4, s) * 40), 2 + Math.floor(azar(i, 6, s) * 10), '#ffe2a0', 0.8);
    },
    animal(F, s) { // día de pasto
        degradado(F, ['#5aa8f0', '#7fc0f6', '#b6dcfa']);
        matriz(F, ['..CCC...', '.CCCCCC.', 'CCCCCCCC'], { C: '#ffffff' }, 4, 3); matriz(F, ['.CCC..', 'CCCCCC'], { C: '#f2f6ff' }, 28, 6);
        for (let x = 0; x < 40; x++) { const alto = 5 + (azar(x, 8, s) > 0.6 ? 1 : 0); F.rect(x, 26 - alto, 1, alto, ['#5d9a2e', '#6fae38', '#548c29']); }
    },
    hechizo(F, s) { // tormenta morada
        degradado(F, ['#0f0722', '#1d0e3d', '#2e1658', '#3d1d6e']);
        for (let i = 0; i < 18; i++) { const x = Math.floor(azar(i, 11, s) * 44) - 2, y = Math.floor(azar(i, 12, s) * 26); for (let k = 0; k < 3; k++) F.px(x - k, y + k * 2, '#7a5ab8', 0.55); }
    }
};

// ---------- Retratos (figura 40×26 sobre su fondo) ----------
const CABEZA_ZOMBI = [
    'hhhhhHhhhhhhHhhh',
    'hHhhhhhhHhhhhhhH',
    'LhhSShhhhhShhhhs',
    'LSSSSSSSSSSSSSSs',
    'LSSSSSSSSSSSSSSs',
    'LSSSSSSSSSSSSSss',
    'LSkkkSSSSSSkkkSs',
    'LSkrkSSSSSSkrkSs',
    'LSSSSSSddSSSSSSs',
    'LSSSSSSddSSSSSss',
    'LSSSSSSSSSSSSSSs',
    'LSSSmmmmmmmmSSSs',
    'LSSSmwmmmmwmSSss',
    'LSSSSSSSSSSSSSss',
    'sSSSSSSSSSSSSsss',
    'ssssssssssssssss'
];
const PIEL_ZOMBI = { h: ['#2f4f1d', '#34561f'], H: '#3f6a27', L: '#7dbb50', S: ['#5f9a3c', '#5f9a3c', '#5a933a', '#66a242'], s: ['#4a7f2f', '#477a2d'], k: '#121a0e', r: '#ff3b30', d: '#3e6b28', m: '#1f2e16', w: '#c9d1a0' };
const CABEZA_BORIS = [
    'hhhhhhhhhhhhhhhh',
    'hhHhhhhhhhhHhhhh',
    'hhhhhhhhhhhhhhhh',
    'hhLSSSSSSSSSSShh',
    'hLSSSSSSSSSSSSsh',
    'LSSSSSSSSSSSSSSs',
    'LSShhSSSSSShhSSs',
    'LSSWkSSSSSSkWSSs',
    'LSSSSSSSSSSSSSSs',
    'LSSSSSSnnSSSSSSs',
    'LSSSSSSSSSSSSSss',
    'LSSSmSSSSSSmSSss',
    'LSSSSmmmmmmSSSss',
    'LSSSSSSSSSSSSsss',
    'sSSSSSSSSSSSSsss',
    'ssssssssssssssss'
];
const PIEL_BORIS = { h: ['#181414', '#1e1918'], H: '#2c2524', L: '#bd8a60', S: ['#a26e48', '#a26e48', '#9c6944', '#a8744d'], s: ['#8a5a38', '#855735'], W: '#f4f0ea', k: '#28160f', n: '#83522f', m: '#5a2e22' };

function torso(F, x, y, w, h, base, claro, oscuro, s) {
    F.rect(x, y, w, h, base, s);
    for (let j = 0; j < h; j++) { F.px(x, y + j, claro); F.px(x + w - 1, y + j, oscuro); }
}
const RETRATOS = {
    zombi(F, fondo, s) {
        // brazos estirados hacia quien mira: se ve la punta de cada brazo junto a los hombros
        for (const bx of [4, 28]) {
            F.rect(bx, 17, 8, 8, PIEL_ZOMBI.S, s);
            for (let i = 0; i < 8; i++) { F.px(bx + i, 17, '#7dbb50'); F.px(bx + i, 24, '#3e6b28'); F.px(bx, 17 + i, '#7dbb50'); F.px(bx + 7, 17 + i, '#3e6b28'); }
            F.rect(bx + 2, 19, 4, 4, '#4f8733', s); F.rect(bx + 3, 20, 2, 2, '#3e6b28');
            F.rect(bx, 25, 8, 1, ['#2f8a99', '#29808e']);
        }
        torso(F, 12, 17, 16, 9, ['#2f8a99', '#2f8a99', '#2b8290', '#35949f'], '#4fb0bd', '#226a76', s);
        F.rect(18, 17, 4, 2, PIEL_ZOMBI.S, s); F.px(19, 19, '#5f9a3c'); F.px(20, 19, '#5f9a3c'); // cuello abierto
        for (const [x, y] of [[14, 21], [15, 22], [24, 23], [25, 22], [21, 24]]) F.px(x, y, '#1c4f57'); // rasgones
        F.rect(12, 25, 16, 1, '#3a3f8f'); // asoma el pantalón
        matriz(F, CABEZA_ZOMBI, PIEL_ZOMBI, 12, 1, s);
        // ojos que brillan en la noche
        for (const ox of [14, 25]) { fondo.px(ox, 7, '#ff3b30', 0.25); fondo.px(ox, 9, '#ff3b30', 0.2); }
    },
    boris(F, fondo, s) {
        // hacha al hombro: mango de roble y hoja de hierro
        linea(F, 35, 25, 33, 2, '#6b4529', 0); linea(F, 36, 25, 34, 2, '#8b5e3a', 0);
        matriz(F, [
            '..IIW.',
            '.IIIIW',
            'IiIIIW',
            'IiIIIW',
            'IiIIIW',
            '.IIIIW',
            '..IIW.'
        ], { I: ['#c6c6c6', '#bdbdbd'], i: '#8b8b8b', W: '#f2f2f2' }, 34, 0, s);
        F.rect(31, 1, 2, 3, '#7a7a7a'); F.px(31, 1, '#9a9a9a'); // talón del hacha
        F.rect(33, 0, 1, 5, '#5a4030');
        // camisa a cuadros
        const cuadro = (x, y) => {
            const a = ((x >> 1) & 1) === 1, b = ((y >> 1) & 1) === 1;
            return a && b ? '#5c1210' : a || b ? '#8a1e1b' : elegir(['#b02824', '#b02824', '#a82522'], x, y, s);
        };
        for (let y = 17; y < 26; y++) for (let x = 12; x < 28; x++) F.px(x, y, cuadro(x, y));
        for (let y = 17; y < 26; y++) { F.px(12, y, '#c94440'); F.px(27, y, '#5c1210'); }
        F.rect(18, 17, 4, 1, PIEL_BORIS.S, s); F.px(19, 18, '#a26e48'); F.px(20, 18, '#a26e48');
        // brazo levantado sosteniendo el mango
        for (let y = 18; y < 26; y++) for (let x = 28; x < 33; x++) F.px(x, y, cuadro(x, y));
        F.rect(31, 13, 5, 5, PIEL_BORIS.S, s);
        for (let i = 0; i < 5; i++) { F.px(31 + i, 13, '#bd8a60'); F.px(31 + i, 17, '#8a5a38'); }
        F.px(32, 15, '#8a5a38'); F.px(34, 15, '#8a5a38'); // dedos
        // brazo bajo, del otro lado
        for (let y = 18; y < 26; y++) for (let x = 7; x < 12; x++) F.px(x, y, cuadro(x, y));
        F.rect(7, 24, 5, 2, PIEL_BORIS.S, s);
        matriz(F, CABEZA_BORIS, PIEL_BORIS, 12, 1, s);
        // brasas de la fogata
        for (let i = 0; i < 5; i++) fondo.px(2 + Math.floor(azar(i, 21, s) * 8), 4 + Math.floor(azar(i, 22, s) * 14), '#ffd27a', 0.9);
    },
    rayo(F, fondo, s) {
        // suelo de piedra quemada
        for (let x = 0; x < 40; x++) { const alto = 3 + (azar(x >> 1, 31, s) > 0.6 ? 1 : 0); for (let j = 0; j < alto; j++) fondo.px(x, 25 - j, elegir(['#3a3540', '#2e2a33', '#45404c'], x, j, s)); }
        // resplandor del rayo sobre el fondo
        const camino = [[22, 6], [17, 12], [22, 13], [15, 20], [19, 20], [16, 24]];
        const rama = [[22, 13], [27, 16], [30, 15], [33, 19]];
        for (const c of [camino, rama]) for (let k = 0; k < c.length - 1; k++) linea(fondo, ...c[k], ...c[k + 1], '#b48cff', 3, 0.22);
        for (let y = 19; y < 26; y++) for (let x = 6; x < 27; x++) { const dd = ((x - 16) / 10) ** 2 + ((y - 24) / 4) ** 2; if (dd < 1) fondo.px(x, y, '#ffd27a', 0.45 * (1 - dd)); }
        for (let k = 0; k < camino.length - 1; k++) linea(fondo, ...camino[k], ...camino[k + 1], '#e0c8ff', 2, 0.25);
        // nube de tormenta
        matriz(F, [
            '......NNNNN..........NNNN.....',
            '...NNNNnnnNNN.....NNNnnnNNN...',
            '.NNNnnnnnnnnNNNNNNNnnnnnnnNNN.',
            'NNnnnnnnnnnnnnnnnnnnnnnnnnnnNN',
            'Nnnnnnnnnnnnnnnnnnnnnnnnnnnnnn',
            'ddnnnnnnnndddnnnnnnnnnnnddnnnd',
            '.dddddddddd.dddddddddddddd.dd.'
        ], { N: ['#aaa6c2', '#a29ebb'], n: ['#6c6888', '#66627f', '#726e8e'], d: '#45385e' }, 5, 0, s);
        for (let k = 0; k < rama.length - 1; k++) linea(F, ...rama[k], ...rama[k + 1], '#ffaa00', 0);
        for (let k = 1; k < rama.length - 1; k++) F.px(...rama[k], '#ffff55');
        // el rayo: borde naranja, cuerpo amarillo, núcleo blanco
        for (let k = 0; k < camino.length - 1; k++) linea(F, ...camino[k], ...camino[k + 1], '#ffaa00', 1);
        for (let k = 0; k < camino.length - 1; k++) linea(F, ...camino[k], ...camino[k + 1], '#ffff55', 1);
        for (let k = 0; k < camino.length - 1; k++) linea(F, ...camino[k], ...camino[k + 1], '#ffffff', 0);
        // chispas del impacto
        for (const [dx, dy] of [[-4, -1], [-3, -3], [3, -2], [4, 0], [-5, 1], [5, 1], [0, -4], [2, -4]]) F.px(16 + dx, 24 + dy, Math.abs(dx) > 3 ? '#ffaa00' : '#ffff55');
        // lluvia
        for (let i = 0; i < 10; i++) { const x = Math.floor(azar(i, 41, s) * 40), y = 8 + Math.floor(azar(i, 42, s) * 12); fondo.px(x, y, '#9fa8ff', 0.6); fondo.px(x - 1, y + 1, '#9fa8ff', 0.4); }
    }
};

export const familiaDe = id => (CARTAS[id].tipo === 'hechizo' ? 'hechizo' : CARTAS[id].familia);
export const tieneRetrato = id => !!RETRATOS[id];

// ---------- Carta completa ----------
function marco(L, M, s) {
    const W = L.w, H = L.h;
    L.rect(1, 1, W - 2, H - 2, M.base, s);
    // motas del bloque
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const r = azar(x, y, s + 5); if (r > 0.94) L.px(x, y, M.claro); else if (r < 0.05) L.px(x, y, M.oscuro); }
    // bisel y contorno con esquinas redondeadas
    for (let i = 1; i < W - 1; i++) { L.px(i, 1, M.claro); L.px(i, H - 2, M.oscuro); L.px(i, 0, CONTORNO); L.px(i, H - 1, CONTORNO); }
    for (let j = 1; j < H - 1; j++) { L.px(1, j, M.claro); L.px(W - 2, j, M.oscuro); L.px(0, j, CONTORNO); L.px(W - 1, j, CONTORNO); }
    for (const [x, y] of [[1, 1], [W - 2, 1], [1, H - 2], [W - 2, H - 2]]) L.px(x, y, CONTORNO);
    for (const [x, y] of [[0, 0], [W - 1, 0], [0, H - 1], [W - 1, H - 1]]) L.d[(y * W + x) * 4 + 3] = 0;
    // remaches
    for (const [x, y] of [[2, 2], [W - 3, 2], [2, H - 3], [W - 3, H - 3]]) { L.px(x, y, M.claro); L.px(x + (x < 9 ? 1 : -1), y + (y < 9 ? 1 : -1), M.sombra); }
}
function cinta(L, M, fam) {
    // cinta con la familia, que sobresale del marco
    for (let x = 2; x <= 47; x++) {
        L.px(x, 41, M.claro); L.px(x, 46, M.sombra);
        for (let y = 42; y <= 45; y++) L.px(x, y, M.cinta);
    }
    for (let y = 42; y <= 45; y++) L.px(48, y, y === 42 || y === 45 ? CONTORNO : M.oscuro);
    L.px(49, 43, CONTORNO); L.px(49, 44, CONTORNO); L.px(48, 43, M.oscuro); L.px(48, 44, M.oscuro);
    // insignia redonda
    const disco = ['..XXXXX..', '.XXXXXXX.', 'XXXXXXXXX', 'XXXXXXXXX', 'XXXXXXXXX', 'XXXXXXXXX', 'XXXXXXXXX', '.XXXXXXX.', '..XXXXX..'];
    disco.forEach((f, j) => { for (let i = 0; i < 9; i++) if (f[i] === 'X') {
        const borde = f[i - 1] !== 'X' || f[i + 1] !== 'X' || disco[j - 1]?.[i] !== 'X' || disco[j + 1]?.[i] !== 'X';
        L.px(1 + i, 39 + j, borde ? CONTORNO : (i + j < 7 ? M.claro : M.oscuro));
    } });
    L.rect(3, 41, 5, 5, M.base);
    matriz(L, INSIGNIAS[fam], { W: '#ffffff' }, 3, 41);
}
// Relleno de las cartas sin retrato todavía: la insignia de la familia en grande (×4).
function marcador(F, fam, M) {
    INSIGNIAS[fam].forEach((fila, y) => { for (let x = 0; x < 5; x++) if (fila[x] === 'W') {
        for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) F.px(10 + x * 4 + i, 3 + y * 4 + j, i === 0 || j === 0 ? M.claro : j === 3 || i === 3 ? M.oscuro : '#ffffff');
    } });
}
export function dibujarCarta(id) {
    const d = CARTAS[id];
    if (!d) return null;
    const fam = familiaDe(id), M = MARCOS[fam], s = semillaDe(id), L = lienzo(ANCHO, ALTO);
    marco(L, M, s);
    hundido(L, ZONAS.nombre, PLACA, M.sombra, M.claro, s);
    // retrato
    hundido(L, ZONAS.retrato, '#000000', M.sombra, M.claro, s);
    const fondo = lienzo(40, 26), fig = lienzo(40, 26);
    FONDOS[fam](fondo, s);
    if (RETRATOS[id]) RETRATOS[id](fig, fondo, s);
    else marcador(fig, fam, M); // hasta que tenga su retrato (7h-2b, PR 3)
    contorno(fig, CONTORNO);
    pegar(fondo, fig, 0, 0);
    // viñeta suave en las esquinas del retrato
    for (const [x, y] of [[0, 0], [1, 0], [0, 1], [39, 0], [38, 0], [39, 1], [0, 25], [1, 25], [0, 24], [39, 25], [38, 25], [39, 24]]) fondo.px(x, y, '#000000', 0.35);
    pegar(L, fondo, ZONAS.retrato[0] + 1, ZONAS.retrato[1] + 1);
    cinta(L, M, fam);
    if (d.tipo === 'hechizo') hundido(L, ZONAS.textoHechizo, PERGAMINO, ...PERGAMINO_BORDE, s);
    else {
        hundido(L, ZONAS.texto, PERGAMINO, ...PERGAMINO_BORDE, s);
        hundido(L, ZONAS.atk, PLACA, M.sombra, M.claro, s);
        hundido(L, ZONAS.def, PLACA, M.sombra, M.claro, s);
        matriz(L, ESPADA, { W: '#ff5555' }, 6, 66);
        matriz(L, ESCUDO, { W: '#55ffff', C: '#1f6f78' }, 28, 66);
    }
    return L;
}

// ---------- Reverso ----------
export function dibujarReverso() {
    const L = lienzo(ANCHO, ALTO), s = 99;
    const M = { claro: '#8a8a8a', base: ['#4a4a4a', '#4a4a4a', '#454545', '#505050'], oscuro: '#2a2a2a', sombra: '#141414' };
    marco(L, M, s);
    // obsidiana: bloques de 8×8 con vetas
    const centro = [8, 8, 34, 60];
    for (let y = 0; y < centro[3]; y++) for (let x = 0; x < centro[2]; x++) {
        const bx = (x >> 3), by = (y >> 3), r = azar(x, y, s);
        const col = r > 0.93 ? '#5a3a8a' : r > 0.8 ? '#2a1a40' : ((bx + by) & 1 ? '#160d24' : '#1b1030');
        L.px(centro[0] + x, centro[1] + y, col);
    }
    hundido(L, [7, 7, 36, 62], null, '#0a0612', '#6a6a6a', s);
    // destello de encantamiento en diagonal
    for (let k = -60; k < 60; k += 17) for (let t = 0; t < 70; t++) { const x = 8 + t, y = 8 + t + k; if (x < 42 && y >= 8 && y < 68) { L.px(x, y, '#8b5cff', 0.22); L.px(x + 1, y, '#8b5cff', 0.12); } }
    // rombo central de oro con amatista y una V
    const cx = 25, cy = 38, r = 12;
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
        const dd = Math.abs(x) + Math.abs(y);
        if (dd > r) continue;
        const px = cx + x - (x > 0 ? 1 : 0), py = cy + y;
        if (dd === r) L.px(px, py, CONTORNO);
        else if (dd >= r - 2) L.px(px, py, x + y < 0 ? '#ffd24a' : '#c07a00');
        else L.px(px, py, elegir(x + y < -3 ? ['#9a5ae0', '#8f52d6'] : ['#5f2fb0', '#6834bd'], px, py, s));
    }
    matriz(L, ['s.....s', 's.....s', '.s...s.', '.s...s.', '..s.s..', '..s.s..', '...s...'], { s: '#3a1580' }, 22, 36);
    matriz(L, ['Y.....Y', 'Y.....Y', '.Y...Y.', '.Y...Y.', '..Y.Y..', '..Y.Y..', '...Y...'], { Y: '#ffff55' }, 21, 35);
    // rombos pequeños en las esquinas
    for (const [x, y] of [[13, 13], [36, 13], [13, 62], [36, 62]]) matriz(L, ['.Y.', 'YyY', '.Y.'], { Y: '#ffaa00', y: '#ffff55' }, x - 1, y - 1);
    return L;
}

// ---------- Paso a imagen (con caché) ----------
const imagenes = new Map();
function aDataURL(L) {
    if (typeof document === 'undefined') return null;
    const c = document.createElement('canvas');
    const g = c && c.getContext ? c.getContext('2d') : null;
    if (!g || !c.toDataURL) return null;
    c.width = L.w; c.height = L.h;
    const img = g.createImageData(L.w, L.h); img.data.set(L.d); g.putImageData(img, 0, 0);
    return c.toDataURL('image/png');
}
function guardada(clave, dibujar) {
    if (!imagenes.has(clave)) { const L = dibujar(); imagenes.set(clave, L ? aDataURL(L) : null); }
    return imagenes.get(clave);
}
// dataURL de la carta (sin textos) o null si no hay canvas o la carta no existe.
export const arteCarta = id => (CARTAS[id] ? guardada(id, () => dibujarCarta(id)) : null);
export const arteReverso = () => guardada('#reverso', dibujarReverso);
