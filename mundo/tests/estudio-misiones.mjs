// Prueba de la pestaña Misiones del Estudio (B6b): node mundo/tests/estudio-misiones.mjs
// Modelo puro (estudio/misiones-modelo.mjs), el puente en vivo y que la pestaña esté en la barra, la ayuda y estudio.js.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { O } from '../supervivencia/objetos.js';
import { B } from '../texturas.js';
import { VAL_ESMERALDA, valor, suma } from '../supervivencia/tienda-valor.js';
import { MISIONES, misionDeDatos } from '../supervivencia/misiones-datos.js';
import { TIPOS, MOBS, TEXTOS, idSiguiente, misionNueva, faltaDeMision, avisosMision, limpiarMision } from '../../estudio/misiones-modelo.mjs';
import { DATOS_VIVOS } from '../../estudio/puente-protocolo.js';
import { AYUDA } from '../../estudio/ayuda-modelo.mjs';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
let fallos = 0;
const ok = (cond, msg) => { if (!cond) { fallos++; console.log('FALLA:', msg); } };
const idDe = n => { const k = String(n).toUpperCase(); return O[k] !== undefined ? O[k] : B[k]; };
const calc = { idDe, valor, suma, VAL_ESMERALDA };
const texto = { es: 'a', en: 'b' };
const completa = tipo => { const m = misionNueva(tipo, 'rosa'); for (const [k] of TEXTOS) m[k] = { ...texto }; return m; };

ok(idSiguiente('pony', MISIONES.map(m => m.id)) === 'pony4', 'idSiguiente sigue a pony3');
ok(idSiguiente('rosa', ['rosa1', 'rosa2', 'pony9']) === 'rosa3' && idSiguiente('rosa', []) === 'rosa1', 'idSiguiente de una persona nueva');
ok(idSiguiente('lo', ['lona5']) === 'lo1', 'idSiguiente no confunde claves que empiezan igual');
ok(TIPOS.map(t => t[0]).join() === 'entregar,matar,noche' && MOBS[0][0] === '*', 'tipos y monstruos');

ok(faltaDeMision(misionNueva('noche', 'rosa')) !== null, 'sin textos falta algo');
for (const tipo of ['entregar', 'matar', 'noche']) {
    const m = completa(tipo);
    ok(faltaDeMision(m) === null, `${tipo}: completa no falta nada`);
    ok(misionDeDatos('rosa1', limpiarMision(m)) !== null, `${tipo}: lo que se guarda lo acepta el juego`);
}
ok(faltaDeMision({ ...completa('matar'), mob: 'dragon' }) !== null, 'mob desconocido falta');
ok(faltaDeMision({ ...completa('entregar'), pide: [] }) !== null, 'entregar sin pide falta');
ok(faltaDeMision({ ...completa('noche'), premio: [['Pan', 1]] }) !== null, 'premio con nombre inválido falta');

// kit ≤ 1/3 del premio
const conKit = kit => ({ ...completa('noche'), premio: [['esmeralda', 3]], kit });
ok(avisosMision(conKit([['pan', 2]]), calc).length === 0, 'un kit chico no avisa');
ok(avisosMision(conKit([['diamante', 1]]), calc).some(a => /tercio/.test(a[0]) && /third/.test(a[1])), 'avisa si el kit pasa de 1/3 del premio');
const l = limpiarMision({ ...completa('noche'), kit: [], extra: 1, titulo: { es: ' hola ', en: ' hi ', revisado: true } });
ok(!('extra' in l) && !('kit' in l) && l.titulo.es === 'hola' && !('revisado' in l.titulo), 'limpiarMision: solo claves del esquema, sin kit vacío, textos recortados');

ok(DATOS_VIVOS.includes('misiones'), 'el puente aplica misiones en vivo');
const leer = (...p) => fs.readFileSync(path.join(RAIZ, ...p), 'utf8');
ok(/data-pestana="misiones"/.test(leer('estudio', 'index.html')) && /id="seccion-misiones"/.test(leer('estudio', 'index.html')), 'botón y sección de Misiones en index.html');
ok(/montarMisiones\(ctx\)/.test(leer('estudio', 'estudio.js')), 'estudio.js monta la pestaña Misiones');
ok(!!AYUDA.misiones, 'ayuda de la pestaña Misiones');
ok(/nombre === 'misiones'/.test(leer('estudio', 'puente-juego.js')) && /fijarMisiones/.test(leer('estudio', 'puente-juego.js')), 'puente-juego aplica misiones con fijarMisiones');

console.log(`estudio-misiones: ${fallos ? fallos + ' fallas' : 'OK'}`);
process.exit(fallos ? 1 : 0);
