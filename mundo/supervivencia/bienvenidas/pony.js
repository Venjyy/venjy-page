// =========================================================
// VENJY · Supervivencia · Bienvenida de Pony: «Puño bajito» (bloque 6c-1, relación 2)
// escena-amistad.js lo carga con import() solo al usarlo (escenas-skin.js: skin de Pony cerca del Venjy del Inicio).
// bienvenida(info) devuelve el guion (formato en la cabecera de escena-amistad.js). 'n' = el Venjy del Inicio, 'j' = tú.
// Guion (r 1.64: con Venjy inclinado, los puños se juntan a la altura del pecho de Pony):
//   0.3-3.0  Venjy te busca con la mano en la frente, mirando lejos de un lado a otro (`busca`).
//   3.0-5.4  baja la mirada (`miraAbajo`); tú saludas con el brazo en alto: «Estoy aquí abajo».
//   5.6-8.4  Venjy se inclina y estira el puño bajito (`punoBajo`: puños de 6b + cuerpo agachado); choque en 7.4.
//   8.4-10.3 le das un empujoncito al hombro (`empujonLargo`, sonido en 9.1); Venjy se ríe.
//   11.0-14  Venjy señala hacia el muelle y habla; tú lo apuntas: «te culpo a ti».
// Son personas reales: siempre en buena onda; textos aprobados por el dueño (mundo/DIALOGOS.md).
// =========================================================
import { t, encadenar, fin, r2, MOLDES } from './comun.js';
import { desplazar, ruta } from '../moldes.js';

export const LINEAS = encadenar([
    ['n', t('¿Pony? Me dijeron que venías...', 'Pony? They told me you were coming...')],
    ['j', t('Estoy aquí abajo, weón.', "I'm down here, dude.")],
    ['n', t('¡Ahí estás! Puño bajito, para que llegues.', 'There you are! Low fist, so you can reach.')],
    ['j', t('El chico seré yo, pero el weón eres tú.', "I might be the short one, but you're the goof.")],
    ['n', t('Gracias por venir, Pony. El muelle te está esperando.', 'Thanks for coming, Pony. The pier is waiting for you.')],
    ['j', t('Si no pica nada, te culpo a ti.', "If nothing bites, I'm blaming you.")]
]);

const H = 7.4; // choque de puños
const PHI = 0.25; // inclinación de Venjy (piernas compensadas, rig.md)
const puno = desplazar('puno', H - 1.45);

export function bienvenida() {
    let empujado = false;
    const T = r2(fin(LINEAS) + 0.95);
    return {
        T, r: 1.64,
        lineas: LINEAS,
        golpes: [H],
        pista: {
            n: [['busca', 0.3, 3.0], ['miraAbajo', 3.0, 5.4], ['punoBajo', 5.6, 8.4], ['risa', 8.5, 10.9], ['ping', 11.0, 12.6], ['habla', 12.6, 14.0], ['asiente', 14.4, 16.4]],
            j: [['saluda', 3.05, 5.2], ['punoJ', H - 1.0, H + 0.95], ['empujonLargo', 8.4, 10.3], ['tu', 14.15, 16.3]]
        },
        gestos: {
            ...MOLDES,
            // Mano en la frente como visera, mirando lejos de un lado a otro (por encima de tu cabeza)
            busca: (u, x) => ({ bDx: -2.35, bDz: 0.8, bIx: -0.1, cy: Math.sin(x * 1.6) * 0.7, cx: -0.2 }),
            // Baja la mirada hacia ti
            miraAbajo: (u, x) => ({ cx: 0.45, cy: Math.sin(x * 2) * 0.05, bDx: -0.3, bDz: 0.2 }),
            // Se inclina (piernas rectas) y estira el puño bajito; los brazos siguen el choque de 6b
            punoBajo: (u, x, i) => {
                const k = ruta(x, [[5.6, 0], [6.2, 1], [8.0, 1], [8.4, 0]]);
                const p = puno(u, x, i);
                return { inc: PHI * k, pDx: -PHI * k, pIx: -PHI * k, y: 0.75 * (1 - Math.cos(PHI * k)), bDx: p.bDx * (1 + 0.34 * k), bDz: p.bDz, cx: 0.1 + 0.3 * k };
            },
            punoJ: puno,
            // Empujoncito con paso largo (desde 1.64 llega al hombro de Venjy)
            empujonLargo: u => { const k = Math.sin(ruta(u, [[0, 0], [0.2, 0], [0.55, 1], [1, 1]]) * Math.PI); return { bDx: -0.4 - 1.15 * k, bDz: 0.2, inc: 0.14 * k, pz: 0.5 * k, cx: 0.05 }; }
        },
        extra: {
            cuadro(api) {
                if (!empujado && api.e.t >= 9.1 && api.e.t < 9.5) { empujado = true; api.sonidos.golpe(); }
                if (api.e.t < 9.0) empujado = false; // irA hacia atrás lo vuelve a permitir
            }
        }
    };
}
