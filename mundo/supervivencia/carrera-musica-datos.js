// =========================================================
// VENJY · Supervivencia · Música de la carrera: los temas como datos (puro, sin navegador)
// Lo toca carrera-musica.js con los instrumentos de musica.js. Formato de un tema y sus capas: ver abajo.
// Es el formato que podrá editar el Estudio (editor de música, pendiente).
// =========================================================
// Acordes en MIDI (raíz, tercera, quinta, séptima opcional)
export const AC = {
    Am: [45, 48, 52], F: [41, 45, 48], C: [48, 52, 55], G: [43, 47, 50],
    Dm7: [50, 53, 57, 60], G7: [43, 47, 50, 53], A7: [45, 49, 52, 55],
    Em: [40, 43, 47], D: [38, 42, 45], B: [35, 39, 42],
    Cm: [48, 51, 55], Ab: [44, 48, 51], Eb: [39, 43, 46], Bb: [46, 50, 53]
};
// Melodías de 4 compases × 16 semicorcheas (0 = silencio); cada nota dura hasta la siguiente
const MEL = {
    living: [
        76, 0, 76, 0, 74, 76, 0, 72, 0, 69, 0, 72, 74, 0, 76, 0,
        77, 0, 77, 0, 76, 77, 0, 81, 0, 79, 0, 77, 76, 0, 72, 0,
        79, 0, 79, 0, 77, 79, 0, 76, 0, 72, 0, 76, 79, 0, 84, 0,
        83, 0, 81, 0, 79, 0, 77, 0, 76, 0, 74, 0, 71, 0, 74, 0],
    cocina: [
        74, 0, 77, 0, 79, 0, 81, 0, 0, 79, 77, 0, 74, 0, 0, 0,
        0, 0, 77, 79, 81, 0, 79, 77, 79, 0, 0, 0, 83, 81, 79, 0,
        74, 0, 77, 0, 79, 0, 81, 0, 84, 0, 81, 0, 79, 77, 74, 0,
        76, 0, 0, 73, 76, 0, 79, 0, 81, 0, 79, 0, 76, 0, 73, 0],
    // El patio, en corcheas: la guitarra toca cada una dos veces (trémolo)
    patio: [
        76, 76, 79, 81, 83, 83, 81, 79,
        79, 79, 76, 79, 84, 84, 83, 79,
        78, 78, 81, 83, 86, 86, 83, 81,
        83, 83, 81, 78, 75, 75, 78, 0].flatMap(n => [n, n]),
    techo: [
        79, 0, 0, 0, 0, 0, 0, 0, 75, 0, 0, 0, 77, 0, 79, 0,
        80, 0, 0, 0, 0, 0, 79, 0, 77, 0, 0, 0, 75, 0, 0, 0,
        79, 0, 0, 0, 0, 0, 0, 0, 82, 0, 0, 0, 84, 0, 82, 0,
        82, 0, 0, 0, 80, 0, 79, 0, 77, 0, 0, 0, 74, 0, 0, 0],
    podio: [
        72, 0, 76, 0, 79, 0, 84, 0, 0, 0, 79, 0, 84, 0, 0, 0,
        81, 0, 0, 77, 81, 0, 84, 0, 81, 0, 77, 0, 72, 0, 0, 0,
        79, 0, 0, 74, 79, 0, 83, 0, 86, 0, 83, 0, 79, 0, 0, 0,
        84, 0, 79, 0, 76, 0, 79, 0, 84, 0, 0, 0, 0, 0, 0, 0]
};

