// =========================================================
// VENJY · Supervivencia · Diálogos de la pestaña «Hablar» (bloque 6a)
// Se carga con import() dinámico la primera vez que abres «Hablar» (hablar.js): no suma a la carga inicial.
// TEMAS[clave]: lista de { id, p: pregunta, r: respuesta, g?: gesto, req?: requisito, skin?: { base: respuesta } }
//   · req: { nivel } (de amistad, 0-4), { mision: id }, { mj: juego o marca de minijuego }, { jefe: id }.
//   · skin: respuesta distinta si tu skin parte de esa base (tipoSkin en escenas-skin.js).
//   · El tema `opina` abre la lista de OPINIONES (solo de quienes conoce, según la tabla de relaciones de 6c).
// SALUDOS: lo primero que dice al abrir «Hablar» (bajo: nivel < Amigo · alto: Amigo o más · skin: por base).
// REGALOS: lo que dice al recibir su objeto favorito (FAVORITOS en amistad.js).
// Son personas reales: el dueño revisa todos los textos antes del merge (ver mundo/DIALOGOS.md).
// =========================================================
const t = (es, en) => ({ es, en });
const P = {
    quien: t('¿Quién eres?', 'Who are you?'),
    aqui: t('¿Qué haces aquí?', 'What are you doing here?'),
    venjy: t('¿Cómo conociste a Venjy?', 'How did you meet Venjy?'),
    opina: t('¿Qué opinas de...?', 'What do you think of...?'),
    secreto: t('Cuéntame algo que nadie sepa', 'Tell me something nobody knows')
};
const N1 = { nivel: 1 }, N2 = { nivel: 2 }, N3 = { nivel: 3 };

