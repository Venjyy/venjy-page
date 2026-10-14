// =========================================================
// VENJY · Supervivencia · Duelo de cartas entre 2 jugadores (etapa A, duelo 2J, PR 1 y 2)
// Primer uso de la base común de actividades (actividades-red.js): cada duelo es la actividad
// 'duelo@<retador>' con cupo 2. Quien reta (con el MAZO en la mano, apuntando al otro) entra con su mazo,
// su superficie y dónde está, e invita al otro; el invitado entra con lo suyo. Con los dos dentro, el
// retador (jugador 0 de la partida «canónica») manda el evento `ini` (semilla, quién empieza, mazos, manos
// y el lugar: entre los dos, sobre la mejor superficie de alguno) y cada uno arma la misma partida.
// Cada jugada viaja como evento `a` (la acción de cartas.js + la huella del estado después): el motor es
// puro y determinista, así que los dos (y quien mire) quedan iguales aplicando lo mismo en el mismo orden.
//
// Espejo: las acciones de cartas.js son relativas al jugador de turno (m = tu mano, z = tu zona, obj = la
// del rival), así que el invitado juega sobre la partida espejada (él es el jugador 0 de su mesa) y aplica
// las mismas acciones. La mesa no cambia: siempre eres el 0. La huella se toma de la canónica.
// Sin DOM: se prueba en Node (mundo/tests/cartas-duelo.mjs).
// =========================================================
import { nuevaPartida, aplicar, esLegal } from './cartas.js';
import { huella } from './actividades-red.js';

export const TIPO_DUELO = 'duelo';
export const idDuelo = retador => `duelo@${retador}`;
// Valores base (Estudio → Mesa → «Duelo entre jugadores»): vida y mano inicial de cada uno (más las
// cartas de más del mazo al azar); espera = segundos que se espera la respuesta del invitado
export const DUELO = { vida: 4000, mano: 4, espera: 30 };
export const reglasDuelo = datos => ({ ...DUELO, ...((datos && datos.duelo) || {}) });
// Aviso del reto en el HUD de quien lo recibe ({x} = quien reta)
const t = (es, en) => ({ es, en });
export const TXT_RETO = {
    titulo: t('{x} te reta a un duelo de cartas', '{x} challenges you to a card duel'),
    si: t('Aceptar (Y)', 'Accept (Y)'),
    no: t('No (N)', 'No (N)'),
    faltaMazo: t('Necesitas un MAZO para jugar el duelo', 'You need a DECK to play the duel'),
    ocupado: t('Ahora no puedes: termina lo que estás haciendo', 'Not now: finish what you are doing'),
    sinTuto: t('Primero juega el tutorial con Lucho', 'Play the tutorial with Lucho first'),
    lejos: t('Acércate más a {x} para retarlo', 'Get closer to {x} to challenge them'),
    esperando: t('Esperando a que {x} acepte el duelo…', 'Waiting for {x} to accept the duel…'),
    cancelar: t('Cancelar (N)', 'Cancel (N)'),
    rechazo: {
        no: t('{x} no quiso jugar.', '{x} declined.'),
        tiempo: t('{x} no respondió.', '{x} did not answer.'),
        sinTuto: t('{x} todavía no juega el tutorial con Lucho.', '{x} has not played the tutorial with Lucho yet.'),
        ocupado: t('{x} está ocupado.', '{x} is busy.'),
        faltaMazo: t('{x} no tiene un MAZO.', '{x} has no DECK.'),
        lejos: t('{x} está muy lejos.', '{x} is too far away.'),
        llena: t('{x} ya está jugando.', '{x} is already playing.'),
        otra: t('Ya estás en otra actividad.', 'You are already in another activity.'),
        salio: t('{x} salió de la sala.', '{x} left the room.'),
        cancelado: t('{x} canceló el reto.', '{x} called off the challenge.'),
        cerrada: t('El duelo ya no está.', 'The duel is gone.')
    }
};

