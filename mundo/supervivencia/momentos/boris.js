// =========================================================
// VENJY · Supervivencia · Momento especial de Boris: «Pentakill» (bloque 6b-2)
// escena-amistad.js lo carga con import() solo al usarlo (botón «Momento especial» de «Hablar» con la amistad en 100).
// momento(info) devuelve el guion (formato en la cabecera de escena-amistad.js); info.base = clave de la base de tu skin.
// Guion de tiempos (lo programa la skill animaciones-minecraft):
//   1.0-3.6 Boris da un hachazo grande (ya lleva su hacha; usa el gesto `hachazo` de escenas-skin.js o uno propio más amplio) sobre un tronco que aparece entre los dos a un costado (api.caja 0.5×0.6×0.5 con textura de madera); en 3.0 el tronco se parte en dos mitades que se separan y caen (golpe en 3.0).
//   3.8-6.4 el jugador aplaude (gesto propio `aplaude`: manos juntas al frente que chocan rápido).
//   9.2-12.8 los dos «juegan LoL»: gesto propio `juega` (brazo izquierdo al frente bajo tecleando rápido, derecho al costado moviendo el mouse con círculos chicos; cabeza un poco abajo); chispas chicas cada ~0.8 s entre los dos.
//   12.8-15.6 Boris celebra con los brazos arriba (brazosArriba) y el jugador también (13.0-14.6). Las mitades del tronco desaparecen al terminar.
// Son personas reales: siempre en buena onda; el dueño revisa los textos antes del merge.
// =========================================================
const t = (es, en) => ({ es, en });

// Frases (únicas en todo el juego; las comprueba mundo/tests/amistad.mjs)
export const LINEAS = [
    { q: 'n', a: 0.8, d: 2.6, texto: t("Mira esto: un solo hachazo y el tronco se parte en dos.", "Watch this: one swing and the log splits in two.") },
    { q: 'j', a: 3.8, d: 2.6, texto: t("¡Uf! Eso fue limpio.", "Whoa! That was clean.") },
    { q: 'n', a: 6.6, d: 2.6, texto: t("Ahora lo importante: una partida de LoL, tú y yo, como en mi pieza.", "Now the important part: a round of LoL, you and me, like in my room.") },
    { q: 'n', a: 12.8, d: 2.8, texto: t("¡Pentakill! Esa va directo al grupo, para que la vean todos.", "Pentakill! That one goes straight to the group chat, for everyone to see.") }
];

export function momento(info = {}) {
    return {
        T: 16, r: 1.6,
        lineas: LINEAS,
        pista: { n: [['habla', 0.8, 3.6]], j: [] },
        gestos: {}
    };
}
