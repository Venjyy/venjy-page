// Contenido del Artifact de la fase 3 del Estudio para plantilla.mjs.
// Uso (desde la raíz del repo): node .claude/artifacts/plantilla.mjs .claude/artifacts/contenido-estudio3.mjs <salida.html>
import { execFileSync } from 'node:child_process';
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const tabla = (cab, f) => `<div class="tabla"><table><thead><tr>${cab.map(x => `<th>${x}</th>`).join('')}</tr></thead><tbody>${f}</tbody></table></div>`;
const fila = f => `<tr>${f.map(c => `<td>${c}</td>`).join('')}</tr>`;
const cli = (...a) => execFileSync('node', ['estudio/cli.mjs', ...a], { encoding: 'utf8' }).trimEnd();

const AVISOS = [
    ['par', 'error', 'Falta el texto en ES o en EN'],
    ['emoji', 'error', 'Un emoji en un texto (los íconos se dibujan, no se escriben)'],
    ['glifo', 'error', 'Un carácter que PixelCraft no tiene (U+XXXX); se lee de <code>estudio/glifos.json</code>'],
    ['plantilla', 'error', '<code>{n}</code> en un idioma y no en el otro'],
    ['largo', 'error / aviso', 'Más de su <code>max</code> (error) o más de 140 caracteres sin <code>max</code> (aviso; hoy el más largo mide 132)']
];
const filas = [];
for (const l of cli('resumen').split('\n')) {
    const [nombre, ...resto] = l.split(/\s{2,}/);
    filas.push({ g: 'cli', celdas: ['cli resumen', `<code>${esc(nombre)}</code>`, esc(resto.join(' '))] });
}
for (const l of cli('resumen', 'dialogos', 'pony.q').split('\n')) {
    const [clave, ...resto] = l.split(/\s{2,}/);
    filas.push({ g: 'dialogos', celdas: ['resumen dialogos pony.q', `<code>${esc(clave)}</code>`, esc(resto.join(' '))] });
}
for (const [t, n, d] of AVISOS) filas.push({ g: 'avisos', celdas: ['avisos de texto', `<code>${t}</code> · ${n}`, d] });

