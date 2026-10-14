// =========================================================
// Prueba de la navegación (6d etapa 2, PR 1): node mundo/tests/navegacion.mjs
//  1. Búsqueda en mundos de juguete: recto en plano, rodea paredes, pasa por el hueco, sube 1 y no 2, cae 3 y no 4,
//     agua honda y lava no, agua bajita según costoAgua, no corta esquinas, parte desde una vecina si está metido
//     en un bloque, lo no cargado usa el mapa de alturas, sin salida da el mejor parcial.
//  2. Por tramos: el resultado no depende del tope por cuadro; la cola respeta el tope entre varias búsquedas.
//  3. Caminante: llega pisando siempre suelo válido, si le ponen un bloque en el camino busca de nuevo y no lo
//     atraviesa, lejos avanza a saltos cada `saltoLejos` y tarda lo que dice la velocidad, sin salida se rinde.
//  4. Terreno real de la supervivencia: caminos entre lugares con el mapa de alturas (y su costo) y con los chunks
//     llenos alrededor del campamento (los amigos salen de su sitio y llegan caminando).
//  5. Paseos con personas falsas: gancho n.paseo, llega junto a la otra persona, vuelve y suelta el gancho en su
//     sitio exacto; una escena lo deja quieto; lejos y sin camino aparece allá.
//  6. Datos: navegacion.json, esquema, NAV_BASE / PASEO_BASE y la pestaña Vida nombran los mismos campos.
// =========================================================
import { readFileSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
globalThis.window ??= { addEventListener() {} };
const avisoOriginal = console.warn; console.warn = () => {}; // cargarDatos avisa que no hay fetch de archivos en Node

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '../../');
const imp = p => import(pathToFileURL(resolve(raiz, p)).href);
const N = await imp('mundo/navegacion.js');
const { LIBRE, SOLIDO, AGUA, LAVA, SIN_CARGAR, NAV_BASE } = N;

let fallos = 0, pruebas = 0;
const ok = (cond, msg) => { pruebas++; if (!cond) { fallos++; console.log('FALLA:', msg); } };

// ---------------------------------------------------------
// Mundo de juguete: piso de piedra en y = 0 (se para en y = 1) dentro de [0, W) × [0, D); fuera, sin cargar
// ---------------------------------------------------------
function juguete(W = 40, D = 40, { columna = null } = {}) {
    const celdas = new Map();
    const k = (x, y, z) => `${x},${y},${z}`;
    const m = {
        W, D,
        poner(x, y, z, v) { celdas.set(k(x, y, z), v); },
        caja(x0, y0, z0, x1, y1, z1, v) { for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) m.poner(x, y, z, v); },
        celda(x, y, z) {
            x = Math.floor(x); y = Math.floor(y); z = Math.floor(z);
            if (x < 0 || z < 0 || x >= W || z >= D) return SIN_CARGAR;
            const v = celdas.get(k(x, y, z));
            if (v !== undefined) return v;
            return y <= 0 ? SOLIDO : LIBRE;
        },
        columna: columna || (() => null),
        lecturas: 0
    };
    return m;
}
const op = (extra = {}) => ({ ...NAV_BASE, ...extra });
function buscar(C, desde, hasta, o = op()) {
    const b = N.crearBusqueda(C, desde, hasta, o);
    while (b.estado === 'buscando') b.avanzar(1e9);
    return b;
}
// Recorre el camino columna a columna (cada 0,1 bloques) y devuelve las celdas que pisa
function pisadas(camino) {
    const out = [];
    for (let i = 1; i < camino.length; i++) {
        const a = camino[i - 1], b = camino[i], d = Math.hypot(b.x - a.x, b.z - a.z), n = Math.max(1, Math.ceil(d / 0.1));
        for (let s = 0; s <= n; s++) out.push({ x: Math.floor(a.x + (b.x - a.x) * s / n), z: Math.floor(a.z + (b.z - a.z) * s / n) });
    }
    return out;
}

