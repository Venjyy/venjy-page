// =========================================================
// Prueba de las ruinas con cofre del bosque (7f-3 parte 4, sin navegador)
// Ejecutar: node mundo/tests/ruinas.mjs
//  1. Solo supervivencia: el creativo no tiene `ruinas` ni decorados de ruina.
//  2. Cantidad 6-8, separadas, cada una con un cofre dentro de su decorado y en el chunk lleno.
//  3. Determinismo: dos terrenos (hilo principal y worker) dan las mismas ruinas y los mismos chunks.
//  4. Colocación: sin bloques sobre estructuras, caminos, agua ni bajo el suelo; sin choques con otros
//     decorados; lejos de lugares (atalaya, iglú…), de la gatera y de las señales de los caminos.
//  5. Claros dentro del bosque; sin zonas de luz nuevas (no emiten luz).
//  6. Botín: la tabla `ruina` existe, es determinista y el cofre la usa (`lugarDe`).
// Sale con código 0 si todo coincide, 1 si no.
// =========================================================
import { pathToFileURL, fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { createHash } from 'crypto';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '../../');
const imp = p => import(pathToFileURL(resolve(raiz, p)).href);
const { generarDatos, azar } = await imp('mundo/mundo-datos.js');
const V = await imp('mundo/voxeles.js');
const { B } = await imp('mundo/texturas.js');
const { RUINAS } = await imp('mundo/ruinas.js');
const { botinDe } = await imp('mundo/supervivencia/botin.js');
const { crearContenedores } = await imp('mundo/supervivencia/contenedores.js');
const { O } = await imp('mundo/supervivencia/objetos.js');

let fallos = 0;
const falla = msg => { if (fallos < 25) console.error('FALLO: ' + msg); fallos++; };
const huella = (...as) => { const h = createHash('sha1'); for (const a of as) h.update(Buffer.from(a.buffer, a.byteOffset, a.byteLength)); return h.digest('hex'); };

// 1. Creativo intacto
const creativo = V.prepararTerreno(generarDatos('h'));
if (creativo.ruinas) falla('el creativo tiene `ruinas`');
if (creativo.decor.some(d => d.ruina)) falla('el creativo tiene decorados de ruina');

V.fijarAlto(V.ALTO_SUPERVIVENCIA);
const datos = generarDatos('h');
const A = V.prepararTerreno(datos, { supervivencia: true });
const B2 = V.prepararTerreno(generarDatos('h'), { supervivencia: true });
const N = V.CHUNK, DY = A.dy, W = N + 2;

// 2. Cantidad, separación y cofre
const rs = A.ruinas || [];
if (rs.length < 6 || rs.length > 8) falla(`ruinas: ${rs.length}, esperaba 6-8`);
const decs = A.decor.filter(d => d.ruina);
if (decs.length !== rs.length) falla(`decorados de ruina: ${decs.length} ≠ ${rs.length}`);
if (new Set(rs.map(r => r.tipo)).size < 2) falla('solo hay un tipo de ruina');
for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) {
    if (Math.hypot(rs[i].x - rs[j].x, rs[i].z - rs[j].z) < RUINAS.separacion) falla(`ruinas ${i} y ${j} muy juntas`);
}
rs.forEach((r, i) => {
    const d = decs[i], c = r.cofre;
    const idx = []; for (let k = 0; k < d.bloques.length; k += 4) if (d.bloques[k + 3] === B.COFRE) idx.push(k);
    if (idx.length !== 1) { falla(`ruina ${i}: ${idx.length} cofres`); return; }
    const k = idx[0];
    if (d.bloques[k] !== c.x || d.bloques[k + 1] !== c.y || d.bloques[k + 2] !== c.z) falla(`ruina ${i}: cofre no coincide con terreno.ruinas`);
    const cx = Math.floor(c.x / N), cz = Math.floor(c.z / N);
    const lleno = V.llenarChunk(A, cx, cz);
    if (lleno.vox[((c.y + DY) * W + (c.z - (cz * N - 1))) * W + (c.x - (cx * N - 1))] !== B.COFRE) falla(`ruina ${i}: cofre ausente en el chunk lleno`);
});

// 3. Determinismo
if (JSON.stringify(A.ruinas) !== JSON.stringify(B2.ruinas)) falla('las ruinas no son iguales entre dos terrenos');
const chunks = new Set();
for (const d of decs) for (let i = 0; i < d.bloques.length; i += 4) chunks.add(Math.floor(d.bloques[i] / N) + ',' + Math.floor(d.bloques[i + 2] / N));
for (const k of chunks) {
    const [cx, cz] = k.split(',').map(Number);
    const a = V.llenarChunk(A, cx, cz), b = V.llenarChunk(B2, cx, cz);
    if (huella(a.vox, a.luz) !== huella(b.vox, b.luz)) falla(`chunk ${cx},${cz} distinto entre terrenos`);
}

