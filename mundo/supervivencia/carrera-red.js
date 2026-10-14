// =========================================================
// VENJY · Supervivencia · Carrera de gatas con varios jugadores (7h-1), sobre la base común actividades-red.js
// Una actividad 'carrera@living' (cupo 8, como la sala). Quien la abre desde el panel de Lona entra a la sala de
// espera: elige gata (cada una la maneja uno solo) o se pone a mirar. El primero de la lista es el **líder**: elige
// la dificultad de la IA y larga; manda `ini` (qué gata maneja cada uno, parrilla, dificultad y semilla) y lo deja
// también en sus datos (`d.ini`), así quien entra tarde lo lee del estado sin pedir el registro.
// En carrera:
//   - cada corredor simula su gata y manda su estado ~12 veces por segundo (ráfaga `e`);
//   - el líder simula la IA (y las gatas de quien se va) y es el dueño de los objetos: manda las gatas de la IA y
//     los objetos tirados ~10 veces por segundo (ráfaga `L`) y cada caja, uso y golpe al momento (ráfaga `o`);
//   - quien aprieta su objeto avisa al líder (ráfaga `u`) y lo usa allá;
//   - al cruzar la meta, evento `fin` con el tiempo (cada uno mide el suyo desde su cuenta);
//   - el público (los que miran) alienta con `h`.
// Las ráfagas van solo a los de la carrera (`rafaga(id, d, true)`): la carrera es una sala aparte y el resto de la
// sala no la ve ni gasta mensajes en ella.
// Si se va el líder, el siguiente de la lista toma la IA y los objetos (`al.lider(true)`); si se va un corredor, su
// gata sigue con la IA del líder (`al.abandono(k)`).
// Sin DOM: se prueba en Node (mundo/tests/carrera.mjs).
// =========================================================
export const TIPO_CARRERA = 'carrera';
export const ID_CARRERA = 'carrera@living';
export const CUPO_CARRERA = 8;

// Reparte las gatas: cada corredor la que eligió (si dos eligen la misma, se la queda el primero de la lista y el
// otro recibe la primera libre); con más corredores que gatas, los que sobran miran. Los que siguen en la carrera
// anterior (`fuera`: aún no vuelven a la sala de espera) no corren esta. Parrilla: la IA adelante y los
// jugadores atrás, en el orden de la lista (como en los karts). Puro: lo usan el líder y la prueba.
export function repartirGatas(jug, datos, claves) {
    const gatas = {}, usadas = new Set();
    const corredores = jug.filter(id => !(datos[id] && (datos[id].mira || datos[id].fuera)));
    const pendientes = [];
    for (const id of corredores) {
        const k = claves.indexOf(datos[id] && datos[id].gata);
        if (k >= 0 && !usadas.has(k)) { gatas[id] = k; usadas.add(k); } else pendientes.push(id);
    }
    for (const id of pendientes) {
        const k = claves.findIndex((_, i) => !usadas.has(i));
        if (k < 0) break; // no quedan gatas: mira
        gatas[id] = k; usadas.add(k);
    }
    const humanas = jug.filter(id => id in gatas).map(id => gatas[id]);
    const orden = claves.map((_, i) => i).filter(i => !usadas.has(i)).concat(humanas);
    return { gatas, orden };
}

