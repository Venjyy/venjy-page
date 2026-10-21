// =========================================================
// VENJY · Supervivencia · La voz del bajo de Salonas como instrumento del motor (WebAudio, puro al importarse)
// Es el mismo sonido de mundo/criaturas/bajo.js (cuerda con «twang», saturación, formante nasal y presencia
// metálica), pero con sus valores en VOZ_BAJO para que una canción de musica.json los ajuste con `vozBajo`.
// bajo.js no se toca porque también suena en el modo creativo.
// Técnicas (formato de las notas del bajo, [paso, tipo, nota, duración, extra]):
//   s slap · p pop · g fantasma · t tapping · d glissando (extra = nota final) · r rasgueo (extra = acorde) · a armónico
// =========================================================
import { mtof, bufferRuido } from './musica-instrumentos.js';

export const TECNICAS_BAJO = ['s', 'p', 'g', 't', 'd', 'a', 'r'];

// Valores de bajo.js. vol es el del bus del bajo; cada técnica multiplica el volumen de la capa.
export const VOZ_BAJO = {
    vol: 0.55,
    saturacion: 2.2,                                // cuánto satura (tanh)
    nasal: { frec: 850, q: 1.6, ganancia: 10 },     // formante nasal
    metal: { frec: 2600, q: 1.2, ganancia: 5 },     // presencia metálica
    tecnicas: {
        s: { brillo: 3200, q: 10, vol: 0.6, chasquido: { frec: 2200, vol: 0.5 } },
        p: { brillo: 5200, q: 14, vol: 0.5, cola: 0.18, chasquido: { frec: 3800, vol: 0.45, largo: 0.012 } },
        g: { brillo: 420, q: 2, vol: 0.4, cola: 0.03, largo: 0.03, chasquido: { frec: 1400, vol: 0.35, largo: 0.025 } },
        t: { brillo: 2000, q: 6, ataque: 0.008, vol: 0.38, cola: 0.12, onda: 'triangle' },
        d: { brillo: 2800, q: 11, vol: 0.55, cola: 0.2, chasquido: { frec: 2200, vol: 0.4 } },
        a: { vol: 0.32, cola: 0.6 },
        r: { brillo: 3600, q: 7, vol: 0.28, cola: 0.15, golpes: 3, separacion: 0.055, rasgueo: 0.011, chasquido: { frec: 2600, vol: 0.3 } }
    }
};
const CUERDA = { brillo: 2400, q: 9, ataque: 0.002, vol: 0.5, cola: 0.25, onda: 'sawtooth' };
const CHASQUIDO = { frec: 2200, vol: 0.4, largo: 0.018 };

// VOZ_BAJO con los cambios de una canción (`vozBajo`), una sola vez por objeto
const voces = new WeakMap();
export function vozDe(cambios) {
    if (!cambios || typeof cambios !== 'object') return VOZ_BAJO;
    let v = voces.get(cambios);
    if (!v) {
        const tecnicas = {};
        for (const k of TECNICAS_BAJO) {
            const base = VOZ_BAJO.tecnicas[k], c = (cambios.tecnicas && cambios.tecnicas[k]) || {};
            tecnicas[k] = { ...base, ...c };
            if (base.chasquido || c.chasquido) tecnicas[k].chasquido = { ...base.chasquido, ...c.chasquido };
        }
        v = { ...VOZ_BAJO, ...cambios, nasal: { ...VOZ_BAJO.nasal, ...cambios.nasal }, metal: { ...VOZ_BAJO.metal, ...cambios.metal }, tecnicas };
        voces.set(cambios, v);
    }
    return v;
}

// Cadena saturación → nasal → metal, una por salida y voz (se arma la primera vez que suena)
const buses = new WeakMap();
function busDe(ctx, salida, voz) {
    let porVoz = buses.get(salida);
    if (!porVoz) { porVoz = new WeakMap(); buses.set(salida, porVoz); }
    let bus = porVoz.get(voz);
    if (!bus) {
        bus = ctx.createGain(); bus.gain.value = voz.vol;
        const sat = ctx.createWaveShaper(), curva = new Float32Array(1024), d = Math.max(0.1, voz.saturacion);
        for (let i = 0; i < curva.length; i++) { const x = i / 511.5 - 1; curva[i] = Math.tanh(x * d) / Math.tanh(d); }
        sat.curve = curva;
        const pico = (f, p) => { f.type = 'peaking'; f.frequency.value = p.frec; f.Q.value = p.q; f.gain.value = p.ganancia; return f; };
        const nasal = pico(ctx.createBiquadFilter(), voz.nasal), metal = pico(ctx.createBiquadFilter(), voz.metal);
        bus.connect(sat); sat.connect(nasal); nasal.connect(metal); metal.connect(salida);
        porVoz.set(voz, bus);
    }
    return bus;
}

