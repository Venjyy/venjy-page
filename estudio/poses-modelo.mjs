// =========================================================
// VENJY · Estudio · modelo del editor de poses (fase 6, PR 6b)
// Puro: sin DOM, sin red. Lo usa estudio/poses.js y lo prueba Node (mundo/tests/estudio-poses-editor.mjs).
// Trabaja sobre poses.json (estudio/esquemas/poses.schema.json, decisiones en DISENO.md §16-17). Toda operación recibe
// los datos y devuelve { datos, i, cambio }: `datos` es una copia nueva (los de entrada no se tocan), `i` el índice de
// la clave u oscilador que quedó y `cambio` false si nada cambió. Una ruta dice qué se edita:
//   { tipo: 'pose' | 'gesto', clave, variante?: 'sentado' | 'jugador' }  (variante solo en gestos)
// Reglas:
//   - los valores se redondean a 0,001 y los tiempos encajan a 0,05 s (0,01 con reloj u);
//   - una clave nunca pasa a su vecina (se detiene a un paso de ella): el orden de k no se rompe;
//   - un canal que queda sin k ni osc vuelve a ser un número (el archivo queda como lo escribiría una persona);
//   - lo que no se toca no cambia de lugar: mover una clave cambia una línea del JSON.
// =========================================================
import { evaluarGesto } from '../mundo/datos/gestos.js';
import { fk, punto, ajusteSuelo, alturaPie, tobillo } from '../mundo/supervivencia/combate/cinematica.js';

// Los canales del esquema con el rango útil de rig.md (cy, salto y pz no están en su tabla: rango propio). Los últimos 14 son
// los del rig con codos, rodillas y pecho (bloque 8 · N2, COMBATE.md §15.5): su rango es el límite duro de limites.js.
export const CANALES = [
    ['cx', -0.45, 0.5, 'cuello: + mira abajo', 'neck: + looks down'],
    ['cy', -1.1, 1.1, 'cuello: + gira a su izquierda', 'neck: + turns to their left'],
    ['cz', -0.2, 0.2, 'cuello: + ladea a su hombro derecho', 'neck: + tilts to their right shoulder'],
    ['bDx', -2.9, 0.6, 'brazo D: − adelante y arriba', 'right arm: − forward and up'],
    ['bDz', -0.8, 0.9, 'brazo D: + mano al pecho', 'right arm: + hand to chest'],
    ['bIx', -2.9, 0.6, 'brazo I: − adelante y arriba', 'left arm: − forward and up'],
    ['bIz', -0.9, 0.8, 'brazo I: + mano afuera', 'left arm: + hand outwards'],
    ['pDx', -1.6, 0.6, 'pierna D: − adelante', 'right leg: − forward'],
    ['pIx', -1.6, 0.6, 'pierna I: − adelante', 'left leg: − forward'],
    ['inc', -0.2, 0.7, 'cuerpo: + se inclina adelante', 'body: + leans forward'],
    ['rz', -0.15, 0.15, 'cuerpo: ladeo', 'body: tilt'],
    ['y', -0.7, 0.6, 'cuerpo: sube', 'body: up'],
    ['salto', 0, 0.6, 'se suma a y (sentado, 0)', 'added to y (0 when seated)'],
    ['pz', -0.3, 0.6, 'cuerpo: avanza (abrazos)', 'body: forward (hugs)'],
    ['bDy', -1.2, 1.2, 'brazo D: gira sobre su eje', 'right arm: twists on its axis'],
    ['bIy', -1.2, 1.2, 'brazo I: gira sobre su eje', 'left arm: twists on its axis'],
    ['ry', -1.2, 1.2, 'cuerpo: gira entero (caderas y piernas)', 'body: turns whole (hips and legs)'],
    ['codoD', -2.6, 0, 'codo D: − lleva el antebrazo adelante y arriba', 'right elbow: − brings the forearm forward and up'],
    ['codoI', -2.6, 0, 'codo I: − lleva el antebrazo adelante y arriba', 'left elbow: − brings the forearm forward and up'],
    ['rodD', 0, 2.4, 'rodilla D: + lleva la canilla atrás', 'right knee: + brings the shin back'],
    ['rodI', 0, 2.4, 'rodilla I: + lleva la canilla atrás', 'left knee: + brings the shin back'],
    ['pX', -0.35, 0.9, 'pecho: + se inclina adelante (sobre las caderas)', 'chest: + leans forward (over the hips)'],
    ['pY', -0.9, 0.9, 'pecho: + gira a su izquierda', 'chest: + turns to their left'],
    ['pZ', -0.3, 0.3, 'pecho: ladeo', 'chest: tilt'],
    ['pDz', -0.15, 0.5, 'pierna D: + abre hacia afuera', 'right leg: + opens outwards'],
    ['pIz', -0.15, 0.5, 'pierna I: + abre hacia afuera', 'left leg: + opens outwards'],
    ['armaX', -1.6, 1.6, 'arma: giro de la muñeca (adelante/atrás)', 'weapon: wrist turn (forward/back)'],
    ['armaZ', -1.6, 1.6, 'arma: giro de la muñeca (de lado)', 'weapon: wrist turn (sideways)']
];
export const NOMBRES_CANAL = CANALES.map(c => c[0]);
export const RANGO = Object.fromEntries(CANALES.map(([k, a, b]) => [k, [a, b]]));
export const RELOJES = ['t', 'u', 'local'];
export const INTERPS = ['suave', 'lineal', 'paso'];
export const FORMAS = ['sin', 'abs', 'pos', 'neg'];
export const VARIANTES = ['sentado', 'jugador'];
// Neutral de pie (el de crearModelo): lo que vale un canal que la pose no nombra
export const NEUTRAL = { cx: 0, cy: 0, cz: 0, bDx: 0, bDz: 0, bIx: 0, bIz: 0, pDx: 0, pIx: 0, inc: 0, rz: 0, y: 0, salto: 0, pz: 0,
    bDy: 0, bIy: 0, ry: 0, codoD: 0, codoI: 0, rodD: 0, rodI: 0, pX: 0, pY: 0, pZ: 0, pDz: 0, pIz: 0, armaX: 0, armaZ: 0 };
