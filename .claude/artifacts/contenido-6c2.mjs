// Contenido del Artifact del bloque 6c-2 para plantilla.mjs (los datos y frases salen del código).
// Uso (desde la raíz del repo): CAPTURAS=<carpeta con las hojas> node .claude/artifacts/plantilla.mjs .claude/artifacts/contenido-6c2.mjs <salida.html>
import { pathToFileURL } from 'node:url';
globalThis.window ??= { addEventListener() {} };
const imp = p => import(pathToFileURL(`${process.cwd()}/${p}`).href);
const { NOMBRES_AMIGO: N } = await imp('mundo/supervivencia/misiones-datos.js');
const { GRUPOS } = await imp('mundo/supervivencia/amistad.js');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const DIR = process.env.CAPTURAS || 'mundo/capturas/6c/grupos';
const TIT = { tomatitos: 'Tomatitos (fogata)', atalaya: 'Trío de la atalaya', coyhaique: 'Los de Coyhaique (iglú)' };
const MOMENTO = {
    tomatitos: { venjy: 'pone un tomate gigante en la fogata', pony: 'salta para alcanzar los tomates; Andy baja el suyo', braulio: 'brinda con una concha y se la acerca al oído a Nacho (suena el mar)',
        conejeros: 'le dibuja la cara a su tomate: Tomás', hadad: 'espejo con su clon; Andy y Nacho miran de uno a otro', andy: 'baile en estéreo con su clon', nacho: 'risa en estéreo, doblados; Andy se tapa los oídos' },
    atalaya: { venjy: 'el de arriba es tu clon', boris: 'Boris NPC es tu clon (el que corta la leña)', lucho: 'Lucho NPC es tu clon; llamas al primo' },
    coyhaique: { venjy: 'solo con el botón: el de la mina es tu clon', lalo: 'Lalo NPC es tu clon: la bola te la tira a ti mismo', moises: 'Moisés NPC es tu clon' }
};
const nom = q => (q === 'j' ? 'Tú' : q === 'todos' ? 'Todos' : q === 'v' ? 'Venjy' : N[q] || q);
const filas = [], filasTxt = [], caps = [];
for (const [g, def] of Object.entries(GRUPOS)) {
    const m = await imp(`mundo/supervivencia/grupos/${g}.js`);
    for (const b of m.MIEMBROS) {
        const x = m.grupo(b);
        filas.push(`<tr><td>${TIT[g]}</td><td>${N[b]}</td><td class="num">${x.T.toFixed(1)} s</td><td class="num">${x.lineas.length}</td><td>${MOMENTO[g][b]}${(def.soloBoton || []).includes(b) ? ' (solo botón)' : ''}</td></tr>`);
        for (const l of x.lineas) filasTxt.push({ g, celdas: [`${TIT[g]} · ${N[b]}`, m.COMUN.some(([, t]) => t === l.texto) ? 'común' : 'tu skin', nom(l.q), esc(l.texto.es), esc(l.texto.en)] });
        caps.push([`${g}-${b}.jpg`, `${TIT[g]} con skin de ${N[b]}: seis momentos de la escena.`]);
    }
}
const tabla = (cab, f) => `<div class="tabla"><table><thead><tr>${cab.map(x => `<th>${x}</th>`).join('')}</tr></thead><tbody>${f}</tbody></table></div>`;

