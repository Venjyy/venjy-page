// =========================================================
// VENJY · Estudio · evaluador de gestos de poses.json (fase 6, PR 6a)
// Puro: sin DOM, sin Three.js. Lo usan el juego (main.js lo conecta; escenas-skin.js y escena-amistad-datos.js
// registran sus tablas), el puente del Estudio (aplica en vivo), el CLI y las pruebas.
// Formato: estudio/esquemas/poses.schema.json. Decisiones: estudio/DISENO.md § «Fase 6».
//   evaluarGesto(def, u, t, info, salida)  canales del gesto en ese instante, escritos en `salida` (sin reservar memoria)
//   funcionGesto(def, firma)               def -> función con la firma de GESTOS ('skin': u, t, s, j) o de GESTOS_AMISTAD
//                                          ('amistad': u, t, info); devuelve siempre el mismo objeto por caso (s, j)
//   registrarGestos(tabla, firma)          el juego entrega GESTOS o GESTOS_AMISTAD; aplicarPoses los reemplaza por nombre
//   aplicarPoses(datos)                    poses.json (o null) -> reemplaza, agrega o devuelve a su código cada gesto
//   gestosDeDatos(datos)                   [[nombre, def]]: los gestos del JSON y las poses fijas como gestos quietos
// Misma matemática que estudio/evaluar.mjs (la referencia legible) y que las funciones del juego: la paridad de los
// gestos de poses.json es exacta (mundo/tests/estudio-poses.mjs). Si un gesto no está en el JSON, se usa el del código.
// Reloj «fases» (bloque 8 · N3, mundo/COMBATE.md §15.3): las animaciones de combate anclan cada clave a una fase del
// ataque, ["a", 0.6, -1.4, "salida"] = en la anticipación, al 60 %, vale −1,4 y llega con la curva «salida» (curvas.js).
// Las fases son a (anticipación), g (golpe o activo) y r (recuperación); info.fases trae sus cuadros y info.c el cuadro
// actual (puede tener decimales). Si el dueño estira una fase, la clave se queda en su porcentaje.
// =========================================================
import { curva } from './curvas.js';
const sin = Math.sin;
const suave = u => u * u * (3 - 2 * u);
const tramo = (u, a, b) => Math.max(0, Math.min(1, (u - a) / (b - a)));
const FORMA = { sin: 0, abs: 1, pos: 2, neg: 3 };

// Valor de las claves k en el instante x (como ruta() de escena-amistad-datos.js: fuera de los extremos, el del extremo)
function clave(k, x, interp) {
    if (x <= k[0][0]) return k[0][1];
    for (let i = 1; i < k.length; i++) {
        if (x <= k[i][0]) {
            // Una clave puede traer un 3.er elemento (suave | lineal | paso) que manda en el tramo que empieza en ella (DISENO §40, decisión 21)
            const t0 = k[i - 1][0], v0 = k[i - 1][1], f = (x - t0) / (k[i][0] - t0), ip = k[i - 1][2] || interp;
            // paso: el valor nuevo vale desde el instante de su clave (floor(t / 0,4) en el instante exacto ya es el siguiente)
            return ip === 'paso' ? (x < k[i][0] ? v0 : k[i][1]) : v0 + (k[i][1] - v0) * (ip === 'lineal' ? f : suave(f));
        }
    }
    return k[k.length - 1][1];
}

// Claves de fase [fase, fracción, valor, curva?] en el cuadro x. ini y largo: cuadro de inicio y largo de cada fase.
export const FASES = { a: 0, g: 1, r: 2 };
const enCuadro = (q, ini, largo) => ini[FASES[q[0]]] + q[1] * largo[FASES[q[0]]];
function claveFases(k, x, ini, largo, interp) {
    let t1 = enCuadro(k[0], ini, largo);
    if (x <= t1) return k[0][2];
    for (let i = 1; i < k.length; i++) {
        const t0 = t1;
        t1 = enCuadro(k[i], ini, largo);
        if (x <= t1) {
            const v0 = k[i - 1][2];
            if (!(t1 > t0)) return k[i][2];
            const f = (x - t0) / (t1 - t0);
            return interp === 'paso' ? v0 : v0 + (k[i][2] - v0) * (interp === 'lineal' && !k[i][3] ? f : curva(k[i][3] || 'suave', f));
        }
    }
    return k[k.length - 1][2];
}

