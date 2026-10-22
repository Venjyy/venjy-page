// =========================================================
// VENJY · Estudio · vista simple de la pestaña Vida (B0-V, puro: sin DOM, lo usan vida.js y las pruebas)
// - Cada visita en una frase («pony va a ver a lalo de 13:00 a 15:00»).
// - Horas como 13:30 en vez de 13.5 (el JSON sigue guardando el decimal).
// - Bases para partir: visitas típicas (almuerzo, tarde, junta en la noche, paseo a un lugar).
// - Perillas que mueven valores de navegacion.json, rutinas.json y actividades.json con nombres comunes;
//   en el centro (o fuera de la escala) se borra la clave y queda el valor del juego.
// =========================================================
import { leerPerilla as leer, ponerPerilla as poner } from './perillas.mjs';

// Hora decimal ↔ «13:30» (paso de 15 min, como el campo del modo avanzado)
export function horaTexto(h) {
    if (!Number.isFinite(h)) return '';
    const m = Math.round(h * 4) * 15;
    return `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}
export function horaDeTexto(s) {
    const m = /^(\d{1,2}):(\d{2})$/.exec(String(s || '').trim());
    if (!m) return null;
    const h = Number(m[1]), min = Number(m[2]);
    if (h > 24 || min > 59 || (h === 24 && min > 0)) return null;
    return Math.round((h + min / 60) * 4) / 4;
}

// Una visita en palabras (los nombres de personas y lugares son las claves de posiciones.json)
export function fraseVisita(v, idioma = 'es') {
    const en = idioma === 'en', de = horaTexto(v.de), a = horaTexto(v.a);
    const adonde = v.visita ? (en ? `goes to see ${v.visita}` : `va a ver a ${v.visita}`)
        : v.lugar ? (en ? `goes to ${v.lugar}` : `va a ${v.lugar}`) : (en ? 'goes for a walk' : 'sale a pasear');
    const apagada = v.activa === false ? (en ? ' (off)' : ' (apagada)') : '';
    return `${v.quien || '?'} ${adonde} ${en ? 'from' : 'de'} ${de} ${en ? 'to' : 'a'} ${a}${apagada}`;
}

// Bases para partir: horario y frases típicas; `visita: true` = va a ver a otra persona, si no, a un lugar
export const BASES_VISITA = [
    { clave: 'almuerzo', es: 'Almorzar con un amigo', en: 'Lunch with a friend', visita: true, de: 13, a: 14.5,
        llegada: { gesto: 'saluda', texto: { es: '¡Hola! ¿Almorzamos?', en: 'Hi! Lunch?' } }, respuesta: { gesto: 'asiente', texto: { es: '¡Dale, pasa!', en: 'Sure, come in!' } } },
    { clave: 'tarde', es: 'Pasar la tarde donde un amigo', en: 'Spend the afternoon at a friend’s', visita: true, de: 16, a: 18.5,
        llegada: { gesto: 'saluda', texto: { es: '¿Qué hacís?', en: 'What’s up?' } }, respuesta: { gesto: 'risa', texto: { es: '¡Llegaste justo!', en: 'Right on time!' } } },
    { clave: 'noche', es: 'Junta en la noche', en: 'Night hangout', visita: true, de: 20, a: 22.5,
        llegada: { gesto: 'saluda', texto: { es: '¡Llegó la buena onda!', en: 'The good vibes are here!' } }, respuesta: { gesto: 'risa', texto: { es: '¡Por fin!', en: 'Finally!' } } },
    { clave: 'paseo', es: 'Ir a pasear a un lugar', en: 'Go for a walk somewhere', visita: false, de: 10, a: 11.5,
        llegada: { gesto: 'asiente', texto: { es: 'Qué buen lugar.', en: 'What a nice place.' } } }
];
// Visita nueva desde una base: clave libre `<quien>-<base>` (o -2, -3…)
export function visitaDeBase(base, quien, otro, lugar, visitas = {}) {
    let clave = `${quien}-${base.clave}`, i = 2;
    while (visitas[clave]) clave = `${quien}-${base.clave}-${i++}`;
    const v = { quien, de: base.de, a: base.a, llegada: JSON.parse(JSON.stringify(base.llegada)) };
    if (base.visita && otro) { v.visita = otro; if (base.respuesta) v.respuesta = JSON.parse(JSON.stringify(base.respuesta)); }
    else if (lugar) v.lugar = lugar;
    return { clave, visita: v };
}
// Copia de una visita (para partir de una parecida); queda apagada hasta que el dueño la prenda
export function duplicarVisita(clave, visitas) {
    let nueva = `${clave}-copia`, i = 2;
    while (visitas[nueva]) nueva = `${clave}-copia-${i++}`;
    const v = JSON.parse(JSON.stringify(visitas[clave]));
    v.activa = false;
    return { clave: nueva, visita: v };
}

// ---- Perillas ----
// Cada una: archivo, parte y campos que mueve (perillas.mjs); `opciones` = [valor, es, en].
// `factor` (perillas de escala) multiplica el valor base de cada campo; `valor` pone ese número tal cual.
const NIVELES = [[0, 'Desconocido', 'Stranger'], [1, 'Conocido', 'Acquaintance'], [2, 'Amigo', 'Friend'], [3, 'Buen amigo', 'Good friend'], [4, 'Íntimo', 'Close friend'], [5, 'nunca', 'never']];
export const PERILLAS = [
    { clave: 'rapidez', es: 'Rapidez al caminar', en: 'Walking speed', archivo: 'navegacion', parte: 'caminar', campos: ['velocidad'], tipo: 'factor',
        opciones: [[0.6, 'lenta', 'slow'], [0.8, 'tranquila', 'relaxed'], [1, 'normal', 'normal'], [1.25, 'rápida', 'fast'], [1.4, 'muy rápida', 'very fast']] },
    { clave: 'cerca', es: 'Qué tan cerca te sigue quien te acompaña', en: 'How close a companion follows you', archivo: 'navegacion', parte: 'seguir', campos: ['distancia', 'holgura'], tipo: 'factor',
        opciones: [[0.6, 'pegado a ti', 'right next to you'], [1, 'normal', 'normal'], [1.6, 'a su aire', 'at a distance']] },
    { clave: 'pelea', es: 'Fuerza de quien te acompaña al pelear', en: 'Companion’s fighting strength', archivo: 'navegacion', parte: 'pelea', campos: ['dano', 'aguante'], tipo: 'factor',
        opciones: [[0.5, 'débil', 'weak'], [1, 'normal', 'normal'], [1.5, 'fuerte', 'strong'], [2, 'muy fuerte', 'very strong']] },
    { clave: 'acompanar', es: 'Te acompaña desde la amistad', en: 'Comes with you from friendship', archivo: 'rutinas', parte: 'ajustes', campos: ['nivelAcompanar'], tipo: 'valor', opciones: NIVELES },
    { clave: 'saluda', es: 'Te saluda al pasar desde la amistad', en: 'Greets you in passing from friendship', archivo: 'rutinas', parte: 'ajustes', campos: ['nivelIncluir'], tipo: 'valor', opciones: NIVELES },
    { clave: 'dia', es: 'Largo del día', en: 'Day length', archivo: 'rutinas', parte: 'ajustes', campos: ['segundosHora'], tipo: 'factor',
        opciones: [[0.5, 'corto', 'short'], [1, 'normal', 'normal'], [2, 'largo', 'long']] },
    { clave: 'fogata', es: 'Jugadores sentados en la fogata', en: 'Players seated at the campfire', archivo: 'actividades', parte: 'fogata', campos: ['cupo'], tipo: 'valor',
        opciones: [[2, '2', '2'], [4, '4', '4'], [6, '6', '6'], [8, '8', '8']] }
];
for (const p of PERILLAS) p.ruta = [p.archivo, p.parte];
// Las perillas viven en `{ navegacion, rutinas, actividades }` (y sus bases, con la misma forma). La pestaña Vida
// deja sus partes vacías como {}, así que aquí no se limpian.
export const leerPerilla = (p, datos, bases) => leer(p, datos, bases);
export const ponerPerilla = (p, datos, valor, bases) => poner(p, datos, valor, bases, { limpiar: false });