// 1a. Plano: llega y el suavizado deja una sola recta
{
    const C = juguete();
    const b = buscar(C, { x: 2.5, y: 1, z: 2.5 }, { x: 30.5, y: 1, z: 20.5 });
    ok(b.estado === 'listo', `plano: listo (${b.estado})`);
    // El suavizado une hasta `suavizado` puntos por tramo: 28 bloques quedan en 1 o 2 tramos casi sobre la recta
    const lejos = b.camino ? Math.max(...b.camino.map(p => Math.abs((p.x - 2.5) * 18 - (p.z - 2.5) * 28) / Math.hypot(28, 18))) : 99;
    ok(b.camino && b.camino.length <= 3 && lejos < 1.5, `plano: suavizado casi recto (${b.camino && b.camino.length} puntos, ${lejos.toFixed(2)} de la recta)`);
    ok(b.camino && b.camino.every(p => p.y === 1), 'plano: todo a y = 1');
}
// 1b. Pared con un hueco: pasa por el hueco y nunca pisa la pared
{
    const C = juguete();
    C.caja(20, 1, 0, 20, 3, 39, SOLIDO);
    C.caja(20, 1, 30, 20, 2, 30, LIBRE); // hueco en z = 30
    const b = buscar(C, { x: 5.5, y: 1, z: 5.5 }, { x: 35.5, y: 1, z: 5.5 });
    ok(b.estado === 'listo', `pared: listo (${b.estado})`);
    const pis = b.camino ? pisadas(b.camino) : [];
    ok(pis.every(p => p.x !== 20 || p.z === 30), 'pared: solo cruza x = 20 por el hueco');
    ok(pis.some(p => p.x === 20 && p.z === 30), 'pared: pasa por el hueco');
}
// 1c. Escalones: sube 1, no 2; cae 3, no 4
{
    const C = juguete();
    C.caja(10, 1, 0, 39, 1, 39, SOLIDO); // meseta de 1 desde x = 10
    let b = buscar(C, { x: 5.5, y: 1, z: 5.5 }, { x: 15.5, y: 2, z: 5.5 });
    ok(b.estado === 'listo' && b.camino.at(-1).y === 2, 'sube un bloque');
    const C2 = juguete();
    C2.caja(10, 1, 0, 39, 2, 39, SOLIDO); // pared de 2 a lo ancho
    b = buscar(C2, { x: 5.5, y: 1, z: 5.5 }, { x: 15.5, y: 3, z: 5.5 });
    ok(b.estado !== 'listo', `no sube dos bloques (${b.estado})`);
    const C3 = juguete();
    C3.caja(0, 1, 0, 9, 3, 39, SOLIDO); // parte arriba (y = 4), baja 3
    b = buscar(C3, { x: 5.5, y: 4, z: 5.5 }, { x: 15.5, y: 1, z: 5.5 });
    ok(b.estado === 'listo', `cae 3 (${b.estado})`);
    const C4 = juguete();
    C4.caja(0, 1, 0, 9, 4, 39, SOLIDO); // de y = 5 a y = 1: 4
    b = buscar(C4, { x: 5.5, y: 5, z: 5.5 }, { x: 15.5, y: 1, z: 5.5 });
    ok(b.estado !== 'listo', `no cae 4 (${b.estado})`);
    b = buscar(C4, { x: 5.5, y: 5, z: 5.5 }, { x: 15.5, y: 1, z: 5.5 }, op({ caida: 4 }));
    ok(b.estado === 'listo', 'con caida 4 sí');
}
// 1d. Agua y lava
{
    const C = juguete();
    C.caja(15, 0, 0, 17, 0, 39, AGUA); C.caja(15, -1, 0, 17, -1, 39, SOLIDO); // franja de agua honda (2: y 0 y 1)
    C.caja(15, 1, 0, 17, 1, 39, AGUA);
    let b = buscar(C, { x: 5.5, y: 1, z: 5.5 }, { x: 25.5, y: 1, z: 5.5 });
    ok(b.estado !== 'listo', `agua honda: no la cruza (${b.estado})`);
    const C2 = juguete();
    C2.caja(15, 1, 0, 17, 1, 39, AGUA); // agua bajita (pies en el agua, piso debajo)
    b = buscar(C2, { x: 5.5, y: 1, z: 5.5 }, { x: 25.5, y: 1, z: 5.5 });
    ok(b.estado === 'listo', 'agua bajita: la cruza si cuesta algo');
    b = buscar(C2, { x: 5.5, y: 1, z: 5.5 }, { x: 25.5, y: 1, z: 5.5 }, op({ costoAgua: 0 }));
    ok(b.estado !== 'listo', 'agua bajita con costoAgua 0: no');
    const C3 = juguete();
    C3.caja(15, 1, 0, 17, 1, 39, LAVA);
    b = buscar(C3, { x: 5.5, y: 1, z: 5.5 }, { x: 25.5, y: 1, z: 5.5 });
    ok(b.estado !== 'listo', 'lava: nunca');
    // Con un puente en z = 35 cruza por ahí, sin mojarse
    C2.caja(15, 1, 35, 17, 1, 35, LIBRE);
    b = buscar(C2, { x: 5.5, y: 1, z: 33.5 }, { x: 25.5, y: 1, z: 33.5 });
    ok(b.estado === 'listo' && pisadas(b.camino).every(p => p.x < 15 || p.x > 17 || p.z === 35), 'agua bajita: prefiere el paso seco cercano');
}
// 1e. Esquinas: no pasa en diagonal entre dos bloques que se tocan por la punta
{
    const C = juguete(12, 12);
    C.caja(0, 1, 5, 4, 2, 5, SOLIDO); C.caja(6, 1, 5, 11, 2, 5, SOLIDO); // pared en z = 5 con hueco en x = 5
    C.caja(5, 1, 4, 5, 2, 4, SOLIDO); C.caja(5, 1, 6, 5, 2, 6, LIBRE);   // tapa el hueco por arriba: queda solo la punta
    const b = buscar(C, { x: 4.5, y: 1, z: 3.5 }, { x: 6.5, y: 1, z: 7.5 });
    const pis = b.camino ? pisadas(b.camino) : [];
    ok(b.estado !== 'listo' || !pis.some(p => p.z === 5 && p.x !== 5), 'esquinas: no corta por las puntas');
}
// 1f. Parte desde una vecina si está metido en un bloque (sentado en un tronco)
{
    const C = juguete();
    C.poner(5, 1, 5, SOLIDO);
    const i = N.inicio(C, { x: 5.6, y: 1, z: 5.4 });
    ok(i && i.y === 1 && !(i.x === 5 && i.z === 5), `inicio: vecina libre (${JSON.stringify(i)})`);
    const b = buscar(C, { x: 5.6, y: 1, z: 5.4 }, { x: 20.5, y: 1, z: 5.5 });
    ok(b.estado === 'listo' && b.camino[0].y === 1, 'inicio: el camino parte a su altura');
}
// 1g. Lo no cargado usa el mapa de alturas (columna) y une con lo cargado
{
    const C = juguete(20, 40, { columna: (x, z) => (x >= 20 && x < 60 && z >= 0 && z < 40 ? { y: x >= 40 ? 2 : 1, agua: false } : null) });
    const b = buscar(C, { x: 5.5, y: 1, z: 5.5 }, { x: 50.5, z: 5.5 });
    ok(b.estado === 'listo' && b.camino.at(-1).y === 2, `sin cargar: sigue por el mapa de alturas (${b.estado})`);
}
// 1h. Sin salida: el mejor parcial (lo más cerca posible); sin dónde pararse: sin camino
{
    const C = juguete();
    C.caja(0, 1, 20, 39, 3, 20, SOLIDO);
    const b = buscar(C, { x: 5.5, y: 1, z: 5.5 }, { x: 5.5, y: 1, z: 30.5 });
    ok(b.estado === 'parcial' && Math.floor(b.camino.at(-1).z) === 19, `encerrado: parcial junto a la pared (${b.estado}, z ${b.camino && b.camino.at(-1).z})`);
    const C2 = juguete(); C2.caja(0, 1, 0, 39, 5, 39, SOLIDO);
    ok(buscar(C2, { x: 5.5, y: 1, z: 5.5 }, { x: 9.5, y: 1, z: 9.5 }).estado === 'sin-camino', 'enterrado: sin camino');
    const b2 = buscar(juguete(400, 400), { x: 5.5, y: 1, z: 5.5 }, { x: 395.5, y: 1, z: 395.5 }, op({ nodosMax: 300, codicia: 1 }));
    ok(b2.estado === 'parcial' && b2.nodos === 300, `nodosMax: corta en el tope (${b2.estado} ${b2.nodos})`);
}

