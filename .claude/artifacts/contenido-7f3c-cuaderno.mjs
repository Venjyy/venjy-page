// Contenido del Artifact de 7f-3 parte 6 (cuaderno de los Tomatitos) para plantilla.mjs.
// Uso (desde la raíz del repo): node .claude/artifacts/plantilla.mjs .claude/artifacts/contenido-7f3c-cuaderno.mjs <salida.html>
import { pathToFileURL } from 'node:url';
const imp = p => import(pathToFileURL(`${process.cwd()}/${p}`).href);
const { PAGINAS, PREMIO } = await imp('mundo/supervivencia/cuaderno-datos.js');
const tabla = (cab, f) => `<div class="tabla"><table><thead><tr>${cab.map((x, i) => `<th${i ? ' class="num"' : ''}>${x}</th>`).join('')}</tr></thead><tbody>${f}</tbody></table></div>`;
const una = s => s.replace(/\n/g, ' · ');
const filas = PAGINAS.map((p, i) => `<tr><td>${i + 1}. ${p.t.es}</td><td>${una(p.x.es)}</td><td>${p.t.en}: ${una(p.x.en)}</td></tr>`).join('');

export default {
    titulo: 'Cuaderno Tomatitos 7f-3',
    h1: 'Bloque 7f-3 · Cuaderno de los Tomatitos',
    estado: 'PR abierto (68), sin mergear. Textos por revisar por el dueño; sin probar en navegador.',
    pr: { n: 68, url: 'https://github.com/Venjyy/venjy-page/pull/68' },
    meta: 'Rama <code>cuaderno-7f3</code> · 2026-10-11 · Sonnet',
    hecho: [
        '<b>12 páginas escondidas</b>: una por zona del mapa (4×3, orden barajado), al borde del bosque o cerca del agua; deterministas y lejos de estructuras, caminos, señales y lugares.',
        '<b>Cuaderno de los Tomatitos</b> (objeto nuevo): la primera página lo trae; clic derecho abre las páginas que llevas y las que faltan. Receta de repuesto: libro + pluma.',
        `<b>Premio</b> al juntar las 12, una sola vez: ${PREMIO.tomates} Tomates con bigote (objeto nuevo, comida) + ${PREMIO.esmeraldas} esmeraldas.`,
        '<b>Por jugador</b>: el estado viaja en <code>inventario.serializar()</code> (<code>q</code>); el cooperativo lo guarda en el perfil sin tocar <code>coop.js</code>.'
    ],
    archivos: {
        nuevos: ['mundo/paginas-cuaderno.js', 'mundo/supervivencia/cuaderno.js', 'mundo/supervivencia/cuaderno-datos.js', 'mundo/tests/cuaderno.mjs', '.claude/artifacts/contenido-7f3c-cuaderno.mjs'],
        cambiados: ['mundo/caminos.js', 'mundo/voxeles.js', 'mundo/supervivencia/objetos.js', 'iconos.js', 'recetas.js', 'inventario.js', 'main.js', 'supervivencia.css', 'mundo/PENDIENTES.md', 'mundo/supervivencia/MAPA.md']
    },
    revisar: [
        '<b>Los 12 textos</b> (tabla de abajo): borrador sacado de lo que ya dicen los amigos; el dueño los aprueba o edita en <code>cuaderno-datos.js</code>.',
        '<b>Sin probar en navegador</b>: sprite, panel, íconos <code>cuaderno</code> y <code>tomate</code> (pintados a ojo) y qué tan fácil se encuentran las páginas.',
        'Premio y cantidades (<code>PREMIO</code>) son una propuesta.'
    ],
    decisiones: [
        ['El estado vive en el inventario, no en el mundo.', 'Así es por jugador y el cooperativo lo guarda sin cambiar <code>coop.js</code>.', true],
        ['Las páginas no son objetos del inventario.', 'Se recogen directo al cuaderno; no se pueden perder ni apilar.', true],
        ['Si pierdes el cuaderno, la siguiente página (o libro + pluma) lo repone.', 'Las páginas ya encontradas se conservan.', true]
    ],
    secciones: [{ h2: 'Las 12 páginas', html: tabla(['Página', 'Español', 'English'], filas) }],
    pruebas: [
        '<code>node mundo/tests/cuaderno.mjs</code>: textos ES/EN sin emojis, ids al final, 12 sitios deterministas y libres, recoger una vez, premio único, guardado y por jugador.',
        'Pasan todas las de <code>mundo/tests/</code> salvo las <code>*-navegador</code> (no corren en la nube). Colocar las páginas cuesta ~2 ms.'
    ]
};
