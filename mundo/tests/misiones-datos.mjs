// Prueba de las misiones nuevas en JSON (B6b): node mundo/tests/misiones-datos.mjs
// fijarMisiones suma al final de las de hoy, ignora las mal escritas y se puede deshacer.
import { O } from '../supervivencia/objetos.js';
import { MISIONES, fijarMisiones, misionDeDatos } from '../supervivencia/misiones-datos.js';

let fallos = 0;
const ok = (cond, msg) => { if (!cond) { fallos++; console.log('FALLA:', msg); } };
const t = (es, en) => ({ es, en });
const base = { amigo: 'rosa', premio: [['esmeralda', 2]], titulo: t('Pan', 'Bread'), pedido: t('Tráeme pan.', 'Bring me bread.'), aceptar: t('Dale.', 'Go.'), completada: t('Gracias.', 'Thanks.') };
const antes = MISIONES.length;

fijarMisiones({ misiones: {
    rosa1: { ...base, tipo: 'entregar', pide: [['pan', 3]], kit: [['manzana', 2], ['tijeras', 1, 'rosa']] },
    rosa2: { ...base, tipo: 'matar', mob: 'zombi', n: 4, noche: true },
    rosa3: { ...base, tipo: 'noche' },
    pony1: { ...base, amigo: 'pony', tipo: 'noche' },
    rosa4: { ...base, tipo: 'visitar' },
    otra1: { ...base, tipo: 'noche' },
    rosa5: { ...base, tipo: 'entregar', pide: [['no_existe', 1]] },
    rosa6: { ...base, tipo: 'entregar', pide: [['pan', 1]], titulo: { es: 'solo es' } },
    rosa7: { ...base, tipo: 'matar', n: 3 }
} });
const nuevas = MISIONES.slice(antes);
ok(nuevas.map(m => m.id).join() === 'rosa1,rosa2,rosa3', `suma solo las válidas, en orden (salió ${nuevas.map(m => m.id)})`);
const [m1, m2, m3] = nuevas;
ok(m1.tipo === 'entregar' && m1.pide[0][0] === O.PAN && m1.pide[0][1] === 3 && m1.premio[0][0] === O.ESMERALDA, 'entregar: pide y premio con ids');
ok(m1.kit.length === 2 && m1.kit[0][0] === O.MANZANA && m1.kit[1][2] === 'rosa', 'kit con herramienta prestada');
ok(m2.mob === 'zombi' && m2.n === 4 && m2.noche === true && m2.kit === null, 'matar: mob, n y de noche; sin kit = null');
ok(m3.tipo === 'noche' && m3.titulo.en === 'Bread', 'noche con sus textos');
ok(!MISIONES.some(m => m.id === 'pony1' && m.tipo === 'noche'), 'un id del código no se pisa');
ok(misionDeDatos('rosa1', null) === null && misionDeDatos(5, base) === null, 'misionDeDatos: basura = null');
fijarMisiones({ misiones: { rosa1: { ...base, tipo: 'noche' } } });
ok(MISIONES.length === antes + 1, 'volver a fijar rehace las nuevas (no las duplica)');
fijarMisiones(null);
ok(MISIONES.length === antes && !MISIONES.some(m => m.id.startsWith('rosa')), 'fijarMisiones(null) vuelve al código');
console.log(`misiones-datos: ${fallos ? fallos + ' fallas' : 'OK'}`);
process.exit(fallos ? 1 : 0);