// ---------------------------------------------------------
// 2. Por tramos
// ---------------------------------------------------------
{
    const C = juguete(60, 60);
    C.caja(30, 1, 0, 30, 2, 50, SOLIDO); C.caja(10, 1, 20, 50, 2, 20, SOLIDO); C.caja(10, 1, 20, 12, 2, 20, LIBRE);
    const de = { x: 3.5, y: 1, z: 3.5 }, a = { x: 55.5, y: 1, z: 55.5 };
    const todo = buscar(C, de, a);
    const b = N.crearBusqueda(C, de, a, op());
    let vueltas = 0;
    while (b.estado === 'buscando' && vueltas < 1e5) { const h = b.avanzar(37); ok(h <= 37, 'tramos: nunca más que el tope'); vueltas++; }
    ok(b.estado === todo.estado && JSON.stringify(b.camino) === JSON.stringify(todo.camino) && vueltas > 3, `tramos: mismo camino (${vueltas} vueltas)`);
    const nav = N.crearNavegador(C);
    const bs = [nav.pedir(de, a), nav.pedir({ x: 55.5, y: 1, z: 3.5 }, { x: 3.5, y: 1, z: 55.5 }), nav.pedir(de, { x: 8.5, y: 1, z: 8.5 })];
    let antes = 0, cuadros = 0, max = 0;
    while (nav.pendientes && cuadros < 1e4) {
        nav.actualizar(200);
        const ahora = bs.reduce((s, x) => s + x.nodos, 0);
        max = Math.max(max, ahora - antes); antes = ahora; cuadros++;
    }
    ok(max <= 200 + bs.length, `cola: tope por cuadro entre todas (máx ${max})`);
    ok(bs.every(x => x.estado === 'listo'), 'cola: las tres terminan');
    const c = nav.pedir(de, a); nav.cancelar(c);
    ok(c.estado === 'cancelada' && nav.pendientes === 0, 'cola: cancelar la saca');
}

