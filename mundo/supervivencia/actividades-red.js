// =========================================================
// VENJY · Supervivencia · Actividades compartidas en la sala cooperativa (7g-1, base común)
// Un minijuego o evento (duelo de cartas, fogata, iglú, leña…) es una «actividad» con id propio
// (p. ej. 'duelo@lucho': una por mesa o lugar), un cupo y una lista de participantes. El anfitrión
// de la sala la arbitra (modelo estrella de coop.js); todos los demás, participantes o no, reciben
// su estado, así quien está alrededor sabe quién juega y puede mirarla en vivo.
//
// Todo va en el mensaje `ac` (canal fiable `f`) con `op`:
//   unir    → al anfitrión (para): { id, k, cupo, d } entra (d = datos del participante, p. ej. su mazo)
//   salir   → al anfitrión: { id } sale (también al desconectarse: salioJugador)
//   ev      → al anfitrión: { id, s, d } evento del juego; el anfitrión lo numera y lo reparte a todos
//             (con `libre: 1` no se revisa el orden: juegos en tiempo real donde cada uno manda lo suyo a la vez)
//   rf      → al anfitrión: { id, d } ráfaga (posición de una gata, un hurra…): la reparte a todos como `rafaga`
//             sin numerarla ni guardarla en el registro; la puede mandar cualquiera de la sala (el público alienta);
//             con `p: 1`, solo a los participantes (actividades en su propia escena: la carrera de gatas)
//   estado  ← del anfitrión a todos: { act } (act = null y id si se cerró)
//   evento  ← del anfitrión a todos: { id, s, por, d } (s = orden global de la actividad: 0, 1, 2…; por = autor)
//   no      ← del anfitrión a uno: { id, motivo } ('llena', 'otra', 'cerrada', 'orden')
//   invitar → directo a otro jugador (para): { id, k, d } (lo muestra su interfaz; no pasa por el estado)
//   resp    → directo al que invitó: { id, si, motivo? } (motivo: por qué no; lo lee cada juego)
//   ver     → al anfitrión: pide el estado y el registro de eventos (quien llega tarde o se pone a mirar)
//   registro← del anfitrión a uno: { id, act, log, dichos }
//   rafaga  ← del anfitrión a todos: { id, por, d } (quien la mandó no la recibe de vuelta)
//   di      → al anfitrión: { id, c, d? } un participante dice una frase corta (c = clave de la frase en los datos
//             del juego, d = algo opcional que la completa); el anfitrión la reparte a todos como `dicho`
//             (los que miran desde afuera también la leen)
//   dicho   ← del anfitrión a todos: { id, por, c, d, n } (n = número de frase de la actividad; cada equipo guarda
//             las últimas maxDichos y quien llega tarde las recibe en el `registro`)
// Bases comunes (7g-1) para que varios participen y los demás miren desde afuera:
//  · Asientos: unir con { asiento: n } (o -1 = el primero libre) reserva un lugar de 0 a cupo-1; el anfitrión
//    responde `no` con 'asiento' si ya es de otro. Volver a unir con otro asiento libre te cambia de lugar.
//    act.as = { quien: n }. Al salir (o desconectarse) el asiento queda libre.
//  · Tiempo común: unir con { adelanto: s } (al crearla) hace que el anfitrión fije act.t0 = su hora + s cada
//    vez que entra o sale alguien; cada equipo lo lee con segundos(id) usando el reloj del anfitrión
//    (coop.relojAnfitrion, con el desfase de 7e). Así un guion por tiempo va igual en todos sin mensajes.
//  · Progreso continuo: progreso(id, d) deja un dato chico que coop.js manda a cuestas del `p` a 5 Hz (campo
//    `ax`, sin mensajes nuevos); los demás lo reciben con progresoRemoto y lo leen con progresoDe(id, quien).
//    Sirve para mostrar desde afuera lo que hace cada participante (su barra, su puntaje, si se calienta las manos).
// Quien entra a la sala recibe del anfitrión el `estado` de cada actividad abierta (entroJugador): así sabe qué
// se juega y puede pedir `ver` para mirarla.
// Orden: el anfitrión acepta un `ev` solo si su `s` es el siguiente (si no, `no` con 'orden'); así los
// equipos aplican los mismos eventos en el mismo orden (lockstep). Quien manda aplica su evento al tiro
// (optimista): sirve para juegos por turnos o donde cada uno es dueño de lo suyo.
// Sin DOM ni THREE: se prueba en Node con un transporte falso (mundo/tests/actividades.mjs).
// =========================================================

