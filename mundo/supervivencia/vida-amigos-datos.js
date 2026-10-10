// =========================================================
// VENJY · Supervivencia · Vida entre amigos (bloque 6d, etapa 1): las interacciones
// Charlas cortas con bromas y gestos entre los que ya están juntos, sin el jugador: Hadad, Andy y Nacho en la fogata
// (Fortnite y Discord hasta tarde; Andy y Nacho hacen juntos los trabajos de la U; la foto de Hadad con papas fritas)
// y Lalo y Moisés en el iglú (mejores amigos, viven juntos, se conocen de Coyhaique). Notas del dueño: tabla de
// relaciones de mundo/PENDIENTES.md. Textos para revisar en mundo/DIALOGOS.md («Vida entre amigos»).
// Lo carga vida-amigos.js con import() la primera vez que te acercas. Cada guion: { id, titulo, T, lineas, pista, gestos }
// (formato de grupos/comun.js: frases una tras otra con durLinea; pista[q] = [[gesto, desde, hasta]]).
// Sentados: Hadad y Nacho (troncos) y Moisés (suelo): sus gestos solo mueven brazos, cabeza y torso.
// =========================================================
import { crearGuion, cerrar, t, MOLDES, GESTOS_GRUPO } from './grupos/comun.js';
import { GESTOS } from './escenas-skin.js';
import * as THREE from '../../vendor/three.module.js';

export const GESTOS_SKIN = GESTOS;

// Gestos propios de estas interacciones (firma de los moldes: (u, t, info) -> metas de rig.md)
export const PROPIOS = {
    // Ronca dormido: la cabeza cae atrás y a un lado, sube y baja un poco con cada ronquido (1,2 s por ciclo)
    ronca: (u, t) => { const s = Math.sin(t * 5.236); return { cx: -0.3 + s * 0.1, cz: 0.16 + s * 0.03, y: s * 0.02, rz: 0.05, bDx: 0.15 + s * 0.03, bDz: 0.04, bIx: 0.15 - s * 0.03, bIz: -0.04 }; },
    // Se busca en los bolsillos: manos a los costados de las caderas, palmaditas alternadas, mira abajo y a los lados
    palpa: (u, t) => { const s = Math.sin(t * 14); return { bDx: -0.2 + s * 0.1, bDz: -0.15, bIx: -0.2 - s * 0.1, bIz: 0.15, cx: 0.35, cy: Math.sin(t * 1.6) * 0.6 }; },
    // Pulgar arriba orgulloso: brazo derecho adelante a la altura del pecho, un rebote al inicio, cabeza ladeada (sentado: solo brazos y cabeza)
    pulgar: (u, t) => { const reb = u < 0.3 ? Math.sin(u / 0.3 * Math.PI) : 0; return { bDx: -1.0 - reb * 0.25 + Math.sin(t * 2) * 0.03, bDz: 0.35, cz: 0.12 }; },
};

// Efectos de los gestos propios: mientras dura `ronca`, una nubecita con «Z» sube desde la cabeza (tres a destiempo,
// crecen y se desvanecen). La llama vida-amigos.js cada cuadro con el peso del gesto (0 = se esconde).
let texZ = null;
function texturaZ() {
    if (texZ) return texZ;
    const c = document.createElement('canvas'); c.width = c.height = 12;
    const x = c.getContext('2d');
    const nube = ['....####....', '..########..', '.##########.', '############', '############', '############', '############', '.##########.', '..########..', '....####....'];
    nube.forEach((f, j) => { for (let i = 0; i < 12; i++) if (f[i] === '#') { x.fillStyle = '#f4f6fa'; x.fillRect(i, j + 1, 1, 1); } });
    x.fillStyle = '#2c4a8c';
    for (const [i, j] of [[3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [7, 4], [6, 5], [5, 6], [4, 7], [3, 8], [4, 8], [5, 8], [6, 8], [7, 8], [8, 8]]) x.fillRect(i, j, 1, 1);
    texZ = new THREE.CanvasTexture(c); texZ.magFilter = texZ.minFilter = THREE.NearestFilter; texZ.colorSpace = THREE.SRGBColorSpace;
    return texZ;
}
const zzz = new Map();
export function efectos(n, nombre, peso, t) {
    let e = zzz.get(n);
    if (nombre !== 'ronca' || peso <= 0.01) { if (e) e.g.visible = false; return; }
    if (typeof document === 'undefined') return;
    if (!e) {
        const g = new THREE.Group();
        const sp = [0, 1, 2].map(() => { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: texturaZ(), transparent: true, depthWrite: false })); g.add(m); return m; });
        n.p.g.add(g);
        e = { g, sp };
        zzz.set(n, e);
    }
    e.g.visible = true;
    e.sp.forEach((m, i) => {
        const f = (t * 0.55 + i / 3) % 1; // cada una tarda ~1,8 s en subir
        m.position.set(-0.25 - f * 0.45, 2.25 + f * 0.95, 0.1);
        m.scale.setScalar(0.2 + f * 0.25);
        m.material.opacity = peso * Math.sin(Math.PI * f);
    });
}

