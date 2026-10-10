// Contenido del Artifact del bloque 7b-1 (lag al romper) para plantilla.mjs; las medidas salen de los JSON de /medir.
// Uso (desde la raíz del repo): CAPTURAS=<carpeta> node .claude/artifacts/plantilla.mjs .claude/artifacts/contenido-7b1.mjs <salida.html>
import { readFileSync } from 'node:fs';
const leer = n => JSON.parse(readFileSync(`mundo/capturas/7b1/medicion-7b1-${n}.json`, 'utf8'));
const antes = leer('antes'), despues = leer('despues');
const c = n => String(n).replace('.', ',');
const NOMBRE = { campo: 'Campo abierto', campamento: 'Junto al campamento', base: 'Base con antorchas' };
const tabla = (cab, f) => `<div class="tabla"><table><thead><tr>${cab.map((x, i) => `<th${i ? ' class="num"' : ''}>${x}</th>`).join('')}</tr></thead><tbody>${f}</tbody></table></div>`;
const filasCuadro = antes.map((a, i) => {
    const d = despues[i];
    return `<tr><td>${NOMBRE[a.sitio]}</td><td class="num">${c(a.p50)} / ${c(a.p95)} / ${c(a.p99)}</td><td class="num">${c(d.p50)} / ${c(d.p95)} / ${c(d.p99)}</td><td class="num">${c(a.remallado)}</td><td class="num">${c(d.remallado)}</td><td class="num">${c(a.chunksPorEdicion)}</td></tr>`;
}).join('');
const fasesAntes = ['llenar', 'luz', 'mallar', 'instalar', 'soltar', 'particulas', 'workers'];
const filasFases = fasesAntes.map(f => `<tr><td>${f}</td>${antes.map(a => `<td class="num">${c(a.fases[f])}</td>`).join('')}</tr>`).join('');
const filasFasesD = ['luzInc', 'seccion', 'soltar', 'particulas', 'workers'].map(f => `<tr><td>${f}</td>${despues.map(a => `<td class="num">${c(a.fases[f])}</td>`).join('')}</tr>`).join('');

