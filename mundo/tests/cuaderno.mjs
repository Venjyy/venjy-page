// =========================================================
// Prueba del cuaderno de los Tomatitos (7f-3 parte 6, sin navegador)
// Ejecutar: node mundo/tests/cuaderno.mjs
//  1. Textos: 12 páginas con par ES/EN, sin emojis, títulos únicos y cortos.
//  2. Objetos: Cuaderno y Tomate con bigote con id al final, ES/EN, ícono pintado; el cuaderno tiene receta.
//  3. Lugares: solo supervivencia, 12 sitios deterministas (dos terrenos), libres, lejos de estructuras,
//     caminos, señales, lugares y entre sí.
//  4. Lógica: cada página se recoge una vez, la primera trae el cuaderno, al juntar 12 hay un solo premio,
//     lo que no cabe se suelta, y el estado es por jugador (viaja en inventario.serializar).
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
const { O, OBJETOS } = await imp('mundo/supervivencia/objetos.js');
const { RECETAS, buscarReceta } = await imp('mundo/supervivencia/recetas.js');
const { Inventario, pila } = await imp('mundo/supervivencia/inventario.js');
const { PAGINAS, PREMIO, TEXTOS } = await imp('mundo/supervivencia/cuaderno-datos.js');
const { recogerPagina, tiene, cuenta, MAX, BIT_PREMIO } = await imp('mundo/supervivencia/cuaderno.js');
const { TOTAL_PAGINAS, DISTANCIAS } = await imp('mundo/paginas-cuaderno.js');

let fallos = 0;
const falla = msg => { if (fallos < 25) console.error('FALLO: ' + msg); fallos++; };
const emoji = s => /\p{Extended_Pictographic}/u.test(s);

// 1. Textos
if (PAGINAS.length !== 12 || TOTAL_PAGINAS !== 12 || MAX !== 12) falla('no son 12 páginas');
const titulos = new Set();
PAGINAS.forEach((p, i) => {
    for (const l of ['es', 'en']) {
        if (!p.t[l] || !p.x[l]) falla(`página ${i + 1}: falta ${l}`);
        if (emoji(p.t[l] + p.x[l])) falla(`página ${i + 1}: emoji`);
        if (p.x[l].length > 280) falla(`página ${i + 1} ${l}: texto largo (${p.x[l].length})`);
        if (p.t[l].length > 32) falla(`página ${i + 1} ${l}: título largo`);
    }
    if (p.x.es === p.x.en) falla(`página ${i + 1}: ES y EN iguales`);
    titulos.add(p.t.es);
});
if (titulos.size !== 12) falla('títulos repetidos');
for (const l of ['es', 'en']) for (const [k, v] of Object.entries(TEXTOS[l])) if (typeof v === 'string' && emoji(v)) falla(`TEXTOS.${l}.${k}: emoji`);

