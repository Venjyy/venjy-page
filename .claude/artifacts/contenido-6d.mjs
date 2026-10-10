// Contenido del Artifact del bloque 6d etapa 1 para plantilla.mjs (los datos y frases salen del código).
// Uso (desde la raíz del repo): node .claude/artifacts/plantilla.mjs .claude/artifacts/contenido-6d.mjs <salida.html>
import { pathToFileURL } from 'node:url';
globalThis.window ??= { addEventListener() {} };
const imp = p => import(pathToFileURL(`${process.cwd()}/${p}`).href);
const D = await imp('mundo/supervivencia/vida-amigos-datos.js');
const V = await imp('mundo/supervivencia/vida-amigos.js');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const N = { hadad: 'Hadad', andy: 'Andy', nacho: 'Nacho', moises: 'Moisés', lalo: 'Lalo', ambos: 'Los dos' };
const LUG = { fogata: 'Fogata', iglu: 'Iglú' };
const G = D.guiones();
const BROMA = {
    informe: 'Andy le pregunta a Nacho por el informe; Hadad se rasca: ¿y el Pony? Risas al final.',
    discord: 'Andy imita a Nacho roncando en el Discord (gesto nuevo «ronca»); Nacho celebra con los brazos arriba.',
    papas: 'La foto de Hadad hecha con IA; pulgar arriba de Hadad (gesto nuevo «pulgar»).',
    baile: 'Andy baila dos veces; Nacho saca el celular para subirlo a los Tomatitos.',
    malvaviscos: 'Hadad trajo papas en vez de malvaviscos; Andy se rasca, Nacho asiente.',
    loza: 'A quién le toca la loza; se ríen los dos.',
    nevazon: 'Lalo recuerda la nevazón de Coyhaique; Moisés levanta los brazos: el mono más alto que el Venjy.',
    encendedor: 'Lalo se palpa los bolsillos (gesto nuevo «palpa»): lo tenía en la mano. Sorpresa y risa.',
    hermanos: 'Moisés se pone sentimental; los dos brazos arriba: «¡Yia de hermanos!».'
};
const filas = [], filasTxt = [];
for (const [l, lista] of Object.entries(G)) for (const g of lista) {
    filas.push(`<tr><td>${LUG[l]}</td><td>${esc(g.titulo.es)}</td><td class="num">${g.T.toFixed(1)} s</td><td class="num">${g.lineas.length}</td><td>${esc(BROMA[g.id])}</td><td><code>/amistad vida-${g.id}</code></td></tr>`);
    for (const x of g.lineas) filasTxt.push({ g: l, celdas: [`${LUG[l]} · ${esc(g.titulo.es)}`, N[x.q], esc(x.texto.es), esc(x.texto.en)] });
}
const tabla = (cab, f) => `<div class="tabla"><table><thead><tr>${cab.map(x => `<th>${x}</th>`).join('')}</tr></thead><tbody>${f}</tbody></table></div>`;
const reglas = [
    ['Detalle (gestos y globos)', `a menos de ${V.RADIO_DETALLE} bloques y con los amigos dibujándose`],
    ['Más lejos', `solo un reloj, 1 de cada ${V.CADA_LEJOS} cuadros; sin ganchos, sin texto en canvas, sin animación`],
    ['Te acercas a la mitad', 'se ve desde el segundo en que va (rampa de 0,4 s)'],
    ['A la vez con detalle', `máximo ${V.MAX_DETALLE}; el resto espera su turno`],
    ['Entre una y otra', `${V.ESPERA[0]}-${V.ESPERA[1]} s por lugar; nunca la misma dos veces seguidas`],
    ['Carga de los guiones', `<code>import()</code> la primera vez que pasas a menos de ${V.RADIO_CARGA} bloques`],
    ['Una escena (skin, amistad, «Hablar», minijuego, ronda)', 'corta la interacción de ese lugar; el pase del bong y el pito la hace esperar']
].map(([a, b]) => `<tr><td>${a}</td><td>${b}</td></tr>`).join('');

