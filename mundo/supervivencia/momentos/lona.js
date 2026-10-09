// =========================================================
// VENJY · Supervivencia · Momento especial de Lona: «La bufanda» (bloque 6b-2)
// escena-amistad.js lo carga con import() solo al usarlo (botón «Momento especial» de «Hablar» con la amistad en 100).
// momento(info) devuelve el guion (formato en la cabecera de escena-amistad.js); info.base = clave de la base de tu skin.
// Guion de tiempos (lo programa la skill animaciones-minecraft):
//   Normal: 1.0-7.0 Lona teje (gesto propio `teje`: manos juntas al frente a la altura del pecho, dos agujas (cajas finas grises) que se cruzan rápido); una bufanda (caja 0.12×0.05×(crece de 0 a 0.9), franjas rojas y blancas con filas píxel) cuelga de sus manos y crece.
//   7.0-8.0 se la pone al jugador alrededor del cuello (pasa a un grupo pegado al `cuerpo` del jugador a la altura del cuello: una caja que rodea 0.56×0.12×0.32 en y 1.45 y una punta que cuelga adelante).
//   7.6-10.4 el jugador toca la bufanda con las dos manos (gesto propio `toca`).
//   13.8-15.6 abrazo corto (como `abrazo` de escena-amistad-datos.js).
//   Pareja (skin de Venjy, info.base === 'venjy'): 0.8-6.6 el jugador se tapa los ojos (gesto `ojos` de escenas-skin.js) mientras Lona teje rápido; 6.8 se la pone; 9.4-12.0 el jugador la toca; 12.2-15.4 abrazo largo con beso en la mejilla y corazones en 12.6, 13.6 y 14.6.
// Son personas reales: siempre en buena onda; el dueño revisa los textos antes del merge.
// =========================================================
const t = (es, en) => ({ es, en });

// Frases (únicas en todo el juego; las comprueba mundo/tests/amistad.mjs)
export const LINEAS = [
    { q: 'n', a: 0.8, d: 2.8, texto: t("Espera un poquito, que te estoy tejiendo algo hace días.", "Wait a little, I've been knitting you something for days.") },
    { q: 'n', a: 4.0, d: 2.8, texto: t("Mila se robó el ovillo dos veces, pero lo recuperé.", "Mila stole the ball of yarn twice, but I got it back.") },
    { q: 'j', a: 7.6, d: 2.8, texto: t("¡Está calentita! ¿La hiciste tú?", "It's so warm! Did you make it?") },
    { q: 'n', a: 10.6, d: 3.0, texto: t("Sí. A Venjy le tejí una igual, porque es mi novio, pero la tuya tiene más color.", "Yes. I knitted Venjy one just like it, because he is my boyfriend, but yours has more color.") }
];
// Con la skin de Venjy: son novios
export const LINEAS_PAREJA = [
    { q: 'n', a: 0.8, d: 2.8, texto: t("Amor, cierra los ojos. No, en serio, ciérralos.", "Love, close your eyes. No, really, close them.") },
    { q: 'j', a: 4.0, d: 2.6, texto: t("Ya, ya, los cerré... ¿puedo mirar?", "Okay, okay, they are closed... can I look?") },
    { q: 'n', a: 6.8, d: 2.4, texto: t("Ahora sí. Una bufanda para las noches que programas hasta tarde.", "Now you can. A scarf for the nights you code until late.") },
    { q: 'j', a: 9.4, d: 2.6, texto: t("Te amo. Es el mejor regalo de todo el mundo, y lo digo yo que hice el mundo.", "I love you. It's the best gift in the whole world, and I'm the one who made the world.") },
    { q: 'n', a: 12.2, d: 3.2, texto: t("Yo también te amo. Mila y Gala dicen que la cuides.", "I love you too. Mila and Gala say take good care of it.") }
];

export function momento(info = {}) {
    const pareja = info.base === 'venjy';
    return {
        T: 16, r: 1.2,
        lineas: pareja ? LINEAS_PAREJA : LINEAS,
        pista: { n: [['habla', 0.8, 3.6]], j: [] },
        gestos: {}
    };
}
