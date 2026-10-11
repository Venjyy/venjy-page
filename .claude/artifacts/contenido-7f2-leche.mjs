// Contenido del Artifact del bloque 7f-2 (ítems y recetas) para plantilla.mjs; los objetos y recetas salen del código.
// Uso: ver plantilla.mjs
import { pathToFileURL } from 'node:url';
globalThis.window ??= { addEventListener() {} };
const imp = p => import(pathToFileURL(`${process.cwd()}/${p}`).href);
const { O, OBJETOS } = await imp('mundo/supervivencia/objetos.js');
const { RECETAS, ingredientes } = await imp('mundo/supervivencia/recetas.js');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const NUEVOS = ['CUBO_LECHE', 'BOTELLA_LECHE'];
const filas = NUEVOS.map(k => {
    const o = OBJETOS[O[k]];
    return { g: 'obj', celdas: [esc(o.nombre.es), esc(o.nombre.en), 'Clic derecho de ' + (k === 'CUBO_LECHE' ? 'un Cubo' : 'una Botella') + ' sobre una vaca adulta', 'Devuelve ' + esc(OBJETOS[O[o.devuelve]].nombre.es)] };
});

export default {
    titulo: 'Leche 7f-2',
    h1: 'Bloque 7f-2 · Leche de vaca',
    estado: 'Rama items-7f2-leche. Cubo y Botella de leche hechos; faltan los bloques con forma. Sin probar en navegador.',
    meta: 'Rama <code>items-7f2-leche</code> · desde <code>main</code> · 2026-10-11 · Sonnet',
    hecho: [
        '<b>2 objetos</b> al final del registro: Cubo de leche y Botella de leche, con ícono pintado (líquido blanco) y par ES/EN.',
        '<b>Ordeño</b>: cubo o botella vacíos sobre una vaca adulta; la vaca descansa 2 min. Crías y otros animales no.',
        '<b>Beber</b>: mantener clic derecho (aun con hambre llena); da 2 de hambre, quita veneno y efecto de hambre y devuelve el Cubo o la Botella.',
        '<b>Prueba</b>: <code>recetas.mjs</code> simula la vaca (ordeño, espera, cría, botella en pila de 3, otro animal).'
    ],
    archivos: {
        nuevos: ['.claude/artifacts/contenido-7f2-leche.mjs'],
        cambiados: ['mundo/supervivencia/objetos.js', 'mundo/supervivencia/iconos.js', 'mundo/supervivencia/ganado.js', 'mundo/supervivencia/minado.js', 'mundo/tests/recetas.mjs', 'mundo/PENDIENTES.md', 'mundo/supervivencia/MAPA.md']
    },
    revisar: [
        'Sin probar en navegador: el ícono de leche, el sonido del ordeño y beber con clic derecho mantenido.',
        'Que la vaca se pueda ordeñar de nuevo al recargar la partida (la espera no se guarda).'
    ],
    decisiones: [
        ['Sin recetas nuevas: la leche sale solo de la vaca.', 'Decisión del dueño: sin comidas chilenas nuevas.', false],
        ['Siguen pendientes losas, escaleras, escotilla y valla de jardín.', 'Son bloques con forma y piden un chat con pantalla.', true]
    ],
    pruebas: ['<code>recetas.mjs</code>, <code>inventario.mjs</code>, <code>tienda.mjs</code>, <code>amistad.mjs</code>, <code>misiones.mjs</code>, <code>venjys.mjs</code>, <code>guardado-copia.mjs</code> y <code>estudio/cli.mjs validar</code>: OK.'],
    tabla: { h2: 'Objetos nuevos', unidad: 'objetos', intro: 'Cómo se consigue cada uno.', cols: ['Objeto', 'Inglés', 'Cómo se consigue', 'Al beber'], grupos: { obj: 'Objeto nuevo' }, filas }
};
