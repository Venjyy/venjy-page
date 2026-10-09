// =========================================================
// VENJY · Supervivencia · Momento especial de Moisés: «Monito de nieve» (bloque 6b-2)
// escena-amistad.js lo carga con import() solo al usarlo (botón «Momento especial» de «Hablar» con la amistad en 100).
// momento(info) devuelve el guion (formato en la cabecera de escena-amistad.js); info.base = clave de la base de tu skin.
// Guion de tiempos (lo programa la skill animaciones-minecraft):
//   Es dentro del iglú, con Lalo (actor extra 'lalo').
//   1.0-7.0 Moisés se agacha y arma bolas de nieve (gesto propio `arma`: inclinado con piernas compensadas, las dos manos abajo juntas haciendo círculos). Aparecen tres cajas blancas apiladas entre él y el jugador, a un costado: base 0.5 en 2.5, medio 0.38 en 4.0, cabeza 0.28 en 5.5 (cada una crece desde 0 con suave); en 6.5 una nariz naranja chica (zanahoria) y dos ojos negros.
//   3.8-6.6 Lalo se ríe (risa) mirando a Moisés; 12.2-15.0 Lalo se toca el sombrero con la mano (gesto propio `sombrero`: brazo derecho arriba con la mano sobre el ala).
//   9.6-12.0 el jugador señala el monito (tu) y luego su cabeza (yo).
//   13.0-15.4 los tres levantan los brazos (brazosArriba). El monito desaparece al terminar.
// Son personas reales: siempre en buena onda; el dueño revisa los textos antes del merge.
// =========================================================
const t = (es, en) => ({ es, en });

// Frases (únicas en todo el juego; las comprueba mundo/tests/amistad.mjs)
export const LINEAS = [
    { q: 'n', a: 0.8, d: 2.8, texto: t("Hermano, en Coyhaique hacíamos monitos de nieve más grandes que nosotros.", "Bro, in Coyhaique we made snowmen bigger than us.") },
    { q: 'lalo', a: 3.8, d: 2.8, texto: t("Ahya, y el Moisés siempre le ponía la nariz chueca.", "Ahya, and Moisés always put the nose on crooked.") },
    { q: 'n', a: 6.8, d: 2.6, texto: t("Esta vez quedó derechita. Es el monito de los tres.", "This time it is nice and straight. It is the snowman of the three of us.") },
    { q: 'j', a: 9.6, d: 2.4, texto: t("Le falta un sombrero, ¿no?", "It needs a hat, right?") },
    { q: 'lalo', a: 12.2, d: 2.8, texto: t("Ahya, que no sea el mío, que ese tiene historia.", "Ahya, just not mine, that one has history.") }
];

export function momento(info = {}) {
    return {
        T: 16, r: 1.6, actores: { lalo: 'lalo' },
        lineas: LINEAS,
        pista: { n: [['habla', 0.8, 3.6]], j: [] },
        gestos: {}
    };
}
