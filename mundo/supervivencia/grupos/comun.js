// =========================================================
// VENJY · Supervivencia · Escenas de grupo (bloque 6c-2): piezas comunes
// Lo importan grupos/tomatitos.js, grupos/atalaya.js y grupos/coyhaique.js (se cargan con import() al usarse).
// · durG: lo que dura una frase de grupo (más corta que la de las bienvenidas: con 4-5 personas hay más frases y la
//   escena tiene que quedar en ~20-24 s). crearGuion(): va poniendo frases una tras otra y gestos por personaje.
// · ordenar(): gestos sin pisarse; los de relleno (`habla`, `asiente`, `mira`) solo ocupan los huecos.
// · eventos(): sonidos y efectos de una vez (irA hacia atrás los vuelve a permitir, para las capturas).
// · TOMATE: el tomate con bigote elegante (estilo cabeza de tomate de Fortnite: rojo, hojas verdes, bigote café curvo)
//   y TOMAS (el de Conejeros, con la cara dibujada); BOLA de nieve, PING de enemigo y NIEVE.
// · GESTOS_GRUPO: los movimientos nuevos de los grupos (camina, alto, salta, oreja, tapaOidos, alHombro, miraArriba...).
// Las pruebas (mundo/tests/amistad.mjs) comprueban rangos, tiempos y que quien se mueve vuelva a su sitio.
// =========================================================
import { MOLDES, PIX, SONIDOS, ruta } from '../moldes.js';
import { tono } from '../sonidos.js';

export { MOLDES, PIX, SONIDOS, ruta };
export const t = (es, en) => ({ es, en });
export const r2 = x => Math.round(x * 100) / 100;
const lim = (v, a, b) => Math.max(a, Math.min(b, v));
export const PAUSA = 0.08;
// Lo que dura una frase de grupo en pantalla
export const durG = txt => r2(lim(0.95 + txt.es.length * 0.027, 1.5, 2.8));

// Guion por pasos: frases una tras otra (g.s es el reloj) y gestos [gesto, desde, hasta, relleno?] por personaje
export function crearGuion(desde = 0.6) {
    const g = { s: desde, lineas: [], pista: {} };
    g.di = (q, texto, antes = 0) => {
        g.s += antes;
        const l = { q, a: r2(g.s), d: durG(texto), texto };
        g.lineas.push(l);
        g.s = l.a + l.d + PAUSA;
        return l;
    };
    g.ges = (q, gesto, a, b, relleno = false) => { (g.pista[q] ||= []).push([gesto, a, b, relleno]); };
    g.fin = l => l.a + l.d;
    return g;
}
// Gestos sin pisarse: primero los importantes (en orden de inicio, el que empieza antes manda) y después los de relleno
// en los huecos que queden; nada más corto que 0.35 s
export function ordenar(lista, T) {
    const tramos = [];
    const meter = (g, a, b) => {
        a = Math.max(0, a); b = Math.min(T - 0.05, b);
        let ini = a;
        for (const [, x, y] of tramos.filter(([, x, y]) => y > a && x < b).sort((p, q) => p[1] - q[1])) {
            if (x - ini >= 0.35) tramos.push([g, r2(ini), r2(x)]);
            ini = Math.max(ini, y);
        }
        if (b - ini >= 0.35) tramos.push([g, r2(ini), r2(b)]);
    };
    for (const [g, a, b] of lista.filter(x => !x[3]).sort((p, q) => p[1] - q[1])) meter(g, a, b);
    for (const [g, a, b] of lista.filter(x => x[3]).sort((p, q) => p[1] - q[1])) meter(g, a, b);
    return tramos.sort((p, q) => p[1] - q[1]);
}
// Cierra el guion: T (con 0.9 s de salida), pistas ordenadas y gestos
export function cerrar(g, extra = {}) {
    const ultima = g.lineas[g.lineas.length - 1];
    const T = r2(Math.max(ultima.a + ultima.d, g.s) + 0.9);
    const pista = {};
    for (const [q, lista] of Object.entries(g.pista)) pista[q] = ordenar(lista, T);
    return { T, r: 1.3, lineas: g.lineas, pista, gestos: { ...MOLDES, ...GESTOS_GRUPO }, ...extra };
}
// Sonidos y efectos de una vez: [[segundo, fn(api)]]; irA hacia atrás los vuelve a permitir
export function eventos(lista) {
    const hechos = new Set();
    let ult = 0;
    return api => {
        const x = api.e.t;
        if (x < ult - 0.05) for (const i of [...hechos]) if (lista[i][0] > x) hechos.delete(i);
        ult = x;
        lista.forEach(([s, f], i) => { if (x >= s && x < s + 0.6 && !hechos.has(i)) { hechos.add(i); f(api); } });
    };
}
// Papel en la escena de un personaje: el ancla es 'n' (escena-amistad.js reparte sus frases y pistas); los demás, su clave
export const rolDe = ancla => q => (q === ancla ? 'n' : q);
// Hacia dónde mira el cuerpo (como n.yaw) para ir de a a b
export const rumbo = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);

