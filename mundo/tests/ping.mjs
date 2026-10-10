// =========================================================
// Prueba del ping de la sala (bloque 7e, sin navegador ni red)
// Ejecutar: node mundo/tests/ping.mjs
//
// Cubre online/ping.js con relojes falsos:
//   1. colores y barras (verde < 80, amarillo < 150, rojo ≥ 150)
//   2. getStats: elige el candidate-pair activo y pasa segundos a ms
//   3. eco del respaldo: RTT = ahora − t − retenido, aunque los relojes de los equipos no coincidan
//      y el otro retenga el mensaje (latido de 1 s); camino de ida distinto del de vuelta
//   4. eco del anfitrión para varios invitados de respaldo (ids cortos) y descarte de basura
//   5. desfase de reloj con el anfitrión: error ≤ RTT/2 (simétrico: ~0) y mediana contra picos
// Sale con código 0 si todo coincide, 1 si no.
// =========================================================
import { pathToFileURL, fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '../../');
const P = await import(pathToFileURL(resolve(raiz, 'mundo/online/ping.js')).href);

let fallos = 0, pruebas = 0;
const ok = (cond, msg) => { pruebas++; if (!cond) { fallos++; console.error('FALLO: ' + msg); } };
const igual = (a, b, msg) => ok(JSON.stringify(a) === JSON.stringify(b), `${msg}: esperaba ${JSON.stringify(b)}, salió ${JSON.stringify(a)}`);
const cerca = (a, b, tol, msg) => ok(a != null && Math.abs(a - b) <= tol, `${msg}: esperaba ${b} ± ${tol}, salió ${a}`);

// ---- 1. Colores y barras ----
igual([0, 79.9, 80, 149, 150, 400].map(P.nivelDeMs), [0, 0, 1, 1, 2, 2], 'niveles');
igual(P.nivelDeMs(null), null, 'sin medida');
igual([5, 79, 80, 120, 149, 150, 900].map(P.barrasDeMs), [4, 4, 3, 2, 2, 1, 1], 'barras');
igual(P.barrasDeMs(null), 0, 'barras sin medida');

// ---- 2. getStats ----
{
    const rep = [
        { id: 'T1', type: 'transport', selectedCandidatePairId: 'CP2' },
        { id: 'CP1', type: 'candidate-pair', state: 'succeeded', nominated: false, currentRoundTripTime: 0.250 },
        { id: 'CP2', type: 'candidate-pair', state: 'succeeded', nominated: true, currentRoundTripTime: 0.0342 },
        { id: 'CP3', type: 'candidate-pair', state: 'waiting', currentRoundTripTime: 0.9 },
        { id: 'X', type: 'inbound-rtp' }
    ];
    igual(P.rttDeStats(rep), 34.2, 'candidate-pair del transporte');
    // Firefox: sin transport.selectedCandidatePairId, solo nominated + succeeded (o selected)
    igual(P.rttDeStats(rep.slice(1)), 34.2, 'nominated + succeeded');
    igual(P.rttDeStats(new Map(rep.map(r => [r.id, r]))), 34.2, 'RTCStatsReport tipo Map');
    igual(P.rttDeStats([{ id: 'CP', type: 'candidate-pair', selected: true, currentRoundTripTime: 0.0004 }]), 0.4, 'sub-milisegundo');
    igual(P.rttDeStats([{ id: 'CP', type: 'candidate-pair', nominated: true, state: 'succeeded' }]), null, 'sin RTT todavía');
    igual(P.rttDeStats([]), null, 'sin reportes');
}

// ---- 3. Eco del respaldo con relojes falsos ----
// Reloj de cada equipo = reloj global + su desfase propio; la red tiene retraso distinto por tramo.
const mundoFalso = (desfaseHost, desfaseInv) => ({
    g: 0, // reloj global
    host: () => m.g + desfaseHost,
    inv: () => m.g + desfaseInv
});
let m = mundoFalso(48000, 1200);

