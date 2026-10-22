// =========================================================
// VENJY · Estudio · vista simple de la pestaña Formas (B0-V, puro: lo usan formas.js y las pruebas)
// En vez de «desde» y «hasta» por eje (6 números por caja, en 1/16 de bloque): ancho, alto y largo de cada caja
// (crece desde su centro; el alto, desde su base) y botones para subirla o bajarla. En General, «sube escalones
// solo» con palabras (perillas.mjs). Una caja es { a: [x, y, z], b: [x, y, z] } con 0 ≤ a < b ≤ 16.
// =========================================================
export { leerPerilla, ponerPerilla } from './perillas.mjs';

export const MEDIDAS = [['ancho', 'ancho', 'width', 0], ['alto', 'alto', 'height', 1], ['largo', 'largo', 'length', 2]];

export const medida = (c, eje) => c.b[eje] - c.a[eje];

// Cambia la medida de un eje: x y z crecen desde el centro; y, desde la base. Siempre dentro del bloque (0-16).
export function conMedida(c, eje, n) {
    n = Math.max(1, Math.min(16, Math.round(n)));
    const a = c.a.slice(), b = c.b.slice();
    if (eje === 1) a[1] = Math.min(a[1], 16 - n);
    else a[eje] = Math.round((c.a[eje] + c.b[eje]) / 2 - n / 2);
    a[eje] = Math.max(0, Math.min(16 - n, a[eje]));
    b[eje] = a[eje] + n;
    return { ...c, a, b };
}
// Sube (d > 0) o baja la caja sin salir del bloque
export function subir(c, d) {
    const x = Math.max(-c.a[1], Math.min(16 - c.b[1], d));
    return { ...c, a: [c.a[0], c.a[1] + x, c.a[2]], b: [c.b[0], c.b[1] + x, c.b[2]] };
}

// General (formas.json en la raíz; base = AJUSTES_BASE del código)
export const PERILLAS = [
    { clave: 'paso', es: 'Sube escalones solo', en: 'Climbs steps by itself', ruta: [], campos: ['paso'], tipo: 'valor',
        opciones: [[0, 'no: hay que saltar', 'no: you jump'], [0.5, 'una losa (medio bloque)', 'a slab (half a block)'], [0.6, 'normal (losas y escalones)', 'normal (slabs and stairs)'], [1, 'un bloque entero', 'a whole block']] }
];

// Vista previa con arrastre (formas.js, pintarVista): dos dibujos de 16×16, «desde arriba» (x a la derecha, z hacia
// abajo: el norte arriba) y «de frente» (x a la derecha, y hacia arriba). En cada uno se arrastra una caja entera
// (mover) o uno de sus bordes (estirar), siempre de a 1/16 y dentro del bloque.
export const VISTAS = [
    { clave: 'arriba', es: 'Desde arriba (norte arriba)', en: 'From above (north up)', ejes: [0, 2] },
    { clave: 'frente', es: 'De frente', en: 'From the front', ejes: [0, 1] }
];
export const BORDE = 0.8; // en 1/16: qué tan cerca de un borde hay que tomar para estirar

// Qué se toma en (u, v) (en 1/16, en los ejes de la vista): { tipo: 'borde', eje, extremo } | { tipo: 'mover' } | null
export function tocar(c, ejes, u, v) {
    const p = [u, v], dentro = (k, m) => p[k] >= c.a[ejes[k]] - m && p[k] <= c.b[ejes[k]] + m;
    if (!dentro(0, BORDE) || !dentro(1, BORDE)) return null;
    for (let k = 0; k < 2; k++) for (const extremo of ['a', 'b']) {
        if (Math.abs(p[k] - c[extremo][ejes[k]]) <= BORDE && dentro(1 - k, 0)) return { tipo: 'borde', eje: ejes[k], extremo };
    }
    return dentro(0, 0) && dentro(1, 0) ? { tipo: 'mover' } : null;
}
// Mueve la caja d[k] (enteros) en los ejes `ejes`, sin salir del bloque
export function moverCaja(c, ejes, d) {
    const a = c.a.slice(), b = c.b.slice();
    ejes.forEach((e, k) => { const x = Math.max(-a[e], Math.min(16 - b[e], Math.round(d[k]))); a[e] += x; b[e] += x; });
    return { ...c, a, b };
}
// Pone un borde en `valor` (entero), dejando al menos 1/16 de caja y dentro del bloque
export function estirarCaja(c, eje, extremo, valor) {
    const a = c.a.slice(), b = c.b.slice(), v = Math.round(valor);
    if (extremo === 'a') a[eje] = Math.max(0, Math.min(b[eje] - 1, v)); else b[eje] = Math.min(16, Math.max(a[eje] + 1, v));
    return { ...c, a, b };
}
