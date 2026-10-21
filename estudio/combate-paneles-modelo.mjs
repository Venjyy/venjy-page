// =========================================================
// VENJY · Estudio · modelo puro de los paneles de la pestaña Combate (bloque 8 · N6c, mundo/COMBATE.md §25.2)
// Sin DOM ni audio: lo usan estudio/combate-paneles.js y mundo/tests/estudio-combate.mjs.
//   Peso (combate.json → peso, impacto y sonidos): NIVELES con nombre común, CAMPOS_PESO, CAMPOS_IMPACTO, CAMPOS_SONIDO,
//     vocesDe(combate, nivel, capa, material) = las voces de una capa del sonido (para «oír»), con capasSonido del juego
//   Reacciones (combate.json → elegir): la tabla altura × nivel, lo que sube un golpe fuerte o un remate y las leves seguidas
//   Controles (combate.json → teclas, entrada y tactil; estilo-*.json → controles): ACCIONES_TECLA, nombreTecla,
//     codigoDe(evento), ponerTecla / quitarTecla / choques; CAMPOS_TACTIL; BOTONES_ESTILO
//   CPU (estilo-*.json → cpu): CAMPOS_CPU (por situación) y POR_DIFICULTAD; camposCpuDe(cpu) = los que ese estilo trae
//   Probar: mensajeProbar(archivoEstilo, grupo, clave, dificultad) = el mensaje `combate` del puente
//   leer(obj, ruta) / fijar(obj, ruta, v): leer y escribir por ruta (fijar crea lo que falte: solo añade)
// Las tablas de dificultad de la CPU (arena.json → cpu) se editan en la pestaña Arena; aquí no, para no editar
// arena.json desde dos pestañas a la vez.
// =========================================================
import { fijarCombate } from '../mundo/supervivencia/combate/datos.js';
import { capasSonido, NIVELES as NIVELES_PESO } from '../mundo/supervivencia/combate/peso.js';

const clonar = o => JSON.parse(JSON.stringify(o));
export function leer(obj, ruta) { let o = obj; for (const k of ruta) { if (o === null || o === undefined) return undefined; o = o[k]; } return o; }
export function fijar(obj, ruta, v) {
    let o = obj;
    for (let i = 0; i < ruta.length - 1; i++) {
        const k = ruta[i];
        if (o[k] === null || typeof o[k] !== 'object') o[k] = typeof ruta[i + 1] === 'number' ? [] : {};
        o = o[k];
    }
    o[ruta[ruta.length - 1]] = v;
    return obj;
}

