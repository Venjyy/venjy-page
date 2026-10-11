// =========================================================
// Prueba del Duelo de Cartas Pixel (bloque 7h-2a, sin navegador)
// Ejecutar: node mundo/tests/cartas.mjs
//
// Cubre supervivencia/cartas.js y cartas-datos.js:
//   1. datos: mazos de 15 con cartas que existen, ES/EN en todo, textos únicos y sin emojis
//   2. reglas: reparto, robo, invocación (1 por turno), combate ATK/ATK y ATK/DEF, sin ataque el turno 1
//   3. efectos y combos: horda en cadena, flecha, telaraña, robar, barco, pesca, extra, explota, guardián, vuela, racha
//   4. fin de partida: vida en 0, mazo vacío al robar, tope de turnos
//   5. IA fácil y media: siempre jugada legal; 200 partidas terminan; medio le gana a fácil la mayoría
//   6. tutorial: los pasos y los turnos de Lucho calzan con jugadas legales y terminan en victoria
// Sale con código 0 si todo coincide, 1 si no.
// =========================================================
import { pathToFileURL, fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '../../');
const importar = r => import(pathToFileURL(resolve(raiz, r)).href);
const C = await importar('mundo/supervivencia/cartas.js');
const D = await importar('mundo/supervivencia/cartas-datos.js');

let fallos = 0;
const ok = (c, msg) => { if (!c) { fallos++; console.log('FALLA:', msg); } };

// ---- 1. Datos ----
for (const [k, m] of Object.entries(D.MAZOS)) {
    ok(m.length === 15, `mazo ${k} de 15`);
    ok(m.every(id => D.CARTAS[id]), `mazo ${k}: cartas que existen`);
}
for (const m of D.TUTORIAL.mazos) ok(m.length === 15 && m.every(id => D.CARTAS[id]), 'mazos del tutorial válidos');
const textos = [];
const juntar = o => {
    if (!o || typeof o !== 'object') return;
    if ('es' in o && 'en' in o) { ok(o.es && o.en, 'par ES/EN completo'); textos.push(o.es, o.en); return; }
    for (const v of Object.values(o)) juntar(v);
};
juntar(D.CARTAS); juntar(D.TXT_CARTAS); juntar({ p: D.TUTORIAL.pasos.map(p => p.texto), i: D.TUTORIAL.intro, l: D.TUTORIAL.turnoLucho, f: D.TUTORIAL.fin, o: D.TUTORIAL.otra });
const rep = textos.filter((s, i) => textos.indexOf(s) !== i);
ok(!rep.length, 'textos únicos: ' + rep.join(' | '));
ok(!textos.some(s => /\p{Extended_Pictographic}/u.test(s)), 'sin emojis');
ok(D.TXT_CARTAS.reglas.length === 6, 'reglas en 6 líneas');
ok(D.TUTORIAL.pasos.filter(p => p.paso).map(p => p.paso).join() === '1,2,3,4,5', 'tutorial: 5 pasos en orden');

// ---- utilidades ----
// Partida sin barajar con manos y mazos a medida
function partida(manos, { mazos = [[], []], vidas, empieza = 0 } = {}) {
    const relleno = Array(15).fill('zombi');
    const e = C.nuevaPartida({ mazos: [relleno, relleno], barajar: false, vidas, empieza });
    for (let j = 0; j < 2; j++) { e.jug[j].mano = manos[j].slice(); e.jug[j].mazo = mazos[j].slice(); }
    return e;
}
const poner = (e, j, z, id, extra = {}) => { const c = D.CARTAS[id]; e.jug[j].zonas[z] = { id, atk: c.atk, def: c.def, bono: 0, modo: 'ata', nueva: false, ataques: 1, ataco: 0, atada: 0, cambio: false, racha: false, ...extra }; };
const tiene = (lista, a) => lista.some(b => JSON.stringify(b) === JSON.stringify(a));
const principal = e => { e.fase = 'principal'; e.n = 3; };

