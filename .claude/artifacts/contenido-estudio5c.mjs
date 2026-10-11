// Contenido del Artifact del PR 5c del Estudio (planos de cámara) para plantilla.mjs.
// Uso (desde la raíz del repo): CAPTURAS=mundo/capturas/estudio5c node .claude/artifacts/plantilla.mjs .claude/artifacts/contenido-estudio5c.mjs <salida.html>
import { execFileSync } from 'node:child_process';
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const salida = (...a) => execFileSync('node', a, { encoding: 'utf8' });
const prueba = salida('mundo/tests/estudio-escenas.mjs').split('\n').filter(l => l.startsWith('escenas:'))[0];
const tabla = (cab, f) => `<div class="tabla"><table><thead><tr>${cab.map(x => `<th>${x}</th>`).join('')}</tr></thead><tbody>${f}</tbody></table></div>`;
const fila = f => `<tr>${f.map(c => `<td>${c}</td>`).join('')}</tr>`;

const FAMILIAS = [
    ['<code>"amistad"</code> o lista propia', '1,8', '2,4', '0,7', 'sí'],
    ['<code>"grupo"</code>', '1,6', '2,0', '0,5', 'no'],
    ['<code>"grupo-techo"</code>', '1,0', '1,2', '0', 'no']
];

export default {
    titulo: 'Estudio fase 5c',
    h1: 'Estudio · fase 5 · planos de cámara',
    estado: 'PR abierto, sin mergear. Es solo del Estudio: quien juega no ve cambios.',
    pr: { n: 75, url: 'https://github.com/Venjyy/venjy-page/pull/75' },
    meta: 'Rama <code>estudio-fase5c</code> · parte de <code>origin/main</code> (con #71) · 2026-10-11',
    hecho: [
        '<b>Panel Cámara</b> en la pestaña Escenas: lista de planos con campos numéricos (nombre, ang, dist, alto, órbita, dolly), Agregar (hasta 8), Subir, Bajar y Quitar.',
        '<b>«Usar juego»</b>: amistad, grupo o grupo techo, con los números de siempre. Editar un plano lo copia a una lista propia; quitar el último borra <code>camara</code>.',
        '<b>Ver</b>: reproduce la escena con solo ese plano y, al terminar, el juego vuelve a los datos reales.',
        '<b>Motor</b>: <code>escena-amistad.js</code> usa <code>camara</code> si el guion la trae; sin ella queda exactamente igual que antes.',
        '<b>Constantes movidas</b> a <code>escena-amistad-datos.js</code> (mismos números) y <code>planosDe</code> / <code>opcionesCamara</code> en <code>mundo/datos/escenas.js</code>.'
    ],
    archivos: {
        nuevos: ['mundo/capturas/estudio5c/', '.claude/artifacts/contenido-estudio5c.mjs'],
        cambiados: ['mundo/supervivencia/escena-amistad-datos.js', 'mundo/supervivencia/escena-amistad.js', 'mundo/datos/escenas.js', 'estudio/escenas-modelo.mjs', 'estudio/escenas.js', 'estudio/index.html', 'estudio/estudio.css', 'estudio/cli.mjs', 'estudio/esquemas/escenas.schema.json', 'mundo/tests/estudio-escenas.mjs', 'mundo/tests/estudio-escenas-navegador.mjs', 'estudio/DISENO.md', 'mundo/PENDIENTES.md', 'mundo/supervivencia/MAPA.md', 'CLAUDE.md']
    },
    revisar: [
        '<b>El panel va en el lateral</b>, no como fila de la línea de tiempo: una lista de campos numéricos no cabe en una pista.',
        '<b>Con <code>camara</code> manda sobre el iglú</b>: bajo techo, una escena con cámara propia usa sus planos y no los de las escenas de skin.',
        '<b>Sin cortes por tiempo ni planos manuales</b>, como decía la decisión 6. <code>camaras.js</code> sigue saltando los planos tapados.'
    ],
    decisiones: [
        ['Editar un plano de un juego con nombre lo convierte en lista propia.', 'El juego con nombre es una referencia al código; los números no se pueden cambiar sin copiarlos.', true],
        ['Quitar el último plano borra <code>camara</code>.', 'Una lista vacía no cumple el esquema (mínimo 1) y así se vuelve a lo de siempre.', false],
        ['«Ver» no usa un mensaje nuevo del puente.', 'Manda datos temporales con ese plano y vuelve a mandar los reales al terminar.', false]
    ],
    secciones: [
        { h2: 'Distancias por familia', html: tabla(['<code>camara.planos</code>', 'minDist', 'evitarDist', 'holgura', 'sinTerceros'], FAMILIAS.map(fila).join('')) }
    ],
    medidas: {
        cols: ['Sin <code>?estudio</code>', 'base', 'rama'],
        filas: [
            ['Archivos al abrir <code>supervivencia.html</code>', '112', '112'],
            ['KB al abrir', '2669,5', '2669,5'],
            ['Pedidos nuevos', '—', 'ninguno']
        ],
        como: 'Chromium headless con swiftshader, 960×540, 12 s tras la carga; base = <code>origin/main</code>. Lo nuevo solo se carga con la primera escena de amistad.'
    },
    pruebas: [
        `<code>node mundo/tests/estudio-escenas.mjs</code>: ${esc(prueba)}; <code>planosDe</code> = constantes, lista propia, lo que llega a <code>iniciarCine</code> con y sin <code>camara</code>, y el modelo de cámara.`,
        '<code>node mundo/tests/estudio-escenas-navegador.mjs</code> (Playwright): usa el panel, «Ver» deja <code>camaras.planoNombre</code> en el plano elegido, vuelve a la lista y, sin cámara, a <code>PLANOS_AMISTAD</code>; el JSON vuelve a como estaba.',
        'Pasan todas las de <code>mundo/tests/</code>. <code>validar --contra HEAD</code>: OK 8 de 8 (<code>escenas.json</code> no cambió).'
    ],
    capturas: [
        { h2: 'Captura', dir: 'mundo/capturas/estudio5c', items: [
            ['camara.jpg', 'Pestaña Escenas con <code>punos</code> reproduciéndose con el plano propio «cenital» (botón Ver) y el panel Cámara con su lista.']
        ] }
    ]
};
