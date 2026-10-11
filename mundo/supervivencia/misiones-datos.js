// =========================================================
// VENJY · Supervivencia · Misiones (datos)
// 3 misiones por amigo (en cadena) y 3 peleas de jefe que entrega Venjy en el Inicio.
// Tipos: entregar (se consumen; un pedido puede aceptar varios ids), matar (tipo de monstruo o
// '*'; `noche`: solo cuentan de noche), pescar, visitar (lugares para explorar), noche
// (sobrevivir una noche entera sin dormir ni morir) y hablar (se completa al hablar).
// Cada misión trae sus textos en { es, en }: pedido, aceptar y completada (diálogo único).
// =========================================================
import { B } from '../texturas.js';
import { O, info } from './objetos.js';

const t = (es, en) => ({ es, en });
const COCIDO = [O.FILETE, O.CHULETA, O.POLLO_ASADO, O.CORDERO_ASADO];
const PESCADO_COCIDO = [O.BACALAO_COCIDO, O.SALMON_COCIDO];
const TRONCOS = [B.TRONCO, B.TRONCO_ABEDUL, B.TRONCO_PINO];
const LANAS = [B.LANA, B.LANA_ROJA];

export const NOMBRES_AMIGO = {
    pony: 'Pony', salonas: 'Salonas', lona: 'Lona', hadad: 'Hadad', andy: 'Andy', nacho: 'Nacho',
    moises: 'Moisés', lalo: 'Lalo', boris: 'Boris', lucho: 'Lucho', braulio: 'Braulio', conejeros: 'Conejeros', venjy: 'Venjy'
};

