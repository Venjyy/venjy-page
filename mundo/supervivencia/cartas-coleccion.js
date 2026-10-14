// =========================================================
// VENJY · Supervivencia · Duelo de Cartas: tu colección y tu mazo (etapa A, punto 3, PR 1)
// Lógica pura (sin DOM): qué cartas tiene cada jugador, el mazo que armó y si juega con uno al azar.
// Va en `inventario.cartas` (como las páginas del cuaderno): es por jugador, se guarda con el inventario y
// viaja en cooperativo con el perfil, pensando en el duelo entre 2 jugadores con su propio mazo.
//   inventario.cartas = null (nunca lo tocó: colección inicial y mazo por defecto) o
//                       { c: { id: copias }, m: [ids] | null, z: true|false }  (c = colección, m = mazo, z = al azar)
// Reglas y colección inicial: COLECCION y COLECCION_INICIAL aquí; el dueño las ajusta en el Estudio
// (pestaña Mesa, grupos «Colección y mazo» y «Colección inicial») → mundo/datos/cartas-mesa.json.
// =========================================================
import { CARTAS, MAZOS } from './cartas-datos.js';

// largo y copias = límites del motor (cartas.js no los impone: los cuida el armado)
// azarExtra = cartas de más en la mano inicial con el mazo al azar (idea 4 de los jugadores)
// azarTodas = 1: el mazo al azar sale de todas las cartas; 0: solo de tu colección
// hechizosMin / hechizosMax = cuántos hechizos lleva un mazo al azar
export const COLECCION = { largo: 25, copias: 2, azarExtra: 1, azarTodas: 1, hechizosMin: 4, hechizosMax: 7 };

// Colección con la que parte un jugador: las cartas del mazo de siempre (MAZOS.jugador)
export const COLECCION_INICIAL = (() => {
    const o = {};
    for (const id of MAZOS.jugador) o[id] = (o[id] || 0) + 1;
    return o;
})();

const entero = (v, min, max, base) => (Number.isFinite(v) ? Math.max(min, Math.min(max, Math.round(v))) : base);
export const jugables = () => Object.keys(CARTAS).filter(id => !CARTAS[id].ficha);
const esJugable = id => typeof id === 'string' && CARTAS[id] && !CARTAS[id].ficha;

// Reglas con lo del JSON encima (y dentro de márgenes sanos)
export function reglasDe(datos) {
    const d = (datos && datos.coleccion) || {}, B = COLECCION;
    const R = {
        largo: entero(d.largo, 10, 40, B.largo),
        copias: entero(d.copias, 1, 4, B.copias),
        azarExtra: entero(d.azarExtra, 0, 3, B.azarExtra),
        azarTodas: entero(d.azarTodas, 0, 1, B.azarTodas),
        hechizosMin: entero(d.hechizosMin, 0, 40, B.hechizosMin),
        hechizosMax: entero(d.hechizosMax, 0, 40, B.hechizosMax)
    };
    if (R.hechizosMax < R.hechizosMin) R.hechizosMax = R.hechizosMin;
    return R;
}

export function coleccionInicial(datos) {
    const d = datos && datos.coleccionInicial, o = {};
    const base = d && typeof d === 'object' ? d : COLECCION_INICIAL;
    for (const [id, n] of Object.entries(base)) if (esJugable(id) && Number.isFinite(n) && n >= 1) o[id] = Math.floor(n);
    return o;
}

// Colección del jugador (la inicial si nunca la tocó)
export function coleccionDe(inv, datos) {
    return inv && inv.cartas && inv.cartas.c ? inv.cartas.c : coleccionInicial(datos);
}
const contar = mazo => { const o = {}; for (const id of mazo) o[id] = (o[id] || 0) + 1; return o; };
export const totalColeccion = col => Object.values(col).reduce((s, n) => s + n, 0);

// Cuántas copias de `id` caben en un mazo con esta colección
export const copiasPosibles = (id, col, R) => Math.min(R.copias, col[id] || 0);

// null si el mazo vale; si no, el motivo: 'largo' | 'copias' | 'falta' (no tienes tantas) | 'carta' (no existe o es ficha)
export function motivoMazo(mazo, col, R) {
    if (!Array.isArray(mazo)) return 'largo';
    if (!mazo.every(esJugable)) return 'carta';
    const n = contar(mazo);
    for (const [id, k] of Object.entries(n)) {
        if (k > R.copias) return 'copias';
        if (k > (col[id] || 0)) return 'falta';
    }
    return mazo.length === R.largo ? null : 'largo';
}

