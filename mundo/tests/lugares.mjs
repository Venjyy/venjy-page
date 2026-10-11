// =========================================================
// Prueba de los motivos para ir a los lugares (7f-3 parte 3, sin navegador)
// Ejecutar: node mundo/tests/lugares.mjs
//  1. Solo supervivencia: el creativo no tiene `caminos` y su molino no lleva cama.
//  2. Molino: dos bloques de cama y una antorcha dentro de la torre, en el chunk lleno (con desnivel).
//  3. Carteles de lugar (molino y portal) con par ES/EN, sin emojis, junto al lugar.
//  4. Determinismo: dos terrenos (hilo principal y worker) dan los mismos chunks del molino.
//  5. Luz: los motivos no agregan zonas de luz (el costo de llenarChunk no sube).
// Sale con código 0 si todo coincide, 1 si no.
// =========================================================
import { pathToFileURL, fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { createHash } from 'crypto';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '../../');
const imp = p => import(pathToFileURL(resolve(raiz, p)).href);
const { generarDatos } = await imp('mundo/mundo-datos.js');
const V = await imp('mundo/voxeles.js');
const { B } = await imp('mundo/texturas.js');
const { CARTELES_LUGARES } = await imp('mundo/lugares-motivos.js');

let fallos = 0;
const falla = msg => { if (fallos < 25) console.error('FALLO: ' + msg); fallos++; };
const huella = (...as) => { const h = createHash('sha1'); for (const a of as) h.update(Buffer.from(a.buffer, a.byteOffset, a.byteLength)); return h.digest('hex'); };

const creativo = V.prepararTerreno(generarDatos('h'));
if (creativo.caminos) falla('el creativo tiene `caminos`');
if (creativo.decor.some(d => d.motivo)) falla('el creativo tiene decorados de motivos');

V.fijarAlto(V.ALTO_SUPERVIVENCIA);
const A = V.prepararTerreno(generarDatos('h'), { supervivencia: true });
const B2 = V.prepararTerreno(generarDatos('h'), { supervivencia: true });
const N = V.CHUNK, DY = A.dy;

const molino = (A.lugares || []).find(l => l.clave === 'molino');
if (!molino) falla('no hay molino en este mapa');
else {
    const d = A.decor.find(q => q.motivo === 'molino');
    if (!d) falla('sin decorado de cama del molino');
    else {
        const camas = [], antorchas = [];
        for (let i = 0; i < d.bloques.length; i += 4) (d.bloques[i + 3] === B.CAMA ? camas : antorchas).push(d.bloques.slice(i, i + 3));
        if (camas.length !== 2) falla(`camas: ${camas.length}`);
        if (antorchas.length !== 1) falla(`antorchas: ${antorchas.length}`);
        // Dentro de la torre: a 1 bloque o menos del centro en x y z
        for (const [x, , z] of [...camas, ...antorchas]) if (Math.abs(x - molino.bx) > 1 || Math.abs(z - molino.bz) > 1) falla(`fuera de la torre: ${x},${z}`);
        // La puerta (centro, lado sur) queda libre
        if (camas.some(([x, , z]) => x === molino.bx && z >= molino.bz)) falla('cama en el paso a la puerta');
        for (const [x, y, z] of camas) {
            const cx = Math.floor(x / N), cz = Math.floor(z / N);
            const r = V.llenarChunk(A, cx, cz), W = N + 2;
            if (r.vox[((y + DY) * W + (z - (cz * N - 1))) * W + (x - (cx * N - 1))] !== B.CAMA) falla(`cama ausente en el chunk lleno ${x},${y},${z}`);
        }
    }
    for (const dc of [0, 1]) { // el chunk del molino es igual en los dos terrenos
        const cx = Math.floor(molino.bx / N), cz = Math.floor(molino.bz / N) + dc;
        const a = V.llenarChunk(A, cx, cz), b = V.llenarChunk(B2, cx, cz);
        if (huella(a.vox, a.luz) !== huella(b.vox, b.luz)) falla(`chunk ${cx},${cz} distinto entre terrenos`);
    }
}

const sinEmoji = /\p{Extended_Pictographic}/u;
for (const clave of Object.keys(CARTELES_LUGARES)) {
    const l = (A.lugares || []).find(q => q.clave === clave);
    if (!l) { falla(`no hay lugar ${clave}`); continue; }
    const c = (A.caminos || []).find(q => q.tipo === 'lugar' && Math.hypot(q.x - l.x, q.z - l.z) < 8);
    if (!c) { falla(`sin cartel junto a ${clave}`); continue; }
    for (const idioma of ['es', 'en']) {
        if (!c.texto[idioma] || sinEmoji.test(c.texto[idioma])) falla(`texto ${idioma} de ${clave}`);
    }
    if (c.texto.es === c.texto.en) falla(`ES y EN iguales en ${clave}`);
}
if (JSON.stringify(A.caminos) !== JSON.stringify(B2.caminos)) falla('los carteles no son iguales entre terrenos');

// Los motivos no suman zonas de luz: solo los faroles de los caminos (7f-3 parte 1) amplían la ventana
const faroles = A.decor.filter(d => d.farol).length;
if (A.zonasLuz.length !== creativo.zonasLuz.length + faroles) falla(`zonasLuz: ${A.zonasLuz.length}, esperaba ${creativo.zonasLuz.length + faroles}`);

console.log(`${fallos ? 'FALLÓ' : 'OK'}: lugares-motivos (molino con cama, ${Object.keys(CARTELES_LUGARES).length} carteles de lugar)`);
process.exit(fallos ? 1 : 0);
