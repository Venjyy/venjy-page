// =========================================================
// Prueba de las bases de actividades compartidas (7g-1): asientos, tiempo común (t0), progreso a cuestas del `p`,
// frases que leen todos (también los que miran desde afuera y los que llegan tarde) y la fogata (parte pura).
// Ejecutar: node mundo/tests/actividades.mjs
//
// Sin navegador: una sala en estrella falsa como la de cartas-duelo.mjs, con un reloj del anfitrión que se puede
// adelantar (lo que en el juego da coop.relojAnfitrion con el desfase de 7e).
// Sale con código 0 si todo coincide, 1 si no.
// =========================================================
import { pathToFileURL, fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { readFileSync } from 'fs';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '../../');
const importar = r => import(pathToFileURL(resolve(raiz, r)).href);
const A = await importar('mundo/supervivencia/actividades-red.js');
const Fo = await importar('mundo/supervivencia/fogata.js');

let fallos = 0, cuenta = 0;
const ok = (c, msg) => { cuenta++; if (!c) { fallos++; console.log('FALLA:', msg); } };

// ---------- Sala falsa en estrella (con reloj del anfitrión) ----------
function crearSala(ids, op = {}) {
    const anf = ids[0], cola = [], nodos = new Map();
    const reloj = { ms: 1000 };
    const entregar = (para, m) => cola.push([para, m]);
    for (const id of ids) {
        const esAnfitrion = id === anf;
        const enviar = dato => {
            const m = { ...dato, de: id };
            if (esAnfitrion) { for (const o of ids) if (o !== id && (!m.para || m.para === o)) entregar(o, m); }
            else entregar(anf, m);
        };
        const acts = A.crearActividades({ yo: id, esAnfitrion, anfitrion: anf, enviar, reloj: () => reloj.ms, ...op });
        const oido = { estado: [], no: [], dicho: [], progreso: [], registro: [] };
        acts.escuchar('*', {
            estado: (act, antes, aid) => oido.estado.push([aid, act]),
            no: m => oido.no.push(m.motivo),
            dicho: (x, aid) => oido.dicho.push([aid, x.de, x.c, x.n]),
            progreso: (quien, d, aid) => oido.progreso.push([quien, d, aid]),
            registro: (act, log, aid) => oido.registro.push([aid, act])
        });
        nodos.set(id, { id, acts, esAnfitrion, oido });
    }
    function correr(max = 100000) {
        let n = 0;
        while (cola.length && n++ < max) {
            const [para, m] = cola.shift();
            const nodo = nodos.get(para);
            if (!nodo) continue;
            if (nodo.esAnfitrion && m.para !== para) for (const o of ids) if (o !== para && o !== m.de && (!m.para || m.para === o)) entregar(o, m);
            if (!m.para || m.para === para) nodo.acts.recibir(m);
        }
    }
    return { correr, reloj, n: id => nodos.get(id), nodos };
}
const ID = 'fogata@campamento';

// ---------- 1. Asientos ----------
{
    const s = crearSala(['h', 'g1', 'g2', 'g3', 'g4']);
    s.n('g1').acts.unir(ID, 'fogata', 3, undefined, { asiento: 2 }); s.correr();
    ok(s.n('g4').acts.asientoDe(ID, 'g1') === 2, 'quien mira desde afuera (g4) sabe en qué asiento está g1');
    s.n('g2').acts.unir(ID, 'fogata', 3, undefined, { asiento: 2 }); s.correr();
    ok(s.n('g2').oido.no.includes('asiento'), 'asiento ocupado: «asiento»');
    ok(s.n('h').acts.actividad(ID).jug.join() === 'g1', 'el rechazado no entra');
    s.n('g2').acts.unir(ID, 'fogata', 3, undefined, { asiento: -1 }); s.correr();
    ok(s.n('g3').acts.asientoDe(ID, 'g2') === 0, 'asiento -1: el primero libre (0)');
    s.n('g1').acts.unir(ID, 'fogata', 3, undefined, { asiento: 1 }); s.correr();
    ok(s.n('g4').acts.asientoDe(ID, 'g1') === 1, 'volver a unir con otro asiento libre cambia de lugar');
    s.n('g1').acts.unir(ID, 'fogata', 3, undefined, { asiento: 0 }); s.correr();
    ok(s.n('g1').oido.no.includes('asiento') && s.n('h').acts.asientoDe(ID, 'g1') === 1, 'cambiarse a uno ocupado: no se mueve');
    s.n('g3').acts.unir(ID, 'fogata', 3, undefined, { asiento: 7 }); s.correr();
    ok(s.n('g3').oido.no.includes('asiento'), 'asiento fuera del cupo: rechazado');
    s.n('g3').acts.unir(ID, 'fogata', 3, undefined, { asiento: 2 }); s.correr();
    s.n('g4').acts.unir(ID, 'fogata', 3, undefined, { asiento: -1 }); s.correr();
    ok(s.n('g4').oido.no.includes('llena'), 'cupo lleno: «llena»');
    s.n('h').acts.salioJugador('g2'); s.correr();
    ok(s.n('g4').acts.asientoDe(ID, 'g2') === -1 && !s.n('g4').acts.actividad(ID).jug.includes('g2'), 'desconectado: su asiento queda libre');
    s.n('g4').acts.unir(ID, 'fogata', 3, undefined, { asiento: -1 }); s.correr();
    ok(s.n('g1').acts.asientoDe(ID, 'g4') === 0, 'el que esperaba toma el asiento libre');
    for (const q of ['g1', 'g3', 'g4']) s.n(q).acts.salir(ID);
    s.correr();
    ok(s.n('g4').acts.actividad(ID) === null, 'sin nadie, la actividad se cierra para todos');
    // Sin asientos (el duelo, la carrera) nada cambia: no hay `as`
    s.n('g1').acts.unir('duelo@x', 'duelo', 2, { mazo: 1 }); s.correr();
    ok(!('as' in s.n('h').acts.actividad('duelo@x')), 'una actividad sin asientos no los tiene');
}

