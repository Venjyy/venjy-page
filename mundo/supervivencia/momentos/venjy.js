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

// ---- Utilidades (como escena-amistad.js) ----
const suave = u => u * u * (3 - 2 * u);
const lim = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const tramo = (u, a, b) => lim((u - a) / (b - a), 0, 1);
const env = (x, a, b, r) => suave(Math.min(tramo(x, a, a + r), 1 - tramo(x, b - r, b)));

// Texturas píxel de los objetos
const COL_BLOQUE = { d: '#8a5a00', g: '#f5c542', l: '#ffe68a', s: '#fff7c2' };
function filasBloque() {
    const f = [];
    for (let y = 0; y < 16; y++) {
        let s = '';
        for (let x = 0; x < 16; x++) {
            const borde = x === 0 || y === 0 || x === 15 || y === 15;
            const estrella = ((x === 7 || x === 8) && y >= 3 && y <= 12) || ((y === 7 || y === 8) && x >= 3 && x <= 12);
            s += borde ? 'd' : estrella ? 's' : (x < 3 || y < 3) ? 'l' : 'g';
        }
        f.push(s);
    }
    return f;
}
const FLOR = ['..dd....', '.drrd...', 'drryrrd.', 'drryrrd.', '.drrd...', '...g....', '..gg....', '...g....'];
const COL_FLOR = { d: '#8a0014', r: '#e8203a', y: '#ffd84a', g: '#3f9e3f' };

// El bloque en las manos del jugador (coordenadas de su cuerpo) y arriba, con los brazos en alto
const EN_MANOS = [0, 1.26, 0.95];
const EN_ALTO = [0, 2.3, 0.3];

