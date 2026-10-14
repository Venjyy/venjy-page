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
// Los temas son solo datos (capas con patrones de 16 pasos) en carrera-musica-datos.js, el formato que podrá editar el Estudio.
// Volumen, tempo, última vuelta y el tema de cada pista: carrera.json → musica (Estudio → Carrera).
// =========================================================
import { cuandoHayaAudio } from '../criaturas/cuerpo.js';
import { I } from './musica.js';
import { TEMAS_CARRERA, tocarPaso } from './carrera-musica-datos.js';
export { TEMAS_CARRERA };

export function crearMusicaCarrera({ encendida = () => true } = {}) {
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
    let tema = null, siguiente = 0, i = 0, k = 0;
    // estado = null (callada) o { tema, nivel, tempo (×), vol (×), pausa }
    function actualizar(estado) {
        if (!audio || audio.ctx.state !== 'running') return;
        const ctx = audio.ctx, ahora = ctx.currentTime;
        const def = estado && TEMAS_CARRERA[estado.tema];
        const vol = def && encendida() ? def.vol * estado.vol * (estado.pausa ? 0.35 : 1) : 0;
        salida.gain.setTargetAtTime(vol, ahora, 0.15);
        if (!def) { tema = null; return; }
        if (estado.tema !== tema) { tema = estado.tema; siguiente = ahora + 0.05; i = 0; k = 0; }
        if (siguiente < ahora - 0.5) siguiente = ahora + 0.05; // (la pestaña estuvo dormida)
        const s = 60 / (def.bpm * Math.max(0.5, estado.tempo || 1)) / 4;
        while (siguiente < ahora + 0.2) {
            try { tocarPaso(I, def, ctx, salida, siguiente, i, k, s, estado.nivel); } catch (e) { /* nota perdida */ }
            siguiente += s;
            if (++i >= 16) { i = 0; k++; }
        }
    }
    return { actualizar, callar: () => actualizar(null), get tema() { return tema; } };
}