export default {
    titulo: 'Estudio fase 3',
    h1: 'Estudio · fase 3 · textos y diálogos ES/EN',
    estado: 'PR #52 fusionado en <code>main</code>, con #50 (7f-1) y #51 (7e) ya dentro: todas las pruebas pasan sobre el resultado. Los diálogos de «Hablar» ya viven en <code>mundo/datos/dialogos.json</code> y en <code>/estudio/</code> hay una pestaña <b>Textos</b> para editarlos y marcarlos como revisados.',
    pr: { n: 52, url: 'https://github.com/Venjyy/venjy-page/pull/52' },
    meta: 'Rama <code>estudio-fase3</code> · fusionada el 2026-10-11 · partió de <code>main</code> 793f9b6; se le fusionaron #49, #50 y #51 antes de entrar',
    hecho: [
        '<b>Datos</b>: <code>mundo/datos/dialogos.json</code> con su esquema: 13 personas, 93 temas, 53 variantes de skin, 74 opiniones, saludos y regalos (341 pares ES/EN). La migración no cambió ninguna palabra: <code>deepEqual</code> contra el módulo anterior da <b>diferencia 0</b>.',
        '<b>Fachada</b>: <code>dialogos-datos.js</code> exporta lo mismo de siempre y lee el JSON. Se sigue cargando con el <code>import()</code> dinámico de «Hablar»: al abrir la página y al entrar al mundo no baja nada nuevo.',
        '<b>Editor de textos</b>: tabla filtrable por persona, tipo, búsqueda, «solo sin revisar» y «solo con avisos»; ES y EN lado a lado; marca <b>revisado</b> (la pones tú); largo; Guardar, Descargar, Deshacer y Ctrl+S. «Ver globo» lleva al juego junto a la persona y muestra el texto en su globo real.',
        '<b>Avisos</b> en el editor y en <code>validar</code>: emoji, glifos que PixelCraft no tiene (leídos del <code>cmap</code> de la fuente), par incompleto, <code>{n}</code> en un solo idioma y largo.',
        '<b>CLI</b>: <code>resumen dialogos</code> (con saludos y regalos), <code>resumen dialogos --md --escribir</code> regenera las tablas de <code>mundo/DIALOGOS.md</code> (reproduce las 248 filas de antes y suma la columna Revisado) y <code>glifos</code>.',
        '<b>Tienda</b>: <code>tienda.schema.json</code> para ofertas nuevas por nombre de objeto (como <code>/dar</code>); <code>validar</code> comprueba que el nombre exista. Aún no lo lee el juego.',
        '<b>En vivo</b>: <code>dialogos</code> entra a los datos vivos; con <code>?estudio</code> un texto editado o guardado se aplica sin recargar (se ve al reabrir «Hablar»).'
    ],
    archivos: {
        nuevos: ['mundo/datos/dialogos.json', 'mundo/datos/tienda.json', 'estudio/esquemas/dialogos.schema.json', 'estudio/esquemas/tienda.schema.json', 'estudio/textos.js', 'estudio/avisos-textos.js', 'estudio/glifos.mjs', 'estudio/glifos.json', 'estudio/dialogos-md.mjs', 'mundo/tests/estudio-textos.mjs', 'mundo/capturas/estudio3/'],
        cambiados: ['mundo/supervivencia/dialogos-datos.js (ahora fachada)', 'mundo/supervivencia/misiones.js (1 línea: decir)', 'mundo/DIALOGOS.md (regenerado)', 'estudio/cli.mjs', 'estudio/fuentes.mjs', 'estudio/puente-protocolo.js', 'estudio/puente-juego.js', 'estudio/juego.js', 'estudio/layout.js (Ctrl+Z solo en su pestaña)', 'estudio/index.html', 'estudio/estudio.js', 'estudio/estudio.css', 'mundo/tests/estudio.mjs', 'mundo/datos/indice.json', 'CLAUDE.md', 'mundo/PENDIENTES.md', 'mundo/supervivencia/MAPA.md', 'estudio/DISENO.md (§11)']
    },
    revisar: [
        '<b>Los 341 textos están sin revisar</b>: no marqué ninguno. Entra a <code>/estudio/</code> → Textos, filtra por persona y marca; «Marcar visibles como revisados» sirve para aprobar una persona entera.',
        '<b>«Hablar» baja 19 KB más</b> (3 archivos y 91 KB contra 2 y 72 KB): el JSON con el formato estable ocupa varias líneas por par. Solo pasa al abrir «Hablar»; GitHub Pages lo comprime.',
        '<b>Un texto editado se ve al reabrir el panel</b>, no mientras está abierto. Es deliberado: el panel dibuja una vez.',
        '<b>Los textos de los Venjy de la supervivencia</b> (#50, <code>venjys-datos.js</code>) siguen en JS: todavía no están en <code>dialogos.json</code> ni en la pestaña Textos.',
        '<code>estudio-navegador.mjs</code> falla en <code>/tp spawn</code> (el jugador ya está en spawn) también en <code>main</code>; no es de esta fase, pero conviene arreglarlo.'
    ],
    decisiones: [
        ['La fachada usa <code>fetch</code> (y <code>fs</code> en Node), no <code>import … with { type: \'json\' }</code>.', 'Los import de JSON piden Chrome 123, Safari 17.2 o Firefox 138; un navegador más viejo rompería «Hablar» con un error de sintaxis.', false],
        ['Aquí el JSON es la fuente: sin «código por defecto» ni <code>?sin-datos</code>.', 'Mantener dos copias de los 341 textos solo sirve para que diverjan.', false],
        ['<code>revisado</code> vive dentro de cada par ES/EN.', 'Es la unidad que aprueba el dueño y viaja con el texto al guardar; el juego la ignora.', false],
        ['El globo de vista previa usa el globo especial de <code>misiones.js</code> (<code>decir</code>).', 'Es el mismo que ve el jugador; no se duplica código de globos. Cuesta una línea en el juego.', false],
        ['El largo suave es 140 caracteres.', 'El texto más largo de hoy mide 132; un <code>max</code> propio de un texto lo vuelve error.', false],
        ['<code>DIALOGOS.md</code> se reescribe solo en las secciones de personas.', 'Saludos de amistad, momentos, bienvenidas y grupos salen de otros archivos y no se tocan.', false],
        ['<code>tienda.json</code> queda vacío y con <code>lee: null</code>.', 'Conectarlo antes de que exista una oferta nueva sumaría una descarga sin usarla.', false]
    ],
    secciones: [
        { h2: 'Avisos de texto', html: `<p class="meta">Se aplican a todo par <code>{ es, en }</code> de cualquier JSON de <code>mundo/datos/</code>.</p>` + tabla(['Tipo', 'Nivel', 'Cuándo'], AVISOS.map(fila).join('')) },
        { h2: 'Salida real de <code>resumen dialogos pony.q</code>', html: `<pre class="cli" style="margin:0;white-space:pre-wrap">${esc(cli('resumen', 'dialogos', 'pony.q'))}</pre>` }
    ],
    medidas: {
        cols: ['Sin <code>?estudio</code>', 'main', 'rama'],
        filas: [
            ['Archivos al abrir <code>supervivencia.html</code>', '97', '97'],
            ['KB al abrir', '2510', '2510'],
            ['Archivos y KB hasta entrar al mundo', '133 · 5381', '133 · 5381'],
            ['Entrar a un mundo nuevo', '0,75-1,25 s', '0,85-0,9 s'],
            ['Cuadro mediano', '67-117 ms', '83-117 ms'],
            ['Al abrir «Hablar»', '2 archivos · 72 KB', '3 archivos · 91 KB']
        ],
        como: 'Chromium headless shell con swiftshader (sin GPU), 1280×720, mundo nuevo en Pacífico, 3 corridas por lado alternadas; el cuadro es ruidoso y no hay diferencia. «Hablar» se abre con <code>misiones.conversar(\'pony\')</code>: antes <code>dialogos-datos.js</code> de 53 KB; ahora la fachada (3 KB) y <code>dialogos.json</code> (69 KB).'
    },
    pruebas: [
        '<code>node mundo/tests/estudio-textos.mjs</code> (nueva): el JSON contra su esquema (con 9 casos que debe rechazar), la fachada contra el JSON y contra el módulo anterior, <code>aplicarDatosVivos</code>, avisos (emoji, glifo, par, plantilla, largo), <code>glifos.json</code> al día con la fuente, <code>DIALOGOS.md</code> al día, mensajes <code>datos</code> y <code>globo</code> del puente y <code>tienda.json</code> (con nombres que existen y que no).',
        'Editor probado en un Chromium real: tabla de 341 filas, edición con emoji y <code>{n}</code> sin par (avisos y Guardar deshabilitado), Deshacer, y vista con 0 errores de consola.',
        'Pasan también <code>estudio.mjs</code>, <code>amistad.mjs</code>, <code>tienda.mjs</code>, <code>recetas.mjs</code>, <code>inventario.mjs</code>, <code>paridad.mjs</code>, <code>vida-amigos.mjs</code> y <code>luz-incremental.mjs</code>.'
    ],
    capturas: [
        { h2: 'Capturas', dir: 'mundo/capturas/estudio3', items: [
            ['pestana-textos.jpg', 'La pestaña Textos filtrada en Pony. La fila de <code>pony.quien.r</code> tiene un emoji y un <code>{n}</code> de muestra (solo en pantalla, no se guardó): borde rojo y avisos en la fila y en el panel.']
        ] }
    ],
    tabla: {
        h2: 'CLI de hoy y avisos', unidad: 'entradas',
        intro: 'Salida real de <code>node estudio/cli.mjs resumen</code>, de <code>resumen dialogos pony.q</code> y los avisos de texto.',
        cols: ['Origen', 'Clave', 'Valores'],
        grupos: { cli: 'CLI resumen', dialogos: 'Diálogos de Pony', avisos: 'Avisos' },
        filas
    }
};
