// =========================================================
// VENJY · Supervivencia · Carrera de gatas entre 2 jugadores (7h-1), sobre la base común actividades-red.js
// Una sola pista (la Gatera): la actividad 'carrera@gatera' con cupo 2. Quien abre la carrera desde el panel de
// Lona elige gata y queda esperando rival; el siguiente que la abre se lleva la otra gata y empieza. Con los dos
// dentro, el primero manda `ini` (qué gata maneja cada uno) y cada equipo corre la cuenta regresiva al recibirlo.
// Cada corredor es dueño de su gata (la simula en su equipo) y manda su estado unas 10 veces por segundo como
// ráfaga (`rafaga`: el anfitrión la reparte a todos y no la guarda); al cruzar la meta manda `fin` con su tiempo
// como evento libre (queda en el registro). Gana el menor tiempo: cada uno lo mide desde su propia cuenta, así
// la demora de la red no favorece a nadie.
// Público: todos en la sala reciben el `ini`, los estados y las llegadas (mirar no suma mensajes); quien llega
// tarde pide `ver` y recibe el inicio y las llegadas del registro. Cualquiera alienta con un `hurra` (ráfaga).
// Sin DOM: se prueba en Node (mundo/tests/carrera.mjs).
// =========================================================
export const TIPO_CARRERA = 'carrera';
export const ID_CARRERA = 'carrera@gatera';
const otraGata = c => (c === 'mila' ? 'gala' : 'mila');

// al = { espera(), inicio(ini, mia, gatas), estado(gata, d), meta(gata, tf, quien), hurra(quien, gata), abandono(gata),
//        rechazo(motivo), mirar(ini, act), cerrada() }
export function crearCarreraRed({ acts, yo, al = {}, azar = Math.random }) {
    let fase = 'libre', mia = null, gatas = null; // gatas: { id: 'mila' | 'gala' } de la carrera en curso (también mirando)
    const avisar = (que, ...a) => { if (al[que]) al[que](...a); };
    const gataDe = id => (gatas && gatas[id]) || null;
    function iniciar(ini) {
        gatas = { ...ini.gatas }; fase = 'corriendo'; mia = gatas[yo];
        avisar('inicio', ini, mia, gatas);
    }
    function terminar() {
        const habia = fase;
        fase = 'libre'; mia = null;
        if (habia !== 'libre') acts.salir(ID_CARRERA);
    }

    acts.escuchar(TIPO_CARRERA, {
        estado(act, antes, cual) {
            if (cual !== ID_CARRERA) return;
            const jug = act ? act.jug : [];
            if (!act) { if (fase === 'libre') { gatas = null; avisar('cerrada'); } return; }
            // Los dos dentro: el primero (quien esperaba) arma la carrera
            if (fase === 'esperando' && jug.length === 2 && jug[0] === yo) {
                const ini = { t: 'ini', gatas: { [jug[0]]: act.d[jug[0]].gata, [jug[1]]: act.d[jug[1]].gata }, semilla: (azar() * 1e9) | 0 };
                acts.eventoLibre(ID_CARRERA, ini);
                iniciar(ini);
                return;
            }
            // El rival se fue (salió de la carrera o de la sala)
            if (fase === 'corriendo' && gatas) {
                const rival = Object.keys(gatas).find(id => id !== yo);
                if (rival && !jug.includes(rival)) avisar('abandono', gatas[rival]);
            }
            if (fase === 'uniendo' && !jug.includes(yo)) { fase = 'libre'; avisar('rechazo', 'cerrada'); }
        },
        no(m) {
            if (m.id !== ID_CARRERA) return;
            if (fase === 'uniendo' || fase === 'esperando') { fase = 'libre'; mia = null; avisar('rechazo', m.motivo); }
        },
        evento(ev, act, cual) {
            if (cual !== ID_CARRERA || !ev.d) return;
            const d = ev.d;
            if (d.t === 'ini') {
                if (fase === 'uniendo' && act && act.jug.includes(yo)) iniciar(d);
                else if (fase === 'libre') { gatas = { ...d.gatas }; avisar('mirar', d, act); }
                return;
            }
            if (d.t === 'fin') avisar('meta', gataDe(ev.de), d.tf, ev.de);
        },
        rafaga(r, cual) {
            if (cual !== ID_CARRERA || !r.d) return;
            if (r.d.t === 'e') { const g = gataDe(r.de); if (g) avisar('estado', g, r.d); }
            else if (r.d.t === 'h') avisar('hurra', r.de, r.d.g);
        },
        registro(act, log, cual) {
            if (cual !== ID_CARRERA || fase !== 'libre') return;
            if (!act || act.jug.length < 2) return;
            let k = -1;
            for (let i = log.length - 1; i >= 0; i--) if (log[i].d && log[i].d.t === 'ini') { k = i; break; }
            if (k < 0) return;
            gatas = { ...log[k].d.gatas };
            avisar('mirar', log[k].d, act);
            for (const x of log.slice(k + 1)) if (x.d && x.d.t === 'fin') avisar('meta', gataDe(x.de), x.d.tf, x.de);
        }
    });

    return {
        get fase() { return fase; },
        get mia() { return mia; },
        get gatas() { return gatas ? { ...gatas } : null; },
        // La carrera abierta con alguien esperando rival (y no soy yo), o null
        esperando() { const a = acts.actividad(ID_CARRERA); return a && a.jug.length === 1 && a.jug[0] !== yo ? a : null; },
        // ¿Se está corriendo una carrera ajena? (para mirarla)
        enCurso() { const a = acts.actividad(ID_CARRERA); return !!(a && a.jug.length === 2 && !a.jug.includes(yo)); },
        // Abrir la carrera desde el panel de Lona: si alguien espera, me uno con la otra gata; si no, espero con la mía
        abrir(pref = 'mila') {
            if (fase !== 'libre') return false;
            const a = acts.actividad(ID_CARRERA);
            if (a && a.jug.length >= 2) { avisar('rechazo', 'llena'); return false; }
            if (a && a.jug.length === 1 && a.jug[0] !== yo) {
                mia = otraGata(a.d[a.jug[0]] && a.d[a.jug[0]].gata);
                fase = 'uniendo';
                acts.unir(ID_CARRERA, TIPO_CARRERA, 2, { gata: mia });
                return true;
            }
            mia = pref === 'gala' ? 'gala' : 'mila';
            fase = 'esperando';
            acts.unir(ID_CARRERA, TIPO_CARRERA, 2, { gata: mia, espera: 1 });
            avisar('espera');
            return true;
        },
        // Mientras corro: mi estado (empacar de carrera-modelo.js) y mi llegada
        estado(d) { if (fase === 'corriendo') acts.rafaga(ID_CARRERA, { ...d, t: 'e' }); },
        meta(tf) { if (fase === 'corriendo') acts.eventoLibre(ID_CARRERA, { t: 'fin', tf: Math.round(tf * 100) / 100 }); },
        // Alentar a una gata (corredor o público)
        hurra(g) { acts.rafaga(ID_CARRERA, { t: 'h', g }); },
        // Público que llega tarde: pide el inicio y las llegadas
        mirar() { if (fase === 'libre') acts.ver(ID_CARRERA); },
        salir() { terminar(); }
    };
}
