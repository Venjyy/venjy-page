// =========================================================
// VENJY · Supervivencia · Íconos
// Todo se pinta con código: los objetos en 16×16 (pixel art por formas y paletas) y los
// bloques como cubo isométrico a partir del atlas del mundo. Hay un atlas de objetos para
// los objetos tirados en 3D y un caché de lienzos de 32×32 para la interfaz.
// =========================================================
import { BLOQUES, TIPO, TAM, COLS } from '../texturas.js';
import { OBJETOS, COLORES } from './objetos.js';
import { iconoModelo } from './modelos-mano.js';
import { cargarDatos } from '../datos/cargador.js';
import { decodificar, listoParaJuego } from '../datos/pixeles.js';
import { cajasDe, esValla } from '../formas.js';

const hex = c => { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const ajustar = ([r, g, b], f) => [Math.min(255, r * f), Math.min(255, g * f), Math.min(255, b * f)];
const PALO = [[137, 103, 59], [92, 66, 34]];
const CONTORNO = [40, 30, 22];

// ---------------------------------------------------------
// Lienzo de 16×16 con utilidades de dibujo
// ---------------------------------------------------------
function lienzo16() {
    const px = new Array(256).fill(null);
    const p = {
        px,
        set(x, y, c) { if (x >= 0 && y >= 0 && x < 16 && y < 16) px[y * 16 + x] = c; },
        get(x, y) { return x >= 0 && y >= 0 && x < 16 && y < 16 ? px[y * 16 + x] : null; },
        // Mascara de texto: cada letra se traduce con la paleta
        mascara(filas, paleta) {
            filas.forEach((f, y) => { for (let x = 0; x < f.length; x++) { const c = paleta[f[x]]; if (c) p.set(x, y, c); } });
        },
        // Contorno oscuro alrededor de todo lo pintado
        contornear(color = CONTORNO) {
            const copia = px.slice();
            for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
                if (copia[y * 16 + x]) continue;
                const v = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
                    const xx = x + dx, yy = y + dy;
                    return xx >= 0 && yy >= 0 && xx < 16 && yy < 16 && copia[yy * 16 + xx] && copia[yy * 16 + xx] !== color;
                });
                if (v) px[y * 16 + x] = color;
            }
        }
    };
    return p;
}

// Mango diagonal de (x0,y0) abajo-izquierda a (x1,y1) arriba-derecha, 1 px con sombra
function mango(p, x0, y0, n) {
    for (let k = 0; k < n; k++) { p.set(x0 + k, y0 - k, PALO[0]); p.set(x0 + k + 1, y0 - k, PALO[1]); }
}

// Pluma grande en diagonal: cálamo, barbas con tres tonos que se afinan hacia las puntas
function plumaGrande(p, c, contorno) {
    for (let k = 0; k <= 12; k++) {
        const x = 2 + k, y = 13 - k;
        const ancho = Math.round(3 * Math.sin(Math.PI * (k + 1.5) / 15));
        for (let d = 1; d <= ancho; d++) {
            p.set(x - d, y - d, d === ancho ? c.medio : c.claro); p.set(x - d + 1, y - d, c.claro);
            p.set(x + d, y + d, d === ancho ? c.oscuro : c.medio); p.set(x + d - 1, y + d, c.medio);
        }
        p.set(x, y, k < 2 ? c.punta : c.calamo);
    }
    p.set(1, 14, c.punta); p.set(0, 15, c.punta);
    p.contornear(contorno);
}
// Íconos de los objetos con modelo 3D: se dibujan desde las mismas piezas (iconoModelo)
function desdeModelo(p, clave) {
    iconoModelo(clave).forEach((c, i) => { if (c) p.px[i] = c; });
    p.contornear();
}

