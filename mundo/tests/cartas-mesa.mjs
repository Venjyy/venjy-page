// =========================================================
// Prueba de la mesa 3D del Duelo de Cartas (7h-2b, PR 4a): la parte pura, sin navegador
// Ejecutar: node mundo/tests/cartas-mesa.mjs
//   1. layout: la mesa queda frente a Lucho, tu asiento al otro lado; las zonas y tu mano no se pisan
//   2. clic → jugada: en partidas reales, cada jugada legal de tu turno se alcanza tocando cartas, zonas,
//      a Lucho o los botones, y todo lo que devuelven los toques es legal
//   6. tutorial: siguiendo solo lo que se ilumina se gana la partida guiada; la cámara del turno de Lucho
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

// ---- 3. Criatura que no puede actuar: igual queda elegida (no deja la selección anterior) ----
{
    const relleno = Array(15).fill('zombi');
    const e = C.nuevaPartida({ mazos: [relleno, relleno], barajar: false });
    e.fase = 'principal'; e.n = 3;
    const poner = (z, id, extra) => { const c = D.CARTAS[id]; e.jug[0].zonas[z] = { id, atk: c.atk, def: c.def, bono: 0, modo: 'ata', nueva: false, ataques: 1, ataco: 0, atada: 0, cambio: false, racha: false, quieta: false, escudo: false, unidos: [], ...extra }; };
    poner(0, 'boris'); poner(1, 'nacho', { nueva: true });
    let r = Mo.tocarZona(e, null, 0, 0);
    ok(r.sel && r.sel.tipo === 'propia' && r.sel.z === 0 && Mo.botonesMesa(e, r.sel).directo, 'criatura con ataque: elegida y con ataque directo');
    r = Mo.tocarZona(e, r.sel, 0, 1);
    ok(r.sel && r.sel.tipo === 'propia' && r.sel.z === 1, 'criatura recién invocada: pasa a ser la elegida');
    ok(!Mo.botonesMesa(e, r.sel).directo && !Mo.botonesMesa(e, r.sel).cambiar, 'sin ataque directo ni cambio de postura');
}

