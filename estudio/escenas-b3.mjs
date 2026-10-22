// =========================================================
// VENJY · Estudio · modelo del editor de escenas, claves de B3 (Etapa B, punto 3c; estudio/DISENO.md §40)
// Puro: sin DOM, sin red. Lo usa estudio/escenas.js y lo prueba Node (mundo/tests/estudio-escenas-b3.mjs).
// Mismo contrato que escenas-modelo.mjs: cada operación recibe la escena y devuelve { def, i, cambio } con `def` copia nueva.
//   - anclas: `ancla` { frase, de: 'inicio' | 'fin', mas } en frases, tramos, objetos, efectos, sonidos y marcas. El juego corre el
//     número guardado; el editor lo recalcula (`normalizar`) cuando la frase de la que depende se mueve, se estira o cambia de texto;
//   - «Acomodar frases» (`acomodarFrases`): encadena las frases y arrastra todo lo anclado;
//   - variantes y escenas nuevas con `dispara` (`variante`, `escenaNueva`, bases para partir);
//   - objetos, efectos, sonidos y `lugar` del catálogo (DISENO §40, decisiones 8 y 10).
// =========================================================
import { tiempoDeAncla } from '../mundo/datos/escenas.js';
import { encajar, claveLibre, escenaNueva as escenaEnBlanco, T_MAX } from './escenas-modelo.mjs';

export const HUECO = 0.15;                       // pausa entre frases al acomodar
export const GESTOS_CON_RELOJ = ['secreto', 'abrazo', 'pareja']; // el editor les pone `reloj` solo (= desde − 0,4, como bienvenidas/comun.js)
export const HUESOS = ['brazoD', 'brazoI', 'cabeza', 'cuerpo'];
export const EFECTOS = ['chispa', 'corazon', 'humo', 'nieve'];

const r2 = v => Math.round(v * 100) / 100;
const clonar = o => JSON.parse(JSON.stringify(o));
const sinCambio = (def, i = -1) => ({ def, i, cambio: false });
const nuevo = (def, i = -1) => ({ def, i, cambio: true });
const lim = (v, a, b) => Math.max(a, Math.min(b, v));
const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// ---------- Anclas ----------
// Un «elemento» e es { k: 'frase', i } | { k: 'tramo', q, i } | { k: 'objeto', i } | { k: 'efecto', i } | { k: 'sonido', i } | { k: 'marca', nombre }.
// acceso(d, e): lee y escribe su instante y su ancla sobre la escena `d` (que se puede mutar). null si el elemento no existe.
export function acceso(d, e) {
    if (e.k === 'frase') {
        const l = (d.lineas || [])[e.i];
        return l && {
            get t() { return l.a; }, get ancla() { return l.ancla; },
            poner(v) { l.a = v; },
            ponerAncla(a) { if (a) l.ancla = a; else delete l.ancla; }
        };
    }
    if (e.k === 'tramo') {
        const tr = ((d.pista || {})[e.q] || [])[e.i];
        return tr && {
            get t() { return tr[1]; }, get ancla() { return tr[3] && tr[3].ancla; },
            poner(v) { const dura = tr[2] - tr[1]; tr[1] = v; tr[2] = r2(v + dura); },
            ponerAncla(a) {
                if (a) tr[3] = { ...(tr[3] || {}), ancla: a };
                else if (tr[3]) { delete tr[3].ancla; if (!Object.keys(tr[3]).length) tr.length = 3; }
            }
        };
    }
    if (e.k === 'objeto') {
        const o = (d.objetos || [])[e.i];
        return o && {
            get t() { return o.desde !== undefined ? o.desde : 0; }, get ancla() { return o.ancla; },
            poner(v) { const dd = v - (o.desde !== undefined ? o.desde : 0); o.desde = v; if (o.hasta !== undefined) o.hasta = r2(o.hasta + dd); },
            ponerAncla(a) { if (a) o.ancla = a; else delete o.ancla; }
        };
    }
    if (e.k === 'efecto' || e.k === 'sonido') {
        const x = (d[e.k === 'efecto' ? 'efectos' : 'sonidos'] || [])[e.i];
        return x && {
            get t() { return x[0]; }, get ancla() { return x[2] && x[2].ancla; },
            poner(v) { x[0] = v; },
            ponerAncla(a) {
                if (a) x[2] = { ...(x[2] || {}), ancla: a };
                else if (x[2]) { delete x[2].ancla; if (!Object.keys(x[2]).length) x.length = 2; }
            }
        };
    }
    if (e.k === 'marca') {
        const m = (d.marcas || {})[e.nombre];
        return m !== undefined && {
            get t() { return typeof m === 'number' ? m : m.t; },
            get ancla() { return typeof m === 'object' ? m.ancla : undefined; },
            poner(v) { if (typeof m === 'number') d.marcas[e.nombre] = v; else m.t = v; },
            ponerAncla(a) {
                const t = typeof m === 'number' ? m : m.t;
                if (a) d.marcas[e.nombre] = { t, ancla: a };
                else d.marcas[e.nombre] = t;
            }
        };
    }
    return null;
}

