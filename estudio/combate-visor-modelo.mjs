// =========================================================
// VENJY · Estudio · modelo puro del visor de la pestaña Combate (bloque 8 · N6b, mundo/COMBATE.md §25.2)
// Sin DOM ni Three.js: lo usan estudio/combate-visor.js, estudio/combate.js y mundo/tests/estudio-combate.mjs.
// El visor muestra la acción elegida con el motor de animación del juego (combate/animacion.js: capas, mezcla, suelo
// automático y pies anclados), así lo que se ve en el Estudio es lo que se ve en la pelea. Dos muñecos: el que hace la
// acción y su rival, que reacciona desde el primer cuadro del golpe con la reacción que le tocaría en el juego.
//   simular(estilo, combate, clave, opciones)  cuadros del bucle: guardia, la acción y guardia otra vez, con la pose y la
//                                              raíz de cada muñeco, la punta del arma y la reacción del rival
//   claveDeCuadro(c, fases) / cuadroDeClave(q, fases)   cuadro absoluto <-> clave de fase ["a"|"g"|"r", fracción]
//   clavesDe(anim, fases)                      las claves de cada canal como puntos sobre la línea de tiempo
//   moverClave / fijarValor / agregarClave / borrarClave   editar una clave (siempre anclada a su fase)
//   muestras(anim, canal, fases, n)            la curva de un canal (como en Poses) para dibujarla
//   puntaArma(pose, raiz, estilo, def)         la punta del arma (o la mano o el pie que golpea) en el mundo
//   cuadrosHoja(fases, n)                      qué cuadros van en la hoja de cuadros (incluye el primero del golpe)
// N6c: el hitstop congela a los dos en el cuadro del golpe (el rival tiembla, temblor de peso.js) y el empuje lo corre
// hacia atrás como en la arena (30 % de lo que falta en cada cuadro, también durante el hitstop); el rival puede tener
// otro estilo (opciones.estiloR). canalesLibres / agregarCanal: un canal nuevo en una animación con claves de fase.
// =========================================================
import { COMBATE, fijarCombate, accionDe, animDe, largoFases, inicioFase, faseEn, NOMBRES_FASES } from '../mundo/supervivencia/combate/datos.js';
import { crearAnimador, animar } from '../mundo/supervivencia/combate/animacion.js';
import { avanceEn } from '../mundo/supervivencia/combate/estados.js';
import { reaccionPara, nivelDe, pesoDe, temblor } from '../mundo/supervivencia/combate/peso.js';
import { fk, punto } from '../mundo/supervivencia/combate/cinematica.js';
import { evaluarGesto } from '../mundo/datos/gestos.js';
import { LIMITES } from '../mundo/datos/limites.js';

export const HZ = 60;
// Cuadros de guardia antes y después de la acción en el bucle del visor (es del Estudio, no del juego)
export const BUCLE = { antes: 18, despues: 24 };
export const LETRA = { anticipacion: 'a', activo: 'g', recuperacion: 'r' };
export const FASE_DE = { a: 'anticipacion', g: 'activo', r: 'recuperacion' };
const r3 = x => Math.round(x * 1000) / 1000;
const acotar = (v, a, b) => (v < a ? a : v > b ? b : v);
// Fracción del empuje que se recorre en cada cuadro (la misma de arena/modelo.js → mover)
export const REPARTO_EMPUJE = 0.3;
const esClaveFase = q => Array.isArray(q) && typeof q[0] === 'string' && q[0] in FASE_DE;