const PINTORES = {
    palo(p) { mango(p, 3, 13, 10); p.contornear(); },
    espada(p, [a, b, c]) {
        for (let k = 0; k < 9; k++) { p.set(6 + k, 9 - k, a); p.set(7 + k, 9 - k, b); p.set(6 + k, 8 - k, c); }
        p.set(14, 1, c); p.set(14, 0, a);
        for (let k = -2; k <= 2; k++) p.set(5 + k, 10 + k, [70, 50, 30]); // guarda
        p.set(4, 11, PALO[0]); p.set(3, 12, PALO[0]); p.set(4, 12, PALO[1]); p.set(2, 13, PALO[1]);
        p.contornear();
    },
    pico(p, [a, b, c]) {
        mango(p, 2, 14, 9);
        const cabeza = [[4, 2], [5, 1], [6, 1], [7, 1], [8, 1], [9, 2], [10, 2], [11, 3], [12, 4], [13, 5], [14, 6], [14, 7], [14, 8], [13, 9]];
        for (const [x, y] of cabeza) { p.set(x, y, a); p.set(x, y + 1, b); }
        p.set(5, 2, c); p.set(6, 2, c); p.set(12, 5, c); p.set(13, 6, c);
        p.contornear();
    },
    hacha(p, [a, b, c]) {
        mango(p, 3, 14, 10);
        const hoja = ['..aac', '.aaac', 'aaab.', 'aab..', 'ab...'];
        hoja.forEach((f, y) => { for (let x = 0; x < f.length; x++) if (f[x] !== '.') p.set(7 + x, 1 + y, f[x] === 'a' ? a : f[x] === 'b' ? b : c); });
        p.contornear();
    },
    pala(p, [a, b, c]) {
        mango(p, 2, 14, 9);
        const hoja = ['.ac.', 'aaac', 'aaab', '.ab.'];
        hoja.forEach((f, y) => { for (let x = 0; x < f.length; x++) if (f[x] !== '.') p.set(10 + x, 1 + y, f[x] === 'a' ? a : f[x] === 'b' ? b : c); });
        p.contornear();
    },
    azada(p, [a, b, c]) {
        mango(p, 2, 14, 10);
        for (let x = 8; x <= 12; x++) { p.set(x, 2, a); p.set(x, 3, x === 8 ? b : a); }
        p.set(8, 4, b); p.set(12, 1, c);
        p.contornear();
    },
    tijeras(p) {
        const m = [[200, 200, 206], [130, 130, 136]];
        for (let k = 0; k < 7; k++) { p.set(4 + k, 4 + k, m[0]); p.set(11 - k, 4 + k, m[1]); }
        for (const [x, y] of [[2, 11], [3, 12], [4, 12], [2, 12], [12, 11], [13, 12], [11, 12], [12, 13]]) p.set(x, y, [176, 40, 36]);
        p.contornear();
    },
    lingote(p, [a, b, c]) {
        p.mascara([
            '', '', '', '', '',
            '....cccccc......',
            '...caaaaaab.....',
            '..caaaaaaaab....',
            '.cccccccccabb...',
            '.caaaaaaaaab....',
            '.bbbbbbbbbb.....'
        ], { a, b, c });
        p.contornear();
    },
    gema(p, [a, b, c]) {
        p.mascara([
            '', '', '',
            '.....cccccc.....',
            '....caaaaaab....',
            '...caacaaaaab...',
            '...aaaaaaaaab...',
            '....aaaaaaab....',
            '.....aaaaab.....',
            '......aaab......',
            '.......ab.......'
        ], { a, b, c });
        p.contornear();
    },
    lapis(p) {
        const a = [42, 82, 200], b = [20, 48, 126], c = [106, 140, 240];
        p.mascara(['', '', '', '', '....cca.........', '...caaab..cab...', '...aaabb.caaab..', '....abb..aaab...', '.......cab.bb...', '......caaab.....', '......aabb......', '.......bb.......'], { a, b, c });
        p.contornear();
    },
    carbon(p) {
        const a = [52, 52, 54], b = [24, 24, 26], c = [92, 92, 96];
        p.mascara(['', '', '', '', '.....ccaa.......', '....caaaaab.....', '...caaacaaab....', '...aaaaaaaabb...', '...aacaaaaab....', '....aaaaabb.....', '.....abbbb......'], { a, b, c });
        p.contornear();
    },
    carbon_vegetal(p) {
        const a = [70, 58, 46], b = [32, 26, 22], c = [110, 94, 76];
        p.mascara(['', '', '', '', '.....ccaa.......', '....caaaaab.....', '...caaacaaab....', '...aaaaaaaabb...', '...aacaaaaab....', '....aaaaabb.....', '.....abbbb......'], { a, b, c });
        p.contornear();
    },
    polvo(p, [a, b, c]) {
        p.mascara(['', '', '', '', '', '', '.......c........', '.....c.a.c......', '....a.aca.a.....', '...c.aaaaa.c....', '...aaaabaaaa....', '..aabaaaaabaa...', '..abbbbbbbbba...'], { a, b, c });
    },
    pedernal(p) {
        p.mascara(['', '', '', '', '......cc........', '.....caaa.......', '....caaaab......', '....aaaaabb.....', '...caaaaaab.....', '...aaaaaabb.....', '....abbbbb......'], { a: [70, 70, 74], b: [36, 36, 40], c: [130, 130, 136] });
        p.contornear();
    },
    hilo(p) {
        const a = [236, 236, 236], b = [180, 180, 180];
        for (let k = 0; k < 12; k++) p.set(2 + k, 8 + Math.round(Math.sin(k * 0.9) * 3), k % 3 ? a : b);
        for (let k = 0; k < 6; k++) p.set(10 + (k % 2), 2 + k, b);
    },
    pluma(p) { plumaGrande(p, { claro: [250, 250, 248], medio: [226, 228, 232], oscuro: [176, 180, 190], calamo: [236, 220, 170], punta: [190, 160, 90] }); },
    cuero(p) {
        p.mascara(['', '', '', '...c.cccccc.c...', '...aaaaaaaaaa...', '...aaaabaaaaa...', '....aaaaaaba....', '....aabaaaaa....', '....aaaaaaaa....', '...aaaaabaaaa...', '...a.aaaaaa.a...', '...b.bbbbbb.b...'], { a: hex(COLORES.cuero[0]), b: hex(COLORES.cuero[1]), c: hex(COLORES.cuero[2]) });
        p.contornear();
    },
    hueso(p) {
        const a = [236, 234, 216], b = [184, 180, 156];
        for (let k = 0; k < 9; k++) { p.set(4 + k, 11 - k, a); p.set(5 + k, 11 - k, b); }
        for (const [x, y] of [[2, 11], [3, 13], [2, 12], [4, 13], [13, 2], [12, 1], [14, 3], [14, 2]]) p.set(x, y, a);
        p.contornear();
    },
    trigo(p) {
        const a = [222, 190, 84], b = [170, 130, 40], t = [120, 150, 56];
        for (let k = 0; k < 9; k++) p.set(4 + k, 14 - k, t);
        for (const [x, y] of [[9, 3], [10, 2], [11, 3], [12, 2], [8, 5], [10, 4], [11, 5], [12, 4], [13, 3], [9, 6], [12, 6], [13, 5]]) p.set(x, y, (x + y) % 2 ? a : b);
        p.contornear();
    },
    semillas(p) {
        const a = [86, 140, 50], b = [50, 96, 30];
        for (const [x, y] of [[5, 8], [8, 7], [10, 9], [6, 11], [9, 11], [11, 12], [7, 13], [4, 12]]) { p.set(x, y, a); p.set(x + 1, y, b); }
    },
    papel(p) {
        p.mascara(['', '', '..cccccccccc....', '..aaaaaaaaaab...', '..abbbbbbbbab...', '..aaaaaaaaaab...', '..abbbbbbbab....', '..aaaaaaaaaab...', '..abbbbbbbbab...', '..aaaaaaaaaab...', '..bbbbbbbbbbb...'], { a: [240, 240, 232], b: [190, 190, 180], c: [255, 255, 250] });
        p.contornear();
    },
    carta(p) {
        p.mascara(['', '', '', '.cccccccccccc...', '.abaaaaaaaaba...', '.aabaaaaaabaa...', '.aaabaaaabaaa...', '.aaaabrrbaaaa...', '.aaaaaaaaaaaa...', '.aaaaaaaaaaaa...', '.bbbbbbbbbbbb...'], { a: [244, 236, 214], b: [186, 172, 140], c: [255, 252, 240], r: [196, 40, 40] });
        p.contornear();
    },
    libro(p) {
        p.mascara(['', '', '...ccccccccc....', '..caaaaaaaaab...', '..caaaaaaaaab...', '..caabbbbbaab...', '..caaaaaaaaab...', '..caaaaaaaaab...', '..caaaaaaaaab...', '..cwwwwwwwwwb...', '...bbbbbbbbb....'], { a: [120, 70, 40], b: [70, 40, 20], c: [160, 100, 60], w: [236, 230, 210] });
        p.contornear();
    },
    huevo(p) {
        p.mascara(['', '', '', '......cca.......', '.....caaaa......', '....caaaaab.....', '....aaaaaab.....', '...caaaaaaab....', '...aaaaaaaab....', '...aaaaaaabb....', '....aaaaabb.....', '.....abbbb......'], { a: [232, 214, 170], b: [190, 168, 120], c: [250, 240, 214] });
        p.contornear();
    },
    ojo(p) {
        p.mascara(['', '', '', '', '....ccaaaa......', '...caaaaaab.....', '..caawwaaaab....', '..aawkkwaaab....', '..aawkkwaabb....', '...aawwaabb.....', '....abbbbb......'], { a: [140, 30, 50], b: [80, 14, 28], c: [190, 70, 90], w: [230, 220, 220], k: [20, 10, 10] });
        p.contornear();
    },
    manzana(p) {
        p.mascara(['', '', '.......t........', '.......tl.......', '....cc.t.aa.....', '...caaaaaaab....', '..caaaaaaaaab...', '..caaaaaaaaab...', '..aaaaaaaaabb...', '..aaaaaaaaabb...', '...aaaaaaabb....', '....abb.bbb.....'], { a: [214, 36, 40], b: [140, 16, 20], c: [255, 120, 120], t: [90, 60, 30], l: [70, 160, 50] });
        p.contornear();
    },
    pan(p) {
        p.mascara(['', '', '', '', '', '...ccccccccc....', '..caacaacaacb...', '.caaaaaaaaaaab..', '.aaaaaaaaaaaab..', '.aaaaaaaaaaabb..', '..bbbbbbbbbbb...'], { a: [196, 140, 64], b: [130, 86, 30], c: [232, 190, 110] });
        p.contornear();
    },
    zanahoria(p) {
        for (let k = 0; k < 9; k++) { p.set(3 + k, 13 - k, [240, 130, 30]); p.set(4 + k, 13 - k, k < 7 ? [200, 96, 20] : null); }
        for (const [x, y] of [[12, 3], [13, 2], [12, 2], [13, 4], [14, 3], [11, 2]]) p.set(x, y, [70, 160, 50]);
        p.contornear();
    },
    papa(p, cols) {
        const [a, b, c] = cols || [[200, 166, 96], [140, 108, 52], [230, 204, 140]];
        p.mascara(['', '', '', '', '.....ccaaa......', '....caaaaaab....', '...caabaaaaab...', '...aaaaaabaab...', '...aaaaaaaabb...', '....aabaaabb....', '.....abbbbb.....'], { a, b, c });
        p.contornear();
    },
    carne(p, [a, b, c]) {
        p.mascara(['', '', '', '....cccccc......', '...caaaaaaa.....', '..caaacaaaab....', '..aaaaaaaaaab...', '..aaacaaaaab....', '..aaaaaaaab.....', '...aabaaab..ww..', '....bbbbb..www..', '............w...'], { a, b, c, w: [236, 230, 210] });
        p.contornear();
    },
    chuleta(p, [a, b, c]) {
        p.mascara(['', '', '', '.....cccccc.....', '....caaaaaab....', '...caaaaaaaab...', '...aaaaaaaaab...', '...aaaaaaaaab...', '...waaaaaaaab....', '....wwwaaabb.....', '.......wbb......'], { a, b, c, w: [236, 230, 210] });
        p.contornear();
    },
    pollo(p, [a, b, c]) {
        p.mascara(['', '', '', '.....ccccc......', '....caaaaab.....', '...caaaaaaab....', '...aaaaaaaab....', '...aaaaaaaab....', '....aaaaaab.....', '.....abbbaww....', '..........ww....', '...........w....'], { a, b, c, w: [236, 230, 210] });
        p.contornear();
    },
    pez(p, [a, b, c]) {
        p.mascara(['', '', '', '', '.........c......', '....cccccaa..c..', '..caaaaaaaab.ca.', '.caakaaaaaaaaab.', '.aaaaaaaaaabbab.', '..abbbbbbbbb.bb.', '.....bb......b..'], { a, b, c, k: [20, 20, 20] });
        p.contornear();
    },
    pezglobo(p) {
        p.mascara(['', '', '....s..s..s.....', '...ccccccccc....', '..caaaaaaaaab...', 's.akaaaaaakab.s.', '..aaaaaaaaaaab..', '..aaaaaaaaaaab..', 's.aawwwwwwaab.s.', '..aaaaaaaaabb...', '...bbbbbbbbb....', '....s..s..s.....'], { a: [236, 200, 60], b: [170, 130, 30], c: [255, 236, 130], k: [20, 20, 20], w: [240, 240, 220], s: [120, 100, 40] });
        p.contornear();
    },
    galleta(p) {
        p.mascara(['', '', '', '.....cccccc.....', '....caaaaaab....', '...caakaaakab...', '...aaaaaaaaab...', '...akaaaakaab...', '...aaaaaaaabb...', '....aakaaabb....', '.....bbbbbb.....'], { a: [200, 140, 70], b: [140, 90, 40], c: [230, 180, 110], k: [70, 40, 20] });
        p.contornear();
    },
    pastel(p) {
        p.mascara(['', '', '', '', '...r..r..r..r...', '..wwwwwwwwwwww..', '..wwwwwwwwwwww..', '..awwawwwawwaw..', '..aaaaaaaaaaab..', '..aaaaaaaaaaab..', '..bbbbbbbbbbbb..'], { a: [200, 140, 80], b: [140, 90, 40], w: [250, 248, 240], r: [220, 40, 40] });
        p.contornear();
    },
    cuenco(p) {
        p.mascara(['', '', '', '', '', '', '..cccccccccccc..', '..aaaaaaaaaaab..', '...aaaaaaaaab...', '....aaaaaaab....', '.....bbbbbb.....'], { a: [150, 108, 62], b: [92, 66, 34], c: [190, 150, 96] });
        p.contornear();
    },
    estofado(p) {
        PINTORES.cuenco(p);
        for (let x = 3; x <= 12; x++) p.set(x, 6, x % 3 ? [240, 130, 30] : [150, 90, 50]);
    },
    casco(p, [a, b, c]) {
        p.mascara(['', '', '', '', '....cccccccc....', '...caaaaaaaab...', '...aaaaaaaaab...', '...aab....aab...', '...ab......ab...', '...bb......bb...'], { a, b, c });
        p.contornear();
    },
    peto(p, [a, b, c]) {
        p.mascara(['', '', '..ccc....ccc....', '..aaac..caaab...', '..aaaaccaaaab...', '...aaaaaaaab....', '...aaaaaaaab....', '...aacaaaaab....', '...aaaaaaaab....', '...aaaaaaaab....', '...aaaaaaabb....', '...bbbbbbbbb....'], { a, b, c });
        p.contornear();
    },
    grebas(p, [a, b, c]) {
        p.mascara(['', '', '', '...cccccccccc...', '...aaaaaaaaab...', '...aaaaaaaaab...', '...aaab..aaab...', '...aab....aab...', '...aab....aab...', '...aab....aab...', '...aab....aab...', '...bbb....bbb...'], { a, b, c });
        p.contornear();
    },
    botas(p, [a, b, c]) {
        p.mascara(['', '', '', '', '', '', '...ccc....ccc...', '...aab....aab...', '...aab....aab...', '..aaab...aaab...', '..aaab...aaab...', '..bbbb...bbbb...'], { a, b, c });
        p.contornear();
    },
    cubo(p, cols) {
        const m = [[180, 180, 186], [110, 110, 116], [220, 220, 226]];
        const liquido = cols ? cols[0] : [60, 60, 66], brillo = cols ? cols[2] : [80, 80, 86];
        p.mascara([
            '', '',
            '.....hhhhhh.....',
            '....h......h....',
            '...h........h...',
            '..cccccccccccc..',
            '..cwwwwlwwwwwb..',
            '..caaaaaaaaaab..',
            '...aaaaaaaaab...',
            '...acaaaaaaab...',
            '....aaaaaaab....',
            '....acaaaaab....',
            '.....bbbbbb.....'
        ], { a: m[0], b: m[1], c: m[2], h: [70, 70, 76], w: liquido, l: brillo });
        p.contornear();
    },
    arco(p) {
        const m = [[137, 103, 59], [92, 66, 34]];
        const arco = [[10, 1], [11, 2], [12, 3], [13, 4], [13, 5], [14, 6], [14, 7], [14, 8], [13, 9], [13, 10], [12, 11], [11, 12], [10, 13], [9, 14], [8, 1], [9, 1]];
        for (const [x, y] of arco) p.set(x - 6, y < 8 ? 15 - x + 1 : y, m[0]);
        for (let k = 0; k < 12; k++) p.set(3 + k, 13 - k, [230, 230, 230]);
        for (let k = 0; k < 9; k++) { p.set(2 + k, 3 + Math.round(k * 0.2), m[(k % 2)]); p.set(11 + Math.round(k * 0.2), 4 + k, m[(k % 2)]); }
        p.contornear();
    },
    flecha(p) {
        for (let k = 0; k < 10; k++) p.set(3 + k, 12 - k, [137, 103, 59]);
        for (const [x, y] of [[13, 2], [12, 2], [13, 3], [11, 1], [14, 4]]) p.set(x, y, [130, 130, 136]);
        for (const [x, y] of [[2, 12], [3, 13], [2, 13], [1, 13], [2, 14], [4, 13], [1, 12]]) p.set(x, y, [240, 240, 240]);
        p.contornear();
    },
    escudo(p) {
        p.mascara(['', '..cccccccccc....', '..aaaaawaaaab...', '..aaaaawaaaab...', '..aaaaawaaaab...', '..wwwwwwwwwwb...', '..aaaaawaaaab...', '..aaaaawaaaab...', '...aaaawaaab....', '....aaawaab.....', '.....aawab......', '......abb.......'], { a: [150, 108, 62], b: [92, 66, 34], c: [190, 150, 96], w: [140, 140, 146] });
        p.contornear();
    },
    cana(p) {
        for (let k = 0; k < 11; k++) p.set(2 + k, 14 - k, k < 3 ? [92, 66, 34] : [137, 103, 59]);
        for (let y = 4; y <= 12; y++) p.set(13, y, [230, 230, 230]);
        p.set(13, 13, [200, 40, 40]); p.set(12, 13, [240, 240, 240]);
        p.contornear();
    },
    brujula(p) {
        p.mascara(['', '', '....cccccccc....', '...caaaaaaaab...', '..caawwwwwwaab..', '..aawwwwwrwwab..', '..aawwwwrwwwab..', '..aawwwkwwwwab..', '..aawwkwwwwwab..', '..aaawwwwwwaab..', '...abbbbbbbbb...'], { a: [180, 180, 186], b: [110, 110, 116], c: [220, 220, 226], w: [70, 70, 80], r: [220, 40, 40], k: [200, 200, 210] });
        p.contornear();
    },
    puerta(p) {
        p.mascara(['....cccccccc....', '....aaaaaaab....', '....awwawwab....', '....awwawwab....', '....aaaaaaab....', '....awwawwab....', '....aaaaaaab....', '....aaaaaaab....', '....aaaaaaab....', '....aaaaakab....', '....aaaaaaab....', '....aaaaaaab....', '....aaaaaaab....', '....aaaaaaab....', '....bbbbbbbb....'], { a: [168, 131, 79], b: [110, 76, 40], c: [200, 160, 104], w: [70, 50, 30], k: [60, 60, 64] });
        p.contornear();
    },
    amuleto(p) {
        for (let k = 0; k < 6; k++) { p.set(4 + k, 2 + Math.round(k * 0.5), [200, 200, 200]); p.set(11 - k, 2 + Math.round(k * 0.5), [200, 200, 200]); }
        p.mascara(['', '', '', '', '', '......cc........', '.....caab.......', '....caaaab......', '....aaaaab......', '.....aaab.......', '......ab........'].map(f => '..' + f), { a: [150, 40, 190], b: [80, 10, 110], c: [230, 150, 255] });
        p.contornear();
    },
    pluma_negra(p) { plumaGrande(p, { claro: [150, 100, 200], medio: [100, 60, 150], oscuro: [56, 30, 90], calamo: [190, 170, 210], punta: [120, 90, 140] }, [20, 10, 30]); },
    farol(p) {
        p.mascara(['', '......kk........', '.....k..k.......', '....kkkkkk......', '....kyyyyk......', '....kyooyk......', '....kyooyk......', '....kyyyyk......', '....kkkkkk......', '.....kkkk.......'].map(f => '..' + f), { k: [50, 50, 60], y: [120, 220, 200], o: [200, 255, 230] });
        p.contornear();
    },
    // ---- 7f-2 (pintados a ojo: el dueño los revisa) ----
    reloj(p) {
        p.mascara(['', '', '....kkkkkkkk....', '...kyyyyyyyyk...', '..kyywwwwwwyyk..', '..kywwwwwwwwyk..', '..kywwwkwwwwyk..', '..kywwwkkkwwyk..', '..kywwwwwwwwyk..', '..kyywwwwwwyyk..', '...kyyyyyyyyk...', '....kkkkkkkk....'], { k: [90, 66, 10], y: [246, 215, 58], w: [244, 240, 224] });
        p.contornear();
    },
    mapa(p) {
        p.mascara(['', '..bbbbbbbbbbbb..', '..bgggwwgggab..', '..bgwwgggwwab..', '..bggggaaggab..', '..bwwgxaaggab..', '..bwwggggwwab..', '..bggagggggab..', '..bbbbbbbbbbb..', ''], { b: [120, 84, 48], g: [96, 170, 70], w: [60, 110, 200], a: [190, 170, 110], x: [200, 40, 40] });
        p.contornear();
    },
    farol_mano(p) {
        // Farol colgante: argolla, tapa y base azul grisáceo, vidrio anaranjado con núcleo claro entre barrotes oscuros
        p.mascara(['', '......kkkk......', '......k..k......', '....cccccccc....', '....bYYYYYYb....', '....bYoooYYb....', '....bYoooYYb....', '....bYoooYYb....', '....bYYYYYYb....', '....cccccccc....', '.....cccccc.....'], { k: [74, 82, 102], c: [96, 108, 134], b: [70, 48, 34], Y: [250, 172, 44], o: [255, 238, 160] });
        p.contornear();
    },
    cuaderno(p) {
        p.mascara(['', '', '...ccccccccc....', '..caaaaaaaaab...', '..caaaagaaaab...', '..caaarrrraab...', '..caarrrrrrab...', '..caaarrrraab...', '..caaaaaaaaab...', '..cwwwwwwwwwb...', '...bbbbbbbbb....'], { a: [196, 48, 40], b: [120, 22, 18], c: [236, 96, 80], w: [236, 230, 210], g: [70, 160, 50], r: [255, 150, 130] });
        p.contornear();
    },
    tomate(p) {
        p.mascara(['', '......gg........', '....ggggggg.....', '...rrrgggrrr....', '..rrrrrgrrrrb...', '.rcrrrrrrrrrrb..', '.rcrrrrrrrrrrb..', '.rrrrrrrrrrrrb..', '.rrrrrrrrrrrrb..', '.rrkkkkrkkkkrb..', '..rrkkrrrkkrb...', '...rrrrrrrrb....', '....bbbbbbb.....'], { r: [214, 48, 40], b: [140, 24, 20], c: [255, 140, 120], g: [70, 160, 50], k: [34, 22, 18] });
        p.contornear();
    },
    cartel(p) {
        p.mascara(['', '..tttttttttttt..', '..taaaaaaaaaat..', '..tabbbbbbbbat..', '..taaaaaaaaaat..', '..tabbbbbbaaat..', '..taaaaaaaaaat..', '..tttttttttttt..', '.......mm.......', '.......mm.......', '.......mm.......', '.......mm.......'], { t: [110, 78, 40], a: [196, 160, 100], b: [96, 66, 34], m: [137, 103, 59] });
        p.contornear();
    },
    botella(p, cols) {
        p.mascara(['', '......kk........', '......cc........', '......cc........', '.....cccc.......', '....cwwwwc......', '...cwwwwwwc.....', '...cwwwwwwc.....', '...cwwwwwwc.....', '...cwwwwwwc.....', '....cccccc......'], { k: [137, 103, 59], c: [170, 210, 220], w: cols ? cols[0] : [210, 235, 245] });
        p.contornear([60, 90, 100]);
    },
    mazo(p) {
        p.mascara(['', '', '.....rrrrrrr.....', '....rwwwwwwr....', '....rwrrrrwr....', '....rwrwwrwr....', '....rwrrrrwr....', '....rwwwwwwr....', '....rrrrrrrr....', '.....bbbbbbb....'], { r: [176, 44, 48], w: [244, 236, 214], b: [90, 24, 28] });
        p.contornear();
    },
    pluma_juguete(p) { plumaGrande(p, { claro: [244, 112, 112], medio: [220, 52, 64], oscuro: [168, 28, 48], calamo: [244, 232, 196], punta: [176, 140, 70] }); },
    // Guitarra y Teclado, pintados a mano (a 16×16 el modelo 3D pierde los detalles); el Tambor sí sale del modelo 3D
    guitarra(p) {
        p.mascara(['...........nnn..', '..........nnnn..', '.........nff....', '........nff.....', '.......nff......', '....aaanff......', '...aaaaaaf......', '..aaaaaaaaa.....', '..aaahhhaaad....', '..aadhhhhdad....', '..aaaahhaaad....', '...aaaaaadd.....', '....dddddd......'], { a: [226, 164, 84], d: [168, 106, 48], h: [38, 24, 14], n: [120, 78, 44], f: [58, 38, 24] });
        p.contornear();
    },
    teclado(p) {
        p.mascara(['', '', '', '', '', '..dddddddddddd..', '..drdwdudrdddd...', '.wwwwwwwwwwwwww.', '.wbwbwwbwbwbww..', '.wbwbwwbwbwbww..', '.wwwwwwwwwwwwww.', '.gggggggggggggg.', '.dddddddddddddd.'], { d: [58, 60, 74], w: [244, 244, 240], b: [28, 26, 30], g: [170, 170, 166], r: [214, 62, 58], u: [70, 130, 210] });
        p.contornear();
    },
    tambor(p) { desdeModelo(p, 'tambor'); },
    // Mesa de duelo (duelo 2J, PR 3): tablero con paño verde y cuatro patas, como la mesa de Lucho
    mesa_duelo(p) {
        p.mascara(['', '', '', '', '.gggggggggggggg.', '.gvvvvvvvvvvvvg.', '.gvwvvvvvvvvwvg.', '.gvvvvvvvvvvvvg.', '.mmmmmmmmmmmmmm.', '.oooooooooooooo.', '..o..........o..', '..o..........o..', '..o..........o..', '..o..........o..', '..o..........o..'], { g: [122, 82, 48], v: [47, 106, 52], w: [244, 236, 214], m: [122, 82, 48], o: [78, 50, 24] });
        p.contornear();
    },
    cama(p) {
        p.mascara(['', '', '', '', '', '..wwwrrrrrrrrr..', '..wwwrrrrrrrrr..', '..rrrrrrrrrrrr..', '..mmmmmmmmmmmm..', '..m..........m..'], { w: [240, 240, 236], r: [176, 44, 48], m: [137, 103, 59] });
        p.contornear();
    }
};

