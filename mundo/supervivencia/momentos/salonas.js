// =========================================================
// VENJY · Supervivencia · Momento especial de Salonas: «Solo de bajo» (bloque 6b-2)
// escena-amistad.js lo carga con import() solo al usarlo (botón «Momento especial» de «Hablar» con la amistad en 100).
// momento(info) devuelve el guion (formato en la cabecera de escena-amistad.js); info.base = clave de la base de tu skin.
// Guion de tiempos (lo programa la skill animaciones-minecraft):
//   En el escenario, con Conejeros (actor extra 'conejeros'). Salonas ya tiene su bajo (salonas.instrumento): no lo toques, solo mueve los brazos.
//   0.8-3.6 Salonas habla (sin gesto: sus brazos ya están en la pose del bajo).
//   3.6-10.5 Salonas toca un solo (gesto propio `solo`: mano derecha rasgueando rápido a la altura de la cadera, izquierda al costado moviéndose por el mástil, cabeza que cabecea, torso que se balancea).
//   Notas musicales (api.sprite con una corchea píxel negra/blanca) que suben desde Salonas cada 0.5 s entre 3.6 y 10.1 (cada una dura 1.4 s).
//   4.0-10.5 el jugador y Conejeros cabecean (cabecea de escenas-skin.js).
//   10.6-11.2 los tres saltan juntos (brinco) con chispa (golpe en 10.8). 11.0-13.8 Salonas hace la pose rockera (gesto propio `rockera`: brazo derecho arriba, cabeza hacia atrás).
//   13.9-15.9 Conejeros habla; 14.5-15.6 los tres cabecean.
// Son personas reales: siempre en buena onda; el dueño revisa los textos antes del merge.
// =========================================================
const t = (es, en) => ({ es, en });

// Frases (únicas en todo el juego; las comprueba mundo/tests/amistad.mjs)
export const LINEAS = [
    { q: 'n', a: 0.8, d: 2.6, texto: t("Compadre, compuse un solo nuevo. Eres el primero en escucharlo.", "Mate, I wrote a new solo. You are the first to hear it.") },
    { q: 'conejeros', a: 3.6, d: 2.6, texto: t("¡Eso, Salonas! ¡Más fuerte!", "Yes, Salonas! Louder!") },
    { q: 'j', a: 6.6, d: 2.8, texto: t("¡Esto tiene que salir en un disco!", "This has to be on an album!") },
    { q: 'n', a: 10.8, d: 3.0, texto: t("Entonces el disco lleva tu nombre en la portada, dibujado por el Conejeros.", "Then the album has your name on the cover, drawn by Conejeros.") },
    { q: 'conejeros', a: 13.9, d: 2.0, texto: t("Ya lo estoy imaginando: tú con lentes de sol y un conejo.", "I can already picture it: you in sunglasses and a rabbit.") }
];

const suaveT = (u, a, b) => Math.max(0, Math.min(1, (u - a) / (b - a)));

const GESTOS = {
    // Solo de bajo: la derecha rasguea rápido, la izquierda se desliza por el mástil, cabeza y torso se mueven
    solo: (u, t) => ({
        bDx: -0.62 - 0.14 * Math.abs(Math.sin(t * 14)),
        bDz: 0.3 + 0.05 * Math.sin(t * 14),
        bIx: -1.05,
        bIz: 0.5 + 0.22 * Math.sin(t * 2.4),
        cx: 0.1 + 0.12 * Math.abs(Math.sin(t * 4.8)),
        rz: 0.05 * Math.sin(t * 2.6),
        inc: 0.04
    }),
    // Salto de los tres (la altura sube y baja)
    brinco: (u) => ({ salto: 0.5 * Math.sin(suaveT(u, 0, 1) * Math.PI) }),
    // Pose rockera: brazo derecho arriba, cabeza hacia atrás
    rockera: (u, t) => ({ bDx: -2.8 + 0.1 * Math.sin(t * 16), bDz: -0.3, bIx: -0.1, bIz: -0.1, cx: -0.3 })
};

export function momento(info = {}) {
    return {
        T: 16, r: 1.7, actores: { conejeros: 'conejeros' },
        lineas: LINEAS,
        pista: {
            n: [['solo', 3.6, 10.5], ['brinco', 10.6, 11.2], ['rockera', 11.2, 13.8], ['cabecea', 14.5, 15.6]],
            j: [['cabecea', 4.0, 10.5], ['brinco', 10.6, 11.2], ['cabecea', 14.5, 15.6]],
            conejeros: [['cabecea', 4.0, 10.5], ['brinco', 10.6, 11.2], ['cabecea', 14.5, 15.6]]
        },
        gestos: GESTOS,
        golpes: [10.8],
        extra: { iniciar, cuadro }
    };
}

// ---- Notas musicales que suben desde Salonas (objetos de la escena: se borran solos al terminar) ----
const CORCHEA = ['.....k', '.....k', '....kk', '....k.', '....k.', '.kkk..', 'kkkk..', '.kk...'];
let notas = [];

function iniciar(api) {
    notas = [];
    for (let i = 0; i < 14; i++) {
        const s = api.sprite(CORCHEA, { k: i % 2 ? '#161616' : '#ffffff' }, 0.45);
        api.pegar(s, null, null, [0, 0, 0]);
        s.visible = false;
        notas.push(s);
    }
}

function cuadro(api) {
    const t = api.e.t;
    const base = api.posG('n');
    if (!base) return;
    notas.forEach((s, i) => {
        const b = 3.6 + i * 0.5, u = (t - b) / 1.4;
        if (u < 0 || u >= 1) { s.visible = false; return; }
        s.visible = true;
        s.material.opacity = 1 - suaveT(u, 0.6, 1);
        s.position.set(base.x + (i % 2 ? 0.3 : -0.3) * u, base.y + 2.1 + 1.2 * u, base.z);
    });
}
