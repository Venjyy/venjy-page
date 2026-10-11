// =========================================================
// VENJY · Estudio · modelo de la línea de tiempo de escenas (fase 5, PR 5b)
// Puro: sin DOM, sin red. Lo usa estudio/escenas.js y lo prueba Node (mundo/tests/estudio-escenas.mjs).
// Trabaja sobre una escena de escenas.json (estudio/esquemas/escenas.schema.json, decisiones en DISENO.md §13).
// Toda operación recibe la escena y devuelve { def, i, cambio }: `def` es una copia nueva (la original no se toca),
// `i` el índice del elemento que quedó (tramo, marca o frase) y `cambio` false si nada se movió (tope contra el
// vecino, fuera de T…). Reglas de edición:
//   - los tiempos encajan a 0,05 s;
//   - un tramo nunca pisa a su vecino de fila: se detiene contra él (las frases sí pueden pisarse: solo es aviso);
//   - nada pasa de T; un tramo dura al menos 0,1 s y una frase al menos 0,5 s (mínimos del esquema);
//   - una fila vacía queda como [] (no se borra la clave): en una escena «amistad» el juego fusiona por fila y, si la
//     clave faltara, volvería la fila del código.
// =========================================================
export const PASO = 0.05;
export const MIN_TRAMO = 0.1;
export const MIN_FRASE = 0.5;
export const T_MIN = 1;
export const T_MAX = 120;

const r2 = v => Math.round(v * 100) / 100;
export const encajar = v => r2(Math.round(v / PASO) * PASO);
const lim = (v, a, b) => Math.max(a, Math.min(b, v));
const clonar = o => JSON.parse(JSON.stringify(o));
const sinCambio = (def, i = -1) => ({ def, i, cambio: false });
const nuevo = (def, i) => ({ def, i, cambio: true });

// ---------- Lectura ----------
// Filas de gestos: n, j, los actores extra declarados y cualquier otra fila que ya traiga la pista.
export function filasDe(def) {
    const q = ['n', 'j'];
    for (const k of Object.keys(def.actores || {})) if (!q.includes(k)) q.push(k);
    for (const k of Object.keys(def.pista || {})) if (!q.includes(k)) q.push(k);
    return q;
}
export const tramosDe = (def, q) => (def.pista && def.pista[q]) || [];

// Frases como lista común a los dos tipos: { i, q, a, d, texto?, propia }.
//   amistad: una sola, 'n', [desde, dura] de `linea`; el texto sale de FRASES_AMISTAD (no es de la escena).
//   guion:   lineas[i]; si falta `d`, vale durLinea(texto) (`propia: false`: el valor no está en el archivo).
export function frasesDe(def, durLinea) {
    if (def.tipo === 'amistad') return def.linea ? [{ i: 0, q: 'n', a: def.linea[0], d: def.linea[1], propia: true }] : [];
    return (def.lineas || []).map((l, i) => ({
        i, q: l.q, a: l.a, d: l.d !== undefined ? l.d : durLinea ? durLinea(l.texto) : 3, texto: l.texto, propia: l.d !== undefined
    }));
}

// Hasta dónde llega lo que ya hay: T no puede quedar por debajo.
export function finMinimo(def, durLinea) {
    let fin = T_MIN;
    for (const fila of Object.values(def.pista || {})) for (const t of fila) fin = Math.max(fin, t[2]);
    for (const k of ['golpes', 'corazones']) for (const s of def[k] || []) fin = Math.max(fin, s + PASO);
    for (const f of frasesDe(def, durLinea)) fin = Math.max(fin, f.a + f.d);
    return r2(fin);
}

// ---------- Tramos de gesto ----------
// Espacio libre alrededor del tramo i de la fila: [desde mínimo, hasta máximo].
function holgura(def, q, i) {
    const f = tramosDe(def, q);
    return [i > 0 ? f[i - 1][2] : 0, i < f.length - 1 ? f[i + 1][1] : def.T];
}

export function moverTramo(def, q, i, desde) {
    const t = tramosDe(def, q)[i];
    if (!t) return sinCambio(def, i);
    const dura = t[2] - t[1];
    const [min, max] = holgura(def, q, i);
    const nuevoDesde = r2(lim(encajar(desde), min, Math.max(min, max - dura)));
    if (nuevoDesde === t[1]) return sinCambio(def, i);
    const d = clonar(def);
    d.pista[q][i] = [t[0], nuevoDesde, r2(nuevoDesde + dura)];
    return nuevo(d, i);
}

