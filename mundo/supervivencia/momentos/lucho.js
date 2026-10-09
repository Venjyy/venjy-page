// =========================================================
// VENJY · Supervivencia · Momento especial de Lucho: «El revive» (bloque 6b-2)
// escena-amistad.js lo carga con import() solo al usarlo (botón «Momento especial» de «Hablar» con la amistad en 100).
// momento(info) devuelve el guion (formato en la cabecera de escena-amistad.js); info.base = clave de la base de tu skin.
// Guion de tiempos (lo programa la skill animaciones-minecraft):
//   En la atalaya, con Boris (actor extra 'boris').
//   0.8-6.0 Lucho y el jugador quedan espalda con espalda (yaw: los dos giran ~π para darse la espalda; con r 1.3 quedan separados ~0.6 al girar, ajusta) apuntando con «pistola de dedos» (gesto propio `apunta`: brazo derecho estirado al frente, izquierdo sosteniéndolo, cabeza que gira de un lado a otro).
//   3.6-6.0 Boris levanta el hacha (saluda o brazo arriba).
//   6.0 el jugador «cae»: queda de rodillas (gesto propio `cae`: y -0.45, piernas atrás, inc 0.2, un brazo al suelo) hasta 11.0.
//   7.0-10.4 Lucho se vuelve (yaw a 0), se agacha junto al jugador (inclinado, piernas compensadas, y abajo) con las dos manos sobre su espalda; chispas en 8.0, 9.0 y 10.0 (la «barra» de revivir).
//   11.0-12.0 el jugador se levanta; 12.2-15.4 chocan los puños (golpe en 13.0) y Lucho se ríe.
// Son personas reales: siempre en buena onda; el dueño revisa los textos antes del merge.
// =========================================================
const t = (es, en) => ({ es, en });

// Frases (únicas en todo el juego; las comprueba mundo/tests/amistad.mjs)
export const LINEAS = [
    { q: 'n', a: 0.8, d: 2.6, texto: t("Modo Apex: espalda con espalda, que vienen por todos lados.", "Apex mode: back to back, they are coming from everywhere.") },
    { q: 'boris', a: 3.6, d: 2.4, texto: t("Yo cubro desde el tronco. Tranquilos, tengo el hacha.", "I'll cover from the log. Relax, I've got the axe.") },
    { q: 'j', a: 6.2, d: 2.6, texto: t("¡Me botaron! ¡Revíveme!", "I'm down! Revive me!") },
    { q: 'n', a: 8.8, d: 2.8, texto: t("Aguanta, aguanta... ¡revivido! Nadie se queda atrás en mi dúo.", "Hold on, hold on... revived! Nobody gets left behind in my duo.") },
    { q: 'n', a: 12.0, d: 3.4, texto: t("Ahora eres primo honorario y compañero de ranked. Combo completo.", "Now you are an honorary cousin and a ranked teammate. Full combo.") }
];

export function momento(info = {}) {
    return {
        T: 16, r: 1.3, actores: { boris: 'boris' },
        lineas: LINEAS,
        pista: { n: [['habla', 0.8, 3.6]], j: [] },
        gestos: {}
    };
}
