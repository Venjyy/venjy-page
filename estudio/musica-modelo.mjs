// =========================================================
// VENJY · Estudio · pestaña Música: lo puro (sin DOM; lo prueba mundo/tests/estudio-musica.mjs)
// Lista de temas (los de musica.json y los del código), plantillas, y las ediciones de una capa: celdas de ritmo,
// notas del piano roll, pasos de un acorde, arpegio, largo del patrón (1 o 4 compases) y pasos por compás.
// Formato: estudio/esquemas/musica.schema.json · motor: mundo/supervivencia/musica-motor.js · DISENO §24.
// =========================================================
import { USOS, TIPOS_CAPA, RAICES, CALIDADES, BATERIA } from '../mundo/supervivencia/musica-motor.js';
import { TEMAS_CARRERA } from '../mundo/supervivencia/carrera-musica-datos.js';

export const clonar = o => JSON.parse(JSON.stringify(o));
export const CLAVE_VALIDA = /^[a-z][a-z0-9_-]{0,31}$/;
export const NOMBRES_NOTA = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const nombreNota = m => NOMBRES_NOTA[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1);

export const tipoDe = capa => TIPOS_CAPA.find(t => capa[t] !== undefined && capa[t] !== false) || 'ritmo';
const temasMundo = () => Object.keys(USOS.mundo.temas);
// ¿A qué tema del código reemplaza esta clave? 'carrera' | 'mundo' | null
export function usoDeClave(clave) {
    if (USOS.carrera.temas.includes(clave)) return 'carrera';
    if (temasMundo().includes(clave)) return 'mundo';
    return null;
}

// Todos los temas para el selector: los de musica.json y los del código que todavía no tienen versión en el JSON
// { clave, origen: 'json' | 'carrera' | 'mundo', borrador, reemplaza }
export function listaTemas(datos) {
    const json = (datos && datos.temas) || {};
    const l = Object.entries(json).map(([clave, T]) => ({ clave, origen: 'json', borrador: !!T.borrador, reemplaza: usoDeClave(clave) }));
    for (const clave of USOS.carrera.temas) if (!json[clave]) l.push({ clave, origen: 'carrera', borrador: false, reemplaza: null });
    for (const clave of temasMundo()) if (!json[clave]) l.push({ clave, origen: 'mundo', borrador: false, reemplaza: null });
    return l;
}

// Un tema del código como punto de partida (siempre borrador: no cambia el juego hasta que se aplique)
export function temaDelCodigo(clave) {
    if (TEMAS_CARRERA[clave]) return { ...clonar(TEMAS_CARRERA[clave]), borrador: true, uso: 'carrera' };
    const M = USOS.mundo.temas[clave];
    if (!M) return null;
    // Los del mundo son funciones en musica.js: se parte con su tempo y una base mínima
    return {
        borrador: true, uso: 'mundo', bpm: M.bpm, pasos: M.pasos, vol: M.vol, prog: ['C', 'Am', 'F', 'G'],
        capas: [capaNueva('acorde', M.pasos, 'colchon'), capaNueva('rel', M.pasos)]
    };
}
export function temaNuevo() {
    return {
        nombre: { es: 'Tema nuevo', en: 'New song' }, borrador: true, uso: 'libre', bpm: 110, pasos: 16, vol: 0.09, prog: ['C', 'G', 'Am', 'F'],
        capas: [capaNueva('ritmo', 16, 'kick'), capaNueva('ritmo', 16, 'caja'), capaNueva('rel', 16), capaNueva('notas', 16)]
    };
}
export function claveLibre(datos, base = 'tema') {
    const usadas = new Set(Object.keys((datos && datos.temas) || {}));
    for (let n = 1; ; n++) { const k = `${base}${n}`; if (!usadas.has(k)) return k; }
}

// Capa vacía de un tipo (inst opcional)
export function capaNueva(tipo, P = 16, inst) {
    const vacio = v => Array.from({ length: P }, () => v);
    switch (tipo) {
        case 'ritmo': {
            const i = inst || 'kick';
            const ritmo = i === 'kick' ? vacio('.').map((_, j) => (j % (P / 4) === 0 ? 'x' : '.')).join('')
                : i === 'caja' ? vacio('.').map((_, j) => (j % (P / 2) === P / 4 ? 'x' : '.')).join('') : '.'.repeat(P);
            return { nombre: i, inst: i, ritmo, vol: i === 'kick' ? 0.6 : 0.3 };
        }
        case 'rel': return { nombre: 'bajo', inst: inst || 'bajo', rel: vacio(null).map((_, j) => (j % (P / 2) === 0 ? 0 : null)), octava: -12, dur: 2, vol: 0.4 };
        case 'acorde': return { nombre: 'acordes', inst: inst || 'rhodes', acorde: true, pasos: [0], octava: 12, dur: P / 2, vol: 0.15 };
        case 'notas': return { nombre: 'melodía', inst: inst || 'chip', notas: vacio(0), vol: 0.25 };
        case 'arpegio': return { nombre: 'arpegio', inst: inst || 'chip', arpegio: [0, 1, 2, 1], octava: 24, dur: 1, vol: 0.08 };
    }
    throw new Error('tipo de capa desconocido: ' + tipo);
}
// Cambia el tipo de una capa conservando nombre, instrumento, volumen, niveles y marcas
export function cambiarTipo(capa, tipo, P = 16) {
    const nueva = capaNueva(tipo, P, BATERIA.includes(capa.inst) === (tipo === 'ritmo') ? capa.inst : undefined);
    for (const k of ['nombre', 'vol', 'niveles', 'segunda', 'prob', 'mudo']) if (capa[k] !== undefined) nueva[k] = capa[k];
    return nueva;
}