// Quien habla gesticula en los huecos (relleno) y los demás asienten de a ratos
function rellenar(g) {
    for (const l of g.lineas) {
        if (l.q === 'ambos') continue;
        g.ges(l.q, 'habla', l.a, l.a + l.d, true);
    }
    return g;
}
const fin = (g, id, titulo) => ({ id, titulo, ...cerrar(rellenar(g), { gestos: { ...MOLDES, ...GESTOS_GRUPO, ...PROPIOS } }) });

// ---------------------------------------------------------
// Fogata: Hadad (sentado, al oeste), Nacho (sentado, al este) y Andy (de pie, al sur)
// ---------------------------------------------------------
function informe() {
    const g = crearGuion();
    const a = g.di('andy', t('Nacho, ¿cuándo entregamos el informe de redes?', 'Nacho, when are we handing in the networks report?'));
    g.ges('andy', 'tu', a.a + 0.2, a.a + 1.6);
    const b = g.di('nacho', t('El viernes. Yo hago la intro y tú los gráficos.', 'Friday. I do the intro and you do the charts.'));
    g.ges('nacho', 'yo', b.a + 0.1, b.a + 1.2); g.ges('nacho', 'tu', b.a + 1.4, g.fin(b));
    const c = g.di('hadad', t('¿Y el Pony no estaba en su grupo?', "Wasn't Pony in your group?"));
    g.ges('hadad', 'rasca', c.a + 0.2, g.fin(c));
    const d = g.di('andy', t('Estaba. Nos webió todo el semestre.', 'He was. He messed around all semester.'));
    g.ges('andy', 'ojos', d.a + 0.3, g.fin(d));
    const e = g.di('nacho', t('Ahora somos dos y rendimos el doble.', 'Now there are two of us and we get twice as much done.'));
    g.ges('andy', 'asiente', e.a, g.fin(e));
    const f = g.di('hadad', t('Ese grupo de dos es el mejor de la U.', "That group of two is the best one at uni."));
    g.ges('nacho', 'risa', f.a + 0.6, g.fin(f) + 0.4); g.ges('andy', 'risa', f.a + 0.6, g.fin(f) + 0.4);
    return fin(g, 'informe', t('El informe de la U', 'The uni report'));
}
function discord() {
    const g = crearGuion();
    const a = g.di('hadad', t('¿Quién se quedó dormido anoche en el Discord?', 'Who fell asleep on Discord last night?'));
    g.ges('hadad', 'habla', a.a, g.fin(a));
    const b = g.di('andy', t('El Nacho. Se escuchaba roncar por el micrófono.', 'Nacho. You could hear him snoring on the mic.'));
    g.ges('andy', 'ronca', b.a + 0.2, g.fin(b));
    const c = g.di('nacho', t('Mentira, estaba pensando la jugada.', 'Lies, I was planning the play.'));
    g.ges('nacho', 'yo', c.a + 0.1, g.fin(c));
    const d = g.di('hadad', t('Pensando con ronquidos, clarito.', 'Planning with snores, sure.'));
    g.ges('andy', 'risa', d.a + 0.5, g.fin(d) + 0.3);
    const e = g.di('andy', t('Igual ganamos esa partida sin ti.', 'We still won that match without you.'));
    g.ges('nacho', 'rasca', e.a + 0.3, g.fin(e));
    const f = g.di('nacho', t('¿Ven? Mi plan funcionó.', 'See? My plan worked.'));
    g.ges('nacho', 'brazosArriba', f.a + 0.2, g.fin(f)); g.ges('hadad', 'risa', f.a + 0.8, g.fin(f) + 0.4);
    return fin(g, 'discord', t('Dormido en el Discord', 'Asleep on Discord'));
}
function papas() {
    const g = crearGuion();
    const a = g.di('nacho', t('Hadad, otra vez te mandaron la foto de las papas fritas.', 'Hadad, someone sent the potato chips photo again.'));
    g.ges('nacho', 'tu', a.a + 0.3, a.a + 1.8);
    const b = g.di('hadad', t('Esa foto la hizo una IA, yo nunca posé.', 'An AI made that photo, I never posed.'));
    g.ges('hadad', 'yo', b.a + 0.1, b.a + 1.3);
    const c = g.di('andy', t('Igual te queda bien el comercial.', 'The ad still suits you, though.'));
    g.ges('andy', 'risa', g.fin(c) - 0.8, g.fin(c) + 0.4);
    const d = g.di('hadad', t('Si me pagan en papas, firmo altiro.', "If they pay me in chips, I'll sign right away."));
    g.ges('hadad', 'pulgar', d.a + 0.2, g.fin(d));
    const e = g.di('nacho', t('Embajador oficial de las papas de bolsa.', 'Official ambassador of bagged chips.'));
    g.ges('nacho', 'risa', e.a + 0.5, g.fin(e) + 0.4); g.ges('andy', 'risa', e.a + 0.8, g.fin(e) + 0.4);
    return fin(g, 'papas', t('El embajador de las papas', 'The chips ambassador'));
}
function baileBus() {
    const g = crearGuion();
    const a = g.di('andy', t('Miren el baile nuevo que me aprendí.', 'Check out the new dance I learned.'));
    g.ges('andy', 'baile', g.fin(a) - 0.6, g.fin(a) + 2.6);
    g.s += 2.2;
    const b = g.di('nacho', t('Andy, eso parece un calambre.', 'Andy, that looks like a cramp.'));
    g.ges('nacho', 'risa', b.a + 0.4, g.fin(b));
    const c = g.di('hadad', t('Guárdalo para cuando ganemos, no para la fogata.', 'Save it for when we win, not for the campfire.'));
    g.ges('hadad', 'tu', c.a + 0.3, g.fin(c));
    const d = g.di('andy', t('En la fogata también se gana, Hadad.', 'You can win at the campfire too, Hadad.'));
    g.ges('andy', 'baile', g.fin(d) - 0.4, g.fin(d) + 1.8);
    g.s += 1.5;
    const e = g.di('nacho', t('Lo voy a subir al grupo de los Tomatitos.', "I'm posting it in the Tomatitos group."));
    g.ges('nacho', 'celular', e.a, g.fin(e) + 0.4); g.ges('hadad', 'risa', e.a + 0.6, g.fin(e) + 0.4);
    return fin(g, 'baile', t('El baile del calambre', 'The cramp dance'));
}
function malvaviscos() {
    const g = crearGuion();
    const a = g.di('nacho', t('¿Alguien trajo malvaviscos para la fogata?', 'Did anyone bring marshmallows for the fire?'));
    g.ges('nacho', 'habla', a.a, g.fin(a));
    const b = g.di('hadad', t('No. Traje papas fritas.', 'No. I brought potato chips.'));
    g.ges('hadad', 'yo', b.a + 0.1, g.fin(b));
    const c = g.di('andy', t('Obvio que trajiste papas fritas.', 'Of course you brought potato chips.'));
    g.ges('andy', 'rasca', c.a + 0.2, g.fin(c)); g.ges('nacho', 'risa', c.a + 0.8, g.fin(c) + 0.4);
    const d = g.di('hadad', t('¿Y si las tostamos? Papas a la brasa.', 'What if we toast them? Fire-roasted chips.'));
    g.ges('hadad', 'habla', d.a, g.fin(d));
    const e = g.di('nacho', t('Eso no existe, pero yo me lo como.', "That's not a thing, but I'd eat it."));
    g.ges('nacho', 'asiente', e.a + 0.2, g.fin(e)); g.ges('andy', 'risa', e.a + 0.6, g.fin(e) + 0.4);
    return fin(g, 'malvaviscos', t('Papas a la brasa', 'Fire-roasted chips'));
}

