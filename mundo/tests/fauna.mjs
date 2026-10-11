// =========================================================
// Prueba de la fauna de ambiente (7f-3 parte 5, sin navegador)
// Ejecutar: node mundo/tests/fauna.mjs
//  1. La flor de `plantaEn` coincide con la del chunk lleno; el creativo no usa fauna.
//  2. Anclas: de los tres tipos, sin repetir tipo/sitio, y deterministas entre dos terrenos (hilo y worker).
//  3. Colocación: cada ancla con radio sin estructuras, caminos ni tablones; lejos de lugares, señales,
//     ruinas, páginas y decorados; flores con flores, lagos hondos, bosque con hojas cerca.
//  4. Movimiento: ningún bicho se aleja de su ancla más que `FAUNA.vuelo`, todo finito, sobre el suelo
//     (o el agua) y nunca sobre una estructura o camino; los peces saltan y se esconden; la luciérnaga parpadea.
//  5. Tope: con el dibujo real (InstancedMesh, sin navegador) nunca hay más de 64 bichos ni más del tope de cada
//     especie; de día no hay luciérnagas y de noche no hay mariposas ni abejas; cerca de nada, 0 bichos.
//  6. Costo por cuadro del dibujo (se imprime; falla solo si pasa de 1 ms de media).
// Sale con código 0 si todo coincide, 1 si no.
// =========================================================
import { pathToFileURL, fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { readFileSync } from 'fs';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '../../');
const imp = p => import(pathToFileURL(resolve(raiz, p)).href);
const { generarDatos } = await imp('mundo/mundo-datos.js');
const V = await imp('mundo/voxeles.js');
const { B } = await imp('mundo/texturas.js');
const F = await imp('mundo/fauna.js');
const THREE = await imp('vendor/three.module.js');

let fallos = 0;
const falla = msg => { if (fallos < 25) console.error('FALLO: ' + msg); fallos++; };

// Sin DOM: un lienzo que no dibuja (el dibujo real necesita `document.createElement('canvas')`)
const ctxVacio = new Proxy({}, { get: () => () => {}, set: () => true });
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ctxVacio }) };

V.fijarAlto(V.ALTO_SUPERVIVENCIA);
const datos = generarDatos('h');
const A = V.prepararTerreno(datos, { supervivencia: true });
const B2 = V.prepararTerreno(generarDatos('h'), { supervivencia: true });
const { BW, HT, ES, SUP } = A, N = V.CHUNK, DY = A.dy, W = N + 2;
const anclas = F.colocarFauna(A, datos, V.ESCALA, V.NIVEL_AGUA);

// 1. Flores y creativo
{
    let flores = 0, vistas = 0;
    for (const [cx, cz] of [[10, 10], [30, 20], [50, 40], [20, 50], [60, 10], [5, 30]]) {
        const lleno = V.llenarChunk(A, cx, cz);
        for (let lz = 0; lz < N; lz++) for (let lx = 0; lx < N; lx++) {
            const bx = cx * N + lx, bz = cz * N + lz, o = bz * BW + bx;
            if (A.ES[o] || SUP[o] !== B.PASTO || HT[o] <= V.NIVEL_AGUA) continue;
            const id = lleno.vox[((HT[o] + 1 + DY) * W + (lz + 1)) * W + (lx + 1)];
            const arbol = id === B.TRONCO || id === B.HOJAS;
            vistas++;
            const esPlanta = id === B.PASTO_ALTO || id === B.FLOR_ROJA || id === B.FLOR_AMARILLA || id === B.FLOR_AZUL;
            if (!arbol && (esPlanta || V.plantaEn(bx, bz)) && id !== V.plantaEn(bx, bz)) falla(`planta del chunk ${id} ≠ plantaEn ${V.plantaEn(bx, bz)} en ${bx},${bz}`);
            if (id === B.FLOR_ROJA || id === B.FLOR_AMARILLA || id === B.FLOR_AZUL) flores++;
        }
    }
    if (!vistas || !flores) falla(`no se encontraron flores en los chunks revisados (${vistas} columnas)`);
    const creativo = V.prepararTerreno(generarDatos('h'));
    if (creativo.fauna) falla('el creativo tiene `fauna`');
    if (A.fauna) falla('prepararTerreno no debe calcular la fauna (solo la pide el cliente al cargar)');
}