// enviar(m): manda un `ac` por la sala (m.para = un solo destinatario). El anfitrión no se recibe a sí
// mismo: lo que se manda para él se procesa aquí directo.
// reloj(): hora del anfitrión en ms (coop.relojAnfitrion; null mientras no se sabe el desfase). Sin reloj no hay t0.
// maxDichos: frases que se guardan por actividad; pausaDichos: ms mínimos entre dos frases de un mismo jugador
// (el anfitrión descarta las que lleguen antes).
export function crearActividades({ yo, esAnfitrion, anfitrion, enviar, maxLog = 400, reloj = null, maxDichos = 12, pausaDichos = 1500 }) {
    const acts = new Map();      // id → { id, k, cupo, jug: [ids], d: { id: datos }, s, as?, t0?, adelanto? }  (lo que se sabe)
    const logs = new Map();      // anfitrión: id → [{ s, de, d }] para quien llega tarde
    const dichos = new Map();    // id → [{ n, de, c, d }] las últimas frases (todos las guardan)
    const ultimoDicho = new Map(); // anfitrión: quien → ms de su última frase aceptada
    const progresos = new Map(); // quien → { i: id, d } (lo que llegó en el `ax` de su `p`)
    let progresoMio = null;      // { i: id, d } lo que mando yo a cuestas del `p`
    const horaAnf = () => { const h = typeof reloj === 'function' ? reloj() : null; return Number.isFinite(h) ? h : null; };
    const oyentes = new Map();   // k → { estado(act, antes), evento(ev, act), invitacion(m), resp(m), no(m), registro(act, log) }
    const idAnf = () => (typeof anfitrion === 'function' ? anfitrion() : anfitrion);
    const copia = a => (a ? { ...a, jug: a.jug.slice(), d: { ...a.d }, ...(a.as ? { as: { ...a.as } } : {}) } : null);
    const oyente = k => oyentes.get(k) || oyentes.get('*') || null;
    const avisar = (k, que, ...args) => { const o = oyente(k); if (o && o[que]) o[que](...args); };

    // Manda al anfitrión (si soy yo, lo proceso directo)
    function alAnfitrion(m) {
        if (esAnfitrion) recibir({ ...m, de: yo });
        else enviar({ ...m, para: idAnf() });
    }
    // Anfitrión: manda a todos (y a mí)
    function aTodos(m) {
        enviar(m);
        recibir({ ...m, de: yo });
    }
    function aUno(para, m) {
        if (para === yo) recibir({ ...m, de: yo });
        else enviar({ ...m, para });
    }

    // ---------- Anfitrión: arbitra ----------
    const anf = {
        unir(m) {
            const a = acts.get(m.id);
            const conAsiento = Number.isInteger(m.asiento);
            if (a && a.jug.includes(m.de)) {
                let cambio = false;
                if (conAsiento && a.as && m.asiento >= 0 && m.asiento !== a.as[m.de]) {
                    if (!asientoLibre(a, m.asiento, m.de)) return aUno(m.de, { op: 'no', id: m.id, k: a.k, motivo: 'asiento' });
                    a.as[m.de] = m.asiento; cambio = true;
                }
                if (m.d !== undefined) { a.d[m.de] = m.d; cambio = true; }
                if (cambio) repartir(a);
                return;
            }
            if (a && a.jug.length >= a.cupo) return aUno(m.de, { op: 'no', id: m.id, k: a.k, motivo: 'llena' });
            for (const b of acts.values()) if (b.id !== m.id && b.jug.includes(m.de)) return aUno(m.de, { op: 'no', id: m.id, k: m.k, motivo: 'otra' });
            const act = a || { id: m.id, k: m.k, cupo: Math.max(1, Math.min(16, m.cupo | 0 || 2)), jug: [], d: {}, s: 0 };
            if (!a && conAsiento) act.as = {};
            if (!a && Number.isFinite(m.adelanto) && m.adelanto >= 0) act.adelanto = Math.min(30, m.adelanto);
            if (act.as) {
                const n = conAsiento && m.asiento >= 0 ? m.asiento : primerLibre(act);
                if (!asientoLibre(act, n, m.de)) return aUno(m.de, { op: 'no', id: m.id, k: act.k, motivo: 'asiento' });
                act.as[m.de] = n;
            }
            act.jug.push(m.de);
            if (m.d !== undefined) act.d[m.de] = m.d;
            if (!a) { acts.set(act.id, act); logs.set(act.id, []); }
            fijarT0(act);
            repartir(act);
        },
        salir(m) { sacar(m.id, m.de); },
        ev(m) {
            const a = acts.get(m.id);
            if (!a || !a.jug.includes(m.de)) return aUno(m.de, { op: 'no', id: m.id, k: a ? a.k : null, motivo: 'cerrada' });
            if (!m.libre && m.s !== a.s) return aUno(m.de, { op: 'no', id: m.id, k: a.k, motivo: 'orden', s: a.s });
            const ev = { s: a.s++, de: m.de, d: m.d };
            const log = logs.get(a.id);
            if (log) { log.push(ev); if (log.length > maxLog) log.shift(); }
            aTodos({ op: 'evento', id: a.id, s: ev.s, por: ev.de, d: ev.d }); // `por`: el autor (el `de` del mensaje es el anfitrión)
        },
        rf(m) {
            const a = acts.get(m.id);
            if (!a) return;
            const r = { op: 'rafaga', id: a.id, k: a.k, por: m.de, d: m.d };
            if (m.p) { for (const j of a.jug) if (j !== m.de) aUno(j, r); } // solo a los participantes
            else aTodos(r);
        },
        ver(m) {
            const a = acts.get(m.id);
            aUno(m.de, { op: 'registro', id: m.id, act: copia(a), log: a ? (logs.get(a.id) || []).slice() : [], dichos: a ? (dichos.get(a.id) || []).slice() : [] });
        },
        di(m) {
            const a = acts.get(m.id);
            if (!a || !a.jug.includes(m.de) || typeof m.c !== 'string' || !m.c || m.c.length > 40) return;
            const t = Date.now(), u = ultimoDicho.get(m.de);
            if (u !== undefined && t - u < pausaDichos) return; // a lo más una frase cada pausaDichos por jugador
            ultimoDicho.set(m.de, t);
            const lista = dichos.get(a.id) || [];
            const n = lista.length ? lista[lista.length - 1].n + 1 : 0;
            aTodos({ op: 'dicho', id: a.id, k: a.k, por: m.de, c: m.c, n, ...(m.d !== undefined ? { d: m.d } : {}) });
        }
    };
    // Asientos y tiempo común (los usa el anfitrión)
    const asientoLibre = (a, n, quien) => Number.isInteger(n) && n >= 0 && n < a.cupo && !Object.entries(a.as).some(([q, x]) => x === n && q !== String(quien));
    function primerLibre(a) { for (let n = 0; n < a.cupo; n++) if (asientoLibre(a, n, null)) return n; return -1; }
    function fijarT0(a) {
        if (a.adelanto === undefined) return;
        const h = horaAnf();
        if (h !== null) a.t0 = Math.round(h + a.adelanto * 1000);
    }
    function guardarDicho(id, x) {
        const lista = dichos.get(id) || [];
        if (lista.some(y => y.n === x.n)) return false;
        lista.push(x); lista.sort((p, q) => p.n - q.n);
        if (lista.length > maxDichos) lista.shift();
        dichos.set(id, lista);
        return true;
    }
    function repartir(act) { aTodos({ op: 'estado', id: act.id, act: copia(act) }); }
    function sacar(id, quien) {
        const a = acts.get(id);
        if (!a || !a.jug.includes(quien)) return;
        a.jug = a.jug.filter(x => x !== quien);
        delete a.d[quien];
        if (a.as) delete a.as[quien];
        if (!a.jug.length) { acts.delete(id); logs.delete(id); dichos.delete(id); aTodos({ op: 'estado', id, act: null, k: a.k }); }
        else { fijarT0(a); repartir(a); }
    }

    // ---------- Todos: lo que llega ----------
    function recibir(m) {
        if (!m || !m.op) return;
        // Lo que arbitra el anfitrión (llega con para = anfitrión)
        if (anf[m.op] && m.op !== 'estado') { if (esAnfitrion) anf[m.op](m); return; }
        switch (m.op) {
            case 'estado': {
                const antes = copia(acts.get(m.id) || null);
                // (el orden que ya conozco no retrocede: pude haber mandado un evento que el anfitrión aún no reparte)
                if (!esAnfitrion) { if (m.act) acts.set(m.id, { ...copia(m.act), s: Math.max(m.act.s, antes ? antes.s : 0) }); else acts.delete(m.id); }
                avisar(m.act ? m.act.k : m.k, 'estado', copia(acts.get(m.id) || null), antes, m.id);
                break;
            }
            case 'evento': {
                const a = acts.get(m.id);
                if (a && !esAnfitrion) a.s = Math.max(a.s, m.s + 1);
                avisar(a ? a.k : null, 'evento', { s: m.s, de: m.por, d: m.d }, copia(a), m.id);
                break;
            }
            case 'invitar': if (m.para === yo || !m.para) avisar(m.k, 'invitacion', { id: m.id, k: m.k, de: m.de, d: m.d }); break;
            case 'resp': avisar(m.k, 'resp', { id: m.id, k: m.k, de: m.de, si: !!m.si, motivo: m.motivo }); break;
            case 'no': avisar(m.k, 'no', { id: m.id, k: m.k, motivo: m.motivo, s: m.s }); break;
            case 'rafaga': if (m.por !== yo) avisar(m.k, 'rafaga', { de: m.por, d: m.d }, m.id); break;
            case 'registro': {
                if (m.act) acts.set(m.id, copia(m.act));
                for (const x of m.dichos || []) guardarDicho(m.id, x);
                avisar(m.act ? m.act.k : null, 'registro', copia(m.act), m.log || [], m.id);
                break;
            }
            case 'dicho': {
                const x = { n: m.n, de: m.por, c: m.c, ...(m.d !== undefined ? { d: m.d } : {}) };
                if (guardarDicho(m.id, x)) avisar(m.k, 'dicho', x, m.id);
                break;
            }
        }
    }

    return {
        recibir,
        // Cada tipo de actividad escucha lo suyo (k = 'duelo', 'fogata'…)
        escuchar(k, o) { oyentes.set(k, o); return () => { if (oyentes.get(k) === o) oyentes.delete(k); }; },
        // op = { asiento, adelanto } (asientos y tiempo común, ver arriba)
        unir(id, k, cupo, d, op = {}) {
            const m = { op: 'unir', id, k, cupo, d };
            if (Number.isInteger(op.asiento)) m.asiento = op.asiento;
            if (Number.isFinite(op.adelanto)) m.adelanto = op.adelanto;
            alAnfitrion(m);
        },
        salir(id) { alAnfitrion({ op: 'salir', id }); },
        // Evento con el orden que espero (el siguiente de la actividad); quien lo manda ya lo aplicó
        evento(id, d) { const a = acts.get(id); const s = a ? a.s : 0; if (a && !esAnfitrion) a.s++; alAnfitrion({ op: 'ev', id, s, d }); return s; },
        // Evento sin orden (tiempo real): el anfitrión le pone el número que toque; quien lo manda ya lo aplicó
        eventoLibre(id, d) { alAnfitrion({ op: 'ev', id, libre: 1, d }); },
        // Ráfaga: a todos, sin registro (estado continuo que se pisa con el siguiente)
        // dentro = true: solo a los participantes (una actividad en su propia escena, como la carrera de gatas)
        rafaga(id, d, dentro = false) { alAnfitrion(dentro ? { op: 'rf', id, d, p: 1 } : { op: 'rf', id, d }); },
        invitar(para, id, k, d) { enviar({ op: 'invitar', id, k, d, para }); },
        responder(para, id, k, si, motivo) { enviar({ op: 'resp', id, k, si: !!si, para, ...(motivo ? { motivo } : {}) }); },
        ver(id) { alAnfitrion({ op: 'ver', id }); },
        // Frase corta de un participante (clave de los datos del juego): la leen todos, también los que miran
        decir(id, c, d) { alAnfitrion(d !== undefined ? { op: 'di', id, c, d } : { op: 'di', id, c }); },
        dichos: id => (dichos.get(id) || []).map(x => ({ ...x })),
        // Asiento de alguien (-1 si no tiene) y segundos desde el t0 común (null sin t0 o sin reloj)
        asientoDe(id, quien) { const a = acts.get(id); return a && a.as && Number.isInteger(a.as[quien]) ? a.as[quien] : -1; },
        segundos(id) { const a = acts.get(id), h = horaAnf(); return a && Number.isFinite(a.t0) && h !== null ? (h - a.t0) / 1000 : null; },
        // Progreso a cuestas del `p` (coop.js): el mío (null = nada) y lo que llega de los demás
        progreso(id, d) { progresoMio = id && d !== undefined && d !== null ? { i: id, d } : null; },
        get progresoPropio() { return progresoMio && acts.has(progresoMio.i) ? progresoMio : null; },
        progresoRemoto(quien, ax) {
            const antes = progresos.get(quien);
            if (!ax || typeof ax.i !== 'string') {
                if (antes) { progresos.delete(quien); const a = acts.get(antes.i); avisar(a ? a.k : null, 'progreso', quien, null, antes.i); }
                return;
            }
            if (antes && antes.i === ax.i && JSON.stringify(antes.d) === JSON.stringify(ax.d)) return;
            progresos.set(quien, ax);
            const a = acts.get(ax.i);
            avisar(a ? a.k : null, 'progreso', quien, ax.d, ax.i);
        },
        progresoDe(id, quien) { const p = progresos.get(quien); return p && p.i === id ? p.d : null; },
        // Anfitrión: alguien entró a la sala (le cuento las actividades abiertas)
        entroJugador(quien) { if (esAnfitrion && quien !== yo) for (const a of acts.values()) aUno(quien, { op: 'estado', id: a.id, act: copia(a) }); },
        // Anfitrión: alguien se fue de la sala (sale de todas sus actividades)
        salioJugador(quien) { progresos.delete(quien); ultimoDicho.delete(quien); if (esAnfitrion) for (const a of [...acts.values()]) sacar(a.id, quien); },
        actividad: id => copia(acts.get(id) || null),
        dondeEsta: quien => { for (const a of acts.values()) if (a.jug.includes(quien)) return a.id; return null; },
        get lista() { return [...acts.values()].map(copia); }
    };
}

// Huella corta de un estado (FNV-1a de 32 bits sobre su JSON): los equipos la comparan tras cada evento
// para notar si se desincronizaron
export function huella(obj) {
    const s = JSON.stringify(obj);
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return (h >>> 0).toString(36);
}