// 4. Colocación
const otros = new Set();
for (const d of A.decor) if (!d.ruina && d.bloques) for (let i = 0; i < d.bloques.length; i += 4) otros.add(d.bloques[i] + ',' + d.bloques[i + 1] + ',' + d.bloques[i + 2]);
const mios = new Set();
let bloques = 0;
for (const d of decs) for (let i = 0; i < d.bloques.length; i += 4) {
    const [x, y, z] = [d.bloques[i], d.bloques[i + 1], d.bloques[i + 2]], o = z * A.BW + x, k = x + ',' + y + ',' + z;
    bloques++;
    if (A.ES[o]) falla(`bloque sobre una estructura en ${k}`);
    if (A.SUP[o] === B.CAMINO || A.SUP[o] === B.TABLONES) falla(`bloque sobre el camino en ${k}`);
    if (A.HT[o] < 15) falla(`bloque en el agua en ${k}`);
    if (y <= A.HT[o]) falla(`bloque bajo el suelo en ${k}`);
    if (otros.has(k) || mios.has(k)) falla(`choque de bloques en ${k}`);
    mios.add(k);
}
const lejos = (r, x, z, min, que) => { if (Math.hypot(r.x - x, r.z - z) < min) falla(`ruina en ${r.x},${r.z} a menos de ${min} de ${que}`); };
for (const r of rs) {
    for (const l of A.lugares) lejos(r, l.x, l.z, l.radio + 18, 'lugar ' + l.clave);
    if (A.gatera) lejos(r, (A.gatera.minx + A.gatera.maxx) / 2, (A.gatera.minz + A.gatera.maxz) / 2, 30, 'la gatera');
    for (const c of A.caminos) lejos(r, c.x, c.z, 10, 'un cartel de ' + c.tipo);
    for (const d of A.decor) if (!d.ruina && d.cx !== undefined) lejos(r, d.cx, d.cz, (d.r || 0) + 6, 'un decorado');
}

// 5. Bosque y luz
const { W: WW, H: HH, T } = datos;
for (const r of rs) {
    let n = 0;
    const ccx = Math.floor(Math.floor(r.x) / 4), ccz = Math.floor(Math.floor(r.z) / 4);
    for (let dz = -6; dz <= 6; dz++) for (let dx = -6; dx <= 6; dx++) {
        const x = ccx + dx, z = ccz + dz;
        if (x >= 0 && z >= 0 && x < WW && z < HH && T[z * WW + x] === 'hojas') n++;
    }
    if (n < RUINAS.densidad) falla(`ruina en ${r.x},${r.z} fuera del bosque (${n} celdas)`);
}
const faroles = A.decor.filter(d => d.farol).length;
if (A.zonasLuz.length !== creativo.zonasLuz.length + faroles) falla(`zonasLuz: ${A.zonasLuz.length}, esperaba ${creativo.zonasLuz.length + faroles}`);

// 6. Botín
const a1 = botinDe('ruina', azar(7)), a2 = botinDe('ruina', azar(7));
if (JSON.stringify(a1) !== JSON.stringify(a2)) falla('botín de ruina no determinista');
if (!a1.length || a1.some(([id, n]) => !id || n < 1)) falla('botín de ruina inválido');
const cont = crearContenedores({ mundo: {}, terreno: A });
for (const r of rs) {
    const e = cont.obtener(r.cofre.x, r.cofre.y + A.dy, r.cofre.z, B.COFRE);
    const cargados = e.casillas.filter(Boolean).length;
    if (!cargados) falla(`cofre vacío en ${r.cofre.x},${r.cofre.z}`);
    const igual = crearContenedores({ mundo: {}, terreno: A }).obtener(r.cofre.x, r.cofre.y + A.dy, r.cofre.z, B.COFRE);
    if (JSON.stringify(igual.casillas) !== JSON.stringify(e.casillas)) falla('botín del cofre cambia entre partidas');
}
// La tabla de ruina no es la de la casa (el cofre usó `lugarDe`)
const huellaCasa = JSON.stringify(botinDe('casa', azar(7)));
if (JSON.stringify(a1) === huellaCasa) falla('la tabla `ruina` no existe (cae en `casa`)');

console.log(`${fallos ? 'FALLÓ' : 'OK'}: ${rs.length} ruinas (${rs.filter(r => r.tipo === 'arco').length} arcos, ${rs.filter(r => r.tipo === 'pilar').length} pilares), ${bloques} bloques, ${chunks.size} chunks comparados`);
process.exit(fallos ? 1 : 0);