// ---------- 2. Tiempo común (t0 con el reloj del anfitrión) ----------
{
    const s = crearSala(['h', 'g1', 'g2']);
    s.n('g1').acts.unir('iglu@1', 'iglu', 4, undefined, { asiento: -1, adelanto: 3 }); s.correr();
    ok(s.n('g2').acts.actividad('iglu@1').t0 === 4000, 't0 = hora del anfitrión + 3 s, lo sabe hasta quien mira');
    ok(s.n('g1').acts.segundos('iglu@1') === -3, 'faltan 3 s para empezar');
    s.reloj.ms = 9000;
    ok(s.n('g2').acts.segundos('iglu@1') === 5, 'con el reloj del anfitrión, 5 s desde t0 en todos');
    s.n('g2').acts.unir('iglu@1', 'iglu', 4, undefined, { asiento: -1 }); s.correr();
    ok(s.n('g1').acts.actividad('iglu@1').t0 === 12000, 'al entrar alguien, t0 nuevo');
    s.reloj.ms = 13000; s.n('g2').acts.salir('iglu@1'); s.correr();
    ok(s.n('h').acts.actividad('iglu@1').t0 === 16000, 'al salir alguien, t0 nuevo');
    const sinReloj = A.crearActividades({ yo: 'x', esAnfitrion: true, anfitrion: 'x', enviar: () => {} });
    sinReloj.unir('a', 'iglu', 2, undefined, { adelanto: 3 });
    ok(sinReloj.segundos('a') === null, 'sin reloj no hay t0 (null)');
}

// ---------- 3. Frases que leen todos ----------
{
    const s = crearSala(['h', 'g1', 'g2', 'g3'], { maxDichos: 3, pausaDichos: 0 });
    s.n('g1').acts.unir(ID, 'fogata', 8, undefined, { asiento: -1 }); s.correr();
    s.n('g1').acts.decir(ID, 'hola'); s.correr();
    ok(['h', 'g1', 'g2', 'g3'].every(q => s.n(q).oido.dicho.some(([aid, de, c]) => aid === ID && de === 'g1' && c === 'hola')), 'la frase la leen todos (participantes, quien la dijo y los que miran)');
    s.n('g2').acts.decir(ID, 'intruso'); s.correr();
    ok(!s.n('g3').oido.dicho.some(x => x[2] === 'intruso'), 'quien no participa no puede decir nada');
    s.n('g1').acts.decir(ID, 'x'.repeat(41)); s.correr();
    ok(s.n('g3').oido.dicho.length === 1, 'una clave demasiado larga se descarta');
    for (const c of ['a', 'b', 'c']) s.n('g1').acts.decir(ID, c);
    s.correr();
    ok(s.n('g2').acts.dichos(ID).map(x => x.c).join() === 'a,b,c', 'cada equipo guarda las últimas maxDichos');
    ok(s.n('g2').acts.dichos(ID).map(x => x.n).join() === '1,2,3', 'numeradas por el anfitrión');
    // Quien llega tarde (entra a la sala después) pide `ver` y recibe las últimas
    const t = crearSala(['h', 'g1', 'g9'], { pausaDichos: 0 });
    t.n('g1').acts.unir(ID, 'fogata', 8, undefined, { asiento: -1 }); t.correr();
    t.n('g1').acts.decir(ID, 'frio'); t.correr();
    const tarde = t.n('g9');
    tarde.acts.dichos(ID).splice(0); // (copia: no cambia nada)
    t.n('h').acts.entroJugador('g9'); tarde.acts.ver(ID); t.correr();
    ok(tarde.acts.dichos(ID).some(x => x.c === 'frio' && x.de === 'g1'), 'quien llega tarde recibe las frases en el registro');
    // Pausa entre frases de un mismo jugador
    const p = crearSala(['h', 'g1'], { pausaDichos: 60000 });
    p.n('g1').acts.unir(ID, 'fogata', 8, undefined, { asiento: -1 }); p.correr();
    p.n('g1').acts.decir(ID, 'a'); p.n('g1').acts.decir(ID, 'b'); p.correr();
    ok(p.n('h').acts.dichos(ID).map(x => x.c).join() === 'a', 'pausaDichos: la segunda frase seguida se descarta');
}

