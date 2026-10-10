// =========================================================
// VENJY · Estudio · evaluador de gestos de poses.json (referencia, sin DOM)
// Misma matemática que escenas-skin.js (valor base + keyframes + senos). Lo usan el CLI `capturar gesto`
// y la prueba de paridad de mundo/tests/estudio.mjs. La fase 6 lo reemplaza por mundo/datos/gestos.js
// (el del juego, sin reservar memoria por cuadro); este queda como referencia legible.
// =========================================================
const FORMAS = { sin: Math.sin, abs: x => Math.abs(Math.sin(x)), pos: x => Math.max(0, Math.sin(x)), neg: x => Math.min(0, Math.sin(x)) };
const suave = u => u * u * (3 - 2 * u);
const tramo = (u, a, b) => Math.max(0, Math.min(1, (u - a) / (b - a)));

function clave(k, t, interp) {
    if (t <= k[0][0]) return k[0][1];
    for (let i = 1; i < k.length; i++) {
        if (t <= k[i][0]) {
            const [t0, v0] = k[i - 1], [t1, v1] = k[i];
            const f = (t - t0) / (t1 - t0);
            return interp === 'paso' ? v0 : v0 + (v1 - v0) * (interp === 'lineal' ? f : suave(f));
        }
    }
    return k[k.length - 1][1];
}

export function evaluarCanal(c, t, u) {
    if (typeof c === 'number') return c;
    let v = c.k ? clave(c.k, t, c.interp) : (c.base || 0);
    for (const o of c.osc || []) v += o.amp * FORMAS[o.forma](t * o.frec + (o.fase || 0)) * (o.env ? tramo(u, o.env[0], o.env[1]) : 1);
    return v;
}

// Canales de un gesto en el instante t (segundos). u = progreso 0..1 (por defecto t / duracion).
export function evaluarGesto(def, t, u = Math.min(1, t / 8)) {
    const salida = {};
    for (const [c, v] of Object.entries(def.canales)) salida[c] = evaluarCanal(v, t, u);
    return salida;
}
