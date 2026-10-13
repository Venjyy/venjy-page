// =========================================================
// VENJY · Supervivencia · Duelo de Cartas Pixel: arte de las cartas (7h-2b, PR 2 y PR 3)
// Reglas de diseño (formato, familias, amigos reconocibles, arte propio): CARTAS-ARTE.md
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
import { cargarDatos } from '../datos/cargador.js';
import { decodificar, hexDe, listoParaJuego, MEDIDAS } from '../datos/pixeles.js';

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
export const PLANTILLAS = Object.keys(MARCOS);
export const COLORES_MARCO = ['claro', 'base', 'oscuro', 'sombra', 'cinta'];
// Colores del marco que da el código (el Estudio los muestra junto a los del JSON)
export const marcoDeCodigo = fam => MARCOS[fam];

// ---------- Arte del dueño (mundo/datos/cartas-arte.json, pestaña Píxeles del Estudio) ----------
// retratos[clave de carta]: dibujo de 40×26 sobre el fondo de la familia; reverso: dibujo de 50×76;
// marcos[familia]: colores del marco. Lo de "estado": "borrador" no se usa en el juego.
let arte = { retratos: new Map(), reverso: null, marcos: {} };
let versionArte = 0;
export function aplicarArte(d) {
    const [rw, rh] = MEDIDAS.retrato, [cw, ch] = MEDIDAS.carta;
    const retratos = new Map();
    for (const [k, dib] of Object.entries((d && d.retratos) || {})) if (listoParaJuego(dib, rw, rh)) retratos.set(k, decodificar(dib, rw, rh));
    const reverso = d && listoParaJuego(d.reverso, cw, ch) ? decodificar(d.reverso, cw, ch) : null;
    arte = { retratos, reverso, marcos: (d && d.marcos) || {} };
    imagenes.clear();
    versionArte++;
}
export const versionDeArte = () => versionArte;
if (typeof location !== 'undefined') cargarDatos('cartas-arte').then(d => { if (d) aplicarArte(d); });
const HEX6 = /^#[0-9a-f]{6}$/i;
function marcoDe(fam) {
    const o = arte.marcos[fam];
    if (!o) return MARCOS[fam];
    const M = { ...MARCOS[fam] };
    for (const k of COLORES_MARCO) if (typeof o[k] === 'string' && HEX6.test(o[k])) M[k] = o[k];
    // la base lleva sus motas: el mismo color dos veces, uno algo más oscuro y uno algo más claro
    if (M.base !== MARCOS[fam].base) { const c = rgb(M.base); M.base = [M.base, M.base, hexDe(c.map(v => v * 0.95)), hexDe(c.map(v => v * 1.06))]; }
    return M;
}

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
const imagenes = new Map(); // dataURL por carta (arteCarta, arteReverso)
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

