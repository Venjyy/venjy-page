// =========================================================
// VENJY · Supervivencia · Reencuentros entre amigos (bloque 6c-1)
// escena-amistad.js lo carga con import() la primera vez que hace falta (escenas-skin.js lo pide al acercarte
// con la skin de un amigo que tiene relación 2 o 3 con otro, o al hacerle clic derecho).
// · REENCUENTROS: los 16 de mundo/DISENO-6c.md §3, con las frases por personaje (no por papel): la misma
//   escena sirve en las dos direcciones (con skin de Pony frente a Andy dices las de Pony; con skin de Andy
//   frente a Pony, las de Andy). Textos aprobados por el dueño (2026-10-10): no se cambian sin preguntar.
// · reencuentro(base, clave) arma el guion para escena-amistad.js:
//   - Relación 2 · corto: sorpresa y saludo · choque de puños · 4 frases · broma con un gesto (empujon, risa, mide, rasca).
//   - Relación 3 · largo: brazos arriba · saludo secreto · abrazo · recuerdo (mano al mentón) · risa · 6 frases.
//   Tu clon (el NPC de tu skin), si está al lado, reacciona: doble mirada al empezar y risa al final.
// No dan puntos de amistad. Son personas reales: siempre en buena onda.
// =========================================================
import { relacion } from './amistad.js';
import { MOLDES, desplazar } from './moldes.js';

const t = (es, en) => ({ es, en });
const lim = (v, a, b) => Math.max(a, Math.min(b, v));
// Lo que dura una frase en pantalla (se alcanza a leer sin alargar la escena de más)
export const durLinea = txt => Math.round(lim(1.4 + txt.es.length * 0.03, 2.3, 3.6) * 10) / 10;

