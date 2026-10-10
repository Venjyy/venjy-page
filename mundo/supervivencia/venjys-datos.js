// =========================================================
// VENJY · Supervivencia · Qué dicen los Venjy (bloque 7f-1)
// En el creativo cada Venjy repite los DICHOS de su lugar (criaturas/venjy.js). En la supervivencia
// `n.frases` pasa a ser una función (main.js la conecta) que elige por prioridad entre ocho fuentes:
//   1 pista del lugar · 2 brújula viva · 3 progreso · 4 reacción a tu skin · 5 reacción a la amistad ·
//   6 mini-encargo diario («Carta», solo el Venjy del correo) · 7 hora y peligro · 8 chistes internos.
// Este archivo se carga con import() al primer globo: no suma nada a la carga inicial. Es lógica pura
// (sin DOM ni three.js) para poder probarla en mundo/tests/venjys.mjs. Los textos los revisa el dueño.
// =========================================================
import { JEFES } from './misiones-datos.js';

const F = (es, en) => ({ es, en });

// ---------------------------------------------------------
// Personas: nombre con artículo (es), «a/al» y nombre en inglés
// ---------------------------------------------------------
export const PERSONA = {
    pony: { es: 'el Pony', a: 'al Pony', en: 'Pony' },
    salonas: { es: 'el Salonas', a: 'al Salonas', en: 'Salonas' },
    lona: { es: 'la Lona', a: 'a la Lona', en: 'Lona' },
    hadad: { es: 'el Hadad', a: 'al Hadad', en: 'Hadad' },
    andy: { es: 'el Andy', a: 'al Andy', en: 'Andy' },
    nacho: { es: 'el Nacho', a: 'al Nacho', en: 'Nacho' },
    moises: { es: 'el Moisés', a: 'al Moisés', en: 'Moisés' },
    lalo: { es: 'el Lalo', a: 'al Lalo', en: 'Lalo' },
    boris: { es: 'el Boris', a: 'al Boris', en: 'Boris' },
    lucho: { es: 'el Lucho', a: 'al Lucho', en: 'Lucho' },
    braulio: { es: 'el Braulio', a: 'al Braulio', en: 'Braulio' },
    conejeros: { es: 'el Conejeros', a: 'al Conejeros', en: 'Conejeros' }
};
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

