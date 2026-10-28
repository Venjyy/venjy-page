// =========================================================
// VENJY · Estudio · ayuda de cada pestaña y grupos de la barra (Etapa B, 0b · B0, estudio/DISENO.md §39)
// Puro (lo prueba Node: mundo/tests/estudio-ayuda.mjs). Por pestaña: qué edita, en palabras comunes, y por dónde
// empezar. La barra agrupa las pestañas en GRUPOS (el orden de los botones en index.html sigue este orden).
// Vista: 'simple' (por defecto) esconde lo marcado con la clase `solo-avanzado`; 'avanzado' lo muestra.
// =========================================================

export const VISTAS = ['simple', 'avanzado'];
export const VISTA_BASE = 'simple';
export const vistaValida = v => (VISTAS.includes(v) ? v : VISTA_BASE);

// [clave, es, en, pestañas]
export const GRUPOS = [
    ['mundo', 'Pantalla y mundo', 'Screen and world', ['layout', 'juego', 'posiciones', 'personajes', 'tienda', 'misiones', 'recetas', 'nuevos', 'vida', 'objetos', 'formas']],
    ['historias', 'Historias', 'Stories', ['textos', 'escenas', 'poses']],
    ['minijuegos', 'Minijuegos', 'Minigames', ['mesa', 'carrera', 'arena', 'combate', 'salonas', 'ritmo']],
    ['arte', 'Arte y sonido', 'Art and sound', ['pixeles', 'musica', 'inicio']]
];

