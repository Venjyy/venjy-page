// =========================================================
// Prueba de las actividades compartidas (7g-1, base común) y del duelo de cartas entre 2 jugadores
// Ejecutar: node mundo/tests/cartas-duelo.mjs
//
// Sin navegador: una sala en estrella falsa (el anfitrión reparte, `para` = un solo destinatario, en orden).
//   1. actividades-red.js: unir, cupo lleno, una actividad a la vez, salir, eventos numerados y fuera de
//      orden, quien mira recibe estado y eventos, registro para quien llega tarde, salida de la sala
//   2. espejo: la partida espejada aplicando las mismas acciones queda igual a la canónica (200 partidas)
//   3. duelo: anfitrión contra invitado y entre dos invitados (pasa por el anfitrión) hasta el final,
//      con las mismas huellas; rechazo; abandono; desincronización detectada
//   4. duelo donde están (PR 2): lugar, superficie, dos duelos a la vez y motivos
//   5. mesa de duelo colocada (PR 3): la más cercana, el lugar en ella y el lado del retador
//   6. coop.js escucha en la sala todos los tipos que maneja (sin 'ac' el reto nunca llegaba)
// Sale con código 0 si todo coincide, 1 si no.
// =========================================================
import { pathToFileURL, fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { readFileSync } from 'fs';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '../../');
const importar = r => import(pathToFileURL(resolve(raiz, r)).href);
const A = await importar('mundo/supervivencia/actividades-red.js');
const Du = await importar('mundo/supervivencia/cartas-duelo.js');
const C = await importar('mundo/supervivencia/cartas.js');
const D = await importar('mundo/supervivencia/cartas-datos.js');

let fallos = 0;
const ok = (c, msg) => { if (!c) { fallos++; console.log('FALLA:', msg); } };

// ---------- Sala falsa en estrella ----------
function crearSala(ids) {
    const anf = ids[0], cola = [], nodos = new Map();
    const entregar = (para, m) => cola.push([para, m]);
    for (const id of ids) {
        const esAnfitrion = id === anf;
        const enviar = dato => {
            const m = { ...dato, de: id };
            if (esAnfitrion) { for (const o of ids) if (o !== id && (!m.para || m.para === o)) entregar(o, m); }
            else entregar(anf, m);
        };
        const acts = A.crearActividades({ yo: id, esAnfitrion, anfitrion: anf, enviar });
        nodos.set(id, { id, acts, esAnfitrion });
    }
    function correr(max = 100000) {
        let n = 0;
        while (cola.length && n++ < max) {
            const [para, m] = cola.shift();
            const nodo = nodos.get(para);
            if (!nodo) continue;
            // El anfitrión reparte lo que no es para él (como SalaDirecta.repartir)
            if (nodo.esAnfitrion && m.para !== para) for (const o of ids) if (o !== para && o !== m.de && (!m.para || m.para === o)) entregar(o, m);
            if (!m.para || m.para === para) nodo.acts.recibir(m);
        }
        return n;
    }
    return { nodos, correr, n: id => nodos.get(id) };
}

