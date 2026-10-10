// =========================================================
// VENJY · Supervivencia · Momento especial de Lalo: «El sombrero» (bloque 6b-2)
// escena-amistad.js lo carga con import() solo al usarlo (botón «Momento especial» de «Hablar» con la amistad en 100).
// momento(info) devuelve el guion (formato en la cabecera de escena-amistad.js); info.base = clave de la base de tu skin.
// Guion de tiempos (lo programa la skill animaciones-minecraft):
//   Es dentro del iglú, con Moisés (actor extra 'moises').
//   El sombrero de paja de Lalo son 3 mallas hijas de su `cuello` (ala en y 0.5, copa en y 0.62, cinta en y 0.56; ver pieles.js, tipo 'paja'). Se buscan entre los hijos del cuello con position.y entre 0.45 y 0.7 y se mueven con api.prestar (vuelven solas a su cabeza al terminar).
//   0.8-3.6 Lalo habla; 3.8-6.4 Moisés lo mira con los brazos cruzados (gesto propio `cruza`).
//   4.5-6.0 Lalo se saca el sombrero con la mano derecha (gesto propio `saca`; el sombrero sube y pasa a la mano); 6.0-7.6 se lo pone al jugador (pasa a su cuello, a la misma altura que lo llevaba Lalo).
//   7.0-9.6 Lalo habla; 9.8-12.0 el jugador se toca el ala con las dos manos (gesto propio `ala`).
//   12.2-14.4 Lalo y el jugador hacen la pose «ahya» (gesto propio `ahya`: brazos cruzados y cabeceo lento); Moisés asiente (gesto propio `asiente`, lento).
//   14.4-15.6 Lalo recupera el sombrero (gesto propio `recupera`): el jugador se lo quita y vuelve a su cabeza antes del final.
// Son personas reales: siempre en buena onda; el dueño revisa los textos antes del merge.
// =========================================================
const t = (es, en) => ({ es, en });

// Frases (únicas en todo el juego; las comprueba mundo/tests/amistad.mjs)
export const LINEAS = [
    { q: 'n', a: 0.8, d: 2.8, texto: t("Ahya, este sombrero me acompaña desde Coyhaique. Nunca se lo presto a nadie.", "Ahya, this hat has been with me since Coyhaique. I never lend it to anyone.") },
    { q: 'moises', a: 3.8, d: 2.6, texto: t("¿Nunca? A mí no me lo has pasado ni una vez.", "Never? You haven't passed it to me even once.") },
    { q: 'n', a: 7.0, d: 2.6, texto: t("Por eso mismo. Hoy te lo pongo a ti, hermano.", "Exactly. Today I am putting it on you, bro.") },
    { q: 'j', a: 9.8, d: 2.2, texto: t("¿En serio? Me queda gigante.", "Seriously? It is huge on me.") },
    { q: 'n', a: 12.2, d: 3.0, texto: t("Ahya, te queda perfecto. Ahora eres parte del iglú para siempre.", "Ahya, it fits you perfectly. Now you are part of the igloo forever.") }
];

const suaveT = (u, a, b) => Math.max(0, Math.min(1, (u - a) / (b - a)));
const lerp = (a, b, k) => a + (b - a) * k;
const suave = u => u * u * (3 - 2 * u);

const GESTOS = {
    // Saca el sombrero: brazo derecho arriba sobre la cabeza y luego baja hacia el jugador
    saca: (u) => ({ bDx: lerp(-2.6, -1.3, suaveT(u, 0.5, 1)), bDz: lerp(0.45, 0.2, suaveT(u, 0.5, 1)), cx: -0.1 }),
    // Brazos cruzados sobre el pecho (Moisés mirando)
    cruza: () => ({ bDx: -0.3, bDz: 0.85, bIx: -0.3, bIz: -0.85, cx: 0.05 }),
    // El jugador se toca el ala con las dos manos (arriba, a los lados de la cabeza)
    ala: () => ({ bDx: -2.5, bDz: 0.5, bIx: -2.5, bIz: -0.5, cx: 0.1 }),
    // Pose «ahya»: brazos cruzados y cabeceo lento
    ahya: (u, t) => ({ bDx: -0.5, bDz: 0.85, bIx: -0.5, bIz: -0.85, cx: 0.12 + 0.12 * Math.sin(t * 2.2) }),
    // Lalo recupera el sombrero: brazo derecho estirado hacia el jugador
    recupera: () => ({ bDx: -1.5, bDz: 0.2, cx: 0.1 }),
    // Moisés asiente despacio
    asiente: (u, t) => ({ cx: 0.08 + Math.max(0, Math.sin(t * 3)) * 0.3 })
};

