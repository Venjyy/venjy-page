// Contenido del Artifact del bloque 7d (kits de misión) para plantilla.mjs; la tabla sale de KITS.
// Uso (desde la raíz del repo): node .claude/artifacts/plantilla.mjs .claude/artifacts/contenido-7d.mjs <salida.html>
import { pathToFileURL } from 'node:url';
const imp = p => import(pathToFileURL(`${process.cwd()}/${p}`).href);
const D = await imp('mundo/supervivencia/misiones-datos.js');
const O = (await imp('mundo/supervivencia/objetos.js'));
const tabla = (cab, f) => `<div class="tabla"><table><thead><tr>${cab.map((x, i) => `<th${i ? ' class="num"' : ''}>${x}</th>`).join('')}</tr></thead><tbody>${f}</tbody></table></div>`;
const filas = D.MISIONES.map(m => `<tr><td>${m.id}</td><td>${m.kit.map(([id, n, a]) => (n > 1 ? n + ' × ' : '') + O.nombreDe(id) + (a ? ' (de ' + D.NOMBRES_AMIGO[a] + ')' : '')).join(' + ')}</td></tr>`).join('');

export default {
    titulo: 'Kits de misión 7d',
    h1: 'Bloque 7d · Misiones más fáciles',
    estado: 'PR abierto, sin mergear. Parcial: kits y marca de préstamo hechos; las facilidades (animales, huerto, pistas) quedan para 7d-2.',
    pr: { n: 57, url: 'https://github.com/Venjyy/venjy-page/pull/57' },
    meta: 'Rama <code>misiones-7d</code> · 2026-10-11 · Sonnet',
    hecho: [
        '<b>36 kits</b> (<code>KITS</code>, <code>repartirKit</code>), entregados una sola vez por mundo (<code>estado.kits</code>, guardado).',
        '<b>Marca de préstamo</b> <code>p</code> en la pila: media durabilidad, nombre «Caña de pescar (de Pony)», no cuenta para <code>pide</code>, tiendas ni recetas; viaja por cofres, suelo y guardado.',
        '<b>Inventario lleno</b>: lo que no cabe cae a los pies y el HUD avisa «Inventario lleno: … quedó en el suelo».'
    ],
    archivos: {
        nuevos: ['mundo/tests/misiones.mjs', '.claude/artifacts/contenido-7d.mjs'],
        cambiados: ['mundo/supervivencia/inventario.js', 'contenedores.js', 'entidades.js', 'misiones-datos.js', 'misiones.js', 'hud.js', 'ui-inventario.js', 'main.js', 'minado.js', 'enemigos.js', 'mundo/PENDIENTES.md', 'mundo/supervivencia/MAPA.md']
    },
    revisar: [
        '<b>Sin probar en navegador</b>: mensajes del HUD, nombre con marca en la barra y la ventana, caída al suelo y recogida con marca.',
        '<b>Ajuste a la tabla</b>: pony2 3 galletas y andy2 2 galletas, para cumplir «kit ≤ 1/3 del premio».',
        '<b>Límite</b>: <code>coop.js</code> no difunde la marca de objetos soltados (no se tocó).',
        '<b>hoja-de-ruta.html</b> no existe en <code>main</code>: no se pudo marcar la fila.'
    ],
    decisiones: [
        ['Lógica del kit pura en <code>misiones-datos.js</code>.', 'Se prueba en Node sin DOM ni Three.js.', false],
        ['Prestadas valen 1/4 en la regla del 1/3.', 'Media durabilidad y no se pueden vender; con valor completo lona2 no cumplía.', true]
    ],
    secciones: [{ h2: 'Kits por misión', html: tabla(['Misión', 'Kit al aceptar'], filas) }],
    pruebas: [
        '<code>node mundo/tests/misiones.mjs</code>: kit en cada misión, una sola vez (también tras guardar/cargar), inventario lleno, préstamos fuera de <code>pide</code>, provisiones fuera de <code>pide</code>/tiendas, valor ≤ 1/3.',
        'Pasan inventario, tienda, recetas, amistad, estudio, paridad, guardado-copia y venjys.'
    ]
};
