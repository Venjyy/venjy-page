// =========================================================
// VENJY · Estudio · pestaña Ritmo: modelo puro (S10a)
// Sin DOM: la pestaña (ritmo.js) y la prueba (mundo/tests/ritmo.mjs) comparten estas funciones.
// La partitura sale sola del bajo (salonas-partitura.js); aquí solo se arma lo que la línea de tiempo dibuja y se
// llevan los ajustes a mano de salonas.json → ajustes.<canción>.<dificultad>.<compás:paso> = carril (0..n-1) | null
// (null = quitar la nota). Un ajuste nunca cambia cuándo suena una nota, solo dónde cae o si se juega.
// =========================================================
import { partitura, revisarPartitura, reglasDe, DIFICULTADES } from '../mundo/supervivencia/salonas-partitura.js';
import { acordeDe } from '../mundo/supervivencia/musica-motor.js';
import { vozDe, TECNICAS_BAJO } from '../mundo/supervivencia/musica-bajo.js';

export { DIFICULTADES };

const clonar = o => JSON.parse(JSON.stringify(o));

// Ajustes de una canción y dificultad ({} si no hay).
export function ajustesDe(ajustes, cancion, dificultad) {
    const a = ajustes && ajustes[cancion] && ajustes[cancion][dificultad];
    return a && typeof a === 'object' ? a : {};
}

// Copia de `ajustes` con la nota `clave` puesta en `valor`: un carril, null (quitar) o undefined (volver a la generada).
// Un carril igual al generado no se guarda, y los objetos que quedan vacíos se podan. No cambia el original.
export function ponerAjuste(ajustes, cancion, dificultad, clave, valor, carrilBase) {
    const sal = clonar(ajustes || {});
    if (valor === undefined || valor === carrilBase) {
        const d = sal[cancion] && sal[cancion][dificultad];
        if (d) delete d[clave];
    } else {
        sal[cancion] = sal[cancion] || {};
        sal[cancion][dificultad] = sal[cancion][dificultad] || {};
        sal[cancion][dificultad][clave] = valor;
    }
    for (const c of Object.keys(sal)) {
        for (const d of Object.keys(sal[c])) if (!Object.keys(sal[c][d]).length) delete sal[c][d];
        if (!Object.keys(sal[c]).length) delete sal[c];
    }
    return sal;
}

// Lo que dibuja la línea de tiempo: la partitura ya ajustada, cada nota con su carril generado (`base`) y si el dueño
// la movió (`movida`), más las notas quitadas a mano (`quitadas`, con su carril generado, para poder devolverlas).
export function armar(clave, cancion, dificultad, reglasJson, ajustes, tempo = 1) {
    const reglas = reglasDe(reglasJson);
    const mia = ajustesDe(ajustes, clave, dificultad);
    const generada = partitura(cancion, dificultad, reglas, { tempo });
    const ajustada = partitura(cancion, dificultad, reglas, { tempo, ajustes: mia });
    const porClave = new Map(generada.notas.map(n => [n.clave, n]));
    const notas = ajustada.notas.map(n => {
        const g = porClave.get(n.clave);
        return { ...n, base: g ? g.carril : n.carril, movida: !!g && g.carril !== n.carril };
    });
    const vivas = new Set(notas.map(n => n.clave));
    const quitadas = generada.notas.filter(n => !vivas.has(n.clave)).map(n => ({ ...n, base: n.carril, movida: false, quitada: true }));
    return { dificultad, carriles: ajustada.carriles, duracion: ajustada.duracion, secciones: ajustada.secciones, notas, quitadas };
}

// «Revisar partitura» listo para pintar: cada aviso con su texto, gravedad y sección (n), de lo grave a lo suave.
export function revisar(clave, cancion, reglasJson, ajustes, tempo = 1) {
    const mias = ajustes && ajustes[clave] ? ajustes[clave] : {};
    const avisos = revisarPartitura(cancion, reglasDe(reglasJson), { tempo, ajustes: mias });
    return avisos.slice().sort((a, b) => Number(b.grave) - Number(a.grave));
}

// Cuántos ajustes tiene una canción (todas las dificultades), para el rótulo del selector.
export function contarAjustes(ajustes, cancion) {
    const c = ajustes && ajustes[cancion];
    return c ? Object.values(c).reduce((a, d) => a + Object.keys(d).length, 0) : 0;
}

// ---------- Estructura de la canción (S10c-1) ----------
// Las secciones de musica.json → canciones.<clave>.estructura: { seccion, compases, nivel?, bpm?, pasos? }. Cada función
// devuelve una estructura nueva (o null si el valor no es válido, y no toca la original). La partitura se regenera sola.
export const NOMBRES_SECCION = ['intro', 'verso', 'precoro', 'coro', 'puente', 'solo', 'final'];
const NOMBRE_OK = /^[a-z][a-z0-9_-]{0,23}$/;
const LIMITES = { compases: [1, 64, true], bpm: [30, 300, false], pasos: [4, 32, true] };
export const MAX_SECCIONES = 64;