// ---------------------------------------------------------
// Dibujos del dueño (mundo/datos/iconos.json, pestaña Píxeles del Estudio): por clave de objeto en minúscula
// (palo, pico_madera), 16×16. Si hay uno listo, reemplaza al de PINTORES; los de "estado": "borrador", no.
// ---------------------------------------------------------
let dibujos = new Map(); // clave en minúscula -> 256 colores
let versionIconos = 0;
const oyentes = new Set();
export function aplicarIconos(d) {
    dibujos = new Map();
    for (const [k, dib] of Object.entries((d && d.iconos) || {})) if (listoParaJuego(dib, 16, 16)) dibujos.set(k, decodificar(dib, 16, 16));
    versionIconos++;
    repintar();
}
export const versionDeIconos = () => versionIconos;
// f() cuando cambian los dibujos (la textura del atlas y las mallas de la mano se rehacen)
export function alCambiarIconos(f) { oyentes.add(f); return () => oyentes.delete(f); }
if (typeof location !== 'undefined') cargarDatos('iconos').then(d => { if (d) aplicarIconos(d); });

// ---------------------------------------------------------
// Atlas de objetos (para los objetos tirados en 3D) y caché de íconos de la interfaz
// ---------------------------------------------------------
const COLS_OBJ = 16;
let atlasObjetos = null;
const celdaObjeto = new Map(); // id -> índice de celda en el atlas
export function crearAtlasObjetos() {
    if (atlasObjetos) return atlasObjetos;
    const ids = OBJETOS.map((o, i) => (o ? i : null)).filter(i => i !== null);
    const filas = Math.ceil(ids.length / COLS_OBJ);
    const c = document.createElement('canvas');
    c.width = COLS_OBJ * 16; c.height = Math.max(16, filas * 16);
    atlasObjetos = c;
    pintarAtlas(ids);
    return c;
}
function pintarAtlas(ids = [...celdaObjeto.keys()]) {
    const c = atlasObjetos;
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(c.width, c.height);
    ids.forEach((id, n) => {
        celdaObjeto.set(id, n);
        const p = pintarObjeto(id);
        const ox = (n % COLS_OBJ) * 16, oy = Math.floor(n / COLS_OBJ) * 16;
        for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
            const col = p.px[y * 16 + x];
            if (!col) continue;
            const i = ((oy + y) * c.width + ox + x) * 4;
            img.data[i] = col[0]; img.data[i + 1] = col[1]; img.data[i + 2] = col[2]; img.data[i + 3] = 255;
        }
    });
    ctx.putImageData(img, 0, 0);
}
export function uvObjeto(id) {
    crearAtlasObjetos();
    const n = celdaObjeto.get(id) ?? 0;
    const W = atlasObjetos.width, H = atlasObjetos.height;
    const x = (n % COLS_OBJ) * 16, y = Math.floor(n / COLS_OBJ) * 16;
    return { u0: x / W, u1: (x + 16) / W, v0: 1 - (y + 16) / H, v1: 1 - y / H };
}

