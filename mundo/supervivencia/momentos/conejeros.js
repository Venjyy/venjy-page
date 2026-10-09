// =========================================================
// VENJY · Supervivencia · Momento especial de Conejeros: «Dibujo .exe» (bloque 6b-2)
// escena-amistad.js lo carga con import() solo al usarlo (botón «Momento especial» de «Hablar» con la amistad en 100).
// momento(info) devuelve el guion (formato en la cabecera de escena-amistad.js); info.base = clave de la base de tu skin.
// Guion de tiempos (lo programa la skill animaciones-minecraft):
//   En el escenario, con Salonas (actor extra 'salonas').
//   1.0-6.0 Conejeros dibuja en el aire con el dedo (gesto propio `dibuja`: brazo derecho estirado al frente que traza un contorno, con bDx/bDz siguiendo una figura; cabeza que sigue la mano).
//   3.0-6.2 entre los dos, a la altura de la cabeza, aparece de a poco un dibujo píxel (api.sprite 16×16 con trazo negro sobre transparente: una cara simple con orejas de conejo; se revela por partes, por ejemplo con 3-4 sprites o cambiando la textura) que flota y se balancea.
//   8.8-11.2 Conejeros se «pega» como un programa colgado (gesto propio `lag`: congelado en una pose rara con un temblor cuadrado, rz y cx que saltan entre 2 valores cada 0.1 s).
//   11.2 el jugador le da un golpecito en el hombro (brazo derecho estirado; golpe en 11.3) y vuelve a la normalidad.
//   14.5-15.6 los dos y Salonas cabecean (cabecea). El dibujo desaparece al terminar.
// Son personas reales: siempre en buena onda; el dueño revisa los textos antes del merge.
// =========================================================
const t = (es, en) => ({ es, en });

// Frases (únicas en todo el juego; las comprueba mundo/tests/amistad.mjs)
export const LINEAS = [
    { q: 'n', a: 0.8, d: 2.6, texto: t("Quédate quieto, que te voy a dibujar. No, no te muevas.", "Stay still, I am going to draw you. No, don't move.") },
    { q: 'j', a: 3.6, d: 2.4, texto: t("¿Y cómo dibujas en el aire?", "And how do you draw in the air?") },
    { q: 'n', a: 6.2, d: 2.4, texto: t("Talento .exe. ¡Listo! Eres tú, pero con orejas de conejo.", "Talent.exe. Done! It's you, but with bunny ears.") },
    { q: 'salonas', a: 8.8, d: 2.6, texto: t("Se le pegó otra vez. Dale un golpecito.", "He froze again. Give him a little tap.") },
    { q: 'n', a: 11.6, d: 2.8, texto: t("Ya volví. Este dibujo va al lado del conejo con lentes, en la galería de tonteras.", "I am back. This drawing goes next to the rabbit with glasses, in the nonsense gallery.") }
];

export function momento(info = {}) {
    return {
        T: 16, r: 1.4, actores: { salonas: 'salonas' },
        lineas: LINEAS,
        pista: { n: [['habla', 0.8, 3.6]], j: [] },
        gestos: {}
    };
}
