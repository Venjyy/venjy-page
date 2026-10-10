// =========================================================
// VENJY · Supervivencia · Momento especial de Boris: «Pentakill» (bloque 6b-2)
// escena-amistad.js lo carga con import() solo al usarlo (botón «Momento especial» de «Hablar» con la amistad en 100).
// momento(info) devuelve el guion (formato en la cabecera de escena-amistad.js); info.base = clave de la base de tu skin.
// Guion de tiempos (lo programa la skill animaciones-minecraft):
//   1.0-3.6 Boris da un hachazo grande (ya lleva su hacha; usa el gesto `hachazo` de escenas-skin.js o uno propio más amplio) sobre un tronco que aparece entre los dos a un costado (api.caja 0.5×0.6×0.5 con textura de madera); en 3.0 el tronco se parte en dos mitades que se separan y caen (golpe en 3.0).
//   3.8-6.4 el jugador aplaude (gesto propio `aplaude`: manos juntas al frente que chocan rápido).
//   9.2-12.8 los dos «juegan LoL»: gesto propio `juega` (brazo izquierdo al frente bajo tecleando rápido, derecho al costado moviendo el mouse con círculos chicos; cabeza un poco abajo); chispas chicas cada ~0.8 s entre los dos.
//   12.8-15.6 Boris celebra con los brazos arriba (brazosArriba) y el jugador también (13.0-14.6). Las mitades del tronco desaparecen al terminar.
// Son personas reales: siempre en buena onda; el dueño revisa los textos antes del merge.
// =========================================================
const t = (es, en) => ({ es, en });

// Frases (únicas en todo el juego; las comprueba mundo/tests/amistad.mjs)
export const LINEAS = [
    { q: 'n', a: 0.8, d: 2.6, texto: t("Mira esto: un solo hachazo y el tronco se parte en dos.", "Watch this: one swing and the log splits in two.") },
    { q: 'j', a: 3.8, d: 2.6, texto: t("¡Uf! Eso fue limpio.", "Whoa! That was clean.") },
    { q: 'n', a: 6.6, d: 2.6, texto: t("Ahora lo importante: una partida de LoL, tú y yo, como en mi pieza.", "Now the important part: a round of LoL, you and me, like in my room.") },
    { q: 'n', a: 12.8, d: 2.8, texto: t("¡Pentakill! Esa va directo al grupo, para que la vean todos.", "Pentakill! That one goes straight to the group chat, for everyone to see.") }
];


// ---------------------------------------------------------
// Gestos, objetos y efectos propios de Boris (todo dentro de momento(), así cada llamada empieza limpia)
// ---------------------------------------------------------
const suave = u => u * u * (3 - 2 * u);
const lim = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const tramo = (u, a, b) => lim((u - a) / (b - a), 0, 1);

const MADERA = ['ddbbbbdd', 'dbcccbbd', 'bccdccbb', 'bcdccccb', 'bccccdcb', 'bbccdccb', 'dbbcccbd', 'ddbbbbdd'];
const COL_MADERA = { b: '#7a5230', c: '#9a6a3e', d: '#4a2f18' };

export function momento(info = {}) {
    let C = null, dir = null, medio = null, tronco = null, mitades = [];
    return {
        T: 16, r: 1.6,
        lineas: LINEAS,
        pista: {
            n: [['tajo', 0.9, 3.6], ['habla', 6.6, 9.2], ['juega', 9.2, 12.8], ['brazosArriba', 12.8, 15.6]],
            j: [['aplaude', 3.8, 6.4], ['juega', 9.2, 12.8], ['brazosArriba', 13.0, 14.6]]
        },
        gestos: {
            // Hachazo grande: arma el hacha sobre la cabeza (0.9-2.5), cae sobre el tronco en 3.0 y vuelve
            tajo: (u, t) => {
                const subir = suave(tramo(t, 0.9, 2.5)), caer = suave(tramo(t, 2.5, 3.0));
                const a = t < 2.5 ? lerp(-0.6, -2.95, subir) : lerp(-2.95, -0.75, caer);
                return { bDx: a, bIx: a, bDz: 0.15, bIz: -0.15, inc: 0.2 * Math.sin(tramo(t, 2.6, 3.4) * Math.PI) };
            },
            // Aplauso: manos al frente que se juntan y se separan rápido (cada ~0.45 s)
            aplaude: (u, t) => {
                const k = 0.06 + 0.2 * (1 + Math.sin(t * 14)) / 2;
                return { bDx: -1.45, bIx: -1.45, bDz: k, bIz: -k, cx: 0.1 };
            },
            // Jugar LoL: la izquierda tecleando al frente, la derecha al costado moviendo el mouse en círculos chicos
            juega: (u, t) => ({
                bIx: -1.1 + Math.sin(t * 22) * 0.06, bIz: -0.3,
                bDx: -0.3 + Math.sin(t * 12) * 0.08, bDz: -0.2 + Math.cos(t * 12) * 0.12,
                cx: 0.25, inc: 0.1
            })
        },
        extra: {
            // Tronco entre los dos, a un costado; el tronco se parte en 3.0
            iniciar(api) {
                const n = api.posG('n'), j = api.posG('j');
                const dx = j.x - n.x, dz = j.z - n.z, L = Math.hypot(dx, dz) || 1;
                const ux = dx / L, uz = dz / L;
                dir = { px: -uz, pz: ux };
                C = { x: n.x + ux * 0.6 + dir.px * 0.25, y: n.y, z: n.z + uz * 0.6 + dir.pz * 0.25 };
                medio = { x: (n.x + j.x) / 2, y: n.y + 1.3, z: (n.z + j.z) / 2 };
                const tex = { filas: MADERA, colores: COL_MADERA };
                tronco = api.pegar(api.caja(0.5, 0.6, 0.5, null, tex), null, null, [C.x, C.y + 0.3, C.z]);
                mitades = [0, 1].map(() => {
                    const m = api.pegar(api.caja(0.25, 0.6, 0.5, null, tex), null, null, [C.x, C.y + 0.3, C.z]);
                    m.visible = false;
                    return m;
                });
            },
            // Se calcula desde api.e.t (sirve también hacia atrás con irA)
            cuadro(api) {
                const t = api.e.t;
                if (!tronco) return;
                tronco.visible = t < 3.0;
                const f = Math.max(0, t - 3.0), sep = 0.12 + Math.min(f, 0.8) * 0.6;
                mitades.forEach((m, i) => {
                    const lado = i ? 1 : -1;
                    m.visible = t >= 3.0;
                    m.position.set(C.x + dir.px * lado * sep, C.y + 0.3, C.z + dir.pz * lado * sep);
                    m.rotation.z = lado * Math.min(0.7, f * 1.6);
                });
                if (t >= 3.0 && !api.e.hechos.has('tronco')) { api.e.hechos.add('tronco'); api.golpe({ x: C.x, y: C.y + 0.9, z: C.z }); }
                for (const s of [9.6, 10.4, 11.2, 12.0]) {
                    if (t >= s && !api.e.hechos.has('ch' + s)) { api.e.hechos.add('ch' + s); api.efecto('chispa', medio.x, medio.y, medio.z, { tam: 0.22 }); }
                }
            }
        }
    };
}