// Píxeles de un objeto (256 entradas [r, g, b] o null): la mano los extruye en 3D
export function pixelesObjeto(id) { return pintarObjeto(id).px; }
// El dibujo del código, sin el del JSON (Estudio: «partir del dibujo actual» y «volver al del código»)
export function pixelesDeCodigo(id) { return pintarObjeto(id, false).px; }

function pintarObjeto(id, conDatos = true) {
    const o = OBJETOS[id];
    const p = lienzo16();
    const propio = conDatos && o && dibujos.get(o.clave.toLowerCase());
    if (propio) { propio.forEach((c, i) => { p.px[i] = c; }); return p; }
    const f = o && PINTORES[o.icono];
    if (!f) { p.mascara(['', '', '', '', '.....aaaaaa.....', '....a......a....', '.........aa.....', '........a.......', '........a.......', '', '........a.......'], { a: [255, 0, 255] }); return p; }
    let cols = null;
    if (o.color && COLORES[o.color]) cols = COLORES[o.color].map(hex);
    else if (o.color && o.icono === 'lingote') cols = COLORES[o.color].map(hex);
    f(p, cols || [[200, 200, 200], [120, 120, 120], [240, 240, 240]]);
    return p;
}

// Ícono de 32×32 listo para la interfaz (se cachea)
const cache = new Map();
let atlasBloques = null;
export function fijarAtlasBloques(lienzoAtlas) { atlasBloques = lienzoAtlas; }

