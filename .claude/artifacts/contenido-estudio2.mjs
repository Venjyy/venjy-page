// Contenido del Artifact de la fase 2 del Estudio para plantilla.mjs.
// Uso (desde la raíz del repo): node .claude/artifacts/plantilla.mjs .claude/artifacts/contenido-estudio2.mjs <salida.html>
import { execFileSync } from 'node:child_process';
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const tabla = (cab, f) => `<div class="tabla"><table><thead><tr>${cab.map(x => `<th>${x}</th>`).join('')}</tr></thead><tbody>${f}</tbody></table></div>`;
const fila = f => `<tr>${f.map(c => `<td>${c}</td>`).join('')}</tr>`;
const cli = (...a) => execFileSync('node', ['estudio/cli.mjs', ...a], { encoding: 'utf8' }).trimEnd();

const MENSAJES = [
    ['hola', 'Estudio → juego', 'listo { version, idioma } · o estado { fase: abriendo } si el mundo todavía carga'],
    ['datos { nombre, datos }', 'Estudio → juego', 'ok · error. Solo <code>ui-layout</code> y <code>textos</code>; repinta sin recargar'],
    ['tp { destino } · tp { x, y, z }', 'Estudio → juego', 'ok { pos } · error si no se movió (destino que no existe)'],
    ['estado { fase } · error { mensaje }', 'juego → Estudio', 'Sin id: el mundo abriéndose, listo o fallido'],
    ['cambio · elegir · escena · pausa · irA · pose', '—', 'Fases 4 a 6: el manejador contesta «mensaje desconocido»']
];
const PLAY = [
    ['1', 'Variable <code>PLAYWRIGHT</code> (carpeta del paquete)', 'Es lo que se usó aquí: <code>playwright-core</code> 1.62.1 que ya estaba en el equipo'],
    ['2', '<code>npm root -g</code> (<code>playwright</code> o <code>playwright-core</code>)', 'Para quien lo instale global'],
    ['3', 'Navegador: <code>PLAYWRIGHT_CHROMIUM</code> → el del paquete → caché <code>ms-playwright</code> (headless shell primero) → Chrome → Edge', 'El paquete pedía la revisión 1234 y en la caché hay la 1243: se usa la que hay']
];
const filas = [];
for (const l of cli('resumen').split('\n')) {
    const [nombre, ...resto] = l.split(/\s{2,}/);
    filas.push({ g: 'cli', celdas: ['cli resumen', `<code>${esc(nombre)}</code>`, esc(resto.join(' '))] });
}
for (const [m, s, r] of MENSAJES) filas.push({ g: 'puente', celdas: ['puente', `<code>${m}</code>`, `${s} · ${r}`] });