// ---------------------------------------------------------
// 3. Caminante
// ---------------------------------------------------------
function caminarHasta(C, cuerpo, destino, { dt = 1 / 60, detalle = true, max = 60 * 120, alCuadro } = {}) {
    const nav = N.crearNavegador(C);
    const w = N.crearCaminante(nav, cuerpo);
    w.ir(destino);
    let t = 0, malos = 0;
    for (let i = 0; i < max; i++) {
        nav.actualizar();
        w.actualizar(dt, { detalle });
        t += dt;
        if (alCuadro) alCuadro(i, w);
        // Pisa suelo válido: la celda de los pies no es sólida y la de abajo sí (con el saltito de subir, la de arriba)
        if (detalle && w.estado === 'caminando') {
            const x = Math.floor(cuerpo.x), z = Math.floor(cuerpo.z), y = Math.floor(cuerpo.y + 0.001);
            if (C.celda(x, y, z) === SOLIDO && C.celda(x, y + 1, z) === SOLIDO) malos++;
        }
        if (w.estado === 'llego' || w.estado === 'sin-camino') break;
    }
    return { w, t, malos };
}
{
    const C = juguete();
    C.caja(20, 1, 0, 20, 3, 34, SOLIDO); C.caja(10, 1, 25, 14, 1, 30, SOLIDO); // pared y una lomita de 1
    const cuerpo = { x: 3.5, y: 1, z: 28.5, yaw: 0 };
    const r = caminarHasta(C, cuerpo, { x: 35.5, y: 1, z: 5.5 });
    ok(r.w.estado === 'llego', `caminante: llega (${r.w.estado})`);
    ok(Math.hypot(cuerpo.x - 35.5, cuerpo.z - 5.5) <= NAV_BASE.llegada + 0.1, 'caminante: queda junto al destino');
    ok(r.malos === 0, `caminante: nunca dentro de un bloque (${r.malos})`);
    ok(r.t > r.w.distancia / NAV_BASE.velocidad * 0.95, 'caminante: no va más rápido que su velocidad');
}
{
    // Le ponen un muro en el camino a mitad de viaje: vuelve a buscar y llega sin atravesarlo
    const C = juguete();
    const cuerpo = { x: 3.5, y: 1, z: 10.5, yaw: 0 };
    let puesto = false, cruzo = false;
    const r = caminarHasta(C, cuerpo, { x: 35.5, y: 1, z: 10.5 }, {
        alCuadro(i, w) {
            if (!puesto && cuerpo.x > 10) { C.caja(18, 1, 0, 18, 2, 30, SOLIDO); puesto = true; }
            if (puesto && Math.floor(cuerpo.x) === 18 && Math.floor(cuerpo.z) <= 30) cruzo = true;
        }
    });
    ok(puesto && r.w.estado === 'llego', `muro nuevo: llega igual (${r.w.estado})`);
    ok(!cruzo, 'muro nuevo: no lo atraviesa');
}
{
    // Lejos: avanza a saltos (solo cada saltoLejos) y tarda lo que dice la velocidad
    const C = juguete(200, 20);
    const cuerpo = { x: 2.5, y: 1, z: 10.5, yaw: 0 };
    let saltos = 0, ultimo = cuerpo.x;
    const r = caminarHasta(C, cuerpo, { x: 190.5, y: 1, z: 10.5 }, {
        detalle: false,
        alCuadro() { if (cuerpo.x !== ultimo) { saltos++; ultimo = cuerpo.x; } }
    });
    const esperado = (188 - NAV_BASE.llegada) / NAV_BASE.velocidad;
    ok(r.w.estado === 'llego', `lejos: llega (${r.w.estado})`);
    ok(Math.abs(r.t - esperado) < NAV_BASE.saltoLejos + 0.5, `lejos: tarda lo de su velocidad (${r.t.toFixed(1)} s, ~${esperado.toFixed(1)})`);
    ok(saltos <= Math.ceil(r.t / NAV_BASE.saltoLejos) + 1, `lejos: un salto por segundo (${saltos} saltos)`);
}
{
    // Encerrado: camina lo que puede, reintenta y se rinde
    const C = juguete();
    C.caja(0, 1, 20, 39, 3, 20, SOLIDO);
    const r = caminarHasta(C, { x: 5.5, y: 1, z: 5.5, yaw: 0 }, { x: 5.5, y: 1, z: 30.5 });
    ok(r.w.estado === 'sin-camino', `encerrado: se rinde (${r.w.estado})`);
}

