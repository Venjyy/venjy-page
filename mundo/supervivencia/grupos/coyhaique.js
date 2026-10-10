// =========================================================
// VENJY · Supervivencia · Escena de grupo: los de Coyhaique en el iglú (bloque 6c-2)
// escena-amistad.js lo carga con import() al usarse (escenas-skin.js: llegas al iglú con skin de Lalo o Moisés; con skin
// de Venjy el iglú sigue con su escena de siempre y esta queda solo en el botón «Saludo del grupo»).
// Actores: Moisés es el ancla ('n'; estaba sentado y se para), Lalo actor extra, 'v' el Venjy que mina en la mina de al
// lado, tú 'j'. Guion (textos aprobados por el dueño, mundo/DIALOGOS.md):
//   llegada → el Venjy de la mina entra por el túnel del iglú con el pico al hombro y se sacude la nieve → «Vengo de la
//   mina» → Moisés recuerda las guerras de nieve → Lalo te tira una bola de nieve → tu frase → «No había reglas» → se la
//   devuelves al sombrero → «¡me diste en el sombrero!» → «¡Coyhaique, presente!» con los brazos arriba → tu cierre.
// Al terminar (o al saltar la escena) el Venjy vuelve a la mina (api.mover lo devuelve a su sitio).
// =========================================================
import { t, r2, crearGuion, cerrar, eventos, rumbo, ruta, BOLA, NIEVE } from './comun.js';
import { ruido } from '../sonidos.js';

export const ANCLA = 'moises';
export const NPCS = ['moises', 'lalo'];
export const VENJY = 'venjy@mina';
export const COMUN = [
    ['v', t('Vengo de la mina. Ni un diamante, pero llegué.', "I'm coming from the mine. Not one diamond, but I made it.")],
    ['moises', t('Hermano, ¿te acuerdas de las guerras de nieve en Coyhaique?', 'Bro, remember the snowball fights in Coyhaique?')],
    ['lalo', t('Ahya, ¡y siempre perdías tú!', 'Ahya, and you always lost!')],
    ['moises', t('En Coyhaique no había reglas, hermano.', 'There were no rules in Coyhaique, bro.')],
    ['lalo', t('Ahya, ¡me diste en el sombrero!', 'Ahya, you hit my hat!')],
    ['todos', t('¡Coyhaique, presente!', 'Coyhaique, present!')]
];
export const VARIANTES = {
    venjy: {
        llegada: [['j', t('¿Otro yo minando? Yo vine directo al iglú.', 'Another me mining? I came straight to the igloo.')]],
        bola: t('¡Oye! Eso fue a traición.', 'Hey! That was a sneak attack.'),
        cierre: t('Desde los trece, hermanos. Y todavía perdiendo en la nieve.', 'Since thirteen, bros. And still losing in the snow.')
    },
    lalo: {
        llegada: [['lalo', t('Ahya, ¿otro Lalo? Uno de los dos es el original.', 'Ahya, another Lalo? One of us is the original.')], ['j', t('Ahya, el original soy yo, hermano.', "Ahya, I'm the original, bro.")]],
        bola: t('¡Me tiraste a mí mismo!', 'You threw it at yourself!'),
        cierre: t('Ahya, dos Lalos, un Moisés y un Venjy. El iglú quedó chico.', 'Ahya, two Lalos, one Moisés and one Venjy. The igloo got too small.')
    },
    moises: {
        llegada: [['moises', t('¿Y tú? Te pareces a mí, pero más abrigado.', 'And you? You look like me, but more bundled up.')], ['j', t('Soy el Moisés de visita. El de la casa eres tú.', "I'm the visiting Moisés. You're the one who lives here.")]],
        bola: t('¡Lalo! ¿A mí? Si vivimos juntos.', 'Lalo! Me? We live together.'),
        cierre: t('Coyhaique en el corazón, hermanos. Y nieve en la cara.', 'Coyhaique in our hearts, bros. And snow in our faces.')
    }
};
export const MIEMBROS = Object.keys(VARIANTES);