export const MISIONES = [
    // ---------------- Pony (muelle) ----------------
    { id: 'pony1', amigo: 'pony', tipo: 'entregar', pide: [[O.BACALAO, 5]], premio: [[O.PAN, 6], [O.CUBO, 1]],
        titulo: t('Cinco bacalaos', 'Five cod'),
        pedido: t('El mar está generoso pero mis brazos no. ¿Me traes 5 bacalaos? Con una caña y paciencia salen solitos.', 'The sea is generous but my arms are not. Bring me 5 cod? With a rod and patience they come out on their own.'),
        aceptar: t('¡Eso! El agua quieta es la que más pica.', 'Great! Still water bites the most.'),
        completada: t('¡Cinco! Igualitos a los que pescaba mi abuelo en Tomé. Toma, pan pa\'l camino y un cubo, que el agua no se carga sola.', 'Five! Just like the ones my grandpa caught in Tomé. Here, bread for the road and a bucket, water does not carry itself.') },
    { id: 'pony2', amigo: 'pony', tipo: 'entregar', pide: [[O.SALMON, 3], [O.PEZ_GLOBO, 1]], premio: [[O.BOTAS_HIERRO, 1], [O.FLECHA, 12]],
        titulo: t('Salmones y un pez globo', 'Salmon and a pufferfish'),
        pedido: t('Quiero armar un acuario raro: 3 salmones y un pez globo. Ojo, no te comas el pez globo, que se enoja tu guata.', 'I want a weird aquarium: 3 salmon and a pufferfish. Careful, do not eat the pufferfish, your belly will hate it.'),
        aceptar: t('El pez globo sale poco. Paciencia de pescador, nomás.', 'Pufferfish are rare. Fisherman patience, that is all.'),
        completada: t('¡Míralo, se infla de rabia! Igual que yo cuando se me corta la lienza. Te ganaste estas botas: mantienen los pies secos en el muelle.', 'Look at him, puffing up with rage! Just like me when my line snaps. You earned these boots: they keep your feet dry on the dock.') },
    { id: 'pony3', amigo: 'pony', tipo: 'entregar', pide: [[O.CANA, 1]], premio: [[O.DIAMANTE, 2], [O.SALMON_COCIDO, 6]],
        titulo: t('Una caña nueva', 'A new rod'),
        pedido: t('Mi caña ya está más chueca que remo de bote. ¿Me haces una? Palos e hilo, como las de antes.', 'My rod is more crooked than a boat oar. Can you make me one? Sticks and string, like the old ones.'),
        aceptar: t('Las arañas tienen el mejor hilo, aunque no les guste prestarlo.', 'Spiders have the best string, even if they hate sharing it.'),
        completada: t('¡Esta sí que tira! Con esta caña saco hasta el Caleuche. Toma, unos diamantes que encontré en la red. No preguntes cómo.', 'Now this one pulls! With this rod I could reel in the Caleuche itself. Have some diamonds I found in my net. Do not ask how.') },
    // ---------------- Salonas (escenario) ----------------
    { id: 'salonas1', amigo: 'salonas', tipo: 'entregar', pide: [[LANAS, 8]], premio: [[O.FILETE, 5], [B.ANTORCHA, 12]],
        titulo: t('Lana para el escenario', 'Wool for the stage'),
        pedido: t('El amplificador retumba más que el bajo. Tráeme 8 de lana para acolchar el escenario, que los vecinos reclaman.', 'The amp booms louder than the bass. Bring me 8 wool to pad the stage, the neighbors are complaining.'),
        aceptar: t('Ovejas y tijeras, compadre. O un poco de hilo.', 'Sheep and shears, friend. Or some string.'),
        completada: t('Ahora suena gordo y no rebota. ¡Primus sucks! (es un cumplido). Toma, comida de gira y luz pa\'l camerino.', 'Now it sounds fat and does not bounce. Primus sucks! (it is a compliment). Here, tour food and light for the dressing room.') },
    { id: 'salonas2', amigo: 'salonas', tipo: 'entregar', pide: [[B.PIEDRA_LUMINOSA, 4]], premio: [[O.PICO_HIERRO, 1], [O.PAN, 4]],
        titulo: t('Focos de piedra luminosa', 'Glowstone spotlights'),
        pedido: t('Los focos se quemaron. Dicen que en las cuevas hondas cuelga piedra luminosa del techo. Necesito 4.', 'The spotlights burned out. They say glowstone hangs from the ceilings of deep caves. I need 4.'),
        aceptar: t('Lleva antorchas: abajo está más oscuro que mi lentes espejados.', 'Bring torches: down there it is darker than my mirrored shades.'),
        completada: t('¡Luces de estadio! El próximo riff va dedicado a ti, en 7/8 para que nadie lo pueda bailar. Toma este pico, que lo vas a necesitar.', 'Stadium lights! The next riff is dedicated to you, in 7/8 so nobody can dance to it. Take this pickaxe, you will need it.') },
    { id: 'salonas3', amigo: 'salonas', tipo: 'entregar', pide: [[B.BLOQUE_REDSTONE, 2]], premio: [[O.PETO_HIERRO, 1], [O.DIAMANTE, 1]],
        titulo: t('Redstone para el amplificador', 'Redstone for the amp'),
        pedido: t('Quiero un amplificador con más ganancia que la sensatez. Dos bloques de redstone, de lo más hondo de la mina.', 'I want an amp with more gain than common sense. Two blocks of redstone, from the deepest part of the mine.'),
        aceptar: t('Redstone hay bajo la capa 18. Nueve polvos hacen un bloque.', 'Redstone lies below layer 18. Nine dusts make a block.'),
        completada: t('¡Escucha ese slap! Se oye hasta en San Rosendo. Ponte este peto, que en primera fila salpica la distorsión.', 'Hear that slap! They can hear it in San Rosendo. Wear this chestplate, front row gets splashed with distortion.') },
    // ---------------- Lona (gatera) ----------------
    { id: 'lona1', amigo: 'lona', tipo: 'entregar', pide: [[PESCADO_COCIDO, 6]], premio: [[O.LINGOTE_HIERRO, 4], [O.PAN, 4]],
        titulo: t('Pescado para Mila y Gala', 'Fish for Mila and Gala'),
        pedido: t('Mila y Gala están maullando como si no hubieran comido en un año (comieron hace una hora). ¿Me traes 6 pescados cocinados?', 'Mila and Gala are meowing like they have not eaten in a year (they ate an hour ago). Bring me 6 cooked fish?'),
        aceptar: t('Cocido, ojo. Crudo lo dejan en la alfombra.', 'Cooked, mind you. Raw they leave on the rug.'),
        completada: t('Mila ya se comió tres y Gala la mira ofendida. Gracias, de verdad. Toma, esto lo encontraron ellas en la caja de juguetes.', 'Mila already ate three and Gala is staring at her, offended. Thanks, really. Here, they found this in the toy box.') },
    { id: 'lona2', amigo: 'lona', tipo: 'entregar', pide: [[O.CAMA, 1]], premio: [[O.HARINA_HUESO, 8], [O.MANZANA, 4]],
        titulo: t('Una cama nueva', 'A new bed'),
        pedido: t('Las gatas se adueñaron de mi cama, así que necesito otra. Lana y tablones, porfa.', 'The cats took over my bed, so I need another one. Wool and planks, please.'),
        aceptar: t('Que sea cómoda… igual se la van a quedar ellas.', 'Make it comfy… they will steal it anyway.'),
        completada: t('Gala ya se subió y está amasando. Bueno, era para ellas desde el principio, ¿no? Toma, para tus cultivos.', 'Gala already climbed on and is kneading. Well, it was for them all along, right? Here, for your crops.') },
    { id: 'lona3', amigo: 'lona', tipo: 'entregar', pide: [[LANAS, 4]], premio: [[O.DIAMANTE, 1], [O.GALLETA, 6]],
        titulo: t('Un cuello para Gala', 'A collar for Gala'),
        pedido: t('Gala anda con cara de que le falta algo. Quiero tejerle un cuello naranjo, de los que se ponen las gatas finas. ¿Me traes 4 de lana? Del color que sea, después lo teñimos.', 'Gala looks like she is missing something. I want to knit her an orange collar, the fancy kind. Can you bring me 4 wool? Any color, we dye it later.'),
        aceptar: t('Dale, aunque tejo con los dedos chuecos. Vuelve cuando tengas la lana.', 'Sure, though I knit with crooked fingers. Come back when you have the wool.'),
        completada: t('¡Ya está! Espérame, Gala, que te tejí algo. Mila va a pedir uno igual, ya lo verás.', 'Done! Wait for me, Gala, I knitted you something. Mila will ask for one too, you will see.') },
    // ---------------- Hadad (campamento) ----------------
    { id: 'hadad1', amigo: 'hadad', tipo: 'entregar', pide: [[TRONCOS, 16]], premio: [[O.HACHA_PIEDRA, 1], [O.FILETE, 3]],
        titulo: t('Leña para la fogata', 'Firewood'),
        pedido: t('La fogata se está apagando y aquí nadie se para porque estamos en partida. ¿Me traes 16 troncos?', 'The campfire is dying and nobody gets up because we are mid-match. Bring me 16 logs?'),
        aceptar: t('Golpea los árboles, como en el principio de los tiempos.', 'Punch trees, like at the dawn of time.'),
        completada: t('Ahora sí, fuego de verdad. Andy dice que es «loot legendario». Toma un hacha decente, la otra era más palo que hacha.', 'Now that is a real fire. Andy calls it "legendary loot". Take a decent axe, the other one was more stick than axe.') },
    { id: 'hadad2', amigo: 'hadad', tipo: 'matar', mob: 'zombi', n: 5, premio: [[O.CASCO_HIERRO, 1], [O.PAN, 3]],
        titulo: t('Cinco zombis', 'Five zombies'),
        pedido: t('Anoche unos zombis se comieron el pan del campamento. Elimina 5 y quedamos en paz con la noche.', 'Last night some zombies ate the camp bread. Take out 5 and we are at peace with the night.'),
        aceptar: t('Salen de noche y en las cuevas. El sol los quema, pero no esperes al sol.', 'They come out at night and in caves. The sun burns them, but do not wait for the sun.'),
        completada: t('Cinco menos. Me acaricio la barba en señal de respeto. Toma este casco: el que viene a la fogata, viene protegido.', 'Five down. I stroke my beard as a sign of respect. Take this helmet: whoever comes to the fire comes protected.') },
    { id: 'hadad3', amigo: 'hadad', tipo: 'entregar', pide: [[O.ESPADA_HIERRO, 1]], premio: [[O.ESCUDO, 1], [O.DIAMANTE, 1]],
        titulo: t('Una espada de hierro', 'An iron sword'),
        pedido: t('Si vamos a defender el campamento, necesito algo mejor que un palo. Fórjame una espada de hierro.', 'If we are defending the camp, I need something better than a stick. Forge me an iron sword.'),
        aceptar: t('Mena de hierro, horno y paciencia.', 'Iron ore, furnace and patience.'),
        completada: t('Pesa justo lo que tiene que pesar. Con esto ya no le temo al Trauco. Bueno, un poquito. Toma un escudo, ponlo en la otra mano.', 'It weighs exactly right. With this I no longer fear the Trauco. Well, a little. Take a shield, put it in your other hand.') },
    // ---------------- Andy (campamento) ----------------
    { id: 'andy1', amigo: 'andy', tipo: 'entregar', pide: [[B.MESA, 1], [B.COFRE, 1]], premio: [[O.PICO_PIEDRA, 1], [B.ANTORCHA, 8]],
        titulo: t('Base de operaciones', 'Base of operations'),
        pedido: t('Quiero armar una base: una mesa de crafteo y un cofre. Lo básico de todo buen inicio.', 'I want to build a base: a crafting table and a chest. The basics of every good start.'),
        aceptar: t('Tablones, tablones y más tablones.', 'Planks, planks and more planks.'),
        completada: t('¡Victory royale! Bueno, no, pero casi. Bailo en honor a tu mesa. Toma un pico y antorchas para la cueva.', 'Victory royale! Well, no, but almost. I dance in honor of your table. Take a pickaxe and torches for the cave.') },
    { id: 'andy2', amigo: 'andy', tipo: 'noche', premio: [[O.ARCO, 1], [O.FLECHA, 16]],
        titulo: t('Sobrevive una noche', 'Survive a night'),
        pedido: t('Reto: aguanta una noche entera sin dormir y sin morir. Nada de esconderse en la cama.', 'Challenge: last a whole night without sleeping and without dying. No hiding in bed.'),
        aceptar: t('Empieza cuando se ponga el sol. Yo te espero aquí, calentito.', 'It starts when the sun sets. I will wait here, nice and warm.'),
        completada: t('¡Llegaste vivo al amanecer! Eso es más de lo que yo hago en Fortnite. Toma un arco: así se pelea desde lejos.', 'You made it to sunrise! That is more than I manage in Fortnite. Take a bow: that is how you fight from afar.') },
    { id: 'andy3', amigo: 'andy', tipo: 'matar', mob: 'creeper', n: 3, premio: [[O.GREBAS_HIERRO, 1], [O.POLLO_ASADO, 4]],
        titulo: t('Tres creepers', 'Three creepers'),
        pedido: t('Un creeper voló mi construcción favorita. Venganza: elimina 3 sin que exploten… si puedes.', 'A creeper blew up my favorite build. Revenge: take out 3 before they explode… if you can.'),
        aceptar: t('Golpea y retrocede. Un arco tampoco viene mal.', 'Hit and back off. A bow does not hurt either.'),
        completada: t('Silencio sssagrado. Justicia para mi torre. Toma estas grebas, que la explosión de uno siempre salpica las rodillas.', 'Sssacred silence. Justice for my tower. Take these leggings, a blast always hits the knees.') },
    // ---------------- Nacho (campamento) ----------------
    { id: 'nacho1', amigo: 'nacho', tipo: 'entregar', pide: [[COCIDO, 8]], premio: [[O.CARBON, 12], [O.LINGOTE_HIERRO, 3]],
        titulo: t('Asado en el campamento', 'Camp barbecue'),
        pedido: t('Me dio hambre de asado. Tráeme 8 carnes cocinadas: vacuno, cerdo, pollo o cordero, lo que pille.', 'I am craving a barbecue. Bring me 8 cooked meats: beef, pork, chicken or mutton, whatever you find.'),
        aceptar: t('Cocinadas en el horno, que en la fogata se nos queman.', 'Cooked in a furnace, in the campfire they burn.'),
        completada: t('Jajaja, ¡esto es un asado de verdad! Ni el de mi tío en septiembre. Toma carbón y hierro, por la parrilla.', 'Hahaha, this is a real barbecue! Better than my uncle\'s in September. Take coal and iron, for the grill.') },
    { id: 'nacho2', amigo: 'nacho', tipo: 'entregar', pide: [[B.ANTORCHA, 20]], premio: [[O.ESPADA_PIEDRA, 1], [O.HARINA_HUESO, 6]],
        titulo: t('Veinte antorchas', 'Twenty torches'),
        pedido: t('Quiero iluminar el camino al baño, que de noche aparece cualquier cosa. 20 antorchas, porfa.', 'I want to light the path to the bathroom, at night anything shows up. 20 torches, please.'),
        aceptar: t('Carbón y palos. El carbón vegetal también sirve.', 'Coal and sticks. Charcoal works too.'),
        completada: t('Ahora parece pista de aterrizaje, jajaja. Ningún monstruo aparece con tanta luz. Toma, por si igual aparece uno.', 'Now it looks like a runway, hahaha. No monster spawns with this much light. Here, in case one shows up anyway.') },
    { id: 'nacho3', amigo: 'nacho', tipo: 'entregar', pide: [[O.ESCUDO, 1]], premio: [[O.DIAMANTE, 2], [O.MANZANA, 3]],
        titulo: t('Un escudo', 'A shield'),
        pedido: t('Los esqueletos me usan de diana. Necesito un escudo: tablones y un lingote de hierro.', 'Skeletons use me as target practice. I need a shield: planks and an iron ingot.'),
        aceptar: t('Clic derecho para bloquear. Eso lo aprendí a la mala.', 'Right click to block. I learned that the hard way.'),
        completada: t('Pum, pum, pum, ¡rebotan todas! Me río solo. Toma unos diamantes que me salieron en una partida que no te voy a contar.', 'Thunk, thunk, thunk, they all bounce! I am laughing alone. Have some diamonds from a match I will not tell you about.') },
    // ---------------- Moisés (iglú) ----------------
    { id: 'moises1', amigo: 'moises', tipo: 'entregar', pide: [[B.NIEVE, 10]], premio: [[O.PALA_HIERRO, 1], [O.ESTOFADO, 1]],
        titulo: t('Nieve para el iglú', 'Snow for the igloo'),
        pedido: t('Al iglú se le están derritiendo las paredes. Tráeme 10 bloques de nieve, de las cumbres.', 'The igloo walls are melting. Bring me 10 snow blocks, from the peaks.'),
        aceptar: t('Con pala se saca rapidito.', 'With a shovel it comes out quick.'),
        completada: t('Ahhh, fresquito otra vez. En Coyhaique esto es pan de cada día. Toma una pala de hierro y un estofado calentito.', 'Ahhh, nice and cool again. In Coyhaique this is daily bread. Take an iron shovel and a warm stew.') },
    { id: 'moises2', amigo: 'moises', tipo: 'entregar', pide: [[B.VIDRIO, 4]], premio: [[O.TIJERAS, 1], [O.LINGOTE_ORO, 3]],
        titulo: t('Ventanas para el iglú', 'Windows for the igloo'),
        pedido: t('Quiero ver la aurora desde adentro. Cuatro vidrios: arena al horno y listo.', 'I want to watch the aurora from inside. Four glass blocks: sand in the furnace and done.'),
        aceptar: t('Arena hay en la playa y junto al mar.', 'There is sand on the beach and by the sea.'),
        completada: t('¡Se ve todo! Hasta las estrellas parecen más cerca. ¡YIAAAAAA! Perdón, se me salió. Toma, tijeras y oro.', 'I can see everything! Even the stars seem closer. YIAAAAAA! Sorry, it slipped out. Here, shears and gold.') },
    { id: 'moises3', amigo: 'moises', tipo: 'entregar', pide: [[O.DIAMANTE, 3]], premio: [[O.PICO_DIAMANTE, 1]],
        titulo: t('Tres diamantes', 'Three diamonds'),
        pedido: t('Te propongo un negocio: me traes 3 diamantes y te devuelvo algo mucho mejor. Confía.', 'Here is a deal: you bring me 3 diamonds and I give you back something much better. Trust me.'),
        aceptar: t('Están bajo la capa 16. Busca lava, por ahí andan cerca.', 'They are below layer 16. Look for lava, they are usually near.'),
        completada: t('Negocio cerrado: un pico de diamante ya hecho, con amor de iglú. Lalo dice que la cabaña ahora brilla.', 'Deal closed: a ready-made diamond pickaxe, with igloo love. Lalo says the hut shines now.') },
    // ---------------- Lalo (iglú) ----------------
    { id: 'lalo1', amigo: 'lalo', tipo: 'entregar', pide: [[O.TRIGO, 12]], premio: [[O.PAN, 6], [O.SEMILLAS, 10]],
        titulo: t('Trigo para el pan', 'Wheat for bread'),
        pedido: t('Tengo una hambre de esas. Tráeme 12 de trigo y hacemos pan para todo el iglú.', 'I have one of those hungers. Bring me 12 wheat and we bake bread for the whole igloo.'),
        aceptar: t('Azada, tierra cerca del agua y semillas del pasto.', 'Hoe, dirt near water and seeds from the grass.'),
        completada: t('Uff, olor a pan amasado. Esto me arregla el día, compadre. Toma pan y semillas, que la cosecha no para.', 'Ooh, smell of fresh bread. This makes my day, friend. Have bread and seeds, the harvest never stops.') },
    { id: 'lalo2', amigo: 'lalo', tipo: 'entregar', pide: [[O.ZANAHORIA, 6], [O.PAPA, 6]], premio: [[O.BOTAS_HIERRO, 1], [O.PAPA_ASADA, 6]],
        titulo: t('Cazuela del sur', 'Southern stew'),
        pedido: t('Quiero hacer una cazuela como la de mi mamá: 6 zanahorias y 6 papas.', 'I want to make a stew like my mom\'s: 6 carrots and 6 potatoes.'),
        aceptar: t('En las casas de la aldea a veces hay semillas guardadas.', 'Village houses sometimes have stored seeds.'),
        completada: t('La olla ya está hirviendo. Huele a domingo en Coyhaique. Toma unas botas, que acá la nieve no perdona.', 'The pot is boiling already. Smells like Sunday in Coyhaique. Take some boots, the snow here is merciless.') },
    { id: 'lalo3', amigo: 'lalo', tipo: 'matar', mob: 'trauco', n: 4, premio: [[O.ESPADA_DIAMANTE, 1]],
        titulo: t('Cuatro Traucos', 'Four Traucos'),
        pedido: t('Un Trauco me miró feo desde el bosque y no me dejó dormir. Saca a 4 de los bosques, de noche.', 'A Trauco gave me a nasty look from the forest and I could not sleep. Get 4 of them out of the woods, at night.'),
        aceptar: t('Su golpe marea. No te dejes pegar dos veces.', 'His hit makes you dizzy. Do not get hit twice.'),
        completada: t('Ya puedo cabecear tranquilo. Eres leyenda de Chiloé, hermano. Toma esta espada, la tenía guardada para alguien como tú.', 'Now I can nod off in peace. You are a Chiloé legend, brother. Take this sword, I kept it for someone like you.') },
    // ---------------- Boris (leñera) ----------------
    { id: 'boris1', amigo: 'boris', tipo: 'entregar', pide: [[O.HACHA_PIEDRA, 1]], premio: [[TRONCOS[0], 16], [O.PAN, 3]],
        titulo: t('Un hacha de piedra', 'A stone axe'),
        pedido: t('Se me partió el hacha en el tocón. Hazme una de piedra mientras tanto, no puedo dejar de cortar.', 'My axe snapped on the stump. Make me a stone one meanwhile, I cannot stop chopping.'),
        aceptar: t('Adoquín y palos. Fácil.', 'Cobblestone and sticks. Easy.'),
        completada: t('¡Tac! Corta parejito. Con cada hachazo te lo agradezco. Toma la leña que corté mientras te esperaba.', 'Thwack! Cuts nice and even. Every chop is a thank you. Have the wood I chopped while waiting.') },
    { id: 'boris2', amigo: 'boris', tipo: 'entregar', pide: [[B.TABLONES, 32]], premio: [[O.HACHA_HIERRO, 1], [O.MANZANA, 4]],
        titulo: t('Tablones para la cabaña', 'Planks for the cabin'),
        pedido: t('Quiero arreglar la atalaya antes del invierno. Necesito 32 tablones.', 'I want to fix the watchtower before winter. I need 32 planks.'),
        aceptar: t('Cada tronco son 4 tablones. Haz la cuenta.', 'Every log is 4 planks. Do the math.'),
        completada: t('Con esto la atalaya aguanta otros cien años. Lucho ni ayudó, como siempre. Toma mi hacha de repuesto: es de hierro.', 'With this the tower will last another hundred years. Lucho did not help, as usual. Take my spare axe: it is iron.') },
    { id: 'boris3', amigo: 'boris', tipo: 'entregar', pide: [[O.HACHA_DIAMANTE, 1]], premio: [[O.PETO_DIAMANTE, 1]],
        titulo: t('El hacha definitiva', 'The ultimate axe'),
        pedido: t('Sueño con un hacha de diamante. Si me la traes, te paso algo que guardo hace años.', 'I dream of a diamond axe. Bring me one and I will give you something I have kept for years.'),
        aceptar: t('Tres diamantes y dos palos. Lo demás es actitud.', 'Three diamonds and two sticks. The rest is attitude.'),
        completada: t('Corta el tronco antes de tocarlo. Es perfecta. Como prometí: un peto de diamante. Úsalo contra los jefes.', 'It cuts the log before touching it. Perfect. As promised: a diamond chestplate. Wear it against the bosses.') },
    // ---------------- Lucho (leñera) ----------------
    { id: 'lucho1', amigo: 'lucho', tipo: 'matar', mob: 'arana', n: 5, premio: [[O.HILO, 6], [O.ARCO, 1]],
        titulo: t('Cinco arañas', 'Five spiders'),
        pedido: t('Odio las arañas más que perder en ranked. Elimina 5 y quedo en paz.', 'I hate spiders more than losing ranked. Take out 5 and I am at peace.'),
        aceptar: t('De día no atacan si no las molestas. De noche sí, y feo.', 'By day they do not attack unless provoked. At night they do, and badly.'),
        completada: t('Cinco menos en el mundo. Me rasco la cabeza de pura satisfacción. Toma, hilo de sus telarañas y un arco.', 'Five fewer in the world. I scratch my head out of pure satisfaction. Here, string from their webs and a bow.') },
    { id: 'lucho2', amigo: 'lucho', tipo: 'entregar', pide: [[O.ARCO, 1], [O.FLECHA, 16]], premio: [[O.CASCO_HIERRO, 1], [O.PAN, 4]],
        titulo: t('Arco y flechas', 'Bow and arrows'),
        pedido: t('Quiero practicar tiro como en Deadlock. Tráeme un arco y 16 flechas.', 'I want to practice shooting like in Deadlock. Bring me a bow and 16 arrows.'),
        aceptar: t('Las flechas llevan pedernal, palo y pluma. Las gallinas tienen plumas.', 'Arrows need flint, stick and feather. Chickens have feathers.'),
        completada: t('Headshot al tronco de Boris. No se dio cuenta. Toma este casco, que yo tampoco apunto tan bien.', 'Headshot on Boris\'s stump. He did not notice. Take this helmet, I do not aim that well either.') },
    { id: 'lucho3', amigo: 'lucho', tipo: 'matar', mob: 'esqueleto', n: 8, premio: [[O.GREBAS_DIAMANTE, 1]],
        titulo: t('Ocho esqueletos', 'Eight skeletons'),
        pedido: t('Los esqueletos se creen pro con el arco. Demuéstrales que no: elimina 8.', 'Skeletons think they are pros with the bow. Prove them wrong: take out 8.'),
        aceptar: t('Escudo arriba y acércate de lado.', 'Shield up and approach from the side.'),
        completada: t('GG EZ. Nana estaría orgullosa. Toma estas grebas de diamante: te las ganaste con skill.', 'GG EZ. Nana would be proud. Take these diamond leggings: you earned them with skill.') },
    // ---------------- Braulio (naufragio) ----------------
    { id: 'braulio1', amigo: 'braulio', tipo: 'entregar', pide: [[O.HUESO, 10]], premio: [[O.HARINA_HUESO, 12], [O.BACALAO_COCIDO, 4]],
        titulo: t('Diez huesos', 'Ten bones'),
        pedido: t('En la playa encontré un hueso raro y ahora quiero la colección completa. Tráeme 10 huesos.', 'I found a weird bone on the beach and now I want the whole collection. Bring me 10 bones.'),
        aceptar: t('Los esqueletos los regalan. No muy amablemente.', 'Skeletons give them away. Not very kindly.'),
        completada: t('¡Diez! Me miro el dedo doble y digo: valió la pena. Toma, harina de huesos para que crezca todo.', 'Ten! I look at my double finger and say: worth it. Here, bone meal so everything grows.') },
    { id: 'braulio2', amigo: 'braulio', tipo: 'visitar', n: 6, premio: [[O.BRUJULA, 1], [O.LINGOTE_ORO, 4]],
        titulo: t('Recorre los seis lugares', 'Visit the six places'),
        pedido: t('¿Conoces el molino, la atalaya, el campamento, el portal, el iglú y este naufragio? Ve a los 6 y vuelve a contarme.', 'Do you know the windmill, watchtower, campsite, portal, igloo and this shipwreck? Visit all 6 and come tell me.'),
        aceptar: t('Mira el mapa con M. Los lugares no están en «Ir a».', 'Check the map with M. The places are not in the travel menu.'),
        completada: t('¡Eres un explorador de verdad! Yo solo conozco la orilla. Toma esta brújula, aunque tú ya no la necesitas.', 'You are a true explorer! I only know the shore. Take this compass, though you do not need it anymore.') },
    { id: 'braulio3', amigo: 'braulio', tipo: 'entregar', pide: [[O.BRUJULA, 1]], premio: [[O.BOTAS_DIAMANTE, 1]],
        titulo: t('Una brújula para el barco', 'A compass for the ship'),
        pedido: t('Quiero reflotar el barco algún día. Hazme una brújula propia: hierro y redstone.', 'I want to refloat the ship someday. Make me my own compass: iron and redstone.'),
        aceptar: t('La que te di es tuya; quiero una hecha por ti.', 'The one I gave you is yours; I want one made by you.'),
        completada: t('Apunta al norte… o al Caleuche, no sé. Toma estas botas de diamante, para caminar sobre lo que sea.', 'It points north… or to the Caleuche, not sure. Take these diamond boots, to walk on anything.') },
    // ---------------- Conejeros (escenario) ----------------
    { id: 'conejeros1', amigo: 'conejeros', tipo: 'entregar', pide: [[O.HUEVO, 4]], premio: [[O.PASTEL, 1], [O.CARBON, 8]],
        titulo: t('Cuatro huevos', 'Four eggs'),
        pedido: t('Quiero hacer un queque para el Pony. Necesito 4 huevos, de las gallinas de la aldea.', 'I want to bake a cake for Pony. I need 4 eggs, from the village chickens.'),
        aceptar: t('Ponen cada tanto. Paciencia y buen oído.', 'They lay every now and then. Patience and good ears.'),
        completada: t('El Pony va a llorar de emoción, o de hambre. Toma uno que me sobró. Y sigo cabeceando al ritmo del bajo.', 'Pony will cry from emotion, or hunger. Have one I had left over. And I keep headbanging to the bass.') },
    { id: 'conejeros2', amigo: 'conejeros', tipo: 'entregar', pide: [[O.PAN, 5]], premio: [[O.ESPADA_HIERRO, 1], [O.FILETE, 4]],
        titulo: t('Pan para el público', 'Bread for the crowd'),
        pedido: t('El público tiene hambre y el show recién empieza. Cinco panes, porfa.', 'The crowd is hungry and the show just started. Five loaves, please.'),
        aceptar: t('Tres de trigo por pan. Dale.', 'Three wheat per loaf. Go.'),
        completada: t('¡Pan para todos! Hasta Salonas paró un compás para comer. Toma una espada, en primera fila hay que defenderse.', 'Bread for everyone! Even Salonas stopped a bar to eat. Take a sword, the front row needs defending.') },
    { id: 'conejeros3', amigo: 'conejeros', tipo: 'matar', mob: '*', n: 10, noche: true, premio: [[O.CASCO_DIAMANTE, 1]],
        titulo: t('Diez monstruos de noche', 'Ten monsters at night'),
        pedido: t('Quiero una noche de concierto sin interrupciones. Elimina 10 monstruos, los que sean, de noche.', 'I want a concert night with no interruptions. Take out 10 monsters, any kind, at night.'),
        aceptar: t('Cuando suene el riff de Gallo cósmico, sales a pelear.', 'When the Cosmic Rooster riff plays, go fight.'),
        completada: t('¡Qué noche! Ni un solo zombi en el mosh. Toma este casco de diamante: para cabecear sin miedo.', 'What a night! Not a single zombie in the mosh pit. Take this diamond helmet: to headbang without fear.') }
];