// ---------------------------------------------------------
// 1 · Pista del lugar (dos por lugar; lo que dice cada Venjy según dónde está)
// ---------------------------------------------------------
export const PISTAS = {
    inicio: [
        F('Todo parte de un tronco: tablones, una mesa de crafteo y recién ahí el primer pico.', 'It all starts with a log: planks, a crafting table, and only then the first pickaxe.'),
        F('Una cama dormida de noche salta a la mañana y guarda tu punto de reaparición.', 'A bed slept in at night skips to morning and saves your respawn point.')
    ],
    casa: [
        F('Los cofres de las casas guardan cosas: revisa los rincones antes de salir.', 'The chests in the houses hold things: check the corners before you leave.'),
        F('Si me ves leyendo, no es un truco: el libro de la mesa trae mi CV de verdad.', 'If you see me reading, it is no trick: the book on the table holds my real CV.')
    ],
    registro: [
        F('Cada cofre del mapa trae botín según el lugar: el de la mina no es el de la casa.', 'Every chest on the map has loot for its place: the mine one is not the house one.'),
        F('Los amigos con un signo ! sobre la cabeza tienen una misión para ti.', 'Friends with a ! over their heads have a quest for you.')
    ],
    mina: [
        F('El diamante vive bajo: entre y = 5 y 16. Y sin pico de hierro no sale.', 'Diamonds live deep: between y = 5 and 16. And they will not drop without an iron pickaxe.'),
        F('El altar del Imbunche está al fondo del túnel. Lleva comida, antorchas y armadura.', "The Imbunche's altar is at the end of the tunnel. Bring food, torches and armor.")
    ],
    aldea: [
        F('Aquí hay cultivos de trigo, zanahoria y papa: con semillas, la comida no se acaba.', 'There are wheat, carrot and potato crops here: with seeds, food never runs out.'),
        F('Los amigos compran y venden por esmeraldas: mira la pestaña Tienda al hablar con ellos.', 'Friends buy and sell for emeralds: check the Shop tab when you talk to them.')
    ],
    gatera: [
        F('A Mila y Gala se las acaricia con la tecla G, estando cerca. Con calma, que mandan ellas.', 'You pet Mila and Gala with the G key, when you are close. Gently, they are the bosses.'),
        F('Si las gatas te miran fijo, es porque saben que traes comida. No es mala fe.', 'If the cats stare at you, they know you have food. They mean no harm.')
    ],
    correo: [
        F('Carne cruda llena poco: pásala por el horno y el hambre te lo agradece.', 'Raw meat fills little: put it through the furnace and your hunger will thank you.'),
        F('Si el correo suena, es el viento. Las cartas verdaderas las traigo yo.', 'If the mail creaks, it is the wind. The real letters I bring myself.')
    ],
    faro: [
        F('El Caleuche sale frente al naufragio, pero solo cuando juntes 36 misiones de amigos.', 'The Caleuche rises off the shipwreck, but only once you gather 36 friend quests.'),
        F('El faro se ve desde lejos: úsalo de referencia cuando se haga de noche.', 'The lighthouse is visible from afar: use it as a landmark when night falls.')
    ],
    puente: [
        F('Con caña y paciencia salen bacalao y salmón. Cocinados llenan más.', 'With a rod and patience you get cod and salmon. Cooked, they fill you more.'),
        F('El Pony pesca de día y de noche. Si le llevas un salmón cocido, te quiere más.', 'Pony fishes day and night. Bring him a cooked salmon and he likes you more.')
    ],
    escenario: [
        F('A Salonas le gustan la redstone y el papel: regálaselos y sube la amistad.', 'Salonas likes redstone and paper: give him some and the friendship grows.'),
        F('Con un buen amigo, el Salonas te toca algo solo para ti. Cuesta, pero vale.', 'With a good friend, Salonas plays something just for you. It takes work, but it is worth it.')
    ],
    letras: [
        F('Si te pierdes, vuelve a las letras: son lo más alto del mapa.', 'If you get lost, come back to the letters: they are the tallest thing on the map.'),
        F('Cada amigo tiene tres misiones, y cada una te deja más cerca de los jefes.', 'Every friend has three quests, and each one gets you closer to the bosses.')
    ],
    atalaya: [
        F('A Boris le gustan las manzanas y a Lucho las galletas. Regálalos y verás.', 'Boris likes apples and Lucho likes cookies. Give them some and see.'),
        F('Desde la atalaya se ven el bosque y el camino: de noche, mira antes de bajar.', 'From the watchtower you see the forest and the road: at night, look before you climb down.')
    ],
    molino: [
        F('Zzz… dieciséis… más abajo… zzz… (¿hablando dormido? Mejor anotar.)', 'Zzz… sixteen… deeper… zzz… (talking in his sleep? Better take note.)'),
        F('Zzz… de noche el bosque… zzz… no cruces… zzz…', 'Zzz… at night the forest… zzz… do not cross… zzz…')
    ],
    portal: [
        F('El Chonchon solo cae con arco, y sus bolas de fuego se frenan con el escudo.', 'The Chonchon only falls to a bow, and its fireballs are stopped by a shield.'),
        F('El altar de aquí pide la pluma del Chonchon: te la doy cuando tengas 18 misiones.', "This altar wants the Chonchon feather: I'll hand it over once you have 18 quests.")
    ],
    granja: [
        F('Las vacas, ovejas y cerdos se cazan o se crían. La carne cocida llena el doble.', 'Cows, sheep and pigs can be hunted or bred. Cooked meat fills twice as much.'),
        F('El cuero de las vacas sirve para armadura: no lo botes.', "Cow leather makes armor: don't throw it away.")
    ]
};

