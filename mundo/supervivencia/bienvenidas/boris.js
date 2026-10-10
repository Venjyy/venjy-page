// =========================================================
// VENJY · Supervivencia · Bienvenida de Boris: «De copiloto a Linares» (bloque 6c-1, relación 3)
// escena-amistad.js lo carga con import() solo al usarlo (escenas-skin.js: skin de Boris cerca del Venjy del Inicio).
// bienvenida(info) devuelve el guion (formato en la cabecera de escena-amistad.js). 'n' = el Venjy del Inicio, 'j' = tú.
// Guion (r 1.3, todo el rato): Venjy te busca el auto (`busca`); te subes (tú al volante, `maneja`; Venjy de
//   copiloto con el brazo derecho afuera, `ventana` en espejo) y los dos miran adelante (`yaw` ±π/2, lado a lado).
//   B = bache en «¡Cuidado con el bache!»: los dos rebotan (`manejaB` / `ventanaB`, salto 0.3) y suena el golpe.
//   Llegan: se bajan (los yaw vuelven a mirarse) y empieza el saludo secreto (`secreto`, 4.6 s) en la frase
//   «Llegamos»; luego el abrazo (`abrazo`, 4.5 s). Venjy recuerda con la mano al mentón (`recuerda`).
//   Tiempos: ver las frases en LINEAS (a = inicio, d = duración). Textos aprobados (DISENO-6c.md §2).
// Son personas reales: siempre en buena onda.
// =========================================================
import { t, encadenar, fin, r2, secreto, abrazo, MOLDES } from './comun.js';
import { espejo } from '../moldes.js';

const suave = u => u * u * (3 - 2 * u);
const tramo = (u, a, b) => Math.max(0, Math.min(1, (u - a) / (b - a)));

// Primeras cuatro frases (encadenadas desde 0.6); el saludo secreto empieza en la cuarta («Llegamos»)
const A = encadenar([
    ['n', t('¡Boris! ¿Y el auto? Pensé que venías a buscarme.', "Boris! Where's the car? I thought you came to pick me up.")],
    ['j', t('Súbete, que este auto no necesita calles.', "Get in, this car doesn't need roads.")],
    ['n', t('¡Cuidado con el bache! Igual que llegando a Linares.', 'Watch the pothole! Just like driving into Linares.')],
    ['j', t('Llegamos. Te extrañaba, compadre.', "We're here. I missed you, mate.")]
]);
const S0 = r2(A[3].a + 0.3);   // saludo secreto
const A0 = r2(S0 + 4.7);       // abrazo (después del secreto de 4.6 s)
// Recuerdo de Venjy a mitad del abrazo, como en el reencuentro largo; luego su frase de cierre
const R = encadenar([
    ['n', t('¿Te acuerdas de la última en tu PC? Perdimos por el jungla.', 'Remember the last game on your PC? We lost because of the jungler.')],
    ['j', t('Perdimos por ti. Pero ya, te perdono.', 'We lost because of you. But fine, I forgive you.')],
    ['n', t('Gracias por venir. Próxima vez en Linares: unas chelitas y revancha.', 'Thanks for coming. Next time in Linares: a couple of beers and a rematch.')]
], r2(A0 + 2.0));

export const LINEAS = [...A, ...R];

const a = i => LINEAS[i].a;
const f = i => LINEAS[i].a + LINEAS[i].d;
const B = r2(a(2) + 0.3);      // bache
const sec = secreto(S0);
const ab = abrazo(A0);
const copiloto = espejo('ventana'); // Venjy va a la derecha de tu auto: su brazo afuera es el derecho
// Lado a lado: miran los dos hacia adelante mientras van en el auto; se miran otra vez al bajarse
const enCoche = t => suave(tramo(t, a(1), a(1) + 0.9)) * (1 - suave(tramo(t, a(3) - 0.2, a(3) + 0.5)));
const busca = (u, t) => ({ bDx: -2.35, bDz: 0.8, bIx: -0.1, cy: Math.sin(t * 1.6) * 0.7, cx: -0.2 });
const manejaB = (u, t, i) => ({ ...MOLDES.maneja(u, t, i), salto: Math.max(0, 0.3 * Math.sin(Math.PI * u)) });
const ventanaB = (u, t, i) => ({ ...copiloto(u, t, i), salto: Math.max(0, 0.3 * Math.sin(Math.PI * u)) });

export function bienvenida() {
    const T = r2(fin(LINEAS) + 0.95);
    let golpeHecho = false;
    return {
        T, r: 1.3,
        lineas: LINEAS,
        pista: {
            n: [
                ['busca', 0.3, a(1)], ['ventana', a(1), r2(B - 0.3)], ['ventanaB', r2(B - 0.3), r2(B + 0.9)], ['ventana', r2(B + 0.9), a(3)],
                ...sec.pista, ...ab.pista,
                ['recuerda', r2(A0 + 4.5), r2(f(4) + 0.1)], ['asiente', r2(f(4) + 0.1), f(5)], ['habla', a(6), f(6)]
            ],
            j: [
                ['maneja', a(1), r2(B - 0.3)], ['manejaB', r2(B - 0.3), r2(B + 0.9)], ['maneja', r2(B + 0.9), a(3)],
                ...sec.pista, ...ab.pista,
                ['habla', a(5), f(5)]
            ]
        },
        yaw: { n: t => -(Math.PI / 2) * enCoche(t), j: t => (Math.PI / 2) * enCoche(t) },
        gestos: { ...MOLDES, ...sec.gestos, ...ab.gestos, busca, manejaB, ventanaB },
        golpes: sec.golpes,
        extra: {
            // El bache: un golpe de sonido en el rebote
            cuadro(api) {
                if (!golpeHecho && api.e.t >= B) { golpeHecho = true; api.sonidos.golpe(); }
                if (api.e.t < B - 0.5) golpeHecho = false; // irA hacia atrás lo vuelve a permitir
            }
        }
    };
}