// Sentado en una silla (pose sentadoSilla de rig.md): la base de un gesto en el caso «sentado», como en el juego, donde las
// piernas las pone la animación de la persona sentada y el gesto mueve lo suyo encima
export const SENTADO = { pDx: -1.5, pIx: -1.5 };
// Qué canal mueve cada hueso del muñeco al agarrarlo, por eje (Euler XYZ de Three.js)
export const CANAL_HUESO = {
    cuello: { x: 'cx', y: 'cy', z: 'cz' },
    brazoD: { x: 'bDx', z: 'bDz' },
    brazoI: { x: 'bIx', z: 'bIz' },
    piernaD: { x: 'pDx' },
    piernaI: { x: 'pIx' },
    cuerpo: { x: 'inc', z: 'rz' },
    antebrazoD: { x: 'codoD' },
    antebrazoI: { x: 'codoI' },
    canillaD: { x: 'rodD' },
    canillaI: { x: 'rodI' }
};

const r3 = v => Math.round(v * 1000) / 1000;
const lim = (v, a, b) => Math.max(a, Math.min(b, v));
const clonar = o => JSON.parse(JSON.stringify(o));
const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
export const pasoReloj = def => (def && def.reloj === 'u' ? 0.01 : 0.05);
const encajarA = (v, p) => r3(Math.round(v / p) * p);
const sinCambio = (datos, i = -1) => ({ datos, i, cambio: false });

// ---------- Lectura ----------
export const defDe = (datos, ruta) => (datos && datos[ruta.tipo === 'pose' ? 'poses' : 'gestos'] || {})[ruta.clave];
// Canales de la ruta: los de la pose, los del gesto o los de su variante (solo los que la variante reemplaza)
export function canalesDe(datos, ruta) {
    const def = defDe(datos, ruta);
    if (!def) return null;
    if (ruta.tipo === 'gesto' && ruta.variante) return (def.variantes && def.variantes[ruta.variante]) || {};
    return def.canales || {};
}
export const canalDe = (datos, ruta, c) => { const cs = canalesDe(datos, ruta); return cs ? cs[c] : undefined; };