// al = { sala(act), inicio(ini, mia, soyLider), estado(k, pack), lider(soy), paquete(m), objetos(evs), usar(k, atras, objeto),
//        meta(k, tf, quien), hurra(quien, k), abandono(k), rechazo(motivo), cerrada() }
//   mia = índice de mi gata (null si miro). paquete(m) = la ráfaga del líder ({ t, g: { k: pack }, w }).
export function crearCarreraRed({ acts, yo, al = {}, azar = Math.random }) {
    let fase = 'libre', ini = null, lider = null, unido = false, visto = null; // fase: libre | sala | corre
    const avisar = (que, ...a) => { if (al[que]) al[que](...a); };
    const act = () => acts.actividad(ID_CARRERA);
    const dueno = k => { if (!ini) return null; for (const id in ini.gatas) if (ini.gatas[id] === k) return id; return null; };
    const misDatos = () => { const a = act(); return (a && a.d[yo]) || {}; };
    // Empieza la carrera (o la miro): quedo `fuera` de la sala de espera hasta volver (el líder ya lo dijo al largar)
    function empezar(i, avisarDatos = true) {
        ini = { ...i, gatas: { ...i.gatas } }; fase = 'corre'; // (copia: los abandonos se quitan de aquí)
        const a = act(); lider = a ? a.jug[0] : null;
        if (avisarDatos) acts.unir(ID_CARRERA, TIPO_CARRERA, CUPO_CARRERA, { ...misDatos(), fuera: 1 });
        avisar('inicio', ini, ini.gatas[yo] ?? null, lider === yo);
    }

    acts.escuchar(TIPO_CARRERA, {
        estado(a, antes, cual) {
            if (cual !== ID_CARRERA) return;
            if (!a) { if (fase !== 'libre') { fase = 'libre'; ini = null; } avisar('cerrada'); return; }
            if (fase === 'libre') return;
            if (!a.jug.includes(yo)) { if (unido) { fase = 'libre'; ini = null; avisar('rechazo', 'cerrada'); } return; } // (antes de verme: un estado que ya venía)
            unido = true;
            const nuevo = a.jug[0];
            if (fase === 'corre' && ini) {
                // Corredores que se fueron: su gata queda para la IA del líder
                for (const id of Object.keys(ini.gatas)) if (!a.jug.includes(id)) { const k = ini.gatas[id]; delete ini.gatas[id]; avisar('abandono', k); }
                if (nuevo !== lider) { lider = nuevo; avisar('lider', lider === yo); }
            }
            lider = nuevo;
            // Llegué tarde (o volví a la sala de espera) y el líder ya largó: miro su carrera
            const di = a.d[nuevo] && a.d[nuevo].ini;
            if (fase === 'sala' && di && (!ini || di.n !== ini.n) && di.n !== visto) { empezar(di); return; }
            avisar('sala', a);
        },
        no(m) {
            if (m.id !== ID_CARRERA || fase !== 'sala') return;
            fase = 'libre'; avisar('rechazo', m.motivo);
        },
        evento(ev, a, cual) {
            if (cual !== ID_CARRERA || !ev.d) return;
            const d = ev.d;
            if (d.t === 'ini' && fase === 'sala' && ev.de !== yo) { empezar(d); return; }
            if (d.t === 'fin' && fase === 'corre' && ini && d.n === ini.n && ev.de !== yo) {
                const k = ini.gatas[ev.de]; if (k !== undefined) avisar('meta', k, d.tf, ev.de);
            }
        },
        rafaga(r, cual) {
            if (cual !== ID_CARRERA || !r.d || fase !== 'corre' || !ini) return;
            const d = r.d;
            if (d.n !== undefined && d.n !== ini.n) return; // de una carrera anterior
            if (d.t === 'e') { const k = ini.gatas[r.de]; if (k !== undefined) avisar('estado', k, d); }
            else if (d.t === 'L') { if (r.de === lider) avisar('paquete', d); }
            else if (d.t === 'o') { if (r.de === lider) avisar('objetos', d.e || []); }
            else if (d.t === 'u') { const k = ini.gatas[r.de]; if (lider === yo && k !== undefined) avisar('usar', k, !!d.a, d.o); }
            else if (d.t === 'h') avisar('hurra', r.de, d.g);
        }
    });

    const rf = d => acts.rafaga(ID_CARRERA, { ...d, n: ini ? ini.n : 0 }, true);
    return {
        get fase() { return fase; },
        get ini() { return ini; },
        get soyLider() { const a = act(); return !!(a && a.jug[0] === yo); },
        get mia() { return ini && yo in ini.gatas ? ini.gatas[yo] : null; },
        dueno,
        // La carrera abierta (sala de espera o corriendo), o null
        abierta: () => act(),
        // Entrar a la sala de espera con la gata que quiero (o a mirar)
        entrar(gata, mira = false) {
            if (fase !== 'libre') return false;
            const a = act();
            if (a && a.jug.length >= a.cupo) { avisar('rechazo', 'llena'); return false; }
            fase = 'sala'; ini = null; unido = false; visto = null;
            acts.unir(ID_CARRERA, TIPO_CARRERA, CUPO_CARRERA, { gata, mira: mira ? 1 : 0 });
            return true;
        },
        // En la sala de espera: cambiar de gata o pasar a mirar (los datos se reemplazan enteros)
        elegir(gata, mira = false) {
            if (fase !== 'sala') return;
            const d = misDatos();
            acts.unir(ID_CARRERA, TIPO_CARRERA, CUPO_CARRERA, { ...d, gata, mira: mira ? 1 : 0 });
        },
        // Líder: larga la carrera. claves = R.gatas (clave de cada una); dificultad de la IA
        largar(claves, dificultad) {
            const a = act();
            if (fase !== 'sala' || !a || a.jug[0] !== yo) return null;
            const { gatas, orden } = repartirGatas(a.jug, a.d, claves);
            // n: número de esta carrera (al azar: distinto aunque cambie el líder)
            const i = { t: 'ini', n: 1 + ((azar() * 1e9) | 0), gatas, orden, dificultad, semilla: (azar() * 1e9) | 0 };
            acts.unir(ID_CARRERA, TIPO_CARRERA, CUPO_CARRERA, { ...misDatos(), ini: i, fuera: 1 });
            acts.eventoLibre(ID_CARRERA, i);
            empezar(i, false);
            return i;
        },
        // Volver a la sala de espera tras el final (sigo en la actividad); no vuelve a entrar a la misma carrera.
        // El líder borra su `ini`: quien llegue ahora espera la próxima
        aLaSala() {
            if (fase !== 'corre') return;
            visto = ini ? ini.n : null;
            fase = 'sala'; ini = null;
            const d = { ...misDatos(), fuera: 0 };
            delete d.ini;
            acts.unir(ID_CARRERA, TIPO_CARRERA, CUPO_CARRERA, d);
        },
        // Mientras corro: mi gata (empacar de carrera-modelo.js) y mi llegada
        estado(pack) { if (fase === 'corre' && this.mia !== null) rf({ ...pack, t: 'e' }); },
        meta(tf) { if (fase === 'corre' && this.mia !== null) acts.eventoLibre(ID_CARRERA, { t: 'fin', n: ini.n, tf: Math.round(tf * 100) / 100 }); },
        // Líder: la IA y los objetos tirados (g = { k: pack }, w = empacarObjetos) y los sucesos de los objetos
        paquete(g, w, tc) { if (fase === 'corre') rf({ t: 'L', g, w, tc: Math.round(tc * 100) / 100 }); },
        objetos(evs) { if (fase === 'corre' && evs.length) rf({ t: 'o', e: evs }); },
        // Corredor: usa su objeto (atras = con el freno); el líder lo lanza allá
        usar(atras, o) { if (fase === 'corre') rf({ t: 'u', a: atras ? 1 : 0, o }); },
        // Alentar a una gata (sobre todo el público)
        hurra(k) { if (fase === 'corre') rf({ t: 'h', g: k }); },
        salir() {
            if (fase === 'libre') return;
            fase = 'libre'; ini = null; unido = false;
            acts.salir(ID_CARRERA);
        }
    };
}
