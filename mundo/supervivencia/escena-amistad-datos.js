// =========================================================
// VENJY · Supervivencia · Animaciones por nivel de amistad (bloque 6b): datos
// Lógica pura (sin DOM ni Three.js): la usan escena-amistad.js (que se carga con import() la primera vez
// que se usa) y mundo/tests/amistad.mjs.
// · ANIMACIONES: las 4 animaciones genéricas, reutilizadas por los 13 personajes:
//     punos (Amigo) · abrazo (Buen amigo) · secreto (Íntimo: saludo secreto + frase especial)
//     · pareja (Venjy y Lona son novios: abrazo largo y beso en la mejilla en lugar del saludo secreto)
//   Cada una: T (s), r (distancia en bloques entre el jugador y el amigo), linea [desde, dura] (frase del amigo),
//   pista { n: amigo, j: jugador } con [gesto, desde, hasta], golpes (s: sonido y chispas del contacto),
//   corazones (s, solo pareja).
// · GESTOS_AMISTAD: metas de los huesos (nombres cortos de la skill, referencia/rig.md) según
//   u (0..1 en su tramo), t (reloj de la escena) e info { s, otroS (sentados; hoy siempre false: el amigo
//   sentado se pone de pie para la escena), j: es el jugador, esc: escala del amigo }. Los que no están aquí se buscan en GESTOS de escenas-skin.js (habla, risa...).
//   Campo extra `pz`: avanza el cuerpo hacia adelante (cuerpo.position.z), para acercarse a abrazar.
// · FRASES_AMISTAD: la frase única de cada personaje en cada animación (con par ES/EN).
// Son personas reales: siempre en buena onda; el dueño revisa los textos antes del merge.
// =========================================================
const t = (es, en) => ({ es, en });

export const ANIMACIONES = {
    punos: { nivel: 2, T: 5.6, r: 1.25, linea: [2.3, 3.0], golpes: [1.45],
        pista: { n: [['puno', 0.45, 2.4], ['risa', 2.5, 3.6], ['habla', 3.6, 5.3]], j: [['puno', 0.45, 2.4], ['asiente', 2.6, 4.4]] } },
    abrazo: { nivel: 3, T: 6.8, r: 0.95, linea: [1.6, 3.4],
        pista: { n: [['abrazo', 0.4, 4.9], ['habla', 5.0, 6.4]], j: [['abrazo', 0.4, 4.9]] } },
    secreto: { nivel: 4, T: 9.0, r: 1.3, linea: [5.4, 3.4], golpes: [1.2, 2.2, 3.1, 4.0],
        pista: { n: [['secreto', 0.4, 5.0], ['habla', 5.3, 8.6]], j: [['secreto', 0.4, 5.0], ['asiente', 5.6, 7.6]] } },
    pareja: { nivel: 4, T: 8.6, r: 0.9, linea: [4.6, 3.6], corazones: [3.2, 4.2, 5.4],
        pista: { n: [['pareja', 0.4, 6.4], ['habla', 6.5, 8.2]], j: [['pareja', 0.4, 6.4]] } }
};
// Orden en el panel «Hablar» (la pareja reemplaza al saludo secreto)
export const ORDEN = ['punos', 'abrazo', 'secreto'];

const suave = u => u * u * (3 - 2 * u);
const lim = (v, a, b) => Math.max(a, Math.min(b, v));
const tramo = (u, a, b) => lim((u - a) / (b - a), 0, 1);
const envolvente = (u, a, b, r) => suave(Math.min(tramo(u, a, a + r), 1 - tramo(u, b - r, b)));

// Primera versión buena de las poses (ajustadas con capturas y --medir; ver mundo/PENDIENTES.md, bloque 6b).
// Todas van por tiempo de escena (t): ruta() interpola entre puntos con suavizado.
const ruta = (x, pts) => {
    if (x <= pts[0][0]) return pts[0][1];
    for (let k = 1; k < pts.length; k++) {
        const [x1, v1] = pts[k];
        if (x <= x1) { const [x0, v0] = pts[k - 1]; return lerp(v0, v1, suave((x - x0) / (x1 - x0))); }
    }
    return pts[pts.length - 1][1];
};
const lerp = (a, b, k) => a + (b - a) * k;

