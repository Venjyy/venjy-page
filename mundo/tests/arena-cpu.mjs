// =========================================================
// CPU peleador (bloque 8 · L4): node mundo/tests/arena-cpu.mjs
// Cubre combate/ia.js con arena/modelo.js (mundo/COMBATE.md §15.7 y §19.6), con Lalo (Sekiro) y Moisés (prueba):
//   1. Determinista: la misma semilla y tus mismas teclas dan la misma pelea; otra semilla, otra
//   2. Anticipación mínima: cada ataque suyo tarda en llegar al activo al menos max(anticipación × la de la
//      dificultad, 8 c; 14 c los peligrosos)
//   3. Nunca empieza un ataque durante tu hitstop
//   4. No repite el mismo ataque más de 3 veces seguidas (Moisés solo tiene un tajo)
//   5. Retraso humano: en normal (ve 16 c tarde) nunca desvía un tajo1 suelto (9 c de anticipación); en maestro (8 c)
//      sí; y cuanto más difícil, más desvía
//   6. Respiro: después de una cadena (o un peligroso) espera al menos respiro.cuadros[0] antes de atacar de nuevo
//   7. Solo ataca con el rival a su alcance; tira peligrosos y tajos retrasados (anticipación más larga)
// =========================================================
import { pathToFileURL, fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { readFileSync } from 'fs';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '../../');
const imp = p => import(pathToFileURL(resolve(raiz, p)).href);
const leer = n => JSON.parse(readFileSync(resolve(raiz, 'mundo/datos', n + '.json'), 'utf8'));

let fallos = 0, pruebas = 0;
const ok = (cond, msg) => { pruebas++; if (!cond) { if (fallos < 40) console.error('FALLO: ' + msg); fallos++; } };

const D = await imp('mundo/supervivencia/combate/datos.js');
const L = await imp('mundo/datos/limites.js');
const E = await imp('mundo/supervivencia/combate/estados.js');
const M = await imp('mundo/supervivencia/arena/modelo.js');
const I = await imp('mundo/supervivencia/combate/ia.js');

const COMB = leer('combate'), POSES = leer('poses');
D.fijarCombate(COMB);
L.fijarLimites(POSES.limites);
const SK = leer('estilo-sekiro'), PRUEBA = leer('estilo-prueba'), ARENA = leer('arena');
const HZ = D.COMBATE.motor.hz;
const estilos = { sekiro: SK, prueba: PRUEBA, urbano: leer('estilo-urbano') };
// (L4 se probó con Moisés en el estilo de prueba; su Urban Reign se prueba en estilo-urbano.mjs)
const R = M.reglasArena({ ...ARENA, peleadores: { ...ARENA.peleadores, moises: { ...ARENA.peleadores.moises, estilo: 'prueba' } } });

// Tú eres Moisés (f[0]) y la CPU es Lalo (f[1]); o al revés con yo/rival
function enPelea({ semilla = 3, dificultad = 'normal', yo = 'moises', rival = 'lalo' } = {}) {
    const P = M.nuevaPelea(R, { estilos, semilla, dificultad, yo, rival });
    let n = 0; while (!P.listaEntrada && n++ < 2000) M.pasoPelea(P, []);
    M.empezarRondas(P);
    n = 0; while (P.fase !== 'pelea' && n++ < 2000) M.pasoPelea(P, []);
    return P;
}
// Tu guion: cada `cada` cuadros una cadena de `golpes` clics (cada 6 c); nadie muere
const guion = (cada = 100, golpes = 2) => i => (i % cada < golpes * 6 && i % 6 === 0 ? { atacar: 'apretar' } : {});
function pelear(P, cuadros, tu, medir = () => {}) {
    const ataques = [];
    for (let i = 0; i < cuadros && P.fase === 'pelea'; i++) {
        P.f[0].vida = P.f[0].vidaMax; P.f[1].vida = P.f[1].vidaMax;
        const antes = { congelado: P.f[0].p.congelado, quieto: P.f[0].p.quieto, d: Math.hypot(P.f[1].x - P.f[0].x, P.f[1].z - P.f[0].z), estado: P.f[1].p.estado };
        const it = M.intencionCPU(P, 1);
        M.pasoPelea(P, [tu(i, P), it]);
        for (const e of P.f[1].p.eventos) {
            const d = D.accionDe(P.f[1].p.estilo, e.clave);
            if (e.tipo === 'inicio' && d && d.estado === 'ataque') ataques.push({ i, clave: e.clave, def: d, antes });
            if (e.tipo === 'activo') { const a = ataques.findLast(x => x.clave === e.clave && x.activo == null); if (a) a.activo = i; }
        }
        medir(P, i, antes);
    }
    return ataques;
}
const huella = a => a.map(x => x.i + x.clave).join(',');

