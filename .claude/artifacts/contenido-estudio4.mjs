// Contenido del Artifact de la fase 4 del Estudio para plantilla.mjs.
// Uso (desde la raíz del repo): CAPTURAS=mundo/capturas/estudio4 node .claude/artifacts/plantilla.mjs .claude/artifacts/contenido-estudio4.mjs <salida.html>
import { execFileSync } from 'node:child_process';
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const tabla = (cab, f) => `<div class="tabla"><table><thead><tr>${cab.map(x => `<th>${x}</th>`).join('')}</tr></thead><tbody>${f}</tbody></table></div>`;
const fila = f => `<tr>${f.map(c => `<td>${c}</td>`).join('')}</tr>`;
const cli = (...a) => execFileSync('node', ['estudio/cli.mjs', ...a], { encoding: 'utf8' }).trimEnd();

const MENSAJES = [
    ['elegir', 'Estudio → juego', "<code>{ objeto: 'persona' | 'nada', clave, modo: 'mover' | 'girar' }</code>; responde <code>elegido { clave, punto }</code>"],
    ['cambio', 'juego → Estudio', "<code>{ nombre: 'posiciones', ruta: 'personas.hadad', valor: punto }</code> al soltar el gizmo"],
    ['datos', 'Estudio → juego', '<code>posiciones</code> entra en los datos vivos: cada campo editado se ve al instante, sin guardar']
];
const filas = [];
for (const l of cli('resumen', 'posiciones').split('\n')) {
    const [clave, ...resto] = l.split(/\s{2,}/);
    filas.push({ g: 'personas', celdas: ['resumen posiciones', `<code>${esc(clave)}</code>`, esc(resto.join(' '))] });
}
for (const [t, d, c] of MENSAJES) filas.push({ g: 'mensajes', celdas: ['puente', `<code>${t}</code> · ${d}`, c] });

