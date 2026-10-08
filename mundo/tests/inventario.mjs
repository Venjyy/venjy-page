// Prueba del inventario: node mundo/tests/inventario.mjs
import { B } from '../texturas.js';
import { O } from '../supervivencia/objetos.js';
import { Inventario, clicCasilla, pila } from '../supervivencia/inventario.js';

let fallos = 0;
const ok = (cond, msg) => { if (!cond) { fallos++; console.log('FALLA:', msg); } };
const inv = new Inventario();
ok(inv.agregar(B.TIERRA, 100) === 0, 'caben 100 de tierra');
ok(inv.casillas[0].n === 64 && inv.casillas[1].n === 36, 'se apila de a 64 en la barra');
ok(inv.agregar(O.PICO_HIERRO, 2) === 0 && inv.casillas[2].n === 1 && inv.casillas[3].id === O.PICO_HIERRO, 'herramientas no se apilan');
ok(inv.contar(B.TIERRA) === 100, 'contar');
ok(inv.quitar(B.TIERRA, 70) && inv.contar(B.TIERRA) === 30, 'quitar');
ok(!inv.quitar(B.TIERRA, 31), 'no quita más de lo que hay');
inv.elegida = 2;
for (let i = 0; i < 250; i++) inv.desgastarMano();
ok(inv.casillas[2] === null, 'el pico de hierro se rompe a los 250 usos');
// Clics
let [c, cur] = clicCasilla(pila(B.PIEDRA, 10), null, 1);
ok(c.n === 5 && cur.n === 5, 'clic derecho toma la mitad');
[c, cur] = clicCasilla(c, cur, 1);
ok(c.n === 6 && cur.n === 4, 'clic derecho deja uno');
[c, cur] = clicCasilla(c, cur, 0);
ok(c.n === 10 && cur === null, 'clic izquierdo junta');
[c, cur] = clicCasilla(pila(B.PIEDRA, 60), pila(B.PIEDRA, 10), 0);
ok(c.n === 64 && cur.n === 6, 'junta hasta 64');
const s = inv.serializar(), inv2 = new Inventario();
inv2.cargar(JSON.parse(JSON.stringify(s)));
ok(inv2.contar(B.TIERRA) === 30 && inv2.casillas[3].id === O.PICO_HIERRO, 'serializar ida y vuelta');
console.log(fallos ? fallos + ' fallas' : 'inventario OK');
process.exit(fallos ? 1 : 0);
