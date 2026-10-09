// =========================================================
// VENJY · Supervivencia · Minijuegos: textos y guiones
// Todo texto visible de los minijuegos (minijuego.js y sus tres juegos) con su par ES/EN.
// Cada frase es única: no se repite en otras escenas del juego (ver la regla en CLAUDE.md).
// Guiones: [desde, hasta, quien, { es, en }] con los segundos de la fase; quien = clave del amigo o 'j' (tú).
// =========================================================

const t = (es, en) => ({ es, en });

// Textos del marco común (minijuego.js)
export const TXT_MJ = {
    es: { saltar: 'Saltar', rendirse: 'Rendirse', recibes: 'Recibes:', tecla: 'ESPACIO', nada: 'Esta vez no hay premio.' },
    en: { saltar: 'Skip', rendirse: 'Give up', recibes: 'You get:', tecla: 'SPACE', nada: 'No prize this time.' }
};

// Requisitos de la tienda que se cumplen con un minijuego (tienda-datos.js usa la clave como `req`)
export const REQ_MINIJUEGOS = {
    'mj-boris': { titulo: t('Ganarle a Boris cortando leña', 'Beat Boris at chopping wood') }
};

// ---------------------------------------------------------
// Boris · cortar leña (competencia, minijuego-lena.js)
// ---------------------------------------------------------
export const LENA = {
    nombre: t('Duelo de hachas', 'Axe duel'),
    boton: t('Desafío: cortar leña', 'Challenge: chop wood'),
    pista: t('Pulsa cuando la marca esté en la zona verde. Tres golpes parten un leño.', 'Press when the marker is in the green zone. Three hits split a log.'),
    hachar: t('¡HACHAR!', 'CHOP!'),
    tu: t('Tú', 'You'),
    // Intro (11 s): Boris te desafía, tú te arremangas, Lucho arbitra y cuenta
    intro: [
        [0.6, 3.6, 'boris', t('¿Así que crees que cortas más rápido que yo? Veámoslo.', "So you think you chop faster than me? Let's see it.")],
        [3.6, 6.6, 'j', t('Traigo el hacha afilada y las ganas también.', 'My axe is sharp and so is my will.')],
        [6.6, 9.0, 'lucho', t('Tres leños cada uno. Yo arbitro: sin trampas y sin lag.', "Three logs each. I'm the referee: no cheating, no lag.")],
        [9.0, 9.5, 'lucho', t('Tres…', 'Three…')],
        [9.5, 10.0, 'lucho', t('Dos…', 'Two…')],
        [10.0, 10.5, 'lucho', t('Uno…', 'One…')],
        [10.5, 11.0, 'lucho', t('¡A HACHAR!', 'CHOP AWAY!')]
    ],
    // Reacciones durante el duelo (una vez cada una)
    reaccion: {
        borisLeno: ['boris', t('Uno. Y ni he sudado.', "One. And I haven't even broken a sweat.")],
        tuLeno: ['lucho', t('¡Partido limpio! Eso fue un GG.', 'Clean split! That was a GG.')],
        fallo: ['j', t('¡Uy! Rebotó en el nudo.', 'Oops! It bounced off the knot.')],
        vasGanando: ['boris', t('Ya, ya, no te agrandes todavía.', "Easy, easy, don't get cocky yet.")],
        vasPerdiendo: ['lucho', t('Boris va en modo turbo. ¡Apura!', 'Boris is in turbo mode. Hurry!')]
    },
    // Si ganas (9 s)
    gana: [
        [0.4, 3.4, 'lucho', t('¡Ganó el desafiante! Boris, eso es un nerf a tu orgullo.', 'The challenger wins! Boris, that is a nerf to your pride.')],
        [3.4, 6.4, 'boris', t('Me ganaste limpio. Pásate por mi tienda: te rebajo los tablones.', 'You beat me fair and square. Drop by my shop: planks are on sale for you.')],
        [6.4, 9.0, 'j', t('¡Leñador del año, señoras y señores!', 'Lumberjack of the year, ladies and gentlemen!')]
    ],
    // Si pierdes (9 s)
    pierde: [
        [0.4, 3.4, 'boris', t('¡Nadie le gana a Boris en su propia leñera!', 'Nobody beats Boris in his own woodpile!')],
        [3.4, 6.4, 'lucho', t('Tranqui. Boris lleva años practicando con troncos que no reclaman.', "Relax. Boris has practiced for years on logs that don't complain.")],
        [6.4, 9.0, 'j', t('La próxima te parto en dos… el récord, digo.', 'Next time I split you in two… the record, I mean.')]
    ]
};

