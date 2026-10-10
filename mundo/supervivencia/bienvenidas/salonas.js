// =========================================================
// VENJY · Supervivencia · Bienvenida de Salonas: «Commit en vivo» (bloque 6c-1, relación 3)
// escena-amistad.js lo carga con import() solo al usarlo (escenas-skin.js: skin de Salonas cerca del Venjy del Inicio).
// bienvenida(info) devuelve el guion (formato en la cabecera de escena-amistad.js). 'n' = el Venjy del Inicio, 'j' = tú.
// Guion (r 1.3, distancia de los saludos; teclean en el medio, sin tocarse):
//   0.6-3.0   Venjy te saluda y habla (`habla`); 3.0-8.9 los dos teclean juntos en un teclado imaginario (`teclea`).
//   8.9       «enter»: aparece un visto bueno verde sobre los dos (PIX.visto + SONIDOS.visto).
//   9.0-11.6  tú tocas un bajo de aire (`bajoJ`: brazo izquierdo de mástil, la derecha rasguea; SONIDOS.bajo
//             cada 0.4 s desde 9.2) y Venjy cabecea (`cabecea`).
//   11.8-15.4 Venjy recuerda la primera versión de ProcedimientoSeguro (`recuerda`); tú asientes (`asiente`).
//   15.6-20.2 saludo secreto de 6b (`secreto(15.6)`, golpes incluidos).
//   20.3-24.8 abrazo de 6b (`abrazo(20.3)`); Venjy cierra la despedida durante el abrazo.
// Son personas reales: siempre en buena onda; textos aprobados por el dueño (DISENO-6c.md §2).
// =========================================================
import { t, encadenar, r2, secreto, abrazo, MOLDES } from './comun.js';
import { PIX, SONIDOS } from '../moldes.js';

export const LINEAS = encadenar([
    ['n', t('¡Socio! ¿Vienes a revisar el último commit?', 'Partner! Here to review the latest commit?')],
    ['j', t('Vengo a ver si compila. Con lo tuyo, uno nunca sabe.', "I came to see if it compiles. With your stuff, you never know.")],
    ['n', t('Ya, a la cuenta de tres, enter.', 'Okay, on three, hit enter.')],
    ['j', t('¡Compiló! Esto amerita un solo de bajo.', 'It compiled! This calls for a bass solo.')],
    ['n', t('¿Te acuerdas de la primera versión de ProcedimientoSeguro? Un formulario y puro entusiasmo.', 'Remember the first version of ProcedimientoSeguro? One form and pure enthusiasm.')],
    ['j', t('Y mira dónde llegó. Todavía me da orgullo, socio.', "And look how far it got. I'm still proud of it, partner.")],
    ['n', t('Gracias por venir. Tú pones el bajo y yo el código.', "Thanks for coming. You bring the bass and I'll bring the code.")]
]);

const S0 = 15.6; // saludo secreto
const A0 = 20.3; // abrazo
const VISTO = 8.9; // «enter»
const BAJO = [0, 1, 2, 3, 4, 5].map(k => 9.2 + k * 0.4); // notas del bajo de aire
const sec = secreto(S0), abr = abrazo(A0);

export function bienvenida() {
    return {
        T: r2(A0 + 4.5 + 0.5), r: 1.3,
        lineas: LINEAS,
        golpes: [...sec.golpes],
        pista: {
            n: [['habla', 0.6, 3.0], ['teclea', 3.0, 8.9], ['cabecea', 9.0, 11.6], ['recuerda', 11.8, 15.4], ...sec.pista, ...abr.pista],
            j: [['teclea', 3.0, 8.9], ['bajoJ', 9.0, 11.6], ['asiente', 11.8, 15.4], ...sec.pista, ...abr.pista]
        },
        gestos: {
            ...MOLDES,
            ...sec.gestos,
            ...abr.gestos,
            // Cabeceo al ritmo del bajo (variante de `cabecea` con el tope de cabeza dentro de rango)
            cabecea: (u, t) => { const g = Math.pow(Math.abs(Math.sin(t * Math.PI * 2)), 3); return { cx: 0.05 + g * 0.4, bIx: -1.05, bIz: -0.55, bDx: -0.6 - g * 0.4, bDz: 0.3 }; },
            // Tocar un bajo de aire: brazo izquierdo de lado como mástil, la derecha rasgueando a la altura de la cadera
            bajoJ: (u, t) => ({ bIx: -0.25, bIz: 0.75, bDx: -0.45 + Math.sin(t * 16) * 0.12, bDz: 0.1, cx: 0.1 })
        },
        extra: {
            cuadro(api) {
                const t = api.e.t, h = api.e.hechos;
                // Visto bueno sobre los dos, una sola vez
                if (t >= VISTO && !h.has('visto')) {
                    h.add('visto');
                    const a = api.posG('n'), j = api.posG('j');
                    api.efecto(PIX.visto, (a.x + j.x) / 2, (a.y + j.y) / 2 + 2.3, (a.z + j.z) / 2, { tam: 0.5, vida: 1.6, vy: 0.2 });
                    SONIDOS.visto();
                }
                // Notas del bajo de aire (irA hacia atrás las vuelve a permitir)
                BAJO.forEach((s, k) => {
                    if (t >= s && !h.has('b' + k)) { h.add('b' + k); SONIDOS.bajo(k); }
                    if (t < s) h.delete('b' + k);
                });
                if (t < VISTO) h.delete('visto');
            }
        }
    };
}
