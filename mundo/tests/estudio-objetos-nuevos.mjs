// Prueba de la pestaña Objetos nuevos del Estudio (B6d): node mundo/tests/estudio-objetos-nuevos.mjs
// Modelo puro (estudio/objetos-nuevos-modelo.mjs), que lo guardado lo acepte el juego, las reglas de validar, el puente
// en vivo y que la pestaña esté en la barra, la ayuda y estudio.js.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { O, OBJETOS, COLORES, objetoDeDatos, fijarObjetos } from '../supervivencia/objetos.js';
import { B } from '../texturas.js';
import { claveDeNombre, claveLibre, iconosBase, valorIcono, ponerIcono, saturacionDe, objetoNuevo, faltaDeObjeto, avisosObjeto, limpiarObjeto, reglasObjetos } from '../../estudio/objetos-nuevos-modelo.mjs';
import { DATOS_VIVOS } from '../../estudio/puente-protocolo.js';
import { AYUDA } from '../../estudio/ayuda-modelo.mjs';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
let fallos = 0;
const ok = (cond, msg) => { if (!cond) { fallos++; console.log('FALLA:', msg); } };
const ocupada = k => O[String(k).toUpperCase()] !== undefined || B[String(k).toUpperCase()] !== undefined;
const ICONOS = iconosBase(OBJETOS.filter(Boolean));
const iconos = new Set(ICONOS.map(i => i.icono));
const calc = { ocupada, aceptar: objetoDeDatos, tieneIcono: o => iconos.has(o.icono), tieneDibujo: () => false };

// Claves
ok(claveDeNombre('Pan de Pascua') === 'pan_de_pascua' && claveDeNombre('Ñoquis ¡ricos!') === 'noquis_ricos' && claveDeNombre('123') === '', 'claveDeNombre: sin tildes ni signos');
ok(claveLibre('Pan', { objetos: {} }, ocupada) === 'pan_2' && claveLibre('Sopaipilla', { objetos: { sopaipilla: {} } }, ocupada) === 'sopaipilla_2', 'claveLibre no choca con el código ni el archivo');

// Íconos base: uno por ícono+color, con un objeto de ejemplo
ok(ICONOS.some(i => i.valor === 'lingote/oro') && ICONOS.some(i => i.valor === 'pan') && new Set(ICONOS.map(i => i.valor)).size === ICONOS.length, 'iconosBase: únicos, con color');
const x = { icono: 'pan' }; ponerIcono(x, 'botella/leche'); ok(x.color === 'leche' && valorIcono(x) === 'botella/leche', 'ponerIcono con color');
ponerIcono(x, 'pan'); ok(x.color === undefined && valorIcono(x) === 'pan', 'ponerIcono sin color lo quita');
ok(saturacionDe(5) === 6, 'saturación sola: pan 5 -> 6');

// Nuevo partiendo de uno parecido: copia lo que sirve y toma el siguiente id (que solo sube)
const datos = { siguienteId: 1024, objetos: {} };
const leche = objetoNuevo(datos, OBJETOS[O.BOTELLA_LECHE], { es: 'Jugo', en: 'Juice' });
ok(leche.id === 1024 && datos.siguienteId === 1025 && leche.icono === 'botella' && leche.color === 'leche' && leche.apila === 16 && leche.comida && leche.efecto === 'leche' && leche.devuelve === 'botella', 'objetoNuevo copia ícono, color, apila, comida, efecto y devuelve');
datos.objetos.jugo = leche;
const vacio = objetoNuevo(datos, null, { es: '', en: '' });
ok(vacio.id === 1025 && datos.siguienteId === 1026 && vacio.icono === 'pan', 'objetoNuevo vacío');
const raro = { siguienteId: 1024, objetos: { a: { id: 1500 } } };
ok(objetoNuevo(raro, null, { es: 'b', en: 'b' }).id === 1501, 'objetoNuevo no repite un id aunque siguienteId esté atrasado');

// Faltas y avisos
ok(faltaDeObjeto('jugo', leche, datos, calc) === null, 'el jugo está completo');
ok(faltaDeObjeto('nuevo', vacio, datos, calc) !== null, 'sin nombre falta');
ok(faltaDeObjeto('pan', { ...leche }, datos, calc)[0].includes('ya lo usa'), 'clave del código falta');
ok(faltaDeObjeto('otro', { ...leche }, { objetos: { jugo: leche, otro: { ...leche } } }, calc)[0].includes('mismo número'), 'id repetido falta');
ok(faltaDeObjeto('jugo', { ...leche, color: 'violeta' }, datos, calc) !== null, 'un valor que el juego no acepta falta');
ok(avisosObjeto('jugo', { ...leche, icono: 'no_hay' }, datos, calc).some(a => /Píxeles/.test(a[0])), 'avisa si el ícono no existe');
ok(avisosObjeto('jugo', { ...leche, comida: [12, 1] }, datos, calc).some(a => /Llena mucho/.test(a[0])), 'avisa si llena mucho');

// Lo que se guarda lo acepta el juego, sin claves de más
const limpio = limpiarObjeto({ ...leche, apila: 64, extra: 1, encargo: false });
ok(!('extra' in limpio) && !('apila' in limpio) && !('encargo' in limpio) && objetoDeDatos('jugo', limpio, ['jugo']) !== null, 'limpiarObjeto: lo acepta el juego');
fijarObjetos({ objetos: { jugo: limpio } });
ok(O.JUGO === 1024, 'lo guardado entra al juego');
fijarObjetos(null);

// Reglas de validar
const reglas = reglasObjetos({ siguienteId: 1025, objetos: { pan: { id: 1024, icono: 'pan' }, a: { id: 1024, icono: 'no_hay', devuelve: 'nada', efecto: 'veneno', color: 'violeta' }, b: { id: 1030, icono: 'pan' } } }, { ocupada, iconos, dibujos: new Set(), colores: new Set(Object.keys(COLORES)) });
for (const [que, re] of [['clave del código', /ya es un objeto/], ['id repetido', /repetido/], ['id >= siguienteId', /siguienteId/], ['devuelve', /devuelve/], ['color', /COLORES/], ['efecto sin comida', /solo sirve con comida/]]) ok(reglas.some(r => r.tipo === 'error' && re.test(r.texto)), 'validar avisa: ' + que);
ok(reglas.some(r => r.tipo === 'aviso' && /icono/.test(r.texto)), 'validar: ícono desconocido es aviso');

ok(DATOS_VIVOS.includes('objetos'), 'el puente aplica objetos en vivo');
const leer = (...p) => fs.readFileSync(path.join(RAIZ, ...p), 'utf8');
ok(/data-pestana="nuevos"/.test(leer('estudio', 'index.html')) && /id="seccion-nuevos"/.test(leer('estudio', 'index.html')), 'botón y sección de Objetos nuevos en index.html');
ok(/montarObjetosNuevos\(ctx\)/.test(leer('estudio', 'estudio.js')), 'estudio.js monta la pestaña');
ok(!!AYUDA.nuevos, 'ayuda de la pestaña');
ok(/nombre === 'objetos'/.test(leer('estudio', 'puente-juego.js')) && /fijarObjetos/.test(leer('estudio', 'puente-juego.js')), 'puente-juego aplica objetos con fijarObjetos');

console.log(`estudio-objetos-nuevos: ${fallos ? fallos + ' fallas' : 'OK'}`);
process.exit(fallos ? 1 : 0);
