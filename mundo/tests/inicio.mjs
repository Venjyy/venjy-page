// =========================================================
// Menú de inicio de la supervivencia: valores base (inicio-datos.js), mezcla con inicio.json, frase al azar,
// esquema y que el HTML tenga lo que main.js y el puente del Estudio buscan.
// =========================================================
import { pathToFileURL, fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { readFileSync } from 'fs';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '../../');
const importar = r => import(pathToFileURL(resolve(raiz, r)).href);
const { INICIO, datosInicio, fraseAlAzar } = await importar('mundo/supervivencia/inicio-datos.js');
const { validar } = await importar('estudio/validar.mjs');
const ok = (cond, msg) => { if (!cond) throw new Error(`inicio: ${msg}`); };

// Sin JSON: todo el código
const base = datosInicio(null);
ok(base.titulo.logo.es === INICIO.titulo.logo.es, 'sin JSON usa el logo del código');
ok(base.titulo.frases.length === INICIO.titulo.frases.length, 'sin JSON usa las frases del código');

// El JSON cambia solo lo que trae; las frases (arreglo) reemplazan
const d = datosInicio({ version: 1, titulo: { sub: { es: 'Prueba', en: 'Test' }, frases: [{ es: 'Uno', en: 'One' }], frase: { giro: 5 } } });
ok(d.titulo.sub.en === 'Test' && d.titulo.logo.es === INICIO.titulo.logo.es, 'mezcla por clave');
ok(d.titulo.frases.length === 1, 'las frases del JSON reemplazan a las del código');
ok(d.titulo.frase.giro === 5 && d.titulo.frase.color === INICIO.titulo.frase.color, 'el aspecto se mezcla por clave');
ok(INICIO.titulo.frases.length > 1, 'datosInicio no modifica INICIO');

// Frase al azar
ok(fraseAlAzar(d, 'en', () => 0.99) === 'One', 'frase en inglés');
ok(fraseAlAzar(base, 'es', () => 0) === INICIO.titulo.frases[0].es, 'azar 0 = primera');
ok(fraseAlAzar(base, 'es', () => 0.9999) === INICIO.titulo.frases.at(-1).es, 'azar casi 1 = última');
ok(fraseAlAzar(datosInicio({ titulo: { frases: [] } })) === '', 'sin frases = vacío');

// Todo texto con su par ES/EN
for (const k of ['logo', 'sub', 'pie']) ok(INICIO.titulo[k].es && INICIO.titulo[k].en, `${k} con ES y EN`);
for (const f of INICIO.titulo.frases) ok(f.es && f.en, `frase «${f.es}» con ES y EN`);

// Esquema: el archivo real y los valores base valen; un color malo no
const json = JSON.parse(readFileSync(resolve(raiz, 'mundo/datos/inicio.json'), 'utf8'));
ok(!validar(json, 'inicio').length, 'inicio.json cumple el esquema: ' + validar(json, 'inicio').join(' · '));
ok(!validar({ version: 1, ...INICIO }, 'inicio').length, 'INICIO cumple el esquema');
ok(validar({ version: 1, titulo: { frase: { color: 'amarillo' } } }, 'inicio').length > 0, 'el esquema rechaza un color sin #rrggbb');

// HTML: los ids que usan main.js y el puente del Estudio (que abre «Un jugador» con ?estudio)
const html = readFileSync(resolve(raiz, 'supervivencia.html'), 'utf8');
for (const id of ['menu-titulo', 'logo-texto', 'logo-sub', 'frase-inicio', 'pie-inicio', 'ir-un-jugador', 'ir-amigos', 'ir-skin',
    'ir-creativo', 'volver', 'menu-mundos', 'lista-mundos', 'nuevo-mundo', 'volver-titulo', 'menu-amigos', 'lista-hospedar', 'coop-menu'])
    ok(html.includes(`id="${id}"`), `supervivencia.html tiene #${id}`);

console.log('inicio OK');
