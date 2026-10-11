// Contenido del Artifact del bloque 7c-1 (cuerpo, mano y red) para plantilla.mjs; bits, poses y mediciones salen del código.
// Uso (desde la raíz del repo): node .claude/artifacts/plantilla.mjs .claude/artifacts/contenido-7c1.mjs <salida.html>
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
const imp = p => import(pathToFileURL(`${process.cwd()}/${p}`).href);
const P = await imp('mundo/supervivencia/pose-jugador.js');
const tabla = (cab, f) => `<div class="tabla"><table><thead><tr>${cab.map((x, i) => `<th${i ? ' class="num"' : ''}>${x}</th>`).join('')}</tr></thead><tbody>${f}</tbody></table></div>`;
const QUE = { AGARRE: 'agachado (ya existía)', MUERTO: 'muerto (ya existía)', CORRE: 'corre', GOLPE: 'golpeó desde el último tick', COME: 'come', TENSA: 'tensa el arco', BLOQUEA: 'bloquea con el escudo', AGACHADO: 'agachado (ya existía)' };
const filasF = Object.entries(P.F).map(([k, v]) => `<tr><td><code>${k}</code></td><td class="num">${v}</td><td>${QUE[k] || ''}</td></tr>`).join('');
// Golpe muestreado de la función real
const e = P.crearEstado(); P.avanzar(e, { mov: 0, golpe: true }, 0);
const filasGolpe = [0, 0.075, 0.15, 0.225, 0.29].map((t, i, l) => { if (i) P.avanzar(e, { mov: 0 }, t - l[i - 1]); const a = P.angulos(e, { mov: 0 }); return `<tr><td class="num">${t.toFixed(2)} s</td><td class="num">${a.bDx.toFixed(2)}</td><td class="num">${a.bDz.toFixed(2)}</td><td class="num">${a.ry.toFixed(2)}</td></tr>`; }).join('');
const med = n => JSON.parse(fs.readFileSync(`mundo/capturas/7c1/medicion-7c1-${n}.json`, 'utf8')).medicion;
const p50 = n => med(n).map(s => s.p50.toString().replace('.', ',')).join(' / ');

