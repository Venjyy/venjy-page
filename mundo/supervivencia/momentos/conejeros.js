// =========================================================
// VENJY · Supervivencia · Momento especial de Conejeros: «Dibujo .exe» (bloque 6b-2)
// escena-amistad.js lo carga con import() solo al usarlo (botón «Momento especial» de «Hablar» con la amistad en 100).
// momento(info) devuelve el guion (formato en la cabecera de escena-amistad.js); info.base = clave de la base de tu skin.
// Guion de tiempos (lo programa la skill animaciones-minecraft):
//   En el escenario, con Salonas (actor extra 'salonas').
//   0.8-6.0 Conejeros dibuja en el aire con el dedo (gesto propio `dibuja`: brazo derecho estirado al frente que traza un círculo con bDx/bDz; cabeza que sigue la mano).
//   3.0-5.2 entre los dos, a la altura de la cabeza, aparece de a poco un dibujo píxel (api.sprite 12×12 con trazo negro sobre transparente: una cara con orejas de conejo, en tres capas que se revelan 3.0, 4.2 y 5.2) que flota y se balancea.
//   8.8-11.2 Conejeros se «pega» como un programa colgado (gesto propio `lag`: congelado en una pose rara con un temblor cuadrado, rz y cx que saltan entre 2 valores cada 0.1 s).
//   11.0-11.8 el jugador le da un golpecito en el hombro (gesto propio `golpecito`: brazo derecho estirado; chispa en 11.3) y vuelve a la normalidad.
//   8.8-11.4 Salonas asiente; 14.5-15.6 los tres cabecean (cabecea). El dibujo desaparece al terminar.
// Son personas reales: siempre en buena onda; el dueño revisa los textos antes del merge.
// =========================================================
const t = (es, en) => ({ es, en });

// Frases (únicas en todo el juego; las comprueba mundo/tests/amistad.mjs)
export const LINEAS = [
    { q: 'n', a: 0.8, d: 2.6, texto: t("Quédate quieto, que te voy a dibujar. No, no te muevas.", "Stay still, I am going to draw you. No, don't move.") },
    { q: 'j', a: 3.6, d: 2.4, texto: t("¿Y cómo dibujas en el aire?", "And how do you draw in the air?") },
    { q: 'n', a: 6.2, d: 2.4, texto: t("Talento .exe. ¡Listo! Eres tú, pero con orejas de conejo.", "Talent.exe. Done! It's you, but with bunny ears.") },
    { q: 'salonas', a: 8.8, d: 2.6, texto: t("Se le pegó otra vez. Dale un golpecito.", "He froze again. Give him a little tap.") },
    { q: 'n', a: 11.6, d: 2.8, texto: t("Ya volví. Este dibujo va al lado del conejo con lentes, en la galería de tonteras.", "I am back. This drawing goes next to the rabbit with glasses, in the nonsense gallery.") }
];

const suaveT = (u, a, b) => Math.max(0, Math.min(1, (u - a) / (b - a)));

const GESTOS = {
    // Dibuja un círculo en el aire con el brazo derecho; la cabeza sigue la mano
    dibuja: (u, t) => {
        const a = t * 2.2;
        return { bDx: -1.3 + 0.15 * Math.cos(a), bDz: 0.15 + 0.3 * Math.sin(a), bIx: -0.15, bIz: -0.1, cx: 0.2 + 0.05 * Math.sin(a), cy: 0.2 * Math.sin(a) };
    },
    // Pose congelada con un temblor cuadrado (un programa colgado)
    lag: (u, t) => {
        const s = Math.floor(t * 10) % 2;
        return { bDx: -2.0, bDz: 0.5, bIx: 0.2, bIz: 0.4, pDx: -0.3, pIx: -0.1, inc: 0.15, rz: s ? 0.12 : -0.12, cx: s ? 0.3 : -0.2 };
    },
    // El jugador estira el brazo derecho y toca el hombro de Conejeros (inclinado, con las piernas compensadas)
    golpecito: () => ({ bDx: -1.6, bDz: 0.05, inc: 0.3, pDx: -0.3, pIx: -0.3, y: 0.034, cx: 0.1 })
};

// Dibujo píxel 12×12 (trazo negro sobre transparente), en tres capas de 4 filas que se revelan una tras otra
const DIBUJO = [
    'k.k......k.k',
    'k.k......k.k',
    'k.k......k.k',
    'kkkkkkkkkkkk',
    'k..........k',
    'k..k....k..k',
    'k..........k',
    'k.....kk...k',
    'k..........k',
    'k..........k',
    '.k........k.',
    '..kkkkkkkk..'
];
const CAPAS = [0, 4, 8].map(desde => DIBUJO.map((f, i) => (i >= desde && i < desde + 4 ? f : '............')));
const REVELA = [3.0, 4.2, 5.2];

export function momento(info = {}) {
    return {
        T: 16, r: 1.4, actores: { salonas: 'salonas' },
        lineas: LINEAS,
        pista: {
            n: [['dibuja', 0.8, 6.0], ['habla', 6.2, 8.6], ['lag', 8.8, 11.2], ['habla', 11.6, 14.4], ['cabecea', 14.5, 15.6]],
            j: [['golpecito', 11.0, 11.8], ['cabecea', 14.5, 15.6]],
            salonas: [['asiente', 8.8, 11.4], ['cabecea', 14.5, 15.6]]
        },
        gestos: GESTOS,
        rapidez: 22,
        extra: { iniciar, cuadro }
    };
}

// ---- Dibujo flotante y golpe en el hombro (objetos de la escena: se borran solos al terminar) ----
let capas = [], centro = null;

function iniciar(api) {
    const N = api.posG('n'), J = api.posG('j');
    centro = N && J ? { x: (N.x + J.x) / 2, y: (N.y + J.y) / 2 + 1.9, z: (N.z + J.z) / 2 } : null;
    capas = CAPAS.map(filas => {
        const s = api.sprite(filas, { k: '#161616' }, 0.9);
        api.pegar(s, null, null, [0, 0, 0]);
        s.visible = false;
        return s;
    });
}

function cuadro(api) {
    const t = api.e.t;
    if (centro) {
        const flota = 0.06 * Math.sin(t * 2.2);
        capas.forEach((s, i) => {
            const u = suaveT(t, REVELA[i], REVELA[i] + 0.3);
            s.visible = u > 0;
            s.material.opacity = u;
            s.position.set(centro.x + 0.05 * Math.sin(t * 1.3), centro.y + flota, centro.z);
        });
    }
    // Chispa en el hombro (una sola vez por pasada; irA la vuelve a permitir)
    if (t >= 11.3 && !api.e.hechos.has('hombro')) {
        api.e.hechos.add('hombro');
        api.golpe(api.punta(api.actor('j'), 'D', new api.THREE.Vector3(0, -0.75, 0)));
    }
}