export default {
    titulo: 'Estudio fase 2',
    h1: 'Estudio · fase 2 · el juego dentro del Estudio, SSE y capturas por CLI',
    estado: 'PR abierto, sin mergear, esperando tu revisión. En <code>/estudio/</code> hay una pestaña <b>Juego</b>: el juego real en un iframe; lo que mueves en Layout se ve ahí al instante y puedes viajar con <code>/tp</code>.',
    pr: { n: 48, url: 'https://github.com/Venjyy/venjy-page/pull/48' },
    meta: 'Rama <code>estudio-fase2</code> · parte de <code>main</code> (7bbf88e, con #45, #46 y #47 fusionados) · 2026-10-10',
    hecho: [
        '<b>Puente</b> <code>supervivencia.html?estudio</code>: carga <code>estudio/puente-juego.js</code> con un <code>import()</code> de una línea (sin tocar <code>main.js</code>), abre o crea el mundo «Estudio» en Pacífico y habla por el canal <code>venjy-estudio</code>. <code>?estudio=tactil</code> fuerza los controles táctiles.',
        '<b>Pestaña Juego</b> en el Estudio: iframe, «Ir a» (lugar, persona o X Y Z, igual que <code>/tp</code>), «Aplicar los archivos guardados» y «Abrir en otra pestaña» (segundo monitor). Los cambios de Layout llegan al juego en cada movimiento, guardados o no.',
        '<b>Recarga en vivo por SSE</b>: <code>GET /api/eventos</code> avisa <code>cambio &lt;nombre&gt;</code> al guardar y cuando un archivo de <code>mundo/datos/</code> cambia en disco (un agente, VS Code). Sirve para el celular con <code>--lan</code>.',
        '<b>CLI <code>capturar</code></b>: <code>layout</code> (con choques, botones chicos y fuera de pantalla), <code>pose</code>, <code>gesto --hoja</code> y <code>escena --medir</code>. Levanta su propio servidor; no hace falta tener el 5510 abierto.',
        '<b>Playwright sin ruta fija</b>: <code>capturar.mjs</code>, <code>posar.mjs</code>, <code>planos.mjs</code> y <code>grabar.mjs</code> ya no importan de <code>/opt/node22/…</code>; usan <code>estudio/playwright.mjs</code>.'
    ],
    archivos: {
        nuevos: ['estudio/puente-protocolo.js', 'estudio/puente-juego.js', 'estudio/puente-cliente.js', 'estudio/juego.js', 'estudio/avisos-layout.js', 'estudio/evaluar.mjs', 'estudio/playwright.mjs', 'estudio/capturar.mjs', 'mundo/tests/estudio-navegador.mjs', 'mundo/capturas/estudio2/'],
        cambiados: ['supervivencia.html (3 líneas, solo actúan con ?estudio)', 'mundo/supervivencia/tactil-supervivencia.js (aplicarDatosVivos)', 'estudio/servidor.mjs', 'estudio/cli.mjs', 'estudio/index.html', 'estudio/estudio.js', 'estudio/layout.js', 'estudio/estudio.css', 'mundo/tests/estudio.mjs', 'mundo/datos/indice.json', 'CLAUDE.md', 'mundo/PENDIENTES.md', 'mundo/supervivencia/MAPA.md', 'estudio/DISENO.md', '.claude/skills/animaciones-minecraft (capturar, posar, planos, grabar, SKILL)']
    },
    revisar: [
        '<b>Los mismos 3 hallazgos de la fase 1 siguen sin decidir</b> (no se tocaron): en celular acostado el joystick tapa CAM, <code>/</code> y la misión; INV, SOLTAR, CAM, <code>/</code> y ACARICIAR miden 40 px de alto; el minimapa tapa ROMPER, USAR y ACARICIAR. Ahora <code>capturar layout acostado</code> los lista en una línea.',
        'Al viajar con el Estudio, una <b>escena de skin puede dispararse sola</b> al llegar junto a una persona (pasó con la introducción de Venjy). No las silencié: depende de lo que quieras en la fase 5.',
        'El mundo del Estudio se llama «Estudio»; si ya tienes 5 mundos y ninguno se llama así, el puente avisa y hay que crear uno a mano.'
    ],
    decisiones: [
        ['El puente no usa acceso directo al iframe: va por BroadcastChannel.', 'Funciona igual con el juego en otra pestaña o monitor, no mezcla dos Three.js y es el mismo protocolo que usará el CLI.', false],
        ['/tp se hace por la consola del juego, sin tocar <code>comandos-dev.js</code> ni <code>main.js</code>.', 'Se prende el modo devenjy, se manda <code>/tp</code> y se apaga en el acto; el panel de ayuda no queda en pantalla y no hay dos caminos de teletransporte.', false],
        ['Una sola lista de avisos de layout (<code>avisos-layout.js</code>).', 'El editor y el CLI dicen exactamente lo mismo de choques, botones chicos y fuera de pantalla.', false],
        ['El CLI levanta su propio servidor en un puerto libre.', 'No choca con el 5510 ni con el 5520 de otros chats y siempre sirve el árbol actual.', false],
        ['Navegador: la caché de Playwright antes que Chrome o Edge, y <code>--use-angle=swiftshader</code>.', 'Aquí no hay Chrome ni Edge; con Chromium 153 el argumento viejo hace fallar las capturas.', false],
        ['La prueba de navegador se omite sin Playwright.', 'Las pruebas de siempre siguen siendo solo Node; la de navegador suma cobertura donde se puede.', false]
    ],
    secciones: [
        { h2: 'Mensajes del puente', html: `<p class="meta">Todo mensaje lleva <code>de: estudio | juego</code>; las respuestas repiten el <code>id</code>. Espera máxima 15 s.</p>` + tabla(['Mensaje', 'Sentido', 'Respuesta'], MENSAJES.map(([a, b, c]) => fila([`<code>${a}</code>`, b, c])).join('')) },
        { h2: 'Cómo se consigue Playwright', html: tabla(['Orden', 'Dónde', 'Nota'], PLAY.map(fila).join('')) + '<p class="meta">En este equipo no se instaló nada: <code>PLAYWRIGHT=&lt;carpeta de playwright-core&gt;</code>. Sin eso, el CLI dice cómo arreglarlo y la prueba de navegador se omite.</p>' },
        { h2: 'Salida real de <code>capturar layout acostado</code>', html: `<pre class="cli" style="margin:0;white-space:pre-wrap">${esc('layout-cel-h.png  choques: joy×sv-camara, joy×sv-comando, joy×mision, sv-romper×minimapa, sv-usar×minimapa, sv-acariciar×minimapa  fuera: ninguno  chicos: sv-inventario(64×40), sv-soltar(64×40), sv-camara(64×40), sv-comando(64×40), sv-acariciar(96×40)')}</pre>` }
    ],
    medidas: {
        cols: ['Sin <code>?estudio</code>', 'main', 'rama'],
        filas: [
            ['Archivos al abrir <code>supervivencia.html</code>', '97', '97'],
            ['KB al abrir', '2509', '2510 (+1: HTML y aplicarDatosVivos)'],
            ['Archivos y KB hasta entrar al mundo', '133 · 5379-5380', '133 · 5379-5381'],
            ['Entrar a un mundo nuevo', '0,9-1,1 s', '0,9-1,1 s'],
            ['Cuadro mediano', '67-100 ms', '50-117 ms']
        ],
        como: 'Chromium headless shell 153 con swiftshader (sin GPU), 1280×720, mundo nuevo en Pacífico, 3 corridas por lado; el cuadro es ruidoso y no hay diferencia. Con <code>?estudio</code> bajan además <code>puente-juego.js</code> (4,9 KB) y <code>puente-protocolo.js</code> (3,3 KB) y queda un flujo SSE abierto.'
    },
    pruebas: [
        '<code>node mundo/tests/estudio.mjs</code>: lo de la fase 1 más el puente con un BroadcastChannel real (hola, datos, tp con destino y X Y Z, errores, junta de cambios, tiempo de espera), SSE (aviso al guardar, a editar en disco, sin repetir ni avisar por toques sin cambios), avisos de layout, resolución de Playwright y navegador con paquetes y cachés de mentira, y el CLI con errores claros.',
        '<code>node mundo/tests/estudio-navegador.mjs</code> con Chromium real: pestaña Juego, iframe táctil, <code>/tp</code> por nombre y X Z (queda el modo devenjy apagado), layout y textos por el puente sobre el botón real, SSE desde disco, botón «Aplicar»; sin errores de consola. Pasó 13 de 13 corridas seguidas (3 de 7 fallaron antes de subir el tiempo de espera del cliente de 8 a 15 s con la máquina cargada).',
        'Capturas reales con el CLI: layout, pose <code>sentadoSuelo</code> con skin Pony, hoja de 3 tiempos del gesto <code>habla</code> y la escena de Pony con <code>--medir</code>.',
        'Todas las pruebas de <code>mundo/tests/</code> pasan: recetas, inventario, amistad, paridad, tienda, movimiento, vida-amigos, retroceso, guardado-copia y señal QR.'
    ],
    capturas: [
        { h2: 'Capturas', dir: 'mundo/capturas/estudio2', items: [
            ['pestana-juego.jpg', 'La pestaña Juego: el juego en el iframe con controles táctiles, estado «Juego listo», viaje a X 300 Z 300 hecho y los archivos aplicados.'],
            ['capturar-layout.jpg', '<code>capturar layout acostado</code>: la vista táctil real con el layout guardado.'],
            ['capturar-gesto-hoja.jpg', '<code>capturar gesto habla --tiempos 0,0.4,0.8 --hoja</code>: tres tiempos, cada uno de frente, 3/4 y lado.'],
            ['capturar-escena.jpg', '<code>capturar escena pony --tiempos 0.5,2</code>: va junto a la persona, fuerza la escena y captura.']
        ] }
    ],
    tabla: {
        h2: 'CLI de hoy y mensajes del puente', unidad: 'entradas',
        intro: 'Salida real de <code>node estudio/cli.mjs resumen</code> y los mensajes del canal.',
        cols: ['Origen', 'Clave', 'Valores'],
        grupos: { cli: 'CLI resumen', puente: 'Puente' },
        filas
    }
};