function cuerda(ctx, bus, t, nota, dur, o, vol, hasta = null) {
    o = { ...CUERDA, ...o };
    const v = o.vol * vol;
    if (!(v > 0)) return;
    const o1 = ctx.createOscillator(), o2 = ctx.createOscillator();
    o1.type = o.onda; o2.type = 'square';
    o1.frequency.setValueAtTime(mtof(nota), t); o2.frequency.setValueAtTime(mtof(nota) * 1.003, t);
    if (hasta !== null && hasta !== undefined) { // glissando
        o1.frequency.exponentialRampToValueAtTime(mtof(hasta), t + dur * 0.9);
        o2.frequency.exponentialRampToValueAtTime(mtof(hasta) * 1.003, t + dur * 0.9);
    }
    const mezcla2 = ctx.createGain(); mezcla2.gain.value = 0.35;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = o.q;
    f.frequency.setValueAtTime(o.brillo, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(180, o.brillo * 0.16), t + 0.18); // el «twang»
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.linearRampToValueAtTime(v, t + o.ataque);
    env.gain.exponentialRampToValueAtTime(v * 0.45, t + 0.08);
    env.gain.setValueAtTime(v * 0.45, t + Math.max(0.09, dur));
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur + o.cola);
    o1.connect(f); o2.connect(mezcla2); mezcla2.connect(f); f.connect(env); env.connect(bus);
    const fin = t + dur + o.cola + 0.02;
    o1.start(t); o2.start(t); o1.stop(fin); o2.stop(fin);
}
function chasquido(ctx, bus, t, c, vol) { // el golpe del pulgar o el tirón de la cuerda
    c = { ...CHASQUIDO, ...c };
    const v = c.vol * vol;
    if (!(v > 0)) return;
    const n = ctx.createBufferSource(); n.buffer = bufferRuido(ctx);
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = c.frec; f.Q.value = 1.4;
    const e = ctx.createGain();
    e.gain.setValueAtTime(v, t); e.gain.exponentialRampToValueAtTime(0.0001, t + c.largo);
    n.connect(f); f.connect(e); e.connect(bus);
    n.start(t, Math.random()); n.stop(t + c.largo + 0.01); // (el punto del ruido no cambia cuándo suena)
}

// Toca una nota del bajo: dur en segundos, vol = el de la capa, voz = vozDe(cancion.vozBajo)
export function tocarBajo(ctx, salida, t, tipo, nota, dur, extra = null, vol = 1, voz = VOZ_BAJO) {
    const T = voz.tecnicas[tipo];
    if (!T) return;
    const bus = busDe(ctx, salida, voz);
    if (tipo === 'a') { // armónico: casi una campana
        const v = T.vol * vol;
        if (!(v > 0)) return;
        const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = mtof(nota);
        const e = ctx.createGain();
        e.gain.setValueAtTime(0.0001, t); e.gain.linearRampToValueAtTime(v, t + 0.004);
        e.gain.exponentialRampToValueAtTime(0.0001, t + dur + T.cola);
        o.connect(e); e.connect(bus); o.start(t); o.stop(t + dur + T.cola + 0.05);
    } else if (tipo === 'r') { // rasgueo tipo flamenco: ráfaga de notas casi juntas, ida y vuelta
        const acorde = Array.isArray(extra) && extra.length ? extra : [nota];
        for (let k = 0; k < T.golpes; k++) {
            const orden = k % 2 ? [...acorde].reverse() : acorde;
            orden.forEach((n, i) => cuerda(ctx, bus, t + k * T.separacion + i * T.rasgueo, n, dur * 0.6, T, vol));
            if (T.chasquido) chasquido(ctx, bus, t + k * T.separacion, T.chasquido, vol);
        }
    } else {
        cuerda(ctx, bus, t, nota, T.largo || dur, T, vol, tipo === 'd' ? extra : null);
        if (T.chasquido) chasquido(ctx, bus, t, T.chasquido, vol);
    }
}
