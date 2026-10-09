// =========================================================
// VENJY · Supervivencia · Momento especial de Pony: «La pesca del siglo» (bloque 6b-2)
// escena-amistad.js lo carga con import() solo al usarlo (botón «Momento especial» de «Hablar» con la amistad en 100).
// momento(info) devuelve el guion (formato en la cabecera de escena-amistad.js); info.base = clave de la base de tu skin.
// Guion de tiempos (lo programa la skill animaciones-minecraft):
//   0.6-6.5 Pony tira de la caña con fuerza (gesto propio `tira`: torso hacia atrás (inc negativo leve), brazos adelante-arriba tirando, saltitos chicos, temblor); su caña ya la tiene en la mano.
//   2.5-6.5 el jugador lo ayuda: brazos adelante como agarrando la caña y tirando hacia atrás al mismo ritmo.
//   6.5 sale del agua un salmón gigante (api.caja larga ~1.6 de largo, rosado/rojo con franjas, cola y aleta) que vuela en arco hasta los brazos de Pony (6.5-7.5), con chispa en 6.5. Pony lo abraza de lado 7.5-13.8.
//   10.8-13.8 Pony se para de puntillas (y +0.12 con salto chico) para verse más alto que el pez.
//   14.0-15.5 chocan los cinco (golpe en 14.6). El pez desaparece al terminar.
// Son personas reales: siempre en buena onda; el dueño revisa los textos antes del merge.
// =========================================================
const t = (es, en) => ({ es, en });

// Frases (únicas en todo el juego; las comprueba mundo/tests/amistad.mjs)
export const LINEAS = [
    { q: 'n', a: 0.6, d: 2.6, texto: t("¡Picó! ¡Picó! ¡Ayúdame, que este es más grande que yo!", "It bit! It bit! Help me, this one is bigger than me!") },
    { q: 'j', a: 3.4, d: 2.4, texto: t("¡Tira, Pony, tira!", "Pull, Pony, pull!") },
    { q: 'n', a: 7.6, d: 3.0, texto: t("Ya, lo admito: este salmón me ganó en altura. Por poquito.", "Okay, I admit it: this salmon beat me in height. Barely.") },
    { q: 'n', a: 10.8, d: 3.0, texto: t("Pero el récord es de los dos. Lo pongo en el muelle con tu nombre al lado del mío.", "But the record belongs to both of us. I will put it on the dock with your name next to mine.") }
];

// ---- Utilidades (como escena-amistad.js) ----
const suave = u => u * u * (3 - 2 * u);
const lim = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const tramo = (u, a, b) => lim((u - a) / (b - a), 0, 1);
const env = (x, a, b, r) => suave(Math.min(tramo(x, a, a + r), 1 - tramo(x, b - r, b)));

// Salmón: franjas rosadas y rojas
const COL_PEZ = { p: '#ff9a8a', r: '#d9573f', k: '#7a2a1a', w: '#fff1e6' };
const FILAS_PEZ = ['pppppppp', 'pprpppwp', 'rrrrrrrr', 'pppppppp', 'pprpppwp', 'rrrrrrrr', 'pppppppp', 'pppkpppp'];

