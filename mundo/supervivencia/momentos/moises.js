// =========================================================
// VENJY · Supervivencia · Momento especial de Moisés: «Monito de nieve» (bloque 6b-2)
// escena-amistad.js lo carga con import() solo al usarlo (botón «Momento especial» de «Hablar» con la amistad en 100).
// momento(info) devuelve el guion (formato en la cabecera de escena-amistad.js); info.base = clave de la base de tu skin.
// Guion de tiempos (lo programa la skill animaciones-minecraft):
//   Es dentro del iglú, con Lalo (actor extra 'lalo').
//   0.8-7.0 Moisés se agacha y arma bolas de nieve (gesto propio `arma`: inclinado con piernas compensadas, las dos manos abajo juntas haciendo círculos). Aparecen tres cajas blancas apiladas entre él y el jugador, a un costado: base 0.5 en 2.5, medio 0.38 en 4.0, cabeza 0.28 en 5.5 (cada una crece desde 0 con suave); en 6.5 una nariz naranja chica (zanahoria) y dos ojos negros.
//   7.0-9.6 Moisés se levanta y habla.
//   3.8-6.6 Lalo se ríe (risa) mirando a Moisés; 12.2-13.0 Lalo se toca el sombrero con la mano (gesto propio `sombrero`: brazo derecho arriba con la mano sobre el ala) y 13.0-15.4 los tres levantan los brazos (brazosArriba).
//   9.6-12.0 el jugador señala el monito (senala, gesto propio) y luego su cabeza (yo).
//   El monito desaparece al terminar.
// Son personas reales: siempre en buena onda; el dueño revisa los textos antes del merge.
// =========================================================
const t = (es, en) => ({ es, en });

// Frases (únicas en todo el juego; las comprueba mundo/tests/amistad.mjs)
export const LINEAS = [
    { q: 'n', a: 0.8, d: 2.8, texto: t("Hermano, en Coyhaique hacíamos monitos de nieve más grandes que nosotros.", "Bro, in Coyhaique we made snowmen bigger than us.") },
    { q: 'lalo', a: 3.8, d: 2.8, texto: t("Ahya, y el Moisés siempre le ponía la nariz chueca.", "Ahya, and Moisés always put the nose on crooked.") },
    { q: 'n', a: 6.8, d: 2.6, texto: t("Esta vez quedó derechita. Es el monito de los tres.", "This time it is nice and straight. It is the snowman of the three of us.") },
    { q: 'j', a: 9.6, d: 2.4, texto: t("Le falta un sombrero, ¿no?", "It needs a hat, right?") },
    { q: 'lalo', a: 12.2, d: 2.8, texto: t("Ahya, que no sea el mío, que ese tiene historia.", "Ahya, just not mine, that one has history.") }
];

// Pose de cada gesto propio (u = 0..1 en su tramo, t = reloj de la escena). Rangos: rig.md
const suaveT = (u, a, b) => Math.max(0, Math.min(1, (u - a) / (b - a)));

const GESTOS = {
    // Agachado para armar bolas: torso inclinado 0.6 con piernas compensadas; manos abajo juntas, girando en círculo
    arma: (u, t) => {
        const phi = 0.6, c = Math.sin(t * 5), k = Math.cos(t * 5);
        return { inc: phi, pDx: -phi, pIx: -phi, y: 0.75 * (1 - Math.cos(phi)), bDx: -0.6 + 0.12 * c, bIx: -0.6 + 0.12 * c, bDz: 0.22 + 0.15 * k, bIz: -(0.22 + 0.15 * k), cx: 0.35 };
    },
    // El jugador señala hacia su derecha (donde está el monito), con la cabeza girada hacia ahí
    senala: (u, t) => ({ bDx: -1.0 + 0.05 * Math.sin(t * 6), bDz: -0.75, cx: 0.1, cy: -0.5 }),
    // Lalo se toca el ala del sombrero con la mano derecha (la mano queda sobre el borde, arriba del lado derecho de la cabeza)
    sombrero: (u, t) => ({ bDx: -2.6, bDz: 0.45, cx: 0.1 })
};