// ---------------------------------------------------------
// Dibujos píxel
// ---------------------------------------------------------
const COL_TOMATE = { r: '#d8352a', R: '#ff7a5c', o: '#a8221a', g: '#4caf3a', G: '#2e7d22', k: '#1b0f0f', m: '#5a3214', w: '#ffffff' };
// Tomate con bigote elegante: hojas arriba, ojos y bigote café de puntas curvas
export const TOMATE = { filas: [
    '.....gg.....',
    '...gGggGg...',
    '..rrgGGgrr..',
    '.rrRRrrrrrr.',
    'rrRRrrrrrrrr',
    'rRrrkrrkrrrr',
    'rRrrkrrkrrrr',
    'rmrrrrrrrrmr',
    'rmmrmmmmrmmr',
    'rrmmmrrmmmrr',
    '.rrrrrrrrro.',
    '...rrrrroo..'], colores: COL_TOMATE };
// Tomás: el tomate de Conejeros con la cara dibujada encima (ojos grandes y sonrisa de plumón blanco)
export const TOMAS = { filas: [
    '.....gg.....',
    '...gGggGg...',
    '..rrgGGgrr..',
    '.rwwwrrwwwr.',
    'rrwkwrrwkwrr',
    'rRwwwrrwwwrr',
    'rRrrrrrrrrrr',
    'rmrrrrrrrrmr',
    'rmmrmmmmrmmr',
    'rrmmmrrmmmrr',
    '.rwrrrrrrwr.',
    '...wwwwww...'], colores: COL_TOMATE };
// Cara del tomate gigante (un bloque: sin bordes transparentes)
export const TOMATE_BLOQUE = { filas: TOMATE.filas.map((f, i) => (i < 3 ? 'rrrrrrrrrrrr' : f.replace(/\./g, 'o'))), colores: COL_TOMATE };
export const HOJAS = { filas: ['GgGgGgGg', 'gGgggGgG', 'GgGGgGgg', 'gggGgGgG', 'GgGgggGg', 'gGgGgGgG', 'GggGgGgg', 'gGgGgGgG'], colores: COL_TOMATE };
export const BOLA = { filas: ['.aaaa.', 'abbbba', 'abbbba', 'abbbca', 'abbcca', '.aaaa.'], colores: { a: '#c8d8e8', b: '#ffffff', c: '#dde8f2' } };
export const NIEVE = { filas: ['.a.', 'aba', '.a.'], colores: { a: '#e8f2ff', b: '#ffffff' } };
// Marca de ping (como la de los juegos de disparos: rombo naranjo con signo de alerta)
export const PING = { filas: ['....aa....', '...abba...', '..abbbba..', '.abbkkbba.', 'abbbkkbbba', 'abbbkkbbba', '.abbbbbba.', '..abkkba..', '...abba...', '....aa....'], colores: { a: '#7a2a00', b: '#ff8a1c', k: '#2a0e00' } };

// Sonido de mensaje de WhatsApp (dos notas suaves que suben)
export function mensaje() { tono({ f0: 1046, f1: 1046, dur: 0.08, vol: 0.08, forma: 'sine' }); tono({ f0: 1568, f1: 1568, dur: 0.12, vol: 0.08, forma: 'sine', retardo: 0.1 }); }