// ---- 4. Animaciones: la línea de tiempo sale de los eventos y calza con el estado final ----
{
    const An = await importar('mundo/supervivencia/cartas-anim-modelo.js');
    const { fusionar } = await importar('mundo/datos/cargador.js');
    const fs = await import('fs');
    const json = JSON.parse(fs.readFileSync(resolve(raiz, 'mundo/datos/cartas-mesa.json'), 'utf8'));
    const A = fusionar(Mo.MESA, json);
    ok(A.anim && A.duraciones && A.sigue && A.colores && A.desc, 'MESA trae anim, duraciones, sigue, colores y desc');
    for (const k of Object.keys(An.ANIM.duraciones)) ok(k in An.ANIM.sigue, `sigue tiene ${k}`);
    let planes = 0, largo = 0, tipos = new Set();
    for (let s = 1; s <= 30; s++) {
        const e = C.partidaNivel(s % 2 ? 'facil' : 'medio', { semilla: s * 7 });
        for (let n = 0; n < 400 && e.ganador === null; n++) {
            const a = e.fase === 'robo' ? { t: 'robar' } : C.jugadaIA(e, 'medio');
            const vida = [e.jug[0].vida, e.jug[1].vida];
            const ev = C.aplicar(e, a), P = An.planificar(ev, A, e);
            planes++; largo = Math.max(largo, P.total);
            for (const x of ev) tipos.add(x.t);
            // Tiempos finitos y en orden
            let antes = 0;
            for (const p of P.pasos) { ok(Number.isFinite(p.ini) && Number.isFinite(p.dur) && p.ini >= antes - 1e-9, `paso ${p.t} con tiempo raro`); antes = p.ini; }
            ok(P.vidaAntes[0] === vida[0] && P.vidaAntes[1] === vida[1], `vida antes de la jugada (${a.t})`);
            // Cada carta del estado final que entró en esta jugada es la última ocupante de su zona
            for (const j of [0, 1]) for (let z = 0; z < 3; z++) {
                const lista = P.ocupantes[`${j}:${z}`] || [], real = lista.filter(o => o.hasta === null);
                const c = e.jug[j].zonas[z];
                ok(real.length <= 1, 'una sola carta final por zona');
                if (real.length) ok(c && c.id === real[0].c, `zona ${j}:${z}: la que entra es la que queda`);
                if (!c) ok(!real.length, `zona ${j}:${z} vacía sin carta final`);
                for (const o of lista) if (o.hasta !== null) ok(['muere', 'vuelve', 'abrazo'].includes(P.pasos[o.hasta].t), 'un fantasma se va muriendo, volviendo o abrazado');
            }
            // Las robadas son cartas de la mano final, en su lugar
            for (const j of [0, 1]) for (const r of P.manos[j]) ok(e.jug[j].mano[r.i] === P.pasos[r.k].c, `mano ${j}: la robada está en ${r.i}`);
            // Las jugadas desde la mano dicen de qué índice salen
            for (const x of ev) if ((x.t === 'invoca' && !x.gratis) || x.t === 'hechizo') ok(Number.isInteger(x.m), `${x.t} sin m`);
            for (const x of ev) if (x.t === 'invoca' && x.gratis) ok(['mano', 'mazo', 'desc', 'mesa'].includes(x.de), 'invoca gratis sin de');
        }
    }
    ok(largo < 15, `ninguna jugada anima más de 15 s (máx. ${largo.toFixed(1)} s)`);
    for (const t of ['roba', 'invoca', 'ataque', 'dano', 'muere', 'hechizo', 'turno']) ok(tipos.has(t), `las partidas probaron ${t}`);
    // Apagadas o más rápidas
    const e = C.partidaNivel('facil', { semilla: 5 });
    const ev = C.aplicar(e, { t: 'robar' });
    ok(An.planificar(ev, fusionar(A, { anim: { activas: 0 } }), e).pasos.length === 0, 'activas 0: sin animación');
    const t1 = An.planificar(ev, A, e).total, t2 = An.planificar(ev, fusionar(A, { anim: { velocidad: 2 } }), e).total;
    ok(Math.abs(t2 - t1 / 2) < 1e-9, 'velocidad 2 = la mitad del tiempo');
    console.log(`animaciones: ${planes} jugadas planificadas, la más larga ${largo.toFixed(2)} s`);
    // ---- 5. Sonido: cada evento tiene su sonido y los ajustes mandan ----
    for (const t of tipos) if (t !== 'fin') ok(Object.hasOwn(An.CLAVE_SONIDO, t) || t === 'nada', `el evento ${t} tiene sonido o está anotado sin él`);
    const p = ev.find(x => x.t === 'roba');
    ok(An.sonidoDe(p, A)?.clave === 'roba', 'robar suena roba');
    ok(An.sonidoDe(p, fusionar(A, { sonido: { activo: 0 } })) === null, 'activo 0: mudo');
    ok(An.sonidoDe(p, fusionar(A, { sonido: { volumen: 0 } })) === null, 'volumen 0: mudo');
    ok(An.sonidoDe(p, fusionar(A, { sonido: { roba: 0 } })) === null, 'roba 0 apaga solo ese sonido');
    ok(An.sonidoDe({ t: 'ataque' }, fusionar(A, { sonido: { roba: 0, volumen: 0.5 } })).vol === 0.5, 'volumen general escala');
    ok(An.sonidoDe({ t: 'hechizo', c: 'x' }, A, () => 'rayo').variante === 'rayo', 'el hechizo suena según su efecto');
    ok(An.sonidoFin(0, A).clave === 'gana' && An.sonidoFin(1, A).clave === 'pierde' && An.sonidoFin('empate', A).clave === 'empate', 'final: gana, pierde, empate');
    ok(An.sonidoFin(0, fusionar(A, { sonido: { gana: 0 } })) === null, 'gana 0: sin fanfarria');
    // Las recetas cubren todas las claves (el módulo usa WebAudio y no carga en Node: se lee su texto)
    const { readFileSync } = await import('node:fs');
    const src = readFileSync(resolve(raiz, 'mundo/supervivencia/cartas-mesa-sonido.js'), 'utf8');
    for (const k of new Set([...Object.values(An.CLAVE_SONIDO), 'gana', 'pierde', 'empate'])) ok(new RegExp(`\n    ${k}: `).test(src), `receta para ${k}`);
}