export default {
    titulo: 'Vida entre amigos 6d',
    h1: 'Bloque 6d · Vida entre amigos (etapa 1)',
    estado: 'PR abierto, sin mergear, esperando tu revisión. Hadad, Andy y Nacho en la fogata y Lalo y Moisés en el iglú charlan, bromean y gesticulan entre ellos sin ti.',
    pr: { n: 43, url: 'https://github.com/Venjyy/venjy-page/pull/43' },
    meta: 'Rama <code>amistad-6d</code> · parte de <code>main</code> con el 6c-2 fusionado (93af3f0) · 2026-10-10',
    hecho: [
        '9 interacciones (5 en la fogata, 4 en el iglú) con frases ES/EN nuevas, sacadas de tus notas de la tabla de relaciones. Van aparte de la charla de siempre (Fortnite y la del iglú siguen entre una y otra).',
        'Las reglas de «Rendimiento de la vida entre amigos»: detalle solo cerca, lejos solo un reloj, tope de 2 con turnos y guiones cargados con <code>import()</code>.',
        '3 gestos nuevos (Haiku): Andy imita los ronquidos de Nacho, Lalo se palpa los bolsillos, pulgar arriba de Hadad. El resto reutiliza gestos ya aprobados (risa, rasca, yo, tú, baile, celular, sorpresa, brazos arriba, recuerda).',
        'Tu pedido de esta sesión: <b>sin «Haz clic para seguir jugando» al terminar una escena</b>. El puntero queda capturado durante la escena (sin mirar ni usar las manos); si la abriste desde un panel, se recaptura con ese mismo clic. Esc la salta y los botones dicen «Saltar (Esc)». Los minijuegos y la ronda del iglú siguen con cursor.',
        'Tu revisión: nube con «Z» que sube al roncar; el bong baja al suelo cuando los brazos hacen otra cosa (¡YIAAAAAA! o una charla) en vez de quedar flotando; el pase del bong y el pito ya no sale volando hacia arriba (venía de antes: mezclaba las coordenadas del mundo con las del grupo de la supervivencia).',
        'Incluye la rama <code>estudio-fase0</code> (PR #44, diseño y contratos del Estudio, sin código): al aceptar este PR entran los dos.',
        '<code>/amistad vida-&lt;id&gt;</code> te lleva junto al lugar y empieza esa interacción (con <code>/gamemode devenjy</code>).'
    ],
    archivos: {
        nuevos: ['mundo/supervivencia/vida-amigos.js', 'mundo/supervivencia/vida-amigos-datos.js', 'mundo/tests/vida-amigos.mjs', 'mundo/capturas/6d/ (3 capturas)'],
        cambiados: ['mundo/criaturas/amigos.js', 'mundo/supervivencia/main.js', 'mundo/supervivencia/comandos-dev.js', 'mundo/jugador.js', 'mundo/supervivencia/minado.js', 'mundo/supervivencia/escenas-datos.js', 'mundo/supervivencia/escena-amistad-datos.js', 'mundo/DIALOGOS.md', 'mundo/PENDIENTES.md']
    },
    revisar: [
        'Los textos (tabla de abajo o <code>mundo/DIALOGOS.md</code>, sección «Vida entre amigos»).',
        'El gesto «palpa» (<code>/amistad vida-encendedor</code>) no se alcanzó a ver bien en capturas (el iglú es estrecho); el pase del bong y el pito y el ¡YIAAAAAA! con el bong, en el juego.',
        'El lag al romper y poner bloques quedó anotado como lo primero de 7b-1 (rendimiento del motor): es grande para este PR.',
        'El puntero en las escenas: que al terminar sigas jugando sin clic, y que Esc salte la escena (después de Esc sí puede pedir un clic: lo exige el navegador).',
        'El ritmo: una interacción cada 18-40 s por lugar.'
    ],
    decisiones: [
        ['Gancho propio <code>n.vida</code> en vez de <code>n.escena</code>.', 'Así «Hablar», las escenas de skin y los minijuegos siguen funcionando: si alguno toma a un amigo, la interacción se corta sola.', false],
        ['Sin cámara de cine: es vida de fondo y se ve con tu cámara.', 'Las escenas con cine son las que tú inicias; esto pasa mientras juegas.', false],
        ['Frases con la duración de siempre (2,3-3,6 s); interacciones de 11,6-18,7 s.', 'Tu regla: mejor largas y bien que apuradas.', true],
        ['En el cooperativo cada uno ve las suyas (no se sincroniza).', 'Es vida de fondo: no vale la pena el tráfico de red en esta etapa.', false],
        ['Haiku solo para los 3 gestos nuevos; el motor, los textos y la revisión, Opus.', 'Lo demás reutiliza gestos aprobados; los turnos y la cercanía eran la parte de criterio.', false],
        ['7j-0 (hora del mundo) no se hizo aquí.', 'Es otra cosa (HUD, reloj, horarios) y va con Sonnet en su propio chat, antes de la etapa 2.', false]
    ],
    secciones: [
        { h2: 'Las 9 interacciones', html: tabla(['Lugar', 'Interacción', 'Dura', 'Frases', 'Qué pasa', 'Para verla'], filas.join('')) },
        { h2: 'Reglas de rendimiento', html: tabla(['Situación', 'Qué hace'], reglas) }
    ],
    medidas: {
        cols: ['', 'sin interacción', 'con una en detalle'],
        filas: [
            ['Cuadro mediano (p90), de noche con 17 monstruos', '5,8 ms (7,6)', '6,1 ms (9,4)'],
            ['Referencia del plan', '6,9 ms con 16 monstruos de noche', ''],
            ['JS al abrir la página', '+13,7 KB (vida-amigos.js) y ~1 KB en otros', ''],
            ['Al acercarte la primera vez', '—', 'vida-amigos-datos.js 12,7 KB (+ comun, moldes y reencuentros si no estaban)']
        ],
        como: 'Chromium headless con SwiftShader, 854×480, archivos desde disco, junto a la fogata de noche, 3 tandas alternadas de 6 s. Headless limita a ~10 cuadros por segundo: «cuadro» es el trabajo del bucle, no el refresco.'
    },
    pruebas: [
        '<code>node mundo/tests/vida-amigos.mjs</code>: ~4800 comprobaciones OK (frases únicas contra todo el juego y sin emojis, rangos de <code>rig.md</code>, reloj lejos, tope y turnos, cortes y ganchos).',
        'Las demás de <code>mundo/tests/</code> (amistad, recetas, inventario, paridad, tienda, señal QR): OK.',
        'En el navegador: corre sin errores de página; capturas sueltas de la fogata.'
    ],
    capturas: [{ h2: 'Capturas de la fogata', dir: 'mundo/capturas/6d', items: [
        ['fogata-baile.jpg', 'El baile del calambre: Andy baila y Nacho gesticula sentado.'],
        ['fogata-papas.jpg', 'El embajador de las papas: Hadad con el pulgar adelante y su globo.'],
        ['fogata-discord.jpg', 'Dormido en el Discord: Andy imita los ronquidos y sube la nube con «Z».']
    ] }],
    tabla: {
        h2: 'Todas las frases', unidad: 'frases',
        intro: 'En el orden de cada interacción.',
        cols: ['Interacción', 'Habla', 'ES', 'EN'],
        grupos: LUG,
        filas: filasTxt
    }
};
