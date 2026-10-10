// =========================================================
// VENJY · Supervivencia · Bienvenida de Lona: «Baile lento» (bloque 6c-1, relación pareja)
// escena-amistad.js lo carga con import() solo al usarlo (escenas-skin.js: skin de Lona cerca del Venjy del Inicio).
// bienvenida(info) devuelve el guion (formato en la cabecera de escena-amistad.js). 'n' = el Venjy del Inicio, 'j' = tú.
// Guion (r 0.9, distancia de pareja):
//   0.6-3.1    Venjy te saluda y habla (`habla`); tú asientes.
//   6.1-8.8    Venjy te ofrece la mano derecha (`ofrece`, variante del gesto `mano` a r 0.9) y tú la tomas (`toma`).
//   8.9-14.3   bailan lento, tomados de la mano: se mecen (`mece`, `rz` suave) y giran despacio un paso de
//              baile (yaw de Venjy y de tu cuerpo, ±0.25 rad, en fase; el giro vuelve a 0 al final del paso).
//   14.4-20.4  abrazo, beso en la mejilla y corazones de comun.js (`pareja(14.4)`, corazones en 17.2, 18.2 y 19.4).
// Son personas reales: siempre en buena onda; textos aprobados por el dueño (DISENO-6c.md §2).
// =========================================================
import { t, encadenar, r2, pareja, MOLDES } from './comun.js';

export const LINEAS = encadenar([
    ['n', t('¿Amor? ¿Tú también estás en el juego?', "Love? You're in the game too?")],
    ['j', t('Vine a ver el mundo que tanto me contabas.', 'I came to see the world you kept telling me about.')],
    ['n', t('Entonces, antes del recorrido, un baile.', 'Then, before the tour, a dance.')],
    ['j', t('Sin música y todo. Eres un tontito.', 'Without music and everything. You\'re such a goof.')],
    ['n', t('Te estaba esperando. Ahora sí está completo.', 'I was waiting for you. Now it\'s complete.')],
    ['j', t('Las gatas se quedaron cuidando la casa... o eso espero.', 'The cats stayed home looking after the house... or so I hope.')],
    ['n', t('Mila debe estar durmiendo y Gala botando algo. Ya, te muestro todo.', 'Mila must be asleep and Gala knocking something over. Okay, let me show you everything.')]
]);

const P0 = 14.4; // abrazo y beso de pareja
const PAR = pareja(P0);
const suave = u => u * u * (3 - 2 * u);
const tramo = (u, a, b) => Math.max(0, Math.min(1, (u - a) / (b - a)));
const BAILE = [8.9, 14.3]; // paso lento tomados de la mano
// Giro de ±0.25 rad, en fase para los dos (empieza y termina en 0 para no saltar)
const giro = t => (t >= BAILE[0] && t <= BAILE[1] ? 0.25 * Math.sin((t - BAILE[0]) * Math.PI * 2 / (BAILE[1] - BAILE[0])) : 0);

// Tomados de la mano: la derecha de cada uno llega a la de la otra persona (r 0.9); bDx -0.75 cruza ~1 bloque
const mano = u => ({ bDx: -0.4 - 0.35 * suave(tramo(u, 0, 1)), bDz: 0.15, cx: 0.05 });

export function bienvenida() {
    return {
        T: r2(P0 + 6.0 + 1.1), r: 0.9,
        lineas: LINEAS,
        corazones: [...PAR.corazones],
        pista: {
            n: [['habla', 0.6, 3.1], ['ofrece', 6.1, 8.8], ['mece', 8.9, 14.3], ...PAR.pista],
            j: [['asiente', 0.6, 3.1], ['toma', 6.2, 8.8], ['mece', 8.9, 14.3], ...PAR.pista]
        },
        gestos: {
            ...MOLDES,
            ...PAR.gestos,
            ofrece: mano,
            toma: mano,
            // Se mecen lento tomados de la mano; el brazo que sostiene cambia de peso
            mece: (u, t) => ({ bDx: -0.75 + Math.sin(t * 2.2) * 0.05, bDz: 0.15 + Math.sin(t * 1.1) * 0.05, cx: 0.05, rz: Math.sin(t * 1.1) * 0.05 })
        },
        yaw: { n: giro, j: giro }
    };
}