// 2. Objetos
const pintores = [...readFileSync(resolve(raiz, 'mundo/supervivencia/iconos.js'), 'utf8').matchAll(/^    (\w+)\(p/gm)].map(m => m[1]);
if (O.CUADERNO !== O.FAROL_CALEUCHE + 1 || O.TOMATE_BIGOTE !== O.CUADERNO + 1) falla('los ids nuevos no van al final');
for (const k of ['CUADERNO', 'TOMATE_BIGOTE']) {
    const o = OBJETOS[O[k]];
    if (!o || !o.nombre.es || !o.nombre.en || emoji(o.nombre.es + o.nombre.en)) falla(`${k}: nombre ES/EN`);
    if (!pintores.includes(o.icono)) falla(`${k}: ícono sin pintar`);
}
if (!OBJETOS[O.TOMATE_BIGOTE].comida) falla('el tomate no es comida');
const rec = RECETAS.find(r => r.da[0] === O.CUADERNO);
if (!rec) falla('el cuaderno no tiene receta');
else if (buscarReceta([O.LIBRO, O.PLUMA, 0, 0], 2) !== rec) falla('libro + pluma no da el cuaderno');

// 3. Lugares
const creativo = V.prepararTerreno(generarDatos('h'));
if (creativo.paginas) falla('el creativo tiene páginas');
V.fijarAlto(V.ALTO_SUPERVIVENCIA);
const A = V.prepararTerreno(generarDatos('h'), { supervivencia: true });
const A2 = V.prepararTerreno(generarDatos('h'), { supervivencia: true });
if (A.paginas.length !== 12) falla(`sitios: ${A.paginas.length}`);
if (JSON.stringify(A.paginas) !== JSON.stringify(A2.paginas)) falla('los sitios cambian entre dos terrenos');
const { BW, BD, HT, ES, SUP } = A;
A.paginas.forEach((p, k) => {
    if (p.i !== k) falla('índices fuera de orden');
    if (p.x < 3 || p.z < 3 || p.x >= BW - 3 || p.z >= BD - 3) falla(`página ${k + 1} en el borde`);
    if (p.y !== HT[p.z * BW + p.x] || p.y < 15) falla(`página ${k + 1} sin suelo seco`);
    for (let dz = -DISTANCIAS.camino; dz <= DISTANCIAS.camino; dz++) for (let dx = -DISTANCIAS.camino; dx <= DISTANCIAS.camino; dx++) {
        const o = (p.z + dz) * BW + p.x + dx;
        if (SUP[o] === B.CAMINO) falla(`página ${k + 1} pegada a un camino`);
        if (Math.abs(dx) <= DISTANCIAS.estructura && Math.abs(dz) <= DISTANCIAS.estructura && ES[o]) falla(`página ${k + 1} sobre una estructura`);
    }
    for (const c of A.caminos) if (Math.hypot(c.x - p.x, c.z - p.z) < DISTANCIAS.senal) falla(`página ${k + 1} sobre una señal`);
    for (const l of A.lugares) if (Math.hypot(l.bx - p.x, l.bz - p.z) < DISTANCIAS.lugar) falla(`página ${k + 1} sobre el lugar ${l.clave}`);
    for (const q of A.paginas.slice(k + 1)) if (Math.hypot(q.x - p.x, q.z - p.z) < DISTANCIAS.entrePaginas) falla(`páginas ${k + 1} y ${q.i + 1} muy juntas`);
});

// 4. Lógica
const soltado = [];
const soltar = (id, n) => soltado.push([id, n]);
const inv = new Inventario();
if (inv.serializar().q !== undefined) falla('un inventario sin páginas guarda `q`');
let r = recogerPagina(inv, 4, soltar);
if (!r || r.n !== 5 || r.cuenta !== 1 || r.completo || r.premio) falla('primera página');
if (inv.contar(O.CUADERNO) !== 1) falla('la primera página no trae el cuaderno');
if (recogerPagina(inv, 4, soltar)) falla('la misma página se recoge dos veces');
if (recogerPagina(inv, 12, soltar) || recogerPagina(inv, -1, soltar)) falla('página fuera de rango');
// Perder el cuaderno: la siguiente página lo repone
inv.casillas = inv.casillas.map(p => (p && p.id === O.CUADERNO ? null : p));
recogerPagina(inv, 0, soltar);
if (inv.contar(O.CUADERNO) !== 1) falla('no repone el cuaderno perdido');
for (const i of [1, 2, 3, 5, 6, 7, 8, 9]) { r = recogerPagina(inv, i, soltar); if (r.premio) falla('premio antes de las 12'); }
if (inv.contar(O.TOMATE_BIGOTE) || inv.contar(O.ESMERALDA)) falla('premio antes de tiempo');
r = recogerPagina(inv, 10, soltar);
if (r.premio || r.cuenta !== 11) falla('página 11');
r = recogerPagina(inv, 11, soltar);
if (!r.premio || !r.completo || r.cuenta !== 12) falla('la 12 no da el premio');
if (inv.contar(O.TOMATE_BIGOTE) !== PREMIO.tomates || inv.contar(O.ESMERALDA) !== PREMIO.esmeraldas) falla('premio mal contado');
if (!(inv.cuaderno & BIT_PREMIO)) falla('premio sin marcar');
// Guardado: viaja con el inventario y no cambia los guardados viejos
const copia = new Inventario();
copia.cargar(JSON.parse(JSON.stringify(inv.serializar())));
if (copia.cuaderno !== inv.cuaderno || cuenta(copia.cuaderno) !== 12) falla('el estado no sobrevive al guardado');
const viejo = new Inventario(); viejo.cargar({ c: [], a: [], m: 0, e: 0 });
if (viejo.cuaderno !== 0) falla('un guardado viejo tiene páginas');
viejo.cargar({ c: [], a: [], m: 0, e: 0, q: 'x' }); if (viejo.cuaderno !== 0) falla('q inválido');
// Perder el cuaderno y el premio ya cobrado: no se cobra de nuevo
copia.casillas.fill(null);
if (recogerPagina(copia, 3, soltar)) falla('página repetida tras cargar');
// Por jugador: otro inventario no se entera
const otro = new Inventario();
if (otro.cuaderno !== 0 || tiene(otro.cuaderno, 4)) falla('el estado se comparte entre jugadores');
// Lo que no cabe se suelta (mochila llena)
const lleno = new Inventario();
for (let i = 0; i < 36; i++) lleno.casillas[i] = pila(O.CARBON, 64);
soltado.length = 0;
recogerPagina(lleno, 0, soltar);
if (!soltado.some(([id]) => id === O.CUADERNO)) falla('mochila llena: el cuaderno no se soltó');

console.log(fallos ? `${fallos} fallas` : 'cuaderno OK');
process.exit(fallos ? 1 : 0);
