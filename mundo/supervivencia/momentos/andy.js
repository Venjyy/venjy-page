// =========================================================
// VENJY · Supervivencia · Momento especial de Andy: «Baile de victoria» (bloque 6b-2)
// escena-amistad.js lo carga con import() solo al usarlo (botón «Momento especial» de «Hablar» con la amistad en 100).
// momento(info) devuelve el guion (formato en la cabecera de escena-amistad.js); info.base = clave de la base de tu skin.
// Guion de tiempos (lo programa la skill animaciones-minecraft):
//   En la fogata (Hadad y Nacho quedan callados).
//   3.6-6.4 Andy muestra un baile propio (gesto `victoria`: un brazo arriba y el otro abajo que se alternan cada 0.4 s, cadera de lado a lado con rz, saltito cada 0.8 s, cabeza que acompaña).
//   6.6-11.0 los dos bailan sincronizados el mismo gesto (que se lea que van a tiempo).
//   11.0-12.2 pose de victoria: los dos con los brazos arriba (brazosArriba) y chispas en 11.2 y 11.6.
//   12.4-14.4 Andy se ríe (risa).
// Son personas reales: siempre en buena onda; el dueño revisa los textos antes del merge.
// =========================================================
const t = (es, en) => ({ es, en });

// Frases (únicas en todo el juego; las comprueba mundo/tests/amistad.mjs)
export const LINEAS = [
    { q: 'n', a: 0.8, d: 2.8, texto: t("Ya, te voy a enseñar el baile que hacemos con el Nacho cuando ganamos.", "Okay, I will teach you the dance Nacho and I do when we win.") },
    { q: 'j', a: 3.8, d: 2.2, texto: t("A ver, muéstrame primero.", "Okay, show me first.") },
    { q: 'n', a: 6.8, d: 2.8, texto: t("Brazo, brazo, saltito... ¡eso! Te sale mejor que al Pony.", "Arm, arm, little hop... yes! You do it better than Pony.") },
    { q: 'n', a: 11.4, d: 3.0, texto: t("¡Top 1, dúo! Esta noche en el Discord no se habla de otra cosa.", "Top 1, duo! Tonight on Discord nobody will talk about anything else.") }
];

export function momento(info = {}) {
    return {
        T: 15, r: 1.6,
        lineas: LINEAS,
        pista: { n: [['habla', 0.8, 3.6]], j: [] },
        gestos: {}
    };
}
