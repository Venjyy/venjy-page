// Prueba de las vistas simples de B0-V (estudio/perillas.mjs, vida-simple.mjs, carrera-simple.mjs).
// Vida: horas 13:30 de ida y vuelta, cada visita en una frase, las bases y las copias cumplen el esquema de rutinas.json.
// Vida y Carrera: las perillas ponen y leen sus opciones, cumplen los esquemas, en «normal» no dejan claves (en Carrera
// tampoco objetos vacíos) y un número a mano se lee como «a mano». Uso: node mundo/tests/estudio-simple.mjs
import fs from 'node:fs';
import { validar } from '../../estudio/validar.mjs';
import * as VS from '../../estudio/vida-simple.mjs';
import * as CS from '../../estudio/carrera-simple.mjs';
import { CARRERA } from '../supervivencia/carrera-modelo.js';
import { NAV_BASE } from '../navegacion.js';
import { SEGUIR_BASE } from '../seguir.js';
import { PELEA_BASE } from '../supervivencia/acompanante-pelea.js';
import { RUTINA_BASE } from '../supervivencia/rutinas-datos.js';
import { FOGATA_BASE } from '../supervivencia/fogata.js';

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

console.log(`estudio-simple: ${bien}/${bien + mal} bien`);
if (mal) process.exit(1);
