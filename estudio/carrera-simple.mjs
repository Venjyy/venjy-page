// =========================================================
// VENJY · Estudio · vista simple de la pestaña Carrera (B0-V, puro: lo usan carrera.js y las pruebas)
// «Lo básico»: perillas con palabras comunes sobre carrera.json (perillas.mjs). El plano de la pista, el escenario
// (nombre y colores), las gatas (nombre, pañuelo y pelaje) y el premio quedan en la vista simple; los grupos de
// números (física, derrape y sus 3 niveles, turbos, paredes, IA, cámaras, red, sala) van a Avanzado.
// =========================================================
export { leerPerilla, ponerPerilla } from './perillas.mjs';

export const PERILLAS = [
    { clave: 'vueltas', es: 'Vueltas', en: 'Laps', ruta: [], campos: ['vueltas'], tipo: 'valor',
        opciones: [[1, '1', '1'], [2, '2', '2'], [3, '3', '3'], [4, '4', '4'], [5, '5', '5']] },
    // Las tres dificultades del menú se mueven juntas (la velocidad de las gatas del juego, fracción de la máxima)
    { clave: 'dificultad', es: 'Qué tan difícil es ganarles', en: 'How hard it is to beat them', ruta: ['ia', 'niveles'], campos: ['facil', 'normal', 'dificil'], tipo: 'factor',
        limites: { facil: [0.4, 1.2], normal: [0.4, 1.2], dificil: [0.4, 1.2] },
        opciones: [[0.9, 'más fácil', 'easier'], [1, 'normal', 'normal'], [1.05, 'más difícil', 'harder'], [1.1, 'muy difícil', 'very hard']] },
    { clave: 'rapidez', es: 'Rapidez de las gatas', en: 'Cat speed', ruta: ['gata'], campos: ['vel', 'acel'], tipo: 'factor',
        opciones: [[0.8, 'tranquila', 'relaxed'], [1, 'normal', 'normal'], [1.15, 'rápida', 'fast'], [1.3, 'muy rápida', 'very fast']] },
    { clave: 'manejo', es: 'Qué tan fácil se dobla', en: 'How easily they turn', ruta: ['gata'], campos: ['giro'], tipo: 'factor',
        opciones: [[0.85, 'pesada', 'heavy'], [1, 'normal', 'normal'], [1.15, 'ágil', 'nimble']] },
    { clave: 'objetos', es: 'Objetos en la pista', en: 'Items on the track', ruta: ['objetos'], campos: ['activos'], tipo: 'valor',
        opciones: [[1, 'con objetos', 'with items'], [0, 'sin objetos', 'no items']] },
    { clave: 'celular', es: 'En el celular', en: 'On a phone', ruta: ['tactil'], campos: ['autoAcelerar'], tipo: 'valor',
        opciones: [[1, 'acelera sola', 'auto gas'], [0, 'con botón ACELERAR', 'with a GAS button']] },
    { clave: 'musica', es: 'Volumen de la música', en: 'Music volume', ruta: ['musica'], campos: ['vol'], tipo: 'factor',
        opciones: [[0, 'sin música', 'no music'], [0.5, 'baja', 'low'], [1, 'normal', 'normal'], [1.5, 'alta', 'loud']] }
];