// ---------------------------------------------------------
// 4. Terreno real de la supervivencia
// ---------------------------------------------------------
const { generarDatos } = await imp('mundo/mundo-datos.js');
const V = await imp('mundo/voxeles.js');
const { TIPO } = await imp('mundo/texturas.js');
const P = await imp('mundo/datos/posiciones.js');
V.fijarAlto(V.ALTO_SUPERVIVENCIA);
const T = V.prepararTerreno(generarDatos('h'), { supervivencia: true });
const L = k => T.lugares.find(l => l.clave === k);
{
    const C = N.consultaMundo({ mundo: { bloque: () => -1 }, terreno: T, tipos: TIPO, dy: T.dy, nivelAgua: V.NIVEL_AGUA });
    for (const [a, b, tope] of [['campamento', 'atalaya', 5000], ['atalaya', 'naufragio', 20000], ['iglu', 'portal', 60000], ['campamento', 'iglu', NAV_BASE.nodosMax]]) {
        const A = L(a), B = L(b);
        if (!A || !B) { ok(false, `falta ${a} o ${b}`); continue; }
        const t0 = performance.now();
        const s = buscar(C, { x: A.x + 4, y: A.y + 1, z: A.z + 4 }, { x: B.x + 4, z: B.z + 4 });
        const ms = performance.now() - t0;
        ok(s.estado === 'listo', `mapa de alturas ${a} → ${b}: ${s.estado}`);
        ok(s.nodos <= tope, `mapa de alturas ${a} → ${b}: ${s.nodos} nodos (tope ${tope})`);
        // Cada tramo del camino suavizado se puede recorrer (lo repite un caminante lejos y llega)
        console.log(`  ${a} → ${b}: ${Math.round(Math.hypot(A.x - B.x, A.z - B.z))} bloques en línea recta, ${s.nodos} nodos, ${ms.toFixed(0)} ms, ${s.camino ? s.camino.length : 0} puntos`);
    }
}
{
    // Chunks llenos alrededor del campamento: los de la fogata salen de su sitio y caminan
    const pos = JSON.parse(readFileSync(resolve(raiz, 'mundo/datos/posiciones.json'), 'utf8'));
    const sitio = k => P.puntoAMundo(P.resolverAncla(T, pos.personas[k].ancla), pos.personas[k]);
    const CH = V.CHUNK, VENT = CH + 2, chunks = new Map();
    const h = sitio('hadad'), a = sitio('andy'), b = sitio('boris');
    const cx0 = Math.floor(h.x / CH), cz0 = Math.floor(h.z / CH);
    for (let cx = cx0 - 3; cx <= cx0 + 3; cx++) for (let cz = cz0 - 3; cz <= cz0 + 3; cz++) chunks.set(cx + ',' + cz, V.llenarChunk(T, cx, cz));
    const mundo = {
        bloque(x, y, z) {
            x = Math.floor(x); y = Math.floor(y); z = Math.floor(z);
            const ch = chunks.get(Math.floor(x / CH) + ',' + Math.floor(z / CH));
            if (!ch || y < 0 || y >= V.ALTO) return -1;
            return ch.vox[(y * VENT + (z - Math.floor(z / CH) * CH + 1)) * VENT + (x - Math.floor(x / CH) * CH + 1)];
        }
    };
    const C = N.consultaMundo({ mundo, terreno: T, tipos: TIPO, dy: T.dy, nivelAgua: V.NIVEL_AGUA });
    const rH = caminarHasta(C, { ...h }, { x: a.x + 1.5, y: a.y, z: a.z });
    ok(rH.w.estado === 'llego' && rH.malos === 0, `campamento: Hadad camina hasta Andy (${rH.w.estado}, ${rH.malos})`);
    const cuerpo = { ...h };
    const rB = caminarHasta(C, cuerpo, { x: b.x, y: b.y, z: b.z }, { max: 60 * 400 });
    ok(rB.w.estado === 'llego' && rB.malos === 0, `campamento → atalaya cruzando lo cargado y lo no cargado (${rB.w.estado}, ${rB.malos})`);
    console.log(`  Hadad → Boris: ${rB.w.distancia.toFixed(0)} bloques caminados en ${rB.t.toFixed(0)} s`);
}

