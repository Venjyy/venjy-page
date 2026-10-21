// =========================================================
// VENJY · Supervivencia · Instrumentos de la música (WebAudio, sin Three ni el mundo)
// Los usan musica.js (temas del mundo), carrera-musica.js (la carrera de gatas), musica-motor.js (temas de musica.json)
// y la pestaña Música del Estudio, que suena con estos mismos instrumentos. Firma: (ctx, salida, t, midi, dur, vol);
// la batería, (ctx, salida, t, vol); colchon y rhodes reciben una lista de notas.
// =========================================================
import { tocarBajo } from './musica-bajo.js'; // (importación circular segura: solo se usa al tocar)

export const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

// Ruido blanco reutilizable (uno por frecuencia de muestreo)
let ruidoBuf = null;
export function bufferRuido(ctx) {
    if (ruidoBuf && ruidoBuf.sampleRate === ctx.sampleRate) return ruidoBuf;
    ruidoBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = ruidoBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return ruidoBuf;
}

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
export const I = {
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
    // El bajo de Salonas (musica-bajo.js) como slap; en una capa `bajo` de canción suena con cada técnica
    bajoSlap(ctx, out, t, m, dur, vol) { tocarBajo(ctx, out, t, 's', m, dur, null, vol); },
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
