// =========================================================
// VENJY · Supervivencia · Momento especial de Pony: «La pesca del siglo» (bloque 6b-2)
// escena-amistad.js lo carga con import() solo al usarlo (botón «Momento especial» de «Hablar» con la amistad en 100).
// momento(info) devuelve el guion (formato en la cabecera de escena-amistad.js); info.base = clave de la base de tu skin.
// Guion de tiempos (lo programa la skill animaciones-minecraft):
//   0.6-6.5 Pony tira de la caña con fuerza (gesto propio `tira`: torso hacia atrás (inc negativo leve), brazos adelante-arriba tirando, saltitos chicos, temblor); su caña ya la tiene en la mano.
//   2.5-6.5 el jugador lo ayuda: brazos adelante como agarrando la caña y tirando hacia atrás al mismo ritmo.
//   6.5 sale del agua un salmón gigante (api.caja larga ~1.6 de largo, rosado/rojo con franjas, cola y aleta) que vuela en arco hasta los brazos de Pony (6.5-7.5), con chispa en 6.5. Pony lo abraza de lado 7.5-13.8.
//   10.8-13.8 Pony se para de puntillas (y +0.12 con salto chico) para verse más alto que el pez.
//   14.0-15.5 chocan los cinco (golpe en 14.6). El pez desaparece al terminar.
// Son personas reales: siempre en buena onda; el dueño revisa los textos antes del merge.
// =========================================================
const t = (es, en) => ({ es, en });

// Frases (únicas en todo el juego; las comprueba mundo/tests/amistad.mjs)
export const LINEAS = [
    { q: 'n', a: 0.6, d: 2.6, texto: t("¡Picó! ¡Picó! ¡Ayúdame, que este es más grande que yo!", "It bit! It bit! Help me, this one is bigger than me!") },
    { q: 'j', a: 3.4, d: 2.4, texto: t("¡Tira, Pony, tira!", "Pull, Pony, pull!") },
    { q: 'n', a: 7.6, d: 3.0, texto: t("Ya, lo admito: este salmón me ganó en altura. Por poquito.", "Okay, I admit it: this salmon beat me in height. Barely.") },
    { q: 'n', a: 10.8, d: 3.0, texto: t("Pero el récord es de los dos. Lo pongo en el muelle con tu nombre al lado del mío.", "But the record belongs to both of us. I will put it on the dock with your name next to mine.") }
];

export function momento(info = {}) {
    return {
        T: 16, r: 1.4,
        lineas: LINEAS,
        pista: { n: [['habla', 0.8, 3.6]], j: [] },
        gestos: {}
    };
}
