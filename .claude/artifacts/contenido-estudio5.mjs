// Contenido del Artifact del diseño de la fase 5 del Estudio para plantilla.mjs (datos de mundo/datos/escenas.json y de la prueba).
// Uso (desde la raíz del repo): node .claude/artifacts/plantilla.mjs .claude/artifacts/contenido-estudio5.mjs <salida.html>
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const E = JSON.parse(readFileSync('mundo/datos/escenas.json', 'utf8'));
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const tabla = (cab, f) => `<div class="tabla"><table><thead><tr>${cab.map(x => `<th>${x}</th>`).join('')}</tr></thead><tbody>${f}</tbody></table></div>`;
const fila = f => `<tr>${f.map(c => `<td>${c}</td>`).join('')}</tr>`;
const prueba = execFileSync('node', ['mundo/tests/estudio-escenas.mjs'], { encoding: 'utf8' }).split('\n').filter(l => l.startsWith('escenas:'))[0];

const filas = [];
for (const [clave, e] of Object.entries(E.escenas)) {
    filas.push({ g: clave, celdas: [clave, 'general', `T ${e.T} s · r ${e.r} · nivel ${e.nivel} · frase ${e.linea[0]} s por ${e.linea[1]} s`] });
    for (const k of ['golpes', 'corazones']) if (e[k]) filas.push({ g: clave, celdas: [clave, k, e[k].join(' · ') + ' s'] });
    for (const [q, tramos] of Object.entries(e.pista))
        for (const [g, a, b] of tramos) filas.push({ g: clave, celdas: [clave, `pista ${q === 'n' ? 'amigo' : 'jugador'}`, `<code>${g}</code> ${a} a ${b} s`] });
}

const PR = [
    ['5a', 'El juego lee <code>escenas.json</code>', '<code>mundo/datos/escenas.js</code>, <code>escena-amistad.js</code>, <code>/amistad guion</code>, <code>validar</code> y <code>resumen escenas</code>', 'Mismo cuadro con y sin <code>?sin-datos</code>; golpe movido en vivo; pruebas pasan; abrir el juego no suma pedidos', 'Sonnet'],
    ['5b', 'Pestaña Escenas (línea de tiempo)', 'Filas por actor, frases y marcas; arrastrar, estirar, encajar; Reproducir, Pausa e Ir a por el puente', 'Modelo puro probado en Node; Playwright arrastra, guarda una línea y ve avanzar <code>t</code>', 'Sonnet'],
    ['5c', 'Planos de cámara', '<code>camara.planos</code> por nombre o lista propia; «Ver» un plano', '<code>planosDe</code> igual a las constantes; lista propia se ve en el juego; sin <code>camara</code>, igual que hoy', 'Sonnet']
];
const JS = [
    ['<code>fusion</code>, <code>seguidos</code>, <code>espejo</code>, <code>con</code>, <code>desplazar</code>', 'Funciones de funciones'],
    ['Gestos propios de una escena (<code>tiembla</code>, <code>frotaJ</code>)', 'Van a <code>MOLDES</code> o, en la fase 6, a <code>poses.json</code>'],
    ['<code>reparto</code> y <code>yaw</code>', 'Dependen de quién es quién y dónde está'],
    ['Escenas de grupo (<code>centro</code>, <code>colocar</code>, <code>api.mover</code>)', 'Dependen del lugar y de quién vino'],
    ['<code>extra</code>, objetos <code>PIX</code>, <code>SONIDOS</code>', 'Código por cuadro'],
    ['<code>encadenar</code> y tiempos derivados', 'En JSON va el número ya calculado'],
    ['Bienvenidas, momentos, reencuentros', 'Se migran solo si se tocan y caben'],
    ['<code>escenas-skin.js</code>', 'Otro motor']
];

