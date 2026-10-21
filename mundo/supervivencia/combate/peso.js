// =========================================================
// VENJY · Combate · peso de los golpes (bloque 8 · N5, mundo/COMBATE.md §15.4 y §18)
// Puro: sin Three.js, DOM ni audio. Decide cuánto pesa un golpe y qué reacción le toca; los efectos los dibuja quien
// lo usa (arena/efectos.js, arena/pantalla.js, sonidos.js). Valores: combate.json → peso (por nivel), impacto,
// elegir y sonidos (base en combate/datos.js).
//   nivelDe(def, resultado)               'ligero' | 'medio' | 'fuerte' | 'desvio' | 'perfecto' | 'remate'
//   pesoDe(nivel)                         combate.json → peso.<nivel> (o {})
//   reaccionPara(def, nivel, acc)         la reacción del que recibe: la del ataque (o la de la tabla altura × nivel),
//                                         subida por el nivel y por las leves acumuladas (acc = crearAcumulador())
//   crearAcumulador() / soltarAcumulador(acc)   cuenta las leves seguidas sin defenderse
//   ladoDe(def)                           +1 si el golpe llega por la izquierda del que recibe (lo que dibuja la
//                                         animación), -1 si llega por la derecha (la reacción va en espejo)
//   temblor(c, eje)                       [dx, dz] del que recibe en el cuadro c del hitstop (eje = dirección del golpe)
//   crearSacudida() / sumarTrauma(s, n) / pasoSacudida(s, dt)   sacudida de la cámara por trauma (trauma², ruido suave)
//   crearLenta() / pedirLenta(l, op) / pasoLenta(l, dt)          cámara lenta local: escala del dt de la escena
//   capasSonido(nivel, { material, resultado, aire })            voces del sonido por capas (aire, impacto, cuerpo, cola)
// =========================================================
import { COMBATE } from './datos.js';

const LEVES = new Set(['alto_leve', 'medio_leve', 'bajo_leve']);
export const NIVELES = ['ligero', 'medio', 'fuerte', 'desvio', 'perfecto', 'remate'];

export function nivelDe(def, resultado) {
    if (resultado === 'perfecto') return 'perfecto';
    if (resultado === 'desviado') return 'desvio';
    if (def && def.remate) return 'remate';
    const n = def && def.hitstop;
    return NIVELES.includes(n) ? n : 'ligero';
}
export const pesoDe = nivel => (COMBATE.peso && COMBATE.peso[nivel]) || {};

// ---------- Qué reacción toca (§18) ----------
export const crearAcumulador = () => ({ leves: 0 });
export function soltarAcumulador(acc) { if (acc) acc.leves = 0; }
// acc.enReaccion: el que recibe seguía en una reacción de golpe (las leves solo se acumulan seguidas)
export function reaccionPara(def, nivel, acc = null) {
    const L = COMBATE.elegir || {};
    const altura = (def && def.altura) || 'medio';
    let k = (def && def.reaccion) || (L.tabla && L.tabla[altura] && L.tabla[altura][nivel]) || 'alto_leve';
    const sube = L.subir && L.subir[nivel];
    if (sube && sube[k]) k = sube[k];
    if (acc) {
        if (LEVES.has(k)) {
            acc.leves = acc.enReaccion ? acc.leves + 1 : 1;
            const A = L.acumular || {};
            if (A.leves > 0 && acc.leves >= A.leves && A.a && A.a[k]) { k = A.a[k]; acc.leves = 0; }
        } else acc.leves = 0;
    }
    return k;
}
export const ladoDe = def => (def && def.lado === 'derecha' ? -1 : 1);

// ---------- Temblor del hitstop ----------
// ±amplitud alternando cada `cada` cuadros, en el eje del golpe (sin él el hitstop se lee como un tirón)
export function temblor(c, eje) {
    const T = (COMBATE.impacto && COMBATE.impacto.temblor) || {};
    const a = T.amplitud || 0, cada = Math.max(1, T.cada | 0 || 1);
    const s = Math.floor(c / cada) % 2 ? -a : a;
    return [eje[0] * s, eje[1] * s];
}

