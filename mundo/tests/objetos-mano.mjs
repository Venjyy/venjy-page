// =========================================================
// VENJY · Prueba de objetos-mano-datos.js (cómo se agarra cada objeto)
// Ejecutar: node mundo/tests/objetos-mano.mjs
// =========================================================
import { agarre, fijarDatosObjetosMano, versionObjetosMano, AGARRE, AGARRE_1P_MALLA } from '../supervivencia/objetos-mano-datos.js';

let fallos = 0;
const ok = (c, m) => { if (!c) { fallos++; console.log('FALLA: ' + m); } };
const cerca = (a, b) => Math.abs(a - b) < 1e-9;
const igual = (a, b) => a.length === b.length && a.every((x, i) => cerca(x, b[i]));

// Sin datos: los valores del código, tal cual
fijarDatosObjetosMano(null);
ok(igual(agarre('mano3', 'PICO_MADERA', 'herramienta').rot, AGARRE.herramienta.rot), 'sin datos: herramienta en 3.ª persona = código');
ok(agarre('mano3', null, 'bloque').escala === AGARRE.bloque.escala, 'sin datos: bloque en 3.ª persona = código');
ok(igual(agarre('mano1', 'MANZANA', 'objeto').rot, AGARRE_1P_MALLA.objeto.rot), 'sin datos: objeto en 1.ª persona = código');
ok(igual(agarre('mano1', 'CANA', 'herramienta').pos, [0, 0.1, -0.15]), 'la caña conserva su ajuste de 1.ª persona');
ok(igual(agarre('mano1', 'PICO_MADERA', 'herramienta').pos, [0, 0, 0]), 'el pico no lo hereda');
ok(agarre('mano3', 'PICO_MADERA', 'herramienta').mango.length === 2, 'el mango del cuerpo se conserva');

// Por tipo: cambia a todas las herramientas, solo en esa vista; la caña mantiene su posición del código
const v0 = versionObjetosMano();
fijarDatosObjetosMano({ version: 1, tipos: { herramienta: { mano1: { pos: [0.1, 0.2, 0.3], rot: [90, 0, 180], escala: 0.8 } } }, objetos: {} });
ok(versionObjetosMano() === v0 + 1, 'la versión sube al cambiar los datos');
let a = agarre('mano1', 'PICO_MADERA', 'herramienta');
ok(igual(a.pos, [0.1, 0.2, 0.3]) && cerca(a.rot[0], Math.PI / 2) && cerca(a.rot[2], Math.PI) && a.escala === 0.8, 'por tipo: pos, rot (grados→rad) y escala');
ok(igual(agarre('mano1', 'CANA', 'herramienta').pos, [0, 0.1, -0.15]), 'por tipo: el ajuste de la caña gana al tipo');
ok(agarre('mano3', 'PICO_MADERA', 'herramienta').escala === AGARRE.herramienta.escala, 'por tipo: la otra vista no cambia');
ok(agarre('mano1', 'MANZANA', 'objeto').escala === AGARRE_1P_MALLA.objeto.escala, 'por tipo: otro tipo no cambia');

// Por objeto: gana a todo; las claves que faltan salen del tipo; la clave va en cualquier caja
fijarDatosObjetosMano({ version: 1, tipos: { herramienta: { mano1: { escala: 0.8 } } }, objetos: { cana: { mano1: { pos: [0, 0, 0], rot: [0, 0, 0] } } } });
a = agarre('mano1', 'CANA', 'herramienta');
ok(igual(a.pos, [0, 0, 0]) && igual(a.rot, [0, 0, 0]) && a.escala === 0.8, 'por objeto: gana a tipo y código; escala del tipo');
ok(igual(agarre('mano1', 'cana', 'herramienta').pos, [0, 0, 0]), 'la clave no distingue mayúsculas');

console.log(fallos ? `${fallos} fallos` : 'objetos-mano: todo bien');
process.exit(fallos ? 1 : 0);
