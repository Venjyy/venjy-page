// Contenido del Artifact de 7f-3 parte 5 (fauna de ambiente) para plantilla.mjs.
// Uso (desde la raíz del repo): node .claude/artifacts/plantilla.mjs .claude/artifacts/contenido-7f3-fauna.mjs <salida.html>
import { pathToFileURL } from 'node:url';
const imp = p => import(pathToFileURL(`${process.cwd()}/${p}`).href);
const { TOPES, TOPE_TOTAL, FAUNA } = await imp('mundo/fauna.js');
const tabla = (cab, f) => `<div class="tabla"><table><thead><tr>${cab.map((x, i) => `<th${i ? ' class="num"' : ''}>${x}</th>`).join('')}</tr></thead><tbody>${f}</tbody></table></div>`;
const filas = [
    ['Mariposa', 'flores', 'día', FAUNA.porAncla.mariposa, TOPES.mariposa, FAUNA.vuelo.mariposa],
    ['Abeja', 'flores', 'día', FAUNA.porAncla.abeja, TOPES.abeja, FAUNA.vuelo.abeja],
    ['Pez que salta', 'lago', 'siempre', FAUNA.porAncla.pez, TOPES.pez, FAUNA.vuelo.pez],
    ['Luciérnaga', 'borde del bosque', 'noche', FAUNA.porAncla.luciernaga, TOPES.luciernaga, FAUNA.vuelo.luciernaga]
].map(f => `<tr><td>${f[0]}</td><td>${f[1]}</td><td>${f[2]}</td><td class="num">${f[3]}</td><td class="num">${f[4]}</td><td class="num">${f[5]}</td></tr>`).join('');

export default {
    titulo: 'Fauna 7f-3',
    h1: 'Bloque 7f-3 · Fauna de ambiente',
    estado: 'PR abierto (73), sin mergear. Sin probar en navegador.',
    pr: { n: 73, url: 'https://github.com/Venjyy/venjy-page/pull/73' },
    meta: 'Rama <code>fauna-7f3</code> · 2026-10-11 · Sonnet',
    hecho: [
        '<b>Mariposas y abejas</b> junto a flores de día, <b>peces</b> que saltan en los lagos, <b>luciérnagas</b> de noche en el borde del bosque.',
        `<b>Tope ${TOPE_TOTAL}</b> (por especie en la tabla), 4 <code>InstancedMesh</code>, solo anclas a menos de ${FAUNA.activa} bloques.`,
        '<b>Determinista</b>: 104 anclas que salen solo del terreno; cada bicho es una función del tiempo, sin estado.',
        '<b>Seguro</b>: cada ancla tiene 6 bloques sin estructuras ni caminos y ningún bicho se aleja más que su vuelo.',
        'Se carga con <code>import()</code>; <code>prepararTerreno</code> y los workers no pagan nada.'
    ],
    archivos: {
        nuevos: ['mundo/fauna.js', 'mundo/supervivencia/fauna.js', 'mundo/tests/fauna.mjs', '.claude/artifacts/contenido-7f3-fauna.mjs'],
        cambiados: ['mundo/voxeles.js', 'mundo/supervivencia/main.js', 'mundo/PENDIENTES.md', 'mundo/supervivencia/MAPA.md']
    },
    revisar: [
        '<b>Aspecto</b>: tamaños, texturas de 4-8 px pintadas a ojo, aleteo y brillo con la niebla.',
        '<b>Cantidad visible</b>: una ancla cada ~20-28 bloques; si se ven pocos, subir <code>FAUNA.anclas</code>.'
    ],
    decisiones: [
        ['Posición como función del tiempo, sin estado.', 'Cero memoria por bicho y mismo resultado en cualquier hilo.'],
        ['La fauna no se calcula en <code>prepararTerreno</code>.', 'Los workers no la necesitan; se calcula una vez (~50-80 ms) al cargar el módulo.']
    ],
    secciones: [{ h2: 'Especies', html: tabla(['Especie', 'Dónde', 'Cuándo', 'Por ancla', 'Tope', 'Vuelo (bloques)'], filas) }],
    medidas: {
        cols: ['', 'main', 'rama'],
        filas: [['<code>llenarChunk</code> (ms/chunk)', '2,43-2,49', '2,49-2,72 (ruido)'], ['Cuadro de la fauna (ms)', '0', '!0,007-0,018'], ['Llamadas de dibujo', '0', '+4']],
        como: 'Node, 54 chunks, mediana de 7 corridas, 3 pares alternados; el cuadro son 3000 llamadas a <code>actualizar</code> sin GPU.'
    },
    pruebas: ['<code>node mundo/tests/fauna.mjs</code>: flor = chunk, anclas iguales entre terrenos, despeje, 765 000 muestras de movimiento, tope con 180 anclas apretadas, día/noche.', 'Pasan todas las de <code>mundo/tests/</code> salvo las <code>*-navegador</code>.']
};