// Medido en el mapa del iglú (desde donde se sienta Moisés): el túnel sale al sur y entra derecho al centro.
// Adentro caben justo los cuatro: se paran en media luna en la mitad norte, mirando hacia el túnel, y la cámara usa
// planos fijos (no hay espacio para girar en torno a ellos): A desde el muro norte mientras entra el Venjy y B desde la
// boca del túnel (con un acercamiento lento). Moisés se para un paso al norte: así la bola de nieve pasa por delante.
const TUNEL = { x: 1.1, z: 6.6 };     // boca del túnel, afuera
const DENTRO = { x: 1.2, z: -1.9 };   // donde se para el Venjy, al norte (pasa entre Moisés y Lalo)
const JUGADOR = { x: -1.1, z: -0.8 }; // tú, al oeste de Moisés (sin pisar el cojín de la ronda)
const MOISES = { x: -0.1, z: -1.3 }; // Moisés, al pararse
const MIRAN = { x: 0.6, z: 0.9 };     // el punto al que miran todos (hacia el túnel)
const CAM = {
    A: { pos: [1.1, 1.75, -2.85] },
    B: { pos: [1.1, 1.7, 3.2], hasta: [1.1, 1.7, 2.5], mira: [0.6, 1.3, -0.8] }
};
const VUELO = 0.5;                    // lo que tarda una bola de nieve