// ---------- 1. Determinista ----------
{
    const a = pelear(enPelea({ semilla: 7 }), HZ * 30, guion());
    const b = pelear(enPelea({ semilla: 7 }), HZ * 30, guion());
    const c = pelear(enPelea({ semilla: 8 }), HZ * 30, guion());
    ok(a.length > 5, `la CPU ataca (${a.length} ataques en 30 s)`);
    ok(huella(a) === huella(b), 'con la misma semilla hace lo mismo');
    ok(huella(a) !== huella(c), 'con otra semilla, otra pelea');
    // Su azar es propio: crearCPU con la misma semilla da los mismos dados
    const s1 = I.crearCPU(I.reglasCPU({}, SK), 5), s2 = I.crearCPU(I.reglasCPU({}, SK), 5);
    ok(s1.rnd() === s2.rnd(), 'crearCPU: misma semilla, mismos dados');
}

// ---------- 2. Anticipación mínima (por dificultad) ----------
for (const dificultad of ['facil', 'normal', 'maestro']) {
    const Rc = I.reglasCPU(R.cpu, SK, dificultad);
    const a = pelear(enPelea({ semilla: 11, dificultad }), HZ * 40, guion(140, 1));
    let malos = 0, vistos = 0;
    for (const x of a) {
        if (x.activo == null) continue;
        vistos++;
        const ant = D.inicioFase(x.def.fases, 'activo');
        const min = Math.max(Math.round(ant * Rc.dif.anticipacion), x.def.peligro ? Rc.minimo.peligroso : Rc.minimo.normal);
        if (x.activo - x.i < min) { malos++; if (malos < 3) console.error(`  ${dificultad} ${x.clave}: ${x.activo - x.i} c < ${min}`); }
    }
    ok(vistos > 3 && malos === 0, `${dificultad}: ninguno de sus ${vistos} ataques llega antes de su anticipación mínima`);
}
{
    // Sostener: un tajo1 (9 c) con sostener 10 llega al activo en 19 c
    const p = E.crearPeleador(SK);
    E.paso(p, { atacar: 'apretar' });
    let n = 0; E.paso(p, { sostener: 10 });
    while (p.c < D.inicioFase(p.def.fases, 'activo') && n++ < 100) E.paso(p, {});
    ok(n + 1 === 9 + 10, `sostener alarga la anticipación (${n + 1} c)`);
}

// ---------- 3. Nunca ataca durante tu hitstop ----------
{
    let en = 0, total = 0;
    for (const semilla of [1, 2, 3]) {
        const a = pelear(enPelea({ semilla, dificultad: 'maestro' }), HZ * 30, guion(60, 3));
        total += a.length;
        en += a.filter(x => x.antes.congelado > 0).length;
    }
    ok(total > 10 && en === 0, `ninguno de sus ${total} ataques empieza en tu hitstop (${en})`);
}

// ---------- 4. No repite más de 3 veces ----------
for (const [yo, rival] of [['lalo', 'moises'], ['moises', 'lalo']]) {
    const a = pelear(enPelea({ semilla: 4, dificultad: 'dificil', yo, rival }), HZ * 60, guion(150, 1));
    let racha = 1, peor = 1;
    for (let k = 1; k < a.length; k++) { racha = a[k].clave === a[k - 1].clave ? racha + 1 : 1; peor = Math.max(peor, racha); }
    ok(a.length > 8 && peor <= 3, `${rival}: nunca repite un ataque más de 3 veces (peor racha ${peor} en ${a.length})`);
}