// Un canal: número fijo, o { base | k, interp, osc }. x = reloj de las claves; t = reloj de la escena (osciladores); u = 0..1
// fa: { ini, largo } con el reloj «fases» (claves ancladas a una fase), o null
// Oscilador (DISENO §40, decisión 14): `en` dice con qué avanza la onda: t (por defecto), u o { k, interp } en el reloj x;
// `pot` eleva el resultado conservando el signo (abs con pot 3 = |sen|³).
function canal(c, x, t, u, fa) {
    if (typeof c === 'number') return c;
    let v = c.k ? (fa ? claveFases(c.k, x, fa.ini, fa.largo, c.interp) : clave(c.k, x, c.interp)) : (c.base || 0);
    const osc = c.osc;
    if (osc) for (let i = 0; i < osc.length; i++) {
        const o = osc[i], en = o.en;
        const a = (en === undefined || en === 't' ? t : en === 'u' ? u : clave(en.k, x, en.interp)) * o.frec + (o.fase || 0);
        let s;
        switch (FORMA[o.forma]) {
            case 1: s = Math.abs(sin(a)); break;
            case 2: s = Math.max(0, sin(a)); break;
            case 3: s = Math.min(0, sin(a)); break;
            default: s = sin(a);
        }
        if (o.pot !== undefined) s = s < 0 ? -Math.pow(-s, o.pot) : Math.pow(s, o.pot);
        v += o.amp * s * (o.env ? tramo(u, o.env[0], o.env[1]) : 1);
    }
    return v;
}

// Valor de un canal suelto en el tiempo t (el `yaw` de las escenas, decisión 16): reloj t, sin tramo
export const valorCanal = (c, t) => canal(c, t, t, 0, null);

// El mismo movimiento con el otro brazo (y la cabeza y el torso hacia el otro lado), como espejo() de moldes.js
export function espejar(m) {
    const o = { ...m };
    delete o.bDx; delete o.bDz; delete o.bIx; delete o.bIz;
    if (m.bIx !== undefined) o.bDx = m.bIx;
    if (m.bIz !== undefined) o.bDz = -m.bIz;
    if (m.bDx !== undefined) o.bIx = m.bDx;
    if (m.bDz !== undefined) o.bIz = -m.bDz;
    for (const k of ['cy', 'cz', 'rz']) if (m[k] !== undefined) o[k] = -m[k];
    return o;
}

// ---------------------------------------------------------
// DISENO §40, decisiones 13 y 15: un gesto que parte de otro (`extiende`) y pies apoyados solos (`apoya`).
// La base se busca por nombre como molde() de moldes.js: MOLDES (moldes.js los entrega con registrarMoldes), luego las
// tablas con firma 'amistad' (GESTOS_AMISTAD) y luego las de 'skin' (GESTOS), ya con los de poses.json puestos.
// ---------------------------------------------------------
let moldesExtra = null;
export function registrarMoldes(tabla) { moldesExtra = tabla; }
const envueltos = new WeakMap();
export function gestoBase(nombre) {
    if (moldesExtra && moldesExtra[nombre]) return moldesExtra[nombre];
    for (const firma of ['amistad', 'skin']) for (const r of tablas) {
        const f = r.firma === firma && r.tabla[nombre];
        if (!f) continue;
        if (firma === 'amistad') return f;
        if (!envueltos.has(f)) envueltos.set(f, (u, t, i) => f(u, t, !!(i && i.s), !!(i && i.j)));
        return envueltos.get(f);
    }
    return null;
}
// Pierna de rig.md: con el cuerpo inclinado inc y las piernas rectas, la cadera baja LARGO_PIERNA · (1 − cos inc)
const LARGO_PIERNA = 0.75;
let hondo = 0; // un gesto que se extiende a sí mismo (validar lo marca) no cuelga el juego
// Escribe en o la base de `extiende` (corrida, en espejo y multiplicada por `por`) antes de los canales propios
function escribirBase(ex, x, u, t, info, o) {
    const f = hondo < 8 && gestoBase(ex.gesto);
    if (!f) return;
    hondo++;
    let m;
    try { m = f(u, ex.reloj !== undefined ? t - ex.reloj : t, info || {}); } finally { hondo--; }
    if (ex.espejo) m = espejar(m);
    for (const k in m) o[k] = ex.por && ex.por[k] !== undefined ? m[k] * canal(ex.por[k], x, t, u, null) : m[k];
}
function apoyar(o) {
    const i = o.inc || 0;
    o.pDx = -i; o.pIx = -i; o.y = LARGO_PIERNA * (1 - Math.cos(i));
}

// Listas [nombre, canal] por caso (sentado, jugador): las variantes reemplazan canales. Se arman una vez por def.
const compilados = new WeakMap();
function compilar(def) {
    let c = compilados.get(def);
    if (c) return c;
    const base = def.canales || {}, va = def.variantes || {};
    const lista = (s, j) => {
        const m = { ...base, ...(s ? va.sentado : null), ...(j ? va.jugador : null) };
        return Object.keys(m).map(k => [k, m[k]]);
    };
    c = { casos: [lista(false, false), lista(true, false), lista(false, true), lista(true, true)], reloj: def.reloj || 't', ciclo: def.ciclo || 0, extiende: def.extiende || null, apoya: !!def.apoya };
    compilados.set(def, c);
    return c;
}
const caso = info => (info && info.s ? 1 : 0) + (info && info.j ? 2 : 0);

