// Contenido del Artifact del PR 6a del Estudio (el juego lee poses.json) para plantilla.mjs.
// Uso (desde la raíz del repo): node .claude/artifacts/plantilla.mjs .claude/artifacts/contenido-estudio6a.mjs <salida.html>
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { gestosDeDatos } from '../../mundo/datos/gestos.js';
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const prueba = execFileSync('node', ['mundo/tests/estudio-poses.mjs'], { encoding: 'utf8' }).split('\n').find(l => l.startsWith('paridad:'));
const datos = JSON.parse(fs.readFileSync('mundo/datos/poses.json', 'utf8'));
const tabla = (cab, f) => `<div class="tabla"><table><thead><tr>${cab.map(x => `<th>${x}</th>`).join('')}</tr></thead><tbody>${f}</tbody></table></div>`;
const fila = f => `<tr>${f.map(c => `<td>${c}</td>`).join('')}</tr>`;
// Dónde cae cada nombre de poses.json en el juego (puno vive en GESTOS_AMISTAD; las poses fijas son nuevas en GESTOS)
const NOMBRES = gestosDeDatos(datos).map(([k, d]) => {
    const pose = !datos.gestos[k];
    const tablaJuego = k === 'puno' ? 'GESTOS_AMISTAD' : 'GESTOS';
    return [`<code>${k}</code>`, pose ? 'pose fija' : 'gesto', `<code>${tablaJuego}</code>`, pose ? 'se suma' : 'reemplaza', Object.keys(d.canales).join(' ')];
});

export default {
    titulo: 'Estudio fase 6a',
    h1: 'Estudio · fase 6a · el juego lee poses.json',
    estado: 'PR abierto, sin mergear. Quien juega no ve cambios: los 11 gestos del archivo dan exactamente lo mismo que el código.',
    pr: { n: 77, url: 'https://github.com/Venjyy/venjy-page/pull/77' },
    meta: 'Rama <code>estudio-fase6</code> · parte de <code>origin/main</code> (con #75 y #76) · 2026-10-11',
    hecho: [
        '<b>Evaluador</b> <code>mundo/datos/gestos.js</code>: valor base, claves y osciladores de <code>poses.json</code>, sin reservar memoria por cuadro.',
        '<b>El juego lo lee</b>: <code>main.js</code> pide el JSON y cada gesto reemplaza por nombre al de <code>GESTOS</code> o <code>GESTOS_AMISTAD</code>. Ningún motor cambió.',
        '<b>Gestos nuevos y poses fijas</b> entran a <code>GESTOS</code>: valen en las pistas de las escenas (CLI y editor de Escenas los aceptan).',
        '<b>En vivo</b>: el puente y el disco aplican <code>poses</code> sin recargar; con otros datos, todo vuelve primero a su código.',
        '<b>validar</b> revisa claves fuera de orden, <code>env</code> al revés, reloj <code>local</code> y nombres que chocan.'
    ],
    archivos: {
        nuevos: ['mundo/datos/gestos.js', 'mundo/tests/estudio-poses.mjs', 'mundo/tests/estudio-poses-navegador.mjs', '.claude/artifacts/contenido-estudio6a.mjs'],
        cambiados: ['mundo/supervivencia/escenas-skin.js', 'mundo/supervivencia/escena-amistad-datos.js', 'mundo/supervivencia/main.js', 'estudio/puente-juego.js', 'estudio/puente-protocolo.js', 'estudio/cli.mjs', 'estudio/escenas.js', 'estudio/esquemas/poses.schema.json', 'mundo/datos/indice.json', 'mundo/tests/estudio.mjs', 'mundo/tests/estudio-textos.mjs', 'estudio/DISENO.md', 'mundo/PENDIENTES.md', 'mundo/supervivencia/MAPA.md', 'CLAUDE.md']
    },
    revisar: [
        '<b>El editor no está en este PR.</b> La pestaña Poses (sliders, vistas, curvas, osciladores, medir) es el PR 6b; el plan está en <code>DISENO.md</code> §16.',
        '<b>Un gesto del JSON reemplaza al del código con el mismo nombre</b>, también en «Hablar» y en la vida de los amigos. Es lo que pide la fase; las composiciones de <code>moldes.js</code> siguen en JS.',
        '<b>+2 archivos al abrir el juego</b> (15 KB). Se piden en paralelo y no frenan nada.'
    ],
    decisiones: [
        ['Reemplazar la entrada en la tabla en vez de enseñarle a cada motor a mirar el JSON.', 'Hay cinco lugares que llaman gestos por nombre; así ninguno cambia y la prioridad de hoy se conserva.', true],
        ['Las poses fijas también son gestos quietos.', 'Se pueden poner en una pista (<code>doblarse</code> de 1 a 2 s) sin escribir nada más.', false],
        ['Reloj <code>local</code> usa <code>t</code> por ahora.', 'Los motores no pasan la duración del tramo; <code>validar</code> lo avisa y conviene <code>u</code> o <code>t</code>.', false],
        ['Dividir la fase en 6a y 6b.', 'Evaluador y lectura del juego ya son un PR completo con sus pruebas; el editor es otro tanto.', false]
    ],
    secciones: [
        { h2: 'Qué hace cada nombre de poses.json en el juego', html: tabla(['Nombre', 'Tipo', 'Tabla', 'Efecto', 'Canales'], NOMBRES.map(fila).join('')) }
    ],
    medidas: {
        cols: ['Sin <code>?estudio</code>', 'base', 'rama'],
        filas: [
            ['Archivos al abrir <code>supervivencia.html</code>', '114', '116'],
            ['KB al abrir', '2665,9', '2681,2'],
            ['Pedidos nuevos', '—', '<code>gestos.js</code> 10 KB, <code>poses.json</code> 4,6 KB']
        ],
        como: 'Chromium headless con swiftshader, 960×540, 12 s tras la carga, dos corridas iguales; base = <code>origin/main</code>. El cuadro no cambia: un gesto del JSON cuesta lo mismo que la función que reemplaza.'
    },
    pruebas: [
        `<code>node mundo/tests/estudio-poses.mjs</code>: ${esc(prueba)}; además memoria, variantes, relojes, <code>ciclo</code>, reemplazo y vuelta, reglas, puente y CLI.`,
        '<code>node mundo/tests/estudio-poses-navegador.mjs</code> (Playwright): el brazo de Andy en <code>punos</code> pausado en el golpe está en -0,980 con el archivo, en -2,500 con <code>puno</code> editado en vivo y vuelve a -0,981; un gesto nuevo llega desde el disco.',
        'Pasan todas las de <code>mundo/tests/</code> salvo <code>estudio-navegador.mjs</code>, que falla igual en <code>main</code> (<code>/tp</code> no mueve al jugador).'
    ]
};
