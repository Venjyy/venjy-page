// Contenido del Artifact de 7j-0 (hora del mundo) para plantilla.mjs.
// Uso (desde la raíz del repo): node .claude/artifacts/plantilla.mjs .claude/artifacts/contenido-7j0.mjs <salida.html>
import { execFileSync } from 'node:child_process';
import { SEG_DIA } from '../../mundo/supervivencia/dia.js';
import { textoHora } from '../../mundo/supervivencia/reloj.js';
import { HORARIOS } from '../../mundo/supervivencia/horarios-datos.js';
const prueba = execFileSync('node', ['mundo/tests/hora.mjs'], { encoding: 'utf8' }).trim();
const tabla = (cab, f) => `<div class="tabla"><table><thead><tr>${cab.map(x => `<th>${x}</th>`).join('')}</tr></thead><tbody>${f}</tbody></table></div>`;
const fila = f => `<tr>${f.map(c => `<td>${c}</td>`).join('')}</tr>`;
const HORAS = [[0, 'Amanecer'], [SEG_DIA / 2, 'Mediodía'], [255, 'Tarde'], [SEG_DIA, 'Atardecer'], [SEG_DIA + 120, 'Medianoche']];

export default {
    titulo: 'Hora del mundo 7j0',
    h1: 'Bloque 7j-0 · Hora del mundo',
    estado: 'PR abierto, sin mergear. Sin probar en navegador.',
    pr: { n: 72, url: 'https://github.com/Venjyy/venjy-page/pull/72' },
    meta: 'Rama <code>hora-7j0</code> · parte de <code>origin/main</code> (con #71) · 2026-10-11',
    hecho: [
        '<b>Reloj del HUD</b> opcional («Mostrar la hora en pantalla» en los ajustes de la pausa, apagado de fábrica).',
        '<b>Pausa</b> con «Día 3 · 14:30» y <b>objeto Reloj</b>: al tenerlo en la mano muestra la hora en pantalla.',
        '<b>Panel de cada amigo</b>: «Horario: 08:00-18:00 en el campamento» (9 amigos, par ES/EN).',
        'Cooperativo sin tocar: la hora sale de <code>dia.t</code>, que ya fija el anfitrión.'
    ],
    archivos: {
        nuevos: ['mundo/supervivencia/reloj.js', 'mundo/supervivencia/horarios-datos.js', 'mundo/tests/hora.mjs', '.claude/artifacts/contenido-7j0.mjs'],
        cambiados: ['mundo/supervivencia/main.js', 'mundo/supervivencia/hablar.js', 'supervivencia.html', 'mundo/mundo.css', 'mundo/supervivencia/supervivencia.css', 'mundo/PENDIENTES.md', 'mundo/supervivencia/MAPA.md', 'CLAUDE.md', '.claude/skills/ahorro/SKILL.md', '.claude/skills/traspaso-chat/SKILL.md']
    },
    revisar: [
        '<b>1 hora = 25 s solo de media</b>: la hora sale de <code>horaDe</code> (como pidió el plan), así que de día una hora dura 30 s y de noche 20 s; el reloj siempre coincide con el sol.',
        '<b>No hay menú «Rendimiento» todavía</b> (es 7b-2): la casilla va en los ajustes de la pausa y se mueve después.',
        '<b>El Reloj no cambia en la mano 3D</b> (<code>mano.js</code> no se toca): la hora sale como texto abajo a la derecha.',
        '<b>Horarios son solo datos</b>: nadie se mueve por ellos hasta las rutinas de 6d etapa 2.'
    ],
    decisiones: [
        ['La hora sale de <code>horaDe</code> y no de una fórmula lineal.', 'Así 18:00 es el atardecer real del cielo.', true],
        ['Los horarios viven en JS, no en JSON.', 'El Estudio aún no los lee; se migran cuando algo los toque.', false],
        ['Effort junto al modelo en el traspaso.', 'Pedido del dueño: gastar menos.', false]
    ],
    secciones: [
        { h2: 'Hora según el momento del día', html: tabla(['Momento', 't (s)', 'Reloj'], HORAS.map(([t, n]) => fila([n, t, textoHora(t)])).join('')) },
        { h2: 'Horarios de los amigos', html: tabla(['Amigo', 'Horario', 'Lugar'], Object.entries(HORARIOS).map(([k, h]) => fila([k, `${h.de}:00-${h.a}:00`, h.lugar.es])).join('')) }
    ],
    pruebas: [
        `<code>node mundo/tests/hora.mjs</code>: ${prueba}. Cubre 06/12/18/00 h, formato, avance monótono, tramos, horarios contra <code>posiciones.json</code> y cableado.`,
        'Siguen verdes recetas, inventario, amistad, vida-amigos, estudio, paridad, facilidades, misiones, tienda, venjys, ping y caminos.'
    ]
};