export default {
    titulo: 'Cuerpo y mano 7c-1',
    h1: 'Bloque 7c-1 · Cuerpo, mano y red',
    estado: 'PR abierto, sin mergear. El golpe, correr y lo que tienes en la mano se ven en primera persona, en F5 y en los demás jugadores, sin mensajes nuevos.',
    pr: { n: 54, url: 'https://github.com/Venjyy/venjy-page/pull/54' },
    meta: 'Rama <code>cuerpo-7c1</code> · parte de <code>main</code> con #51 (7e) y #52 (Estudio fase 3) · 2026-10-10 · Opus + Haiku',
    hecho: [
        '<b>Golpe visible (3)</b>: arco del brazo derecho de 0,3 s al estilo Minecraft; sube adelante, cruza al pecho y el torso acompaña. Minar seguido encadena golpes.',
        '<b>Mano que agarra (4)</b>: en primera persona se ve siempre tu brazo con la skin y el objeto va en la mano (espada, pan, bloque).',
        '<b>Correr (5)</b>: cuerpo inclinado 0,2 rad, más amplitud y frecuencia; en primera persona el campo de visión sube 10 % suave y la mano se mece más.',
        '<b>Objeto en la mano del cuerpo (6)</b>: en F5 y en los demás jugadores, en cada mano; también comer, arco tensado, escudo y sentado (listo para 7g).',
        '<b>Una sola fuente</b>: <code>pose-jugador.js</code> lo usan <code>camaras.js</code> y <code>coop.js</code>; las escenas y la ronda del iglú siguen mandando sobre el cuerpo.',
        '<b>Red</b>: todo dentro del mensaje <code>p</code> que ya iba a 5 Hz: bits nuevos en <code>f</code> e <code>i</code>/<code>i2</code> (id en cada mano) solo al cambiar y cada 5 s.'
    ],
    archivos: {
        nuevos: ['mundo/supervivencia/pose-jugador.js', 'mundo/tests/pose-jugador.mjs', 'mundo/capturas/7c1/ (7 capturas y 4 mediciones)', '.claude/artifacts/contenido-7c1.mjs'],
        cambiados: ['mundo/supervivencia/mano.js', 'mundo/supervivencia/camaras.js', 'mundo/supervivencia/coop.js', 'mundo/supervivencia/main.js', 'mundo/PENDIENTES.md', 'mundo/supervivencia/MAPA.md', '.claude/skills/animaciones-minecraft/referencia/rig.md']
    },
    revisar: [
        '<b>Las poses en el juego</b>: el golpe con F5 (de frente y de lado) y correr. Las capturas están en <code>mundo/capturas/7c1/</code>; el panel de ayuda de la consola tapa una esquina en las de F5.',
        '<b>Bloque en primera persona</b>: se ve grande, como antes, y tapa casi toda la mano; el brazo asoma abajo a la derecha. Dime si lo achico.',
        '<b>Correr</b>: amplitud 1,0 (caminar 0,8). Con 1,1 se notaba más, pero pasa el tope de piernas de la prueba. Tú decides.',
        '<b>Con amigos reales</b>: dos jugadores se probaron con Playwright en el mismo equipo; falta verlo con otra gente.'
    ],
    decisiones: [
        ['El estado del cuerpo va en <code>p</code>, sin mensajes nuevos.', 'El respaldo de Supabase cobra por mensaje; <code>p</code> ya sale a 5 Hz y suma ~4 bytes.', false],
        ['Un golpe siempre sale aunque estés quieto.', 'Si no, minando quieto el otro vería un golpe por segundo; cuesta como caminar (≤ 5 por segundo).', false],
        ['El id de la mano se repite en los 2 ticks siguientes al cambio.', 'El canal de <code>p</code> no reintenta; sin eso un cambio perdido tardaba hasta 5 s en verse.', false],
        ['También viaja la otra mano (<code>i2</code>).', 'El escudo suele ir en la otra mano; sin ella el brazo se levantaba vacío al bloquear.', true],
        ['El arco y el escudo cruzan el brazo con <code>z</code>, no con <code>y</code>.', 'Haiku vio que con Euler XYZ girar en <code>y</code> solo retuerce el brazo; quedó anotado en <code>rig.md</code>.', false],
        ['Se instaló <code>playwright-core</code> global.', 'El panel del navegador estaba oculto y no dibujaba; lo autorizaste en el chat.', false]
    ],
    secciones: [
        { h2: 'Bits de f en el mensaje p', html: tabla(['Bit', 'Valor', 'Qué es'], filasF) },
        { h2: 'Golpe (de la función real)', html: '<p class="meta">Ángulos del brazo derecho y giro del torso (radianes) durante el golpe; dura ' + P.GOLPE_S + ' s.</p>' + tabla(['Tiempo', 'bDx', 'bDz', 'ry'], filasGolpe) }
    ],
    medidas: {
        cols: ['Caso', 'Antes', 'Después'],
        filas: [
            ['Cuadro p50, primera persona (campo / campamento / base)', p50('base-v0') + ' ms', p50('rama-v0') + ' ms'],
            ['Cuadro p50, F5 con pico en la mano', p50('base-v1') + ' ms', p50('rama-v1') + ' ms'],
            ['Costo de posar + luz, 9 cuerpos con objeto (Node)', '—', '!0,03 ms por cuadro'],
            ['Mensajes por segundo quieto (dos jugadores)', '~1', '!1,06']
        ],
        como: '<code>/medir romper</code> en Chromium sin ventana (Playwright) con render por software: entre tandas de la misma rama el p50 varía ±2 ms, así que no hay diferencia medible. El costo propio se midió aparte en Node.'
    },
    pruebas: [
        '<code>node mundo/tests/pose-jugador.mjs</code>: 128 combinaciones de <code>f</code> ida y vuelta, duración y forma del golpe, rangos de <code>rig.md</code> en más de 10 000 cuadros, correr contra caminar, objeto en la mano (crear una vez, cambiar, quitar, luz, limpiar para escenas).',
        'Todas las demás de <code>mundo/tests/</code> que se corrieron pasan (recetas, inventario, paridad, movimiento, retroceso, ping, amistad, venjys).',
        'Dos jugadores (<code>?disp=2</code>, canal directo): el otro ve el objeto en ambos sentidos, 3 de 3 golpes, correr (<code>f</code> 4) y comer (<code>f</code> 16); sin errores de consola.'
    ]
};
