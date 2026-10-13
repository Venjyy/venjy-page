// =========================================================
// VENJY · Supervivencia · Usos de los objetos de 7f-2
// Clic derecho con el objeto en la mano (lo llama main.js desde `minado.usarObjeto`):
//   Mapa → abre o cierra el minimapa grande · Pluma de juguete → la gata cercana maúlla
//   Guitarra, Teclado y Tambor → suena una nota (cada clic sube por la escala; un Tambor golpea).
// El Farol y el Cartel se colocan como bloque (`pone` en objetos.js, minado.js); la Botella, en minado.js.
// La lógica es pura salvo los sonidos, que llegan inyectados: la prueba usa los suyos.
// =========================================================
import { O } from './objetos.js';

// Escala pentatónica menor de La (Hz), se repite una octava arriba
const ESCALA = [220, 261.63, 293.66, 329.63, 392, 440, 523.25, 587.33, 659.25, 783.99];
export const ALCANCE_PLUMA = 8;      // bloques
export const ESPERA_NOTA = 0.12;     // s entre notas
export const ESPERA_PLUMA = 3;       // s entre maullidos

// Qué hace cada objeto con la interfaz mínima de sonido { tono, ruido }
export const INSTRUMENTOS = {
    [O.GUITARRA]: { forma: 'sawtooth', dur: 0.5, vol: 0.12, caida: 0.985 },
    [O.TECLADO]: { forma: 'square', dur: 0.35, vol: 0.09, caida: 1 },
    [O.TAMBOR]: { golpe: true }
};

export function crearUsosObjetos({ minimapa, gatas, jugador, sonido, ahora = () => performance.now() / 1000 }) {
    let nota = 0, proxNota = 0, proxPluma = 0;

    function tocar(def) {
        const t = ahora();
        if (t < proxNota) return true;
        proxNota = t + ESPERA_NOTA;
        if (def.golpe) {
            // Parche grave + golpe seco de la baqueta; alterna dos alturas
            const alto = nota++ % 2;
            sonido.tono({ f0: alto ? 150 : 100, f1: alto ? 90 : 55, dur: 0.22, vol: 0.28, forma: 'sine' });
            sonido.ruido({ dur: 0.05, frec: 1800, q: 1, vol: 0.12 });
            return true;
        }
        const f = ESCALA[nota++ % ESCALA.length];
        sonido.tono({ f0: f, f1: f * def.caida, dur: def.dur, vol: def.vol, forma: def.forma });
        return true;
    }

    // Gata más cercana dentro del alcance (null si no hay)
    function gataCerca() {
        let mejor = null, dm = ALCANCE_PLUMA;
        for (const g of (gatas && gatas.gatas) || []) {
            const d = Math.hypot(jugador.pos.x - g.x, jugador.pos.z - g.z);
            if (d < dm) { dm = d; mejor = g; }
        }
        return mejor ? { gata: mejor, distancia: dm } : null;
    }

    function usar(p) {
        if (!p) return false;
        if (p.id === O.MAPA) { minimapa.alternarGrande(); return true; }
        if (INSTRUMENTOS[p.id]) return tocar(INSTRUMENTOS[p.id]);
        if (p.id === O.PLUMA_JUGUETE) {
            const t = ahora();
            // Un silbido de pluma siempre; el maullido, si hay una gata cerca y ya pasó la espera
            sonido.ruido({ dur: 0.12, frec: 4200, q: 2, vol: 0.08, tipo: 'highpass' });
            const c = gataCerca();
            if (c && t >= proxPluma && c.gata.maullar) { proxPluma = t + ESPERA_PLUMA; c.gata.maullar(c.distancia); }
            return true;
        }
        return false;
    }

    return { usar, gataCerca };
}
