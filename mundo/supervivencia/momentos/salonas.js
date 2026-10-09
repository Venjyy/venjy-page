// =========================================================
// VENJY · Supervivencia · Momento especial de Salonas: «Solo de bajo» (bloque 6b-2)
// escena-amistad.js lo carga con import() solo al usarlo (botón «Momento especial» de «Hablar» con la amistad en 100).
// momento(info) devuelve el guion (formato en la cabecera de escena-amistad.js); info.base = clave de la base de tu skin.
// Guion de tiempos (lo programa la skill animaciones-minecraft):
//   En el escenario, con Conejeros (actor extra 'conejeros'). Salonas ya tiene su bajo (salonas.instrumento): no lo toques, solo mueve los brazos.
//   3.6-10.5 Salonas toca un solo (gesto propio `solo`: mano derecha rasgueando rápido a la altura de la cadera, izquierda al costado moviéndose por el mástil, cabeza que cabecea, torso que se balancea).
//   Notas musicales (api.sprite con una corchea píxel negra/blanca) que suben desde Salonas cada ~0.5 s entre 3.6 y 10.5.
//   4.0-10.5 el jugador y Conejeros cabecean (cabecea de escenas-skin.js).
//   10.6 los tres saltan juntos (salto) con chispa (golpe en 10.8). 11.0-13.8 Salonas hace la pose rockera (brazo derecho arriba, cuernos).
// Son personas reales: siempre en buena onda; el dueño revisa los textos antes del merge.
// =========================================================
const t = (es, en) => ({ es, en });

// Frases (únicas en todo el juego; las comprueba mundo/tests/amistad.mjs)
export const LINEAS = [
    { q: 'n', a: 0.8, d: 2.6, texto: t("Compadre, compuse un solo nuevo. Eres el primero en escucharlo.", "Mate, I wrote a new solo. You are the first to hear it.") },
    { q: 'conejeros', a: 3.6, d: 2.6, texto: t("¡Eso, Salonas! ¡Más fuerte!", "Yes, Salonas! Louder!") },
    { q: 'j', a: 6.6, d: 2.8, texto: t("¡Esto tiene que salir en un disco!", "This has to be on an album!") },
    { q: 'n', a: 10.8, d: 3.0, texto: t("Entonces el disco lleva tu nombre en la portada, dibujado por el Conejeros.", "Then the album has your name on the cover, drawn by Conejeros.") },
    { q: 'conejeros', a: 13.9, d: 2.0, texto: t("Ya lo estoy imaginando: tú con lentes de sol y un conejo.", "I can already picture it: you in sunglasses and a rabbit.") }
];

export function momento(info = {}) {
    return {
        T: 16, r: 1.7, actores: { conejeros: 'conejeros' },
        lineas: LINEAS,
        pista: { n: [['habla', 0.8, 3.6]], j: [] },
        gestos: {}
    };
}
