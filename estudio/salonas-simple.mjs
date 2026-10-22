// =========================================================
// VENJY · Estudio · vista simple de la pestaña Salonas (B0-V, puro: lo usan salonas.js y las pruebas)
// Simple = la canción y la dificultad con que parte, perillas de «qué tan exacto», volumen y energía, y los textos.
// Juicio, partitura, cámara, audio fino y el resto de `juego` y `reglas` quedan en Avanzado (el editor recorre el
// JSON). La base es salonas.json tal como llegó, sin borrar claves (perillas.mjs, como Mesa).
// =========================================================
import { leerPerilla as leer, ponerPerilla as poner, disponible } from './perillas.mjs';

export const DIFICULTADES = [['facil', 'fácil', 'easy'], ['normal', 'normal', 'normal'], ['dificil', 'difícil', 'hard']];
export const PERILLAS = [
    { clave: 'dificultad', es: 'Dificultad con que parte', en: 'Starting difficulty', ruta: ['juego'], campos: ['dificultad'], tipo: 'valor', opciones: DIFICULTADES },
    // Ventanas del juicio: más anchas = más fácil acertar «perfecto», «bien» y «ok» (la marca de la nota no cambia)
    { clave: 'exacto', es: 'Qué tan exacto hay que tocar', en: 'How precise you must play', ruta: ['reglas', 'ventanas'], campos: ['perfecto', 'bien', 'ok'], tipo: 'factor',
        opciones: [[1.3, 'relajado', 'relaxed'], [1, 'normal', 'normal'], [0.8, 'estricto', 'strict']] },
    { clave: 'energia', es: 'Qué tan rápido se pierde', en: 'How fast you lose', ruta: ['juego', 'energia'], campos: ['baja'], tipo: 'factor',
        opciones: [[0.5, 'cuesta perder', 'hard to lose'], [1, 'normal', 'normal'], [1.5, 'se pierde rápido', 'lose quickly']] },
    { clave: 'banda', es: 'Volumen de la banda', en: 'Band volume', ruta: ['juego', 'audio'], campos: ['volBanda'], tipo: 'factor',
        opciones: [[0.5, 'bajo', 'low'], [1, 'normal', 'normal'], [1.5, 'alto', 'loud']] },
    { clave: 'bajo', es: 'Volumen de tu bajo', en: 'Your bass volume', ruta: ['juego', 'audio'], campos: ['volBajo'], tipo: 'factor',
        opciones: [[0.5, 'bajo', 'low'], [1, 'normal', 'normal'], [1.5, 'alto', 'loud']] }
];
export const leerPerilla = (p, datos, inicial) => leer(p, datos, inicial);
export const ponerPerilla = (p, datos, valor, inicial) => poner(p, datos, valor, inicial, { limpiar: false, borrarIgual: false });
export const perillasDisponibles = inicial => PERILLAS.filter(p => disponible(p, inicial));