// ---------------------------------------------------------
// 5. Paseos con personas falsas (paseos.js)
// ---------------------------------------------------------
{
    const { crearPaseos } = await imp('mundo/supervivencia/paseos.js');
    const C = juguete(80, 80);
    C.caja(30, 1, 0, 30, 3, 60, SOLIDO);
    const mundo = { bloque(x, y, z) { const c = C.celda(x, y, z); return c === SIN_CARGAR ? -1 : c === SOLIDO ? 3 : c === AGUA ? 6 : c === LAVA ? 52 : 0; } };
    const parte = () => ({ position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } });
    const rig = () => ({ g: parte(), cuerpo: parte(), cuello: parte(), brazoD: parte(), brazoI: parte(), piernaD: parte(), piernaI: parte() });
    const lista = [
        { clave: 'ana', x: 5.5, y: 1, z: 5.5, yaw: 1, t: 0, p: rig() },
        { clave: 'beto', x: 50.5, y: 1, z: 10.5, yaw: 2, t: 0, p: rig() }
    ];
    lista[0].p.cuerpo.position.y = 0.25; // sentada
    const jugador = { pos: { x: 40, y: 1, z: 40 } };
    const paseos = crearPaseos({ amigos: { lista }, terreno: { lugares: [], BW: 0, BD: 0 }, mundo, jugador });
    const [ana, beto] = lista;
    const correr = (seg, f) => { for (let i = 0; i < seg * 60; i++) { paseos.actualizar(1 / 60); if (ana.paseo) ana.paseo.animar(1 / 60); if (f && f()) return true; } return false; };
    ok(paseos.ir('ana', 'beto'), 'paseos: ir a ver a otra persona');
    ok(!!ana.paseo && typeof ana.paseo.animar === 'function', 'paseos: pone el gancho n.paseo');
    correr(60, () => paseos.estado('ana').estado === 'alla');
    ok(paseos.estado('ana').estado === 'alla', `paseos: llega (${paseos.estado('ana').estado})`);
    const d = Math.hypot(ana.x - beto.x, ana.z - beto.z);
    ok(d < 1.8 + NAV_BASE.llegada + 0.3, `paseos: queda junto a Beto (${d.toFixed(2)})`);
    ok(Math.abs(ana.p.cuerpo.position.y) < 0.01, 'paseos: se paró (sin la pose de sentada)');
    correr(2);
    const haciaBeto = Math.atan2(beto.x - ana.x, beto.z - ana.z);
    ok(Math.abs(Math.atan2(Math.sin(haciaBeto - ana.yaw), Math.cos(haciaBeto - ana.yaw))) < 0.3, 'paseos: mira a quien visita');
    // Una escena la deja quieta
    paseos.volver('ana');
    ana.escena = () => true;
    const x0 = ana.x; correr(2);
    ok(ana.x === x0, 'paseos: con una escena no se mueve');
    ana.escena = null;
    correr(60, () => !ana.paseo);
    ok(!ana.paseo && !paseos.fuera('ana'), 'paseos: al volver suelta el gancho');
    ok(ana.x === 5.5 && ana.z === 5.5 && ana.y === 1 && ana.yaw === 1, `paseos: en su sitio exacto y con su giro (${ana.x}, ${ana.z}, ${ana.yaw})`);
    ok(ana.p.cuerpo.position.y === 0.25, 'paseos: al volver recupera su pose (sentada)');
    // Lejos del jugador y sin camino: aparece allá (nadie la ve)
    C.caja(0, 1, 20, 29, 3, 20, SOLIDO); // encierra a Ana con la pared x = 30
    jugador.pos.x = 400; jugador.pos.z = 400;
    ok(paseos.ir('ana', { x: 50.5, y: 1, z: 50.5 }), 'paseos: destino con coordenadas');
    correr(120, () => paseos.estado('ana').estado === 'alla');
    ok(paseos.estado('ana').estado === 'alla' && Math.hypot(ana.x - 50.5, ana.z - 50.5) < 2, `paseos: sin camino y sin nadie mirando, aparece allá (${paseos.estado('ana').estado})`);
    paseos.volverTodos();
    ok(!ana.paseo && ana.x === 5.5 && ana.z === 5.5, 'paseos: volverTodos los deja en su sitio');
    ok(!paseos.ir('nadie', 'aqui') && !paseos.ir('ana', 'un-lugar-que-no-existe'), 'paseos: persona o destino desconocidos');
}

