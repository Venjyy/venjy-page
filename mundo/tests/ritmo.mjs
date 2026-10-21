// Prueba de la pestaña Ritmo (S10a): node mundo/tests/ritmo.mjs
// Modelo puro (estudio/ritmo-modelo.mjs): partitura armada, ajustes a mano, revisión; y que el esquema, el HTML y el juego
// estén cableados (ids que usa ritmo.js, pestaña registrada, salonas.js lee salonas.json → ajustes).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as M from '../../estudio/ritmo-modelo.mjs';

let fallos = 0;
const ok = (cond, msg) => { if (!cond) { fallos++; console.log('FALLA:', msg); } };
const iguales = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const leer = (...p) => fs.readFileSync(path.join(RAIZ, ...p), 'utf8');
const MUSICA = JSON.parse(leer('mundo', 'datos', 'musica.json'));
const SALONAS = JSON.parse(leer('mundo', 'datos', 'salonas.json'));
const R = SALONAS.reglas;
const CLAVES = SALONAS.juego.canciones;

// ---------- armar: todas las canciones y dificultades ----------
for (const k of CLAVES) for (const d of M.DIFICULTADES) {
    const v = M.armar(k, MUSICA.canciones[k], d, R, null);
    ok(v.notas.length > 0, `${k}/${d}: sin notas`);
    ok(v.notas.every(n => n.carril >= 0 && n.carril < v.carriles && !n.movida && n.base === n.carril), `${k}/${d}: sin ajustes ninguna nota debería estar movida`);
    ok(v.quitadas.length === 0, `${k}/${d}: sin ajustes no hay quitadas`);
    ok(v.secciones.length === MUSICA.canciones[k].estructura.length, `${k}/${d}: secciones`);
}

// ---------- ajustes a mano ----------
const K = 'sala-ska', D = 'normal', C = MUSICA.canciones[K];
const base = M.armar(K, C, D, R, null);
const n0 = base.notas[3], otro = (n0.carril + 1) % base.carriles;
const congelado = Object.freeze({});

let aj = M.ponerAjuste(congelado, K, D, n0.clave, otro, n0.base);
ok(iguales(aj, { [K]: { [D]: { [n0.clave]: otro } } }), 'ponerAjuste guarda el carril');
ok(iguales(congelado, {}), 'ponerAjuste no cambia el original');
const mov = M.armar(K, C, D, R, aj);
const m = mov.notas.find(n => n.clave === n0.clave);
ok(m && m.carril === otro && m.movida && m.base === n0.carril, 'la nota movida cae en su carril y recuerda el generado');
ok(mov.notas.length === base.notas.length, 'mover no cambia cuántas notas hay');
ok(iguales(mov.notas.map(n => n.t), base.notas.map(n => n.t)), 'mover nunca cambia cuándo suena una nota');
ok(M.contarAjustes(aj, K) === 1 && M.contarAjustes(aj, 'bar-funk') === 0, 'contarAjustes');

// el carril generado no se guarda y los vacíos se podan
ok(iguales(M.ponerAjuste(aj, K, D, n0.clave, n0.carril, n0.base), {}), 'volver al carril generado poda el ajuste y los objetos vacíos');
ok(iguales(M.ponerAjuste(aj, K, D, n0.clave, undefined, n0.base), {}), 'undefined = volver a la generada');

// quitar y devolver
const quit = M.ponerAjuste(aj, K, D, n0.clave, null, n0.base);
const q = M.armar(K, C, D, R, quit);
ok(q.notas.length === base.notas.length - 1 && !q.notas.some(n => n.clave === n0.clave), 'null quita la nota');
ok(q.quitadas.length === 1 && q.quitadas[0].clave === n0.clave && q.quitadas[0].base === n0.carril, 'la quitada se puede devolver (guarda su carril generado)');
ok(M.armar(K, C, D, R, M.ponerAjuste(quit, K, D, n0.clave, undefined, n0.base)).quitadas.length === 0, 'devolver la nota');

