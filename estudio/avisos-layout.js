// =========================================================
// VENJY · Estudio · avisos del layout táctil (botones que se tapan, chicos o fuera de la pantalla)
// Pura: la usan el editor (layout.js, con los rects reales de la vista) y el CLI `capturar layout`
// (con los rects que mide Playwright). Así los dos dicen lo mismo.
// =========================================================
export const MIN_TOQUE = 44; // px: lado mínimo cómodo de un botón táctil

// visibles: [{ clave, r: { left, top, right, bottom, width, height } }]; w, h: tamaño de la pantalla en px.
// Devuelve [{ tipo: 'choque', a, b } | { tipo: 'chico', clave, ancho, alto } | { tipo: 'fuera', clave }].
export function calcularAvisos(visibles, w, h) {
    const avisos = [];
    for (let i = 0; i < visibles.length; i++) {
        const a = visibles[i];
        for (let j = i + 1; j < visibles.length; j++) {
            const b = visibles[j];
            const ancho = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left);
            const alto = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
            if (ancho > 1 && alto > 1) avisos.push({ tipo: 'choque', a: a.clave, b: b.clave });
        }
        if (a.clave !== 'mision' && Math.min(a.r.width, a.r.height) < MIN_TOQUE) {
            avisos.push({ tipo: 'chico', clave: a.clave, ancho: Math.round(a.r.width), alto: Math.round(a.r.height) });
        }
        if (a.r.left < -0.5 || a.r.top < -0.5 || a.r.right > w + 0.5 || a.r.bottom > h + 0.5) avisos.push({ tipo: 'fuera', clave: a.clave });
    }
    return avisos;
}
