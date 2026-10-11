// =========================================================
// Prueba de los caminos con señales (7f-3 parte 1, sin navegador)
// Ejecutar: node mundo/tests/caminos.mjs
//
//  1. Solo supervivencia: el terreno del creativo no tiene `caminos` y su lista de decorados no cambia.
//  2. Determinismo: dos terrenos con la misma semilla (el hilo principal y un worker) dan las mismas
//     señales y los mismos chunks (vox y luz) en todos los chunks que tocan una señal.
//  3. Contenido: mojones y 5 carteles de cruce (uno por cruce de RUTA), textos con par ES/EN, sin
//     emojis, distancias coherentes (los mojones de un tramo crecen de 100 en 100 aprox.).
//  4. Colocación: ningún bloque sobre el camino, sobre estructuras ni bajo el agua; sin choques entre
//     señales; cada bloque aparece en el chunk lleno (con el desnivel de supervivencia).
//  5. Luz: solo los faroles amplían la ventana de luz (zonasLuz) y sus chunks salen como forzados.
// Sale con código 0 si todo coincide, 1 si no.
// =========================================================
import { pathToFileURL, fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { createHash } from 'crypto';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '../../');
const imp = p => import(pathToFileURL(resolve(raiz, p)).href);
const { generarDatos, RUTA } = await imp('mundo/mundo-datos.js');
const V = await imp('mundo/voxeles.js');
const { B } = await imp('mundo/texturas.js');
const { CAMINOS } = await imp('mundo/caminos.js');

let fallos = 0;
const falla = msg => { if (fallos < 25) console.error('FALLO: ' + msg); fallos++; };
const huella = (...as) => { const h = createHash('sha1'); for (const a of as) h.update(Buffer.from(a.buffer, a.byteOffset, a.byteLength)); return h.digest('hex'); };

// 1. Creativo intacto
const creativo = V.prepararTerreno(generarDatos('h'));
if (creativo.caminos) falla('el creativo tiene `caminos`');
const base = V.prepararTerreno(generarDatos('h'));
if (creativo.decor.length !== base.decor.length || creativo.zonasLuz.length !== base.zonasLuz.length) falla('el creativo no es estable');

V.fijarAlto(V.ALTO_SUPERVIVENCIA);
const A = V.prepararTerreno(generarDatos('h'), { supervivencia: true });
const B2 = V.prepararTerreno(generarDatos('h'), { supervivencia: true });
const DY = A.dy;
if (A.decor.length <= creativo.decor.length) falla('la supervivencia no sumó decorados');

// 3. Contenido
const cs = A.caminos || [];
const mojones = cs.filter(c => c.tipo === 'mojon'), cruces = cs.filter(c => c.tipo === 'cruce');
if (cruces.length !== RUTA.length - 2) falla(`cruces: ${cruces.length}, esperaba ${RUTA.length - 2}`);
if (mojones.length < 10) falla(`pocos mojones: ${mojones.length}`);
const sinEmoji = /\p{Extended_Pictographic}/u;
for (const c of cs) {
    for (const l of ['es', 'en']) {
        if (!c.texto[l] || !/\d+ m/.test(c.texto[l])) falla(`texto ${l} sin distancia en ${c.tipo} (${c.x}, ${c.z})`);
        if (sinEmoji.test(c.texto[l])) falla(`emoji en ${c.tipo}`);
    }
    if (c.texto.es === c.texto.en) falla(`ES y EN iguales en ${c.tipo}: ${c.texto.es}`);
}
for (const c of cruces) {
    const [lugar, ant, sig] = c.texto.es.split('\n');
    const m = /^(.+) (\d+) m$/.exec(lugar);
    if (!m || !/^< .+ \d+ m$/.test(ant) || !/^.+ \d+ m >$/.test(sig)) falla(`forma del cartel de cruce: ${JSON.stringify(c.texto.es)}`);
    else if (+m[2] !== CAMINOS.cartelA && Math.abs(+m[2] - CAMINOS.cartelA) > 1) falla(`distancia al lugar ${m[2]} ≠ ${CAMINOS.cartelA}`);
}
const porTramo = new Map();
for (const c of mojones) {
    const [, n, d] = /Tramo (\d+)\n(\d+) m/.exec(c.texto.es) || [];
    if (!n) { falla('mojón sin número de tramo'); continue; }
    if (!porTramo.has(n)) porTramo.set(n, []);
    porTramo.get(n).push(+d);
}
for (const [n, ds] of porTramo) for (let i = 1; i < ds.length; i++) {
    if (ds[i] <= ds[i - 1]) falla(`mojones del tramo ${n} no crecen`);
    if (ds[i] - ds[i - 1] > 2.5 * CAMINOS.cadaMojon) falla(`hueco enorme entre mojones del tramo ${n}`);
}