// 2. Anclas
const por = t => anclas.filter(a => a.tipo === t);
for (const t of ['flores', 'lago', 'bosque']) {
    if (por(t).length < 4) falla(`pocas anclas de ${t}: ${por(t).length}`);
    if (por(t).length > F.FAUNA.anclas[t]) falla(`demasiadas anclas de ${t}`);
    const ps = por(t);
    for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) {
        if (Math.hypot(ps[i].x - ps[j].x, ps[i].z - ps[j].z) < F.FAUNA.separacion[t]) falla(`anclas ${t} ${i} y ${j} muy juntas`);
    }
}
if (anclas.some((a, i) => a.i !== i)) falla('los índices de las anclas no son 0..n');
const otras = F.colocarFauna(B2, generarDatos('h'), V.ESCALA, V.NIVEL_AGUA);
if (JSON.stringify(anclas) !== JSON.stringify(otras)) falla('las anclas no son iguales entre dos terrenos');
if (JSON.stringify(anclas) !== JSON.stringify(F.colocarFauna(A, datos, V.ESCALA, V.NIVEL_AGUA))) falla('las anclas cambian al repetir el cálculo');

// 3. Colocación
const R = F.FAUNA.despeje;
const lejos = (a, x, z, min, que) => { if (Math.hypot(a.x - x, a.z - z) < min) falla(`ancla ${a.tipo} ${a.i} (${a.x},${a.z}) a menos de ${min} de ${que}`); };
for (const a of anclas) {
    for (let dz = -R; dz <= R; dz++) for (let dx = -R; dx <= R; dx++) {
        const o = (a.z + dz) * BW + a.x + dx;
        if (ES[o]) { falla(`estructura a ${dx},${dz} del ancla ${a.i}`); dz = R; break; }
        if (SUP[o] === B.CAMINO || SUP[o] === B.TABLONES) { falla(`camino a ${dx},${dz} del ancla ${a.i}`); dz = R; break; }
    }
    for (const l of A.lugares) lejos(a, l.x, l.z, l.radio + F.FAUNA.lejosDeLugar, 'lugar ' + l.clave);
    for (const c of A.caminos) lejos(a, c.x, c.z, R, 'una señal de ' + c.tipo);
    for (const r of A.ruinas) lejos(a, r.x, r.z, R, 'una ruina');
    for (const p of A.paginas) lejos(a, p.x, p.z, 3, 'una página');
    for (const d of A.decor) if (d.cx !== undefined) lejos(a, d.cx, d.cz, (d.r || 0) + F.FAUNA.lejosDeLugar, 'un decorado');
    const o = a.z * BW + a.x;
    if (a.tipo === 'lago') {
        if (a.y !== V.NIVEL_AGUA + 1) falla(`lago ${a.i}: y ${a.y}`);
        if (HT[o] > V.NIVEL_AGUA - 2) falla(`lago ${a.i}: poca agua`);
    } else {
        if (a.y !== HT[o]) falla(`ancla ${a.i}: y ${a.y} ≠ suelo ${HT[o]}`);
        if (SUP[o] !== B.PASTO) falla(`ancla ${a.i} no está sobre pasto`);
    }
    if (a.tipo === 'flores') {
        let n = 0;
        for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) {
            const id = V.plantaEn(a.x + dx, a.z + dz);
            if ((id === B.FLOR_ROJA || id === B.FLOR_AMARILLA || id === B.FLOR_AZUL) && SUP[(a.z + dz) * BW + a.x + dx] === B.PASTO) n++;
        }
        if (n < F.FAUNA.minFlores) falla(`ancla de flores ${a.i}: solo ${n} flores`);
    }
}
for (const t of Object.keys(F.FAUNA.vuelo)) if (F.FAUNA.vuelo[t] + 1 > R) falla(`el vuelo de ${t} no cabe en el despeje`);

