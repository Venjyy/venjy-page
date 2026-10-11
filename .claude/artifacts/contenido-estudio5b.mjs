// Contenido del Artifact del PR 5b del Estudio (pestaña Escenas) para plantilla.mjs.
// Uso (desde la raíz del repo): CAPTURAS=mundo/capturas/estudio5b node .claude/artifacts/plantilla.mjs .claude/artifacts/contenido-estudio5b.mjs <salida.html>
import { execFileSync } from 'node:child_process';
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const salida = (...a) => execFileSync('node', a, { encoding: 'utf8' });
const prueba = salida('mundo/tests/estudio-escenas.mjs').split('\n').filter(l => l.startsWith('escenas:'))[0];
const tabla = (cab, f) => `<div class="tabla"><table><thead><tr>${cab.map(x => `<th>${x}</th>`).join('')}</tr></thead><tbody>${f}</tbody></table></div>`;
const fila = f => `<tr>${f.map(c => `<td>${c}</td>`).join('')}</tr>`;

const MENSAJES = [
    ['<code>escena { accion: \'jugar\', clave, persona }</code>', 'Juega la escena (<code>jugarGuion</code> si es de guion; si no, <code>jugar(persona, clave)</code>); salta la que corra'],
    ['<code>escena { accion: \'pausa\', v }</code>', 'Pausa o sigue; el cabezal del editor se queda donde está'],
    ['<code>escena { accion: \'ir\', t }</code>', 'Salta la escena en curso a <code>t</code> segundos (clic en la regla)'],
    ['<code>escena { accion: \'parar\' }</code>', 'Termina la escena'],
    ['<code>escena { accion: \'puntero\', v }</code>', 'Suelta (o devuelve) el mouse del juego mientras el editor trabaja'],
    ['<code>escenaT { clave, persona, t, T, pausada }</code>', 'Del juego, 10 veces por segundo mientras corre una escena; uno final con <code>clave: null</code>']
];

export default {
    titulo: 'Estudio fase 5b',
    h1: 'Estudio · fase 5 · pestaña Escenas',
    estado: 'PR abierto, sin mergear. Es solo del Estudio: quien juega no ve cambios.',
    pr: { n: 70, url: 'https://github.com/Venjyy/venjy-page/pull/70' },
    meta: 'Rama <code>estudio-fase5b</code> · parte de <code>origin/main</code> (con #64 y #67) · 2026-10-11',
    hecho: [
        '<b>Línea de tiempo</b> en <code>/estudio/</code> → Escenas: una fila por actor con bloques de gesto que se arrastran y estiran (encajan a 0,05 s y se detienen contra el vecino y contra T), fila de frases y filas de golpes y corazones dibujados en canvas.',
        '<b>Reproducir, Pausa, Parar y clic en la regla</b> sobre el juego real; el cabezal sigue a la escena por <code>escenaT</code>.',
        '<b>Las 4 escenas</b>: las del JSON y abrazo y secreto «en código»; editar una la copia al JSON (solo añade una clave). «Nueva escena» crea una de guion con frases ES/EN.',
        '<b>Avisos en vivo</b> con <code>reglasEscenas</code> (gesto que no existe, frase apurada, texto sin revisar…). Guardar con <code>If-Match</code>; mover un tramo cambia una sola línea de <code>escenas.json</code>.',
        '<b>Mouse libre</b>: el juego capturaba el puntero y el editor no recibía clics. <code>estudio/puntero-libre.js</code> lo suelta, con cuenta; el gizmo de Posiciones usa el mismo módulo.'
    ],
    archivos: {
        nuevos: ['estudio/escenas-modelo.mjs', 'estudio/escenas.js', 'estudio/puntero-libre.js', 'mundo/tests/estudio-escenas-navegador.mjs', 'mundo/capturas/estudio5b/', '.claude/artifacts/contenido-estudio5b.mjs'],
        cambiados: ['estudio/index.html', 'estudio/estudio.js', 'estudio/estudio.css', 'estudio/puente-protocolo.js', 'estudio/puente-juego.js', 'estudio/gizmo-juego.js', 'mundo/datos/escenas.js', 'mundo/tests/estudio-escenas.mjs', 'estudio/DISENO.md', 'mundo/PENDIENTES.md', 'mundo/supervivencia/MAPA.md', 'CLAUDE.md']
    },
    revisar: [
        '<b>La lista de escenas va en el panel de la derecha</b>, no a la izquierda como decía el §13: la sección comparte el iframe del juego y la línea va debajo de él.',
        '<b>No se crean escenas de amistad nuevas</b>: el juego solo conoce las de <code>ANIMACIONES</code>. Las nuevas son de guion y no se disparan solas.',
        '<b>Arreglo en 5a</b>: <code>reglasEscenas</code> daba error con 4,4 + 4,2 &gt; 8,6 (coma flotante); ahora tolera 1e-9.'
    ],
    decisiones: [
        ['El mouse se suelta mientras la pestaña está abierta.', 'Sin eso el juego lo captura al abrir el mundo y al empezar una escena, y los clics del editor no llegan (lo mostró la prueba de navegador).', true],
        ['Una fila de pista vacía queda <code>[]</code> y no se borra la clave.', 'En una escena de amistad, sin la clave volvería la fila del código al fusionar.', false],
        ['Un arrastre parte siempre de la escena como estaba al hacer clic.', 'Los topes no se acumulan y el historial toma una sola foto por arrastre.', false],
        ['La selección cambia clases sin reconstruir la línea.', 'Si no, el doble clic cae sobre un elemento que ya no existe.', false]
    ],
    secciones: [
        { h2: 'Mensajes del puente', html: tabla(['Mensaje', 'Qué hace'], MENSAJES.map(fila).join('')) }
    ],
    medidas: {
        cols: ['Sin <code>?estudio</code>', 'base', 'rama'],
        filas: [
            ['Archivos al abrir <code>supervivencia.html</code>', '106', '106'],
            ['KB al abrir', '2633,5', '2633,5'],
            ['Pedidos nuevos', '—', 'ninguno']
        ],
        como: 'Chromium headless con swiftshader, 1280×720, hasta ver el menú de mundos + 3 s; base = el commit del que sale la rama. El código del editor solo se importa desde <code>/estudio/</code>.'
    },
    pruebas: [
        `<code>node mundo/tests/estudio-escenas.mjs</code>: ${esc(prueba)}; topes y encaje del modelo, 400 operaciones al azar que siempre cumplen esquema y reglas, copia desde el código, una línea cambiada en el archivo y el mensaje <code>escena</code>.`,
        '<code>node mundo/tests/estudio-escenas-navegador.mjs</code> (Playwright): arrastra y estira un bloque, topa en T, agrega y borra una marca, guarda (una línea), reproduce con Andy y ve avanzar <code>t</code>, pausa, salta con la regla a 1,45 s y para; el JSON vuelve a como estaba.',
        'Pasan todas las de <code>mundo/tests/</code>, incluidas <code>estudio-navegador</code> y <code>estudio-posiciones-navegador</code> (el gizmo con el módulo nuevo). <code>validar --contra HEAD</code>: OK 8 de 8.'
    ],
    capturas: [
        { h2: 'Captura', dir: 'mundo/capturas/estudio5b', items: [
            ['escenas.jpg', 'Pestaña Escenas con <code>punos</code> reproduciéndose con Andy: el cabezal verde sigue a la escena (1,45 s, el golpe).']
        ] }
    ]
};
