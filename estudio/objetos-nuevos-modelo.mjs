// =========================================================
// VENJY · Estudio · pestaña Objetos nuevos, parte pura (Etapa B · B6d, estudio/DISENO.md §42)
// Crear un objeto «partiendo de» uno parecido (copia ícono, color, comida… y toma el siguiente id libre, que nunca se
// reusa), la clave que sale del nombre, qué le falta para que el juego no lo ignore y lo que se guarda. Sin DOM: `calc`
// trae lo del juego (los objetos del código y el validador de objetos.js). Lo prueba mundo/tests/estudio-objetos-nuevos.mjs.
// También las reglas de `node estudio/cli.mjs validar objetos`.
// =========================================================
const esObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const CAMPOS = ['id', 'nombre', 'icono', 'color', 'apila', 'comida', 'efecto', 'devuelve', 'combustible', 'encargo'];
export const ID_INICIAL = 1024;

// «Pan de Pascua» -> 'pan_de_pascua' (sin tildes ni signos)
export const claveDeNombre = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^[^a-z]+|_+$/g, '').slice(0, 30);
// Una clave libre a partir de un nombre: ni del código (ocupada(k)) ni del archivo; si choca, suma _2, _3…
export function claveLibre(nombre, datos, ocupada) {
    const base = claveDeNombre(nombre) || 'objeto';
    let k = base, n = 2;
    while (ocupada(k) || (datos.objetos || {})[k]) k = `${base}_${n++}`;
    return k;
}

// Íconos para elegir: uno por `icono` (+ `color`) de los objetos del código, con el nombre de un objeto que lo usa
export function iconosBase(objetosCodigo) {
    const vistos = new Map();
    for (const o of objetosCodigo) {
        if (!o || !o.icono) continue;
        const k = o.icono + (o.color ? '/' + o.color : '');
        if (!vistos.has(k)) vistos.set(k, { valor: k, icono: o.icono, color: o.color || null, ejemplo: o.nombre });
    }
    return [...vistos.values()];
}
export const valorIcono = o => o.icono + (o.color ? '/' + o.color : '');
export function ponerIcono(o, valor) {
    const [icono, color] = String(valor).split('/');
    o.icono = icono;
    if (color) o.color = color; else delete o.color;
}

// Saturación que se calcula sola en la vista simple (pan: 5 -> 6)
export const saturacionDe = h => Math.round(h * 1.2 * 10) / 10;

// Objeto nuevo copiando lo que sirve de `base` (un objeto del código o del archivo, o null); toma siguienteId y lo sube
export function objetoNuevo(datos, base, nombre) {
    const id = Math.max(ID_INICIAL, Number.isInteger(datos.siguienteId) ? datos.siguienteId : 0, ...Object.values(datos.objetos || {}).map(o => (o.id || 0) + 1));
    datos.siguienteId = id + 1;
    const o = { id, nombre: { es: nombre.es || '', en: nombre.en || '' }, icono: (base && base.icono) || 'pan' };
    if (base) {
        if (base.color) o.color = base.color;
        if (base.apila && base.apila !== 64) o.apila = base.apila;
        if (base.comida) o.comida = base.comida.slice();
        if (base.efecto && base.comida) o.efecto = base.efecto;
        if (base.devuelve) o.devuelve = String(base.devuelve).toLowerCase();
        if (base.combustible) o.combustible = base.combustible;
        if (base.encargo) o.encargo = true;
    }
    return o;
}

// Qué le falta para que el juego no lo ignore: [es, en] o null. calc.aceptar(clave, o, claves) es objetoDeDatos del juego
export function faltaDeObjeto(clave, o, datos, calc) {
    if (!esObj(o) || !o.nombre || !String(o.nombre.es || '').trim()) return ['Falta el nombre en español.', 'The Spanish name is missing.'];
    if (!String(o.nombre.en || '').trim()) return ['Falta el nombre en inglés.', 'The English name is missing.'];
    if (calc.ocupada(clave)) return [`El nombre interno «${clave}» ya lo usa un objeto o bloque del juego.`, `The internal name «${clave}» is already used by a game object or block.`];
    const repetido = Object.entries(datos.objetos || {}).find(([k, x]) => k !== clave && x.id === o.id);
    if (repetido) return [`Tiene el mismo número que «${repetido[0]}».`, `It has the same number as «${repetido[0]}».`];
    if (!calc.aceptar(clave, o, Object.keys(datos.objetos || {}))) return ['Hay un valor que el juego no acepta (revisa Avanzado).', 'A value is not accepted by the game (check Advanced).'];
    return null;
}

// Avisos que no impiden guardar: [[es, en], …]. calc.tieneIcono(o) y calc.tieneDibujo(clave)
export function avisosObjeto(clave, o, datos, calc) {
    const falta = faltaDeObjeto(clave, o, datos, calc);
    if (falta) return [falta];
    const av = [];
    if (!calc.tieneIcono(o) && !calc.tieneDibujo(clave)) av.push(['Ese ícono no existe: se verá con el de falta hasta que lo dibujes en Píxeles.', 'That icon does not exist: it will show the missing one until you draw it in Pixels.']);
    if (o.comida && o.comida[0] >= 10) av.push(['Llena mucho (el pan quita 5 y el filete 8).', 'It fills a lot (bread gives 5, steak 8).']);
    return av;
}

// Lo que se guarda: solo claves del esquema, en orden
export function limpiarObjeto(o) {
    const s = {};
    for (const k of CAMPOS) if (o[k] !== undefined && o[k] !== null && o[k] !== false) s[k] = k === 'nombre' ? { es: o.nombre.es.trim(), en: o.nombre.en.trim() } : o[k];
    if (s.apila === 64) delete s.apila;
    if (!s.comida) delete s.efecto;
    return s;
}

// Reglas de `validar objetos` (más allá del esquema): [{ tipo, texto }]. ctx.ocupada(clave), ctx.iconos (Set), ctx.dibujos (Set)
export function reglasObjetos(datos, ctx) {
    const r = [], mal = texto => r.push({ tipo: 'error', texto }), aviso = texto => r.push({ tipo: 'aviso', texto });
    const lista = Object.entries(datos.objetos || {});
    const ids = new Map();
    for (const [k, o] of lista) {
        const p = `$.objetos.${k}`;
        if (ctx.ocupada(k)) mal(`${p}: «${k}» ya es un objeto o bloque del código (el juego lo ignora)`);
        if (ids.has(o.id)) mal(`${p}.id: ${o.id} repetido con «${ids.get(o.id)}»`);
        ids.set(o.id, k);
        if (Number.isInteger(datos.siguienteId) && o.id >= datos.siguienteId) mal(`${p}.id: ${o.id} no es menor que siguienteId (${datos.siguienteId}); un objeto nuevo lo repetiría`);
        if (o.devuelve && !ctx.ocupada(o.devuelve) && !(datos.objetos || {})[o.devuelve]) mal(`${p}.devuelve: no existe el objeto «${o.devuelve}»`);
        if (o.color && ctx.colores && !ctx.colores.has(o.color)) mal(`${p}.color: «${o.color}» no está en COLORES de objetos.js`);
        if (o.efecto && !o.comida) mal(`${p}.efecto: solo sirve con comida`);
        if (!ctx.iconos.has(o.icono) && !ctx.dibujos.has(k)) aviso(`${p}.icono: «${o.icono}» no es un ícono del código ni hay dibujo en iconos.json (se verá el de falta)`);
    }
    return r;
}