export function grupo(base) {
    const V = VARIANTES[base];
    if (!V) return null;
    const g = crearGuion(0.6);
    const habla = l => g.ges(l.q, 'habla', l.a, l.a + l.d, true);
    const todos = ['moises', 'lalo', 'v', 'j'];

    // ---- Llegada; el Venjy de la mina viene por el túnel mientras tanto ----
    const ll = V.llegada.map(([q, x]) => g.di(q, x));
    for (const l of ll) habla(l);
    if (ll[0].q !== 'j') g.ges(ll[0].q, 'doble', ll[0].a - 0.3, ll[0].a + 1.3);
    const entra = 0.5, llega = r2(Math.max(g.s, entra + 2.6));
    g.ges('v', 'caminaPico', entra, llega);
    g.ges('v', 'sacude', llega, llega + 1.2);
    for (const q of ['moises', 'lalo']) g.ges(q, 'mira', llega - 0.6, llega + 1.2, true);
    g.s = llega + 1.0;
    const c1 = g.di(...COMUN[0]);
    habla(c1);
    const c2 = g.di(...COMUN[1]);
    g.ges('moises', 'recuerda', c2.a, g.fin(c2));
    // ---- Lalo te tira una bola de nieve ----
    const c3 = g.di(...COMUN[2]);
    const tiro1 = r2(c3.a + 0.2);
    g.ges('lalo', 'lanza', tiro1 - 0.45, tiro1 + 0.55);
    g.ges('lalo', 'risa', tiro1 + 0.6, g.fin(c3) + 0.2);
    g.ges('j', 'sorpresa', tiro1 + VUELO, tiro1 + VUELO + 0.9);
    const b = g.di('j', V.bola);
    habla(b);
    const c4 = g.di(...COMUN[3]);
    habla(c4);
    // ---- Se la devuelves al sombrero ----
    const tiro2 = r2(g.fin(c4) - 0.1);
    g.ges('j', 'lanza', tiro2 - 0.45, tiro2 + 0.55);
    g.s = tiro2 + VUELO + 0.15;
    const c5 = g.di(...COMUN[4]);
    g.ges('lalo', 'rasca', tiro2 + VUELO, g.fin(c5));
    for (const q of ['moises', 'v']) g.ges(q, 'risa', tiro2 + VUELO + 0.1, g.fin(c5));
    // ---- ¡Coyhaique, presente! ----
    const c6 = g.di(...COMUN[5], 0.1);
    for (const q of todos) g.ges(q, 'brazosArriba', c6.a - 0.2, g.fin(c6) + 0.4);
    const ci = g.di('j', V.cierre, 0.2);
    habla(ci);
    for (const q of ['moises', 'lalo', 'v']) g.ges(q, 'asiente', ci.a + 0.3, g.fin(ci) + 0.3);
    for (const q of todos) g.ges(q, 'mira', 0.3, g.s, true);

    let P = null, bola = null;
    const golpeNieve = (api, p) => {
        ruido({ dur: 0.12, frec: 900, q: 0.8, vol: 0.18, tipo: 'lowpass' });
        for (let i = 0; i < 6; i++) api.efecto(NIEVE, p.x + Math.sin(i) * 0.25, p.y, p.z + Math.cos(i * 1.7) * 0.25, { tam: 0.16, vida: 0.7, vy: -0.6 });
    };
    // Cabezas en coordenadas del grupo (la tuya y el sombrero de Lalo)
    const cabeza = (api, q, alto) => { const p = api.posG(q); return { x: p.x, y: p.y + alto, z: p.z }; };
    // Dónde va la bola en el instante x (de la mano que lanza a la cabeza del otro, en arco)
    function bolaEn(api, x) {
        for (const [s, de, a, alto] of [[tiro1, 'lalo', 'j', 1.75], [tiro2, 'j', 'lalo', 2.05]]) {
            if (x < s || x >= s + VUELO || !api.actor(de) || !api.actor(a)) continue;
            const u = (x - s) / VUELO, p0 = cabeza(api, de, 2.0), p1 = cabeza(api, a, alto);
            return { x: p0.x + (p1.x - p0.x) * u, y: p0.y + (p1.y - p0.y) * u + Math.sin(u * Math.PI) * 0.45, z: p0.z + (p1.z - p0.z) * u };
        }
        return null;
    }
    const efectos = eventos([
        [tiro1 + VUELO, api => golpeNieve(api, cabeza(api, 'j', 1.8))],
        [tiro2 + VUELO, api => golpeNieve(api, cabeza(api, 'lalo', 2.1))],
        [llega, api => { const p = api.posG('v'); if (p) for (let i = 0; i < 8; i++) api.efecto(NIEVE, p.x + Math.sin(i * 2.1) * 0.35, p.y + 1.2 + (i % 3) * 0.3, p.z + Math.cos(i * 2.1) * 0.35, { tam: 0.14, vida: 0.9, vy: -0.9 }); }]
    ]);
    return cerrar(g, {
        ancla: ANCLA,
        actores: { lalo: 'lalo', v: VENJY },
        reparto: { [ANCLA]: 'n' },
        centro: api => {
            const m = api.posG('n');
            const en = (d, y = 0) => ({ x: m.x + d.x, y: m.y + y, z: m.z + d.z });
            P = { m, tunel: en(TUNEL), dentro: en(DENTRO), jugador: en(JUGADOR), moises: en(MOISES) };
            return en(MIRAN);
        },
        colocar: () => P.jugador,
        extra: {
            iniciar(api) {
                bola = api.pegar(api.sprite(BOLA.filas, BOLA.colores, 0.24), null, null, [0, 0, 0]);
                bola.visible = false;
                const m = P.m, en = d => [m.x + d[0], m.y + d[1], m.z + d[2]];
                // A mientras el Venjy viene por el túnel (lo sigue con la mirada); B el resto
                api.camara(() => {
                    const x = api.e.t, v = api.actor('v') && api.posG('v');
                    if (v && x < llega && v.z > m.z + 2.1) return { pos: en(CAM.A.pos), mira: [v.x, v.y + 1.3, v.z] };
                    const k = Math.min(1, x / api.e.T), a = CAM.B.pos, b = CAM.B.hasta;
                    return { pos: en([a[0] + (b[0] - a[0]) * k, a[1], a[2] + (b[2] - a[2]) * k]), mira: en(CAM.B.mira) };
                });
            },
            cuadro(api) {
                const x = api.e.t;
                efectos(api);
                api.mover('n', P.moises.x, P.moises.y, P.moises.z);
                if (api.actor('v')) {
                    // Del túnel hacia dentro, caminando
                    const k = ruta(x, [[entra, 0], [llega, 1]]);
                    api.mover('v', P.tunel.x + (P.dentro.x - P.tunel.x) * k, P.dentro.y, P.tunel.z + (P.dentro.z - P.tunel.z) * k);
                    api.girar('v', x < llega ? rumbo(P.tunel, P.dentro) : null);
                }
                const p = bolaEn(api, x);
                bola.visible = !!p;
                if (p) bola.position.set(p.x, p.y, p.z);
            }
        }
    });
}
