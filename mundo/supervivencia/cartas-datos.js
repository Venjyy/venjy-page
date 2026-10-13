// =========================================================
// VENJY · Supervivencia · Duelo de Cartas Pixel (7h-2): cartas, mazos, niveles, tutorial y textos
// Todas las cartas son inventadas: criaturas del juego, del folclor chileno y amigos en buena onda.
// No se copia ningún nombre, arte ni texto de cartas reales. El dueño revisa los textos.
// Reglas en cartas.js. Cada frase es única (mundo/tests/cartas.mjs lo revisa).
// =========================================================

const t = (es, en) => ({ es, en });

// Familias: algunas cartas se potencian entre sí (Hadad sube a los Amigos, Mila y Gala se buscan…)
export const FAMILIAS = {
    monstruo: t('Monstruo', 'Monster'),
    mito: t('Mito', 'Myth'),
    amigo: t('Amigo', 'Friend'),
    animal: t('Animal', 'Animal')
};

// efecto (cuándo actúa):
//   al entrar · horda (otro Zombi de tu mano entra gratis, en cadena) · flecha (200 al rival) · telarana (una
//     rival no ataca su próximo turno) · robar (1 carta) · barco (una rival vuelve a la mano de su dueño) · pesca
//     (el primer hechizo del mazo a tu mano) · extra (una invocación más) · prisa (ataca el mismo turno) · marea
//     (la criatura más fuerte de tu descarte vuelve a tu mano) · aullido (las rivales pierden 200 de ATK) ·
//     petrifica (una rival pasa a Defensa y no se mueve en su turno) · gatera (Mila o Gala salta del mazo a la
//     mesa) · riff (tus otras criaturas +100 de ATK) · asado (300 de vida por cada Amigo tuyo en la mesa) ·
//     baile (las tuyas que ya atacaron pueden atacar otra vez) · punteria (destruye una rival de ATK 700 o
//     menos) · explora (la primera criatura del mazo a tu mano)
//   siempre · guardian (hay que atacarla primero) · vuela (ataca directo aunque haya criaturas) · jefe (tus
//     otros Amigos +200 de ATK) · duo (+400 de ATK si su pareja está en tu mesa) · iglu (tus criaturas en
//     Defensa +300 de DEF)
//   al combatir · explota (si muere peleando se lleva al otro) · racha (si derriba atacando, ataca otra vez,
//     una vez) · traga (cada vez que derriba atacando, +200 de ATK)
//   al empezar tu turno · pocion (recuperas 200 de vida)
//   al morir · divide (deja dos Slimecitos en tus zonas libres) · hincha (robas 2 cartas)
//   hechizos · poder (+500 de ATK a una tuya) · rayo (destruye una rival) · curar (+500 de vida) · escudo (la
//     próxima vez que una tuya iba a morir, se salva) · revivir (la más fuerte de tu descarte vuelve a la mesa,
//     con su efecto) · abrazo (fusiona dos tuyas: suma el ATK en una, la otra se va al descarte) · once (robas 2)
const c = (familia, atk, def, efecto, es, en, tes, ten, extra = {}) => ({ tipo: 'criatura', familia, atk, def, efecto, nombre: t(es, en), texto: t(tes, ten), ...extra });
const h = (efecto, es, en, tes, ten) => ({ tipo: 'hechizo', efecto, nombre: t(es, en), texto: t(tes, ten) });
export const CARTAS = {
    // ---- Monstruos ----
    zombi: c('monstruo', 500, 600, 'horda', 'Zombi de la Noche', 'Night Zombie', 'Al entrar, otro Zombi de tu mano entra gratis.', 'On entry, another Zombie from your hand enters for free.'),
    esqueleto: c('monstruo', 700, 300, 'flecha', 'Esqueleto Arquero', 'Skeleton Archer', 'Al entrar, dispara: 200 de daño al rival.', 'On entry, it shoots: 200 damage to the rival.'),
    creeper: c('monstruo', 900, 100, 'explota', 'Creeper Nervioso', 'Jumpy Creeper', 'Si muere peleando, explota y se lleva a su rival.', 'If it dies fighting, it blows up and takes its foe along.'),
    arana: c('monstruo', 600, 500, 'telarana', 'Araña de Cueva', 'Cave Spider', 'Al entrar, enreda a una criatura rival: no ataca en su próximo turno.', 'On entry, it webs a rival creature: it cannot attack next turn.'),
    enderman: c('monstruo', 1000, 600, 'prisa', 'Enderman Inquieto', 'Restless Enderman', 'Se teletransporta: puede atacar el mismo turno en que entra.', 'It teleports: it may attack on the turn it enters.'),
    bruja: c('monstruo', 400, 800, 'pocion', 'Bruja del Pantano', 'Swamp Witch', 'Al empezar tu turno, recuperas 200 de vida.', 'At the start of your turn, you recover 200 life.'),
    slime: c('monstruo', 700, 500, 'divide', 'Slime Saltarín', 'Bouncy Slime', 'Al morir, se parte en dos Slimecitos.', 'When it dies, it splits into two Slimelings.'),
    slimecito: c('monstruo', 300, 300, null, 'Slimecito', 'Slimeling', 'Pedacito de Slime: no vuelve al descarte.', 'A bit of Slime: it never goes to the discard pile.', { ficha: true }),
    // ---- Mitos ----
    trauco: c('mito', 800, 700, 'robar', 'Trauco del Bosque', 'Forest Trauco', 'Al entrar, robas una carta.', 'On entry, you draw a card.'),
    imbunche: c('mito', 1000, 1200, 'guardian', 'Imbunche Guardián', 'Guardian Imbunche', 'Cuida la cueva: el rival tiene que atacarlo primero.', 'It guards the cave: the rival must attack it first.'),
    chonchon: c('mito', 600, 200, 'vuela', 'Chonchon Volador', 'Flying Chonchon', 'Vuela: puede atacar directo aunque haya criaturas.', 'It flies: it can attack directly even past creatures.'),
    caleuche: c('mito', 1300, 1000, 'barco', 'Caleuche en la Niebla', 'Caleuche in the Fog', 'Al entrar, una criatura rival vuelve a la mano de su dueño.', "On entry, a rival creature returns to its owner's hand."),
    pincoya: c('mito', 600, 900, 'marea', 'Pincoya de la Orilla', 'Shore Pincoya', 'Al entrar, la marea te devuelve a la mano tu criatura más fuerte del descarte.', 'On entry, the tide brings your strongest discarded creature back to your hand.'),
    cuero: c('mito', 900, 400, 'traga', 'Cuero del Lago', 'Lake Cuero', 'Cada vez que derriba a una criatura atacando, gana 200 de ATK.', 'Each time it fells a creature while attacking, it gains 200 ATK.'),
    calchona: c('mito', 700, 600, 'aullido', 'Calchona Aulladora', 'Howling Calchona', 'Al entrar, aúlla: las criaturas rivales pierden 200 de ATK.', 'On entry, it howls: rival creatures lose 200 ATK.'),
    basilisco: c('mito', 1200, 800, 'petrifica', 'Basilisco Chilote', 'Chilote Basilisk', 'Al entrar, su mirada deja a una rival en Defensa y quieta un turno.', 'On entry, its stare locks a rival in Defense, frozen for a turn.'),
    // ---- Amigos ----
    pony: c('amigo', 600, 600, 'pesca', 'Pony, pescador de oficio', 'Pony, Fisher by Trade', 'Al entrar, pesca el primer hechizo de tu mazo.', 'On entry, he fishes the first spell out of your deck.'),
    boris: c('amigo', 1100, 500, 'racha', 'Boris del hacha', 'Boris of the Axe', 'Si derriba a una criatura atacando, ataca otra vez.', 'If he fells a creature while attacking, he attacks again.'),
    venjy: c('amigo', 700, 700, 'extra', 'Venjy, el anfitrión', 'Venjy, the Host', 'Al entrar, invita a otro: puedes invocar una criatura más.', 'On entry, he invites a friend: you may summon one more creature.'),
    lona: c('amigo', 600, 700, 'gatera', 'Lona, guardiana de gatas', 'Lona, Keeper of Cats', 'Al entrar, llama a Mila o a Gala desde tu mazo a la mesa.', 'On entry, she calls Mila or Gala from your deck onto the table.'),
    salonas: c('amigo', 800, 500, 'riff', 'Salonas y su bajo', 'Salonas and His Bass', 'Al entrar, toca un riff: tus otras criaturas ganan 100 de ATK.', 'On entry, he plays a riff: your other creatures gain 100 ATK.'),
    nacho: c('amigo', 600, 600, 'asado', 'Nacho, maestro parrillero', 'Nacho, Grill Master', 'Al entrar, prende la parrilla: 300 de vida por cada Amigo tuyo en la mesa.', 'On entry, he fires up the grill: 300 life for each of your Friends on the table.'),
    hadad: c('amigo', 700, 800, 'jefe', 'Hadad, jefe de la fogata', 'Hadad, Campfire Chief', 'Tus otros Amigos en la mesa tienen 200 más de ATK.', 'Your other Friends on the table have 200 more ATK.'),
    moises: c('amigo', 400, 1300, 'iglu', 'Moisés del iglú', 'Moisés of the Igloo', 'Tus criaturas en Defensa tienen 300 más de DEF.', 'Your creatures in Defense have 300 more DEF.'),
    andy: c('amigo', 600, 500, 'baile', 'Andy, bailarín de victoria', 'Andy, Victory Dancer', 'Al entrar, baila: las tuyas que ya atacaron pueden atacar otra vez.', 'On entry, he dances: your creatures that already attacked may attack again.'),
    lucho: c('amigo', 900, 600, 'punteria', 'Lucho, buena puntería', 'Lucho, Sharp Aim', 'Al entrar, derriba a una criatura rival de 700 de ATK o menos.', 'On entry, he knocks down a rival creature with 700 ATK or less.'),
    braulio: c('amigo', 600, 500, 'explora', 'Braulio, explorador', 'Braulio, Explorer', 'Al entrar, encuentra la primera criatura de tu mazo y la lleva a tu mano.', 'On entry, he finds the first creature in your deck and brings it to your hand.'),
    conejeros: c('amigo', 300, 300, 'hincha', 'Conejeros de primera fila', 'Conejeros, Front Row', 'Al morir, alienta desde la galería: robas 2 cartas.', 'When he falls, he cheers from the stands: you draw 2 cards.'),
    // ---- Animales ----
    mila: c('animal', 500, 400, 'duo', 'Mila la curiosa', 'Mila the Curious', 'Si Gala está en tu mesa, Mila gana 400 de ATK.', 'If Gala is on your table, Mila gains 400 ATK.', { pareja: 'gala' }),
    gala: c('animal', 400, 500, 'duo', 'Gala la dormilona', 'Gala the Sleepy', 'Si Mila está en tu mesa, Gala gana 400 de ATK.', 'If Mila is on your table, Gala gains 400 ATK.', { pareja: 'mila' }),
    // ---- Hechizos ----
    poder: h('poder', 'Poción de Fuerza', 'Strength Potion', 'Una criatura tuya gana 500 de ATK.', 'One of your creatures gains 500 ATK.'),
    rayo: h('rayo', 'Rayo de Tormenta', 'Storm Bolt', 'Destruye una criatura rival.', 'Destroy one rival creature.'),
    curar: h('curar', 'Sopaipilla Caliente', 'Warm Sopaipilla', 'Recuperas 500 de vida.', 'You recover 500 life.'),
    escudo: h('escudo', 'Escudo de Obsidiana', 'Obsidian Shield', 'La próxima vez que una criatura tuya iba a morir, se salva.', 'The next time one of your creatures would die, it survives.'),
    revivir: h('revivir', 'Tótem de la Fogata', 'Campfire Totem', 'Tu criatura más fuerte del descarte vuelve a la mesa, con su efecto.', 'Your strongest discarded creature returns to the table, effect and all.'),
    abrazo: h('abrazo', 'Abrazo de Amigos', 'Friendship Hug', 'Junta dos criaturas tuyas en una: suma sus ATK.', 'Merge two of your creatures into one: their ATK adds up.'),
    once: h('once', 'Once con Pan Amasado', 'Teatime with Homemade Bread', 'Robas 2 cartas.', 'You draw 2 cards.')
};