// Todo lo que puede llevar ancla, en el orden en que se recalcula: las frases en su orden (una solo depende de una anterior)
// y después tramos, objetos, efectos, sonidos y marcas.
export function elementos(d) {
    const lista = (d.lineas || []).map((_, i) => ({ k: 'frase', i }));
    for (const [q, f] of Object.entries(d.pista || {})) f.forEach((_, i) => lista.push({ k: 'tramo', q, i }));
    (d.objetos || []).forEach((_, i) => lista.push({ k: 'objeto', i }));
    (d.efectos || []).forEach((_, i) => lista.push({ k: 'efecto', i }));
    (d.sonidos || []).forEach((_, i) => lista.push({ k: 'sonido', i }));
    for (const nombre of Object.keys(d.marcas || {})) lista.push({ k: 'marca', nombre });
    return lista;
}

// Recalcula todo lo que tiene ancla desde las frases (copia nueva; cambio false si ya estaba bien)
export function normalizar(def, durLinea) {
    if (def.tipo !== 'guion') return sinCambio(def);
    const d = clonar(def);
    let hubo = false;
    for (const e of elementos(d)) {
        const a = acceso(d, e);
        if (!a || !a.ancla) continue;
        const base = tiempoDeAncla(d.lineas, a.ancla, durLinea);
        if (base === null) continue;
        const v = r2(lim(base, 0, d.T));
        if (Math.abs(v - a.t) > 1e-9) { a.poner(v); hubo = true; }
    }
    return hubo ? nuevo(d) : sinCambio(def);
}

// Después de editar `e`: si tiene ancla, su `mas` se ajusta a donde quedó (sigue anclado, pero con otra distancia);
// luego se arrastra todo lo que dependa. Si `e` es null solo recalcula.
export function sincronizar(def, e, durLinea) {
    if (def.tipo !== 'guion') return sinCambio(def);
    let d = clonar(def);
    if (e) {
        const a = acceso(d, e);
        if (a && a.ancla) {
            const base = tiempoDeAncla(d.lineas, a.ancla, durLinea);
            const mas = base === null ? null : r2(a.t - (base - (a.ancla.mas || 0)));
            if (mas !== null && Math.abs(mas) <= 30) a.ponerAncla({ ...a.ancla, mas });
            else a.ponerAncla(null); // quedó demasiado lejos: se suelta
        }
    }
    const n = normalizar(d, durLinea);
    if (n.cambio) d = n.def;
    return igual(d, def) ? sinCambio(def) : nuevo(d);
}