// ---------- 1. Actividades ----------
{
    const s = crearSala(['h', 'g1', 'g2', 'g3']);
    const vistos = { h: [], g1: [], g2: [], g3: [] }, evs = { h: [], g1: [], g2: [], g3: [] }, noes = { h: [], g1: [], g2: [], g3: [] };
    for (const [id, nd] of s.nodos) nd.acts.escuchar('*', {
        estado: (act, antes, aid) => vistos[id].push([aid, act ? act.jug.slice() : null]),
        evento: (ev, act, aid) => evs[id].push([aid, ev.s, ev.de, ev.d]),
        no: m => noes[id].push(m.motivo)
    });
    s.n('g1').acts.unir('fogata@1', 'fogata', 2, { asiento: 0 });
    s.correr();
    ok(s.n('g3').acts.actividad('fogata@1')?.jug.join() === 'g1', 'quien mira (g3) sabe que g1 está en la fogata');
    ok(s.n('h').acts.actividad('fogata@1')?.d.g1?.asiento === 0, 'el anfitrión guarda los datos del participante');
    s.n('g2').acts.unir('fogata@1', 'fogata', 2, { asiento: 1 }); s.correr();
    s.n('h').acts.unir('fogata@1', 'fogata', 2, {}); s.correr();
    ok(noes.h.includes('llena'), 'cupo lleno: el tercero recibe «llena»');
    ok(s.n('h').acts.actividad('fogata@1').jug.join() === 'g1,g2', 'cupo: siguen los dos');
    s.n('g1').acts.unir('iglu@1', 'iglu', 4, {}); s.correr();
    ok(noes.g1.includes('otra'), 'una actividad a la vez: «otra»');
    // Eventos en orden; uno con un orden viejo se rechaza
    s.n('g1').acts.evento('fogata@1', { x: 1 }); s.correr(); s.n('g2').acts.evento('fogata@1', { x: 2 }); s.correr();
    ok(evs.g3.length === 2 && evs.g3[0][1] === 0 && evs.g3[1][1] === 1, 'quien mira recibe los eventos numerados 0, 1');
    ok(evs.g2.some(e => e[2] === 'g1' && e[3].x === 1), 'el otro participante recibe el evento');
    // g2 manda con un orden que ya pasó (no vio el de g1): el anfitrión lo rechaza
    s.n('g1').acts.evento('fogata@1', { x: 3 });
    s.n('g2').acts.recibir({ op: 'evento', id: 'x', s: 0, de: 'h', d: null }); // nada que ver (otra actividad)
    s.correr();
    const total = evs.h.filter(e => e[0] === 'fogata@1').length;
    ok(total === 3, 'el anfitrión también ve los eventos (3)');
    // Fuera de orden a mano
    s.nodos.get('h').acts.recibir({ op: 'ev', id: 'fogata@1', s: 0, d: {}, de: 'g2' }); s.correr();
    ok(noes.g2.includes('orden'), 'evento con orden viejo: «orden»');
    // Registro para quien llega tarde
    let reg = null; s.n('g3').acts.escuchar('fogata', { registro: (act, log) => { reg = { act, log }; } });
    s.n('g3').acts.ver('fogata@1'); s.correr();
    ok(reg && reg.log.length === 3 && reg.act.jug.length === 2, 'ver: estado y los 3 eventos');
    // Salir de la sala: el anfitrión lo saca de todo
    s.n('h').acts.salioJugador('g1'); s.correr();
    ok(s.n('g2').acts.actividad('fogata@1').jug.join() === 'g2', 'salió g1 de la sala: queda g2');
    s.n('g2').acts.salir('fogata@1'); s.correr();
    ok(s.n('g3').acts.actividad('fogata@1') === null && s.n('h').acts.lista.length === 0, 'vacía: se cierra en todos');
    ok(A.huella({ a: 1 }) === A.huella({ a: 1 }) && A.huella({ a: 1 }) !== A.huella({ a: 2 }), 'huella estable y distinta');
}

// ---------- 2. Espejo ----------
{
    let malos = 0, partidas = 0;
    for (let k = 0; k < 200; k++) {
        const c = C.nuevaPartida({ mazos: [D.MAZOS.medio, D.MAZOS.facil], semilla: 1000 + k, empieza: k % 2, vidas: [4000, 4000], mano: [4, 5] });
        const m = Du.espejo(c);
        for (let i = 0; i < 2000 && c.ganador === null; i++) {
            const a = C.jugadaIA(C.clonar(c), 'medio');
            C.aplicar(c, a); C.aplicar(m, a);
            if (A.huella(Du.espejo(m)) !== A.huella(c)) { malos++; break; }
        }
        partidas++;
    }
    ok(malos === 0, `espejo: ${malos} de ${partidas} partidas se separaron`);
}

