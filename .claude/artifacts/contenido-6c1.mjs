// Contenido del Artifact del bloque 6c-1 para plantilla.mjs (ejemplo de referencia: los datos y frases salen del código).
// Uso (desde la raíz del repo): CAPTURAS=<carpeta con las hojas> node .claude/artifacts/plantilla.mjs .claude/artifacts/contenido-6c1.mjs <salida.html>
import { pathToFileURL } from 'node:url';
globalThis.window ??= { addEventListener() {} };
const imp = p => import(pathToFileURL(`${process.cwd()}/${p}`).href);
const { NOMBRES_AMIGO: N } = await imp('mundo/supervivencia/misiones-datos.js');
const { relacion } = await imp('mundo/supervivencia/amistad.js');
const { REENCUENTROS, reencuentro } = await imp('mundo/supervivencia/reencuentros.js');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const DIR = process.env.CAPTURAS || 'mundo/capturas/6c';

const BV = [['hadad', 'Papas para el camino', 'pasa la bolsa de papas, pulgar arriba y visto bueno verde'], ['andy', 'El baile mal hecho', 'baile chueco, se lo enseñas y bailan sincronizados'],
    ['nacho', 'Carcajada contagiosa', 'se doblan de risa y se secan las lágrimas'], ['conejeros', 'Orejitas de conejo', 'selfie, orejitas, flash y Venjy mira la foto'],
    ['pony', 'Puño bajito', 'visera mirando lejos, puño bajito inclinado y empujoncito'], ['moises', 'Frío de Coyhaique', 'tirita, le frotas los hombros y chocan puños'],
    ['braulio', 'Choque y medio', 'cuenta los dedos, se asombra y chocan palmas con dos chispas'], ['boris', 'De copiloto a Linares', 'auto imaginario lado a lado, bache, secreto, abrazo y recuerdo'],
    ['lalo', 'Choque de botas', 'soplan las manos, saltitos, botas de lado, secreto, abrazo y recuerdo'], ['salonas', 'Commit en vivo', 'teclean, visto bueno, bajo de aire, secreto, abrazo y recuerdo'],
    ['lucho', 'El árbol de los primos', 'dibuja el árbol en el aire, lo borras, secreto, abrazo y recuerdo'], ['lona', 'Baile lento', 'de la mano meciéndose, abrazo, beso y corazones']];
const REL = { 1: '1 cordial', 2: '2', 3: '3', 4: 'pareja' };
const filasBV = [], filasTxt = [];
for (const [c, t, q] of BV) {
    const m = await imp(`mundo/supervivencia/bienvenidas/${c}.js`), g = m.bienvenida({});
    filasBV.push(`<tr><td>${N[c]}</td><td>${t}</td><td>${REL[relacion('venjy', c)]}</td><td class="num">${g.T.toFixed(1)} s</td><td>${q}</td></tr>`);
    for (const l of m.LINEAS) filasTxt.push({ g: c, celdas: [N[c], 'Bienvenida', l.q === 'j' ? 'Tú' : 'Venjy', esc(l.texto.es), esc(l.texto.en)] });
}
const filasRE = Object.entries(REENCUENTROS).map(([k, d]) => {
    const [a, b] = k.split('-'), g = reencuentro(a, b);
    for (const [q, t] of d.lineas) filasTxt.push({ g: a, celdas: [`${N[a]} - ${N[b]}`, 'Reencuentro', N[q], esc(t.es), esc(t.en)] });
    return `<tr><td>${N[a]} - ${N[b]}</td><td>${d.rel === 3 ? 'larga' : 'corta'}</td><td class="num">${g.T.toFixed(1)} s</td><td>${d.rel === 3 ? 'secreto, abrazo, recuerdo y risa' : `puños y broma: <code>${d.broma.gesto}</code>`}</td></tr>`;
}).join('');
const tabla = (cab, filas) => `<div class="tabla"><table><thead><tr>${cab.map(x => `<th>${x}</th>`).join('')}</tr></thead><tbody>${filas}</tbody></table></div>`;