export function momento(info = {}) {
    const pareja = info.base === 'lona';
    const st = {};
    // Yaw de la pareja: de lado (mismo sentido) entre 0.6 y 1.2 s; vuelven a mirarse entre 6.8 y 7.8 s
    const deLado = t => suave(tramo(t, 0.6, 1.2)) * (1 - suave(tramo(t, 6.8, 7.8)));

    const gestos = {
        teclea: (u, t) => { const s = Math.sin(t * 16) * 0.15; return { cx: 0.3, bDx: -1.15 - s, bDz: 0.25, bIx: -1.15 + s, bIz: -0.25 }; },
        sostiene: () => ({ bDx: -1.25, bDz: 0.45, bIx: -1.25, bIz: -0.45, cx: 0.25 }),
        alza: u => ({ bDx: -2.85, bDz: 0.25, bIx: -2.85, bIz: -0.25, cx: -0.35, salto: Math.abs(Math.sin(u * Math.PI * 3)) * 0.15 }),
        tomados: (u, t, i) => (i.j ? { bDx: -0.2, bDz: -0.3 } : { bIx: -0.2, bIz: 0.3 }),
        flor: () => ({ bDx: -1.2, bDz: 0.2, cx: 0.15 }),
        recibe: () => ({ bDx: -1.1, bDz: -0.15, cx: 0.1 }),
        abrazoL: (u, t, i) => {
            const k = env(u, 0, 1, 0.2), beso = env(u, 0.5, 0.8, 0.1);
            const meta = { bDx: -1.45 * k, bDz: 0.8 * k, bIx: -1.45 * k, bIz: -0.8 * k, pz: 0.22 * k };
            return i.j ? { ...meta, cz: 0.15 * k, cy: -0.2 * k } : { ...meta, cy: (0.45 + 0.1 * beso) * k, cz: -0.15 * k, cx: 0.2 * k };
        }
    };

    if (!pareja) {
        // Normal: el bloque sale entre los dos, gira, vuela a las manos del jugador y sube con él
        return {
            T: 16, r: 1.3,
            lineas: LINEAS,
            pista: {
                n: [['teclea', 1.0, 5.5], ['habla', 5.5, 7.4], ['pasa', 7.4, 9.2], ['habla', 9.2, 12.8], ['brazosArriba', 12.8, 15.4]],
                j: [['sorpresa', 6.6, 7.4], ['sostiene', 7.4, 12.6], ['alza', 12.6, 15.4]]
            },
            gestos,
            golpes: [],
            corazones: [],
            extra: {
                iniciar(api) {
                    st.bloque = api.caja(0.44, 0.44, 0.44, null, { filas: filasBloque(), colores: COL_BLOQUE });
                    st.bloque.visible = false;
                    api.pegar(st.bloque);
                },
                cuadro(api) {
                    const t = api.e.t, b = st.bloque, THREE = api.THREE;
                    if (!b) return;
                    if (t < 5.5) { b.visible = false; if (b.parent !== api.grupo) api.soltar(b); return; }
                    b.visible = true;
                    const n = api.posG('n'), j = api.posG('j');
                    const medio = { x: (n.x + j.x) / 2, y: (n.y + j.y) / 2 + 1.3, z: (n.z + j.z) / 2 };
                    if (t < 8.0) {
                        if (b.parent !== api.grupo) api.soltar(b);
                        b.position.set(medio.x, medio.y, medio.z);
                        b.rotation.set(0, (t - 5.5) * 1.6, 0);
                        b.scale.setScalar(suave(tramo(t, 5.5, 5.9)));
                    } else if (t < 9.0) {
                        // Vuela a las manos del jugador: el destino se calcula cada cuadro (el jugador está quieto)
                        const cu = api.actor('j').p.cuerpo;
                        cu.updateWorldMatrix(true, false);
                        const dest = api.grupo.worldToLocal(cu.localToWorld(new THREE.Vector3(...EN_MANOS)));
                        const u = suave(tramo(t, 8.0, 9.0));
                        if (b.parent !== api.grupo) api.soltar(b);
                        b.position.set(lerp(medio.x, dest.x, u), lerp(medio.y, dest.y, u) + Math.sin(Math.PI * u) * 0.6, lerp(medio.z, dest.z, u));
                        b.rotation.set(0, 0, 0);
                        b.scale.setScalar(1);
                    } else {
                        if (b.parent !== api.actor('j').p.cuerpo) api.pegar(b, 'j', 'cuerpo', EN_MANOS, [0, 0, 0]);
                        b.scale.setScalar(1);
                        const k = suave(tramo(t, 12.8, 13.6));
                        b.position.set(...EN_MANOS.map((v, i) => lerp(v, EN_ALTO[i], k)));
                        b.rotation.set(0, 0, 0);
                    }
                    if (t >= 5.5 && !api.e.hechos.has('chB')) { api.e.hechos.add('chB'); api.golpe(medio); }
                    if (t >= 13.0 && !api.e.hechos.has('chL')) {
                        api.e.hechos.add('chL');
                        api.golpe(api.grupo.worldToLocal(b.getWorldPosition(new THREE.Vector3())));
                    }
                }
            }
        };
    }

    // Pareja: de lado, tomados de la mano; luego una flor y un abrazo con beso en la mejilla
    return {
        T: 16, r: 1.2,
        lineas: LINEAS_PAREJA,
        pista: {
            n: [['tomados', 0.6, 7.6], ['flor', 8.2, 10.2], ['abrazoL', 11.0, 15.0]],
            j: [['tomados', 0.6, 7.6], ['recibe', 9.8, 11.0], ['abrazoL', 11.0, 15.0]]
        },
        gestos,
        yaw: { n: t => -Math.PI / 2 * deLado(t), j: t => Math.PI / 2 * deLado(t) },
        corazones: [12.0, 13.0, 14.0],
        golpes: [],
        extra: {
            iniciar(api) {
                st.flor = api.sprite(FLOR, COL_FLOR, 0.42);
                st.flor.visible = false;
                api.pegar(st.flor);
            },
            cuadro(api) {
                const t = api.e.t, f = st.flor, THREE = api.THREE;
                if (!f) return;
                if (t < 8.2) { f.visible = false; if (f.parent !== api.grupo) api.soltar(f); return; }
                f.visible = true;
                if (t < 10.0) {
                    if (f.parent !== api.actor('n').p.brazoD) api.pegar(f, 'n', 'brazoD', [0, -0.7, 0.12]);
                } else if (t < 10.4) {
                    // Pasa de la mano de Venjy a la del jugador: interpola en coordenadas del grupo
                    if (f.parent !== api.grupo) api.soltar(f);
                    const a = api.punta(api.actor('n'), 'D', new THREE.Vector3()), c = api.punta(api.actor('j'), 'D', new THREE.Vector3());
                    const u = suave(tramo(t, 10.0, 10.4));
                    f.position.set(lerp(a.x, c.x, u), lerp(a.y, c.y, u), lerp(a.z, c.z, u));
                } else if (f.parent !== api.actor('j').p.brazoD) {
                    api.pegar(f, 'j', 'brazoD', [0, -0.7, 0.12]);
                }
            }
        }
    };
}
