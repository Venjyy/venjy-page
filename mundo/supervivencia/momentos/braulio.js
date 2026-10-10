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

// ---- Utilidades (como escena-amistad.js) ----
const suave = u => u * u * (3 - 2 * u);
const lim = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const tramo = (u, a, b) => lim((u - a) / (b - a), 0, 1);
const envolvente = (x, a, b, r) => suave(Math.min(tramo(x, a, a + r), 1 - tramo(x, b - r, b)));

// Cofrecito de madera con borde dorado; concha dorada (sprite píxel)
const COL_COFRE = { g: '#f5c542', b: '#7a4a1f', d: '#5a3414' };
const FILAS_COFRE = ['gggggggg', 'gbbbbbbg', 'gdbbbbdg', 'gbbbbbbg', 'gbbbbbbg', 'gdbbbbdg', 'gbbbbbbg', 'gggggggg'];
const COL_CONCHA = { g: '#c98a1b', y: '#ffd84a', w: '#fff7c2' };
const FILAS_CONCHA = ['...g...', '..ggg..', '.gyyyg.', 'gywyyyg', '.gyyyg.', '..ggg..', '...g...'];

export function momento(info = {}) {
    const st = {};
    const gestos = {
        // Cavan: inclinados con las piernas compensadas, las manos van y vienen alternadas
        cava: (u, t) => { const s = Math.sin(t * 8); return { cx: 0.4, inc: 0.6, pDx: -0.6, pIx: -0.6, y: 0.13, bDx: -0.55 + 0.35 * s, bIx: -0.55 - 0.35 * s, bDz: 0.12, bIz: -0.12 }; },
        // El jugador recibe la concha con la mano derecha
        recibe: () => ({ cx: 0.1, bDx: -1.2, bDz: 0.1 }),
        // Se la lleva a la oreja: brazo derecho alto, cabeza ladeada hacia ese hombro
        oreja: () => ({ cx: -0.1, cz: 0.2, cy: -0.25, bDx: -2.7, bDz: 0.2 })
    };

    return {
        T: 16, r: 1.8,
        lineas: LINEAS,
        pista: {
            n: [['cava', 1.0, 6.0], ['sorpresa', 6.0, 6.9], ['pasa', 9.4, 10.6], ['asiente', 12.6, 15.4]],
            j: [['cava', 1.0, 6.0], ['sorpresa', 6.0, 6.9], ['recibe', 9.4, 10.6], ['oreja', 12.6, 15.4]]
        },
        gestos,
        // Para cavar se ponen hombro con hombro mirando al mismo lado (frente a frente, inclinados, se metían uno en el otro);
        // en 6.0 se vuelven a mirar para el cofre
        yaw: {
            n: t => (Math.PI / 2) * envolvente(t, 0.8, 6.2, 0.6),
            j: t => -(Math.PI / 2) * envolvente(t, 0.8, 6.2, 0.6)
        },
        golpes: [],
        corazones: [],
        extra: {
            iniciar(api) {
                // Cofre: la tapa es un grupo bisagra (atrás, arriba) dentro del cofre
                st.cofre = api.caja(0.4, 0.3, 0.3, null, { filas: FILAS_COFRE, colores: COL_COFRE });
                st.bisagra = new api.THREE.Group();
                st.bisagra.position.set(0, 0.15, -0.15);
                const tapa = api.caja(0.4, 0.1, 0.3, null, { filas: FILAS_COFRE, colores: COL_COFRE });
                tapa.position.set(0, 0.05, 0.15);
                st.bisagra.add(tapa);
                st.cofre.add(st.bisagra);
                st.cofre.visible = false;
                api.pegar(st.cofre);
                st.concha = api.sprite(FILAS_CONCHA, COL_CONCHA, 0.36);
                st.concha.visible = false;
                api.pegar(st.concha);
            },
            cuadro(api) {
                const t = api.e.t, THREE = api.THREE, { cofre, bisagra, concha } = st;
                if (!cofre) return;
                const A = api.actor('n'), J = api.actor('j');
                const n = api.posG('n'), j = api.posG('j');
                const medio = { x: (n.x + j.x) / 2, y: (n.y + j.y) / 2, z: (n.z + j.z) / 2 };
                // Arena: chispas entre los dos cada 0.6 s
                for (let k = 0; k < 9; k++) {
                    if (t >= 1.0 + 0.6 * k && !api.e.hechos.has('ar' + k)) {
                        api.e.hechos.add('ar' + k);
                        api.efecto('chispa', medio.x + (k % 2 ? 0.2 : -0.2), medio.y + 0.25, medio.z, { tam: 0.16, vida: 0.4 });
                    }
                }
                // Cofre: sube desde el suelo (6.0-6.5) y se abre (6.6-7.0)
                cofre.visible = t >= 6.0;
                if (cofre.visible) {
                    cofre.position.set(medio.x, medio.y + lerp(-0.45, 0.15, suave(tramo(t, 6.0, 6.5))), medio.z);
                    bisagra.rotation.set(-1.7 * suave(tramo(t, 6.6, 7.0)), 0, 0);
                }
                // Concha: sale del cofre (6.6-7.0), la toma Braulio (7.0), se la da al jugador (9.4-10.4) y queda en su mano
                if (t < 6.6) {
                    concha.visible = false;
                    if (concha.parent !== api.grupo) api.soltar(concha);
                } else if (t < 7.0) {
                    concha.visible = true;
                    if (concha.parent !== api.grupo) api.soltar(concha);
                    const a = api.punta(A, 'D', new THREE.Vector3()), u = suave(tramo(t, 6.6, 7.0));
                    concha.position.set(lerp(medio.x, a.x, u), lerp(medio.y + 0.4, a.y, u), lerp(medio.z, a.z, u));
                } else if (t < 9.4) {
                    concha.visible = true;
                    if (concha.parent !== A.p.brazoD) api.pegar(concha, 'n', 'brazoD', [0, -0.7, 0.12]);
                } else if (t < 10.4) {
                    concha.visible = true;
                    if (concha.parent !== api.grupo) api.soltar(concha);
                    const a = api.punta(A, 'D', new THREE.Vector3()), c = api.punta(J, 'D', new THREE.Vector3());
                    const u = suave(tramo(t, 9.4, 10.4));
                    concha.position.set(lerp(a.x, c.x, u), lerp(a.y, c.y, u), lerp(a.z, c.z, u));
                } else {
                    concha.visible = true;
                    if (concha.parent !== J.p.brazoD) api.pegar(concha, 'j', 'brazoD', [0, -0.7, 0.12]);
                }
            }
        }
    };
}