// Cada tema: bpm, progresión (un acorde por compás), volumen y capas. Cada capa toca en ciertos niveles ('menu' en el
// menú y la sala, 'cuenta', 'corre', 'ultima' = última vuelta) y es de uno de estos tipos (un patrón dura 1 compás =
// 16 semicorcheas, o 4 compases = 64):
//  · ritmo: golpes de batería, texto con 'x' (fuerte), 'o' (suave) y '.' (nada)
//  · rel: notas relativas a la raíz del acorde (null = nada), + octava
//  · acorde: en los pasos `pasos`, el acorde (o `intervalos` sobre la raíz), + octava
//  · notas: melodía en MIDI (0 = silencio); sin `dur`, cada nota dura hasta la siguiente (máx. 6 pasos)
//  · arpegio: índices de las notas del acorde, uno por paso, + octava
// `dur` va en pasos; `segunda: true` = solo en la segunda vuelta de 4 compases (para variar).
const TODO = ['menu', 'cuenta', 'corre', 'ultima'], CORRE = ['corre', 'ultima'], SIN_MENU = ['cuenta', 'corre', 'ultima'];
const _ = null;
export const TEMAS_CARRERA = {
    living: { // rock chiptune de gran premio
        bpm: 160, prog: ['Am', 'F', 'C', 'G'], vol: 0.1,
        capas: [
            { inst: 'bajoSierra', rel: [0, _, 12, _, 0, _, 12, _, 0, _, 12, _, 0, _, 12, _], octava: -12, dur: 1.6, vol: 0.32, niveles: TODO },
            { inst: 'hat', ritmo: 'o.x.o.x.o.x.o.x.', vol: 0.32, niveles: TODO },
            { inst: 'colchon', acorde: true, pasos: [0, 8], octava: 12, dur: 8, vol: 0.12, niveles: ['menu'] },
            { inst: 'kick', ritmo: 'x...x...x...x...', vol: 0.75, niveles: ['cuenta'] },
            { inst: 'kick', ritmo: 'x.......x.x.....', vol: 0.75, niveles: CORRE },
            { inst: 'caja', ritmo: '....x.......x...', vol: 0.4, niveles: CORRE },
            { inst: 'pulsar', acorde: true, pasos: [0, 3, 6, 10, 12], intervalos: [12, 19], dur: 1.5, vol: 0.14, niveles: CORRE },
            { inst: 'chip', notas: MEL.living, vol: 0.26, niveles: CORRE },
            { inst: 'chip', arpegio: [0, 1, 2, 1], octava: 24, dur: 0.8, vol: 0.06, niveles: ['corre'], segunda: true },
            { inst: 'chip', arpegio: [0, 1, 2, 1, 0, 1, 2, 1, 1, 2, 0, 2, 1, 2, 0, 2], octava: 24, dur: 0.8, vol: 0.1, niveles: ['ultima'] }
        ]
    },
    cocina: { // funk de cocina: bajo con saltos de octava, piano eléctrico a contratiempo y ollas
        bpm: 128, prog: ['Dm7', 'G7', 'Dm7', 'A7'], vol: 0.11,
        capas: [
            { inst: 'bajoSierra', rel: [0, _, _, 0, _, _, 12, _, 0, _, 7, 10, _, _, 12, _], octava: -12, dur: 0.9, vol: 0.38, niveles: TODO },
            { inst: 'hat', ritmo: 'xoxoxoxoxoxoxoxo', vol: 0.24, niveles: TODO },
            { inst: 'rhodes', acorde: true, pasos: [2, 7, 10], octava: 12, dur: 1.2, vol: 0.12, niveles: ['menu'] },
            { inst: 'rhodes', acorde: true, pasos: [2, 7, 10], octava: 12, dur: 1.2, vol: 0.18, niveles: SIN_MENU },
            { inst: 'kick', ritmo: 'x...x...x...x...', vol: 0.7, niveles: ['cuenta'] },
            { inst: 'kick', ritmo: 'x.....x...x.....', vol: 0.7, niveles: CORRE },
            { inst: 'caja', ritmo: '....x.......x..o', vol: 0.38, niveles: CORRE },
            { inst: 'madera', ritmo: '...x.......x....', vol: 0.3, niveles: CORRE }, // las ollas
            { inst: 'pulsar', notas: MEL.cocina, vol: 0.3, niveles: CORRE },
            { inst: 'chip', arpegio: [0, 1, 2, 3], octava: 24, dur: 0.8, vol: 0.05, niveles: ['corre'], segunda: true },
            { inst: 'chip', arpegio: [0, 1, 2, 3, 2, 1, 2, 3], octava: 24, dur: 0.8, vol: 0.09, niveles: ['ultima'] }
        ]
    },
    patio: { // surf rock: guitarra en trémolo, bajo que camina y batería al galope
        bpm: 172, prog: ['Em', 'C', 'D', 'B'], vol: 0.1,
        capas: [
            { inst: 'bajo', rel: [0, _, 7, _, 12, _, 7, _, 0, _, 7, _, 12, _, 7, _], dur: 1.8, vol: 0.42, niveles: TODO },
            { inst: 'hat', ritmo: 'o.x.o.x.o.x.o.x.', vol: 0.3, niveles: TODO },
            { inst: 'pulsar', rel: [0, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _], octava: 24, dur: 8, vol: 0.14, niveles: ['menu'] },
            { inst: 'kick', ritmo: 'x...x...x...x...', vol: 0.75, niveles: ['cuenta'] },
            { inst: 'kick', ritmo: 'x.......x..x....', vol: 0.75, niveles: CORRE },
            { inst: 'caja', ritmo: '....x.......x...', vol: 0.42, niveles: CORRE },
            { inst: 'platillo', ritmo: 'x' + '.'.repeat(63), vol: 0.12, niveles: CORRE },
            { inst: 'pulsar', notas: MEL.patio, dur: 0.9, vol: 0.22, niveles: CORRE },
            { inst: 'chip', arpegio: [0, 1, 2, 1], octava: 24, dur: 0.8, vol: 0.05, niveles: ['corre'], segunda: true },
            { inst: 'chip', arpegio: [0, 1, 2, 1], octava: 24, dur: 0.8, vol: 0.08, niveles: ['ultima'] }
        ]
    },
    techo: { // synthwave al atardecer: bajo de sierra en octavas, colchón, bombo en negras y melodía larga
        bpm: 138, prog: ['Cm', 'Ab', 'Eb', 'Bb'], vol: 0.1,
        capas: [
            { inst: 'bajoSierra', rel: [0, 12, 0, 12, 0, 12, 0, 12, 0, 12, 0, 12, 0, 12, 0, 12], octava: -12, dur: 0.9, vol: 0.28, niveles: TODO },
            { inst: 'colchon', acorde: true, pasos: [0], octava: 12, dur: 16, vol: 0.11, niveles: TODO },
            { inst: 'hat', ritmo: '..x...x...x...x.', vol: 0.28, niveles: TODO },
            { inst: 'kick', ritmo: 'x...x...x...x...', vol: 0.8, niveles: SIN_MENU },
            { inst: 'cajaGrande', ritmo: '....x.......x...', vol: 0.4, niveles: CORRE },
            { inst: 'chip', arpegio: [0, 1, 2, 1], octava: 24, dur: 0.7, vol: 0.07, niveles: CORRE },
            { inst: 'chip', notas: MEL.techo, vol: 0.24, niveles: CORRE },
            { inst: 'chip', arpegio: [2, 1, 0, 1], octava: 36, dur: 0.7, vol: 0.06, niveles: ['ultima'] }
        ]
    },
    podio: { // fanfarria de victoria
        bpm: 120, prog: ['C', 'F', 'G', 'C'], vol: 0.1,
        capas: [
            { inst: 'bajo', rel: [0, _, _, _, _, _, _, _, 0, _, _, _, _, _, _, _], octava: -12, dur: 6, vol: 0.4, niveles: TODO },
            { inst: 'rhodes', acorde: true, pasos: [0, 8], octava: 12, dur: 6, vol: 0.2, niveles: TODO },
            { inst: 'kick', ritmo: 'x...x...x...x...', vol: 0.5, niveles: TODO },
            { inst: 'hat', ritmo: '.x.x.x.x.x.x.x.x', vol: 0.15, niveles: TODO },
            { inst: 'caja', ritmo: '....x.......x...', vol: 0.25, niveles: TODO },
            { inst: 'chip', notas: MEL.podio, vol: 0.26, niveles: TODO }
        ]
    }
};
export const LISTA_TEMAS = Object.keys(TEMAS_CARRERA);