// Pareja -> { rel, lineas: [quien, texto], broma: { gesto, quien: [personajes], linea } } (linea: índice de la frase)
export const REENCUENTROS = {
    // ---------- Relación 2 · corto ----------
    'pony-salonas': { rel: 2, broma: { gesto: 'empujon', quien: ['pony'], linea: 3 }, lineas: [
        ['salonas', t('¡Llegó el waton klo!', 'Here comes the big goof!')],
        ['pony', t('¿Waton klo yo? Waton klo tú, compadre.', "Me, a big goof? You're the big goof, mate.")],
        ['salonas', t('Ya, tregua. Puño y seguimos.', 'Okay, truce. Fist bump and we move on.')],
        ['pony', t('Tregua hasta la próxima, waton klo.', 'Truce until next time, big goof.')]] },
    'pony-hadad': { rel: 2, broma: { gesto: 'risa', quien: ['pony', 'hadad'], linea: 2 }, lineas: [
        ['hadad', t('¡Pony! ¿Quieres papas fritas? Son de la marca que promociono.', "Pony! Want some chips? They're the brand I promote.")],
        ['pony', t('Esa imagen con IA te va a perseguir toda la vida.', 'That AI picture is going to follow you forever.')],
        ['hadad', t('Me persigue y me paga. Bueno, no me paga.', "It follows me and pays me. Well, it doesn't pay me.")],
        ['pony', t('Comparte igual, famoso.', 'Share anyway, celebrity.')]] },
    'pony-nacho': { rel: 2, broma: { gesto: 'mide', quien: ['nacho'], linea: 2 }, lineas: [
        ['nacho', t('Jajaja, ¡Pony! ¿Pescaste algo o vienes por carne?', 'Haha, Pony! Did you catch anything or are you here for meat?')],
        ['pony', t('Las dos cosas. El pescado me lo comí en el camino.', 'Both. I ate the fish on the way.')],
        ['nacho', t('Jajaja, te guardo una chuleta. Chiquita, a tu medida.', "Haha, I'll save you a chop. A little one, your size.")],
        ['pony', t('¿Tú también, Nacho? Hasta tú.', 'You too, Nacho? Even you.')]] },
    'pony-braulio': { rel: 2, broma: { gesto: 'mide', quien: ['pony', 'braulio'], linea: 1 }, lineas: [
        ['braulio', t('Pony, ponte aquí. A ver quién es más bajo.', "Pony, stand here. Let's see who's shorter.")],
        ['pony', t('Obvio que tú. Mira, te gano por un pelo.', 'You, obviously. Look, I beat you by a hair.')],
        ['braulio', t('Ese pelo está parado, no cuenta.', "That hair is sticking up, it doesn't count.")],
        ['pony', t('Quedamos iguales y nadie se entera.', 'We call it even and nobody finds out.')]] },
    'pony-conejeros': { rel: 2, broma: { gesto: 'empujon', quien: ['pony'], linea: 3 }, lineas: [
        ['conejeros', t('Ah, llegó mi enemigo favorito.', 'Oh, my favorite enemy is here.')],
        ['pony', t('Enemigo y todo, igual te vine a saludar.', 'Enemy or not, I still came to say hi.')],
        ['conejeros', t('Te dibujé en mi cuaderno, con una caña más grande que tú.', 'I drew you in my notebook, with a rod bigger than you.')],
        ['pony', t('Eso es difamación... pero el dibujo te quedó bueno.', "That's slander... but the drawing turned out good.")]] },
    'salonas-andy': { rel: 2, broma: { gesto: 'risa', quien: ['salonas', 'andy'], linea: 2 }, lineas: [
        ['andy', t('¡Salonas! ¿Cómo va ese bajo?', "Salonas! How's that bass going?")],
        ['salonas', t('Afinado y sonando. ¿Y el Fortnite?', 'Tuned and playing. And Fortnite?')],
        ['andy', t('Ganando, a veces. Cuando el Nacho no se tira solo.', "Winning, sometimes. When Nacho doesn't drop in alone.")],
        ['salonas', t('Pásate al escenario un día y te dedico un tema.', "Come by the stage someday and I'll dedicate a song to you.")]] },
    'salonas-braulio': { rel: 2, broma: { gesto: 'risa', quien: ['salonas', 'braulio'], linea: 2 }, lineas: [
        ['braulio', t('Salonas, te escuché tocar desde la playa.', 'Salonas, I heard you playing from the beach.')],
        ['salonas', t('¿Tan fuerte? Entonces está bien ecualizado.', "That loud? Then it's well mixed.")],
        ['braulio', t('Hasta los peces cabeceaban, te lo juro.', 'Even the fish were headbanging, I swear.')],
        ['salonas', t('Ese es mi público objetivo, compadre.', "That's my target audience, mate.")]] },
    'andy-braulio': { rel: 2, broma: { gesto: 'rasca', quien: ['andy'], linea: 3 }, lineas: [
        ['andy', t('¡Braulio! ¿Encontraste algo en la orilla?', 'Braulio! Did you find anything on the shore?')],
        ['braulio', t('Una concha, una chala y un cangrejo enojado.', 'A shell, a flip-flop and an angry crab.')],
        ['andy', t('Con ese botín ya te alcanza para el pase de batalla.', 'With that loot you can afford the battle pass.')],
        ['braulio', t('Y el cangrejo viene como skin exclusiva.', 'And the crab comes as an exclusive skin.')]] },
    'braulio-conejeros': { rel: 2, broma: { gesto: 'risa', quien: ['braulio', 'conejeros'], linea: 3 }, lineas: [
        ['conejeros', t('¡Braulio! Te iba a saludar, pero se me colgó el cerebro.', 'Braulio! I was going to say hi, but my brain froze.')],
        ['braulio', t('Tranquilo: Control, Alt, Suprimir y listo.', 'Relax: Control, Alt, Delete and done.')],
        ['conejeros', t('Ya, volví. ¿Me perdí de algo?', 'Okay, I\'m back. Did I miss anything?')],
        ['braulio', t('Por eso yo me quedé en la versión estable.', "That's why I stayed on the stable version.")]] },
    // ---------- Relación 3 · largo ----------
    'pony-andy': { rel: 3, lineas: [
        ['andy', t('¡Pony! ¿Vienes a hacer un trabajo conmigo? Mentira, ya no caigo.', "Pony! Here to do an assignment with me? Just kidding, I won't fall for it.")],
        ['pony', t('Oye, yo era un aporte. Un aporte de risas, pero aporte.', 'Hey, I contributed. Laughs, but still a contribution.')],
        ['andy', t('Ven, abrazo. Te perdono todas las entregas a última hora.', 'Come here, hug. I forgive you for every last-minute submission.')],
        ['pony', t('¿Te acuerdas cuando hacíamos los trabajos juntos? Nos reíamos tanto.', 'Remember when we did assignments together? We laughed so much.')],
        ['andy', t('Por eso ahora los hago con el Nacho. Pero contigo era más divertido.', "That's why I do them with Nacho now. But it was more fun with you.")],
        ['pony', t('El próximo lo hacemos juntos, palabra de Pony.', "We'll do the next one together, Pony's word.")]] },
    'boris-lucho': { rel: 3, lineas: [
        ['lucho', t('¡Negro! ¿Soltaste el hacha un rato?', 'Negro! Did you put the axe down for a bit?')],
        ['boris', t('Por ti, sí. Pero rápido, que la leña no se corta sola.', "For you, yes. But quick, the firewood won't chop itself.")],
        ['lucho', t('Ven, negro. Desde la media que nos aguantamos.', "Come here, negro. We've put up with each other since high school.")],
        ['boris', t('¿Te acuerdas de la media? Tú con el LoL y yo diciéndote que te acostaras.', 'Remember high school? You with LoL and me telling you to go to bed.')],
        ['lucho', t('Algunas cosas no cambian, negro.', 'Some things never change, negro.')],
        ['boris', t('Así me gusta. Vamos, que el tronco no espera.', "That's how I like it. Come on, the log won't wait.")]] },
    'moises-lalo': { rel: 3, lineas: [
        ['lalo', t('Ahya, ¡Moisés! Vivimos juntos y igual te extraño.', 'Ahya, Moisés! We live together and I still miss you.')],
        ['moises', t('Te fuiste a buscar leña hace cinco minutos, hermano.', 'You went for firewood five minutes ago, bro.')],
        ['lalo', t('Cinco minutos es harto. Ven, abrazo.', 'Five minutes is a lot. Come here, hug.')],
        ['moises', t('¿Te acuerdas de Coyhaique? Éramos cabros chicos y ya éramos inseparables.', 'Remember Coyhaique? We were little kids and already inseparable.')],
        ['lalo', t('Y seguimos igual, solo que ahora pagamos cuentas.', 'And we still are, except now we pay bills.')],
        ['moises', t('Vamos al iglú, que sin ti se siente vacío.', "Let's go to the igloo, it feels empty without you.")]] },
    'salonas-conejeros': { rel: 3, lineas: [
        ['conejeros', t('¡Salonas! Te hice un dibujo. Eres tú, pero con alas.', "Salonas! I made you a drawing. It's you, but with wings.")],
        ['salonas', t('¿Por qué tengo alas y un bajo de tres cuerdas?', 'Why do I have wings and a three-string bass?')],
        ['conejeros', t('Porque el arte no se explica, compadre. Ven, abrazo.', "Because art can't be explained, mate. Come here, hug.")],
        ['salonas', t('¿Te acuerdas del primer monito que dibujamos juntos? Era horrible.', 'Remember the first doodle we drew together? It was awful.')],
        ['conejeros', t('Horrible y perfecto. Todavía lo tengo guardado.', 'Awful and perfect. I still have it saved.')],
        ['salonas', t('Hagamos el segundo. Con más alas.', "Let's make the second one. With more wings.")]] },
    'hadad-andy': { rel: 3, lineas: [
        ['hadad', t('¡Andy! ¿Saliste del Discord? Pensé que vivías ahí.', 'Andy! You left Discord? I thought you lived there.')],
        ['andy', t('Salí a tomar aire. Cinco minutos y vuelvo, como siempre.', "I came out for some air. Five minutes and I'm back, as always.")],
        ['hadad', t('Abrazo de escuadrón. Falta el Nacho, pero cuenta igual.', "Squad hug. Nacho's missing, but it still counts.")],
        ['andy', t('¿Te acuerdas de esa partida que ganamos sin construir nada?', 'Remember that match we won without building anything?')],
        ['hadad', t('Ni yo me lo creo. Y tú bailando antes de que terminara.', "I still can't believe it. And you dancing before it was over.")],
        ['andy', t('Era seguro. Bueno, casi seguro.', 'It was a sure thing. Well, almost sure.')]] },
    'hadad-nacho': { rel: 3, lineas: [
        ['nacho', t('Jajaja, ¡Hadad! ¿Me vienes a cobrar las papas fritas?', 'Haha, Hadad! Here to charge me for the chips?')],
        ['hadad', t('Vengo a buscarte para el Fortnite. Las papas, después.', 'I came to get you for Fortnite. Chips later.')],
        ['nacho', t('Jajaja, ven, abrazo. Tantas horas de Discord no se olvidan.', "Haha, come here, hug. All those Discord hours don't get forgotten.")],
        ['hadad', t('¿Te acuerdas cuando caíste en Tilted y duraste diez segundos?', 'Remember when you dropped into Tilted and lasted ten seconds?')],
        ['nacho', t('Jajaja, nueve. Esa vez fueron nueve.', 'Haha, nine. That time it was nine.')],
        ['hadad', t('Esta noche, dúo. Y caemos lejos de Tilted.', 'Tonight, duos. And we land far from Tilted.')]] },
    'andy-nacho': { rel: 3, lineas: [
        ['nacho', t('Jajaja, ¡Andy! ¿Ya entregamos el trabajo?', 'Haha, Andy! Did we hand in the assignment yet?')],
        ['andy', t('Anoche a las tres, en el Discord, entre partida y partida.', 'Last night at three, on Discord, between matches.')],
        ['nacho', t('Jajaja, el mejor equipo de la U. Ven, abrazo.', 'Haha, the best team at uni. Come here, hug.')],
        ['andy', t('¿Te acuerdas del primer trabajo juntos? No sabíamos ni por dónde empezar.', "Remember our first assignment together? We didn't even know where to start.")],
        ['nacho', t('Y lo sacamos adelante igual. Jajaja, todavía no sé cómo.', "And we pulled it off anyway. Haha, I still don't know how.")],
        ['andy', t('Así somos: tarde, pero siempre llegamos.', "That's us: late, but we always make it.")]] }
};