// ---------- 3. Duelo ----------
const R = { vida: 4000, mano: 4, espera: 0 };
function jugadores(s, ids, mazos) {
    const J = {};
    for (const id of ids) {
        const j = { id, fines: [], rechazos: [], invitaciones: [], inicio: 0 };
        j.d = Du.crearDuelo({
            acts: s.n(id).acts, yo: id, reglas: () => R, propio: () => mazos[id] || { mazo: D.MAZOS.jugador, extra: 0 },
            al: {
                invitacion: m => j.invitaciones.push(m),
                inicio: (e, r, lugar, lado) => { j.inicio++; j.lugar = lugar; j.lado = lado; },
                jugada: (a, h) => j.d.aplicarRival(a, h),
                fin: mot => j.fines.push(mot),
                rechazo: mot => j.rechazos.push(mot)
            }
        });
        J[id] = j;
    }
    return J;
}
// Juega hasta el final: el que tiene el turno en su mesa (turno 0) elige con la IA sobre una copia
function jugarHastaFin(s, a, b) {
    for (let i = 0; i < 4000; i++) {
        const ea = a.d.estado, eb = b.d.estado;
        if (!ea || ea.ganador !== null || a.d.fase !== 'jugando' || b.d.fase !== 'jugando') break;
        const quien = ea.turno === 0 ? a : b;
        const e = quien.d.estado;
        quien.d.jugar(C.jugadaIA(C.clonar(e), 'medio'));
        s.correr();
    }
}
{
    // Anfitrión (h) reta a g1; g2 mira
    const s = crearSala(['h', 'g1', 'g2']);
    const J = jugadores(s, ['h', 'g1', 'g2'], { h: { mazo: D.MAZOS.medio, extra: 0 }, g1: { mazo: D.MAZOS.facil, extra: 1 } });
    ok(J.h.d.retar('g1'), 'retar'); s.correr();
    ok(J.g1.invitaciones.length === 1 && J.g1.invitaciones[0].de === 'h', 'g1 recibe la invitación');
    ok(s.n('g2').acts.actividad(Du.idDuelo('h'))?.jug.join() === 'h', 'quien mira ve la mesa ocupada por h');
    J.g1.d.aceptar(J.g1.invitaciones[0]); s.correr();
    ok(J.h.inicio === 1 && J.g1.inicio === 1, 'los dos empiezan');
    const eh = J.h.d.estado, eg = J.g1.d.estado;
    ok(eh.jug[1].mano.length === 5 && eg.jug[0].mano.length === 5, 'mano: 4 + 1 extra del invitado (al azar)');
    ok(A.huella(eh) === A.huella(Du.espejo(eg)), 'misma partida (espejada) al empezar');
    jugarHastaFin(s, J.h, J.g1);
    ok(eh.ganador !== null, 'la partida termina');
    ok(eh.ganador === (eg.ganador === 'empate' ? 'empate' : 1 - eg.ganador), 'el ganador coincide en los dos');
    ok(A.huella(eh) === A.huella(Du.espejo(eg)), 'misma partida al final');
    ok(!J.h.fines.length && !J.g1.fines.length, 'sin abandono ni desincronización');
    J.h.d.salir(); J.g1.d.salir(); s.correr();
    ok(!J.h.fines.length && !J.g1.fines.length, 'salir después del final no es abandono');
    ok(s.n('g2').acts.actividad(Du.idDuelo('h')) === null, 'la mesa queda libre');
}
{
    // Entre dos invitados (todo pasa por el anfitrión), y el anfitrión no juega
    const s = crearSala(['h', 'g1', 'g2']);
    const J = jugadores(s, ['h', 'g1', 'g2'], {});
    J.g2.d.retar('g1'); s.correr();
    J.g1.d.aceptar(J.g1.invitaciones[0]); s.correr();
    ok(J.g1.inicio === 1 && J.g2.inicio === 1 && J.h.inicio === 0, 'invitado contra invitado: empiezan solo ellos');
    jugarHastaFin(s, J.g2, J.g1);
    ok(J.g2.d.estado.ganador !== null && A.huella(J.g2.d.estado) === A.huella(Du.espejo(J.g1.d.estado)), 'invitado contra invitado: misma partida al final');
    // Otro reto con la mesa ocupada: el anfitrión dice «llena»
    J.h.d.retar('g1'); s.correr();
    ok(J.h.rechazos.includes('ocupado'), 'g1 ya juega: el reto vuelve con «ocupado»');
}
{
    // Rechazo, abandono y desincronización
    const s = crearSala(['h', 'g1']);
    const J = jugadores(s, ['h', 'g1'], {});
    J.h.d.retar('g1'); s.correr();
    J.g1.d.rechazar(J.g1.invitaciones[0]); s.correr();
    ok(J.h.rechazos.includes('no') && J.h.d.fase === 'libre', 'rechazo: el retador queda libre');
    ok(s.n('h').acts.actividad(Du.idDuelo('h')) === null, 'rechazo: la mesa queda libre');
    J.h.d.retar('g1'); s.correr(); J.g1.d.aceptar(J.g1.invitaciones[1]); s.correr();
    // Unas jugadas y el invitado se va de la sala
    for (let i = 0; i < 6; i++) { const q = J.h.d.estado.turno === 0 ? J.h : J.g1; q.d.jugar(C.jugadaIA(C.clonar(q.d.estado), 'facil')); s.correr(); }
    s.n('h').acts.salioJugador('g1'); J.h.d.rivalSalio('g1'); s.correr();
    ok(J.h.fines.join() === 'abandono', 'el rival se fue: «abandono» una vez');
    ok(J.h.d.fase === 'libre', 'abandono: queda libre');
    // Desincronización: g1 recibe una huella que no calza
    const s2 = crearSala(['h', 'g1']);
    const K = jugadores(s2, ['h', 'g1'], {});
    K.h.d.retar('g1'); s2.correr(); K.g1.d.aceptar(K.g1.invitaciones[0]); s2.correr();
    const q = K.h.d.estado.turno === 0 ? K.h : K.g1, otro = q === K.h ? K.g1 : K.h;
    const a = C.jugadaIA(C.clonar(q.d.estado), 'facil');
    C.aplicar(q.d.estado, a); // jugada local sin mandar: se separan
    q.d.jugar(C.jugadaIA(C.clonar(q.d.estado), 'facil')); s2.correr();
    ok(otro.fines.includes('desincronizado'), 'desincronización detectada (huella o jugada ilegal)');
}

