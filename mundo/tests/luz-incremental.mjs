// =========================================================
// Prueba de la luz incremental y el remallado por secciones (bloque 7b-1, sin navegador)
// Ejecutar: node mundo/tests/luz-incremental.mjs
//
// Monta el MundoVoxel de la supervivencia en Node (sin workers: lo que iría a un worker se hace en
// el hilo principal) y aplica ediciones al azar con mundo.editar / editarLote, igual que el juego.
// Tras cada edición compara, para cada chunk cargado cerca, bloque a bloque:
//   1. vox  = llenarChunk desde cero
//   2. luz  = llenarChunk desde cero (cielo y bloque, todas las celdas de la ventana)
//   3. malla: cada sección de 16 de alto (la malla entera con sus grupos o la sección nueva) da los
//      mismos triángulos, en el mismo orden, que mallarChunkCrudo desde cero
// Escenarios: campo abierto (luz local), campamento (ventana ampliada por el decorado), base con
// antorchas puestas por el jugador (emisores), bordes entre chunks de los dos tipos y lotes de
// varias ediciones (como una explosión). Cuenta cuántas veces se usó el camino lento (rehacer).
// Sale con código 0 si todo coincide, 1 si no.
// =========================================================
import { pathToFileURL, fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '../../');
const imp = p => import(pathToFileURL(resolve(raiz, p)).href);
const THREE = await imp('vendor/three.module.js');
const { generarDatos } = await imp('mundo/mundo-datos.js');
const V = await imp('mundo/voxeles.js');
const { B, TIPO } = await imp('mundo/texturas.js');

let fallos = 0;
const falla = msg => { if (fallos < 25) console.error('FALLO: ' + msg); fallos++; };

V.fijarAlto(V.ALTO_SUPERVIVENCIA);
const ter = V.prepararTerreno(generarDatos('h'), { supervivencia: true });
const CH = V.CHUNK;

// Azar con semilla (las fallas se repiten igual)
let semilla = 7031;
const azar = () => { semilla = (semilla * 1103515245 + 12345) >>> 0; return semilla / 4294967296; };
const entero = (a, b) => a + Math.floor(azar() * (b - a + 1));

const mats = { solido: new THREE.MeshBasicMaterial(), agua: new THREE.MeshBasicMaterial() };
const mundo = new V.MundoVoxel(new THREE.Scene(), ter, mats, 3);
let rehechos = 0;
const invalidar = mundo.invalidar.bind(mundo);
mundo.invalidar = (k, ch) => { if (ch && ch.luzOk) rehechos++; invalidar(k, ch); };

function cargar(x, z) {
    mundo.planificar(x, z);
    while (mundo.construir(1e9) > 0) { /* todo */ }
    mundo.procesarRemallado(Infinity);
}
function superficie(x, z) {
    for (let y = V.ALTO - 2; y > 0; y--) { const id = mundo.bloque(x, y, z); if (id > 0 && TIPO[id] === 1) return y; }
    return 1;
}

// Triángulos de un tramo de índices como lista plana de atributos (posición, uv, color, luz)
function triangulos(geo, i0, i1, out) {
    const idx = geo.index.array, at = ['position', 'uv', 'color', 'luz'].map(n => geo.attributes[n]);
    for (let k = i0; k < i1; k++) {
        const v = idx[k];
        for (const a of at) for (let c = 0; c < a.itemSize; c++) out.push(a.array[v * a.itemSize + c]);
    }
    return out;
}
function datosTramo(d, i0, i1) {
    const out = [], g = V.geometriaDe(d);
    return triangulos(g, i0, i1, out);
}
// Triángulos de la sección s tal como se dibujan ahora (mallas enteras con grupos, o la sección nueva)
function seccionActual(ch, s, cual) {
    if (ch.secc && ch.secc.has(s)) {
        const m = ch.secc.get(s)[cual];
        return m ? triangulos(m.geometry, 0, m.geometry.index.count, []) : [];
    }
    const m = ch.mallas[cual];
    if (!m) return [];
    const c = m.userData.cortes;
    return triangulos(m.geometry, c[s], c[s + 1], []);
}

