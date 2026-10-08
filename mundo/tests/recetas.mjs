// Prueba de recetas: node mundo/tests/recetas.mjs
import { B } from '../texturas.js';
import { O, nombreDe } from '../supervivencia/objetos.js';
import { buscarReceta, FUNDICION, RECETAS, ingredientes } from '../supervivencia/recetas.js';

let fallos = 0;
const ok = (cond, msg) => { if (!cond) { fallos++; console.log('FALLA:', msg); } };
const da = (rej, ancho) => { const r = buscarReceta(rej, ancho); return r ? r.da : null; };
const igual = (a, b) => a && b && a[0] === b[0] && a[1] === b[1];

// Sin forma: cualquier tronco en cualquier casilla
ok(igual(da([0, B.TRONCO_ABEDUL, 0, 0], 2), [B.TABLONES, 4]), 'tronco de abedul → 4 tablones');
ok(igual(da([0, 0, 0, 0, 0, 0, 0, 0, B.TRONCO], 3), [B.TABLONES, 4]), 'tronco en la mesa');
// Con forma, desplazada
const W = B.TABLONES, S = O.PALO, A = B.ADOQUIN, I = O.LINGOTE_HIERRO;
ok(igual(da([0, W, 0, W], 2), [O.PALO, 4]), 'palos en la columna derecha');
ok(igual(da([W, W, W, W], 2), [B.MESA, 1]), 'mesa 2×2');
ok(igual(da([A, A, A, 0, S, 0, 0, S, 0], 3), [O.PICO_PIEDRA, 1]), 'pico de piedra');
// Espejo: hacha hacia el otro lado
ok(igual(da([I, I, 0, I, S, 0, 0, S, 0], 3), [O.HACHA_HIERRO, 1]), 'hacha de hierro');
ok(igual(da([0, I, I, 0, S, I, 0, S, 0], 3), [O.HACHA_HIERRO, 1]), 'hacha de hierro espejada');
// No debe calzar
ok(da([A, A, A, 0, S, 0, 0, 0, 0], 3) === null, 'pico incompleto');
ok(da([A, A, 0, A], 2) === null, 'horno no cabe en 2×2');
ok(igual(da([A, A, A, A, 0, A, A, A, A], 3), [B.HORNO, 1]), 'horno');
ok(igual(da([O.CARBON_VEGETAL, 0, S, 0], 2), [B.ANTORCHA, 4]), 'antorcha con carbón vegetal');
ok(FUNDICION.get(B.MENA_HIERRO) === O.LINGOTE_HIERRO, 'horno: hierro');
// Todas las recetas dan algo con nombre y sus ingredientes existen
for (const r of RECETAS) {
    ok(r.da[0] && nombreDe(r.da[0]) !== '?', 'receta sin resultado válido');
    for (const g of ingredientes(r)) for (const id of [].concat(g.pedido)) ok(id && nombreDe(id) !== '?', 'ingrediente inválido en ' + nombreDe(r.da[0]));
}
console.log(`${RECETAS.length} recetas · ${fallos ? fallos + ' fallas' : 'recetas OK'}`);
process.exit(fallos ? 1 : 0);
