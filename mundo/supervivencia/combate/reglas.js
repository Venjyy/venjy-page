// =========================================================
// VENJY · Combate · reglas de los datos que el esquema no expresa (bloque 8 · N3, mundo/COMBATE.md §25.1)
// Puro. Las usa `node estudio/cli.mjs validar` (combate.json y estilo-*.json) y `resumen` (línea de tiempo ASCII).
//   reglasCombate(datos, { limites })            -> [{ tipo: 'error' | 'aviso', texto }]
//   reglasEstilo(datos, { combate, limites })    -> lo mismo para un estilo
//   lineaDeTiempo(def, clave)                    -> líneas de texto: fases, ventanas, i-frames, armadura y avance
// =========================================================
import { CURVAS_BASE, curvaValida } from '../../datos/curvas.js';
import { LIMITES_BASE } from '../../datos/limites.js';
import { largoFases, marca, inicioFase } from './datos.js';
import { LIBRES } from './estados.js';

const FASE_DE = { a: 'anticipacion', g: 'activo', r: 'recuperacion' };
const PELIGRO_MIN = 24; // cuadros mínimos de anticipación de un ataque peligroso (§16.4: se tiene que poder leer)

function revisarAnim(ruta, anim, { limites, curvas, usos }, mal, aviso) {
    const fases = anim.reloj === 'fases';
    for (const [c, v] of Object.entries(anim.canales || {})) {
        const r = `${ruta}.canales.${c}`, l = limites[c];
        const fuera = x => l && (x < l[0] - 1e-9 || x > l[1] + 1e-9);
        if (typeof v === 'number') { if (fuera(v)) mal(`${r}: ${v} está fuera del límite de ${c} [${l[0]}, ${l[1]}] (poses.json → limites)`); continue; }
        if (v.base !== undefined && fuera(v.base)) mal(`${r}.base: ${v.base} está fuera del límite de ${c} [${l[0]}, ${l[1]}]`);
        (v.k || []).forEach((q, i) => {
            const esFase = typeof q[0] === 'string';
            if (fases && !esFase) mal(`${r}.k[${i}]: con reloj «fases» cada clave es [fase, fracción, valor, curva?]`);
            if (!fases && esFase) mal(`${r}.k[${i}]: una clave de fase solo vale con reloj «fases» (este es «${anim.reloj}»)`);
            const valor = esFase ? q[2] : q[1];
            if (fuera(valor)) mal(`${r}.k[${i}]: ${valor} está fuera del límite de ${c} [${l[0]}, ${l[1]}]`);
            if (esFase && q[3] && !curvas.has(q[3])) mal(`${r}.k[${i}]: no existe la curva «${q[3]}» (combate.json → curvas)`);
        });
        if (fases && v.k) {
            // En cada acción que la usa, las claves tienen que ir en orden y caer en fases que existen
            for (const [quien, f] of usos) {
                let antes = -Infinity;
                v.k.forEach((q, i) => {
                    if (typeof q[0] !== 'string') return;
                    const fase = FASE_DE[q[0]];
                    if (!(f[fase] > 0)) aviso(`${r}.k[${i}]: la fase «${q[0]}» dura 0 cuadros en ${quien}`);
                    const x = inicioFase(f, fase) + q[1] * (f[fase] || 0);
                    if (x < antes - 1e-9) mal(`${r}.k[${i}]: va antes que la clave anterior (en ${quien}: cuadro ${x.toFixed(1)} < ${antes.toFixed(1)})`);
                    antes = Math.max(antes, x);
                });
            }
        }
        if (!fases && v.k) for (let i = 1; i < v.k.length; i++) if (!(v.k[i][0] > v.k[i - 1][0])) mal(`${r}.k[${i}]: el tiempo tiene que ser mayor que el anterior`);
    }
}

function nombresCurvas(combate) {
    const s = new Set(Object.keys(CURVAS_BASE));
    for (const k of Object.keys((combate && combate.curvas) || {})) s.add(k);
    return s;
}
function limitesDe(limites) {
    const l = { ...LIMITES_BASE };
    for (const [k, v] of Object.entries(limites || {})) if (Array.isArray(v) && v.length === 2) l[k] = v;
    return l;
}

