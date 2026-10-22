// =========================================================
// VENJY · Estudio · pestaña Música, vista simple (Etapa B, 0b · B0-M, estudio/DISENO.md §39)
// Puro (lo prueba mundo/tests/estudio-musica.mjs). Partir de un estilo (cumbia, rock, disco, chiptune, ska, lofi) con su
// base lista (batería, bajo, acordes y una melodía de ejemplo) y moverlo con perillas que tocan varios valores a la vez:
//   rapidez (bpm), ánimo (alegre ↔ triste: la progresión parte en un acorde mayor o menor), fuerza (volumen del tema y,
//   un poco más, la batería) y tono (sube o baja todo: acordes y melodía). La tonalidad y el compás se leen solos.
// Solo usa instrumentos del código (musica-motor.js → INSTRUMENTOS) y el formato del esquema (sin claves nuevas).
// =========================================================
import { RAICES, CALIDADES, BATERIA } from '../mundo/supervivencia/musica-motor.js';

const clonar = o => JSON.parse(JSON.stringify(o));
const _ = null;
const ritmo = (inst, patron, vol) => ({ nombre: inst, inst, ritmo: patron, vol });
const bajo = (inst, rel, vol = 0.4) => ({ nombre: 'bajo', inst, rel, octava: -12, dur: 2, vol });
const acordes = (inst, pasos, dur, vol, extra = {}) => ({ nombre: 'acordes', inst, acorde: true, pasos, octava: 12, dur, vol, ...extra });
const melodia = (inst, notas, vol = 0.2) => ({ nombre: 'melodía', inst, notas, vol });

// Melodías de ejemplo (MIDI; 0 = silencio), en Do mayor / La menor pentatónica: calzan con las progresiones de abajo
const MEL_A = [72, 0, 0, 74, 76, 0, 74, 0, 72, 0, 69, 0, 67, 0, 0, 0];
const MEL_B = [76, 0, 79, 0, 76, 0, 74, 72, 74, 0, 0, 0, 72, 0, 69, 0];
const MEL_C = [69, 0, 72, 0, 74, 0, 72, 0, 76, 0, 74, 0, 72, 0, 0, 0];

// clave: { nombre [es, en], bpm, swing?, prog, capas }
export const ESTILOS = {
    cumbia: {
        nombre: ['Cumbia', 'Cumbia'], bpm: 96, prog: ['Am', 'Dm', 'G', 'C'],
        capas: [
            ritmo('kick', 'x...x...x...x...', 0.55),
            ritmo('hat', 'x.xxx.xxx.xxx.xx', 0.14),
            ritmo('madera', '..x...x...x...x.', 0.3),
            bajo('bajo', [0, _, _, _, 7, _, _, _, 0, _, _, _, 7, _, _, _]),
            acordes('piano', [2, 6, 10, 14], 1, 0.14),
            melodia('steel', MEL_C)
        ]
    },
    rock: {
        nombre: ['Rock', 'Rock'], bpm: 128, prog: ['C', 'G', 'Am', 'F'],
        capas: [
            ritmo('kick', 'x.......x.x.....', 0.6),
            ritmo('caja', '....x.......x...', 0.35),
            ritmo('hat', 'x.x.x.x.x.x.x.x.', 0.12),
            bajo('bajoSierra', [0, _, 0, _, 0, _, 0, _, 0, _, 0, _, 0, _, 0, _], 0.35),
            acordes('pulsar', [0, 8], 8, 0.12, { intervalos: [0, 7, 12] }),
            melodia('pulsar', MEL_B, 0.16)
        ]
    },
    disco: {
        nombre: ['Disco', 'Disco'], bpm: 118, prog: ['Fmaj7', 'Em7', 'Dm7', 'Cmaj7'],
        capas: [
            ritmo('kick', 'x...x...x...x...', 0.6),
            ritmo('caja', '....x.......x...', 0.3),
            ritmo('hat', '..x...x...x...x.', 0.18),
            bajo('bajoSlap', [0, _, 12, _, 0, _, 12, _, 0, _, 12, _, 0, _, 12, _]),
            acordes('rhodes', [2, 6, 10, 14], 1, 0.14),
            melodia('piano', MEL_A)
        ]
    },
    chiptune: {
        nombre: ['Chiptune', 'Chiptune'], bpm: 140, prog: ['C', 'Am', 'F', 'G'],
        capas: [
            ritmo('kick', 'x.......x.......', 0.55),
            ritmo('caja', '....x.......x...', 0.3),
            ritmo('hat', 'x.x.x.x.x.x.x.x.', 0.1),
            bajo('bajo', [0, _, 12, _, 0, _, 12, _, 0, _, 12, _, 0, _, 12, _], 0.35),
            { nombre: 'arpegio', inst: 'chip', arpegio: [0, 1, 2, 1], octava: 24, dur: 1, vol: 0.07 },
            melodia('chip', MEL_B)
        ]
    },
    ska: {
        nombre: ['Ska', 'Ska'], bpm: 150, prog: ['C', 'F', 'G', 'F'],
        capas: [
            ritmo('kick', 'x.......x.......', 0.55),
            ritmo('caja', '....x.......x...', 0.32),
            ritmo('hat', 'x.x.x.x.x.x.x.x.', 0.12),
            bajo('bajo', [0, _, 4, _, 7, _, 4, _, 0, _, 4, _, 7, _, 9, _]),
            acordes('piano', [2, 6, 10, 14], 1, 0.16),
            melodia('banjo', MEL_A, 0.18)
        ]
    },
    lofi: {
        nombre: ['Lofi tranquilo', 'Chill lofi'], bpm: 80, swing: 0.15, prog: ['Fmaj7', 'Em7', 'Dm7', 'Cmaj7'],
        capas: [
            ritmo('kick', 'x......x..x.....', 0.5),
            ritmo('caja', '....x.......x...', 0.25),
            ritmo('hat', 'x.x.x.x.x.x.x.x.', 0.08),
            bajo('bajo', [0, _, _, _, _, _, _, _, _, _, 7, _, _, _, _, _], 0.38),
            acordes('rhodes', [0], 16, 0.12),
            melodia('cajita', MEL_C, 0.16)
        ]
    }
};