// ---------------------------------------------------------
// Pony · pesca en el muelle (sin competir, minijuego-pesca.js)
// ---------------------------------------------------------
export const PESCA = {
    nombre: t('Pesca en el muelle', 'Dock fishing'),
    boton: t('Pescar con Pony', 'Fish with Pony'),
    pista: t('Lanza, espera a que el corcho se hunda y recoge a tiempo. Para tirar del pez, pulsa en la zona verde.', 'Cast, wait for the bobber to sink and reel in on time. To pull the fish, press in the green zone.'),
    peces: t('Peces', 'Fish'),
    tension: t('Tensión', 'Tension'),
    acciones: {
        lanzar: t('LANZAR', 'CAST'), espera: t('ESPERA…', 'WAIT…'), recoger: t('¡RECOGER!', 'REEL IN!'), tirar: t('¡TIRA!', 'PULL!'), saca: t('¡BIEN!', 'NICE!'), escapa: t('SE FUE…', 'GOT AWAY…')
    },
    // Intro de la primera vez (8 s)
    intro: [
        [0.6, 3.4, 'pony', t('Siéntate, hay espacio. Los peces llegan solos si uno conversa.', 'Sit down, there is room. Fish come on their own if you chat.')],
        [3.4, 5.6, 'j', t('Tú me dices cuándo tiro la caña.', 'You tell me when to cast.')],
        [5.6, 8.0, 'pony', t('Cuando el corcho se hunda, recoges. Y mientras, te cuento algo.', 'When the bobber sinks, reel in. Meanwhile, let me tell you something.')]
    ],
    // Intro de las siguientes veces (7 s)
    introOtra: [
        [0.6, 3.0, 'pony', t('Volviste. Esa caña ya te reconoce.', 'You came back. That rod recognizes you now.')],
        [3.0, 5.0, 'j', t('Y yo ya sé dónde pican.', 'And I already know where they bite.')],
        [5.0, 7.0, 'pony', t('Tira cuando quieras. Hoy tengo otra historia.', 'Cast whenever you want. I have another story today.')]
    ],
    // Historia 1: cómo se echó el ramo por culpa de la Profe Karly (corre durante el juego, ~62 s)
    historia: [
        [1.0, 4.6, 'pony', t('¿Sabías que me eché un ramo? Todo por culpa de la Profe Karly.', 'Did you know I failed a class? All because of Professor Karly.')],
        [5.2, 7.6, 'j', t('¿Qué le hiciste?', 'What did you do to her?')],
        [8.2, 11.8, 'pony', t('¡Nada! Ese es el punto. Ella hacía clases a las 8 de la mañana.', 'Nothing! That is the point. She taught at 8 in the morning.')],
        [12.4, 16.0, 'pony', t('Y a las 8 de la mañana es cuando pican los mejores pejerreyes.', 'And 8 in the morning is when the best silversides bite.')],
        [16.6, 19.6, 'j', t('Ah, entonces la culpa era de los pejerreyes.', 'Oh, so it was the silversides’ fault.')],
        [20.2, 23.8, 'pony', t('De la Profe Karly. ¿Quién pone pruebas en temporada de pesca?', 'Professor Karly’s. Who gives tests during fishing season?')],
        [24.4, 28.0, 'pony', t('Llegué a la prueba con olor a carnada. Me sentaron solo, al fondo.', 'I showed up to the test smelling of bait. They sat me alone, at the back.')],
        [28.6, 32.2, 'pony', t('Pregunta uno: derivadas. Yo expliqué cómo se amarra un anzuelo.', 'Question one: derivatives. I explained how to tie a hook.')],
        [32.8, 35.4, 'j', t('¿Y te puso algún punto?', 'Did she give you any points?')],
        [36.0, 39.6, 'pony', t('Medio punto. Dijo que el nudo estaba bien explicado. Gran profesora.', 'Half a point. She said the knot was well explained. Great teacher.')],
        [40.2, 43.6, 'pony', t('Al final me eché el ramo, pero aprendí algo importante.', 'In the end I failed, but I learned something important.')],
        [44.2, 46.2, 'j', t('¿A estudiar?', 'To study?')],
        [46.8, 50.4, 'pony', t('No. Que los pejerreyes también pican a las 4 de la tarde.', 'No. That silversides also bite at 4 in the afternoon.')],
        [51.0, 54.0, 'j', t('Pobre Profe Karly. Te tuvo una paciencia de pescador.', 'Poor Professor Karly. She had a fisherman’s patience with you.')],
        [54.6, 58.2, 'pony', t('Eso sí. Ahora me saluda y me pregunta si ya aprendí a derivar.', 'True. Now she greets me and asks if I have learned to derive yet.')],
        [58.8, 62.0, 'pony', t('Le digo que todavía no, pero que el nudo me sale perfecto.', 'I tell her not yet, but my knot comes out perfect.')]
    ],
    // Historia 2: el examen de repetición (las siguientes veces, ~56 s)
    historia2: [
        [1.0, 4.4, 'pony', t('¿Te conté del examen de repetición con la Profe Karly?', 'Did I tell you about the make-up exam with Professor Karly?')],
        [5.0, 7.8, 'j', t('Déjame adivinar: ese día había pesca.', 'Let me guess: there was fishing that day.')],
        [8.4, 11.6, 'pony', t('Peor: había campeonato de pesca. Y yo era el favorito.', 'Worse: there was a fishing tournament. And I was the favorite.')],
        [12.2, 15.8, 'pony', t('Le pedí cambiar la fecha. Me dijo que el cálculo no espera a nadie.', 'I asked to move the date. She said calculus waits for no one.')],
        [16.4, 19.4, 'pony', t('Así que llevé la caña a la prueba. Por si acaso.', 'So I brought my rod to the exam. Just in case.')],
        [20.0, 22.6, 'j', t('¿Al examen? ¿Y qué hiciste?', 'To the exam? And what did you do?')],
        [23.2, 26.8, 'pony', t('Hice la primera pregunta, miré por la ventana y vi el lago planito.', 'I did the first question, looked out the window and saw the lake dead calm.')],
        [27.4, 30.6, 'pony', t('Entregué la hoja casi en blanco y salí corriendo al muelle.', 'I handed in an almost blank sheet and ran to the dock.')],
        [31.2, 34.0, 'j', t('¿Y ganaste el campeonato por lo menos?', 'Did you at least win the tournament?')],
        [34.6, 38.2, 'pony', t('Segundo lugar. Le gané al Conejeros, que sacó una bota.', 'Second place. I beat Conejeros, who caught a boot.')],
        [38.8, 42.6, 'pony', t('La Profe Karly fue a mirar. Dijo que al menos en algo me concentraba.', 'Professor Karly came to watch. She said at least I focused on something.')],
        [43.2, 46.2, 'j', t('Esa profe te tiene más paciencia que los peces.', 'That teacher is more patient with you than the fish.')],
        [46.8, 50.4, 'pony', t('Y al año siguiente pasé el ramo. Con un cinco cero, pero pasé.', 'And the next year I passed. With a bare pass, but I passed.')],
        [51.0, 55.0, 'pony', t('Le regalé un pejerrey para celebrar. Lo devolvió al lago, como yo.', 'I gave her a silverside to celebrate. She put it back in the lake, like me.')]
    ],
    // Historia 3: Pony juega Pokémon TCG (después de las dos de la Profe Karly, ~55 s)
    historia3: [
        [1.0, 4.6, 'pony', t('¿Sabías que juego Pokémon TCG? Tengo un mazo entero de tipo agua.', 'Did you know I play the Pokémon TCG? I have a whole Water-type deck.')],
        [5.2, 8.0, 'j', t('Obvio que de agua. ¿Qué otro tipo ibas a jugar?', 'Water, of course. What other type would you play?')],
        [8.6, 12.2, 'pony', t('Mi carta favorita es Magikarp. Todos se ríen hasta que evoluciona.', 'My favorite card is Magikarp. Everyone laughs until it evolves.')],
        [12.8, 16.2, 'pony', t('En el torneo de la tienda lo bajé en el primer turno, solito.', 'At the store tournament I played it on turn one, all alone.')],
        [16.8, 19.4, 'j', t('¿Y no te lo noquearon al tiro?', "And they didn't knock it out right away?")],
        [20.0, 23.6, 'pony', t('Lo intentaron. Pero robé la energía justa y apareció Gyarados.', 'They tried. But I drew the exact energy and Gyarados showed up.')],
        [24.2, 27.8, 'pony', t('El rival tenía un Pikachu brillante. Casi lloró cuando se lo barrí.', 'My rival had a shiny Pikachu. He almost cried when I swept it.')],
        [28.4, 31.2, 'j', t('Pony, eso suena a que lo disfrutaste demasiado.', 'Pony, that sounds like you enjoyed it way too much.')],
        [31.8, 35.4, 'pony', t('Un poquito. Después perdí la final contra un niño de once años.', 'A little. Then I lost the final to an eleven-year-old.')],
        [36.0, 39.2, 'pony', t('Se me olvidó barajar. Robé seis energías seguidas.', 'I forgot to shuffle. I drew six energies in a row.')],
        [39.8, 42.8, 'j', t('Eso te pasa por barajar como quien prepara carnada.', 'That is what you get for shuffling like you are prepping bait.')],
        [43.4, 47.0, 'pony', t('El niño me regaló un sobre de consuelo. Salió otro Magikarp.', 'The kid gave me a consolation pack. Another Magikarp came out.')],
        [47.6, 51.0, 'pony', t('Ahora tengo cuatro. Uno para cada día que vengo al muelle.', 'Now I have four. One for each day I come to the dock.')],
        [51.6, 54.6, 'j', t('Y yo que pensaba que lo tuyo era solo pescar.', 'And here I thought fishing was your only thing.')]
    ],
    // Finales según cuántos peces sacaste (8 s)
    cero: [
        [0.4, 3.6, 'pony', t('Cero peces. Igual que mi nota en derivadas.', 'Zero fish. Same as my grade in derivatives.')],
        [3.6, 6.4, 'j', t('Al menos me llevo la historia.', 'At least I get to keep the story.')],
        [6.4, 8.0, 'pony', t('Vuelve mañana. Pican mejor.', 'Come back tomorrow. They bite better.')]
    ],
    pocos: [
        [0.4, 3.6, 'pony', t('Nada mal. Con eso apruebas pesca, no cálculo.', 'Not bad. That passes fishing, not calculus.')],
        [3.6, 6.4, 'j', t('Me conformo con un cuatro en pesca.', 'I will settle for a passing grade in fishing.')],
        [6.4, 8.0, 'pony', t('Llévatelos frescos. Yo invito.', 'Take them fresh. My treat.')]
    ],
    muchos: [
        [0.4, 3.6, 'pony', t('¡Mira ese balde! Tú sí tendrías el ramo aprobado.', 'Look at that bucket! You would have passed the class.')],
        [3.6, 6.4, 'j', t('Profe Pony, póngame un siete.', 'Professor Pony, give me an A.')],
        [6.4, 8.0, 'pony', t('Un siete y algo que saqué del fondo.', 'An A and something I pulled from the bottom.')]
    ]
};

