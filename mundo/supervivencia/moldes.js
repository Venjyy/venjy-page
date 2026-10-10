// =========================================================
// VENJY · Supervivencia · Moldes de movimiento (bloque 6c)
// Piezas reutilizables para las bienvenidas (bienvenidas/<clave>.js), los reencuentros (reencuentros.js) y,
// en 6c-2, las escenas de grupo. Se carga con import() junto con ellas: no suma nada a la carga inicial.
// · MOLDES: los 18 movimientos nuevos del diseño de 6c (agacha, tirita, frota, teclea, maneja, traza,
//   barre, selfie, orejitas, recuerda, mide, empujon, celular, brinda, ping, lanza, cae, sacude) más `ventana`
//   (copiloto con el brazo afuera). Misma firma que GESTOS_AMISTAD: (u, t, info) -> metas de los huesos
//   (nombres cortos de la skill, referencia/rig.md); u = 0..1 en su tramo, t = reloj de la escena,
//   info = { s, otroS, j (es el jugador), esc }.
// · molde(nombre): cualquier molde con esa firma (los nuevos, los de 6b y los de las escenas de skin).
// · fusion(a, b): brazos de a y cuerpo (cabeza, torso, piernas, saltito) de b; seguidos(a, b, corte): a y luego b;
//   desplazar(f, s): corre s segundos un molde que va por reloj de escena (los de 6b: puno, abrazo, secreto);
//   espejo(f): el mismo movimiento con el otro brazo.
// · PIX: dibujos píxel de objetos y efectos (bolsa de papas, celular, visto bueno, polvo, flash, concha...).
// · SONIDOS: efectos sintetizados con Web Audio (mar, foto, ping de enemigo: dos tonos agudos cortos).
// Las pruebas (mundo/tests/amistad.mjs) comprueban que todo molde quede en los rangos de rig.md.
// =========================================================
import { GESTOS } from './escenas-skin.js';
import { GESTOS_AMISTAD } from './escena-amistad-datos.js';
import { ruido, tono } from './sonidos.js';

const suave = u => u * u * (3 - 2 * u);
const lim = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const tramo = (u, a, b) => lim((u - a) / (b - a), 0, 1);
// Ida y vuelta dentro del tramo: 0 al empezar, 1 en el medio, 0 al terminar
const campana = (u, a = 0.2, b = 0.8) => suave(Math.min(tramo(u, 0, a), 1 - tramo(u, b, 1)));
// Interpola entre puntos [x, valor] con suavizado
export const ruta = (x, pts) => {
    if (x <= pts[0][0]) return pts[0][1];
    for (let k = 1; k < pts.length; k++) {
        const [x1, v1] = pts[k];
        if (x <= x1) { const [x0, v0] = pts[k - 1]; return lerp(v0, v1, suave((x - x0) / (x1 - x0))); }
    }
    return pts[pts.length - 1][1];
};
// Doblarse de cintura con las piernas rectas (rig.md: inc inclina también las piernas)
const cintura = phi => ({ inc: phi, pDx: -phi, pIx: -phi, y: 0.75 * (1 - Math.cos(phi)) });

