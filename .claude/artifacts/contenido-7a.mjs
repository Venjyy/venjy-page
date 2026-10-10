// Contenido del Artifact del bloque 7a (arreglos rápidos) para plantilla.mjs; los valores salen del código.
// Uso (desde la raíz del repo): node .claude/artifacts/plantilla.mjs .claude/artifacts/contenido-7a.mjs <salida.html>
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
globalThis.window ??= { addEventListener() {} };
globalThis.document ??= { addEventListener() {}, createElement() { return { getContext() { return {}; } }; } };
const imp = p => import(pathToFileURL(`${process.cwd()}/${p}`).href);
const { RETROCESO } = await imp('mundo/supervivencia/enemigos.js');
const main = readFileSync('mundo/supervivencia/main.js', 'utf8');
const v = n => main.match(new RegExp(`jugador\\.${n}\\s*=\\s*([0-9.]+)`))[1].replace('.', ',');
const filasVel = [
    ['Caminar', '4,3', v('vCaminar'), '4,32'],
    ['Correr', '6,1', v('vCorrer'), '5,61'],
    ['Salto corriendo (tope)', '7,6', v('topeSalto'), '≈ 7,1'],
    ['Impulso por salto', '1,6', v('impulsoSalto'), '—'],
    ['Sobre camino de tierra', '—', '×' + v('bonoCamino'), '—']
].map(f => `<tr><td>${f[0]}</td><td class="num">${f[1]}</td><td class="num">${f[2]}</td><td class="num">${f[3]}</td></tr>`).join('');
const tabla = (cab, f) => `<div class="tabla"><table><thead><tr>${cab.map((x, i) => `<th${i ? ' class="num"' : ''}>${x}</th>`).join('')}</tr></thead><tbody>${f}</tbody></table></div>`;
const filasRet = [
    ['Ventana sin perseguir', '—', '0,4 s', RETROCESO.tiempo.toString().replace('.', ',') + ' s'],
    ['Factor del empuje', '×12', '×14', '×' + RETROCESO.factor],
    ['Salto al golpear (m/s)', '5,5', '6', String(RETROCESO.salto)],
    ['Retroceso normal (bloques)', '1,05', '1,8', '!2,25'],
    ['Retroceso corriendo (bloques)', '—', '3,4', '!4,3']
].map(f => `<tr><td>${f[0]}</td><td class="num">${f[1]}</td><td class="num">${f[2]}</td><td class="num">${f[3].replace(/^!/, '')}</td></tr>`).join('');

