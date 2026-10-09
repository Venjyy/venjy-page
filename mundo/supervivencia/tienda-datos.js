// =========================================================
// VENJY · Supervivencia · Tienda (datos)
// Cada amigo tiene su oferta. Oferta: { da: [[id, n]], pide: [[id, n]], req? } — la moneda son las
// esmeraldas (O.ESMERALDA) o el trueque objeto por objeto; `req` es el id de una misión de ese
// amigo que debe estar completada. `compra`: lo que el amigo te recibe a cambio de esmeraldas:
// { da: [id, n], esm }. Los diálogos (saludo, compra, venta, noAlcanza) son únicos por amigo.
// Los precios se calibran contra recetas y botín: mundo/tests/tienda.mjs lo comprueba.
// =========================================================
import { B } from '../texturas.js';
import { O } from './objetos.js';

const t = (es, en) => ({ es, en });
const E = n => [[O.ESMERALDA, n]];
const of = (da, pide, req) => ({ da, pide, ...(req ? { req } : {}) });
const vende = (id, n, esm) => ({ da: [id, n], esm });

export const TIENDAS = {
    pony: {
        ofertas: [
            of([[O.BACALAO, 4]], E(1)),
            of([[O.SALMON, 3]], E(1)),
            of([[O.HILO, 4]], E(1)),
            of([[O.CANA, 1]], E(2)),
            of([[O.SALMON_COCIDO, 2]], E(1)),
            of([[O.SALMON, 2]], [[O.BACALAO, 3]]),
            of([[O.PEZ_GLOBO, 1]], E(1), 'pony2')
        ],
        compra: [vende(O.BACALAO, 8, 1), vende(O.SALMON, 4, 1)],
        saludo: t('Aquí no hay precios fijos: hay pescado, y hay quien tiene ganas de pescarlo.', 'No fixed prices here: there is fish, and there are people who feel like catching it.'),
        compraOk: t('Trato hecho. Si el pez te sale chico, échale la culpa al mar, no a mí.', 'Deal done. If the fish comes out small, blame the sea, not me.'),
        ventaOk: t('Qué bonitos. Los pongo en el hielo antes de que el Caleuche los huela.', 'Lovely ones. Into the ice they go before the Caleuche smells them.'),
        noAlcanza: t('Se te cortó la lienza: te falta algo para cerrar este trato.', 'Your line snapped: you are short of something to close this deal.')
    },
    salonas: {
        ofertas: [
            of([[O.FLECHA, 6]], E(1)),
            of([[B.ANTORCHA, 16]], E(1)),
            of([[O.REDSTONE, 4]], E(1)),
            of([[B.LANA, 4]], E(1)),
            of([[B.PIEDRA_LUMINOSA, 2]], E(1), 'salonas2'),
            of([[O.LAPIS, 3]], E(1), 'salonas3')
        ],
        compra: [vende(O.REDSTONE, 6, 1)],
        saludo: t('Bienvenido al camarín. Todo lo que ves tiene más ganancia que sensatez.', 'Welcome to the dressing room. Everything you see has more gain than common sense.'),
        compraOk: t('Cobrado y sonando. Ese trato me quedó en tiempo de 7/8.', 'Paid and ringing. That deal landed in 7/8 time.'),
        ventaOk: t('Redstone para el amplificador: el vecino jura que ya no me perdona.', 'Redstone for the amp: the neighbor swears he will never forgive me.'),
        noAlcanza: t('Te falta un compás de plata. Vuelve cuando junten más esmeraldas.', 'You are a bar of cash short. Come back when you have more emeralds.')
    },
    lona: {
        ofertas: [
            of([[B.LANA, 4]], E(1)),
            of([[O.HILO, 4]], E(1)),
            of([[O.BACALAO_COCIDO, 3]], E(1)),
            of([[O.CAMA, 1]], E(1)),
            of([[B.LANA_ROJA, 3]], E(1)),
            of([[O.CUERO, 3]], E(1), 'lona2'),
            of([[O.PLUMA, 8]], E(1), 'lona3')
        ],
        compra: [vende(O.BACALAO, 5, 1)],
        saludo: t('Mila y Gala supervisan la tienda. Si una bosteza, es que el precio está bien.', 'Mila and Gala supervise the shop. If one yawns, the price is fair.'),
        compraOk: t('Gala olfateó tu bolsa y dio su aprobación. Que lo disfrutes.', 'Gala sniffed your bag and gave her approval. Enjoy it.'),
        ventaOk: t('Pescado fresco: Mila ya está dando vueltas alrededor de la caja.', 'Fresh fish: Mila is already circling the box.'),
        noAlcanza: t('Gala se tapó los ojos con la pata: no alcanza para esto todavía.', 'Gala covered her eyes with a paw: not enough for this yet.')
    },
    hadad: {
        ofertas: [
            of([[O.CARBON_VEGETAL, 6]], E(1)),
            of([[O.CHULETA, 2]], E(1)),
            of([[O.PALO, 12]], E(1)),
            of([[B.ANTORCHA, 12]], E(1)),
            of([[O.CASCO_HIERRO, 1]], E(2), 'hadad2'),
            of([[O.ESPADA_HIERRO, 1]], E(1), 'hadad3')
        ],
        compra: [vende(O.VACUNO, 4, 1)],
        saludo: t('Me acaricio la barba y pienso en tu bolsillo. Veamos qué le hace falta a tu fogata.', 'I stroke my beard and think of your pocket. Let us see what your campfire needs.'),
        compraOk: t('Hecho, a la leña de la buena. Me acaricio la barba por el negocio.', 'Done, good firewood. I stroke my beard for the deal.'),
        ventaOk: t('Carne para la parrilla. Te lo agradezco con un gesto serio de cabeza.', 'Meat for the grill. I thank you with a serious nod.'),
        noAlcanza: t('Me acaricio la barba, pero la cuenta no sale: te falta un poco.', 'I stroke my beard, but the numbers do not add up: you are short.')
    },
    andy: {
        ofertas: [
            of([[B.MESA, 2]], E(1)),
            of([[B.HORNO, 1]], E(1)),
            of([[B.COFRE, 1]], E(1)),
            of([[O.ARCO, 1]], E(1), 'andy2'),
            of([[O.GREBAS_HIERRO, 1]], E(3), 'andy3')
        ],
        compra: [vende(O.POLVORA, 5, 1)],
        saludo: t('Abrió la tienda de la base. Inventario limitado, loot garantizado.', 'The base shop is open. Limited inventory, guaranteed loot.'),
        compraOk: t('Compra confirmada. Eso es un +10 de equipo, sin lag.', 'Purchase confirmed. That is a +10 on gear, no lag.'),
        ventaOk: t('Pólvora fresca para mis experimentos. Que no se entere el vecino.', 'Fresh gunpowder for my experiments. Do not let the neighbor know.'),
        noAlcanza: t('Error 402: te faltan recursos. Farmea un poco y vuelve.', 'Error 402: not enough resources. Farm a bit and come back.')
    },
    nacho: {
        ofertas: [
            of([[B.ANTORCHA, 12]], E(1)),
            of([[O.FILETE, 2]], E(1)),
            of([[O.POLLO_ASADO, 2]], E(1)),
            of([[O.PASTEL, 1]], E(1)),
            of([[O.CARBON, 4]], E(1), 'nacho1'),
            of([[O.ESCUDO, 1]], E(1), 'nacho2')
        ],
        compra: [vende(O.HUEVO, 5, 1)],
        saludo: t('Jajaja, pasa, pasa. Lo que no se vende acá se lo come Andy.', 'Hahaha, come in, come in. Whatever does not sell here, Andy eats.'),
        compraOk: t('Jajaja, ¡negocio redondo! Hasta me dio hambre.', 'Hahaha, what a fine deal! It even made me hungry.'),
        ventaOk: t('Huevos pa\' la mañana. Jajaja, cuenta como desayuno.', 'Eggs for the morning. Hahaha, counts as breakfast.'),
        noAlcanza: t('Jajaja, mira tu bolsa: está más vacía que la parrilla del lunes.', 'Hahaha, look at your bag: emptier than Monday\'s grill.')
    },
    moises: {
        ofertas: [
            of([[B.NIEVE, 16]], E(1)),
            of([[O.TIJERAS, 1]], E(2)),
            of([[O.ESTOFADO, 2]], E(1)),
            of([[B.VIDRIO, 8]], E(1), 'moises2'),
            of([[O.PALA_HIERRO, 1]], E(1), 'moises3')
        ],
        compra: [vende(B.NIEVE, 20, 1)],
        saludo: t('Pasa al iglú, que se enfría el estofado. Todo tiene su precio, también el invierno.', 'Step into the igloo before the stew cools. Everything has a price, winter too.'),
        compraOk: t('Listo. En Coyhaique así se cierran los tratos: con las manos congeladas.', 'Done. In Coyhaique deals close like this: with frozen hands.'),
        ventaOk: t('Nieve para el iglú, ¡YIAAAAA! Perdón, se me escapó otra vez.', 'Snow for the igloo, YIAAAAA! Sorry, it slipped out again.'),
        noAlcanza: t('Hace frío, pero tu bolsa está peor: aún no alcanza para esto.', 'It is cold, but your bag is worse: not enough for this yet.')
    },
    lalo: {
        ofertas: [
            of([[O.PAN, 3]], E(1)),
            of([[O.SEMILLAS, 12]], E(1)),
            of([[O.PAPA_ASADA, 4]], E(1)),
            of([[O.TRIGO, 6]], E(1)),
            of([[O.PAN, 3]], [[O.TRIGO, 9]]),
            of([[O.ESTOFADO, 2]], E(1), 'lalo2'),
            of([[O.AZADA_HIERRO, 1]], E(1), 'lalo3')
        ],
        compra: [vende(O.TRIGO, 10, 1)],
        saludo: t('Ahya, pasa a la cabaña. Huele a pan y a trato justo, compadre.', 'Ahya, step into the hut. It smells of bread and fair deals, friend.'),
        compraOk: t('Ahya, trato cerrado. Con eso sí que rinde la cosecha.', 'Ahya, deal closed. With that the harvest stretches far.'),
        ventaOk: t('Ahya, trigo del bueno. Mañana amasamos para todo el campamento.', 'Ahya, good wheat. Tomorrow we knead for the whole camp.'),
        noAlcanza: t('Ahya, compadre, falta un poquito para completar el trato.', 'Ahya, friend, a little is missing to complete the deal.')
    },
    boris: {
        ofertas: [
            of([[B.TRONCO, 16]], E(2)),
            of([[B.TRONCO_ABEDUL, 8]], E(1)),
            of([[O.HACHA_PIEDRA, 1]], E(1)),
            of([[O.HACHA_HIERRO, 1]], E(2)),
            of([[B.TABLONES, 16]], E(1)),
            of([[B.TRONCO, 8]], [[O.CARBON, 4]]),
            of([[O.HACHA_DIAMANTE, 1]], E(8), 'boris3'),
            of([[B.TABLONES, 32]], E(1), 'mj-boris') // rebaja por ganarle el duelo de hachas (minijuego-lena.js)
        ],
        compra: [vende(B.TRONCO, 16, 1)],
        saludo: t('Leña, hachas y tablones. Lo que no corto, lo cambio.', 'Firewood, axes and planks. What I do not chop, I trade.'),
        compraOk: t('¡Tac! Trato cortado parejito. Lleva eso con cuidado.', 'Thwack! Deal cut nice and even. Carry that with care.'),
        ventaOk: t('Troncos como estos no se ven todos los días. Los apilo ahora.', 'Logs like these are not seen every day. I will stack them now.'),
        noAlcanza: t('Con esa bolsa no corto ni una rama. Vuelve con más.', 'With that bag I cannot cut a single branch. Come back with more.')
    },
    lucho: {
        ofertas: [
            of([[O.HILO, 4]], E(1)),
            of([[O.ARCO, 1]], E(1)),
            of([[O.FLECHA, 8]], E(1)),
            of([[O.PLUMA, 6]], E(1)),
            of([[O.HARINA_HUESO, 6]], E(1)),
            of([[O.CASCO_HIERRO, 1]], E(2), 'lucho2'),
            of([[O.ESPADA_DIAMANTE, 1]], E(5), 'lucho3')
        ],
        compra: [vende(O.HUESO, 10, 1)],
        saludo: t('Mi tienda, mis reglas. Cero lag, cero fiado, cero Nana mirando.', 'My shop, my rules. Zero lag, zero credit, zero Nana watching.'),
        compraOk: t('GG, compra aprobada. Con eso ya subes de nivel.', 'GG, purchase approved. With that you level up.'),
        ventaOk: t('Huesos para ablandar la partida. Gracias por farmear por mí.', 'Bones to soften the match. Thanks for farming for me.'),
        noAlcanza: t('Sin recursos no hay compra: es la regla número uno del mercado.', 'No resources, no purchase: rule number one of the market.')
    },
    braulio: {
        ofertas: [
            of([[O.BRUJULA, 1]], E(2)),
            of([[O.LAPIS, 3]], E(1)),
            of([[O.PEDERNAL, 6]], E(1)),
            of([[B.PIEDRA_LUMINOSA, 2]], E(1)),
            of([[O.LIBRO, 2]], E(1), 'braulio2'),
            of([[O.DIAMANTE, 1]], E(3), 'braulio3')
        ],
        compra: [vende(O.PEDERNAL, 10, 1)],
        saludo: t('Curiosidades de todas partes. Me rasco la cabeza: cada cosa tiene su historia.', 'Curiosities from everywhere. I scratch my head: every item has a story.'),
        compraOk: t('Me rasco la cabeza, satisfecho. Esta curiosidad ya es tuya.', 'I scratch my head, satisfied. This curiosity is yours now.'),
        ventaOk: t('Qué rareza más linda. La guardo con las otras en mi caja.', 'What a lovely oddity. I will keep it with the others in my box.'),
        noAlcanza: t('Me rasco la cabeza: faltan unas cuantas esmeraldas para esto.', 'I scratch my head: a few emeralds are missing for this.')
    },
    conejeros: {
        ofertas: [
            of([[O.HUEVO, 4]], E(1)),
            of([[O.PAN, 2]], E(1)),
            of([[O.ZANAHORIA, 3]], E(1)),
            of([[O.PASTEL, 1]], E(1)),
            of([[B.HENO, 1]], E(1), 'conejeros2'),
            of([[O.ESPADA_HIERRO, 1]], E(1), 'conejeros3')
        ],
        compra: [vende(O.HUEVO, 5, 1)],
        saludo: t('Paso a paso, que los conejos son rápidos pero los tratos, no. ¿Qué buscas?', 'Step by step, rabbits are quick but deals are not. What are you after?'),
        compraOk: t('Perfecto, ya está. Los conejos aprobaron con las orejas.', 'Perfect, that is it. The rabbits approved with their ears.'),
        ventaOk: t('¡Huevos! El Pony va a llorar de la emoción. O del hambre.', 'Eggs! Pony will cry from emotion. Or hunger.'),
        noAlcanza: t('Las orejas no mienten: no te alcanza para este trato.', 'Ears do not lie: you cannot afford this deal.')
    },
    venjy: {
        ofertas: [
            of([[O.PAN, 3]], E(1)),
            of([[O.MANZANA, 3]], E(1)),
            of([[B.ANTORCHA, 16]], E(1)),
            of([[O.FLECHA, 8]], E(1))
        ],
        compra: [vende(O.PEDERNAL, 10, 1)],
        saludo: t('Provisiones del Inicio. Para peleas largas, bolsillos llenos.', 'Provisions from the Start. For long fights, full pockets.'),
        compraOk: t('Provisiones entregadas. Que te duren hasta el próximo jefe.', 'Provisions delivered. May they last until the next boss.'),
        ventaOk: t('Pedernal para encender el altar. Es justo lo que necesitaba.', 'Flint to light the altar. Exactly what I needed.'),
        noAlcanza: t('Hasta en el Inicio hay cuentas: todavía te falta para esto.', 'Even at the Start there are accounts: you are still short for this.')
    }
};
