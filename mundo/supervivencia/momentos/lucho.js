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


// ---------------------------------------------------------
// Gestos y efectos propios de Lucho (en momento(), con Boris como actor extra)
// ---------------------------------------------------------
const suave = u => u * u * (3 - 2 * u);
const tramo = (u, a, b) => Math.max(0, Math.min(1, (u - a) / (b - a)));

export function momento(info = {}) {
    return {
        T: 16, r: 1.3, actores: { boris: 'boris' },
        lineas: LINEAS,
        pista: {
            n: [['apunta', 0.8, 6.8], ['revive', 6.8, 10.6], ['choque', 12.2, 13.4], ['risa', 13.4, 15.6]],
            j: [['apunta', 0.8, 6.0], ['cae', 6.0, 11.0], ['choque', 12.2, 13.4]],
            boris: [['brazosArriba', 3.6, 6.0]]
        },
        gestos: {
            // Pistola de dedos: brazo derecho estirado al frente, el izquierdo lo sostiene; la cabeza mira de un lado a otro
            apunta: (u, t) => ({ bDx: -1.5, bDz: 0.05, bIx: -1.1, bIz: -0.45, cy: Math.sin(t * 1.6) * 0.35 }),
            // Revivir: un poco inclinado (piernas compensadas, sin avanzar: antes quedaba encima del jugador) con las dos manos
            // estiradas hacia los hombros del jugador sentado
            revive: (u, t) => ({
                inc: 0.3, pDx: -0.3, pIx: -0.3, y: 0.034, cx: 0.35,
                bDx: -1.3 + Math.sin(t * 9) * 0.06, bDz: 0.2, bIx: -1.3 + Math.sin(t * 9 + 1) * 0.06, bIz: -0.2
            }),
            // Cae sentado en el suelo (el sentado del atlas de rig.md: las piernas quedan estiradas sobre el suelo, no bajo él),
            // apoyado en una mano y con la cabeza gacha
            cae: () => ({ y: -0.62, pDx: -1.45, pIx: -1.45, inc: 0.15, bDx: 0.3, bDz: -0.15, bIx: -0.9, bIz: -0.2, cx: 0.4 }),
            // Choque de puños: la derecha de cada uno llega al centro y choca en 13.0
            choque: (u, t) => {
                const k = suave(tramo(t, 12.2, 13.0)) * (1 - tramo(t, 13.4, 14.0));
                return { bDx: -0.4 - 1.05 * k, bDz: 0.1 + 0.05 * k, cx: -0.1 };
            }
        },
        // Espalda con espalda: los dos miran hacia el lado contrario hasta 6.8; Lucho se da vuelta en 6.8-7.6
        yaw: {
            n: t => Math.PI * (1 - suave(tramo(t, 6.8, 7.6))),
            j: t => Math.PI * (1 - suave(tramo(t, 6.8, 7.6)))
        },
        golpes: [13.0],
        extra: {
            // Chispas de la barra de revivir, entre los dos
            cuadro(api) {
                const t = api.e.t, a = api.posG('n'), j = api.posG('j');
                for (const s of [8.0, 9.0, 10.0]) {
                    if (t >= s && !api.e.hechos.has('r' + s)) {
                        api.e.hechos.add('r' + s);
                        api.efecto('chispa', (a.x + j.x) / 2, (a.y + j.y) / 2 + 1.1, (a.z + j.z) / 2, { tam: 0.22 });
                    }
                }
            }
        }
    };
}
