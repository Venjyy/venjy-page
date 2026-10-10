// =========================================================
// VENJY · Supervivencia · Bienvenida de Conejeros: «Orejitas de conejo» (bloque 6c-1, relación 1)
// escena-amistad.js lo carga con import() solo al usarlo (escenas-skin.js: skin de Conejeros cerca del Venjy del Inicio).
// bienvenida(info) devuelve el guion (formato en la cabecera de escena-amistad.js). 'n' = el Venjy del Inicio, 'j' = tú.
// Guion (los tiempos salen de las frases; FL = flash de la foto):
//   Venjy saca el celular y lo levanta para una selfie (`selfie`; el celular va en su mano derecha).
//   Mientras tú hablas te acercas un paso (`orejitasJ`) y le pones orejitas de conejo (dos cajas en la cabeza).
//   FL     flash de la foto (sonido de obturador); Venjy mira el celular (`celular`) mientras le preguntas.
//   Tú dibujas en el aire con el dedo (`traza`) al final: «lo voy a dibujar todo».
// Son personas reales: siempre en buena onda; textos aprobados por el dueño (DISENO-6c.md §2).
// =========================================================
import { t, encadenar, fin, r2, MOLDES } from './comun.js';
import { PIX, SONIDOS } from '../moldes.js';

// Una pausa de 1.3 s antes de la frase 3: el flash y la mirada al celular
export const LINEAS = encadenar([
    ['n', t('¡Conejeros! Bienvenido. ¿Una foto para el recuerdo?', 'Conejeros! Welcome. A photo to remember?')],
    ['j', t('Obvio. Sonríe, que va a quedar épica.', "Of course. Smile, it's going to be epic.")],
    ['n', t('¿Me pusiste orejas de conejo?', 'Did you give me bunny ears?'), 1.3],
    ['j', t('Es mi firma, compadre.', "It's my signature, mate.")],
    ['n', t('Gracias por pasarte. Hay harto que probar con tu skin, disfrútalo.', "Thanks for dropping by. There's lots to try with your skin, enjoy it.")],
    ['j', t('Lo voy a dibujar todo.', "I'm going to draw all of it.")]
]);

const A = i => LINEAS[i].a;
const F = i => LINEAS[i].a + LINEAS[i].d;
const FL = F(1) + 0.1; // flash de la foto, justo después de «Sonríe»

// Te acercas un paso (pz) y pones las orejitas sobre la cabeza de Venjy
const orejitasJ = (u, t, i) => ({ ...MOLDES.orejitas(u, t, i), pz: 0.4 * Math.sin(Math.PI * u) });

const COL_OREJA = '#f4eded';

export function bienvenida() {
    let celular = null, orejas = [], hecho = false;
    const T = r2(fin(LINEAS) + 0.95);
    return {
        T, r: 1.3,
        lineas: LINEAS,
        pista: {
            n: [['habla', 0.3, F(0)], ['selfie', F(0) + 0.1, FL - 0.1], ['celular', FL, F(2) + 0.2], ['habla', A(4), F(4)], ['asiente', F(4) + 0.1, T - 0.2]],
            j: [['orejitasJ', A(1) + 0.2, A(1) + 2.6], ['habla', A(3), F(3)], ['traza', A(5), T - 0.3]]
        },
        gestos: {
            ...MOLDES,
            orejitasJ
        },
        extra: {
            iniciar(api) {
                // Celular en la mano derecha de Venjy (visible solo mientras saca la foto)
                celular = api.pegar(api.caja(0.22, 0.3, 0.04, null, { filas: PIX.celular.filas, colores: PIX.celular.colores }), 'n', 'brazoD', [0, -0.7, 0.12]);
                celular.visible = false;
                // Orejitas de conejo: dos cajas claras sobre la cabeza de Venjy
                for (const x of [-0.14, 0.14]) {
                    const o = api.pegar(api.caja(0.1, 0.34, 0.06, COL_OREJA), 'n', 'cabeza', [x, 0.42, 0]);
                    o.visible = false;
                    orejas.push(o);
                }
            },
            cuadro(api) {
                if (!celular) return;
                const t = api.e.t;
                celular.visible = t >= F(0) + 0.1 && t < F(2) + 0.4;
                for (const o of orejas) o.visible = t >= A(1) + 1.4;
                if (t >= FL && !hecho) {
                    hecho = true;
                    SONIDOS.foto();
                    const a = api.posG('n');
                    api.efecto(PIX.flash, a.x, a.y + 1.6, a.z + 0.3, { tam: 0.9, vida: 0.35 });
                }
                if (t < FL) hecho = false; // irA hacia atrás lo vuelve a permitir
            }
        }
    };
}