// Superficies de peor a mejor (SUPERFICIES de cartas-mesa-modelo.js): se juega en la mejor de los dos
const RANGO = { piso: 0, tronco: 1, mesa: 2 };
export const mejorSuperficie = (a, b) => ((RANGO[b] ?? -1) > (RANGO[a] ?? -1) ? b : a) || 'piso';
// Dónde se juega: en el medio de los dos, a la altura del retador; g (radianes) deja al retador (lado 0)
// mirando al invitado. d0/d1 = lo que mandó cada uno al entrar ({ x, y, z, sup }); sin posiciones, null
export function lugarDuelo(d0, d1) {
    if (!d0 || !d1 || !Number.isFinite(d0.x) || !Number.isFinite(d1.x)) return null;
    const r = n => Math.round(n * 100) / 100;
    const dx = d0.x - d1.x, dz = d0.z - d1.z;
    return {
        sup: mejorSuperficie(d0.sup, d1.sup),
        x: r((d0.x + d1.x) / 2), y: r(d0.y), z: r((d0.z + d1.z) / 2),
        g: Math.round((dx || dz ? Math.atan2(dx, dz) : 0) * 1000) / 1000
    };
}

// La misma partida vista desde el otro lado (copia nueva; el azar `r` y el turno `n` se comparten)
export function espejo(e) {
    const c = JSON.parse(JSON.stringify(e));
    c.jug.reverse();
    c.turno = 1 - c.turno;
    if (c.ganador === 0 || c.ganador === 1) c.ganador = 1 - c.ganador;
    return c;
}

// Partida canónica (jugador 0 = el retador) a partir del evento `ini`
export function partidaDuelo(ini) {
    return nuevaPartida({ mazos: ini.mazos, semilla: ini.semilla, empieza: ini.empieza, vidas: ini.vidas, mano: ini.manos });
}
// El evento `ini` que manda el retador: d0/d1 = { mazo, extra } de cada uno
export function armarInicio(d0, d1, R, azar = Math.random) {
    return {
        t: 'ini',
        semilla: (azar() * 1e9) | 0,
        empieza: azar() < 0.5 ? 0 : 1,
        mazos: [d0.mazo.slice(), d1.mazo.slice()],
        manos: [R.mano + (d0.extra | 0), R.mano + (d1.extra | 0)],
        vidas: [R.vida, R.vida],
        lugar: lugarDuelo(d0, d1)
    };
}

