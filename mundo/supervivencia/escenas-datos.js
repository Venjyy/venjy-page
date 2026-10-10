// =========================================================
// VENJY · Supervivencia · Diálogos de las escenas de skin
// CORTAS: cuando un amigo ve que tu skin parte de la suya. `identica` si no le cambiaste nada,
//   `basada` si cambiaste colores o ropa. Tres frases del amigo; `fin` cambia el último gesto.
// VENJY: cuando tu skin parte de la de Venjy, cada amigo conversa con el jugador-Venjy.
//   Turnos { q: 'n' (el amigo) | 'j' (el jugador) | 'ambos', es, en, g: gesto de quien habla,
//   o: gesto del que escucha }. Gestos en escenas-skin.js (GESTOS).
// IGLU: Lalo y Moisés fuman con el jugador-Venjy; los tiempos van amarrados al pase del pito y el bong.
// =========================================================
const F = (es, en, extra) => ({ es, en, ...extra });

export const CORTAS = {
    pony: {
        identica: [F('¿Ese no es mi traje?', "Isn't that my suit?"), F('Mismos lentes, misma perilla... ¿me copiaste?', 'Same glasses, same goatee... did you copy me?'), F('Ya, pero la caña no te la presto.', "Fine, but I'm not lending you my rod.")],
        basada: [F('Oye, ese traje se parece al mío.', 'Hey, that suit looks like mine.'), F('Le cambiaste los colores, ¿cierto?', 'You changed the colors, right?'), F('Igual te queda bien, pescador.', 'Still looks good on you, fisherman.')]
    },
    salonas: {
        identica: [F('¡Wena! ¿Ese soy yo?', 'Whoa! Is that me?'), F('Los mismos lentes... qué estilo, compadre.', 'The same shades... what style, mate.'), F('Solo te falta el bajo de 5 cuerdas.', 'You just need a 5-string bass.')],
        basada: [F('Esa melena me suena conocida.', 'That mane looks familiar.'), F('Le pusiste tu toque. Me gusta.', 'You gave it your own touch. I like it.'), F('¡PRIMUS SUCKS!', 'PRIMUS SUCKS!')],
        finBasada: 'brazosArriba'
    },
    lona: {
        identica: [F('¡Oye! ¡Esa es mi polera!', "Hey! That's my shirt!"), F('¿Dice GALA adelante y MILA atrás?', 'Does it say GALA on the front and MILA on the back?'), F('Las gatas nos van a confundir.', 'The cats are going to mix us up.')],
        basada: [F('Mmm... ese look es muy mío.', "Hmm... that look is very me."), F('Pero con otros colores. Buena idea.', 'But in other colors. Nice idea.'), F('Mila y Gala aprueban.', 'Mila and Gala approve.')]
    },
    hadad: {
        identica: [F('Espera... ¿esa es mi skin?', 'Wait... is that my skin?'), F('Hasta la barba igual. Respeto.', 'Even the same beard. Respect.'), F('Hoy en Fortnite vamos iguales.', "Tonight in Fortnite we're matching.")],
        basada: [F('Esa barba me parece familiar.', 'That beard looks familiar.'), F('Le cambiaste algo, pero se nota.', 'You changed something, but it shows.'), F('Buen gusto, la verdad.', 'Good taste, honestly.')]
    },
    andy: {
        identica: [F('¡Jajaja, soy yo pero más bajo!', "Haha, it's me but shorter!"), F('Mismo polerón azul y todo.', 'Same blue hoodie and everything.'), F('Esto merece baile de victoria.', 'This deserves a victory dance.')],
        basada: [F('Ese polerón lo conozco...', 'I know that hoodie...'), F('Partiste de mí, admítelo.', 'You started from me, admit it.'), F('Igual yo lo uso mejor.', 'I still wear it better.')],
        finIdentica: 'baile'
    },
    nacho: {
        identica: [F('¿Qué? ¡Hay dos Nachos!', 'What? There are two Nachos!'), F('Jajaja, igualito, hasta la polera roja.', 'Haha, spot on, even the red shirt.'), F('Tú anda a Tilted, yo me quedo acá.', "You drop at Tilted, I'm staying here.")],
        basada: [F('Oye, te pareces a alguien...', 'Hey, you look like someone...'), F('¡A mí! Jajaja, pero distinto.', 'Me! Haha, but different.'), F('Me gustan tus colores.', 'I like your colors.')],
        finIdentica: 'risa'
    },
    moises: {
        identica: [F('Hermano... ¿estoy viendo doble, ahya?', 'Bro... am I seeing double, ahya?'), F('Debe ser el humo.', 'Must be the smoke.'), F('No, en serio: tienes mi pelo.', 'No, seriously: you have my hair.')],
        basada: [F('Ese pelo largo... ¿te inspiraste en mí?', 'That long hair... was I your inspiration?'), F('Se nota, hermano.', 'It shows, bro.'), F('Bienvenido al iglú.', 'Welcome to the igloo.')]
    },
    lalo: {
        identica: [F('¿Ese sombrero de paja? ¿Esas Jordan? Ese soy yo, ahya.', "That straw hat? Those Jordans? That's me, ahya."), F('Te queda bacán, hermano.', 'Looks dope on you, bro.'), F('Pero el pito no te lo copias, ¿ah?', "But you can't copy the joint, huh?")],
        basada: [F('Mira ese estilo, hermano, ahya.', 'Look at that style, bro, ahya.'), F('Otros colores, pero tiene flow.', 'Other colors, but it has flow.'), F('¡YIAAAAAA!', 'YIAAAAAA!')],
        finBasada: 'brazosArriba'
    },
    boris: {
        identica: [F('¿Mi camisa a cuadros? ¿En serio?', 'My plaid shirt? Seriously?'), F('Ahora solo te falta el hacha.', 'Now you just need the axe.'), F('Ayúdame con la leña, entonces.', 'Help me with the firewood, then.')],
        basada: [F('Esa camisa se parece a la mía.', 'That shirt looks like mine.'), F('Le cambiaste el color, ¿no?', 'You changed the color, right?'), F('Sirve igual para cortar leña.', 'Still works for chopping wood.')]
    },
    lucho: {
        identica: [F('Espera... ¿ese soy yo?', 'Wait... is that me?'), F('Mismo pelo desordenado y todo.', 'Same messy hair and everything.'), F('Como en el LoL: me copiaste la build.', 'Like in LoL: you copied my build.')],
        basada: [F('Ese pelo me suena.', 'That hair rings a bell.'), F('Tu skin tiene algo mío.', 'Your skin has something of mine.'), F('Me gusta. No te voy a reportar.', "I like it. I won't report you.")]
    },
    braulio: {
        identica: [F('¿Ese soy yo? ¿Tan bajito me veo?', 'Is that me? Do I look that short?'), F('Hasta el lunar me copiaste.', 'You even copied my mole.'), F('A ver, muéstrame el dedo doble.', "Come on, show me the double finger.")],
        basada: [F('Ese polerón me suena.', 'That hoodie rings a bell.'), F('Te pareces a mí, pero más alto.', 'You look like me, but taller.'), F('Buena onda igual, eh.', 'Cool anyway, okay?')]
    },
    conejeros: {
        identica: [F('¡Compadre, eres igual a mí!', "Mate, you're just like me!"), F('Pensé que era un espejo.', 'I thought it was a mirror.'), F('¿También eres de San Rosendo?', 'Are you from San Rosendo too?')],
        basada: [F('Oye, ¿te vestiste como yo?', 'Hey, did you dress like me?'), F('Te quedó terrible bueno.', 'It came out really good.'), F('¡Vamos a ver al Pony!', "Let's go see Pony!")]
    }
};