export default {
    titulo: 'Bienvenidas y reencuentros 6c',
    h1: 'Bloque 6c-1 · Bienvenidas, reencuentros y motor',
    estado: 'PR abierto, sin mergear, esperando tu revisión. El Venjy del Inicio recibe a cada skin de amigo con su propio momento, y los amigos que se conocen se reencuentran, sin encadenar escenas.',
    pr: { n: 40, url: 'https://github.com/Venjyy/venjy-page/pull/40' },
    meta: 'Rama <code>amistad-6c</code> · parte de <code>main</code> con el diseño aprobado (85588f1) · 2026-10-10',
    hecho: [
        '12 bienvenidas del Venjy del Inicio, una por skin de amigo (todas menos Venjy), cada una con su momento propio hecho fusionando moldes.',
        '16 reencuentros entre amigos con relación 2 (corto: puños y broma) o 3 (largo: saludo secreto, abrazo y recuerdo). Las frases van por personaje: la misma escena sirve en las dos direcciones.',
        'Salen solas al acercarte (una vez por partida y por skin) con la regla «uno por lugar»; las demás de ese lugar, al hacer clic derecho. Con skin de Venjy no hay escenas nuevas.',
        'Tu clon, si está al lado, mira dos veces al empezar y se ríe al final.',
        'Motor listo para 6c-2: actores que se mueven y vuelven, clon como actor, 18 moldes nuevos con <code>fusion()</code>, efectos píxel y sonidos sintetizados (incluido el ping).',
        'Abrazo nuevo en todas las escenas (pedido tuyo): cada uno apoya la barbilla en el hombro del otro y mira por encima, con las cabezas una al lado de la otra (0,39 bloques corridas); ya no quedan nariz con nariz. Sin vaivén de lado a lado: la cabeza va directo al hombro (en 0,9 s) antes de juntar los cuerpos.',
        'La cámara ya no deja a un tercero en primer plano (también mejora los saludos y momentos de 6b).',
        '<code>/amistad bienvenidas</code>, <code>/amistad reencuentros</code>, <code>/amistad pony-bienvenida</code> y <code>/amistad pony-andy</code> (con <code>/gamemode devenjy</code>).'
    ],
    archivos: {
        nuevos: ['mundo/supervivencia/moldes.js', 'mundo/supervivencia/reencuentros.js', 'mundo/supervivencia/bienvenidas/ (12 + comun.js)', 'mundo/capturas/6c/'],
        cambiados: ['mundo/supervivencia/escena-amistad.js', 'mundo/supervivencia/camaras.js', 'mundo/supervivencia/escenas-skin.js', 'mundo/supervivencia/main.js', 'mundo/supervivencia/comandos-dev.js', 'mundo/supervivencia/sonidos.js', 'mundo/tests/amistad.mjs', 'mundo/DIALOGOS.md', 'mundo/PENDIENTES.md', '.claude/skills/animaciones-minecraft/ (capturar, grabar, planos)', '.claude/launch.json']
    },
    revisar: [
        'El ritmo: las escenas quedaron más largas que lo estimado (bienvenidas 17-28 s, reencuentros ~13 y ~21 s) para que las frases se alcancen a leer. Se acorta bajando <code>durLinea</code> en <code>reencuentros.js</code>.',
        'El baile de Andy y el auto de Boris se juzgan mejor en movimiento que en las hojas (medido: Boris y Venjy sí quedan lado a lado; solo giran la cabeza a quien habla).',
        'Objetos chicos que pueden crecer: bolsa de papas, celular, orejitas.',
        '«Uno por lugar» ahora vale también para las escenas de skin y las conversaciones con skin de Venjy (antes Hadad, Andy y Nacho podían encadenarse).',
        'En el escenario de Salonas un poste de madera a veces queda en el borde del cuadro.'
    ],
    decisiones: [
        ['Las frases duran lo que se alcanza a leer (1,4 s + 0,03 s por letra, entre 2,3 y 3,6).', 'Con 6-7 frases de 50-70 letras no se leen en ~2 s; por eso las escenas quedan más largas que en el diseño.', true],
        ['«Uno por lugar» es por skin y vale para toda escena automática.', 'Presentarte con otra skin es otra persona que llega. En 6c-2 la escena de grupo tomará la fogata, la atalaya y el iglú.', true],
        ['El jugador se para del lado con más espacio y la cámara descarta planos con un tercero en primer plano.', 'En la fogata, Nacho o Hadad sentados tapaban medio cuadro.', false],
        ['Tu clon actúa sin frases: mira y se ríe.', 'Las frases aprobadas de los reencuentros son de los dos amigos; queda listo como actor para 6c-2.', false],
        ['En «Puño bajito» Venjy se inclina y la distancia es 1,64.', 'Pony tiene la misma escala que los demás en el juego; así los puños se juntan.', false],
        ['Pony la hizo el orquestador como ejemplo; las otras 11, tres Haiku en paralelo con un validador por módulo.', 'Regla de la skill (Haiku primero). No hizo falta Sonnet; el orquestador corrigió a Nacho y verificó Lucho, Boris y los reencuentros.', false]
    ],
    secciones: [
        { h2: 'Bienvenidas y reencuentros', html: `<h3>Las 12 bienvenidas</h3>${tabla(['Tu skin', 'Bienvenida', 'Relación', 'Dura', 'Momento propio'], filasBV.join(''))}<h3>Los 16 reencuentros</h3>${tabla(['Pareja', 'Escena', 'Dura', 'Qué pasa'], filasRE)}` }
    ],
    medidas: {
        cols: ['', 'main', 'rama amistad-6c'],
        filas: [
            ['JS al abrir la página', '88 archivos, 2191 KB', '88 archivos, 2198 KB (+7 KB)'],
            ['Carga de la página (load)', '753-1828 ms', '769-1547 ms (ruido)'],
            ['Entrar a un mundo nuevo', '570-639 ms', '566-605 ms'],
            ['Cuadro mediano (p90), 4 medidas', '3,6-4,9 ms (4,7-7,2)', '4,1-4,7 ms (5,4-6,2) (ruido)'],
            ['Al empezar un reencuentro la primera vez', '—', '+4 archivos, 77 KB, 1,5-2,5 s en local'],
            ['Cuadro mediano durante el reencuentro Hadad-Nacho', '—', '5,3-5,4 ms (6,3-7,1)'],
            ['Una bienvenida', '—', '3-5 KB + comun.js 2,5 KB']
        ],
        como: 'Chromium headless con SwiftShader, 1280×720, servidor local sin caché, junto a la fogata de día, mundo nuevo; worktree de main contra la rama, en orden alternado. «Cuadro» = trabajo del bucle del juego por cuadro (duración del callback), porque headless limita el refresco a ~10 cuadros por segundo.'
    },
    pruebas: [
        '<code>node mundo/tests/amistad.mjs</code>: 67611 comprobaciones OK. Nuevas: los 18 moldes y las fusiones, 12 bienvenidas (duración y frases según la relación, secreto, abrazo y recuerdo en relación 3, corazones en la pareja), exactamente 16 reencuentros en las dos direcciones y ninguno para los demás pares, frases y gestos que no se pisan, rangos de <code>rig.md</code>, disparo, frases únicas y sin emojis.',
        'Las demás de <code>mundo/tests/</code> (recetas, inventario, paridad, tienda, señal QR): OK.',
        'Los 155 textos (ES y EN) cotejados palabra por palabra con <code>DISENO-6c.md</code>: 0 distintos.',
        'En el juego: llegando a la fogata con skin de Hadad sale solo el reencuentro con Nacho y nada se encadena; Saltar a la mitad deja a Nacho sentado en su sitio, sin cine y con el jugador libre; <code>/amistad pony-andy</code> pone la skin de Pony y corre el reencuentro. Sin errores de página.'
    ],
    capturas: [
        { h2: 'Capturas de las bienvenidas', dir: DIR, items: BV.map(([c, t]) => [`bienvenida-${c}.jpg`, `${N[c]} · «${t}»: seis momentos de la escena con su skin.`]) },
        { h2: 'Capturas de los reencuentros', dir: DIR, items: [
            ['reencuentro-pony-andy.jpg', 'Pony y Andy (largo): brazos arriba, saludo secreto, abrazo y recuerdo; sin nadie de la fogata en primer plano.'],
            ['reencuentro-hadad-andy.jpg', 'Hadad y Andy con skin de Hadad: el clon (Hadad sentado) mira la escena.'],
            ['reencuentro-pony-salonas.jpg', 'Pony y Salonas (corto) en el escenario: puños y el empujón del final.']] }
    ],
    tabla: {
        h2: 'Todas las frases nuevas', unidad: 'frases',
        intro: 'Bienvenidas (Venjy y Tú, con la skin del amigo) y reencuentros (por personaje). Filtra por la skin o el primer amigo de la pareja.',
        cols: ['Escena', 'Tipo', 'Habla', 'ES', 'EN'],
        grupos: Object.fromEntries(['pony', 'hadad', 'andy', 'nacho', 'conejeros', 'braulio', 'salonas', 'moises', 'lalo', 'boris', 'lucho', 'lona'].map(c => [c, N[c]])),
        filas: filasTxt
    }
};
