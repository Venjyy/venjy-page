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

// Presentación «Venjy presenta»: valores base, mezcla, logo y HTML
const { planosValidos, fondoActivo, planoEn, siguientePlano, veloEn } = await importar('mundo/supervivencia/inicio-datos.js');
const { decodificar } = await importar('mundo/datos/pixeles.js');
const P = INICIO.presentacion;
ok(P.nombre.es && P.nombre.en && P.lema.es && P.lema.en, 'presentación con nombre y lema ES/EN');
ok(P.logo.filas.every(f => f.length === P.logo.filas[0].length), 'filas del logo del mismo ancho');
ok(decodificar(P.logo, P.logo.filas[0].length, P.logo.filas.length).some(Boolean), 'el logo dibuja algo');
ok(P.tiempos.maximo > P.tiempos.minimo, 'la presentación tiene un máximo mayor que el mínimo');
const dp = datosInicio({ presentacion: { lema: { es: 'hace', en: 'makes' }, tiempos: { minimo: 1 } } });
ok(dp.presentacion.lema.en === 'makes' && dp.presentacion.nombre.es === P.nombre.es && dp.presentacion.tiempos.maximo === P.tiempos.maximo, 'la presentación se mezcla por clave');
for (const id of ['presentacion', 'pres-logo', 'pres-nombre', 'pres-lema', 'fondo-velo']) ok(html.includes(`id="${id}"`), `supervivencia.html tiene #${id}`);
ok(html.indexOf('presentacion.js') > 0 && html.indexOf('presentacion.js') < html.indexOf('supervivencia/main.js'), 'presentacion.js se carga antes que main.js');
ok(html.includes('data-sin-presentacion'), 'el <head> salta la presentación con ?estudio');

// Fondo de cine: planos, cámara, orden, velo y cuándo se muestra
const F = INICIO.fondo;
ok(planosValidos(base).length === F.planos.length && F.planos.length >= 3, 'los planos del código valen (al menos 3)');
ok(planosValidos(datosInicio({ fondo: { planos: [{ desde: [1, 2], mira: [0, 0, 0], duracion: 5 }, { desde: [1, 2, 3], mira: [0, 0, 0], duracion: 0 }] } })).length === 0, 'planos sin 3 números o sin duración no valen');
ok(fondoActivo(base) && fondoActivo(base, true), 'el fondo sale en PC y en celular por defecto');
ok(!fondoActivo(datosInicio({ fondo: { enCelular: false } }), true) && fondoActivo(datosInicio({ fondo: { enCelular: false } }), false), 'enCelular apaga solo en táctil');
ok(!fondoActivo(datosInicio({ fondo: { activo: false } })) && !fondoActivo(datosInicio({ fondo: { planos: [] } })), 'apagado o sin planos = sin fondo');
const pl = { desde: [0, 10, 0], hasta: [10, 20, 0], mira: [0, 0, 5], duracion: 4 };
ok(planoEn(pl, 0).pos.join() === '0,10,0' && planoEn(pl, 0.5).pos.join() === '5,15,0' && planoEn(pl, 2).pos.join() === '10,20,0', 'la cámara va de desde a hasta');
ok(planoEn(pl, 0.7).mira.join() === '0,0,5', 'sin miraHasta mira siempre al mismo punto');
ok(planoEn({ desde: [1, 1, 1], mira: [0, 0, 0], duracion: 3 }, 0.5).pos.join() === '1,1,1', 'sin hasta la cámara queda quieta');
ok(siguientePlano(0, 3) === 1 && siguientePlano(2, 3) === 0 && siguientePlano(0, 1) === 0, 'orden seguido y en bucle');
for (const a of [0, 0.3, 0.6, 0.9999]) ok(siguientePlano(1, 3, 'azar', () => a) !== 1, 'al azar nunca repite el mismo plano');
ok(veloEn(0, 10, 1) === 1 && veloEn(0.5, 10, 1) === 0.5 && veloEn(5, 10, 1) === 0 && veloEn(10, 10, 1) === 1, 'el velo entra y sale con el fundido');
ok(veloEn(3, 10, 0) === 0, 'sin fundido no hay velo');
ok(main.includes('cerrarFondo()') && main.includes('presentacion.listo()'), 'main.js libera el fondo al entrar y avisa a la presentación');
for (const id of ['in-p-vista', 'in-p-logo', 'in-p-campos', 'in-p-paleta', 'in-f-campos', 'in-f-planos', 'in-f-agregar'])
    ok(estudioHtml.includes(`id="${id}"`), `estudio/index.html tiene #${id}`);
ok(validar({ version: 1, fondo: { planos: [{ desde: [0, 0], mira: [0, 0, 0], duracion: 5 }] } }, 'inicio').length > 0, 'el esquema rechaza un punto sin 3 números');
ok(validar({ version: 1, fondo: { orden: 'otro' } }, 'inicio').length > 0, 'el esquema rechaza un orden desconocido');

console.log('inicio OK');
