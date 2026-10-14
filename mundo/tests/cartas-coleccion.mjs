// =========================================================
// Prueba de la colección y el mazo del Duelo (etapa A, punto 3, PR 1; sin navegador)
// Ejecutar: node mundo/tests/cartas-coleccion.mjs [--medir]
//
// Cubre supervivencia/cartas-coleccion.js, la mano por jugador de cartas.js y el guardado en inventario.js:
//   1. reglas y colección inicial: valores del código, del JSON y fuera de rango
//   2. validar un mazo: largo, copias, cartas que no tienes, fichas
//   3. mazo al azar: largo, copias, hechizos en rango, determinista, de tu colección o de todas; rellenar
//   4. partida: tu mazo armado, el de siempre, el al azar con cartas de más en la mano
//   5. guardado: inventario.serializar / cargar (guardado viejo sin colección queda igual)
//   --medir: IA media con el mazo de siempre vs. al azar (+1) contra Fácil y Medio (% de victorias y turnos)
// Sale con código 0 si todo coincide, 1 si no.
// =========================================================
import { pathToFileURL, fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { readFileSync } from 'fs';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '../../');
const importar = r => import(pathToFileURL(resolve(raiz, r)).href);
const K = await importar('mundo/supervivencia/cartas-coleccion.js');
const C = await importar('mundo/supervivencia/cartas.js');
const D = await importar('mundo/supervivencia/cartas-datos.js');
const { Inventario } = await importar('mundo/supervivencia/inventario.js');
const JSON_MESA = JSON.parse(readFileSync(resolve(raiz, 'mundo/datos/cartas-mesa.json'), 'utf8'));

let fallos = 0;
const ok = (c, msg) => { if (!c) { fallos++; console.log('FALLA:', msg); } };
const contar = m => m.reduce((o, id) => ((o[id] = (o[id] || 0) + 1), o), {});
const hechizos = m => m.filter(id => D.CARTAS[id].tipo === 'hechizo').length;

// ---- 1. Reglas y colección inicial ----
{
    const R = K.reglasDe(null);
    ok(R.largo === 25 && R.copias === 2 && R.azarExtra === 1, 'reglas del código: 25 cartas, 2 copias, +1 al azar');
    const J = K.reglasDe(JSON_MESA);
    for (const k of Object.keys(K.COLECCION)) ok(J[k] === JSON_MESA.coleccion[k], `JSON: coleccion.${k} se lee`);
    const raro = K.reglasDe({ coleccion: { largo: 999, copias: 0, hechizosMin: 9, hechizosMax: 2 } });
    ok(raro.largo === 40 && raro.copias === 1 && raro.hechizosMax === 9, 'valores fuera de rango se acotan');
    const ini = K.coleccionInicial(null);
    ok(!K.motivoMazo(D.MAZOS.jugador, ini, R), 'la colección inicial alcanza para el mazo de siempre');
    const iniJ = K.coleccionInicial(JSON_MESA);
    const orden = o => JSON.stringify(Object.entries(o).sort());
    ok(orden(iniJ) === orden(ini), 'coleccionInicial del JSON = la del código (los 0 no cuentan)');
    ok(!('nota' in iniJ) && Object.keys(iniJ).every(id => D.CARTAS[id] && !D.CARTAS[id].ficha), 'colección inicial: solo cartas jugables');
    ok(K.jugables().every(id => id in JSON_MESA.coleccionInicial), 'el JSON trae todas las cartas jugables (el dueño las sube desde 0)');
}

// ---- 2. Validar un mazo ----
{
    const R = K.reglasDe(null), col = K.coleccionInicial(null), m = D.MAZOS.jugador;
    ok(K.motivoMazo(m.slice(1), col, R) === 'largo', 'mazo corto: largo');
    ok(K.motivoMazo([...m.slice(3), 'poder', 'poder', 'poder'], { ...col, poder: 9 }, R) === 'copias', '3 copias: copias');
    ok(K.motivoMazo([...m.slice(1), 'chonchon'], col, R) === 'falta', 'carta que no tienes: falta');
    ok(K.motivoMazo([...m.slice(1), 'slimecito'], col, R) === 'carta', 'ficha: carta');
    ok(K.motivoMazo([...m.slice(1), 'nada'], col, R) === 'carta', 'carta que no existe: carta');
}

// ---- 3. Mazo al azar ----
{
    const R = K.reglasDe(null), col = K.coleccionInicial(null);
    let bien = true;
    for (let s = 1; s <= 200; s++) {
        const a = K.mazoAzar(null, R, s), n = contar(a), h = hechizos(a);
        if (a.length !== R.largo || Object.values(n).some(k => k > R.copias) || h < R.hechizosMin || h > R.hechizosMax || a.some(id => D.CARTAS[id].ficha)) bien = false;
    }
    ok(bien, 'al azar de todas: 25 cartas, máx. 2 copias, hechizos en rango, sin fichas (200 semillas)');
    ok(JSON.stringify(K.mazoAzar(null, R, 42)) === JSON.stringify(K.mazoAzar(null, R, 42)), 'al azar: misma semilla, mismo mazo');
    ok(JSON.stringify(K.mazoAzar(null, R, 42)) !== JSON.stringify(K.mazoAzar(null, R, 43)), 'al azar: otra semilla, otro mazo');
    const deCol = K.mazoAzar(col, R, 7);
    ok(!K.motivoMazo(deCol, col, R), 'al azar de tu colección: vale con tu colección');
    const base = ['boris', 'boris'], relleno = K.mazoAzar({ ...col, boris: 2 }, R, 9, base);
    ok(relleno.length === 25 && contar(relleno).boris === 2 && relleno[0] === 'boris', 'rellenar: guarda lo que ya iba y completa');
    const chica = K.mazoAzar({ boris: 1, rayo: 1 }, R, 3);
    ok(chica.length === 2, 'colección chica: el mazo al azar queda corto (no inventa cartas)');
}

