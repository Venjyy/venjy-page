// =========================================================
// VENJY · Estudio · pestaña Ritmo: modelo puro (S10a)
// Sin DOM: la pestaña (ritmo.js) y la prueba (mundo/tests/ritmo.mjs) comparten estas funciones.
// La partitura sale sola del bajo (salonas-partitura.js); aquí solo se arma lo que la línea de tiempo dibuja y se
// llevan los ajustes a mano de salonas.json → ajustes.<canción>.<dificultad>.<compás:paso> = carril (0..n-1) | null
// (null = quitar la nota). Un ajuste nunca cambia cuándo suena una nota, solo dónde cae o si se juega.
// =========================================================
import { partitura, revisarPartitura, reglasDe, DIFICULTADES } from '../mundo/supervivencia/salonas-partitura.js';
import { acordeDe } from '../mundo/supervivencia/musica-motor.js';

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
