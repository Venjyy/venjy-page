// =========================================================
// VENJY · Estudio · modelo puro de la pestaña Combate (bloque 8 · N6a, mundo/COMBATE.md §25.2)
// Sin DOM: lo usan estudio/combate.js y mundo/tests/estudio-combate.mjs. Edita en el lugar los ataques, acciones y
// reacciones de estilo-*.json (y las reacciones comunes de combate.json), siempre con marcas ancladas a la fase
// («activo+2»): si el dueño estira una fase, las ventanas y las claves de la animación la siguen solas.
//   accionesDe(estilo, combate)         grupos de la lista de la izquierda: [{ grupo, archivo, claves }]
//   defDe(datos, grupo, clave)          el objeto que se edita (null si no está)
//   estirarFase(def, fase, cuadros)     cambia el largo de una fase (con su mínimo y máximo)
//   escalarFases(def, factor, base)     la «rapidez» de la vista simple: las tres fases × factor sobre las de base
//   aMarca(c, fases)                    cuadro absoluto -> marca de la fase donde cae («fin» al final)
//   barrasDe(def)                       ventanas, i-frames, armadura, ventana y avance en cuadros absolutos
//   moverBorde(def, ref, borde, c) / moverBarra(def, ref, delta)   arrastrar una barra (escribe marcas)
//   agregarCancelacion / borrarCancelacion / agregarTramo / borrarTramo
//   duplicarAccion(datos, grupo, clave, nueva)   base para partir: copia un ataque con otra clave (solo añade)
// =========================================================
import { NOMBRES_FASES, largoFases, marca, inicioFase } from '../mundo/supervivencia/combate/datos.js';

export const FASES = NOMBRES_FASES;
export const MAX_FASE = 600;
export const HZ = 60;
const clonar = o => JSON.parse(JSON.stringify(o));
const esObj = v => v && typeof v === 'object' && !Array.isArray(v);

// Nombres en lenguaje común (vista simple) y técnicos (Avanzado)
export const NOMBRE_FASE = {
    anticipacion: ['Preparación (cuánto se ve venir)', 'Wind-up (how readable it is)'],
    activo: ['Golpe (cuándo pega)', 'Hit (when it lands)'],
    recuperacion: ['Vuelta (cuánto queda abierto)', 'Recovery (how long it stays open)']
};
export const NOMBRE_GRUPO = {
    ataques: ['Ataques', 'Attacks'],
    acciones: ['Movimientos (esquiva, desvío…)', 'Moves (dodge, deflect…)'],
    reacciones: ['Reacciones del estilo', 'Style reactions'],
    comunes: ['Reacciones comunes (combate.json)', 'Shared reactions (combate.json)']
};

// Grupos de la lista: los del estilo y las reacciones comunes (que viven en combate.json)
export function accionesDe(estilo, combate) {
    const g = [];
    for (const grupo of ['ataques', 'acciones', 'reacciones']) {
        const l = estilo && esObj(estilo[grupo]) ? Object.keys(estilo[grupo]) : [];
        if (l.length) g.push({ grupo, archivo: 'estilo', claves: l });
    }
    const c = combate && esObj(combate.reacciones) ? Object.keys(combate.reacciones) : [];
    if (c.length) g.push({ grupo: 'comunes', archivo: 'combate', claves: c });
    return g;
}
export function defDe(datos, grupo, clave) {
    const lista = datos && datos[grupo === 'comunes' ? 'reacciones' : grupo];
    return (lista && lista[clave]) || null;
}
export const nombreDe = (def, clave, idioma = 'es') => (def && def.nombre && (def.nombre[idioma] || def.nombre.es)) || clave;

// ---------- Fases ----------
// Un ataque necesita al menos 1 cuadro activo (reglasEstilo); el resto puede quedar en 0
export const minimoFase = (def, fase, esAtaque) => (esAtaque && fase === 'activo' ? 1 : 0);
export function estirarFase(def, fase, cuadros, esAtaque = false) {
    if (!def || !def.fases || !FASES.includes(fase)) return false;
    const v = Math.max(minimoFase(def, fase, esAtaque), Math.min(MAX_FASE, Math.round(cuadros)));
    if (def.fases[fase] === v) return false;
    def.fases[fase] = v;
    return true;
}
// Rapidez: factor > 1 = más lento. Parte siempre de `base` (las fases al empezar a mover el control) para no acumular redondeos
export function escalarFases(def, factor, base, esAtaque = false) {
    const b = base || def.fases;
    let cambio = false;
    for (const f of FASES) cambio = estirarFase(def, f, (b[f] || 0) * factor, esAtaque) || cambio;
    return cambio;
}
export const segundos = c => Math.round((c / HZ) * 1000) / 1000;

