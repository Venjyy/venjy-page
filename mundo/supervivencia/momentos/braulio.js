// =========================================================
// VENJY · Supervivencia · Momento especial de Braulio: «El tesoro de la orilla» (bloque 6b-2)
// escena-amistad.js lo carga con import() solo al usarlo (botón «Momento especial» de «Hablar» con la amistad en 100).
// momento(info) devuelve el guion (formato en la cabecera de escena-amistad.js); info.base = clave de la base de tu skin.
// Guion de tiempos (lo programa la skill animaciones-minecraft):
//   En la playa del naufragio.
//   1.0-6.0 los dos cavan (gesto propio `cava`: inclinados con piernas compensadas, las dos manos abajo que van y vienen alternadas); chispas color arena (api.efecto 'chispa' chicas) entre los dos cada ~0.6 s.
//   6.0 aparece entre los dos un cofrecito (api.caja 0.4×0.3×0.3 café con borde dorado) que sube desde el suelo; 6.6 se abre (tapa = otra caja que gira) y sale una concha dorada (caja chica o sprite dorado) que Braulio toma (7.0).
//   9.4-10.4 se la da al jugador (pasa a su mano derecha).
//   12.6-15.4 el jugador se lleva la concha a la oreja (gesto propio `oreja`: brazo derecho doblado con la mano junto a la cabeza, cabeza ladeada) y Braulio asiente sonriendo. Todo desaparece al terminar.
// Son personas reales: siempre en buena onda; el dueño revisa los textos antes del merge.
// =========================================================
const t = (es, en) => ({ es, en });

// Frases (únicas en todo el juego; las comprueba mundo/tests/amistad.mjs)
export const LINEAS = [
    { q: 'n', a: 0.8, d: 2.6, texto: t("Espera, algo brilla en la arena. ¡Ayúdame a cavar!", "Wait, something is shining in the sand. Help me dig!") },
    { q: 'j', a: 3.6, d: 2.4, texto: t("¿Otro hueso para tu colección?", "Another bone for your collection?") },
    { q: 'n', a: 6.4, d: 2.6, texto: t("No... ¡un cofre! Y adentro hay una concha dorada.", "No... a chest! And inside there is a golden seashell.") },
    { q: 'n', a: 9.4, d: 3.0, texto: t("Es para ti. En Arica dicen que si la escuchas, se oye el mar.", "It is for you. In Arica they say if you listen to it, you can hear the sea.") },
    { q: 'j', a: 12.6, d: 2.8, texto: t("Se oye... ¡se oye el mar de verdad!", "I can hear... I can really hear the sea!") }
];

export function momento(info = {}) {
    return {
        T: 16, r: 1.4,
        lineas: LINEAS,
        pista: { n: [['habla', 0.8, 3.6]], j: [] },
        gestos: {}
    };
}