export function nombreValido(n) { return NOMBRE_OK.test(String(n)); }
export function nivelDe(sec) { return sec.nivel || sec.seccion; }

// Niveles (ya usados por la estructura) para ofrecerlos en el selector de nivel, en orden de aparición.
export function nivelesUsados(c) { return [...new Set(((c && c.estructura) || []).map(nivelDe))]; }

export function agregarSeccion(est, despuesDe, nombre = 'verso', compases = 4) {
    if (est.length >= MAX_SECCIONES || !nombreValido(nombre)) return null;
    const nueva = { seccion: nombre, compases: Math.max(1, Math.min(64, Math.round(compases) || 4)) };
    const sal = clonar(est); sal.splice(despuesDe == null ? sal.length : despuesDe + 1, 0, nueva);
    return sal;
}
export function duplicarSeccion(est, i) {
    if (!est[i] || est.length >= MAX_SECCIONES) return null;
    const sal = clonar(est); sal.splice(i + 1, 0, clonar(est[i])); return sal;
}
// Una canción necesita al menos una sección: con una sola, no se quita.
export function quitarSeccion(est, i) {
    if (!est[i] || est.length <= 1) return null;
    const sal = clonar(est); sal.splice(i, 1); return sal;
}
export function moverSeccion(est, i, dir) {
    const j = i + dir;
    if (!est[i] || j < 0 || j >= est.length) return null;
    const sal = clonar(est); [sal[i], sal[j]] = [sal[j], sal[i]]; return sal;
}
// campo: seccion | compases | nivel | bpm | pasos. «» o null en nivel, bpm o pasos = volver al valor de la canción.
export function cambiarSeccion(est, i, campo, valor) {
    if (!est[i]) return null;
    const sal = clonar(est), sec = sal[i];
    if (campo === 'seccion') { if (!nombreValido(valor)) return null; sec.seccion = String(valor); return sal; }
    if (campo === 'nivel') {
        if (valor === '' || valor == null || valor === sec.seccion) delete sec.nivel;
        else if (nombreValido(valor)) sec.nivel = String(valor); else return null;
        return sal;
    }
    const lim = LIMITES[campo];
    if (!lim) return null;
    if ((valor === '' || valor == null) && campo !== 'compases') { delete sec[campo]; return sal; }
    const v = Number(valor);
    if (!Number.isFinite(v) || v < lim[0] || v > lim[1] || (lim[2] && !Number.isInteger(v))) return null;
    sec[campo] = v; return sal;
}

// Progresión de un nivel: progs[nivel] o, si no hay, la de la canción. En texto: «Am D F G».
export function progDe(c, nivel) { return (c.progs && c.progs[nivel]) || c.prog || []; }
export function progATexto(p) { return (p || []).join(' '); }
// Devuelve { progs } nueva o null si algún acorde no se reconoce (el nombre del acorde sale en `malo`). Texto vacío = quitar la del nivel.
export function ponerProg(c, nivel, texto) {
    const lista = String(texto || '').split(/[\s,]+/).filter(Boolean);
    const malo = lista.find(a => !acordeDe(a, c.acordes));
    if (malo) return { progs: null, malo };
    const progs = clonar(c.progs || {});
    if (!lista.length || JSON.stringify(lista) === JSON.stringify(c.prog)) delete progs[nivel]; else progs[nivel] = lista;
    return { progs, malo: null };
}

// ---------- Capa `bajo` (S10c-2) ----------
// Notas [paso, técnica, nota MIDI, duración en pasos, extra]. El `paso` cuenta desde el inicio del patrón de la capa
// (`compases` × pasos de la sección). La partitura toma la primera nota de cada paso, así que aquí hay una por paso.
export { nombreNota } from './musica-modelo.mjs';
export const TECNICAS = ['s', 'p', 'g', 't', 'd', 'a', 'r'];
export const NOMBRE_TECNICA = { s: ['Slap', 'Slap'], p: ['Pop', 'Pop'], g: ['Fantasma', 'Ghost'], t: ['Tapping', 'Tapping'], d: ['Glissando', 'Glissando'], a: ['Armónico', 'Harmonic'], r: ['Rasgueo', 'Strum'] };
export const NOTA_MIN = 20, NOTA_MAX = 100;