export const TEMAS = {
    // ---------------- Venjy (Inicio) ----------------
    venjy: [
        { id: 'quien', p: P.quien, r: t('Soy Venjy, o Benjamín. Estudio Ingeniería en Informática y armé este mundo bloque por bloque.', "I'm Venjy, or Benjamín. I study Computer Engineering and built this world block by block."), g: 'yo',
            skin: {
                pony: t('¿Cómo que quién soy, Pony? Agáchate un poco para verme... ah, no, si ya estás abajo.', 'What do you mean who am I, Pony? Crouch a little to see me... oh wait, you are already down there.'),
                boris: t('¿Tú preguntándome quién soy? Si eres el que me va a buscar en auto a Linares.', "You're asking who I am? You're the one who picks me up by car in Linares."),
                moises: t('Moisés, nos conocemos desde Coyhaique, cuando teníamos trece. No me vengas con esa.', "Moisés, we've known each other since Coyhaique, when we were thirteen. Don't give me that."),
                lalo: t('¿Lalo? ¿En serio? Desde los trece en Coyhaique y ahora me preguntas quién soy.', 'Lalo? Seriously? Since we were thirteen in Coyhaique and now you ask who I am.'),
                salonas: t('Socio, soy el otro que se desvela con ProcedimientoSeguro. El del café.', "Partner, I'm the other one losing sleep over ProcedimientoSeguro. The coffee guy."),
                lona: t('Soy tu pololo, Lona. El que le abre la puerta a las gatas a las cuatro de la mañana.', "I'm your boyfriend, Lona. The one who opens the door for the cats at four in the morning."),
                braulio: t('Braulio, soy Venjy. El que siempre te pide que muestres el dedo doble.', "Braulio, I'm Venjy. The one who always asks you to show the double finger."),
                lucho: t('Primo, soy tu primo. Bueno, el hijo de tu prima. Da lo mismo, jugamos Apex igual.', "Cousin, I'm your cousin. Well, your cousin's son. Doesn't matter, we play Apex anyway.")
            } },
        { id: 'aqui', p: P.aqui, r: t('Cuido el Inicio y reparto las peleas de jefe. Alguien tiene que hacer de anfitrión.', 'I look after the Start and hand out the boss fights. Somebody has to be the host.') },
        { id: 'mundo', p: t('¿Qué es este lugar?', 'What is this place?'), r: t('Es mi portafolio, pero en bloques. Cada zona es algo que hice o alguien que quiero.', "It's my portfolio, but in blocks. Every zone is something I made or someone I love."), g: 'tu' },
        { id: 'opina', p: P.opina, req: N1 },
        { id: 'proyectos', p: t('¿Qué estás construyendo ahora?', 'What are you building now?'), r: t('Ahora mismo, este juego. Antes, ProcedimientoSeguro con Salonas. Mañana, quién sabe.', 'Right now, this game. Before that, ProcedimientoSeguro with Salonas. Tomorrow, who knows.'), req: N2, g: 'rasca' },
        { id: 'imbunche', p: t('¿Cómo inventaste al Imbunche?', 'How did you come up with the Imbunche?'), r: t('Lo dibujé en papel antes de programarlo. En papel daba menos miedo, te lo juro.', 'I drew it on paper before coding it. On paper it was less scary, I swear.'), req: { jefe: 'jefe1' }, g: 'risa' },
        { id: 'caleuche', p: t('¿Y ahora qué hacemos?', 'So what do we do now?'), r: t('Ahora nada: lo salvaste todo. Pásate a la fogata, que allá celebran mejor que yo.', 'Now nothing: you saved it all. Go by the campfire, they celebrate better than I do.'), req: { jefe: 'jefe3' }, g: 'brazosArriba' },
        { id: 'secreto', p: P.secreto, r: t('Hay un bloque en este mapa que puse solo porque me gustó el color. No te voy a decir cuál.', "There's a block in this map I placed only because I liked the color. I won't tell you which one."), req: N3, g: 'rasca' }
    ],
    // ---------------- Pony (muelle) ----------------
    pony: [
        { id: 'quien', p: P.quien, r: t('Soy el Pony. Pescador de muelle y, según todos, el más chico del grupo. Mentira, el Braulio es más chico.', "I'm Pony. Dock fisherman and, according to everyone, the shortest of the group. Lies, Braulio is shorter."), g: 'yo',
            skin: {
                salonas: t('¿Me estás preguntando quién soy, waton klo? Anda a tocar tu bajo.', 'Are you asking who I am, you big goof? Go play your bass.'),
                hadad: t('Hadad, si me vas a contar el de las papas fritas otra vez, me tiro al mar.', "Hadad, if you're telling the french fries one again, I'm jumping into the sea."),
                andy: t('Andy, soy yo, tu ex compañero de trabajos. Ya sé, ya sé, te webiaba demasiado.', 'Andy, it\'s me, your old project partner. I know, I know, I goofed around too much.'),
                nacho: t('Nacho, me conoces de sobra. Ríete primero y después pregunto yo.', 'Nacho, you know me well enough. Laugh first and then I ask.'),
                braulio: t('Braulio, antes de preguntar ponte espalda con espalda conmigo. A ver quién es más chico.', "Braulio, before asking, stand back to back with me. Let's see who's shorter."),
                conejeros: t('Mira quién llegó, mi enemigo favorito. Ya sabes quién soy, no te hagai.', "Look who showed up, my favorite enemy. You know who I am, don't play dumb.")
            } },
        { id: 'aqui', p: P.aqui, r: t('Pesco. Bueno, espero que piquen, que es casi lo mismo pero con más paciencia.', "I fish. Well, I wait for bites, which is almost the same but with more patience.") },
        { id: 'venjy', p: P.venjy, r: t('Ni me acuerdo cómo partió. Un día estaba Venjy diciéndome que soy chico y ya éramos amigos.', "I don't even remember how it started. One day Venjy was telling me I'm short and we were already friends."), g: 'rasca',
            skin: { venjy: t('¿Me preguntai cómo te conocí? Me ves y lo primero que dices es que soy chico. Así, siempre.', "You're asking how I met you? You see me and the first thing you say is that I'm short. Always.") } },
        { id: 'opina', p: P.opina, req: N1 },
        { id: 'abuelo', p: t('¿Quién te enseñó a pescar?', 'Who taught you to fish?'), r: t('Mi abuelo de Tomé, el de los bacalaos. Me dijo que el mar no se apura y que yo tampoco.', 'My grandpa from Tomé, the cod one. He told me the sea is never in a hurry and neither should I be.'), req: N2 },
        { id: 'karly', p: t('¿Y la Profe Karly?', 'And Teacher Karly?'), r: t('Ya te conté su historia completa, ¿qué más quieres? La próxima vez que pesquemos te cuento otra.', 'I already told you her whole story, what else do you want? Next time we fish I will tell you another.'), req: { mj: 'pesca' }, g: 'risa' },
        { id: 'caleuche', p: t('¿Viste caer el Caleuche?', 'Did you see the Caleuche go down?'), r: t('Lo vi hundirse desde el muelle. Te juro que un pez saltó a aplaudir.', 'I watched it sink from the dock. I swear a fish jumped out to applaud.'), req: { jefe: 'jefe3' }, g: 'sorpresa' },
        { id: 'secreto', p: P.secreto, r: t('A veces no le pongo carnada al anzuelo. Me gusta sentarme acá aunque no pique nada.', "Sometimes I don't bait the hook. I just like sitting here even if nothing bites."), req: N3 }
    ],
    // ---------------- Salonas (escenario) ----------------
    salonas: [
        { id: 'quien', p: P.quien, r: t('Salonas, bajista de cinco cuerdas. Si suena raro, es a propósito.', "Salonas, five-string bassist. If it sounds weird, it's on purpose."), g: 'cabecea',
            skin: {
                pony: t('¿Quién soy yo? ¿Y quién eres tú, waton klo? Ah, ya sé: el Pony.', 'Who am I? And who are you, you big goof? Oh right: Pony.'),
                andy: t('Andy, soy el del bajo. Tú pon el baile y yo pongo el ritmo.', "Andy, I'm the bass guy. You bring the dance and I bring the rhythm."),
                braulio: t('Braulio, soy yo, compadre. Pasa, que para ti hay primera fila.', "Braulio, it's me, mate. Come in, there's a front row seat for you."),
                conejeros: t('¿Me estás webeando, Conejeros? Si ayer dibujamos juntos un caballo con cara de Pony.', 'Are you messing with me, Conejeros? Yesterday we drew a horse with Pony\'s face together.')
            } },
        { id: 'aqui', p: P.aqui, r: t('Ensayo. El escenario es mío hasta que los vecinos digan lo contrario.', 'Rehearsing. The stage is mine until the neighbors say otherwise.') },
        { id: 'venjy', p: P.venjy, r: t('Con Venjy somos socios. Armamos ProcedimientoSeguro juntos: él la programó entera y yo lo mantengo despierto.', 'Venjy and I are partners. We built ProcedimientoSeguro together: he coded all of it and I keep him awake.'), g: 'tu',
            skin: { venjy: t('¿Cómo te conocí? Socio, tenemos una empresa juntos. Pregúntale a tu café.', 'How did I meet you? Partner, we run a company together. Ask your coffee.') } },
        { id: 'opina', p: P.opina, req: N1 },
        { id: 'primus', p: t('¿Por qué gritas «Primus sucks»?', 'Why do you shout "Primus sucks"?'), r: t('Así saludan los fans a Primus. Gritarles que apestan es la mayor muestra de cariño.', "That's how fans greet Primus. Yelling that they suck is the highest form of love."), req: { mision: 'salonas1' }, g: 'brazosArriba' },
        { id: 'proyecto', p: t('¿Qué es ProcedimientoSeguro?', 'What is ProcedimientoSeguro?'), r: t('Una app para que los funcionarios hagan sus actas desde el celular y las bajen en PDF. Se usa de verdad, eso es lo mejor.', 'An app so officers can write their reports from their phone and download them as PDF. People actually use it, that is the best part.'), req: N2, g: 'habla' },
        { id: 'secreto', p: P.secreto, r: t('El riff que más te gusta lo saqué de un error. Toqué la cuerda equivocada y sonó mejor.', 'The riff you like the most came from a mistake. I hit the wrong string and it sounded better.'), req: N3, g: 'rasca' }
    ],
    // ---------------- Lona (gatera) ----------------
    lona: [
        { id: 'quien', p: P.quien, r: t('Soy Lona. Bueno, soy la que les abre las latas a Mila y Gala; ellas mandan.', "I'm Lona. Well, I'm the one who opens the cans for Mila and Gala; they're the bosses."), g: 'yo',
            skin: { venjy: t('¿Cómo que quién soy? Tu polola, tonto. La que te robó la mitad de la cama; las gatas tienen la otra mitad.', 'What do you mean who am I? Your girlfriend, silly. I stole half your bed; the cats have the other half.') } },
        { id: 'aqui', p: P.aqui, r: t('Cuido la gatera. Mila y Gala tienen casa propia, que es más de lo que tengo yo.', 'I look after the cat house. Mila and Gala have their own house, which is more than I have.') },
        { id: 'venjy', p: P.venjy, r: t('Venjy es mi pololo. Lo demás es privado, pero las gatas lo aprueban, que es lo importante.', 'Venjy is my boyfriend. The rest is private, but the cats approve, which is what matters.'), g: 'risa',
            skin: { venjy: t('¿Que cómo te conocí? Ah, no, eso no te lo cuento delante de las gatas.', 'How I met you? Oh no, I am not telling that in front of the cats.') } },
        { id: 'gatas', p: t('¿Cómo son Mila y Gala?', 'What are Mila and Gala like?'), r: t('Mila es un amor y come de todo; Gala es la que manda y bota cosas de la mesa mirándote a los ojos.', 'Mila is a sweetheart and eats anything; Gala is the boss and knocks things off the table while looking you in the eye.'), g: 'habla' },
        { id: 'opina', p: P.opina, req: N1 },
        { id: 'cuello', p: t('¿A Gala le gustó el cuello?', 'Did Gala like the collar?'), r: t('Se lo sacó dos veces y después se durmió con él puesto. En idioma gata eso es «me encanta».', 'She took it off twice and then fell asleep wearing it. In cat language that means "I love it".'), req: { mision: 'lona3' }, g: 'risa' },
        { id: 'secreto', p: P.secreto, r: t('Cuando nadie mira, les hablo a las gatas con voz de guagua. Si lo cuentas, lo niego.', 'When nobody is looking, I talk to the cats in a baby voice. If you tell anyone, I will deny it.'), req: N3, g: 'ojos' }
    ],
    // ---------------- Hadad (campamento) ----------------
    hadad: [
        { id: 'quien', p: P.quien, r: t('Hadad. El de la barba, el que trae la leña y los chistes malos.', 'Hadad. The bearded one, who brings the firewood and the bad jokes.'), g: 'yo',
            skin: {
                pony: t('Pony, ¿sabes qué le dijo una papa frita a otra? Nada, porque estaban fritas.', 'Pony, know what one french fry said to the other? Nothing, they were both fried.'),
                andy: t('Andy, si no sabes quién soy, sal del Discord y vuelve a entrar.', "Andy, if you don't know who I am, leave the Discord and join again."),
                nacho: t('Nacho, soy el que te revive cuando caes en Tilted. O sea, siempre.', "Nacho, I'm the one who revives you when you drop at Tilted. So, always.")
            } },
        { id: 'aqui', p: P.aqui, r: t('Cuido la fogata y el lobby. Cuando esté todo listo, partimos la partida.', "I watch the fire and the lobby. When everything's ready, we start the match.") },
        { id: 'venjy', p: P.venjy, r: t('Con Venjy somos conocidos. Cada vez que nos topamos hay buena conversa.', 'Venjy and I are acquaintances. Every time we run into each other, the talk is good.'),
            skin: { venjy: t('Venjy, nos conocemos poco, pero siempre que pasas por la fogata hay conversa. Eso cuenta.', "Venjy, we don't know each other much, but every time you pass by the fire we talk. That counts.") } },
        { id: 'opina', p: P.opina, req: N1 },
        { id: 'chiste', p: t('Cuéntame un chiste', 'Tell me a joke'), r: t('¿Por qué las papas fritas no van al gimnasio? Porque ya están bien doraditas. Ya, me retiro.', "Why don't french fries go to the gym? Because they're already golden. Okay, I'm leaving."), req: N2, g: 'risa' },
        { id: 'asado', p: t('¿Qué tal el asado?', 'How was the barbecue?'), r: t('Cuando sale bien, se nota. Cuando sale quemado, también, pero de otra forma.', 'When it turns out well, you can tell. When it burns, you can tell too, just differently.'), req: { mj: 'asado' }, g: 'rasca' },
        { id: 'secreto', p: P.secreto, r: t('A veces pierdo a propósito en Fortnite para que los chiquillos se rían. Bueno, a veces no es a propósito.', 'Sometimes I lose in Fortnite on purpose so the guys laugh. Well, sometimes it is not on purpose.'), req: N3 }
    ],
    // ---------------- Andy (campamento) ----------------
    andy: [
        { id: 'quien', p: P.quien, r: t('Andy. El del polerón azul y el baile de victoria, aunque ganemos poco.', 'Andy. Blue hoodie, victory dance, even if we rarely win.'), g: 'yo',
            skin: {
                pony: t('¿Pony? ¿Me preguntas quién soy después de todos los trabajos que hice yo solo?', 'Pony? You ask who I am after all the projects I did alone?'),
                salonas: t('Salonas, soy el que te aplaude en primera fila. El que no sabe bailar en 7/8.', "Salonas, I'm the one clapping in the front row. The one who can't dance in 7/8."),
                hadad: t('Hadad, soy tu dúo. Pásame los materiales y deja de preguntar tonteras.', "Hadad, I'm your duo. Pass me the materials and stop asking silly things."),
                nacho: t('Nacho, soy tu compañero de trabajos. Y de desvelos. Y de Fortnite.', "Nacho, I'm your project partner. And all-nighter partner. And Fortnite partner."),
                braulio: t('Braulio, soy Andy, ¡el de siempre! Pasa a la fogata, que hay espacio.', "Braulio, it's Andy, same as always! Come to the fire, there's room.")
            } },
        { id: 'aqui', p: P.aqui, r: t('Defiendo la base. O sea, estoy sentado junto al fuego, pero en modo alerta.', "I defend the base. I mean, I'm sitting by the fire, but on alert.") },
        { id: 'venjy', p: P.venjy, r: t('Con Venjy somos conocidos. Me cae bien, pregunta harto y siempre trae alguna idea nueva.', 'Venjy and I are acquaintances. I like him, he asks a lot and always brings a new idea.'),
            skin: { venjy: t('Venjy, nos conocemos poco, pero me gusta tu mapa. Bailé en cada zona, para que sepas.', "Venjy, we don't know each other much, but I like your map. I danced in every zone, just so you know.") } },
        { id: 'opina', p: P.opina, req: N1 },
        { id: 'baile', p: t('¿Me enseñas el baile?', 'Will you teach me the dance?'), r: t('Brazo arriba, brazo abajo y cara de que ganaste, aunque hayas quedado décimo.', 'Arm up, arm down, and a face like you won, even if you came tenth.'), req: N2, g: 'baile' },
        { id: 'trabajos', p: t('¿Cómo van los trabajos de la U?', 'How are your uni projects going?'), r: t('Con el Nacho vamos al día. Desde que el Pony no está en el grupo, hasta entregamos antes.', "Nacho and I are on track. Since Pony left the group, we even hand things in early."), req: { mision: 'andy2' }, g: 'risa' },
        { id: 'secreto', p: P.secreto, r: t('El creeper que me voló la torre... yo le pegué primero. No le digas a nadie, que quedé de víctima.', 'The creeper that blew up my tower... I hit it first. Don\'t tell anyone, I came out as the victim.'), req: N3, g: 'rasca' }
    ],
    // ---------------- Nacho (campamento) ----------------
    nacho: [
        { id: 'quien', p: P.quien, r: t('Nacho. El que se ríe de todo y cae en Tilted aunque le digan que no.', 'Nacho. The one who laughs at everything and drops at Tilted even when told not to.'), g: 'risa',
            skin: {
                pony: t('Jajaja, Pony, ¿quién soy? El que se ríe cuando dices que no eres chico.', "Haha, Pony, who am I? The one who laughs when you say you're not short."),
                hadad: t('Hadad, jajaja, soy el que se ríe de tus chistes. El único, ojo.', "Hadad, haha, I'm the one who laughs at your jokes. The only one, mind you."),
                andy: t('Andy, soy tu compañero de trabajos. Entrega el viernes, por si se te olvidó.', "Andy, I'm your project partner. Due Friday, in case you forgot.")
            } },
        { id: 'aqui', p: P.aqui, r: t('Cuido la fogata y el asado. Bueno, más el asado que la fogata.', 'I watch the fire and the barbecue. Well, the barbecue more than the fire.') },
        { id: 'venjy', p: P.venjy, r: t('A Venjy lo conozco, nos llevamos bien. Cada vez que pasa me pregunta por Tilted, jajaja.', 'I know Venjy, we get along. Every time he comes by he asks me about Tilted, haha.'), g: 'risa',
            skin: { venjy: t('Jajaja, ¿cómo te conocí? Me preguntaste si había vuelto a caer en Tilted. Así, de una.', 'Haha, how did I meet you? You asked if I had dropped at Tilted again. Just like that.') } },
        { id: 'opina', p: P.opina, req: N1 },
        { id: 'tilted', p: t('¿Por qué siempre caes en Tilted?', 'Why do you always drop at Tilted?'), r: t('Porque es lo más bonito del mapa. Muero en diez segundos, pero bonito.', 'Because it is the prettiest part of the map. I die in ten seconds, but prettily.'), req: N2, g: 'risa' },
        { id: 'asado', p: t('¿Quién asa mejor?', 'Who grills best?'), r: t('Mi tío en septiembre, jajaja. Pero tú vas segundo, y eso es mucho decir.', "My uncle in September, haha. But you're second, and that's saying a lot."), req: { mj: 'asado' }, g: 'tu' },
        { id: 'secreto', p: P.secreto, r: t('Jajaja, mi risa es de nervios la mitad de las veces. La otra mitad es porque Hadad contó un chiste.', 'Haha, half the time my laugh is nerves. The other half is because Hadad told a joke.'), req: N3, g: 'risa' }
    ],
    // ---------------- Moisés (iglú) ----------------
    moises: [
        { id: 'quien', p: P.quien, r: t('Moisés. Pelo largo, iglú propio y paciencia de sobra.', 'Moisés. Long hair, my own igloo and patience to spare.'), g: 'yo',
            skin: { lalo: t('¿Lalo? ¿En serio? Vivimos juntos, hermano. Ayer te comiste mi pan.', 'Lalo? Seriously? We live together, bro. Yesterday you ate my bread.') } },
        { id: 'aqui', p: P.aqui, r: t('Vivo acá con Lalo. Miramos la aurora, conversamos y no nos apuramos por nada.', "I live here with Lalo. We watch the aurora, we talk and we're never in a rush.") },
        { id: 'venjy', p: P.venjy, r: t('Con Venjy nos conocemos desde Coyhaique, cuando teníamos trece o catorce. Desde ahí, amigos.', "Venjy and I met in Coyhaique, when we were thirteen or fourteen. Friends ever since."),
            skin: { venjy: t('Hermano, desde los trece en Coyhaique. ¿Te acuerdas de la nieve hasta las rodillas? Yo sí.', 'Bro, since thirteen in Coyhaique. Remember the knee-deep snow? I do.') } },
        { id: 'opina', p: P.opina, req: N1 },
        { id: 'coyhaique', p: t('¿Cómo era Coyhaique?', 'What was Coyhaique like?'), r: t('Frío, verde y tranquilo. Por eso este iglú se siente como casa.', 'Cold, green and calm. That is why this igloo feels like home.'), req: N2 },
        { id: 'aurora', p: t('¿Viste la aurora?', 'Did you see the aurora?'), r: t('Desde las ventanas nuevas se ve entera. Lalo dice que es el humo; yo digo que es magia.', "From the new windows you see all of it. Lalo says it's the smoke; I say it's magic."), req: { mision: 'moises2' }, g: 'ojos' },
        { id: 'secreto', p: P.secreto, r: t('El ¡YIAAAAAA! lo inventamos con Lalo una noche cualquiera. Nadie sabe qué significa, ni nosotros.', 'Lalo and I made up the YIAAAAAA! on a random night. Nobody knows what it means, not even us.'), req: N3, g: 'brazosArriba' }
    ],
    // ---------------- Lalo (iglú) ----------------
    lalo: [
        { id: 'quien', p: P.quien, r: t('Lalo, ahya. Sombrero de paja, Jordan limpias y buena onda garantizada.', 'Lalo, ahya. Straw hat, clean Jordans and good vibes guaranteed.'), g: 'yo',
            skin: { moises: t('Moisés, hermano, ¿te pegó fuerte el bong? Soy Lalo, vivo contigo.', "Moisés, bro, did the bong hit you hard? I'm Lalo, I live with you.") } },
        { id: 'aqui', p: P.aqui, r: t('Cocino, converso y cuido que el pito no se apague. Lo importante, digamos.', 'I cook, I chat and I make sure the joint stays lit. The important stuff, let\'s say.') },
        { id: 'venjy', p: P.venjy, r: t('Venjy es mi hermano de Coyhaique. Nos conocimos chicos y todavía nos reímos de lo mismo.', 'Venjy is my brother from Coyhaique. We met as kids and still laugh at the same things.'), g: 'risa',
            skin: { venjy: t('¿Me preguntai eso a mí? Hermano, desde Coyhaique. Tú, yo y Moisés, ahya.', 'You are asking me that? Bro, since Coyhaique. You, me and Moisés, ahya.') } },
        { id: 'opina', p: P.opina, req: N1 },
        { id: 'cazuela', p: t('¿Te salió la cazuela?', 'Did the stew turn out?'), r: t('Igualita a la de mi mamá, o casi. Le falta su mano, pero el olor es el mismo.', "Just like my mom's, or almost. It lacks her touch, but it smells the same."), req: { mision: 'lalo2' } },
        { id: 'trauco', p: t('¿Le tienes miedo al Trauco?', 'Are you afraid of the Trauco?'), r: t('Desde que los sacaste del bosque, no. Antes dormía con el sombrero puesto, por si acaso.', 'Since you cleared them from the forest, no. Before, I slept with my hat on, just in case.'), req: { mision: 'lalo3' }, g: 'rasca' },
        { id: 'secreto', p: P.secreto, r: t('A veces me pongo las Jordan solo para estar en el iglú. Nadie las ve, pero yo sé que están limpias.', 'Sometimes I wear the Jordans just to sit in the igloo. Nobody sees them, but I know they are clean.'), req: N3 }
    ],
    // ---------------- Boris (leñera) ----------------
    boris: [
        { id: 'quien', p: P.quien, r: t('Boris. Leña, camisa a cuadros y un hacha que no se cansa.', 'Boris. Firewood, plaid shirt and an axe that never gets tired.'), g: 'yo',
            skin: { lucho: t('Lucho, ¿me estás webeando? Desde la media que me conoces.', "Lucho, are you messing with me? You've known me since high school.") } },
        { id: 'aqui', p: P.aqui, r: t('Corto leña. Alguien tiene que mantener encendido el campamento.', 'I chop wood. Somebody has to keep the camp going.'), g: 'hachazo' },
        { id: 'venjy', p: P.venjy, r: t('Venjy es de los míos. Cuando viene a Linares lo voy a buscar en auto, nos tomamos unas chelas y jugamos LoL en mi PC.', 'Venjy is one of mine. When he comes to Linares I pick him up by car, we have a few beers and play LoL on my PC.'),
            skin: { venjy: t('Te conozco de memoria. Avísame cuándo llegas a Linares y te voy a buscar, como siempre.', 'I know you by heart. Tell me when you get to Linares and I will pick you up, as always.') } },
        { id: 'opina', p: P.opina, req: N1 },
        { id: 'linares', p: t('¿Cómo es Linares?', 'What is Linares like?'), r: t('Tranquilo. Uno maneja, pone música y llega donde los amigos. Así me gusta.', 'Quiet. You drive, put on some music and get to your friends. That is how I like it.'), req: N2 },
        { id: 'revancha', p: t('¿Quieres la revancha?', 'Want a rematch?'), r: t('Cuando quieras. Esta vez afilo el hacha antes, que la otra vez fue culpa del hacha.', 'Whenever you want. This time I sharpen the axe first, last time it was the axe\'s fault.'), req: { mj: 'lena' }, g: 'tu' },
        { id: 'secreto', p: P.secreto, r: t('No le digas a Lucho, pero sigo encontrando que Nana es muy tonta. Él se enoja cada vez.', 'Don\'t tell Lucho, but I still think Nana is really dumb. He gets mad every time.'), req: N3, g: 'risa' }
    ],
    // ---------------- Lucho (leñera) ----------------
    lucho: [
        { id: 'quien', p: P.quien, r: t('Lucho. Jugador de ranked, enemigo de las arañas y primo de Venjy, más o menos.', 'Lucho. Ranked player, enemy of spiders and Venjy\'s cousin, more or less.'), g: 'yo',
            skin: { boris: t('Boris, compadre, ¿quién soy? El que te conoce desde la media y te arbitra los duelos.', 'Boris, mate, who am I? The one who has known you since high school and referees your duels.') } },
        { id: 'aqui', p: P.aqui, r: t('Arbitro los duelos de hacha de Boris y espero que se abra la cola.', "I referee Boris's axe duels and wait for the queue to pop.") },
        { id: 'venjy', p: P.venjy, r: t('Venjy es mi primo. Bueno, es hijo de mi prima, pero tenemos casi la misma edad y nos presentaron como primos. Y quedó.', "Venjy is my cousin. Well, he's my cousin's son, but we're almost the same age so we were introduced as cousins. It stuck."), g: 'rasca',
            skin: { venjy: t('Primo, me preguntas eso y te saco de la party de Apex.', 'Cousin, ask me that again and I kick you from the Apex party.') } },
        { id: 'opina', p: P.opina, req: N1 },
        { id: 'ranked', p: t('¿Cómo va la ranked?', 'How is ranked going?'), r: t('Subiendo, bajando y volviendo a subir. Como todo en la vida, pero con más gritos.', 'Up, down and up again. Like everything in life, but with more yelling.'), req: N2 },
        { id: 'aranas', p: t('¿Por qué odias las arañas?', 'Why do you hate spiders?'), r: t('Tienen ocho patas y cero modales. Gracias por sacarlas de la leñera, de verdad.', 'Eight legs and zero manners. Thanks for clearing them from the woodpile, really.'), req: { mision: 'lucho1' }, g: 'ojos' },
        { id: 'secreto', p: P.secreto, r: t('Cuando Boris no mira, practico con su hacha. Todavía no le gano, pero algún día.', "When Boris isn't looking, I practice with his axe. I can't beat him yet, but someday."), req: N3 }
    ],
    // ---------------- Braulio (naufragio) ----------------
    braulio: [
        { id: 'quien', p: P.quien, r: t('Braulio. De Arica, aunque nadie me cree por lo blanco. Y sí, tengo el dedo doble.', 'Braulio. From Arica, though nobody believes it because I am so pale. And yes, I have the double finger.'), g: 'yo',
            skin: {
                pony: t('Pony, tú sabes quién soy: el que te gana en altura. Por poquito, pero gana.', 'Pony, you know who I am: the one who beats you in height. Barely, but still.'),
                salonas: t('Salonas, soy el de la primera fila. El único que no te pide covers.', "Salonas, I'm the front row guy. The only one who never asks you for covers."),
                andy: t('Andy, soy Braulio, el de las curiosidades. Te guardé una concha bonita.', "Andy, I'm Braulio, the curiosities guy. I saved you a pretty shell."),
                conejeros: t('Conejeros, ¿quién soy yo? El único que entiende tus chistes. Bueno, casi.', "Conejeros, who am I? The only one who gets your jokes. Well, almost.")
            } },
        { id: 'aqui', p: P.aqui, r: t('Vigilo el naufragio y junto lo que trae el mar. Huesos, botellas, de todo.', 'I keep watch over the shipwreck and collect what the sea brings. Bones, bottles, everything.') },
        { id: 'venjy', p: P.venjy, r: t('A Venjy lo conozco, nos llevamos bien. Siempre me pide que le muestre el dedo doble.', 'I know Venjy, we get along. He always asks me to show him the double finger.'), g: 'dedo',
            skin: { venjy: t('¿Cómo te conocí? Fácil: lo primero que miraste fue mi dedo. Lo segundo, que soy blanco para ser de Arica.', 'How did I meet you? Easy: the first thing you looked at was my finger. The second, how pale I am for someone from Arica.') } },
        { id: 'opina', p: P.opina, req: N1 },
        { id: 'dedo', p: t('¿Me muestras el dedo doble?', 'Will you show me the double finger?'), r: t('Mira: uno, dos... y el doble. Sí, se mueve. No, no duele.', 'Look: one, two... and the double. Yes, it moves. No, it does not hurt.'), req: N2, g: 'dedo' },
        { id: 'caleuche', p: t('¿El Caleuche se hundió de verdad?', 'Did the Caleuche really sink?'), r: t('Sí, y quedó una tabla en la orilla. La guardé con mis huesos, que es lo más valioso que tengo.', 'Yes, and a plank washed up on shore. I keep it with my bones, my most valuable things.'), req: { jefe: 'jefe3' }, g: 'sorpresa' },
        { id: 'arica', p: t('¿De verdad eres de Arica?', 'Are you really from Arica?'), r: t('De Arica, eh. El sol de allá nunca me encontró, eso es todo.', 'From Arica, okay? The sun up there just never found me, that is all.'), req: N3, g: 'rasca' }
    ],
    // ---------------- Conejeros (escenario) ----------------
    conejeros: [
        { id: 'quien', p: P.quien, r: t('Conejeros. De San Rosendo, fan de los conejos y del bajo del Salonas.', "Conejeros. From San Rosendo, fan of rabbits and of Salonas's bass."), g: 'cabecea',
            skin: {
                pony: t('¿Quién soy? Tu peor pesadilla, Pony. Y el que te hizo un queque, ojo.', 'Who am I? Your worst nightmare, Pony. And the one who baked you a cake, mind you.'),
                salonas: t('Salonas, soy tu compañero de dibujos. Me debes la mitad del cuaderno.', 'Salonas, I\'m your drawing buddy. You owe me half the notebook.'),
                braulio: t('Braulio, soy yo. El que se ríe de tus chistes aunque no sean tan .exe como los míos.', "Braulio, it's me. The one who laughs at your jokes even if they're not as .exe as mine.")
            } },
        { id: 'aqui', p: P.aqui, r: t('Cabeceo en primera fila. Es un trabajo duro, pero alguien tiene que hacerlo.', "I headbang in the front row. It's hard work, but someone has to do it."), g: 'cabecea' },
        { id: 'venjy', p: P.venjy, r: t('A Venjy lo conozco, nos llevamos bien. Siempre que viene pregunta por el Pony, igual que yo.', 'I know Venjy, we get along. Whenever he comes he asks about Pony, same as me.'),
            skin: { venjy: t('Venjy, nos conocemos de pasada, pero siempre es buena onda. ¿Vamos a molestar al Pony?', "Venjy, we only know each other in passing, but it's always good vibes. Shall we go bug Pony?") } },
        { id: 'opina', p: P.opina, req: N1 },
        { id: 'dibujos', p: t('¿Qué dibujan con Salonas?', 'What do you and Salonas draw?'), r: t('Tonteras: un conejo con lentes, el Pony montado en un pez, un Imbunche con corbata. Arte.', 'Nonsense: a rabbit with glasses, Pony riding a fish, an Imbunche in a tie. Art.'), req: N2, g: 'risa' },
        { id: 'queque', p: t('¿Le gustó el queque al Pony?', 'Did Pony like the cake?'), r: t('Se lo comió entero y dijo que estaba seco. Clásico Pony: enemigos hasta en el postre.', 'He ate the whole thing and said it was dry. Classic Pony: enemies even at dessert.'), req: { mision: 'conejeros1' }, g: 'risa' },
        { id: 'secreto', p: P.secreto, r: t('No soy tan .exe como parezco. Bueno, sí. Pero ensayo los chistes antes.', "I'm not as .exe as I look. Well, I am. But I rehearse the jokes first."), req: N3, g: 'rasca' }
    ]
};