// borde: 'desde' | 'hasta'. El otro extremo no se mueve.
export function estirarTramo(def, q, i, borde, valor) {
    const t = tramosDe(def, q)[i];
    if (!t) return sinCambio(def, i);
    const [min, max] = holgura(def, q, i);
    let desde = t[1], hasta = t[2];
    if (borde === 'desde') desde = r2(lim(encajar(valor), min, hasta - MIN_TRAMO));
    else hasta = r2(lim(encajar(valor), desde + MIN_TRAMO, max));
    if (desde === t[1] && hasta === t[2]) return sinCambio(def, i);
    const d = clonar(def);
    d.pista[q][i] = [t[0], desde, hasta];
    return nuevo(d, i);
}

// Agrega un tramo en `desde` (o justo después del que lo ocupa) con hasta `dura` s, recortado al hueco. null si no cabe.
export function agregarTramo(def, q, gesto, desde, dura = 1) {
    const f = tramosDe(def, q);
    let s = lim(encajar(desde), 0, def.T - MIN_TRAMO);
    const previo = f.filter(t => t[1] <= s).pop();
    if (previo && previo[2] > s) s = previo[2];
    const sig = f.find(t => t[1] >= s);
    const tope = sig ? sig[1] : def.T;
    if (tope - s < MIN_TRAMO - 1e-9) return null;
    const hasta = r2(Math.min(s + dura, tope));
    const d = clonar(def);
    d.pista = d.pista || {};
    const fila = d.pista[q] || (d.pista[q] = []);
    const i = fila.filter(t => t[1] < s).length;
    fila.splice(i, 0, [gesto, r2(s), hasta]);
    return nuevo(d, i);
}

export function borrarTramo(def, q, i) {
    if (!tramosDe(def, q)[i]) return sinCambio(def, i);
    const d = clonar(def);
    d.pista[q].splice(i, 1);
    return nuevo(d, Math.min(i, d.pista[q].length - 1));
}

export function cambiarGesto(def, q, i, gesto) {
    const t = tramosDe(def, q)[i];
    if (!t || t[0] === gesto) return sinCambio(def, i);
    const d = clonar(def);
    d.pista[q][i][0] = gesto;
    return nuevo(d, i);
}

// ---------- Marcas (golpes y corazones) ----------
export function moverMarca(def, k, i, s) {
    const l = def[k] || [];
    if (l[i] === undefined) return sinCambio(def, i);
    const min = i > 0 ? r2(l[i - 1] + PASO) : 0;
    const max = i < l.length - 1 ? r2(l[i + 1] - PASO) : r2(def.T - PASO);
    const v = r2(lim(encajar(s), min, Math.max(min, max)));
    if (v === l[i]) return sinCambio(def, i);
    const d = clonar(def);
    d[k][i] = v;
    return nuevo(d, i);
}

// null si ya hay una marca justo ahí o no cabe antes de T.
export function agregarMarca(def, k, s) {
    const v = r2(lim(encajar(s), 0, def.T - PASO));
    const l = def[k] || [];
    if (l.includes(v) || v >= def.T) return null;
    const d = clonar(def);
    const nueva = d[k] ? d[k] : (d[k] = []);
    const i = nueva.filter(x => x < v).length;
    nueva.splice(i, 0, v);
    return nuevo(d, i);
}

export function borrarMarca(def, k, i) {
    const l = def[k] || [];
    if (l[i] === undefined) return sinCambio(def, i);
    const d = clonar(def);
    d[k].splice(i, 1);
    // en una escena «amistad» el [] vacío hace falta (reemplaza la lista del código); en un guion la clave sobra
    if (!d[k].length && def.tipo === 'guion') delete d[k];
    return nuevo(d, Math.min(i, (d[k] || []).length - 1));
}

// ---------- Frases ----------
export function moverFrase(def, i, a, durLinea) {
    const f = frasesDe(def, durLinea)[i];
    if (!f) return sinCambio(def, i);
    const v = r2(lim(encajar(a), 0, Math.max(0, def.T - f.d)));
    if (v === f.a) return sinCambio(def, i);
    const d = clonar(def);
    if (def.tipo === 'amistad') d.linea[0] = v; else d.lineas[i].a = v;
    return nuevo(d, i);
}

export function estirarFrase(def, i, borde, valor, durLinea) {
    const f = frasesDe(def, durLinea)[i];
    if (!f) return sinCambio(def, i);
    let a = f.a, dura = f.d;
    if (borde === 'desde') {
        const fin = r2(f.a + f.d);
        a = r2(lim(encajar(valor), 0, fin - MIN_FRASE));
        dura = r2(fin - a);
    } else {
        dura = r2(lim(encajar(valor) - f.a, MIN_FRASE, def.T - f.a));
    }
    if (a === f.a && dura === r2(f.d) && f.propia) return sinCambio(def, i);
    const d = clonar(def);
    if (def.tipo === 'amistad') d.linea = [a, dura];
    else { d.lineas[i].a = a; d.lineas[i].d = dura; }
    return nuevo(d, i);
}

