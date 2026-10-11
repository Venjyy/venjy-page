// Contenido del Artifact del PR 5a del Estudio (el juego lee escenas.json) para plantilla.mjs.
// Uso (desde la raíz del repo): CAPTURAS=mundo/capturas/estudio5a node .claude/artifacts/plantilla.mjs .claude/artifacts/contenido-estudio5a.mjs <salida.html>
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const E = JSON.parse(readFileSync('mundo/datos/escenas.json', 'utf8'));
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const tabla = (cab, f) => `<div class="tabla"><table><thead><tr>${cab.map(x => `<th>${x}</th>`).join('')}</tr></thead><tbody>${f}</tbody></table></div>`;
const fila = f => `<tr>${f.map(c => `<td>${c}</td>`).join('')}</tr>`;
const salida = (...a) => execFileSync('node', a, { encoding: 'utf8' });
const prueba = salida('mundo/tests/estudio-escenas.mjs').split('\n').filter(l => l.startsWith('escenas:'))[0];
const resumen = salida('estudio/cli.mjs', 'resumen', 'escenas').trim();
const validar = salida('estudio/cli.mjs', 'validar', 'escenas', 'indice').trim();

const filas = [];
for (const [clave, e] of Object.entries(E.escenas)) {
    filas.push({ g: 'escenas', celdas: [clave, 'general', `${e.tipo} · T ${e.T} s · r ${e.r} · nivel ${e.nivel}`] });
    for (const [q, tramos] of Object.entries(e.pista)) filas.push({ g: 'escenas', celdas: [clave, `pista ${q}`, tramos.map(([g, a, b]) => `<code>${g}</code> ${a}-${b}`).join(', ')] });
}
const FUNC = [
    ['<code>animacionDeDatos(def)</code>', 'Escena <code>amistad</code> del JSON → fila de <code>ANIMACIONES</code> (sin <code>tipo</code>, <code>camara</code> ni <code>nota</code>)'],
    ['<code>guionDeDatos(def, { durLinea, moldes })</code>', 'Escena <code>guion</code> → guion de ejecución; <code>d</code> que falta = <code>durLinea(texto)</code>; gestos = <code>MOLDES</code>'],
    ['<code>reglasEscenas(datos, nombres)</code>', 'Las reglas que el esquema no expresa: errores y avisos (las usa <code>validar</code> y la prueba)'],
    ['<code>jugarGuion(clave, persona)</code>', 'Juega una escena <code>guion</code>; sin persona, la más cercana al jugador'],
    ['<code>aplicarDatosVivos(datos)</code>', 'El puente del Estudio cambia los datos sin recargar (<code>escenas</code> en <code>DATOS_VIVOS</code>)'],
    ['<code>/amistad guion &lt;clave&gt; [persona]</code>', 'Comando de desarrollo; sin clave lista las escenas de guion']
];