// Reloj de las claves k: t (escena, como GESTOS_AMISTAD hoy), u (0..1 en el tramo) o local (segundos desde que empieza el
// tramo: hace falta info.d, la duración; sin ella se usa t). Con ciclo, se repite cada `ciclo` segundos.
// fases: el cuadro info.c del ataque (sin ciclo).
function relojDe(c, u, t, info) {
    if (c.reloj === 'fases') return info && Number.isFinite(info.c) ? info.c : 0;
    let x = c.reloj === 'u' ? u : c.reloj === 'local' ? (info && info.d > 0 ? u * info.d : t) : t;
    if (c.ciclo) x = ((x % c.ciclo) + c.ciclo) % c.ciclo;
    return x;
}

// Inicio y largo de cada fase (a, g, r) desde info.fases: { a, g, r } o { anticipacion, activo, recuperacion } en cuadros
const tramoFases = { ini: [0, 0, 0], largo: [0, 0, 0] };
function fasesDe(info) {
    const f = (info && info.fases) || {};
    const a = f.a ?? f.anticipacion ?? 0, g = f.g ?? f.activo ?? 0, r = f.r ?? f.recuperacion ?? 0;
    tramoFases.largo[0] = a; tramoFases.largo[1] = g; tramoFases.largo[2] = r;
    tramoFases.ini[1] = a; tramoFases.ini[2] = a + g;
    return tramoFases;
}

// Escribe en `salida` los canales del gesto (y nada más) y la devuelve. info: { s: sentado, j: es el jugador, d?: duración }.
// Con reloj «fases»: info.fases (cuadros de cada fase) e info.c (cuadro actual).
export function evaluarGesto(def, u, t, info, salida = {}) {
    const c = compilar(def);
    const l = c.casos[caso(info)], x = relojDe(c, u, t, info);
    const fa = c.reloj === 'fases' ? fasesDe(info) : null;
    if (c.extiende) escribirBase(c.extiende, x, u, t, info, salida);
    for (let i = 0; i < l.length; i++) salida[l[i][0]] = canal(l[i][1], x, t, u, fa);
    if (c.apoya) apoyar(salida);
    return salida;
}

// Función con la firma del juego. Un objeto de salida por caso: siempre las mismas claves, sin restos de otro caso.
// El resultado vale hasta la próxima llamada (los motores lo leen enseguida; con, espejo y fusion de moldes.js copian).
export function funcionGesto(def, firma = 'skin') {
    const c = compilar(def);
    const salidas = [{}, {}, {}, {}];
    const info = { s: false, j: false, d: 0 };
    const correr = (u, t, i) => {
        const n = caso(i), l = c.casos[n], o = salidas[n], x = relojDe(c, u, t, i);
        if (c.extiende) escribirBase(c.extiende, x, u, t, i, o);
        for (let k = 0; k < l.length; k++) o[l[k][0]] = canal(l[k][1], x, t, u);
        if (c.apoya) apoyar(o);
        return o;
    };
    if (firma === 'amistad') return (u, t, i) => correr(u, t, i);
    return (u, t, s, j) => { info.s = !!s; info.j = !!j; return correr(u, t, info); };
}

// Los gestos del JSON y, si su nombre no lo usa un gesto, cada pose fija como gesto quieto (sirve en las pistas de escenas)
export function gestosDeDatos(datos) {
    const salida = [];
    if (!datos || typeof datos !== 'object') return salida;
    const gestos = datos.gestos && typeof datos.gestos === 'object' ? datos.gestos : {};
    for (const [k, def] of Object.entries(gestos)) if (def && typeof def.canales === 'object') salida.push([k, def]);
    for (const [k, p] of Object.entries(datos.poses || {})) {
        if (!Object.prototype.hasOwnProperty.call(gestos, k) && p && typeof p.canales === 'object') salida.push([k, { reloj: 't', canales: p.canales }]);
    }
    return salida;
}

// ---------------------------------------------------------
// Conexión con el juego: las tablas de gestos se registran al importarse y aplicarPoses las cambia en el lugar.
// Un nombre que ya existe se reemplaza en su tabla (GESTOS_AMISTAD gana a GESTOS en escena-amistad.js, igual que hoy);
// uno nuevo va a la tabla principal (GESTOS: la que miran las escenas de skin, «Hablar», la vida de los amigos y,
// al final, las escenas de amistad y los moldes). Al cambiar los datos, lo que ya no está vuelve a su código.
// ---------------------------------------------------------
const tablas = [];
let datosActuales = null;

