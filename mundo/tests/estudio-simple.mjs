// Prueba de las vistas simples de B0-V (estudio/perillas.mjs, vida-simple.mjs, carrera-simple.mjs).
// Vida: horas 13:30 de ida y vuelta, cada visita en una frase, las bases y las copias cumplen el esquema de rutinas.json.
// Vida y Carrera: las perillas ponen y leen sus opciones, cumplen los esquemas, en «normal» no dejan claves (en Carrera
// tampoco objetos vacíos) y un número a mano se lee como «a mano».
// Arena (base = ARENA, cámaras en «conjunto»), Objetos (mover, girar, tamaño) y Formas (medidas, subir, paso), al final.
// Mesa y Salonas: sus perillas (base = el archivo como está) están todas disponibles, se leen igual, cumplen el
// esquema y la opción igual al archivo no borra claves; las cámaras base de la Mesa se reconocen y cumplen el esquema.
// Uso: node mundo/tests/estudio-simple.mjs
import fs from 'node:fs';
import { validar } from '../../estudio/validar.mjs';
import * as VS from '../../estudio/vida-simple.mjs';
import * as CS from '../../estudio/carrera-simple.mjs';
import { CARRERA } from '../supervivencia/carrera-modelo.js';
import * as MS from '../../estudio/mesa-simple.mjs';
import { MESA, marcoMesa } from '../supervivencia/cartas-mesa-modelo.js';
import * as SS from '../../estudio/salonas-simple.mjs';
import { NAV_BASE } from '../navegacion.js';
import { SEGUIR_BASE } from '../seguir.js';
import { PELEA_BASE } from '../supervivencia/acompanante-pelea.js';
import { RUTINA_BASE } from '../supervivencia/rutinas-datos.js';
import { FOGATA_BASE } from '../supervivencia/fogata.js';
import * as AS from '../../estudio/arena-simple.mjs';
import { ARENA } from '../supervivencia/arena/modelo.js';
import * as OS from '../../estudio/objetos-simple.mjs';
import * as FS from '../../estudio/formas-simple.mjs';
import { AJUSTES_BASE, FORMAS_BASE } from '../formas.js';

let bien = 0, mal = 0;
const ok = (c, m) => { if (c) bien++; else { mal++; console.error('MAL:', m); } };
const leer = n => JSON.parse(fs.readFileSync(new URL(`../datos/${n}.json`, import.meta.url), 'utf8'));
const clonar = o => JSON.parse(JSON.stringify(o));

// Horas
for (const h of [0, 6.25, 13.5, 23.75, 24]) ok(VS.horaDeTexto(VS.horaTexto(h)) === (h === 24 ? 0 : h), `hora ${h} de ida y vuelta`);
ok(VS.horaTexto(13.5) === '13:30' && VS.horaDeTexto('7:15') === 7.25, '13.5 = 13:30 y 7:15 = 7.25');
ok(VS.horaDeTexto('25:00') === null && VS.horaDeTexto('12:60') === null && VS.horaDeTexto('') === null, 'horas inválidas = null');

// Frase
ok(VS.fraseVisita({ quien: 'pony', visita: 'lalo', de: 13, a: 15 }) === 'pony va a ver a lalo de 13:00 a 15:00', 'frase de una visita');
ok(VS.fraseVisita({ quien: 'pony', lugar: 'molino', de: 9.5, a: 10, activa: false }, 'en') === 'pony goes to molino from 09:30 to 10:00 (off)', 'frase en inglés, a un lugar y apagada');

// Bases y copias: cumplen el esquema sin tocar lo que había
const rut = leer('rutinas'), antes = JSON.stringify(rut.visitas);
const visitas = clonar(rut.visitas);
for (const b of VS.BASES_VISITA) {
    const { clave, visita } = VS.visitaDeBase(b, 'pony', 'lalo', 'molino', visitas);
    ok(!(clave in rut.visitas), `base ${b.clave}: clave libre`);
    ok(b.visita ? visita.visita === 'lalo' && !visita.lugar : visita.lugar === 'molino' && !visita.respuesta, `base ${b.clave}: a quién o adónde`);
    visitas[clave] = visita;
}
const primera = Object.keys(rut.visitas)[0];
if (primera) {
    const c = VS.duplicarVisita(primera, visitas);
    ok(c.visita.activa === false && !(c.clave in visitas), 'la copia sale apagada y con clave libre');
    visitas[c.clave] = c.visita;
}
const e = validar({ ...rut, visitas }, 'rutinas');
ok(!e.length, 'bases y copia cumplen el esquema: ' + e.slice(0, 3).join(' · '));
ok(JSON.stringify(rut.visitas) === antes, 'las visitas que había no cambian');

