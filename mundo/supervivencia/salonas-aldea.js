// =========================================================
// VENJY · Supervivencia · Salonas en la aldea: sus canciones del juego «La Gira» suenan junto al escenario
// De noche (y en el concierto, 7h-3, cuando exista) rotan las canciones de salonas.json → juego.aldea.canciones, en
// vez de los 3 riffs de criaturas/bajo.js (que sigue sonando de día y en el modo creativo). Se carga con import() la
// primera vez que cae la noche cerca del escenario, así no pesa en la carga. Ajustes en la pestaña Salonas
// (juego → aldea): activa, soloNoche, canciones, vol, distancia, pausaSeg, tempo.
// =========================================================
import { cuandoHayaAudio } from '../criaturas/cuerpo.js';
import { I } from './musica-instrumentos.js';
import { crearReproductorCancion } from './musica-motor.js';
import { cargarMusica, cancionMusica, instrumentosPropios } from './musica-datos.js';
import { ajustesDe, aldeaActiva, volumenAldea, siguienteCancion } from './salonas-reloj.js';

const COLA = 2.5; // segundos de cola tras la última nota antes de la pausa


// ctx: { datos() → salonas.json, posicion() → {x, z} del escenario, jugador() → {x, z}, esNoche(), concierto?(), ocupado() }
export function crearAldeaSalonas(ctx) {
    let au = null, rep = null, repBajo = null, reloj = null, n = 0, cancionActual = null, finT = 0, pausaHasta = 0, sonando = false;
    cuandoHayaAudio(a => {
        const salida = a.ctx.createGain(); salida.gain.value = 0; salida.connect(a.master);
        au = { ctx: a.ctx, salida };
    });
    let listaMusica = false;
    cargarMusica().then(() => { listaMusica = true; });

    const ajustes = () => ajustesDe(ctx.datos() && ctx.datos().juego).aldea;

    function parar() {
        if (reloj) { clearInterval(reloj); reloj = null; }
        if (rep) { rep.parar(); repBajo.parar(); }
        rep = repBajo = null; sonando = false; cancionActual = null;
        if (au) au.salida.gain.setTargetAtTime(0, au.ctx.currentTime, 0.1);
    }
    function empezar(A) {
        const clave = siguienteCancion(A, n++), c = cancionMusica(clave);
        if (!c) return false; // (borrador o clave que no existe: se salta)
        const x = au.ctx;
        if (x.state !== 'running') x.resume();
        const mudo = conBajo => ({ ...c, capas: (c.capas || []).map(p => (!!p.bajo === conBajo ? p : { ...p, mudo: true })) });
        rep = crearReproductorCancion(); repBajo = crearReproductorCancion();
        const tempo = A.tempo || 1;
        const mapa = rep.empezar(x, mudo(false), { tempo, retraso: 0.3 });
        repBajo.empezar(x, mudo(true), { mapa, tempo, retraso: rep.inicio - x.currentTime });
        cancionActual = c; sonando = true; finT = 0;
        reloj = setInterval(() => {
            if (!rep) return;
            const salida = { I, ctx: au.ctx, propios: instrumentosPropios(), salida: au.salida, adelanto: 0.3 };
            const a = rep.avanzar(salida), b = repBajo.avanzar(salida);
            if (!a && !b && !finT) finT = au.ctx.currentTime + COLA;
        }, 25);
        return true;
    }

    return {
        // Cada cuadro. Devuelve true si el bajo de los riffs debe callarse (es de noche, o concierto, y la aldea está activa)
        actualizar() {
            const A = ajustes();
            const quiere = aldeaActiva(A, { esNoche: ctx.esNoche(), concierto: ctx.concierto ? ctx.concierto() : false });
            const p = ctx.posicion(), j = ctx.jugador();
            const d = p && j ? Math.hypot(p.x - j.x, p.z - j.z) : 1e9;
            if (!quiere || ctx.ocupado() || !au || !listaMusica || d > A.distancia + 6) {
                if (sonando) parar();
                return quiere && !ctx.ocupado();
            }
            const t = au.ctx.currentTime;
            if (sonando && finT && t > finT) { parar(); pausaHasta = t + A.pausaSeg; }
            if (!sonando && t >= pausaHasta) {
                // si ninguna canción de la lista sirve, no se reintenta en cada cuadro
                if (!empezar(A)) pausaHasta = t + A.pausaSeg;
            }
            if (sonando) au.salida.gain.setTargetAtTime(volumenAldea(A, d) * (cancionActual.vol || 1), t, 0.3);
            return true;
        },
        get sonando() { return sonando; },
        get cancion() { return sonando ? cancionActual : null; },
        parar
    };
}