// ---- 6. Tutorial: se gana tocando solo lo que brilla; la cámara del turno de Lucho ----
{
    const T = D.TUTORIAL;
    const e = C.nuevaPartida({ mazos: T.mazos, barajar: false, vidas: T.vidas, empieza: 0 });
    ok(!C.calzaTutorial(e, { t: 'terminar' }, T.pasos[0].a), 'tutorial: una jugada que no pide el paso no calza');
    let p = 0, l = 0, bien = true, toques = 0;
    while (e.ganador === null && bien) {
        if (e.turno === 1) {
            for (const esp of T.lucho[l++] || []) { const a = C.accionTutorial(e, esp); if (!a) { bien = false; break; } C.aplicar(e, a); }
            continue;
        }
        const esp = T.pasos[p]?.a;
        let sel = null, accion = null;
        for (let k = 0; k < 6 && !accion; k++) {
            const r = Mo.resaltadoTutorial(e, sel, esp), B = Mo.botonesMesa(e, sel);
            if (!r) break;
            toques++;
            if (r.tipo === 'mazo') accion = B.robar;
            else if (r.tipo === 'mano') ({ sel, accion } = Mo.tocarCarta(e, sel, r.i, 'ata'));
            else if (r.tipo === 'zona') ({ sel, accion } = Mo.tocarZona(e, sel, r.j, r.z));
            else if (r.b === 'terminar' || r.b === 'directo') accion = B[r.b];
            else sel = Mo.elegirPostura(e, sel, r.b);
        }
        if (!accion || !C.calzaTutorial(e, accion, esp)) { bien = false; console.log('paso sin jugada por el resaltado', p, esp); break; }
        C.aplicar(e, accion); p++;
    }
    ok(bien && e.ganador === 0 && p === T.pasos.length, 'tutorial: tocando lo que brilla se gana, paso a paso');
    // Con la postura equivocada elegida, brilla el botón de la buena
    {
        const e2 = C.nuevaPartida({ mazos: T.mazos, barajar: false, vidas: T.vidas, empieza: 0 });
        C.aplicar(e2, { t: 'robar' });
        const m = e2.jug[0].mano.indexOf('trauco');
        const sel = Mo.tocarCarta(e2, null, m, 'def').sel;
        const r = Mo.resaltadoTutorial(e2, sel, T.pasos[1].a);
        ok(r && r.tipo === 'boton' && r.b === 'ata', 'tutorial: en Defensa brilla el botón Ataque');
        ok(Mo.resaltadoTutorial(e2, null, null) === null, 'sin paso no brilla nada');
    }
    // Cámara del turno de Lucho
    const { fusionar } = await importar('mundo/datos/cargador.js');
    const L6 = Mo.MESA, e3 = C.nuevaPartida({ mazos: T.mazos, barajar: false, vidas: T.vidas, empieza: 1 });
    ok(Mo.planoTurno(L6, { e: e3 }) === 'lucho', 'turno de Lucho: la cámara lo mira');
    ok(Mo.planoTurno(L6, { e: e3, jugoMesa: true, animando: true }) === 'mesa', 'su jugada: la cámara va a la mesa');
    ok(Mo.planoTurno(L6, { e: e3, jugoMesa: true, reloj: L6.turnoLucho.mesa + 0.1 }) === 'lucho', 'después vuelve a él');
    ok(Mo.planoTurno(fusionar(L6, { turnoLucho: { enPartida: 0 } }), { e: e3 }) === null, 'enPartida 0: fuera del tutorial no se mueve');
    ok(Mo.planoTurno(fusionar(L6, { turnoLucho: { enPartida: 0 } }), { e: e3, tuto: true }) === 'lucho', 'en el tutorial siempre');
    ok(Mo.planoTurno(L6, { e, intro: true }) === 'lucho' && Mo.planoTurno(L6, { e: C.nuevaPartida({ mazos: T.mazos }) }) === null, 'bienvenida: mira a Lucho; tu turno: tu vista');
    ok(cerca(Mo.pausaLucho(L6, e3, { tuto: true, primera: true }), Mo.pausaAuto(e3) + L6.tutorial.leer), 'tutorial: Lucho habla antes de jugar');
    ok(cerca(Mo.pausaLucho(L6, e3, { jugoMesa: true }), Mo.pausaAuto(e3) + L6.turnoLucho.mesa), 'tras su jugada se queda en la mesa');
    console.log(`tutorial: ${p} pasos con ${toques} toques`);
}

console.log(fallos ? `${fallos} fallos` : `cartas-mesa: todo bien (${probadas} jugadas por toques)`);
process.exit(fallos ? 1 : 0);