// ---------- Peso ----------
export const NIVELES = NIVELES_PESO;
export const NOMBRE_NIVEL = {
    ligero: ['Golpe ligero', 'Light hit'], medio: ['Golpe medio', 'Medium hit'], fuerte: ['Golpe fuerte', 'Heavy hit'],
    desvio: ['Desvío', 'Deflect'], perfecto: ['Desvío perfecto', 'Perfect deflect'], remate: ['Golpe final', 'Final strike']
};
// [clave, es, en, mín, máx, paso, simple]
export const CAMPOS_PESO = [
    ['hitstop', 'Pausa del golpe (cuadros congelados)', 'Hit pause (frozen frames)', 0, 30, 1, true],
    ['trauma', 'Sacudida de la cámara', 'Camera shake', 0, 1, 0.05, true],
    ['empuje', 'Empuje del rival (bloques)', 'Rival push (blocks)', 0, 3, 0.05, true],
    ['particulas', 'Chispas y polvo', 'Sparks and dust', 0, 60, 1, true]
];
export const CAMPOS_LENTA = [
    ['segundos', 'Cámara lenta: segundos', 'Slow motion: seconds', 0.05, 2, 0.05],
    ['escala', 'Cámara lenta: rapidez (1 = normal)', 'Slow motion: speed (1 = normal)', 0.1, 1, 0.05]
];
export const CAMPOS_IMPACTO = [
    [['temblor', 'amplitud'], 'Temblor del que recibe (bloques)', 'Receiver shake (blocks)', 0, 0.2, 0.005],
    [['temblor', 'cada'], 'Temblor: cambia cada (cuadros)', 'Shake: flips every (frames)', 1, 6, 1],
    [['sacudida', 'baja'], 'Sacudida: se calma por segundo', 'Shake: fades per second', 0.1, 5, 0.1],
    [['sacudida', 'desplazamiento'], 'Sacudida: corrimiento máximo', 'Shake: max offset', 0, 0.5, 0.01],
    [['sacudida', 'giro'], 'Sacudida: giro máximo (grados)', 'Shake: max tilt (degrees)', 0, 8, 0.1],
    [['sacudida', 'frecuencia'], 'Sacudida: frecuencia', 'Shake: frequency', 1, 40, 1]
];
export const CAPAS = [
    ['aire', 'Aire (el arma corta el aire)', 'Air (the swing)'],
    ['impacto', 'Impacto (según el material)', 'Impact (by material)'],
    ['cuerpo', 'Cuerpo (el que recibe)', 'Body (the receiver)'],
    ['todo', 'Golpe entero (con eco)', 'Whole hit (with echo)']
];
export const MATERIALES = [['carne', 'Carne', 'Flesh'], ['metal', 'Metal', 'Metal'], ['madera', 'Madera', 'Wood']];
export const CAMPOS_SONIDO = [
    [['volumen'], 'Volumen de todos los golpes', 'Volume of every hit', 0, 2, 0.05, true],
    [['cola', 'ecos'], 'Eco: repeticiones', 'Echo: repeats', 0, 5, 1],
    [['cola', 'retardo'], 'Eco: separación (s)', 'Echo: gap (s)', 0, 0.3, 0.01],
    [['cola', 'caida'], 'Eco: cuánto baja cada vez', 'Echo: how much each one drops', 0, 1, 0.05],
    [['aire', 'subeConNivel'], 'Aire: más agudo en golpes fuertes', 'Air: higher on heavy hits', 0, 1, 0.05],
    [['cuerpo', 'graveConNivel'], 'Cuerpo: más grave en golpes fuertes', 'Body: lower on heavy hits', 0, 1, 0.05],
    [['perfecto', 'tono'], 'Desvío perfecto: tono', 'Perfect deflect: pitch', 0.5, 2, 0.05],
    [['perfecto', 'alarga'], 'Desvío perfecto: más largo', 'Perfect deflect: longer', 0.5, 3, 0.05]
];
// Campos de una voz del sonido: [clave, es, en, mín, máx, paso]
export const CAMPOS_VOZ = {
    ruido: [['frec', 'frecuencia (Hz)', 'frequency (Hz)', 40, 8000, 10], ['q', 'filtro Q', 'filter Q', 0.1, 10, 0.1], ['dur', 'dura (s)', 'lasts (s)', 0.01, 1, 0.01], ['vol', 'volumen', 'volume', 0, 1, 0.01]],
    tono: [['f0', 'empieza en (Hz)', 'starts at (Hz)', 20, 8000, 5], ['f1', 'termina en (Hz)', 'ends at (Hz)', 20, 8000, 5], ['dur', 'dura (s)', 'lasts (s)', 0.01, 1, 0.01], ['vol', 'volumen', 'volume', 0, 1, 0.01]]
};
export const FORMAS = ['sine', 'square', 'triangle', 'sawtooth'];
export const FILTROS = ['lowpass', 'bandpass', 'highpass'];
// Las voces de una capa del sonido de un golpe de ese nivel, con lo que la pestaña tiene ahora (el motor del juego
// arma las capas; aquí se apagan las otras). capa: 'aire' | 'impacto' | 'cuerpo' | 'todo'
export function vocesDe(combate, nivel, capa, material = 'carne') {
    const d = clonar(combate || {}), S = d.sonidos = d.sonidos || {};
    if (capa === 'aire') { fijarCombate(d); const v = capasSonido(nivel, { aire: true }); fijarCombate(combate); return v; }
    if (capa !== 'todo') S.cola = { ...(S.cola || {}), ecos: 0 };
    if (capa === 'impacto') S.cuerpo = { ...(S.cuerpo || {}), voces: [] };
    if (capa === 'cuerpo') S.impacto = { ...(S.impacto || {}), [material]: [] };
    fijarCombate(d);
    const v = capasSonido(nivel, { material, resultado: nivel === 'desvio' ? 'desviado' : nivel === 'perfecto' ? 'perfecto' : 'golpeado' });
    fijarCombate(combate);
    return v;
}
// Dónde viven las voces de una capa (para editarlas en Avanzado)
export const rutaVoces = (capa, material = 'carne') => (capa === 'impacto' ? ['impacto', material] : capa === 'aire' || capa === 'cuerpo' ? [capa, 'voces'] : null);