// Qué es un canal, para el panel: ninguno | fijo | base (+osc) | claves (+osc)
export function tipoCanal(v) {
    if (v === undefined) return 'ninguno';
    if (typeof v === 'number') return 'fijo';
    return v.k ? 'claves' : 'base';
}
// El valor que muestra el slider: el número, la base o la clave elegida (o la primera)
export function valorSlider(v, iClave = -1) {
    if (v === undefined) return 0;
    if (typeof v === 'number') return v;
    if (v.k) return v.k[lim(iClave, 0, v.k.length - 1)][1];
    return v.base || 0;
}
// El rango del slider: el de rig.md, ensanchado si el archivo ya trae algo fuera
export function rangoDe(c, v) {
    let [a, b] = RANGO[c];
    const ver = x => { if (typeof x === 'number') { a = Math.min(a, x); b = Math.max(b, x); } };
    if (typeof v === 'number') ver(v);
    else if (v) { ver(v.base); for (const [, x] of v.k || []) ver(x); }
    return [a, b];
}

// Lista del panel: gestos y poses del JSON, y los de código que el JSON no reemplaza (solo se miran)
//   codigo: Map nombre -> 'skin' | 'amistad' (GESTOS y GESTOS_AMISTAD); moldes: Set de MOLDES (composiciones, se nombran)
export function entradas(datos, codigo = new Map()) {
    const salida = [];
    const gestos = (datos && datos.gestos) || {}, poses = (datos && datos.poses) || {};
    for (const k of Object.keys(gestos)) salida.push({ clave: k, tipo: 'gesto', origen: 'json', reemplaza: codigo.has(k) });
    for (const k of Object.keys(poses)) salida.push({ clave: k, tipo: 'pose', origen: 'json', reemplaza: codigo.has(k) && !gestos[k] });
    for (const [k, firma] of codigo) if (!gestos[k] && !poses[k]) salida.push({ clave: k, tipo: 'codigo', origen: 'codigo', firma });
    return salida;
}

// Los canales del instante (para la vista y para el juego): la pose tal cual; el gesto evaluado en u, t con info {s, j}.
// T: duración de la vista previa (reloj u: t = u·T). Devuelve un objeto nuevo con los 14 canales (los ausentes, neutral).
export function instante(datos, ruta, t, T = 3, info = {}) {
    const def = defDe(datos, ruta);
    const o = { ...NEUTRAL };
    if (!def) return o;
    if (ruta.tipo === 'pose') return Object.assign(o, def.canales);
    if (info.s) Object.assign(o, SENTADO);
    const u = T > 0 ? lim(t / T, 0, 1) : 0;
    return evaluarGesto(def, u, t, { s: !!info.s, j: !!info.j, d: T }, o);
}

// Reloj de las claves en la vista: [desde, hasta] del eje horizontal de la curva
export function rangoReloj(def, T = 3) {
    if (!def || def.reloj === 'u') return [0, 1];
    if (def.ciclo) return [0, def.ciclo];
    let fin = T;
    const ver = cs => { for (const v of Object.values(cs || {})) if (v && v.k) fin = Math.max(fin, v.k[v.k.length - 1][0]); };
    ver(def.canales);
    for (const cs of Object.values(def.variantes || {})) ver(cs);
    return [0, r3(fin)];
}
// Del eje de la curva (x en el reloj de las claves) al reloj de la vista (t en s)
export const tDeX = (def, x, T = 3) => (def && def.reloj === 'u' ? x * T : x);
export const xDeT = (def, t, T = 3) => (def && def.reloj === 'u' ? (T > 0 ? t / T : 0) : t);

// Reloj de las claves en el instante t de la vista (con ciclo, repetido)
export function xActual(def, t, T = 3) {
    let x = def && def.reloj === 'u' ? (T > 0 ? lim(t / T, 0, 1) : 0) : t;
    if (def && def.ciclo) x = ((x % def.ciclo) + def.ciclo) % def.ciclo;
    return x;
}
// Valor de un canal en x sin osciladores (lo que muestra el slider de un canal con claves)
export function valorClaves(v, x) {
    if (typeof v === 'number') return v;
    if (!v) return 0;
    if (!v.k) return v.base || 0;
    return evaluarGesto({ reloj: 'u', canales: { v: { k: v.k, interp: v.interp } } }, x, 0, null, {}).v;
}