export default {
    titulo: 'Escenas de grupo 6c-2',
    h1: 'Bloque 6c-2 · Escenas de grupo',
    estado: 'PR abierto, sin mergear, esperando tu revisión. Los Tomatitos en la fogata, el trío de la atalaya y los de Coyhaique en el iglú, con un momento propio por integrante.',
    pr: { n: 42, url: 'https://github.com/Venjyy/venjy-page/pull/42' },
    meta: 'Rama <code>amistad-6c-grupos</code> · parte de <code>main</code> con el 6c-1 fusionado (cc03834) · 2026-10-10',
    hecho: [
        '3 grupos y 13 variantes (una por integrante), cargados con <code>import()</code> desde <code>grupos/</code>: llegada con tu momento propio, parte común del grupo y tu cierre.',
        'Tomatitos: suena el grupo de WhatsApp, Hadad reparte tomates con bigote elegante y brindan con chispas. Venjy pone un tomate gigante en la fogata.',
        'Atalaya: el Venjy de arriba grita desde el borde, salta la baranda (la cámara baja con él como grúa) y cae en tres puntos con nube de polvo. Ping de Lucho con sonido y rombo naranjo.',
        'Iglú: el Venjy de la mina entra por el túnel con el pico al hombro y se sacude la nieve; guerra de bolas de nieve hasta el sombrero de Lalo.',
        'Disparo: es la escena «uno por lugar» de la fogata, la atalaya y el iglú, antes que las de skin y los reencuentros. Con skin de Venjy el iglú sigue con su escena y Coyhaique queda en el botón. El clon que actuó da por vista su escena corta.',
        'Botón verde «Saludo del grupo» en «Hablar» para repetirla.',
        'Revisión tuya aplicada: frases con la duración de 6c-1 (escenas de 27-36 s), el pito y el bong se quedan, y Nacho ahora culpa a Hadad de los stickers.',
        '<code>/amistad grupos</code>, <code>/amistad tomatitos-braulio</code>, <code>/amistad atalaya-lucho</code>, <code>/amistad coyhaique-venjy</code> (con <code>/gamemode devenjy</code>).'
    ],
    archivos: {
        nuevos: ['mundo/supervivencia/grupos/ (comun, tomatitos, atalaya, coyhaique)', 'mundo/capturas/6c/grupos/ (13 hojas)'],
        cambiados: ['mundo/supervivencia/escena-amistad.js', 'mundo/supervivencia/camaras.js', 'mundo/supervivencia/escenas-skin.js', 'mundo/supervivencia/amistad.js', 'mundo/supervivencia/main.js', 'mundo/supervivencia/hablar.js', 'mundo/supervivencia/misiones.js', 'mundo/supervivencia/comandos-dev.js', 'mundo/supervivencia/escena-amistad-datos.js', 'mundo/supervivencia/supervivencia.css', 'mundo/tests/amistad.mjs', 'mundo/DIALOGOS.md', 'mundo/PENDIENTES.md', 'mundo/DISENO-6c.md (borrado)']
    },
    revisar: [
        'La frase nueva de Nacho: «Jajaja, fue el Hadad. Son todos de él con papas fritas.» (Hadad se rasca la cabeza).',
        'Las hojas de capturas son de antes de tu revisión: muestran frases más cortas y el iglú sin el pito ni el bong.',
        'La caída de la atalaya y la entrada por el túnel se juzgan mejor en movimiento (<code>/amistad atalaya-lucho</code>, <code>/amistad coyhaique-lalo</code>).',
        'En la fogata el plano «de lado» a veces queda detrás de la carpa.',
        'Tomás (el tomate de Conejeros) se ve chico en la mano izquierda.',
        'Falta la medida de la rama (se cortó Playwright a tu pedido).'
    ],
    decisiones: [
        ['Frases con la duración de 6c-1 (1,4 s + 0,03 s por letra, 2,3-3,6 s).', 'Decisión tuya: mejor escenas más largas (27-36 s) que frases apuradas, si se ven bien.', true],
        ['En grupo todos miran al centro (fogata, tocón, túnel) y la cabeza a quien habla; la cámara gira en torno al centro.', 'Con 4-5 personas, mirar solo al jugador dejaba a varios de espalda.', false],
        ['El iglú usa planos fijos (desde el muro norte y desde la boca del túnel) y se paran en media luna.', 'Con 4 personas en 5×6 bloques los planos que giran quedaban dentro de una cabeza. Aprobado: con planos fijos, animaciones más elaboradas.', true],
        ['El Venjy de la atalaya aterriza al norte del tocón, frente a todos.', 'En la primera prueba caía detrás de Lucho y no se veía.', false],
        ['El pito y el bong del iglú se quedan.', 'Decisión tuya: la supervivencia es un proyecto personal; lo profesional es el modo creativo.', true],
        ['Lo hizo el orquestador (Opus) sin subagentes.', 'La parte delicada era el motor, la cámara y la puesta en escena con 4-5 personas; los gestos nuevos son pocos y simples.', false]
    ],
    secciones: [
        { h2: 'Las 13 variantes', html: tabla(['Grupo', 'Tu skin', 'Dura', 'Frases', 'Momento propio'], filas.join('')) }
    ],
    medidas: {
        cols: ['', 'main', 'rama amistad-6c-grupos'],
        filas: [
            ['JS al abrir la página', '88 archivos, 2199 KB', '88 archivos, ~2208 KB (+9 KB, por tamaño)'],
            ['Carga de la página (load)', '2332 ms', 'pendiente'],
            ['Entrar a un mundo nuevo', '615 ms', 'pendiente'],
            ['Cuadro mediano (p90)', '4,2 ms (5,8)', 'pendiente'],
            ['Al empezar una escena de grupo', '—', 'grupos/comun.js 9,5 KB + grupos/<grupo>.js 10-15 KB (+ motor 40,5 KB si no estaba)'],
            ['Cuadro durante una escena de grupo', '—', 'pendiente']
        ],
        como: 'Chromium headless con SwiftShader, 1280×720, archivos desde disco sin caché, junto a la fogata de día, mundo nuevo. La medida de la rama quedó pendiente: se cortó Playwright a pedido del dueño.'
    },
    pruebas: [
        '<code>node mundo/tests/amistad.mjs</code>: 97359 comprobaciones OK. Nuevas: 3 grupos con 13 variantes, actores solo del grupo, parte común completa, frases dentro de la escena y sin pisarse, rangos de <code>rig.md</code>, disparo (sola, solo botón, clon visto, grupo antes del reencuentro), y el motor real en Node: al saltar a la mitad y al terminar, todos vuelven a su sitio y la cámara manual se suelta.',
        'Las demás de <code>mundo/tests/</code> (recetas, inventario, paridad, tienda, señal QR): OK.',
        'En el navegador: las 13 variantes corren sin errores de página y al saltar todos vuelven a su sitio (antes de cortar Playwright).'
    ],
    capturas: [{ h2: 'Hojas de las 13 variantes', dir: DIR, items: caps }],
    tabla: {
        h2: 'Todas las frases de los grupos', unidad: 'frases',
        intro: 'En el orden de cada escena. «común» es la parte del grupo; «tu skin», la llegada, el momento y el cierre de esa variante.',
        cols: ['Escena', 'Parte', 'Habla', 'ES', 'EN'],
        grupos: Object.fromEntries(Object.keys(GRUPOS).map(g => [g, TIT[g]])),
        filas: filasTxt
    }
};