// Efectos que piden elegir una criatura rival o una propia (al entrar o al lanzar el hechizo)
export const PIDE_RIVAL = new Set(['telarana', 'barco', 'rayo', 'petrifica', 'punteria']);
export const PIDE_PROPIA = new Set(['poder', 'escudo']);

// Niveles: más difícil = más vida, mazos más largos y un Lucho con mejores combos
//   jugador: tu mazo (25; más adelante se arma en la colección) · facil/medio: el de Lucho
export const NIVELES = {
    facil: { vida: 3000, mano: 4, ia: 'facil' },
    medio: { vida: 4000, mano: 4, ia: 'medio' }
};
export const MAZOS = {
    jugador: ['boris', 'venjy', 'pony', 'salonas', 'nacho', 'hadad', 'moises', 'lona', 'mila', 'gala', 'andy', 'imbunche', 'caleuche', 'basilisco', 'enderman', 'cuero', 'creeper', 'trauco', 'esqueleto', 'poder', 'poder', 'rayo', 'curar', 'abrazo', 'once'],
    facil: ['zombi', 'zombi', 'esqueleto', 'esqueleto', 'arana', 'arana', 'slime', 'bruja', 'bruja', 'creeper', 'trauco', 'chonchon', 'braulio', 'imbunche', 'conejeros', 'cuero', 'curar', 'curar', 'poder', 'once'],
    medio: ['zombi', 'zombi', 'esqueleto', 'creeper', 'arana', 'enderman', 'bruja', 'imbunche', 'caleuche', 'calchona', 'basilisco', 'cuero', 'pincoya', 'lucho', 'hadad', 'moises', 'conejeros', 'boris', 'rayo', 'curar', 'poder', 'escudo', 'revivir', 'abrazo', 'once']
};

