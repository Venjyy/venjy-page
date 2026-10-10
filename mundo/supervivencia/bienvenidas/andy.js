// =========================================================
// VENJY · Supervivencia · Bienvenida de Andy: «El baile mal hecho» (bloque 6c-1, relación 1)
// escena-amistad.js lo carga con import() solo al usarlo (escenas-skin.js: skin de Andy cerca del Venjy del Inicio).
// bienvenida(info) devuelve el guion (formato en la cabecera de escena-amistad.js). 'n' = el Venjy del Inicio, 'j' = tú.
// Guion (los tiempos salen de las frases; B = cuando Venjy se suma al baile):
//   Venjy intenta el baile de victoria, pero desfasado y chueco (`baileMal`).
//   Tú te ríes de su baile (`risa`) y le señalas (`tu`): «eso no es mi baile».
//   Venjy se rasca la cabeza, asiente y tú le enseñas bailando (`baile` desde la frase 4).
//   Venjy se suma al mismo reloj de escena: quedan sincronizados. Al final, los dos brazos arriba.
// Son personas reales: siempre en buena onda; textos aprobados por el dueño (mundo/DIALOGOS.md).
// =========================================================
import { t, encadenar, fin, r2, MOLDES } from './comun.js';
import { SONIDOS } from '../moldes.js';

export const LINEAS = encadenar([
    ['n', t('¡Andy! Bienvenido. Mira, practiqué tu baile.', 'Andy! Welcome. Look, I practiced your dance.')],
    ['j', t('Eso no es mi baile. Eso es un calambre.', "That's not my dance. That's a cramp.")],
    ['n', t('Ya, enséñame bien.', 'Okay, teach me properly.')],
    ['j', t('Brazo, brazo, y la cadera. ¡Eso!', "Arm, arm, and the hips. That's it!")],
    ['n', t('Gracias por pasarte. Con tu skin hay cosas que yo ni he probado.', "Thanks for dropping by. With your skin there are things I haven't even tried.")],
    ['j', t('Entonces aquí también voy a ganar.', "Then I'm going to win here too.")]
]);

const A = i => LINEAS[i].a;
const F = i => LINEAS[i].a + LINEAS[i].d;
const B = A(3) + 0.5; // Venjy se suma al baile (el reloj es de la escena: quedan sincronizados)

export function bienvenida() {
    let sonado = false;
    const T = r2(fin(LINEAS) + 0.95);
    return {
        T, r: 1.5,
        lineas: LINEAS,
        pista: {
            n: [['baileMal', 0.3, A(1) - 0.05], ['rasca', A(1), F(1) + 0.1], ['asiente', F(1) + 0.2, B - 0.1], ['baile', B, A(5) - 0.1], ['brazosArriba', A(5), T - 0.2]],
            j: [['risa', A(1), F(1)], ['tu', F(1) + 0.1, A(3) - 0.1], ['baile', A(3), A(5) - 0.1], ['brazosArriba', A(5), T - 0.2]]
        },
        gestos: {
            ...MOLDES,
            // Baile de victoria desfasado: brazos a destiempo y el cuerpo se ladea de más
            baileMal: (u, t) => ({ bDx: -2.2 + Math.sin(t * 7) * 0.5, bDz: 0.2, bIx: -1.4 + Math.sin(t * 5.3 + 1) * 0.6, bIz: -0.3, rz: Math.sin(t * 3) * 0.12, cx: -0.1, cy: Math.sin(t * 2.1) * 0.2 })
        },
        extra: {
            cuadro(api) {
                if (!sonado && api.e.t >= B && api.e.t < B + 0.3) { sonado = true; SONIDOS.bajo(0); }
                if (api.e.t < B) sonado = false; // irA hacia atrás lo vuelve a permitir
            }
        }
    };
}
