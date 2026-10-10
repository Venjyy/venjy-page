// Contenido del Artifact del bloque 7f-1 (Venjys en la supervivencia) para plantilla.mjs; las frases salen del código.
// Uso (desde la raíz del repo): node .claude/artifacts/plantilla.mjs .claude/artifacts/contenido-7f1.mjs <salida.html>
import { pathToFileURL } from 'node:url';
globalThis.window ??= { addEventListener() {} };
const imp = p => import(pathToFileURL(`${process.cwd()}/${p}`).href);
const V = await imp('mundo/supervivencia/venjys-datos.js');
const { JEFES } = await imp('mundo/supervivencia/misiones-datos.js');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const G = { pista: 'Pista del lugar', bru: 'Brújula viva', prog: 'Progreso', skin: 'Tu skin', amistad: 'Tu amistad', carta: 'Carta diaria', hora: 'Hora y peligro', chiste: 'Chistes internos' };
const filas = [];
const add = (g, cuando, f) => filas.push({ g, celdas: [G[g], esc(cuando), esc(f.es), esc(f.en)] });
for (const [l, fs] of Object.entries(V.PISTAS)) fs.forEach(f => add('pista', `Venjy de «${l}»`, f));
for (const k of Object.keys(V.DESTINOS)) add('bru', `Hacia ${V.DESTINOS[k].es} (ejemplo: a 230 bloques al este)`, V.brujula(k, 230, 0));
add('prog', 'Sin misiones', V.progreso(0, new Set()).f);
for (const j of JEFES) {
    const antes = new Set(JEFES.slice(0, JEFES.indexOf(j)).map(x => x.id));
    add('prog', `Faltan 3 misiones (${j.id})`, V.progreso(j.requiere - 3, antes).f);
    add('prog', `Falta 1 misión (${j.id})`, V.progreso(j.requiere - 1, antes).f);
    add('prog', `Lista la pelea (${j.id})`, V.progreso(j.requiere, antes).f);
}
add('prog', 'Los tres jefes vencidos', V.progreso(36, new Set(JEFES.map(j => j.id))).f);
for (const [k, f] of Object.entries(V.SKIN)) add('skin', `Primera vez con skin base «${k}»`, f);
for (const c of V.DESTINATARIOS) for (const nv of [2, 3, 4]) add('amistad', `Tu mejor amistad ganada: ${V.PERSONA[c].en}, nivel ${nv}`, V.amistadFrase(c, nv));
for (const c of V.DESTINATARIOS) {
    add('carta', `Te la da, para ${V.PERSONA[c].en}`, V.CARTA_DA[c]);
    add('carta', `Ofrece (antes de dártela), para ${V.PERSONA[c].en}`, V.cartaOfrece(c));
    add('carta', `Recuerda a quién llevarla (${V.PERSONA[c].en})`, V.cartaTiene(c));
    add('carta', `Responde ${V.PERSONA[c].en} al recibirla`, V.CARTA_RESPUESTA[c]);
}
add('carta', 'Ya la repartió hoy', V.CARTA_HOY);
V.NOCHE.forEach(f => add('hora', 'De noche', f));
V.AMANECER.forEach(f => add('hora', 'Al amanecer (primeros 45 s del día)', f));
V.CHISTES.forEach(f => add('chiste', 'En cualquier Venjy', f));