// Tema nuevo a partir de un estilo (borrador, uso libre; el juego no lo usa hasta que se aplique)
export function temaDeEstilo(clave) {
    const E = ESTILOS[clave];
    if (!E) throw new Error('estilo desconocido: ' + clave);
    const T = {
        nombre: { es: `Mi ${E.nombre[0].toLowerCase()}`, en: `My ${E.nombre[1].toLowerCase()}` },
        borrador: true, uso: 'libre', bpm: E.bpm, pasos: 16, vol: 0.09, prog: [...E.prog], capas: clonar(E.capas)
    };
    if (E.swing) T.swing = E.swing;
    return T;
}

// ---------- Rapidez ----------
export const BPM_MIN = 60, BPM_MAX = 200;
export function ponerRapidez(T, bpm) { T.bpm = Math.round(Math.min(BPM_MAX, Math.max(BPM_MIN, bpm))); return T; }
// Palabra para el bpm: [es, en]
export function palabraRapidez(bpm) {
    if (bpm < 90) return ['lenta', 'slow'];
    if (bpm < 125) return ['normal', 'medium'];
    if (bpm < 155) return ['rápida', 'fast'];
    return ['muy rápida', 'very fast'];
}

// ---------- Ánimo ----------
// Un acorde es «menor» si su calidad empieza con m (m, m7, m6) o es dim; maj7 es mayor
const partir = nombre => { const m = /^([A-G][#b]?)(.*)$/.exec(nombre || ''); return m ? { raiz: m[1], calidad: m[2] } : null; };
export const esMenor = nombre => { const p = partir(nombre); return !!p && ((p.calidad.startsWith('m') && !p.calidad.startsWith('maj')) || p.calidad === 'dim'); };
export const animoDe = prog => (prog && prog.length && esMenor(prog[0]) ? 'triste' : 'alegre');
// Triste: la vuelta parte en el primer acorde menor (si no hay ninguno, los mayores pasan a menores); alegre: en el primer mayor
export function ponerAnimo(T, animo) {
    const prog = T.prog || [];
    if (!prog.length || animoDe(prog) === animo) return T;
    const quiere = animo === 'triste' ? esMenor : n => !esMenor(n);
    const i = prog.findIndex(quiere);
    if (i > 0) T.prog = [...prog.slice(i), ...prog.slice(0, i)];
    else if (animo === 'triste') T.prog = prog.map(aMenor);
    else T.prog = prog.map(aMayor);
    return T;
}
function aMenor(n) {
    const p = partir(n); if (!p || esMenor(n)) return n;
    const q = { '': 'm', 7: 'm7', maj7: 'm7', 6: 'm6', add9: 'm', sus2: 'm', sus4: 'm', aug: 'm' }[p.calidad];
    return q !== undefined && q in CALIDADES ? p.raiz + q : n;
}
function aMayor(n) {
    const p = partir(n); if (!p || !esMenor(n)) return n;
    const q = { m: '', m7: '7', m6: '6', dim: '' }[p.calidad];
    return q !== undefined ? p.raiz + q : n;
}

// ---------- Fuerza ----------
// 0 (muy suave) a 1 (muy fuerte): el volumen del tema; la batería sube o baja un poco más que el resto
export const VOL_MIN = 0.03, VOL_MAX = 0.18;
export const fuerzaDe = T => Math.min(1, Math.max(0, ((T.vol ?? 0.09) - VOL_MIN) / (VOL_MAX - VOL_MIN)));
export function ponerFuerza(T, f) {
    const viejo = T.vol ?? 0.09;
    const nuevo = Math.round((VOL_MIN + Math.min(1, Math.max(0, f)) * (VOL_MAX - VOL_MIN)) * 1000) / 1000;
    const k = Math.sqrt(nuevo / viejo);
    for (const c of T.capas || []) if (c.ritmo && BATERIA.includes(c.inst)) c.vol = Math.round(Math.min(2, Math.max(0.01, c.vol * k)) * 1000) / 1000;
    T.vol = nuevo;
    return T;
}

// ---------- Tono ----------
const ALIAS = { Db: 'C#', 'D#': 'Eb', Gb: 'F#', 'G#': 'Ab', 'A#': 'Bb' };
const indiceRaiz = r => RAICES.indexOf(ALIAS[r] || r);
function moverAcorde(nombre, n, propios) {
    if (propios && propios[nombre]) return nombre; // acordes propios del tema: se quedan
    const p = partir(nombre), i = p ? indiceRaiz(p.raiz) : -1;
    return i < 0 ? nombre : RAICES[(((i + n) % 12) + 12) % 12] + p.calidad;
}
// Sube (n > 0) o baja todo n semitonos: acordes de la progresión (y de cada nivel) y las melodías
export function transponer(T, n) {
    if (!n) return T;
    T.prog = (T.prog || []).map(a => moverAcorde(a, n, T.acordes));
    if (T.progs) for (const k of Object.keys(T.progs)) T.progs[k] = T.progs[k].map(a => moverAcorde(a, n, T.acordes));
    for (const c of T.capas || []) if (Array.isArray(c.notas)) c.notas = c.notas.map(m => (m ? Math.min(127, Math.max(1, m + n)) : m));
    return T;
}
const DO_RE_MI = { C: 'Do', 'C#': 'Do#', D: 'Re', Eb: 'Mib', E: 'Mi', F: 'Fa', 'F#': 'Fa#', G: 'Sol', Ab: 'Lab', A: 'La', Bb: 'Sib', B: 'Si' };
// Tonalidad leída de la progresión (el primer acorde): [es, en], p. ej. ['La menor', 'A minor']
export function tonalidadDe(T) {
    const a = T && T.prog && T.prog[0], p = partir(a);
    if (!p || indiceRaiz(p.raiz) < 0) return ['—', '—'];
    const r = RAICES[indiceRaiz(p.raiz)], menor = esMenor(a);
    return [`${DO_RE_MI[r]} ${menor ? 'menor' : 'mayor'}`, `${r} ${menor ? 'minor' : 'major'}`];
}
// Compás leído de los pasos: [es, en]
export function compasDe(T) {
    const P = (T && T.pasos) || 16;
    return P === 12 || P === 24 ? ['3/4', '3/4'] : P % 16 === 0 || P === 8 ? ['4/4', '4/4'] : [`${P} pasos`, `${P} steps`];
}