// Curva de un canal (n puntos entre x0 y x1, en el reloj de las claves): [[x, valor]]
export function muestras(datos, ruta, c, n = 120, T = 3) {
    const def = defDe(datos, ruta);
    const [x0, x1] = rangoReloj(def, T);
    const salida = [];
    const info = { s: ruta.variante === 'sentado', j: ruta.variante === 'jugador' };
    for (let i = 0; i <= n; i++) {
        const x = x0 + (x1 - x0) * i / n;
        salida.push([x, instante(datos, ruta, tDeX(def, x, T), T, info)[c]]);
    }
    return salida;
}

// ---------- Escritura ----------
// Copia, asegura el contenedor de canales de la ruta y entrega (canales, def) a f. Limpia variantes vacías.
export function editar(datos, ruta, f) {
    if (!defDe(datos, ruta)) return sinCambio(datos);
    const d = clonar(datos);
    const def = defDe(d, ruta);
    let cs;
    if (ruta.tipo === 'gesto' && ruta.variante) {
        def.variantes = def.variantes || {};
        cs = def.variantes[ruta.variante] = def.variantes[ruta.variante] || {};
    } else cs = def.canales = def.canales || {};
    const i = f(cs, def);
    if (def.variantes) {
        for (const v of VARIANTES) if (def.variantes[v] && !Object.keys(def.variantes[v]).length) delete def.variantes[v];
        if (!Object.keys(def.variantes).length) delete def.variantes;
    }
    if (igual(d, datos)) return sinCambio(datos, i === undefined ? -1 : i);
    return { datos: d, i: i === undefined ? -1 : i, cambio: true };
}
// Un canal objeto sin k ni osc ni nota vuelve a ser número
function simplificar(cs, c) {
    const v = cs[c];
    if (!v || typeof v !== 'object') return;
    if (v.osc && !v.osc.length) delete v.osc;
    if (v.interp === 'suave') delete v.interp;
    if (!v.k && !v.osc && !v.nota) cs[c] = r3(v.base || 0);
}

// El slider: pose -> número; gesto -> el número, la base o la clave iClave (por defecto la primera)
export function ponerValor(datos, ruta, c, valor, iClave = -1) {
    if (!NOMBRES_CANAL.includes(c) || !Number.isFinite(valor)) return sinCambio(datos);
    const v = r3(valor);
    return editar(datos, ruta, cs => {
        const a = cs[c];
        if (ruta.tipo === 'pose' || a === undefined || typeof a === 'number') { cs[c] = v; return; }
        if (a.k) { const i = lim(iClave, 0, a.k.length - 1); a.k[i] = [a.k[i][0], v]; return i; }
        a.base = v;
        simplificar(cs, c);
    });
}
export function quitarCanal(datos, ruta, c) {
    return editar(datos, ruta, cs => { delete cs[c]; });
}

