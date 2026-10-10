// =========================================================
// VENJY · Cargador de datos del Estudio (mundo/datos/*.json)
// El código es el valor por defecto: sin archivo, con el archivo roto o con ?sin-datos
// se usa todo el código (avisa una vez en consola). Reglas: estudio/DISENO.md §3.
// =========================================================
const TOPE_MS = 3000;
const cache = new Map();
const avisados = new Set();

function avisar(nombre, motivo) {
    if (avisados.has(nombre)) return;
    avisados.add(nombre);
    console.warn(`[datos] ${nombre}.json: ${motivo}`);
}

function sinDatos() {
    try { return new URLSearchParams(location.search).has('sin-datos'); } catch (e) { return false; }
}

// Promesa con el objeto, o null si no está, está roto o la URL trae ?sin-datos.
export function cargarDatos(nombre) {
    if (cache.has(nombre)) return cache.get(nombre);
    const promesa = (async () => {
        if (!/^[a-z][a-z0-9-]*$/.test(nombre) || sinDatos()) return null;
        const corte = new AbortController();
        const reloj = setTimeout(() => corte.abort(), TOPE_MS);
        try {
            const r = await fetch(new URL(`./${nombre}.json`, import.meta.url), { cache: 'no-cache', signal: corte.signal });
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return await r.json();
        } catch (e) {
            avisar(nombre, corte.signal.aborted ? `sin respuesta en ${TOPE_MS / 1000} s` : String((e && e.message) || e));
            return null;
        } finally {
            clearTimeout(reloj);
        }
    })();
    cache.set(nombre, promesa);
    return promesa;
}

const esObjeto = v => v !== null && typeof v === 'object' && !Array.isArray(v);

// Mezcla profunda de objetos simples; los arreglos y los primitivos de `datos` reemplazan.
// Lo que falta en `datos` queda como en `defecto`. No modifica ninguno de los dos.
export function fusionar(defecto, datos) {
    if (datos === undefined || datos === null) return defecto;
    if (!esObjeto(defecto) || !esObjeto(datos)) return datos;
    const salida = { ...defecto };
    for (const k of Object.keys(datos)) salida[k] = fusionar(defecto[k], datos[k]);
    return salida;
}

// Texto por idioma con plantillas {n}: texto({ es: 'Hola {n}', en: 'Hi {n}' }, 'es', { n: 3 })
export function texto(t, idioma, vars) {
    const base = typeof t === 'string' ? t : (t && (t[idioma] || t.es)) || '';
    return vars ? base.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : base;
}