// los ajustes de una dificultad no tocan las otras ni otras canciones
const dif = M.armar(K, C, 'dificil', R, aj);
ok(dif.notas.every(n => !n.movida), 'un ajuste de Normal no se ve en Difícil');
const otraCancion = M.armar('bar-funk', MUSICA.canciones['bar-funk'], D, R, aj);
ok(otraCancion.notas.every(n => !n.movida), 'un ajuste de una canción no se ve en otra');

// acotado a los carriles de la dificultad
const fuera = M.armar(K, C, 'facil', R, { [K]: { facil: { [M.armar(K, C, 'facil', R, null).notas[0].clave]: 9 } } });
ok(fuera.notas.every(n => n.carril <= fuera.carriles - 1), 'un carril fuera de rango se acota');

// ---------- revisar ----------
const av = M.revisar(K, C, R, null);
ok(Array.isArray(av) && av.every((a, i) => i === 0 || Number(av[i - 1].grave) >= Number(a.grave)), 'revisar ordena lo grave primero');
const huerfano = M.revisar(K, C, R, { [K]: { [D]: { '999:3': 1 } } });
ok(huerfano.some(a => a.tipo === 'huerfano' && a.dificultad === D && /999:3/.test(a.texto)), 'un ajuste huérfano se avisa');
const roto = JSON.parse(JSON.stringify(C)); roto.estructura = [{ seccion: 'verso', compases: 1, nivel: 'noexiste' }];
ok(M.revisar('x', roto, R, null).some(a => a.tipo === 'vacia' && a.grave), 'una sección sin notas es un aviso grave');

// ---------- cableado ----------
const ritmoJs = leer('estudio', 'ritmo.js'), html = leer('estudio', 'index.html'), estudioJs = leer('estudio', 'estudio.js');
const ids = [...ritmoJs.matchAll(/\$\('([a-z-]+)'\)/g)].map(x => x[1]);
ok(ids.length > 5, 'ritmo.js usa ids');
for (const id of new Set(ids)) ok(html.includes(`id="${id}"`), `index.html no tiene #${id}`);
ok(html.includes('data-pestana="ritmo"') && html.includes('id="panel-ritmo"') && html.includes('id="ri-zona"'), 'pestaña Ritmo en index.html');
ok(/montarRitmo/.test(estudioJs) && /panel-ritmo/.test(estudioJs) && /ri-zona/.test(estudioJs), 'pestaña Ritmo registrada en estudio.js');
ok(/ctx\.salonas\s*=/.test(leer('estudio', 'salonas.js')), 'salonas.js comparte sus datos con Ritmo');
const esquema = JSON.parse(leer('estudio', 'esquemas', 'salonas.schema.json'));
ok(esquema.properties.ajustes && esquema.$defs.ajustesMano, 'el esquema de salonas.json conoce `ajustes`');
ok(/ajustes:\s*mano/.test(leer('mundo', 'supervivencia', 'salonas.js')), 'salonas.js pasa los ajustes a mano a la partitura');
ok(esquema.$defs.ajustesMano.additionalProperties.additionalProperties.additionalProperties.type.includes('null'), 'el esquema admite null (quitar)');

ok(/function probar\(/.test(leer('mundo', 'supervivencia', 'salonas.js')) && /abrir, probar,/.test(leer('mundo', 'supervivencia', 'salonas.js')), 'salonas.js expone probar()');
ok(/ctx\.puente\.enviar\('salonas'/.test(ritmoJs) && /accion: 'probar'/.test(ritmoJs), 'Ritmo manda el mensaje salonas al juego');
ok(/async salonas\(/.test(leer('estudio', 'puente-juego.js')) && /case 'salonas'/.test(leer('estudio', 'puente-protocolo.js')), 'el puente conoce el mensaje salonas');
ok(html.includes('id="ri-probar"') && html.includes('id="ri-seccion"') && html.includes('id="ri-parar"'), 'botones de probar en index.html');

console.log(fallos ? `${fallos} fallas` : 'ritmo: todo bien');
process.exit(fallos ? 1 : 0);