// ---- 2. Reglas ----
{
    const e = C.nuevaPartida({ mazos: [D.MAZOS.jugador, D.MAZOS.facil], semilla: 7 });
    ok(e.jug[0].mano.length === 3 && e.jug[0].mazo.length === 12 && e.jug[0].vida === 2000, 'reparto 3 + 12, 2000 de vida');
    const e2 = C.nuevaPartida({ mazos: [D.MAZOS.jugador, D.MAZOS.facil], semilla: 7 });
    ok(JSON.stringify(e) === JSON.stringify(e2), 'misma semilla, misma partida');
    ok(C.jugadas(e).length === 1 && C.jugadas(e)[0].t === 'robar', 'fase robo: solo robar');
    C.aplicar(e, { t: 'robar' });
    ok(e.jug[0].mano.length === 4 && e.fase === 'principal', 'robar suma 1 y pasa a principal');
    let ilegal = false; try { C.aplicar(e, { t: 'robar' }); } catch { ilegal = true; }
    ok(ilegal, 'jugada ilegal lanza error');
}
{ // una invocación por turno; turno 1 sin ataques; la recién invocada no ataca
    const e = partida([['esqueleto', 'creeper'], []], { mazos: [['zombi'], ['zombi']] });
    C.aplicar(e, { t: 'robar' });
    C.aplicar(e, { t: 'invocar', m: 0, z: 0, modo: 'ata' });
    ok(!C.jugadas(e).some(a => a.t === 'invocar'), 'solo una invocación por turno');
    poner(e, 0, 1, 'boris');
    ok(!C.jugadas(e).some(a => a.t === 'atacar'), 'nadie ataca en el turno 1');
    e.n = 3;
    ok(!C.jugadas(e).some(a => a.t === 'atacar' && a.z === 0), 'la recién invocada no ataca');
    ok(tiene(C.jugadas(e), { t: 'atacar', z: 1, obj: -1 }), 'mesa rival vacía: ataque directo');
}
{ // ATK contra ATK, contra DEF y empate
    const e = partida([[], []]); principal(e);
    poner(e, 0, 0, 'boris'); poner(e, 1, 0, 'trauco');
    C.aplicar(e, { t: 'atacar', z: 0, obj: 0 });
    ok(!e.jug[1].zonas[0] && e.jug[1].vida === 1700, '1100 contra 800: cae y baja 300');
    const f = partida([[], []]); principal(f);
    poner(f, 0, 0, 'trauco'); poner(f, 1, 0, 'imbunche', { modo: 'def' });
    C.aplicar(f, { t: 'atacar', z: 0, obj: 0 });
    ok(f.jug[1].zonas[0] && f.jug[0].vida === 1600 && f.jug[1].vida === 2000, 'contra DEF mayor: el atacante pierde la diferencia');
    const g = partida([[], []]); principal(g);
    poner(g, 0, 0, 'trauco'); poner(g, 1, 0, 'arana', { modo: 'def' });
    C.aplicar(g, { t: 'atacar', z: 0, obj: 0 });
    ok(!g.jug[1].zonas[0] && g.jug[1].vida === 2000, 'contra DEF menor: muere sin daño a la vida');
    const h = partida([[], []]); principal(h);
    poner(h, 0, 0, 'esqueleto'); poner(h, 1, 0, 'venjy');
    C.aplicar(h, { t: 'atacar', z: 0, obj: 0 });
    ok(!h.jug[0].zonas[0] && !h.jug[1].zonas[0], 'empate: caen las dos');
    ok(!C.jugadas(h).some(a => a.t === 'atacar'), 'sin criaturas no hay ataques');
}
{ // postura: una vez por turno, no si atacó
    const e = partida([[], []]); principal(e);
    poner(e, 0, 0, 'trauco');
    C.aplicar(e, { t: 'modo', z: 0 });
    ok(e.jug[0].zonas[0].modo === 'def' && !C.jugadas(e).some(a => a.t === 'modo'), 'cambia postura una vez');
    ok(!C.jugadas(e).some(a => a.t === 'atacar'), 'en defensa no ataca');
}