// Perillas
const BASES = { navegacion: { caminar: NAV_BASE, seguir: SEGUIR_BASE, pelea: PELEA_BASE }, rutinas: { ajustes: RUTINA_BASE }, actividades: { fogata: FOGATA_BASE } };
const datos0 = { navegacion: leer('navegacion'), rutinas: leer('rutinas'), actividades: leer('actividades') };
for (const p of VS.PERILLAS) {
    for (const [x] of p.opciones) {
        const d = clonar(datos0);
        VS.ponerPerilla(p, d, x, BASES);
        ok(VS.leerPerilla(p, d, BASES) === x, `${p.clave}: ${x} se lee igual`);
        const err = validar(d[p.archivo], p.archivo);
        ok(!err.length, `${p.clave} = ${x} cumple el esquema: ${err.slice(0, 2).join(' · ')}`);
    }
    // «normal» (factor 1 o el valor del juego) no deja claves
    const d = clonar(datos0), normal = p.tipo === 'factor' ? 1 : p.campos.map(c => BASES[p.archivo][p.parte][c])[0];
    VS.ponerPerilla(p, d, normal, BASES);
    ok(p.campos.every(c => !(c in d[p.archivo][p.parte])), `${p.clave}: normal borra la clave`);
    // un número a mano que no es ninguna opción se lee como «a mano» (null)
    const m = clonar(datos0);
    m[p.archivo][p.parte] = { ...(m[p.archivo][p.parte] || {}), [p.campos[0]]: 0.123 };
    ok(VS.leerPerilla(p, m, BASES) === null, `${p.clave}: un valor a mano = null`);
}

// Carrera: perillas sobre la raíz de carrera.json
const car0 = leer('carrera');
const en = (o, r) => r.reduce((a, k) => (a ? a[k] : undefined), o);
for (const p of CS.PERILLAS) {
    for (const [x] of p.opciones) {
        const d = clonar(car0);
        CS.ponerPerilla(p, d, x, CARRERA);
        ok(CS.leerPerilla(p, d, CARRERA) === x, `carrera ${p.clave}: ${x} se lee igual`);
        const err = validar(d, 'carrera');
        ok(!err.length, `carrera ${p.clave} = ${x} cumple el esquema: ${err.slice(0, 2).join(' · ')}`);
    }
    ok(CS.leerPerilla(p, {}, CARRERA) !== null, `carrera ${p.clave}: sin JSON se lee una opción (la del juego)`);
    const d = {};
    CS.ponerPerilla(p, d, CS.leerPerilla(p, {}, CARRERA), CARRERA);
    ok(!Object.keys(d).length, `carrera ${p.clave}: la opción del juego no deja claves ni objetos vacíos`);
    const m = clonar(car0), r = [...p.ruta];
    let o = m; for (const k of r) o = (o[k] = o[k] || {});
    o[p.campos[0]] = 0.123;
    ok(CS.leerPerilla(p, m, CARRERA) === null, `carrera ${p.clave}: un valor a mano = null`);
    ok(en(car0, p.ruta) === undefined || typeof en(car0, p.ruta) === 'object', `carrera ${p.clave}: ruta válida`);
}