// Azar determinista (mulberry32), como el de cartas.js
function generador(semilla) {
    let s = semilla | 0;
    return () => {
        let x = (s = (s + 0x6d2b79f5) | 0);
        x = Math.imul(x ^ (x >>> 15), x | 1);
        x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
        return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
}

// Mazo al azar: `col` = de qué cartas sale (null = todas, con el máximo de copias); `base` = las que ya
// van (rellenar un mazo a medio armar). Respeta largo, copias y el rango de hechizos si se puede.
export function mazoAzar(col, R, semilla = 1, base = []) {
    const rnd = generador(semilla);
    const puede = id => (col ? copiasPosibles(id, col, R) : R.copias);
    const lleva = contar(base), mazo = base.filter(esJugable).slice(0, R.largo);
    const bolsa = tipo => {
        const out = [];
        for (const id of jugables()) if (CARTAS[id].tipo === tipo) for (let k = lleva[id] || 0; k < puede(id); k++) out.push(id);
        for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
        return out;
    };
    const hechizos = bolsa('hechizo'), criaturas = bolsa('criatura');
    const yaH = mazo.filter(id => CARTAS[id].tipo === 'hechizo').length;
    const meta = R.hechizosMin + Math.floor(rnd() * (R.hechizosMax - R.hechizosMin + 1));
    while (mazo.length < R.largo && hechizos.length && mazo.filter(id => CARTAS[id].tipo === 'hechizo').length < Math.max(meta, yaH)) mazo.push(hechizos.pop());
    while (mazo.length < R.largo && criaturas.length) mazo.push(criaturas.pop());
    while (mazo.length < R.largo && hechizos.length) mazo.push(hechizos.pop()); // faltan criaturas: completa con hechizos
    return mazo;
}

// Mazo armado guardado, o el de siempre si vale con tu colección, o uno al azar de tu colección
export function mazoArmado(inv, datos) {
    const R = reglasDe(datos), col = coleccionDe(inv, datos);
    const m = inv && inv.cartas && inv.cartas.m;
    if (m && !motivoMazo(m, col, R)) return m.slice();
    if (!motivoMazo(MAZOS.jugador, col, R)) return MAZOS.jugador.slice();
    return mazoAzar(col, R, 1);
}
export const juegaAlAzar = inv => !!(inv && inv.cartas && inv.cartas.z);

// Lo que usa una partida: { mazo, extra (cartas de más en la mano), azar }
export function mazoParaPartida(inv, datos, semilla = 1) {
    const R = reglasDe(datos);
    if (juegaAlAzar(inv)) {
        const mazo = mazoAzar(R.azarTodas ? null : coleccionDe(inv, datos), R, semilla);
        if (mazo.length === R.largo) return { mazo, extra: R.azarExtra, azar: true };
    }
    return { mazo: mazoArmado(inv, datos), extra: 0, azar: false };
}

// ---- Cambios (todos dejan inventario.cartas creado y avisan con inventario.cambio) ----
function asegurar(inv, datos) {
    if (!inv.cartas) inv.cartas = { c: coleccionInicial(datos), m: null, z: false };
    return inv.cartas;
}
const avisar = inv => { if (inv.cambio) inv.cambio(); };

// Guarda el mazo si vale; devuelve null o el motivo (y no guarda)
export function guardarMazo(inv, mazo, datos) {
    const R = reglasDe(datos), motivo = motivoMazo(mazo, coleccionDe(inv, datos), R);
    if (motivo) return motivo;
    asegurar(inv, datos).m = mazo.slice();
    avisar(inv);
    return null;
}
export function ponerAzar(inv, azar, datos) {
    asegurar(inv, datos).z = !!azar;
    avisar(inv);
}
// Suma cartas a la colección (la tienda de Lucho, premios); devuelve las copias que quedan
export function sumarCarta(inv, id, n = 1, datos) {
    if (!esJugable(id) || !(n >= 1)) return 0;
    const c = asegurar(inv, datos).c;
    c[id] = (c[id] || 0) + Math.floor(n);
    avisar(inv);
    return c[id];
}