// ---- 3. Efectos y combos ----
{ // horda en cadena + extra
    const e = partida([['venjy', 'zombi', 'zombi', 'zombi'], []]); principal(e);
    C.aplicar(e, { t: 'invocar', m: 0, z: 0, modo: 'ata' });
    ok(e.invoc === 1, 'Venjy da una invocación más');
    const ev = C.aplicar(e, { t: 'invocar', m: 0, z: 1, modo: 'ata' });
    ok(e.jug[0].zonas[2]?.id === 'zombi' && e.jug[0].mano.length === 1, 'horda: el otro Zombi entra solo hasta llenar las zonas');
    ok(ev.filter(x => x.t === 'invoca' && x.gratis).length === 1, 'evento de invocación gratis');
}
{ // flecha, robar, pesca
    const e = partida([['esqueleto'], []]); principal(e);
    C.aplicar(e, { t: 'invocar', m: 0, z: 0, modo: 'ata' });
    ok(e.jug[1].vida === 1800, 'flecha: 200 al rival');
    const f = partida([['trauco'], []], { mazos: [['rayo', 'zombi'], []] }); principal(f);
    C.aplicar(f, { t: 'invocar', m: 0, z: 0, modo: 'ata' });
    ok(f.jug[0].mano.join() === 'rayo', 'Trauco roba 1');
    const g = partida([['pony'], []], { mazos: [['zombi', 'curar', 'rayo'], []] }); principal(g);
    C.aplicar(g, { t: 'invocar', m: 0, z: 0, modo: 'ata' });
    ok(g.jug[0].mano.join() === 'curar' && g.jug[0].mazo.join() === 'zombi,rayo', 'Pony pesca el primer hechizo');
}
{ // telaraña y barco piden objetivo
    const e = partida([['arana', 'caleuche'], []], { mazos: [['zombi'], ['zombi']] }); principal(e);
    poner(e, 1, 2, 'boris');
    ok(C.jugadas(e).filter(a => a.t === 'invocar').every(a => a.obj === 2), 'telaraña y barco eligen criatura rival');
    C.aplicar(e, { t: 'invocar', m: 0, z: 0, modo: 'ata', obj: 2 });
    ok(e.jug[1].zonas[2].atada === 1, 'telaraña ata');
    C.aplicar(e, { t: 'terminar' }); C.aplicar(e, { t: 'robar' });
    ok(!C.jugadas(e).some(a => a.t === 'atacar' && a.z === 2), 'atada: no ataca en su turno');
    C.aplicar(e, { t: 'terminar' });
    ok(e.jug[1].zonas[2].atada === 0, 'la telaraña se suelta al terminar su turno');
    C.aplicar(e, { t: 'robar' });
    C.aplicar(e, { t: 'invocar', m: 0, z: 1, modo: 'ata', obj: 2 });
    ok(!e.jug[1].zonas[2] && e.jug[1].mano.includes('boris'), 'barco: vuelve a la mano de su dueño');
    const f = partida([['caleuche'], []]); principal(f);
    ok(tiene(C.jugadas(f), { t: 'invocar', m: 0, z: 0, modo: 'ata' }), 'sin rivales se invoca igual (el efecto no hace nada)');
}
{ // explota, guardián, vuela, racha
    const e = partida([[], []]); principal(e);
    poner(e, 0, 0, 'creeper'); poner(e, 1, 0, 'imbunche');
    C.aplicar(e, { t: 'atacar', z: 0, obj: 0 });
    ok(!e.jug[0].zonas[0] && !e.jug[1].zonas[0], 'Creeper explota y se lleva al rival');
    const f = partida([[], []]); principal(f);
    poner(f, 0, 0, 'boris'); poner(f, 0, 1, 'chonchon'); poner(f, 1, 0, 'zombi'); poner(f, 1, 1, 'imbunche');
    const ob = C.objetivos(f, 0);
    ok(ob.join() === '1', 'guardián: hay que atacarlo primero');
    ok(C.objetivos(f, 1).includes(-1) && C.objetivos(f, 1).includes(0), 'vuela: ataca directo o a cualquiera');
    const g = partida([[], []]); principal(g);
    poner(g, 0, 0, 'boris'); poner(g, 1, 0, 'zombi'); poner(g, 1, 1, 'esqueleto');
    C.aplicar(g, { t: 'atacar', z: 0, obj: 0 });
    ok(C.objetivos(g, 0).length > 0, 'racha: Boris ataca otra vez');
    C.aplicar(g, { t: 'atacar', z: 0, obj: 1 });
    ok(C.objetivos(g, 0).length === 0, 'racha solo una vez');
}
{ // hechizos
    const e = partida([['poder', 'rayo', 'curar'], []]); principal(e);
    ok(!C.jugadas(e).some(a => a.t === 'hechizo' && a.m < 2), 'sin objetivos no hay Poción ni Rayo');
    poner(e, 0, 0, 'trauco'); poner(e, 1, 0, 'boris');
    C.aplicar(e, { t: 'hechizo', m: 0, obj: 0 });
    ok(C.atkDe(e.jug[0].zonas[0]) === 1300, 'Poción +500');
    C.aplicar(e, { t: 'hechizo', m: 0, obj: 0 });
    ok(!e.jug[1].zonas[0], 'Rayo destruye');
    C.aplicar(e, { t: 'hechizo', m: 0 });
    ok(e.jug[0].vida === 2500 && e.jug[0].desc.length === 3, 'curar +500 y los hechizos van al descarte');
}
{ // mano llena: la carta robada se quema
    const e = partida([['zombi', 'zombi', 'zombi', 'zombi', 'zombi', 'zombi'], []], { mazos: [['rayo'], []] });
    const ev = C.aplicar(e, { t: 'robar' });
    ok(e.jug[0].mano.length === 6 && e.jug[0].desc[0] === 'rayo' && ev[0].t === 'quema', 'mano llena: se quema');
}