// Clave de la pareja en REENCUENTROS (el orden de la tabla del dueño)
export const claveDe = (a, b) => (REENCUENTROS[`${a}-${b}`] ? `${a}-${b}` : REENCUENTROS[`${b}-${a}`] ? `${b}-${a}` : null);

// ---------------------------------------------------------
// Guiones
// ---------------------------------------------------------
// Pistas sin pisarse: cada tramo empieza cuando termina el anterior del mismo actor (los primeros mandan)
function ordenar(lista) {
    const out = [];
    for (const [g, a, b] of lista.sort((x, y) => x[1] - y[1])) {
        const ini = Math.max(a, out.length ? out[out.length - 1][2] : 0);
        if (b - ini >= 0.35) out.push([g, Math.round(ini * 100) / 100, Math.round(b * 100) / 100]);
    }
    return out;
}
const r2 = x => Math.round(x * 100) / 100;

// Abrazo de 6b con el paso más largo: en el reencuentro largo los dos quedan a la distancia del saludo secreto (1.3)
const abrazoLargo = s => { const A = desplazar('abrazo', s); return (u, t, i) => { const m = A(u, t, i); return { ...m, pz: m.pz * 1.7 }; }; };

function corto(def, a, b) {
    const lineas = [], pista = { [a]: [], [b]: [] }, gestos = { ...MOLDES };
    let s = 0.5;
    const golpes = [];
    def.lineas.forEach(([quien, texto], i) => {
        const d = durLinea(texto);
        lineas.push({ q: quien, a: r2(s), d, texto });
        // Choque de puños después de la primera frase; la segunda empieza con el rebote
        if (i === 0) {
            const H = s + d + 0.5;
            gestos.punoR = desplazar('puno', H - 1.45);
            for (const q of [a, b]) pista[q].push(['punoR', H - 1.0, H + 0.95]);
            golpes.push(r2(H));
            s = H + 0.3;
        } else s += d + 0.15;
        if (i > 0) pista[quien].push(['habla', lineas[i].a, lineas[i].a + d]); // en la primera manda la sorpresa
    });
    // Sorpresa y saludo al empezar (quien habla primero se sorprende; el otro saluda)
    const [primero] = def.lineas[0];
    const otro = primero === a ? b : a;
    pista[primero].push(['sorpresa', 0.05, 0.9], ['saluda', 0.9, 1.9]);
    pista[otro].push(['saluda', 0.3, 1.8]);
    // Broma: el gesto durante su frase y un poco después
    const lb = lineas[def.broma.linea];
    const fin = lb.a + lb.d + 0.9;
    for (const q of def.broma.quien) pista[q].unshift([def.broma.gesto, lb.a, fin]); // primero en la lista: manda sobre `habla`
    const T = r2(Math.max(fin, lineas[lineas.length - 1].a + lineas[lineas.length - 1].d) + 1.0);
    return { T, r: 1.25, lineas, pista, gestos, golpes };
}

