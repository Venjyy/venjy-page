// =========================================================
// VENJY · Estudio · formato estable de mundo/datos/*.json (estudio/DISENO.md §3, regla 4)
// formatear(obj) -> string. Lo usan el servidor y el CLI para que los diffs sean chicos.
//   - 2 espacios de sangría, orden de claves intacto
//   - arreglos de primitivos (o de arreglos de primitivos) en una línea
//   - objeto plano en una línea si la línea completa cabe en 120 columnas
//   - UTF-8, \n y salto final
// =========================================================
const ANCHO = 120;
const prim = v => v === null || typeof v !== 'object';
const sang = n => '  '.repeat(n);
const lineaArr = a => '[' + a.map(v => (Array.isArray(v) ? lineaArr(v) : JSON.stringify(v))).join(', ') + ']';
const soloPrim = a => a.every(v => prim(v) || (Array.isArray(v) && v.every(prim)));

// `ocupado`: columnas que ya gasta la línea antes del valor (sangría y «"clave": »); `cola`: la coma final.
function fmt(v, nivel, ocupado, cola) {
    if (prim(v)) return JSON.stringify(v);
    if (Array.isArray(v)) {
        if (!v.length) return '[]';
        if (soloPrim(v)) return lineaArr(v);
        const filas = v.map((x, i) => sang(nivel + 1) + fmt(x, nivel + 1, (nivel + 1) * 2, i < v.length - 1 ? 1 : 0));
        return '[\n' + filas.join(',\n') + '\n' + sang(nivel) + ']';
    }
    const claves = Object.keys(v);
    if (!claves.length) return '{}';
    if (claves.every(k => prim(v[k]))) {
        const linea = '{ ' + claves.map(k => JSON.stringify(k) + ': ' + JSON.stringify(v[k])).join(', ') + ' }';
        if (ocupado + linea.length + cola <= ANCHO) return linea;
    }
    const filas = claves.map((k, i) => {
        const pre = sang(nivel + 1) + JSON.stringify(k) + ': ';
        return pre + fmt(v[k], nivel + 1, pre.length, i < claves.length - 1 ? 1 : 0);
    });
    return '{\n' + filas.join(',\n') + '\n' + sang(nivel) + '}';
}

export function formatear(obj) {
    return fmt(obj, 0, 0, 0) + '\n';
}