export default {
    titulo: 'Venjys 7f-1',
    h1: 'Bloque 7f-1 · Qué dicen los Venjy en la supervivencia',
    estado: 'PR abierto, sin mergear. Los Venjy dejan de repetir el portafolio: eligen su frase según dónde estás, qué hiciste, tu skin, la hora y tus amistades. Textos por revisar.',
    pr: { n: 50, url: 'https://github.com/Venjyy/venjy-page/pull/50' },
    meta: 'Rama <code>venjys-7f1</code> · parte de <code>main</code> con #49 · 2026-10-10 · Sonnet',
    hecho: [
        '<b>Selector por prioridad</b> (<code>venjys-datos.js</code>, cargado con <code>import()</code> al primer globo): lo urgente que aún no se dijo (carta, reacción a tu skin, aviso de noche o amanecer) y luego lo menos dicho. Nunca la misma frase dos veces seguidas.',
        '<b>Ocho fuentes</b>: pista del lugar, brújula viva (distancia y rumbo reales), progreso hacia el siguiente jefe, reacción a tu skin (una vez por skin), reacción a tu mejor amistad ganada, carta diaria, hora y peligro, chistes internos.',
        '<b>Carta</b>: clic derecho al Venjy del correo te da una por día de juego; el destinatario rota entre los 12 amigos. Se entrega con un botón de «Hablar»: +2 de amistad (tope 2 por día), 1 esmeralda y una respuesta única. No se vende ni se craftea; se guarda con la partida.',
        '<b>El creativo no cambia</b>: en <code>criaturas/venjy.js</code> la frase puede ser una función y los dichos de siempre quedan en <code>n.dichos</code>.'
    ],
    archivos: {
        nuevos: ['mundo/supervivencia/venjys-datos.js', 'mundo/tests/venjys.mjs'],
        cambiados: ['mundo/criaturas/venjy.js', 'mundo/supervivencia/misiones.js', 'mundo/supervivencia/hablar.js', 'mundo/supervivencia/amistad.js', 'mundo/supervivencia/objetos.js', 'mundo/supervivencia/iconos.js', 'mundo/PENDIENTES.md', 'mundo/supervivencia/MAPA.md']
    },
    revisar: [
        'Los textos de la tabla de abajo: tono, chilenismos, y que nada ofenda a las personas reales (son tus amigos).',
        'Los chistes internos y las cartas de cada amigo, uno por uno.',
        'Que la brújula diga «No hay camino» solo en los lugares para explorar (los de la zona del portafolio dicen «Sigue el camino de tierra»).',
        'Probar la carta: clic derecho al Venjy del correo, llevarla al amigo del día y abrir «Hablar» con él.'
    ],
    decisiones: [
        ['La amistad que comenta el Venjy es solo la ganada.', 'Con skin de Venjy muchos amigos parten en Íntimo; comentar eso desde el inicio sonaría raro.', true],
        ['La reacción a la skin sale una vez por skin y por partida.', 'No se guarda en el archivo: al recargar, vuelve a comentarla una vez.', true],
        ['El destinatario de la carta rota por día de juego.', 'Determinista (día mod 12): en 12 días pasa por todos y no hace falta guardar un azar.', false],
        ['La carta sin entregar sigue valiendo.', 'Si no la entregas, no te da otra hasta que la entregues: no se acumulan.', false]
    ],
    medidas: {
        cols: ['', 'antes', 'después'],
        filas: [
            ['Archivos al abrir', '130', '130'],
            ['Archivo nuevo (con el primer globo)', '—', 'venjys-datos.js · 28 KB'],
            ['<code>venjys.actualizar</code> por llamada', '~0,018 ms', '~0,017 ms'],
            ['Cuadro mediano', 'sin medir', 'sin medir']
        ],
        como: 'Navegador del panel de Claude con el panel oculto: <code>requestAnimationFrame</code> no corre, así que no hay mediana de cuadro; se cronometraron 5 × 400 llamadas a <code>venjys.actualizar</code> cerca del Venjy del inicio, en main y en la rama.'
    },
    pruebas: [
        '<code>node mundo/tests/venjys.mjs</code>: 224 frases con par ES/EN, sin emojis ni restos de plantilla, únicas contra 1151 del resto del juego; cobertura de los 15 lugares y las 13 skins; brújula (norte −Z), progreso, selector (urgentes, rotación, sin repetir), carta y amistad.',
        'Las demás de <code>mundo/tests/</code> (amistad, tienda, recetas, inventario, vida-amigos, paridad, movimiento, retroceso, guardado-copia, luz-incremental, senal-qr, estudio): OK.'
    ],
    tabla: {
        h2: 'Todas las frases', unidad: 'frases',
        intro: 'Cada fila dice cuándo sale. Filtra por fuente.',
        cols: ['Fuente', 'Cuándo', 'ES', 'EN'],
        grupos: G,
        filas
    }
};