export default {
    titulo: 'Estudio fase 5a',
    h1: 'Estudio · fase 5 · el juego lee escenas.json',
    estado: 'PR abierto, sin mergear. Sin cambios visibles para quien juega: con los datos de hoy el cuadro es idéntico al del código.',
    pr: { n: 64, url: 'https://github.com/Venjyy/venjy-page/pull/64' },
    meta: 'Rama <code>estudio-fase5a</code> · parte de <code>origin/main</code> (con #60 y #61) · 2026-10-11',
    hecho: [
        '<b>El juego lee <code>mundo/datos/escenas.json</code></b>: las escenas de tipo <code>amistad</code> reemplazan por clave a <code>ANIMACIONES</code> (una fila de actor del JSON reemplaza la fila entera). Sin archivo, roto o con <code>?sin-datos</code>, el código.',
        '<b>Escenas nuevas con guion</b> (<code>tipo: guion</code>): se juegan con <code>/amistad guion &lt;clave&gt; [persona]</code>. Nadie las dispara sola.',
        '<b>Aplicar en vivo</b>: <code>escenas</code> entra en <code>DATOS_VIVOS</code>; un golpe movido en el JSON se ve sin recargar.',
        '<b>CLI</b>: <code>resumen escenas</code> (una fila por escena, y por frase en las de guion) y <code>validar</code> con las reglas del §13 (errores y avisos).',
        '<b>Código nuevo</b> <code>mundo/datos/escenas.js</code>, puro y sin DOM: lo usan el juego, el CLI y la prueba (antes la prueba tenía una copia).'
    ],
    archivos: {
        nuevos: ['mundo/datos/escenas.js', 'mundo/capturas/estudio5a/', '.claude/artifacts/contenido-estudio5a.mjs'],
        cambiados: ['mundo/supervivencia/escena-amistad.js', 'mundo/supervivencia/comandos-dev.js', 'estudio/puente-protocolo.js', 'estudio/puente-juego.js', 'estudio/cli.mjs', 'mundo/datos/indice.json', 'mundo/tests/estudio-escenas.mjs', 'estudio/DISENO.md', 'mundo/PENDIENTES.md', 'mundo/supervivencia/MAPA.md', 'CLAUDE.md']
    },
    revisar: [
        '<b><code>escenas.json</code> no cambió</b>: solo <code>indice.json</code> (<code>lee</code> y la descripción de <code>escenas</code>). <code>validar --contra HEAD</code> lo marca; es lo pedido.',
        '<b>Las escenas <code>guion</code> no se disparan solas</b>: conectar una a un lugar o a un nivel lo decides tú, escena por escena.',
        '<b>Falla ajena</b>: <code>node mundo/tests/estudio-navegador.mjs</code> falla en <code>/tp</code> («el jugador no se movió») también en <code>main</code>; no es de esta parte.'
    ],
    decisiones: [
        ['El JSON se pide con <code>await cargarDatos(\'escenas\')</code> al importar el módulo.', 'escena-amistad.js ya se carga solo al usarlo: la carga inicial no cambia y no hay carrera con la primera escena.', false],
        ['Solo se fusionan las escenas de tipo <code>amistad</code>.', 'Una de guion con la clave de una animación no pisa a <code>ANIMACIONES</code>.', false],
        ['<code>reglasEscenas</code> recibe también <code>durLinea</code>.', 'Para el aviso de frase apurada y para el <code>d</code> que falta en una frase.', false],
        ['Los nombres de gestos del CLI salen de importar <code>moldes.js</code>.', 'La misma lista que usa el juego (con el <code>window</code> mínimo de las pruebas); el aviso de fetch de <code>posiciones.json</code> se silencia en el CLI.', false]
    ],
    secciones: [
        { h2: 'Qué agrega', html: tabla(['Pieza', 'Qué hace'], FUNC.map(fila).join('')) },
        { h2: 'Salida real del CLI', html: `<pre class="cli" style="margin:0;white-space:pre-wrap">${esc(resumen)}\n\n${esc(validar)}</pre>` }
    ],
    medidas: {
        cols: ['Sin <code>?estudio</code>', 'base', 'rama'],
        filas: [
            ['Archivos al abrir <code>supervivencia.html</code>', '104', '104'],
            ['KB al abrir', '2621,7', '2623,4'],
            ['Pedidos nuevos al abrir', '—', 'ninguno'],
            ['<code>escena-amistad.js</code> (al usar una escena)', '41 KB', '44 KB + <code>escenas.js</code> 5,7 KB + <code>escenas.json</code> 1 KB']
        ],
        como: 'Chromium headless shell con swiftshader (sin GPU), 960×540, menú de mundos, 3 corridas por lado; el +1,7 KB al abrir es <code>comandos-dev.js</code>. Las dos corridas con avisos «sin respuesta en 3 s» eran el primer arranque en frío del servidor, no de esta parte.'
    },
    pruebas: [
        `<code>node mundo/tests/estudio-escenas.mjs</code>: ${esc(prueba)}; 14 reglas con su caso inválido, fusión fila a fila, <code>guionDeDatos</code> con <code>durLinea</code> y el motor real (<code>jugar</code> con datos vivos y sin ellos, <code>jugarGuion</code> con y sin persona, clave inexistente, escena de tipo amistad).`,
        'Navegador: <code>punos</code> en <code>irA(1.45)</code> da la misma pose en los dos cuerpos con y sin <code>?sin-datos</code> (6 huesos por actor a 3 decimales; 4 corridas). Con <code>golpes: [3.0]</code> aplicado por el puente (<code>?estudio</code>) el golpe ya no suena en 1,5 s y sí en 3,05 s.',
        '<code>/amistad guion prueba hadad</code> (escena de prueba que no se commitea) la juega: tipo <code>guion</code>, T 4.',
        'Pasan todas las de <code>mundo/tests/</code> (<code>amistad.mjs</code>, <code>vida-amigos.mjs</code>, <code>estudio.mjs</code>, …) salvo <code>estudio-navegador.mjs</code> (falla igual en <code>main</code>). <code>validar</code>: OK 8 de 8 (con <code>--contra HEAD</code>, solo los dos cambios de <code>indice.json</code>).'
    ],
    capturas: [
        { h2: 'Capturas', dir: 'mundo/capturas/estudio5a', items: [
            ['punos-con-datos.jpg', 'Choque de puños (<code>punos</code>) en 1,45 s leyendo <code>escenas.json</code>.'],
            ['punos-sin-datos.jpg', 'La misma escena con <code>?sin-datos</code> (el código). Misma pose; cambia el fondo (nubes, animales).']
        ] }
    ],
    tabla: {
        h2: 'Escenas de escenas.json hoy', unidad: 'filas',
        intro: 'Salen de <code>mundo/datos/escenas.json</code> (piloto: <code>punos</code> y <code>pareja</code>). <code>abrazo</code> y <code>secreto</code> siguen en el código.',
        cols: ['Escena', 'Campo', 'Valor'],
        grupos: { escenas: 'Escenas' },
        filas
    }
};