// Conversaciones con el jugador-Venjy (4-6 turnos)
export const VENJY = {
    pony: [
        F('¿Venjy? ¿Qué haces aquí, en bloques?', 'Venjy? What are you doing here, in blocks?', { q: 'n', g: 'sorpresa' }),
        F('Vengo a ver cómo pescas, Pony.', "I came to see how you fish, Pony.", { q: 'j', g: 'saluda' }),
        F('Toda la mañana y no pica nada.', "All morning and not a single bite.", { q: 'n', g: 'rasca' }),
        F('La paciencia es el mejor cebo.', 'Patience is the best bait.', { q: 'j', g: 'habla' }),
        F('Eso siempre lo dices tú... o sea, yo... o sea, tú.', 'You always say that... I mean, me... I mean, you.', { q: 'n', g: 'ojos' }),
        F('Pesca tranquilo. Después me cuentas.', "Fish in peace. Tell me about it later.", { q: 'j', g: 'mano', o: 'mano' })
    ],
    salonas: [
        F('¡Venjy! ¿Viniste a tocar?', 'Venjy! Did you come to play?', { q: 'n', g: 'sorpresa' }),
        F('Vine a escucharte. Ese riff está terrible.', 'I came to listen. That riff is killer.', { q: 'j', g: 'habla' }),
        F('Es original, compadre. Con todo el sonido de Primus.', "It's original, mate. With that whole Primus sound.", { q: 'n', g: 'cabecea' }),
        F('Se nota. Suena como si el bajo hablara.', 'You can tell. It sounds like the bass is talking.', { q: 'j', g: 'cabecea', o: 'cabecea' }),
        F('¿Gritamos juntos?', 'Shall we shout together?', { q: 'n', g: 'tu' }),
        F('¡PRIMUS SUCKS!', 'PRIMUS SUCKS!', { q: 'ambos', g: 'brazosArriba' })
    ],
    lona: [
        F('¿Venjy? ¿Y por qué estás tan pixelado?', 'Venjy? And why are you so pixelated?', { q: 'n', g: 'sorpresa', d: 3.7 }),
        F('Es que ahora vivo en el juego.', 'I live in the game now.', { q: 'j', g: 'yo' }),
        F('Las gatas te andaban buscando.', 'The cats were looking for you.', { q: 'n', g: 'habla' }),
        F('¿Mila y Gala? ¿Se han portado bien?', 'Mila and Gala? Have they behaved?', { q: 'j', g: 'habla' }),
        F('Gala botó tres cosas y Mila se comió el pasto.', 'Gala knocked over three things and Mila ate the grass.', { q: 'n', g: 'rasca', d: 4.2 }),
        F('O sea, lo normal.', 'So, the usual.', { q: 'j', g: 'risa', o: 'risa' })
    ],
    hadad: [
        F('¿Venjy? ¿Desde cuándo eres un personaje?', 'Venjy? Since when are you a character?', { q: 'n', g: 'sorpresa' }),
        F('Desde que hice este mapa, Hadad.', 'Since I made this map, Hadad.', { q: 'j', g: 'yo' }),
        F('Entonces dime: ¿cómo construyes tan rápido?', 'Then tell me: how do you build so fast?', { q: 'n', g: 'habla' }),
        F('Practicando. Y con mucho café.', 'Practice. And lots of coffee.', { q: 'j', g: 'habla' }),
        F('Hoy dúo en Fortnite. ¿Te sumas?', 'Duos in Fortnite tonight. You in?', { q: 'n', g: 'tu' }),
        F('Si no me mata la tormenta, me sumo.', "If the storm doesn't get me, I'm in.", { q: 'j', g: 'mano', o: 'mano' })
    ],
    andy: [
        F('¡Venjy en persona! O en bloques.', 'Venjy in person! Or in blocks.', { q: 'n', g: 'sorpresa' }),
        F('Vengo a ver ese famoso baile de victoria.', 'I came to see that famous victory dance.', { q: 'j', g: 'habla' }),
        F('Para eso tengo que ganar primero.', 'I have to win first for that.', { q: 'n', g: 'rasca' }),
        F('Practícalo igual. Yo te sigo.', "Practice anyway. I'll follow you.", { q: 'j', g: 'tu' }),
        F('Ya, a la cuenta de tres.', 'Okay, on three.', { q: 'n', g: 'habla' }),
        F('¡Baile de victoria!', 'Victory dance!', { q: 'ambos', g: 'baile' })
    ],
    nacho: [
        F('¡Jajaja, Venjy! ¿Qué haces acá?', 'Haha, Venjy! What are you doing here?', { q: 'n', g: 'sorpresa' }),
        F('Vine a calentarme las manos en la fogata.', 'I came to warm my hands by the fire.', { q: 'j', g: 'habla' }),
        F('Siéntate, pero no me preguntes por Tilted.', "Sit down, but don't ask me about Tilted.", { q: 'n', g: 'habla' }),
        F('¿Moriste altiro otra vez?', 'Did you die right away again?', { q: 'j', g: 'tu' }),
        F('En diez segundos. Récord personal.', 'In ten seconds. Personal best.', { q: 'n', g: 'yo' }),
        F('Jajaja, igual eres leyenda.', "Haha, you're still a legend.", { q: 'j', g: 'risa', o: 'risa' })
    ],
    boris: [
        F('¿Venjy? Justo a tiempo, falta leña.', "Venjy? Just in time, we're short on firewood.", { q: 'n', g: 'sorpresa' }),
        F('¿Y el hacha? Vengo con las manos vacías.', "And the axe? I came empty-handed.", { q: 'j', g: 'yo', d: 3.8 }),
        F('Mira la técnica: se levanta, se suelta y listo.', 'Watch the technique: lift, let go and done.', { q: 'n', g: 'hachazo', d: 4.3 }),
        F('Parece fácil cuando lo haces tú.', 'Looks easy when you do it.', { q: 'j', g: 'habla' }),
        F('Yo encuentro que Nana es muy tonta, la verdad.', 'I think Nana is really dumb, honestly.', { q: 'n', g: 'habla' }),
        F('Ya, pero primero la leña.', 'Okay, but firewood first.', { q: 'j', g: 'mano', o: 'mano' })
    ],
    lucho: [
        F('¿Venjy? ¿Te saliste del portafolio?', 'Venjy? Did you step out of the portfolio?', { q: 'n', g: 'sorpresa' }),
        F('Algo así. Ahora puedo caminar por él.', 'Something like that. Now I can walk around in it.', { q: 'j', g: 'habla', d: 3.6 }),
        F('Buena. ¿Una ranked después?', 'Nice. One ranked later?', { q: 'n', g: 'tu' }),
        F('Una. Y me acuesto.', 'One. Then bed.', { q: 'j', g: 'habla' }),
        F('Eso dicen todos...', 'Everyone says that...', { q: 'n', g: 'rasca' }),
        F('Ya, dos. Pero no le digas a Boris.', "Okay, two. But don't tell Boris.", { q: 'j', g: 'risa', o: 'risa' })
    ],
    braulio: [
        F('¿Venjy? ¿Y tú qué haces en la playa?', 'Venjy? What are you doing at the beach?', { q: 'n', g: 'sorpresa' }),
        F('Vine a ver el naufragio. ¿Es tuyo?', 'I came to see the shipwreck. Is it yours?', { q: 'j', g: 'tu' }),
        F('No, eh. Ya estaba así.', 'No, okay? It was already like that.', { q: 'n', g: 'yo' }),
        F('Ya, te creo. ¿Y el dedo doble?', 'Sure, I believe you. And the double finger?', { q: 'j', g: 'habla' }),
        F('Mira: uno, dos... y el doble.', 'Look: one, two... and the double.', { q: 'n', g: 'dedo' }),
        F('Impresionante. Como siempre.', 'Impressive. As always.', { q: 'j', g: 'mano', o: 'mano' })
    ],
    conejeros: [
        F('¡Venjy, compadre! ¿Viniste a ver a Salonas?', 'Venjy, mate! Did you come to see Salonas?', { q: 'n', g: 'sorpresa' }),
        F('Obvio. Me dijeron que tocaba hoy.', "Of course. They told me he's playing today.", { q: 'j', g: 'habla' }),
        F('¿Viste al Pony? Es más chico que el pez.', "Did you see Pony? He's smaller than the fish.", { q: 'n', g: 'risa' }),
        F('Lo vi pescando en el muelle.', 'I saw him fishing on the pier.', { q: 'j', g: 'habla' }),
        F('¡El terrible weón el Pony!', "That Pony's a legend!", { q: 'n', g: 'brazosArriba' }),
        F('Ya, ya. Escuchemos el riff.', "Okay, okay. Let's hear the riff.", { q: 'j', g: 'cabecea', o: 'cabecea' })
    ],
    // El Venjy del Inicio frente a su clon: el espejo
    venjy: [
        F('Espera... ¿un clon mío?', 'Wait... a clone of me?', { q: 'n', g: 'ojos' }),
        F('Yo iba a preguntar lo mismo.', 'I was about to ask the same thing.', { q: 'j', g: 'yo' }),
        F('Levanta el brazo derecho.', 'Raise your right arm.', { q: 'n', g: 'espejo', o: 'espejo' }),
        F('¿Así? Eres mi espejo.', "Like this? You're my mirror.", { q: 'j', g: 'espejo', o: 'espejo' }),
        F('Mismos rulos, misma barba... hasta los lentes.', 'Same curls, same beard... even the glasses.', { q: 'n', g: 'rasca' }),
        F('Tú cuidas el portafolio y yo lo exploro.', 'You look after the portfolio and I explore it.', { q: 'j', g: 'habla' }),
        F('Trato hecho, Venjy.', 'Deal, Venjy.', { q: 'n', g: 'mano', o: 'mano' })
    ]
};