// Claves: una nueva en x (si ya hay una en ese tiempo, cambia su valor). Un número o una base pasan a k con ese valor
// en el primer instante, así lo de antes de la clave nueva no cambia.
export function agregarClave(datos, ruta, c, x, valor) {
    const def = defDe(datos, ruta);
    if (!def || ruta.tipo !== 'gesto' || !NOMBRES_CANAL.includes(c)) return sinCambio(datos);
    const p = pasoReloj(def), xe = Math.max(0, encajarA(x, p)), v = r3(valor);
    return editar(datos, ruta, cs => {
        let a = cs[c];
        if (a === undefined || typeof a === 'number') a = cs[c] = { base: a === undefined ? 0 : a };
        if (!a.k) {
            const previo = r3(a.base || 0);
            delete a.base;
            a.k = xe > 0 ? [[0, previo], [xe, v]] : [[0, v]];
            // las claves van primero en el objeto (como en el archivo a mano): k, interp, osc, nota
            const { k, interp, osc, nota } = a;
            for (const kk of Object.keys(a)) delete a[kk];
            Object.assign(a, { k }, interp ? { interp } : {}, osc ? { osc } : {}, nota ? { nota } : {});
            return a.k.length - 1;
        }
        const j = a.k.findIndex(([t]) => Math.abs(t - xe) < p / 2);
        if (j >= 0) { a.k[j] = [a.k[j][0], v]; return j; }
        let i = a.k.findIndex(([t]) => t > xe);
        if (i < 0) i = a.k.length;
        a.k.splice(i, 0, [xe, v]);
        return i;
    });
}
// Arrastre: el tiempo encaja y se detiene a un paso de las vecinas; el valor se redondea
export function moverClave(datos, ruta, c, i, x, valor) {
    const a = canalDe(datos, ruta, c), def = defDe(datos, ruta);
    if (!a || !a.k || !a.k[i]) return sinCambio(datos, i);
    const p = pasoReloj(def);
    const min = i > 0 ? r3(a.k[i - 1][0] + p) : 0;
    const max = i < a.k.length - 1 ? r3(a.k[i + 1][0] - p) : Infinity;
    const xe = r3(lim(encajarA(x, p), min, Math.max(min, max)));
    const v = valor === undefined ? a.k[i][1] : r3(valor);
    return editar(datos, ruta, cs => { cs[c].k[i] = [xe, v]; return i; });
}
// Borrar la última clave deja el canal en su valor (número, o base si tiene osciladores)
export function borrarClave(datos, ruta, c, i) {
    const a = canalDe(datos, ruta, c);
    if (!a || !a.k || !a.k[i]) return sinCambio(datos, i);
    return editar(datos, ruta, cs => {
        const v = cs[c];
        const [, valor] = v.k[i];
        v.k.splice(i, 1);
        if (!v.k.length) {
            delete v.k; delete v.interp;
            const { osc, nota } = v;
            for (const kk of Object.keys(v)) delete v[kk];
            Object.assign(v, { base: valor }, osc ? { osc } : {}, nota ? { nota } : {});
            simplificar(cs, c);
            return -1;
        }
        return Math.min(i, v.k.length - 1);
    });
}
export function cambiarInterp(datos, ruta, c, interp) {
    const a = canalDe(datos, ruta, c);
    if (!a || !a.k || !INTERPS.includes(interp)) return sinCambio(datos);
    return editar(datos, ruta, cs => { if (interp === 'suave') delete cs[c].interp; else cs[c].interp = interp; });
}

// Osciladores: se suman a la base o a las claves
export function agregarOsc(datos, ruta, c, osc = { forma: 'sin', amp: 0.1, frec: 5 }) {
    if (ruta.tipo !== 'gesto' || !NOMBRES_CANAL.includes(c)) return sinCambio(datos);
    return editar(datos, ruta, cs => {
        let a = cs[c];
        if (a === undefined || typeof a === 'number') a = cs[c] = a ? { base: a } : {};
        a.osc = a.osc || [];
        a.osc.push({ ...osc });
        return a.osc.length - 1;
    });
}
// campos: forma, amp, frec, fase (0 o null la quita), env ([a, b] o null la quita)
export function cambiarOsc(datos, ruta, c, i, campos) {
    const a = canalDe(datos, ruta, c);
    if (!a || !a.osc || !a.osc[i]) return sinCambio(datos, i);
    return editar(datos, ruta, cs => {
        const o = cs[c].osc[i];
        const nuevo = {
            forma: FORMAS.includes(campos.forma) ? campos.forma : o.forma,
            amp: Number.isFinite(campos.amp) ? r3(campos.amp) : o.amp,
            frec: Number.isFinite(campos.frec) ? r3(campos.frec) : o.frec
        };
        const fase = 'fase' in campos ? campos.fase : o.fase;
        if (Number.isFinite(fase) && fase !== 0) nuevo.fase = r3(fase);
        const env = 'env' in campos ? campos.env : o.env;
        if (Array.isArray(env) && env.length === 2 && env.every(Number.isFinite)) nuevo.env = [r3(env[0]), r3(env[1])];
        cs[c].osc[i] = nuevo;
        return i;
    });
}
export function borrarOsc(datos, ruta, c, i) {
    const a = canalDe(datos, ruta, c);
    if (!a || !a.osc || !a.osc[i]) return sinCambio(datos, i);
    return editar(datos, ruta, cs => { cs[c].osc.splice(i, 1); simplificar(cs, c); return -1; });
}