export default {
    titulo: 'Estudio fase 5 diseño',
    h1: 'Estudio · fase 5 · diseño de escenas',
    estado: 'PR abierto, sin mergear. Solo diseño: el juego no cambia. Lo que sigue son 3 PR para Sonnet (5a, 5b, 5c).',
    pr: { n: 60, url: 'https://github.com/Venjyy/venjy-page/pull/60' },
    meta: 'Rama <code>estudio-fase5-diseno</code> · parte de <code>origin/main</code> · 2026-10-11',
    hecho: [
        '<b>Esquema</b> <code>estudio/esquemas/escenas.schema.json</code>: dos tipos. <code>amistad</code> tiene la forma de <code>ANIMACIONES</code>. <code>guion</code> es una escena nueva con frases ES/EN, actores extra y planos de cámara (para 5c).',
        '<b>Piloto</b> <code>mundo/datos/escenas.json</code>: <code>punos</code> (golpe) y <code>pareja</code> (corazones), copiados del código. <code>lee: null</code>: el juego todavía no lo lee.',
        `<b>Paridad</b> <code>mundo/tests/estudio-escenas.mjs</code>: ${esc(prueba)}. Además 7 casos inválidos y las reglas que el esquema no expresa.`,
        '<b>DISENO.md §13</b>: decisiones, qué queda en JS y la partición en 3 PR con criterios de «listo», para que Sonnet no decida diseño.'
    ],
    archivos: {
        nuevos: ['estudio/esquemas/escenas.schema.json', 'mundo/datos/escenas.json', 'mundo/tests/estudio-escenas.mjs', '.claude/artifacts/contenido-estudio5.mjs'],
        cambiados: ['estudio/DISENO.md', 'mundo/datos/indice.json', 'mundo/PENDIENTES.md', 'mundo/supervivencia/MAPA.md']
    },
    revisar: [
        '<b>Escenas <code>guion</code> no se disparan solas</b>: se juegan con <code>/amistad guion</code> o desde el Estudio. Conectar una a un lugar o nivel lo decides tú, escena por escena.',
        '<b>Cámara sin cortes por tiempo</b>: los planos cambian con cada frase, como hoy. Cortes exactos pedirían tocar <code>camaras.js</code>.',
        '<b>Las frases de las 4 genéricas</b> siguen en <code>FRASES_AMISTAD</code>, no en <code>escenas.json</code>.'
    ],
    decisiones: [
        ['Mismo vocabulario que el guion del motor.', 'T, r, lineas, pista, golpes, corazones: el convertidor es casi la identidad y la paridad es exacta.', false],
        ['Tiempos absolutos en segundos.', 'El editor arrastra bloques; encadenar frases es lógica. Si falta d, vale lo que se alcanza a leer (durLinea).', false],
        ['Gestos solo por nombre.', 'Nada de variantes dentro de la escena; un gesto nuevo va a MOLDES o, en la fase 6, a poses.json.', false],
        ['El JSON reemplaza por clave a ANIMACIONES.', 'Una fila de actor reemplaza la fila entera; sin archivo o con ?sin-datos, el código.', false],
        ['El editor muestra también las 4 del código.', 'Editar una la copia al JSON (añadir claves está permitido).', false],
        ['Cámara: juego de planos por nombre o lista propia.', 'Sin planos manuales ni cortes por tiempo; ver un plano = reproducir con solo ese.', true]
    ],
    secciones: [
        { h2: 'Partición para Sonnet', html: tabla(['PR', 'Qué', 'Toca', 'Listo cuando', 'Modelo'], PR.map(fila).join('')) },
        { h2: 'Qué queda en JS', html: tabla(['Pieza', 'Por qué'], JS.map(fila).join('')) }
    ],
    pruebas: [
        `<code>node mundo/tests/estudio-escenas.mjs</code>: formato estable, esquema, 7 inválidos, una escena <code>guion</code> de ejemplo válida, ${esc(prueba)}.`,
        'Todas las demás de <code>mundo/tests/</code> pasan; <code>node estudio/cli.mjs validar</code>: OK 8 de 8.'
    ],
    tabla: {
        h2: 'Las escenas piloto', unidad: 'filas',
        intro: 'Salen de <code>mundo/datos/escenas.json</code>.',
        cols: ['Escena', 'Campo', 'Valor'],
        grupos: Object.fromEntries(Object.keys(E.escenas).map(k => [k, k])),
        filas
    }
};