// ---------------------------------------------------------
// Iglú: Moisés (sentado en el suelo, con el bong) y Lalo (de pie, apoyado, con el pito)
// ---------------------------------------------------------
function loza() {
    const g = crearGuion();
    const a = g.di('moises', t('Lalo, ¿a quién le toca lavar la loza en la casa?', "Lalo, whose turn is it to do the dishes at home?"));
    g.ges('moises', 'tu', a.a + 0.3, a.a + 1.8);
    const b = g.di('lalo', t('A ti, yo la lavé el martes, ahya.', 'Yours, I did them on Tuesday, ahya.'));
    g.ges('lalo', 'yo', b.a + 0.1, g.fin(b));
    const c = g.di('moises', t('El martes lavaste una taza, hermano.', 'On Tuesday you washed one mug, bro.'));
    g.ges('moises', 'mano', c.a + 0.2, g.fin(c));
    const d = g.di('lalo', t('Una taza bien lavada vale por toda la loza.', 'One well-washed mug counts for all the dishes.'));
    g.ges('lalo', 'habla', d.a, g.fin(d));
    const e = g.di('ambos', t('Jajajaja.', 'Hahahaha.'));
    g.ges('moises', 'risa', e.a, g.fin(e) + 0.3); g.ges('lalo', 'risa', e.a, g.fin(e) + 0.3);
    return fin(g, 'loza', t('La loza de la casa', 'The dishes at home'));
}
function nevazon() {
    const g = crearGuion();
    const a = g.di('lalo', t('¿Te acordai cuando nevó tanto que no hubo clases en Coyhaique?', 'Remember when it snowed so much there was no school in Coyhaique?'));
    g.ges('lalo', 'recuerda', a.a + 0.2, g.fin(a));
    const b = g.di('moises', t('Hicimos un mono de nieve más alto que el Venjy.', 'We built a snowman taller than Venjy.'));
    g.ges('moises', 'brazosArriba', b.a + 0.4, b.a + 1.8);
    const c = g.di('lalo', t('Y al otro día era puro charco.', 'And the next day it was just a puddle.'));
    g.ges('lalo', 'rasca', c.a + 0.3, g.fin(c));
    const d = g.di('moises', t('Como todo en la vida, hermano. Ahya.', 'Like everything in life, bro. Ahya.'));
    g.ges('moises', 'asiente', d.a + 0.2, g.fin(d)); g.ges('lalo', 'asiente', d.a + 0.4, g.fin(d));
    const e = g.di('lalo', t('Qué profundo. Pásame el bong.', 'So deep. Pass me the bong.'));
    g.ges('lalo', 'tu', e.a + 0.2, g.fin(e)); g.ges('moises', 'risa', e.a + 0.8, g.fin(e) + 0.4);
    return fin(g, 'nevazon', t('El monito de nieve', 'The little snowman'));
}
function encendedor() {
    const g = crearGuion();
    const a = g.di('lalo', t('Oye, ¿y el encendedor? Lo tenía recién.', 'Hey, where is the lighter? I just had it.'));
    g.ges('lalo', 'palpa', a.a + 0.2, g.fin(a));
    const b = g.di('moises', t('Lo tienes en la mano, Lalo.', "It's in your hand, Lalo."));
    g.ges('moises', 'tu', b.a + 0.2, g.fin(b));
    const c = g.di('lalo', t('... Ah. Sí. Ahya.', '... Oh. Yeah. Ahya.'));
    g.ges('lalo', 'sorpresa', c.a + 0.1, g.fin(c));
    const d = g.di('ambos', t('¡Jajajajaja!', 'Hahahahaha!'));
    g.ges('moises', 'risa', d.a, g.fin(d) + 0.5); g.ges('lalo', 'risa', d.a, g.fin(d) + 0.5);
    return fin(g, 'encendedor', t('El encendedor perdido', 'The lost lighter'));
}
function hermanos() {
    const g = crearGuion();
    const a = g.di('moises', t('Oye Lalo, gracias por ser buen compañero de casa.', 'Hey Lalo, thanks for being a good roommate.'));
    g.ges('moises', 'yo', a.a + 0.3, g.fin(a));
    const b = g.di('lalo', t('Ya po, no te pongai sentimental.', "Come on, don't get all sentimental."));
    g.ges('lalo', 'mano', b.a + 0.2, g.fin(b));
    const c = g.di('moises', t('Es el humo, me pone sensible.', 'It is the smoke, it makes me soft.'));
    g.ges('moises', 'rasca', c.a + 0.3, g.fin(c));
    const d = g.di('lalo', t('Igual te quiero, hermano. Desde los trece.', 'Love you anyway, bro. Since we were thirteen.'));
    g.ges('lalo', 'yo', d.a + 0.2, d.a + 1.4); g.ges('lalo', 'tu', d.a + 1.6, g.fin(d));
    const e = g.di('ambos', t('¡Yia de hermanos!', 'Brothers yia!'));
    g.ges('moises', 'brazosArriba', e.a, g.fin(e) + 0.3); g.ges('lalo', 'brazosArriba', e.a, g.fin(e) + 0.3);
    return fin(g, 'hermanos', t('Compañeros de casa', 'Roommates'));
}

// Los guiones se arman una sola vez (al cargar el módulo)
let cache = null;
export function guiones() {
    if (!cache) cache = { fogata: [informe(), discord(), papas(), baileBus(), malvaviscos()], iglu: [loza(), nevazon(), encendedor(), hermanos()] };
    return cache;
}
// Actores de cada lugar (las pruebas comprueban que cada guion use solo a estos)
export const ACTORES = { fogata: ['hadad', 'andy', 'nacho'], iglu: ['moises', 'lalo'] };
