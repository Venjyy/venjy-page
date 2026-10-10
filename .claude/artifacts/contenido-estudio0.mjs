// Contenido del Artifact de la fase 0 del Estudio para plantilla.mjs (los datos salen de mundo/datos/*.json).
// Uso (desde la raíz del repo): node .claude/artifacts/plantilla.mjs .claude/artifacts/contenido-estudio0.mjs <salida.html>
import { readFileSync } from 'node:fs';
const leer = n => JSON.parse(readFileSync(`mundo/datos/${n}.json`, 'utf8'));
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const L = leer('ui-layout'), T = leer('textos'), P = leer('posiciones'), G = leer('poses'), I = leer('indice');
const tabla = (cab, f) => `<div class="tabla"><table><thead><tr>${cab.map(x => `<th>${x}</th>`).join('')}</tr></thead><tbody>${f}</tbody></table></div>`;

// ---- Dibujo del layout táctil (mismas reglas que aplicará layout-datos.js) ----
const COLOR = { 'sv-romper': '#a0463c', 'sv-usar': '#467846', 'sv-acariciar': '#be6e5a', joy: '#3a3a3a', mision: 'none' };
function svgLayout(W, H, titulo) {
    const baja = H <= 460;
    const n = L.supervivencia.normal, b = L.supervivencia.baja;
    const casilla = W <= 520 ? Math.max(30, Math.min(0.094 * W, 40)) : 40;
    const pie = casilla + (baja ? b.pie : n.pie);
    const esc2 = 300 / Math.max(W, H);
    let s = `<rect x="0" y="0" width="${W}" height="${H}" fill="#5d8a4e" stroke="#000" stroke-width="6"/>`;
    s += `<line x1="0" x2="${W}" y1="${H - pie}" y2="${H - pie}" stroke="#ffd84a" stroke-dasharray="10 8" stroke-width="3"/><text x="${W / 2}" y="${H - pie + 34}" fill="#ffd84a" font-size="26" text-anchor="middle">--pie ${pie.toFixed(0)} px</text>`;
    for (const [id, base] of Object.entries(n.botones)) {
        const e = { ...base, ...(baja ? b.botones[id] || {} : {}) };
        const w = e.w || 150, h = e.h || 40;
        const izq = e.ancla[1] === 'i', arriba = e.ancla[0] === 's';
        const x = izq ? e.x : W - e.x - w;
        const y = arriba ? e.y : H - (e.desde === 'pie' ? pie : 0) - e.y - h;
        const etq = (T.textos.tactil[id.replace('sv-', '')] || {}).es || id;
        s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${COLOR[id] || '#6f6f6f'}" fill-opacity="${id === 'mision' ? 0 : 0.85}" stroke="#000" stroke-width="3"${id === 'mision' ? ' stroke-dasharray="8 6"' : ''}/>`;
        s += `<text x="${x + w / 2}" y="${y + h / 2 + 8}" fill="#fff" font-size="${Math.min(22, w / Math.max(3, etq.length) * 1.6)}" text-anchor="middle">${esc(etq)}</text>`;
    }
    return `<figure><svg viewBox="-6 -6 ${W + 12} ${H + 12}" width="${(W * esc2).toFixed(0)}" style="max-width:100%;height:auto;font-family:var(--fuente)" role="img" aria-label="${esc(titulo)}">${s}</svg><figcaption>${esc(titulo)}</figcaption></figure>`;
}

// ---- Filas de la tabla filtrable: todo lo que hay en mundo/datos ----
const filas = [];
const fmtBoton = e => Object.entries(e).map(([k, v]) => `${k} ${v}`).join(' · ');
for (const [perfil, p] of Object.entries(L.supervivencia)) for (const [id, e] of Object.entries(p.botones)) filas.push({ g: 'ui-layout', celdas: ['ui-layout', `${perfil} · <code>${id}</code>`, esc(fmtBoton(e))] });
for (const [esp, o] of Object.entries(T.textos)) for (const [k, t] of Object.entries(o)) filas.push({ g: 'textos', celdas: ['textos', `<code>${esp}.${k}</code>`, `${esc(t.es)} | ${esc(t.en)}`] });
for (const [k, e] of Object.entries(P.personas)) filas.push({ g: 'posiciones', celdas: ['posiciones', `<code>${k}</code>`, esc(`${e.ancla}${e.marco ? ' (marco ' + e.marco + ')' : ''} · dx ${e.dx} · dy ${e.dy} · dz ${e.dz} · giro ${e.giro}°${e.nota ? ' · ' + e.nota : ''}`)] });
const canal = c => (typeof c === 'number' ? `${c}` : `${c.k ? `${c.k.length} claves` : c.base ?? 0}${(c.osc || []).map(o => ` ~${o.forma} ${o.amp}@${o.frec}${o.fase ? '+' + o.fase : ''}${o.env ? ' env ' + o.env.join('-') : ''}`).join('')}`);
for (const [k, e] of Object.entries(G.poses)) filas.push({ g: 'poses', celdas: ['poses (fija)', `<code>${k}</code>`, esc(Object.entries(e.canales).map(([c, v]) => `${c} ${v}`).join(' · '))] });
for (const [k, e] of Object.entries(G.gestos)) filas.push({ g: 'poses', celdas: ['poses (gesto)', `<code>${k}</code>`, esc(`reloj ${e.reloj} · ` + Object.entries(e.canales).map(([c, v]) => `${c} ${canal(v)}`).join(' · '))] });

