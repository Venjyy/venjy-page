// =========================================================
// VENJY · Estudio · pestaña Recetas, parte pura (Etapa B · B6c, estudio/DISENO.md §42)
// La rejilla de 3×3 que ve quien edita (cada casilla: un objeto o varios separados por coma) y cómo se vuelve la
// forma + ingredientes que guarda recetas.json; qué le falta a una receta para que el juego no la ignore; y el aviso
// de que ya hay otra igual en el código. Sin DOM; `calc` trae la búsqueda de ids y de recetas. Lo prueba mundo/tests/estudio-recetas.mjs.
// =========================================================
import { pilaValida } from './tienda-modelo.mjs';

const esObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const nombreOk = n => typeof n === 'string' && /^[a-z][a-z0-9_]*$/.test(n);
const LETRAS = 'ABCDEFGHI';

// «tronco, tronco_pino» -> ['tronco', 'tronco_pino']; una sola -> 'tronco'; vacío -> ''
export function parseCelda(texto) {
    const l = String(texto || '').split(',').map(s => s.trim().toLowerCase().replace(/\s+/g, '_')).filter(Boolean);
    return l.length === 0 ? '' : l.length === 1 ? l[0] : l;
}
export const textoCelda = c => (Array.isArray(c) ? c.join(', ') : c || '');

// Receta con forma -> 9 casillas (fila por fila, 3 de ancho)
export function formaAGrid(r) {
    const g = new Array(9).fill('');
    (r.forma || []).forEach((fila, y) => [...fila].forEach((ch, x) => { if (ch !== ' ' && y < 3 && x < 3) g[y * 3 + x] = (r.ingredientes || {})[ch] || ''; }));
    return g;
}
// 9 casillas -> { forma, ingredientes } recortada a lo que se usa (misma casilla = misma letra); null si está vacía
export function gridAForma(g) {
    const usadas = g.map((c, i) => [c, i]).filter(([c]) => c && (!Array.isArray(c) || c.length));
    if (!usadas.length) return null;
    const x0 = Math.min(...usadas.map(([, i]) => i % 3)), x1 = Math.max(...usadas.map(([, i]) => i % 3));
    const y0 = Math.min(...usadas.map(([, i]) => Math.floor(i / 3))), y1 = Math.max(...usadas.map(([, i]) => Math.floor(i / 3)));
    const letras = new Map(), ingredientes = {}, forma = [];
    for (let y = y0; y <= y1; y++) {
        let fila = '';
        for (let x = x0; x <= x1; x++) {
            const c = g[y * 3 + x];
            if (!c || (Array.isArray(c) && !c.length)) { fila += ' '; continue; }
            const k = JSON.stringify(c);
            if (!letras.has(k)) { const ch = LETRAS[letras.size]; letras.set(k, ch); ingredientes[ch] = c; }
            fila += letras.get(k);
        }
        forma.push(fila);
    }
    return { forma, ingredientes };
}

// Receta vacía de un tipo
export const recetaNueva = tipo => (tipo === 'sin' ? { sin: ['pan', 'pan'], da: ['pan', 1] } : { forma: ['AA', 'AA'], ingredientes: { A: 'pan' }, da: ['pan', 1] });

// Qué le falta para que el juego no la ignore: [es, en] o null
export function faltaDeReceta(r) {
    if (!esObj(r) || !pilaValida(r.da)) return ['Lo que fabrica tiene un objeto o una cantidad que no vale.', 'What it makes has an object or amount that is not valid.'];
    const pedidoOk = p => (Array.isArray(p) ? p.length > 0 && p.length <= 8 && p.every(nombreOk) : nombreOk(p));
    if (r.forma !== undefined) {
        if (!Array.isArray(r.forma) || !r.forma.length || r.forma.length > 3 || !r.forma.every(f => typeof f === 'string' && f.length >= 1 && f.length <= 3)) return ['La rejilla está vacía.', 'The grid is empty.'];
        for (const ch of new Set(r.forma.join('').replace(/ /g, ''))) if (!pedidoOk((r.ingredientes || {})[ch])) return ['Una casilla tiene un objeto que no vale.', 'A cell has an object that is not valid.'];
        return null;
    }
    if (!Array.isArray(r.sin) || !r.sin.length || r.sin.length > 9 || !r.sin.every(pedidoOk)) return ['Falta qué se junta (de 1 a 9 objetos).', 'What gets combined is missing (1 to 9 objects).'];
    return null;
}

// Avisos: [[es, en], …]. calc.idDe(nombre), calc.buscar(rejilla de ids, ancho) -> receta del código o null, calc.nombreDe(id)
export function avisosReceta(r, calc) {
    const falta = faltaDeReceta(r);
    if (falta) return [falta];
    const nombres = r.forma ? Object.values(r.ingredientes) : r.sin;
    if ([r.da[0], ...nombres.flat()].some(n => calc.idDe(n) === undefined)) return [['Hay un objeto que no existe.', 'An object does not exist.']];
    const rejilla = new Array(9).fill(0);
    if (r.forma) r.forma.forEach((f, y) => [...f].forEach((ch, x) => { if (ch !== ' ') rejilla[y * 3 + x] = calc.idDe([].concat(r.ingredientes[ch])[0]); }));
    else r.sin.forEach((p, i) => { rejilla[i] = calc.idDe([].concat(p)[0]); });
    const otra = calc.buscar(rejilla, 3);
    return otra ? [[`Ya hay una receta igual en el juego (hace ${calc.nombreDe(otra.da[0])}): esa gana y esta no se usaría.`, `The game already has an identical recipe (makes ${calc.nombreDe(otra.da[0])}): that one wins and this would never be used.`]] : [];
}

// Lo que se guarda: solo claves del esquema
export function limpiarReceta(r) {
    const o = r.forma !== undefined ? { forma: r.forma, ingredientes: r.ingredientes } : { sin: r.sin };
    o.da = r.da;
    return o;
}