// Capas de bajo que suenan en un nivel: [{ i (índice en capas), capa }]
export function capasBajo(c, nivel) {
    const l = [];
    (c.capas || []).forEach((capa, i) => { if (capa.bajo && (!capa.niveles || capa.niveles.includes(nivel))) l.push({ i, capa }); });
    return l;
}
export const largoPatron = (capa, pasos) => (capa.compases || 1) * pasos;

// El extra que pide cada técnica al crear una nota: d = nota final, r = acorde
export function extraPorDefecto(tipo, nota) {
    if (tipo === 'd') return Math.min(NOTA_MAX, nota + 5);
    if (tipo === 'r') return [nota, Math.min(NOTA_MAX, nota + 7), Math.min(NOTA_MAX, nota + 12)];
    return undefined;
}
export function notaValida(n) {
    if (!Array.isArray(n) || n.length < 4 || n.length > 5) return false;
    const [paso, tipo, nota, dur, extra] = n;
    if (!Number.isInteger(paso) || paso < 0 || !TECNICAS.includes(tipo)) return false;
    if (!Number.isInteger(nota) || nota < NOTA_MIN || nota > NOTA_MAX || !(dur >= 0.05 && dur <= 64)) return false;
    if (tipo === 'd') return Number.isInteger(extra) && extra >= NOTA_MIN && extra <= NOTA_MAX;
    if (tipo === 'r') return extra === undefined || (Array.isArray(extra) && extra.length >= 1 && extra.length <= 6 && extra.every(x => Number.isInteger(x) && x >= NOTA_MIN && x <= NOTA_MAX));
    return n.length === 4;
}
export const notaEnPaso = (bajo, paso) => bajo.findIndex(n => n[0] === paso);

// Pone una nota (reemplaza la que ya esté en ese paso). Devuelve el bajo nuevo o null si no es válida / no cabe en el patrón.
export function ponerNotaBajo(bajo, nota, largo) {
    if (!notaValida(nota) || nota[0] >= largo) return null;
    const sal = clonar(bajo), i = notaEnPaso(sal, nota[0]);
    if (i >= 0) sal[i] = clonar(nota); else sal.push(clonar(nota));
    sal.sort((a, b) => a[0] - b[0]);
    return sal;
}
// Quita la nota de un paso. Una capa necesita al menos una nota (esquema): con una sola, null.
export function quitarNotaBajo(bajo, paso) {
    const i = notaEnPaso(bajo, paso);
    if (i < 0 || bajo.length <= 1) return null;
    const sal = clonar(bajo); sal.splice(i, 1); return sal;
}
// Cambia un campo de la nota de un paso: tipo | nota | dur | extra | paso. Al cambiar la técnica se ajusta el extra que pide.
export function cambiarNotaBajo(bajo, paso, campo, valor, largo) {
    const i = notaEnPaso(bajo, paso);
    if (i < 0) return null;
    const n = clonar(bajo[i]);
    if (campo === 'tipo') { n[1] = valor; if (valor === 'd' || valor === 'r') n[4] = (valor === 'd' && typeof n[4] === 'number') || (valor === 'r' && Array.isArray(n[4])) ? n[4] : extraPorDefecto(valor, n[2]); else n.length = 4; }
    else if (campo === 'nota') { const d = valor - n[2]; n[2] = valor; if (typeof n[4] === 'number') n[4] += d; else if (Array.isArray(n[4])) n[4] = n[4].map(x => x + d); }
    else if (campo === 'dur') n[3] = valor;
    else if (campo === 'extra') n[4] = valor;
    else if (campo === 'paso') { n[0] = valor; if (valor !== paso && notaEnPaso(bajo, valor) >= 0) return null; }
    else return null;
    if (!notaValida(n) || n[0] >= largo) return null;
    const sal = clonar(bajo); sal[i] = n; sal.sort((a, b) => a[0] - b[0]);
    return sal;
}
// Cambia los compases del patrón. Las notas que quedan fuera se quitan (devuelve { bajo, perdidas }); null si no queda ninguna.
export function cambiarCompasesBajo(capa, compases, pasos) {
    if (!Number.isInteger(compases) || compases < 1 || compases > 4) return null;
    const largo = compases * pasos, bajo = capa.bajo.filter(n => n[0] < largo);
    return bajo.length ? { bajo: clonar(bajo), perdidas: capa.bajo.length - bajo.length } : null;
}
// Texto <-> lista de notas para el acorde del rasgueo («28 35 40»)
export const acordeATexto = a => (Array.isArray(a) ? a : []).join(' ');
export function textoAAcorde(t) {
    const l = String(t || '').split(/[\s,]+/).filter(Boolean).map(Number);
    return l.length && l.length <= 6 && l.every(x => Number.isInteger(x) && x >= NOTA_MIN && x <= NOTA_MAX) ? l : null;
}

