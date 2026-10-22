// =========================================================
// VENJY · Estudio · perillas de la vista simple (B0-V, puro: sin DOM; lo usan vida-simple.mjs, carrera-simple.mjs
// y las pruebas). Una perilla es un selector con palabras comunes («lenta, normal, rápida») que mueve uno o varios
// números del JSON a la vez.
//   { clave, es, en, ruta: ['gata'], campos: ['vel', 'acel'], tipo: 'factor' | 'valor', opciones: [[x, es, en], …],
//     limites?: { campo: [min, max] } }
// `factor` multiplica el valor del juego (base) de cada campo; `valor` pone ese número tal cual. Si el resultado es
// igual al del juego, la clave se borra (queda el valor del código). Un número puesto a mano que no calza con
// ninguna opción se lee como null («a mano»).
// =========================================================
const redondo = x => Math.round(x * 1000) / 1000;
const en = (o, ruta) => ruta.reduce((a, k) => (a && typeof a === 'object' ? a[k] : undefined), o);

export function valorOpcion(p, campo, base, x) {
    let v = p.tipo === 'valor' ? x : redondo(base[campo] * x);
    const l = p.limites && p.limites[campo];
    if (l) v = Math.min(l[1], Math.max(l[0], v));
    return v;
}
// `datos` y `bases` con la misma forma; la perilla vive en `ruta` de los dos
export function leerPerilla(p, datos, bases) {
    const d = en(datos, p.ruta) || {}, b = en(bases, p.ruta);
    const v = c => (c in d ? d[c] : b[c]);
    const op = p.opciones.find(([x]) => p.campos.every(c => v(c) === valorOpcion(p, c, b, x)));
    return op ? op[0] : null;
}
// Pone la opción. `limpiar` (por defecto sí): si un objeto de la ruta queda vacío, se borra (la pestaña Vida lo
// apaga porque sus partes vacías se quedan como {}).
export function ponerPerilla(p, datos, valor, bases, { limpiar = true } = {}) {
    const b = en(bases, p.ruta);
    let d = datos;
    const camino = [datos];
    for (const k of p.ruta) { d[k] = d[k] && typeof d[k] === 'object' ? d[k] : {}; d = d[k]; camino.push(d); }
    for (const c of p.campos) {
        const x = valorOpcion(p, c, b, valor);
        if (x === b[c]) delete d[c]; else d[c] = x;
    }
    if (limpiar) for (let i = p.ruta.length - 1; i >= 0; i--) {
        if (Object.keys(camino[i + 1]).length) break;
        delete camino[i][p.ruta[i]];
    }
    return datos;
}
