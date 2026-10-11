// Contenido del Artifact del bloque 7f-3 parte 1 (caminos con señales) para plantilla.mjs; los datos salen de colocarCaminos.
// Uso (desde la raíz del repo): node .claude/artifacts/plantilla.mjs .claude/artifacts/contenido-7f3.mjs <salida.html>
import { pathToFileURL } from 'node:url';
const imp = p => import(pathToFileURL(`${process.cwd()}/${p}`).href);
const { generarDatos } = await imp('mundo/mundo-datos.js');
const V = await imp('mundo/voxeles.js');
V.fijarAlto(V.ALTO_SUPERVIVENCIA);
const t = V.prepararTerreno(generarDatos('h'), { supervivencia: true });
const tabla = (cab, f) => `<div class="tabla"><table><thead><tr>${cab.map((x, i) => `<th${i ? ' class="num"' : ''}>${x}</th>`).join('')}</tr></thead><tbody>${f}</tbody></table></div>`;
const cruces = t.caminos.filter(c => c.tipo === 'cruce');
const mojones = t.caminos.filter(c => c.tipo === 'mojon');
const filas = cruces.map(c => `<tr><td>${c.texto.es.replace(/\n/g, ' · ')}</td><td>${c.texto.en.replace(/\n/g, ' · ')}</td><td>${Math.round(c.x)}, ${Math.round(c.z)}</td></tr>`).join('');

export default {
    titulo: 'Caminos y lugares 7f-3',
    h1: 'Bloque 7f-3 · parte 1: caminos con señales',
    estado: 'PR abierto, sin mergear. Sin probar en navegador: aspecto del texto y luz de los faroles. Quedan 6 partes de 7f-3 para otros PR.',
    pr: { n: 62, url: 'https://github.com/Venjyy/venjy-page/pull/62' },
    meta: 'Rama <code>claude/caminos-lugares-7f3-71vdlf</code> · 2026-10-11 · Sonnet',
    hecho: [
        `<b>${mojones.length} mojones</b> cada ~100 bloques de camino: pilar de piedra con «Tramo N · distancia».`,
        `<b>${cruces.length} carteles de cruce</b> con el lugar, el anterior y el siguiente y sus distancias por el camino, en ES y EN.`,
        `<b>${cruces.length} faroles</b> (tronco y piedra luminosa) al otro lado del camino; solo ellos amplían la ventana de luz.`,
        'Todo determinista (sale de <code>datos</code> y del terreno): los workers dan lo mismo que el hilo principal. El creativo no cambia.',
        'El texto se pinta solo a menos de 24 bloques, con <code>crearCarteles</code> del portafolio.'
    ],
    archivos: {
        nuevos: ['mundo/caminos.js', 'mundo/supervivencia/caminos-carteles.js', 'mundo/tests/caminos.mjs', '.claude/artifacts/contenido-7f3.mjs'],
        cambiados: ['mundo/voxeles.js', 'mundo/supervivencia/main.js', 'mundo/PENDIENTES.md', 'mundo/supervivencia/MAPA.md']
    },
    revisar: [
        '<b>Sin probar en navegador</b>: tamaño y legibilidad del texto, altura del sprite sobre el tablón, luz de los faroles de noche.',
        '<b>Medición de cuadro</b> (<code>/medir romper</code>) sin repetir: se midió en Node (ver tabla). Compárala en local con la de 7b-1.',
        'Si una señal no encuentra sitio libre al costado del camino, se omite (hoy entran las 5 de cruce y 27 mojones).'
    ],
    decisiones: [
        ['Solo los faroles entran a <code>zonasLuz</code>.', 'Con todas las señales salía +44 % en <code>llenarChunk</code>; con solo faroles, ±0 %.', true],
        ['Banca y mirador no van en esta parte.', 'Esperan «sentarse» de 7g.', true],
        ['El cartel de cruce queda 26 bloques antes del lugar.', 'No pisa estructuras ni el patio de cada lugar.', true]
    ],
    secciones: [
        { h2: 'Carteles de cruce', html: tabla(['Español', 'English', 'x, z'], filas) },
        { h2: 'Medición (Node, mediana)', html: tabla(['Qué', 'Antes', 'Después'], '<tr><td>llenarChunk, ms por chunk (54 chunks)</td><td>2,24–2,27</td><td>2,20–2,32</td></tr><tr><td>prepararTerreno, ms</td><td>220–270</td><td>270–285</td></tr><tr><td>Decorados / zonas de luz</td><td>14 / 22</td><td>51 / 27</td></tr>') }
    ],
    pruebas: [
        '<code>node mundo/tests/caminos.mjs</code>: solo supervivencia, determinismo entre dos terrenos en 37 chunks, textos ES/EN sin emojis, sin choques, bloques presentes, solo faroles en zonas de luz.',
        'Pasan todas las de <code>mundo/tests/</code> salvo las de navegador (en la nube no corren).'
    ]
};
