// =========================================================
// Prueba de los bloques con forma (7f-2): mundo/formas.js y su uso en la malla, el choque y el colocar
// Ejecutar: node mundo/tests/formas.mjs
// =========================================================
import { B, TIPO, BLOQUES } from '../texturas.js';
import {
    cajasDe, fijarFormas, versionFormas, forma, aristasContorno, rayoCajas, chocaFormas, topeFormas,
    colocarForma, alternarTrampilla, giroDe, mascaraValla, FORMAS_BASE, NOMBRES_FORMA, ESCALONES
} from '../formas.js';
import { mallarChunkCrudo, ALTO } from '../voxeles.js';
import { moverCuerpo } from '../fisica.js';
import { infoBloque, dropsDe } from '../supervivencia/objetos.js';
import { readFileSync } from 'fs';

let fallos = 0;
const ok = (c, m) => { if (!c) { console.error('FALLO: ' + m); fallos++; } };
const cerca = (a, b) => Math.abs(a - b) < 1e-6;
const nada = () => 0;

// ---- Cada bloque nuevo es tipo 8, tiene nombre ES/EN y cajas dentro de su celda ----
const NUEVOS = [];
for (let id = B.LOSA_PIEDRA; id <= B.VALLA_PINO; id++) NUEVOS.push(id);
for (const id of NUEVOS) {
    ok(BLOQUES[id], `bloque ${id} sin definición`);
    const i = infoBloque(id);
    ok(i && i.nombre.es && i.nombre.en, `bloque ${id} sin nombre ES/EN`);
    if (TIPO[id] !== 8) { ok(id >= B.LOSA_PIEDRA_DOBLE && id <= B.LOSA_ADOQUIN_DOBLE, `bloque ${id} debería ser tipo 8`); continue; }
    const cajas = cajasDe(id, nada);
    ok(cajas && cajas.length, `bloque ${id} sin cajas`);
    for (const c of cajas) ok(c.x0 >= 0 && c.x1 <= 1 && c.y0 >= 0 && c.y1 <= 1 && c.z0 >= 0 && c.z1 <= 1 && c.x0 < c.x1 && c.y0 < c.y1 && c.z0 < c.z1, `caja fuera de la celda en ${id}`);
}
for (const k of NOMBRES_FORMA) ok(FORMAS_BASE[k].cajas.length > 0, `forma ${k} sin cajas`);

// ---- Losas, escalones girados, trampilla ----
ok(cerca(cajasDe(B.LOSA_PIEDRA, nada)[0].y1, 0.5), 'la losa de abajo mide medio bloque');
ok(cerca(cajasDe(B.LOSA_PIEDRA_ARRIBA, nada)[0].y0, 0.5), 'la losa de arriba empieza en la mitad');
const alta = g => cajasDe(B.ESCALONES_PIEDRA + g, nada).find(c => c.y0 > 0);
ok(cerca(alta(0).z1, 0.5) && cerca(alta(0).z0, 0), 'escalones giro 0: la parte alta al norte');
ok(cerca(alta(1).x0, 0.5) && cerca(alta(1).x1, 1), 'escalones giro 1: la parte alta al este');
ok(cerca(alta(2).z0, 0.5), 'escalones giro 2: al sur');
ok(cerca(alta(3).x1, 0.5), 'escalones giro 3: al oeste');
ok(cerca(cajasDe(B.TRAMPILLA_ABIERTA + 2, nada)[0].z0, 13 / 16), 'trampilla abierta giro 2: pegada al sur');
ok(alternarTrampilla(B.TRAMPILLA, [0, -1]) === B.TRAMPILLA_ABIERTA && alternarTrampilla(B.TRAMPILLA_ABIERTA + 3, [1, 0]) === B.TRAMPILLA, 'abrir y cerrar la trampilla');