// ---------- Simulación (el motor del juego, cuadro a cuadro) ----------
function peleador() {
    return { estado: 'guardia', def: null, clave: null, c: 0, cambio: { n: 0, mezcla: 0 }, mov: [0, 0], velocidad: 0, ritmo: 1, quieto: false, espejo: false, cargando: false };
}
function poner(p, estado, def, clave, c) {
    if (p.clave !== clave || p.estado !== estado) {
        const m = COMBATE.motor.mezcla;
        p.cambio = { n: p.cambio.n + 1, mezcla: def ? def.mezcla ?? m.normal : m.normal };
    }
    p.estado = estado; p.def = def; p.clave = clave; p.c = c;
}
// Distancia entre los dos: la del alcance (un poco menos, para que conecte) o una de guardia si no es un ataque
export function distancia(def) {
    if (!def || def.tipo !== 'ataque') return 1.8;
    return r3(acotar((def.alcance || 1.5) * 0.85, 1.1, 3));
}
// estilo y combate: los datos tal como están en la pestaña (combate se aplica al motor antes de simular)
// opciones.estiloR: el estilo del rival (su reacción y su animador; sin él, el mismo). opciones.peso: false quita el
// hitstop y el empuje (para mirar la acción sola).
export function simular(estilo, combate, clave, { antes = BUCLE.antes, despues = BUCLE.despues, estiloR = null, peso = true } = {}) {
    if (combate) fijarCombate(combate);
    const def = accionDe(estilo, clave);
    if (!def || !def.fases) return null;
    const eR = estiloR || estilo;
    const f = def.fases, total = largoFases(f);
    const ataque = def.tipo === 'ataque';
    const golpe = ataque && (f.activo || 0) > 0 ? inicioFase(f, 'activo') : null;
    const nivel = golpe !== null ? nivelDe(def) : null;
    const reaccion = golpe !== null ? reaccionPara(def, nivel) : null;
    const rdef = reaccion ? accionDe(eR, reaccion) : null;
    const largoR = rdef && rdef.fases ? largoFases(rdef.fases) : 0;
    // Peso del golpe: hitstop (cuadros congelados) y empuje (bloques que se corre el rival), como en la arena
    const pg = nivel && peso ? pesoDe(nivel) : {};
    const hitstop = rdef ? Math.max(0, Math.round(pg.hitstop || 0)) : 0;
    const empuje = rdef && peso ? (def.empuje != null ? def.empuje : pg.empuje || 0) : 0;
    const dist = distancia(def);
    const zR = (golpe !== null ? avanceEn(def, golpe) : 0) + dist;
    const anA = crearAnimador(estilo), anR = crearAnimador(eR);
    const A = peleador(), R = peleador();
    // con una reacción larga, el bucle espera a que el rival vuelva a la guardia
    const fin = Math.max(total, golpe !== null ? golpe + largoR : 0) + despues;
    // Los pasos del bucle: [c, k] con k = cuadro del hitstop (los dos quietos en el cuadro del golpe) o null
    const pasos = [];
    for (let c = -antes; c < fin; c++) {
        if (c === golpe) for (let k = 0; k < hitstop; k++) pasos.push([c, k]);
        pasos.push([c, null]);
    }
    const cuadros = [];
    let corrido = 0, tras = false;
    pasos.forEach(([c, hs], i) => {
        if (c >= 0 && c < total) poner(A, def.estado, def, clave, c); else poner(A, 'guardia', null, null, 0);
        const rc = rdef && golpe !== null && c >= golpe && c - golpe < largoR ? c - golpe : null;
        if (rc !== null) poner(R, rdef.estado, rdef, reaccion, rc); else poner(R, 'guardia', null, null, 0);
        // el empuje empieza el cuadro que sigue al golpe y se reparte (también durante el hitstop)
        if (golpe !== null && c >= golpe) { if (tras) corrido += (empuje - corrido) * REPARTO_EMPUJE; tras = true; }
        const zA = avanceEn(def, acotar(c, 0, total));
        const tb = hs !== null ? temblor(hs, [0, 1]) : [0, 0];
        const raizA = { x: 0, z: zA, yaw: 0 }, raizR = { x: tb[0], z: zR + corrido + tb[1], yaw: Math.PI };
        const pA = { ...animar(anA, A, { t: i / HZ, raiz: raizA, mirada: 0 }) };
        const pR = { ...animar(anR, R, { t: i / HZ, raiz: raizR, mirada: 0 }) };
        cuadros.push({ c, hs, A: pA, R: pR, raizA, raizR, rc, punta: puntaArma(pA, raizA, estilo, def) });
    });
    return { def, clave, total, antes, golpe, reaccion, nivel, hitstop, empuje: r3(empuje), dist, zR, cuadros };
}
// El cuadro del bucle que corresponde al cuadro c de la acción (desde el golpe, corrido por el hitstop)
export const indiceDe = (sim, c) => {
    const n = Math.round(c);
    return acotar(n + sim.antes + (sim.hitstop && sim.golpe !== null && n > sim.golpe ? sim.hitstop : 0), 0, sim.cuadros.length - 1);
};

