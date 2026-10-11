// =========================================================
// VENJY · Supervivencia · Duelo de Cartas Pixel (7h-2): cartas, mazos, tutorial y textos
// Todas las cartas son inventadas: criaturas del juego, del folclor chileno y amigos en buena onda.
// No se copia ningún nombre, arte ni texto de cartas reales. El dueño revisa los textos.
// Reglas en cartas.js. Cada frase es única (mundo/tests/cartas.mjs lo revisa).
// =========================================================

const t = (es, en) => ({ es, en });

// efecto: entrar (al invocarla) · pasivo (siempre) · hechizo
//   horda    al entrar, otro Zombi de tu mano entra gratis (y ese también llama al siguiente)
//   flecha   al entrar, 200 de daño directo al rival
//   telarana al entrar, una criatura rival no puede atacar en su próximo turno
//   robar    al entrar, robas 1 carta
//   barco    al entrar, una criatura rival vuelve a la mano de su dueño
//   pesca    al entrar, el primer hechizo de tu mazo pasa a tu mano
//   extra    al entrar, puedes invocar una criatura más este turno
//   explota  si muere en combate, la criatura contra la que peleó también muere
//   guardian mientras esté en la mesa, el rival tiene que atacarla a ella primero
//   vuela    puede atacar directo aunque el rival tenga criaturas
//   racha    si destruye a una criatura atacando, puede atacar otra vez este turno (una vez)
//   poder    hechizo: +500 de ATK a una criatura tuya (mientras siga en la mesa)
//   rayo     hechizo: destruye una criatura rival
//   curar    hechizo: recuperas 500 de vida
export const CARTAS = {
    zombi: { tipo: 'criatura', atk: 500, def: 600, efecto: 'horda',
        nombre: t('Zombi de la Noche', 'Night Zombie'),
        texto: t('Al entrar, otro Zombi de tu mano entra gratis.', 'On entry, another Zombie from your hand enters for free.') },
    esqueleto: { tipo: 'criatura', atk: 700, def: 300, efecto: 'flecha',
        nombre: t('Esqueleto Arquero', 'Skeleton Archer'),
        texto: t('Al entrar, dispara: 200 de daño al rival.', 'On entry, it shoots: 200 damage to the rival.') },
    creeper: { tipo: 'criatura', atk: 900, def: 100, efecto: 'explota',
        nombre: t('Creeper Nervioso', 'Jumpy Creeper'),
        texto: t('Si muere peleando, explota y se lleva a su rival.', 'If it dies fighting, it blows up and takes its foe along.') },
    arana: { tipo: 'criatura', atk: 600, def: 500, efecto: 'telarana',
        nombre: t('Araña de Cueva', 'Cave Spider'),
        texto: t('Al entrar, enreda a una criatura rival: no ataca en su próximo turno.', 'On entry, it webs a rival creature: it cannot attack next turn.') },
    trauco: { tipo: 'criatura', atk: 800, def: 700, efecto: 'robar',
        nombre: t('Trauco del Bosque', 'Forest Trauco'),
        texto: t('Al entrar, robas una carta.', 'On entry, you draw a card.') },
    imbunche: { tipo: 'criatura', atk: 1000, def: 1200, efecto: 'guardian',
        nombre: t('Imbunche Guardián', 'Guardian Imbunche'),
        texto: t('Cuida la cueva: el rival tiene que atacarlo primero.', 'It guards the cave: the rival must attack it first.') },
    chonchon: { tipo: 'criatura', atk: 500, def: 200, efecto: 'vuela',
        nombre: t('Chonchon Volador', 'Flying Chonchon'),
        texto: t('Vuela: puede atacar directo aunque haya criaturas.', 'It flies: it can attack directly even past creatures.') },
    caleuche: { tipo: 'criatura', atk: 1400, def: 1100, efecto: 'barco',
        nombre: t('Caleuche en la Niebla', 'Caleuche in the Fog'),
        texto: t('Al entrar, una criatura rival vuelve a la mano de su dueño.', "On entry, a rival creature returns to its owner's hand.") },
    pony: { tipo: 'criatura', atk: 600, def: 600, efecto: 'pesca',
        nombre: t('Pony, pescador de oficio', 'Pony, Fisher by Trade'),
        texto: t('Al entrar, pesca el primer hechizo de tu mazo.', 'On entry, he fishes the first spell out of your deck.') },
    boris: { tipo: 'criatura', atk: 1100, def: 500, efecto: 'racha',
        nombre: t('Boris del hacha', 'Boris of the Axe'),
        texto: t('Si derriba a una criatura atacando, ataca otra vez.', 'If he fells a creature while attacking, he attacks again.') },
    venjy: { tipo: 'criatura', atk: 700, def: 700, efecto: 'extra',
        nombre: t('Venjy, el anfitrión', 'Venjy, the Host'),
        texto: t('Al entrar, invita a otro: puedes invocar una criatura más.', 'On entry, he invites a friend: you may summon one more creature.') },
    poder: { tipo: 'hechizo', efecto: 'poder',
        nombre: t('Poción de Fuerza', 'Strength Potion'),
        texto: t('Una criatura tuya gana 500 de ATK.', 'One of your creatures gains 500 ATK.') },
    rayo: { tipo: 'hechizo', efecto: 'rayo',
        nombre: t('Rayo de Tormenta', 'Storm Bolt'),
        texto: t('Destruye una criatura rival.', 'Destroy one rival creature.') },
    curar: { tipo: 'hechizo', efecto: 'curar',
        nombre: t('Sopaipilla Caliente', 'Warm Sopaipilla'),
        texto: t('Recuperas 500 de vida.', 'You recover 500 life.') }
};