// ---------------------------------------------------------
// Fogata · asado con Hadad, Andy y Nacho (minijuego-asado.js)
// ---------------------------------------------------------
export const ASADO = {
    nombre: t('Asado en la fogata', 'Campfire barbecue'),
    boton: t('Hacer un asado', 'Have a barbecue'),
    sinCarne: t('Necesitas carne cruda (vacuno, cerdo, pollo o cordero).', 'You need raw meat (beef, pork, chicken or mutton).'),
    pista: t('Dale vuelta en la zona amarilla y sácala en la verde. Si pasa del final, se quema.', 'Flip it in the yellow zone and take it off in the green one. Past the end, it burns.'),
    coccion: t('Cocción', 'Doneness'),
    pieza: (n, de) => t(`Pieza ${n} de ${de}`, `Piece ${n} of ${de}`),
    acciones: { vuelta: t('¡DAR VUELTA!', 'FLIP!'), sacar: t('¡SACAR!', 'TAKE OFF!'), espera: t('…', '…') },
    // Intro (10 s)
    intro: [
        [0.6, 3.4, 'hadad', t('¿Eso es carne? Ya, esto se convirtió en asado.', 'Is that meat? Right, this just became a barbecue.')],
        [3.4, 5.8, 'andy', t('Yo pongo la parrilla. Tú te haces cargo del fuego.', 'I bring the grill. You handle the fire.')],
        [5.8, 8.0, 'nacho', t('Si se quema, yo nunca estuve aquí.', 'If it burns, I was never here.')],
        [8.0, 10.0, 'j', t('Dar vuelta y sacar. ¿Qué tan difícil puede ser?', 'Flip and take off. How hard can it be?')]
    ],
    // Reacciones durante el juego (una vez cada una)
    reaccion: {
        vuelta: ['hadad', t('¡Ahora! Dale vuelta, hermano.', 'Now! Flip it, bro.')],
        llama: ['nacho', t('¡Uy, se avivó el fuego!', 'Whoa, the fire flared up!')],
        perfecta: ['andy', t('Esa quedó de revista.', 'That one is magazine-cover material.')],
        cruda: ['hadad', t('Todavía mugía esa, compadre.', 'That one was still mooing, pal.')],
        quemada: ['nacho', t('Eso ya es carbón, compadre.', 'That is charcoal now, pal.')]
    },
    // Salió bien (10 s): comen, Andy baila, Nacho se ríe
    bien: [
        [0.4, 3.0, 'hadad', t('Jugosa por dentro, doradita por fuera. Respeto.', 'Juicy inside, golden outside. Respect.')],
        [3.0, 5.6, 'andy', t('¡Victoria magistral! Esto merece baile.', 'Masterful victory! This deserves a dance.')],
        [5.6, 8.0, 'nacho', t('¡Ja, ja! Por fin un asado sin bomberos.', 'Ha ha! Finally a barbecue without firefighters.')],
        [8.0, 10.0, 'j', t('Les dije que yo sabía.', 'Told you I knew how.')]
    ],
    // Se quemó (11 s): humo, tos, Andy espanta el humo, Hadad se tapa la cara
    quemado: [
        [0.4, 3.2, 'nacho', t('¡Ja, ja, ja! ¡Hiciste un asado al carbón… literal!', 'Ha ha ha! You made a charcoal barbecue… literally!')],
        [3.2, 5.8, 'andy', t('¡Abran paso, que viene la nube!', 'Make way, here comes the cloud!')],
        [5.8, 8.6, 'hadad', t('Hermano, la carne no se cocina con fe.', 'Bro, meat does not cook on faith.')],
        [8.6, 11.0, 'j', t('Ehh… ¿alguien quiere pan con carbón?', 'Uhh… anyone want bread with charcoal?')]
    ]
};