// Batería que no está en musica.js
const G = {
    platillo: (I, c, o, t, vol) => I.ruido(c, o, t, vol, 0.8, 5000, 'highpass'),
    cajaGrande: (I, c, o, t, vol) => I.ruido(c, o, t, vol, 0.3, 1500, 'bandpass')
};
// Instrumentos que puede usar una capa (los de musica.js más los de G) y los niveles
export const INSTRUMENTOS = ['piano', 'pulsar', 'banjo', 'cajita', 'steel', 'chip', 'bajo', 'bajoSierra', 'colchon', 'rhodes', 'kick', 'caja', 'hat', 'madera', ...Object.keys(G)];
export const NIVELES = TODO;
const DE_ACORDE = new Set(['colchon', 'rhodes']); // reciben todas las notas juntas
// Duración (en pasos) de cada nota de una melodía: hasta la siguiente, como mucho 6
const largos = new WeakMap();
function largoDe(notas) {
    let l = largos.get(notas);
    if (!l) {
        l = notas.map((n, i) => { if (!n) return 0; let j = 1; while (j < 6 && !notas[(i + j) % notas.length]) j++; return j; });
        largos.set(notas, l);
    }
    return l;
}
// Toca el paso i (0-15) del compás k de un tema; s = segundos por semicorchea; I = instrumentos de musica.js
export function tocarPaso(I, def, c, o, t, i, k, s, nivel) {
    const ac = AC[def.prog[k % def.prog.length]] || AC.C, j = (k % 4) * 16 + i;
    const de = arr => arr[j % arr.length];
    for (const p of def.capas) {
        if (!p.niveles.includes(nivel) || (p.segunda && (k >> 2) % 2 === 0)) continue;
        const dur = s * (p.dur || 1), oct = p.octava || 0;
        if (p.ritmo) {
            const g = de(p.ritmo); if (g !== 'x' && g !== 'o') continue;
            const v = p.vol * (g === 'o' ? 0.5 : 1);
            if (G[p.inst]) G[p.inst](I, c, o, t, v); else I[p.inst](c, o, t, v);
        } else if (p.rel) {
            const r = de(p.rel); if (r === null || r === undefined) continue;
            I[p.inst](c, o, t, ac[0] + oct + r, dur, p.vol);
        } else if (p.acorde) {
            if (!p.pasos.includes(i)) continue;
            const notas = (p.intervalos ? p.intervalos.map(x => ac[0] + x) : ac).map(m => m + oct);
            if (DE_ACORDE.has(p.inst)) I[p.inst](c, o, t, notas, dur, p.vol);
            else for (const m of notas) I[p.inst](c, o, t, m, dur, p.vol);
        } else if (p.notas) {
            const n = de(p.notas); if (!n) continue;
            I[p.inst](c, o, t, n + oct, p.dur ? dur : s * largoDe(p.notas)[j % p.notas.length] * 0.9, p.vol);
        } else if (p.arpegio) {
            const idx = p.arpegio[i % p.arpegio.length];
            I[p.inst](c, o, t, ac[idx % ac.length] + oct, dur, p.vol);
        }
    }
}
