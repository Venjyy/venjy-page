// =========================================================
// VENJY · Supervivencia · Hora del mundo (7j-0)
// El día de 10 min (dia.js) se lee como un día de 24 h: 1 hora = 25 s de media. La hora sale de `horaDe`
// (la misma del cielo), así que 12:00 es el mediodía y 06:00 el amanecer. Sin DOM: lo usan el HUD, la pausa,
// el objeto Reloj y el panel de los amigos. Cooperativo: `dia.t` ya lo fija el anfitrión (coop.js).
// =========================================================
import { horaDe } from './dia.js';

// Minutos desde la medianoche (0..1439) para t segundos desde el amanecer
export const minutosDe = t => Math.floor(horaDe(t) * 1440 + 1e-6) % 1440;

const dos = n => String(n).padStart(2, '0');
export const textoMinutos = m => `${dos(Math.floor(m / 60) % 24)}:${dos(m % 60)}`;
export const textoHora = t => textoMinutos(minutosDe(t));
// «Día 3 · 14:30» / «Day 3 · 14:30» (dias empieza en 0)
export const textoDiaHora = (dias, t, idioma = 'es') => `${idioma === 'en' ? 'Day' : 'Día'} ${dias + 1} · ${textoHora(t)}`;

// ¿La hora de reloj `h` (0-24, puede ser decimal) cae en el tramo [de, a)? Admite tramos que cruzan la medianoche.
export function enTramo(h, de, a) { return de <= a ? h >= de && h < a : h >= de || h < a; }