// Reloj y ciclo del gesto. Pasar de t a u (o al revés) no reescala las claves: el panel lo avisa.
export function cambiarReloj(datos, clave, reloj) {
    if (!RELOJES.includes(reloj)) return sinCambio(datos);
    return editar(datos, { tipo: 'gesto', clave }, (cs, def) => { def.reloj = reloj; });
}
export function cambiarCiclo(datos, clave, ciclo) {
    return editar(datos, { tipo: 'gesto', clave }, (cs, def) => {
        if (Number.isFinite(ciclo) && ciclo >= 0.05) def.ciclo = r3(ciclo); else delete def.ciclo;
    });
}
export function cambiarNota(datos, ruta, nota) {
    const n = String(nota || '').trim();
    return editar(datos, { ...ruta, variante: null }, (cs, def) => { if (n) def.nota = n; else delete def.nota; });
}

// Grabación (agarrar una extremidad con «Grabar»): las muestras [[x, valor]] (x en el reloj de las claves) reemplazan las
// claves del canal en el tramo grabado; las de antes y después se quedan. Se guarda una clave cada `cada` (0,1 s; 0,03 con
// reloj u) y siempre la última. Un número o una base pasan a claves con su valor en 0.
export function grabarClaves(datos, ruta, c, muestras, cada) {
    const def = defDe(datos, ruta);
    if (!def || ruta.tipo !== 'gesto' || !NOMBRES_CANAL.includes(c) || !muestras || !muestras.length) return sinCambio(datos);
    const p = pasoReloj(def), salto = cada || (def.reloj === 'u' ? 0.03 : 0.1);
    const nuevas = [];
    muestras.forEach(([x, v], i) => {
        const xe = Math.max(0, encajarA(x, p)), ultima = nuevas[nuevas.length - 1];
        if (!ultima || xe - ultima[0] >= salto - 1e-9) nuevas.push([xe, r3(v)]);
        else if (i === muestras.length - 1) { if (xe > ultima[0] + 1e-9) nuevas.push([xe, r3(v)]); else ultima[1] = r3(v); }
    });
    const x0 = nuevas[0][0], x1 = nuevas[nuevas.length - 1][0];
    return editar(datos, ruta, cs => {
        let a = cs[c];
        if (a === undefined || typeof a === 'number') a = cs[c] = { base: a === undefined ? 0 : a };
        const viejas = (a.k || [[0, r3(a.base || 0)]]).filter(([x]) => x < x0 - p / 2 || x > x1 + p / 2);
        const k = [...viejas, ...nuevas].sort((m, n) => m[0] - n[0]);
        const { interp, osc, nota } = a;
        for (const kk of Object.keys(a)) delete a[kk];
        Object.assign(a, { k }, interp ? { interp } : {}, osc ? { osc } : {}, nota ? { nota } : {});
        return k.indexOf(nuevas[0]);
    });
}

