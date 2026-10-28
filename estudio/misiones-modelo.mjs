// =========================================================
// VENJY · Estudio · pestaña Misiones, parte pura (Etapa B · B6b, estudio/DISENO.md §42)
// Misión nueva para partir, id siguiente, qué falta para que el juego no la ignore, y las reglas de mundo/tests/misiones.mjs
// (el kit vale como mucho 1/3 del premio) como avisos. Sin DOM; `calc` trae el cálculo de tienda-valor.js y la búsqueda de ids.
// Lo prueba mundo/tests/estudio-misiones.mjs.
// =========================================================
import { pilaValida } from './tienda-modelo.mjs';

export const TIPOS = [['entregar', 'Entregar objetos', 'Hand in objects'], ['matar', 'Eliminar monstruos', 'Defeat monsters'], ['noche', 'Sobrevivir una noche', 'Survive a night']];
export const MOBS = [['*', 'Cualquiera', 'Any'], ['zombi', 'Zombi', 'Zombie'], ['esqueleto', 'Esqueleto', 'Skeleton'], ['arana', 'Araña', 'Spider'], ['creeper', 'Creeper', 'Creeper'], ['trauco', 'Trauco', 'Trauco'], ['lepisma', 'Lepisma', 'Silverfish']];
export const TEXTOS = [['titulo', 'Título', 'Title'], ['pedido', 'Lo que pide', 'What they ask'], ['aceptar', 'Al aceptar', 'On accepting'], ['completada', 'Al terminar', 'On finishing']];

const esObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const textoOk = x => esObj(x) && typeof x.es === 'string' && x.es.trim() !== '' && typeof x.en === 'string' && x.en.trim() !== '';

// Siguiente id libre de un amigo: pony4 si ya hay pony1..pony3 (en el código o en el archivo)
export function idSiguiente(amigo, usados) {
    let n = 1;
    for (const id of usados) { const m = new RegExp(`^${amigo}(\\d+)$`).exec(id); if (m) n = Math.max(n, Number(m[1]) + 1); }
    return amigo + n;
}

// Misión vacía de un tipo, lista para completar (los textos se escriben después)
export function misionNueva(tipo, amigo) {
    const m = { amigo, tipo, premio: [['esmeralda', 1]], titulo: { es: '', en: '' }, pedido: { es: '', en: '' }, aceptar: { es: '', en: '' }, completada: { es: '', en: '' } };
    if (tipo === 'entregar') m.pide = [['pan', 3]];
    if (tipo === 'matar') { m.mob = 'zombi'; m.n = 5; }
    return m;
}

// Qué le falta para que el juego no la ignore: [es, en] o null si está completa
export function faltaDeMision(m) {
    if (!esObj(m) || !TIPOS.some(t => t[0] === m.tipo)) return ['El tipo no vale.', 'The type is not valid.'];
    for (const [k, es, en] of TEXTOS) if (!textoOk(m[k])) return [`Falta el texto «${es}» en español e inglés.`, `The «${en}» text is missing in Spanish or English.`];
    if (!Array.isArray(m.premio) || !m.premio.length || !m.premio.every(pilaValida)) return ['El premio tiene un objeto o una cantidad que no vale.', 'The reward has an object or amount that is not valid.'];
    if (m.tipo === 'entregar' && (!Array.isArray(m.pide) || !m.pide.length || !m.pide.every(pilaValida))) return ['Lo que pide entregar tiene un objeto o una cantidad que no vale.', 'What it asks for has an object or amount that is not valid.'];
    if (m.tipo === 'matar' && (!MOBS.some(x => x[0] === m.mob) || !Number.isInteger(m.n) || m.n < 1)) return ['Falta qué monstruo y cuántos.', 'Which monster and how many is missing.'];
    for (const k of m.kit || []) if (!pilaValida([k[0], k[1]]) || (k.length === 3 && k[1] !== 1)) return ['El kit tiene un objeto o una cantidad que no vale.', 'The kit has an object or amount that is not valid.'];
    return null;
}

// Avisos de balance: [[es, en], …]
export function avisosMision(m, calc) {
    const av = [];
    const falta = faltaDeMision(m);
    if (falta) av.push(falta);
    if (falta || (m.kit || []).length === 0) return av;
    const ids = [...m.premio, ...m.kit].map(p => calc.idDe(p[0]));
    if (ids.includes(undefined)) return [...av, ['Hay un objeto que no existe.', 'An object does not exist.']];
    const premio = calc.suma(m.premio.map(([n, c]) => [calc.idDe(n), c]));
    const kit = m.kit.reduce((s, [n, c, amigo]) => s + calc.valor(calc.idDe(n)) * c * (amigo ? 0.25 : 1), 0);
    if (!isFinite(premio) || !isFinite(kit)) av.push(['No se sabe cuánto vale el premio o el kit.', 'The worth of the reward or kit is unknown.']);
    else if (kit > premio / 3 + 1e-9) av.push([`El kit vale ${kit.toFixed(1)} y el premio ${premio.toFixed(1)}: que no pase de un tercio.`, `The kit is worth ${kit.toFixed(1)} and the reward ${premio.toFixed(1)}: keep it under a third.`]);
    return av;
}

// Deja lo que se guarda: solo claves del esquema y sin kit vacío
export function limpiarMision(m) {
    const o = { amigo: m.amigo, tipo: m.tipo };
    if (m.tipo === 'entregar') o.pide = m.pide;
    if (m.tipo === 'matar') { o.mob = m.mob; o.n = m.n; if (m.noche) o.noche = true; }
    o.premio = m.premio;
    if (Array.isArray(m.kit) && m.kit.length) o.kit = m.kit;
    for (const [k] of TEXTOS) o[k] = { es: (m[k].es || '').trim(), en: (m[k].en || '').trim() };
    return o;
}