// Fases, tramos (desde y hasta dentro de la acción) y avance de una acción o ataque
function revisarAccion(ruta, def, existe, curvas, mal) {
    const f = def.fases, total = largoFases(f);
    if (!(total > 0)) mal(`${ruta}.fases: las fases no suman ningún cuadro`);
    const dentro = (r, m, nombre) => {
        const x = marca(m, f);
        if (x === null) { mal(`${r}: no se entiende la marca «${m}»`); return null; }
        if (x < 0 || x > total) mal(`${r}: «${m}» cae en el cuadro ${x}, fuera de la acción (0 a ${total})${nombre ? ' · ' + nombre : ''}`);
        return x;
    };
    const tramo = (r, t) => {
        const d = dentro(`${r}[0]`, t[0]), h = dentro(`${r}[1]`, t[1]);
        if (d !== null && h !== null && d > h) mal(`${r}: empieza (cuadro ${d}) después de terminar (cuadro ${h})`);
    };
    (def.iframes || []).forEach((t, i) => tramo(`${ruta}.iframes[${i}]`, t));
    (def.armadura || []).forEach((t, i) => tramo(`${ruta}.armadura[${i}]`, t));
    if (def.ventana) tramo(`${ruta}.ventana`, def.ventana);
    (def.cancelar || []).forEach((v, i) => {
        const r = `${ruta}.cancelar[${i}]`;
        const d = dentro(`${r}.desde`, v.desde), h = v.hasta === undefined ? total : dentro(`${r}.hasta`, v.hasta);
        if (d !== null && h !== null && d > h) mal(`${r}: empieza (cuadro ${d}) después de terminar (cuadro ${h})`);
        for (const a of v.a) if (!existe(a)) mal(`${r}.a: no existe «${a}» (ni ataque, ni acción, ni reacción)`);
    });
    for (const [i, t] of (Array.isArray(def.avance) ? def.avance : def.avance ? [def.avance] : []).entries()) {
        if (t.curva && !curvas.has(t.curva)) mal(`${ruta}.avance${Array.isArray(def.avance) ? `[${i}]` : ''}: no existe la curva «${t.curva}»`);
    }
    if (def.siguiente && !existe(def.siguiente)) mal(`${ruta}.siguiente: no existe «${def.siguiente}»`);
}

export function reglasCombate(datos, { limites } = {}) {
    const salida = [], mal = texto => salida.push({ tipo: 'error', texto }), aviso = texto => salida.push({ tipo: 'aviso', texto });
    const d = datos || {}, curvas = nombresCurvas(d), lim = limitesDe(limites);
    for (const [k, p] of Object.entries(d.curvas || {})) {
        if (!curvaValida(p)) mal(`$.curvas.${k}: los puntos tienen que ir con x de 0 a 1 en orden creciente`);
        else if (Math.abs(p[0][1]) > 1e-9 || Math.abs(p[p.length - 1][1] - 1) > 1e-9) aviso(`$.curvas.${k}: no empieza en 0 o no termina en 1 (las claves no llegarían a su valor)`);
    }
    const reacciones = d.reacciones || {}, anim = d.anim || {};
    const existe = k => !!reacciones[k] || LIBRES.has(k);
    for (const [k, r] of Object.entries(reacciones)) {
        revisarAccion(`$.reacciones.${k}`, r, existe, curvas, mal);
        if (r.anim && !anim[r.anim]) aviso(`$.reacciones.${k}.anim: no existe «${r.anim}» en combate.json → anim (un estilo podría traerla)`);
    }
    for (const [k, a] of Object.entries(anim)) {
        const usos = Object.entries(reacciones).filter(([, r]) => r.anim === k).map(([n, r]) => [`reacciones.${n}`, r.fases]);
        revisarAnim(`$.anim.${k}`, a, { limites: lim, curvas, usos }, mal, aviso);
    }
    const m = d.motor || {};
    if (m.velocidadMax !== undefined && m.saltoMax !== undefined && m.velocidadMax < m.saltoMax) aviso('$.motor.velocidadMax: es menor que saltoMax');
    return salida;
}

