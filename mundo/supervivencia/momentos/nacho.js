// =========================================================
// VENJY · Supervivencia · Momento especial de Nacho: «Asado y carcajada» (bloque 6b-2)
// escena-amistad.js lo carga con import() solo al usarlo (botón «Momento especial» de «Hablar» con la amistad en 100).
// momento(info) devuelve el guion (formato en la cabecera de escena-amistad.js); info.base = clave de la base de tu skin.
// Guion de tiempos (lo programa la skill animaciones-minecraft):
//   En la fogata (Hadad y Andy quedan callados).
//   1.0-5.5 Nacho voltea carne: una espátula (caja fina gris con mango café) en su mano derecha y un filete (caja 0.3×0.06×0.2 rojo-café) sobre ella; en 3.0 el filete salta y da una vuelta en el aire y cae de nuevo en la espátula.
//   6.4-7.6 le pasa el filete en un plato (caja blanca plana con el filete encima) al jugador (vuela a su mano izquierda); el jugador lo sostiene 7.6-12.0.
//   9.4-13.8 los dos se ríen fuerte (gesto propio `carcajada`: inclinados adelante con piernas compensadas, una mano en la guata, sacudones).
//   13.6-15.6 brindis: cada uno con un vaso (caja 0.12×0.18×0.12 amarilla) que chocan en el centro en 14.2 (golpe). Todo desaparece al terminar.
// Son personas reales: siempre en buena onda; el dueño revisa los textos antes del merge.
// =========================================================
const t = (es, en) => ({ es, en });

// Frases (únicas en todo el juego; las comprueba mundo/tests/amistad.mjs)
export const LINEAS = [
    { q: 'n', a: 0.8, d: 2.6, texto: t("Jajaja, llegaste justo: la mejor pieza de carne es para ti.", "Haha, you came just in time: the best cut of meat is for you.") },
    { q: 'j', a: 3.6, d: 2.6, texto: t("¿En serio? ¿Y el Hadad y el Andy?", "Really? What about Hadad and Andy?") },
    { q: 'n', a: 6.4, d: 2.8, texto: t("Jajaja, ellos ya comieron tres veces. Hoy el invitado de honor eres tú.", "Haha, they already ate three times. Today you are the guest of honor.") },
    { q: 'n', a: 9.4, d: 2.6, texto: t("Jajaja, ¿te conté cuando se me quemó el asado por contar un chiste? Jajaja.", "Haha, did I tell you about when I burned the barbecue telling a joke? Haha.") }
];

export function momento(info = {}) {
    return {
        T: 16, r: 1.4,
        lineas: LINEAS,
        pista: { n: [['habla', 0.8, 3.6]], j: [] },
        gestos: {}
    };
}
