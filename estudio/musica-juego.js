// =========================================================
// VENJY · Estudio · vista previa de la pestaña Música dentro del juego (supervivencia.html?estudio)
// puente-juego.js lo carga la primera vez que llega { tipo: 'musica' }. Toca el tema que manda el Estudio con los
// instrumentos y el motor del juego (musica-motor.js), y mientras suena calla la música del mundo y la de la carrera
// (musica-datos.js → enPrueba). Mandar otro 'tocar' cambia el tema sin volver al primer compás; 'parar' lo corta.
// =========================================================
import { audioMundo } from '../mundo/criaturas/cuerpo.js';
import { I } from '../mundo/supervivencia/musica-instrumentos.js';
import { crearSecuenciador } from '../mundo/supervivencia/musica-motor.js';
import { ponerPrueba } from '../mundo/supervivencia/musica-datos.js';

const sec = crearSecuenciador();
let reloj = null, salida = null, actual = null;

function paso() {
    const a = audioMundo();
    if (!a || !actual || a.ctx.state !== 'running') return;
    sec.avanzar({ I, ctx: a.ctx, salida, def: actual.tema, clave: 'prueba', nivel: actual.nivel, tempo: actual.tempo, propios: actual.instrumentos });
}

export function musicaPrueba({ accion, tema, instrumentos, nivel, tempo }) {
    const a = audioMundo();
    if (!a) throw new Error('el juego todavía no tiene sonido: haz clic una vez en el juego');
    if (!salida) { salida = a.ctx.createGain(); salida.gain.value = 0; salida.connect(a.master); }
    if (accion === 'parar') {
        actual = null; sec.reiniciar(); ponerPrueba(false);
        salida.gain.setTargetAtTime(0, a.ctx.currentTime, 0.05);
        if (reloj) { clearInterval(reloj); reloj = null; }
        return;
    }
    actual = { tema, instrumentos, nivel: nivel || 'corre', tempo: tempo || 1 };
    ponerPrueba(true);
    salida.gain.setTargetAtTime(tema.vol === undefined ? 0.1 : tema.vol, a.ctx.currentTime, 0.05);
    if (!reloj) reloj = setInterval(paso, 50);
    paso();
}