export function momento(info = {}) {
    const st = {};
    const gestos = {
        // Tira de la caña con fuerza: brazos al frente, temblor y saltitos chicos
        tira: (u, t) => { const s = Math.sin(t * 22) * 0.04; return { cx: -0.15, inc: -0.1, bDx: -1.3 + s, bIx: -1.3 - s, bDz: 0.2, bIz: -0.2, y: Math.abs(Math.sin(t * 6)) * 0.05 }; },
        // El jugador ayuda: tira hacia atrás al mismo ritmo
        ayuda: (u, t) => { const s = Math.sin(t * 5) * 0.25; return { cx: -0.1, inc: -0.08, bDx: -1.2 + s, bIx: -1.2 + s, bDz: 0.2, bIz: -0.2 }; },
        // Abraza el salmón de lado; de puntillas entre 10.8 y 13.8
        abraza: (u, t) => ({ cx: -0.1, bDx: -1.3, bIx: -1.3, bDz: 0.5, bIz: -0.5, pz: 0.15, y: 0.12 * env(t, 10.8, 13.8, 0.6) }),
        // Chocan los cinco: la mano derecha de cada uno llega al centro
        choque: () => ({ cx: -0.1, bDx: -1.9, bDz: 0.45 })
    };

    return {
        T: 16, r: 1.4,
        lineas: LINEAS,
        pista: {
            n: [['tira', 0.6, 7.0], ['abraza', 7.0, 14.0], ['choque', 14.0, 15.5]],
            j: [['ayuda', 2.5, 6.5], ['asiente', 7.0, 13.8], ['choque', 14.0, 15.5]]
        },
        gestos,
        golpes: [14.6],
        corazones: [],
        extra: {
            iniciar(api) {
                st.cana = api.caja(0.05, 1.5, 0.05, '#6b4a2a');
                st.cana.visible = false;
                api.pegar(st.cana, 'n', 'brazoD', [0, -0.7, 0.12]);
                // El salmón es un grupo de tres cajas (cuerpo, cola, aleta); el grupo se quita al terminar
                st.pez = new api.THREE.Group();
                const cuerpo = api.caja(0.4, 0.42, 1.6, null, { filas: FILAS_PEZ, colores: COL_PEZ });
                const cola = api.caja(0.04, 0.42, 0.34, '#d9573f'); cola.position.set(0, 0, -0.97);
                const aleta = api.caja(0.04, 0.14, 0.3, '#d9573f'); aleta.position.set(0, 0.28, 0.1);
                st.pez.add(cuerpo, cola, aleta);
                st.pez.visible = false;
                api.pegar(st.pez);
            },
            cuadro(api) {
                const t = api.e.t, THREE = api.THREE, pez = st.pez, cana = st.cana;
                if (!pez) return;
                const A = api.actor('n'), yaw = A.n.yaw;
                // La caña en la mano hasta que el salmón llega
                cana.visible = t >= 0.6 && t < 7.0;
                // Salmón: sale del agua (2.6 delante de Pony), vuela en arco a sus brazos (6.5-7.5) y lo abraza
                const pg = api.posG('n');
                const S = { x: pg.x + Math.sin(yaw) * 2.6, y: pg.y + 0.1, z: pg.z + Math.cos(yaw) * 2.6 };
                if (t >= 6.5 && !api.e.hechos.has('chP')) { api.e.hechos.add('chP'); api.golpe(S); }
                if (t < 6.5) {
                    pez.visible = false;
                    if (pez.parent !== api.grupo) api.soltar(pez);
                } else if (t < 7.5) {
                    pez.visible = true;
                    if (pez.parent !== api.grupo) api.soltar(pez);
                    const a = api.punta(A, 'D', new THREE.Vector3()), c = api.punta(A, 'I', new THREE.Vector3());
                    const u = tramo(t, 6.5, 7.5), k = suave(u);
                    pez.position.set(lerp(S.x, (a.x + c.x) / 2, k), lerp(S.y, (a.y + c.y) / 2, k) + Math.sin(Math.PI * u) * 1.2, lerp(S.z, (a.z + c.z) / 2, k));
                    pez.rotation.set(-0.5 * Math.sin(Math.PI * u), yaw, 0);
                } else if (t < 14.0) {
                    pez.visible = true;
                    if (pez.parent !== A.p.cuerpo) api.pegar(pez, 'n', 'cuerpo', [0, 1.05, 0.4], [0, Math.PI / 2, 0]);
                } else {
                    // Al chocar los cinco el salmón se va con un destello
                    if (pez.visible) {
                        pez.updateWorldMatrix(true, false);
                        const p = api.grupo.worldToLocal(pez.getWorldPosition(new THREE.Vector3()));
                        api.efecto('chispa', p.x, p.y, p.z, { tam: 0.5, vida: 0.5 });
                    }
                    pez.visible = false;
                }
            },
            terminar() {
                if (st.pez && st.pez.parent) st.pez.parent.remove(st.pez);
            }
        }
    };
}