// Solo escenas «guion». `q`: n, j, un actor declarado o 'todos'.
export function agregarFrase(def, q, a, texto = { es: 'Hola', en: 'Hi' }) {
    if (def.tipo !== 'guion') return null;
    const d = clonar(def);
    const v = r2(lim(encajar(a), 0, Math.max(0, def.T - MIN_FRASE)));
    d.lineas.push({ q, a: v, texto: { es: texto.es, en: texto.en } });
    return nuevo(d, d.lineas.length - 1);
}

export function borrarFrase(def, i) {
    if (def.tipo !== 'guion' || !(def.lineas || [])[i] || def.lineas.length <= 1) return sinCambio(def, i); // el esquema pide al menos una
    const d = clonar(def);
    d.lineas.splice(i, 1);
    return nuevo(d, Math.min(i, d.lineas.length - 1));
}

export function cambiarFrase(def, i, campos) {
    if (def.tipo !== 'guion' || !(def.lineas || [])[i]) return sinCambio(def, i);
    const l = def.lineas[i];
    const d = clonar(def);
    const n = d.lineas[i];
    if (campos.q !== undefined) n.q = campos.q;
    if (campos.es !== undefined) n.texto.es = campos.es;
    if (campos.en !== undefined) n.texto.en = campos.en;
    if (campos.d === null) delete n.d; else if (campos.d !== undefined) n.d = r2(lim(campos.d, MIN_FRASE, 10));
    return JSON.stringify(n) === JSON.stringify(l) ? sinCambio(def, i) : nuevo(d, i);
}

// ---------- Datos de la escena ----------
// T no baja de donde llega lo que ya hay.
export function cambiarT(def, T, durLinea) {
    const v = r2(lim(encajar(T), Math.max(T_MIN, finMinimo(def, durLinea)), T_MAX));
    if (v === def.T) return sinCambio(def);
    const d = clonar(def);
    d.T = v;
    return nuevo(d, -1);
}

export function cambiarR(def, r) {
    const v = r2(lim(r, 0.5, 4));
    if (v === def.r) return sinCambio(def);
    const d = clonar(def);
    d.r = v;
    return nuevo(d, -1);
}

export function cambiarNivel(def, nivel) {
    if (def.tipo !== 'amistad' || ![1, 2, 3, 4].includes(nivel) || nivel === def.nivel) return sinCambio(def);
    const d = clonar(def);
    d.nivel = nivel;
    return nuevo(d, -1);
}

// Actores extra de una escena «guion». `valor`: clave de persona, o { clave, radio }.
export function ponerActor(def, q, valor) {
    if (def.tipo !== 'guion' || q === 'n' || q === 'j') return sinCambio(def);
    const d = clonar(def);
    d.actores = d.actores || {};
    d.actores[q] = valor;
    d.pista = d.pista || {};
    if (!d.pista[q]) d.pista[q] = [];
    return nuevo(d, -1);
}

// null si alguna frase lo usa (hay que cambiarle el actor antes).
export function quitarActor(def, q) {
    if (def.tipo !== 'guion' || !def.actores || !(q in def.actores)) return sinCambio(def);
    if ((def.lineas || []).some(l => l.q === q)) return null;
    const d = clonar(def);
    delete d.actores[q];
    if (!Object.keys(d.actores).length) delete d.actores;
    if (d.pista) delete d.pista[q];
    return nuevo(d, -1);
}

// ---------- Escenas nuevas y copias del código ----------
// Una animación de ANIMACIONES -> escena del JSON, en el orden de claves del piloto (editar una «en código» la copia).
export function desdeCodigo(animacion) {
    const o = { tipo: 'amistad', nivel: animacion.nivel, T: animacion.T, r: animacion.r, linea: [...animacion.linea] };
    if (animacion.golpes) o.golpes = [...animacion.golpes];
    if (animacion.corazones) o.corazones = [...animacion.corazones];
    o.pista = clonar(animacion.pista);
    return o;
}

export function escenaNueva() {
    return {
        tipo: 'guion', T: 6, r: 1.3,
        lineas: [{ q: 'n', a: 0.6, texto: { es: 'Hola', en: 'Hi' } }],
        pista: { n: [], j: [] }
    };
}

// Primera clave libre: escena, escena-2, escena-3…
export function claveLibre(existentes, base = 'escena') {
    const usadas = new Set(existentes);
    if (!usadas.has(base)) return base;
    for (let n = 2; ; n++) if (!usadas.has(`${base}-${n}`)) return `${base}-${n}`;
}

// ---------- Deshacer ----------
export function crearHistorial(limite = 60) {
    const pila = [];
    return {
        meter(estado) { pila.push(JSON.stringify(estado)); if (pila.length > limite) pila.shift(); },
        deshacer() { return pila.length ? JSON.parse(pila.pop()) : null; },
        vaciar() { pila.length = 0; },
        get largo() { return pila.length; }
    };
}
