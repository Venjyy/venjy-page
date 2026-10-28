// =========================================================
// VENJY · Estudio · evaluador de gestos de poses.json (referencia, sin DOM)
// Misma matemática que escenas-skin.js (valor base + keyframes + senos). Lo usan el CLI `capturar gesto`
// y la prueba de paridad de mundo/tests/estudio.mjs. La fase 6 lo reemplaza por mundo/datos/gestos.js
// (el del juego, sin reservar memoria por cuadro); este queda como referencia legible.
// =========================================================
import { gestoBase, espejar } from '../mundo/datos/gestos.js';
const FORMAS = { sin: Math.sin, abs: x => Math.abs(Math.sin(x)), pos: x => Math.max(0, Math.sin(x)), neg: x => Math.min(0, Math.sin(x)) };
const suave = u => u * u * (3 - 2 * u);
const tramo = (u, a, b) => Math.max(0, Math.min(1, (u - a) / (b - a)));

function clave(k, t, interp) {
    if (t <= k[0][0]) return k[0][1];
    for (let i = 1; i < k.length; i++) {
        if (t <= k[i][0]) {
            const [t0, v0, i0] = k[i - 1], [t1, v1] = k[i];
            const f = (t - t0) / (t1 - t0), ip = i0 || interp; // 3.er elemento de la clave: interp del tramo que empieza en ella (§40, decisión 21)
            return ip === 'paso' ? (t < t1 ? v0 : v1) : v0 + (v1 - v0) * (ip === 'lineal' ? f : suave(f));
        }
    }
    return k[k.length - 1][1];
}

// x: reloj de las claves de `en` (DISENO §40, decisión 14); sin x, t
export function evaluarCanal(c, t, u, x = t) {
    if (typeof c === 'number') return c;
    let v = c.k ? clave(c.k, t, c.interp) : (c.base || 0);
    for (const o of c.osc || []) {
        const avance = o.en === undefined || o.en === 't' ? t : o.en === 'u' ? u : clave(o.en.k, x, o.en.interp);
        let s = FORMAS[o.forma](avance * o.frec + (o.fase || 0));
        if (o.pot !== undefined) s = Math.sign(s) * Math.pow(Math.abs(s), o.pot);
        v += o.amp * s * (o.env ? tramo(u, o.env[0], o.env[1]) : 1);
    }
    return v;
}

// Canales de un gesto en el instante t (segundos). u = progreso 0..1 (por defecto t / duracion).
// Con reloj «u» las claves van en 0..1 del tramo (como relojDe de mundo/datos/gestos.js); los osciladores, en t.
// extiende: la base (gestoBase de mundo/datos/gestos.js) va primero y los canales propios encima; apoya: pies en el suelo
export function evaluarGesto(def, t, u = Math.min(1, t / 8)) {
    const salida = {};
    const x = def.reloj === 'u' ? u : t;
    const ex = def.extiende, base = ex && gestoBase(ex.gesto);
    if (base) {
        const m = base(u, ex.reloj !== undefined ? t - ex.reloj : t, {});
        for (const [c, v] of Object.entries(ex.espejo ? espejar(m) : m)) salida[c] = ex.por && ex.por[c] !== undefined ? v * (def.reloj === 'u' && ex.por[c].k ? evaluarCanal({ ...ex.por[c], k: null, base: clave(ex.por[c].k, u, ex.por[c].interp) }, t, u, x) : evaluarCanal(ex.por[c], t, u, x)) : v;
    }
    for (const [c, v] of Object.entries(def.canales)) salida[c] = def.reloj === 'u' && v && v.k ? evaluarCanal({ ...v, k: null, base: clave(v.k, u, v.interp) }, t, u, x) : evaluarCanal(v, t, u, x);
    if (def.apoya) { const i = salida.inc || 0; salida.pDx = -i; salida.pIx = -i; salida.y = 0.75 * (1 - Math.cos(i)); }
    return salida;
}