export function icono(id) {
    if (cache.has(id)) return cache.get(id);
    const c = document.createElement('canvas');
    c.width = c.height = 32;
    pintarIcono(c, id);
    cache.set(id, c);
    return c;
}
function pintarIcono(c, id) {
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    if (id >= 256) {
        ctx.clearRect(0, 0, 32, 32);
        const p = pintarObjeto(id);
        const img = ctx.createImageData(32, 32);
        for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
            const col = p.px[(y >> 1) * 16 + (x >> 1)];
            if (!col) continue;
            const i = (y * 32 + x) * 4;
            img.data[i] = col[0]; img.data[i + 1] = col[1]; img.data[i + 2] = col[2]; img.data[i + 3] = 255;
        }
        ctx.putImageData(img, 0, 0);
    } else if (BLOQUES[id] && atlasBloques) {
        dibujarBloque(ctx, id);
    }
}
// Los lienzos ya entregados se repintan en su lugar: la interfaz que los muestra cambia sola
function repintar() {
    if (typeof document === 'undefined') return;
    for (const [id, c] of cache) if (id >= 256) pintarIcono(c, id);
    if (atlasObjetos) pintarAtlas();
    for (const f of oyentes) f();
}

function tileXY(tile) { return [(tile % COLS) * TAM, Math.floor(tile / COLS) * TAM]; }

