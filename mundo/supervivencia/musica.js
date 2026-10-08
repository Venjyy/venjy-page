// =========================================================
// VENJY · Supervivencia · Música
// Todo se sintetiza con WebAudio (sin archivos), con instrumentos simples: piano, pulsado de
// guitarra, cajita de música, colchón, bajo, steel drum, batería y algo de chiptune.
//  · Ambiente: suave y espaciado (C418 de fondo), mayor de día, menor de noche y grave en cuevas.
//  · Temas de los amigos, que suenan al acercarse a ellos (como el bajo de Salonas, que ya
//    tiene su música y por eso aquí no lleva tema):
//      Pony (muelle): vals marinero en 3/4 · Lona (gatera): cajita de música para las gatas ·
//      Hadad, Andy y Nacho (campamento): guitarra de fogata con un «victory» de videojuego ·
//      Moisés y Lalo (iglú): lo-fi relajado con crujido de vinilo · Boris y Lucho (leñera):
//      folk de banjo · Braulio (naufragio): calipso de playa con steel drum · Venjy (Inicio):
//      tema de bienvenida.
//  · Pelea de jefe: un loop tenso en menor; apaga lo demás.
// El ambiente baja cuando suena un tema. Interruptor «Música» en la pausa.
// =========================================================
import { cuandoHayaAudio, bufferRuido } from '../criaturas/cuerpo.js';

const CLAVE = 'venjy-supervivencia-musica';
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