function largo(def, a, b) {
    const lineas = [], pista = { [a]: [], [b]: [] }, gestos = { ...MOLDES };
    const L = def.lineas;
    const d = L.map(([, x]) => durLinea(x));
    const quien = L.map(([q]) => q);
    // Brazos arriba y la primera frase
    for (const q of [a, b]) pista[q].push(['brazosArriba', 0.1, 1.5]);
    lineas.push({ q: quien[0], a: 0.4, d: d[0], texto: L[0][1] });
    // Saludo secreto (golpes en +0.8, +1.8, +2.7, +3.6 desde su inicio); la segunda frase va encima
    const S0 = r2(0.4 + d[0] + 0.2);
    gestos.secretoR = desplazar('secreto', S0 - 0.4);
    for (const q of [a, b]) pista[q].push(['secretoR', S0, S0 + 4.6]);
    const golpes = [0.8, 1.8, 2.7, 3.6].map(x => r2(S0 + x));
    let s = S0 + 0.3;
    lineas.push({ q: quien[1], a: r2(s), d: d[1], texto: L[1][1] }); s += d[1] + 0.15;
    // «Ven, abrazo»: el abrazo empieza al final de la tercera frase
    s = Math.max(s, S0 + 3.4);
    lineas.push({ q: quien[2], a: r2(s), d: d[2], texto: L[2][1] }); s += d[2];
    const A0 = r2(Math.max(s - 0.6, S0 + 4.7));
    gestos.abrazoR = abrazoLargo(A0 - 0.4);
    for (const q of [a, b]) pista[q].push(['abrazoR', A0, A0 + 4.5]);
    // Recuerdo: empieza abrazados y sigue con la mano en el mentón
    s = A0 + 2.0;
    lineas.push({ q: quien[3], a: r2(s), d: d[3], texto: L[3][1] });
    pista[quien[3]].push(['recuerda', A0 + 4.5, s + d[3] + 0.3]);
    s += d[3] + 0.15;
    // Risa de los dos con la quinta frase
    lineas.push({ q: quien[4], a: r2(s), d: d[4], texto: L[4][1] });
    for (const q of [a, b]) pista[q].push(['risa', s + 0.3, s + d[4]]);
    s += d[4] + 0.15;
    lineas.push({ q: quien[5], a: r2(s), d: d[5], texto: L[5][1] });
    pista[quien[5]].push(['habla', s, s + d[5]]);
    pista[quien[5] === a ? b : a].push(['asiente', s + 0.4, s + d[5]]);
    // `habla` en las frases que no tienen otro gesto (los tramos de arriba mandan)
    for (const l of lineas.slice(0, 2)) pista[l.q].push(['habla', l.a, l.a + l.d]);
    const T = r2(s + d[5] + 1.0);
    return { T, r: 1.3, lineas, pista, gestos, golpes };
}

// Guion del reencuentro entre tu skin (base, el jugador) y el amigo `clave`, o null si no tienen uno
export function reencuentro(base, clave) {
    const k = claveDe(base, clave);
    if (!k || base === clave) return null;
    const def = REENCUENTROS[k];
    if (relacion(base, clave) !== def.rel) return null;
    const [a, b] = k.split('-');
    const g = def.rel === 3 ? largo(def, a, b) : corto(def, a, b);
    for (const q of [a, b]) g.pista[q] = ordenar(g.pista[q]);
    // Tu clon (el NPC con tu misma skin), si está al lado: se da vuelta a mirarte dos veces y se ríe al final
    g.actores = { c: { clave: base, radio: 9 } };
    g.pista.c = [['doble', 0.2, 1.8], ['risa', r2(g.T - 3.0), r2(g.T - 1.2)]];
    g.reparto = { [base]: 'j', [clave]: 'n' };
    g.clave = k;
    return g;
}