// ---------------------------------------------------------
// Tutorial (la primera partida; se repite desde el panel de Lucho)
// Mazos en orden fijo (sin barajar); Lucho parte con 800 de vida para que dure 3 turnos.
// `pasos`: lo que tú haces, en orden. `paso` (1-5) marca los cinco globos grandes; los demás son
// avisos cortos («termina el turno», «roba»). `a`: acción esperada (ver accionTutorial en cartas.js):
//   carta = la carta de tu mano (invocar/hechizo) o tu criatura que ataca; contra = criatura rival
//   (null = ataque directo). `lucho`: sus jugadas en cada uno de sus turnos.
// ---------------------------------------------------------
export const TUTORIAL = {
    vidas: [2000, 800],
    mazos: [
        ['trauco', 'curar', 'chonchon', 'zombi', 'pony', 'esqueleto', 'rayo', 'arana', 'creeper', 'imbunche', 'boris', 'venjy', 'caleuche', 'poder', 'zombi'],
        ['zombi', 'esqueleto', 'arana', 'creeper', 'chonchon', 'trauco', 'imbunche', 'zombi', 'arana', 'esqueleto', 'chonchon', 'creeper', 'poder', 'curar', 'curar']
    ],
    pasos: [
        { paso: 1, a: { t: 'robar' }, texto: t('Primero roba una carta de tu mazo. Toca el mazo.', 'First, draw a card from your deck. Tap the deck.') },
        { paso: 2, a: { t: 'invocar', carta: 'trauco', modo: 'ata' }, texto: t('Ahora juega al Trauco en una zona libre. Al entrar te regala otra carta.', 'Now play the Trauco on a free zone. When it enters it gifts you another card.') },
        { a: { t: 'terminar' }, texto: t('Recién invocado no puede atacar. Termina tu turno.', 'Freshly summoned, it cannot attack yet. End your turn.') },
        { a: { t: 'robar' }, texto: t('Tu turno otra vez: roba.', 'Your turn again: draw.') },
        { paso: 3, a: { t: 'atacar', carta: 'trauco', contra: 'zombi' }, texto: t('Ataca a mi Zombi: 800 contra 500. El mío cae y los 300 de diferencia me bajan la vida.', 'Attack my Zombie: 800 against 500. Mine falls and the 300 difference comes off my life.') },
        { a: { t: 'terminar' }, texto: t('Bien hecho. Pásame el turno, que me toca vengarme.', 'Well done. Pass me the turn, revenge is mine now.') },
        { a: { t: 'robar' }, texto: t('Te pegó mi flecha, pero tranqui. Roba.', 'My arrow got you, but chill. Draw.') },
        { paso: 4, a: { t: 'hechizo', carta: 'rayo', contra: 'esqueleto' }, texto: t('Usa el Rayo de Tormenta sobre mi Esqueleto. Los hechizos no gastan nada.', 'Cast the Storm Bolt on my Skeleton. Spells cost nothing.') },
        { paso: 5, a: { t: 'atacar', carta: 'trauco', contra: null }, texto: t('Mi lado quedó vacío: ataca directo y deja mi vida en 0.', 'My side is empty: attack directly and drop my life to 0.') }
    ],
    lucho: [
        [{ t: 'robar' }, { t: 'invocar', carta: 'zombi', modo: 'ata' }, { t: 'terminar' }],
        [{ t: 'robar' }, { t: 'invocar', carta: 'esqueleto', modo: 'ata' }, { t: 'terminar' }]
    ],
    // Lucho habla antes del paso 1, en su turno y al final
    intro: [
        t('Te enseño mi juego de cartas: como el Yu-Gi-Oh, pero corto y sin pagar nada.', 'Let me show you my card game: like Yu-Gi-Oh, but short and with nothing to pay.'),
        t('Cada uno tiene tres zonas en la mesa. En esta práctica yo parto con poca vida, para que sea cortita.', 'We each have three zones on the table. In this practice round I start low on life, to keep it short.')
    ],
    turnoLucho: [
        t('Mi turno: saco un Zombi. Paciencia, que todavía no ataca.', "My turn: I bring out a Zombie. Patience, it can't attack yet."),
        t('Sale mi Esqueleto, y al entrar te dispara 200. Eso es un efecto.', "Out comes my Skeleton, and on entry it shoots you for 200. That's an effect.")
    ],
    fin: t('¡Ganaste! Ya sabes lo básico. Lo bueno son los combos entre cartas.', 'You won! You know the basics now. The fun part is the combos between cards.'),
    otra: t('¿Jugamos de verdad?', 'Shall we play for real?')
};

