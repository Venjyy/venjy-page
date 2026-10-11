// Contenido del Artifact del bloque 7b-2 (menú «Rendimiento») para plantilla.mjs.
// Uso (desde la raíz del repo): node .claude/artifacts/plantilla.mjs .claude/artifacts/contenido-7b2.mjs <salida.html>
export default {
    titulo: 'Menú Rendimiento 7b-2',
    h1: 'Bloque 7b-2 · Menú «Rendimiento» en la pausa',
    estado: 'PR abierto, sin mergear. La pausa de la supervivencia tiene una sección plegable «Rendimiento» con preajustes y ajustes sueltos; se guarda en el navegador.',
    pr: { n: 76, url: 'https://github.com/Venjyy/venjy-page/pull/76' },
    meta: 'Rama <code>rendimiento-7b2</code> · parte de <code>main</code> (con 7b-1) · 2026-10-11 · Sonnet',
    hecho: [
        '<b>Preajustes</b>: Rápido, Equilibrado (lo de antes) y Bonito. Si cambias algo a mano aparece «Personalizado».',
        '<b>Escala de render</b> de 0,5 a 1,5 (<code>setPixelRatio</code>); <b>partículas</b> todas / pocas / mínimas; <b>nubes</b> sí / no.',
        '<b>Personajes lejanos</b> (a más de 60 bloques) se actualizan 1 de cada 1, 2 o 4 cuadros con el tiempo acumulado, así no van más lentos. Nunca se saltan en escenas, interacciones ni vida entre amigos.',
        '<b>Límite de FPS</b> 30 / 60 / libre: a 144 Hz con límite 60 salen 60 y no 48; ahorra batería.',
        '<b>Distancia automática</b>: portada de <code>autoAjustar</code> del creativo. El slider es el máximo; baja y sube sola, y con límite de 30 FPS no baja por estar en 30.',
        '<b>Mostrar FPS</b> y <b>ms por cuadro</b> (mediana de los últimos 120 cuadros, la misma medida que <code>/medir romper</code>).'
    ],
    archivos: {
        nuevos: ['mundo/supervivencia/rendimiento.js', 'mundo/criaturas/lod.js', 'mundo/tests/rendimiento.mjs', 'mundo/capturas/7b2/menu-rendimiento.jpg'],
        cambiados: ['mundo/supervivencia/main.js', 'supervivencia.html', 'mundo/supervivencia/supervivencia.css', 'mundo/supervivencia/particulas.js', 'mundo/cielo.js', 'mundo/criaturas/npcs.js', 'mundo/criaturas/amigos.js', 'mundo/criaturas/venjy.js', 'mundo/criaturas/animales.js', 'mundo/PENDIENTES.md', 'mundo/supervivencia/MAPA.md']
    },
    revisar: [
        'Abrir la pausa en el celular: probar Rápido y ver si el juego se siente más fluido; la ganancia real está en la GPU y no se nota en el equipo de pruebas.',
        'Equilibrado (el predeterminado) deja a los personajes lejanos 1 de cada 2 cuadros. Mira si algún amigo lejano se ve entrecortado.',
        'Distancia automática en un equipo lento: debería bajar sola de a un chunk y mostrar «5/8» en la pausa.'
    ],
    decisiones: [
        ['Equilibrado = lo que había, salvo los personajes lejanos.', 'Quien no toque nada no ve cambios, salvo que los lejanos van 1 de cada 2 cuadros (antes personas todos y animales 1 de cada 4).', true],
        ['La distancia sigue en su slider de siempre.', 'El menú solo agrega lo nuevo; los preajustes la mueven.', false],
        ['Sin opción de sombras.', 'No hay sombras reales: la oclusión ambiental va en el mallado.', false],
        ['El creativo no cambia.', 'Sin menú, <code>LOD.salto</code> vale 1 y <code>LOD.animales</code> vale 4; solo se agregó <code>cielo.mostrarNubes</code>.', false]
    ],
    medidas: {
        cols: ['', 'main', 'Equilibrado', 'Rápido', 'Bonito'],
        filas: [
            ['Cuadro mediana (ms)', '2,7', '!2,5', '!2,5', '2,8'],
            ['Cuadro p95 (ms)', '4,1', '!3,2', '!3,2', '3,7'],
            ['Archivos al abrir', '111', '113', '113', '113'],
            ['KB al abrir', '2651', '2666', '2666', '2666']
        ],
        como: 'Navegador del panel de Claude, mundo nuevo parado, duración del callback del bucle en 6 s; el mismo método en origin/main y en la rama. En este equipo la CPU del bucle casi no cambia: la ganancia está en la GPU (escala, distancia).'
    },
    pruebas: [
        '<code>node mundo/tests/rendimiento.mjs</code> (nueva, 60 comprobaciones): normalización de lo guardado, preajustes, límite de FPS a 30/60/144/240 Hz, distancia automática, estadística de cuadros y personajes lejanos sin perder tiempo.',
        'Las 26 pruebas de <code>mundo/tests/</code> y <code>estudio/cli.mjs validar</code>: OK.'
    ],
    capturas: [{ h2: 'El menú en la pausa', dir: 'mundo/capturas/7b2', items: [
        ['menu-rendimiento.jpg', 'Sección «Rendimiento» abierta en la pausa (ancho de celular).']
    ] }]
};