// Ancla `e` al inicio o fin de la frase `frase`, conservando donde está hoy (mas = diferencia). null si no se puede.
export function fijarAncla(def, e, frase, de, durLinea) {
    if (def.tipo !== 'guion' || !(def.lineas || [])[frase] || !['inicio', 'fin'].includes(de)) return null;
    if (e.k === 'frase' && frase >= e.i) return null; // una frase solo depende de una anterior
    const d = clonar(def);
    const a = acceso(d, e);
    if (!a) return null;
    const base = tiempoDeAncla(d.lineas, { frase, de, mas: 0 }, durLinea);
    if (base === null) return null;
    const mas = r2(a.t - base);
    if (Math.abs(mas) > 30) return null;
    a.ponerAncla({ frase, de, mas });
    return igual(d, def) ? sinCambio(def) : nuevo(d);
}
export function quitarAncla(def, e) {
    const d = clonar(def);
    const a = acceso(d, e);
    if (!a || !a.ancla) return sinCambio(def);
    a.ponerAncla(null);
    return nuevo(d);
}
// Si borrar la frase `i` dejó anclas apuntando a ella, se sueltan (el número queda) y las que apuntan a las siguientes bajan un lugar.
// `antes` es la escena como estaba antes de borrar; `def` la que ya no tiene la frase.
export function repararAnclasTrasBorrar(def, i) {
    const d = clonar(def);
    let hubo = false;
    for (const e of elementos(d)) {
        const a = acceso(d, e);
        if (!a || !a.ancla) continue;
        if (a.ancla.frase === i) { a.ponerAncla(null); hubo = true; } else if (a.ancla.frase > i) { a.ponerAncla({ ...a.ancla, frase: a.ancla.frase - 1 }); hubo = true; }
    }
    return hubo ? nuevo(d) : sinCambio(def);
}
// Índice de la frase que termina en ese instante (o -1): para mostrar «hasta qué frase» de un objeto
export function fraseQueTermina(def, t, durLinea) {
    return (def.lineas || []).findIndex((_, i) => {
        const f = tiempoDeAncla(def.lineas, { frase: i, de: 'fin', mas: 0 }, durLinea);
        return f !== null && Math.abs(f - t) < 0.02;
    });
}

// ---------- Acomodar frases ----------
// Cada `a` = fin de la anterior + 0,15 (la primera se queda), cada `d` apurada sube a lo que se alcanza a leer, y lo anclado se mueve
// con su frase. Las frases dejan de tener ancla propia (la cadena manda). Si la última pasa de T, T crece.
export function acomodarFrases(def, durLinea) {
    if (def.tipo !== 'guion' || !(def.lineas || []).length) return sinCambio(def);
    const d = clonar(def);
    let fin = null;
    d.lineas.forEach((l, i) => {
        delete l.ancla;
        const lee = durLinea(l.texto);
        if (l.d !== undefined && l.d < lee) l.d = lee;
        if (i > 0) l.a = r2(Math.max(0, fin + HUECO));
        fin = l.a + (l.d !== undefined ? l.d : lee);
    });
    if (fin > d.T) d.T = Math.min(T_MAX, r2(Math.ceil(fin * 20) / 20 + 0.5));
    const n = normalizar(d, durLinea);
    const salida = n.cambio ? n.def : d;
    return igual(salida, def) ? sinCambio(def) : nuevo(salida);
}

// ---------- Reloj de los gestos que lo piden ----------
// `antes`/`despues`: la escena antes y después de editar el tramo (q, i). Pone `reloj` = desde − 0,4 a secreto, abrazo y pareja cuando
// el tramo es nuevo o cuando el reloj que tenía era el automático; lo que el dueño fijó a mano no se toca.
export function relojAuto(antes, despues, q, i) {
    const tr = ((despues.pista || {})[q] || [])[i];
    if (!tr || !GESTOS_CON_RELOJ.includes(tr[0])) return sinCambio(despues, i);
    const op = tr[3] || {};
    const previo = ((antes.pista || {})[q] || [])[i];
    const eraAuto = !previo || previo[0] !== tr[0] || previo[3] === undefined || previo[3].reloj === undefined || Math.abs(previo[3].reloj - r2(previo[1] - 0.4)) < 1e-9;
    const reloj = r2(tr[1] - 0.4);
    if (!eraAuto || op.reloj === reloj) return sinCambio(despues, i);
    const d = clonar(despues);
    d.pista[q][i][3] = { ...(d.pista[q][i][3] || {}), reloj };
    return nuevo(d, i);
}

