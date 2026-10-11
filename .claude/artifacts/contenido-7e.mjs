// Contenido del Artifact del bloque 7e (indicador de ms) para plantilla.mjs; los umbrales y las barras salen del código.
// Uso (desde la raíz del repo): node .claude/artifacts/plantilla.mjs .claude/artifacts/contenido-7e.mjs <salida.html>
import { pathToFileURL } from 'node:url';
const imp = p => import(pathToFileURL(`${process.cwd()}/${p}`).href);
const P = await imp('mundo/online/ping.js');
const tabla = (cab, f) => `<div class="tabla"><table><thead><tr>${cab.map((x, i) => `<th${i ? ' class="num"' : ''}>${x}</th>`).join('')}</tr></thead><tbody>${f}</tbody></table></div>`;
const color = ['verde', 'amarillo', 'rojo'];
const filasBarras = [20, 79, 80, 114, 115, 149, 150, 400].map(ms =>
    `<tr><td class="num">${ms} ms</td><td>${color[P.nivelDeMs(ms)]}</td><td class="num">${P.barrasDeMs(ms)} de 4</td></tr>`).join('');

export default {
    titulo: 'Ping de la sala 7e',
    h1: 'Bloque 7e · Indicador de ms',
    estado: 'PR abierto, sin mergear. Ping de cada jugador en la sala cooperativa con cero mensajes nuevos, barras de señal y reloj compartido con el anfitrión para 7g y 7h-3.',
    pr: { n: 51, url: 'https://github.com/Venjyy/venjy-page/pull/51' },
    meta: 'Rama <code>red-7e</code> · parte de <code>main</code> con #49 (7b-1) fusionado · 2026-10-10 · Sonnet',
    hecho: [
        '<b>Directo y sala local por QR</b>: <code>getStats()</code> del candidate-pair activo de cada par abierto, cada 2 s; mediana de las últimas 5 lecturas para que un pico no cambie el color.',
        '<b>Respaldo de Supabase</b>: eco a cuestas del mensaje <code>p</code> (campo <code>ec</code>; <code>e</code> ya es el nombre del evento). RTT = ahora − t − retenido, al estilo NTP: no importa que los relojes no coincidan. Solo viaja cuando hay respaldo.',
        '<b>Lista completa para todos</b>: el anfitrión reparte los pings de los invitados en el <code>h</code> que ya manda cada 10 s (<code>pg</code>); cada invitado mide el suyo.',
        '<b>Reloj compartido</b>: <code>coop.relojAnfitrion()</code> y <code>coop.desfaseAnfitrion</code> (mediana de 9 muestras de t + RTT/2 − ahora). Lo usarán 7g y 7h-3.',
        '<b>Barras de señal</b> en la lista de la pausa y en una lista nueva que aparece mientras se mantiene <b>Tab</b>; la fila del anfitrión no lleva barras (es el servidor).',
        '<b>Casilla «Mostrar mi ping (ms) en pantalla»</b> en la pausa: el HUD de la sala suma «· 34 ms» (el anfitrión ve «peor invitado: N ms»). Se guarda en <code>localStorage</code>; 7b-2 puede moverla a «Rendimiento».'
    ],
    archivos: {
        nuevos: ['mundo/online/ping.js', 'mundo/tests/ping.mjs', '.claude/artifacts/contenido-7e.mjs'],
        cambiados: ['mundo/online/red.js', 'mundo/supervivencia/coop.js', 'mundo/supervivencia/main.js', 'mundo/supervivencia/supervivencia.css', 'supervivencia.html', 'mundo/PENDIENTES.md', 'mundo/supervivencia/MAPA.md']
    },
    revisar: [
        '<b>Cuadro mediano antes/después</b>: no pude medirlo con <code>/medir romper</code> porque el panel del navegador no dibuja (sin <code>requestAnimationFrame</code>). El costo de la lógica nueva medido en Node es ≈ 0,7 µs por ciclo; en solitario no corre nada. Si quieres la medición real, córrela en tu navegador con la rama.',
        '<b>Estética de las barras y de la lista de Tab</b>: el DOM, los textos y los colores se verificaron, pero no pude verlas dibujadas. Mira que se lean bien sobre el juego.',
        '<b>Tab</b> abre la lista solo con el puntero capturado (jugando); en la consola Tab sigue completando comandos.',
        '<b>Wi-Fi y otra región</b>: la tabla de estimaciones sigue siendo estimación en esas columnas; hace falta un segundo equipo para medirlas.'
    ],
    decisiones: [
        ['El eco va en <code>ec</code> y no en <code>e</code>.', 'En el payload <code>e</code> es el nombre del evento (<code>p</code>, <code>b</code>…); usarlo habría roto el mensaje.', false],
        ['El anfitrión devuelve el eco solo a los invitados de respaldo y como lista de ids cortos.', 'Con canal directo el RTT sale de <code>getStats()</code>; así el <code>p</code> normal no engorda y en respaldo hay ≤ 3 invitados.', false],
        ['Los pings de los demás viajan en el <code>h</code> (cada 10 s), no en un mensaje nuevo.', 'El tope de Supabase cobra por mensaje; el ping cambia despacio y 10 s alcanza para una lista.', false],
        ['Lógica pura en <code>mundo/online/ping.js</code>.', 'Se prueba en Node con relojes falsos sin montar WebRTC ni el motor; <code>red.js</code> y <code>coop.js</code> solo la usan.', false],
        ['Casilla propia en la pausa en vez de esperar al menú «Rendimiento» (7b-2).', '7b-2 no existe aún; la casilla es una sola línea y se mueve después.', true]
    ],
    secciones: [
        { h2: 'Colores y barras', html: `<p class="meta">Verde &lt; ${P.LIMITE_VERDE} ms, amarillo &lt; ${P.LIMITE_AMARILLO} ms, rojo ≥ ${P.LIMITE_AMARILLO} ms.</p>` + tabla(['RTT', 'Color', 'Barras'], filasBarras) }
    ],
    medidas: {
        cols: ['Modo', 'Estimado', 'Medido'],
        filas: [
            ['WebRTC directo (misma red)', '3-15 ms', '!1-2 ms (misma máquina)'],
            ['Sala local por QR', '2-12 ms', '!0-1 ms (misma máquina)'],
            ['Respaldo Supabase (misma red)', '100-160 ms', '177 ms (invitado) · 187 ms (anfitrión)'],
            ['Desfase de reloj (dos pestañas)', '≤ RTT/2', '!0,1 ms de error']
        ],
        como: 'Dos pestañas del navegador del panel de Claude en el mismo equipo (<code>?disp=2</code>; <code>?directo=0</code> para el respaldo). Equipo en Chile, Supabase en São Paulo. El desfase se verificó contra el <code>timeOrigin</code> de cada pestaña. Las columnas «otra ciudad» y «otra región» de la tabla del plan quedan como estimación.'
    },
    pruebas: [
        '<code>node mundo/tests/ping.mjs</code>: 35 comprobaciones OK (colores y barras, getStats con transporte, Firefox y Map, eco con relojes de 48 000 y 1 200 ms de desfase y asimetría 70/50, eco para varios invitados, basura, suavizado, mediana del reloj contra un RTT disparado).',
        'Todas las demás de <code>mundo/tests/</code> pasan; <code>estudio-navegador.mjs</code> se omite (no hay Playwright instalado, ya era así).',
        'Dos pestañas en los tres modos: directo (1-2 ms), respaldo (177 y 187 ms) y sala local con QR pegado como texto (0-1 ms); barras <code>vvvv</code>, «Invi (tú)», «Anfi (tú · anfitrión)» y «peor invitado» verificados en el DOM.'
    ]
};
