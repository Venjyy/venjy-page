// =========================================================
// Prueba de la mesa 3D del Duelo de Cartas (7h-2b, PR 4a): la parte pura, sin navegador
// Ejecutar: node mundo/tests/cartas-mesa.mjs
//   1. layout: la mesa queda frente a Lucho, tu asiento al otro lado; las zonas y tu mano no se pisan
//   2. clic → jugada: en partidas reales, cada jugada legal de tu turno se alcanza tocando cartas, zonas,
//      a Lucho o los botones, y todo lo que devuelven los toques es legal
// Sale con código 0 si todo coincide, 1 si no.
// =========================================================
import { pathToFileURL, fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '../../');
const importar = r => import(pathToFileURL(resolve(raiz, r)).href);
const C = await importar('mundo/supervivencia/cartas.js');
const D = await importar('mundo/supervivencia/cartas-datos.js');
const Mo = await importar('mundo/supervivencia/cartas-mesa-modelo.js');

let fallos = 0;
const ok = (c, msg) => { if (!c) { fallos++; console.log('FALLA:', msg); } };
const cerca = (a, b, d = 1e-9) => Math.abs(a - b) < d;

// ---- 1. Layout ----
const L = Mo.MESA;
for (const giro of [0, 90, -135]) {
    const lucho = { x: 10, y: 5, z: -3 };
    const M = Mo.marcoMesa({ ...L, mesa: { ...L.mesa, giro } }, lucho);
    const dL = Math.hypot(M.x - lucho.x, M.z - lucho.z), dA = Math.hypot(M.asiento.x - M.x, M.asiento.z - M.z);
    ok(cerca(dL, L.mesa.dist), `giro ${giro}: centro a ${L.mesa.dist} de Lucho`);
    ok(cerca(dA, L.mesa.fondo / 2 + L.asiento.dist), `giro ${giro}: asiento al otro lado`);
    // Lucho, centro y asiento en línea (la mesa entre los dos)
    ok(cerca(Math.hypot(M.asiento.x - lucho.x, M.asiento.z - lucho.z), dL + dA, 1e-6), `giro ${giro}: Lucho, mesa y tú en línea`);
    // Tu derecha (x local +): jugador.yaw mira hacia (-sin, -cos); su derecha es (cos, -sin)
    const d = Mo.aMundo(M, 1, 0);
    ok(cerca(d.x - M.x, Math.cos(M.asiento.yaw)) && cerca(d.z - M.z, -Math.sin(M.asiento.yaw)), `giro ${giro}: x local = tu derecha`);
}
{
    const ch = L.carta.ancho * Mo.ALTO_CARTA;
    ok(L.zonas.sep > ch + 0.01, 'zonas: caben en defensa (girada) sin tocarse');
    ok(L.zonas.propia - L.zonas.rival > ch, 'las dos filas no se pisan');
    ok(L.zonas.propia + ch / 2 < L.mesa.fondo / 2 && Math.abs(L.zonas.rival) + ch / 2 < L.mesa.fondo / 2, 'las filas caben en la mesa');
    ok(Math.abs(L.mazo.x) + L.carta.ancho / 2 < L.mesa.ancho / 2 && Math.abs(L.mazo.x) - L.carta.ancho / 2 > L.zonas.sep + ch / 2, 'mazos en el borde, al lado de las zonas');
    for (const [w, h] of [[1280, 720], [390, 844], [844, 390]]) for (let n = 1; n <= 7; n++) {
        const ps = Array.from({ length: n }, (_, i) => Mo.posMano(L, i, n, w, h));
        ok(ps.every(p => p.x - p.w / 2 >= 0 && p.x + p.w / 2 <= w), `mano de ${n} cabe en ${w}×${h}`);
        ok(ps.every(p => p.h <= h * 0.3), `mano de ${n} no tapa la mesa en ${w}×${h}`);
    }
}