// Mesa y Salonas: base = el archivo tal como está (no conocen los valores del código)
for (const [nombre, M] of [['cartas-mesa', MS], ['salonas', SS]]) {
    const ini = leer(nombre);
    ok(M.perillasDisponibles(ini).length === M.PERILLAS.length, `${nombre}: todas las perillas tienen su valor en el archivo`);
    for (const p of M.PERILLAS) {
        for (const [x] of p.opciones) {
            const d = clonar(ini);
            M.ponerPerilla(p, d, x, ini);
            ok(M.leerPerilla(p, d, ini) === x, `${nombre} ${p.clave}: ${x} se lee igual`);
            const err = validar(d, nombre);
            ok(!err.length, `${nombre} ${p.clave} = ${x} cumple el esquema: ${err.slice(0, 2).join(' · ')}`);
        }
        const d = clonar(ini), v = M.leerPerilla(p, ini, ini);
        if (v !== null) { M.ponerPerilla(p, d, v, ini); ok(JSON.stringify(d) === JSON.stringify(ini), `${nombre} ${p.clave}: la opción del archivo lo deja igual (no borra claves)`); }
    }
}
const mesa = leer('cartas-mesa');
for (const c of MS.CAMARAS) {
    ok(MS.baseDeCamara(MS.camaraDeBase(c.clave)) === c.clave, `cámara ${c.clave}: se reconoce`);
    const err = validar({ ...mesa, terceras: [...mesa.terceras, MS.camaraDeBase(c.clave)] }, 'cartas-mesa');
    ok(!err.length, `cámara ${c.clave} cumple el esquema: ${err.slice(0, 2).join(' · ')}`);
}
ok(MS.baseDeCamara({ alto: 9, atras: 1, lado: 0, mira: [0, 0, 0] }) === null, 'una cámara a mano = null');
ok(MS.GRUPOS_SIMPLES.every(g => g in mesa), 'los grupos simples de la Mesa existen en el archivo');

// Arena: perillas sobre ARENA (la opción del juego borra la clave); bases de cámara (tipo «conjunto») y vida de cada uno
const are0 = leer('arena');
const perArena = [...AS.PERILLAS, ...Object.keys(ARENA.peleadores).map(k => AS.perillaVida(k, k))];
for (const p of perArena) {
    for (const [x] of p.opciones) {
        const d = clonar(are0);
        AS.ponerPerilla(p, d, x, ARENA);
        ok(AS.leerPerilla(p, d, ARENA) === x, `arena ${p.clave}: ${x} se lee igual`);
        const err = validar(d, 'arena');
        ok(!err.length, `arena ${p.clave} = ${x} cumple el esquema: ${err.slice(0, 2).join(' · ')}`);
    }
    const delJuego = AS.leerPerilla(p, {}, ARENA);
    ok(delJuego !== null, `arena ${p.clave}: sin JSON se lee una opción (la del juego)`);
    const d = {};
    AS.ponerPerilla(p, d, delJuego, ARENA);
    ok(!Object.keys(d).length, `arena ${p.clave}: la opción del juego no deja claves ni objetos vacíos`);
    const m = clonar(are0); let o = m; for (const k of p.ruta) o = (o[k] = o[k] || {});
    o[p.campos[0]] = 0.123;
    ok(AS.leerPerilla(p, m, ARENA) === null, `arena ${p.clave}: un valor a mano = null`);
}
const cam = AS.PERILLAS.find(p => p.clave === 'camara'), cd = {};
AS.ponerPerilla(cam, cd, 'cerca', ARENA);
ok(cd.camara.altura === 1.3 && cd.camara.distanciaMax === 6 && !('remate' in cd.camara), 'arena: la base «cerca» pone sus números y no toca el golpe final');
AS.ponerPerilla(cam, cd, 'normal', ARENA);
ok(!('camara' in cd), 'arena: volver a «normal» borra la cámara del archivo');

// Objetos: mover y girar de ida y vuelta, el giro queda entre -180 y 180, el tamaño se lee sobre la base
const ag = { pos: [0.1, -0.2, 0.3], rot: [170, 0, -175], escala: 0.5 };
for (const [, , , eje, signo] of OS.MOVER) ok(JSON.stringify(OS.mover(OS.mover(ag, eje, signo), eje, -signo)) === JSON.stringify(ag), `objetos: mover ${eje}/${signo} de ida y vuelta`);
for (const [, , , eje, signo] of OS.GIRAR) {
    const g = OS.girar(ag, eje, signo);
    ok(g.rot[eje] > -180 && g.rot[eje] <= 180, `objetos: girar ${eje}/${signo} queda en rango`);
    ok(JSON.stringify(OS.girar(g, eje, -signo)) === JSON.stringify(ag), `objetos: girar ${eje}/${signo} de ida y vuelta`);
}
ok(OS.girar(ag, 0, 1).rot[0] === -175, 'objetos: 170 + 15 = -175');
for (const [f] of OS.TAMANOS) ok(OS.tamanoDe(OS.conTamano(ag, ag, f), ag) === f, `objetos: tamaño ${f} se lee igual`);
ok(OS.tamanoDe({ ...ag, escala: 0.777 }, ag) === null, 'objetos: un tamaño a mano = null');
ok(OS.mover(ag, 1, 1) !== ag && ag.pos[1] === -0.2, 'objetos: mover no cambia el agarre de entrada');
const om = leer('objetos-mano'), om2 = clonar(om);
om2.objetos.manzana = { mano1: OS.conTamano(OS.girar(OS.mover(ag, 2, -1), 1, 1), ag, 1.5) };
const eo = validar(om2, 'objetos-mano');
ok(!eo.length, 'objetos: un agarre de la vista simple cumple el esquema: ' + eo.slice(0, 2).join(' · '));

