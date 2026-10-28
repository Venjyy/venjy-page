// =========================================================
// VENJY · Estudio · pestaña Tienda, parte pura (Etapa B · B6, estudio/DISENO.md §42)
// Las reglas de precio de mundo/tests/tienda.mjs como avisos para quien edita (la tienda no puede ganarle al crafteo),
// y cómo se limpia lo que se guarda en mundo/datos/tienda.json. Sin DOM; `calc` trae el cálculo de tienda-valor.js
// y la búsqueda de ids de objetos para que este archivo no dependa del juego. Lo prueba mundo/tests/estudio-tienda.mjs.
// =========================================================

export const TEXTOS_CLAVES = [
    ['saludo', 'Al abrir la tienda', 'When the shop opens'],
    ['compraOk', 'Cuando le compras', 'When you buy'],
    ['ventaOk', 'Cuando le vendes', 'When you sell'],
    ['noAlcanza', 'Cuando no te alcanza', 'When you cannot afford it']
];

const esObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const nombreOk = n => typeof n === 'string' && /^[a-z][a-z0-9_]*$/.test(n);

// Avisos de una oferta { da, pide, req? }: [[es, en], …]; vacío = sin problemas
export function avisosOferta(o, calc) {
    const av = [];
    const ids = [...(o.da || []), ...(o.pide || [])].map(p => calc.idDe(p[0]));
    if (!(o.da || []).length || !(o.pide || []).length) av.push(['Falta lo que da o lo que pide.', 'What it gives or asks is missing.']);
    else if (ids.includes(undefined)) av.push(['Hay un objeto que no existe.', 'An object does not exist.']);
    else {
        if (o.da.some(([n]) => o.pide.some(([p]) => p === n))) av.push(['Da y pide lo mismo.', 'It gives and asks for the same thing.']);
        const da = calc.suma(o.da.map(([n, c]) => [calc.idDe(n), c])), pide = calc.suma(o.pide.map(([n, c]) => [calc.idDe(n), c]));
        if (!isFinite(da) || !isFinite(pide)) av.push(['No se sabe cuánto vale: usa objetos del juego con receta o botín conocido.', 'Its worth is unknown: use objects with a known recipe or loot.']);
        else if (pide < da) av.push([`Regala: lo que da vale ${da.toFixed(1)} y lo que pide, ${pide.toFixed(1)}.`, `It gives away value: what it gives is worth ${da.toFixed(1)}, what it asks ${pide.toFixed(1)}.`]);
    }
    return av;
}

// Avisos de lo que te compra { da: [nombre, n], esm }
export function avisosCompra(c, calc) {
    const id = calc.idDe(c.da && c.da[0]);
    if (id === undefined) return [['El objeto no existe.', 'The object does not exist.']];
    const v = c.da[1] * calc.valor(id);
    if (!isFinite(v)) return [['No se sabe cuánto vale ese objeto.', 'Its worth is unknown.']];
    if (c.esm * calc.VAL_ESMERALDA > v) return [[`Paga de más: ${c.esm} esmeraldas por algo que vale ${v.toFixed(1)}.`, `It overpays: ${c.esm} emeralds for something worth ${v.toFixed(1)}.`]];
    return [];
}

// Deja la tienda de una persona sin vacíos; null si no queda nada
export function limpiarTienda(t) {
    if (!esObj(t)) return null;
    const o = {};
    if (esObj(t.textos)) {
        const x = {};
        for (const [k] of TEXTOS_CLAVES) if (esObj(t.textos[k]) && t.textos[k].es && t.textos[k].en) x[k] = { es: t.textos[k].es, en: t.textos[k].en };
        if (Object.keys(x).length) o.textos = x;
    }
    if (Array.isArray(t.ofertas) && t.ofertas.length) o.ofertas = t.ofertas;
    if (Array.isArray(t.compra) && t.compra.length) o.compra = t.compra;
    return Object.keys(o).length ? o : null;
}

// Una oferta o compra vale para guardar si el esquema la acepta (nombres y cantidades)
export const pilaValida = p => Array.isArray(p) && p.length === 2 && nombreOk(p[0]) && Number.isInteger(p[1]) && p[1] >= 1 && p[1] <= 64;
export const ofertaValida = o => esObj(o) && Array.isArray(o.da) && o.da.length > 0 && o.da.every(pilaValida) && Array.isArray(o.pide) && o.pide.length > 0 && o.pide.every(pilaValida);
export const compraValida = c => esObj(c) && pilaValida(c.da) && Number.isInteger(c.esm) && c.esm >= 1 && c.esm <= 64;

// Texto corto de una oferta: «4 bacalao ← 1 esmeralda»
export const resumenPilas = (lista, nombre) => lista.map(([n, c]) => `${c} ${nombre(n)}`).join(' + ');