export function registrarGestos(tabla, firma, { principal = false } = {}) {
    if (tablas.some(r => r.tabla === tabla)) return;
    tablas.push({ tabla, firma, principal, base: new Set(Object.keys(tabla)), originales: new Map(), puestos: new Set() });
    if (datosActuales) aplicarPoses(datosActuales);
}

// Devuelve { reemplazados: [...], nuevos: [...] } (para el puente y las pruebas)
export function aplicarPoses(datos) {
    datosActuales = datos || null;
    const lista = gestosDeDatos(datosActuales);
    const enCodigo = new Set();
    for (const r of tablas) for (const k of r.base) enCodigo.add(k);
    const reemplazados = new Set(), nuevos = new Set();
    for (const r of tablas) {
        // Primero todo vuelve a su código
        for (const k of r.puestos) {
            if (r.originales.has(k)) r.tabla[k] = r.originales.get(k);
            else delete r.tabla[k];
        }
        r.puestos.clear();
        for (const [k, def] of lista) {
            const existe = r.base.has(k);
            if (!existe && !(r.principal && !enCodigo.has(k))) continue;
            let f;
            try { f = funcionGesto(def, r.firma); } catch (e) { console.warn(`[datos] poses.json: el gesto «${k}» no se pudo leer`, e); continue; }
            if (existe && !r.originales.has(k)) r.originales.set(k, r.tabla[k]);
            r.tabla[k] = f;
            r.puestos.add(k);
            (existe ? reemplazados : nuevos).add(k);
        }
    }
    return { reemplazados: [...reemplazados], nuevos: [...nuevos] };
}

// Reglas que el esquema no expresa -> [{ tipo: 'error' | 'aviso', texto }]. codigo: Set con los nombres de GESTOS y
// GESTOS_AMISTAD (una pose con uno de esos nombres reemplazaría al gesto); moldes: los de MOLDES (tapan al JSON en «guion»).
export function reglasPoses(datos, { codigo, moldes } = {}) {
    const salida = [];
    const mal = texto => salida.push({ tipo: 'error', texto });
    const aviso = texto => salida.push({ tipo: 'aviso', texto });
    const revisarCanal = (ruta, c) => {
        if (typeof c !== 'object' || !c) return;
        if (c.k) for (let i = 1; i < c.k.length; i++) if (!(c.k[i][0] > c.k[i - 1][0])) mal(`${ruta}.k[${i}]: el tiempo ${c.k[i][0]} tiene que ser mayor que el anterior (${c.k[i - 1][0]})`);
        if (c.k && c.base !== undefined) aviso(`${ruta}.base: con k, base no se usa`);
        (c.osc || []).forEach((o, i) => { if (o.env && !(o.env[1] > o.env[0])) mal(`${ruta}.osc[${i}].env: ${o.env[0]} tiene que ser menor que ${o.env[1]}`); });
    };
    for (const [k, g] of Object.entries((datos && datos.gestos) || {})) {
        const donde = `$.gestos.${k}`;
        for (const [c, v] of Object.entries(g.canales || {})) revisarCanal(`${donde}.canales.${c}`, v);
        for (const [n, cs] of Object.entries(g.variantes || {})) for (const [c, v] of Object.entries(cs || {})) revisarCanal(`${donde}.variantes.${n}.${c}`, v);
        if (g.reloj === 'local') aviso(`${donde}.reloj: «local» necesita la duración del tramo y los motores de hoy no la pasan; el juego usa t (mejor u o t)`);
        if (moldes && moldes.has(k)) aviso(`${donde}: MOLDES (moldes.js) tiene un molde con el mismo nombre; en las escenas «guion» gana el molde`);
        // extiende (DISENO §40, decisión 13): la base existe y no vuelve a este gesto
        if (g.extiende) {
            const b = g.extiende.gesto, gs = datos.gestos;
            if ((codigo || moldes) && !(gs[b] || (codigo && codigo.has(b)) || (moldes && moldes.has(b)))) mal(`${donde}.extiende.gesto: «${b}» no es un gesto`);
            for (let n = b, i = 0; n && i < 9; n = gs[n] && gs[n].extiende && gs[n].extiende.gesto, i++) if (n === k) { mal(`${donde}.extiende: vuelve a sí mismo (${b})`); break; }
            for (const [c, v] of Object.entries(g.extiende.por || {})) revisarCanal(`${donde}.extiende.por.${c}`, v);
        }
    }
    for (const k of Object.keys((datos && datos.poses) || {})) {
        if (datos.gestos && Object.prototype.hasOwnProperty.call(datos.gestos, k)) aviso(`$.poses.${k}: hay un gesto con el mismo nombre; en las pistas vale el gesto`);
        else if (codigo && codigo.has(k)) aviso(`$.poses.${k}: el juego tiene un gesto «${k}»; esta pose quieta lo reemplaza`);
    }
    return salida;
}