const FASES = [
    ['0', 'Diseño, esquemas, datos iniciales y contrato del CLI', 'nada', 'Opus (este PR)'],
    ['1', 'Servidor Node, formato y validador, cargador, layout táctil desde JSON, editor de layout, CLI resumen y validar', '<code>ui-layout.json</code> y etiquetas táctiles', 'Sonnet'],
    ['2', 'Juego dentro del Estudio, puente BroadcastChannel, recarga en vivo, CLI capturar', 'nada', 'Sonnet'],
    ['3', 'Textos y diálogos ES/EN (antes era la 4)', '<code>dialogos-datos.js</code>', 'Sonnet; Opus revisa'],
    ['4', 'Posiciones con gizmo TransformControls (antes era la 3), después de 6d', '<code>posiciones.json</code> en <code>amigos.js</code>', 'Sonnet'],
    ['5', 'Escenas y guiones (línea de tiempo)', '<code>ANIMACIONES</code>', 'Opus esquema + Sonnet'],
    ['6', 'Poses y animaciones (sliders, keyframes, osciladores)', '<code>GESTOS</code>', 'Opus evaluador + Sonnet'],
    ['7', 'Motor genérico (opcional, no ahora)', '—', '—']
];

export default {
    titulo: 'Estudio fase 0',
    h1: 'Estudio · fase 0 · diseño y contratos',
    estado: 'PR abierto, sin mergear, esperando tu revisión. Solo documentos, esquemas y datos iniciales: el juego no cambia y no se migró nada.',
    pr: { n: 44, url: 'https://github.com/Venjyy/venjy-page/pull/44' },
    meta: 'Rama <code>estudio-fase0</code> · parte de <code>main</code> (93af3f0, con el 6c-2 fusionado) · 2026-10-10',
    hecho: [
        '<code>estudio/DISENO.md</code>: qué es y qué no (sin ECS, GLTF, Babylon ni motor genérico), hallazgos del código, contrato de datos, fases 0-7 con la <b>fase 1 detallada</b> para ejecutarla directo, contrato del CLI y decisiones abiertas.',
        `Esquemas en <code>estudio/esquemas/</code>: comun, ui-layout, textos, posiciones, poses e indice (subconjunto de JSON Schema, validable sin dependencias).`,
        `Datos iniciales en <code>mundo/datos/</code> con los valores de hoy: ${Object.keys(L.supervivencia.normal.botones).length} elementos táctiles, ${Object.keys(T.textos.tactil).length} etiquetas, ${Object.keys(P.personas).length} amigos, ${Object.keys(G.poses).length} poses y ${Object.keys(G.gestos).length} gestos. El juego aún no los lee.`,
        'Sección «Contenido nuevo en JSON» en <code>CLAUDE.md</code>, sección «Estudio» y bitácora en <code>PENDIENTES.md</code>, y <code>.gitattributes</code> con LF para los JSON.'
    ],
    archivos: {
        nuevos: ['estudio/DISENO.md', 'estudio/esquemas/ (6 esquemas)', 'mundo/datos/ (indice, ui-layout, textos, posiciones, poses)', '.gitattributes', '.claude/artifacts/contenido-estudio0.mjs'],
        cambiados: ['CLAUDE.md', 'mundo/PENDIENTES.md']
    },
    revisar: [
        'El cambio de orden: textos (3) antes que posiciones (4).',
        'Giro de las personas en grados en <code>posiciones.json</code> (los huesos siguen en radianes, como <code>rig.md</code>).',
        'Qué hacer con <code>estudio/</code> en el sitio publicado: queda en solo lectura sin servidor, o se excluye del hosting.',
        'La regla de <code>CLAUDE.md</code>: lo nuevo va a JSON solo cuando el juego ya lee ese archivo. Hasta la fase 6, los gestos nuevos (por ejemplo, los de la ruleta de 7c-2) siguen en JS.'
    ],
    decisiones: [
        ['Textos antes que posiciones.', 'Los textos no tienen dependencias nuevas y son lo que más pesa (diálogos 54 KB + DIALOGOS.md 107 KB). Posiciones necesita el gizmo dentro del juego y toca amigos.js, que está cambiando en 6d.', true],
        ['Posiciones relativas a un ancla (lugar o escenario), nunca absolutas.', 'Los lugares se colocan con semilla y los puntos de mundo-datos.js generan el terreno y el mapa 2D; moverlos rompe la paridad.', false],
        ['El código es el valor por defecto y el JSON va encima; si falta una clave, archivo o JSON, el juego usa el código.', 'Así nada se rompe por un JSON y la migración puede ser gradual (solo lo que se toca).', false],
        ['El gizmo vive dentro del juego y se habla por BroadcastChannel.', 'El iframe tiene su propio Three.js. El canal sirve igual con el juego en otra pestaña y para el CLI capturar.', false],
        ['El editor de layout usa la capa táctil real sin cargar el mundo.', 'iniciarTactil se fuerza con ontouchstart: se ven los botones verdaderos al instante.', false],
        ['Servidor de desarrollo con escritura solo desde el mismo equipo, ETag e If-Match.', 'Evita que otra página escriba en disco y que el editor pise un cambio de un agente.', false],
        ['Giro en grados en posiciones.', 'Se edita a mano (90, 180 exactos); los huesos siguen en radianes.', true]
    ],
    secciones: [
        { h2: 'Fases', html: tabla(['Fase', 'Qué', 'Piloto que migra', 'Modelo'], FASES.map(f => `<tr>${f.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')) },
        { h2: 'Layout táctil de hoy, dibujado desde ui-layout.json', html: `<p class="meta">Rectángulos calculados con las reglas que aplicará la fase 1 (ancla, x, y, --pie). Acostado usa el perfil «baja» (alto ≤ 460 px). La misión va punteada porque su tamaño depende del texto.</p><div class="capturas">${svgLayout(390, 844, 'Celular vertical 390×844 · perfil normal')}${svgLayout(844, 390, 'Celular acostado 844×390 · perfil baja')}</div>` },
        { h2: 'Archivos de mundo/datos', html: tabla(['Archivo', 'Qué', 'Lo lee', 'Fase'], Object.entries(I.archivos).map(([k, a]) => `<tr><td><code>${k}.json</code></td><td>${esc(a.que)}</td><td>${a.lee || 'nadie aún (referencia)'}</td><td class="num">${a.fase}</td></tr>`).join('')) },
        { h2: 'CLI para el agente: cuánto ahorra', html: `<p class="meta">Estimado con ~3,5 bytes por token. El contenido en JS de la supervivencia más DIALOGOS.md pesa 474 KB (39 archivos).</p>` + tabla(['Para saber…', 'Hoy se lee', 'Con el CLI'], [
            ['Qué dice Pony en «Hablar»', 'dialogos-datos.js: 54 KB, ~15 000 tokens', '<code>resumen dialogos pony</code>: ~400 tokens'],
            ['Revisar textos de un bloque', 'DIALOGOS.md: 107 KB, ~30 000 tokens', '<code>resumen dialogos &lt;persona&gt;</code> o el editor'],
            ['Dónde está cada botón táctil', 'tactil.css + supervivencia.css: 42 KB', '<code>resumen ui-layout</code>: ~250 tokens'],
            ['Valores de un gesto', 'escenas-skin.js: 38 KB', '<code>resumen poses &lt;gesto&gt;</code>: 1 línea'],
            ['Si un cambio de datos está bien', 'Captura (~1 500 tokens)', '<code>validar</code> y <code>capturar --medir</code>: 1-3 líneas']
        ].map(f => `<tr>${f.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')) }
    ],
    pruebas: [
        'Los 5 JSON de <code>mundo/datos/</code> cumplen sus esquemas (validador de prueba con el subconjunto de <code>comun.schema.json</code>) y 8 casos inválidos fallan con el mensaje esperado (ancla «centro», botón desconocido, texto sin <code>en</code>, texto vacío, <code>dy</code> «arriba», canal «brazo», oscilador «cuadrada», ángulo 9).',
        `Paridad de gestos: los ${Object.keys(G.gestos).length} gestos de <code>poses.json</code>, evaluados con el esquema, dan exactamente lo mismo que <code>GESTOS</code> y <code>GESTOS_AMISTAD.puno</code>: 16 040 comparaciones, diferencia máxima 0. La fase 6 es viable.`,
        'Sin cambios de código: las pruebas de <code>mundo/tests/</code> no aplican.'
    ],
    tabla: {
        h2: 'Todo lo que hay en mundo/datos', unidad: 'entradas',
        intro: 'Una fila por botón, texto, persona, pose o gesto, leída de los JSON de este PR. Gestos: «~sin 0.3@5» es un oscilador de amplitud 0.3 y frecuencia 5.',
        cols: ['Archivo', 'Clave', 'Valores'],
        grupos: { 'ui-layout': 'Layout táctil', textos: 'Textos', posiciones: 'Posiciones', poses: 'Poses y gestos' },
        filas
    }
};
