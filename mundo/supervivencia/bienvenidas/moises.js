// =========================================================
// VENJY · Supervivencia · Bienvenida de Moisés: «Frío de Coyhaique» (bloque 6c-1, relación 2)
// escena-amistad.js lo carga con import() solo al usarlo (escenas-skin.js: skin de Moisés cerca del Venjy del Inicio).
// bienvenida(info) devuelve el guion (formato en la cabecera de escena-amistad.js). 'n' = el Venjy del Inicio, 'j' = tú.
// Guion (r 1.3: tú das un paso con `pz` para llegar a los hombros con la frota y después al puño de frente):
//   0.3-2.6  Venjy tirita con los brazos cruzados (`tirita`) mientras habla del viento.
//   2.6-H-1  Venjy se queda quieto y tiembla (`tiembla`); tú le frotas los hombros (`frotaJ`, un paso adelante).
//   H-1.0 a H+0.95  chocan puños de frente (`punoM`); chispa y sonido en H.
//   H+0.95-  Venjy habla del iglú; tú contestas. Textos aprobados por el dueño (DISENO-6c.md §2).
// Son personas reales: siempre en buena onda.
// =========================================================
import { t, encadenar, fin, r2, MOLDES } from './comun.js';
import { desplazar } from '../moldes.js';

export const LINEAS = encadenar([
    ['n', t('¡Moisés! ¿Sentiste ese viento? Me acordé de Coyhaique.', "Moisés! Did you feel that wind? It reminded me of Coyhaique.")],
    ['j', t('Esto no es frío, hermano. Frío era a los trece.', "This isn't cold, bro. Cold was when we were thirteen.")],
    ['n', t('Tienes razón. Igual frótame un poco.', "You're right. Rub my arms a bit anyway.")],
    ['j', t('Ya, ya, sobreviviste.', 'There, there, you survived.')],
    ['n', t('Gracias por venir. Pásate por el iglú: hay un Moisés igualito a ti.', "Thanks for coming. Drop by the igloo: there's a Moisés just like you.")],
    ['j', t('¿Otro yo? Eso tengo que verlo.', 'Another me? I have to see that.')]
]);

const a = i => LINEAS[i].a;
const f = i => LINEAS[i].a + LINEAS[i].d;
const H = r2(f(3) + 0.3); // choque de puños
const tiembla = (u, t) => ({ cz: Math.sin(t * 23) * 0.05, rz: Math.sin(t * 31) * 0.03, cx: 0.15, bDz: 0.05, bIz: -0.05 });
// Frota los hombros del otro: el molde de 6c, con un paso adelante para llegar a ~0.9 de Venjy
const frotaJ = (u, t, i) => ({ ...MOLDES.frota(u, t, i), pz: 0.4 });
const punoM = desplazar('puno', H - 1.45);

export function bienvenida() {
    const T = r2(fin(LINEAS) + 0.95);
    return {
        T, r: 1.3,
        lineas: LINEAS,
        golpes: [H],
        pista: {
            n: [['tirita', 0.3, a(2)], ['tiembla', a(2), r2(H - 1.0)], ['punoM', r2(H - 1.0), r2(H + 0.95)], ['habla', r2(H + 0.95), f(4)]],
            j: [['habla', a(1), f(1)], ['frotaJ', r2(a(2) + 0.4), r2(H - 1.0)], ['punoM', r2(H - 1.0), r2(H + 0.95)], ['habla', a(5), f(5)]]
        },
        gestos: { ...MOLDES, tiembla, frotaJ, punoM }
    };
}