// ---------- 5. Retraso humano ----------
{
    // Tus tajo1 sueltos (desde la guardia, cada 75 c): ¿cuántos desvía?
    const desvios = dificultad => {
        let n = 0, sueltos = 0;
        for (const semilla of [21, 22, 23, 24]) {
            const P = enPelea({ semilla, dificultad });
            pelear(P, HZ * 30, (i, P) => (i % 75 === 0 && E.LIBRES.has(P.f[0].p.estado) ? { atacar: 'apretar' } : {}), P2 => {
                for (const e of P2.f[0].p.eventos) if (e.tipo === 'inicio' && e.clave === 'tajo') sueltos++;
                for (const e of P2.eventos) if (e.tipo === 'golpe' && e.de === 0 && (e.resultado === 'desviado' || e.resultado === 'perfecto')) n++;
            });
        }
        return { n, sueltos };
    };
    const g = D.inicioFase(PRUEBA.ataques[PRUEBA.controles.atacar].fases, 'activo');
    const Rn = I.reglasCPU(R.cpu, SK, 'normal'), Rm = I.reglasCPU(R.cpu, SK, 'maestro'), Rf = I.reglasCPU(R.cpu, SK, 'facil');
    ok(Rf.dif.retraso > Rn.dif.retraso && Rn.dif.retraso > Rm.dif.retraso, 'el retraso baja con la dificultad (fácil > normal > maestro)');
    const nor = desvios('normal'), mae = desvios('maestro');
    ok(Rn.dif.retraso >= g && nor.sueltos > 10 && nor.n === 0, `normal: no desvía ninguno de tus ${nor.sueltos} tajos sueltos de ${g} c (los ve ${Rn.dif.retraso} c tarde; ${nor.n})`);
    ok(Rm.dif.retraso < g && mae.n > 0, `maestro: desvía tajos sueltos (${mae.n} de ${mae.sueltos})`);
    // En cadena (el combo de Lalo contra Moisés) lee tu ritmo: cuanto más difícil, más desvía
    const enCadena = dificultad => {
        let n = 0;
        for (const semilla of [31, 32, 33]) pelear(enPelea({ semilla, dificultad, yo: 'lalo', rival: 'moises' }), HZ * 30, guion(70, 3), P2 => {
            for (const e of P2.eventos) if (e.tipo === 'golpe' && e.de === 0 && (e.resultado === 'desviado' || e.resultado === 'perfecto')) n++;
        });
        return n;
    };
    const cf = enCadena('facil'), cn = enCadena('normal'), cm = enCadena('maestro');
    ok(cf < cn && cn < cm, `en cadena desvía más con más dificultad (fácil ${cf}, normal ${cn}, maestro ${cm})`);
}

// ---------- 6. Respiro tras la cadena ----------
{
    const Rc = I.reglasCPU(R.cpu, SK, 'normal');
    const P = enPelea({ semilla: 9 });
    let ultimoFin = -1, malos = 0, n = 0;
    pelear(P, HZ * 40, guion(200, 1), (P2, i, antes) => {
        const F = P2.f[1].p;
        if (antes.estado === 'ataque' && E.LIBRES.has(F.estado)) ultimoFin = i;
        for (const e of F.eventos) {
            const d = D.accionDe(F.estilo, e.clave);
            if (e.tipo === 'inicio' && d && d.estado === 'ataque' && ultimoFin >= 0) { n++; if (i - ultimoFin < Rc.e.respiro.cuadros[0]) malos++; ultimoFin = -1; }
        }
    });
    ok(n > 3 && malos === 0, `después de cada cadena respira al menos ${Rc.e.respiro.cuadros[0]} c (${n} cadenas, ${malos} sin respiro)`);
}

// ---------- 7. Alcance, peligrosos y tajos retrasados ----------
{
    const a = [];
    for (const semilla of [41, 42]) a.push(...pelear(enPelea({ semilla, dificultad: 'dificil' }), HZ * 60, guion(160, 1)));
    const lejos = a.filter(x => x.antes.d > (x.def.alcance || 0));
    ok(lejos.length === 0, `empieza cada ataque con el rival a su alcance (${lejos.map(x => x.clave + ' ' + x.antes.d.toFixed(2)).slice(0, 3).join(', ')})`);
    ok(a.some(x => x.def.peligro), `tira peligrosos (${[...new Set(a.filter(x => x.def.peligro).map(x => x.clave))].join(', ')})`);
    const Rc = I.reglasCPU(R.cpu, SK, 'dificil');
    const retrasados = a.filter(x => x.activo != null && !x.def.peligro && x.activo - x.i >= Math.max(D.inicioFase(x.def.fases, 'activo'), Rc.minimo.normal) + Rc.e.retrasado.cuadros[0]);
    ok(retrasados.length > 0, `tira tajos retrasados (${retrasados.length})`);
    // Moisés (sin tabla propia) usa los peligrosos de su estilo
    const b = pelear(enPelea({ semilla: 43, dificultad: 'dificil', yo: 'lalo', rival: 'moises' }), HZ * 60, guion(160, 1));
    ok(b.some(x => x.def.peligro), 'sin lista en su estilo, la CPU usa los ataques con peligro');
}

console.log(fallos ? `arena-cpu: ${fallos} de ${pruebas} pruebas fallaron` : `arena-cpu: ${pruebas} pruebas OK`);
process.exit(fallos ? 1 : 0);