// ---------------------------------------------------------
// Gestos nuevos de los grupos (firma de los moldes: (u, t, info) -> metas; rangos de rig.md)
// ---------------------------------------------------------
export const GESTOS_GRUPO = {
    // Camina: piernas y brazos alternados, un rebote chico
    camina: (u, x) => { const s = Math.sin(x * 9); return { pDx: s * 0.55, pIx: -s * 0.55, bDx: -s * 0.4, bIx: s * 0.4, bDz: 0.08, bIz: -0.08, y: Math.abs(s) * 0.04 }; },
    // Tomate (o lo que sea) en alto con el brazo derecho, un vaivén chico
    alto: (u, x) => ({ bDx: -2.55 + Math.sin(x * 4) * 0.05, bDz: 0.12, bIx: -0.2, cx: -0.18 }),
    // El mismo tomate en alto pero con la izquierda (Conejeros muestra a Tomás)
    altoI: (u, x) => ({ bIx: -2.3 + Math.sin(x * 4) * 0.05, bIz: -0.25, bDx: -0.3, cx: -0.12 }),
    // Baja su tomate para que el otro llegue
    baja: u => ({ bDx: ruta(u, [[0, -2.55], [0.4, -1.3], [1, -1.3]]), bDz: 0.2, cx: 0.3, inc: 0.08 }),
    // Salta con el brazo estirado para alcanzar los tomates
    salta: (u, x) => ({ bDx: -2.85, bDz: -0.1, bIx: -0.4, cx: -0.35, salto: Math.abs(Math.sin(x * 6.5)) * 0.5 }),
    // Saca algo de una bolsa y lo reparte (brazo adelante y de lado a lado)
    reparte: (u, x) => ({ bDx: -1.35, bDz: Math.sin(x * 3) * 0.4, bIx: -0.9, bIz: -0.3, cx: 0.15 }),
    // Acerca la concha al oído del otro (de frente, a 1 bloque: la mano a la altura de su cabeza)
    oreja: () => ({ bDx: -2.0, bDz: 0.2, cx: -0.05, inc: 0.05 }),
    // Escucha: ladea la cabeza hacia lo que suena
    escucha: (u, x) => ({ cz: 0.18, cx: 0.12, cy: Math.sin(x * 1.5) * 0.1, bIx: -0.3 }),
    // Se tapa los oídos (manos a los lados de la cabeza)
    tapaOidos: (u, x) => ({ bDx: -2.5, bDz: 0.6, bIx: -2.5, bIz: -0.6, cx: 0.2, rz: Math.sin(x * 8) * 0.05 }),
    // Pico al hombro (el Venjy de la mina llega por el túnel)
    alHombro: () => ({ bDx: -2.6, bDz: 0.35, cx: 0 }),
    // Mira hacia arriba con la mano de visera
    miraArriba: (u, x) => ({ cx: -0.45, cy: Math.sin(x * 1.3) * 0.15, bDx: -2.3, bDz: 0.75 }),
    // Grita desde lo alto: manos en la boca
    grita: (u, x) => ({ bDx: -1.9, bDz: 0.55, bIx: -1.9, bIz: -0.55, cx: 0.35, y: Math.abs(Math.sin(x * 8)) * 0.04 }),
    // Se agarra la rodilla y sonríe (le dolió un poquito)
    rodilla: (u, x) => ({ inc: 0.35, pDx: -0.35, pIx: -0.35, y: 0.04, bDx: -0.55, bDz: 0.25, bIx: -0.55, bIz: -0.25, cx: 0.1, rz: Math.sin(x * 6) * 0.04 }),
    // Doblado de risa (como en la bienvenida de Nacho), con temblor de carcajada
    doblaRisa: (u, x) => { const phi = 0.35 + Math.sin(x * 15) * 0.04; return { inc: phi, pDx: -phi, pIx: -phi, y: 0.75 * (1 - Math.cos(phi)), bDx: -0.9 + Math.sin(x * 15) * 0.1, bDz: 0.3, bIx: -0.9 - Math.sin(x * 15) * 0.1, bIz: -0.3, cx: 0.3 }; },
    // Señala lejos al frente (el ping de Lucho), con un pulso chico del brazo
    apunta: (u, x) => ({ bDx: -1.65 + Math.sin(x * 9) * 0.04, bDz: 0, bIx: -0.2, cx: -0.08 }),
    // Camina con el pico al hombro
    caminaPico: (u, x) => { const s = Math.sin(x * 9); return { pDx: s * 0.55, pIx: -s * 0.55, bDx: -2.6, bDz: 0.35, bIx: s * 0.4, bIz: -0.08, y: Math.abs(s) * 0.04 }; },
    // Mira a alguien sin hacer nada (relleno)
    mira: () => ({})
};