// ---- 2. Clic → jugada ----
const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function clics(e, a) {
    let sel = null, salida = null, ilegal = false;
    const paso = r => { if (r.accion) { salida = r.accion; if (!C.esLegal(e, r.accion)) ilegal = true; } sel = r.sel; return !!r.accion; };
    if (a.t === 'invocar') {
        paso(Mo.tocarCarta(e, sel, a.m, 'ata'));
        if (a.modo === 'def') sel = Mo.elegirPostura(e, sel, 'def');
        if (!paso(Mo.tocarZona(e, sel, 0, a.z)) && a.obj !== undefined) paso(Mo.tocarZona(e, sel, 1, a.obj));
    } else if (a.t === 'hechizo') {
        if (!paso(Mo.tocarCarta(e, sel, a.m)) && a.obj !== undefined) {
            const lado = Mo.ladoObjetivo(e, a);
            if (!paso(Mo.tocarZona(e, sel, lado, a.obj)) && a.obj2 !== undefined) paso(Mo.tocarZona(e, sel, lado, a.obj2));
        }
    } else if (a.t === 'atacar') {
        paso(Mo.tocarZona(e, sel, 0, a.z));
        if (a.obj === -1) salida = Mo.botonesMesa(e, sel).directo; else paso(Mo.tocarZona(e, sel, 1, a.obj));
    } else if (a.t === 'modo') {
        paso(Mo.tocarZona(e, sel, 0, a.z)); salida = Mo.botonesMesa(e, sel).cambiar;
    } else if (a.t === 'terminar') salida = Mo.botonesMesa(e, sel).terminar;
    else if (a.t === 'robar') salida = Mo.botonesMesa(e, sel).robar;
    return { salida, ilegal };
}
let probadas = 0, sinAlcanzar = 0;
for (let s = 1; s <= 40; s++) {
    const e = C.partidaNivel(s % 2 ? 'facil' : 'medio', { semilla: s * 7919 });
    for (let paso = 0; paso < 400 && e.ganador === null; paso++) {
        if (e.turno === 0) {
            for (const a of C.jugadas(e)) {
                const r = clics(e, a);
                probadas++;
                ok(!r.ilegal, `semilla ${s}: un toque dio una jugada ilegal (${JSON.stringify(a)})`);
                if (!igual(r.salida, a)) { sinAlcanzar++; if (sinAlcanzar <= 5) console.log('no se alcanza:', JSON.stringify(a), '→', JSON.stringify(r.salida)); }
            }
            // Toques sueltos: nunca devuelven una jugada ilegal ni rompen
            let sel = null;
            for (let k = 0; k < 12; k++) {
                const r = k % 3 === 0 ? Mo.tocarCarta(e, sel, k % Math.max(1, e.jug[0].mano.length)) : Mo.tocarZona(e, sel, k % 2, k % 3);
                if (r.accion) { ok(C.esLegal(e, r.accion), `semilla ${s}: toque suelto ilegal`); break; }
                sel = r.sel;
                for (const [j, z] of Mo.zonasMarcadas(e, sel)) ok(j === 0 || j === 1 && z >= 0 && z < 3, 'zona marcada válida');
            }
        }
        C.aplicar(e, C.jugadaIA(e, 'medio'));
    }
}
ok(probadas > 1000, `pocas jugadas probadas (${probadas})`);
ok(sinAlcanzar === 0, `${sinAlcanzar} jugadas legales no se alcanzan con toques`);
// Fuera de tu turno, tocar no hace nada
{
    const e = C.partidaNivel('facil', { semilla: 3, empieza: 1 });
    ok(!Mo.tocarCarta(e, null, 0).accion && !Mo.tocarZona(e, null, 0, 0).accion && !Mo.botonesMesa(e, null).terminar, 'turno de Lucho: tus toques no juegan');
}
ok(Mo.pausaAuto({ fase: 'robo', turno: 0 }) === 0.4 && Mo.pausaAuto({ fase: 'principal', turno: 1 }) === 0.7, 'tiempos de la IA = panel');

console.log(fallos ? `${fallos} fallos` : `cartas-mesa: todo bien (${probadas} jugadas por toques)`);
process.exit(fallos ? 1 : 0);
