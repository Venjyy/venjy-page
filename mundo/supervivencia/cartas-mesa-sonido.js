// =========================================================
// VENJY · Supervivencia · Duelo de Cartas Pixel: sonido de la mesa (pulido, PR 2)
// Recetas sintetizadas con `tono`/`ruido` de sonidos.js (sin archivos; respetan «Sonidos del mundo»).
// Qué suena y cuánto lo decide la parte pura (`sonidoDe`/`sonidoFin` en cartas-anim-modelo.js) a partir de los
// mismos eventos de `aplicar` que las animaciones; los volúmenes salen de `sonido` en cartas-mesa.json.
// =========================================================
import { tono, ruido } from './sonidos.js';

// Notas seguidas (arpegio): [frecuencias], separación en s
function notas(fs, sep, o) { fs.forEach((f, i) => tono({ f0: f, f1: f, retardo: i * sep, ...o })); }

const RECETAS = {
    roba: v => ruido({ dur: 0.07, frec: 3000, q: 1.5, vol: 0.12 * v, tipo: 'highpass' }),
    juega: v => {
        ruido({ dur: 0.07, frec: 900, q: 1, vol: 0.22 * v, tipo: 'lowpass' });
        tono({ f0: 200, f1: 110, dur: 0.08, vol: 0.1 * v, forma: 'sine' });
    },
    ataque: v => {
        ruido({ dur: 0.16, frec: 1400, q: 0.8, vol: 0.14 * v });
        tono({ f0: 700, f1: 200, dur: 0.14, vol: 0.08 * v, forma: 'triangle' });
    },
    golpe: v => {
        tono({ f0: 220, f1: 70, dur: 0.14, vol: 0.2 * v, forma: 'square' });
        ruido({ dur: 0.08, frec: 500, vol: 0.22 * v, tipo: 'lowpass' });
    },
    destruye: v => {
        ruido({ dur: 0.3, frec: 700, q: 0.7, vol: 0.25 * v, tipo: 'lowpass' });
        tono({ f0: 300, f1: 50, dur: 0.35, vol: 0.14 * v, forma: 'sawtooth' });
        for (let i = 0; i < 3; i++) ruido({ dur: 0.04, frec: 2400, q: 3, vol: 0.08 * v, retardo: 0.06 + i * 0.07 });
    },
    // Por efecto del hechizo (los mismos nombres que los colores del brillo)
    hechizo: (v, ef) => {
        if (ef === 'rayo') { ruido({ dur: 0.25, frec: 4000, q: 0.8, vol: 0.2 * v, tipo: 'highpass' }); tono({ f0: 1800, f1: 200, dur: 0.2, vol: 0.1 * v, forma: 'sawtooth' }); }
        else if (ef === 'curar') notas([523, 659, 784, 1047], 0.08, { dur: 0.14, vol: 0.1 * v, forma: 'triangle' });
        else if (ef === 'escudo') { tono({ f0: 400, f1: 800, dur: 0.25, vol: 0.12 * v, forma: 'sine' }); ruido({ dur: 0.1, frec: 2800, q: 4, vol: 0.1 * v, retardo: 0.2 }); }
        else if (ef === 'poder') tono({ f0: 150, f1: 600, dur: 0.35, vol: 0.14 * v, forma: 'sawtooth' });
        else if (ef === 'once') notas([392, 311, 262], 0.14, { dur: 0.22, vol: 0.12 * v, forma: 'sine' });
        else if (ef === 'revivir') notas([262, 330, 392, 523], 0.13, { dur: 0.25, vol: 0.12 * v, forma: 'sine' });
        else if (ef === 'abrazo') notas([440, 554], 0.15, { dur: 0.3, vol: 0.12 * v, forma: 'sine' });
        else tono({ f0: 600, f1: 900, dur: 0.25, vol: 0.12 * v, forma: 'triangle' });
    },
    efecto: (v, ef) => {
        if (ef === 'explota') { ruido({ dur: 0.35, frec: 200, q: 0.5, vol: 0.3 * v, tipo: 'lowpass' }); tono({ f0: 90, f1: 30, dur: 0.3, vol: 0.2 * v, forma: 'sine' }); }
        else if (ef === 'baja') tono({ f0: 700, f1: 300, dur: 0.14, vol: 0.1 * v, forma: 'triangle' });
        else tono({ f0: 700, f1: 1000, dur: 0.12, vol: 0.1 * v, forma: 'triangle' });
    },
    cura: v => notas([659, 880], 0.09, { dur: 0.14, vol: 0.09 * v, forma: 'sine' }),
    turno: v => notas([440, 660], 0.08, { dur: 0.1, vol: 0.08 * v, forma: 'sine' }),
    gana: v => { notas([523, 659, 784], 0.12, { dur: 0.14, vol: 0.14 * v, forma: 'triangle' }); tono({ f0: 1047, f1: 1047, dur: 0.5, vol: 0.14 * v, forma: 'triangle', retardo: 0.36 }); },
    pierde: v => notas([392, 330, 262, 196], 0.2, { dur: 0.3, vol: 0.1 * v, forma: 'sawtooth' }),
    empate: v => notas([392, 392], 0.2, { dur: 0.25, vol: 0.1 * v, forma: 'sine' })
};

// s = { clave, variante, vol } de sonidoDe/sonidoFin (o null)
export function sonar(s) {
    if (!s) return;
    const r = RECETAS[s.clave];
    if (r) r(s.vol, s.variante);
}
export const CLAVES_SONIDO = Object.keys(RECETAS);