// «¿Qué opinas de...?»: solo aparecen quienes conoce (tabla de relaciones de 6c)
export const OPINIONES = {
    venjy: {
        pony: t('El Pony es terrible weón, pero es nuestro weón. Y es chico, eso no se discute.', "Pony is a total goof, but he's our goof. And he's short, that's not up for debate."),
        boris: t('Boris es de los buenos: me va a buscar a Linares, compartimos unas chelas y terminamos jugando LoL en su PC.', 'Boris is one of the good ones: he picks me up in Linares, we share some beers and end up playing LoL on his PC.'),
        moises: t('Con Moisés nos conocemos desde Coyhaique, a los trece. Le cambió el pelo, no la buena onda.', "Moisés and I go back to Coyhaique, at thirteen. His hair changed, his good vibes didn't."),
        lalo: t('Lalo es hermano de la vida. Desde Coyhaique, igual que Moisés, y ahora viven juntos en el iglú.', 'Lalo is a brother for life. Since Coyhaique, like Moisés, and now they live together in the igloo.'),
        salonas: t('Salonas es mi socio. Sacamos ProcedimientoSeguro juntos, a punta de café y conversaciones a medianoche.', 'Salonas is my partner. We launched ProcedimientoSeguro together, fueled by coffee and midnight talks.'),
        lona: t('Lona es mi polola. Y la jefa de Mila y Gala, que es el cargo más alto de este mundo.', 'Lona is my girlfriend. And the boss of Mila and Gala, the highest rank in this world.'),
        hadad: t('Hadad me cae bien. No nos vemos tanto, pero cuando nos vemos es buena conversa.', "I like Hadad. We don't see each other much, but when we do, the talk is good."),
        andy: t('Andy es buena onda. Si oyes música y alguien bailando, es él celebrando algo.', "Andy is cool. If you hear music and someone dancing, it's him celebrating something."),
        nacho: t('El Nacho siempre se está riendo. Es imposible estar de mal humor al lado de él.', "Nacho is always laughing. It's impossible to be in a bad mood next to him."),
        braulio: t('Braulio es de Arica y es más blanco que yo, que soy del sur. Y ese dedo doble, no lo supero.', "Braulio is from Arica and paler than me, and I'm from the south. And that double finger, I'm still not over it."),
        lucho: t('Lucho es mi primo... técnicamente primo de mi mamá, pero tenemos casi la misma edad. Compañero de Apex.', "Lucho is my cousin... technically my mom's cousin, but we're almost the same age. My Apex teammate."),
        conejeros: t('Conejeros es simpático. Con Salonas dibujan unas tonteras que deberían estar en un museo.', 'Conejeros is nice. He and Salonas draw nonsense that belongs in a museum.')
    },
    pony: {
        venjy: t('El Venjy dice que soy weón y que soy chico. Lo segundo lo discuto; lo primero... también.', 'Venjy says I\'m a goof and that I\'m short. I dispute the second; the first... too.'),
        salonas: t('El Salonas es un waton klo. Y él dice que yo también. Empate técnico.', 'Salonas is a big goof. And he says I am too. A technical draw.'),
        hadad: t('Hadad tira unos chistes de papas fritas que no sé si reírme o tirarme al agua.', "Hadad tells french fry jokes that make me unsure whether to laugh or jump into the water."),
        andy: t('El Andy es mi yunta. Hacíamos los trabajos juntos hasta que me echó por webiar. Ahora los hace con el Nacho.', 'Andy is my best bud. We did projects together until he kicked me out for goofing off. Now he does them with Nacho.'),
        nacho: t('El Nacho es buena onda. Se ríe de todo, hasta de cuando no pica nada.', "Nacho is cool. He laughs at everything, even when nothing's biting."),
        braulio: t('El Braulio dice que es más alto que yo. Falso. Hay que medirnos con una regla de verdad.', 'Braulio says he\'s taller than me. False. We need to measure with a real ruler.'),
        conejeros: t('El Conejeros es mi enemigo jurado. Bueno, enemigo con el que me junto todas las semanas.', 'Conejeros is my sworn enemy. Well, an enemy I hang out with every week.')
    },
    salonas: {
        venjy: t('Venjy es mi socio. Si ProcedimientoSeguro funciona, es porque nos turnamos para no dormir.', 'Venjy is my partner. If ProcedimientoSeguro works, it\'s because we take turns not sleeping.'),
        pony: t('El Pony es un waton klo. Pero si alguien más se lo dice, me enojo yo.', 'Pony is a big goof. But if anyone else calls him that, I get mad.'),
        hadad: t('Con Hadad nos saludamos y todo bien. Ni fu ni fa, pero tranquilo.', 'Hadad and I say hi and all good. Neither here nor there, but chill.'),
        andy: t('Andy es cordial, buena persona. Siempre aplaude aunque el compás esté chueco.', 'Andy is friendly, a good guy. He always claps even when the beat is crooked.'),
        nacho: t('Al Nacho lo conozco poco. Se ríe harto, y eso ya es buena señal.', "I don't know Nacho much. He laughs a lot, which is already a good sign."),
        braulio: t('Braulio es amigo. Viene a los ensayos y nunca pide nada de Primus, cosa rara.', 'Braulio is a friend. He comes to rehearsals and never asks for Primus, which is rare.'),
        conejeros: t('El Conejeros es mi compañero de tonteras. Mismo humor y un cuaderno lleno de dibujos que nadie debe ver.', 'Conejeros is my partner in nonsense. Same humor, and a notebook full of drawings nobody should see.')
    },
    lona: {
        venjy: t('Venjy es mi pololo, y el único que logra que Gala se le eche en la pierna.', 'Venjy is my boyfriend, and the only one Gala lies down on.'),
        moises: t('A Moisés lo conozco por Venjy. Simpático, siempre me saluda desde la puerta del iglú.', 'I know Moisés through Venjy. Nice guy, always waves at me from the igloo door.'),
        lalo: t('Lalo es amigo de Venjy de toda la vida. Lo conozco poco, pero me cae bien.', 'Lalo is a lifelong friend of Venjy. I don\'t know him much, but I like him.')
    },
    hadad: {
        venjy: t('Venjy es buena onda. No lo veo tanto, pero cuando aparece trae algo nuevo que mostrar.', "Venjy is cool. I don't see him much, but when he shows up he has something new to show."),
        pony: t('El Pony se ríe de mis chistes de papas fritas. Bueno, se ríe de mí, pero cuenta igual.', 'Pony laughs at my french fry jokes. Well, he laughs at me, but it still counts.'),
        salonas: t('Salonas, cordial. Nos saludamos y cada uno vuelve a lo suyo.', 'Salonas, friendly. We say hi and each goes back to his own thing.'),
        andy: t('Andy es de mis mejores amigos. Fortnite, Discord hasta tarde y cero rencor cuando perdemos.', 'Andy is one of my best friends. Fortnite, Discord until late and zero grudges when we lose.'),
        nacho: t('El Nacho es familia. Si estamos en el Discord, él es el que se ríe más fuerte.', "Nacho is family. If we're on Discord, he's the one laughing the loudest."),
        braulio: t('Braulio es cordial, nos llevamos bien. Algún día me muestra el dedo doble.', 'Braulio is friendly, we get along. Someday he will show me the double finger.'),
        conejeros: t('Conejeros, cordial también. Humor raro, pero buena gente.', 'Conejeros, friendly too. Weird humor, but good people.')
    },
    andy: {
        venjy: t('Venjy es buena onda. Si alguna vez juega Fortnite con nosotros, le enseño el baile.', 'Venjy is cool. If he ever plays Fortnite with us, I will teach him the dance.'),
        pony: t('El Pony es mi amigo del alma. Lo saqué del grupo de trabajos porque webiaba mucho, pero lo sigo queriendo.', 'Pony is my soul friend. I took him out of the project group because he goofed around too much, but I still love him.'),
        salonas: t('Salonas es cordial y toca bacán. Le aplaudo aunque no entienda los compases.', "Salonas is friendly and plays great. I clap even though I don't get the time signatures."),
        hadad: t('Hadad es mi partner de Fortnite. Horas en el Discord y todavía no nos aburrimos.', "Hadad is my Fortnite partner. Hours on Discord and we're still not bored."),
        nacho: t('El Nacho es mi yunta: hacemos los trabajos de la U juntos y después jugamos hasta tarde.', 'Nacho is my best bud: we do our uni projects together and then play until late.'),
        braulio: t('Braulio es amigo, cordial. Siempre llega con alguna cosa rara de la playa.', 'Braulio is a friend, friendly. He always shows up with some odd thing from the beach.'),
        conejeros: t('Conejeros, cordial. Su humor no lo entiendo del todo, pero me río igual.', "Conejeros, friendly. I don't fully get his humor, but I laugh anyway.")
    },
    nacho: {
        venjy: t('Venjy es simpático. Se ríe conmigo, que es lo único que pido.', 'Venjy is nice. He laughs with me, which is all I ask.'),
        pony: t('El Pony es buena onda, jajaja. Chico, pero buena onda.', 'Pony is cool, haha. Short, but cool.'),
        salonas: t('Salonas toca bien. Lo conozco poco, pero cada riff me deja moviendo la pata.', "Salonas plays well. I don't know him much, but every riff gets my foot tapping."),
        hadad: t('Hadad es como un hermano. Si se cae el Discord, lo llamo por teléfono, jajaja.', 'Hadad is like a brother. If Discord goes down, I call him on the phone, haha.'),
        andy: t('Andy y yo somos equipo: trabajos de la U de día y Fortnite de noche.', 'Andy and I are a team: uni projects by day and Fortnite by night.'),
        braulio: t('Braulio, cordial. Un día me mostró el dedo doble y no dormí, jajaja.', 'Braulio, friendly. One day he showed me the double finger and I could not sleep, haha.'),
        conejeros: t('Conejeros, cordial. Tiene un humor raro que igual me hace reír.', 'Conejeros, friendly. He has a weird humor that still makes me laugh.')
    },
    moises: {
        venjy: t('Venjy es amigo de los de antes. Nos vemos y es como si no hubiera pasado el tiempo.', "Venjy is an old-school friend. We meet and it's like no time has passed."),
        lalo: t('Lalo es mi mejor amigo. Vivimos juntos y lo quiero mucho, aunque deje la loza para mañana.', 'Lalo is my best friend. We live together and I love him a lot, even if he leaves the dishes for tomorrow.'),
        lona: t('A Lona la conozco por Venjy. Buena onda, y las gatas la adoran, eso dice harto.', 'I know Lona through Venjy. Good vibes, and the cats adore her, that says a lot.')
    },
    lalo: {
        venjy: t('Venjy es de los mejores. Siempre vuelve al iglú, aunque esté lleno de proyectos.', 'Venjy is one of the best. He always comes back to the igloo, even when he is full of projects.'),
        moises: t('Moisés es mi mejor amigo y mi compañero de casa. Lo quiero un montón, hermano.', 'Moisés is my best friend and my housemate. I love him a ton, bro.'),
        lona: t('Lona, la polola de Venjy. La conozco poco, pero es buena onda, ahya.', "Lona, Venjy's girlfriend. I don't know her much, but she's cool, ahya.")
    },
    boris: {
        venjy: t('Venjy es mi amigo de verdad. Viene poco a Linares, pero cuando viene no paramos.', "Venjy is a true friend. He rarely comes to Linares, but when he does we don't stop."),
        lucho: t('Lucho es mi amigo desde la media. Me dice negro de cariño y yo lo dejo, porque es Lucho.', 'Lucho has been my friend since high school. He calls me "negro" with affection and I let him, because it\'s Lucho.')
    },
    lucho: {
        venjy: t('Venjy es mi primo y mi compañero de Apex. Cuando juega concentrado, no se le habla.', 'Venjy is my cousin and my Apex teammate. When he is focused, you do not talk to him.'),
        boris: t('El negro Boris, de cariño. Amigos desde la media y todavía me aguanta.', 'Good old Boris, "negro" with love. Friends since high school and he still puts up with me.')
    },
    braulio: {
        venjy: t('Venjy me cae bien. Se sorprende con el dedo doble como si fuera la primera vez, cada vez.', 'I like Venjy. He is amazed by the double finger like it is the first time, every time.'),
        pony: t('El Pony dice que es más alto que yo. Mentira, eh. Tráiganme una huincha.', 'Pony says he is taller than me. Lies, okay? Bring me a tape measure.'),
        salonas: t('Salonas es amigo. Toca bien y presta los lentes para la foto.', 'Salonas is a friend. He plays well and lends his shades for the photo.'),
        hadad: t('Hadad, cordial. Nos saludamos de lejos, como los barcos.', 'Hadad, friendly. We greet each other from afar, like ships.'),
        andy: t('Andy es amigo, cordial. Una vez me guardó un pedazo de pollo asado. Eso no se olvida.', 'Andy is a friend, friendly. Once he saved me a piece of roast chicken. You don\'t forget that.'),
        nacho: t('Al Nacho lo conozco poco. Se ríe de mi dedo, pero con cariño.', "I don't know Nacho much. He laughs at my finger, but kindly."),
        conejeros: t('Conejeros es amigo. Tenemos humor parecido, solo que yo no soy tan .exe.', "Conejeros is a friend. We have a similar humor, I'm just not as .exe.")
    },
    conejeros: {
        venjy: t('Venjy es simpático. Le gusta el pixel art, así que somos del mismo club.', 'Venjy is nice. He likes pixel art, so we are in the same club.'),
        pony: t('El Pony es mi enemigo oficial. Lo molesto, me molesta, y después compartimos el queque.', 'Pony is my official enemy. I bug him, he bugs me, and then we share the cake.'),
        salonas: t('El Salonas es mi compañero de tonteras. Mismo humor, mismos dibujos ridículos. El mejor.', 'Salonas is my partner in nonsense. Same humor, same ridiculous drawings. The best.'),
        hadad: t('Hadad, cordial. Buen tipo, aunque se ríe raro de mis chistes.', 'Hadad, friendly. Good guy, though he laughs oddly at my jokes.'),
        andy: t('Andy, cordial. Baila mejor de lo que admite.', 'Andy, friendly. He dances better than he admits.'),
        nacho: t('Nacho, cordial. Se ríe de todo, así que conmigo se ríe el doble.', 'Nacho, friendly. He laughs at everything, so with me he laughs twice as much.'),
        braulio: t('Braulio es amigo: humor parecido al mío, pero más tranquilo. Menos .exe, dice él.', 'Braulio is a friend: humor like mine, but calmer. Less .exe, he says.')
    }
};