export const GESTOS_AMISTAD = {
    // Choque de puños: la derecha de cada uno llega al centro a la altura del pecho en t = 1.45 (golpe);
    // retrocede, rebota y «explota» abriendo el brazo afuera y abajo.
    puno: (u, t) => ({
        bDx: ruta(t, [[0.45, 0], [1.45, -0.98], [1.8, -0.78], [2.0, -0.93], [2.2, -0.3], [2.4, -0.05]]),
        bDz: ruta(t, [[0.45, 0.05], [1.45, 0.45], [1.8, 0.4], [2.0, 0.45], [2.2, -0.5], [2.4, -0.2]]),
        cx: 0.1
    }),
    // Abrazo: un paso adelante; los brazos rodean la espalda del otro (se cierran hacia adentro);
    // dos palmadas con la izquierda hacia la mitad; se mecen suave y se sueltan.
    abrazo: (u, t) => {
        const pat = (t > 2.3 && t < 3.1) ? 0.2 * Math.max(0, Math.sin((t - 2.3) * 2 * Math.PI / 0.4)) : 0;
        const base = ruta(t, [[0.4, 0], [1.2, -1.45], [4.3, -1.45], [4.9, 0]]);
        const z = ruta(t, [[0.4, 0.05], [1.2, 0.85], [4.3, 0.85], [4.9, 0.05]]);
        return { bDx: base, bDz: z, bIx: base + pat, bIz: -z, pz: ruta(t, [[0.4, 0], [1.2, 0.25], [4.3, 0.25], [4.9, 0]]), rz: Math.sin(t * 2.2) * 0.05 };
    },
    // Saludo secreto (golpes 1.2, 2.2, 3.1, 4.0): (a) chocan los cinco arriba; (b) puño al centro;
    // (c) palmas cruzadas al pecho (los dos brazos); (d) chocan arriba otra vez y explotan con los dos brazos arriba y afuera.
    secreto: (u, t) => {
        return {
            bDx: ruta(t, [[0.4, 0], [1.2, -2.0], [1.7, -2.0], [2.2, -1.0], [2.6, -1.0], [3.1, -1.0], [3.6, -1.0], [4.0, -2.0], [4.4, -2.6], [5.0, 0]]),
            bDz: ruta(t, [[0.4, 0.05], [1.2, 0.55], [1.7, 0.55], [2.2, 0.45], [2.6, 0.45], [3.1, 0.45], [3.6, 0.45], [4.0, 0.55], [4.4, -0.6], [5.0, -0.2]]),
            bIx: ruta(t, [[0.4, 0], [2.9, 0], [3.1, -1.0], [3.6, -1.0], [3.9, 0], [4.4, -2.6], [5.0, 0]]),
            bIz: ruta(t, [[0.4, -0.05], [2.9, -0.05], [3.1, -0.45], [3.6, -0.45], [3.9, -0.05], [4.2, -0.05], [4.5, 0.6], [5.0, 0.05]]),
            cx: 0
        };
    },
    // Pareja: abrazo largo y cariñoso, se mecen lento; beso en la mejilla entre 3.6 y 4.6 s:
    // el amigo (i.j = false) inclina la cabeza hacia la mejilla del jugador; el jugador la ladea.
    pareja: (u, t, i) => {
        const k = envolvente(t, 3.4, 4.8, 0.4);
        const base = ruta(t, [[0.4, 0], [1.4, -1.45], [6.0, -1.45], [6.4, 0]]);
        const meta = {
            bDx: base, bDz: ruta(t, [[0.4, 0.05], [1.4, 0.8], [6.0, 0.8], [6.4, 0.05]]),
            bIx: base, bIz: -ruta(t, [[0.4, 0.05], [1.4, 0.8], [6.0, 0.8], [6.4, 0.05]]),
            pz: ruta(t, [[0.4, 0], [1.4, 0.22], [6.0, 0.22], [6.4, 0]]),
            rz: Math.sin(t * 1.3) * 0.06
        };
        if (i.j) return { ...meta, cz: 0.15 * k, cy: -0.2 * k };
        return { ...meta, cy: 0.5 * k, cz: -0.15 * k, cx: 0.2 * k };
    }
};