// Iglú: q 'lalo' | 'moises' | 'j' | 'todos'; a = segundo de inicio, d = duración
export const IGLU = [
    F('¿Venjy? ¿Qué haces acá, hermano?', 'Venjy? What are you doing here, bro?', { q: 'lalo', a: 0.4, d: 2.8, g: 'sorpresa' }),
    F('Llegaste justo. Pásale el pito, Lalo.', 'Right on time. Pass him the joint, Lalo.', { q: 'moises', a: 3.2, d: 2.8 }),
    F('Gracias, hermano.', 'Thanks, bro.', { q: 'j', a: 6.0, d: 2.4 }),
    F('Tranqui, tranqui. Respira.', 'Easy, easy. Breathe.', { q: 'lalo', a: 8.6, d: 2.4 }),
    F('Ahora el bong. Dale suave.', 'Now the bong. Go easy.', { q: 'moises', a: 11.0, d: 2.6 }),
    F('*cof cof*... está bueno.', "*cough cough*... it's good.", { q: 'j', a: 16.8, d: 2.4 }),
    F('Jajaja, igual que en Coyhaique.', 'Haha, just like in Coyhaique.', { q: 'moises', a: 19.2, d: 2.4, g: 'risa' }),
    F('¡YIAAAAAA!', 'YIAAAAAA!', { q: 'todos', a: 21.6, d: 2.0, g: 'brazosArriba' })
];
export const DURACION_IGLU = 24.4;

export const TXT_ESCENA = { es: { saltar: 'Saltar (Esc)' }, en: { saltar: 'Skip (Esc)' } };
