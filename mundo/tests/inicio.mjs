// =========================================================
// Menú de inicio de la supervivencia: valores base (inicio-datos.js), mezcla con inicio.json, frase al azar,
// esquema y que el HTML tenga lo que main.js y el puente del Estudio buscan.
// =========================================================
import { pathToFileURL, fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { readFileSync } from 'fs';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '../../');
const importar = r => import(pathToFileURL(resolve(raiz, r)).href);
const { INICIO, ORDEN_CARGA, datosInicio, fraseAlAzar, consejoAlAzar, avanceCarga } = await importar('mundo/supervivencia/inicio-datos.js');
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

// Pantalla de carga: valores base, mezcla por clave, consejo al azar y avance de la barra
ok(base.carga.consejos.length === INICIO.carga.consejos.length, 'sin JSON usa los consejos del código');
const dc = datosInicio({ version: 1, carga: { etapas: { terreno: { peso: 10 } }, consejos: [{ es: 'Uno', en: 'One' }], tiempos: { minimo: 0 } } });
ok(dc.carga.etapas.terreno.peso === 10 && dc.carga.etapas.terreno.nombre.es === INICIO.carga.etapas.terreno.nombre.es, 'una etapa se mezcla por clave');
ok(dc.carga.etapas.datos.peso === INICIO.carga.etapas.datos.peso && dc.carga.tiempos.salida === INICIO.carga.tiempos.salida, 'lo que falta usa el código');
ok(consejoAlAzar(dc, 'en', () => 0.99) === 'One' && consejoAlAzar(datosInicio({ carga: { consejos: [] } })) === '', 'consejo al azar y lista vacía');
ok(consejoAlAzar(base, 'es', () => 0) === INICIO.carga.consejos[0].es, 'azar 0 = primer consejo');
ok(ORDEN_CARGA.every(k => INICIO.carga.etapas[k] && INICIO.carga.etapas[k].nombre.es && INICIO.carga.etapas[k].nombre.en && INICIO.carga.etapas[k].peso > 0), 'cada etapa con nombre ES/EN y peso');
ok(avanceCarga(base, ORDEN_CARGA[0]) === 0 && avanceCarga(base, null) === 100, 'la barra va de 0 a 100');
const av = ORDEN_CARGA.map(k => avanceCarga(base, k));
ok(av.every((n, i) => i === 0 || n > av[i - 1]) && av.at(-1) < 100, 'la barra solo sube etapa a etapa y termina en el cierre');
ok(avanceCarga(datosInicio({ carga: { etapas: { terreno: { peso: 1 }, sistemas: { peso: 1 }, amigos: { peso: 1 }, mundo: { peso: 1 }, escenas: { peso: 1 }, datos: { peso: 1 } } } }), 'amigos') === 33, 'los pesos reparten la barra');

// Todo texto con su par ES/EN
for (const k of ['logo', 'sub', 'pie']) ok(INICIO.titulo[k].es && INICIO.titulo[k].en, `${k} con ES y EN`);
for (const f of INICIO.titulo.frases) ok(f.es && f.en, `frase «${f.es}» con ES y EN`);
for (const f of [...INICIO.carga.consejos, INICIO.carga.titulo, INICIO.carga.rotuloConsejo]) ok(f.es && f.en, `texto de carga «${f.es}» con ES y EN`);

// Esquema: el archivo real y los valores base valen; un color malo no
const json = JSON.parse(readFileSync(resolve(raiz, 'mundo/datos/inicio.json'), 'utf8'));
ok(!validar(json, 'inicio').length, 'inicio.json cumple el esquema: ' + validar(json, 'inicio').join(' · '));
ok(!validar({ version: 1, ...INICIO }, 'inicio').length, 'INICIO cumple el esquema');
ok(!validar({ version: 1, carga: INICIO.carga }, 'inicio').length, 'INICIO.carga cumple el esquema: ' + validar({ version: 1, carga: INICIO.carga }, 'inicio').join(' · '));
ok(validar({ version: 1, carga: { aspecto: { barra: 'verde' } } }, 'inicio').length > 0, 'el esquema rechaza un color de barra sin #rrggbb');
ok(validar({ version: 1, carga: { etapas: { inventada: { peso: 1 } } } }, 'inicio').length > 0, 'el esquema rechaza una etapa que main.js no conoce');
ok(validar({ version: 1, titulo: { frase: { color: 'amarillo' } } }, 'inicio').length > 0, 'el esquema rechaza un color sin #rrggbb');

// HTML: los ids que usan main.js y el puente del Estudio (que abre «Un jugador» con ?estudio)
const html = readFileSync(resolve(raiz, 'supervivencia.html'), 'utf8');
for (const id of ['menu-titulo', 'logo-texto', 'logo-sub', 'frase-inicio', 'pie-inicio', 'ir-un-jugador', 'ir-amigos', 'ir-skin',
    'pantalla-carga', 'carga-titulo', 'carga-relleno', 'carga-etapa', 'carga-consejo', 'ir-creativo', 'volver', 'menu-mundos', 'lista-mundos', 'nuevo-mundo', 'volver-titulo', 'menu-amigos', 'lista-hospedar', 'coop-menu'])
    ok(html.includes(`id="${id}"`), `supervivencia.html tiene #${id}`);

// main.js: cada etapa de ORDEN_CARGA se anuncia en arrancar y la pantalla se cierra al final
const main = readFileSync(resolve(raiz, 'mundo/supervivencia/main.js'), 'utf8');
for (const k of ORDEN_CARGA.slice(1)) ok(main.includes(`await etapaCarga('${k}')`), `main.js anuncia la etapa ${k}`);
ok(main.includes('abrirCarga(d)') && main.includes('await cerrarCarga()') && main.includes('ocultarCarga()'), 'main.js abre y cierra la pantalla de carga');
// Estudio: los controles nuevos existen en el HTML de la pestaña
const estudioHtml = readFileSync(resolve(raiz, 'estudio/index.html'), 'utf8');
for (const id of ['in-c-vista', 'in-c-textos', 'in-c-aspecto', 'in-consejos', 'in-c-agregar', 'in-c-otro', 'in-c-sel'])
    ok(estudioHtml.includes(`id="${id}"`), `estudio/index.html tiene #${id}`);

console.log('inicio OK');