// 4. Movimiento
let saltos = 0, muestras = 0, brMin = 1, brMax = 0;
for (const a of anclas) for (const e of F.ESPECIES_DE[a.tipo]) {
    for (let k = 0; k < F.FAUNA.porAncla[e]; k++) {
        let vistoPez = false, ocultoPez = false;
        for (let t = 0; t < 600; t += 0.37) {
            const c = F.criaturaEn(e, a, k, t);
            muestras++;
            if (![c.x, c.y, c.z, c.ang, c.br].every(Number.isFinite)) { falla(`${e} no finito en ${a.i}/${k}/${t}`); break; }
            const d = Math.hypot(c.x - (a.x + 0.5), c.z - (a.z + 0.5));
            if (d > F.FAUNA.vuelo[e] + 1e-6) { falla(`${e} a ${d.toFixed(2)} del ancla ${a.i} (máx ${F.FAUNA.vuelo[e]})`); break; }
            if (c.br < 0 || c.br > 1) falla(`brillo ${c.br} fuera de 0..1`);
            if (e === 'luciernaga') { brMin = Math.min(brMin, c.br); brMax = Math.max(brMax, c.br); }
            if (e === 'pez') { if (c.vis) { vistoPez = true; saltos++; if (c.y < a.y - 1e-6 || c.y > a.y + 1.4) falla(`pez fuera de la altura del salto: ${c.y}`); } else ocultoPez = true; }
            else if (c.y < a.y + 0.5 || c.y > a.y + 3.2) falla(`${e} a altura ${c.y - a.y} del ancla ${a.i}`);
            const o = Math.floor(c.z) * BW + Math.floor(c.x);
            if (ES[o] || SUP[o] === B.CAMINO || SUP[o] === B.TABLONES) { falla(`${e} sobre estructura o camino en ${Math.floor(c.x)},${Math.floor(c.z)}`); break; }
        }
        if (e === 'pez' && !(vistoPez && ocultoPez)) falla(`el pez ${a.i}/${k} no salta o no se esconde`);
    }
}
if (brMax - brMin < 0.9) falla('la luciérnaga no parpadea');
if (JSON.stringify(F.criaturaEn('mariposa', anclas[0], 1, 12.5)) !== JSON.stringify(F.criaturaEn('mariposa', anclas[0], 1, 12.5))) falla('criaturaEn no es pura');