// ---------- Sacudida de la cámara (trauma) ----------
// Cada golpe suma trauma (tope 1); la sacudida es trauma² por un ruido suave (suma de senos de frecuencias que no se
// repiten juntas, así que no salta de un cuadro al siguiente) y el trauma baja `baja` por segundo.
export const crearSacudida = () => ({ trauma: 0, t: 0, x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0 });
export function sumarTrauma(s, n) { s.trauma = Math.min(1, s.trauma + Math.max(0, n || 0)); return s; }
const ruido = (t, k) => (Math.sin(t * 1.0 + k * 1.7) + Math.sin(t * 2.31 + k * 4.1) * 0.5 + Math.sin(t * 4.79 + k * 2.3) * 0.25) / 1.75;
export function pasoSacudida(s, dt) {
    const S = (COMBATE.impacto && COMBATE.impacto.sacudida) || {};
    s.trauma = Math.max(0, s.trauma - (S.baja || 0) * dt);
    s.t += dt * (S.frecuencia || 0);
    const k = s.trauma * s.trauma, d = (S.desplazamiento || 0) * k, g = (S.giro || 0) * Math.PI / 180 * k;
    s.x = d * ruido(s.t, 0); s.y = d * ruido(s.t, 1); s.z = d * ruido(s.t, 2);
    s.rx = g * ruido(s.t, 3); s.ry = g * ruido(s.t, 4); s.rz = g * ruido(s.t, 5);
    return s;
}

// ---------- Cámara lenta local ----------
// Gana la más lenta mientras dure; los segundos corren en tiempo real (no en el tiempo lento)
export const crearLenta = () => ({ resta: 0, escala: 1 });
export function pedirLenta(l, op) {
    if (!op || !(op.segundos > 0)) return l;
    if (l.resta <= 0 || op.escala <= l.escala) { l.escala = op.escala; l.resta = Math.max(l.resta, op.segundos); }
    return l;
}
export function pasoLenta(l, dt) {
    if (l.resta <= 0) return 1;
    l.resta -= dt;
    const e = l.escala;
    if (l.resta <= 0) { l.resta = 0; l.escala = 1; }
    return e;
}

// ---------- Sonido por capas ----------
// material: 'carne' | 'metal' | 'madera' (el que recibe en el cuerpo suena a carne; el arma contra el arma, a metal).
// Devuelve una lista de voces con su retardo (las de la cola son ecos más bajos). aire: solo la capa del aire
// (al empezar el activo), con su altura según el nivel.
export function capasSonido(nivel, { material = 'carne', resultado = 'golpeado', aire = false } = {}) {
    const S = COMBATE.sonidos || {}, vol = (S.volumen ?? 1) * ((S.niveles && S.niveles[nivel]) ?? 1);
    const i = Math.max(0, NIVELES.indexOf(nivel)), out = [];
    const poner = (voces, { tono = 1, largo = 1, v = 1, retardo = 0 } = {}) => {
        for (const x of voces || []) {
            const o = { ...x, vol: (x.vol || 0) * vol * v, dur: (x.dur || 0.1) * largo, retardo: (x.retardo || 0) + retardo };
            if (o.tipo === 'tono') { o.f0 = (x.f0 || 440) * tono; o.f1 = (x.f1 || x.f0 || 440) * tono; } else o.frec = (x.frec || 1000) * tono;
            out.push(o);
        }
    };
    if (aire) { poner(S.aire && S.aire.voces, { tono: 1 + ((S.aire && S.aire.subeConNivel) || 0) * Math.min(i, 2) }); return out; }
    const perf = resultado === 'perfecto' ? S.perfecto || {} : null;
    poner(S.impacto && S.impacto[material], { tono: perf ? perf.tono || 1 : 1, largo: perf ? perf.alarga || 1 : 1 });
    if (resultado === 'golpeado') poner(S.cuerpo && S.cuerpo.voces, { tono: 1 - ((S.cuerpo && S.cuerpo.graveConNivel) || 0) * Math.min(i, 2) });
    const C = S.cola || {}, base = out.slice();
    for (let e = 1; e <= (C.ecos | 0); e++) for (const x of base) out.push({ ...x, vol: x.vol * Math.pow(C.caida || 0, e), retardo: x.retardo + (C.retardo || 0) * e });
    return out;
}