// ---------- Marcas ----------
// Cuadro absoluto -> marca de la fase donde cae. c >= total da «fin» (+ lo que pase)
export function aMarca(c, fases) {
    c = Math.max(0, Math.round(c));
    const total = largoFases(fases);
    if (c >= total) return c === total ? 'fin' : `fin+${c - total}`;
    for (const f of [...FASES].reverse()) {
        const ini = inicioFase(fases, f);
        if ((fases[f] || 0) > 0 && c >= ini) return `${f}+${c - ini}`;
    }
    return `anticipacion+${c}`;
}

// ---------- Barras (ventanas bajo la línea de tiempo) ----------
// ref: { campo: 'cancelar', i } | { campo: 'iframes'|'armadura', i } | { campo: 'ventana' } | { campo: 'avance', i }
// desde/hasta en cuadros absolutos, ambos incluidos (como lineaDeTiempo del CLI). editable = se arrastra con marcas
export function barrasDe(def) {
    if (!def || !def.fases) return [];
    const f = def.fases, total = largoFases(f), out = [];
    (def.cancelar || []).forEach((v, i) => {
        const d = marca(v.desde, f), h = v.hasta === undefined ? total - 1 : marca(v.hasta, f);
        out.push({ ref: { campo: 'cancelar', i }, tipo: 'cancelar', etiqueta: '→ ' + (v.a || []).join(', ') + (v.siConecto ? ' *' : ''), desde: d, hasta: h, abierta: v.hasta === undefined, siConecto: !!v.siConecto });
    });
    for (const campo of ['iframes', 'armadura']) {
        (def[campo] || []).forEach((t, i) => out.push({ ref: { campo, i }, tipo: campo, etiqueta: campo, desde: marca(t[0], f), hasta: marca(t[1], f) }));
    }
    if (Array.isArray(def.ventana)) out.push({ ref: { campo: 'ventana' }, tipo: 'ventana', etiqueta: 'ventana', desde: marca(def.ventana[0], f), hasta: marca(def.ventana[1], f) });
    const av = Array.isArray(def.avance) ? def.avance : def.avance ? [def.avance] : [];
    av.forEach((t, i) => {
        const ini = inicioFase(f, t.fase);
        if (ini === null) return;
        out.push({ ref: { campo: 'avance', i }, tipo: 'avance', etiqueta: `avance ${t.hasta}`, desde: ini, hasta: ini + Math.max(0, (f[t.fase] || 0) - 1), fija: true });
    });
    return out.filter(b => b.desde !== null && b.hasta !== null);
}
// Los extremos [desde, hasta] de una barra como pares de marcas, para escribirlos
function extremos(def, ref) {
    if (ref.campo === 'cancelar') { const v = def.cancelar && def.cancelar[ref.i]; return v ? { leer: () => [v.desde, v.hasta], poner: (d, h) => { v.desde = d; if (h === undefined) delete v.hasta; else v.hasta = h; } } : null; }
    if (ref.campo === 'iframes' || ref.campo === 'armadura') { const t = def[ref.campo] && def[ref.campo][ref.i]; return t ? { leer: () => [t[0], t[1]], poner: (d, h) => { t[0] = d; t[1] = h; } } : null; }
    if (ref.campo === 'ventana' && Array.isArray(def.ventana)) return { leer: () => [def.ventana[0], def.ventana[1]], poner: (d, h) => { def.ventana[0] = d; def.ventana[1] = h; } };
    return null; // el avance sigue a su fase entera: no se arrastra
}
export function moverBorde(def, ref, borde, c) {
    const e = extremos(def, ref);
    if (!e) return false;
    const f = def.fases, total = largoFases(f);
    const [d0, h0] = e.leer();
    const d = marca(d0, f), h = h0 === undefined ? total - 1 : marca(h0, f);
    c = Math.max(0, Math.min(total, Math.round(c)));
    if (borde === 'desde') e.poner(aMarca(Math.min(c, h), f), h0);
    else e.poner(d0, aMarca(Math.max(c, d), f));
    return true;
}
export function moverBarra(def, ref, delta) {
    const e = extremos(def, ref);
    if (!e || !delta) return false;
    const f = def.fases, total = largoFases(f);
    const [d0, h0] = e.leer();
    const d = marca(d0, f), h = h0 === undefined ? total - 1 : marca(h0, f);
    const dd = Math.max(-d, Math.min(total - h, Math.round(delta)));
    if (!dd) return false;
    e.poner(aMarca(d + dd, f), h0 === undefined && dd < 0 ? undefined : aMarca(h + dd, f));
    return true;
}
export function agregarCancelacion(def, a, desde = 'recuperacion+0') {
    if (!def) return null;
    def.cancelar = def.cancelar || [];
    def.cancelar.push({ a: [a], desde });
    return def.cancelar.length - 1;
}
export function borrarCancelacion(def, i) {
    if (!def || !def.cancelar || !def.cancelar[i]) return false;
    def.cancelar.splice(i, 1);
    if (!def.cancelar.length) delete def.cancelar;
    return true;
}
export function agregarTramo(def, campo, desde = 'activo+0', hasta = 'recuperacion-1') {
    if (!def || (campo !== 'iframes' && campo !== 'armadura')) return null;
    def[campo] = def[campo] || [];
    def[campo].push([desde, hasta]);
    return def[campo].length - 1;
}
export function borrarTramo(def, campo, i) {
    if (!def || !Array.isArray(def[campo]) || !def[campo][i]) return false;
    def[campo].splice(i, 1);
    if (!def[campo].length) delete def[campo];
    return true;
}