// ---- 4. Partida ----
{
    const inv = new Inventario();
    const p0 = K.mazoParaPartida(inv, null, 5);
    ok(!inv.cartas && !p0.azar && p0.extra === 0 && JSON.stringify(p0.mazo) === JSON.stringify(D.MAZOS.jugador), 'sin colección: el mazo de siempre, sin crear nada');
    // Armar uno propio con una carta nueva
    K.sumarCarta(inv, 'chonchon', 1, null);
    ok(inv.cartas.c.chonchon === 1 && inv.cartas.c.boris === 1, 'sumar carta: parte de la colección inicial');
    const propio = [...D.MAZOS.jugador.filter(id => id !== 'boris'), 'chonchon'];
    ok(K.guardarMazo(inv, propio.slice(1), null) === 'largo' && inv.cartas.m === null, 'mazo inválido: no se guarda');
    ok(K.guardarMazo(inv, propio, null) === null, 'mazo válido: se guarda');
    const p1 = K.mazoParaPartida(inv, null, 5);
    ok(JSON.stringify(p1.mazo) === JSON.stringify(propio) && !p1.azar, 'partida: usa tu mazo armado');
    const e1 = C.partidaNivel('facil', { semilla: 5, mazo: p1.mazo, manoExtra: p1.extra });
    ok(e1.jug[0].mano.length === 4 && e1.jug[0].mano.length + e1.jug[0].mazo.length === 25, 'partida armada: mano de 4 y 25 cartas');
    // Al azar: +1 en la mano
    K.ponerAzar(inv, true, null);
    const p2 = K.mazoParaPartida(inv, null, 5), e2 = C.partidaNivel('medio', { semilla: 5, mazo: p2.mazo, manoExtra: p2.extra });
    ok(p2.azar && p2.extra === 1 && e2.jug[0].mano.length === 5 && e2.jug[1].mano.length === 4, 'al azar: tú 5 cartas en la mano, Lucho 4');
    const p3 = K.mazoParaPartida(inv, { coleccion: { azarTodas: 0 } }, 5);
    ok(p3.azar && !K.motivoMazo(p3.mazo, inv.cartas.c, K.reglasDe(null)), 'al azar de tu colección: vale con tu colección');
    const p4 = K.mazoParaPartida({ cartas: { c: { boris: 1 }, m: null, z: true } }, { coleccion: { azarTodas: 0 } }, 5);
    ok(!p4.azar && p4.mazo.length < 25, 'al azar sin cartas suficientes: vuelve al armado (sin bonus)');
    ok(C.nuevaPartida({ mazos: [D.MAZOS.jugador, D.MAZOS.medio], mano: 3 }).jug.every(J => J.mano.length === 3), 'mano como número sigue igual');
}

// ---- 5. Guardado ----
{
    const viejo = new Inventario();
    ok(!('k' in viejo.serializar()), 'sin colección: el guardado no cambia');
    const inv = new Inventario();
    K.sumarCarta(inv, 'escudo', 2, null);
    K.ponerAzar(inv, true, null);
    K.guardarMazo(inv, D.MAZOS.jugador, null);
    const s = JSON.parse(JSON.stringify(inv.serializar()));
    const otro = new Inventario(); otro.cargar(s);
    ok(otro.cartas && otro.cartas.c.escudo === 2 && otro.cartas.z === true && otro.cartas.m.length === 25, 'guardar y cargar: colección, mazo y al azar');
    const roto = new Inventario(); roto.cargar({ c: [], k: { c: { 'boris': 'mucho', '../x': 3, rayo: 2.7 }, m: 'nada' } });
    ok(roto.cartas && !('boris' in roto.cartas.c) && !('../x' in roto.cartas.c) && roto.cartas.c.rayo === 2 && roto.cartas.m === null, 'guardado raro: se filtra');
    const sinK = new Inventario(); sinK.cargar({ c: [] });
    ok(sinK.cartas === null, 'guardado viejo: sin colección');
    ok(!inv.vaciar().some(p => p && p.k) && inv.cartas, 'al morir (vaciar) la colección se queda');
}

// ---- --medir: el bonus del mazo al azar ----
if (process.argv.includes('--medir')) {
    const R = K.reglasDe(null);
    const jugar = (nivel, mazo, extra, semilla) => {
        const e = C.partidaNivel(nivel, { semilla, empieza: semilla % 2, mazo, manoExtra: extra });
        for (let i = 0; i < 6000 && e.ganador === null; i++) C.aplicar(e, C.jugadaIA(e, e.turno === 0 ? 'medio' : D.NIVELES[nivel].ia));
        return e;
    };
    for (const nivel of ['facil', 'medio']) for (const [nombre, f] of [['de siempre', () => [D.MAZOS.jugador, 0]], ['al azar +0', s => [K.mazoAzar(null, R, s * 31), 0]], ['al azar +1', s => [K.mazoAzar(null, R, s * 31), 1]]]) {
        let g = 0, turnos = 0; const N = 120;
        for (let s = 1; s <= N; s++) { const [m, x] = f(s), e = jugar(nivel, m, x, s * 7919); if (e.ganador === 0) g++; turnos += e.n; }
        console.log(`${nivel} · ${nombre}: ganas ${Math.round(g / N * 100)} % · ${(turnos / N).toFixed(1)} turnos`);
    }
}

console.log(fallos ? `${fallos} fallo(s)` : 'cartas-coleccion: todo OK');
process.exit(fallos ? 1 : 0);