// ---------- 4. Progreso a cuestas del `p` ----------
{
    const s = crearSala(['h', 'g1', 'g2']);
    const g1 = s.n('g1').acts, g2 = s.n('g2').acts;
    g1.progreso(ID, { a: 3 });
    ok(g1.progresoPropio === null, 'sin la actividad abierta no se manda progreso');
    g1.unir(ID, 'fogata', 8, undefined, { asiento: 3 }); s.correr();
    ok(JSON.stringify(g1.progresoPropio) === JSON.stringify({ i: ID, d: { a: 3 } }), 'con la actividad, el progreso va en `ax`');
    g2.progresoRemoto('g1', g1.progresoPropio); // lo que hace coop.js al recibir el `p`
    ok(g2.progresoDe(ID, 'g1').a === 3, 'quien mira lee el progreso de g1');
    g2.progresoRemoto('g1', g1.progresoPropio);
    ok(s.n('g2').oido.progreso.length === 1, 'el mismo progreso repetido (5 Hz) no avisa de nuevo');
    g2.progresoRemoto('g1', null);
    ok(g2.progresoDe(ID, 'g1') === null && s.n('g2').oido.progreso.at(-1)[1] === null, 'sin `ax`: se borra y se avisa');
    g1.progreso(null);
    ok(g1.progresoPropio === null, 'progreso(null) deja de mandarlo');
}

// ---------- 5. Fogata (parte pura) ----------
{
    const d = Fo.datosFogata(null);
    ok(d.cupo === 8 && d.asientos.length === 8, 'sin JSON: 8 asientos del código');
    ok(Object.keys(d.frases).length <= 4, 'como mucho 4 frases (teclas 1-4)');
    for (const [k, o] of Object.entries({ ...Fo.FOGATA_BASE.textos, ...Fo.FOGATA_BASE.frases })) ok(o.es && o.en, `texto ${k} con ES y EN`);
    const j = Fo.datosFogata({ cupo: 12, radioOir: 20, asientos: [{ dx: 1, dz: 0, tipo: 'tronco' }, { dx: 0, dz: 2, tipo: 'raro' }] });
    ok(j.cupo === 2 && j.radioOir === 20, 'el cupo no pasa del número de asientos; lo del JSON manda');
    ok(j.asientos[1].tipo === 'suelo', 'un tipo desconocido queda en el suelo');
    const fuego = { x: 10, y: 5, z: -4 };
    const as = Fo.asientosMundo(fuego, d);
    for (const a of as) {
        const vx = -Math.sin(a.yaw), vz = -Math.cos(a.yaw); // hacia donde mira (jugador.js)
        const fx = fuego.x - a.x, fz = fuego.z - a.z, l = Math.hypot(fx, fz);
        ok(Math.abs(vx - fx / l) < 1e-9 && Math.abs(vz - fz / l) < 1e-9, `el asiento ${a.i} mira al fuego`);
    }
    const a0 = as[0];
    ok(Fo.asientoCercano(a0.x + 0.3, a0.z, as, new Set(), 1.4) === a0, 'el asiento más cercano');
    ok(Fo.asientoCercano(a0.x + 0.3, a0.z, as, new Set([0]), 1.4)?.i !== 0, 'uno ocupado no se ofrece');
    ok(Fo.asientoCercano(fuego.x + 50, fuego.z, as, new Set(), 1.4) === null, 'lejos: ninguno');
    // Los asientos del código no caen donde se sientan Hadad, Nacho y Andy (posiciones.json, desde el fuego)
    const npc = [[-2.65, 0.5], [2.65, 0.5], [0.8, 2.1]];
    ok(d.asientos.every(a => npc.every(([x, z]) => Math.hypot(a.dx - x, a.dz - z) > 0.9)), 'los asientos no pisan a los amigos del campamento');
}

// ---------- 6. Cableado ----------
{
    const coop = readFileSync(resolve(raiz, 'mundo/supervivencia/coop.js'), 'utf8');
    ok(/m\.ax = ax/.test(coop) && /ctx\.alProgreso\(m\.de, m\.ax \|\| null\)/.test(coop), 'coop.js manda y recibe el `ax` del `p`');
    ok(/b\.f & 256/.test(coop) && /b\.f & 1024/.test(coop), 'coop.js pasa tronco, cuclillas y calentar al cuerpo de los demás');
    const main = readFileSync(resolve(raiz, 'mundo/supervivencia/main.js'), 'utf8');
    ok(/reloj: \(\) => coop\.relojAnfitrion\(\)/.test(main), 'main.js da el reloj del anfitrión a las actividades');
    const indice = JSON.parse(readFileSync(resolve(raiz, 'mundo/datos/indice.json'), 'utf8'));
    ok(indice.archivos ? !!indice.archivos.actividades : JSON.stringify(indice).includes('"actividades"'), 'actividades.json está en el índice');
}

console.log(fallos ? `actividades: ${fallos} de ${cuenta} fallan` : `actividades: ${cuenta}/${cuenta} bien`);
process.exit(fallos ? 1 : 0);