// ---------- Dispara y variantes ----------
export const TIPOS_DISPARA = ['bienvenida', 'momento', 'reencuentro', 'grupo'];
// Clave de comparación: dos escenas con la misma no se sabría cuál corre (la misma de reglasB3)
export function llaveDispara(dp) {
    if (!dp) return null;
    return dp.tipo === 'reencuentro' ? `reencuentro:${[...dp.personas].sort().join('+')}` : JSON.stringify([dp.tipo, dp.skin || '', dp.persona || '', dp.grupo || '']);
}
// Clave de la escena que ya dispara igual (distinta de `salvo`) o null
export function escenaConDispara(escenas, dp, salvo) {
    const llave = llaveDispara(dp);
    if (!llave) return null;
    for (const [k, e] of Object.entries(escenas)) if (k !== salvo && e.tipo === 'guion' && llaveDispara(e.dispara) === llave) return k;
    return null;
}
// El texto de una escena nueva o copiada no está revisado: la marca la pone el dueño
const sinRevisado = d => { for (const l of d.lineas || []) if (l.texto) delete l.texto.revisado; return d; };

// «Duplicar como variante»: copia de `clave` que solo cambia `dispara.skin` (decisión 2). { clave, def } o { error }.
export function variante(escenas, clave, skin) {
    const base = escenas[clave];
    if (!base || base.tipo !== 'guion') return { error: 'no-guion' };
    const dp = base.dispara;
    if (!dp) return { error: 'sin-dispara' };
    if (dp.tipo === 'reencuentro') return { error: 'sin-skin' };
    if (!skin || skin === dp.skin) return { error: 'misma-skin' };
    const d = sinRevisado(clonar(base));
    d.dispara = { ...dp, skin };
    d.base = clave;
    const otra = escenaConDispara(escenas, d.dispara, null);
    if (otra) return { error: 'repetido', con: otra };
    return { clave: claveLibre(Object.keys(escenas), `${clave}-${skin}`), def: d };
}