export const MOLDES = {
    // Baja el cuerpo y se inclina (para ponerse a la altura de alguien bajo)
    agacha: u => { const k = campana(u, 0.25, 0.85); return { ...cintura(0.5 * k), cx: 0.3 * k }; },
    // Brazos cruzados con sacudones de frío
    tirita: (u, t) => ({ bDx: -1.05, bDz: 0.85, bIx: -1.05, bIz: -0.85, cx: 0.18, rz: Math.sin(t * 31) * 0.05, cz: Math.sin(t * 23) * 0.06 }),
    // Manos en los hombros del otro y frota (el otro a ~1 bloque)
    frota: (u, t) => ({ bDx: -1.5 + Math.sin(t * 12) * 0.09, bDz: 0.3, bIx: -1.5 - Math.sin(t * 12) * 0.09, bIz: -0.3, cx: 0.1, inc: 0.08 }),
    // Manos abajo y adelante, dedos rápidos sobre un teclado imaginario
    teclea: (u, t) => ({ bDx: -0.95 + Math.sin(t * 28) * 0.05, bDz: 0.3, bIx: -0.95 + Math.sin(t * 28 + 1.6) * 0.05, bIz: -0.3, cx: 0.4, inc: 0.06 }),
    // Manos al volante, que gira un poco
    maneja: (u, t) => { const g = Math.sin(t * 2.2) * 0.14; return { bDx: -1.25 + g * 0.5, bDz: 0.38 + g, bIx: -1.25 - g * 0.5, bIz: -0.38 + g, cx: -0.05 }; },
    // Copiloto: brazo izquierdo afuera por la ventana, el derecho descansando
    ventana: (u, t) => ({ bIx: -0.35 + Math.sin(t * 3) * 0.06, bIz: 0.72, bDx: -0.35, bDz: 0.15, cy: 0.25, cz: -0.05 }),
    // Dibuja en el aire con un dedo (círculos y trazos)
    traza: (u, t) => ({ bDx: -1.9 + Math.sin(t * 4) * 0.28, bDz: 0.1 + Math.cos(t * 4) * 0.3, bIx: -0.2, cx: -0.1 }),
    // Borra con la mano abierta, de un lado a otro
    barre: (u, t) => ({ bDx: -1.65 + Math.sin(t * 14) * 0.05, bDz: Math.sin(t * 7) * 0.6, bIx: -0.2, cx: 0 }),
    // Brazo estirado arriba y a un lado con el celular; la cara mira la pantalla
    selfie: (u, t) => ({ bDx: -2.25, bDz: -0.42 + Math.sin(t * 2) * 0.03, bIx: -0.1, cy: -0.4, cx: -0.18, cz: 0.1 }),
    // Dos dedos tras la cabeza del otro (de lado, con el brazo izquierdo por encima)
    orejitas: (u, t) => ({ bIx: -2.75 + Math.sin(t * 9) * 0.06, bIz: -0.55, bDx: -0.2, rz: -0.08, cy: -0.2 }),
    // Mira arriba con la mano en el mentón
    recuerda: (u, t) => ({ cx: -0.32, cy: 0.3 + Math.sin(t * 0.9) * 0.08, bDx: -1.85, bDz: 0.72, bIx: -0.55, bIz: -0.6 }),
    // Palma plana sobre la cabeza y la desliza hacia el otro (¿quién es más bajo?)
    mide: u => ({ bDx: ruta(u, [[0, -2.9], [0.35, -2.9], [0.7, -2.35], [1, -2.35]]), bDz: 0.12, pz: ruta(u, [[0, 0], [0.35, 0], [0.7, 0.3], [1, 0.3]]), cx: -0.2 }),
    // Empujoncito al hombro del otro
    empujon: u => { const k = Math.sin(tramo(u, 0.15, 0.6) * Math.PI); return { bDx: lerp(-0.4, -1.55, k), bDz: 0.2, inc: 0.12 * k, pz: 0.2 * k, cx: 0.05 }; },
    // Mira el celular con las dos manos y teclea con los pulgares
    celular: (u, t) => ({ bDx: -1.1 + Math.sin(t * 22) * 0.03, bDz: 0.45, bIx: -1.05, bIz: -0.42, cx: 0.45 }),
    // Brindis: levanta algo, lo choca en el medio y lo vuelve a subir
    brinda: u => ({ bDx: ruta(u, [[0, -0.4], [0.3, -2.3], [0.5, -1.75], [0.65, -2.3], [1, -2.3]]), bDz: ruta(u, [[0, 0.1], [0.3, 0.2], [0.5, 0.5], [0.65, 0.2], [1, 0.2]]), cx: -0.15 }),
    // Señala lejos (a su derecha) y gira la cabeza para allá
    ping: (u, t) => ({ bDx: -1.75 + Math.sin(t * 9) * 0.04 * tramo(u, 0.2, 0.3), bDz: -0.35, cy: -0.6, cx: -0.08 }),
    // Lanza algo: el brazo va atrás arriba y baja de golpe hacia adelante
    lanza: u => ({ bDx: ruta(u, [[0, -0.3], [0.45, -2.85], [0.6, -1.0], [1, -0.4]]), bDz: 0.15, inc: ruta(u, [[0, 0], [0.45, -0.1], [0.6, 0.15], [1, 0]]), bIx: -0.6 }),
    // Aterrizaje de superhéroe en tres puntos: rodilla adelante, puño al suelo y el otro brazo atrás
    cae: u => { const k = suave(tramo(u, 0, 0.25)); return { inc: 0.55 * k, pDx: -1.15 * k, pIx: 0.35 * k, y: -0.4 * k, bDx: -0.3 * k, bDz: 0.1, bIx: 0.55 * k, bIz: 0.55 * k, cx: -0.3 * k }; },
    // Se sacude la nieve: palmotea los brazos y menea el cuerpo
    sacude: (u, t) => ({ bDx: -0.4 + Math.sin(t * 24) * 0.3, bDz: 0.65, bIx: -0.4 + Math.sin(t * 24 + 2) * 0.3, bIz: -0.65, rz: Math.sin(t * 17) * 0.1, cx: 0.2 })
};

