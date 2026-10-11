// Contenido del Artifact de 7f-3 (ajuste de mojones y lugares con motivo: molino y portal) para plantilla.mjs.
// Uso (desde la raíz del repo): node .claude/artifacts/plantilla.mjs .claude/artifacts/contenido-7f3b.mjs <salida.html>
import { pathToFileURL } from 'node:url';
const imp = p => import(pathToFileURL(`${process.cwd()}/${p}`).href);
const { CARTELES_LUGARES } = await imp('mundo/lugares-motivos.js');
const tabla = (cab, f) => `<div class="tabla"><table><thead><tr>${cab.map((x, i) => `<th${i ? ' class="num"' : ''}>${x}</th>`).join('')}</tr></thead><tbody>${f}</tbody></table></div>`;
const filas = Object.entries(CARTELES_LUGARES).map(([k, c]) => `<tr><td>${k}</td><td>${c.texto.es.replace(/\n/g, ' · ')}</td><td>${c.texto.en.replace(/\n/g, ' · ')}</td></tr>`).join('');

export default {
    titulo: 'Lugares con motivo 7f-3',
    h1: 'Bloque 7f-3 · ajuste de mojones y lugares con motivo',
    estado: 'Dos PR abiertos, sin mergear. Sin probar en navegador: texto de los mojones, carteles de lugar y la cama dentro del molino.',
    pr: { n: 65, url: 'https://github.com/Venjyy/venjy-page/pull/65' },
    meta: 'Ramas <code>caminos-7f3-ajuste-texto</code> y <code>lugares-7f3-a</code> · 2026-10-11 · Sonnet',
    hecho: [
        '<b>Mojones</b> (PR 65): el cuadro de texto sube y se corre hacia el camino; constante <code>TEXTO_MOJON</code> para afinar.',
        '<b>Molino</b>: refugio con cama de 2 bloques y antorcha dentro de la torre (dormir fija la reaparición a mitad de mapa).',
        '<b>Portal</b>: cartel con la leyenda del Chonchon junto a la ruina (el cofre ya estaba).',
        'Los dos lugares tienen un cartel con su nombre y para qué sirven, en ES y EN.',
        'Solo supervivencia, determinista, sin zonas de luz nuevas: <code>llenarChunk</code> ±0 %.'
    ],
    archivos: {
        nuevos: ['mundo/lugares-motivos.js', 'mundo/tests/lugares.mjs', '.claude/artifacts/contenido-7f3b.mjs'],
        cambiados: ['mundo/voxeles.js', 'mundo/supervivencia/caminos-carteles.js', 'mundo/tests/caminos.mjs', 'mundo/caminos.js (PR 65)', 'mundo/PENDIENTES.md', 'mundo/supervivencia/MAPA.md']
    },
    revisar: [
        '<b>Sin probar en navegador</b>: legibilidad de los mojones y los carteles de lugar, y la cama contra la pared del molino.',
        '<b>Leyenda del Chonchon</b>: texto inventado, corto; el dueño debe aprobarlo o cambiarlo en <code>CARTELES_LUGARES</code>.',
        'Los dos PR tocan <code>PENDIENTES.md</code> y <code>tests/caminos.mjs</code>: puede haber un conflicto chico al fusionar el segundo.'
    ],
    decisiones: [
        ['No se hizo la carta diaria del correo.', 'El mini-encargo «Carta» de 7d-2 ya da una carta por día; otra sería un segundo sistema.', true],
        ['No se hizo base inicial de la casa ni tablón del registro.', 'La casa ya tiene cama, mesa y cofre con botín; el tablón toca misiones.', true],
        ['Aspas girando, vagoneta, catalejo y mirador quedan aparte.', 'Piden objetos animados o entidades nuevas.', true]
    ],
    secciones: [{ h2: 'Carteles de lugar', html: tabla(['Lugar', 'Español', 'English'], filas) }],
    pruebas: [
        '<code>node mundo/tests/lugares.mjs</code>: solo supervivencia, cama y antorcha en el chunk lleno, puerta libre, carteles ES/EN sin emojis, mismo resultado en dos terrenos, sin zonas de luz nuevas.',
        'Pasan todas las de <code>mundo/tests/</code> salvo las de navegador (en la nube no corren).'
    ]
};