// ---- Vallas: se unen a vallas y bloques sólidos ----
const vecinosValla = { '1,0,0': B.VALLA_PINO, '0,0,-1': B.PIEDRA, '-1,0,0': B.AGUA };
const vv = (dx, dy, dz) => vecinosValla[`${dx},${dy},${dz}`] || 0;
ok(mascaraValla(vv) === 0b0011, 'la valla se une al norte (piedra) y al este (otra valla), no al agua');
ok(cajasDe(B.VALLA_ABEDUL, vv).length === 1 + 2 * 2, 'valla con dos brazos: poste + 4 travesaños');
ok(cajasDe(B.VALLA_ABEDUL, vv, true).every(c => cerca(c.y0, 0) && cerca(c.y1, 1.5)), 'la valla choca hasta 1,5 bloques');

// ---- Contorno: aristas sin las compartidas ----
ok(aristasContorno([{ x0: 0, y0: 0, z0: 0, x1: 1, y1: 1, z1: 1 }]).length === 12 * 6, 'un cubo tiene 12 aristas');
ok(aristasContorno(cajasDe(B.ESCALONES_PIEDRA, nada)).length === 18 * 6, 'el contorno de los escalones tiene 18 aristas (prisma en L)');
ok(aristasContorno(cajasDe(B.LOSA_PIEDRA, nada)).length === 12 * 6, 'la losa tiene 12 aristas');

// ---- Rayo preciso ----
const losa = cajasDe(B.LOSA_PIEDRA, nada);
const r1 = rayoCajas([0.5, 3, 0.5], [0, -1, 0], 0, 0, 0, losa);
ok(r1 && cerca(r1.t, 2.5) && r1.normal[1] === 1, 'el rayo de arriba pega en la cara de arriba de la losa');
ok(!rayoCajas([-2, 0.75, 0.5], [1, 0, 0], 0, 0, 0, losa), 'el rayo pasa por encima de la losa');
const r2 = rayoCajas([-2, 0.25, 0.5], [1, 0, 0], 0, 0, 0, losa);
ok(r2 && r2.normal[0] === -1, 'de lado pega en la cara oeste');

// ---- Choque y apoyo con un mundo de mentira ----
const celdas = new Map([['0,1,0', B.LOSA_PIEDRA], ['3,1,0', B.VALLA_ABEDUL]]);
const mundo = { bloque: (x, y, z) => { x = Math.floor(x); y = Math.floor(y); z = Math.floor(z); return y < 1 ? B.PIEDRA : celdas.get(`${x},${y},${z}`) || 0; } };
ok(chocaFormas(mundo, 0.2, 1.2, 0.2, 0.8, 2.9, 0.8), 'una caja dentro de la losa choca');
ok(!chocaFormas(mundo, 0.2, 1.5, 0.2, 0.8, 3.3, 0.8), 'parado sobre la losa no choca');
ok(cerca(topeFormas(mundo, 0.2, 0.2, 0.8, 0.8, 1.3, 1.6), 1.5), 'el tope de la losa está en 1,5');
ok(chocaFormas(mundo, 3.2, 2.2, 0.2, 3.8, 2.4, 0.8), 'la valla choca medio bloque más arriba');
const cuerpo = { pos: { x: 0.5, y: 3, z: 0.5 }, vel: { x: 0, y: 0, z: 0 }, ancho: 0.6, alto: 1.8 };
for (let i = 0; i < 60; i++) moverCuerpo(mundo, cuerpo, 1 / 30, { flota: false });
ok(cerca(cuerpo.pos.y, 1.5) && cuerpo.enSuelo, `un cuerpo que cae queda sobre la losa (y = ${cuerpo.pos.y})`);