// Patrón editable de la capa: ritmo, rel o notas (arreglo de pasos; el ritmo como arreglo de letras)
const CAMPO = { ritmo: 'ritmo', rel: 'rel', notas: 'notas' };
export function patron(capa) {
    const t = tipoDe(capa), c = CAMPO[t];
    if (!c) return null;
    return t === 'ritmo' ? capa.ritmo.split('') : capa[c];
}
function guardarPatron(capa, arr) {
    const t = tipoDe(capa);
    if (t === 'ritmo') capa.ritmo = arr.join(''); else capa[CAMPO[t]] = arr;
}
const vacioDe = t => (t === 'ritmo' ? '.' : t === 'rel' ? null : 0);
// Compases del patrón (1 o 4)
export function compasesDe(capa, P = 16) { const p = patron(capa); return p && p.length > P ? 4 : 1; }
// 1 → 4 copia el compás; 4 → 1 deja el primero
export function ponerCompases(capa, n, P = 16) {
    const p = patron(capa); if (!p) return capa;
    const base = p.slice(0, P);
    guardarPatron(capa, n === 4 ? [...base, ...base, ...base, ...base] : base);
    return capa;
}

// Ritmo: . → x → o → .
export function ciclarGolpe(capa, j) {
    const p = patron(capa); if (!p || tipoDe(capa) !== 'ritmo') return capa;
    p[j] = p[j] === '.' ? 'x' : p[j] === 'x' ? 'o' : '.';
    guardarPatron(capa, p);
    return capa;
}
// Piano roll (rel: semitonos sobre la raíz; notas: MIDI): poner la misma nota otra vez la borra
export function ponerNota(capa, j, valor) {
    const t = tipoDe(capa), p = patron(capa); if (!p || t === 'ritmo') return capa;
    p[j] = p[j] === valor ? vacioDe(t) : valor;
    guardarPatron(capa, p);
    return capa;
}
export function alternarPasoAcorde(capa, i) {
    const s = new Set(capa.pasos || []);
    if (s.has(i)) s.delete(i); else s.add(i);
    capa.pasos = [...s].sort((a, b) => a - b);
    return capa;
}
// Arpegio: en el paso n, el índice de la nota del acorde (otra vez el mismo = silencio)
export function ponerArpegio(capa, n, idx) {
    const a = capa.arpegio;
    while (a.length <= n) a.push(null);
    a[n] = a[n] === idx ? null : idx;
    return capa;
}
export function largoArpegio(capa, largo) {
    const a = capa.arpegio.slice(0, largo);
    while (a.length < largo) a.push(null);
    capa.arpegio = a;
    return capa;
}

// Cambia los pasos por compás de un tema (16 ↔ 12…): cada compás de cada patrón se corta o se rellena
export function cambiarPasos(tema, nuevo) {
    const viejo = tema.pasos || 16;
    if (nuevo === viejo) return tema;
    for (const capa of tema.capas) {
        const t = tipoDe(capa), p = patron(capa);
        if (p) {
            const comp = p.length > viejo ? 4 : 1, sal = [];
            for (let b = 0; b < comp; b++) for (let i = 0; i < nuevo; i++) sal.push(i < viejo ? p[b * viejo + i] : vacioDe(t));
            guardarPatron(capa, sal);
        }
        if (capa.pasos) capa.pasos = capa.pasos.filter(i => i < nuevo);
    }
    tema.pasos = nuevo;
    return tema;
}

// Acordes: nombre ↔ { raiz, calidad } para el selector
export function partirAcorde(nombre) {
    const m = /^([A-G][#b]?)(.*)$/.exec(nombre || '');
    if (!m || !(m[2] in CALIDADES)) return null;
    const alias = { Db: 'C#', 'D#': 'Eb', Gb: 'F#', 'G#': 'Ab', 'A#': 'Bb' };
    return { raiz: alias[m[1]] || m[1], calidad: m[2] };
}
export const RAICES_ACORDE = RAICES;
export const CALIDADES_ACORDE = Object.keys(CALIDADES);

// Niveles que ofrece el selector «Nivel» de un tema: los de su uso, o los que usan sus capas
export function nivelesDe(tema, clave) {
    const uso = (tema && tema.uso && tema.uso !== 'libre' && tema.uso) || usoDeClave(clave);
    if (uso && USOS[uso]) return USOS[uso].niveles;
    const s = new Set();
    for (const c of (tema && tema.capas) || []) for (const n of c.niveles || []) s.add(n);
    return s.size ? [...s] : ['todo'];
}

// Renombra un tema (la clave decide a quién reemplaza en el juego)
export function renombrar(datos, vieja, nueva) {
    if (!CLAVE_VALIDA.test(nueva)) throw new Error('clave no válida: minúsculas, números, - o _ (empieza con letra)');
    if (nueva !== vieja && datos.temas[nueva]) throw new Error(`ya hay un tema «${nueva}»`);
    const temas = {};
    for (const [k, v] of Object.entries(datos.temas)) temas[k === vieja ? nueva : k] = v;
    datos.temas = temas;
    return datos;
}

export function sinteNuevo() {
    return { nombre: { es: 'Sintetizador', en: 'Synth' }, onda: 'square', ataque: 0.005, caida: 0.3, largo: 1, vol: 0.8, filtro: { tipo: 'lowpass', frec: 3000, q: 1 } };
}
