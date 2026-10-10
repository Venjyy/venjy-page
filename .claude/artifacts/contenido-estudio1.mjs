// Contenido del Artifact de la fase 1 del Estudio para plantilla.mjs (los datos salen de mundo/datos/*.json y del CLI).
// Uso (desde la raíz del repo): node .claude/artifacts/plantilla.mjs .claude/artifacts/contenido-estudio1.mjs <salida.html>
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const leer = n => JSON.parse(readFileSync(`mundo/datos/${n}.json`, 'utf8'));
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const L = leer('ui-layout'), T = leer('textos'), I = leer('indice');
const tabla = (cab, f) => `<div class="tabla"><table><thead><tr>${cab.map(x => `<th>${x}</th>`).join('')}</tr></thead><tbody>${f}</tbody></table></div>`;
const fila = f => `<tr>${f.map(c => `<td>${c}</td>`).join('')}</tr>`;
const cli = (...a) => execFileSync('node', ['estudio/cli.mjs', ...a], { encoding: 'utf8' }).trimEnd();

const API = [
    ['GET /api/estudio', 'El Estudio pregunta si puede guardar', '200 { ok, escritura, version }'],
    ['PUT /api/datos/&lt;nombre&gt;', 'Guarda <code>mundo/datos/&lt;nombre&gt;.json</code> con el formato estable', '200 { ok, bytes, etag }'],
    ['  nombre fuera del índice o con caracteres raros', 'Solo guarda lo que lista <code>indice.json</code>', '404'],
    ['  sin <code>X-Estudio: 1</code>, otro <code>Origin</code>, otro <code>Host</code> o desde la red', 'Una página de otro sitio no puede escribir', '403'],
    ['  sin <code>If-Match</code>', 'Hay que decir qué versión se leyó (o <code>*</code>)', '428'],
    ['  <code>If-Match</code> viejo', 'Alguien (un agente) cambió el archivo mientras tanto', '412'],
    ['  JSON roto o contra el esquema', 'No se escribe nada', '422 { errores }'],
    ['  cuerpo de más de 512 KB', 'Tope de tamaño', '413']
];

const filas = [];
const fmt = e => Object.entries(e).map(([k, v]) => `${k} ${v}`).join(' · ');
for (const [perfil, p] of Object.entries(L.supervivencia)) {
    for (const [id, e] of Object.entries(p.botones)) filas.push({ g: 'ui-layout', celdas: ['ui-layout', `${perfil} · <code>${id}</code>`, esc(fmt(e))] });
}
for (const [esp, o] of Object.entries(T.textos)) for (const [k, t] of Object.entries(o)) filas.push({ g: 'textos', celdas: ['textos', `<code>${esp}.${k}</code>`, `${esc(t.es)} | ${esc(t.en)}`] });
for (const l of cli('resumen').split('\n')) {
    const [nombre, ...resto] = l.split(/\s{2,}/);
    filas.push({ g: 'cli', celdas: ['cli resumen', `<code>${esc(nombre)}</code>`, esc(resto.join(' '))] });
}