export default {
    titulo: 'Arreglos rápidos 7a',
    h1: 'Bloque 7a · Arreglos rápidos',
    estado: 'PR abierto, sin mergear. Cinco arreglos de la supervivencia: salir del agua, knockback, X de cerrar, velocidad y guardar la copia del cooperativo con 5 mundos.',
    pr: { n: 0, url: 'https://github.com/Venjyy/venjy-page/pulls' },
    meta: 'Rama <code>arreglos-7a</code> · parte de <code>main</code> con #43 y #44 fusionados · 2026-10-10 · Sonnet',
    hecho: [
        '<b>9 · Agua</b>: nadando contra una orilla a ras, con Espacio y avanzando, el impulso es de 7 m/s (lava 5). Sale de la orilla a ras; una pared de 2 bloques no se sube.',
        '<b>10 · Knockback</b>: los monstruos no persiguen durante 0,5 s tras un golpe y el roce baja; retroceso medido ≈ 2,25 bloques normal y 4,3 corriendo (antes ≈ 1).',
        '<b>11 · X de cerrar</b>: dibujada en píxeles (7×7 con sombra) y centrada con grid; ya no depende del glifo de la fuente.',
        '<b>14 · Velocidad</b>: caminar 4,6, correr 7,0, tope de salto 8,6 y +15 % sobre camino de tierra. El creativo no cambia.',
        '<b>26 · Copia con 5 mundos</b>: panel «Tus mundos están llenos» con reemplazar (confirmación con el nombre), descargar antes, descargar la copia como archivo y «Seguir jugando esta copia». Primero escribe, después borra; nunca ofrece el mundo abierto.'
    ],
    archivos: {
        nuevos: ['mundo/tests/movimiento.mjs', 'mundo/tests/retroceso.mjs', 'mundo/tests/guardado-copia.mjs', 'mundo/capturas/7a/ (1 captura)'],
        cambiados: ['mundo/jugador.js', 'mundo/supervivencia/enemigos.js', 'mundo/supervivencia/guardado.js', 'mundo/supervivencia/main.js', 'mundo/supervivencia/ui-inventario.js', 'mundo/supervivencia/supervivencia.css', 'supervivencia.html', 'mundo/PENDIENTES.md', 'mundo/supervivencia/MAPA.md']
    },
    revisar: [
        '<b>Orilla de 1 bloque sobre el agua</b>: con el impulso 7 del plan no se sube nadando (los pies solo llegan a +0,27 sobre una orilla a ras). Si en el mapa hay orillas así, con ≈ 10 m/s pasan sin alcanzar paredes de 2. Dime si lo subo.',
        'El knockback quedó con 0,5 s y ×16 en vez de 0,4 s y ×14: con los valores del plan la prueba daba 1,8 y 3,4 bloques, fuera de la meta (2,5 y 4 ± 0,5).',
        'Jugar con dos pestañas (<code>?disp=2</code>): invitado con 5 mundos que pierde al anfitrión y el flujo reemplazar → «Seguir jugando esta copia». La lógica tiene prueba; la pantalla se vio con datos de ejemplo.',
        'Sentir las velocidades nuevas en el mapa grande (correr por camino, saltar corriendo).'
    ],
    decisiones: [
        ['Las velocidades se leen de <code>main.js</code> en la prueba.', 'Si alguien cambia el valor, la prueba lo sigue y verifica que el creativo siga en 4,3 / 5,6.', false],
        ['Retroceso: funciones puras exportadas (<code>empujar</code>, <code>suavizarVelocidad</code>).', 'Así la prueba usa el mismo código que el juego sin montar todo el motor.', false],
        ['Los jefes no se tocaron.', 'Ya tienen su propio empuje fijo de 2 m/s en <code>jefes.js</code>, no el de los monstruos comunes.', false],
        ['Con espacio, guardar la copia es igual que antes.', 'El panel y «Seguir jugando» solo aparecen cuando los 5 mundos están llenos.', false],
        ['«Seguir jugando» sale de la sala y recarga la página.', 'Es la forma más simple y segura de cortar la conexión; el mundo nuevo se abre con <code>sessionStorage</code>.', true]
    ],
    secciones: [
        { h2: 'Velocidades de la supervivencia (m/s)', html: tabla(['', 'Antes', 'Ahora', 'Minecraft'], filasVel) },
        { h2: 'Retroceso de los monstruos', html: tabla(['', 'Antes', 'Plan', 'Ahora'], filasRet) }
    ],
    medidas: {
        cols: ['', 'antes', 'después (1)', 'después (2)'],
        filas: [
            ['Cuadro mediano (p90), un mundo nuevo al inicio', '2,5 ms (3,1)', '2,8 ms (3,6)', '!2,4 ms (3,0)'],
            ['Archivos JS nuevos al abrir', '—', '0', '0']
        ],
        como: 'Navegador del panel de Claude, 6 s por tanda, duración del callback del bucle por cuadro. Las dos tandas «después» muestran el ruido de la medición: sin cambio.'
    },
    pruebas: [
        '<code>node mundo/tests/movimiento.mjs</code>: 19 OK (agua, orilla a ras y de 2, lava, velocidades, camino, creativo intacto).',
        '<code>node mundo/tests/retroceso.mjs</code>: 12 OK (2,25 y 4,3 bloques; jefes no aplican).',
        '<code>node mundo/tests/guardado-copia.mjs</code>: 16 OK (lleno, reemplazo, fallo al escribir = nada borrado, abierto no elegible).',
        'Las demás de <code>mundo/tests/</code> (recetas, inventario, amistad, vida-amigos, tienda, paridad, señal QR): OK.'
    ],
    capturas: [{ h2: 'Panel de copia y X de cerrar', dir: 'mundo/capturas/7a', items: [
        ['copia-llena-y-x.jpg', 'Panel «Tus mundos están llenos» (datos de ejemplo; el primero es el abierto y no se puede reemplazar) y la X centrada arriba a la derecha.']
    ] }]
};
