// Prueba de las recetas nuevas en JSON (B6c): node mundo/tests/recetas-datos.mjs
// fijarRecetas suma después de las de hoy, ignora las mal escritas, no pisa la fundición del código y se puede deshacer.
import { B } from '../texturas.js';
import { O } from '../supervivencia/objetos.js';
import { RECETAS, FUNDICION, buscarReceta, fijarRecetas, recetaDeDatos, anchoDe } from '../supervivencia/recetas.js';

let fallos = 0;
const ok = (cond, msg) => { if (!cond) { fallos++; console.log('FALLA:', msg); } };
const antes = RECETAS.length, fAntes = FUNDICION.size;
const da = (rej, ancho) => { const r = buscarReceta(rej, ancho); return r ? r.da : null; };

fijarRecetas({
    recetas: [
        { forma: ['AA', 'AA'], ingredientes: { A: 'arcilla' }, da: ['ladrillo', 4] },
        { forma: ['P', 'T'], ingredientes: { P: ['pluma', 'hilo'], T: 'palo' }, da: ['flecha', 2] },
        { sin: ['hilo', ['tronco', 'tronco_pino']], da: ['antorcha', 3] },
        { forma: ['AB'], ingredientes: { A: 'pan' }, da: ['manzana', 1] },
        { forma: ['A'], ingredientes: { A: 'no_existe' }, da: ['pan', 1] },
        { sin: ['pan'], da: ['no_existe', 1] },
        { sin: ['pan'], da: ['pan', 0] },
        { forma: ['A'], sin: ['pan'], ingredientes: { A: 'pan' }, da: ['manzana', 1] },
        { forma: ['AAAA'], ingredientes: { A: 'pan' }, da: ['manzana', 1] }
    ],
    fundicion: { huevo: 'pan', arena: 'tierra', no_existe: 'pan', pan: 'no_existe' }
});
ok(RECETAS.length === antes + 3, `suma solo las 3 válidas (salió ${RECETAS.length - antes})`);
const [r1, r2, r3] = RECETAS.slice(antes);
ok(r1.forma.join() === 'AA,AA' && r1.clave.A === B.ARCILLA && r1.da[0] === B.LADRILLO && r1.da[1] === 4, 'con forma: clave y resultado con ids');
ok(Array.isArray(r2.clave.P) && r2.clave.P.length === 2 && r2.clave.T === O.PALO, 'ingrediente con grupo');
ok(r3.sin.length === 2 && Array.isArray(r3.sin[1]) && r3.sin[1].includes(B.TRONCO_PINO), 'sin forma con grupo');
ok(da([0, 0, 0, 0, 0, 0, 0, 0, 0], 3) === null, 'rejilla vacía no fabrica');
ok(da([O.HILO, B.TRONCO_PINO, 0, 0], 2) && da([O.HILO, B.TRONCO_PINO, 0, 0], 2)[0] === B.ANTORCHA && da([0, B.TRONCO_PINO, 0, O.HILO], 2)[1] === 3, 'sin forma calza en cualquier casilla');
ok(anchoDe(r1) === 2 && anchoDe(r3) === 2, 'anchoDe funciona con recetas nuevas');
ok(FUNDICION.get(O.HUEVO) === O.PAN, 'fundición nueva');
ok(FUNDICION.get(B.ARENA) === B.VIDRIO, 'una fundición del código no se pisa');
ok(FUNDICION.size === fAntes + 1, 'fundición con objeto inexistente se ignora');
ok(recetaDeDatos(null) === null && recetaDeDatos({}) === null, 'recetaDeDatos: basura = null');
fijarRecetas({ recetas: [{ sin: ['pan'], da: ['manzana', 1] }] });
ok(RECETAS.length === antes + 1 && !FUNDICION.has(O.HUEVO), 'volver a fijar rehace lo nuevo (no duplica)');
fijarRecetas(null);
ok(RECETAS.length === antes && FUNDICION.size === fAntes, 'fijarRecetas(null) vuelve al código');
console.log(`recetas-datos: ${fallos ? fallos + ' fallas' : 'OK'}`);
process.exit(fallos ? 1 : 0);