// ---------- Reacciones ----------
export const ALTURAS = [['alto', 'Arriba (cabeza)', 'High (head)'], ['medio', 'Al medio (cuerpo)', 'Middle (body)'], ['bajo', 'Abajo (piernas)', 'Low (legs)']];
export const NIVELES_TABLA = ['ligero', 'medio', 'fuerte'];
export const SUBIR = [['fuerte', 'Con un golpe fuerte, sube a…', 'With a heavy hit, goes up to…'], ['remate', 'Con un golpe final, pasa a…', 'With a final strike, becomes…']];
// Reacciones que salen de la tabla (las que pueden subir)
export function reaccionesDeTabla(elegir) {
    const s = new Set();
    for (const a of Object.values((elegir && elegir.tabla) || {})) for (const r of Object.values(a || {})) if (r) s.add(r);
    for (const m of Object.values((elegir && elegir.subir) || {})) for (const k of Object.keys(m || {})) s.add(k);
    return [...s];
}
export const CAMPOS_PARED = [
    ['empuje', 'Pared: empuje mínimo para chocar', 'Wall: minimum push to hit it', 0, 2, 0.05],
    ['hitstop', 'Pared: pausa del choque (cuadros)', 'Wall: hit pause (frames)', 0, 20, 1],
    ['rebote', 'Pared: rebote (bloques)', 'Wall: bounce (blocks)', 0, 2, 0.05]
];