// Formas: medidas dentro del bloque, desde el centro (x, z) o la base (y); subir y bajar sin salir
for (const [k, f] of Object.entries(FORMAS_BASE)) for (const c of f.cajas) for (const [, , , j] of FS.MEDIDAS) for (const n of [1, 5, 8, 16]) {
    const r = FS.conMedida(c, j, n);
    ok(FS.medida(r, j) === n && r.a[j] >= 0 && r.b[j] <= 16, `formas ${k}: ${j} = ${n} dentro del bloque`);
    ok([0, 1, 2].every(e => e === j || (r.a[e] === c.a[e] && r.b[e] === c.b[e])), `formas ${k}: cambiar ${j} no toca los otros ejes`);
}
const losa = FORMAS_BASE.losa.cajas[0];
ok(FS.conMedida(losa, 1, 4).a[1] === losa.a[1], 'formas: el alto crece desde la base');
ok(FS.subir(losa, 99).b[1] === 16 && FS.subir(losa, -99).a[1] === 0, 'formas: subir y bajar se quedan en el bloque');
const fo = leer('formas');
for (const p of FS.PERILLAS) for (const [x] of p.opciones) {
    const d = clonar(fo);
    FS.ponerPerilla(p, d, x, AJUSTES_BASE);
    ok(FS.leerPerilla(p, d, AJUSTES_BASE) === x, `formas ${p.clave}: ${x} se lee igual`);
    ok(!validar(d, 'formas').length, `formas ${p.clave} = ${x} cumple el esquema`);
}
const fo2 = clonar(fo); fo2.formas.losa = { cajas: [FS.subir(FS.conMedida(losa, 0, 10), 2)] };
ok(!validar(fo2, 'formas').length, 'formas: una caja de la vista simple cumple el esquema');

// Mesa: el gizmo (gizmo-mesa.js) da { giro, dist, lado } que marcoMesa vuelve a poner en el mismo centro
const lucho = { x: 12.3, y: 70, z: -4.1 };
for (const [giro, dist, lado] of [[0, 0.75, 0], [90, 1.2, -0.4], [-135, 2, 0.5], [180, 0.5, 1]]) {
    const L = { ...MESA, mesa: { ...MESA.mesa, giro, dist, lado } }, M = marcoMesa(L, lucho);
    const r = MS.mesaDesdeCentro(lucho, M, M.g);
    ok(r.giro === giro && Math.abs(r.dist - dist) < 0.006 && Math.abs(r.lado - lado) < 0.006, `mesa ${giro}°: el centro vuelve a ${giro}, ${dist}, ${lado}`);
}
ok(MS.mesaDesdeCentro(lucho, lucho, 3 * Math.PI).giro === 180 && MS.mesaDesdeCentro(lucho, lucho, -Math.PI / 2).giro === -90, 'mesa: el giro queda entre −180 y 180');
const me2 = clonar(leer('cartas-mesa')); Object.assign(me2.mesa, MS.mesaDesdeCentro(lucho, { x: 13, z: -3 }, 0.7));
ok(!validar(me2, 'cartas-mesa').length, 'mesa movida con el gizmo cumple el esquema');
ok(MS.frasePosicion({ giro: 0, dist: 0.75, lado: 0 }) === 'a 0,75 bloques de Lucho, mirando al sur', 'frase de la mesa');
ok(MS.frasePosicion({ giro: 90, dist: 1, lado: -0.2 }, 'en') === '1 block from Lucho, 0.2 to the left, facing east', 'frase de la mesa en inglés');

console.log(`estudio-simple: ${bien}/${bien + mal} bien`);
if (mal) process.exit(1);