// El texto del mojón queda sobre la cima del pilar y corrido hacia el camino (7f-3 ajuste de texto)
{
    const pilares = A.decor.slice(creativo.decor.length).filter(d => d.bloques.length === 12);
    for (const c of mojones) {
        const d = pilares.find(q => Math.hypot(q.cx + 0.5 - c.x, q.cz + 0.5 - c.z) < 2.5);
        if (!d) { falla(`mojón sin pilar cerca en ${c.x}, ${c.z}`); continue; }
        if (c.y < d.maxY + 1) falla(`texto del mojón metido en el pilar (y ${c.y}, cima ${d.maxY})`);
        if (Math.hypot(d.cx + 0.5 - c.x, d.cz + 0.5 - c.z) < 1) falla('texto del mojón sin correr hacia el camino');
    }
}

// 2. Determinismo (hilo principal contra «worker»)
if (JSON.stringify(A.caminos) !== JSON.stringify(B2.caminos)) falla('las señales no son iguales entre dos terrenos');
const lista = [];
const decorCam = A.decor.slice(creativo.decor.length);
const chunksDe = new Set();
for (const d of decorCam) {
    for (let i = 0; i < d.bloques.length; i += 4) chunksDe.add(Math.floor(d.bloques[i] / V.CHUNK) + ',' + Math.floor(d.bloques[i + 2] / V.CHUNK));
}
for (const k of chunksDe) lista.push(k.split(',').map(Number));
if (!lista.length) falla('ningún chunk con señales');
for (const [cx, cz] of lista) {
    const a = V.llenarChunk(A, cx, cz), b = V.llenarChunk(B2, cx, cz);
    if (huella(a.vox, a.luz) !== huella(b.vox, b.luz)) falla(`chunk ${cx},${cz} distinto entre terrenos`);
}

// 4. Colocación
const ocupado = new Map();
const N = V.CHUNK;
let bloques = 0;
for (const d of decorCam) {
    for (let i = 0; i < d.bloques.length; i += 4) {
        const [x, y, z, id] = [d.bloques[i], d.bloques[i + 1], d.bloques[i + 2], d.bloques[i + 3]];
        bloques++;
        const o = z * A.BW + x;
        if (A.SUP[o] === B.CAMINO || A.SUP[o] === B.TABLONES) falla(`bloque sobre el camino en ${x},${z}`);
        if (A.ES[o]) falla(`bloque sobre una estructura en ${x},${z}`);
        if (y <= A.HT[o]) falla(`bloque bajo el suelo en ${x},${y},${z}`);
        if (A.HT[o] < 14 + 1) falla(`bloque en el agua en ${x},${z}`);
        const k = `${x},${y},${z}`;
        if (ocupado.has(k)) falla(`dos señales en ${k}`);
        ocupado.set(k, id);
        // el chunk lleno lo tiene (con desnivel de supervivencia)
        const cx = Math.floor(x / N), cz = Math.floor(z / N);
        const r = V.llenarChunk(A, cx, cz);
        const W = N + 2, lx = x - (cx * N - 1), lz = z - (cz * N - 1);
        if (i % 16 === 0 && r.vox[((y + DY) * W + lz) * W + lx] !== id) falla(`el chunk ${cx},${cz} no tiene el bloque ${id} en ${x},${y},${z}`);
    }
}
if (!bloques) falla('sin bloques de señales');

// 5. Luz: solo los faroles
const faroles = decorCam.filter(d => d.farol);
if (faroles.length !== cruces.length) falla(`faroles: ${faroles.length}, cruces: ${cruces.length}`);
if (A.zonasLuz.length !== base.zonasLuz.length + faroles.length) falla(`zonasLuz: ${A.zonasLuz.length}, esperaba ${base.zonasLuz.length + faroles.length}`);
for (const f of faroles) {
    const cx = Math.floor(f.cx / N), cz = Math.floor(f.cz / N);
    if (!V.chunkForzado(A, cx, cz)) falla(`el chunk del farol ${cx},${cz} no usa la luz ampliada`);
    if (!f.bloques.includes(B.PIEDRA_LUMINOSA)) falla('farol sin piedra luminosa');
}

console.log(`${fallos ? 'FALLÓ' : 'OK'}: ${mojones.length} mojones, ${cruces.length} cruces, ${faroles.length} faroles, ${bloques} bloques, ${lista.length} chunks comparados`);
process.exit(fallos ? 1 : 0);