// ---------- Bases para partir ----------
// Copia una acción con otra clave (misma animación: el dueño la cambia después). Solo añade: no pisa una clave existente
export const CLAVE_VALIDA = /^[a-z][a-z0-9_]*$/;
export function duplicarAccion(datos, grupo, clave, nueva) {
    const g = grupo === 'comunes' ? 'reacciones' : grupo;
    const lista = datos && datos[g];
    if (!lista || !lista[clave] || !CLAVE_VALIDA.test(nueva) || lista[nueva]) return false;
    const copia = clonar(lista[clave]);
    if (!copia.anim) copia.anim = clave; // la animación se buscaba por la clave: la copia sigue usando la misma
    if (copia.nombre) copia.nombre = { es: copia.nombre.es + ' (copia)', en: (copia.nombre.en || copia.nombre.es) + ' (copy)' };
    lista[nueva] = copia;
    return true;
}

// ---------- Campos ----------
// [ruta, es, en, min, max, paso] (rangos del esquema estudio/esquemas/estilo.schema.json); simple = vista simple
export const CAMPOS_ATAQUE = {
    simple: [
        ['dano', 'Daño', 'Damage', 0, 100, 1],
        ['postura', 'Postura que quita', 'Posture damage', 0, 200, 1],
        ['alcance', 'Alcance (bloques)', 'Reach (blocks)', 0, 20, 0.05],
        ['empuje', 'Empuje (bloques)', 'Push (blocks)', 0, 5, 0.05]
    ],
    avanzado: [
        ['posturaFija', 'Postura aunque lo bloqueen', 'Posture even when blocked', 0, 200, 1],
        ['posturaPropia', 'Postura propia al conectar', 'Own posture on hit', -200, 200, 1],
        ['mezcla', 'Cuadros de mezcla al empezar', 'Blend frames at start', 0, 60, 1],
        ['velocidadMax', 'Rapidez máxima de los canales (rad/c)', 'Max channel speed (rad/f)', 0.05, 2, 0.05]
    ]
};
export const CASILLAS_ATAQUE = [
    ['rompeGuardia', 'La guardia no lo para (el desvío sí)', 'Guard does not stop it (deflect does)'],
    ['sujeta', 'Agarra (pasa a la sujeción)', 'Grabs (goes to the hold)'],
    ['mantieneReaccion', 'El rival sigue en su reacción', 'Rival keeps its reaction'],
    ['sinMirada', 'No mira al rival mientras dura', 'Does not track the rival']
];
export const ALTURAS = ['alto', 'medio', 'bajo'];
export const PELIGROS = [null, 'barrido', 'estocada', 'agarre', 'imparable'];
// Motor de combate.json en la pestaña (el resto en N6c)
export const CASILLAS_MOTOR = [
    [['motor', 'suelo'], 'Suelo automático (doblar las rodillas baja el cuerpo)', 'Auto ground (bending knees lowers the body)'],
    [['motor', 'pies', 'anclar'], 'Pies anclados (el pie apoyado no patina)', 'Planted feet (a planted foot does not slide)']
];
