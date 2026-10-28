// =========================================================
// Prueba de las construcciones en datos y su giro (mundo/datos/construcciones.js; sin navegador)
// Ejecutar: node mundo/tests/construcciones-datos.mjs
//  1. girarXZ y girarBloque: cuatro cuartos vuelven al inicio; el norte de un escalón pasa al oeste con 90.
//  2. Las personas que cuelgan de un lugar girado giran igual que sus bloques (puntoAMundo / enLugar) y
//     mundoAPunto deshace puntoAMundo.
//  3. propiasDe salta borradores y bloques desconocidos; sitiosDe trae giro solo en las que giran.
//  4. Molino girado 90: cada bloque es el del molino sin girar, girado alrededor del bloque central; la cama
//     del molino gira con él y los demás lugares no se corren.
//  5. Una construcción nueva con sitio y giro se arma con sus bloques girados, igual en el worker.
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
const C = await imp('mundo/datos/construcciones.js');
const P = await imp('mundo/datos/posiciones.js');

let fallos = 0, n = 0;
const ok = (c, msg) => { n++; if (!c) { fallos++; if (fallos < 25) console.error('FALLO: ' + msg); } };
const cerca = (a, b) => Math.abs(a - b) < 1e-9;
const huella = (...as) => { const h = createHash('sha1'); for (const a of as) h.update(Buffer.from(a.buffer, a.byteOffset, a.byteLength)); return h.digest('hex'); };

// 1
for (const [dx, dz] of [[3, -2], [0, 5], [-4, 1]]) {
    let p = [dx, dz];
    for (let q = 0; q < 4; q++) p = C.girarXZ(p[0], p[1], 1);
    ok(p[0] === dx && p[1] === dz, `cuatro cuartos vuelven (${dx},${dz})`);
}
ok(C.girarXZ(0, 1, 1).join() === '1,0', '90: el sur pasa al este');
const norte = B.ESCALONES_PIEDRA;
ok(C.girarBloque(norte, 1) === norte + 3, 'escalón norte con 90 mira al oeste');
ok(C.girarBloque(C.girarBloque(norte + 2, 3), 1) === norte + 2, 'girar y desgirar un escalón');
ok(C.girarBloque(B.TABLONES, 1) === B.TABLONES, 'un bloque sin giro no cambia');
ok(C.idBloque('ESCALONES_TABLONES', 2) === B.ESCALONES_TABLONES + 2 && C.idBloque('NADA') === null, 'idBloque');
ok(C.nombreBloque(B.TRAMPILLA_ABIERTA + 3).join() === 'TRAMPILLA_ABIERTA,3', 'nombreBloque con giro');
ok(C.cuartos(270) === 3 && C.cuartos(-90) === 3 && C.cuartos('x') === 0, 'cuartos');

// 2
const lugar = { clave: 'molino', bx: 100, bz: 200, x: 100.5, z: 200.5, y: 50, giro: 90 };
const A = P.resolverAncla({ lugares: [lugar] }, 'molino');
for (const p of [{ dx: 2, dz: 3, giro: 0 }, { marco: 'ancla', dx: -1.3, dz: 0.4, giro: 45 }]) {
    const w = P.puntoAMundo(A, p), e = P.enLugar(lugar, lugar.bx + p.dx, lugar.bz + p.dz);
    ok(cerca(w.x, e.x) && cerca(w.z, e.z), `la persona gira con el lugar (${p.dx},${p.dz})`);
    ok(cerca(w.yaw, Math.PI / 2 + p.giro * Math.PI / 180), 'y su mirada también');
    const v = P.mundoAPunto(A, w, { ancla: 'molino', marco: p.marco });
    ok(cerca(v.dx, p.dx) && cerca(v.dz, p.dz) && cerca(v.giro, p.giro), 'mundoAPunto deshace puntoAMundo');
}
const sinGiro = P.resolverAncla({ lugares: [{ ...lugar, giro: 0 }] }, 'molino');
const w0 = P.puntoAMundo(sinGiro, { dx: 2, dz: 3, giro: 10 });
ok(w0.x === 102 && w0.z === 203 && cerca(w0.yaw, 10 * Math.PI / 180), 'sin giro, lo de siempre');