export default {
    titulo: 'Lag al romper 7b-1',
    h1: 'Bloque 7b-1 · Lag al romper y poner bloques',
    estado: 'PR abierto, sin mergear. Romper un bloque ya no rehace chunks enteros en el hilo principal: luz incremental exacta y remallado por secciones de 16 de alto.',
    pr: { n: 49, url: 'https://github.com/Venjyy/venjy-page/pull/49' },
    meta: 'Rama <code>rendimiento-7b1</code> · parte de <code>main</code> con #45, #46 y #47 · 2026-10-10 · Opus',
    hecho: [
        '<b>Medir primero</b>: <code>/medir romper</code> (modo devenjy) rompe 6×6×3 a 4 bloques/s en campo, campamento y una base con antorchas, con marcas por fase. Antes, con luz cerca, cada bloque rehacía ~9 chunks enteros en el hilo principal: hasta 181 ms por bloque.',
        '<b>1 · Luz incremental</b> (<code>mundo/luz-incremental.js</code>): quita y vuelve a propagar la luz, como Minecraft. En chunks de luz local trabaja sobre su ventana; en los de ventana ampliada, sobre una caja de chunks con la luz que ya guardan. Da exactamente lo mismo que <code>llenarChunk</code>.',
        '<b>Secciones de 16 de alto</b>: mallar un chunk entero costaba 4-15 ms. Ahora solo se remalla la sección tocada (~1 ms) y se oculta la vieja de la malla entera con grupos de índices.',
        '<b>2 · Workers</b>: los vecinos que solo cambian de luz se mallan en un worker; si un chunk no tiene luz exacta (borde con otra clase de luz o antorcha nueva), se rehace desde cero en un worker.',
        '<b>3 · Una vez por cuadro</b>: las ediciones del mismo cuadro (romper + la planta de arriba, lotes del cooperativo, explosiones) se juntan en un solo remallado por sección.',
        '<b>4 · Objetos tirados</b>: la geometría ya se compartía; ahora los iguales a menos de 1 bloque se juntan también al soltar.'
    ],
    archivos: {
        nuevos: ['mundo/luz-incremental.js', 'mundo/supervivencia/medir.js', 'mundo/tests/luz-incremental.mjs', 'mundo/capturas/7b1/ (2 capturas y 2 mediciones)'],
        cambiados: ['mundo/voxeles.js', 'mundo/worker-chunks.js', 'mundo/supervivencia/main.js', 'mundo/supervivencia/comandos-dev.js', 'mundo/supervivencia/entidades.js', 'mundo/supervivencia/particulas.js', 'mundo/supervivencia/coop.js', 'mundo/tests/paridad.mjs', 'mundo/PENDIENTES.md', 'mundo/supervivencia/MAPA.md']
    },
    revisar: [
        'Romper y poner rápido en tu PC a 144 Hz: antes caía a ~80 FPS; ahora el hilo principal gasta ~1 ms por bloque.',
        'Cooperativo con dos pestañas (<code>?disp=2</code>) rompiendo a la vez cerca de antorchas, y una explosión de creeper en una base.',
        'Poner una antorcha nueva lejos de otras: ese caso usa el camino lento a propósito (los chunks vecinos cambian de clase de luz) y se rehacen en un worker en pocos cuadros.'
    ],
    decisiones: [
        ['Luz de la supervivencia hasta el techo del mundo.', 'Antes llegaba hasta lo más alto construido + 2. Con un dominio fijo, la luz incremental coincide siempre con la de desde cero; solo cambia la luz en el aire sobre todo (no se ve).', false],
        ['Secciones en vez de chunk entero.', 'Era necesario: mallar un chunk costaba más que la meta de 3 ms. Las secciones se vuelven a juntar en una malla a los 3 s sin editar.', false],
        ['Camino lento cuando no hay dato exacto.', 'Se deshace la luz incremental y el chunk se rehace en un worker; mientras, la celda editada lleva una luz aproximada unos cuadros.', true],
        ['El creativo no se toca.', '<code>paridad.mjs</code> compara la huella SHA-1 de vox, luz y mallas con la de <code>main</code>.', false]
    ],
    secciones: [
        { h2: 'Cuadro y hilo principal al romper', html: tabla(['Sitio', 'p50 / p95 / p99 antes (ms)', 'Después (ms)', 'Por bloque antes (ms)', 'Después (ms)', 'Chunks por bloque antes'], filasCuadro) },
        { h2: 'Antes: ms por bloque y fase', html: tabla(['Fase', 'Campo', 'Campamento', 'Base'], filasFases) },
        { h2: 'Después: ms por bloque y fase', html: tabla(['Fase', 'Campo', 'Campamento', 'Base'], filasFasesD) }
    ],
    medidas: {
        cols: ['', 'meta', 'después'],
        filas: [
            ['Hilo principal por bloque', '≤ 3 ms', '!0,85-1,5 ms'],
            ['p99 del cuadro rompiendo en la base', '≤ 12 ms', '!5,2 ms'],
            ['Cuadro mediano', 'sin cambio (~2,5)', '2,3-2,4 ms'],
            ['Archivos JS nuevos al abrir', '—', '1 (luz-incremental.js, ~6 KB)']
        ],
        como: 'Navegador del panel de Claude, /medir romper: 108 bloques por sitio a 4 por segundo, duración del callback del bucle por cuadro. Tres tandas; la primera tuvo ruido de arranque en el campo.'
    },
    pruebas: [
        '<code>node mundo/tests/luz-incremental.mjs</code>: más de 300 ediciones al azar y dirigidas (campo, bordes, campamento, base con antorchas, pozos que se tapan y destapan, lotes de 20); vox, luz y malla de cada sección = desde cero. Falla si se rompe la fase de quitar.',
        '<code>node mundo/tests/paridad.mjs</code>: huella del creativo igual a <code>main</code> y editar en el creativo rehace el chunk entero.',
        'Las 12 de <code>mundo/tests/</code>: OK.'
    ],
    capturas: [{ h2: 'Misma imagen: camino rápido y desde cero', dir: process.env.CAPTURAS || 'mundo/capturas/7b1', items: [
        ['captura-7b1-rapido.jpg', 'Hoyo de 6×6×3 en la base con antorchas, con el camino rápido.'],
        ['captura-7b1-desde-cero.jpg', 'La misma vista con todos los chunks rehechos desde cero: diferencia máxima 13/255 (ruido de JPEG).']
    ] }]
};