export function momento(info = {}) {
    return {
        T: 16, r: 1.2, actores: { moises: 'moises' },
        lineas: LINEAS,
        pista: {
            n: [['habla', 0.8, 3.6], ['saca', 4.5, 6.0], ['habla', 7.0, 9.6], ['ahya', 12.2, 14.4], ['recupera', 14.4, 15.6]],
            j: [['ala', 9.8, 12.0], ['ahya', 12.2, 15.2]],
            moises: [['cruza', 3.8, 6.4], ['asiente', 12.2, 15.2]]
        },
        gestos: GESTOS,
        extra: { iniciar, cuadro }
    };
}

// ---- El sombrero: viaja de la cabeza de Lalo a su mano, a la cabeza del jugador y de vuelta ----
const C = [0, 0.56, 0];                 // centro del sombrero, en coordenadas del cuello
let piezas = [];                        // { o, pos, rot, off } (pos/rot: en el cuello de Lalo)

function iniciar(api) {
    const cuello = api.actor('n').p.cuello;
    const hijos = cuello.children.filter(c => c.position.y >= 0.45 && c.position.y <= 0.7);
    piezas = hijos.map(o => ({ o, pos: o.position.clone(), rot: o.rotation.clone(), off: o.position.clone().sub(new api.THREE.Vector3(...C)) }));
    // Registro para que al terminar vuelvan a la cabeza de Lalo (api.prestar guarda el dueño y la posición)
    for (const p of piezas) api.prestar(p.o, 'n', 'cuello', p.pos.toArray(), [p.rot.x, p.rot.y, p.rot.z]);
}

function poner(o, padre) { if (o.parent !== padre) { if (o.parent) o.parent.remove(o); padre.add(o); } }

function cuadro(api) {
    const t = api.e.t;
    if (!piezas.length) return;
    const T3 = api.THREE;
    const cuelloN = api.actor('n').p.cuello, cuelloJ = api.actor('j').p.cuello;
    const brazo = api.actor('n').p.brazoD;
    // Puntos en coordenadas del grupo (el grupo es el que se mueve en el aire)
    const enGrupo = (obj, v) => { obj.updateWorldMatrix(true, false); return api.grupo.worldToLocal(obj.localToWorld(v)); };
    const C3 = new T3.Vector3(...C);
    const cabezaN = enGrupo(cuelloN, C3.clone());
    const mano = enGrupo(brazo, new T3.Vector3(0, -0.75, 0));
    const cabezaJ = enGrupo(cuelloJ, C3.clone());
    let P = null;
    if (t >= 4.5 && t < 6.0) P = new T3.Vector3().lerpVectors(cabezaN, mano, suave(suaveT(t, 4.5, 6.0)));
    else if (t >= 6.0 && t < 7.6) P = new T3.Vector3().lerpVectors(mano, cabezaJ, suave(suaveT(t, 6.0, 7.6)));
    else if (t >= 14.6 && t < 15.6) P = new T3.Vector3().lerpVectors(cabezaJ, cabezaN, suave(suaveT(t, 14.6, 15.6)));
    for (const p of piezas) {
        if (P) {
            poner(p.o, api.grupo);
            p.o.position.copy(P).add(p.off);
        } else if (t >= 7.6 && t < 14.6) {
            poner(p.o, cuelloJ);
            p.o.position.copy(p.pos);
        } else {
            poner(p.o, cuelloN);
            p.o.position.copy(p.pos);
        }
    }
}