// 7f-2: bloque con forma (losa, escalones, trampilla, valla) en isométrico, caja por caja de atrás hacia delante.
// Misma vista que el cubo: P(x, y, z) lleva un punto del bloque (0..1) al lienzo de 32×32.
function dibujarCajas(ctx, d, cajas) {
    const P = (x, y, z) => [16 + 16 * x - 16 * z, 8 * x + 8 * z + 16 * (1 - y)];
    const cara = (tile, o, u, v, src, oscuro) => {
        const [sx, sy] = tileXY(tile);
        const [ox, oy] = P(...o), [ux, uy] = P(...u), [vx, vy] = P(...v);
        ctx.save();
        ctx.setTransform(ux - ox, uy - oy, vx - ox, vy - oy, ox, oy);
        const [s0, t0, s1, t1] = src.map(n => n * TAM);
        ctx.drawImage(atlasBloques, sx + s0, sy + t0, Math.max(1, s1 - s0), Math.max(1, t1 - t0), 0, 0, 1, 1);
        if (oscuro) { ctx.fillStyle = `rgba(0,0,0,${oscuro})`; ctx.fillRect(0, 0, 1, 1); }
        ctx.restore();
    };
    const orden = [...cajas].sort((a, b) => (a.x0 + a.z0) - (b.x0 + b.z0) || a.y0 - b.y0);
    for (const c of orden) {
        const { x0, y0, z0, x1, y1, z1 } = c;
        cara(d.lado, [x1, y1, z1], [x1, y1, z0], [x1, y0, z1], [1 - z1, 1 - y1, 1 - z0, 1 - y0], 0.42); // derecha (+x)
        cara(d.lado, [x0, y1, z1], [x1, y1, z1], [x0, y0, z1], [x0, 1 - y1, x1, 1 - y0], 0.25);     // izquierda (+z)
        cara(d.top, [x0, y1, z0], [x1, y1, z0], [x0, y1, z1], [x0, z0, x1, z1], 0);                // tapa
    }
}

