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
//             sin numerarla ni guardarla en el registro; la puede mandar cualquiera de la sala (el público alienta)
//   estado  ← del anfitrión a todos: { act } (act = null y id si se cerró)
//   evento  ← del anfitrión a todos: { id, s, por, d } (s = orden global de la actividad: 0, 1, 2…; por = autor)
//   no      ← del anfitrión a uno: { id, motivo } ('llena', 'otra', 'cerrada', 'orden')
//   invitar → directo a otro jugador (para): { id, k, d } (lo muestra su interfaz; no pasa por el estado)
//   resp    → directo al que invitó: { id, si, motivo? } (motivo: por qué no; lo lee cada juego)
//   ver     → al anfitrión: pide el estado y el registro de eventos (quien llega tarde o se pone a mirar)
//   registro← del anfitrión a uno: { id, act, log }
//   rafaga  ← del anfitrión a todos: { id, por, d } (quien la mandó no la recibe de vuelta)
// Quien entra a la sala recibe del anfitrión el `estado` de cada actividad abierta (entroJugador): así sabe qué
// se juega y puede pedir `ver` para mirarla.
// Orden: el anfitrión acepta un `ev` solo si su `s` es el siguiente (si no, `no` con 'orden'); así los
// equipos aplican los mismos eventos en el mismo orden (lockstep). Quien manda aplica su evento al tiro
// (optimista): sirve para juegos por turnos o donde cada uno es dueño de lo suyo.
// Sin DOM ni THREE: se prueba en Node con un transporte falso (mundo/tests/actividades.mjs).
// =========================================================

// enviar(m): manda un `ac` por la sala (m.para = un solo destinatario). El anfitrión no se recibe a sí
// mismo: lo que se manda para él se procesa aquí directo.
export function crearActividades({ yo, esAnfitrion, anfitrion, enviar, maxLog = 400 }) {
    const acts = new Map();      // id → { id, k, cupo, jug: [ids], d: { id: datos }, s }  (lo que se sabe)
    const logs = new Map();      // anfitrión: id → [{ s, de, d }] para quien llega tarde
    const oyentes = new Map();   // k → { estado(act, antes), evento(ev, act), invitacion(m), resp(m), no(m), registro(act, log) }
    const idAnf = () => (typeof anfitrion === 'function' ? anfitrion() : anfitrion);
    const copia = a => (a ? { ...a, jug: a.jug.slice(), d: { ...a.d } } : null);
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
            if (a && a.jug.includes(m.de)) { if (m.d !== undefined) { a.d[m.de] = m.d; repartir(a); } return; }
            if (a && a.jug.length >= a.cupo) return aUno(m.de, { op: 'no', id: m.id, k: a.k, motivo: 'llena' });
            for (const b of acts.values()) if (b.id !== m.id && b.jug.includes(m.de)) return aUno(m.de, { op: 'no', id: m.id, k: m.k, motivo: 'otra' });
            const act = a || { id: m.id, k: m.k, cupo: Math.max(1, Math.min(16, m.cupo | 0 || 2)), jug: [], d: {}, s: 0 };
            act.jug.push(m.de);
            if (m.d !== undefined) act.d[m.de] = m.d;
            if (!a) { acts.set(act.id, act); logs.set(act.id, []); }
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
            if (a) aTodos({ op: 'rafaga', id: a.id, k: a.k, por: m.de, d: m.d });
        },
        ver(m) {
            const a = acts.get(m.id);
            aUno(m.de, { op: 'registro', id: m.id, act: copia(a), log: a ? (logs.get(a.id) || []).slice() : [] });
        }
    };
    function repartir(act) { aTodos({ op: 'estado', id: act.id, act: copia(act) }); }
    function sacar(id, quien) {
        const a = acts.get(id);
        if (!a || !a.jug.includes(quien)) return;
        a.jug = a.jug.filter(x => x !== quien);
        delete a.d[quien];
        if (!a.jug.length) { acts.delete(id); logs.delete(id); aTodos({ op: 'estado', id, act: null, k: a.k }); }
        else repartir(a);
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
            case 'registro': if (m.act) acts.set(m.id, copia(m.act)); avisar(m.act ? m.act.k : null, 'registro', copia(m.act), m.log || [], m.id); break;
        }
    }

    return {
        recibir,
        // Cada tipo de actividad escucha lo suyo (k = 'duelo', 'fogata'…)
        escuchar(k, o) { oyentes.set(k, o); return () => { if (oyentes.get(k) === o) oyentes.delete(k); }; },
        unir(id, k, cupo, d) { alAnfitrion({ op: 'unir', id, k, cupo, d }); },
        salir(id) { alAnfitrion({ op: 'salir', id }); },
        // Evento con el orden que espero (el siguiente de la actividad); quien lo manda ya lo aplicó
        evento(id, d) { const a = acts.get(id); const s = a ? a.s : 0; if (a && !esAnfitrion) a.s++; alAnfitrion({ op: 'ev', id, s, d }); return s; },
        // Evento sin orden (tiempo real): el anfitrión le pone el número que toque; quien lo manda ya lo aplicó
        eventoLibre(id, d) { alAnfitrion({ op: 'ev', id, libre: 1, d }); },
        // Ráfaga: a todos, sin registro (estado continuo que se pisa con el siguiente)
        rafaga(id, d) { alAnfitrion({ op: 'rf', id, d }); },
        invitar(para, id, k, d) { enviar({ op: 'invitar', id, k, d, para }); },
        responder(para, id, k, si, motivo) { enviar({ op: 'resp', id, k, si: !!si, para, ...(motivo ? { motivo } : {}) }); },
        ver(id) { alAnfitrion({ op: 'ver', id }); },
        // Anfitrión: alguien entró a la sala (le cuento las actividades abiertas)
        entroJugador(quien) { if (esAnfitrion && quien !== yo) for (const a of acts.values()) aUno(quien, { op: 'estado', id: a.id, act: copia(a) }); },
        // Anfitrión: alguien se fue de la sala (sale de todas sus actividades)
        salioJugador(quien) { if (esAnfitrion) for (const a of [...acts.values()]) sacar(a.id, quien); },
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