// Frase única de cada personaje en cada animación
export const FRASES_AMISTAD = {
    venjy: {
        punos: t('¡Eso! Choque de puños oficial del Inicio. Queda guardado en el código.', "That's it! Official Start fist bump. It's saved in the code."),
        abrazo: t('Ven acá. Gracias por recorrer el mundo que armé, de verdad.', 'Come here. Thanks for exploring the world I built, really.'),
        secreto: t('Ese saludo no lo sabe nadie más. Si algún día algo no compila, te llamo a ti primero.', "Nobody else knows that handshake. If something ever doesn't compile, I'll call you first."),
        // Con la skin de Lona
        pareja: t('Mi amor, cada bloque de este mundo lo puse pensando en recorrerlo contigo.', 'My love, I placed every block of this world thinking of walking it with you.')
    },
    pony: {
        punos: t('Puño arriba, que si no, no llego. Ya, ya, no te rías.', "Fist up high, or I can't reach. Okay, okay, don't laugh."),
        abrazo: t('Abrazo de pescador: corto, firme y con olor a salmón. De nada.', "Fisherman's hug: short, firm and smelling of salmon. You're welcome."),
        secreto: t('Ni el Andy se sabe este saludo. Bueno, sí se lo sabe, pero a ti te sale mejor.', "Not even Andy knows this handshake. Well, he does, but you do it better.")
    },
    salonas: {
        punos: t('¡Puño con ritmo! Eso sonó como un golpe de bombo, compadre.', 'Fist with rhythm! That sounded like a kick drum, mate.'),
        abrazo: t('Abrazo de banda antes de salir al escenario. Ya, ahora sí estamos afinados.', 'Band hug before going on stage. Okay, now we are in tune.'),
        secreto: t('Este saludo lo voy a dibujar, con monitos y todo. Va a quedar ridículo y perfecto.', "I'm going to draw this handshake, stick figures and all. It'll be ridiculous and perfect.")
    },
    lona: {
        punos: t('Choque de puños aprobado por Mila. Gala todavía lo está pensando.', 'Fist bump approved by Mila. Gala is still thinking about it.'),
        abrazo: t('Un abrazo bien apretado, como los que dan las gatas cuando se te suben encima.', 'A really tight hug, like the ones the cats give when they climb on you.'),
        secreto: t('Nuestro saludo secreto queda entre tú, yo y las gatas. Ellas no le cuentan a nadie.', "Our secret handshake stays between you, me and the cats. They won't tell anyone."),
        // Con la skin de Venjy
        pareja: t('Te quiero, amor. Contigo hasta un mundo de bloques se siente como la casa.', 'I love you, my love. With you even a world of blocks feels like home.')
    },
    hadad: {
        punos: t('Puño de campeón. Este momento lo auspician las papas fritas de bolsa, obvio.', 'Champion fist bump. This moment is sponsored by bagged potato chips, obviously.'),
        abrazo: t('Abrazo junto a la fogata. Ahora sí eres parte del escuadrón.', 'A hug by the campfire. Now you are officially part of the squad.'),
        secreto: t('Ese saludo es como una victoria magistral: pocos la logran y nadie la olvida.', 'That handshake is like a Victory Royale: few get one and no one forgets it.')
    },
    andy: {
        punos: t('¡Puño! Como cuando el Nacho y yo cerramos la partida en el último círculo.', 'Fist bump! Like when Nacho and I close out the match in the final circle.'),
        abrazo: t('Abrazo de oso. Soy el más alto del grupo, así que estírate un poquito.', "Bear hug. I'm the tallest in the group, so stretch up a little."),
        secreto: t('Saludo secreto desbloqueado. Esto no viene ni en el pase de batalla.', 'Secret handshake unlocked. Not even the battle pass has this one.')
    },
    nacho: {
        punos: t('Jajaja, ¡pum! Ese puño sonó más fuerte que la parrilla.', 'Haha, boom! That fist bump was louder than the grill.'),
        abrazo: t('Jajaja, ven, abrazo. Pero no me botes la carne, que está a punto.', "Haha, come here, hug. Just don't knock the meat over, it's almost done."),
        secreto: t('Jajaja, nos salió perfecto a la primera. Eso pasa solo con los amigos de verdad.', 'Haha, we nailed it on the first try. That only happens with real friends.')
    },
    moises: {
        punos: t('Puño, hermano. Despacito, que en el iglú todo hace eco.', 'Fist bump, bro. Gently, everything echoes in the igloo.'),
        abrazo: t('Abrazo calentito, hermano. Así se le gana al frío de Coyhaique.', "A warm hug, bro. That's how you beat the Coyhaique cold."),
        secreto: t('Con el Lalo tenemos uno parecido, pero este es tuyo, hermano. Nadie más lo sabe.', 'Lalo and I have a similar one, but this one is yours, bro. Nobody else knows it.')
    },
    lalo: {
        punos: t('Ahya, ¡puño! Con cuidado, que se me cae el sombrero.', 'Ahya, fist bump! Careful, my hat is about to fall off.'),
        abrazo: t('Ahya, abrazo de hermano. En el iglú siempre hay lugar para uno más.', "Ahya, brotherly hug. In the igloo there's always room for one more."),
        secreto: t('Ahya, saludo secreto. Si el Moisés pregunta, tú no sabes nada.', 'Ahya, secret handshake. If Moisés asks, you know nothing.')
    },
    boris: {
        punos: t('Puño de leñador. Firme, como el hachazo que parte el tronco.', 'Lumberjack fist bump. Firm, like the swing that splits the log.'),
        abrazo: t('Ya, abrazo, pero rápido, que se enfría el hacha. Mentira, quédate.', 'Okay, a hug, but quick, the axe is getting cold. Kidding, stay.'),
        secreto: t('Este saludo es para los de confianza, como ir de copiloto a Linares.', 'This handshake is for trusted people, like riding shotgun to Linares.')
    },
    lucho: {
        punos: t('Puño de dúo. En Apex esto sería un revivir, pero en la vida real.', 'Duo fist bump. In Apex this would be a revive, but in real life.'),
        abrazo: t('Abrazo de familia. Aquí el que llega tan lejos ya es primo honorario.', 'Family hug. Around here whoever gets this far is an honorary cousin.'),
        secreto: t('Saludo secreto, como un ping que solo entiende tu dúo. Ni el Boris lo conoce.', 'Secret handshake, like a ping only your duo understands. Not even Boris knows it.')
    },
    braulio: {
        punos: t('Puño. Y con mi dedo doble, cuenta como choque y medio.', 'Fist bump. And with my double finger, it counts as one and a half.'),
        abrazo: t('Abrazo de playa: con arena incluida, perdón por eso.', 'Beach hug: sand included, sorry about that.'),
        secreto: t('Este saludo lo encontré en la orilla, como todo lo bueno. Ahora también es tuyo.', 'I found this handshake on the shore, like all good things. Now it is yours too.')
    },
    conejeros: {
        punos: t('Puño al ritmo del bajo. Uno, dos... ¡eso, cabeceaste!', 'Fist bump to the bass beat. One, two... yes, you headbanged!'),
        abrazo: t('Abrazo de concierto, de esos que se dan cuando suena el tema bueno.', 'A concert hug, the kind you give when the good song plays.'),
        secreto: t('Saludo secreto nivel .exe. El Salonas lo va a querer dibujar, ya verás.', "Secret handshake, .exe level. Salonas is going to want to draw it, you'll see.")
    }
};

// Botones del panel «Hablar» y textos de la escena
export const TXT_AMISTAD = {
    es: { titulo: 'Saludos de amigos', punos: 'Chocar puños', abrazo: 'Abrazo', secreto: 'Saludo secreto', pareja: 'Abrazo y beso', saltar: 'Saltar', bloqueado: '???', tu: 'Tú',
        momento: 'Momento especial', momentoFalta: p => `Momento especial: amistad ${p}/100` },
    en: { titulo: 'Friend greetings', punos: 'Fist bump', abrazo: 'Hug', secreto: 'Secret handshake', pareja: 'Hug and kiss', saltar: 'Skip', bloqueado: '???', tu: 'You',
        momento: 'Special moment', momentoFalta: p => `Special moment: friendship ${p}/100` }
};