// Compara los chunks a ±1 de cada punto (la luz de una edición no llega más allá de 15 bloques)
function comparar(etiqueta, puntos) {
    const claves = new Set();
    for (const [x, , z] of puntos) for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) claves.add((Math.floor(x / CH) + dx) + ',' + (Math.floor(z / CH) + dz));
    for (const k of claves) {
        const ch = mundo.chunks.get(k);
        if (!ch) continue;
        const [cx, cz] = k.split(',').map(Number);
        const r = V.llenarChunk(ter, cx, cz);
        let dv = 0, dl = 0, primera = -1;
        for (let i = 0; i < r.vox.length; i++) {
            if (r.vox[i] !== ch.vox[i]) dv++;
            if (r.luz[i] !== ch.luz[i]) { dl++; if (primera < 0) primera = i; }
        }
        if (dv) falla(`${etiqueta}: chunk ${k} con ${dv} bloques distintos`);
        if (dl) {
            const NN = 18 * 18, y = Math.floor(primera / NN), lz = Math.floor(primera / 18) % 18, lx = primera % 18;
            falla(`${etiqueta}: chunk ${k} (${ch.forzado ? 'forzado' : 'local'}) con ${dl} celdas de luz distintas; la primera (${lx},${y},${lz}) ${ch.luz[primera].toString(16)} en vez de ${r.luz[primera].toString(16)}`);
        }
        if (!ch.luzOk) falla(`${etiqueta}: chunk ${k} quedó sin luz exacta`);
        // Malla, sección por sección
        const g = V.mallarChunkCrudo(cx, cz, r);
        for (const cual of ['solido', 'agua']) {
            const d = g[cual], cort = g.cortes[cual === 'solido' ? 's' : 'a'];
            for (let s = 0; s < cort.length - 1; s++) {
                const esperado = d ? datosTramo(d, cort[s], cort[s + 1]) : [];
                const actual = seccionActual(ch, s, cual);
                if (esperado.length !== actual.length || esperado.some((v, i) => v !== actual[i])) {
                    falla(`${etiqueta}: chunk ${k} malla ${cual} sección ${s} distinta (${actual.length / 10 | 0} vs ${esperado.length / 10 | 0} vértices)`);
                    break;
                }
            }
        }
    }
}

const PONER = [B.PIEDRA, B.TIERRA, B.VIDRIO, B.HOJAS, B.TABLONES, B.AGUA];
function edicionAlAzar(x0, z0, r, conAntorchas) {
    const x = x0 + entero(-r, r), z = z0 + entero(-r, r), top = superficie(x, z);
    const y = top + entero(-5, 3);
    const actual = mundo.bloque(x, y, z);
    let id;
    if (actual > 0 && azar() < 0.75) id = 0;
    else if (conAntorchas && azar() < 0.3) id = B.ANTORCHA;
    else id = PONER[entero(0, PONER.length - 1)];
    return [x, y, z, id];
}

function escenario(nombre, x0, z0, { n = 30, r = 9, antorchas = false, lote = 1 } = {}) {
    cargar(x0, z0);
    const antes = rehechos, f0 = fallos;
    for (let k = 0; k < n; k++) {
        const lista = [];
        for (let j = 0; j < lote; j++) lista.push(edicionAlAzar(x0, z0, r, antorchas));
        if (lote === 1) mundo.editar(...lista[0]); else mundo.editarLote(lista);
        mundo.procesarRemallado(Infinity);
        mundo.procesarRemallado(Infinity);
        comparar(`${nombre} #${k + 1}`, lista);
        if (fallos - f0 > 5) break;
    }
    console.log(`${nombre}: ${n} ediciones${lote > 1 ? ` (lotes de ${lote})` : ''}, camino lento ${rehechos - antes} chunks, ${fallos - f0 ? 'CON FALLOS' : 'ok'}`);
}