// ---------- Personas y gatas (7h-2b, PR 3) ----------
// Caras de 16×16 con los datos del juego: piel, pelo, ojos y estilo de PERSONAS (criaturas/amigos.js),
// Pony, Salonas y Lona (criaturas/npcs.js) y Venjy (criaturas/venjy.js). La cara frontal sigue las reglas
// de criaturas/pieles.js para que cada amigo se reconozca igual que en el mundo. Colores en rgb [r, g, b].
const hx = c => '#' + c.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const aj = (c, f) => c.map(v => v * f);
const mez = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const MECHONES = [9, 7, 4, 3, 6, 8, 5, 3, 7, 8, 4, 3, 5, 7, 9, 10];
const OJO_CARA = { 3: 'blanco', 4: 'iris', 11: 'iris', 12: 'blanco' };
const LENTE = [22, 22, 26];
const dentro = (x, y, x0, y0, x1, y1) => x >= x0 && x <= x1 && y >= y0 && y <= y1;
// Lentes redondos de npcs.js: aro de 4×4 alrededor de cada ojo (filas 6-9), puente y patillas
function lentesRedondos(x, y, aro, cristal) {
    for (const ox of [2, 10]) {
        if (!dentro(x, y, ox, 6, ox + 3, 9)) continue;
        const borde = x === ox || x === ox + 3 || y === 6 || y === 9;
        if ((x === ox || x === ox + 3) && (y === 6 || y === 9)) return null;
        return borde ? aro : cristal(x - ox, y - 6);
    }
    if (y === 7 && (x === 6 || x === 9 || x === 1 || x === 14)) return aro;
    return null;
}
function frenteGeneral(d, x, y, mot, r) {
    const P = d.piel, H = d.pelo, e = d.estilo;
    const pelo = () => (e === 'rulos' ? aj(H, ((x + y * 2) % 4 === 0 ? 1.45 : (x * 3 + y) % 5 === 0 ? 0.6 : 1) * (0.85 + r * 0.25)) : mot(H, 0.22));
    const tienePelo = {
        'muy corto': () => y <= 1 || ((x === 0 || x === 15) && y <= 3),
        corto: () => y <= 2 || (y === 3 && (x <= 1 || x >= 14)) || ((x === 0 || x === 15) && y <= 5),
        ordenado: () => y <= 2 || (y === 3 && (x >= 9 || x <= 1)) || ((x <= 1 || x >= 14) && y <= 5),
        largo: () => y <= 2 || (y === 3 && (x <= 5 || x >= 10)) || x <= 1 || x >= 14,
        rulos: () => y <= 3 || (y === 4 && x % 3 !== 1) || ((x <= 1 || x >= 14) && y <= 8),
        desordenado: () => y <= 2 || ((x === 0 || x === 15) && y <= 9) || (!(y >= 6 && y <= 8 && ((x >= 2 && x <= 5) || (x >= 10 && x <= 13))) && y < MECHONES[x])
    }[e];
    if (tienePelo()) return e === 'muy corto' ? aj(mez(H, P, 0.15), 0.85 + r * 0.25) : pelo();
    if (d.lentes && ((y >= 6 && y <= 8 && ((x >= 2 && x <= 5) || (x >= 10 && x <= 13)) && !(y === 7 && OJO_CARA[x])) || (y === 6 && x >= 6 && x <= 9))) return LENTE;
    if (d.barba) {
        const B = d.barbaColor || aj(H, 1.05);
        if (y === 12 && x >= 6 && x <= 9) return [146, 80, 70];
        if ((y === 10 && x >= 5 && x <= 10) || (y >= 11 && x >= 1 && x <= 14 && !(y === 15 && (x <= 2 || x >= 13)))) return mot(B, 0.16);
        if ((x <= 1 || x >= 14) && y >= 7) return mot(B, 0.16);
    }
    if (y === 5 && ((x >= 3 && x <= 5) || (x >= 10 && x <= 12))) return aj(H, 0.9);
    if (d.ojosRojos && y === 6 && ((x >= 3 && x <= 4) || (x >= 11 && x <= 12))) return aj(P, 0.82);
    if (y === 7 && OJO_CARA[x]) {
        if (OJO_CARA[x] === 'blanco') return d.ojosRojos ? [222, 122, 120] : [240, 240, 236];
        return d.ojosRojos ? mez(d.ojos, [200, 40, 40], 0.45) : d.ojos;
    }
    if (d.lunar && x === 3 && y === 9) return [70, 44, 34];
    if (x >= 7 && x <= 8 && (y === 8 || y === 9)) return aj(P, x === 7 ? 0.86 : 0.94);
    if (y === 11 && x >= 6 && x <= 9) return [150, 82, 72];
    return mot(P, 0.07);
}
const ROSTROS = {
    hadad: { piel: [226, 192, 164], pelo: [44, 30, 24], estilo: 'ordenado', ojos: [64, 150, 86], barba: true },
    andy: { piel: [194, 148, 110], pelo: [20, 18, 20], estilo: 'corto', ojos: [26, 20, 20] },
    nacho: { piel: [244, 216, 196], pelo: [88, 62, 40], estilo: 'corto', ojos: [84, 58, 36] },
    braulio: { piel: [240, 210, 188], pelo: [112, 76, 44], estilo: 'corto', ojos: [90, 60, 36], lunar: true },
    moises: { piel: [242, 214, 196], pelo: [178, 134, 72], estilo: 'largo', ojos: [90, 60, 36], ojosRojos: true },
    lucho: { piel: [242, 216, 198], pelo: [16, 14, 16], estilo: 'desordenado', ojos: [96, 62, 34] },
    conejeros: { piel: [242, 212, 190], pelo: [30, 22, 18], estilo: 'muy corto', ojos: [80, 56, 36] },
    lalo: { piel: [110, 72, 48], pelo: [18, 16, 18], estilo: 'corto', ojos: [30, 22, 20], ojosRojos: true },
    venjy: { piel: [240, 212, 192], pelo: [56, 34, 22], estilo: 'rulos', ojos: [74, 50, 30], barba: true, barbaColor: [138, 70, 40], lentes: true },
    pony: {
        piel: [192, 136, 98], pelo: [32, 25, 21],
        frente(d, x, y, mot) {
            const P = d.piel, H = d.pelo;
            if (y <= 2 || (y === 3 && (x <= 1 || x >= 14))) return mot(H, 0.2);
            const l = lentesRedondos(x, y, [172, 132, 84], (lx, ly) => ((ly === 1 || ly === 2) && (lx === 1 || lx === 2) ? (lx === 1 ? [255, 255, 255] : [40, 28, 22]) : aj(P, 1.04)));
            if (l) return l;
            if (y === 5 && (dentro(x, y, 2, 5, 5, 5) || dentro(x, y, 10, 5, 13, 5))) return aj(H, 1.1);
            if (dentro(x, y, 7, 8, 8, 10)) return aj(P, x === 7 ? 0.86 : 0.94);
            if (y === 12 && dentro(x, y, 6, 12, 9, 12)) return [118, 62, 52];
            if (dentro(x, y, 6, 13, 9, 15) && !(y === 15 && (x === 6 || x === 9))) return mot(H, 0.2); // perilla de chivo
            return mot(P, 0.08);
        }
    },
    salonas: {
        piel: [204, 158, 126], pelo: [20, 18, 20],
        frente(d, x, y, mot) {
            const P = d.piel, H = d.pelo;
            if (y < [3, 4, 3, 2, 3, 4, 2, 3, 3, 2, 4, 3, 2, 3, 4, 3][x] || x <= 1 || x >= 14) return mot(H, 0.3);
            const l = lentesRedondos(x, y, [204, 172, 86], (lx, ly) => (lx === 1 && ly === 1 ? [255, 236, 190] : ly <= 1 ? [244, 132, 40] : [214, 46, 58]));
            if (l) return l;
            if (y === 5 && (dentro(x, y, 3, 5, 5, 5) || dentro(x, y, 10, 5, 12, 5))) return H;
            if (dentro(x, y, 7, 8, 8, 10) && y < 11) return aj(P, x === 7 ? 0.86 : 0.94);
            if (y >= 11) return y === 13 && dentro(x, y, 6, 13, 9, 13) ? [104, 56, 48] : mot(H, 0.35);
            if (y === 10 && (x <= 3 || x >= 12)) return mot(H, 0.35);
            return mot(P, 0.08);
        }
    },
    lona: {
        piel: [242, 216, 198], pelo: [16, 14, 18],
        frente(d, x, y, mot) {
            const P = d.piel, H = d.pelo;
            if (y <= 1 || (y <= 3 && x >= 4) || x <= 1 || x >= 14) return mot(H, 0.18);
            if (y === 6 && (dentro(x, y, 3, 6, 5, 6) || dentro(x, y, 10, 6, 12, 6))) return [24, 20, 24];
            if (y === 7 && (x === 3 || x === 12)) return [255, 255, 255];
            if (y === 7 && (x === 4 || x === 5 || x === 10 || x === 11)) return x === 5 || x === 10 ? [40, 28, 24] : [96, 64, 40];
            if (y === 9 && (dentro(x, y, 3, 9, 4, 9) || dentro(x, y, 11, 9, 12, 9))) return [238, 168, 168];
            if (dentro(x, y, 7, 8, 8, 9)) return aj(P, x === 7 ? 0.9 : 0.96);
            if (y === 11 && dentro(x, y, 6, 11, 9, 11)) return [198, 96, 112];
            if (y === 12 && dentro(x, y, 7, 12, 8, 12)) return [214, 128, 138];
            return mot(P, 0.06);
        }
    }
};
// Cara de w×h (16×16 las personas) con luz a la izquierda y sombra a la derecha y abajo, como un bloque.
// `d.frente(d, x, y, mot, r)` da el rgb de cada píxel (null = vacío); sin frente, las reglas de pieles.js.
function cara(F, d, ox, oy, s, w = 16, h = 16) {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const r = azar(x, y, s + 3), mot = (c, f) => aj(c, 1 - f / 2 + r * f);
        let c = (d.frente || frenteGeneral)(d, x, y, mot, r);
        if (!c) continue;
        if (x === 0 && y > 2) c = aj(c, 1.14); else if (x === w - 1 || y === h - 1) c = aj(c, 0.84);
        F.px(ox + x, oy + y, hx(c));
    }
}
const rostro = (F, quien, ox, oy, s) => cara(F, ROSTROS[quien], ox, oy, s);
// Pelaje o tela con motas, en rgb, para ovalo() y caraGata()
const ruido = (c, f, s) => (x, y) => aj(c, 1 - f / 2 + azar(x, y, s) * f);
// Llama de 9×10 (fogata, tótem)
const LLAMA = ['....Y....', '...YY....', '...YOY...', '..YOOY.Y.', '.YOORYYO.', '.YORRRYOY', 'YORRWRROY', 'YORWWWROY', '.ORWWWRO.', '..ORRRO..'];
const FUEGO = { Y: '#ffd24a', O: '#ff8a1a', R: '#e8401a', W: '#fff3b0' };
// Corazón de 5×4
const CORAZON = ['CC.CC', 'CCCCC', '.CCC.', '..C..'];
// Torso de 16×9 bajo la cabeza, con el cuello de piel
function polera(F, ropa, P, s) { bloque(F, 12, 17, 16, 9, ropa, s); F.rect(18, 17, 4, 1, hx(P)); }
// Slime: cubo verde translúcido de n×n con su núcleo, cara y brillo
function cuboSlime(F, x0, y0, n, s) {
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
        const luz = x === 0 || y === 0, sombra = x === n - 1 || y === n - 1;
        F.px(x0 + x, y0 + y, luz ? '#b8f09a' : sombra ? '#3f8a2e' : elegir(['#7ac85a', '#72c052', '#82d062'], x0 + x, y0 + y, s), luz || sombra ? 0.95 : 0.7);
    }
    const k = Math.max(2, Math.round(n * 0.55)), c = (n - k) >> 1;
    for (let y = 0; y < k; y++) for (let x = 0; x < k; x++) F.px(x0 + c + x, y0 + c + y + 1, '#4f9a3a', 0.6);
    // cara propia: ojos grandes con brillo y sonrisa
    const e = n > 12 ? Math.max(2, Math.round(n / 6)) : 1, ey = y0 + Math.round(n * 0.3);
    for (const fx of [0.2, 0.62]) { const ex = x0 + Math.round(n * fx); F.rect(ex, ey, e, e + 1, '#1e3a16'); if (e > 1) F.px(ex, ey, '#ffffff'); }
    const mx = x0 + Math.round(n * 0.35), mw = Math.max(2, Math.round(n * 0.3)), my = y0 + Math.round(n * 0.66);
    F.rect(mx + 1, my + 1, mw - 2 || 1, 1, '#1e3a16'); F.px(mx, my, '#1e3a16'); F.px(mx + mw - 1, my, '#1e3a16');
    F.px(x0 + 1, y0 + 1, '#ffffff'); F.px(x0 + 2, y0 + 1, '#e8ffd8'); if (n > 10) F.px(x0 + 1, y0 + 2, '#e8ffd8');
}
// Bloque de ropa o piel en rgb, con luz a la izquierda y sombra a la derecha.
function bloque(F, x, y, w, h, c, s, f = 0.12) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        let k = aj(c, 1 - f / 2 + azar(x + i, y + j, s + 9) * f);
        if (i === 0 && w > 2) k = aj(k, 1.16); else if (i === w - 1 && w > 2) k = aj(k, 0.8);
        F.px(x + i, y + j, hx(k));
    }
}
// Mano de 5×5 vista de frente, con dos rayas de dedos.
function mano(F, x, y, P, s) {
    bloque(F, x, y, 5, 5, P, s, 0.06);
    for (let i = 0; i < 5; i++) { F.px(x + i, y, hx(aj(P, 1.14))); F.px(x + i, y + 4, hx(aj(P, 0.84))); }
    F.px(x + 1, y + 2, hx(aj(P, 0.82))); F.px(x + 3, y + 2, hx(aj(P, 0.82)));
}
// Elipse rellena; `color(x, y, dx, dy)` da el rgb y aquí se le suma la luz de arriba a la izquierda.
function ovalo(F, cx, cy, rx, ry, color) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x - cx) / rx, dy = (y - cy) / ry;
        if (dx * dx + dy * dy > 1) continue;
        const luz = dx + dy < -0.9 ? 1.2 : dx + dy > 0.9 ? 0.78 : 1;
        F.px(x, y, hx(aj(color(x, y, dx, dy), luz)));
    }
}
// Gatas: colores de gatas.js. Mila es carey (casi todo negro, poco naranjo y menos amarillo, en manchas de 2×2);
// Gala, gris con guantes blancos y su cuello naranjo.
const GATA = { negro: [30, 27, 30], naranjo: [186, 98, 38], amarillo: [196, 148, 52], gris: [124, 128, 134], blanco: [238, 238, 234], rosa: [212, 140, 150], ojo: [186, 200, 70], pupila: [14, 14, 14], cuello: [224, 138, 30], punto: [255, 190, 110] };
const peloMila = (s, naranja = 0.12) => (x, y) => {
    const b = azar(x >> 1, y >> 1, s + 50), r = azar(x, y, s + 51);
    if (b < naranja && r < 0.8) return aj(GATA.naranjo, 0.85 + r * 0.3);
    if (b > 1 - naranja * 0.3 && r < 0.7) return aj(GATA.amarillo, 0.85 + r * 0.25);
    return aj(GATA.negro, 0.9 + r * 0.6);
};
const peloGala = s => (x, y) => aj(GATA.gris, 0.9 + azar(x, y, s + 52) * 0.2);
// Cara de gata en filas: E oreja, i oreja por dentro, P pelo, O ojo, p pupila, c ojo cerrado, n nariz, m boca.
function caraGata(F, filas, ox, oy, pelo) {
    filas.forEach((fila, y) => { for (let x = 0; x < fila.length; x++) {
        const ch = fila[x], X = ox + x, Y = oy + y;
        const c = { E: () => pelo(X, Y), P: () => pelo(X, Y), i: () => GATA.rosa, O: () => GATA.ojo, p: () => GATA.pupila, c: () => [40, 40, 46], n: () => GATA.rosa, m: () => aj(GATA.rosa, 0.7) }[ch];
        if (c) F.px(X, Y, hx(x === 0 && ch === 'P' ? aj(c(), 1.15) : c()));
    } });
}
const CARA_GATA = ['EE......EE', 'EiE....EiE', 'PPPPPPPPPP', 'POOPPPPOOP', 'POpPPPPpOP', 'PPPPnnPPPP', 'PPPPmmPPPP', '.PPPPPPPP.'];
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
    // ---- Hechizos ----
    poder(F, fondo, s) {
        // aura roja de la poción
        for (let y = 0; y < 26; y++) for (let x = 0; x < 40; x++) { const dd = Math.hypot((x - 20) / 14, (y - 15) / 12); if (dd < 1) fondo.px(x, y, '#ff4a4a', 0.4 * (1 - dd)); }
        matriz(F, [
            '.....CCCC.....',
            '.....cCCc.....',
            '......GG......',
            '......GG......',
            '.....GGGG.....',
            '...GGRRRRGG...',
            '..GRRRRRRRRG..',
            '.GRWRRRRRRRRG.',
            '.GRWRRRRRRRrG.',
            'GRRRRRBRRRRrrG',
            'GRRRRRRRRRRrrG',
            'GRRRRBRRRRrrrG',
            'GRRRRRRRRRrrrG',
            '.GRRRRRRRrrrG.',
            '.GRRRRRRrrrrG.',
            '..GRRRrrrrrG..',
            '...GGGGGGGG...'
        ], { C: '#8b5e3a', c: '#6b4529', G: '#d8eef0', R: ['#e8303a', '#e02a34', '#f03a44'], r: '#a01822', W: '#ffffff', B: '#ffb0b0' }, 13, 5, s);
        for (const [x, y] of [[8, 6], [31, 8], [6, 18], [33, 19], [20, 1]]) { F.px(x, y, '#ffff55'); fondo.px(x - 1, y, '#ffaa00', 0.6); fondo.px(x + 1, y, '#ffaa00', 0.6); fondo.px(x, y - 1, '#ffaa00', 0.6); fondo.px(x, y + 1, '#ffaa00', 0.6); }
    },
    curar(F, fondo, s) {
        // dos sopaipillas calentitas en su plato, con vapor
        ovalo(F, 20, 22, 17, 3.5, (x, y, dx, dy) => (Math.abs(dy) > 0.6 ? [200, 200, 196] : [244, 244, 238]));
        for (const [cx, cy] of [[15, 16], [24, 13]]) ovalo(F, cx, cy, 9, 5, (x, y, dx, dy) => {
            const borde = dx * dx + dy * dy > 0.6;
            if (!borde && azar(x, y, s + 12) > 0.86) return [168, 92, 30]; // burbujitas de la fritura
            return borde ? [196, 112, 36] : aj([232, 162, 62], 0.92 + azar(x, y, s) * 0.16);
        });
        for (let k = 0; k < 3; k++) for (let j = 0; j < 5; j++) fondo.px(14 + k * 6 + (j & 1), 6 - j, '#ffffff', 0.5);
        for (const [x, y] of [[5, 6], [33, 4]]) matriz(fondo, CORAZON, { C: '#ff6a7a' }, x, y);
    },
    escudo(F, fondo, s) {
        for (let y = 0; y < 26; y++) for (let x = 0; x < 40; x++) { const dd = Math.hypot((x - 20) / 15, (y - 13) / 13); if (dd < 1) fondo.px(x, y, '#8b5cff', 0.35 * (1 - dd)); }
        // escudo de obsidiana con vetas moradas y borde de hierro
        for (let y = 0; y < 24; y++) {
            const w = y < 14 ? 11 : Math.round(11 * Math.cos((y - 14) / 10 * Math.PI / 2));
            for (let x = -w; x < w; x++) {
                const borde = x === -w || x === w - 1 || y === 0 || (y > 13 && (x === -w + 1 || x === w - 2) && w < 6);
                const r = azar((x + 20) >> 1, (y + 1) >> 1, s);
                F.px(20 + x, 1 + y, borde ? (x < 0 ? '#d8d8d8' : '#8a8a8a') : r > 0.9 ? '#7a4ad8' : r > 0.78 ? '#3a2468' : ((x >> 2) + (y >> 2)) & 1 ? '#160d24' : '#1e1232');
            }
        }
        for (const [x, y] of [[14, 5], [15, 6], [24, 9], [25, 10], [18, 16], [19, 17]]) F.px(x, y, '#c9a2ff');
        matriz(F, ['.W.', 'WWW', '.W.'], { W: '#ffffff' }, 12, 3);
    },
    revivir(F, fondo, s) {
        // el tótem de la fogata: madera tallada con caras, alas y fuego arriba
        for (let y = 0; y < 26; y++) for (let x = 0; x < 40; x++) { const dd = Math.hypot((x - 20) / 12, (y - 6) / 10); if (dd < 1) fondo.px(x, y, '#ffb84a', 0.35 * (1 - dd)); }
        bloque(F, 14, 9, 12, 17, [150, 96, 52], s, 0.16);
        for (const y of [9, 16]) F.rect(14, y, 12, 1, '#6b4529');
        for (const [y, ojo] of [[11, '#ffd24a'], [18, '#7affc0']]) {
            F.rect(16, y, 3, 2, '#2a1a10'); F.rect(21, y, 3, 2, '#2a1a10'); F.px(17, y, ojo); F.px(22, y, ojo);
            F.rect(18, y + 3, 4, 1, '#2a1a10'); F.px(17, y + 2, '#2a1a10'); F.px(22, y + 2, '#2a1a10');
        }
        for (const lado of [-1, 1]) matriz(F, lado < 0 ? ['WWWW', '.WWW', '..WW', '...W'] : ['WWWW', 'WWW.', 'WW..', 'W...'], { W: ['#c9873c', '#b8782f'] }, lado < 0 ? 10 : 26, 16, s);
        matriz(F, LLAMA, FUEGO, 16, 0);
        for (const [x, y] of [[8, 4], [31, 3], [6, 12], [33, 11], [11, 21], [29, 22]]) { fondo.px(x, y, '#7affc0'); fondo.px(x, y - 1, '#7affc0', 0.4); }
    },
    abrazo(F, fondo, s) {
        // Lalo y Moisés, abrazados (los del iglú)
        const L = ROSTROS.lalo, M = ROSTROS.moises, BLANCA = [236, 236, 232], OLIVA = [92, 104, 62];
        bloque(F, 3, 18, 16, 8, BLANCA, s); bloque(F, 21, 18, 16, 8, OLIVA, s);
        rostro(F, 'lalo', 3, 2, s);
        rostro(F, 'moises', 21, 2, s);
        for (const x of [21, 22, 35, 36]) for (let y = 17; y < 22; y++) F.px(x, y, hx(aj(M.pelo, 0.85 + azar(x, y, s) * 0.3)));
        // brazos que cruzan por la espalda del otro
        bloque(F, 15, 20, 10, 3, BLANCA, s); F.rect(24, 20, 2, 3, hx(L.piel));
        bloque(F, 13, 23, 10, 2, OLIVA, s); F.rect(12, 23, 2, 2, hx(M.piel));
        F.rect(8, 13, 4, 1, '#f4f0ea'); F.rect(26, 13, 4, 1, '#f4f0ea');
        // sombrero de paja de Lalo: copa baja con cinta roja y ala ancha
        F.rect(6, 0, 10, 2, '#e2bc60'); F.rect(6, 0, 10, 1, '#f0d088'); F.rect(6, 2, 10, 1, '#c8302a');
        F.rect(1, 3, 20, 2, '#d4ac50'); F.rect(1, 3, 20, 1, '#ecc870');
        matriz(F, CORAZON, { C: '#ff5a7a' }, 18, 0);
        for (const [x, y] of [[1, 8], [37, 5]]) matriz(fondo, ['C.C', 'CCC', '.C.'], { C: '#ff8aa0' }, x, y);
    },
    once(F, fondo, s) {
        // ventana con lluvia: once en casa mientras afuera llueve
        for (let y = 0; y < 18; y++) for (let x = 0; x < 40; x++) if (x === 13 || x === 26 || y === 9) fondo.px(x, y, '#4a2e2a', 0.7);
        // mesa de madera con mantel
        for (let y = 18; y < 26; y++) for (let x = 0; x < 40; x++) F.px(x, y, y === 18 ? '#f4f0e6' : y < 21 ? ((x >> 2) + (y >> 1)) & 1 ? '#e8e0d0' : '#c84a4a' : elegir(['#8b5e3a', '#7f5534'], x, y, s));
        // tetera de fierro enlozado
        matriz(F, [
            '....KK.....',
            '...TTTT....',
            '.TTTTTTTT..',
            'TTWTTTTTTTT',
            'TTWTTTTTTT.T',
            '.TTTTTTTT...',
            '..TTTTTT....'
        ], { K: '#2a2a2a', T: ['#2a8a9a', '#2f94a4'], W: '#ffffff' }, 2, 11, s);
        for (let k = 0; k < 4; k++) fondo.px(13 + (k & 1), 9 - k * 2, '#ffffff', 0.55);
        // pan amasado con mantequilla
        ovalo(F, 21, 15, 6, 3.5, (x, y, dx, dy) => (dy < -0.3 ? [214, 160, 92] : [236, 200, 140]));
        for (const x of [18, 21, 24]) F.px(x, 13, '#a8702e');
        F.rect(20, 11, 3, 2, '#fff07a');
        // taza de té
        matriz(F, ['TTTTT.', 'TttTTa', 'TTTTT.a', 'TTTTTa', '.TTT..', 'PPPPPPP'], { T: '#f4f4ee', t: '#b86a2a', a: '#e0e0d8', P: '#d8d8d0' }, 30, 12);
        for (let k = 0; k < 3; k++) fondo.px(32 + (k & 1), 10 - k * 2, '#ffffff', 0.55);
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
    },
    esqueleto(F, fondo, s) {
        const HUESO = [204, 204, 194], hueso = hx(HUESO), sombra = hx(aj(HUESO, 0.7));
        // costillas sobre la noche
        F.rect(19, 17, 2, 9, hueso);
        for (const y of [18, 20, 22]) { F.rect(15, y, 10, 1, hueso); F.px(15, y + 1, sombra); F.px(24, y + 1, sombra); }
        F.rect(16, 24, 8, 2, hueso);
        // brazos de hueso: uno sostiene el arco, el otro tensa la cuerda
        linea(F, 14, 18, 7, 14, hueso, 0); linea(F, 15, 19, 8, 15, sombra, 0);
        linea(F, 25, 18, 10, 15, hueso, 0);
        for (let y = 2; y < 26; y++) { const x = 6 - Math.round(4 * Math.sin(Math.PI * (y - 2) / 23)); F.px(x, y, '#8b5e3a'); F.px(x - 1, y, '#6b4529'); }
        linea(fondo, 6, 2, 10, 14, '#e8e8e0', 0, 0.8); linea(fondo, 10, 14, 6, 25, '#e8e8e0', 0, 0.8);
        cara(F, { frente(d, x, y, mot) {
            if (y >= 6 && y <= 8 && ((x >= 2 && x <= 5) || (x >= 10 && x <= 13))) return y === 7 && (x === 4 || x === 11) ? [70, 70, 70] : [18, 18, 18];
            if (y >= 9 && y <= 10 && x >= 7 && x <= 8) return [40, 40, 40];
            if (y === 12 && x >= 3 && x <= 12) return [26, 26, 26];
            if (y === 13 && x >= 3 && x <= 12) return x & 1 ? [26, 26, 26] : aj(HUESO, 0.92);
            return mot(HUESO, 0.16);
        } }, 12, 1, s);
        // la flecha lista, de cabeza de pedernal
        linea(F, 1, 15, 12, 15, '#a07850'); matriz(F, ['.K', 'KK', '.K'], { K: '#5a5a62' }, 0, 14);
        matriz(F, ['W.', '.W', 'W.'], { W: '#f4f4ee' }, 11, 14);
    },
    creeper(F, fondo, s) {
        // Diseño propio (provisional): un bloque de musgo con mecha, muy nervioso, a punto de reventar
        for (let y = 0; y < 26; y++) for (let x = 0; x < 40; x++) { const dd = ((x - 20) / 20) ** 2 + ((y - 12) / 14) ** 2; if (dd < 1) fondo.px(x, y, '#ffffff', 0.3 * (1 - dd)); }
        const musgo = (x, y) => { const r = azar(x, y, s + 11); return r < 0.2 ? [140, 214, 96] : r < 0.6 ? [96, 178, 66] : r < 0.9 ? [74, 150, 52] : [56, 118, 40]; };
        for (const lx of [12, 17, 22, 26]) bloque(F, lx, 22, 3, 4, [64, 126, 46], s);
        cara(F, { frente(d, x, y) {
            const ojo = (ox) => x >= ox && x <= ox + 3 && y >= 5 && y <= 8 && !((x === ox || x === ox + 3) && (y === 5 || y === 8));
            if (ojo(3) || ojo(11)) return (x === 3 || x === 4 || x === 11 || x === 12) && (y === 6 || y === 7) ? [20, 24, 20] : [244, 244, 236];
            if ((y === 4 && (x === 3 || x === 4 || x === 13 || x === 14)) || (y === 3 && (x === 5 || x === 6 || x === 11 || x === 12))) return [34, 60, 26];
            if (x >= 5 && x <= 12 && y === 12 + ((x + 1) & 1)) return [30, 30, 26];
            if (x >= 5 && x <= 12 && y === 13 - ((x + 1) & 1) && (x & 1)) return [236, 236, 220];
            if ((x === 2 && y === 15) || (x === 3 && y === 14) || (x === 4 && y === 13) || (x === 15 && y >= 9 && y <= 12)) return [255, 150, 40];
            return musgo(x, y);
        } }, 11, 5, s, 18, 17);
        for (let x = 12; x < 29; x += 3) F.px(x, 4, hx([140, 214, 96]));
        // la mecha, encendida
        for (const [x, y] of [[20, 3], [20, 2], [21, 1], [22, 1], [23, 0]]) F.px(x, y, '#4a4a46');
        F.px(24, 0, '#ffff55'); F.px(25, 0, '#ffaa00');
        for (const [x, y] of [[26, 1], [25, 2], [27, 0]]) fondo.px(x, y, '#ffd24a', 0.8);
        // gotas de sudor y chispas
        matriz(F, ['.W', 'WW', 'WW'], { W: '#9fd8ff' }, 8, 6); matriz(F, ['.W', 'WW'], { W: '#9fd8ff' }, 31, 9);
        for (const [x, y] of [[5, 14], [34, 16], [6, 21], [34, 22], [4, 9]]) { fondo.px(x, y, '#ffff55'); fondo.px(x + 1, y, '#ffaa00', 0.7); }
    },
    arana(F, fondo, s) {
        // telaraña en la esquina de la cueva
        for (const [x1, y1] of [[14, 0], [12, 7], [6, 12], [0, 14]]) linea(fondo, 0, 0, x1, y1, '#d8d8e8', 0, 0.45);
        for (const r of [4, 8, 12]) for (let a = 0; a <= 16; a++) { const t = (a / 16) * Math.PI / 2; fondo.px(Math.round(r * Math.cos(t)), Math.round(r * Math.sin(t)), '#d8d8e8', 0.4); }
        const PATA = '#18303a', pata2 = '#244a56';
        // ocho patas dobladas
        for (const lado of [-1, 1]) for (let i = 0; i < 4; i++) {
            const x0 = 20 + lado * 5, y0 = 12 + i * 3, xr = 20 + lado * (11 + i), yr = 4 + i * 4, xp = 20 + lado * (16 + (i & 1)), yp = 14 + i * 3;
            linea(F, x0, y0, xr, yr, i & 1 ? pata2 : PATA, 0); linea(F, xr, yr, xp, Math.min(25, yp), i & 1 ? pata2 : PATA, 0);
        }
        // abdomen con su dibujo y cabeza al frente
        ovalo(F, 20, 8, 8, 6, (x, y) => (Math.abs(x - 20) < 2 && y % 3 === 0 ? [90, 40, 40] : ruido([38, 70, 80], 0.2, s)(x, y)));
        ovalo(F, 20, 17, 6, 5, ruido([30, 56, 64], 0.2, s + 1));
        for (const [x, y, c] of [[17, 15, '#ff3030'], [22, 15, '#ff3030'], [18, 15, '#ff3030'], [23, 15, '#ff3030'], [16, 17, '#c01818'], [24, 17, '#c01818'], [19, 18, '#c01818'], [21, 18, '#c01818']]) F.px(x, y, c);
        F.px(17, 14, '#ffb0b0'); F.px(22, 14, '#ffb0b0');
        matriz(F, ['W.W', 'W.W'], { W: '#e8e0c8' }, 19, 21); // colmillos
    },
    enderman(F, fondo, s) {
        // Diseño propio: espectro alto y flaco, con grietas moradas, que se deshace en chispas al teletransportarse
        for (let y = 0; y < 26; y++) for (let x = 0; x < 40; x++) { const dd = ((x - 20) / 13) ** 2 + ((y - 12) / 15) ** 2; if (dd < 1) fondo.px(x, y, '#9a4ad8', 0.4 * (1 - dd)); }
        const sombra = ruido([30, 22, 40], 0.4, s + 2);
        // eco translúcido de donde estaba recién
        for (let y = 2; y < 22; y++) for (let x = 5; x < 11; x++) fondo.px(x, y, '#b070f0', y < 12 ? 0.22 : 0.14);
        // cuerpo que se deshace abajo
        for (let y = 13; y < 26; y++) for (let x = 16; x < 24; x++) if (y < 21 || azar(x, y, s + 5) > (y - 20) / 6) F.px(x, y, hx(sombra(x, y)));
        for (let i = 0; i < 10; i++) fondo.px(14 + Math.floor(azar(i, 93, s) * 12), 21 + Math.floor(azar(i, 94, s) * 5), i & 1 ? '#cc00fa' : '#e079fa', 0.8);
        // brazos largos con garras; una sostiene una perla que brilla
        for (const bx of [13, 25]) for (let y = 13; y < 23; y++) F.px(bx, y, hx(sombra(bx, y))), F.px(bx + 1, y, hx(aj(sombra(bx, y), 0.8)));
        matriz(F, ['W.W', '.W.'], { W: '#2a1e36' }, 12, 23);
        for (let y = 0; y < 26; y++) for (let x = 0; x < 40; x++) { const dd = Math.hypot(x - 29, y - 21); if (dd < 6) fondo.px(x, y, '#e079fa', 0.35 * (1 - dd / 6)); }
        matriz(F, ['.PP.', 'PpPP', 'PPPP', '.PP.'], { P: '#7a30c8', p: '#f0c8ff' }, 27, 19);
        for (let y = 19; y < 21; y++) F.px(26, y, hx(sombra(26, y)));
        // cabeza alargada con grietas y ojos rasgados
        cara(F, { frente(d, x, y) {
            if ((y === 5 && (x === 1 || x === 8)) || (y === 6 && (x >= 1 && x <= 3 || x >= 6 && x <= 8))) return y === 6 && (x === 2 || x === 7) ? [255, 230, 255] : [224, 121, 250];
            if ((x === 4 && y >= 0 && y <= 2) || (x === 5 && y === 3) || (x === 2 && y === 9) || (x === 3 && y === 10) || (x === 7 && y === 10)) return [140, 60, 200];
            return sombra(x, y);
        } }, 15, 1, s, 10, 12);
        for (const ox of [16, 23]) fondo.px(ox, 7, '#e079fa', 0.5);
    },
    bruja(F, fondo, s) {
        // niebla verde del pantano y burbujas
        for (let y = 16; y < 26; y++) for (let x = 0; x < 40; x++) if (azar(x >> 2, y, s + 3) > 0.35) fondo.px(x, y, '#5a8a3a', 0.25 + (y - 16) / 30);
        for (const [x, y] of [[4, 18], [7, 13], [35, 16], [32, 10]]) { fondo.px(x, y, '#b0e090', 0.8); fondo.px(x + 1, y - 1, '#b0e090', 0.5); }
        const PIEL = [168, 182, 120], M = [86, 40, 110];
        bloque(F, 11, 18, 18, 8, M, s); bloque(F, 7, 19, 4, 7, M, s); bloque(F, 29, 19, 4, 7, M, s);
        F.rect(19, 18, 2, 8, hx(aj(M, 0.7)));
        // poción rosada en la mano
        matriz(F, ['.c.', '.g.', 'gPg', 'PpP', 'PPP'], { c: '#8b5e3a', g: '#d8eef0', P: '#ff6ad0', p: '#ffb0ea' }, 31, 16);
        cara(F, { frente(d, x, y, mot) {
            if (y === 3 && ((x >= 3 && x <= 5) || (x >= 10 && x <= 12))) return [40, 50, 30];
            if (y === 4 && (x === 4 || x === 11)) return [140, 30, 160];
            if (y === 4 && (x === 3 || x === 12)) return [230, 230, 210];
            if (x >= 7 && x <= 8 && y >= 4 && y <= 9) return aj(PIEL, x === 7 ? 0.82 : 0.92); // narigona
            if (x === 9 && y === 7) return [70, 120, 40]; // verruga
            if (y === 10 && x >= 5 && x <= 10) return [70, 40, 50];
            return mot(PIEL, 0.1);
        } }, 12, 7, s, 16, 11);
        // sombrero: ala ancha, copa doblada y hebilla verde
        F.rect(9, 6, 22, 2, '#2a1636'); F.rect(9, 6, 22, 1, '#4a2a5a');
        for (let y = 0; y < 6; y++) { const w = 10 - y, x0 = 15 + (y < 2 ? 2 : 0); F.rect(x0, 5 - y, w, 1, y === 1 ? '#4a9a3a' : elegir(['#3a1f4a', '#422452'], x0, y, s)); }
        F.rect(26, 0, 3, 1, '#3a1f4a');
    },
    slime(F, fondo, s) {
        // sombra en el suelo: va en pleno salto
        for (let x = 10; x < 31; x++) { fondo.px(x, 24, '#000000', 0.35); if (x > 12 && x < 28) fondo.px(x, 25, '#000000', 0.3); }
        for (const x of [8, 32]) for (let k = 0; k < 3; k++) fondo.px(x, 18 + k * 2, '#ffffff', 0.4);
        cuboSlime(F, 9, 1, 22, s);
    },
    slimecito(F, fondo, s) {
        for (const [x, y, n] of [[3, 15, 9], [16, 6, 8], [29, 13, 8]]) {
            for (let i = 1; i < n - 1; i++) fondo.px(x + i, 24, '#000000', 0.3);
            cuboSlime(F, x, y, n, s + x);
        }
        for (const [x, y] of [[14, 3], [27, 9]]) { fondo.px(x, y, '#c8f0a8', 0.7); fondo.px(x - 1, y + 1, '#c8f0a8', 0.5); }
    },
    // ---- Mitos ----
    trauco(F, fondo, s) {
        // bosque de coigües en la niebla
        for (const [x0, h, c] of [[2, 20, '#1e3a34'], [9, 14, '#24443c'], [30, 22, '#1e3a34'], [36, 16, '#24443c']]) for (let y = 26 - h; y < 26; y++) { const w = Math.round((y - 26 + h) / 3); fondo.rect(x0 - w, y, w * 2 + 1, 1, c); }
        const PIEL = [176, 128, 92], PAJA = [190, 158, 82];
        // ropa de quilineja: paja trenzada
        for (let y = 17; y < 26; y++) for (let x = 11; x < 29; x++) F.px(x, y, hx(aj(PAJA, (x + (y >> 1)) % 3 === 0 ? 0.72 : 0.92 + azar(x, y, s) * 0.16)));
        bloque(F, 8, 18, 3, 6, PAJA, s); bloque(F, 8, 23, 3, 3, PIEL, s);
        // el pahueldún, su bastón de madera nudosa
        linea(F, 32, 4, 31, 25, '#5a3c22', 0); linea(F, 33, 4, 32, 25, '#7a5432', 0);
        matriz(F, ['.KK.', 'KKKK', 'KkKK', '.KK.'], { K: '#6b4529', k: '#9a7048' }, 31, 1);
        mano(F, 28, 13, PIEL, s);
        cara(F, { frente(d, x, y, mot) {
            if (y <= 1) return mot(PAJA, 0.2);
            if (y === 3 && ((x >= 2 && x <= 5) || (x >= 10 && x <= 13))) return [50, 34, 22]; // cejas gruesas
            if (y === 4 && (x === 4 || x === 11)) return [20, 14, 10];
            if (y === 4 && (x === 3 || x === 12)) return [226, 210, 180];
            if (x >= 6 && x <= 9 && y >= 4 && y <= 8) return aj(PIEL, x <= 7 ? 0.84 : 0.94); // nariz de papa
            if (y >= 8 && !(y === 9 && x >= 6 && x <= 9)) return mot([84, 58, 36], 0.3); // barba enmarañada
            if (y === 9 && x >= 6 && x <= 9) return [60, 30, 26];
            return mot(PIEL, 0.12);
        } }, 12, 6, s, 16, 12);
        // sombrero cónico de paja
        F.rect(7, 6, 26, 2, hx(aj(PAJA, 0.85))); F.rect(7, 6, 26, 1, hx(aj(PAJA, 1.1)));
        for (let y = 0; y < 6; y++) { const w = 3 + y * 2; for (let x = 0; x < w; x++) F.px(20 - (w >> 1) + x, y, hx(aj(PAJA, x === 0 ? 1.12 : (x + y) % 3 === 0 ? 0.78 : 0.95))); }
    },
    imbunche(F, fondo, s) {
        // boca de la cueva que cuida
        for (let y = 0; y < 26; y++) for (let x = 0; x < 40; x++) {
            const dd = ((x - 20) / 15) ** 2 + ((y - 26) / 24) ** 2;
            if (dd < 1) fondo.px(x, y, dd > 0.72 ? elegir(['#5a5a62', '#4a4a52', '#66666e'], x >> 1, y >> 1, s) : '#0e0c10');
        }
        const PELO = [70, 52, 40];
        // cuerpo cubierto de pelo enmarañado
        ovalo(F, 20, 17, 11, 9, (x, y) => aj(PELO, 0.65 + ((x * 7 + (y >> 1)) % 5) * 0.12 + azar(x, y, s) * 0.15));
        ovalo(F, 20, 8, 7, 6, (x, y) => aj(PELO, 0.7 + ((x * 5 + y) % 4) * 0.12));
        // una pierna torcida hacia arriba, sobre el hombro
        linea(F, 28, 14, 33, 6, hx([150, 112, 86]), 1); bloque(F, 32, 3, 4, 3, [120, 90, 70], s);
        // brazos largos y el garrote
        linea(F, 11, 15, 5, 22, hx(aj(PELO, 0.8)), 1); linea(F, 3, 25, 8, 11, '#5a3c22', 1);
        // ojos que brillan entre el pelo
        for (const x of [17, 22]) { F.rect(x, 8, 2, 1, '#ffd24a'); F.px(x, 9, '#c08a10'); fondo.px(x, 8, '#ffd24a', 0.3); }
        F.rect(18, 11, 4, 1, '#1a1010');
    },
    chonchon(F, fondo, s) {
        // luna llena entre la niebla y el rastro de su vuelo
        matriz(fondo, ['.MMMM.', 'MMMMmM', 'MMMmmM', 'MMMMMM', '.MMMM.'].map(f => f), { M: '#e8eccb', m: '#c8ccaa' }, 31, 2);
        for (let k = 0; k < 8; k++) fondo.px(4 + k * 2, 22 - k, '#c8dde0', 0.5);
        const PIEL = [196, 186, 150];
        // orejas que son alas
        for (const lado of [-1, 1]) for (let i = 0; i < 12; i++) for (let j = 0; j < 8 - (i >> 1); j++) {
            const x = 20 + lado * (7 + i), y = 8 + j + (i >> 1) - Math.round(i * 0.6);
            F.px(x, y, j === 0 ? hx(aj(PIEL, 1.05)) : (i + j) % 3 === 0 ? hx(aj(PIEL, 0.62)) : hx(aj(PIEL, 0.82)));
        }
        cara(F, { frente(d, x, y, mot) {
            if (y <= 1) return mot([40, 34, 30], 0.3);
            if (y === 4 && ((x >= 2 && x <= 3) || (x >= 8 && x <= 9))) return [255, 60, 40];
            if (y === 3 && ((x >= 1 && x <= 4) || (x >= 7 && x <= 10))) return [60, 50, 40];
            if (x >= 5 && x <= 6 && y >= 4 && y <= 8) return aj(PIEL, x === 5 ? 0.8 : 0.9);
            if (y === 9 && x >= 3 && x <= 8) return [50, 20, 24];
            if (y === 10 && (x === 4 || x === 7)) return [236, 230, 210];
            return mot(PIEL, 0.12);
        } }, 14, 6, s, 12, 12);
        // tue tue
        matriz(fondo, ['T.T', '.T.', '.T.'], { T: '#ffffff' }, 3, 3);
        matriz(fondo, ['T.T', '.T.', '.T.'], { T: '#ffffff' }, 7, 5);
    },
    caleuche(F, fondo, s) {
        // mar oscuro y niebla baja
        for (let y = 20; y < 26; y++) for (let x = 0; x < 40; x++) fondo.px(x, y, (x + y * 2) % 7 === 0 ? '#6a9aa8' : elegir(['#1e3a48', '#24444f', '#1a3440'], x, y, s));
        // velas fantasmas y mástiles
        for (let y = 0; y < 26; y++) for (let x = 0; x < 40; x++) { const dd = ((x - 20) / 19) ** 2 + ((y - 11) / 12) ** 2; if (dd < 1) fondo.px(x, y, '#7affc0', 0.25 * (1 - dd)); }
        for (const [mx, top, w] of [[9, 3, 3], [20, 1, 4], [30, 4, 3]]) {
            linea(F, mx, top, mx, 17, '#3a2a20', 0);
            for (const [y0, y1] of [[top + 1, top + 6], [top + 8, 14]]) for (let y = y0; y < y1; y++) { const ww = w + (y - y0 > 1 ? 1 : 0); for (let x = -ww; x <= ww; x++) if (x !== 0) F.px(mx + x, y, x === -ww ? '#f4fffa' : '#c8e8dc', 0.7); }
        }
        // casco con portillas encendidas
        for (let y = 15; y < 21; y++) { const a = 4 + (y - 15), b = 36 - (y - 15) * 0.6; for (let x = Math.round(a); x < b; x++) F.px(x, y, y === 15 ? '#6a4a30' : elegir(['#3a2618', '#422c1c'], x, y, s)); }
        for (let x = 9; x < 32; x += 4) { F.px(x, 17, '#ffd24a'); fondo.px(x, 17, '#ffd24a', 0.5); }
        F.rect(34, 12, 2, 3, '#6a4a30');
        for (const [x, y] of [[10, 2], [20, 0], [29, 3]]) { F.px(x, y, '#9affc8'); fondo.px(x - 1, y, '#9affc8', 0.5); fondo.px(x + 1, y, '#9affc8', 0.5); }
        for (let x = 0; x < 40; x++) if (azar(x >> 2, 3, s) > 0.4) fondo.px(x, 19 + (azar(x >> 3, 5, s) > 0.5 ? 1 : 0), '#c8dde0', 0.5);
    },
    pincoya(F, fondo, s) {
        // la orilla: mar con espuma
        for (let y = 17; y < 26; y++) for (let x = 0; x < 40; x++) fondo.px(x, y, y === 17 || (x + y * 3) % 9 === 0 ? '#d8f0f0' : elegir(['#2a7a8a', '#2f8494', '#26707e'], x, y, s));
        const d = { piel: [236, 200, 170], pelo: [232, 190, 80], estilo: 'largo', ojos: [40, 150, 150] };
        // vestido de cochayuyo y brazos abiertos al bailar
        for (let y = 17; y < 26; y++) for (let x = 12; x < 28; x++) F.px(x, y, (x + y) % 4 === 0 ? '#6a5a2a' : elegir(['#3e6a3a', '#46743e', '#38603a'], x, y, s));
        linea(F, 11, 18, 4, 12, hx(d.piel), 1); linea(F, 28, 18, 35, 12, hx(d.piel), 1);
        // pelo dorado largo que cae hasta la cintura
        for (const x of [10, 11, 12, 13, 26, 27, 28, 29]) for (let y = 10; y < (x === 10 || x === 29 ? 22 : 25); y++) F.px(x, y, hx(aj(d.pelo, 0.85 + azar(x, y, s) * 0.3)));
        cara(F, d, 12, 1, s);
        F.rect(18, 12, 4, 1, '#c86070');
        // conchas y estrellas de mar en el pelo
        matriz(F, ['.S.', 'SSS', 'S.S'], { S: '#ff8a7a' }, 13, 0);
        for (const [x, y] of [[3, 10], [36, 10]]) F.px(x, y, '#ffffff');
    },
    cuero(F, fondo, s) {
        // lago: aguas quietas y ondas
        for (let y = 12; y < 26; y++) for (let x = 0; x < 40; x++) fondo.px(x, y, elegir(['#24505c', '#2a5a66', '#204854'], x, y, s));
        for (const r of [13, 17]) for (let x = -r; x <= r; x++) fondo.px(20 + x, 18 + Math.round(Math.sqrt(Math.max(0, r * r - x * x)) * 0.35), '#8ac0c8', 0.6);
        // el cuero estirado sobre el agua, con garfios en el borde
        ovalo(F, 20, 15, 16, 6, (x, y, dx, dy) => (Math.abs(dx) > 0.9 || Math.abs(dy) > 0.85 ? [96, 66, 44] : aj([132, 96, 64], 0.8 + azar(x >> 1, y, s) * 0.3)));
        for (let x = 6; x < 35; x += 4) F.px(x, 9 + (Math.abs(x - 20) > 10 ? 1 : 0), '#e8e0c8');
        for (const x of [4, 36]) F.px(x, 13, '#e8e0c8');
        for (let x = 8; x < 33; x += 3) F.px(x, 15 + (x & 1), '#6a4a30'); // nervaduras
        // ojos rojos en la parte de adelante
        for (const x of [16, 23]) { F.rect(x, 11, 2, 2, '#ff3030'); F.px(x, 11, '#ffb0b0'); fondo.px(x, 10, '#ff3030', 0.3); }
        // salpicaduras
        for (const [x, y] of [[2, 10], [37, 9], [5, 7]]) { F.px(x, y, '#c8e8f0'); }
    },
    calchona(F, fondo, s) {
        matriz(fondo, ['.MMMM.', 'MMMMmM', 'MMMmmM', 'MMMMMM', '.MMMM.'], { M: '#e8eccb', m: '#c8ccaa' }, 30, 2);
        // roca donde aúlla
        for (let y = 20; y < 26; y++) for (let x = 4 + (25 - y); x < 38 - (25 - y) * 0.5; x++) F.px(x, y, y === 20 ? '#7a7a82' : elegir(['#55555e', '#4a4a52', '#5f5f68'], x, y, s));
        // oveja negra lanuda con la cabeza en alto
        const lana = (x, y) => aj([48, 46, 56], (((x >> 1) + (y >> 1)) % 2 === 0 ? 1.5 : 1) * (0.8 + azar(x, y, s) * 0.4));
        for (const x of [9, 13, 20, 24]) F.rect(x, 18, 2, 3, '#1a1a1e');
        ovalo(F, 17, 14, 10, 5, lana);
        ovalo(F, 27, 8, 4, 4, lana);
        bloque(F, 28, 3, 5, 5, [30, 28, 34], s); // hocico al cielo
        F.rect(29, 3, 3, 1, '#c84040'); F.px(29, 6, '#ffd24a');
        matriz(F, ['.HH.', 'H..H', 'H...', '.H..'], { H: '#a8a294' }, 22, 4); // cuerno enroscado
        // ondas del aullido
        for (const r of [3, 6]) for (let a = -3; a <= 3; a++) fondo.px(31 + Math.round(r * Math.sin(a * 0.4)), 1 - Math.round(r * Math.cos(a * 0.4)) + 1 + r, '#ffffff', 0.45);
    },
    basilisco(F, fondo, s) {
        // mirada que petrifica
        for (let k = 0; k < 22; k++) for (let j = -1 - (k >> 3); j <= 1 + (k >> 3); j++) fondo.px(23 - k, 9 + Math.round(k * 0.45) + j, '#d8d8c8', 0.18);
        // cuerpo de culebra enroscado
        const camino = [[4, 22], [12, 24], [22, 23], [30, 20], [33, 15], [31, 11]];
        for (let k = 0; k < camino.length - 1; k++) linea(F, ...camino[k], ...camino[k + 1], '#3e6a2a', 2);
        for (let k = 0; k < camino.length - 1; k++) linea(F, ...camino[k], ...camino[k + 1], '#5a8a3a', 1);
        for (let x = 6; x < 30; x += 3) F.px(x, 23 - (x > 22 ? Math.round((x - 22) * 0.4) : 0), '#c8b84a');
        linea(F, 4, 22, 1, 19, '#3e6a2a', 0);
        // cabeza de gallo: cresta, pico y barbilla
        cara(F, { frente(d, x, y, mot) {
            if (y <= 2) return x % 3 === 1 ? null : [214, 40, 40];
            if (y === 5 && (x === 2 || x === 7)) return [255, 230, 60];
            if (y === 5 && (x === 3 || x === 8)) return [20, 20, 20];
            return mot([96, 140, 60], 0.16);
        } }, 25, 4, s, 11, 9);
        matriz(F, ['YYY.', 'YYYY', 'yyy.'], { Y: '#f0b030', y: '#c88a20' }, 21, 8);
        F.rect(23, 11, 2, 3, '#d82828');
    },
    // ---- Amigos ----
    pony(F, fondo, s) {
        const P = ROSTROS.pony.piel, CH = [118, 122, 128];
        // lago al fondo, con brillos del atardecer
        for (let y = 20; y < 26; y++) for (let x = 0; x < 40; x++) fondo.px(x, y, y === 20 ? '#8fc0e8' : (azar(x >> 2, y, s) > 0.8 ? '#6a9fd0' : elegir(['#3f6fa8', '#3a68a0', '#4577b0'], x, y, s)));
        // terno gris con camisa blanca y corbata
        bloque(F, 12, 17, 16, 9, CH, s);
        for (let y = 17; y < 21; y++) { const m = 4 - (y - 17); for (let x = 20 - m; x < 20 + m; x++) F.px(x, y, '#ecece8'); F.px(19 - m, y, hx(aj(CH, 0.78))); F.px(20 + m, y, hx(aj(CH, 0.78))); }
        F.rect(19, 18, 2, 8, '#2f3a5c'); F.rect(19, 18, 2, 1, '#4a5a8a');
        F.px(23, 21, '#3c3e44'); F.px(23, 24, '#3c3e44');
        bloque(F, 7, 18, 5, 8, CH, s);
        // brazo con la caña y un pescado colgando, grande para lo chico que es Pony
        bloque(F, 28, 19, 5, 7, CH, s);
        linea(F, 32, 25, 35, 1, '#7a5432');
        mano(F, 29, 14, P, s);
        for (let y = 1; y < 6; y++) fondo.px(36, y, '#f0f0f0', 0.8);
        matriz(F, [
            '.ff..',
            'fFFf.',
            'FeFFf',
            'FFFFf',
            'BFFFf',
            'BBFFf',
            'BBFFf',
            'BFFFf',
            '.FFf.',
            '..F..',
            '.TtT.',
            'TT.TT'
        ], { f: '#5d7f98', F: ['#8fb4cc', '#86abc4', '#9abed6'], B: '#d8e6ee', e: '#101418', T: '#6d93ad', t: '#4f7088' }, 34, 6, s);
        rostro(F, 'pony', 12, 1, s);
    },
    venjy(F, fondo, s) {
        const P = ROSTROS.venjy.piel, V = [54, 126, 70];
        // banderines de fiesta: el anfitrión recibe en su casa
        const cuerda = x => 2 + Math.round(2 * Math.sin(Math.PI * x / 39));
        for (let x = 0; x < 40; x++) fondo.px(x, cuerda(x), '#4a2e2a');
        ['#ff5555', '#ffd24a', '#55c1ff', '#7ad65e', '#ff8ad8', '#ffd24a', '#55c1ff', '#ff5555'].forEach((c, i) => {
            const x = 1 + i * 5, y = cuerda(x + 1) + 1;
            matriz(fondo, ['CCC', '.C.'], { C: c }, x, y);
        });
        // polerón verde con cordones y bolsillo canguro
        bloque(F, 12, 17, 16, 9, V, s);
        F.rect(17, 18, 1, 3, '#e8e8dc'); F.rect(22, 18, 1, 3, '#e8e8dc');
        for (let x = 15; x < 25; x++) F.px(x, 22, hx(aj(V, 0.72)));
        F.px(15, 23, hx(aj(V, 0.72))); F.px(24, 23, hx(aj(V, 0.72)));
        // brazo que saluda
        bloque(F, 6, 13, 5, 13, V, s);
        mano(F, 6, 8, P, s);
        F.px(6, 7, hx(P)); F.px(8, 7, hx(P)); F.px(10, 7, hx(aj(P, 0.9))); F.px(5, 10, hx(P));
        // invitación con sello rojo
        bloque(F, 28, 18, 5, 8, V, s);
        matriz(F, [
            'PPPPPPPP',
            'pPPPPPPp',
            'PpPPPPpP',
            'PPpRRpPP',
            'PPPRRPPP',
            'PPPPPPPP',
            'PPPPPPPP'
        ], { P: ['#f4ead0', '#efe4c6'], p: '#c9b48a', R: '#d23a3a' }, 31, 19, s);
        mano(F, 28, 22, P, s);
        rostro(F, 'venjy', 12, 1, s);
    },
    lona(F, fondo, s) {
        const P = ROSTROS.lona.piel, N = [26, 26, 30], H = ROSTROS.lona.pelo;
        // polera negra de manga corta
        for (const bx of [7, 28]) { bloque(F, bx, 18, 5, 4, N, s); bloque(F, bx, 22, 5, 4, P, s, 0.06); }
        bloque(F, 12, 17, 16, 9, N, s);
        // pelo largo que cae sobre los hombros
        for (const x of [11, 12, 13, 26, 27, 28]) for (let y = 15; y < (x === 11 || x === 28 ? 20 : 23); y++) F.px(x, y, hx(aj(H, 0.85 + azar(x, y, s) * 0.4)));
        rostro(F, 'lona', 12, 1, s);
        // Gala en brazos (los antebrazos la cruzan por abajo) y Mila subida al hombro
        caraGata(F, CARA_GATA, 15, 17, peloGala(s));
        bloque(F, 11, 24, 18, 2, P, s, 0.06);
        for (let x = 11; x < 29; x++) F.px(x, 24, hx(aj(P, 1.1)));
        caraGata(F, CARA_GATA, 29, 9, peloMila(s, 0.18));
        F.rect(30, 17, 8, 2, hx(GATA.negro)); F.px(31, 17, hx(GATA.naranjo)); F.px(35, 18, hx(GATA.naranjo));
    },
    salonas(F, fondo, s) {
        const P = ROSTROS.salonas.piel, G = [66, 68, 72];
        // notas del riff en el aire
        for (const [x, y] of [[2, 3], [6, 10], [33, 14]]) matriz(fondo, ['.NNN', '.N.N', '.N..', 'NN..', 'NN..'], { N: '#ffe2a0' }, x, y);
        bloque(F, 12, 17, 16, 9, G, s);
        F.rect(17, 17, 6, 1, '#2c2e32');
        bloque(F, 7, 18, 5, 3, G, s); bloque(F, 7, 21, 5, 5, P, s, 0.08);
        bloque(F, 28, 18, 5, 3, G, s); linea(F, 30, 23, 31, 14, hx(P), 1);
        rostro(F, 'salonas', 12, 1, s);
        // el bajo: cuerpo rojo con degradé naranjo, mástil y clavijero
        ovalo(F, 11, 22, 7, 4.5, (x, y, dx, dy) => mez([244, 132, 40], [176, 30, 40], Math.min(1, Math.hypot(dx, dy) * 1.1)));
        F.rect(9, 21, 4, 2, '#f2efe6'); F.rect(14, 21, 1, 3, '#2a2a2e');
        linea(F, 15, 21, 36, 3, '#5a3a24'); linea(F, 16, 21, 37, 3, '#7a5232');
        for (let k = 1; k < 7; k++) F.px(18 + k * 3, 19 - Math.round(k * 2.6), '#d8c8a0');
        matriz(F, ['.HH', 'cHH', 'HHc', 'cH.'], { H: '#3a2618', c: '#d8d8d8' }, 36, 0);
        mano(F, 29, 9, P, s);
        mano(F, 13, 19, P, s);
    },
    nacho(F, fondo, s) {
        const P = ROSTROS.nacho.piel, R = [176, 48, 46];
        // humo de la parrilla
        for (let k = 0; k < 16; k++) { const x0 = k < 8 ? 6 : 33; fondo.px(x0 + Math.round(2 * Math.sin(k * 0.9)), 20 - (k % 8) * 2, '#e8e0d8', 0.45); }
        polera(F, R, P, s);
        // delantal blanco con su tira al cuello
        bloque(F, 14, 19, 12, 7, [236, 232, 224], s, 0.06);
        for (const x of [15, 24]) F.rect(x, 17, 1, 2, '#ece8e0');
        F.rect(17, 22, 6, 1, '#c8c0b4');
        bloque(F, 7, 18, 5, 3, R, s); bloque(F, 7, 21, 5, 5, P, s, 0.08);
        // brazo con las pinzas y una longaniza en la punta
        bloque(F, 28, 18, 5, 3, R, s); linea(F, 30, 21, 31, 14, hx(P), 1);
        linea(F, 33, 10, 37, 2, '#b8b8c0'); linea(F, 34, 11, 38, 3, '#8a8a92');
        F.rect(36, 0, 3, 2, '#b0472c'); F.px(36, 0, '#d8704a');
        mano(F, 29, 9, P, s);
        rostro(F, 'nacho', 12, 1, s);
        // parrilla adelante: rejilla, brasas y longanizas
        F.rect(3, 21, 34, 1, '#4a4a52');
        for (let y = 22; y < 26; y++) for (let x = 3; x < 37; x++) F.px(x, y, (x - 3) % 4 === 0 ? '#3a3a42' : azar(x, y, s + 4) > 0.7 ? '#ff7a2a' : azar(x, y, s + 5) > 0.5 ? '#c03a1a' : '#2a2226');
        for (const x of [5, 11, 23, 29]) { F.rect(x, 19, 5, 2, '#a8432a'); F.rect(x + 1, 19, 3, 1, '#d8704a'); }
    },
    hadad(F, fondo, s) {
        const P = ROSTROS.hadad.piel, V = [62, 88, 66];
        // resplandor de la fogata del jefe
        for (let y = 8; y < 26; y++) for (let x = 0; x < 16; x++) { const dd = ((x - 6) / 9) ** 2 + ((y - 22) / 12) ** 2; if (dd < 1) fondo.px(x, y, '#ffd27a', 0.4 * (1 - dd)); }
        for (let i = 0; i < 6; i++) fondo.px(2 + Math.floor(azar(i, 61, s) * 10), 2 + Math.floor(azar(i, 62, s) * 10), '#ffd27a', 0.9);
        polera(F, V, P, s);
        // brazos cruzados
        bloque(F, 8, 18, 4, 8, V, s); bloque(F, 28, 18, 4, 8, V, s);
        bloque(F, 10, 21, 20, 3, aj(V, 1.08), s);
        for (let x = 10; x < 30; x++) F.px(x, 23, hx(aj(V, 0.7)));
        F.rect(12, 21, 2, 2, hx(P)); F.rect(26, 22, 2, 2, hx(aj(P, 0.9)));
        rostro(F, 'hadad', 12, 1, s);
        // la fogata: troncos cruzados y llama
        linea(F, 1, 25, 11, 22, '#6b4529', 0); linea(F, 1, 22, 11, 25, '#8b5e3a', 0);
        matriz(F, LLAMA, FUEGO, 2, 12);
    },
    moises(F, fondo, s) {
        const P = ROSTROS.moises.piel, O = [92, 104, 62], H = ROSTROS.moises.pelo;
        // noche de nieve en el sur
        degradado(fondo, ['#14223e', '#243c62', '#4a6a92', '#7c9cc0']);
        for (let i = 0; i < 22; i++) fondo.px(Math.floor(azar(i, 71, s) * 40), Math.floor(azar(i, 72, s) * 22), '#ffffff', 0.5 + azar(i, 73, s) * 0.5);
        polera(F, O, P, s);
        F.rect(17, 18, 1, 3, '#d8d8c8'); F.rect(22, 18, 1, 3, '#d8d8c8');
        bloque(F, 7, 18, 5, 8, O, s); bloque(F, 28, 18, 5, 8, O, s);
        // pelo largo y rubio sobre los hombros
        for (const x of [12, 13, 26, 27]) for (let y = 15; y < 21; y++) F.px(x, y, hx(aj(H, 0.85 + azar(x, y, s) * 0.3)));
        rostro(F, 'moises', 12, 1, s);
        // tazón caliente
        mano(F, 30, 14, P, s);
        matriz(F, ['TTTTT.', 'TttTTa', 'TTTTT.', 'TTTTTa', '.TTT..'], { T: '#c94a3a', t: '#e87a6a', a: '#c94a3a' }, 31, 9);
        for (let k = 0; k < 4; k++) fondo.px(33 + (k & 1), 7 - k * 2, '#ffffff', 0.55);
        // muro de bloques de nieve del iglú
        for (let y = 20; y < 26; y++) for (let x = 1; x < 39; x++) {
            const mortero = (y - 20) % 3 === 2 || (x + ((y - 20) / 3 | 0) * 3) % 6 === 0;
            F.px(x, y, mortero ? '#a8b8cc' : y === 20 ? '#ffffff' : elegir(['#eef4fa', '#e4ecf4', '#f6f9fc'], x, y, s));
        }
    },
    andy(F, fondo, s) {
        const P = ROSTROS.andy.piel, B = [42, 92, 200];
        // focos y papel picado: baile de victoria
        for (const [x0, c] of [[8, '#fff3b0'], [31, '#bfe6ff']]) for (let y = 0; y < 26; y++) { const w = 1 + y / 6; for (let x = Math.round(x0 - w); x <= x0 + w; x++) fondo.px(x, y, c, 0.18); }
        const PAPEL = ['#ff5555', '#ffd24a', '#55c1ff', '#7ad65e', '#ff8ad8', '#ffffff'];
        for (let i = 0; i < 18; i++) { const x = Math.floor(azar(i, 81, s) * 40), y = Math.floor(azar(i, 82, s) * 24); fondo.px(x, y, PAPEL[i % 6]); if (i & 1) fondo.px(x + 1, y + 1, PAPEL[i % 6]); }
        polera(F, B, P, s);
        F.rect(17, 18, 1, 3, '#e8e8f0'); F.rect(22, 18, 1, 3, '#e8e8f0');
        for (let x = 15; x < 25; x++) F.px(x, 22, hx(aj(B, 0.72)));
        // brazos arriba en V
        linea(F, 10, 21, 6, 11, hx(B), 2); linea(F, 29, 21, 33, 11, hx(B), 2);
        mano(F, 3, 5, P, s); mano(F, 32, 5, P, s);
        rostro(F, 'andy', 12, 1, s);
        F.rect(17, 12, 6, 1, '#f4f0ea'); // sonrisa grande
    },
    lucho(F, fondo, s) {
        const P = ROSTROS.lucho.piel, N = [30, 30, 34];
        // diana con la flecha en el centro
        for (let y = 0; y < 11; y++) for (let x = 0; x < 11; x++) { const d = Math.hypot(x - 5, y - 5); if (d <= 5.4) fondo.px(1 + x, 1 + y, d < 1.5 ? '#ffd24a' : d < 3 ? '#e8401a' : d < 4.3 ? '#f4f0ea' : '#e8401a'); }
        linea(fondo, 6, 6, 10, 10, '#6b4529'); fondo.px(11, 11, '#f4f0ea'); fondo.px(10, 11, '#f4f0ea'); fondo.px(11, 10, '#f4f0ea');
        polera(F, N, P, s);
        bloque(F, 7, 18, 5, 3, N, s); bloque(F, 7, 21, 5, 5, P, s, 0.08);
        bloque(F, 28, 18, 5, 3, N, s); bloque(F, 28, 21, 5, 2, P, s, 0.08);
        rostro(F, 'lucho', 12, 1, s);
        // el arco, tomado del medio
        for (let y = 1; y < 26; y++) { const x = 33 + Math.round(4 * Math.sin(Math.PI * (y - 1) / 24)); F.px(x, y, '#8b5e3a'); F.px(x + 1, y, '#6b4529'); }
        for (let y = 2; y < 25; y++) fondo.px(33, y, '#e8e8e0', 0.8);
        mano(F, 33, 12, P, s);
        linea(F, 31, 16, 33, 21, hx(P), 1);
    },
    braulio(F, fondo, s) {
        const P = ROSTROS.braulio.piel, B = [40, 70, 150];
        // banderita en la cumbre que encontró
        linea(fondo, 34, 4, 34, 14, '#4a2e2a'); matriz(fondo, ['RRR', 'RR.', 'R..'], { R: '#ff5555' }, 35, 4);
        polera(F, B, P, s);
        F.rect(14, 17, 2, 9, '#6b4529'); F.rect(24, 17, 2, 9, '#6b4529'); // tiras de la mochila
        bloque(F, 7, 18, 5, 8, B, s); bloque(F, 28, 18, 5, 8, B, s);
        rostro(F, 'braulio', 12, 1, s);
        // el mapa abierto, con el camino y la X
        for (let y = 18; y < 26; y++) for (let x = 6; x < 34; x++) F.px(x, y, (x - 6) % 9 === 8 ? '#c9b48a' : elegir(['#f0e2b8', '#eadaae', '#f4e8c4'], x, y, s));
        for (const [x, y] of [[8, 24], [10, 23], [12, 23], [14, 22], [16, 21], [18, 21], [20, 22], [22, 23], [24, 22], [26, 21]]) F.px(x, y, '#c03a2a');
        matriz(F, ['X.X', '.X.', 'X.X'], { X: '#c03a2a' }, 28, 19);
        matriz(F, ['.G.', 'GGG', '.G.'], { G: '#4a8a3a' }, 9, 19);
        mano(F, 3, 19, P, s); mano(F, 32, 19, P, s);
    },
    conejeros(F, fondo, s) {
        const P = ROSTROS.conejeros.piel, N = [24, 24, 26];
        polera(F, N, P, s);
        // estampado: un conejo blanco
        matriz(F, ['W.W', 'W.W', 'WWW', 'WkW', '.W.'], { W: '#e2e2dc', k: '#18181a' }, 18, 19);
        // brazos arriba sosteniendo la bufanda
        bloque(F, 7, 18, 5, 3, N, s); bloque(F, 28, 18, 5, 3, N, s);
        linea(F, 8, 18, 6, 6, hx(P), 1); linea(F, 31, 18, 33, 6, hx(P), 1);
        rostro(F, 'conejeros', 12, 1, s);
        F.rect(17, 12, 6, 2, '#5a2a26'); // grito de gol
        for (let x = 1; x < 39; x++) for (let y = 0; y < 3; y++) F.px(x, y, ((x - 1) >> 2) & 1 ? '#f4f4ee' : '#2a5ad0');
        for (const x of [1, 2, 37, 38]) for (let y = 3; y < 6; y++) if ((y + x) & 1) F.px(x, y, '#2a5ad0');
        mano(F, 4, 1, P, s); mano(F, 31, 1, P, s);
    },
    // ---- Animales ----
    mila(F, fondo, s) {
        // una mariposa que la tiene muy atenta
        for (let k = 0; k < 6; k++) fondo.px(26 + k * 2, 12 - k - (k & 1), '#ffffff', 0.6);
        matriz(F, ['Ww.wW', 'WwbwW', '.w.w.'], { W: '#ff8ad8', w: '#ffd24a', b: '#3a2a2a' }, 33, 3);
        // gordita: cuerpo ancho, pecho con más naranjo, cola que se enrosca
        const cuerpo = peloMila(s, 0.12), pecho = peloMila(s + 1, 0.3);
        linea(F, 28, 24, 33, 21, '#000000', 1); linea(F, 33, 21, 34, 16, '#000000', 1);
        for (let y = 14; y < 26; y++) for (let x = 26; x < 37; x++) if (F.lleno(x, y)) F.px(x, y, hx(cuerpo(x, y)));
        ovalo(F, 19.5, 21, 10, 7, (x, y, dx) => (Math.abs(dx) < 0.35 ? pecho(x, y) : cuerpo(x, y)));
        for (const px of [15, 22]) { F.rect(px, 24, 4, 2, hx(aj(GATA.negro, 1.6))); F.px(px + 1, 25, '#141214'); F.px(px + 2, 25, '#141214'); }
        caraGata(F, [
            '.E..........E.',
            'EiE........EiE',
            'EiiEPPPPPPEiiE',
            'PPPPPPPPPPPPPP',
            'PPOOpPPPPOOpPP',
            'PPOOOPPPPOOOPP',
            'PPPPPPnnPPPPPP',
            'PPPPPPmmPPPPPP',
            'PPPPPPPPPPPPPP',
            '.PPPPPPPPPPPP.'
        ], 13, 4, (x, y) => (x < 18 && y > 10 && azar(x, y, s + 7) < 0.4 ? aj(GATA.naranjo, 0.9 + azar(x, y, s) * 0.2) : cuerpo(x, y)));
        for (const [x, y] of [[10, 10], [11, 11], [29, 10], [28, 11]]) fondo.px(x, y, '#ffffff', 0.85); // bigotes
    },
    gala(F, fondo, s) {
        const pelo = peloGala(s);
        // cojín rojo donde duerme la siesta
        for (let y = 21; y < 26; y++) for (let x = 2; x < 38; x++) F.px(x, y, y === 21 ? '#d85a58' : y === 25 ? '#7a1e20' : elegir(['#b3393a', '#ab3536'], x, y, s));
        for (const x of [2, 37]) F.px(x, 21, '#f2c64a');
        // cuerpo echado como pan, con la cola alrededor
        ovalo(F, 23, 17, 11, 5, pelo);
        linea(F, 33, 20, 22, 21, hx(aj(GATA.gris, 0.85)), 0); linea(F, 33, 19, 22, 20, hx(GATA.gris), 0);
        // cuello naranjo con puntos
        for (let y = 12; y < 20; y++) for (let x = 14; x < 17; x++) F.px(x, y, hx((x + y) % 3 === 0 ? GATA.punto : aj(GATA.cuello, x === 16 ? 0.85 : 1)));
        // cabeza apoyada y ojos cerrados
        caraGata(F, ['EE......EE', 'EiE....EiE', 'PPPPPPPPPP', 'PPPPPPPPPP', 'PccPPPPccP', 'PPPPnnPPPP', 'PPPPmmPPPP', '.PPPPPPPP.'], 4, 11, pelo);
        // guantes blancos estirados bajo la cabeza
        for (const px of [5, 10]) { F.rect(px, 19, 4, 2, '#eeeeea'); F.px(px + 3, 20, '#c8c8c4'); }
        // Zzz
        matriz(F, ['ZZZZ', '..Z.', '.Z..', 'ZZZZ'], { Z: '#ffffff' }, 15, 4);
        matriz(F, ['ZZZ', '.Z.', 'ZZZ'], { Z: '#ffffff' }, 21, 1);
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
// Relleno de una carta nueva sin retrato todavía: la insignia de la familia en grande (×4).
function marcador(F, fam, M) {
    INSIGNIAS[fam].forEach((fila, y) => { for (let x = 0; x < 5; x++) if (fila[x] === 'W') {
        for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) F.px(10 + x * 4 + i, 3 + y * 4 + j, i === 0 || j === 0 ? M.claro : j === 3 || i === 3 ? M.oscuro : '#ffffff');
    } });
}
// Retrato de 40×26 (fondo de la familia + figura con contorno), sin la viñeta de las esquinas.
function retratoCodigo(id, fam, M, s) {
    const fondo = lienzo(40, 26), fig = lienzo(40, 26);
    FONDOS[fam](fondo, s);
    if (RETRATOS[id]) RETRATOS[id](fig, fondo, s);
    else marcador(fig, fam, M); // carta nueva sin retrato
    contorno(fig, CONTORNO);
    pegar(fondo, fig, 0, 0);
    return fondo;
}
// Dibujo del dueño encima del fondo de la familia: lo vacío deja ver el fondo
function retratoDibujado(px, fam, s) {
    const fondo = lienzo(40, 26);
    FONDOS[fam](fondo, s);
    px.forEach((c, i) => { if (c) fondo.px(i % 40, Math.floor(i / 40), hexDe(c)); });
    return fondo;
}
// Carta completa a partir de su familia y un retrato de 40×26 ya hecho
function componer(fam, hechizo, s, retrato) {
    const M = marcoDe(fam), L = lienzo(ANCHO, ALTO);
    marco(L, M, s);
    hundido(L, ZONAS.nombre, PLACA, M.sombra, M.claro, s);
    hundido(L, ZONAS.retrato, '#000000', M.sombra, M.claro, s);
    // viñeta suave en las esquinas del retrato
    for (const [x, y] of [[0, 0], [1, 0], [0, 1], [39, 0], [38, 0], [39, 1], [0, 25], [1, 25], [0, 24], [39, 25], [38, 25], [39, 24]]) retrato.px(x, y, '#000000', 0.35);
    pegar(L, retrato, ZONAS.retrato[0] + 1, ZONAS.retrato[1] + 1);
    cinta(L, M, fam);
    if (hechizo) hundido(L, ZONAS.textoHechizo, PERGAMINO, ...PERGAMINO_BORDE, s);
    else {
        hundido(L, ZONAS.texto, PERGAMINO, ...PERGAMINO_BORDE, s);
        hundido(L, ZONAS.atk, PLACA, M.sombra, M.claro, s);
        hundido(L, ZONAS.def, PLACA, M.sombra, M.claro, s);
        matriz(L, ESPADA, { W: '#ff5555' }, 6, 66);
        matriz(L, ESCUDO, { W: '#55ffff', C: '#1f6f78' }, 28, 66);
    }
    return L;
}
export function dibujarCarta(id) {
    const d = CARTAS[id];
    if (!d) return null;
    const fam = familiaDe(id), s = semillaDe(id);
    const propio = arte.retratos.get(id);
    return componer(fam, d.tipo === 'hechizo', s, propio ? retratoDibujado(propio, fam, s) : retratoCodigo(id, fam, marcoDe(fam), s));
}
// Estudio: el retrato que dibuja hoy el código (40×26, sin viñeta), para «partir del dibujo actual»
export function retratoDeCodigo(id) {
    if (!CARTAS[id]) return null;
    const fam = familiaDe(id);
    return pixelesDe(retratoCodigo(id, fam, marcoDe(fam), semillaDe(id)));
}
// Estudio (cartas nuevas, borradores): la carta con el marco de su plantilla y el boceto del dueño (o la insignia)
// plantilla: monstruo | mito | amigo | animal | hechizo; boceto: arreglo de 40×26 colores o null
export function dibujarPlantilla(plantilla, boceto = null, semilla = plantilla) {
    if (!MARCOS[plantilla]) return null;
    const s = semillaDe(semilla), M = marcoDe(plantilla);
    const retrato = boceto ? retratoDibujado(boceto, plantilla, s) : retratoCodigo(null, plantilla, M, s);
    return componer(plantilla, plantilla === 'hechizo', s, retrato);
}
// Lienzo -> arreglo de [r, g, b] o null (lo que usa mundo/datos/pixeles.js)
export function pixelesDe(L) {
    const px = new Array(L.w * L.h).fill(null);
    for (let i = 0; i < px.length; i++) if (L.d[i * 4 + 3]) px[i] = [L.d[i * 4], L.d[i * 4 + 1], L.d[i * 4 + 2]];
    return px;
}

// ---------- Reverso ----------
export function dibujarReverso() {
    if (!arte.reverso) return reversoCodigo();
    const L = lienzo(ANCHO, ALTO);
    arte.reverso.forEach((c, i) => { if (c) L.px(i % ANCHO, Math.floor(i / ANCHO), hexDe(c)); });
    return L;
}
// Estudio: el reverso que dibuja hoy el código, para «partir del dibujo actual»
export const reversoDeCodigo = () => pixelesDe(reversoCodigo());
function reversoCodigo() {
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
