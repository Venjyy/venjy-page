// =========================================================
// VENJY · Estudio · glifos que tiene PixelCraft (estudio/DISENO.md §6, fase 3)
// leerGlifos(rutaTTF) -> [[desde, hasta], ...] con los puntos de código de la tabla `cmap` de la fuente.
// `node estudio/cli.mjs glifos` la lee una vez y guarda estudio/glifos.json; el editor y `validar` solo leen ese JSON.
// Formatos de subtabla que entiende: 0, 4, 6 y 12 (los que traen las fuentes de mapa de bits y TrueType).
// =========================================================
import fs from 'node:fs';

function puntos(b, base) {
    const f = b.readUInt16BE(base);
    const salida = [];
    if (f === 0) {
        for (let c = 0; c < 256; c++) if (b[base + 6 + c]) salida.push(c);
    } else if (f === 4) {
        const segs = b.readUInt16BE(base + 6) / 2;
        const fin = base + 14, ini = fin + segs * 2 + 2, delta = ini + segs * 2, rango = delta + segs * 2;
        for (let i = 0; i < segs; i++) {
            const e = b.readUInt16BE(fin + i * 2), s = b.readUInt16BE(ini + i * 2);
            const d = b.readInt16BE(delta + i * 2), ro = b.readUInt16BE(rango + i * 2);
            for (let c = s; c <= e && c !== 0xffff; c++) {
                let g;
                if (ro === 0) g = (c + d) & 0xffff;
                else {
                    const p = rango + i * 2 + ro + (c - s) * 2;
                    g = p + 2 <= b.length ? b.readUInt16BE(p) : 0;
                    if (g) g = (g + d) & 0xffff;
                }
                if (g) salida.push(c);
            }
        }
    } else if (f === 6) {
        const primero = b.readUInt16BE(base + 6), n = b.readUInt16BE(base + 8);
        for (let i = 0; i < n; i++) if (b.readUInt16BE(base + 10 + i * 2)) salida.push(primero + i);
    } else if (f === 12) {
        const grupos = b.readUInt32BE(base + 12);
        for (let i = 0; i < grupos; i++) {
            const o = base + 16 + i * 12;
            const s = b.readUInt32BE(o), e = b.readUInt32BE(o + 4), g = b.readUInt32BE(o + 8);
            for (let c = s; c <= e; c++) if (g + (c - s)) salida.push(c);
        }
    } else throw new Error(`formato de cmap no soportado: ${f}`);
    return salida;
}

export function leerGlifos(ruta) {
    const b = fs.readFileSync(ruta);
    const nTablas = b.readUInt16BE(4);
    let cmap = null;
    for (let i = 0; i < nTablas; i++) {
        const o = 12 + i * 16;
        if (b.toString('latin1', o, o + 4) === 'cmap') cmap = b.readUInt32BE(o + 8);
    }
    if (cmap === null) throw new Error('la fuente no tiene tabla cmap');
    const n = b.readUInt16BE(cmap + 2);
    const todos = new Set();
    for (let i = 0; i < n; i++) {
        const plataforma = b.readUInt16BE(cmap + 4 + i * 8), codif = b.readUInt16BE(cmap + 6 + i * 8);
        const sub = cmap + b.readUInt32BE(cmap + 8 + i * 8);
        // Unicode (0), Windows Unicode BMP (3,1) y Windows Unicode completo (3,10)
        if (plataforma === 0 || (plataforma === 3 && (codif === 1 || codif === 10))) {
            for (const c of puntos(b, sub)) todos.add(c);
        }
    }
    const orden = [...todos].sort((x, y) => x - y);
    const rangos = [];
    for (const c of orden) {
        const ult = rangos[rangos.length - 1];
        if (ult && c === ult[1] + 1) ult[1] = c; else rangos.push([c, c]);
    }
    return rangos;
}

export function tablaDeRangos(rangos) {
    return { total: rangos.reduce((s, [a, z]) => s + (z - a + 1), 0), rangos };
}