// Pozo de 3×3×5 con un túnel lateral de 6: el cielo entra por el pozo; luego se tapa (hay que quitar
// la luz del túnel), se destapa un bloque, se pone una antorcha al fondo del túnel y se quita
function pozo(nombre, x0, z0) {
    cargar(x0, z0);
    const top = superficie(x0, z0), f0 = fallos, antes = rehechos;
    const pasos = [];
    const cavar = [];
    for (let y = top - 4; y <= top; y++) for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) cavar.push([x0 + dx, y, z0 + dz, 0]);
    pasos.push(['cavar el pozo', cavar]);
    const tunel = [];
    for (let k = 2; k <= 7; k++) for (const y of [top - 4, top - 3]) tunel.push([x0 + k, y, z0, 0]);
    pasos.push(['túnel', tunel]);
    const techo = [];
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) techo.push([x0 + dx, top, z0 + dz, B.PIEDRA]);
    pasos.push(['tapar', techo]);
    pasos.push(['destapar uno', [[x0, top, z0, 0]]]);
    pasos.push(['tapar de nuevo', [[x0, top, z0, B.PIEDRA]]]);
    pasos.push(['antorcha al fondo', [[x0 + 7, top - 4, z0, B.ANTORCHA]]]);
    pasos.push(['vidrio en el túnel', [[x0 + 4, top - 4, z0, B.VIDRIO], [x0 + 4, top - 3, z0, B.PIEDRA]]]);
    pasos.push(['quitar la piedra', [[x0 + 4, top - 3, z0, 0]]]);
    pasos.push(['quitar la antorcha', [[x0 + 7, top - 4, z0, 0]]]);
    for (const [q, lista] of pasos) {
        if (lista.length === 1) mundo.editar(...lista[0]);
        else for (const e of lista) mundo.editar(...e); // de a uno, como el jugador
        mundo.procesarRemallado(Infinity); mundo.procesarRemallado(Infinity);
        comparar(`${nombre}: ${q}`, lista);
    }
    console.log(`${nombre}: ${pasos.length} pasos, camino lento ${rehechos - antes} chunks, ${fallos - f0 ? 'CON FALLOS' : 'ok'}`);
}

// Sitios: campo con pasto lejos de zonas con luz, campamento y una base con antorchas
function buscarCampo(x0, z0, saltar = 0) {
    for (let r = 0; r < 60; r++) for (let a = 0; a < 16; a++) {
        const x = Math.round(x0 + Math.cos(a / 16 * 6.283) * r * CH), z = Math.round(z0 + Math.sin(a / 16 * 6.283) * r * CH);
        if (x < 64 || z < 64 || x > ter.BW - 64 || z > ter.BD - 64) continue;
        const cx = Math.floor(x / CH), cz = Math.floor(z / CH);
        let libre = true;
        for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) if (V.chunkForzado(ter, cx + dx, cz + dz)) libre = false;
        if (!libre || ter.SUP[z * ter.BW + x] !== B.PASTO) continue;
        if (saltar-- > 0) continue;
        return [cx * CH + 8, cz * CH + 8];
    }
    throw new Error('sin campo');
}
const [fx, fz] = buscarCampo(400, 500);
const camp = ter.lugares.find(l => l.clave === 'campamento');
const [bx, bz] = buscarCampo(900, 300);

escenario('campo abierto', fx, fz, { n: 30 });
pozo('pozo en el campo', fx + 3, fz + 1);
pozo('pozo en el borde (campo)', fx - 8, fz + 3);
escenario('borde de chunk (campo)', fx + 8, fz + 8, { n: 25, r: 2 });
escenario('campamento', Math.floor(camp.x), Math.floor(camp.z), { n: 25 });
pozo('pozo junto al campamento', Math.floor(camp.x) + 6, Math.floor(camp.z) + 9);
escenario('borde campamento/campo', Math.floor(camp.x) + camp.radio + 10, Math.floor(camp.z), { n: 15, r: 12 });
// Base: primero un anillo de antorchas (pasa la zona a ventana ampliada), luego ediciones con antorchas
{
    cargar(bx, bz);
    const lote = [];
    for (const [dx, dz] of [[-6, -6], [0, -6], [6, -6], [-6, 6], [0, 6], [6, 6]]) lote.push([bx + dx, superficie(bx + dx, bz + dz) + 1, bz + dz, B.ANTORCHA]);
    mundo.editarLote(lote);
    mundo.procesarRemallado(Infinity); mundo.procesarRemallado(Infinity);
    comparar('base: antorchas puestas', lote);
}
escenario('base con antorchas', bx, bz, { n: 30, antorchas: true });
escenario('lotes (explosión)', bx + 3, bz - 2, { n: 5, r: 3, lote: 20 });
escenario('lotes en el campo', fx, fz, { n: 5, r: 3, lote: 20 });

if (fallos) { console.error(`\n${fallos} fallos`); process.exit(1); }
console.log('\nLuz incremental = llenarChunk desde cero en todas las ediciones (vox, luz y malla)');