// ---------- 4. Duelo donde están (PR 2): lugar, superficie, dos duelos a la vez y motivos ----------
{
    ok(Du.mejorSuperficie('piso', 'tronco') === 'tronco' && Du.mejorSuperficie('mesa', 'tronco') === 'mesa' && Du.mejorSuperficie(undefined, undefined) === 'piso', 'mejor superficie de los dos');
    const L = Du.lugarDuelo({ x: 0, y: 70, z: 4, sup: 'tronco' }, { x: 0, y: 71, z: 0, sup: 'piso' });
    ok(L && L.x === 0 && L.z === 2 && L.y === 70 && L.sup === 'tronco', 'lugar: en el medio, a la altura del retador, con la mejor superficie');
    // g: el retador (lado 0) mira hacia −local z, o sea hacia el invitado
    const M = { s: Math.sin(L.g), c: Math.cos(L.g) };
    ok(Math.abs(M.s * 1 - 0) < 1e-3 && Math.abs(M.c - 1) < 1e-3, 'lugar: el retador queda en +local z, el invitado enfrente');
    ok(Du.lugarDuelo({ mazo: [] }, { mazo: [] }) === null, 'sin posiciones no hay lugar');

    const s = crearSala(['h', 'g1', 'g2', 'g3']);
    const P = { x: 0, y: 70, z: 0 };
    const J = jugadores(s, ['h', 'g1', 'g2', 'g3'], {
        h: { mazo: D.MAZOS.jugador, extra: 0, ...P, sup: 'piso' }, g1: { mazo: D.MAZOS.jugador, extra: 0, x: 3, y: 70, z: 0, sup: 'tronco' },
        g2: { mazo: D.MAZOS.jugador, extra: 0, x: 50, y: 64, z: 50, sup: 'piso' }, g3: { mazo: D.MAZOS.jugador, extra: 0, x: 50, y: 64, z: 53, sup: 'piso' }
    });
    J.h.d.retar('g1'); J.g2.d.retar('g3'); s.correr();
    J.g1.d.aceptar(J.g1.invitaciones[0]); J.g3.d.aceptar(J.g3.invitaciones[0]); s.correr();
    ok(J.h.inicio === 1 && J.g1.inicio === 1 && J.g2.inicio === 1 && J.g3.inicio === 1, 'dos duelos a la vez en la misma sala');
    ok(J.h.lado === 0 && J.g1.lado === 1, 'lado: el retador 0, el invitado 1');
    ok(J.h.lugar && J.g1.lugar && J.h.lugar.x === 1.5 && J.g1.lugar.g === J.h.lugar.g && J.h.lugar.sup === 'tronco', 'los dos reciben el mismo lugar (tronco del invitado)');
    ok(J.g2.lugar && J.g2.lugar.z === 51.5 && J.g2.lugar.sup === 'piso', 'el otro duelo tiene su lugar');
    jugarHastaFin(s, J.h, J.g1); jugarHastaFin(s, J.g2, J.g3);
    ok(J.h.d.estado.ganador !== null && J.g2.d.estado.ganador !== null, 'los dos duelos terminan');
    ok(A.huella(J.h.d.estado) === A.huella(Du.espejo(J.g1.d.estado)) && A.huella(J.g2.d.estado) === A.huella(Du.espejo(J.g3.d.estado)), 'cada duelo queda igual en sus dos jugadores');
    ok(![J.h, J.g1, J.g2, J.g3].some(j => j.fines.length), 'sin abandono ni desincronización en ninguno');
    // Rechazo con motivo (el invitado no jugó el tutorial)
    for (const j of Object.values(J)) j.d.salir();
    s.correr();
    J.h.d.retar('g1'); s.correr();
    J.g1.d.rechazar(J.g1.invitaciones.at(-1), 'sinTuto'); s.correr();
    ok(J.h.rechazos.at(-1) === 'sinTuto' && Du.TXT_RETO.rechazo.sinTuto, 'rechazo con motivo: «sinTuto» y su texto');
    ok(s.n('g2').acts.actividad(Du.idDuelo('h')) === null, 'rechazo con motivo: el duelo se cierra');
}

