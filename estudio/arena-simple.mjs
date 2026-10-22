// =========================================================
// VENJY · Estudio · vista simple de la pestaña Arena (B0-V, puro: lo usan arena.js y las pruebas)
// «Lo básico»: perillas con palabras comunes sobre arena.json (perillas.mjs; base = ARENA del código, así la opción
// del juego borra la clave). La cámara de la pelea y el golpe final se eligen desde una base («cerca», «lejos»,
// «desde arriba»…) como en la Mesa. En Simple se ven además los peleadores (nombre, título, color y frases) y los
// textos; los grupos de números, efectos, peso de los golpes, escenario, público y premios van a Avanzado.
// =========================================================
export { leerPerilla, ponerPerilla } from './perillas.mjs';

const CAMARA = ['fov', 'altura', 'mira', 'inclinacion', 'distanciaMin', 'distanciaMax'];
const conCampos = (campos, valores) => Object.fromEntries(campos.map((c, i) => [c, valores[i]]));

export const PERILLAS = [
    { clave: 'rondas', es: 'Rondas', en: 'Rounds', ruta: ['rondas'], campos: ['mejorDe', 'maxRondas'], tipo: 'conjunto',
        opciones: [['una', 'a una ronda', 'one round', { mejorDe: 1, maxRondas: 3 }], ['tres', 'al mejor de 3', 'best of 3', { mejorDe: 3, maxRondas: 5 }],
            ['cinco', 'al mejor de 5', 'best of 5', { mejorDe: 5, maxRondas: 7 }]] },
    { clave: 'segundos', es: 'Largo de cada ronda', en: 'Length of each round', ruta: ['rondas'], campos: ['segundos'], tipo: 'valor',
        opciones: [[30, 'corta (30 s)', 'short (30 s)'], [60, 'normal (1 min)', 'normal (1 min)'], [90, 'larga (1 min 30)', 'long (1 min 30)'], [120, 'muy larga (2 min)', 'very long (2 min)']] },
    { clave: 'ko', es: 'Cámara lenta con el K.O.', en: 'K.O. slow motion', ruta: ['rondas'], campos: ['lentaKo'], tipo: 'factor', limites: { lentaKo: [0, 3] },
        opciones: [[0, 'sin cámara lenta', 'none'], [1, 'normal', 'normal'], [2, 'larga', 'long']] },
    { clave: 'entrada', es: 'Entrada antes de pelear', en: 'Entrance before the fight', ruta: ['entrada'], campos: ['viaje', 'vs', 'vuelo', 'ventisca', 'caminarMarca'], tipo: 'factor',
        opciones: [[0.5, 'rápida', 'quick'], [1, 'normal', 'normal'], [1.5, 'lenta', 'slow']] },
    { clave: 'nieve', es: 'Nieve', en: 'Snow', ruta: ['escenario', 'nieve'], campos: ['cantidad'], tipo: 'factor', limites: { cantidad: [0, 3000] },
        opciones: [[0, 'sin nieve', 'no snow'], [0.5, 'poca', 'light'], [1, 'normal', 'normal'], [2, 'mucha', 'heavy']] },
    { clave: 'camara', es: 'Cámara de la pelea', en: 'Fight camera', ruta: ['camara'], campos: CAMARA, tipo: 'conjunto',
        opciones: [['normal', 'normal', 'normal', null],
            ['cerca', 'cerca', 'close', conCampos(CAMARA, [45, 1.3, 1, 6, 2.8, 6])],
            ['lejos', 'lejos', 'far', conCampos(CAMARA, [55, 1.8, 1, 10, 5, 11])],
            ['arriba', 'desde arriba', 'from above', conCampos(CAMARA, [50, 3.2, 0.8, 28, 4.5, 9])]] },
    { clave: 'remate', es: 'Plano del golpe final', en: 'Final strike shot', ruta: ['camara', 'remate'], campos: ['duracion', 'giro', 'distancia', 'altura'], tipo: 'conjunto',
        opciones: [['normal', 'normal (gira bajo)', 'normal (low turn)', null],
            ['rapido', 'rápido', 'quick', { duracion: 1, giro: 40, distancia: 3.4, altura: 0.75 }],
            ['lento', 'lento y cerca', 'slow and close', { duracion: 2.6, giro: 120, distancia: 2.8, altura: 0.6 }],
            ['quieto', 'quieto, de frente', 'still, head-on', { duracion: 1.6, giro: 0, distancia: 3.6, altura: 1.2 }]] }
];

// Vida de cada peleador (una perilla por peleador del código o del JSON)
export const perillaVida = (clave, nombre) => ({
    clave: 'vida-' + clave, es: `Vida de ${nombre}`, en: `${nombre}'s life`, ruta: ['peleadores', clave], campos: ['vida'], tipo: 'factor', limites: { vida: [1, 1000] },
    opciones: [[0.5, 'poca', 'low'], [1, 'normal', 'normal'], [1.5, 'mucha', 'high'], [2, 'el doble', 'double']]
});

// Campos de cada peleador que solo se ven en Avanzado (en Simple: nombre, título, aura y frases; la vida va en «Lo básico»)
export const PELEADOR_AVANZADO = ['estilo', 'vida', 'postura', 'carta'];