export function reglasEstilo(datos, { combate, limites } = {}) {
    const salida = [], mal = texto => salida.push({ tipo: 'error', texto }), aviso = texto => salida.push({ tipo: 'aviso', texto });
    const d = datos || {}, c = combate || {}, curvas = nombresCurvas(c), lim = limitesDe(limites);
    const ataques = d.ataques || {}, acciones = d.acciones || {}, reacciones = { ...(c.reacciones || {}), ...(d.reacciones || {}) };
    const anims = { ...(c.anim || {}), ...(d.anim || {}) };
    const existe = k => !!(ataques[k] || acciones[k] || reacciones[k]) || LIBRES.has(k);
    const pesoMax = (c.motor && c.motor.velocidadMax) || 0.6;
    // Controles
    for (const [k, v] of Object.entries(d.controles || {})) {
        for (const x of typeof v === 'string' ? [v] : Object.values(v || {})) if (!existe(x)) mal(`$.controles.${k}: no existe «${x}»`);
    }
    // Animaciones a las que se refieren la guardia, el paso y el bloqueo
    for (const [donde, campo] of [['guardia', 'anim'], ['guardia', 'respiracion'], ['paso', 'anim'], ['bloqueo', 'anim']]) {
        const k = d[donde] && d[donde][campo];
        if (k && !anims[k]) mal(`$.${donde}.${campo}: no existe la animación «${k}»`);
        else if (k && anims[k].reloj === 'fases') mal(`$.${donde}.${campo}: «${k}» tiene reloj «fases»; la guardia, el paso y el bloqueo usan t`);
    }
    // Ataques y acciones
    const usos = new Map();
    const usar = (anim, quien, fases) => { if (!usos.has(anim)) usos.set(anim, []); usos.get(anim).push([quien, fases]); };
    for (const [grupo, lista] of [['ataques', ataques], ['acciones', acciones], ['reacciones', d.reacciones || {}]]) {
        for (const [k, a] of Object.entries(lista)) {
            const ruta = `$.${grupo}.${k}`;
            revisarAccion(ruta, a, existe, curvas, mal);
            const an = a.anim || k;
            if (!anims[an]) mal(`${ruta}.anim: no existe la animación «${an}»`);
            else usar(an, `${grupo}.${k}`, a.fases);
            if (grupo === 'ataques') {
                if (!(a.fases.activo >= 1)) mal(`${ruta}.fases.activo: un ataque necesita al menos 1 cuadro activo`);
                if (a.peligro && a.fases.anticipacion < PELIGRO_MIN) mal(`${ruta}: un ataque peligroso (${a.peligro}) necesita al menos ${PELIGRO_MIN} cuadros de anticipación (tiene ${a.fases.anticipacion}): se tiene que poder leer`);
                if (a.hitstop && c.peso && !c.peso[a.hitstop]) aviso(`${ruta}.hitstop: no hay nivel «${a.hitstop}» en combate.json → peso`);
                if (a.reaccion && !reacciones[a.reaccion]) mal(`${ruta}.reaccion: no existe la reacción «${a.reaccion}» (combate.json → reacciones o las del estilo)`);
            }
            if (a.velocidadMax > pesoMax) aviso(`${ruta}.velocidadMax: ${a.velocidadMax} pasa el tope de combate.json → motor.velocidadMax (${pesoMax}); se usa el tope`);
        }
    }
    for (const [k, a] of Object.entries(d.anim || {})) revisarAnim(`$.anim.${k}`, a, { limites: lim, curvas, usos: usos.get(k) || [] }, mal, aviso);
    return salida;
}

// ---------- Línea de tiempo ASCII (resumen) ----------
// a, g, r: las fases; # en una ventana o tramo; = donde avanza el cuerpo
export function lineaDeTiempo(def) {
    const f = def.fases, total = largoFases(f), lineas = [];
    const fila = (titulo, celda) => lineas.push(titulo.padEnd(14) + Array.from({ length: total }, (_, c) => celda(c)).join(''));
    lineas.push(''.padEnd(14) + Array.from({ length: total }, (_, c) => (c % 10 === 0 ? String(c / 10 % 10) : ' ')).join(''));
    lineas.push(''.padEnd(14) + Array.from({ length: total }, (_, c) => String(c % 10)).join(''));
    const ia = f.anticipacion || 0, ig = ia + (f.activo || 0);
    fila('fases', c => (c < ia ? 'a' : c < ig ? 'g' : 'r'));
    const tramos = (titulo, lista) => {
        if (!lista || !lista.length) return;
        fila(titulo, c => (lista.some(t => { const d = marca(t[0], f), h = marca(t[1], f); return c >= d && c <= h; }) ? '#' : '.'));
    };
    for (const v of def.cancelar || []) {
        const d = marca(v.desde, f), h = v.hasta === undefined ? total - 1 : marca(v.hasta, f);
        fila(('-> ' + v.a.join(',')).slice(0, 13) + (v.siConecto ? '*' : ''), c => (c >= d && c <= h ? '#' : '.'));
    }
    tramos('iframes', def.iframes);
    tramos('armadura', def.armadura);
    if (def.ventana) tramos('ventana', [def.ventana]);
    for (const t of Array.isArray(def.avance) ? def.avance : def.avance ? [def.avance] : []) {
        const ini = inicioFase(f, t.fase), fin = ini + (f[t.fase] || 0);
        fila(`avance ${t.hasta}`, c => (c >= ini && c < fin ? '=' : '.'));
    }
    return lineas;
}