// ---------- Controles ----------
export const ACCIONES_TECLA = [
    ['izquierda', 'Caminar a la izquierda', 'Walk left'], ['derecha', 'Caminar a la derecha', 'Walk right'],
    ['alto', 'Arriba (golpe alto, paso lateral)', 'Up (high hit, sidestep)'], ['bajo', 'Abajo (golpe bajo, paso lateral)', 'Down (low hit, sidestep)'],
    ['atacar', 'Atacar', 'Attack'], ['defensa', 'Defensa (desviar; mantener: bloquear)', 'Defense (deflect; hold: block)'],
    ['esquivar', 'Esquivar', 'Dodge'], ['agarre', 'Agarre / patada', 'Grab / kick'], ['especial', 'Especial / arte', 'Special / art'],
    ['saltar', 'Saltar', 'Jump']
];
export const PERFILES = [['raton', 'Teclado y ratón', 'Keyboard and mouse'], ['teclado', 'Solo teclado', 'Keyboard only']];
const NOMBRES_TECLA = {
    Mouse0: ['Clic izquierdo', 'Left click'], Mouse1: ['Clic de la rueda', 'Wheel click'], Mouse2: ['Clic derecho', 'Right click'],
    Space: ['Espacio', 'Space'], ShiftLeft: ['Mayús izq.', 'Left Shift'], ShiftRight: ['Mayús der.', 'Right Shift'],
    ControlLeft: ['Ctrl izq.', 'Left Ctrl'], ControlRight: ['Ctrl der.', 'Right Ctrl'], AltLeft: ['Alt', 'Alt'], Tab: ['Tab', 'Tab'], Enter: ['Enter', 'Enter'],
    ArrowLeft: ['Flecha izquierda', 'Left arrow'], ArrowRight: ['Flecha derecha', 'Right arrow'], ArrowUp: ['Flecha arriba', 'Up arrow'], ArrowDown: ['Flecha abajo', 'Down arrow']
};
export function nombreTecla(code, idioma = 'es') {
    const n = NOMBRES_TECLA[code];
    if (n) return n[idioma === 'en' ? 1 : 0];
    let m = /^Key([A-Z])$/.exec(code); if (m) return m[1];
    m = /^Digit(\d)$/.exec(code); if (m) return m[1];
    m = /^Numpad(\d)$/.exec(code); if (m) return (idioma === 'en' ? 'Numpad ' : 'Teclado num. ') + m[1];
    m = /^Mouse(\d)$/.exec(code); if (m) return (idioma === 'en' ? 'Mouse button ' : 'Botón del ratón ') + m[1];
    return code;
}
// El código que guarda el juego para un evento de teclado o de ratón (null si no sirve: Escape queda para la pausa)
export function codigoDe(e) {
    if (!e) return null;
    if (e.type === 'mousedown' || e.type === 'pointerdown') return Number.isInteger(e.button) ? 'Mouse' + e.button : null;
    if (typeof e.code !== 'string' || !e.code || e.code === 'Escape') return null;
    return e.code;
}
const teclasDe = (teclas, perfil) => (teclas && teclas.arena && teclas.arena[perfil]) || null;
// Pone la tecla i de esa acción (i = largo: agrega una). Devuelve true si cambió
export function ponerTecla(teclas, perfil, accion, i, code) {
    const p = teclasDe(teclas, perfil);
    if (!p || typeof code !== 'string' || !code) return false;
    const l = Array.isArray(p[accion]) ? p[accion] : (p[accion] = []);
    if (l.includes(code) && l[i] !== code) return false;
    if (l[i] === code) return false;
    if (i >= l.length) l.push(code); else l[i] = code;
    return true;
}
// Quita la tecla i (siempre queda al menos una)
export function quitarTecla(teclas, perfil, accion, i) {
    const p = teclasDe(teclas, perfil), l = p && p[accion];
    if (!Array.isArray(l) || l.length <= 1 || !l[i]) return false;
    l.splice(i, 1);
    return true;
}
// Teclas usadas por más de una acción del perfil: { code: [acciones] }
export function choques(teclas, perfil) {
    const p = teclasDe(teclas, perfil) || {}, uso = {};
    for (const [a, l] of Object.entries(p)) for (const k of Array.isArray(l) ? l : []) (uso[k] = uso[k] || []).push(a);
    return Object.fromEntries(Object.entries(uso).filter(([, a]) => a.length > 1));
}
// [ruta en combate.json, es, en, mín, máx, paso, simple]
export const CAMPOS_TACTIL = [
    [['tactil', 'deslizar', 'px'], 'Táctil: cuánto deslizar para un golpe con dirección (px)', 'Touch: swipe for a directional hit (px)', 4, 80, 1, true],
    [['tactil', 'esquiva', 'px'], 'Táctil: cuánto deslizar para esquivar (px)', 'Touch: swipe to dodge (px)', 10, 120, 1, true],
    [['tactil', 'joystick', 'radio'], 'Táctil: tamaño del joystick (px)', 'Touch: joystick size (px)', 20, 120, 1, true],
    [['tactil', 'joystick', 'zonaMuerta'], 'Táctil: zona muerta del joystick', 'Touch: joystick dead zone', 0, 0.6, 0.01, true],
    [['tactil', 'vibracion', 'intensidad'], 'Táctil: fuerza de la vibración', 'Touch: vibration strength', 0, 2, 0.05, true],
    [['tactil', 'deslizar', 'ms'], 'Táctil: tiempo máximo del deslizar (ms)', 'Touch: max swipe time (ms)', 40, 500, 10],
    [['tactil', 'esquiva', 'ms'], 'Táctil: tiempo máximo de la esquiva (ms)', 'Touch: max dodge time (ms)', 60, 600, 10],
    [['tactil', 'joystick', 'mitad'], 'Táctil: joystick a medio camino', 'Touch: joystick halfway', 0.1, 0.9, 0.05],
    [['tactil', 'buffer'], 'Táctil: recuerda un botón por (cuadros)', 'Touch: remembers a press for (frames)', 0, 30, 1],
    [['tactil', 'ventanasExtra'], 'Táctil: cuadros extra en las ventanas', 'Touch: extra window frames', 0, 8, 1],
    [['tactil', 'especialModo'], 'Táctil: cuadros para el modo especial', 'Touch: frames for the special mode', 0, 60, 1],
    [['entrada', 'buffer'], 'Teclado: recuerda un botón por (cuadros)', 'Keyboard: remembers a press for (frames)', 0, 30, 1],
    [['teclas', 'fuerte'], 'Mantener atacar para el golpe fuerte (cuadros)', 'Hold attack for the heavy hit (frames)', 4, 40, 1],
    [['teclas', 'mando', 'zonaMuerta'], 'Mando: zona muerta', 'Gamepad: dead zone', 0, 0.6, 0.01],
    [['teclas', 'mando', 'altura'], 'Mando: palanca para arriba o abajo', 'Gamepad: stick for up or down', 0.1, 0.9, 0.05]
];
// Botones del estilo (estilo-*.json → controles): qué acción hace cada uno. Un control puede ser una clave o una
// por altura ({ alto, medio, bajo, adelante, neutro })
export const BOTONES_ESTILO = [
    ['atacar', 'Atacar', 'Attack'], ['fuerte', 'Atacar mantenido', 'Held attack'], ['defensa', 'Defensa', 'Defense'],
    ['defensaMantenida', 'Defensa mantenida', 'Held defense'], ['esquivar', 'Esquivar', 'Dodge'], ['saltar', 'Saltar', 'Jump'],
    ['agarre', 'Agarre', 'Grab'], ['especial', 'Especial', 'Special']
];
export const ALTURAS_CONTROL = ['medio', 'alto', 'bajo', 'adelante', 'neutro'];