// ---------- Escenas nuevas con bases para partir ----------
// Bases: dos plantillas de reencuentro (cortita y larga, con gestos que ya existen) y cualquier escena de guion ya hecha.
// Los textos son de relleno: el dueño los reescribe (y marca `revisado` cuando le gusten).
const t2 = (es, en) => ({ es, en });
export const BASES = {
    corto: {
        es: 'Reencuentro corto (4 frases)', en: 'Short reunion (4 lines)',
        def: () => ({
            tipo: 'guion', T: 14, r: 1.25,
            lineas: [
                { q: 'n', a: 0.6, texto: t2('¡Mira quién anda por aquí!', 'Look who is around!') },
                { q: 'j', a: 3.75, texto: t2('¡Cuánto tiempo! ¿Cómo has estado?', 'It has been ages! How have you been?') },
                { q: 'n', a: 6.9, texto: t2('Bien, con ganas de verte. Choca esos puños.', 'Good, and glad to see you. Fist bump.') },
                { q: 'j', a: 10.05, texto: t2('Cuídate, y nos vemos pronto.', 'Take care, see you soon.') }
            ],
            golpes: [7.4],
            pista: {
                n: [['sorpresa', 0.05, 0.9], ['saluda', 0.9, 1.9], ['habla', 3.75, 6.7], ['puno', 7.0, 8.2], ['habla', 10.05, 12.9]],
                j: [['saluda', 0.3, 1.8], ['habla', 3.75, 6.7], ['puno', 7.0, 8.2], ['habla', 10.05, 12.9]]
            }
        })
    },
    largo: {
        es: 'Reencuentro largo (6 frases, saludo secreto y abrazo)', en: 'Long reunion (6 lines, secret handshake and hug)',
        def: () => ({
            tipo: 'guion', T: 27, r: 1.3,
            lineas: [
                { q: 'n', a: 0.4, texto: t2('¡No puede ser! ¿Eres tú?', 'No way! Is that you?') },
                { q: 'j', a: 3.75, texto: t2('El mismo. ¿Te acuerdas de nuestro saludo?', 'The same. Remember our handshake?') },
                { q: 'n', a: 7.15, texto: t2('Claro. Ven, dame un abrazo.', 'Of course. Come here, hug me.') },
                { q: 'j', a: 12.5, texto: t2('Cuánto hemos cambiado, pero no tanto.', 'We have changed a lot, but not that much.') },
                { q: 'n', a: 15.8, texto: t2('Jajaja, es verdad.', 'Haha, true.') },
                { q: 'j', a: 19.0, texto: t2('Gracias por esperarme. Vamos.', 'Thanks for waiting for me. Let us go.') }
            ],
            golpes: [4.7, 5.7, 6.6, 7.5],
            pista: {
                n: [['brazosArriba', 0.1, 1.5], ['habla', 1.6, 3.7], ['secreto', 3.9, 8.5, { reloj: 3.5 }], ['abrazo', 9.0, 13.5, { reloj: 8.6 }], ['recuerda', 13.5, 15.5], ['risa', 16.1, 18.8], ['asiente', 19.4, 22.5]],
                j: [['brazosArriba', 0.1, 1.5], ['secreto', 3.9, 8.5, { reloj: 3.5 }], ['abrazo', 9.0, 13.5, { reloj: 8.6 }], ['habla', 14.0, 16.0], ['risa', 16.1, 18.8], ['habla', 19.0, 22.5]]
            }
        })
    }
};

// Clave sugerida para una escena con ese `dispara`
export function claveSugerida(dp, existentes) {
    let base = 'escena';
    if (dp) {
        if (dp.tipo === 'bienvenida') base = `${dp.skin}-bienvenida`;
        else if (dp.tipo === 'momento') base = `${dp.persona}-momento${dp.skin ? '-' + dp.skin : ''}`;
        else if (dp.tipo === 'reencuentro') base = `${dp.personas[0]}-${dp.personas[1]}-reencuentro`;
        else if (dp.tipo === 'grupo') base = `${dp.grupo}${dp.skin ? '-' + dp.skin : ''}`;
    }
    return claveLibre(existentes, base);
}

// Escena nueva: `dispara` (o null = suelta), de qué parte (`base`: 'blanco' | 'corto' | 'largo' | clave de una escena del JSON).
// { clave, def } o { error: 'repetido', con } si ya hay otra escena que dispara igual.
export function escenaNueva(escenas, dispara, base = 'blanco') {
    let d;
    if (BASES[base]) d = BASES[base].def();
    else if (escenas[base] && escenas[base].tipo === 'guion') { d = sinRevisado(clonar(escenas[base])); d.base = base; delete d.dispara; }
    else d = escenaEnBlanco();
    if (dispara) {
        const otra = escenaConDispara(escenas, dispara, null);
        if (otra) return { error: 'repetido', con: otra };
        d.dispara = dispara;
    }
    if (BASES[base]) d.base = base;
    return { clave: claveSugerida(dispara, Object.keys(escenas)), def: d };
}

// Cambia o quita el `dispara` de una escena. null si otra escena ya dispara igual.
export function ponerDispara(escenas, clave, dispara) {
    const def = escenas[clave];
    if (!def || def.tipo !== 'guion') return null;
    if (dispara && escenaConDispara(escenas, dispara, clave)) return null;
    const d = clonar(def);
    if (dispara) d.dispara = dispara; else delete d.dispara;
    return igual(d, def) ? sinCambio(def) : nuevo(d);
}

