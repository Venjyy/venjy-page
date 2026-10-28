// =========================================================
// Prueba de los lugares con sitio fijo (Etapa B 6e, posiciones.json → lugares; sin navegador)
// Ejecutar: node mundo/tests/lugares-fijos.mjs
//  1. CONSTRUCCIONES (mundo/datos/posiciones.js) tiene el mismo tamaño que LUGARES de construcciones.js.
//  2. sitiosDe: solo claves conocidas con x y z números; sin nada válido, null.
//  3. Sin sitios el terreno es el de siempre (creativo y supervivencia con `sitios` vacío o del creativo).
//  4. Mover el molino y el escenario: quedan con su bloque central en el punto pedido y lo demás no se corre
//     (los otros lugares, los corrales y el pescador en el mismo sitio).
//  5. El worker recibe `sitios` y arma el mismo chunk del molino movido.
// Sale con código 0 si todo coincide, 1 si no.
// =========================================================
import { pathToFileURL, fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { createHash } from 'crypto';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '../../');
const imp = p => import(pathToFileURL(resolve(raiz, p)).href);
const { generarDatos } = await imp('mundo/mundo-datos.js');
const V = await imp('mundo/voxeles.js');
const { LUGARES } = await imp('mundo/construcciones.js');
const { CONSTRUCCIONES, sitiosDe, centrosDe } = await imp('mundo/datos/posiciones.js');

let fallos = 0, n = 0;
const ok = (c, msg) => { n++; if (!c) { fallos++; if (fallos < 25) console.error('FALLO: ' + msg); } };
const huella = (...as) => { const h = createHash('sha1'); for (const a of as) h.update(Buffer.from(a.buffer, a.byteOffset, a.byteLength)); return h.digest('hex'); };

// 1
for (const L of LUGARES) ok(CONSTRUCCIONES[L.clave] && CONSTRUCCIONES[L.clave].w === L.w && CONSTRUCCIONES[L.clave].d === L.d, `tamaño de ${L.clave}`);
for (const [k, c] of Object.entries(CONSTRUCCIONES)) ok(c.es && c.en, `nombre ES/EN de ${k}`);

// 2
ok(sitiosDe(null) === null && sitiosDe({ personas: {} }) === null, 'sitiosDe sin lugares');
ok(sitiosDe({ lugares: { nada: { x: 1, z: 2 }, molino: { x: 'a', z: 2 } } }) === null, 'sitiosDe ignora claves y números malos');
const s1 = sitiosDe({ lugares: { molino: { x: 10.4, z: 20.6, nota: 'x' } } });
ok(s1 && s1.molino.x === 10 && s1.molino.z === 21, 'sitiosDe redondea');

// 3
const base = V.prepararTerreno(generarDatos('h'));
const conSitiosCreativo = V.prepararTerreno(generarDatos('h'), { sitios: { molino: { x: 500, z: 500 } } });
ok(huella(base.HT, base.SUP, base.ES) === huella(conSitiosCreativo.HT, conSitiosCreativo.SUP, conSitiosCreativo.ES), 'el creativo ignora sitios');
ok(!base.sitios, 'el creativo no guarda sitios');

V.fijarAlto(V.ALTO_SUPERVIVENCIA);
const A = V.prepararTerreno(generarDatos('h'), { supervivencia: true });
const A0 = V.prepararTerreno(generarDatos('h'), { supervivencia: true, sitios: {} });
ok(huella(A.HT, A.SUP, A.ES) === huella(A0.HT, A0.SUP, A0.ES) && A0.sitios === null, 'sitios vacíos = terreno de siempre');
ok(!A.ES.includes(4), 'sin reservas sueltas (ES 4)');

// 4: el molino a 40 bloques al este de donde estaba; el escenario 30 al norte
const cA = centrosDe(A);
for (const k of Object.keys(CONSTRUCCIONES)) ok(cA[k], `centrosDe trae ${k}`);
const meta = { molino: { x: cA.molino.bx + 40, z: cA.molino.bz }, escenario: { x: cA.escenario.bx, z: cA.escenario.bz - 30 } };
const M = V.prepararTerreno(generarDatos('h'), { supervivencia: true, sitios: meta });
const cM = centrosDe(M);
ok(cM.molino.bx === meta.molino.x && cM.molino.bz === meta.molino.z, `molino en el punto pedido (${cM.molino.bx},${cM.molino.bz})`);
ok(cM.escenario.bx === meta.escenario.x && cM.escenario.bz === meta.escenario.z, `escenario en el punto pedido (${cM.escenario.bx},${cM.escenario.bz})`);
for (const k of Object.keys(CONSTRUCCIONES)) {
    if (meta[k]) continue;
    ok(cM[k] && cM[k].bx === cA[k].bx && cM[k].bz === cA[k].bz && cM[k].y === cA[k].y, `${k} no se corre`);
}
ok(M.pescador && A.pescador && M.pescador.x === A.pescador.x && M.pescador.z === A.pescador.z, 'el pescador no se corre');
ok(!M.ES.includes(4), 'reservas liberadas');
ok(M.lugares.length === A.lugares.length, 'los seis lugares siguen');
const molinoM = M.lugares.find(l => l.clave === 'molino');
ok(molinoM && molinoM.decor && M.decor.includes(molinoM.decor), 'el molino movido tiene su decorado');
ok(M.decor.some(d => d.motivo === 'molino'), 'la cama del molino viaja con él');
const camaM = M.decor.find(d => d.motivo === 'molino');
ok(camaM && Math.abs(camaM.bloques[0] - molinoM.bx) <= 1, 'la cama queda dentro del molino movido');
ok(M.sitios && M.sitios.molino, 'el terreno guarda sus sitios para los workers');

// 5: un segundo terreno (como el worker) con los mismos sitios da el mismo chunk
const W = V.prepararTerreno(generarDatos('h'), { supervivencia: true, sitios: M.sitios });
const N = V.CHUNK;
for (const dc of [0, 1]) {
    const cx = Math.floor(molinoM.bx / N), cz = Math.floor(molinoM.bz / N) + dc;
    const a = V.llenarChunk(M, cx, cz), b = V.llenarChunk(W, cx, cz);
    ok(huella(a.vox, a.luz) === huella(b.vox, b.luz), `chunk ${cx},${cz} igual en el worker`);
}

console.log(`${fallos ? 'FALLÓ' : 'OK'}: lugares-fijos (${n} comprobaciones)`);
process.exit(fallos ? 1 : 0);