// ---------------- Kits (7d) ----------------
// Se entregan una sola vez por mundo al aceptar (`estado.kits`). [id, n] = provisión (se queda y se usa);
// [id, 1, 'amigo'] = herramienta prestada: lleva la marca del amigo, media durabilidad y no cuenta para
// entregar ni para vender. Regla: nada de lo que piden otras misiones o compran las tiendas (salvo semillas
// para plantar) y valor ≤ 1/3 del premio (mundo/tests/misiones.mjs).
export const KITS = {
    pony1: [[O.CANA, 1, 'pony']],
    pony2: [[O.GALLETA, 3]],
    pony3: [[O.HILO, 2]],
    salonas1: [[O.TIJERAS, 1, 'salonas']],
    salonas2: [[O.PICO_PIEDRA, 1, 'salonas']],
    salonas3: [[O.PAPA_ASADA, 6]],
    lona1: [[O.CARBON, 4]],
    lona2: [[O.TIJERAS, 1, 'lona']],
    lona3: [[O.MANZANA, 3]],
    hadad1: [[O.HACHA_PIEDRA, 1, 'hadad']],
    hadad2: [[O.ESPADA_PIEDRA, 1, 'hadad'], [O.PAPA_ASADA, 3]],
    hadad3: [[O.CARBON, 3]],
    andy1: [[O.HACHA_MADERA, 1, 'andy']],
    andy2: [[O.ESPADA_PIEDRA, 1, 'andy'], [O.GALLETA, 2]],
    andy3: [[O.ESCUDO, 1, 'andy']],
    nacho1: [[O.ESPADA_MADERA, 1, 'nacho'], [O.CARBON, 4]],
    nacho2: [[O.PALO, 10]],
    nacho3: [[O.LINGOTE_HIERRO, 1]],
    moises1: [[O.PALA_MADERA, 1, 'moises']],
    moises2: [[O.CARBON, 4]],
    moises3: [[O.PICO_HIERRO, 1, 'moises']],
    lalo1: [[O.AZADA_MADERA, 1, 'lalo'], [O.SEMILLAS, 6]],
    lalo2: [[O.ZANAHORIA, 2], [O.PAPA, 2]],
    lalo3: [[O.ESPADA_PIEDRA, 1, 'lalo'], [O.MANZANA, 3]],
    boris1: [[O.PICO_MADERA, 1, 'boris']],
    boris2: [[O.HACHA_PIEDRA, 1, 'boris']],
    boris3: [[O.PICO_HIERRO, 1, 'boris']],
    lucho1: [[O.ESPADA_PIEDRA, 1, 'lucho']],
    lucho2: [[O.HILO, 3]],
    lucho3: [[O.ESCUDO, 1, 'lucho']],
    braulio1: [[O.ESPADA_PIEDRA, 1, 'braulio']],
    braulio2: [[O.GALLETA, 4]],
    braulio3: [[O.PICO_PIEDRA, 1, 'braulio']],
    conejeros1: [[O.SEMILLAS, 4]],
    conejeros2: [[O.AZADA_MADERA, 1, 'conejeros'], [O.SEMILLAS, 6]],
    conejeros3: [[O.ESCUDO, 1, 'conejeros']]
};
for (const m of MISIONES) m.kit = KITS[m.id] || null;