// Cubo isométrico: tapa arriba y dos caras laterales más oscuras; plantas y paneles van planos
function dibujarBloque(ctx, id) {
    const d = BLOQUES[id];
    const t = TIPO[id];
    if (t === 8) return dibujarCajas(ctx, d, cajasDe(id, dx => (esValla(id) && dx !== 0 ? id : 0)));
    if (t === 4 || t === 6 || t === 7) {
        const [sx, sy] = tileXY(t === 4 ? d.top : d.lado);
        ctx.drawImage(atlasBloques, sx, sy, TAM, TAM, 0, 0, 32, 32);
        return;
    }
    const [tx, ty] = tileXY(d.top), [lx, ly] = tileXY(d.lado);
    // tapa: rombo
    ctx.save();
    ctx.setTransform(1, 0.5, -1, 0.5, 16, 0);
    ctx.drawImage(atlasBloques, tx, ty, TAM, TAM, 0, 0, 16, 16);
    ctx.restore();
    // cara izquierda
    ctx.save();
    ctx.setTransform(1, 0.5, 0, 1, 0, 8);
    ctx.drawImage(atlasBloques, lx, ly, TAM, TAM, 0, 0, 16, 16);
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(0, 0, 16, 16);
    ctx.restore();
    // cara derecha
    ctx.save();
    ctx.setTransform(1, -0.5, 0, 1, 16, 16);
    ctx.drawImage(atlasBloques, lx, ly, TAM, TAM, 0, 0, 16, 16);
    ctx.fillStyle = 'rgba(0,0,0,0.42)'; ctx.fillRect(0, 0, 16, 16);
    ctx.restore();
}
