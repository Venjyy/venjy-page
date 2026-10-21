// =========================================================
// Balance de la arena (bloque 8 · L6a): node mundo/tests/arena-balance.mjs [combates]
// La CPU contra la CPU (combate/ia.js, dificultad normal) en arena/modelo.js sin animar (la lógica no lee las poses),
// con mundo/COMBATE.md §19.8: en cada combinación de estilos, ningún estilo gana más del 60 % de los combates.
//   · Urban Reign contra Sekiro y Sekiro contra Urban Reign (los dos lados: f[0] siempre a la izquierda)
//   · espejos (Urban Reign contra Urban Reign, Sekiro contra Sekiro): ningún lado gana más del 60 %
// Un combate es una pelea entera (mejor de arena.json → rondas.mejorDe) con su propia semilla; el empate (por tiempo
// con la misma vida) no cuenta para nadie. 400 combates por combinación (o los del argumento, para probar rápido).
// Imprime la tabla y la duración media de las rondas (para ver que nadie gana por tiempo siempre).
// Estilo contra estilo: desde L6b (arte especial que rompe la reacción, Furia, agarres y la barrida como «barrido»)
// se exige igual que los espejos; con --informar solo se informa (para probar cambios de balance a medias). Los espejos
// y que haya KO se exigen siempre.
// =========================================================
import { pathToFileURL, fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { readFileSync } from 'fs';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '../../');
const imp = p => import(pathToFileURL(resolve(raiz, p)).href);
const leer = n => JSON.parse(readFileSync(resolve(raiz, 'mundo/datos', n + '.json'), 'utf8'));

let fallos = 0, pruebas = 0;
const ok = (cond, msg) => { pruebas++; if (!cond) { console.error('FALLO: ' + msg); fallos++; } };

const D = await imp('mundo/supervivencia/combate/datos.js');
const L = await imp('mundo/datos/limites.js');
const M = await imp('mundo/supervivencia/arena/modelo.js');
D.fijarCombate(leer('combate'));
L.fijarLimites(leer('poses').limites);
const ARENA = leer('arena');
const estilos = { urbano: leer('estilo-urbano'), sekiro: leer('estilo-sekiro'), prueba: leer('estilo-prueba') };
const N = Math.max(1, parseInt(process.argv[2], 10) || 400), TOPE = 0.6;
const ESTRICTO = !process.argv.includes('--informar'); // (desde L6b; --estricto se acepta por compatibilidad)
const HZ = D.COMBATE.motor.hz;

// Lalo y Moisés con el estilo que toque (los dos con la misma vida de arena.json)
function reglas(e0, e1) {
    const P = ARENA.peleadores;
    return M.reglasArena({ ...ARENA, peleadores: { ...P, lalo: { ...P.lalo, estilo: e0 }, moises: { ...P.moises, estilo: e1, vida: P.lalo.vida } } });
}
function combate(R, semilla) {
    const P = M.nuevaPelea(R, { estilos, semilla, dificultad: 'normal', yo: 'lalo', rival: 'moises', sinAnimar: true });
    let n = 0; while (!P.listaEntrada && n++ < 2000) M.pasoPelea(P, []);
    M.empezarRondas(P);
    const rondas = [];
    let c = 0, inicio = 0;
    const tope = HZ * (R.rondas.segundos + R.rondas.anuncio + R.rondas.peleen + R.rondas.finRonda + 2) * R.rondas.maxRondas;
    while (P.fase !== 'final' && c++ < tope) {
        const it = P.fase === 'pelea' ? [M.intencionCPU(P, 0), M.intencionCPU(P, 1)] : [];
        M.pasoPelea(P, it);
        for (const e of P.eventos) {
            if (e.tipo === 'peleen') inicio = c;
            if (e.tipo === 'ko' || e.tipo === 'tiempo') rondas.push({ como: e.tipo, cuadros: c - inicio });
        }
    }
    return { ganador: P.ganador, rondas };
}

const combinaciones = [['urbano', 'sekiro'], ['sekiro', 'urbano'], ['urbano', 'urbano'], ['sekiro', 'sekiro']];
const t0 = Date.now(), tabla = {};
for (const [a, b] of combinaciones) {
    const R = reglas(a, b), g = [0, 0], r = { ko: 0, tiempo: 0, cuadros: 0, n: 0 };
    let empates = 0;
    for (let s = 1; s <= N; s++) {
        const x = combate(R, 1000 + s * 7919);
        if (x.ganador === 0 || x.ganador === 1) g[x.ganador]++; else empates++;
        for (const q of x.rondas) { r[q.como]++; r.cuadros += q.cuadros; r.n++; }
    }
    const jugados = g[0] + g[1];
    tabla[a + '-' + b] = { g, empates, jugados, ko: r.ko, tiempo: r.tiempo, segundos: r.n ? r.cuadros / r.n / HZ : 0 };
    console.log(`  ${a} (izq.) contra ${b}: ${g[0]} - ${g[1]} (${empates} empates) · rondas: ${r.ko} KO, ${r.tiempo} por tiempo, ${(r.n ? r.cuadros / r.n / HZ : 0).toFixed(1)} s de media`);
}
console.log(`  ${N} combates por combinación en ${((Date.now() - t0) / 1000).toFixed(1)} s`);

// Estilo contra estilo (los dos lados juntos)
{
    const us = tabla['urbano-sekiro'], su = tabla['sekiro-urbano'];
    const urbano = us.g[0] + su.g[1], sekiro = us.g[1] + su.g[0], total = urbano + sekiro;
    const cruce = (cond, msg) => (ESTRICTO ? ok(cond, msg) : console.log(`  ${cond ? 'bien' : 'FUERA (solo se informa)'}: ${msg}`));
    cruce(total > 0 && urbano / total <= TOPE && sekiro / total <= TOPE, `Urban Reign contra Sekiro: ninguno sobre el 60 % (Urban Reign ${(100 * urbano / total).toFixed(1)} %, Sekiro ${(100 * sekiro / total).toFixed(1)} %)`);
    // Y en cada lado por separado (que no dependa de quién está a la izquierda)
    for (const [k, x] of [['urbano-sekiro', us], ['sekiro-urbano', su]]) {
        cruce(x.jugados > 0 && Math.max(...x.g) / x.jugados <= TOPE, `${k}: ninguno sobre el 60 % (${x.g.join(' - ')})`);
    }
}
for (const k of ['urbano-urbano', 'sekiro-sekiro']) {
    const x = tabla[k];
    ok(x.jugados > 0 && Math.max(...x.g) / x.jugados <= TOPE, `espejo ${k}: ningún lado sobre el 60 % (${x.g.join(' - ')})`);
}
for (const [k, x] of Object.entries(tabla)) ok(x.ko > 0, `${k}: hay rondas que terminan por KO (${x.ko} KO, ${x.tiempo} por tiempo)`);

console.log(fallos ? `arena-balance: ${fallos} de ${pruebas} pruebas fallaron` : `arena-balance: ${pruebas} pruebas OK`);
process.exit(fallos ? 1 : 0);