// 3
const json = {
    construcciones: {
        caseta: { nombre: { es: 'Caseta', en: 'Hut' }, bloques: [[0, 0, 0, 'TABLONES'], [2, 0, -1, 'ESCALONES_PIEDRA', 0], [0, 1, 0, 'NO_EXISTE'], [-1, 2, 3, 'LANA_ROJA']] },
        mitad: { nombre: { es: 'Mitad' }, borrador: true, bloques: [[0, 0, 0, 'TABLONES']] },
        vacia: { nombre: { es: 'Vacía' }, bloques: [[0, 0, 0, 'NADA']] }
    }
};
const propias = C.propiasDe(json);
ok(Object.keys(propias).join() === 'caseta', 'propiasDe salta borradores y vacías');
ok(propias.caseta.bloques.length === 12 && propias.caseta.w === 5 && propias.caseta.d === 7, 'bloques conocidos y medidas');
const sit = P.sitiosDe({ lugares: { molino: { x: 1, z: 2, giro: 90 }, escenario: { x: 3, z: 4, giro: 90 }, caseta: { x: 5, z: 6, giro: 270 }, otra: { x: 1, z: 1 } } }, propias);
ok(sit.molino.giro === 90 && !('giro' in sit.escenario), 'giro solo en las que giran');
ok(sit.caseta.giro === 270 && sit.caseta.propia === propias.caseta && !sit.otra, 'la nueva lleva sus bloques');
ok(P.sitiosDe({ lugares: { molino: { x: 1, z: 2, giro: 0 } } }).molino.giro === undefined, 'giro 0 no se escribe');

// 4
V.fijarAlto(V.ALTO_SUPERVIVENCIA);
const base = V.prepararTerreno(generarDatos('h'), { supervivencia: true });
const cB = P.centrosDe(base);
const punto = { x: cB.molino.bx + 40, z: cB.molino.bz };
const M0 = V.prepararTerreno(generarDatos('h'), { supervivencia: true, sitios: { molino: punto } });
const M9 = V.prepararTerreno(generarDatos('h'), { supervivencia: true, sitios: { molino: { ...punto, giro: 90 } } });
const m0 = M0.lugares.find(l => l.clave === 'molino'), m9 = M9.lugares.find(l => l.clave === 'molino');
ok(m9.bx === punto.x && m9.bz === punto.z && m9.giro === 90 && m0.giro === 0, 'molino girado en su punto');
const celdas = (d, l) => { const m = new Map(); for (let i = 0; i < d.bloques.length; i += 4) m.set(`${d.bloques[i] - l.bx},${d.bloques[i + 1] - l.y},${d.bloques[i + 2] - l.bz}`, d.bloques[i + 3]); return m; };
const s0 = celdas(m0.decor, m0), s9 = celdas(m9.decor, m9);
let iguales = s0.size === s9.size;
for (const [k, id] of s0) {
    const [dx, dy, dz] = k.split(',').map(Number), [rx, rz] = C.girarXZ(dx, dz, 1);
    if (s9.get(`${rx},${dy},${rz}`) !== C.girarBloque(id, 1)) { iguales = false; break; }
}
ok(iguales, 'cada bloque del molino girado es el del molino sin girar, girado');
const cama = M9.decor.find(d => d.motivo === 'molino');
const [cdx, cdz] = C.girarXZ(-1, -1, 1);
ok(cama && cama.bloques[0] === m9.bx + cdx && cama.bloques[2] === m9.bz + cdz, 'la cama del molino gira con él');
const c9 = P.centrosDe(M9), c0 = P.centrosDe(M0);
for (const k of Object.keys(P.CONSTRUCCIONES)) if (k !== 'molino') ok(c9[k].bx === c0[k].bx && c9[k].bz === c0[k].bz, `${k} no se corre con el giro`);
ok(!M9.ES.includes(4), 'reservas liberadas');

// 5
const nuevo = { x: cB.molino.bx - 40, z: cB.molino.bz, giro: 90 };
const sitios = P.sitiosDe({ lugares: { caseta: nuevo } }, propias);
const T = V.prepararTerreno(generarDatos('h'), { supervivencia: true, sitios });
const cas = T.lugares.find(l => l.clave === 'caseta');
ok(cas && cas.propia && cas.bx === nuevo.x && cas.bz === nuevo.z && cas.giro === 90, 'la nueva queda en su punto');
ok(cas && cas.nombre.es === 'Caseta' && T.decor.includes(cas.decor), 'con su nombre y decorado');
const sc = cas ? celdas(cas.decor, cas) : new Map();
const [ex, ez] = C.girarXZ(2, -1, 1);
ok(sc.get('0,0,0') === B.TABLONES && sc.get(`${ex},0,${ez}`) === C.girarBloque(B.ESCALONES_PIEDRA, 1), 'sus bloques giran');
const ancla = P.resolverAncla(T, 'caseta');
ok(ancla && ancla.gira && cerca(ancla.yaw, Math.PI / 2), 'sirve de ancla girada');
const W = V.prepararTerreno(generarDatos('h'), { supervivencia: true, sitios: T.sitios });
const N = V.CHUNK, cx = Math.floor(cas.bx / N), cz = Math.floor(cas.bz / N);
const a = V.llenarChunk(T, cx, cz), b = V.llenarChunk(W, cx, cz);
ok(huella(a.vox, a.luz) === huella(b.vox, b.luz), 'el worker arma el mismo chunk');

console.log(`${fallos ? 'FALLÓ' : 'OK'}: construcciones-datos (${n} comprobaciones)`);
process.exit(fallos ? 1 : 0);