// ---------------------------------------------------------
// Textos del panel
// ---------------------------------------------------------
export const TXT_CARTAS = {
    titulo: t('Duelo de Cartas Pixel', 'Pixel Card Duel'),
    botonTuto: t('Repasar el tutorial', 'Replay the tutorial'),
    elegirNivel: t('Elige tu desafío', 'Choose your challenge'),
    salir: t('Salir del duelo', 'Leave duel'),
    otraVez: t('Jugar otra vez', 'Play again'),
    facil: t('Fácil', 'Easy'),
    medio: t('Medio', 'Medium'),
    robar: t('Robar', 'Draw'),
    terminar: t('Terminar turno', 'End turn'),
    atacar: t('Atacar', 'Attack'),
    directo: t('Ataque directo', 'Direct attack'),
    cambiar: t('Cambiar postura', 'Switch stance'),
    ataque: t('Ataque', 'Attack stance'),
    defensa: t('Defensa', 'Defense stance'),
    vida: t('Vida', 'Life'),
    mazo: t('Mazo', 'Deck'),
    descarte: t('Descarte', 'Discard pile'),
    mano: t('Tu mano', 'Your hand'),
    mesa: t('Tu mesa', 'Your table'),
    zona: t('Zona', 'Zone'),
    registro: t('Últimas jugadas', 'Latest plays'),
    lucho: t('Lucho', 'Lucho'),
    tu: t('Tú', 'You'),
    invocar: t('Invoca', 'Summons'),
    reemplaza: t('Zonas llenas: toca la criatura tuya que se va al cementerio y la nueva ocupa su lugar', 'Zones full: tap the creature of yours that goes to the discard pile and the new one takes its place'),
    hechizo: t('Hechizo', 'Spell'),
    atk: t('ATK', 'ATK'),
    def: t('DEF', 'DEF'),
    postura: t('Cambia postura', 'Switches stance'),
    pasa: t('Pasa el turno', 'Ends the turn'),
    tuTurno: t('Tu turno', 'Your turn'),
    suTurno: t('Turno de Lucho', "Lucho's turn"),
    ganaste: t('¡Ganaste el duelo!', 'You won the duel!'),
    perdiste: t('Perdiste el duelo.', 'You lost the duel.'),
    empate: t('Empate.', 'Draw game.'),
    motivo: {
        vida: t('Una vida llegó a 0.', 'A life total hit 0.'),
        mazo: t('Alguien no pudo robar: se acabó su mazo.', 'Someone could not draw: their deck ran out.'),
        tope: t('Se acabaron los turnos: gana quien tiene más vida.', 'Out of turns: the one with more life wins.')
    },
    reglas: [
        t('Empiezas con 4 cartas; la vida depende del nivel (3000 en Fácil, 4000 en Medio). En tu turno robas 1.', 'You start with 4 cards; life depends on the level (3000 on Easy, 4000 on Medium). On your turn you draw 1.'),
        t('Invocas 1 criatura por turno en una de tus 3 zonas (con las 3 llenas, reemplazas una tuya: se va al cementerio); los hechizos, todos los que quieras.', 'Summon 1 creature per turn in one of your 3 zones (with all 3 full, you replace one of yours: it goes to the discard pile); cast as many spells as you like.'),
        t('Nada cuesta: los efectos encadenan combos dentro del mismo turno.', 'Nothing costs anything: effects chain into combos within the same turn.'),
        t('Cada criatura ataca una vez, pero no el turno en que entra.', 'Each creature attacks once, but not on the turn it enters.'),
        t('ATK contra ATK: cae la menor y la diferencia baja la vida. Quien defiende en Defensa no pierde vida.', 'ATK against ATK: the lower one falls and the difference cuts life. A creature in Defense stance spares its owner any life loss.'),
        t('Ganas si su vida llega a 0 o si el rival ya no puede robar.', 'You win if their life hits 0 or if the rival can no longer draw.')
    ]
};