// ---------- Objetos del catálogo ----------
// dibujo: clave de ícono o de PIX. en: pegado a un hueso de un actor (sigue a la mano solo).
export function agregarObjeto(def, dibujo, q = 'n', hueso = 'brazoD') {
    if (def.tipo !== 'guion' || !dibujo) return null;
    const d = clonar(def);
    d.objetos = d.objetos || [];
    const id = claveLibre(d.objetos.map(o => o.id), dibujo);
    d.objetos.push({ id, dibujo, en: { q, hueso } });
    return nuevo(d, d.objetos.length - 1);
}
export function borrarObjeto(def, i) {
    if (!(def.objetos || [])[i]) return sinCambio(def, i);
    const d = clonar(def);
    d.objetos.splice(i, 1);
    if (!d.objetos.length) delete d.objetos;
    return nuevo(d, Math.min(i, (d.objetos || []).length - 1));
}
// campos: dibujo, q, hueso, tam (null = el del motor), mas ([x,y,z]); desde/hasta se fijan con objetoEntreFrases o tiempo directo
export function cambiarObjeto(def, i, campos) {
    const o0 = (def.objetos || [])[i];
    if (!o0) return sinCambio(def, i);
    const d = clonar(def);
    const o = d.objetos[i];
    if (campos.dibujo !== undefined && campos.dibujo) o.dibujo = campos.dibujo;
    if (campos.q !== undefined && o.en.hueso !== undefined) o.en.q = campos.q;
    if (campos.hueso !== undefined && o.en.hueso !== undefined) o.en.hueso = campos.hueso;
    if (campos.tam === null) delete o.tam; else if (campos.tam !== undefined) o.tam = r2(lim(campos.tam, 0.05, 8));
    if (campos.mas !== undefined) {
        if (campos.mas.every(v => v === 0)) delete o.en.mas;
        else o.en.mas = campos.mas.map(v => r2(lim(v, -64, 64)));
    }
    return igual(d.objetos[i], o0) ? sinCambio(def, i) : nuevo(d, i);
}
// «¿Desde qué frase hasta cuál?»: desde = inicio de `fa` (con ancla), hasta = fin de `fb`. fa/fb null = toda la escena.
export function objetoEntreFrases(def, i, fa, fb, durLinea) {
    if (!(def.objetos || [])[i]) return sinCambio(def, i);
    const d = clonar(def);
    const o = d.objetos[i];
    delete o.ancla; delete o.desde; delete o.hasta;
    if (fa !== null && fa !== undefined) {
        const ini = tiempoDeAncla(d.lineas, { frase: fa, de: 'inicio', mas: 0 }, durLinea);
        if (ini === null) return sinCambio(def, i);
        o.desde = r2(ini);
        o.ancla = { frase: fa, de: 'inicio', mas: 0 };
    }
    if (fb !== null && fb !== undefined) {
        const fin = tiempoDeAncla(d.lineas, { frase: fb, de: 'fin', mas: 0 }, durLinea);
        if (fin === null) return sinCambio(def, i);
        o.hasta = r2(Math.min(d.T, fin));
        if (o.desde !== undefined && !(o.desde < o.hasta)) return sinCambio(def, i);
    }
    return igual(d.objetos[i], def.objetos[i]) ? sinCambio(def, i) : nuevo(d, i);
}

