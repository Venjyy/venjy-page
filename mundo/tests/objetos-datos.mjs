// Prueba de los objetos nuevos en JSON (B6d): node mundo/tests/objetos-datos.mjs
// fijarObjetos los registra con su id fijo (desde ID_DATOS), ignora los mal escritos, no pisa los del código, los ven
// recetas, tienda y misiones por su nombre, y se puede deshacer. Además: el archivo real del repo es válido.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { O, OBJETOS, ID_DATOS, ID_DATOS_TOPE, fijarObjetos, objetoDeDatos, nombreDe, combustibleDe, apilaDe } from '../supervivencia/objetos.js';
import { recetaDeDatos } from '../supervivencia/recetas.js';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
let fallos = 0;
const ok = (cond, msg) => { if (!cond) { fallos++; console.log('FALLA:', msg); } };
const codigo = Object.keys(O).length;

// El código queda bajo ID_DATOS: si llega ahí, hay que subir ID_DATOS (y migrar objetos.json) antes de seguir
ok(Math.max(...Object.values(O)) < ID_DATOS, `los objetos del código caben bajo ${ID_DATOS}`);

const nombre = (es, en) => ({ es, en });
fijarObjetos({
    objetos: {
        empanada: { id: 1024, nombre: nombre('Empanada', 'Empanada'), icono: 'pan', comida: [6, 7.2] },
        jugo: { id: 1025, nombre: nombre('Jugo', 'Juice'), icono: 'botella', color: 'leche', apila: 16, comida: [2, 1], efecto: 'leche', devuelve: 'botella' },
        frasco: { id: 1026, nombre: nombre('Frasco', 'Jar'), icono: 'botella', apila: 16 },
        mermelada: { id: 1027, nombre: nombre('Mermelada', 'Jam'), icono: 'botella', comida: [3, 2], devuelve: 'frasco' },
        tronquito: { id: 1028, nombre: nombre('Tronquito', 'Log bit'), icono: 'palo', combustible: 20, encargo: true },
        pan: { id: 1029, nombre: nombre('Pan 2', 'Bread 2'), icono: 'pan' }, // clave del código
        tierra: { id: 1030, nombre: nombre('Tierra', 'Dirt'), icono: 'pan' }, // clave de bloque
        repetido: { id: 1024, nombre: nombre('Otro', 'Other'), icono: 'pan' }, // id ocupado
        bajo: { id: 300, nombre: nombre('Bajo', 'Low'), icono: 'pan' }, // id del rango del código
        sin_en: { id: 1031, nombre: { es: 'Solo es', en: '' }, icono: 'pan' },
        color_malo: { id: 1032, nombre: nombre('X', 'X'), icono: 'pan', color: 'violeta' },
        efecto_sin_comida: { id: 1033, nombre: nombre('X', 'X'), icono: 'pan', efecto: 'veneno' },
        devuelve_nada: { id: 1034, nombre: nombre('X', 'X'), icono: 'pan', comida: [1, 1], devuelve: 'no_existe' },
        apila_mala: { id: 1035, nombre: nombre('X', 'X'), icono: 'pan', apila: 10 }
    }
});
ok(O.EMPANADA === 1024 && OBJETOS[1024].comida[0] === 6 && nombreDe(1024, 'en') === 'Empanada', 'registra un objeto con su id fijo y su comida');
ok(OBJETOS[O.JUGO].devuelve === 'BOTELLA' && OBJETOS[O.JUGO].efecto === 'leche' && apilaDe(O.JUGO) === 16, 'devuelve un objeto del código, efecto y apila');
ok(OBJETOS[O.MERMELADA].devuelve === 'FRASCO' && O[OBJETOS[O.MERMELADA].devuelve] === O.FRASCO, 'devuelve otro objeto del archivo');
ok(combustibleDe(O.TRONQUITO) === 20 && OBJETOS[O.TRONQUITO].encargo === true, 'combustible y encargo');
ok(O.PAN < ID_DATOS && nombreDe(O.PAN) === 'Pan' && O.TIERRA === undefined, 'no pisa una clave del código ni de un bloque');
ok(OBJETOS[1024].clave === 'EMPANADA' && O.REPETIDO === undefined && O.BAJO === undefined && !OBJETOS[300]?.datos, 'id ocupado o fuera de rango: se ignora');
for (const k of ['SIN_EN', 'COLOR_MALO', 'EFECTO_SIN_COMIDA', 'DEVUELVE_NADA', 'APILA_MALA']) ok(O[k] === undefined, `mal escrito, ignorado: ${k}`);
ok(objetoDeDatos('x', { id: ID_DATOS_TOPE, nombre: nombre('X', 'X'), icono: 'pan' }) === null, 'id sobre el tope: no vale');

// Las recetas (y tienda y misiones, con el mismo idNombre) los encuentran por nombre
const r = recetaDeDatos({ sin: ['empanada', 'jugo'], da: ['mermelada', 1] });
ok(r && r.sin[0] === 1024 && r.da[0] === O.MERMELADA, 'una receta usa objetos nuevos por nombre');

// Volver a fijar rehace (no duplica) y null vuelve al código
fijarObjetos({ objetos: { empanada: { id: 1024, nombre: nombre('Empanada', 'Empanada'), icono: 'pan' } } });
ok(Object.keys(O).length === codigo + 1 && !OBJETOS[1025] && O.JUGO === undefined, 'volver a fijar quita lo que ya no está');
fijarObjetos(null);
ok(Object.keys(O).length === codigo && !OBJETOS[1024], 'fijarObjetos(null) vuelve al código');

// El archivo del repo: todos sus objetos entran
const real = JSON.parse(fs.readFileSync(path.join(RAIZ, 'mundo', 'datos', 'objetos.json'), 'utf8'));
const lista = Object.entries(real.objetos || {});
fijarObjetos(real);
for (const [k, d] of lista) ok(O[k.toUpperCase()] === d.id, `objetos.json: ${k} entra al juego`);
ok(Number.isInteger(real.siguienteId) && real.siguienteId >= ID_DATOS && lista.every(([, d]) => d.id < real.siguienteId), 'objetos.json: siguienteId sobre todos los ids');
fijarObjetos(null);

console.log(`objetos-datos: ${fallos ? fallos + ' fallas' : 'OK'}`);
process.exit(fallos ? 1 : 0);
