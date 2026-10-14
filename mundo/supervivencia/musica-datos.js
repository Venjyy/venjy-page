// =========================================================
// VENJY · Supervivencia · mundo/datos/musica.json en el juego (lo crea la pestaña Música del Estudio)
// Un tema de musica.json reemplaza por clave al del código: en la carrera (living, cocina, patio, techo, podio) y en el
// mundo (ambiente, venjy, pony, lona, campamento, iglu, lenera, playa, jefe; ver USOS en musica-motor.js). Un tema con
// "borrador": true no suena en el juego hasta que se aplique (se quita la marca). Los instrumentos propios del archivo
// sirven en cualquier tema del archivo. Con ?estudio se aplica en vivo (estudio/puente-juego.js) y la vista previa del
// Estudio calla la música del juego mientras suena (enPrueba).
// =========================================================
import { cargarDatos } from '../datos/cargador.js';

let datos = null, prueba = false;

// Lo piden musica.js y carrera-musica.js al crearse (una sola vez gracias al caché de cargador.js)
export function cargarMusica() {
    return cargarDatos('musica').then(d => { if (d && !datos) datos = d; return d; });
}
export function aplicarMusica(d) { datos = d && typeof d === 'object' ? d : null; }
// El tema de musica.json con esa clave, si está listo para el juego (no borrador y con capas); si no, null
export function temaMusica(clave) {
    const t = datos && datos.temas && datos.temas[clave];
    return t && !t.borrador && Array.isArray(t.capas) && t.bpm > 0 ? t : null;
}
export function instrumentosPropios() { return (datos && datos.instrumentos) || null; }
export function enPrueba() { return prueba; }
export function ponerPrueba(v) { prueba = !!v; }