// ---------- Punta del arma ----------
// Con arma (estilo.arma.caja, en coordenadas de la muñeca: la hoja sale hacia +Z), su punta; sin arma, la mano o el pie
// que golpea (ataques.<x>.golpea), como la marca de altura de la arena. null si no hay nada que seguir.
export function puntaArma(pose, raiz, estilo, def) {
    const m = fk(pose, raiz);
    const a = estilo && estilo.arma;
    if (a && a.caja) {
        const [cx, cy, cz] = a.caja.centro, d = a.caja.medidas[2];
        return punto(a.mano === 'I' ? m.munecaI : m.munecaD, cx, cy, cz + d / 2);
    }
    const g = def && def.golpea;
    if (g === 'manoD' || g === 'manoI') return punto(g === 'manoI' ? m.munecaI : m.munecaD, 0, 0, 0);
    if (g === 'pieD' || g === 'pieI') return punto(g === 'pieI' ? m.canillaI : m.canillaD, 0, -0.375, 0);
    return null;
}

// ---------- Claves ancladas a la fase ----------
export const cuadroDeClave = (q, fases) => inicioFase(fases, FASE_DE[q[0]]) + q[1] * (fases[FASE_DE[q[0]]] || 0);
// Cuadro absoluto -> [letra, fracción] de la fase donde cae (al final: la última fase con cuadros, al 100 %)
export function claveDeCuadro(c, fases) {
    const total = largoFases(fases);
    c = acotar(c, 0, total);
    if (c >= total) {
        for (const f of [...NOMBRES_FASES].reverse()) if ((fases[f] || 0) > 0) return [LETRA[f], 1];
        return ['a', 0];
    }
    const { fase } = faseEn(fases, c);
    return [LETRA[fase], r3((c - inicioFase(fases, fase)) / fases[fase])];
}
export const usaFases = anim => !!anim && anim.reloj === 'fases' && !!anim.canales;
const claves = (anim, canal) => {
    const v = anim && anim.canales && anim.canales[canal];
    return v && Array.isArray(v.k) && v.k.every(esClaveFase) ? v.k : null;
};
// Canales con claves de fase (los que se ven como puntos)
export const canalesConClaves = anim => (usaFases(anim) ? Object.keys(anim.canales).filter(k => claves(anim, k)) : []);
export function clavesDe(anim, fases) {
    return canalesConClaves(anim).map(canal => ({
        canal, puntos: claves(anim, canal).map((q, i) => ({ i, c: r3(cuadroDeClave(q, fases)), v: q[2], curva: q[3] || null, fase: FASE_DE[q[0]] }))
    }));
}
// Mueve la clave i al cuadro c (sin pasar a sus vecinas: el orden de las claves no cambia) y la ancla a la fase donde cae
export function moverClave(anim, canal, i, c, fases) {
    const k = claves(anim, canal);
    if (!k || !k[i]) return false;
    const lo = i > 0 ? cuadroDeClave(k[i - 1], fases) : 0, hi = i < k.length - 1 ? cuadroDeClave(k[i + 1], fases) : largoFases(fases);
    const [l, u] = claveDeCuadro(acotar(c, lo, hi), fases);
    if (k[i][0] === l && k[i][1] === u) return false;
    k[i][0] = l; k[i][1] = u;
    return true;
}
// El valor de una clave, dentro del límite duro del canal (limites.js)
export function fijarValor(anim, canal, i, v) {
    const k = claves(anim, canal);
    if (!k || !k[i] || !Number.isFinite(v)) return false;
    const lim = LIMITES[canal];
    v = r3(lim ? acotar(v, lim[0], lim[1]) : v);
    if (k[i][2] === v) return false;
    k[i][2] = v;
    return true;
}
// Agrega una clave en el cuadro c (en su lugar según el orden). Devuelve su índice o -1
export function agregarClave(anim, canal, c, v, fases) {
    const k = claves(anim, canal);
    if (!k || !Number.isFinite(c) || !Number.isFinite(v)) return -1;
    const [l, u] = claveDeCuadro(c, fases), lim = LIMITES[canal];
    const q = [l, u, r3(lim ? acotar(v, lim[0], lim[1]) : v)];
    const cq = cuadroDeClave(q, fases);
    let i = k.findIndex(x => cuadroDeClave(x, fases) > cq);
    if (i < 0) i = k.length;
    k.splice(i, 0, q);
    return i;
}
// Borra la clave i (siempre queda al menos una)
export function borrarClave(anim, canal, i) {
    const k = claves(anim, canal);
    if (!k || !k[i] || k.length <= 1) return false;
    k.splice(i, 1);
    return true;
}
// ---------- Canales nuevos ----------
// Los canales de la lista (los de una pose) que esta animación todavía no tiene
export const canalesLibres = (anim, lista) => (usaFases(anim) ? lista.filter(k => !(k in anim.canales)) : []);
// Agrega el canal con dos claves (al empezar y al terminar) en el valor que hoy produce la animación (0 si no lo
// mueve), dentro de su límite. Solo añade: un canal que ya existe no se toca. Devuelve true si lo agregó.
export function agregarCanal(anim, canal, fases) {
    if (!usaFases(anim) || typeof canal !== 'string' || !canal || canal in anim.canales) return false;
    const v0 = valorEn(anim, canal, 0, fases), lim = LIMITES[canal];
    const v = r3(lim ? acotar(Number.isFinite(v0) ? v0 : 0, lim[0], lim[1]) : Number.isFinite(v0) ? v0 : 0);
    const ultima = [...NOMBRES_FASES].reverse().find(f => (fases[f] || 0) > 0) || 'recuperacion';
    anim.canales[canal] = { k: [['a', 0, v], [LETRA[ultima], 1, v]] };
    return true;
}