// ---- 4. Fin de partida ----
{
    const e = partida([[], []], { vidas: [2000, 500] }); principal(e);
    poner(e, 0, 0, 'boris');
    const ev = C.aplicar(e, { t: 'atacar', z: 0, obj: -1 });
    ok(e.ganador === 0 && e.motivo === 'vida' && e.jug[1].vida === 0 && ev.at(-1).t === 'fin', 'vida en 0: gana');
    ok(C.jugadas(e).length === 0, 'terminada: sin jugadas');
    const f = partida([[], []]);
    C.aplicar(f, { t: 'robar' });
    ok(f.ganador === 1 && f.motivo === 'mazo', 'mazo vacío al robar: pierde');
    const g = partida([[], []], { mazos: [Array(60).fill('zombi'), Array(60).fill('zombi')], vidas: [1500, 1000] });
    for (let i = 0; i < 200 && g.ganador === null; i++) C.aplicar(g, g.fase === 'robo' ? { t: 'robar' } : { t: 'terminar' });
    ok(g.ganador === 0 && g.motivo === 'tope', 'tope de turnos: gana quien tiene más vida');
}

// ---- 5. IA ----
function jugarIA(n0, n1, semilla, empieza) {
    const e = C.nuevaPartida({ mazos: [D.MAZOS[n0 === 'medio' ? 'medio' : 'facil'], D.MAZOS[n1 === 'medio' ? 'medio' : 'jugador']], semilla, empieza });
    const nivel = [n0, n1];
    let pasos = 0, porTurno = 0, turno = e.n;
    while (e.ganador === null && pasos < 3000) {
        const a = C.jugadaIA(e, nivel[e.turno]);
        if (!a || !C.esLegal(e, a)) return { error: 'IA sin jugada legal' };
        C.aplicar(e, a); pasos++;
        if (e.n !== turno) { turno = e.n; porTurno = 0; } else if (++porTurno > 40) return { error: 'IA no termina su turno' };
    }
    return { e, pasos };
}
{
    let errores = 0, sinFin = 0, ganaMedio = 0, turnos = 0;
    for (let s = 1; s <= 100; s++) for (const [a, b] of [['facil', 'facil'], ['medio', 'facil']]) {
        const r = jugarIA(a, b, s, s % 2);
        if (r.error) { errores++; if (errores < 3) console.log(r.error, s, a, b); continue; }
        if (r.e.ganador === null) sinFin++;
        if (a === 'medio' && r.e.ganador === 0) ganaMedio++;
        turnos += r.e.n;
    }
    ok(!errores, 'IA: siempre jugada legal y termina sus turnos');
    ok(!sinFin, 'IA: todas las partidas terminan');
    ok(ganaMedio >= 60, `medio le gana a fácil la mayoría (${ganaMedio}/100)`);
    console.log(`IA: medio ganó ${ganaMedio}/100 contra fácil · ${(turnos / 200).toFixed(1)} turnos por partida`);
}

// ---- 6. Tutorial ----
{
    const T = D.TUTORIAL;
    const e = C.nuevaPartida({ mazos: T.mazos, barajar: false, vidas: T.vidas, empieza: 0 });
    let p = 0, l = 0, bien = true;
    while (e.ganador === null && bien) {
        if (e.turno === 0) {
            const paso = T.pasos[p++];
            const a = paso && C.accionTutorial(e, paso.a);
            if (!a) { bien = false; console.log('paso sin jugada', p - 1); break; }
            C.aplicar(e, a);
        } else {
            for (const esp of T.lucho[l++] || []) {
                const a = C.accionTutorial(e, esp);
                if (!a) { bien = false; console.log('turno de Lucho sin jugada', l - 1, esp); break; }
                C.aplicar(e, a);
            }
        }
    }
    ok(bien && e.ganador === 0 && p === T.pasos.length && l === T.lucho.length, 'tutorial: calza paso a paso y termina en victoria');
    ok(T.turnoLucho.length === T.lucho.length, 'una frase de Lucho por turno suyo');
}

console.log(fallos ? `${fallos} fallo(s)` : 'cartas: todo OK');
process.exit(fallos ? 1 : 0);
