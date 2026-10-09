// =========================================================
// VENJY · Supervivencia · Momento especial de Hadad: «El comercial» (bloque 6b-2)
// escena-amistad.js lo carga con import() solo al usarlo (botón «Momento especial» de «Hablar» con la amistad en 100).
// momento(info) devuelve el guion (formato en la cabecera de escena-amistad.js); info.base = clave de la base de tu skin.
// Guion de tiempos (lo programa la skill animaciones-minecraft):
//   En la fogata (Andy y Nacho quedan callados al lado: el motor ya lo hace).
//   3.6 Hadad saca una bolsa de papas fritas (api.caja 0.32×0.42×0.12 con filas píxel: amarilla con una franja roja y una papa dibujada) pegada a su mano derecha; 3.8-6.8 la presenta como en un comercial (brazo derecho estirado al lado con la bolsa a la altura de la cara, izquierda abierta señalándola, sonrisa = cabeza un poco ladeada).
//   9.6-12.0 le ofrece la bolsa al jugador (pasa); los dos «comen»: mano a la boca dos veces cada uno (gesto propio `come`).
//   12.2-15.4 los dos levantan el pulgar (gesto propio `pulgar`: brazo derecho adelante doblado hacia arriba) mirando un poco hacia el costado (cy chico), chispas en 12.4. La bolsa desaparece al terminar.
// Son personas reales: siempre en buena onda; el dueño revisa los textos antes del merge.
// =========================================================
const t = (es, en) => ({ es, en });

// Frases (únicas en todo el juego; las comprueba mundo/tests/amistad.mjs)
export const LINEAS = [
    { q: 'n', a: 0.8, d: 2.8, texto: t("Atención, que esto es un comercial. Tú eres mi invitado especial.", "Attention, this is a commercial. You are my special guest.") },
    { q: 'n', a: 3.8, d: 3.0, texto: t("Papas fritas de bolsa: las que acompañan cada victoria del escuadrón.", "Bagged potato chips: the ones that go with every squad victory.") },
    { q: 'j', a: 7.0, d: 2.4, texto: t("¿Y puedo probar o es solo para el comercial?", "And can I try some or is it only for the ad?") },
    { q: 'n', a: 9.6, d: 2.4, texto: t("Prueba nomás. Dicen que con amigos saben el doble.", "Go ahead. They say they taste twice as good with friends.") },
    { q: 'n', a: 12.2, d: 3.2, texto: t("Y corte. Ese comercial ya es más famoso que la imagen de la IA.", "And cut. This commercial is already more famous than the AI picture.") }
];

export function momento(info = {}) {
    return {
        T: 16, r: 1.4,
        lineas: LINEAS,
        pista: { n: [['habla', 0.8, 3.6]], j: [] },
        gestos: {}
    };
}
