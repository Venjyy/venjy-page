// =========================================================
// VENJY · Supervivencia · Bienvenida de Lalo: «Choque de botas» (bloque 6c-1, relación 3)
// escena-amistad.js lo carga con import() solo al usarlo (escenas-skin.js: skin de Lalo cerca del Venjy del Inicio).
// bienvenida(info) devuelve el guion (formato en la cabecera de escena-amistad.js). 'n' = el Venjy del Inicio, 'j' = tú.
// Guion (r 1.3): los dos se frotan las manos y soplan (`frotaM`, `sopla`); saltitos para el frío (`salta`);
//   choque de botas de frente: cada uno patea con la pierna derecha (`botas`: pDx, leve rz) en Hb;
//   saludo secreto (`secreto`, 4.6 s) y abrazo (`abrazo`, 4.5 s); Venjy recuerda con la mano al mentón.
// Son personas reales: siempre en buena onda; textos aprobados por el dueño (mundo/DIALOGOS.md).
// =========================================================
import { t, encadenar, fin, r2, secreto, abrazo, MOLDES } from './comun.js';
import { ruta } from '../moldes.js';

// Primeras cuatro frases (encadenadas desde 0.6); el saludo secreto empieza en la cuarta (la de «Ahya, nadie...»)
const A = encadenar([
    ['n', t('¡Lalo! ¿Y el Moisés? Pensé que no salías sin él.', 'Lalo! Where\'s Moisés? I thought you never went out without him.')],
    ['j', t('Ahya, el Moisés cuida el iglú. Yo vine a verte, hermano.', 'Ahya, Moisés is minding the igloo. I came to see you, bro.')],
    ['n', t('Como en Coyhaique: saltitos para el frío y choque de botas.', 'Like in Coyhaique: little hops for the cold and a boot bump.')],
    ['j', t('Ahya, nadie más entiende este saludo.', 'Ahya, nobody else gets this greeting.')]
]);
const S0 = r2(A[3].a + 0.3);   // saludo secreto
const A0 = r2(S0 + 4.7);       // abrazo (después del secreto de 4.6 s)
// Recuerdo de Venjy a mitad del abrazo (como en el reencuentro largo); luego las dos frases de cierre
const R = encadenar([
    ['n', t('Nieve hasta las rodillas, y nosotros felices.', 'Snow up to our knees, and we were happy.')],
    ['j', t('Éramos cabros chicos y creíamos que el frío no existía.', "We were just kids and thought cold didn't exist.")],
    ['n', t('Gracias por venir, hermano. En el iglú te espera otro Lalo, con sombrero y todo.', 'Thanks for coming, bro. Another Lalo is waiting in the igloo, hat and all.')]
], r2(A0 + 2.0));

export const LINEAS = [...A, ...R];

const a = i => LINEAS[i].a;
const f = i => LINEAS[i].a + LINEAS[i].d;
const HB = r2(a(2) + 2.4);  // choque de botas (en «choque de botas»)
const sec = secreto(S0);
const ab = abrazo(A0);

const frotaM = (u, t) => ({ bDx: -1.0 + Math.sin(t * 14) * 0.06, bDz: 0.6, bIx: -1.0 - Math.sin(t * 14) * 0.06, bIz: -0.6, cx: 0.2 });
const sopla = (u, t) => ({ bDx: -1.8, bDz: 0.5, bIx: -1.8, bIz: -0.5, cx: 0.25 + Math.sin(t * 6) * 0.03 });
// Saltitos: dos botes en 1.5 s (|sin| da dos picos en u = 0.25 y 0.75)
const salta = u => ({ bDx: -0.15, bDz: 0.1, bIx: -0.15, bIz: -0.1, salto: 0.28 * Math.abs(Math.sin(u * Math.PI * 2)) });
// Pierna derecha al frente: la punta de la bota llega a 0.65 de cada uno en u = 0.47 (= HB)
const botas = u => ({
    pDx: ruta(u, [[0, 0], [0.3, -1.3], [0.47, -1.0], [0.6, -1.0], [1, 0]]),
    bDx: -0.3, bDz: 0.2, bIx: -0.3, bIz: -0.2,
    rz: ruta(u, [[0, 0], [0.3, -0.08], [0.6, -0.08], [1, 0]]),
    cx: 0.05
});

export function bienvenida() {
    const T = r2(fin(LINEAS) + 0.95);
    let botasHecho = false;
    return {
        T, r: 1.3,
        lineas: LINEAS,
        pista: {
            n: [
                ['frotaM', 0.3, 2.6], ['sopla', 2.6, 4.4], ['salta', r2(a(2) + 0.1), r2(a(2) + 1.6)], ['botas', r2(HB - 0.8), r2(HB + 0.9)],
                ...sec.pista, ...ab.pista,
                ['recuerda', r2(A0 + 4.5), r2(f(4) + 0.1)], ['asiente', r2(f(4) + 0.1), f(5)], ['habla', a(6), f(6)]
            ],
            j: [
                ['frotaM', 0.3, 2.6], ['sopla', 2.6, 4.4], ['salta', r2(a(2) + 0.1), r2(a(2) + 1.6)], ['botas', r2(HB - 0.8), r2(HB + 0.9)],
                ...sec.pista, ...ab.pista,
                ['habla', a(5), f(5)]
            ]
        },
        gestos: { ...MOLDES, ...sec.gestos, ...ab.gestos, frotaM, sopla, salta, botas },
        golpes: sec.golpes,
        extra: {
            // Las botas se tocan: un golpe de sonido (sin chispa: no es entre las manos)
            cuadro(api) {
                if (!botasHecho && api.e.t >= HB) { botasHecho = true; api.sonidos.golpe(); }
                if (api.e.t < HB - 0.5) botasHecho = false; // irA hacia atrás lo vuelve a permitir
            }
        }
    };
}