// ---------------------------------------------------------
// 2 · Brújula viva: nombre de cada destino (con artículo). `camino`: el portafolio está unido por el camino
// de tierra; los lugares para explorar quedan lejos de él.
// ---------------------------------------------------------
export const DESTINOS = {
    casa: { es: 'mi casa', en: 'my house', camino: true },
    registro: { es: 'el registro', en: 'the registry', camino: true },
    mina: { es: 'la mina', en: 'the mine', camino: true },
    aldea: { es: 'la aldea', en: 'the village', camino: true },
    gatera: { es: 'la gatera', en: 'the cat house', camino: true },
    correo: { es: 'el correo', en: 'the post office', camino: true },
    faro: { es: 'el faro', en: 'the lighthouse', camino: true },
    molino: { es: 'el molino viejo', en: 'the old windmill' },
    atalaya: { es: 'la atalaya del bosque', en: 'the forest watchtower' },
    campamento: { es: 'el campamento', en: 'the campsite' },
    portal: { es: 'el portal en ruinas', en: 'the ruined portal' },
    iglu: { es: 'el iglú', en: 'the igloo' },
    naufragio: { es: 'el naufragio', en: 'the shipwreck' }
};
const RUMBO = {
    es: ['norte', 'noreste', 'este', 'sureste', 'sur', 'suroeste', 'oeste', 'noroeste'],
    en: ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest']
};
// El norte es -Z y el este +X (como la brújula del HUD)
export function rumbo(dx, dz) {
    const a = Math.atan2(dx, -dz);
    return ((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8;
}
export function brujula(clave, dx, dz) {
    const d = DESTINOS[clave], r = rumbo(dx, dz);
    const m = Math.max(10, Math.round(Math.hypot(dx, dz) / 10) * 10);
    return F(
        `${cap(d.es)} queda a unos ${m} bloques al ${RUMBO.es[r]}. ${d.camino ? 'Sigue el camino de tierra.' : 'No hay camino hasta allá: guíate por el minimapa.'}`,
        `${cap(d.en)} is about ${m} blocks to the ${RUMBO.en[r]}. ${d.camino ? 'Follow the dirt path.' : 'There is no road there: use the minimap.'}`
    );
}

// ---------------------------------------------------------
// 3 · Progreso (misiones de amigos hechas contra lo que pide cada jefe)
// ---------------------------------------------------------
const NOMBRE_JEFE = {
    imbunche: { es: 'el Imbunche', en: 'the Imbunche' },
    chonchon: { es: 'el Chonchon gigante', en: 'the giant Chonchon' },
    caleuche: { es: 'el Caleuche', en: 'the Caleuche' }
};
export function progreso(hechas, jefesVencidos) {
    const j = JEFES.find(x => !jefesVencidos.has(x.id));
    if (!j) return { id: 'prog:fin', f: F('Los tres jefes cayeron y el mundo está en paz. Ahora solo falta que construyas algo lindo.', 'All three bosses fell and the world is at peace. Now all you have to do is build something nice.') };
    const n = NOMBRE_JEFE[j.jefe];
    if (hechas >= j.requiere) return { id: `prog:listo:${j.id}`, f: F(`Ya tienes las misiones para ${n.es}. Pásate por mí en el inicio cuando quieras.`, `You have the quests for ${n.en}. Come by me at the start whenever you want.`) };
    if (hechas === 0) return { id: 'prog:cero', f: F('Habla con los amigos: cada uno tiene tres misiones, y de ahí sale todo lo demás.', 'Talk to the friends: each has three quests, and everything else comes from that.') };
    const k = j.requiere - hechas;
    return { id: `prog:${j.id}:${k}`, f: F(`Te ${k === 1 ? 'falta 1 misión' : `faltan ${k} misiones`} para ${n.es}. Los amigos siempre tienen algo que pedir.`, `You are ${k} ${k === 1 ? 'quest' : 'quests'} away from ${n.en}. Friends always have something to ask.`) };
}

// ---------------------------------------------------------
// 4 · Reacción a tu skin (la primera vez por skin; `propia`: una skin sin base)
// ---------------------------------------------------------
export const SKIN = {
    venjy: F('¿Ese soy yo? Qué raro verme desde afuera… igual, el original queda mejor.', 'Is that me? Weird to see myself from the outside… still, the original looks better.'),
    pony: F('¿Perdido, Pony? El muelle te queda donde huele a pescado, weón.', 'Lost, Pony? The dock is wherever it smells like fish, man.'),
    salonas: F('Con esa pinta de bajista, ¿trajiste las cinco cuerdas o solo el ruido?', 'With that bassist look, did you bring all five strings or just the noise?'),
    lona: F('Esa polera me suena… saluda a la Lona de mi parte, ¿ya?', 'That shirt looks familiar… say hi to Lona for me, will you?'),
    hadad: F('Esa barba pide leña y chistes malos. Tú elige cuál traes primero.', 'That beard calls for firewood and bad jokes. You choose which one comes first.'),
    andy: F('Con ese poleron, solo falta que te quejes del lag en el Discord.', 'With that hoodie, all that is missing is you complaining about lag on Discord.'),
    nacho: F('Esa polera roja grita Tilted a kilómetros. ¿Dónde caemos?', 'That red shirt screams Tilted from a mile away. Where do we drop?'),
    braulio: F('Más bajito te veo… a ver, espalda con espalda un momento.', 'You look shorter… come on, back to back for a second.'),
    moises: F('Pelo largo y cara de paz: Coyhaique te manda saludos.', 'Long hair and a peaceful face: Coyhaique sends its regards.'),
    lalo: F('El sombrero de paja y las Jordan limpias, ¿te las prestó el Lalo?', 'The straw hat and the clean Jordans, did Lalo lend them to you?'),
    boris: F('Camisa a cuadros y cara de leñador. ¿Cuántos troncos van hoy?', 'Plaid shirt and a lumberjack face. How many logs so far today?'),
    lucho: F('Todo de negro y de madrugada: ¿una ranked más y te acuestas?', 'All in black at dawn: one more ranked and you go to bed?'),
    conejeros: F('Esa polera blanca y negra… ¿hoy tampoco me vas a dibujar el caballo?', 'That black and white shirt… are you not drawing me the horse today either?'),
    propia: F('Esa skin no la conozco. ¿La inventaste tú? Está buena, con onda propia.', "I don't know that skin. Did you make it up? It's good, with its own flavor.")
};

// ---------------------------------------------------------
// 5 · Reacción a la amistad (tu mejor amistad ganada, por nivel: 2 Amigo, 3 Buen amigo, 4 Íntimo)
// ---------------------------------------------------------
export function amistadFrase(clave, nivel) {
    const p = PERSONA[clave];
    if (!p) return null;
    if (nivel >= 4) return F(`Supe que ${p.es} ya te considera de los suyos. Esa amistad se cuida.`, `I heard ${p.en} now counts you as one of their own. That kind of friendship is worth looking after.`);
    if (nivel === 3) return F(`${cap(p.es)} habla bien de ti por todos lados. Eso vale oro.`, `${p.en} speaks well of you everywhere. That is worth gold.`);
    if (nivel === 2) return F(`Me contaron que ${p.es} ya te trata de amigo. Buen comienzo.`, `I was told ${p.en} already treats you like a friend. A good start.`);
    return null;
}

// ---------------------------------------------------------
// 6 · Mini-encargo diario: la «Carta» (la da el Venjy del correo; se entrega por «Hablar»)
// ---------------------------------------------------------
export const DESTINATARIOS = ['pony', 'boris', 'lucho', 'salonas', 'lalo', 'moises', 'hadad', 'andy', 'nacho', 'braulio', 'conejeros', 'lona'];
export const paraDe = dia => DESTINATARIOS[((dia % DESTINATARIOS.length) + DESTINATARIOS.length) % DESTINATARIOS.length];
export const CARTA_ESMERALDAS = 1;

// Lo que dice Venjy al dártela, una por destinatario
export const CARTA_DA = {
    pony: F('Llévale esta carta al Pony, al muelle. Si pregunta qué dice, es sobre pescado.', 'Take this letter to Pony, at the dock. If he asks what it says, it is about fish.'),
    boris: F('Esta carta es para el Boris, el de la leña. Dile que la próxima vez manejo yo.', 'This letter is for Boris, the firewood guy. Tell him I drive next time.'),
    lucho: F('Llévale esta carta al Lucho. Dile que cuando termine la ranked, se acueste.', 'Take this letter to Lucho. Tell him that when his ranked game ends, he should go to bed.'),
    salonas: F('Para el Salonas, de parte del que pone los bugs. Que traiga el café.', 'For Salonas, from the guy who brings the bugs. Tell him to bring the coffee.'),
    lalo: F('Esta carta es para el Lalo. Que no se coma el pan del Moisés, si es que queda.', "This letter is for Lalo. Tell him not to eat Moisés' bread, if any is left."),
    moises: F('Llévale esta carta al Moisés, al iglú. Pregúntale si ya llegó el verano a Coyhaique.', 'Take this letter to Moisés, at the igloo. Ask him if summer has reached Coyhaique yet.'),
    hadad: F('Para el Hadad, el de las papas fritas. Que ya van como cuatro comerciales de plazo.', 'For Hadad, the chips guy. He is about four ads past the deadline.'),
    andy: F('Llévale esta carta al Andy. Dile que el Discord no se cierra solo.', 'Take this letter to Andy. Tell him Discord does not close itself.'),
    nacho: F('Esta carta es para el Nacho. Que me guarde un lugar en la ranked, pero uno donde no caiga solo.', 'This letter is for Nacho. Tell him to save me a spot in the lobby, one where I do not drop alone.'),
    braulio: F('Para el Braulio. Dile que no, que esta vez no le pido el dedo doble.', 'For Braulio. Tell him no, this time I am not asking for the double finger.'),
    conejeros: F('Llévale esta carta al Conejeros, mi enemigo favorito. Que me dibuje el caballo, ahora sí.', 'Take this letter to Conejeros, my favorite enemy. Tell him to draw me that horse, for real this time.'),
    lona: F('Esta carta es para la Lona. Que les dé mis saludos a Mila y a Gala primero.', 'This letter is for Lona. Tell her to greet Mila and Gala for me first.')
};
// Lo que dice el destinatario al recibirla
export const CARTA_RESPUESTA = {
    pony: F('¡Una carta de Venjy! Huele a salmón. Dile que la leí entera y que pican harto.', 'A letter from Venjy! It smells like salmon. Tell him I read it all and that the fish are biting.'),
    boris: F('Mira tú, carta de Venjy. Dile que de copiloto va, pero con el cinturón puesto.', 'Look at that, a letter from Venjy. Tell him he rides shotgun, but with the seat belt on.'),
    lucho: F('Ya lo sé, ya lo sé, una más y me acuesto. Gracias por la carta, primo.', 'I know, I know, one more and I go to bed. Thanks for the letter, cousin.'),
    salonas: F('Café, bugs y una carta. Faltaba solo el deploy un viernes. Gracias, socio.', 'Coffee, bugs and a letter. All that is missing is a Friday deploy. Thanks, partner.'),
    lalo: F('¿El pan del Moisés? Ese pan ya no existe, hermano. Gracias por la carta, ahya.', "Moisés' bread? That bread no longer exists, bro. Thanks for the letter, ahya."),
    moises: F('El verano en Coyhaique es una semana, pero se agradece. Gracias por la carta, hermano.', 'Summer in Coyhaique lasts a week, but it is appreciated. Thanks for the letter, bro.'),
    hadad: F('¿Cuatro comerciales? Pero si con uno me alcanzaba. Gracias por la carta.', 'Four ads? One would have been enough for me. Thanks for the letter.'),
    andy: F('Se cierra con Alt F4, ¿no? Gracias por la carta, la guardo.', 'It closes with Alt F4, right? Thanks for the letter, I will keep it.'),
    nacho: F('Un lugar en la ranked… y que no caiga solo. Me río y tomo la carta, gracias.', 'A spot in the lobby, and not dropping alone. I laugh and take the letter, thanks.'),
    braulio: F('Uf, qué alivio. Aunque igual me quedó la duda. Gracias por la carta.', 'Phew, what a relief. Still, I am left wondering. Thanks for the letter.'),
    conejeros: F('¿Ahora sí el caballo? Prometido… con la cara de Pony, otra vez. Gracias por la carta.', "The horse for real? Promised… with Pony's face again. Thanks for the letter."),
    lona: F('Les mandaré saludos a las gatas… aunque ellas dirán que primero va la lata. Gracias por la carta.', 'I will greet the cats… though they will say the can comes first. Thanks for the letter.')
};
// Cuando se pasa por el correo y toca recordar o esperar
export function cartaTiene(clave) {
    const p = PERSONA[clave];
    return F(`Todavía tienes mi carta para ${p.es}. Cuídala, que no se moje.`, `You still have my letter for ${p.en}. Look after it, do not let it get wet.`);
}
export const CARTA_HOY = F('Por hoy no tengo más cartas. Vuelve mañana: el correo nunca se detiene.', 'No more letters for today. Come back tomorrow: the mail never stops.');
export function cartaOfrece(clave) {
    const p = PERSONA[clave];
    return F(`¿Me haces un favor? Haz clic derecho y te paso una carta para ${p.es}. Hay una esmeralda por el viaje.`, `Can you do me a favor? Right click and I will hand you a letter for ${p.en}. There is an emerald for the trip.`);
}
export const CARTA_ENTREGADA = { es: 'Carta entregada', en: 'Letter delivered' };

// ---------------------------------------------------------
// 7 · Hora y peligro
// ---------------------------------------------------------
export const NOCHE = [
    F('El Trauco anda suelto en el bosque. No te alejes del camino.', "The Trauco is loose in the forest. Don't stray from the path."),
    F('De noche salen zombis, esqueletos y arañas. Ten espada y antorchas a mano.', 'At night zombies, skeletons and spiders come out. Keep a sword and torches handy.'),
    F('Si te da sueño, una cama salta la noche entera. Duerme y despiertas con sol.', 'If you get sleepy, a bed skips the whole night. Sleep and wake up with the sun.'),
    F('¿Escuchaste un siseo? Es un creeper. No te quedes mirándolo.', 'Did you hear a hiss? That is a creeper. Do not stand there staring at it.')
];
export const AMANECER = [
    F('Amaneció. El Trauco se esfuma con el sol, así que ahora el bosque es tuyo.', 'Dawn broke. The Trauco vanishes with the sun, so the forest is yours now.'),
    F('Buenos días. Si aguantaste la noche, desayuna algo antes de seguir.', 'Good morning. If you made it through the night, have something to eat before going on.'),
    F('Ya salió el sol. Es hora de salir a mirar qué dejó la noche.', 'The sun is up. Time to go see what the night left behind.')
];

// ---------------------------------------------------------
// 8 · Chistes internos (de las notas, en buena onda)
// ---------------------------------------------------------
export const CHISTES = [
    F('Si algún día pasas por Linares, el Boris te va a buscar en auto. Ya viene con las chelas.', 'If you ever pass through Linares, Boris will pick you up by car. He is already bringing the beers.'),
    F('Con el Lucho juego Apex. Cuando estoy concentrado, no se me habla. Te aviso nomás.', 'I play Apex with Lucho. When I am focused, do not talk to me. Just a heads-up.'),
    F('Perdimos en el LoL, en el PC del Boris, por culpa del jungla. Yo no era el jungla.', 'We lost at LoL, on Boris\' PC, because of the jungler. I was not the jungler.'),
    F('Con el Salonas nos desvelamos con ProcedimientoSeguro. Él pone el café; yo, los bugs.', 'Salonas and I stay up late over ProcedimientoSeguro. He brings the coffee; I bring the bugs.'),
    F('Dicen que el Braulio es más chico que el Pony. No lo digas muy fuerte.', 'They say Braulio is shorter than Pony. Do not say it too loud.'),
    F('El Hadad salió en un comercial de papas fritas. La imagen era de IA, la fama fue real.', 'Hadad was in a potato chips ad. The picture was AI, the fame was real.'),
    F('Al Moisés y al Lalo los conozco desde Coyhaique, a los trece. Siguen igual de porfiados.', 'I have known Moisés and Lalo since Coyhaique, at thirteen. They are just as stubborn.'),
    F('Mila y Gala mandan en mi casa. Yo solo pongo las latas y abro la puerta.', 'Mila and Gala run my house. I just bring the cans and open the door.'),
    F('El Conejeros es mi enemigo favorito. Ayer nos juntamos a dibujar un caballo con cara de Pony.', "Conejeros is my favorite enemy. Yesterday we got together to draw a horse with Pony's face."),
    F('La Lona dice que programo hasta en sueños. Tiene razón, pero igual me trae café.', 'Lona says I code even in my dreams. She is right, but she still brings me coffee.')
];

// ---------------------------------------------------------
// Selector
// ---------------------------------------------------------
// ctx: pos() -> { x, z } del jugador · sitios() -> [{ clave, x, z }] (claves de DESTINOS) · hechas() -> misiones de amigos hechas ·
//   jefes() -> Set de jefes vencidos · personajes() -> [{ clave, puntos, nivel, ganados }] · skin() -> clave de base | 'propia' | null ·
//   dia() -> { dias, esNoche, t } · carta() -> { tiene, para, hoy } · azar() -> [0, 1)
// Devuelve elegir(n) -> { es, en } | null (null: que use los dichos de siempre).
export function crearSelector(ctx) {
    const dichas = new Map();     // id -> veces que ya se dijo (en esta partida)
    const azar = ctx.azar || Math.random;

    function candidatos(n) {
        const lista = [];
        const poner = (id, prio, f, urgente = false) => { if (f) lista.push({ id, prio, f, urgente }); };
        const lugar = n.lugar;
        const esCorreo = lugar === 'correo';

        // 6 · Carta (solo el Venjy del correo)
        if (esCorreo) {
            const c = ctx.carta();
            if (c.tiene) poner(`carta:tiene:${c.para}`, 100, cartaTiene(c.para), true);
            else if (!c.hoy) poner(`carta:ofrece:${c.para}`, 100, cartaOfrece(c.para), true);
            else poner('carta:hoy', 20, CARTA_HOY);
        }
        // 4 · Skin (primera vez por skin: urgente, sale antes que todo lo demás)
        const sk = ctx.skin();
        if (sk && SKIN[sk]) poner(`skin:${sk}`, 90, SKIN[sk], true);
        // 7 · Hora y peligro (una vez por noche o amanecer)
        const d = ctx.dia();
        if (d.esNoche) NOCHE.forEach((f, i) => poner(`noche:${d.dias}:${i}`, 70, f, i === 0));
        else if (d.t < 45) AMANECER.forEach((f, i) => poner(`amanecer:${d.dias}:${i}`, 70, f, i === 0));
        // 5 · Amistad: la mejor ganada, de nivel Amigo hacia arriba
        let mejor = null;
        for (const p of ctx.personajes()) if (p.ganados > 0 && p.nivel >= 2 && (!mejor || p.puntos > mejor.puntos)) mejor = p;
        if (mejor) poner(`amistad:${mejor.clave}:${mejor.nivel}`, 60, amistadFrase(mejor.clave, mejor.nivel));
        // 3 · Progreso
        const pr = progreso(ctx.hechas(), ctx.jefes());
        poner(pr.id, 50, pr.f);
        // 2 · Brújula: hacia los destinos a más de 30 bloques
        const j = ctx.pos();
        for (const s of ctx.sitios()) {
            const dx = s.x - j.x, dz = s.z - j.z;
            if (DESTINOS[s.clave] && Math.hypot(dx, dz) > 30) poner(`bru:${s.clave}`, 40, brujula(s.clave, dx, dz));
        }
        // 1 · Pistas del lugar
        (PISTAS[lugar] || []).forEach((f, i) => poner(`pista:${lugar}:${i}`, 45, f));
        // 8 · Chistes internos
        CHISTES.forEach((f, i) => poner(`chiste:${i}`, 30, f));
        return lista;
    }

    function elegir(n) {
        const todos = candidatos(n);
        if (!todos.length) return null;
        // Lo urgente que aún no se dijo va primero; si no, lo menos dicho y, a igualdad, lo de más prioridad (azar entre iguales)
        const puntaje = c => {
            const v = dichas.get(c.id) || 0;
            return c.urgente && v === 0 ? -1e6 : v * 1000 - c.prio;
        };
        let mejor = null, mejorP = Infinity, empates = 0;
        for (const c of todos) {
            if (c.id === n.fraseId && todos.length > 1) continue; // no repetir la misma dos veces seguidas
            const p = puntaje(c);
            if (p < mejorP) { mejor = c; mejorP = p; empates = 1; }
            else if (p === mejorP && azar() < 1 / ++empates) mejor = c;
        }
        if (!mejor) return null;
        dichas.set(mejor.id, (dichas.get(mejor.id) || 0) + 1);
        n.fraseId = mejor.id;
        return mejor.f;
    }
    return { elegir, candidatos, dichas };
}
