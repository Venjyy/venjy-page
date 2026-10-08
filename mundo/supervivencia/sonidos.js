// =========================================================
// VENJY · Supervivencia · Sonidos
// Efectos cortos sintetizados con WebAudio (sin archivos): golpes, romper y poner bloques,
// comer, recoger, herramienta rota, puertas, horno, daño y muerte. Usan el audio compartido del
// mundo (criaturas/cuerpo.js), así que respetan el interruptor «Sonidos del mundo».
// =========================================================
import { audioMundo, bufferRuido } from '../criaturas/cuerpo.js';

function ctxListo() {
    const a = audioMundo();
    if (!a || a.ctx.state !== 'running') return null;
    return a;
}

// Ráfaga de ruido filtrado (pasos, romper, golpes secos)
function ruido({ dur = 0.08, frec = 1200, q = 1, vol = 0.3, tipo = 'bandpass', retardo = 0 } = {}) {
    const a = ctxListo();
    if (!a) return;
    const { ctx, master } = a;
    const t = ctx.currentTime + retardo;
    const fuente = ctx.createBufferSource();
    fuente.buffer = bufferRuido(ctx);
    fuente.playbackRate.value = 0.8 + Math.random() * 0.4;
    const filtro = ctx.createBiquadFilter();
    filtro.type = tipo; filtro.frequency.value = frec; filtro.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    fuente.connect(filtro).connect(g).connect(master);
    fuente.start(t, Math.random() * 1.5, dur + 0.05);
}

// Tono con caída de frecuencia (pop, golpe, eructo)
function tono({ f0 = 440, f1 = 220, dur = 0.12, vol = 0.2, forma = 'square', retardo = 0 } = {}) {
    const a = ctxListo();
    if (!a) return;
    const { ctx, master } = a;
    const t = ctx.currentTime + retardo;
    const o = ctx.createOscillator();
    o.type = forma;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + dur + 0.02);
}

// Material del bloque para elegir el timbre
const MATERIAL = { piedra: 2200, madera: 900, tierra: 500, arena: 3200, hojas: 4200, vidrio: 5200, lana: 300 };
export function materialDe(id) {
    if ([3, 51, 53, 54, 55, 56, 57, 58, 59, 25, 20, 36, 47, 49, 61, 62, 10, 11, 12, 13, 14, 15, 16, 17, 45, 80, 81, 82, 83, 89].includes(id)) return 'piedra';
    if ([8, 9, 27, 29, 37, 38, 41, 46, 48, 60, 84, 85, 86, 87, 88, 39].includes(id)) return 'madera';
    if ([4, 50, 5].includes(id)) return 'arena';
    if ([7, 26, 28, 30, 31, 32, 33, 63, 64, 65, 23, 42].includes(id) || (id >= 68 && id <= 79)) return 'hojas';
    if (id === 24 || id === 35) return 'vidrio';
    if (id === 43 || id === 44) return 'lana';
    return 'tierra';
}

export const sonidos = {
    golpeBloque(id) { ruido({ dur: 0.05, frec: MATERIAL[materialDe(id)], q: 2, vol: 0.12 }); },
    romper(id) {
        const f = MATERIAL[materialDe(id)];
        ruido({ dur: 0.18, frec: f, q: 1.2, vol: 0.32 });
        ruido({ dur: 0.12, frec: f * 0.6, q: 1.5, vol: 0.2, retardo: 0.04 });
        if (materialDe(id) === 'vidrio') for (let i = 0; i < 4; i++) tono({ f0: 2400 + Math.random() * 2000, f1: 1800, dur: 0.08, vol: 0.05, forma: 'triangle', retardo: i * 0.03 });
    },
    poner(id) { ruido({ dur: 0.1, frec: MATERIAL[materialDe(id)] * 0.8, q: 1.4, vol: 0.28 }); },
    paso(id) { ruido({ dur: 0.06, frec: MATERIAL[materialDe(id)] * 0.7, q: 1, vol: 0.06 }); },
    recoger() { tono({ f0: 900 + Math.random() * 400, f1: 1600, dur: 0.07, vol: 0.08, forma: 'sine' }); },
    comer() { ruido({ dur: 0.07, frec: 1400, q: 3, vol: 0.15 }); },
    eructo() { tono({ f0: 140, f1: 90, dur: 0.35, vol: 0.18, forma: 'sawtooth' }); },
    danio() { tono({ f0: 260, f1: 120, dur: 0.18, vol: 0.22, forma: 'square' }); ruido({ dur: 0.08, frec: 800, vol: 0.15 }); },
    golpe() { ruido({ dur: 0.06, frec: 600, q: 0.8, vol: 0.22, tipo: 'lowpass' }); },
    herramientaRota() { for (let i = 0; i < 3; i++) tono({ f0: 1800 - i * 300, f1: 400, dur: 0.12, vol: 0.12, forma: 'triangle', retardo: i * 0.05 }); },
    puerta(abrir) { ruido({ dur: 0.16, frec: abrir ? 700 : 500, q: 2.5, vol: 0.25 }); tono({ f0: abrir ? 320 : 220, f1: abrir ? 260 : 160, dur: 0.12, vol: 0.06, forma: 'sawtooth' }); },
    caida() { ruido({ dur: 0.15, frec: 300, q: 0.7, vol: 0.3, tipo: 'lowpass' }); },
    salpicar() { ruido({ dur: 0.3, frec: 1800, q: 0.6, vol: 0.18, tipo: 'highpass' }); },
    fuego() { ruido({ dur: 0.25, frec: 900, q: 0.4, vol: 0.12 }); },
    muerte() { tono({ f0: 300, f1: 60, dur: 0.8, vol: 0.25, forma: 'sawtooth' }); },
    nivel() { [523, 659, 784].forEach((f, i) => tono({ f0: f, f1: f, dur: 0.15, vol: 0.1, forma: 'triangle', retardo: i * 0.09 })); },
    clic() { tono({ f0: 1200, f1: 900, dur: 0.04, vol: 0.05, forma: 'square' }); }
};
