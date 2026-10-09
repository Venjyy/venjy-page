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


// ---------------------------------------------------------
// Gestos y objetos propios de Nacho (en momento(); Hadad y Andy quedan callados)
// ---------------------------------------------------------
const suave = u => u * u * (3 - 2 * u);
const lim = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const tramo = (u, a, b) => lim((u - a) / (b - a), 0, 1);

export function momento(info = {}) {
    let espatula = [], filete = null, plato = null, vasos = [];
    return {
        T: 16, r: 1.4,
        lineas: LINEAS,
        pista: {
            n: [['asa', 1.0, 6.4], ['pasa', 6.4, 7.6], ['carcajada', 9.4, 13.8], ['brinda', 13.6, 15.6]],
            j: [['recibe', 7.6, 8.2], ['carcajada', 9.4, 13.8], ['brinda', 13.6, 15.6]]
        },
        gestos: {
            // Asar: la espátula sostenida sobre la brasa, la mano sube y baja poco
            asa: (u, t) => ({ bDx: -0.55 + Math.sin(t * 6) * 0.06, bDz: 0.15, bIx: -0.3, bIz: -0.1, cx: 0.25 }),
            // Recibe el plato con la izquierda estirada al frente
            recibe: () => ({ bIx: -1.35, bIz: -0.1, cx: 0.1 }),
            // Carcajada: inclinado al frente con piernas compensadas, una mano en la guata y sacudones
            carcajada: (u, t) => {
                const s = Math.sin(t * 17);
                return { inc: 0.3 + s * 0.02, pDx: -0.3, pIx: -0.3, y: 0.03, bDx: -0.9 + s * 0.05, bDz: 0.6, bIx: -0.5, bIz: -0.3, cx: -0.35, rz: s * 0.03 };
            },
            // Brindis: el vaso sube y choca con el del otro en 14.2
            brinda: (u, t) => {
                const k = suave(tramo(t, 13.6, 14.2)) * (1 - tramo(t, 14.9, 15.6));
                return { bDx: -0.6 - 0.6 * k, bDz: 0.1 + 0.05 * k, cx: -0.2 };
            }
        },
        golpes: [14.2],
        extra: {
            iniciar(api) {
                espatula = [
                    api.pegar(api.caja(0.22, 0.03, 0.2, '#a0a6ad'), 'n', 'brazoD', [0, -0.86, 0.12]),
                    api.pegar(api.caja(0.05, 0.16, 0.05, '#6b4a2b'), 'n', 'brazoD', [0, -0.72, 0.12])
                ];
                filete = api.pegar(api.caja(0.3, 0.06, 0.2, '#8a3b22'), null, null, [0, 0, 0]);
                plato = api.pegar(api.caja(0.34, 0.02, 0.34, '#f4f1ea'), null, null, [0, 0, 0]);
                plato.visible = false;
                vasos = [
                    api.pegar(api.caja(0.12, 0.18, 0.12, '#f2c230'), 'n', 'brazoD', [0, -0.75, 0.12]),
                    api.pegar(api.caja(0.12, 0.18, 0.12, '#f2c230'), 'j', 'brazoD', [0, -0.75, 0.12])
                ];
                vasos.forEach(v => { v.visible = false; });
            },
            // Filete sobre la espátula (3.0-3.6 da una vuelta en el aire), luego en el plato, luego en la mano del jugador
            cuadro(api) {
                const t = api.e.t, V = api.THREE.Vector3;
                const mano = q => api.punta(api.actor(q), q === 'j' ? 'I' : 'D', new V());
                const pn = mano('n');
                espatula.forEach(o => { o.visible = t < 6.4; });
                vasos.forEach(v => { v.visible = t >= 13.6 && t < 15.6; });
                filete.visible = t < 12.2;
                plato.visible = t >= 6.4 && t < 12.2;
                if (t < 6.4) {
                    const vuelo = t >= 3.0 && t < 3.6, s = tramo(t, 3.0, 3.6);
                    const lift = vuelo ? Math.sin(Math.PI * s) * 0.5 : 0;
                    filete.position.set(pn.x, pn.y + 0.05 + lift, pn.z);
                    filete.rotation.x = vuelo ? -s * Math.PI * 2 : 0;
                    return;
                }
                filete.rotation.x = 0;
                let b = pn;
                if (t >= 8.2) b = mano('j');
                else if (t >= 7.6) {
                    const pj = mano('j'), k = suave(tramo(t, 7.6, 8.2)), arco = Math.sin(Math.PI * tramo(t, 7.6, 8.2)) * 0.45;
                    b = { x: lerp(pn.x, pj.x, k), y: lerp(pn.y, pj.y, k) + arco, z: lerp(pn.z, pj.z, k) };
                }
                plato.position.set(b.x, b.y, b.z);
                filete.position.set(b.x, b.y + 0.07, b.z);
            }
        }
    };
}
