// =========================================================
// Arte del Duelo de Cartas Pixel (cartas-arte.js): búferes puros, sin canvas.
// Todas las cartas y el reverso salen de 50×76, sin huecos salvo las 4 esquinas,
// iguales cada vez (ruido determinista) y con el color de marco de su familia.
// =========================================================
import { pathToFileURL, fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '../../');
const importar = r => import(pathToFileURL(resolve(raiz, r)).href);
const { CARTAS } = await importar('mundo/supervivencia/cartas-datos.js');
const A = await importar('mundo/supervivencia/cartas-arte.js');
const ok = (cond, msg) => { if (!cond) throw new Error(`cartas-arte: ${msg}`); };

function revisar(L, nombre) {
    ok(L && L.w === A.ANCHO && L.h === A.ALTO && L.d.length === A.ANCHO * A.ALTO * 4, `${nombre}: tamaño 50×76`);
    let huecos = 0;
    for (let i = 3; i < L.d.length; i += 4) if (L.d[i] !== 255) huecos++;
    ok(huecos === 4, `${nombre}: solo las 4 esquinas transparentes (hay ${huecos})`);
}
const colorEn = (L, x, y) => { const i = (y * L.w + x) * 4; return `${L.d[i]},${L.d[i + 1]},${L.d[i + 2]}`; };

const marcos = {};
for (const id of Object.keys(CARTAS)) {
    const L = A.dibujarCarta(id);
    revisar(L, id);
    const otra = A.dibujarCarta(id);
    ok(L.d.every((v, i) => v === otra.d[i]), `${id}: sale igual cada vez`);
    (marcos[A.familiaDe(id)] ||= new Set()).add(colorEn(L, 1, 30)); // bisel claro del marco
}
ok(Object.keys(marcos).length === 5, 'cinco familias de marco (4 + Hechizo)');
for (const [f, set] of Object.entries(marcos)) ok(set.size === 1, `${f}: un solo color de bisel`);
ok(new Set(Object.values(marcos).map(s => [...s][0])).size === 5, 'cada familia con su color');
for (const id of Object.keys(CARTAS)) ok(A.tieneRetrato(id), `${id} tiene retrato`);
ok(A.dibujarCarta('no-existe') === null, 'carta desconocida = null');
revisar(A.dibujarReverso(), 'reverso');
ok(A.arteCarta('zombi') === null && A.arteReverso() === null, 'sin canvas devuelve null');
console.log('cartas-arte: todo bien');