export default {
    titulo: 'Estudio fase 4',
    h1: 'Estudio · fase 4 · posiciones con gizmo',
    estado: 'PR #55 abierto sobre <code>main</code>: las 9 personas de <code>amigos.js</code> leen <code>mundo/datos/posiciones.json</code> y en <code>/estudio/</code> hay una pestaña <b>Posiciones</b> con un gizmo dentro del juego. Todas las pruebas pasan.',
    pr: { n: 55, url: 'https://github.com/Venjyy/venjy-page/pull/55' },
    meta: 'Rama <code>estudio-fase4</code> · 2026-10-10 · sobre <code>main</code> 50b5055 (con #50, #51 y #52)',
    hecho: [
        '<b>Datos</b>: <code>posiciones.json</code> (9 personas, relativas a su lugar) ya lo lee <code>amigos.js</code> en <code>nuevo()</code>; sin archivo, con error o con <code>?sin-datos</code>, valen los números del código. <code>indice.json</code> marca su <code>lee</code>.',
        '<b>Paridad exacta</b>: <code>mundo/datos/posiciones.js</code> reproduce, con <code>===</code>, las 9 expresiones de hoy (incluido el escenario girado y el naufragio). La prueba usa un mundo de decimales feos para que un orden distinto de sumas se note.',
        '<b>Gizmo</b>: <code>TransformControls</code> 0.186.1 en <code>vendor/three-addons/</code>, con licencia y <code>importmap</code> en <code>supervivencia.html</code>. Se baja solo con <code>?estudio</code> y al elegir a alguien. Va en el mismo grupo que la persona (el de la supervivencia está subido 48 bloques).',
        '<b>Editor</b>: pestaña Posiciones sobre el mismo iframe de Juego (sin recargar ni segundo mundo): persona, ancla, ejes, dx/dy/dz/giro, Mover / Girar, Deshacer, Guardar con <code>If-Match</code>, «Volver a lo guardado» por persona.',
        '<b>Al elegir a alguien</b>: el juego viaja junto a la persona, la mira, deja el puntero libre sin abrir la pausa y salta la escena de skin que arranque. «Quitar gizmo» devuelve todo como estaba.',
        '<b>CLI</b>: <code>resumen posiciones</code> y <code>validar</code> con referencias (persona en <code>PERSONAS</code>, ancla que el juego resuelve; aviso si se pone un giro a quien lo ignora).'
    ],
    archivos: {
        nuevos: ['mundo/datos/posiciones.js', 'estudio/gizmo-juego.js', 'estudio/posiciones.js', 'vendor/three-addons/TransformControls.js', 'vendor/three-addons/three.LICENSE', 'mundo/tests/estudio-posiciones.mjs', 'mundo/tests/estudio-posiciones-navegador.mjs', 'mundo/capturas/estudio4/'],
        cambiados: ['mundo/criaturas/amigos.js (sitioDe, aplicarPosiciones, calcularMiradas, amigos.posiciones)', 'mundo/datos/indice.json', 'supervivencia.html (importmap)', 'estudio/puente-protocolo.js', 'estudio/puente-juego.js', 'estudio/cli.mjs', 'estudio/index.html', 'estudio/estudio.js', 'estudio/estudio.css', 'estudio/DISENO.md (§12)', 'mundo/PENDIENTES.md', 'mundo/supervivencia/MAPA.md', 'CLAUDE.md', 'mundo/tests/estudio.mjs y estudio-textos.mjs (el ejemplo «no vivo» pasa a poses)']
    },
    revisar: [
        '<b>Moisés, Lalo y Lucho ignoran <code>giro</code></b>: el juego calcula hacia dónde miran (entre sí, y Lucho a Boris), así que el JSON solo mueve su lugar. El editor lo avisa.',
        '<b>Los Venjys de 7f-1 no están en <code>posiciones.json</code></b>: se colocan por lugar con candidatas y el piso lo busca el juego. Quedan para cuando haga falta (el esquema ya tiene <code>poi</code>).',
        '<b>Solo salen en el editor las personas que ya están en el JSON</b>. Para sumar una, agregar su clave con ancla, <code>dx</code> y <code>dz</code>.',
        '<b>Los puntos RUTA</b> (<code>spawn</code>, <code>casa</code>…) todavía no sirven de ancla: <code>validar</code> los rechaza y dice cuáles valen.',
        '<b>Sin probar</b>: el gizmo con el Estudio en otra pestaña o por <code>--lan</code>.'
    ],
    decisiones: [
        ['El mensaje <code>elegir</code> usa <code>objeto</code>, no <code>tipo</code>.', '<code>tipo</code> ya es el del sobre del mensaje.', false],
        ['Posiciones comparte la sección del juego en vez de tener su propio iframe.', 'Dos iframes serían dos mundos que guardan y se pisan; el gizmo se arrastra en el juego, así que el panel va a su lado.', false],
        ['Con el gizmo puesto el puntero queda libre y no se abre la pausa.', 'Arrastrar el gizmo es un clic: el juego lo recapturaría o mostraría «Haz clic para seguir jugando».', false],
        ['El marcador manda sobre <code>n.x/n.z</code> en cada cuadro.', 'Braulio camina y las escenas mueven a las personas; sin eso se escapan del gizmo.', false],
        ['Las escenas arrancadas se saltan con su propio <code>saltar()</code>, no con Esc.', 'Un Esc abría la pausa y tapaba el gizmo.', false],
        ['El giro sale con paso de 5° y se guarda con 1 decimal.', 'Los valores de hoy (90, 180, −90) siguen siendo exactos al editarlos.', false]
    ],
    secciones: [
        { h2: 'Mensajes nuevos del puente', html: `<p class="meta">El sobre es el de siempre: <code>{ de, tipo, id? }</code>; las respuestas repiten el <code>id</code>.</p>` + tabla(['Mensaje', 'Sentido', 'Contenido'], MENSAJES.map(([t, d, c]) => fila([`<code>${t}</code>`, d, c])).join('')) },
        { h2: 'Salida real de <code>resumen posiciones</code>', html: `<pre class="cli" style="margin:0;white-space:pre-wrap">${esc(cli('resumen', 'posiciones'))}</pre>` }
    ],
    medidas: {
        cols: ['Sin <code>?estudio</code>', 'base', 'rama'],
        filas: [
            ['Archivos al abrir <code>supervivencia.html</code>', '99', '101'],
            ['KB al abrir', '2560', '2568'],
            ['Archivos y KB hasta entrar al mundo', '138 · 5513', '140 · 5521'],
            ['Entrar a un mundo nuevo', '1,1 s', '1,2-1,3 s'],
            ['Cuadro mediano', '17-100 ms', '17-100 ms'],
            ['<code>TransformControls</code> descargado', 'no', 'no (solo con <code>?estudio</code>)']
        ],
        como: 'Chromium headless shell con swiftshader (sin GPU), 1280×720, mundo nuevo en Pacífico, 2 corridas por lado alternadas; el cuadro es ruidoso. Los +2 archivos son <code>posiciones.js</code> (3,8 KB) y <code>posiciones.json</code> (1,2 KB).'
    },
    pruebas: [
        '<code>node mundo/tests/estudio-posiciones.mjs</code> (nueva): paridad exacta con las 9 expresiones del código, ida y vuelta del gizmo (mover, girar, normalizar el giro, orden de claves, nota), anclas que faltan, mensaje <code>elegir</code> con sus errores y <code>validar</code> con persona y ancla inexistentes.',
        '<code>node mundo/tests/estudio-posiciones-navegador.mjs</code> (nueva): Chromium real; arrastra el eje del gizmo con el mouse, comprueba el cambio en el juego y en el editor, edita un campo, guarda, comprueba que solo cambió Hadad y restaura el archivo. 2 corridas seguidas limpias.',
        'Pasan también <code>estudio.mjs</code>, <code>estudio-textos.mjs</code>, <code>amistad.mjs</code> (las escenas usan <code>n.x/n.z</code> como sitio de vuelta), <code>vida-amigos.mjs</code>, <code>venjys.mjs</code>, <code>paridad.mjs</code>, <code>tienda.mjs</code>, <code>recetas.mjs</code>, <code>inventario.mjs</code>, <code>movimiento.mjs</code>, <code>retroceso.mjs</code>, <code>luz-incremental.mjs</code>, <code>guardado-copia.mjs</code>, <code>senal-qr.mjs</code> y <code>ping.mjs</code>.'
    ],
    capturas: [
        { h2: 'Capturas', dir: 'mundo/capturas/estudio4', items: [
            ['posiciones-gizmo.jpg', 'La pestaña Posiciones con Boris elegido: el gizmo está sobre él, con sus campos (ancla Atalaya, dx −0,5, dz 7,15, giro 180) a la derecha.']
        ] }
    ],
    tabla: {
        h2: 'Posiciones de hoy y mensajes', unidad: 'entradas',
        intro: 'Salida real de <code>node estudio/cli.mjs resumen posiciones</code> y los mensajes que suma el puente.',
        cols: ['Origen', 'Clave', 'Valores'],
        grupos: { personas: 'Personas', mensajes: 'Mensajes del puente' },
        filas
    }
};