// Dónde cae cada nota de la partitura de una dificultad dentro del patrón de una capa, para dibujar los carriles bajo la rejilla.
// Devuelve [{ col, carril, carriles, marcada }] para la sección `n` (índice), solo en la primera vuelta del patrón.
export function carrilesEnPatron(vista, c, n, compasesPatron) {
    const est = c.estructura || [];
    if (!est[n]) return [];
    const ini = est.slice(0, n).reduce((a, s) => a + s.compases, 0), P = est[n].pasos || c.pasos || 16, sal = [];
    for (const x of vista.notas) {
        if (x.n !== n) continue;
        const [comp, paso] = x.clave.split(':').map(Number), k = comp - ini;
        if (k < compasesPatron) sal.push({ col: k * P + paso, carriles: x.carriles || [x.carril], marcada: x.marcada });
    }
    return sal;
}

// ---------- Voz del bajo (`vozBajo` de la canción, S10c-2 parte 2) ----------
// Los valores base son VOZ_BAJO (musica-bajo.js); la canción solo guarda lo que el dueño cambió.
// Campos: [clave, mínimo, máximo, paso, rótulo es, rótulo en] (rangos del esquema musica.schema.json).
export const CAMPOS_VOZ = [
    ['vol', 0, 2, 0.01, 'volumen del bajo', 'bass volume'],
    ['saturacion', 0.1, 10, 0.1, 'saturación', 'saturation']
];
export const CAMPOS_PICO = [
    ['frec', 20, 20000, 10, 'frecuencia (Hz)', 'frequency (Hz)'],
    ['q', 0, 30, 0.1, 'Q', 'Q'],
    ['ganancia', -24, 24, 0.5, 'ganancia (dB)', 'gain (dB)']
];
export const PICOS_VOZ = [['nasal', 'Nasal', 'Nasal'], ['metal', 'Metal', 'Metal']];
export const CAMPOS_TECNICA = [
    ['brillo', 50, 20000, 10, 'brillo (Hz)', 'brightness (Hz)'],
    ['q', 0, 30, 0.1, 'Q', 'Q'],
    ['ataque', 0.001, 0.5, 0.001, 'ataque (s)', 'attack (s)'],
    ['vol', 0, 2, 0.01, 'volumen', 'volume'],
    ['cola', 0, 4, 0.01, 'cola (s)', 'tail (s)'],
    ['largo', 0.005, 2, 0.005, 'largo fijo (s)', 'fixed length (s)'],
    ['golpes', 1, 6, 1, 'golpes', 'strokes'],
    ['separacion', 0, 0.5, 0.005, 'separación (s)', 'spacing (s)'],
    ['rasgueo', 0, 0.1, 0.001, 'rasgueo (s)', 'strum (s)']
];
export const CAMPOS_CHASQUIDO = [
    ['frec', 20, 20000, 10, 'frecuencia (Hz)', 'frequency (Hz)'],
    ['vol', 0, 2, 0.01, 'volumen', 'volume'],
    ['largo', 0.002, 0.5, 0.002, 'largo (s)', 'length (s)']
];
// Ruta de un valor: ['vol'] | ['nasal','frec'] | ['tecnicas','s','brillo'] | ['tecnicas','s','chasquido','vol']
const rangoDe = ruta => {
    const u = ruta[ruta.length - 1];
    const tabla = ruta[0] === 'tecnicas' ? (ruta[2] === 'chasquido' ? CAMPOS_CHASQUIDO : CAMPOS_TECNICA) : (ruta.length === 2 ? CAMPOS_PICO : CAMPOS_VOZ);
    return tabla.find(f => f[0] === u) || null;
};
// Valor que suena: el de la canción si lo cambió, si no el base
export function valorVoz(c, ruta) {
    const efectiva = vozDe(c && c.vozBajo ? clonar(c.vozBajo) : null); // copia: vozDe guarda su resultado por objeto
    let v = efectiva;
    for (const k of ruta) v = v == null ? undefined : v[k];
    return v;
}
// Pone un valor en c.vozBajo (crea lo que falte, solo esa clave). Devuelve false si la ruta o el número no valen.
export function ponerVoz(c, ruta, valor) {
    const r = rangoDe(ruta);
    if (!r || typeof valor !== 'number' || !isFinite(valor) || valor < r[1] || valor > r[2]) return false;
    if (ruta[0] === 'tecnicas' && !TECNICAS_BAJO.includes(ruta[1])) return false;
    let o = c.vozBajo = c.vozBajo || {};
    for (const k of ruta.slice(0, -1)) o = o[k] = o[k] || {};
    o[ruta[ruta.length - 1]] = valor;
    return true;
}
// ¿Hay algún ajuste de voz en la canción?
export const hayVoz = c => !!(c && c.vozBajo && Object.keys(c.vozBajo).length);
