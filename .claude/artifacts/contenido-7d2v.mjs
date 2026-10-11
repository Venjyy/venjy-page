// Contenido del Artifact de la verificación en navegador de 7d-2 para plantilla.mjs.
// Uso (desde la raíz del repo): CAPTURAS=<carpeta> node .claude/artifacts/plantilla.mjs .claude/artifacts/contenido-7d2v.mjs <salida.html>
const tabla = (cab, f) => `<div class="tabla"><table><thead><tr>${cab.map((x, i) => `<th${i ? ' class="num"' : ''}>${x}</th>`).join('')}</tr></thead><tbody>${f}</tbody></table></div>`;
const filas = [
    ['Huerto de Lalo', '18 trigo, 9 zanahoria, 17 papa, 1 agua; una vez por mundo'],
    ['Grava y horno', 'Puestos una vez por mundo (atalaya y gatera)'],
    ['Ovejas y gallinas', 'Cargadas junto al escenario y la atalaya'],
    ['Pesca (pony2)', 'Salmón ×1,5 y pez globo ×3'],
    ['Pistas (8)', 'Bloque real, rumbo en el seguimiento, rombo y flecha en el minimapa'],
    ['«?» de braulio2', '6 lugares en el mapa grande y flechas en el chico'],
    ['Monstruo de noche (6)', 'Aparece el mob de cada misión; trauco en bosque, esqueleto sobre arena']
].map(([a, b]) => `<tr><td>${a}</td><td>${b}</td></tr>`).join('');

export default {
    titulo: 'Verificación 7d-2',
    h1: 'Bloque 7d-2 · Verificación en navegador',
    estado: 'PR abierto, sin mergear. Todo lo de 7d-2 probado en un Chromium real; sin fallos del juego.',
    pr: { n: 63, url: 'https://github.com/Venjyy/venjy-page/pull/63' },
    meta: 'Rama <code>prueba-7d2</code> · 2026-10-11 · Sonnet',
    hecho: [
        'Mundo nuevo en Normal, misiones aceptadas por el diálogo real y cada facilidad comprobada.',
        '<code>facilidades</code> se agrega a <code>window.__venjy</code> para depurar.',
        '<code>PENDIENTES.md</code> anota qué quedó probado y qué no.'
    ],
    archivos: { nuevos: ['.claude/artifacts/contenido-7d2v.mjs'], cambiados: ['mundo/supervivencia/main.js', 'mundo/PENDIENTES.md'] },
    revisar: [
        'Un rombo a menos de ~15 bloques queda tapado por la flecha del jugador en el mapa chico (el texto «a 10 m» lo cubre).',
        'El huerto de Lalo queda en una terraza de la ladera del iglú.',
        '<b>Sin probar</b>: cooperativo (el invitado no coloca decorados) y el aviso «Sin pistas cerca» en navegador.'
    ],
    decisiones: [],
    secciones: [{ h2: 'Qué se comprobó', html: tabla(['Facilidad', 'Resultado'], filas) }],
    capturas: [{ h2: 'Capturas', dir: process.env.CAPTURAS, items: [
        ['v-huerto.jpg', 'Huerto de Lalo junto al iglú'],
        ['v-escenario.jpg', 'Ovejas y gallinas junto al escenario'],
        ['p-nacho2.jpg', 'Pista en el seguimiento de la misión'],
        ['mini-grande-nacho2.jpg', 'Mapa grande con la misión activa']
    ] }],
    pruebas: ['<code>node mundo/tests/facilidades.mjs</code>: 273 comprobaciones OK.', '<code>node mundo/tests/misiones.mjs</code>: OK.']
};
