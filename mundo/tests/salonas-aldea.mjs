// Salonas en la aldea (salonas-aldea.js) y amistad por jugar: reglas puras. Uso: node mundo/tests/salonas-aldea.mjs
import { readFileSync } from 'node:fs';
import { aldeaActiva, volumenAldea, siguienteCancion, ajustesDe } from '../supervivencia/salonas-reloj.js';
import { crearAmistad } from '../supervivencia/amistad.js';

let fallos = 0;
const ok = (c, m) => { if (!c) { fallos++; console.log('FALLA:', m); } };
const A = ajustesDe(null).aldea;
const json = JSON.parse(readFileSync(new URL('../datos/salonas.json', import.meta.url), 'utf8'));
const musica = JSON.parse(readFileSync(new URL('../datos/musica.json', import.meta.url), 'utf8'));

ok(aldeaActiva(A, { esNoche: true }), 'de noche suena');
ok(!aldeaActiva(A, { esNoche: false }), 'de día no suena');
ok(aldeaActiva(A, { esNoche: false, concierto: true }), 'en el concierto suena de día');
ok(!aldeaActiva({ ...A, activa: false }, { esNoche: true }), 'apagada desde el Estudio no suena');
ok(aldeaActiva({ ...A, soloNoche: false }, { esNoche: false }), 'sin soloNoche suena de día');
ok(!aldeaActiva({ ...A, canciones: [] }, { esNoche: true }), 'sin canciones no suena');
ok(volumenAldea(A, 0) === A.vol && volumenAldea(A, A.distancia) === 0 && volumenAldea(A, 50) === 0, 'volumen por distancia');
ok(siguienteCancion(A, 0) === A.canciones[0] && siguienteCancion(A, A.canciones.length) === A.canciones[0], 'la rotación da la vuelta');
// El JSON trae los mismos valores que el código y todas sus canciones existen y son listas
ok(JSON.stringify(json.juego.aldea) === JSON.stringify(A), 'salonas.json → juego.aldea = valores del código');
for (const k of json.juego.aldea.canciones) ok(musica.canciones[k] && !musica.canciones[k].borrador, `canción ${k} existe`);
for (const k of json.juego.canciones) ok(!/provisori/i.test(JSON.stringify(musica.canciones[k].nombre)), `${k}: nombre definitivo`);
// Amistad: jugar una canción suma con Salonas (AMIGOS_MINIJUEGO.salonas)
ok(/salonas: \['salonas'\]/.test(readFileSync(new URL('../supervivencia/misiones.js', import.meta.url), 'utf8')), 'misiones: salonas suma amistad');
const am = crearAmistad({ base: () => ({}), dia: () => 1, skin: () => null });
const antes = am.puntos('salonas');
am.sumar('salonas', 'minijuego'); am.sumar('salonas', 'gana');
ok(am.puntos('salonas') > antes, 'sumar minijuego+gana sube la amistad');
console.log(fallos ? `${fallos} fallos` : 'salonas-aldea: todo bien');
process.exit(fallos ? 1 : 0);