// Cualquier molde con la firma (u, t, info): nuevo, de 6b o de las escenas de skin (que reciben s y j sueltos)
export function molde(nombre) {
    if (MOLDES[nombre]) return MOLDES[nombre];
    if (GESTOS_AMISTAD[nombre]) return GESTOS_AMISTAD[nombre];
    if (GESTOS[nombre]) return (u, t, i = {}) => GESTOS[nombre](u, t, !!i.s, !!i.j);
    return null;
}
const f = x => (typeof x === 'string' ? molde(x) : x);
const BRAZOS = ['bDx', 'bDz', 'bIx', 'bIz'];
// Brazos de a y cuerpo de b (cabeza, torso, piernas, paso y saltito)
export function fusion(a, b) {
    const A = f(a), Bf = f(b);
    return (u, t, i) => {
        const ma = A(u, t, i), mb = Bf(u, t, i), out = {};
        for (const [k, v] of Object.entries(mb)) if (!BRAZOS.includes(k)) out[k] = v;
        for (const k of BRAZOS) if (ma[k] !== undefined) out[k] = ma[k];
        return out;
    };
}
// a y luego b en el mismo tramo (corte = fracción del tramo para a)
export function seguidos(a, b, corte = 0.5) {
    const A = f(a), Bf = f(b);
    return (u, t, i) => (u < corte ? A(u / corte, t, i) : Bf((u - corte) / (1 - corte), t, i));
}
// Corre s segundos un molde que va por reloj de escena (puno, abrazo y secreto de 6b están escritos para empezar en 0.4)
export const desplazar = (a, s) => { const A = f(a); return (u, t, i) => A(u, t - s, i); };
// El mismo movimiento con el otro brazo (y la cabeza y el torso hacia el otro lado)
export function espejo(a) {
    const A = f(a);
    return (u, t, i) => {
        const m = A(u, t, i), o = { ...m };
        delete o.bDx; delete o.bDz; delete o.bIx; delete o.bIz;
        if (m.bIx !== undefined) o.bDx = m.bIx;
        if (m.bIz !== undefined) o.bDz = -m.bIz;
        if (m.bDx !== undefined) o.bIx = m.bDx;
        if (m.bDz !== undefined) o.bIz = -m.bDz;
        for (const k of ['cy', 'cz', 'rz']) if (m[k] !== undefined) o[k] = -m[k];
        return o;
    };
}
// Suma un desplazamiento fijo a un molde (p. ej. { pz: 0.2 } para dar un paso)
export const con = (a, extra) => { const A = f(a); return (u, t, i) => ({ ...A(u, t, i), ...extra }); };