// ---------------------------------------------------------
// Instrumentos: (ctx, salida, t, midi, dur, vol)
// ---------------------------------------------------------
function env(ctx, t, a, d, vol) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
    return g;
}
function osc(ctx, tipo, f, t, fin, destino, detune = 0) {
    const o = ctx.createOscillator(); o.type = tipo; o.frequency.value = f; o.detune.value = detune;
    o.connect(destino); o.start(t); o.stop(fin + 0.05);
    return o;
}
const I = {
    piano(ctx, out, t, m, dur, vol) {
        const f = mtof(m), d = Math.max(0.6, dur * 2.2);
        const g = env(ctx, t, 0.006, d, vol);
        g.connect(out);
        osc(ctx, 'sine', f, t, t + d, g);
        const g2 = ctx.createGain(); g2.gain.value = 0.25; g2.connect(g);
        osc(ctx, 'triangle', f * 2, t, t + d, g2);
    },
    pulsar(ctx, out, t, m, dur, vol) { // cuerda pulsada
        const f = mtof(m), d = Math.max(0.35, dur * 1.6);
        const g = env(ctx, t, 0.004, d, vol);
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass';
        lp.frequency.setValueAtTime(Math.min(8000, f * 8), t); lp.frequency.exponentialRampToValueAtTime(Math.max(200, f * 1.5), t + d);
        lp.connect(g); g.connect(out);
        osc(ctx, 'triangle', f, t, t + d, lp);
        const g2 = ctx.createGain(); g2.gain.value = 0.35; g2.connect(lp);
        osc(ctx, 'sawtooth', f, t, t + d, g2, 4);
    },
    banjo(ctx, out, t, m, dur, vol) { I.pulsar(ctx, out, t, m, 0.18, vol * 0.9); },
    cajita(ctx, out, t, m, dur, vol) {
        const f = mtof(m), d = 1.1;
        const g = env(ctx, t, 0.003, d, vol); g.connect(out);
        osc(ctx, 'sine', f, t, t + d, g);
        const g2 = ctx.createGain(); g2.gain.value = 0.18; g2.connect(g);
        osc(ctx, 'sine', f * 4.01, t, t + 0.3, g2);
    },
    steel(ctx, out, t, m, dur, vol) {
        const f = mtof(m), d = 0.7;
        const g = env(ctx, t, 0.004, d, vol); g.connect(out);
        osc(ctx, 'sine', f, t, t + d, g);
        for (const [k, a] of [[2, 0.5], [3.01, 0.22], [4.2, 0.1]]) { const gk = ctx.createGain(); gk.gain.value = a; gk.connect(g); osc(ctx, 'sine', f * k, t, t + d * 0.6, gk); }
    },
    chip(ctx, out, t, m, dur, vol) {
        const g = env(ctx, t, 0.003, Math.max(0.08, dur * 0.9), vol * 0.6); g.connect(out);
        osc(ctx, 'square', mtof(m), t, t + dur, g);
    },
    bajo(ctx, out, t, m, dur, vol) {
        const g = env(ctx, t, 0.01, Math.max(0.25, dur), vol); g.connect(out);
        osc(ctx, 'triangle', mtof(m), t, t + dur + 0.3, g);
        const g2 = ctx.createGain(); g2.gain.value = 0.4; g2.connect(g);
        osc(ctx, 'sine', mtof(m - 12), t, t + dur + 0.3, g2);
    },
    bajoSierra(ctx, out, t, m, dur, vol) {
        const g = env(ctx, t, 0.005, Math.max(0.12, dur), vol);
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700; lp.Q.value = 6;
        lp.connect(g); g.connect(out);
        osc(ctx, 'sawtooth', mtof(m), t, t + dur, lp);
    },
    colchon(ctx, out, t, notas, dur, vol) { // pad: acorde con ataque lento
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(vol, t + dur * 0.35);
        g.gain.linearRampToValueAtTime(0.0001, t + dur);
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
        lp.connect(g); g.connect(out);
        for (const m of notas) { osc(ctx, 'sawtooth', mtof(m), t, t + dur, lp, -6); osc(ctx, 'sawtooth', mtof(m), t, t + dur, lp, 6); }
    },
    rhodes(ctx, out, t, notas, dur, vol) { for (const m of notas) I.piano(ctx, out, t, m, dur, vol / notas.length * 1.6); },
    kick(ctx, out, t, vol) {
        const g = env(ctx, t, 0.002, 0.3, vol); g.connect(out);
        const o = ctx.createOscillator(); o.type = 'sine';
        o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.2);
        o.connect(g); o.start(t); o.stop(t + 0.35);
    },
    ruido(ctx, out, t, vol, dur, f, tipo) {
        const s = ctx.createBufferSource(); s.buffer = bufferRuido(ctx);
        const fl = ctx.createBiquadFilter(); fl.type = tipo; fl.frequency.value = f;
        const g = env(ctx, t, 0.002, dur, vol);
        s.connect(fl).connect(g).connect(out);
        s.start(t, Math.random() * 1.5, dur + 0.05);
    },
    caja(ctx, out, t, vol) { I.ruido(ctx, out, t, vol, 0.16, 1800, 'bandpass'); },
    hat(ctx, out, t, vol) { I.ruido(ctx, out, t, vol * 0.5, 0.04, 7000, 'highpass'); },
    madera(ctx, out, t, vol) { I.ruido(ctx, out, t, vol, 0.05, 1200, 'bandpass'); }
};

// Escalas y acordes en MIDI
const ACORDE = {
    C: [48, 52, 55, 59], Am: [45, 48, 52, 55], F: [41, 45, 48, 52], G: [43, 47, 50, 53], Dm: [50, 53, 57, 60], Em: [52, 55, 59, 62],
    Bb: [46, 50, 53, 57], A: [45, 49, 52, 55], D: [50, 54, 57, 60], Fmaj7: [53, 57, 60, 64], Em7: [52, 55, 59, 62], Dm7: [50, 53, 57, 60], Cmaj7: [48, 52, 55, 59]
};
const r = () => Math.random();
const elegir = l => l[Math.floor(r() * l.length)];