// ---- Colocar ----
const vacio = () => 0;
const sobreLosa = { x: 0, y: 1, z: 0, id: B.LOSA_PIEDRA, normal: [0, 1, 0], previo: [0, 2, 0], punto: [0.5, 1.5, 0.5] };
ok(colocarForma(B.LOSA_PIEDRA, sobreLosa, [0, -1], vacio).id === B.LOSA_PIEDRA_DOBLE, 'losa sobre losa igual = losa doble');
ok(colocarForma(B.LOSA_TABLONES, sobreLosa, [0, -1], vacio).id === B.LOSA_TABLONES, 'losa de otro material va encima');
const lado = (y) => ({ x: 5, y: 1, z: 0, id: B.PIEDRA, normal: [-1, 0, 0], previo: [4, 1, 0], punto: [5, y, 0.5] });
ok(colocarForma(B.LOSA_ADOQUIN, lado(1.8), [1, 0], vacio).id === B.LOSA_ADOQUIN_ARRIBA, 'de lado en la mitad de arriba: losa de arriba');
ok(colocarForma(B.LOSA_ADOQUIN, lado(1.2), [1, 0], vacio).id === B.LOSA_ADOQUIN, 'de lado en la mitad de abajo: losa de abajo');
ok(colocarForma(B.LOSA_PIEDRA, lado(1.2), [1, 0], (x, y, z) => (x === 4 ? B.LOSA_PIEDRA_ARRIBA : 0)).id === B.LOSA_PIEDRA_DOBLE, 'losa en la celda de otra igual: doble');
ok(colocarForma(B.ESCALONES_TABLONES, lado(1.2), [1, 0.1], vacio).id === B.ESCALONES_TABLONES + 1, 'escalones mirando al este: parte alta al este');
ok(giroDe([0, -1]) === 0 && giroDe([0, 1]) === 2 && giroDe([-1, 0]) === 3, 'giro según hacia dónde miras');
ok(colocarForma(B.TRAMPILLA, { ...lado(1.9) }, [1, 0], vacio).id === B.TRAMPILLA_ARRIBA, 'trampilla en la mitad de arriba');
ok(colocarForma(B.PIEDRA, lado(1.2), [1, 0], vacio) === null, 'un bloque normal no pasa por colocarForma');

// ---- Lo que suelta ----
ok(JSON.stringify(dropsDe(B.LOSA_TABLONES_DOBLE, 0, () => 0)) === JSON.stringify([[B.LOSA_TABLONES, 2]]), 'la losa doble suelta dos losas');
ok(dropsDe(B.ESCALONES_TABLONES + 3, 0, () => 0)[0][0] === B.ESCALONES_TABLONES, 'los escalones girados sueltan los de la mano');
ok(dropsDe(B.TRAMPILLA_ABIERTA + 1, 0, () => 0)[0][0] === B.TRAMPILLA, 'la trampilla abierta suelta la trampilla');
ok(ESCALONES.length === 3, 'tres materiales de escalones');

// ---- Malla: una losa sola deja sus vértices entre 0 y 0,5 de alto ----
{
    const VENT = 18;
    const vox = new Uint8Array(VENT * VENT * ALTO);
    vox[(5 * VENT + 4) * VENT + 4] = B.LOSA_PIEDRA;
    const g = mallarChunkCrudo(0, 0, { vox, luz: null, maxY: 6 });
    const p = g.solido.p;
    let minY = Infinity, maxY = -Infinity;
    for (let i = 1; i < p.length; i += 3) { minY = Math.min(minY, p[i]); maxY = Math.max(maxY, p[i]); }
    ok(cerca(minY, 5) && cerca(maxY, 5.5), `la malla de la losa va de y 5 a 5,5 (${minY}..${maxY})`);
    ok(p.length / 3 === 24, 'la losa sola tiene 6 caras');
}

// ---- formas.json: cambia la forma y sube la versión ----
const v0 = versionFormas();
fijarFormas({ version: 1, formas: { losa: { cajas: [{ a: [0, 0, 0], b: [16, 4, 16] }] } }, paso: 0 });
ok(versionFormas() > v0 && cerca(cajasDe(B.LOSA_PIEDRA, nada)[0].y1, 0.25), 'formas.json cambia la altura de la losa');
ok(forma('escalones').cajas.length === 2, 'lo que falta en el JSON queda como en el código');
const datos = JSON.parse(readFileSync(new URL('../datos/formas.json', import.meta.url), 'utf8'));
fijarFormas(datos);
ok(cerca(cajasDe(B.LOSA_PIEDRA, nada)[0].y1, 0.5), 'el formas.json del repo deja la losa como el código');

if (fallos) { console.error(`${fallos} fallo(s)`); process.exit(1); }
console.log('formas OK');