export const SALUDOS = {
    venjy: { bajo: t('Hola, bienvenido al Inicio. Aquí empieza todo, incluido mi portafolio.', 'Hi, welcome to the Start. Everything begins here, my portfolio included.'),
        alto: t('¡Volviste! Ya te estaba guardando un lugar en el Inicio.', 'You came back! I was saving you a spot at the Start.'),
        skin: { lona: t('¡Lona! ¿Te escapaste de las gatas para venir a verme?', 'Lona! Did you escape the cats to come see me?') } },
    pony: { bajo: t('Shh, que espantas a los peces. Ya, dime.', 'Shh, you are scaring the fish. Okay, tell me.'), alto: t('¡Llegaste! Siéntate, que hoy los peces andan conversadores.', 'You made it! Sit down, the fish are chatty today.') },
    salonas: { bajo: t('Wena. Estoy afinando, dame un compás.', 'Hey. I am tuning, give me a bar.'), alto: t('¡Compadre! Llegaste justo para el solo de bajo.', 'Mate! You came right in time for the bass solo.') },
    lona: { bajo: t('Hola. Cuidado dónde pisas, que alguna gata anda por ahí.', 'Hi. Watch your step, there is a cat around somewhere.'), alto: t('¡Hola! Mila te reconoció antes que yo, mira cómo te mira.', 'Hi! Mila recognized you before I did, look at her staring.'),
        skin: { venjy: t('¡Amor! Llegaste justo, Gala te estaba esperando en la puerta.', 'Love! Right on time, Gala was waiting for you at the door.') } },
    hadad: { bajo: t('Buenas. Siéntate si quieres, el fuego es de todos.', 'Hey there. Sit if you want, the fire belongs to everyone.'), alto: t('¡Compa! Justo íbamos a armar partida. ¿Te prendes?', 'Buddy! We were just about to start a match. You in?') },
    andy: { bajo: t('Hola, hola. Estoy en el lobby, pero te escucho.', 'Hey, hey. I am in the lobby, but I am listening.'), alto: t('¡Eh! Llegó mi dúo favorito. Bueno, después del Nacho.', 'Hey! My favorite duo is here. Well, after Nacho.') },
    nacho: { bajo: t('Jajaja, hola. Perdón, me estaba acordando de algo.', 'Haha, hi. Sorry, I was remembering something.'), alto: t('¡Jajaja, volviste! Siéntate, que se viene el cuento bueno.', 'Haha, you are back! Sit down, the good story is coming.') },
    moises: { bajo: t('Hola, hermano. Pasa, pero cierra que se escapa el frío.', 'Hi, bro. Come in, but close it so the cold stays in.'), alto: t('¡Hermano! Pasa, pasa, que el iglú está tibiecito, ahya.', 'Bro! Come in, come in, the igloo is nice and cozy, ahya.') },
    lalo: { bajo: t('Ahya, ¿qué tal? Pasa nomás.', 'Ahya, how is it going? Come on in.'), alto: t('¡Ahya, hermano! Llegaste justo para la ronda.', 'Ahya, bro! Right on time for the round.') },
    boris: { bajo: t('Hola. Si vas a mirar, que sea de lejos, que vuelan astillas.', 'Hi. If you are watching, do it from afar, chips fly.'), alto: t('¡Wena! Deja el hacha ahí, que hoy corto yo.', 'Hey! Leave the axe there, I am chopping today.') },
    lucho: { bajo: t('¿Qué onda? Estoy esperando cola, habla nomás.', 'What is up? I am waiting in queue, go ahead and talk.'), alto: t('¡Primo! O casi primo. Pasa, pasa.', 'Cousin! Or almost cousin. Come in, come in.') },
    braulio: { bajo: t('Hola, eh. Cuidado con la arena, que se mete en todo.', 'Hi, okay. Careful with the sand, it gets everywhere.'), alto: t('¡Eh, volviste! Encontré otra cosa rara en la orilla, mira.', 'Hey, you are back! I found another odd thing on the shore, look.') },
    conejeros: { bajo: t('Hola. Escucha ese bajo, después hablamos.', 'Hi. Listen to that bass, we will talk later.'), alto: t('¡Compadre! Ven a cabecear, que el Salonas está inspirado.', 'Mate! Come headbang, Salonas is inspired today.') }
};