// ---------------------------------------------------------
// Temas: bpm, pasos por compás (semicorcheas) y una función por paso
// paso(ctx, out, t, i, compas, dur16, estado)
// ---------------------------------------------------------
const TEMAS = {
    ambiente: {
        bpm: 62, pasos: 16, vol: 0.05,
        paso(c, o, t, i, k, s, e) {
            const modo = e.modo; // 'dia' | 'noche' | 'cueva'
            const prog = modo === 'dia' ? ['Cmaj7', 'Am', 'Fmaj7', 'G'] : modo === 'noche' ? ['Am', 'Fmaj7', 'Dm7', 'Em'] : ['Am', 'Dm', 'Am', 'Em'];
            const ac = ACORDE[prog[Math.floor(k / 2) % 4]];
            const baja = modo === 'cueva' ? -12 : 0;
            if (i === 0 && k % 2 === 0) I.colchon(c, o, t, ac.map(m => m + baja + 12), s * 32, 0.25);
            if (i % 2 === 0 && r() < (modo === 'cueva' ? 0.06 : 0.11)) I.piano(c, o, t, elegir(ac) + 24 + baja + (r() < 0.3 ? 12 : 0), s * 4, 0.5);
        }
    },
    venjy: {
        bpm: 104, pasos: 16, vol: 0.09,
        paso(c, o, t, i, k, s) {
            const prog = ['C', 'G', 'Am', 'F'], ac = ACORDE[prog[k % 4]];
            if (i % 4 === 0) I.bajo(c, o, t, ac[0] - 12, s * 3, 0.55);
            if (i % 4 === 2) I.pulsar(c, o, t, ac[1 + (i / 2) % 3 | 0] + 12, s * 2, 0.35);
            const mel = [76, 79, 81, 79, 76, 74, 72, 74];
            if (i % 2 === 0 && (k % 2 === 0 || i < 8)) I.piano(c, o, t, mel[(i / 2 + k * 3) % 8], s * 2, 0.45);
        }
    },
    pony: { // vals marinero (3/4): bajo en 1, acorde en 2 y 3, melodía que se mece
        bpm: 92, pasos: 12, vol: 0.1,
        paso(c, o, t, i, k, s) {
            const prog = ['Dm', 'C', 'Bb', 'A'], ac = ACORDE[prog[k % 4]];
            if (i === 0) I.bajo(c, o, t, ac[0] - 12, s * 4, 0.6);
            if (i === 4 || i === 8) for (const m of ac.slice(1, 3)) I.pulsar(c, o, t, m + 12, s * 3, 0.22);
            const mel = [[62, 65, 69], [64, 67, 72], [62, 65, 70], [61, 64, 69]][k % 4];
            if (i % 4 === 0 && r() < 0.8) I.pulsar(c, o, t + (i === 0 ? s * 0.5 : 0), mel[i / 4] + 12, s * 3, 0.32);
            if (i === 0 && k % 4 === 0) I.ruido(c, o, t, 0.05, s * 40, 500, 'lowpass'); // ola
        }
    },
    lona: { // cajita de música para Mila y Gala
        bpm: 84, pasos: 16, vol: 0.08,
        paso(c, o, t, i, k, s) {
            const prog = ['F', 'Dm', 'Bb', 'C'], ac = ACORDE[prog[k % 4]];
            if (i % 2 === 0) I.cajita(c, o, t, ac[[0, 1, 2, 3, 2, 1, 0, 1][(i / 2) % 8]] + 24, s * 2, 0.4);
            if (i === 0) I.cajita(c, o, t, ac[0] + 12, s * 8, 0.35);
            if (i === 12 && r() < 0.5) I.cajita(c, o, t, ac[3] + 36, s, 0.2); // «miau»
        }
    },
    campamento: { // guitarra de fogata + «victory» de videojuego cada 4 compases
        bpm: 100, pasos: 16, vol: 0.09,
        paso(c, o, t, i, k, s) {
            const prog = ['G', 'D', 'Em', 'C'], ac = ACORDE[prog[k % 4]];
            const rasgueo = [0, 3, 6, 8, 10, 14];
            if (rasgueo.includes(i)) ac.forEach((m, j) => I.pulsar(c, o, t + j * 0.012 * (i % 4 === 2 ? -1 : 1) + 0.02, m + 12, s * 2, i % 8 === 0 ? 0.2 : 0.13));
            if (i === 0) I.bajo(c, o, t, ac[0] - 12, s * 6, 0.5);
            if (k % 4 === 3 && i >= 8 && i % 2 === 0) I.chip(c, o, t, [79, 83, 86, 91][(i - 8) / 2], s * 1.5, 0.25);
        }
    },
    iglu: { // lo-fi relajado con swing y crujido
        bpm: 78, pasos: 16, vol: 0.09,
        paso(c, o, t, i, k, s) {
            const sw = i % 2 === 1 ? s * 0.22 : 0;
            const prog = ['Fmaj7', 'Em7', 'Dm7', 'Cmaj7'], ac = ACORDE[prog[k % 4]];
            if (i === 0 || i === 10) I.kick(c, o, t, 0.6);
            if (i === 4 || i === 12) I.caja(c, o, t, 0.25);
            if (i % 2 === 0) I.hat(c, o, t + sw, 0.25);
            if (i === 0) I.rhodes(c, o, t, ac.map(m => m + 12), s * 12, 0.3);
            if (i === 0 || i === 7) I.bajo(c, o, t + sw, ac[0] - 12, s * 4, 0.5);
            if (r() < 0.3) I.ruido(c, o, t + r() * s, 0.03, 0.01, 3000, 'highpass'); // vinilo
        }
    },
    lenera: { // folk de banjo con golpe de madera
        bpm: 112, pasos: 16, vol: 0.09,
        paso(c, o, t, i, k, s) {
            const prog = ['Am', 'G', 'F', 'G'], ac = ACORDE[prog[k % 4]];
            const roll = [0, 1, 2, 3, 2, 1];
            I.banjo(c, o, t, ac[roll[i % 6]] + 24, s, i % 4 === 0 ? 0.3 : 0.18);
            if (i % 8 === 0) I.bajo(c, o, t, ac[0] - 12, s * 4, 0.5);
            if (i % 8 === 4) I.madera(c, o, t, 0.35);
        }
    },
    playa: { // calipso con steel drum
        bpm: 96, pasos: 16, vol: 0.09,
        paso(c, o, t, i, k, s) {
            const prog = ['C', 'F', 'G', 'C'], ac = ACORDE[prog[k % 4]];
            if ([0, 3, 6, 10, 12].includes(i)) I.steel(c, o, t, (i === 0 ? ac[0] : elegir(ac)) + 24, s * 2, 0.32);
            if (i === 0 || i === 6 || i === 8) I.bajo(c, o, t, ac[0] - 12, s * 2, 0.45);
            if (i % 2 === 1) I.hat(c, o, t, 0.2);
        }
    },
    jefe: { // pelea: bajo en semicorcheas, batería y golpes de acorde
        bpm: 140, pasos: 16, vol: 0.11,
        paso(c, o, t, i, k, s) {
            const prog = ['Dm', 'Bb', 'C', 'A'], ac = ACORDE[prog[k % 4]];
            I.bajoSierra(c, o, t, ac[0] - 12 + (i % 4 === 3 ? 12 : 0), s * 0.9, 0.35);
            if (i % 4 === 0) I.kick(c, o, t, 0.7);
            if (i === 4 || i === 12) I.caja(c, o, t, 0.35);
            if (i === 0 || i === 10) I.colchon(c, o, t, ac.map(m => m + 12), s * 4, 0.18);
            if (k % 2 === 1 && i % 2 === 0) I.chip(c, o, t, ac[(i / 2) % 4] + 24, s, 0.12);
        }
    }
};