export default {
    titulo: 'Estudio fase 1',
    h1: 'Estudio · fase 1 · servidor, layout táctil desde JSON y editor',
    estado: 'PR abierto, sin mergear, esperando tu revisión. Abre <code>http://localhost:5510/estudio/</code>, mueve un botón, guarda, y el celular lo muestra donde lo dejaste.',
    pr: { n: 46, url: 'https://github.com/Venjyy/venjy-page/pull/46' },
    meta: 'Rama <code>estudio-fase1</code> · parte de <code>main</code> (a075c3b, con #43 y #44 fusionados) · 2026-10-10',
    hecho: [
        '<b>Servidor Node</b> <code>node estudio/servidor.mjs</code> en lugar de Python: mismos archivos, con <code>ETag</code>, y la API para guardar. Mismo nombre <code>venjy</code> y puerto 5510 en <code>.claude/launch.json</code>.',
        '<b>Editor de layout</b> en <code>/estudio/</code>: la capa táctil real en un iframe del tamaño del aparato, asas para arrastrar y agrandar, campos numéricos, avisos (botones que se tapan, de menos de 44 px o fuera de la pantalla), deshacer, guardar y descargar. Español e inglés.',
        '<b>El juego lee el JSON</b>: <code>tactil-supervivencia.js</code> toma posiciones y tamaños de <code>ui-layout.json</code> y las etiquetas (ROMPER, USAR, CAM, /…) de <code>textos.json</code>. Sin JSON, con el JSON roto o con <code>?sin-datos</code>, queda exactamente como hoy.',
        '<b>CLI para el agente</b>: <code>resumen</code> (los JSON y, sin migrarlos, diálogos, tienda y amistad) y <code>validar</code> (esquema, formato, emojis y, con <code>--contra HEAD</code>, valores existentes cambiados).',
        `<b>Datos corregidos</b>: ${Object.keys(L.supervivencia.normal.botones).length} elementos en el perfil normal. Pausa y pantalla salieron del archivo porque sus valores de la fase 0 no eran los de hoy (ver «A revisar»).`
    ],
    archivos: {
        nuevos: ['estudio/servidor.mjs', 'estudio/formato.mjs', 'estudio/validar.mjs', 'estudio/cli.mjs', 'estudio/fuentes.mjs', 'estudio/index.html', 'estudio/estudio.js', 'estudio/estudio.css', 'estudio/layout.js', 'estudio/vista-tactil.html', 'mundo/datos/cargador.js', 'mundo/supervivencia/layout-datos.js', 'mundo/tests/estudio.mjs', 'mundo/capturas/estudio1/'],
        cambiados: ['mundo/supervivencia/tactil-supervivencia.js', 'mundo/datos/indice.json', 'mundo/datos/ui-layout.json', '.claude/launch.json', 'CLAUDE.md', 'mundo/PENDIENTES.md', 'mundo/supervivencia/MAPA.md', 'estudio/DISENO.md', '.claude/skills (comentarios de capturar, grabar, posar y ahorro)']
    },
    revisar: [
        '<b>Pausa y pantalla completa</b>: los valores de la fase 0 (arriba a la derecha, 12 px) no eran los de hoy; <code>mundo.css</code> las baja bajo el minimapa y, en celular acostado, las pone a la izquierda de la misión. Salieron del JSON y el juego queda idéntico. Si las mueves en el editor se guardan y le ganan a <code>mundo.css</code>.',
        '<b>Solapes que ya existen en celular acostado (844×390)</b>: el joystick se tapa con CAM, <code>/</code> y la misión; INV, SOLTAR, CAM y <code>/</code> miden 40 px de alto (el mínimo cómodo es 44). El editor los marca en rojo y amarillo; no los toqué.',
        'Si prefieres que el editor se abra desde el menú del juego o solo desde <code>/estudio/</code>. Hoy es solo la URL.',
        '<b>No existe <code>?tactil</code></b> en el juego. Para ver el táctil real: modo dispositivo del navegador o <code>estudio/vista-tactil.html</code>.'
    ],
    decisiones: [
        ['El servidor Node reemplaza a Python.', 'Guarda, calcula ETag y carga en frío ~5 veces más rápido (1,2 s contra 6 s con 97 recursos). Python queda como alternativa de solo lectura.', false],
        ['Escribir exige X-Estudio, mismo origen, Host localhost, If-Match y esquema válido.', 'Ninguna página de otro sitio puede escribir en disco, y el editor no pisa un cambio de un agente (412).', false],
        ['El editor guarda lo medido en la vista, no lo tecleado.', 'x e y salen del getBoundingClientRect real con la ancla del botón; en el perfil «baja» solo se guarda lo que difiere de «normal».', false],
        ['El layout se escribe como un &lt;style&gt; solo con las claves presentes.', 'Lo que no está en el JSON sigue con el CSS de hoy; por eso con los datos iniciales los rectángulos son iguales en 4 tamaños.', false],
        ['Pausa y pantalla fuera del JSON inicial.', 'Su lugar depende del ancho y del minimapa (mundo.css con !important); un valor único habría movido botones en tablet y celular.', true],
        ['La zona segura del editor es una simulación.', 'No se puede cambiar env(); se mueve el contenedor. Sirve para ver el efecto, no para medir la muesca real.', false]
    ],
    secciones: [
        { h2: 'La API del servidor', html: `<p class="meta">Solo estas rutas escriben; todo lo demás es lectura de archivos de la raíz (menos <code>.git</code>). Escucha en 127.0.0.1; con <code>--lan</code> la red solo lee.</p>` + tabla(['Ruta o caso', 'Qué hace', 'Respuesta'], API.map(fila).join('')) },
        { h2: 'CLI de hoy', html: `<p class="meta">Salida real de <code>node estudio/cli.mjs resumen</code>.</p><pre class="cli" style="margin:0;white-space:pre-wrap">${esc(cli('resumen'))}</pre>` },
        { h2: 'Archivos de mundo/datos', html: tabla(['Archivo', 'Qué', 'Lo lee', 'Fase'], Object.entries(I.archivos).map(([k, a]) => fila([`<code>${k}.json</code>`, esc(a.que), a.lee ? `<code>${a.lee.split('/').pop()}</code>` : 'nadie aún (referencia)', a.fase])).join('')) }
    ],
    medidas: {
        cols: ['', 'main + Python', 'rama + Python', 'rama + Node'],
        filas: [
            ['Recursos al abrir <code>supervivencia.html</code>', '93', '97', '97'],
            ['JS al abrir', '89 archivos · 2222 KB', '—', '91 archivos · 2231 KB'],
            ['Carga en frío', '6167 ms', '5933 ms', '!1171 ms'],
            ['Recarga (caché caliente)', '539 ms (sin revalidar)', '539 ms (sin revalidar)', '662 ms (96 revalidaciones 304, 28 KB)'],
            ['Entrar a un mundo nuevo', '1109 ms (con imports en frío)', '—', '583 ms'],
            ['Cuadro mediano (<code>renderer.render</code>)', '1,4 ms (p90 2,3)', '—', '1,3 ms (p90 2,2) (ruido)']
        ],
        como: 'Navegador del panel de Claude, 1360×860, con GPU, un origen por servidor para tener caché fría; mundo nuevo en Pacífico, dificultad 0; cuadro mediano = duración de <code>renderer.render</code> durante 6 s. La rama suma 2 JS y 2 JSON (+11 KB en total). El Python no revalida (caché heurística): puede servir archivos viejos tras editar.'
    },
    pruebas: [
        '<code>node mundo/tests/estudio.mjs</code>: formato idempotente sobre los 5 JSON; validador acepta los 5 y rechaza 9 casos (ancla «centro», botón desconocido, ancho 10, texto sin <code>en</code>, texto vacío, <code>dy: «arriba»</code>, canal <code>brazo</code>, oscilador <code>cuadrada</code>, ángulo 9); fusión; CSS esperado de los datos iniciales; servidor (estáticos, 304, <code>../</code> y <code>.git</code>, PUT y sus 404/403/412/422/428/413); CLI; paridad de gestos: 11 gestos, 32 040 comparaciones, diferencia máxima 0.',
        'Las 7 pruebas de siempre en <code>mundo/tests/</code> (recetas, inventario, amistad, tienda, paridad, señal QR y vida-amigos) siguen pasando.',
        'Navegador: estilos computados iguales con y sin <code>?sin-datos</code> en 844×390, 390×844, 915×412 y 820×1180 (14 elementos); mover ROMPER en el editor y guardar cambió una sola línea del JSON; <code>supervivencia.html</code> en modo móvil aplica el layout; sin errores de consola.',
        '<b>No se pudo correr</b> <code>capturar.mjs</code> ni <code>posar.mjs</code>: importan Playwright desde <code>/opt/node22/…</code> (solo el contenedor) y aquí no hay Playwright. Sí se comprobó que el servidor nuevo sirve <code>posar.html</code> con sus módulos y <code>supervivencia.html</code>. Resolver Playwright queda para la fase 2.'
    ],
    capturas: [
        { h2: 'Capturas', dir: 'mundo/capturas/estudio1', items: [['editor-layout.jpg', 'El editor con «celular acostado» y la zona segura simulada: ROMPER elegido (asa amarilla con su esquina), campos x/y/ancho/alto, y en rojo los botones que se tapan (CAM, <code>/</code> y la misión con el joystick).']] }
    ],
    tabla: {
        h2: 'Todo lo que lee el juego y el CLI', unidad: 'entradas',
        intro: 'Una fila por botón del layout, por etiqueta y por línea de <code>resumen</code>.',
        cols: ['Origen', 'Clave', 'Valores'],
        grupos: { 'ui-layout': 'Layout táctil', textos: 'Textos', cli: 'CLI resumen' },
        filas
    }
};