// clave: { que: [es, en], empezar: [es, en] }
export const AYUDA = {
    layout: {
        que: ['Dónde van los botones en la pantalla del celular.', 'Where the buttons go on the phone screen.'],
        empezar: ['Elige un aparato arriba y arrastra un botón; Guardar lo deja así en el juego.', 'Pick a device above and drag a button; Save keeps it in the game.']
    },
    juego: {
        que: ['El juego de verdad, conectado al Estudio: lo que cambies en otras pestañas se ve aquí al tiro.', 'The real game, linked to the Studio: what you change in other tabs shows here right away.'],
        empezar: ['Juega normal. Las demás pestañas de «Pantalla y mundo», «Historias» y «Minijuegos» usan esta misma ventana.', 'Play as usual. The other tabs in «Screen and world», «Stories» and «Minigames» use this same window.']
    },
    posiciones: {
        que: ['Dónde está parado cada amigo.', 'Where each friend stands.'],
        empezar: ['Elige a alguien de la lista y arrástralo en el juego con las flechas de colores.', 'Pick someone from the list and drag them in the game with the colored arrows.']
    },
    personajes: {
        que: ['Las personas del mundo: crear a alguien nuevo (cómo se ve, dónde vive, a qué hora está, qué dice y a quién conoce) o cambiar cómo se ve un amigo.', 'The people in the world: create someone new (looks, where they live, when they are there, what they say and whom they know) or change how a friend looks.'],
        empezar: ['Escribe un nombre en «Nueva persona», elige alguien parecido y toca «Crear persona». Queda como borrador: cuando te guste, desmarca «borrador» y guarda.', 'Type a name in «New person», pick someone similar and press «Create person». It starts as a draft: when you like it, untick «draft» and save.']
    },
    tienda: {
        que: ['Lo que vende y compra cada persona: agrega ofertas nuevas a las que ya tiene, o dale tienda a alguien nuevo.', 'What each person sells and buys: add new offers to the ones they have, or give a new person a shop.'],
        empezar: ['Elige a alguien, escoge una oferta parecida en «Partir de» y toca «Agregar oferta»; cambia el objeto o la cantidad y mira si avisa que regala. «Guardar» la deja en el juego.', 'Pick someone, choose a similar offer in «Start from» and press «Add offer»; change the object or amount and see if it warns that it gives value away. «Save» keeps it in the game.']
    },
    misiones: {
        que: ['Los encargos que da cada persona: entregar cosas, eliminar monstruos o sobrevivir una noche. Una persona nueva también puede darlos.', 'The quests each person gives: hand in things, defeat monsters or survive a night. A new person can give them too.'],
        empezar: ['Elige a alguien, escoge una misión parecida en «Partir de», toca «Crear misión» y escribe sus textos en español e inglés; «Guardar» la deja en el juego.', 'Pick someone, choose a similar quest in «Start from», press «Create quest» and write its Spanish and English texts; «Save» keeps it in the game.']
    },
    recetas: {
        que: ['Cómo se fabrican las cosas: recetas nuevas en una rejilla como la mesa de crafteo, y qué se funde en el horno.', 'How things are crafted: new recipes on a grid like the crafting table, and what melts in the furnace.'],
        empezar: ['Elige una receta parecida en «Partir de», toca «Agregar receta» y cambia las casillas y lo que fabrica; si ya existe una igual, te avisa. «Guardar» la deja en el juego.', 'Pick a similar recipe in «Start from», press «Add recipe» and change the cells and what it makes; if an identical one exists, it warns you. «Save» keeps it in the game.']
    },
    nuevos: {
        que: ['Cosas nuevas para el inventario: su nombre, cómo se ven, si se comen y cuántas caben en una casilla.', 'New things for the inventory: their name, how they look, whether they can be eaten and how many fit in a slot.'],
        empezar: ['Elige uno parecido en «Partir de», toca «Agregar objeto», ponle nombre en español e inglés y elige cómo se ve. Después dale una receta, véndelo en la Tienda o ponlo de premio en Misiones. «Guardar» lo deja en el juego.', 'Pick a similar one in «Start from», press «Add object», name it in Spanish and English and choose how it looks. Then give it a recipe, sell it in the Shop or make it a Quest reward. «Save» keeps it in the game.']
    },
    vida: {
        que: ['Cómo caminan los amigos, a quién visitan y a qué hora, y la fogata.', 'How friends walk, whom they visit and when, and the campfire.'],
        empezar: ['Abre una visita para ver quién va a ver a quién y a qué hora, o elige una base y toca «Crear visita»; con «Caminar» mandas a alguien a caminar. «Lo básico» cambia la rapidez, la amistad y la fogata en palabras.', 'Open a visit to see who visits whom and when, or pick a base and press «Create visit»; «Walk» sends someone walking. «The basics» changes speed, friendship and the campfire in plain words.']
    },
    objetos: {
        que: ['Cómo se agarra cada cosa en la mano.', 'How each thing is held in the hand.'],
        empezar: ['Elige un objeto, toca «Ponerlo en mi mano» y ajústalo con el tamaño y arrastrando en el cuadro (botones «Mover» o «Girar»); «Igual que el tipo» lo deja como los demás.', 'Pick an object, press «Put it in my hand» and adjust it with the size and by dragging in the box («Move» or «Rotate» buttons); «Same as the type» makes it like the rest.']
    },
    formas: {
        que: ['La forma de los bloques que no son un cubo (losas, escalones, vallas…).', 'The shape of blocks that are not a cube (slabs, stairs, fences…).'],
        empezar: ['Elige una forma, toca «Darme el bloque» y ponlo en el juego; en «Arrastra las cajas» mueve una caja desde el medio o estírala desde un borde (también con «Subir» y «Bajar»).', 'Pick a shape, press «Give me the block» and place it in the game; in «Drag the boxes» move a box by the middle or stretch it by an edge (also with «Up» and «Down»).']
    },
    textos: {
        que: ['Lo que dicen los amigos al hablarles, en español e inglés.', 'What friends say when you talk to them, in Spanish and English.'],
        empezar: ['Filtra por persona, elige una frase y escríbela; «Ver globo ES» la muestra en un globo del juego.', 'Filter by person, pick a line and write it; «Show bubble ES» shows it in a game bubble.']
    },
    escenas: {
        que: ['Escenas cortas con gestos y frases (abrazos, saludos, guiones).', 'Short scenes with gestures and lines (hugs, greetings, scripts).'],
        empezar: ['«Nueva escena» pregunta qué es y parte de una parecida; escribe las frases, toca «Acomodar frases» y suma objetos, efectos y sonidos en esta frase. La línea de tiempo está en Avanzado.', '«New scene» asks what it is and starts from a similar one; write the lines, press «Tidy up lines» and add objects, effects and sounds on this line. The timeline is in Advanced.']
    },
    poses: {
        que: ['Las poses y los gestos de los personajes (saludar, sentarse, bailar…).', 'Character poses and gestures (wave, sit, dance…).'],
        empezar: ['En «Partir de una base» elige una pose parecida y mueve las barras del cuerpo (o arrastra el muñeco); «Espejo (cambiar de lado)» la da vuelta y los pies se apoyan solos.', 'In «Start from a base» pick a similar pose and move the body sliders (or drag the figure); «Mirror (swap sides)» flips it and the feet land on their own.']
    },
    mesa: {
        que: ['La mesa del Duelo de Cartas: dónde queda, las cámaras, el mazo y la tienda de cartas.', 'The Card Duel table: where it is, the cameras, the deck and the card shop.'],
        empezar: ['Con «Mover la mesa» o «Girar la mesa» la arrastras en el juego junto a Lucho; toca «Abrir la mesa» y cambia «Lo básico» (animaciones, sonido, mazo, tienda) con palabras; con «Agregar cámara» sumas una vista cerca, de lado o desde arriba.', 'With «Move the table» or «Turn the table» you drag it in the game next to Lucho; press «Open the table» and change «The basics» (animations, sound, deck, shop) in plain words; «Add camera» adds a close, side or top view.']
    },
    carrera: {
        que: ['La carrera de gatas: pistas, gatas, objetos y dificultad.', 'The cat race: tracks, cats, items and difficulty.'],
        empezar: ['Elige una pista, arrastra la carretera o los muebles en el plano y toca «Ver la pista». En «Lo básico» cambias las vueltas, la dificultad y la rapidez con palabras.', 'Pick a track, drag the road or the furniture on the map and press «View the track». «The basics» changes laps, difficulty and speed in plain words.']
    },
    arena: {
        que: ['El duelo en el lago congelado: rondas, vida, dificultad y cámara.', 'The frozen lake duel: rounds, health, difficulty and camera.'],
        empezar: ['Toca «Abrir la arena» y cambia «Lo básico» con palabras: rondas, largo de cada ronda, vida de cada uno, nieve y la cámara (cerca, lejos o desde arriba); se nota en la próxima pelea.', 'Press «Open the arena» and change «The basics» in plain words: rounds, round length, the life of each fighter, snow and the camera (close, far or from above); it shows in the next fight.']
    },
    combate: {
        que: ['Cómo pega cada estilo de pelea: rapidez, daño, peso del golpe, reacciones, controles y la CPU.', 'How each fighting style hits: speed, damage, hit weight, reactions, controls and the CPU.'],
        empezar: ['Elige un estilo y un golpe, toca Reproducir y estira las fases; «Partir de este» lo copia para crear uno nuevo.', 'Pick a style and a move, press Play and stretch the phases; «Start from this one» copies it to make a new one.']
    },
    salonas: {
        que: ['La Gira de Salonas (juego de ritmo): canciones, energía, puntaje y textos.', 'Salonas\' Tour (rhythm game): songs, energy, score and texts.'],
        empezar: ['En «Lo básico» elige la canción y la dificultad con que parte y qué tan exacto hay que tocar; abajo cambias los textos. Se ve al tiro en el juego.', 'In «The basics» pick the starting song and difficulty and how precise you must play; below you change the texts. It shows right away in the game.']
    },
    ritmo: {
        que: ['Las notas que tocas en La Gira, canción por canción, y el bajo que las genera.', 'The notes you play on the Tour, song by song, and the bass that makes them.'],
        empezar: ['Elige canción y dificultad, toca «Revisar partitura» y corrige lo que marque en rojo.', 'Pick a song and difficulty, press «Review chart» and fix what it marks in red.']
    },
    pixeles: {
        que: ['Dibujar los íconos de los objetos y el arte de las cartas, cuadrito por cuadrito.', 'Draw item icons and card art, pixel by pixel.'],
        empezar: ['Elige un ícono o una carta y pinta; «Crear nuevo» deja un borrador que después termina un agente.', 'Pick an icon or a card and paint; «Create new» leaves a draft that an agent finishes later.']
    },
    musica: {
        que: ['La música del juego: temas con capas (batería, bajo, acordes, melodía).', 'The game music: songs made of layers (drums, bass, chords, melody).'],
        empezar: ['En «Empezar con un estilo» elige uno (cumbia, rock…), toca Reproducir y muévelo con las perillas (rapidez, fuerza, ánimo, tono); la batería se cambia con clic en su rejilla.', 'In «Start from a style» pick one (cumbia, rock…), press Play and shape it with the knobs (speed, loudness, mood, key); click the drum grid to change the beat.']
    },
    inicio: {
        que: ['El menú del principio: logo, frases amarillas, pantalla de carga y fondo de cine.', 'The start menu: logo, yellow splashes, loading screen and cinematic background.'],
        empezar: ['Escribe una frase nueva en la lista («Agregar frase») o cambia un color; la vista previa lo muestra al lado. Tiempos, tamaños y posiciones del fondo están en Avanzado.', 'Write a new splash in the list («Add splash») or change a color; the preview next to it shows it. Times, sizes and background positions are in Advanced.']
    }
};

// Texto de la franja: «qué · empezar» en el idioma pedido (null si la pestaña no tiene ayuda)
export function textoAyuda(clave, idioma = 'es') {
    const a = AYUDA[clave];
    if (!a) return null;
    const i = idioma === 'en' ? 1 : 0;
    return { que: a.que[i], empezar: a.empezar[i] };
}
