// Contenido del Artifact de 7f-3 parte 4 (ruinas con cofre) para plantilla.mjs.
// Uso (desde la raíz del repo): node .claude/artifacts/plantilla.mjs .claude/artifacts/contenido-7f3c.mjs <salida.html>
import { pathToFileURL } from 'node:url';
const imp = p => import(pathToFileURL(`${process.cwd()}/${p}`).href);
const { generarDatos } = await imp('mundo/mundo-datos.js');
const V = await imp('mundo/voxeles.js');
V.fijarAlto(V.ALTO_SUPERVIVENCIA);
const t = V.prepararTerreno(generarDatos('h'), { supervivencia: true });
const tabla = (cab, f) => `<div class="tabla"><table><thead><tr>${cab.map((x, i) => `<th${i ? ' class="num"' : ''}>${x}</th>`).join('')}</tr></thead><tbody>${f}</tbody></table></div>`;
const filas = t.ruinas.map((r, i) => `<tr><td>${i + 1}</td><td>${r.tipo === 'arco' ? 'Arco musgoso' : 'Pilar caído'}</td><td class="num">${Math.floor(r.x)}</td><td class="num">${Math.floor(r.z)}</td><td class="num">${r.cofre.y + t.dy}</td></tr>`).join('');

export default {
    titulo: 'Ruinas con cofre',
    h1: 'Bloque 7f-3 parte 4 · ruinas con cofre en el bosque',
    estado: 'PR abierto. Sin probar en navegador: aspecto de las ruinas y apertura del cofre con el botín nuevo.',
    pr: { n: 67, url: 'https://github.com/Venjyy/venjy-page/pull/67' },
    meta: 'Rama <code>claude/ruinas-cofre-bosque-fmfuzp</code> · 2026-10-11 · Sonnet',
    hecho: [
        '<b>7 ruinas</b> (meta 6-8) en claros del bosque: arco musgoso y pilar caído, alternados, cada una con un cofre.',
        '<b>Botín</b>: tabla nueva <code>ruina</code> en <code>botin.js</code> (hierro, oro, pedernal, hilo, manzana, antorchas, flechas, azada, esmeralda rara); <code>lugarDe</code> la elige a ≤ 4 bloques del cofre.',
        'Determinista y solo supervivencia (sale de <code>datos</code> y del terreno): los workers dan lo mismo que el hilo principal; el creativo no cambia.',
        'No pisa estructuras, caminos, señales ni los decorados de 7d-2 (atalaya, gatera, iglú): ≥ 34 bloques sobre el radio de cada lugar.',
        'Sin <code>zonasLuz</code> nuevas: <code>llenarChunk</code> ±0 %.'
    ],
    archivos: {
        nuevos: ['mundo/ruinas.js', 'mundo/tests/ruinas.mjs', '.claude/artifacts/contenido-7f3c.mjs'],
        cambiados: ['mundo/voxeles.js', 'mundo/supervivencia/botin.js', 'mundo/supervivencia/contenedores.js', 'mundo/tests/caminos.mjs', 'mundo/PENDIENTES.md', 'mundo/supervivencia/MAPA.md']
    },
    revisar: [
        '<b>Sin probar en navegador</b>: cómo se ven los arcos y pilares (hojas encima, cofre bajo el dintel) y que el cofre abra con el botín de <code>ruina</code>.',
        '<b>Botín</b>: contenido y probabilidades inventados a ojo; ajustar en <code>TABLAS.ruina</code>.',
        'La rama es la que asignó la sesión (<code>claude/ruinas-cofre-bosque-fmfuzp</code>), no <code>ruinas-7f3</code>.'
    ],
    decisiones: [
        ['Las ruinas se alternan arco / pilar caído.', 'Variedad sin azar extra; el orden es fijo y reproducible.', false],
        ['Sin <code>zonasLuz</code>.', 'No emiten luz; con todos los decorados salía +44 % en <code>llenarChunk</code>.', false],
        ['Claro de 7×7 dentro del bosque, no en pradera.', 'El pedido dice «puntos del bosque»; se pide densidad de árboles alrededor y claro libre en el centro.', true]
    ],
    secciones: [{ h2: 'Dónde quedan (mapa de prueba, semilla «h»)', html: tabla(['#', 'Tipo', 'x', 'z', 'y del cofre'], filas) }],
    medidas: {
        cols: ['', 'main', 'rama'],
        filas: [
            ['<code>llenarChunk</code>, ms por chunk (54 chunks)', '2,69-2,88', '!2,50-2,59'],
            ['<code>llenarChunk</code>, solo chunks de ruinas', '2,04-2,16', '!1,92-2,06'],
            ['<code>prepararTerreno</code>, ms', '251-274', '224-290'],
            ['Decorados / <code>zonasLuz</code>', '52 / 27', '59 / 27']
        ],
        como: 'Node, supervivencia, mediana de 7 corridas, dos corridas por lado en la misma máquina; la diferencia está dentro del ruido (±0 %).'
    },
    pruebas: [
        '<code>node mundo/tests/ruinas.mjs</code>: solo supervivencia, 6-8 ruinas separadas, un cofre por ruina (también en el chunk lleno), igual en dos terrenos, sin choques ni estructuras/caminos/agua, lejos de lugares y señales, en bosque, sin zonas de luz y botín determinista.',
        'Pasan todas las de <code>mundo/tests/</code> y <code>estudio/cli.mjs validar</code>, salvo <code>estudio-navegador*</code> (en la nube no corren).'
    ]
};
