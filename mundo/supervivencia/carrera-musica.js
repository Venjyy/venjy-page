// =========================================================
// VENJY · Supervivencia · Música de la carrera de gatas (7h-1)
// Un tema por pista, sintetizado con los instrumentos de musica.js (sin archivos):
//  · living: rock chiptune de gran premio (La menor, 160 bpm)
//  · cocina: funk de cocina con ollas (Re dórico, 128 bpm)
//  · patio: surf rock con trémolo (Mi menor, 172 bpm)
//  · techo: synthwave al atardecer (Do menor, 138 bpm)
//  · podio: fanfarria de victoria (Do mayor, 120 bpm)
// Capas según la fase: en el menú y la sala, bajo, acordes y platillos; en la cuenta, además el bombo; corriendo, todo;
// en la última vuelta, más rápido y con un arpegio encima; en el podio, la fanfarria.
// Los temas son solo datos (capas con patrones de 16 pasos) en carrera-musica-datos.js; uno de mundo/datos/musica.json con
// la misma clave lo reemplaza (pestaña Música del Estudio). El motor es musica-motor.js.
// Volumen, tempo, última vuelta y el tema de cada pista: carrera.json → musica (Estudio → Carrera).
// =========================================================
import { cuandoHayaAudio } from '../criaturas/cuerpo.js';
import { I } from './musica-instrumentos.js';
import { TEMAS_CARRERA } from './carrera-musica-datos.js';
import { crearSecuenciador } from './musica-motor.js';
import { cargarMusica, temaMusica, instrumentosPropios, enPrueba } from './musica-datos.js';
export { TEMAS_CARRERA };

export function crearMusicaCarrera({ encendida = () => true } = {}) {
    cargarMusica();
    let audio = null, salida = null;
    cuandoHayaAudio(a => {
        audio = a;
        salida = a.ctx.createGain(); salida.gain.value = 0;
        // Eco corto para que suene en un espacio
        const eco = a.ctx.createDelay(1); eco.delayTime.value = 0.18;
        const fb = a.ctx.createGain(); fb.gain.value = 0.2;
        const mezcla = a.ctx.createGain(); mezcla.gain.value = 0.15;
        salida.connect(a.master);
        salida.connect(eco); eco.connect(fb); fb.connect(eco); eco.connect(mezcla); mezcla.connect(a.master);
    });
    let tema = null;
    const sec = crearSecuenciador();
    // estado = null (callada) o { tema, nivel, tempo (×), vol (×), pausa }
    // El tema sale de musica.json si allí hay uno con esa clave (y no es borrador); si no, de carrera-musica-datos.js
    function actualizar(estado) {
        if (!audio || audio.ctx.state !== 'running') return;
        const ctx = audio.ctx, ahora = ctx.currentTime;
        const def = estado && (temaMusica(estado.tema) || TEMAS_CARRERA[estado.tema]);
        const vol = def && encendida() && !enPrueba() ? def.vol * estado.vol * (estado.pausa ? 0.35 : 1) : 0;
        salida.gain.setTargetAtTime(vol, ahora, 0.15);
        if (!def) { tema = null; sec.reiniciar(); return; }
        tema = estado.tema;
        sec.avanzar({ I, ctx, salida, def, clave: tema, nivel: estado.nivel, tempo: estado.tempo || 1, propios: instrumentosPropios() });
    }
    return { actualizar, callar: () => actualizar(null), get tema() { return tema; } };
}
