// =========================================================
// VENJY · Estudio · vista simple de la pestaña Mesa (B0-V, puro: lo usan mesa.js y las pruebas)
// «Lo básico» (perillas.mjs con base = cartas-mesa.json tal como llegó, sin borrar claves: la mesa no conoce los
// valores del código), cámaras de 3.ª persona desde una base («cerca», «de lado», «desde arriba») y qué grupos se
// ven en Simple (la colección inicial, los precios y los pesos de los sobres; lo demás, en Avanzado).
// =========================================================
import { leerPerilla as leer, ponerPerilla as poner, disponible } from './perillas.mjs';

export const PERILLAS = [
    { clave: 'animaciones', es: 'Animaciones de las cartas', en: 'Card animations', ruta: ['anim'], campos: ['activas'], tipo: 'valor',
        opciones: [[1, 'con animaciones', 'animated'], [0, 'sin animaciones', 'no animations']] },
    { clave: 'rapidez', es: 'Rapidez de las animaciones', en: 'Animation speed', ruta: ['anim'], campos: ['velocidad'], tipo: 'factor',
        opciones: [[0.5, 'lentas', 'slow'], [1, 'normal', 'normal'], [1.5, 'rápidas', 'fast'], [2, 'muy rápidas', 'very fast']] },
    { clave: 'sonido', es: 'Sonido del duelo', en: 'Duel sound', ruta: ['sonido'], campos: ['activo'], tipo: 'valor',
        opciones: [[1, 'con sonido', 'on'], [0, 'mudo', 'muted']] },
    { clave: 'volumen', es: 'Volumen', en: 'Volume', ruta: ['sonido'], campos: ['volumen'], tipo: 'factor',
        opciones: [[0.5, 'bajo', 'low'], [1, 'normal', 'normal'], [1.5, 'alto', 'loud']] },
    { clave: 'mazo', es: 'Cartas del mazo', en: 'Cards in a deck', ruta: ['coleccion'], campos: ['largo'], tipo: 'valor',
        opciones: [[15, '15', '15'], [20, '20', '20'], [25, '25', '25'], [30, '30', '30']] },
    { clave: 'duelo', es: 'Largo del duelo entre jugadores', en: 'Length of a player duel', ruta: ['duelo'], campos: ['vida'], tipo: 'factor',
        opciones: [[0.5, 'corto', 'short'], [1, 'normal', 'normal'], [2, 'largo', 'long']] },
    { clave: 'tienda', es: 'Lucho vende cartas', en: 'Lucho sells cards', ruta: ['tiendaCartas'], campos: ['activa'], tipo: 'valor',
        opciones: [[1, 'sí', 'yes'], [0, 'no', 'no']] },
    { clave: 'sobre', es: 'Precio de un sobre (esmeraldas)', en: 'Price of a pack (emeralds)', ruta: ['tiendaCartas'], campos: ['sobrePrecio'], tipo: 'valor',
        opciones: [[1, '1', '1'], [2, '2', '2'], [3, '3', '3'], [5, '5', '5'], [8, '8', '8']] }
];
export const leerPerilla = (p, datos, inicial) => leer(p, datos, inicial);
export const ponerPerilla = (p, datos, valor, inicial) => poner(p, datos, valor, inicial, { limpiar: false, borrarIgual: false });
export const perillasDisponibles = inicial => PERILLAS.filter(p => disponible(p, inicial));

// Cámaras de 3.ª persona (`terceras`): bases para partir. `mira` = [derecha, arriba, hacia ti] desde el centro de la mesa
export const CAMARAS = [
    { clave: 'cerca', es: 'cerca', en: 'close', camara: { alto: 1.6, atras: 1.4, lado: 0.9, mira: [0, 0.1, -0.3] } },
    { clave: 'lado', es: 'de lado', en: 'from the side', camara: { alto: 2.5, atras: 2.4, lado: 1.9, mira: [0, 0.3, -0.4] } },
    { clave: 'arriba', es: 'desde arriba', en: 'from above', camara: { alto: 4, atras: 0.8, lado: 0, mira: [0, 0, -0.2] } }
];
// Qué base es una cámara (null = a mano)
export function baseDeCamara(c) {
    const b = CAMARAS.find(x => ['alto', 'atras', 'lado'].every(k => c[k] === x.camara[k]) && JSON.stringify(c.mira) === JSON.stringify(x.camara.mira));
    return b ? b.clave : null;
}
export const camaraDeBase = clave => JSON.parse(JSON.stringify((CAMARAS.find(x => x.clave === clave) || CAMARAS[1]).camara));

// Grupos de GRUPOS (mesa.js) que se ven en la vista simple: listas fáciles de leer (una carta, un número)
export const GRUPOS_SIMPLES = ['coleccionInicial', 'preciosCartas', 'pesosSobre'];

// Gizmo de la mesa (estudio/gizmo-mesa.js): la inversa de marcoMesa (cartas-mesa-modelo.js). Con el centro (x, z) donde
// quedó la mesa y su ángulo (radianes), da { giro, dist, lado } respecto de Lucho (giro en grados, entre −180 y 180)
export function mesaDesdeCentro(lucho, centro, angulo) {
    let giro = Math.round(angulo * 180 / Math.PI) % 360;
    if (giro > 180) giro -= 360; else if (giro <= -180) giro += 360;
    const g = giro * Math.PI / 180, s = Math.sin(g), c = Math.cos(g);
    const dx = centro.x - lucho.x, dz = centro.z - lucho.z, r2 = v => Math.round(v * 100) / 100 || 0;
    return { giro, dist: r2(s * dx + c * dz), lado: r2(-c * dx + s * dz) };
}
// La posición en palabras para la vista simple: «a 0,75 bloques de Lucho, 0,2 a su derecha, mirando al sur»
const RUMBOS = [['al sur', 'south'], ['al este', 'east'], ['al norte', 'north'], ['al oeste', 'west']];
export function frasePosicion(mesa, idioma = 'es') {
    const n = v => (idioma === 'en' ? String(v) : String(v).replace('.', ','));
    const r = RUMBOS[((Math.round((mesa.giro || 0) / 90) % 4) + 4) % 4][idioma === 'en' ? 1 : 0];
    const lado = mesa.lado || 0, l = Math.abs(lado);
    if (idioma === 'en') return `${n(mesa.dist)} block${mesa.dist === 1 ? "" : "s"} from Lucho${lado ? `, ${n(l)} to the ${lado > 0 ? 'right' : 'left'}` : ''}, facing ${r}`;
    return `a ${n(mesa.dist)} bloque${mesa.dist === 1 ? "" : "s"} de Lucho${lado ? `, ${n(l)} a su ${lado > 0 ? 'derecha' : 'izquierda'}` : ''}, mirando ${r}`;
}
