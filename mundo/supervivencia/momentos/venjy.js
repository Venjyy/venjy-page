// =========================================================
// VENJY · Supervivencia · Momento especial de Venjy: «El bloque del portafolio» (bloque 6b-2)
// escena-amistad.js lo carga con import() solo al usarlo (botón «Momento especial» de «Hablar» con la amistad en 100).
// momento(info) devuelve el guion (formato en la cabecera de escena-amistad.js); info.base = clave de la base de tu skin.
// Guion de tiempos (lo programa la skill animaciones-minecraft):
//   Normal: 1.0-5.5 Venjy teclea en el aire (gesto propio `teclea`: brazos al frente a la altura del pecho, manos que suben y bajan rápido y alternadas).
//   5.5 aparece entre los dos, a la altura del pecho, un bloque dorado flotante que gira (api.caja con filas píxel: dorado con una estrella), con chispa (api.golpe en ese punto).
//   8.0-9.0 el bloque vuela a las manos del jugador (soltar + interpolar, luego pegar a brazoD/brazoI del jugador); 7.0-12.6 el jugador lo sostiene con las dos manos.
//   12.8-15.4 los dos levantan los brazos (brazosArriba) y el bloque sube con el jugador; chispas en 13.0.
//   Pareja (skin de Lona, info.base === 'lona'): 0.6-7.0 de lado, hombro con hombro, mirando hacia el mismo lado (yaw: amigo y jugador giran ~±π/2 para quedar mirando igual), tomados de la mano (la izquierda de Venjy y la derecha del jugador, abajo, juntas).
//   7.0-8.0 vuelven a mirarse. 8.2-10.2 Venjy saca una flor roja (sprite o cajas: tallo verde y pétalos rojos) y se la da (10.2 pasa a la mano del jugador).
//   11.0-15.0 abrazo largo con beso en la mejilla (como `pareja` de escena-amistad-datos.js) y corazones en 12.0, 13.0 y 14.0.
// Son personas reales: siempre en buena onda; el dueño revisa los textos antes del merge.
// =========================================================
const t = (es, en) => ({ es, en });

// Frases (únicas en todo el juego; las comprueba mundo/tests/amistad.mjs)
export const LINEAS = [
    { q: 'n', a: 0.8, d: 2.8, texto: t("Ven, tengo algo para ti. Lo programé anoche, sin dormir, obvio.", "Come here, I have something for you. I coded it last night, without sleeping, obviously.") },
    { q: 'n', a: 4.0, d: 2.8, texto: t("Compila... compila... ¡compiló! Primera vez sin errores.", "Compiling... compiling... it compiled! First time with no errors.") },
    { q: 'j', a: 7.0, d: 2.4, texto: t("¿Un bloque? ¿Para mí?", "A block? For me?") },
    { q: 'n', a: 9.6, d: 3.0, texto: t("Un bloque único, con tu nombre. Va directo a la sección de amigos del portafolio.", "A one-of-a-kind block, with your name. It goes straight to the friends section of the portfolio.") },
    { q: 'n', a: 12.8, d: 2.6, texto: t("¡Eso! Gracias por jugar mi mundo de punta a cabo.", "Yes! Thanks for playing my world from start to finish.") }
];
// Con la skin de Lona: son novios
export const LINEAS_PAREJA = [
    { q: 'n', a: 1.0, d: 3.0, texto: t("Ven, amor. Desde aquí se ve todo el mundo que armé.", "Come, love. From here you can see the whole world I built.") },
    { q: 'j', a: 4.2, d: 2.6, texto: t("Y todo tiene algo de nosotros, ¿cachai?", "And all of it has a little bit of us, you know?") },
    { q: 'n', a: 8.2, d: 2.8, texto: t("Te hice una flor que no se marchita. Ni con el día ni con la noche.", "I made you a flower that never wilts. Not by day, not by night.") },
    { q: 'n', a: 11.4, d: 3.6, texto: t("Te amo, Lona. Eres mi lugar favorito de este mundo.", "I love you, Lona. You are my favorite place in this world.") }
];

export function momento(info = {}) {
    const pareja = info.base === 'lona';
    return {
        T: 16, r: 1.3,
        lineas: pareja ? LINEAS_PAREJA : LINEAS,
        pista: { n: [['habla', 0.8, 3.6]], j: [] },
        gestos: {}
    };
}
