// Prueba del campo común del Estudio (Etapa B, 0b · B0-C): node mundo/tests/campo-comun.mjs
// Historial por instantáneas (deshacer) y borrado de una ruta del JSON («volver al valor del juego»).
// Lo que se ve (botón Deshacer, punto en la pestaña, botón «Del juego») lo mira el dueño.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { crearHistorial, tieneRuta, quitarRuta } from '../../estudio/campo-comun-modelo.mjs';

let fallos = 0, pruebas = 0;
const ok = (cond, msg) => { pruebas++; if (!cond) { fallos++; console.log('FALLA:', msg); } };

// Historial: cambios separados se deshacen de a uno; los seguidos (un slider) caen en uno solo
let reloj = 0;
const h = crearHistorial({ junta: 400, ahora: () => reloj });
ok(h.anotar('a') === false && h.largo === 0, 'la primera instantánea fija la base, no cuenta');
reloj = 1000; ok(h.anotar('b') === true && h.largo === 1, 'un cambio guarda la anterior');
reloj = 1100; h.anotar('c'); reloj = 1200; h.anotar('d');
ok(h.largo === 1, 'cambios seguidos en menos de 400 ms son una entrada');
reloj = 2000; h.anotar('e');
ok(h.largo === 2, 'pasado el tiempo es otra entrada');
ok(h.anotar('e') === false && h.largo === 2, 'sin cambio no anota');
ok(h.deshacer() === 'd', 'deshacer devuelve el estado de antes de lo último');
ok(h.deshacer() === 'a', 'y luego el anterior');
ok(h.deshacer() === null, 'sin más historia devuelve null');
reloj = 3000; h.anotar('f'); ok(h.largo === 1, 'tras deshacer, un cambio nuevo se anota');
ok(h.deshacer() === 'a', 'y vuelve a la base');
const corto = crearHistorial({ limite: 3, junta: 0, ahora: () => 0 });
corto.fijar('0'); for (const x of ['1', '2', '3', '4', '5']) corto.anotar(x);
ok(corto.largo === 3, 'el límite recorta lo más viejo');
ok(corto.deshacer() === '4', 'y conserva lo más nuevo');
h.vaciar(); ok(h.largo === 0, 'vaciar limpia');

// Rutas del JSON
const d = { a: 1, b: { c: 2, d: { e: 3 } }, l: [1, 2], z: { y: { x: 9 } } };
ok(tieneRuta(d, ['b', 'd', 'e']) && !tieneRuta(d, ['b', 'q']) && !tieneRuta(d, ['a', 'x']), 'tieneRuta');
ok(quitarRuta(d, ['b', 'c']) === true && !('c' in d.b) && d.b.d.e === 3, 'quita una clave y deja el resto');
ok(quitarRuta(d, ['z', 'y', 'x']) === true && !('z' in d), 'quita también los objetos que quedan vacíos');
ok(quitarRuta(d, ['b', 'd', 'e']) === true && !('b' in d), 'hasta la raíz si todo queda vacío');
ok(quitarRuta(d, ['a']) === true && !('a' in d) && Array.isArray(d.l), 'clave suelta de la raíz');
ok(quitarRuta(d, ['no', 'existe']) === false, 'una ruta que no existe no hace nada');
ok(quitarRuta(d, ['l', '0']) === false && d.l.length === 2, 'no borra elementos de listas');

// Cada pestaña con deshacer lo instala y avisa sus cambios; las demás registran su punto
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const lee = f => fs.readFileSync(path.join(RAIZ, 'estudio', f), 'utf8');
for (const [f, clave] of [['arena', 'arena'], ['carrera', 'carrera'], ['combate', 'combate'], ['formas', 'formas'], ['inicio', 'inicio'], ['mesa', 'mesa'], ['objetos', 'objetos'], ['salonas', 'salonas'], ['vida', 'vida']]) {
    const s = lee(f + '.js');
    ok(s.includes('instalarDeshacer(ctx, { pestana: \'' + clave + '\'') || s.includes("pestana: '" + clave + "'"), f + ' instala el deshacer');
    ok(s.includes('hist.anotar()'), f + ' anota cada cambio');
}
for (const [f, clave] of [['layout', 'layout'], ['textos', 'textos'], ['posiciones', 'posiciones'], ['escenas', 'escenas'], ['poses', 'poses'], ['pixeles', 'pixeles'], ['musica', 'musica'], ['ritmo', 'ritmo']])
    ok(lee(f + '.js').includes('ctx.sucios.' + clave + ' ='), f + ' registra su punto');
const html = fs.readFileSync(path.join(RAIZ, 'estudio', 'index.html'), 'utf8');
for (const m of html.matchAll(/data-pestana="([a-z]+)"/g)) if (m[1] !== 'juego') {
    const f = lee(m[1] + '.js');
    ok(f.includes('ctx.sucios.' + m[1] + ' ='), 'la pestaña ' + m[1] + ' registra su punto');
}

console.log(`campo-comun: ${pruebas - fallos}/${pruebas} bien`);
process.exit(fallos ? 1 : 0);
