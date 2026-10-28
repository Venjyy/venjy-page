// =========================================================
// VENJY · Supervivencia · Utilidades de los módulos de codigo-escenas/ (las mismas de escena-amistad.js)
// =========================================================
export const suave = u => u * u * (3 - 2 * u);
export const lim = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, k) => a + (b - a) * k;
export const tramo = (u, a, b) => lim((u - a) / (b - a), 0, 1);