// ---------------------------------------------------------
// Dibujos píxel (filas + colores) para api.caja / api.sprite / api.efecto
// ---------------------------------------------------------
export const PIX = {
    bolsa: { filas: ['yyyyyyyy', 'yyrrrryy', 'rrrrrrrr', 'ywkwwkwy', 'ywwkkwwy', 'ywwwwwwy', 'yyyyyyyy', 'yyyyyyyy'], colores: { y: '#f2c230', r: '#c62828', w: '#f7e27a', k: '#8a5a1a' } },
    celular: { filas: ['kkkkkk', 'kbbbbk', 'kbccbk', 'kbccbk', 'kbbbbk', 'kbbbbk', 'kbbbbk', 'kkwkkk'], colores: { k: '#1d1d22', b: '#3b8fd9', c: '#a8dcff', w: '#d0d0d0' } },
    visto: { filas: ['.......kk', '......kgk', '.....kggk', 'kk..kggk.', 'kgkkggk..', 'kgggggk..', '.kgggk...', '..kgk....', '...k.....'], colores: { k: '#0f4d12', g: '#3cd24a' } },
    polvo: { filas: ['..aaa...', '.abbbaa.', 'abbbbbba', 'abbbbbba', '.abbbba.', '..aaaa..'], colores: { a: '#9a9384', b: '#c9c2b0' } },
    flash: { filas: ['...a...', '.a.b.a.', '..bbb..', 'abbbbba', '..bbb..', '.a.b.a.', '...a...'], colores: { a: '#fff6c8', b: '#ffffff' } },
    concha: { filas: ['..aaaa..', '.abcbca.', 'abcbcbca', 'abcbcbca', '.abcbca.', '..aaaa..', '...dd...'], colores: { a: '#c98a5a', b: '#f3d2b0', c: '#e8a87c', d: '#a8673f' } },
    nota: { filas: ['...kkk', '...k.k', '...k.k', '...k..', '.kkk..', 'kkkk..', '.kk...'], colores: { k: '#20202a' } },
    trazo: { filas: ['a......', '.a.....', '..a.a..', '...a.a.', '....a..', '.....a.', '......a'], colores: { a: '#ffffff' } },
    gota: { filas: ['.a.', 'aba', 'aba', '.a.'], colores: { a: '#5aa8e8', b: '#c4e6ff' } },
    estrella: { filas: ['...a...', '..aba..', 'abbbbba', '.abbba.', '.ab.ba.', 'a.....a'], colores: { a: '#c99a10', b: '#ffd84a' } }
};

// ---------------------------------------------------------
// Sonidos sintetizados (no hay archivos de audio)
// ---------------------------------------------------------
export const SONIDOS = {
    // Mar en una concha: ruido grave que sube y baja dos veces
    mar() { for (let i = 0; i < 3; i++) ruido({ dur: 1.1, frec: 380 + i * 60, q: 0.5, vol: 0.12, tipo: 'lowpass', retardo: i * 0.7 }); },
    // Obturador y flash de foto
    foto() { ruido({ dur: 0.05, frec: 3200, q: 1.5, vol: 0.18 }); tono({ f0: 2400, f1: 1800, dur: 0.06, vol: 0.05, forma: 'square', retardo: 0.06 }); },
    // Ping de enemigo: dos tonos agudos cortos (parecido al de los juegos de disparos, no el audio original)
    ping() { tono({ f0: 1760, f1: 1700, dur: 0.09, vol: 0.12, forma: 'triangle' }); tono({ f0: 2350, f1: 2250, dur: 0.12, vol: 0.12, forma: 'triangle', retardo: 0.11 }); },
    // Visto bueno: dos notas que suben
    visto() { tono({ f0: 660, f1: 660, dur: 0.1, vol: 0.09, forma: 'triangle' }); tono({ f0: 990, f1: 990, dur: 0.16, vol: 0.09, forma: 'triangle', retardo: 0.1 }); },
    // Aterrizaje con polvo
    polvo() { ruido({ dur: 0.35, frec: 260, q: 0.6, vol: 0.3, tipo: 'lowpass' }); },
    // Cuerda grave (bajo de aire)
    bajo(n = 0) { tono({ f0: [82, 98, 110, 73][n % 4], f1: [80, 96, 108, 72][n % 4], dur: 0.35, vol: 0.12, forma: 'sawtooth' }); },
    // Teclas
    teclas() { for (let i = 0; i < 5; i++) tono({ f0: 1500 + Math.random() * 300, f1: 900, dur: 0.03, vol: 0.04, forma: 'square', retardo: i * 0.07 }); }
};
