// Contenido del Artifact del bloque 7f-2 (ítems y recetas) para plantilla.mjs; los objetos y recetas salen del código.
// Uso (desde la raíz del repo): node .claude/artifacts/plantilla.mjs .claude/artifacts/contenido-7f2.mjs <salida.html>
import { pathToFileURL } from 'node:url';
globalThis.window ??= { addEventListener() {} };
const imp = p => import(pathToFileURL(`${process.cwd()}/${p}`).href);
const { O, OBJETOS } = await imp('mundo/supervivencia/objetos.js');
const { RECETAS, ingredientes } = await imp('mundo/supervivencia/recetas.js');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const NUEVOS = ['RELOJ', 'MAPA', 'FAROL_MANO', 'CARTEL', 'BOTELLA', 'MAZO', 'PLUMA_JUGUETE', 'GUITARRA', 'TECLADO', 'TAMBOR'];
const nom = id => (id >= 256 ? OBJETOS[id].nombre.es : ({ 9: 'Tablones', 24: 'Vidrio', 10: 'Cuarzo', 14: 'Terracota negra', 34: 'Antorcha' })[id] || 'bloque ' + id);
const filas = NUEVOS.map(k => {
    const r = RECETAS.find(x => x.da[0] === O[k]);
    const ing = ingredientes(r).map(g => `${g.n} ${[].concat(g.pedido).map(nom).join(' o ')}`).join(', ');
    return { g: 'obj', celdas: [esc(OBJETOS[O[k]].nombre.es), esc(OBJETOS[O[k]].nombre.en), esc(ing), String(r.da[1])] };
});

export default {
    titulo: 'Ítems 7f-2',
    h1: 'Bloque 7f-2 · Ítems y recetas',
    estado: 'Rama items-7f2. Parte de objetos hecha (10 de ≈16 objetos, 10 de ≈20 recetas); faltan los bloques con forma y la leche. Íconos por revisar.',
    meta: 'Rama <code>items-7f2</code> · desde <code>main</code> · 2026-10-11 · Sonnet',
    hecho: [
        '<b>10 objetos nuevos</b> al final del registro (los guardados no cambian), con ícono pintado en <code>iconos.js</code> y par ES/EN.',
        '<b>10 recetas</b> nuevas (88 en total). Ninguna receta de comida nueva.',
        '<b>Prueba</b>: <code>recetas.mjs</code> revisa que cada objeto tenga ícono, ES/EN, sin emojis y receta, y que ninguna receta choque con otra.'
    ],
    archivos: {
        nuevos: ['.claude/artifacts/contenido-7f2.mjs'],
        cambiados: ['mundo/supervivencia/objetos.js', 'mundo/supervivencia/recetas.js', 'mundo/supervivencia/iconos.js', 'mundo/tests/recetas.mjs', 'mundo/PENDIENTES.md', 'mundo/supervivencia/MAPA.md']
    },
    revisar: [
        'Los 10 íconos nuevos en el juego (no se pudieron ver en la nube): legibles a 32×32 y con la paleta de los demás.',
        'Los nombres ES/EN y las recetas de la tabla.',
        'Que Reloj, Mapa, Farol y Cartel no hagan nada todavía es lo esperado: son base de 7j-0, 7f-3 y 7h.'
    ],
    decisiones: [
        ['Solo objetos del inventario en este PR.', 'Losas, escaleras, escotilla y valla de jardín son bloques con forma: piden cambios de malla, colisión y atlas. Lo mismo la leche (lógica de vacas). Conviene un chat dedicado.', true],
        ['El Farol nuevo se llama «Farol» y usa el ícono <code>farol_mano</code>.', 'El Farol del Caleuche (objeto de jefe) conserva el suyo.', false]
    ],
    pruebas: ['<code>recetas.mjs</code>, <code>inventario.mjs</code>, <code>tienda.mjs</code> y el resto de <code>mundo/tests/</code> (menos las de navegador): OK.'],
    tabla: { h2: 'Objetos nuevos y su receta', unidad: 'objetos', intro: 'Cada fila es un objeto con lo que pide su receta.', cols: ['Objeto', 'Inglés', 'Receta (ingredientes)', 'Da'], grupos: { obj: 'Objeto nuevo' }, filas }
};
