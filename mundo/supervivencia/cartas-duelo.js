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
// Revancha (PR 4): al terminar, cada uno la pide con un `invitar` directo ({ revancha: 1 }, fuera del orden de la
// actividad, así no chocan si la piden a la vez); con las dos pedidas el retador manda otro `ini` en la misma actividad.
// Mirar desde afuera (PR 4): quien no juega pide `ver` y recibe el registro (`ini` + jugadas); arma la partida
// canónica y la sigue con los eventos que el anfitrión ya reparte a toda la sala (mirar no suma mensajes por jugada).
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
const r2 = n => Math.round(n * 100) / 100, r3 = n => Math.round(n * 1000) / 1000;
// Mesa colocada en el mundo (duelo 2J, PR 3): m = { x, y, z, g } (centro, suelo y ángulo de la mesa). Se juega en ella,
// con el retador en el lado largo más cercano a él (g o g + π); `fija` = la mesa ya está en el mundo (la del duelo no pone otra)
export function lugarEnMesa(m, d0) {
    let g = Number.isFinite(m.g) ? m.g : 0;
    if (d0 && Number.isFinite(d0.x) && (d0.x - m.x) * Math.sin(g) + (d0.z - m.z) * Math.cos(g) < 0) g += Math.PI;
    return { sup: 'mesa', x: r2(m.x), y: r2(m.y), z: r2(m.z), g: r3(Math.atan2(Math.sin(g), Math.cos(g))), fija: 1 };
}
// La mesa colocada más cercana a p = { x, y, z } (en el plano, hasta `max` metros y `desnivel` de altura); o null
export function mesaCercana(mesas, p, max, desnivel = 1.5) {
    let mejor = null, dm = max;
    for (const m of mesas) {
        const d = Math.hypot(m.x - p.x, m.z - p.z);
        if (d <= dm && Math.abs(m.y - p.y) <= desnivel) { mejor = m; dm = d; }
    }
    return mejor;
}
// Dónde se juega: en el medio de los dos, a la altura del retador; g (radianes) deja al retador (lado 0)
// mirando al invitado. d0/d1 = lo que mandó cada uno al entrar ({ x, y, z, sup, mesa }); sin posiciones, null.
// Si alguno está junto a una mesa colocada (`mesa`, la del retador primero), se juega en ella
export function lugarDuelo(d0, d1) {
    if (!d0 || !d1 || !Number.isFinite(d0.x) || !Number.isFinite(d1.x)) return null;
    const m = [d0.mesa, d1.mesa].find(m => m && Number.isFinite(m.x) && Number.isFinite(m.z));
    if (m) return lugarEnMesa(m, d0);
    const r = r2;
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

// Controlador de un jugador. acts = crearActividades(...); propio() = { mazo, extra, sup, x, y, z, mesa } (mazoParaPartida,
// la superficie que llevas, dónde estás y la mesa colocada junto a ti, si hay); al = { invitacion(m), espera(rival), inicio(e, rival, lugar, lado),
// jugada(a), fin(motivo), rechazo(motivo), revancha('pide' | 'fue'), mirar(e, jug, lugar), mirarJugada(ev, a), mirarFin() }
// (la interfaz; lado 0 = el retador, 1 = el invitado; inicio trae un 5.º argumento true en la revancha)
export function crearDuelo({ acts, yo, reglas = () => DUELO, propio, al = {}, azar = Math.random }) {
    let fase = 'libre', rival = null, idx = 0, e = null, vistos = 0, timer = null, id = null; // id: la actividad del duelo
    let otra = { yo: false, el: false };  // revancha pedida por mí / por el rival
    let mira = null;                      // duelo ajeno que miro: { id, e (canónica), jug, lugar, sig (siguiente s), listo }
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
    function iniciar(ini, jug, revancha = false) {
        idx = jug.indexOf(yo);
        rival = jug[1 - idx];
        const c = partidaDuelo(ini);
        e = idx === 0 ? c : espejo(c);
        vistos = 0; fase = 'jugando'; otra = { yo: false, el: false };
        avisar('inicio', e, rival, ini.lugar || null, idx, revancha);
    }
    // Con la revancha pedida por los dos, el retador arma la nueva partida (mismos mazos y lugar: los datos de la actividad)
    function revisarOtra() {
        if (!otra.yo || !otra.el || idx !== 0 || fase !== 'jugando') return;
        const act = acts.actividad(id);
        if (!act || act.jug.length < 2 || act.jug[0] !== yo) return;
        const ini = armarInicio(act.d[act.jug[0]], act.d[act.jug[1]], reglas(), azar);
        acts.evento(id, ini);
        iniciar(ini, act.jug, true);
    }
    const terminada = () => !!(e && e.ganador !== null);

    // ---------- Mirar un duelo ajeno ----------
    // Arma la partida canónica desde el último `ini` del registro y le aplica las jugadas que vienen después
    function armarVista(act, log) {
        let k = -1;
        for (let i = log.length - 1; i >= 0; i--) if (log[i].d && log[i].d.t === 'ini') { k = i; break; }
        mira.jug = act.jug.slice(); mira.listo = true; mira.sig = act.s;
        if (k < 0) { mira.e = null; return; } // aún no empieza (o el registro ya no trae el inicio): espera el próximo `ini`
        const c = partidaDuelo(log[k].d);
        for (const x of log.slice(k + 1)) {
            if (!x.d || x.d.t !== 'a') continue;
            if (!esLegal(c, x.d.a)) { mira.e = null; return; }
            aplicar(c, x.d.a);
        }
        mira.e = c; mira.lugar = log[k].d.lugar || null;
        avisar('mirar', c, mira.jug, mira.lugar);
    }
    function verEvento(ev, act) {
        if (!mira.listo || ev.s < mira.sig) return; // lo de antes ya venía en el registro
        mira.sig = ev.s + 1;
        if (ev.d.t === 'ini') {
            mira.e = partidaDuelo(ev.d); mira.lugar = ev.d.lugar || null; if (act) mira.jug = act.jug.slice();
            avisar('mirar', mira.e, mira.jug, mira.lugar);
            return;
        }
        if (ev.d.t !== 'a' || !mira.e) return;
        // Algo no calza (me perdí un evento): pido el registro de nuevo
        if (!esLegal(mira.e, ev.d.a)) { mira.listo = false; acts.ver(mira.id); return; }
        const r = aplicar(mira.e, ev.d.a);
        if (ev.d.h && ev.d.h !== huella(mira.e)) { mira.listo = false; acts.ver(mira.id); return; }
        avisar('mirarJugada', r, ev.d.a);
    }
    function cortarMira() { if (!mira) return; mira = null; avisar('mirarFin'); }

    acts.escuchar(TIPO_DUELO, {
        invitacion(m) {
            if (m.d && m.d.revancha) { // el rival pide la revancha (no es un reto nuevo)
                if (fase === 'jugando' && m.id === id && m.de === rival && terminada() && !otra.el) { otra.el = true; avisar('revancha', 'pide'); revisarOtra(); }
                return;
            }
            if (fase === 'libre') avisar('invitacion', m); else acts.responder(m.de, m.id, TIPO_DUELO, false, 'ocupado');
        },
        registro(act, log, cual) {
            if (!mira || cual !== mira.id) return;
            if (!act || act.jug.length < 2) { cortarMira(); return; }
            armarVista(act, log);
        },
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
            if (mira && cual === mira.id && (!act || act.jug.length < 2)) { cortarMira(); return; }
            if (cual !== id) return;
            const jug = act ? act.jug : [];
            if (fase === 'jugando' && !jug.includes(rival)) { const fin = terminada(); terminar('abandono'); if (fin) avisar('revancha', 'fue'); return; }
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
            if (!ev.d) return;
            if (mira && cual === mira.id) { verEvento(ev, act); return; }
            if (cual !== id) return;
            if (ev.d.t === 'ini' && fase === 'aceptando' && ev.de === rival && act && act.jug.includes(yo)) { iniciar(ev.d, act.jug); return; }
            // La revancha: el retador mandó otro `ini` en la misma actividad
            if (ev.d.t === 'ini' && fase === 'jugando' && terminada() && otra.yo && ev.de === rival && act && act.jug.includes(yo)) { iniciar(ev.d, act.jug, true); return; }
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
        get revanchaPedida() { return { ...otra }; },
        get mirando() { return mira ? mira.id : null; },
        get vista() { return mira && mira.e ? { e: mira.e, jug: mira.jug.slice(), lugar: mira.lugar } : null; },
        // Duelos de la sala que se pueden mirar (con los dos dentro, y que no son el mío)
        duelosAbiertos() { return acts.lista.filter(a => a.k === TIPO_DUELO && a.jug.length === 2 && !a.jug.includes(yo)); },
        // Mirar un duelo ajeno: pido el registro (la vista llega por al.mirar)
        mirar(cual) {
            if (!cual || (fase !== 'libre' && cual === id)) return false;
            if (mira && mira.id === cual) return true;
            cortarMira();
            mira = { id: cual, e: null, jug: [], lugar: null, sig: 0, listo: false };
            acts.ver(cual);
            return true;
        },
        dejarDeMirar() { cortarMira(); },
        // Pedir la revancha al terminar (los dos siguen en la actividad); false si ya no se puede
        revancha() {
            if (fase !== 'jugando' || !terminada() || !rival) return false;
            if (!otra.yo) { otra.yo = true; acts.invitar(rival, id, TIPO_DUELO, { revancha: 1 }); }
            revisarOtra();
            return true;
        },
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
        rivalSalio(id) { if (fase === 'jugando' && id === rival) { const fin = terminada(); terminar('abandono'); if (fin) avisar('revancha', 'fue'); } else if ((fase === 'retando' || fase === 'aceptando') && id === rival) { terminar(); avisar('rechazo', 'salio'); } }
    };
}