export const REGALOS = {
    venjy: t('¡Un pastel! Lo partimos en el Inicio y le guardamos un pedazo a Lona.', 'A cake! We cut it at the Start and save a slice for Lona.'),
    pony: t('Pescado ya cocinado... me ahorraste la fogata. Esto sí que es amistad.', 'Fish already cooked... you saved me the fire. Now that is friendship.'),
    salonas: t('Con esto me alcanza para otro pedal o para otro dibujo ridículo. Gracias, compadre.', 'This is enough for another pedal or another ridiculous drawing. Thanks, mate.'),
    lona: t('¡Lana! Ya sé qué le voy a tejer a Mila para que no le tenga envidia a Gala.', 'Wool! I know what I will knit for Mila so she is not jealous of Gala.'),
    hadad: t('Una papa asada. ¿Sabes qué es mejor que una papa? Dos papas. Gracias.', 'A baked potato. Know what is better than one potato? Two potatoes. Thanks.'),
    andy: t('¡Pollo asado! Winner winner, chicken dinner. Bailo por ti.', 'Roast chicken! Winner winner, chicken dinner. I dance for you.'),
    nacho: t('Jajaja, ¡carne para la parrilla! Te ganaste un puesto fijo en el asado.', 'Haha, meat for the grill! You earned a permanent seat at the barbecue.'),
    moises: t('Estofado calentito... justo lo que pide el iglú. Gracias, hermano.', 'Warm stew... just what the igloo needs. Thanks, bro.'),
    lalo: t('Pan amasado, ahya. Lo partimos con Moisés y te guardamos la punta.', 'Homemade bread, ahya. Moisés and I split it and save you the end piece.'),
    boris: t('Una manzana para la pega. Me la como entre hachazo y hachazo.', 'An apple for the job. I will eat it between swings.'),
    lucho: t('Una galleta para la cola de ranked. Si gano, es gracias a ti.', 'A cookie for the ranked queue. If I win, it is thanks to you.'),
    braulio: t('¡Un hueso para la colección! Le pongo tu nombre en la etiqueta.', 'A bone for the collection! I will put your name on the label.'),
    conejeros: t('Zanahoria o papel, igual sirve: o se la comen los conejos o la dibujamos.', 'Carrot or paper, either works: the rabbits eat it or we draw on it.')
};
// Gesto al recibir el regalo (por defecto, risa)
export const GESTO_REGALO = { andy: 'baile', lona: 'brazosArriba', braulio: 'sorpresa' };
