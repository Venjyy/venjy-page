// =========================================================
// VENJY · Supervivencia · Escena de grupo: los Tomatitos en la fogata (bloque 6c-2)
// escena-amistad.js lo carga con import() al usarse (escenas-skin.js: llegas a la fogata con la skin de un Tomatito, o
// el botón «Saludo del grupo» en «Hablar»). grupo(base) devuelve el guion (formato en la cabecera de escena-amistad.js).
// Actores: Andy es el ancla ('n'), Hadad y Nacho actores extra (también tu clon si tu skin es de uno de ellos), tú 'j'.
// Guion (textos aprobados por el dueño, mundo/DIALOGOS.md; no se cambian sin preguntar):
//   llegada (2 frases, con tu momento propio) → suena el grupo de WhatsApp y todos miran el celular → «¿Quién mandó
//   doscientos stickers?» → Nacho confiesa → Hadad saca tomates con bigote para todos → 2 frases con el tomate en alto
//   (momento de tu skin) → «¡Por los Tomatitos!» (brindis con chispas) → tu cierre.
// Momentos: Venjy pone un tomate gigante en la fogata · Pony salta para alcanzar y Andy baja el suyo · Braulio brinda
//   con una concha y se la acerca al oído a Nacho (suena el mar) · Conejeros le dibuja la cara a su tomate (Tomás) ·
//   Hadad hace el espejo con su clon · Andy baila en estéreo con su clon · Nacho se dobla de risa con su clon.
// Todos se paran alrededor de la fogata (Hadad y Nacho dejan el tronco); tú, del lado de las carpas.
// =========================================================
import { t, r2, crearGuion, cerrar, eventos, rolDe, rumbo, ruta, PIX, SONIDOS, TOMATE, TOMAS, TOMATE_BLOQUE, HOJAS, mensaje } from './comun.js';

export const ANCLA = 'andy';
export const NPCS = ['hadad', 'andy', 'nacho'];
export const COMUN = [
    ['andy', t('¿Quién mandó doscientos stickers al grupo?', 'Who sent two hundred stickers to the group chat?')],
    ['nacho', t('Jajaja, fue el Hadad. Son todos de él con papas fritas.', "Haha, it was Hadad. Every single one is him with chips.")],
    ['hadad', t('Ya, Tomatitos: tomate en alto.', 'Alright, Tomatitos: tomatoes up.')],
    ['todos', t('¡Por los Tomatitos!', 'To the Tomatitos!')]
];
// Por skin: llegada (2 frases), las 2 del brindis y tu cierre
export const VARIANTES = {
    venjy: {
        llegada: [['hadad', t('¡Venjy! Por fin sales del código y vienes a la fogata.', 'Venjy! You finally leave the code and come to the campfire.')], ['j', t('Vi el grupo y no podía faltar.', "I saw the group chat and couldn't miss it.")]],
        brindis: [['j', t('Les traje el tomate oficial de los Tomatitos.', 'I brought you the official Tomatitos tomato.')], ['nacho', t('Jajaja, ¡es más grande que el Pony!', "Haha, it's bigger than Pony!")]],
        cierre: t('Esto es lo que más me gusta del mundo: ustedes.', 'This is what I like most about the world: you guys.')
    },
    pony: {
        llegada: [['andy', t('¡Pony! Siéntate, pero no webees, que estamos tranquilos.', "Pony! Sit down, but no messing around, we're chilling.")], ['j', t('¿Yo webear? Si soy un angelito.', "Me, mess around? I'm a little angel.")]],
        brindis: [['j', t('¡Bajen los tomates, que no alcanzo!', "Lower the tomatoes, I can't reach!")], ['andy', t('Ya, por esta vez.', 'Okay, just this once.')]],
        cierre: t('Lo mejor de la U fueron ustedes. No le digan a nadie.', "The best thing about uni was you guys. Don't tell anyone.")
    },
    braulio: {
        llegada: [['nacho', t('Jajaja, ¡Braulio! ¿Trajiste arena de la playa?', 'Haha, Braulio! Did you bring sand from the beach?')], ['j', t('Un poco. Viene incluida conmigo.', 'A little. It comes included with me.')]],
        brindis: [['j', t('Yo brindo con esto. Escuchen: se oye el mar.', "I'll toast with this. Listen: you can hear the sea.")], ['hadad', t('Se oye el mar y un cangrejo reclamando.', 'You can hear the sea and a crab complaining.')]],
        cierre: t('La próxima fogata la hacemos en la playa.', 'Next campfire we do on the beach.')
    },
    conejeros: {
        llegada: [['hadad', t('¡Conejeros! ¿Vienes en modo normal o en modo .exe?', 'Conejeros! Coming in normal mode or .exe mode?')], ['j', t('Modo normal. Por ahora.', 'Normal mode. For now.')]],
        brindis: [['j', t('Les presento a Tomás. Es un tomate, pero con sentimientos.', "Meet Tomás. He's a tomato, but with feelings.")], ['andy', t('¿Y ahora cómo brindamos con Tomás?', 'And now how do we toast with Tomás?')]],
        cierre: t('Tomás dice que los quiere. Yo también, un poco.', 'Tomás says he loves you. Me too, a little.')
    },
    hadad: {
        llegada: [['hadad', t('¿Y tú quién eres? ¿Por qué tienes mi cara?', 'And who are you? Why do you have my face?')], ['j', t('Lo mismo te pregunto. Levanta el brazo.', 'I was going to ask you the same. Raise your arm.')]],
        brindis: [['nacho', t('Jajaja, ¡ahora hay dos que promocionan papas!', 'Haha, now there are two promoting chips!')], ['j', t('Uno para cada bolsa.', 'One per bag.')]],
        cierre: t('Dos Hadad en la fogata. El grupo no está listo para esto.', "Two Hadads at the campfire. The group isn't ready for this.")
    },
    andy: {
        llegada: [['andy', t('¿Otro Andy? A ver, ¿te sabes el baile?', "Another Andy? Let's see, do you know the dance?")], ['j', t('Me lo sé mejor que tú.', 'I know it better than you.')]],
        brindis: [['hadad', t('Dos Andy bailando y ninguno ganó nada.', 'Two Andys dancing and neither of them won anything.')], ['j', t('Todavía.', 'Yet.')]],
        cierre: t('Con ustedes hasta perder es divertido.', 'With you guys, even losing is fun.')
    },
    nacho: {
        llegada: [['nacho', t('Jajaja, ¿otro Nacho?', 'Haha, another Nacho?')], ['j', t('Jajaja, eso iba a decir yo.', "Haha, that's what I was going to say.")]],
        brindis: [['andy', t('Una risa ya era fuerte. Dos es un concierto.', 'One laugh was already loud. Two is a concert.')], ['j', t('Jajaja, y viene el bis.', 'Haha, and here comes the encore.')]],
        cierre: t('Jajaja, los quiero, Tomatitos. Aunque se rían de mi Tilted.', 'Haha, love you, Tomatitos. Even if you laugh at my Tilted.')
    }
};
export const MIEMBROS = Object.keys(VARIANTES);