// Valor del canal en el cuadro c y la curva entera (n puntos de 0 al final), con el mismo evaluador del juego
const tmp = {};
export function valorEn(anim, canal, c, fases) {
    for (const k in tmp) delete tmp[k];
    evaluarGesto(anim, 0, c / HZ, { fases, c }, tmp);
    return tmp[canal];
}
export function muestras(anim, canal, fases, n = 120) {
    const total = largoFases(fases), out = [];
    for (let i = 0; i <= n; i++) { const c = (total * i) / n; out.push([c, valorEn(anim, canal, c, fases)]); }
    return out;
}
// Rango del eje vertical de la curva: el límite del canal o, si no tiene, lo que cubren sus valores
export function rangoCanal(anim, canal, fases) {
    if (LIMITES[canal]) return [LIMITES[canal][0], LIMITES[canal][1]];
    const vs = muestras(anim, canal, fases, 40).map(x => x[1]);
    const a = Math.min(...vs), b = Math.max(...vs);
    return a === b ? [a - 1, b + 1] : [a - (b - a) * 0.15, b + (b - a) * 0.15];
}

// ---------- Hoja de cuadros ----------
// n cuadros repartidos en la acción; siempre el primero, el último y el primero de cada fase (el del golpe sobre todo)
export function cuadrosHoja(fases, n = 8) {
    const total = largoFases(fases);
    if (total <= 0) return [];
    const fijos = new Set([0, total - 1]);
    for (const f of NOMBRES_FASES) if ((fases[f] || 0) > 0) fijos.add(inicioFase(fases, f));
    const lista = [...fijos].filter(c => c >= 0 && c < total);
    for (let i = 1; lista.length < Math.min(n, total) && i < 4 * n; i++) {
        // el hueco más grande, partido por la mitad
        lista.sort((a, b) => a - b);
        let mejor = -1, largo = 1;
        for (let j = 0; j < lista.length - 1; j++) if (lista[j + 1] - lista[j] > largo) { largo = lista[j + 1] - lista[j]; mejor = j; }
        if (mejor < 0) break;
        lista.push(Math.round((lista[mejor] + lista[mejor + 1]) / 2));
    }
    return lista.sort((a, b) => a - b).slice(0, n).map(c => ({ c, fase: faseEn(fases, c).fase }));
}
// La animación de una acción y el archivo donde vive (el estilo o combate.json)
export function animDeAccion(estilo, combate, def, clave) {
    const k = (def && def.anim) || clave;
    if (estilo && estilo.anim && estilo.anim[k]) return { anim: estilo.anim[k], archivo: 'estilo', clave: k };
    if (combate && combate.anim && combate.anim[k]) return { anim: combate.anim[k], archivo: 'combate', clave: k };
    const a = animDe(estilo, k);
    return a ? { anim: a, archivo: null, clave: k } : null;
}