// ---------- Efectos y sonidos ----------
const LISTA = { efecto: 'efectos', sonido: 'sonidos' };
function insertar(lista, item) {
    let i = lista.length;
    while (i > 0 && lista[i - 1][0] > item[0]) i--;
    lista.splice(i, 0, item);
    return i;
}
// t: instante; con `frase` (índice) queda anclado a su inicio (+ mas). Efecto: opciones { en, alto, tam, n }.
export function agregarEvento(def, k, nombre, t, { frase, mas = 0, opciones } = {}, durLinea) {
    if (def.tipo !== 'guion' || !LISTA[k] || !nombre) return null;
    const d = clonar(def);
    const lista = d[LISTA[k]] = d[LISTA[k]] || [];
    let inst = t;
    let ancla;
    if (frase !== undefined && frase !== null) {
        const base = tiempoDeAncla(d.lineas, { frase, de: 'inicio', mas }, durLinea);
        if (base === null) return null;
        inst = base;
        ancla = { frase, de: 'inicio', mas };
    }
    inst = r2(lim(inst, 0, Math.max(0, d.T - 0.05)));
    const op = { ...(opciones || {}), ...(ancla ? { ancla } : {}) };
    const item = Object.keys(op).length ? [inst, nombre, op] : [inst, nombre];
    return nuevo(d, insertar(lista, item));
}
export function borrarEvento(def, k, i) {
    const lista = def[LISTA[k]] || [];
    if (!lista[i]) return sinCambio(def, i);
    const d = clonar(def);
    d[LISTA[k]].splice(i, 1);
    if (!d[LISTA[k]].length) delete d[LISTA[k]];
    return nuevo(d, Math.min(i, (d[LISTA[k]] || []).length - 1));
}
// campos: nombre, t (suelta el ancla), frase (re-ancla al inicio de esa frase; null = suelta), en/alto/tam/n (solo efectos; null = quita)
export function cambiarEvento(def, k, i, campos, durLinea) {
    const lista0 = def[LISTA[k]] || [];
    if (!lista0[i]) return sinCambio(def, i);
    const d = clonar(def);
    let item = d[LISTA[k]].splice(i, 1)[0];
    if (campos.nombre !== undefined && campos.nombre) item[1] = campos.nombre;
    let op = { ...(item[2] || {}) };
    if (campos.t !== undefined && Number.isFinite(campos.t)) { item[0] = r2(lim(encajar(campos.t), 0, Math.max(0, d.T - 0.05))); delete op.ancla; }
    if (campos.frase !== undefined) {
        if (campos.frase === null) delete op.ancla;
        else {
            const base = tiempoDeAncla(d.lineas, { frase: campos.frase, de: 'inicio', mas: 0 }, durLinea);
            if (base === null) return sinCambio(def, i);
            item[0] = r2(lim(base, 0, Math.max(0, d.T - 0.05)));
            op.ancla = { frase: campos.frase, de: 'inicio', mas: 0 };
        }
    }
    if (k === 'efecto') {
        for (const c of ['en', 'alto', 'tam', 'n']) {
            if (campos[c] === null) delete op[c];
            else if (campos[c] !== undefined) op[c] = c === 'en' ? campos[c] : c === 'n' ? Math.round(lim(campos[c], 1, 64)) : r2(lim(campos[c], c === 'tam' ? 0.05 : 0, 8));
        }
    }
    item = Object.keys(op).length ? [item[0], item[1], op] : [item[0], item[1]];
    const j = insertar(d[LISTA[k]], item);
    return igual(d, def) ? sinCambio(def, i) : nuevo(d, j);
}

// ---------- Lugar del grupo ----------
// parte: 'centro' | 'jugador'. valor: { desde, mas: [x,y,z] } o null (quita). Sin `mas` queda [0,0,0] omitido.
export function ponerLugar(def, parte, valor) {
    if (def.tipo !== 'guion' || !['centro', 'jugador'].includes(parte)) return sinCambio(def);
    const d = clonar(def);
    const lugar = { ...(d.lugar || {}) };
    if (valor === null) delete lugar[parte];
    else {
        const v = { desde: valor.desde };
        if (valor.mas && !valor.mas.every(x => !x)) v.mas = valor.mas.map(x => r2(lim(x, -64, 64)));
        lugar[parte] = v;
    }
    if (Object.keys(lugar).length) d.lugar = lugar; else delete d.lugar;
    return igual(d, def) ? sinCambio(def) : nuevo(d);
}