// ---------- Entradas ----------
const CLAVE = /^[a-z][a-zA-Z0-9_-]{0,39}$/; // como comun.schema.json#/$defs/clave
export const claveValida = k => typeof k === 'string' && CLAVE.test(k);
// Un nombre libre a partir de base (base, base2, base3…), que no use ni el JSON ni `ocupados` (los gestos del código)
export function claveLibre(datos, base, ocupados = new Set()) {
    const usado = k => ocupados.has(k) || (datos.poses && datos.poses[k]) || (datos.gestos && datos.gestos[k]);
    if (!usado(base)) return base;
    for (let n = 2; ; n++) if (!usado(base + n)) return base + n;
}
// Pose nueva (los canales que se pasen, redondeados; los neutrales no se escriben)
export function nuevaPose(datos, clave, canales = {}) {
    if (!claveValida(clave) || (datos.poses && datos.poses[clave])) return sinCambio(datos);
    const d = clonar(datos);
    d.poses = d.poses || {};
    const cs = {};
    for (const c of NOMBRES_CANAL) if (Number.isFinite(canales[c]) && r3(canales[c]) !== NEUTRAL[c]) cs[c] = r3(canales[c]);
    d.poses[clave] = { canales: cs };
    return { datos: d, i: -1, cambio: true };
}
// Gesto nuevo: reloj u y, si se pasan canales (una pose, un instante), esos valores fijos
export function nuevoGesto(datos, clave, canales = {}) {
    if (!claveValida(clave) || (datos.gestos && datos.gestos[clave])) return sinCambio(datos);
    const d = clonar(datos);
    d.gestos = d.gestos || {};
    const cs = {};
    for (const c of NOMBRES_CANAL) if (Number.isFinite(canales[c]) && r3(canales[c]) !== NEUTRAL[c]) cs[c] = r3(canales[c]);
    d.gestos[clave] = { reloj: 'u', canales: cs };
    return { datos: d, i: -1, cambio: true };
}
export function borrarEntrada(datos, tipo, clave) {
    const grupo = tipo === 'pose' ? 'poses' : 'gestos';
    if (!datos[grupo] || !datos[grupo][clave]) return sinCambio(datos);
    const d = clonar(datos);
    delete d[grupo][clave];
    return { datos: d, i: -1, cambio: true };
}
// Qué entradas cambiaron respecto del archivo: ['gestos.habla', 'poses.nueva', …]
export function cambios(original, datos) {
    const salida = [];
    for (const g of ['poses', 'gestos']) {
        const a = (original && original[g]) || {}, b = (datos && datos[g]) || {};
        for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) if (!igual(a[k], b[k])) salida.push(`${g}.${k}`);
    }
    return salida;
}

// ---------- Medir ----------
// Punta de la mano (la punta del antebrazo, con codo y pecho) en el marco de la persona, con la cinemática del motor de
// combate (la misma jerarquía que crearPersona). lado 'D' | 'I'. Devuelve { adelante, altura, lado } (lado + = a su
// izquierda) en bloques, desde los pies.
export function puntaMano(canales, lado = 'D') {
    const v = { ...NEUTRAL, ...canales };
    const m = fk({ ...v, y: v.y + v.salto });
    const p = punto(lado === 'I' ? m.munecaI : m.munecaD, 0, 0, 0);
    return { adelante: r3(p[2]), altura: r3(p[1]), lado: r3(p[0]) };
}

// Altura de la suela de cada pie (la esquina más baja de su canilla) y cuánto sube o baja el cuerpo el suelo automático
// para que el más bajo toque el suelo. Con `suelo` el cuerpo ya está ajustado: el pie más bajo da 0.
export function medidaPie(canales, suelo = false) {
    const v = { ...NEUTRAL, ...canales };
    const ajuste = ajusteSuelo(v);
    const m = fk({ ...v, y: v.y + v.salto + (suelo ? ajuste : 0) });
    return { D: r3(alturaPie(m, 'D')), I: r3(alturaPie(m, 'I')), ajuste: r3(ajuste) };
}

// ¿Patina un pie en el gesto? Muestrea n cuadros de 0 a T; un pie «apoya» en el cuadro en que su suela está a menos de
// `tol` del suelo (con suelo automático). Su patinaje es lo que se aleja el tobillo, en horizontal, entre dos cuadros
// de apoyo (el máximo de la distancia entre todos los cuadros de apoyo). 0 = quieto como una roca; un pie que nunca
// apoya da null. Devuelve { D, I, apoyoD, apoyoI } (bloques y cuadros de apoyo).
export function patinaje(datos, ruta, T = 3, info = {}, n = 60, tol = 0.02) {
    const pies = { D: [], I: [] };
    for (let i = 0; i <= n; i++) {
        const v = instante(datos, ruta, T * i / n, T, info);
        const m = fk({ ...v, y: v.y + v.salto + ajusteSuelo(v) });
        for (const l of ['D', 'I']) if (alturaPie(m, l) < tol) { const p = tobillo(m, l); pies[l].push([p[0], p[2]]); }
    }
    const medir = ps => {
        if (!ps.length) return null;
        let mx = 0;
        for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) mx = Math.max(mx, Math.hypot(ps[i][0] - ps[j][0], ps[i][1] - ps[j][1]));
        return r3(mx);
    };
    return { D: medir(pies.D), I: medir(pies.I), apoyoD: pies.D.length, apoyoI: pies.I.length };
}
