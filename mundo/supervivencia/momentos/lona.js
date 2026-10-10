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

// ---- Utilidades (como escena-amistad.js) ----
const suave = u => u * u * (3 - 2 * u);
const lim = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const tramo = (u, a, b) => lim((u - a) / (b - a), 0, 1);
const env = (x, a, b, r) => suave(Math.min(tramo(x, a, a + r), 1 - tramo(x, b - r, b)));

// Franjas rojas y blancas (la bufanda); la punta en el cuello del jugador va con la misma textura
const FRANJAS = ['rr', 'rr', 'ww', 'ww', 'rr', 'rr', 'ww', 'ww'];
const COL_BUFANDA = { r: '#d8283c', w: '#f4f4f4' };

export function momento(info = {}) {
    const pareja = info.base === 'venjy';
    // Pareja: Lona teje más rápido, la bufanda crece antes y se la pone antes; el abrazo y los corazones van después
    const cfg = pareja
        ? { t0: 0.8, t1: 6.6, entrega: 6.8, freq: 28, amp: 0.06, ojos: true, pistaN: [['tejeRapido', 0.8, 6.6], ['asiente', 6.6, 9.4], ['asiente', 9.4, 12.2], ['abrazoL', 12.2, 15.4]], pistaJ: [['ojos', 0.8, 6.6], ['toca', 9.4, 12.0], ['abrazoL', 12.2, 15.4]], abrazo: [12.2, 15.4], corazones: [12.6, 13.6, 14.6] }
        : { t0: 1.0, t1: 6.8, entrega: 7.0, freq: 18, amp: 0.08, ojos: false, pistaN: [['teje', 1.0, 7.0], ['asiente', 7.0, 10.4], ['habla', 10.4, 13.6], ['abrazoL', 13.8, 15.6]], pistaJ: [['toca', 7.6, 10.4], ['abrazoL', 13.8, 15.6]], abrazo: [13.8, 15.6], corazones: [] };
    const st = {};

    const gestos = {
        teje: (u, t) => { const s = Math.sin(t * cfg.freq) * cfg.amp; return { cx: 0.35, bDx: -1.1 - s, bIx: -1.1 + s, bDz: 0.4, bIz: -0.4 }; },
        tejeRapido: (u, t) => { const s = Math.sin(t * 28) * 0.06; return { cx: 0.35, bDx: -1.1 - s, bIx: -1.1 + s, bDz: 0.4, bIz: -0.4 }; },
        toca: (u, t) => { const s = Math.sin(t * 6) * 0.05; return { cx: 0.3, bDx: -0.75 + s, bIx: -0.75 - s, bDz: 0.3, bIz: -0.3 }; },
        abrazoL: (u, t, i) => {
            const k = env(u, 0, 1, 0.2), beso = env(u, 0.5, 0.8, 0.1);
            const meta = { bDx: -1.45 * k, bDz: 0.8 * k, bIx: -1.45 * k, bIz: -0.8 * k, pz: 0.36 * k };
            return i.j ? { ...meta, cz: 0.15 * k, cy: -0.2 * k } : { ...meta, cy: (0.45 + 0.1 * beso) * k, cz: -0.15 * k, cx: 0.2 * k };
        }
    };

    return {
        T: 16, r: 1.2,
        lineas: pareja ? LINEAS_PAREJA : LINEAS,
        pista: { n: cfg.pistaN, j: cfg.pistaJ },
        gestos,
        corazones: cfg.corazones,
        golpes: [],
        extra: {
            iniciar(api) {
                // Bufanda que teje (crece entre las manos), agujas y la bufanda puesta (anillo y punta)
                st.tejida = api.caja(0.16, 1, 0.06, null, { filas: FRANJAS, colores: COL_BUFANDA });
                st.agujaD = api.caja(0.04, 0.5, 0.04, '#c9c9c9');
                st.agujaI = api.caja(0.04, 0.5, 0.04, '#c9c9c9');
                st.anillo = api.caja(0.56, 0.12, 0.32, null, { filas: FRANJAS, colores: COL_BUFANDA });
                st.punta = api.caja(0.16, 0.6, 0.05, null, { filas: FRANJAS, colores: COL_BUFANDA });
                for (const o of [st.tejida, st.anillo, st.punta]) { o.visible = false; api.pegar(o); }
                st.agujaD.visible = st.agujaI.visible = false;
            },
            cuadro(api) {
                const t = api.e.t, THREE = api.THREE;
                const { tejida, agujaD, agujaI, anillo, punta } = st;
                if (!tejida) return;
                const tejiendo = t >= cfg.t0 && t < cfg.entrega;
                // Agujas: en cada mano, giran de un lado a otro (se cruzan)
                const brazoD = api.actor('n').p.brazoD, brazoI = api.actor('n').p.brazoI;
                const giro = Math.sin(t * cfg.freq * 1.5) * 0.7;
                agujaD.visible = agujaI.visible = tejiendo;
                if (tejiendo) {
                    if (agujaD.parent !== brazoD) api.pegar(agujaD, 'n', 'brazoD', [0, -0.7, 0.12]);
                    if (agujaI.parent !== brazoI) api.pegar(agujaI, 'n', 'brazoI', [0, -0.7, 0.12]);
                    agujaD.rotation.set(0, 0, giro);
                    agujaI.rotation.set(0, 0, -giro);
                }
                // Bufanda: cuelga entre las manos y crece hasta 0.9
                tejida.visible = tejiendo;
                if (tejiendo) {
                    if (tejida.parent !== api.grupo) api.soltar(tejida);
                    const a = api.punta(api.actor('n'), 'D', new THREE.Vector3()), c = api.punta(api.actor('n'), 'I', new THREE.Vector3());
                    const L = Math.max(0.01, 0.6 * suave(tramo(t, cfg.t0, cfg.t1)));
                    tejida.scale.set(1, L, 1);
                    tejida.position.set((a.x + c.x) / 2, (a.y + c.y) / 2 - L / 2, (a.z + c.z) / 2);
                    tejida.rotation.set(0, 0, 0);
                }
                // Se la pone al jugador: anillo en el cuello y punta que cuelga al frente
                const puesta = t >= cfg.entrega;
                anillo.visible = punta.visible = puesta;
                if (puesta) {
                    const k = 0.2 + 0.8 * suave(tramo(t, cfg.entrega, cfg.entrega + 0.5));
                    if (anillo.parent !== api.actor('j').p.cuerpo) { api.pegar(anillo, 'j', 'cuerpo', [0, 1.45, 0]); api.pegar(punta, 'j', 'cuerpo', [0.08, 1.12, 0.16]); }
                    anillo.scale.setScalar(k); punta.scale.setScalar(k);
                }
            }
        }
    };
}