// ---------------------------------------------------------
// 6. Datos y Estudio
// ---------------------------------------------------------
{
    const { PASEO_BASE, fijarPaseo, ajustesPaseo } = await imp('mundo/supervivencia/paseos-datos.js');
    const datos = JSON.parse(readFileSync(resolve(raiz, 'mundo/datos/navegacion.json'), 'utf8'));
    const esquema = JSON.parse(readFileSync(resolve(raiz, 'estudio/esquemas/navegacion.schema.json'), 'utf8'));
    const vida = readFileSync(resolve(raiz, 'estudio/vida.js'), 'utf8');
    const iguales = (a, b) => [...a].sort().join() === [...b].sort().join();
    ok(iguales(Object.keys(esquema.properties.caminar.properties), Object.keys(NAV_BASE)), 'esquema: caminar = NAV_BASE');
    ok(iguales(Object.keys(esquema.properties.paseo.properties), Object.keys(PASEO_BASE)), 'esquema: paseo = PASEO_BASE');
    const bloque = nombre => { const m = vida.match(new RegExp(`const ${nombre} = \\{([\\s\\S]*?)\\n\\};`)); return m ? [...m[1].matchAll(/^\s+(\w+):/gm)].map(x => x[1]) : []; };
    ok(iguales(bloque('CAMINAR'), Object.keys(NAV_BASE)), 'pestaña Vida: todos los campos de caminar');
    ok(iguales(bloque('PASEO'), Object.keys(PASEO_BASE)), 'pestaña Vida: todos los campos de paseo');
    for (const [k, v] of Object.entries({ ...NAV_BASE })) {
        const e = esquema.properties.caminar.properties[k];
        ok(e && v >= e.minimum && v <= e.maximum, `esquema: ${k} del código dentro de su rango`);
    }
    for (const [k, v] of Object.entries(PASEO_BASE)) {
        const e = esquema.properties.paseo.properties[k];
        ok(e && v >= e.minimum && v <= e.maximum, `esquema: paseo.${k} del código dentro de su rango`);
    }
    for (const parte of ['caminar', 'paseo']) for (const k of Object.keys(datos[parte] || {})) ok(k in (parte === 'caminar' ? NAV_BASE : PASEO_BASE), `navegacion.json: ${parte}.${k} existe en el código`);
    fijarPaseo({ caminar: { velocidad: 3.3, nada: 1, subida: 'x' }, paseo: { amplitud: 0.2 } });
    ok(N.ajustesNavegacion().velocidad === 3.3 && N.ajustesNavegacion().subida === NAV_BASE.subida && !('nada' in N.ajustesNavegacion()), 'fijarPaseo: mezcla caminar y descarta lo que no es número');
    ok(ajustesPaseo().amplitud === 0.2 && ajustesPaseo().acomodar === PASEO_BASE.acomodar, 'fijarPaseo: mezcla paseo');
    fijarPaseo(null);
    ok(N.ajustesNavegacion().velocidad === NAV_BASE.velocidad, 'fijarPaseo(null): vuelve al código');
}

console.warn = avisoOriginal;
console.log(`${pruebas - fallos}/${pruebas} comprobaciones de navegación OK`);
process.exit(fallos ? 1 : 0);