// Qué tema suena cerca de cada persona (Salonas y Conejeros no: ya está el bajo en vivo)
export { TEMAS }; // para probar cada tema por separado

const TEMA_DE = { pony: 'pony', lona: 'lona', hadad: 'campamento', andy: 'campamento', nacho: 'campamento', moises: 'iglu', lalo: 'iglu', boris: 'lenera', lucho: 'lenera', braulio: 'playa', venjy: 'venjy' };
const CON_MUSICA_PROPIA = ['salonas', 'conejeros'];

export function crearMusica() {
    let encendida = true;
    try { encendida = localStorage.getItem(CLAVE) !== '0'; } catch (e) { /* sin almacenamiento */ }
    let audio = null, salida = null;
    const pistas = {};
    cuandoHayaAudio(a => {
        audio = a;
        salida = a.ctx.createGain();
        salida.gain.value = encendida ? 1 : 0;
        // Un poco de eco para que suene en un espacio
        const eco = a.ctx.createDelay(1); eco.delayTime.value = 0.32;
        const fb = a.ctx.createGain(); fb.gain.value = 0.25;
        const mezclaEco = a.ctx.createGain(); mezclaEco.gain.value = 0.22;
        salida.connect(a.master);
        salida.connect(eco); eco.connect(fb); fb.connect(eco); eco.connect(mezclaEco); mezclaEco.connect(a.master);
        for (const [nombre, def] of Object.entries(TEMAS)) {
            const g = a.ctx.createGain(); g.gain.value = 0; g.connect(salida);
            pistas[nombre] = { def, g, objetivo: 0, siguiente: 0, i: 0, k: 0, sonando: false };
        }
    });

    // Programa los pasos de una pista hasta 0,25 s en el futuro
    function programar(p, estado) {
        const ctx = audio.ctx, ahora = ctx.currentTime;
        const s = 60 / p.def.bpm / 4;
        if (!p.sonando) { p.sonando = true; p.siguiente = ahora + 0.05; p.i = 0; p.k = 0; }
        while (p.siguiente < ahora + 0.25) {
            try { p.def.paso(ctx, p.g, p.siguiente, p.i, p.k, s, estado); } catch (e) { /* nota perdida */ }
            p.siguiente += s;
            if (++p.i >= p.def.pasos) { p.i = 0; p.k++; }
        }
    }

    return {
        get encendida() { return encendida; },
        // Volumen actual de cada pista (depuración)
        get pistas() { return Object.fromEntries(Object.entries(pistas).map(([n, p]) => [n, +p.g.gain.value.toFixed(4)])); },
        encender(v) {
            encendida = !!v;
            try { localStorage.setItem(CLAVE, encendida ? '1' : '0'); } catch (e) { /* sin almacenamiento */ }
            if (salida) salida.gain.setTargetAtTime(encendida ? 1 : 0, audio.ctx.currentTime, 0.3);
        },
        // personas: [{ clave, x, z }] · enJefe: hay una pelea · modo: 'dia' | 'noche' | 'cueva' · pausa: el juego está en pausa
        actualizar({ jx, jz, personas, enJefe, modo, pausa }) {
            if (!audio || audio.ctx.state !== 'running') return;
            const cerca = {};
            let propia = 0;
            for (const p of personas) {
                const d = Math.hypot(p.x - jx, p.z - jz);
                const k = Math.max(0, Math.min(1, 1 - (d - 7) / 24));
                if (CON_MUSICA_PROPIA.includes(p.clave)) propia = Math.max(propia, k);
                const t = TEMA_DE[p.clave];
                if (t) cerca[t] = Math.max(cerca[t] || 0, k);
            }
            let mayor = propia;
            for (const [nombre, p] of Object.entries(pistas)) {
                let obj = 0;
                if (enJefe) obj = nombre === 'jefe' ? 1 : 0;
                else if (nombre !== 'jefe' && nombre !== 'ambiente') obj = cerca[nombre] || 0;
                if (nombre !== 'ambiente') mayor = Math.max(mayor, obj);
                p.objetivo = obj;
            }
            pistas.ambiente.objetivo = enJefe ? 0 : Math.max(0, 1 - mayor * 1.4);
            for (const p of Object.values(pistas)) {
                const vol = (pausa ? 0.35 : 1) * p.objetivo * p.def.vol;
                p.g.gain.setTargetAtTime(vol, audio.ctx.currentTime, 0.6);
                if (p.objetivo > 0.01 && encendida) programar(p, { modo });
                else if (p.objetivo <= 0.01 && p.g.gain.value < 0.002) p.sonando = false;
            }
        }
    };
}