// 5. Tope con el dibujo real
const { crearFauna } = await imp('mundo/supervivencia/fauna.js');
const escena = new THREE.Scene();
const camara = new THREE.PerspectiveCamera(70, 1.6, 0.1, 1000);
const jugador = { pos: new THREE.Vector3(0, 0, 0) };
const dia = { esNoche: false };
const fauna = crearFauna({ scene: escena, camara, jugador, dia, terreno: A, datos, dy: DY });
if (fauna.anclas.length !== anclas.length) falla('el dibujo y colocarFauna no dan las mismas anclas');
const cuenta = () => Object.fromEntries(['mariposa', 'abeja', 'pez', 'luciernaga'].map((e, i) => [e, escena.children[i].count]));
const sitios = [...anclas, { x: Math.round(BW / 2), z: Math.round(A.BD / 2), y: 60, tipo: 'campo' }];
let maxDia = 0, maxNoche = 0, maxDiaCuenta = null;
for (const noche of [false, true]) {
    dia.esNoche = noche;
    for (const s of sitios) {
        jugador.pos.set(s.x + 0.5, s.y + DY + 1, s.z + 0.5);
        for (let f = 0; f < 6; f++) {
            fauna.actualizar(f ? 1 / 60 : 1);
            const c = cuenta(), total = c.mariposa + c.abeja + c.pez + c.luciernaga;
            if (total > F.TOPE_TOTAL) falla(`${total} bichos, tope ${F.TOPE_TOTAL}`);
            for (const e of Object.keys(c)) if (c[e] > F.TOPES[e]) falla(`${e}: ${c[e]} > ${F.TOPES[e]}`);
            if (noche && (c.mariposa || c.abeja)) falla('de noche hay mariposas o abejas');
            if (!noche && c.luciernaga) falla('de día hay luciérnagas');
            if (noche) maxNoche = Math.max(maxNoche, total); else if (total > maxDia) { maxDia = total; maxDiaCuenta = c; }
        }
    }
}
// Apretado: 60 anclas de cada tipo pegadas al jugador llenan hasta el tope de cada especie y ni uno más
{
    const dense = [];
    for (let i = 0; i < 180; i++) dense.push({ i, tipo: ['flores', 'lago', 'bosque'][i % 3], x: 700 + (i % 20), z: 500 + (i >> 1) % 20, y: 40 });
    const e2 = new THREE.Scene();
    const f2 = crearFauna({ scene: e2, camara, jugador, dia, terreno: A, datos, dy: DY, anclas: dense });
    jugador.pos.set(710, 40 + DY + 1, 510);
    const pico = {};
    for (const noche of [false, true]) {
        dia.esNoche = noche;
        f2.actualizar(1);
        const c = Object.fromEntries(['mariposa', 'abeja', 'pez', 'luciernaga'].map((e, i) => [e, e2.children[i].count]));
        const tot = Object.values(c).reduce((a, b) => a + b, 0);
        if (tot > F.TOPE_TOTAL) falla(`apretado: ${tot} bichos`);
        for (const e of Object.keys(c)) if (c[e] > F.TOPES[e]) falla(`apretado: ${e} ${c[e]} > ${F.TOPES[e]}`);
        pico[noche ? 'noche' : 'dia'] = c;
    }
    if (pico.dia.mariposa !== F.TOPES.mariposa || pico.dia.abeja !== F.TOPES.abeja) falla('apretado de día: no llena mariposas y abejas hasta el tope');
    if (pico.noche.luciernaga !== F.TOPES.luciernaga) falla('apretado de noche: no llena las luciérnagas hasta el tope');
    f2.quitar();
    dia.esNoche = false;
}
// Lejos de todo y bajo tierra: nada
jugador.pos.set(5, 5, 5); fauna.actualizar(1);
if (Object.values(cuenta()).some(n => n)) falla('hay bichos lejos de toda ancla');
const a0 = anclas.find(a => a.tipo === 'flores');
jugador.pos.set(a0.x + 0.5, a0.y + DY - 40, a0.z + 0.5); fauna.actualizar(1);
if (Object.values(cuenta()).some(n => n)) falla('hay bichos con el jugador bajo tierra');
if (!maxDia || !maxNoche) falla(`nunca hubo bichos (día ${maxDia}, noche ${maxNoche})`);

// 6. Costo por cuadro (64 bichos como máximo): el peor caso es una zona con las cuatro especies a la vez
dia.esNoche = false;
jugador.pos.set(a0.x + 0.5, a0.y + DY + 1, a0.z + 0.5);
fauna.actualizar(1);
let ms = 0;
const CUADROS = 3000;
const t0 = performance.now();
for (let f = 0; f < CUADROS; f++) fauna.actualizar(1 / 60);
ms = (performance.now() - t0) / CUADROS;
if (ms > 1) falla(`el dibujo cuesta ${ms.toFixed(3)} ms por cuadro (> 1 ms)`);
fauna.quitar();

// Sin emojis ni imágenes: los dos archivos nuevos
for (const f of ['mundo/fauna.js', 'mundo/supervivencia/fauna.js']) {
    if (/\p{Extended_Pictographic}/u.test(readFileSync(resolve(raiz, f), 'utf8'))) falla(`emoji en ${f}`);
}

const c = k => por(k).length;
console.log(`${fallos ? 'FALLÓ' : 'OK'}: ${anclas.length} anclas (${c('flores')} flores, ${c('lago')} lagos, ${c('bosque')} bosque), ${muestras} muestras de movimiento, ${saltos} saltos de pez, máx. ${maxDia} de día (${JSON.stringify(maxDiaCuenta)}) y ${maxNoche} de noche (tope ${F.TOPE_TOTAL}); dibujo ${ms.toFixed(4)} ms por cuadro`);
process.exit(fallos ? 1 : 0);
