// =========================================================
// VENJY · Supervivencia · Momento especial de Lalo: «El sombrero» (bloque 6b-2)
// escena-amistad.js lo carga con import() solo al usarlo (botón «Momento especial» de «Hablar» con la amistad en 100).
// momento(info) devuelve el guion (formato en la cabecera de escena-amistad.js); info.base = clave de la base de tu skin.
// Guion de tiempos (lo programa la skill animaciones-minecraft):
//   Es dentro del iglú, con Moisés (actor extra 'moises').
//   El sombrero de paja de Lalo son 3 mallas hijas de su `cuello` (ala en y 0.5, copa en y 0.62, cinta en y 0.56; ver pieles.js, tipo 'paja'). Usa api.prestar para moverlas y que vuelvan solas al terminar (búscalas entre los hijos de api.actor('n').p.cuello con position.y entre 0.45 y 0.7).
//   4.5-6.0 Lalo se saca el sombrero con la mano derecha (las 3 mallas pasan a un grupo pegado a su brazoD); 6.0-7.6 se lo pone al jugador (el grupo pasa al cuello del jugador, a la misma altura que lo llevaba Lalo).
//   3.8-6.4 Moisés lo mira con los brazos cruzados (gesto propio `cruza`).
//   9.8-12.0 el jugador se toca el ala con las dos manos (gesto propio `ala`).
//   12.2-15.2 Lalo y el jugador hacen la pose «ahya»: brazos cruzados y cabeceo lento; Moisés asiente.
//   14.6-15.6 Lalo recupera el sombrero (vuelve a su cabeza antes del final).
// Son personas reales: siempre en buena onda; el dueño revisa los textos antes del merge.
// =========================================================
const t = (es, en) => ({ es, en });

// Frases (únicas en todo el juego; las comprueba mundo/tests/amistad.mjs)
export const LINEAS = [
    { q: 'n', a: 0.8, d: 2.8, texto: t("Ahya, este sombrero me acompaña desde Coyhaique. Nunca se lo presto a nadie.", "Ahya, this hat has been with me since Coyhaique. I never lend it to anyone.") },
    { q: 'moises', a: 3.8, d: 2.6, texto: t("¿Nunca? A mí no me lo has pasado ni una vez.", "Never? You haven't passed it to me even once.") },
    { q: 'n', a: 7.0, d: 2.6, texto: t("Por eso mismo. Hoy te lo pongo a ti, hermano.", "Exactly. Today I am putting it on you, bro.") },
    { q: 'j', a: 9.8, d: 2.2, texto: t("¿En serio? Me queda gigante.", "Seriously? It is huge on me.") },
    { q: 'n', a: 12.2, d: 3.0, texto: t("Ahya, te queda perfecto. Ahora eres parte del iglú para siempre.", "Ahya, it fits you perfectly. Now you are part of the igloo forever.") }
];

export function momento(info = {}) {
    return {
        T: 16, r: 1.2, actores: { moises: 'moises' },
        lineas: LINEAS,
        pista: { n: [['habla', 0.8, 3.6]], j: [] },
        gestos: {}
    };
}
