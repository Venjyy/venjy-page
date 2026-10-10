// =========================================================
// VENJY · Supervivencia · Bienvenida de Braulio: «Choque y medio» (bloque 6c-1, relación 2)
// escena-amistad.js lo carga con import() solo al usarlo (escenas-skin.js: skin de Braulio cerca del Venjy del Inicio).
// bienvenida(info) devuelve el guion (formato en la cabecera de escena-amistad.js). 'n' = el Venjy del Inicio, 'j' = tú.
// Guion (r 1.3: las manos derechas se toman y se encuentran en el centro):
//   0.3-PS    Venjy te toma la mano derecha (`toma`) y cuenta con la izquierda (`cuenta`): «uno, dos, tres».
//   a2-a2+1.1 se sorprende con el dedo doble (`asombra`: brazo izquierdo arriba, cabeza atrás).
//   PS-PE     palmada de cinco: la mano se retira y choca al centro (`palma`); dos chispas en H y H+0.3.
//   a4-f5     Venjy pregunta por Arica y tú contestas.
//   Ajustes de tiempos: H = inicio de «Choca esos cinco» + 0.4; PS = H-0.8; PE = H+0.9.
// Son personas reales: siempre en buena onda; textos aprobados por el dueño (DISENO-6c.md §2).
// =========================================================
import { t, encadenar, fin, r2, MOLDES } from './comun.js';
import { ruta } from '../moldes.js';

export const LINEAS = encadenar([
    ['n', t('¡Braulio! A ver esa mano... uno, dos, tres...', "Braulio! Let's see that hand... one, two, three...")],
    ['j', t('Sigue contando, que viene lo bueno.', 'Keep counting, the good part is coming.')],
    ['n', t('¡El dedo doble! Nunca me acostumbro.', "The double finger! I'll never get used to it.")],
    ['j', t('Choca esos cinco. Bueno, esos seis.', 'High five. Well, high six.')],
    ['n', t('Gracias por venir. ¿Y de verdad eres de Arica, tan blanquito?', "Thanks for coming. And you're really from Arica, that pale?")],
    ['j', t('El sol de Arica me respeta, no me quema.', "The Arica sun respects me, it doesn't burn me.")]
]);

const a = i => LINEAS[i].a;
const f = i => LINEAS[i].a + LINEAS[i].d;
const H = r2(a(3) + 0.4);   // palmada
const PS = r2(H - 0.8);     // empieza a retirar la mano
const PE = r2(H + 0.9);     // termina la palmada

// Las dos manos derechas se toman a la altura del pecho y se encuentran al centro (r 1.3: tips a 0.65 cada una)
const toma = () => ({ bDx: -1.05, bDz: 0.5, cx: 0.05 });
// Cuenta con la izquierda (levantada, hacia afuera) mientras sostiene la mano
const cuenta = (u, t) => ({ bDx: -1.05, bDz: 0.5, bIx: -1.6 + Math.sin(t * 9) * 0.1, bIz: 0.3, cx: 0.05 });
// Dedo doble: la izquierda arriba y la cabeza atrás, sin soltar la mano
const asombra = () => ({ bDx: -1.05, bDz: 0.5, bIx: -2.4, bIz: 0.3, cx: -0.35 });
// Palmada: sube la mano, la baja de golpe y choca al centro en u = 0.47 (= H)
const palma = u => ({
    bDx: ruta(u, [[0, -1.05], [0.3, -1.55], [0.47, -1.05], [0.6, -1.05], [1, -0.3]]),
    bDz: ruta(u, [[0, 0.5], [0.3, 0.4], [0.47, 0.5], [0.6, 0.5], [1, 0.2]]),
    cx: 0.05
});

export function bienvenida() {
    const T = r2(fin(LINEAS) + 0.95);
    return {
        T, r: 1.3,
        lineas: LINEAS,
        golpes: [H, r2(H + 0.3)],
        pista: {
            n: [['cuenta', 0.3, a(2)], ['asombra', a(2), r2(a(2) + 1.1)], ['toma', r2(a(2) + 1.1), PS], ['palma', PS, PE], ['habla', a(4), f(4)]],
            j: [['toma', 0.3, PS], ['palma', PS, PE], ['habla', a(5), f(5)]]
        },
        gestos: { ...MOLDES, toma, cuenta, asombra, palma }
    };
}
