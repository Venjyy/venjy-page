// =========================================================
// VENJY · Supervivencia · Bienvenida de Hadad: «Papas para el camino» (bloque 6c-1, relación 1)
// escena-amistad.js lo carga con import() solo al usarlo (escenas-skin.js: skin de Hadad cerca del Venjy del Inicio).
// bienvenida(info) devuelve el guion (formato en la cabecera de escena-amistad.js). 'n' = el Venjy del Inicio, 'j' = tú.
// Guion (los tiempos salen de las frases; P = pase de la bolsa, en la frase 3 de Venjy):
//   Venjy saluda, asiente mientras hablas y saca una bolsa de papas en la mano derecha (`pasa` al pasarla).
//   P      la bolsa pasa a tu mano izquierda (`recibe` antes, con el brazo al frente).
//   P+1.0  levantas la bolsa a la altura de la cara con pulgar arriba (pose de comercial); visto bueno.
// Son personas reales: siempre en buena onda; textos aprobados por el dueño (mundo/DIALOGOS.md).
// =========================================================
import { t, encadenar, fin, r2, MOLDES } from './comun.js';
import { PIX, SONIDOS } from '../moldes.js';

export const LINEAS = encadenar([
    ['n', t('¡Hadad! Qué bueno que te pasaste por el mundo.', 'Hadad! So glad you dropped by the world.')],
    ['j', t('Me dijeron que había fogata y nada de Fortnite, así que vine a ver.', 'They told me there was a campfire and no Fortnite, so I came to see.')],
    ['n', t('Toma, para el camino. De tu marca, obvio.', 'Here, for the road. Your brand, obviously.')],
    ['j', t('Auspiciado por mí mismo.', 'Sponsored by myself.')],
    ['n', t('Gracias por venir. Prueba todo con tu skin, hay harto que descubrir.', "Thanks for coming. Try everything with your skin, there's lots to discover.")],
    ['j', t('Trato hecho. Parto por la fogata.', "Deal. I'll start with the campfire.")]
]);

const A = i => LINEAS[i].a;
const F = i => LINEAS[i].a + LINEAS[i].d;
const P = A(2) + 0.6; // momento del pase

const BOLSA = { filas: PIX.bolsa.filas, colores: PIX.bolsa.colores };

export function bienvenida() {
    let bolsaN = null, bolsaJ = null;
    const T = r2(fin(LINEAS) + 0.95);
    return {
        T, r: 1.6,
        lineas: LINEAS,
        pista: {
            n: [['saluda', 0.3, F(0)], ['asiente', F(0) + 0.1, P - 0.7], ['pasa', P - 0.6, P + 0.5], ['asiente', P + 0.6, T - 0.3]],
            j: [['habla', A(1), F(1)], ['recibe', P - 0.5, P + 0.9], ['pulgar', P + 1.0, T - 0.3]]
        },
        gestos: {
            ...MOLDES,
            // Recibe la bolsa: brazo izquierdo estirado al frente
            recibe: () => ({ bIx: -1.35, bIz: -0.1, cx: 0.1 }),
            // Pulgar arriba: la bolsa a la altura de la cara con el brazo izquierdo; el derecho doblado
            pulgar: (u, t) => ({ bIx: -1.6 + Math.sin(t * 6) * 0.04, bIz: -0.2, bDx: -0.5, bDz: 0.35, cy: 0.2 })
        },
        extra: {
            iniciar(api) {
                bolsaN = api.pegar(api.caja(0.32, 0.42, 0.12, null, BOLSA), 'n', 'brazoD', [0, -0.7, 0.12]);
                bolsaJ = api.pegar(api.caja(0.32, 0.42, 0.12, null, BOLSA), 'j', 'brazoI', [0, -0.7, 0.12]);
                bolsaN.visible = false;
                bolsaJ.visible = false;
            },
            cuadro(api) {
                if (!bolsaN) return;
                const t = api.e.t;
                bolsaN.visible = t >= P - 0.6 && t < P + 0.3;
                bolsaJ.visible = t >= P + 0.3;
                if (t >= P + 1.0 && !api.e.hechos.has('visto')) {
                    api.e.hechos.add('visto');
                    SONIDOS.visto();
                    const a = api.posG('j');
                    api.efecto(PIX.visto, a.x + 0.5, a.y + 1.9, a.z, { tam: 0.3, vida: 1.0 });
                }
            }
        }
    };
}