// Entrega el kit de la misión `m` una sola vez: `kits` es el Set de misiones cuyo kit ya se dio.
// Devuelve null si ya se había dado, o la lista de lo que no cupo: [[id, n, d, amigo]].
export function repartirKit(m, kits, inventario) {
    if (!m.kit || kits.has(m.id)) return null;
    kits.add(m.id);
    const sobran = [];
    for (const [id, n, amigo] of m.kit) {
        const max = amigo && info(id).durabilidad;
        const d = max ? Math.floor(max / 2) : 0; // prestadas: media durabilidad
        const resto = inventario.agregar(id, n, d, amigo || null);
        if (resto) sobran.push([id, resto, d, amigo || null]);
    }
    return sobran;
}

// Jefes: Venjy los entrega en orden cuando se cumplen `requiere` misiones de amigos
export const JEFES = [
    { id: 'jefe1', jefe: 'imbunche', requiere: 8, objeto: 'AMULETO_MINA', premio: [[O.DIAMANTE, 4], [O.MANZANA, 6]], vidaExtra: 2,
        titulo: t('El Imbunche de la mina', 'The Imbunche of the mine'),
        pedido: t('Algo despertó al fondo de la mina: el Imbunche, guardián torcido de los brujos. Lleva este amuleto al altar del fondo del túnel e invócalo. Cuidado con el techo.', 'Something woke at the bottom of the mine: the Imbunche, twisted guardian of the warlocks. Take this amulet to the altar at the end of the tunnel and summon it. Watch the ceiling.'),
        aceptar: t('Lleva comida, antorchas y la mejor armadura que tengas.', 'Bring food, torches and your best armor.'),
        completada: t('¡Lo hiciste! La mina vuelve a ser solo una mina. Te ganaste un corazón más. Ahora dicen que en el portal en ruinas se oye un «tue tue»…', 'You did it! The mine is just a mine again. You earned an extra heart. Now they say a "tue tue" is heard at the ruined portal…'),
        bloqueada: t('Todavía no estás listo. Ayuda a los amigos primero: van {n} de 8 misiones.', 'You are not ready yet. Help our friends first: {n} of 8 quests done.') },
    { id: 'jefe2', jefe: 'chonchon', requiere: 18, objeto: 'PLUMA_CHONCHON', premio: [[O.DIAMANTE, 6], [O.FLECHA, 32]], vidaExtra: 2,
        titulo: t('El Chonchon gigante', 'The giant Chonchon'),
        pedido: t('Un Chonchon gigante ronda el portal en ruinas: una cabeza de brujo que vuela con sus orejas. Pon esta pluma en el altar del portal. Lleva arco: no va a bajar a pelear limpio.', 'A giant Chonchon haunts the ruined portal: a warlock\'s head flying on its ears. Place this feather on the portal altar. Bring a bow: it will not come down to fight fair.'),
        aceptar: t('Sus bolas de fuego se bloquean con escudo.', 'Its fireballs can be blocked with a shield.'),
        completada: t('¡Cayó el Chonchon! Otro corazón para ti. Solo queda uno… mira el mar frente al naufragio en noche de niebla.', 'The Chonchon fell! Another heart for you. Only one remains… watch the sea off the shipwreck on a foggy night.'),
        bloqueada: t('El Chonchon es más fuerte. Primero, completa 18 misiones de amigos (vas en {n}).', 'The Chonchon is stronger. First, complete 18 friend quests ({n} so far).') },
    { id: 'jefe3', jefe: 'caleuche', requiere: 36, objeto: 'FAROL_CALEUCHE', premio: [[O.DIAMANTE, 8]], vidaExtra: 0,
        titulo: t('El Caleuche', 'The Caleuche'),
        pedido: t('Es hora. El Caleuche, el barco fantasma, viene por el mapa. Enciende este farol en el altar de la orilla, junto al naufragio, y enfrenta a su tripulación y a su capitán brujo.', 'It is time. The Caleuche, the ghost ship, is coming for the map. Light this lantern at the altar on the shore, by the shipwreck, and face its crew and its warlock captain.'),
        aceptar: t('Todos los amigos están contigo. Yo también.', 'All our friends are with you. So am I.'),
        completada: t('¡El Caleuche se hundió para siempre! Salvaste el mundo de Venjy. Gracias por jugar… y por recorrer mi portafolio bloque por bloque.', 'The Caleuche sank forever! You saved Venjy\'s world. Thanks for playing… and for exploring my portfolio block by block.'),
        bloqueada: t('El Caleuche solo aparece cuando todos los amigos están contentos: van {n} de 36 misiones.', 'The Caleuche only appears when all friends are happy: {n} of 36 quests done.') }
];

export const TEXTOS_VENJY = {
    todo: t('¡Terminaste todo! El mundo está en paz. Puedes seguir construyendo lo que quieras.', 'You finished everything! The world is at peace. Keep building whatever you like.'),
    activa: t('Primero termina la misión que tienes. Una cosa a la vez.', 'Finish the quest you have first. One thing at a time.'),
    sinMas: t('Ya me ayudaste en todo. ¡Gracias, de verdad!', 'You already helped me with everything. Thanks, really!')
};