// Controlador de un jugador. acts = crearActividades(...); propio() = { mazo, extra, sup, x, y, z } (mazoParaPartida,
// la superficie que llevas y dónde estás); al = { invitacion(m), espera(rival), inicio(e, rival, lugar, lado),
// jugada(a), fin(motivo), rechazo(motivo) } (la interfaz; lado 0 = el retador, 1 = el invitado)
export function crearDuelo({ acts, yo, reglas = () => DUELO, propio, al = {}, azar = Math.random }) {
    let fase = 'libre', rival = null, idx = 0, e = null, vistos = 0, timer = null, id = null; // id: la actividad del duelo
    const avisar = (que, ...a) => { if (al[que]) al[que](...a); };
    const canonica = () => (idx === 0 ? e : espejo(e));
    const limpiarTimer = () => { if (timer) { clearTimeout(timer); timer = null; } };
    function terminar(motivo) {
        const habia = fase;
        limpiarTimer();
        fase = 'libre'; // antes de salir: el anfitrión se procesa a sí mismo al tiro (estado → aquí de nuevo)
        if (habia !== 'libre' && id) acts.salir(id);
        // Una partida ya terminada no tiene «fin» de abandono: salir después del cartel es normal
        if (habia === 'jugando' && motivo && e && e.ganador === null) avisar('fin', motivo);
    }
    function iniciar(ini, jug) {
        idx = jug.indexOf(yo);
        rival = jug[1 - idx];
        const c = partidaDuelo(ini);
        e = idx === 0 ? c : espejo(c);
        vistos = 0; fase = 'jugando';
        avisar('inicio', e, rival, ini.lugar || null, idx);
    }

    acts.escuchar(TIPO_DUELO, {
        invitacion(m) { if (fase === 'libre') avisar('invitacion', m); else acts.responder(m.de, m.id, TIPO_DUELO, false, 'ocupado'); },
        resp(m) {
            if (fase !== 'retando' || m.de !== rival || m.id !== id) return;
            if (!m.si) { terminar(); avisar('rechazo', m.motivo || 'no'); }
        },
        no(m) {
            if (m.id !== id) return;
            if (fase === 'retando' || fase === 'aceptando') { terminar(); avisar('rechazo', m.motivo); }
            else if (fase === 'jugando') terminar('desincronizado'); // un evento mío fuera de orden o de una actividad cerrada
        },
        estado(act, antes, cual) {
            if (cual !== id) return;
            const jug = act ? act.jug : [];
            if (fase === 'jugando' && !jug.includes(rival)) { terminar('abandono'); return; }
            // El retador se fue (canceló o se le acabó la espera) antes de empezar
            if (fase === 'aceptando' && (act ? act.jug.includes(yo) && !jug.includes(rival) : antes && antes.jug.includes(yo))) { terminar(); avisar('rechazo', 'cancelado'); return; }
            // Los dos dentro: el retador arma la partida
            if (fase === 'retando' && act && jug.length === 2 && jug[0] === yo && jug.includes(rival)) {
                limpiarTimer();
                const ini = armarInicio(act.d[jug[0]], act.d[jug[1]], reglas(), azar);
                acts.evento(id, ini);
                iniciar(ini, jug);
            }
        },
        evento(ev, act, cual) {
            if (cual !== id || !ev.d) return;
            if (ev.d.t === 'ini' && fase === 'aceptando' && ev.de === rival && act && act.jug.includes(yo)) { iniciar(ev.d, act.jug); return; }
            if (fase !== 'jugando' || ev.de === yo || ev.d.t !== 'a') return;
            if (ev.de !== rival) return;
            const a = ev.d.a;
            if (e.turno !== 1 || !esLegal(e, a)) { terminar('desincronizado'); return; }
            avisar('jugada', a, ev.d.h);
        }
    });

    return {
        get fase() { return fase; },
        get rival() { return rival; },
        get estado() { return e; },
        get jugadas() { return vistos; },
        // Retar a otro jugador de la sala: entro a mi duelo (duelo@yo) con mi mazo y lo invito
        retar(para, d = {}) {
            if (fase !== 'libre' || !para || para === yo) return false;
            fase = 'retando'; rival = para; id = idDuelo(yo);
            acts.unir(id, TIPO_DUELO, 2, propio());
            acts.invitar(para, id, TIPO_DUELO, d);
            avisar('espera', para);
            const s = reglas().espera;
            if (s > 0) timer = setTimeout(() => { if (fase === 'retando') { terminar(); avisar('rechazo', 'tiempo'); } }, s * 1000);
            return true;
        },
        aceptar(inv) {
            if (fase !== 'libre') return false;
            fase = 'aceptando'; rival = inv.de; id = inv.id;
            acts.unir(id, TIPO_DUELO, 2, propio());
            acts.responder(inv.de, inv.id, TIPO_DUELO, true);
            return true;
        },
        // motivo (opcional): una clave de TXT_RETO.rechazo ('sinTuto', 'ocupado', 'faltaMazo', 'lejos')
        rechazar(inv, motivo) { acts.responder(inv.de, inv.id, TIPO_DUELO, false, motivo); },
        // Mi jugada (soy el 0 de mi mesa): la aplico y la mando con la huella
        jugar(a) {
            if (fase !== 'jugando' || e.turno !== 0) return null;
            const ev = aplicar(e, a);
            vistos++;
            acts.evento(id, { t: 'a', a, h: huella(canonica()) });
            return ev;
        },
        // Jugada del rival (la avisó `al.jugada`): la aplico y comparo la huella
        aplicarRival(a, h) {
            if (fase !== 'jugando' || e.turno !== 1 || !esLegal(e, a)) return null;
            const ev = aplicar(e, a);
            vistos++;
            if (h && h !== huella(canonica())) { terminar('desincronizado'); return ev; }
            return ev;
        },
        // Salir (cerrar la mesa, cancelar el reto, la partida terminó)
        salir() { terminar(); rival = null; e = null; },
        // El rival se fue de la sala (coop: alSalir); el anfitrión también lo saca de la actividad
        rivalSalio(id) { if (fase === 'jugando' && id === rival) terminar('abandono'); else if ((fase === 'retando' || fase === 'aceptando') && id === rival) { terminar(); avisar('rechazo', 'salio'); } }
    };
}