// Momento propio después de la llegada (espejo, baile, risa): segundos que dura
const ANTES = { hadad: 2.2, andy: 2.6, nacho: 2.2 };

export function grupo(base) {
    const V = VARIANTES[base];
    if (!V) return null;
    const rol = rolDe(ANCLA);
    const g = crearGuion(0.6);
    const todos = [...NPCS, 'j'];
    const habla = l => g.ges(l.q, 'habla', l.a, l.a + l.d, true);

    // ---- Llegada: el que te recibe saluda; tú saludas de vuelta ----
    const l1 = g.di(...V.llegada[0]);
    g.ges(l1.q, 'saluda', l1.a - 0.3, l1.a + 1.2);
    g.ges('j', 'saluda', l1.a + 0.2, l1.a + 1.6);
    habla(l1);
    const l2 = g.di(...V.llegada[1]);
    habla(l2);
    for (const q of NPCS) if (q !== l1.q) g.ges(q, 'mira', l1.a, g.fin(l2), true);
    // ---- Momento propio con tu clon (antes de la parte común) ----
    if (ANTES[base]) {
        const a = g.s, b = g.s + ANTES[base];
        const otros = NPCS.filter(q => q !== base);
        if (base === 'hadad') { g.ges('j', 'espejo', a, b); g.ges('hadad', 'espejo', a, b); for (const q of otros) g.ges(q, 'doble', a, b); }
        if (base === 'andy') { g.ges('j', 'baile', a, b); g.ges('andy', 'baile', a, b); for (const q of otros) g.ges(q, 'risa', a + 0.4, b); }
        if (base === 'nacho') { g.ges('j', 'doblaRisa', l2.a, b); g.ges('nacho', 'doblaRisa', l2.a, b); g.ges('andy', 'tapaOidos', a, b + 0.3); g.ges('hadad', 'risa', a + 0.3, b); }
        g.s = b + 0.15;
    }

    // ---- Parte común: suena el grupo y todos miran el celular ----
    const ding = r2(g.s + 0.1);
    g.s += 0.5;
    const c1 = g.di(...COMUN[0]);
    const c2 = g.di(...COMUN[1]);
    for (const q of todos) if (q !== 'nacho') g.ges(q, 'celular', ding + 0.1, g.fin(c2));
    g.ges('nacho', 'celular', ding + 0.1, c2.a);
    g.ges('nacho', 'risa', c2.a, g.fin(c2) + 0.2);
    g.ges('hadad', 'rasca', c2.a + 0.4, g.fin(c2));
    // Hadad saca tomates para todos
    const c3 = g.di(...COMUN[2]);
    g.ges('hadad', 'reparte', c3.a, g.fin(c3));
    const tomates = r2(c3.a + 0.7);
    // ---- Brindis: tomate en alto mientras se dicen las dos frases de tu skin ----
    let tomas = null;
    if (base === 'conejeros') {
        // Conejeros le dibuja la cara a su tomate (lo tiene en la izquierda) y aparece Tomás
        g.ges('j', 'traza', g.s, g.s + 1.6);
        g.ges('j', 'altoI', g.s + 1.6, g.s + 1.7 + 2 * 2.6);
        tomas = r2(g.s + 1.4);
        g.s += 1.7;
    }
    const b1 = g.di(...V.brindis[0]);
    const b2 = g.di(...V.brindis[1]);
    habla(b1); habla(b2);
    const altoA = g.fin(c3) - 0.2, altoB = g.s + 0.2;
    let gigante = null, concha = null;
    if (base === 'venjy') {
        // Pone el tomate gigante en la fogata (lo deja con las dos manos) y Nacho se ríe
        g.ges('j', 'pasa', b1.a, b1.a + 1.6);
        gigante = r2(b1.a + 0.9);
        g.ges('nacho', 'risa', b2.a, g.fin(b2) + 0.3);
    }
    if (base === 'pony') {
        g.ges('j', 'salta', b1.a - 0.2, g.fin(b1) + 0.2);
        g.ges('andy', 'baja', b2.a, altoB);
    }
    if (base === 'braulio') {
        // Camina hasta Nacho, le acerca la concha al oído (suena el mar) y vuelve a su lugar
        concha = { ida: b1.a - 0.3, llega: b1.a + 0.9, vuelta: g.fin(b2) - 0.2, fin: g.fin(b2) + 1.0 };
        g.ges('j', 'camina', concha.ida, concha.llega);
        g.ges('j', 'oreja', concha.llega, concha.vuelta);
        g.ges('j', 'camina', concha.vuelta, concha.fin);
        g.ges('nacho', 'escucha', concha.llega + 0.2, concha.vuelta);
    }
    for (const q of todos) g.ges(q, 'alto', altoA, altoB);
    // ¡Por los Tomatitos!: brindis de todos (el choque va en la mitad del tramo)
    g.s += 0.15;
    const c4 = g.di(...COMUN[3]);
    const bA = c4.a - 0.3, bB = g.fin(c4) + 0.6;
    for (const q of todos) g.ges(q, 'brinda', bA, bB);
    const choque = r2(bA + (bB - bA) * 0.5);
    // ---- Cierre tuyo ----
    const ci = g.di('j', V.cierre, 0.25);
    habla(ci);
    for (const q of NPCS) g.ges(q, base === 'nacho' || base === 'andy' ? 'risa' : 'asiente', ci.a + 0.3, g.fin(ci) + 0.3);
    for (const q of todos) g.ges(q, 'mira', 0.3, g.s, true);

    // ---- Objetos y efectos ----
    let celulares = [], enMano = [], bloque = null;
    const enMundo = (api, q) => { const p = api.posG(rol(q)); return p; };
    const efectos = eventos([
        [ding, api => mensaje()],
        [tomates, api => { SONIDOS.visto(); for (const q of todos) { const p = enMundo(api, q); if (p) api.efecto('chispa', p.x, p.y + 1.6, p.z, { tam: 0.22 }); } }],
        ...(tomas !== null ? [[tomas, api => { const p = api.posG('j'); api.efecto('chispa', p.x, p.y + 2.2, p.z); SONIDOS.visto(); }]] : []),
        ...(gigante !== null ? [[gigante, api => { const c = api.e.centro; api.efecto('chispa', c.x, c.y + 1.2, c.z, { tam: 0.5 }); api.sonidos.golpe(); }]] : []),
        ...(concha ? [[concha.llega + 0.2, () => SONIDOS.mar()]] : []),
        [choque, api => { const c = api.e.centro; for (let i = 0; i < 3; i++) api.efecto('chispa', c.x + (i - 1) * 0.35, c.y + 2.5 + i * 0.1, c.z, { tam: 0.32 }); api.sonidos.golpe(); }]
    ]);
    // Dónde se para Braulio para acercarle la concha a Nacho (a 1 bloque de él, del lado del jugador)
    let destinoConcha = null;
    return cerrar(g, {
        ancla: ANCLA,
        actores: { hadad: 'hadad', nacho: 'nacho' },
        reparto: { [ANCLA]: 'n' },
        // La fogata está a 2.65 al este de donde se sienta Hadad (amigos.js); tú te paras del lado de las carpas
        centro: api => { const h = api.posG('hadad') || api.posG('n'); return { x: h.x + 2.65, y: h.y, z: h.z - 0.5 }; },
        colocar: api => ({ x: api.e.centro.x, y: api.e.centro.y, z: api.e.centro.z - 2.15 }),
        extra: {
            iniciar(api) {
                const c = api.e.centro;
                // Celulares y tomates en la mano derecha de cada uno (Conejeros el suyo en la izquierda; Braulio, una concha)
                for (const q of todos) {
                    const r = rol(q);
                    if (!api.actor(r)) continue;
                    celulares.push(api.pegar(api.sprite(PIX.celular.filas, PIX.celular.colores, 0.2), r, 'brazoD', [0, -0.8, 0.14]));
                    const conejo = q === 'j' && base === 'conejeros', braulio = q === 'j' && base === 'braulio';
                    const s = braulio ? api.sprite(PIX.concha.filas, PIX.concha.colores, 0.3) : api.sprite(TOMATE.filas, TOMATE.colores, 0.34);
                    enMano.push({ s, conejo, q });
                    api.pegar(s, r, conejo ? 'brazoI' : 'brazoD', [0, -0.86, 0.14]);
                }
                if (base === 'venjy') {
                    // Tomate gigante: un bloque con la cara y las hojas encima
                    bloque = api.caja(0.95, 0.95, 0.95, 0xffffff, TOMATE_BLOQUE);
                    const hojas = api.caja(0.7, 0.1, 0.7, 0xffffff, HOJAS);
                    bloque.add(hojas); hojas.position.y = 0.52;
                    api.pegar(bloque, null, null, [c.x, c.y + 0.5, c.z]);
                }
                if (base === 'braulio') {
                    const n = api.posG('nacho'), j = api.posG('j');
                    if (n && j) {
                        // Nacho se para un paso adelante del tronco (escena-amistad.js); la concha llega a su cabeza desde 1 bloque
                        const nx = n.x - 0.4, d = Math.hypot(j.x - nx, j.z - n.z) || 1;
                        destinoConcha = { x: nx + (j.x - nx) / d * 1.0, y: j.y, z: n.z + (j.z - n.z) / d * 1.0, mira: rumbo({ x: 0, z: 0 }, { x: nx - j.x, z: n.z - j.z }) };
                    }
                }
            },
            cuadro(api) {
                const x = api.e.t;
                efectos(api);
                for (const s of celulares) s.visible = x >= ding + 0.1 && x < g.fin(c2) + 0.1;
                for (const { s, conejo } of enMano) {
                    s.visible = x >= tomates;
                    if (conejo && tomas !== null) s.material.map = x >= tomas ? (s.userData.tomas ||= texDe(api, TOMAS)) : (s.userData.tomate ||= s.material.map);
                }
                if (bloque) bloque.visible = x >= gigante;
                if (concha && destinoConcha) {
                    const o = api.origen('j');
                    const k = ruta(x, [[concha.ida, 0], [concha.llega, 1], [concha.vuelta, 1], [concha.fin, 0]]);
                    api.mover('j', o.x + (destinoConcha.x - o.x) * k, o.y, o.z + (destinoConcha.z - o.z) * k);
                    const yendo = x >= concha.ida && x < concha.llega, volviendo = x >= concha.vuelta && x < concha.fin;
                    api.girar('j', yendo || (x >= concha.llega && x < concha.vuelta) ? destinoConcha.mira : volviendo ? destinoConcha.mira + Math.PI : null);
                }
            }
        }
    });
}
// La textura de Tomás se hace una vez con el mismo pincel que los sprites
function texDe(api, dib) {
    const s = api.sprite(dib.filas, dib.colores, 0.34);
    return s.material.map;
}