// Efectos que piden elegir una criatura rival al entrar (o al lanzar el hechizo)
export const PIDE_RIVAL = new Set(['telarana', 'barco', 'rayo']);
export const PIDE_PROPIA = new Set(['poder']);

// Mazos de 15 (orden sin importancia: se barajan)
export const MAZOS = {
    jugador: ['zombi', 'zombi', 'esqueleto', 'creeper', 'arana', 'trauco', 'imbunche', 'chonchon', 'caleuche', 'pony', 'boris', 'venjy', 'poder', 'rayo', 'curar'],
    facil: ['zombi', 'zombi', 'zombi', 'esqueleto', 'esqueleto', 'arana', 'arana', 'trauco', 'chonchon', 'chonchon', 'imbunche', 'creeper', 'poder', 'curar', 'curar'],
    medio: ['zombi', 'zombi', 'esqueleto', 'creeper', 'arana', 'trauco', 'imbunche', 'chonchon', 'caleuche', 'pony', 'boris', 'venjy', 'poder', 'poder', 'rayo']
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
        t('Cada uno tiene 2000 de vida, tres zonas en la mesa y un mazo de 15.', 'We each have 2000 life, three zones on the table and a deck of 15.')
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
    boton: t('Jugar a las cartas', 'Play cards'),
    botonTuto: t('Repasar el tutorial', 'Replay the tutorial'),
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
        t('Empiezas con 3 cartas y 2000 de vida. En tu turno robas 1.', 'You start with 3 cards and 2000 life. On your turn you draw 1.'),
        t('Invocas 1 criatura por turno en una de tus 3 zonas; los hechizos, todos los que quieras.', 'Summon 1 creature per turn in one of your 3 zones; cast as many spells as you like.'),
        t('Nada cuesta: los efectos encadenan combos dentro del mismo turno.', 'Nothing costs anything: effects chain into combos within the same turn.'),
        t('Cada criatura ataca una vez, pero no el turno en que entra.', 'Each creature attacks once, but not on the turn it enters.'),
        t('ATK contra ATK: cae la menor y la diferencia baja la vida. Quien defiende en Defensa no pierde vida.', 'ATK against ATK: the lower one falls and the difference cuts life. A creature in Defense stance spares its owner any life loss.'),
        t('Ganas si su vida llega a 0 o si el rival ya no puede robar.', 'You win if their life hits 0 or if the rival can no longer draw.')
    ]
};