// ---------- CPU (por estilo) ----------
// [ruta en estilo.cpu, es, en, mín, máx, paso, simple]. Un par [mín, máx] se edita como dos números.
export const CAMPOS_CPU = [
    [['cadena'], 'Golpes seguidos por ataque (mín, máx)', 'Hits in a row per attack (min, max)', 0, 8, 1, true],
    [['peligro', 'cada'], 'Un ataque peligroso cada (s, mín y máx)', 'A perilous attack every (s, min and max)', 0, 40, 0.5, true],
    [['retrasado', 'prob'], 'Probabilidad de un golpe retrasado (engaña el ritmo)', 'Chance of a delayed hit (breaks rhythm)', 0, 1, 0.05, true],
    [['respiro', 'alejarse'], 'Probabilidad de alejarse a respirar', 'Chance of backing off to breathe', 0, 1, 0.05, true],
    [['respiro', 'provocar'], 'Probabilidad de provocar', 'Chance of taunting', 0, 1, 0.05, true],
    [['distancia', 'cerca'], 'Muy cerca (retrocede si estás a menos, bloques)', 'Too close (backs off if nearer, blocks)', 0, 5, 0.05, true],
    [['retrasado', 'cuadros'], 'Golpe retrasado: cuadros de más (mín, máx)', 'Delayed hit: extra frames (min, max)', 0, 60, 1],
    [['fuerte', 'prob'], 'Probabilidad del golpe fuerte', 'Chance of the heavy hit', 0, 1, 0.05],
    [['fuerte', 'carga'], 'Golpe fuerte: cuadros de carga (mín, máx)', 'Heavy hit: charge frames (min, max)', 0, 90, 1],
    [['patada', 'prob'], 'Patada contra tu bloqueo', 'Kick against your block', 0, 1, 0.05],
    [['arte', 'prob'], 'Arte con espíritu lleno', 'Art with full spirit', 0, 1, 0.05],
    [['peligro', 'pocaVida'], 'Con poca vida (fracción)', 'With low health (fraction)', 0, 1, 0.05],
    [['peligro', 'factor'], 'Con poca vida, el peligroso sale × más seguido', 'With low health, perilous comes × sooner', 0.1, 1, 0.05],
    [['respiro', 'cuadros'], 'Respiro: cuadros (mín, máx)', 'Breather: frames (min, max)', 0, 240, 1],
    [['respiro', 'lejos'], 'Respiro: lejos (bloques)', 'Breather: far (blocks)', 0, 10, 0.1],
    [['distancia', 'margen'], 'Ataca a × su alcance', 'Attacks at × its reach', 0.3, 1, 0.05],
    [['distancia', 'acercarse'], 'Rapidez al acercarse', 'Approach speed', 0, 1.5, 0.05],
    [['distancia', 'alejarse'], 'Rapidez al alejarse', 'Back-off speed', 0, 1.5, 0.05],
    [['esperaInicial'], 'Espera al empezar (cuadros, mín y máx)', 'Wait at the start (frames, min and max)', 0, 180, 1],
    [['castigoBajo', 'prob'], 'Castiga con el golpe bajo tras esquivarte', 'Punishes low after dodging you', 0, 1, 0.05],
    [['escape', 'amago'], 'Zafarse de un agarre con amago (×)', 'Escaping a feinted grab (×)', 0, 1, 0.05],
    [['escape', 'cuadros'], 'Zafarse: cuadros hasta apretar (mín, máx)', 'Escape: frames until pressing (min, max)', 0, 40, 1],
    [['rompe', 'prob'], 'Rompe tu combo con el arte especial', 'Breaks your combo with the special art', 0, 1, 0.05],
    [['rompe', 'espera'], 'Rompe: espera (cuadros, mín y máx)', 'Break: wait (frames, min and max)', 0, 40, 1],
    [['rompe', 'vidaMax'], 'Rompe solo con vida de (fracción) o menos', 'Breaks only with health (fraction) or less', 0, 1, 0.05],
    [['furia', 'prob'], 'Furia: probabilidad por cuadro', 'Fury: chance per frame', 0, 0.5, 0.01],
    [['furia', 'distancia'], 'Furia: a esta distancia o menos', 'Fury: at this distance or less', 0, 10, 0.1],
    [['pisoton', 'prob'], 'Pisa al derribado', 'Stomps the downed', 0, 1, 0.05]
];
// Probabilidades por dificultad dentro del estilo: [ruta, es, en]
export const POR_DIFICULTAD = [
    [['acierto'], 'Lee bien la altura de tu golpe', 'Reads your hit height right'],
    [['escape', 'acierto'], 'Se zafa de tus agarres', 'Escapes your grabs'],
    [['amago'], 'Amaga sus agarres', 'Feints its grabs']
];
export const DIFICULTADES = [['facil', 'Fácil', 'Easy'], ['normal', 'Normal', 'Normal'], ['dificil', 'Difícil', 'Hard'], ['maestro', 'Maestro', 'Master']];
// Los campos que ese estilo ya trae (solo se editan esos: lo que falta usa el valor del código)
export const camposCpuDe = cpu => CAMPOS_CPU.filter(([r]) => leer(cpu, r) !== undefined);
export const porDificultadDe = cpu => POR_DIFICULTAD.filter(([r]) => { const o = leer(cpu, r); return o && typeof o === 'object' && !Array.isArray(o); });

// ---------- Probar en el juego ----------
// El mensaje `combate` del puente: el estilo sin «estilo-»; reacción si la acción es una reacción (común o del estilo)
export function mensajeProbar(archivoEstilo, grupo, clave, dificultad = 'normal') {
    const estilo = String(archivoEstilo || '').replace(/^estilo-/, '');
    const reaccion = grupo === 'comunes' || grupo === 'reacciones';
    return { accion: 'probar', estilo, ataque: clave, reaccion, dificultad };
}