// ---------- 5. La mesa de duelo colocada (PR 3): se juega en ella, del lado del retador ----------
{
    const mesa = { x: 10.5, y: 70, z: 20.5, g: 0 };
    ok(Du.mesaCercana([mesa, { x: 30.5, y: 70, z: 20.5, g: 0 }], { x: 11, y: 70, z: 22 }, 3) === mesa, 'mesa cercana: la que está a menos de mesaCerca');
    ok(Du.mesaCercana([mesa], { x: 20, y: 70, z: 20 }, 3) === null, 'mesa cercana: lejos, ninguna');
    ok(Du.mesaCercana([mesa], { x: 11, y: 74, z: 21 }, 3) === null, 'mesa cercana: otro piso, ninguna');
    // Retador al sur (+z) de una mesa con el largo en X: g = 0 (su asiento queda en +local z)
    let L = Du.lugarDuelo({ x: 10, y: 70, z: 22, sup: 'piso', mesa }, { x: 10, y: 70, z: 19, sup: 'piso' });
    ok(L && L.sup === 'mesa' && L.fija === 1 && L.x === 10.5 && L.z === 20.5 && L.y === 70, 'lugar: en la mesa colocada, fija');
    ok(Math.abs(L.g) < 1e-3, 'lugar: el retador en su lado de la mesa (sur)');
    // Retador al norte: la mesa se gira 180° para él
    L = Du.lugarDuelo({ x: 10, y: 70, z: 18, sup: 'piso' }, { x: 10, y: 70, z: 23, sup: 'tronco', mesa });
    ok(L && L.sup === 'mesa' && Math.abs(Math.abs(L.g) - Math.PI) < 1e-2, 'lugar: la mesa del invitado, con el retador del otro lado');
    // Mesa con el largo en Z (g = π/2): el retador al este (+x) queda en su lado
    L = Du.lugarDuelo({ x: 12, y: 70, z: 20.5, mesa: { ...mesa, g: Math.PI / 2 } }, { x: 9, y: 70, z: 20.5 });
    ok(L && Math.abs(L.g - Math.PI / 2) < 1e-2, 'lugar: mesa a lo largo de Z, retador al este');
    // La mesa viaja con el mensaje de la actividad: el lugar sale de ella para los dos
    const s = crearSala(['h', 'g1']);
    const J = jugadores(s, ['h', 'g1'], {
        h: { mazo: D.MAZOS.jugador, extra: 0, x: 10, y: 70, z: 22, sup: 'piso', mesa }, g1: { mazo: D.MAZOS.jugador, extra: 0, x: 10, y: 70, z: 19, sup: 'piso', mesa }
    });
    J.h.d.retar('g1'); s.correr(); J.g1.d.aceptar(J.g1.invitaciones[0]); s.correr();
    ok(J.h.lugar && J.g1.lugar && J.h.lugar.fija === 1 && J.h.lugar.x === J.g1.lugar.x && J.h.lugar.g === J.g1.lugar.g, 'los dos juegan en la misma mesa colocada');
}

// ---------- 6. La sala de verdad escucha los mensajes de las actividades ----------
// coop.js solo se suscribe a los tipos de TIPOS: un manejador que no esté ahí nunca recibe nada (el reto no llegaba)
{
    const src = readFileSync(resolve(raiz, 'mundo/supervivencia/coop.js'), 'utf8');
    const tipos = new Set([...src.match(/const TIPOS = \[([^\]]*)\]/)[1].matchAll(/'([^']+)'/g)].map(x => x[1]));
    const desde = src.slice(src.indexOf('const manejadores = {'));
    const cuerpo = desde.slice(0, desde.search(/\r?\n {4}\};/)); // hasta el cierre del objeto (4 espacios)
    const claves = [...cuerpo.matchAll(/^ {8}(?:'([^']+)'|([a-zA-Z?]+))\(/gm)].map(x => x[1] || x[2]);
    ok(claves.length > 10, 'coop: se leen los manejadores');
    const faltan = claves.filter(k => !tipos.has(k));
    ok(!faltan.length, `coop: la sala escucha todos los manejadores (faltan: ${faltan.join(', ')})`);
    ok(tipos.has('ac'), "coop: la sala escucha 'ac' (actividades y duelo)");
}

console.log(fallos ? `${fallos} fallo(s)` : 'cartas-duelo: todo bien');
process.exit(fallos ? 1 : 0);
