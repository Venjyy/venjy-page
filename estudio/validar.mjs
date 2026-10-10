// =========================================================
// VENJY · Estudio · validador de datos (subconjunto de JSON Schema, sin dependencias)
// validar(datos, nombreEsquema) -> ['$.ruta: mensaje', ...]  (vacío = bien)
// Palabras que entiende: las de estudio/esquemas/comun.schema.json.
// =========================================================
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const CARPETA = fileURLToPath(new URL('./esquemas/', import.meta.url));
const cache = new Map();

function esquema(archivo) {
    if (!cache.has(archivo)) cache.set(archivo, JSON.parse(readFileSync(CARPETA + archivo, 'utf8')));
    return cache.get(archivo);
}

// "#/$defs/x" (mismo archivo) o "otro.schema.json#/$defs/x"
function resolver(ref, archivo) {
    const [arch, ruta] = ref.split('#');
    const destino = arch || archivo;
    let nodo = esquema(destino);
    for (const p of (ruta || '').split('/').filter(Boolean)) {
        nodo = nodo && nodo[p];
        if (nodo === undefined) throw new Error(`$ref sin destino: ${ref} (en ${archivo})`);
    }
    return { nodo, archivo: destino };
}

function tipoDe(v) {
    if (v === null) return 'null';
    if (Array.isArray(v)) return 'array';
    return typeof v;
}
const cumpleTipo = (v, t) => (t === 'integer' ? Number.isInteger(v) : t === 'number' ? typeof v === 'number' && Number.isFinite(v) : tipoDe(v) === t);

function revisar(v, s, archivo, ruta, errores) {
    if (s.$ref) {
        const r = resolver(s.$ref, archivo);
        revisar(v, r.nodo, r.archivo, ruta, errores);
    }
    if (s.anyOf) {
        const intentos = s.anyOf.map(sub => { const e = []; revisar(v, sub, archivo, ruta, e); return e; });
        if (!intentos.some(e => !e.length)) {
            errores.push(`${ruta}: no cumple ninguna alternativa (${intentos.map(e => e[0] || '?').join(' | ')})`);
        }
    }
    if (s.type) {
        const tipos = Array.isArray(s.type) ? s.type : [s.type];
        if (!tipos.some(t => cumpleTipo(v, t))) { errores.push(`${ruta}: debe ser ${tipos.join(' o ')}, es ${tipoDe(v)}`); return; }
    }
    if ('const' in s && v !== s.const) errores.push(`${ruta}: debe ser ${JSON.stringify(s.const)}`);
    if (s.enum && !s.enum.includes(v)) errores.push(`${ruta}: ${JSON.stringify(v)} no está en [${s.enum.join(', ')}]`);
    if (typeof v === 'number') {
        if (s.minimum !== undefined && v < s.minimum) errores.push(`${ruta}: ${v} < ${s.minimum}`);
        if (s.maximum !== undefined && v > s.maximum) errores.push(`${ruta}: ${v} > ${s.maximum}`);
    }
    if (typeof v === 'string') {
        if (s.minLength !== undefined && v.length < s.minLength) errores.push(`${ruta}: texto vacío o corto (${v.length} < ${s.minLength})`);
        if (s.maxLength !== undefined && v.length > s.maxLength) errores.push(`${ruta}: texto largo (${v.length} > ${s.maxLength})`);
        if (s.pattern && !new RegExp(s.pattern).test(v)) errores.push(`${ruta}: ${JSON.stringify(v)} no cumple ${s.pattern}`);
    }
    if (Array.isArray(v)) {
        if (s.minItems !== undefined && v.length < s.minItems) errores.push(`${ruta}: ${v.length} elementos < ${s.minItems}`);
        if (s.maxItems !== undefined && v.length > s.maxItems) errores.push(`${ruta}: ${v.length} elementos > ${s.maxItems}`);
        v.forEach((x, i) => {
            const sub = s.prefixItems && i < s.prefixItems.length ? s.prefixItems[i] : s.items;
            if (sub) revisar(x, sub, archivo, `${ruta}[${i}]`, errores);
        });
    } else if (v && typeof v === 'object') {
        const props = s.properties || {};
        for (const k of s.required || []) if (!(k in v)) errores.push(`${ruta}: falta «${k}»`);
        for (const k of Object.keys(v)) {
            const sub = `${ruta}.${k}`;
            if (s.propertyNames) {
                const e = [];
                revisar(k, s.propertyNames, archivo, sub, e);
                if (e.length) { errores.push(`${sub}: nombre de clave no válido`); continue; }
            }
            let usado = false;
            if (k in props) { revisar(v[k], props[k], archivo, sub, errores); usado = true; }
            for (const [pat, ps] of Object.entries(s.patternProperties || {})) {
                if (new RegExp(pat).test(k)) { revisar(v[k], ps, archivo, sub, errores); usado = true; }
            }
            if (usado) continue;
            if (s.additionalProperties === false) errores.push(`${sub}: clave desconocida`);
            else if (s.additionalProperties && typeof s.additionalProperties === 'object') revisar(v[k], s.additionalProperties, archivo, sub, errores);
        }
    }
}

export function validar(datos, nombreEsquema) {
    const errores = [];
    revisar(datos, esquema(`${nombreEsquema}.schema.json`), `${nombreEsquema}.schema.json`, '$', errores);
    return errores;
}
