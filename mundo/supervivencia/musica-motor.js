// =========================================================
// VENJY · Supervivencia · Motor de temas como datos (puro: no toca el navegador al importarse)
// Un tema es { bpm, pasos, prog, vol, capas } (formato completo en estudio/esquemas/musica.schema.json). Lo usan:
//  · carrera-musica-datos.js (los temas de la carrera, en código) y carrera-musica.js
//  · musica.js: un tema de mundo/datos/musica.json reemplaza por clave a uno del código (musica-datos.js)
//  · la pestaña Música del Estudio (suena en el navegador con los mismos instrumentos) y su vista previa en el juego
// Instrumentos de una capa: los de musica-instrumentos.js (I), la batería extra de abajo o uno propio de musica.json
// (un sintetizador: forma de onda, envolvente, filtro, voces, armónicos, barrido de tono y vibrato).
// =========================================================
import { mtof, bufferRuido } from './musica-instrumentos.js';

// Acordes en MIDI (raíz, tercera, quinta, séptima opcional): los de siempre de la carrera; el resto se arma por nombre
export const AC = {
    Am: [45, 48, 52], F: [41, 45, 48], C: [48, 52, 55], G: [43, 47, 50],
    Dm7: [50, 53, 57, 60], G7: [43, 47, 50, 53], A7: [45, 49, 52, 55],
    Em: [40, 43, 47], D: [38, 42, 45], B: [35, 39, 42],
    Cm: [48, 51, 55], Ab: [44, 48, 51], Eb: [39, 43, 46], Bb: [46, 50, 53]
};
// Para armar un acorde por nombre: raíz (con # o b) + calidad, p. ej. «F#m7», «Bbmaj7», «Dsus4»
export const RAICES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
export const CALIDADES = {
    '': [0, 4, 7], m: [0, 3, 7], 7: [0, 4, 7, 10], m7: [0, 3, 7, 10], maj7: [0, 4, 7, 11], 6: [0, 4, 7, 9], m6: [0, 3, 7, 9],
    dim: [0, 3, 6], aug: [0, 4, 8], sus2: [0, 2, 7], sus4: [0, 5, 7], add9: [0, 4, 7, 14]
};
const NOTA = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const armados = new Map();
// Notas MIDI de un acorde: primero los del tema (`acordes`), luego AC y si no, por nombre (raíz entre Mi2 y Re#3)
export function acordeDe(nombre, propios) {
    if (propios && Array.isArray(propios[nombre])) return propios[nombre];
    if (AC[nombre]) return AC[nombre];
    if (armados.has(nombre)) return armados.get(nombre);
    const m = /^([A-G])([#b]?)(.*)$/.exec(String(nombre));
    const q = m && CALIDADES[m[3]];
    let r = null;
    if (q) {
        let raiz = 36 + ((NOTA[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + 12) % 12);
        if (raiz < 40) raiz += 12;
        r = q.map(x => raiz + x);
    }
    armados.set(nombre, r);
    return r;
}

// Batería que no está en musica-instrumentos.js
const G = {
    platillo: (I, c, o, t, vol) => I.ruido(c, o, t, vol, 0.8, 5000, 'highpass'),
    cajaGrande: (I, c, o, t, vol) => I.ruido(c, o, t, vol, 0.3, 1500, 'bandpass')
};
// Instrumentos del código que puede usar una capa; los de batería se tocan con patrones de ritmo
export const INSTRUMENTOS = ['piano', 'pulsar', 'banjo', 'cajita', 'steel', 'chip', 'bajo', 'bajoSierra', 'colchon', 'rhodes', 'kick', 'caja', 'hat', 'madera', ...Object.keys(G)];
export const BATERIA = ['kick', 'caja', 'hat', 'madera', ...Object.keys(G)];
const DE_ACORDE = new Set(['colchon', 'rhodes']); // reciben todas las notas juntas
export const TIPOS_CAPA = ['ritmo', 'rel', 'acorde', 'notas', 'arpegio'];
export const ONDAS = ['sine', 'square', 'sawtooth', 'triangle', 'ruido'];
export const FILTROS = ['lowpass', 'highpass', 'bandpass'];

// Dónde suena cada tema del código y con qué niveles (un tema de musica.json con esa clave lo reemplaza).
// mundo: el nivel es el momento (día, noche o cueva); bpm, pasos y vol son los del código (la prueba lo revisa).
export const USOS = {
    carrera: {
        niveles: ['menu', 'cuenta', 'corre', 'ultima'],
        temas: ['living', 'cocina', 'patio', 'techo', 'podio']
    },
    mundo: {
        niveles: ['dia', 'noche', 'cueva'],
        temas: {
            ambiente: { bpm: 62, pasos: 16, vol: 0.05 }, venjy: { bpm: 104, pasos: 16, vol: 0.09 }, pony: { bpm: 92, pasos: 12, vol: 0.1 },
            lona: { bpm: 84, pasos: 16, vol: 0.08 }, campamento: { bpm: 100, pasos: 16, vol: 0.09 }, iglu: { bpm: 78, pasos: 16, vol: 0.09 },
            lenera: { bpm: 112, pasos: 16, vol: 0.09 }, playa: { bpm: 96, pasos: 16, vol: 0.09 }, jefe: { bpm: 140, pasos: 16, vol: 0.11 }
        }
    }
};

// ---------------------------------------------------------
// Sintetizador propio (musica.json → instrumentos). Valores que faltan: los de SINTE_BASE.
// ---------------------------------------------------------
export const SINTE_BASE = {
    onda: 'square', ataque: 0.005, caida: 0.25, largo: 1, curva: 'exp', vol: 1, transponer: 0,
    voces: 1, desafino: 0, golpe: 60 // golpe: la nota con la que suena en un patrón de ritmo
};
export function tocarSinte(ctx, out, t, def, m, dur, vol) {
    const D = { ...SINTE_BASE, ...def };
    const a = Math.max(0.001, D.ataque), d = Math.max(0.02, D.caida, dur * D.largo), fin = t + a + d;
    const v = Math.max(0.0002, vol * D.vol);
    const g = ctx.createGain();
    if (D.curva === 'lineal') {
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + a); g.gain.linearRampToValueAtTime(0, fin);
    } else {
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + a); g.gain.exponentialRampToValueAtTime(0.0001, fin);
    }
    g.connect(out);
    let destino = g;
    if (D.filtro) {
        const F = D.filtro, fl = ctx.createBiquadFilter();
        fl.type = FILTROS.includes(F.tipo) ? F.tipo : 'lowpass';
        fl.frequency.setValueAtTime(F.frec || 2000, t);
        if (F.hasta) fl.frequency.exponentialRampToValueAtTime(F.hasta, fin);
        fl.Q.value = F.q === undefined ? 1 : F.q;
        fl.connect(g); destino = fl;
    }
    if (D.onda === 'ruido') {
        const s = ctx.createBufferSource(); s.buffer = bufferRuido(ctx);
        s.connect(destino); s.start(t, Math.random() * 1.5, a + d + 0.05);
        return;
    }
    const f = mtof(m + D.transponer);
    const n = Math.max(1, Math.min(4, D.voces | 0));
    const sumar = (tipo, frec, vol, detune) => {
        const gv = ctx.createGain(); gv.gain.value = vol; gv.connect(destino);
        const o = ctx.createOscillator(); o.type = tipo; o.detune.value = detune;
        if (D.tono && D.tono.desde) {
            o.frequency.setValueAtTime(frec * Math.pow(2, D.tono.desde / 12), t);
            o.frequency.exponentialRampToValueAtTime(frec, t + Math.max(0.005, D.tono.tiempo || 0.1));
        } else o.frequency.value = frec;
        if (D.vibrato && D.vibrato.cents) {
            const lfo = ctx.createOscillator(); lfo.frequency.value = D.vibrato.frec || 5;
            const lg = ctx.createGain(); lg.gain.value = D.vibrato.cents;
            lfo.connect(lg); lg.connect(o.detune); lfo.start(t); lfo.stop(fin + 0.05);
        }
        o.connect(gv); o.start(t); o.stop(fin + 0.05);
    };
    for (let k = 0; k < n; k++) sumar(D.onda, f, 1 / n, n === 1 ? 0 : D.desafino * (k / (n - 1) * 2 - 1));
    for (const h of D.armonicos || []) sumar(ONDAS.includes(h.onda) && h.onda !== 'ruido' ? h.onda : 'sine', f * (h.ratio || 2), h.vol === undefined ? 0.3 : h.vol, 0);
}

// ---------------------------------------------------------
// Un paso de un tema
// ---------------------------------------------------------
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
// Acorde que suena en el compás k (prog por nivel con `progs`, un acorde cada `acordePor` compases)
export function acordeEn(def, k, nivel) {
    const prog = (def.progs && def.progs[nivel]) || def.prog || ['C'];
    return acordeDe(prog[Math.floor(k / (def.acordePor || 1)) % prog.length], def.acordes) || AC.C;
}
// Toca el paso i del compás k de un tema; s = segundos por paso; I = instrumentos (musica-instrumentos.js);
// propios = instrumentos de musica.json; azar = Math.random (las pruebas lo fijan)
export function tocarPaso(I, def, c, o, t, i, k, s, nivel, propios = null, azar = Math.random) {
    const ac = acordeEn(def, k, nivel), P = def.pasos || 16, j = (k % 4) * P + i;
    const de = arr => arr[j % arr.length];
    const tt = t + (def.swing && i % 2 === 1 ? def.swing * s : 0);
    for (const p of def.capas) {
        if (p.mudo || (p.niveles && !p.niveles.includes(nivel)) || (p.segunda && (k >> 2) % 2 === 0)) continue;
        const sinte = propios && propios[p.inst];
        const suena = () => p.prob === undefined || p.prob >= 1 || azar() < p.prob;
        const nota = (m, dur, vol) => {
            if (sinte) tocarSinte(c, o, tt, sinte, m, dur, vol);
            else if (DE_ACORDE.has(p.inst)) I[p.inst](c, o, tt, [m], dur, vol);
            else I[p.inst](c, o, tt, m, dur, vol);
        };
        const dur = s * (p.dur || 1), oct = p.octava || 0;
        if (p.ritmo) {
            const g = de(p.ritmo); if ((g !== 'x' && g !== 'o') || !suena()) continue;
            const v = p.vol * (g === 'o' ? 0.5 : 1);
            if (sinte) tocarSinte(c, o, tt, sinte, (sinte.golpe === undefined ? 60 : sinte.golpe) + oct, dur, v);
            else if (G[p.inst]) G[p.inst](I, c, o, tt, v);
            else I[p.inst](c, o, tt, v);
        } else if (p.rel) {
            const r = de(p.rel); if (r === null || r === undefined || !suena()) continue;
            nota(ac[0] + oct + r, dur, p.vol);
        } else if (p.acorde) {
            if (!p.pasos.includes(i) || !suena()) continue;
            const notas = (p.intervalos ? p.intervalos.map(x => ac[0] + x) : ac).map(m => m + oct);
            if (!sinte && DE_ACORDE.has(p.inst)) I[p.inst](c, o, tt, notas, dur, p.vol);
            else for (const m of notas) nota(m, dur, p.vol);
        } else if (p.notas) {
            const n = de(p.notas); if (!n || !suena()) continue;
            nota(n + oct, p.dur ? dur : s * largoDe(p.notas)[j % p.notas.length] * 0.9, p.vol);
        } else if (p.arpegio) {
            if (!suena()) continue;
            const idx = p.arpegio[i % p.arpegio.length];
            if (idx === null || idx === undefined) continue;
            nota(ac[idx % ac.length] + oct, dur, p.vol);
        }
    }
}

// ---------------------------------------------------------
// Secuenciador: programa los pasos que vienen (WebAudio toca a tiempo exacto) y recuerda cuándo suena cada uno
// ---------------------------------------------------------
export function crearSecuenciador() {
    let clave = null, siguiente = 0, i = 0, k = 0;
    const marcas = []; // [t, i, k] de los últimos pasos programados (la línea que avanza en el Estudio)
    return {
        reiniciar() { clave = null; marcas.length = 0; },
        // Programa hasta `adelanto` segundos; `clave` distinta vuelve al primer compás
        avanzar({ I, ctx, salida, def, clave: c, nivel, tempo = 1, propios = null, adelanto = 0.2 }) {
            const ahora = ctx.currentTime;
            if (c !== clave) { clave = c; siguiente = ahora + 0.05; i = 0; k = 0; marcas.length = 0; }
            if (siguiente < ahora - 0.5) siguiente = ahora + 0.05; // (la pestaña estuvo dormida)
            const s = 60 / (def.bpm * Math.max(0.5, tempo)) / 4, P = def.pasos || 16;
            while (siguiente < ahora + adelanto) {
                try { tocarPaso(I, def, ctx, salida, siguiente, i, k, s, nivel, propios); } catch (e) { /* nota perdida */ }
                marcas.push([siguiente, i, k]); if (marcas.length > 64) marcas.shift();
                siguiente += s;
                if (++i >= P) { i = 0; k++; }
            }
        },
        // El paso que está sonando en el instante t: { i, k } o null
        pasoEn(t) {
            let r = null;
            for (const m of marcas) if (m[0] <= t) r = m;
            return r && { i: r[1], k: r[2] };
        }
    };
}

// ---------------------------------------------------------
// Revisión de un tema (además del esquema): instrumentos, acordes y largos de los patrones
// ---------------------------------------------------------
export function revisarTema(def, propios = {}) {
    const e = [], P = def.pasos || 16;
    const prog = [].concat(def.prog || [], ...Object.values(def.progs || {}));
    for (const a of prog) if (!acordeDe(a, def.acordes)) e.push(`acorde desconocido: ${a}`);
    (def.capas || []).forEach((p, n) => {
        const donde = `capa ${n + 1} (${p.inst})`;
        if (!INSTRUMENTOS.includes(p.inst) && !(propios && propios[p.inst])) e.push(`${donde}: instrumento desconocido`);
        const tipos = TIPOS_CAPA.filter(x => p[x] !== undefined && p[x] !== false);
        if (tipos.length !== 1) e.push(`${donde}: tiene que ser de un solo tipo (${TIPOS_CAPA.join(', ')})`);
        for (const x of ['ritmo', 'rel', 'notas']) {
            const l = p[x] && p[x].length;
            if (l && l !== P && l !== P * 4) e.push(`${donde}: ${x} dura ${l} pasos (tiene que ser ${P} o ${P * 4})`);
        }
        if (p.ritmo && /[^xo.]/.test(p.ritmo)) e.push(`${donde}: el ritmo solo lleva x, o y .`);
        if (p.acorde && !(Array.isArray(p.pasos) && p.pasos.every(x => x >= 0 && x < P))) e.push(`${donde}: pasos del acorde fuera del compás`);
        if (p.notas && p.notas.some(m => m && (m < 24 || m > 108))) e.push(`${donde}: nota fuera de rango (24-108)`);
    });
    return e;
}