export function momento(info = {}) {
    return {
        T: 16, r: 1.6, actores: { lalo: 'lalo' },
        lineas: LINEAS,
        pista: {
            n: [['arma', 0.8, 7.0], ['habla', 7.0, 9.6], ['brazosArriba', 13.0, 15.4]],
            j: [['senala', 9.6, 10.9], ['yo', 10.9, 12.0], ['brazosArriba', 13.0, 15.4]],
            lalo: [['risa', 3.8, 6.6], ['sombrero', 12.2, 13.0], ['brazosArriba', 13.0, 15.4]]
        },
        gestos: GESTOS,
        rapidez: 9,
        extra: { iniciar, cuadro }
    };
}

// ---- Monito de nieve (objetos de la escena: se borran solos al terminar) ----
const BLANCO = '#f4f8ff', NARANJA = '#ff8a1e', NEGRO = '#161616';
let piezas = [];

function iniciar(api) {
    const T3 = api.THREE;
    const M = api.posG('n');                     // pies de Moisés (coordenadas del grupo)
    const J = api.jugador.pos;                   // jugador (mundo; x, z igual que el grupo)
    const suelo = M.y;
    // Dirección del jugador hacia Moisés y su derecha (mirando hacia Moisés)
    const ax = M.x - J.x, az = M.z - J.z, al = Math.hypot(ax, az) || 1;
    const fx = ax / al, fz = az / al;            // del jugador hacia Moisés
    const dx = -fz, dz = fx;                     // derecha del jugador (mirando hacia Moisés)
    // Monito: entre los dos, a un costado (0.6 a la derecha del jugador)
    const bx = J.x + ax * 0.5 + dx * 0.6, bz = J.z + az * 0.5 + dz * 0.6;
    // Hacia dónde mira el monito: hacia el jugador
    const sx = J.x - bx, sz = J.z - bz, sl = Math.hypot(sx, sz) || 1;
    const giro = Math.atan2(sx / sl, sz / sl);
    const cajas = [
        { m: api.caja(0.5, 0.5, 0.5, BLANCO), t0: 2.5, dur: 0.6, x: bx, y0: suelo, z: bz, h: 0.5 },
        { m: api.caja(0.38, 0.38, 0.38, BLANCO), t0: 4.0, dur: 0.6, x: bx, y0: suelo + 0.5, z: bz, h: 0.38 },
        { m: api.caja(0.28, 0.28, 0.28, BLANCO), t0: 5.5, dur: 0.6, x: bx, y0: suelo + 0.88, z: bz, h: 0.28 }
    ];
    // Cara en la cabeza (la cabeza va de suelo + 0.88 a suelo + 1.16): nariz hacia el jugador y dos ojos
    const cy = suelo + 1.02, px = -sz / sl, pz = sx / sl; // (px, pz): derecha del monito
    const cara = [
        { m: api.caja(0.06, 0.06, 0.22, NARANJA), t0: 6.5, dur: 0.4, x: bx + sx / sl * 0.18, y0: cy, z: bz + sz / sl * 0.18, h: null, giro },
        { m: api.caja(0.07, 0.07, 0.07, NEGRO), t0: 6.5, dur: 0.4, x: bx + sx / sl * 0.15 + px * 0.1, y0: cy + 0.1, z: bz + sz / sl * 0.15 + pz * 0.1, h: null },
        { m: api.caja(0.07, 0.07, 0.07, NEGRO), t0: 6.5, dur: 0.4, x: bx + sx / sl * 0.15 - px * 0.1, y0: cy + 0.1, z: bz + sz / sl * 0.15 - pz * 0.1, h: null }
    ];
    piezas = [...cajas, ...cara];
    for (const p of piezas) {
        api.pegar(p.m, null, null, [p.x, p.y0, p.z], p.giro !== undefined ? [0, p.giro, 0] : [0, 0, 0]);
        p.m.visible = false;
    }
}

function cuadro(api) {
    const t = api.e.t;
    for (const p of piezas) {
        const k = suaveT(t, p.t0, p.t0 + p.dur);
        const s = k * k * (3 - 2 * k);           // suave: crece desde 0
        p.m.visible = s > 0.01;
        p.m.scale.setScalar(Math.max(s, 0.0001));
        // Las cajas crecen desde su base; la nariz y los ojos, desde su centro
        p.m.position.set(p.x, p.h ? p.y0 + p.h * s / 2 : p.y0, p.z);
    }
}