{
    const IDA = 70, VUELTA = 50;      // anfitrión → invitado, invitado → anfitrión (ms)
    const ecoHost = new P.Eco(), ecoInv = new P.Eco();
    const rttInv = new P.Suave(), rttHost = new P.Suave();
    const reloj = new P.RelojAnfitrion();
    const idInv = 'a1b2c3d4e5f6';
    m.g = 100000;
    for (let ciclo = 0; ciclo < 12; ciclo++) {
        // El anfitrión manda un p (con el eco del invitado, si ya tiene uno fresco)
        const tH = Math.round(m.host());
        const ecH = P.ecoDeLista(ecoHost, [idInv], m.host());
        m.g += IDA;
        // Llega al invitado
        const ahoraInv = m.inv();
        ecoInv.anotar('host', tH, ahoraInv);
        const mio = P.ecoPropio(ecH, idInv);
        if (mio) { const v = P.rttDeEco(ahoraInv, mio[0], mio[1]); if (v != null) rttInv.agregar(v); }
        if (rttInv.valor != null) reloj.agregar(tH, ahoraInv, rttInv.valor);
        // El invitado retiene el eco entre 0 y 180 ms (cuadros, latido) y manda su p
        m.g += (ciclo % 4) * 60;
        const tI = Math.round(m.inv());
        const ecI = ecoInv.para('host', m.inv());
        m.g += VUELTA;
        // Llega al anfitrión
        const ahoraHost = m.host();
        ecoHost.anotar(idInv, tI, ahoraHost);
        if (ecI) { const v = P.rttDeEco(ahoraHost, ecI[0], ecI[1]); if (v != null) rttHost.agregar(v); }
        m.g += 500; // pasa el tiempo hasta el siguiente ciclo
    }
    cerca(rttHost.valor, IDA + VUELTA, 1, 'RTT que mide el anfitrión');
    cerca(rttInv.valor, IDA + VUELTA, 1, 'RTT que mide el invitado');
    // Desfase real: reloj anfitrión − reloj invitado = 48000 − 1200. Error esperado = (IDA − VUELTA)/2 = 10
    cerca(reloj.desfase, 48000 - 1200, 11, 'desfase con el anfitrión (asimetría 70/50)');
    ok(reloj.listo, 'reloj listo');
    // hora del anfitrión «ahora» ≈ reloj real del anfitrión
    cerca(reloj.anfitrion(m.inv()), m.host(), 11, 'hora del anfitrión según el invitado');
}

// ---- 4. Eco del anfitrión con varios invitados y basura ----
{
    const e = new P.Eco();
    e.anotar('aaaaaa111111', 1000, 5000);
    e.anotar('bbbbbb222222', 2000, 5100);
    const l = P.ecoDeLista(e, ['aaaaaa111111', 'bbbbbb222222', 'cccccc333333'], 5300);
    igual(l, [['aaaaaa', 1000, 300], ['bbbbbb', 2000, 200]], 'lista de eco por id corto');
    igual(P.ecoPropio(l, 'bbbbbb222222'), [2000, 200], 'cada invitado encuentra su fila');
    igual(P.ecoPropio(l, 'zzzzzz999999'), null, 'sin fila propia');
    igual(P.ecoPropio('basura', 'bbbbbb222222'), null, 'eco que no es lista');
    igual(P.ecoPropio([['bbbbbb', 'x', 3]], 'bbbbbb222222'), null, 'fila con texto');
    igual(P.ecoDeLista(new P.Eco(), ['aaaaaa111111'], 0), null, 'sin nada fresco no se manda eco');
    // Eco viejo (más de 5 s retenido): no se devuelve
    igual(e.para('aaaaaa111111', 5000 + 6000), null, 'eco viejo se descarta');
    e.olvidar('aaaaaa111111');
    igual(e.para('aaaaaa111111', 5001), null, 'olvidar');
    igual(P.rttDeEco(1000, 'x', 3), null, 'NaN');
    igual(P.rttDeEco(20000, 0, 0), null, 'más de 10 s es basura');
    igual(P.rttDeEco(1000, 940, 0), 60, 'RTT simple');
    igual(P.rttDeEco(1000, 1001, 0), 0, 'redondeo negativo pequeño se corrige a 0');
    igual(P.rttDeEco(1000, 1200, 0), null, 'eco del futuro');
}

// ---- 5. Suavizado ----
{
    const s = new P.Suave(5);
    [40, 42, 41].forEach(v => s.agregar(v));
    igual(s.valor, 41, 'mediana de 3');
    s.agregar(900); // pico suelto
    igual(s.valor, 42, 'un pico no cambia el valor (mediana de 40,42,41,900)');
    s.agregar(null); s.agregar(NaN);
    igual(s.valor, 42, 'ignora null y NaN');
    for (let i = 0; i < 5; i++) s.agregar(200);
    igual(s.valor, 200, 'la ventana se renueva');
    ok(P.nivelDeMs(s.valor) === 2, 'rojo con 200 ms');
    const vacio = new P.Suave();
    igual(vacio.valor, null, 'vacío');
    // Desfase: la mediana aguanta una muestra con un RTT disparado
    const r = new P.RelojAnfitrion();
    for (let i = 0; i < 6; i++) r.agregar(1000 + i * 500 + 20, 500 + i * 500 + 40, 40); // desfase real 500
    r.agregar(10000 + 20, 5500 + 40, 900);
    cerca(r.desfase, 500, 1, 'mediana del desfase aguanta un RTT malo');
}

console.log(`ping.mjs: ${pruebas - fallos}/${pruebas} bien`);
process.exit(fallos ? 1 : 0);
