// =========================================================
// VENJY · Supervivencia · Escena de grupo: el trío de la atalaya (bloque 6c-2)
// escena-amistad.js lo carga con import() al usarse (escenas-skin.js: llegas a la leñera de Boris con skin de Venjy,
// Boris o Lucho, o el botón «Saludo del grupo» en «Hablar»). grupo(base) devuelve el guion.
// Actores: Boris es el ancla ('n'), Lucho actor extra, 'v' el Venjy que mira desde lo alto de la atalaya, tú 'j'.
// Guion (textos aprobados por el dueño, mundo/DIALOGOS.md):
//   llegada (2 o 4 frases) → el Venjy de arriba se asoma al borde y grita «¡Esperen! ¡Voy!» (plano manual desde abajo)
//   → salta la baranda y cae con una nube de polvo en pose de tres puntos (molde `cae`) → «¡Aterrizaje de superhéroe!»
//   → tu frase → «Eso te dolió» / «Ni un poquito» → Lucho marca un ping (sonido de dos tonos y rombo naranjo a lo lejos)
//   y todos miran → «Era una vaca» → «¡Trío de la atalaya!» con los brazos arriba → tu cierre.
// Al terminar (o al saltar la escena) el Venjy vuelve arriba (api.mover lo devuelve a su sitio).
// =========================================================
import { t, r2, crearGuion, cerrar, eventos, rumbo, ruta, PIX, SONIDOS, PING } from './comun.js';

export const ANCLA = 'boris';
export const NPCS = ['boris', 'lucho'];
export const VENJY = 'venjy@atalaya';
export const COMUN = [
    ['v', t('¡Esperen! ¡Voy!', "Wait! I'm coming!")],
    ['v', t('¡Aterrizaje de superhéroe!', 'Superhero landing!')],
    ['boris', t('Eso te dolió.', 'That hurt.')],
    ['v', t('Ni un poquito. Bueno, un poquito.', 'Not even a little. Well, a little.')],
    ['lucho', t('¡Ping! Enemigo a la izquierda.', 'Ping! Enemy on the left.')],
    ['boris', t('Era una vaca, Lucho. Otra vez.', 'It was a cow, Lucho. Again.')],
    ['todos', t('¡Trío de la atalaya!', 'Watchtower trio!')]
];
export const VARIANTES = {
    venjy: {
        llegada: [['lucho', t('¡Primo! Llegaste justo, el negro y yo estábamos armando trío.', 'Cousin! Right on time, negro and I were putting a trio together.')],
            ['j', t('¿Trío? Somos tres... ¿y quién es ese de arriba?', "A trio? There are three of us... and who's that up there?")]],
        despues: t('Ya, ahora somos cuatro. Uno sobra y no soy yo.', "Okay, now there are four of us. One's extra and it's not me."),
        cierre: t('Una partida de cada uno: Apex y LoL.', 'One match of each: Apex and LoL.')
    },
    boris: {
        llegada: [['lucho', t('¿Boris? ¿Y este otro Boris de dónde salió?', 'Boris? And where did this other Boris come from?')],
            ['j', t('Vine a jugar con ustedes. El otro corta la leña.', 'I came to play with you guys. The other one chops the wood.')],
            ['boris', t('Me parece justo.', 'Sounds fair to me.')],
            ['j', t('Solo nos falta el Venjy para el trío.', "We're only missing Venjy for the trio.")]],
        despues: t('Lo invocamos y cayó del cielo.', 'We summoned him and he fell from the sky.'),
        cierre: t('Después a Linares: yo manejo y tú pones la música, Venjy.', 'Later to Linares: I drive and you pick the music, Venjy.')
    },
    lucho: {
        llegada: [['boris', t('¿Lucho? Pero si estabas ahí al lado.', 'Lucho? But you were right over there.')],
            ['j', t('Soy otro Lucho, negro. Vengo a armar trío.', "I'm another Lucho, negro. Here to build a trio.")],
            ['lucho', t('Con dos Luchos ya somos trío... ¿o no?', "With two Luchos we're already a trio... or not?")],
            ['j', t('Falta el primo. ¡Venjy!', "We're missing cousin. Venjy!")]],
        despues: t('Primo, ¿no había escalera?', "Cousin, wasn't there a ladder?"),
        cierre: t('Esta noche: el primo, el negro y yo. Ranked hasta las cuatro.', 'Tonight: cousin, negro and me. Ranked until four.')
    }
};
export const MIEMBROS = Object.keys(VARIANTES);

// Dónde queda cada uno respecto de su sitio (amigos.js y criaturas/venjy.js; medido en el mapa):
// el Venjy de arriba está en el mirador, 11 bloques sobre el suelo; se asoma al borde sur y cae junto a la leñera.
const BORDE = { x: 1.0, z: 4.0 };      // desde el sitio del Venjy de arriba (dentro de la baranda)
const CAIDA = { x: 0.8, z: 6.1 };      // donde aterriza (al pie de la atalaya, al norte del tocón: frente a todos)
const JUGADOR = { x: -1.9, z: -1.5 };  // desde Boris: al otro lado del tocón
const SALTO = 1.15;                     // segundos en el aire
// Grúa: la cámara baja siguiendo la caída, entre Boris y Lucho (desde el aterrizaje), de la altura del mirador al suelo
const GRUA = { x: 2.2, z: 5.9, arriba: 1.2, abajo: 3.0 };

export function grupo(base) {
    const V = VARIANTES[base];
    if (!V) return null;
    const g = crearGuion(0.6);
    const habla = l => g.ges(l.q, 'habla', l.a, l.a + l.d, true);
    const todos = ['boris', 'lucho', 'v', 'j'];

    // ---- Llegada ----
    const ll = V.llegada.map(([q, x]) => g.di(q, x));
    g.ges(ll[0].q, 'sorpresa', ll[0].a - 0.4, ll[0].a + 0.6);
    g.ges('j', 'saluda', ll[0].a, ll[0].a + 1.4);
    for (const l of ll) habla(l);
    if (base === 'venjy') g.ges('j', 'miraArriba', ll[1].a + 0.8, g.fin(ll[1]) + 0.2);
    if (base === 'lucho') g.ges('j', 'grita', ll[3].a + 0.8, g.fin(ll[3]));
    // ---- El Venjy de arriba se asoma y grita; todos miran arriba ----
    const c1 = g.di(...COMUN[0]);
    const asoma = r2(Math.max(0.4, c1.a - 1.2));
    g.ges('v', 'grita', c1.a, g.fin(c1) + 0.1);
    for (const q of ['boris', 'lucho', 'j']) g.ges(q, 'miraArriba', c1.a + 0.2, g.fin(c1) + 0.4);
    // Salto: se agacha, salta la baranda y cae (SALTO s); aterriza en tres puntos con polvo
    const salto = r2(g.fin(c1) + 0.05), suelo = r2(salto + SALTO);
    g.ges('v', 'agacha', salto - 0.3, salto + 0.15);
    g.ges('v', 'brazosArriba', salto + 0.15, suelo - 0.05);
    g.ges('v', 'cae', suelo - 0.05, suelo + 1.9);
    for (const q of ['boris', 'lucho', 'j']) g.ges(q, 'sorpresa', suelo - 0.2, suelo + 0.7);
    g.s = suelo - 0.35; // «¡Aterrizaje de superhéroe!» lo grita cayendo
    const c2 = g.di(...COMUN[1]);
    const d1 = g.di('j', V.despues);
    habla(d1);
    // ---- «Eso te dolió» / «Ni un poquito» ----
    const c3 = g.di(...COMUN[2]);
    habla(c3);
    const c4 = g.di(...COMUN[3]);
    g.ges('v', 'rodilla', c4.a - 0.1, c4.a + 1.0);
    g.ges('v', 'rasca', c4.a + 1.0, g.fin(c4) + 0.2);
    // ---- Ping de Lucho: señala lejos y todos miran ----
    const c5 = g.di(...COMUN[4], 0.15);
    const ping = r2(c5.a + 0.15);
    g.ges('lucho', 'apunta', c5.a - 0.1, g.fin(c5) + 0.3);
    const c6 = g.di(...COMUN[5]);
    g.ges('boris', 'rasca', c6.a, g.fin(c6));
    for (const q of ['v', 'j']) g.ges(q, 'mira', c5.a, g.fin(c6), true);
    // ---- ¡Trío de la atalaya! ----
    const c7 = g.di(...COMUN[6], 0.1);
    for (const q of todos) g.ges(q, 'brazosArriba', c7.a - 0.2, g.fin(c7) + 0.4);
    const ci = g.di('j', V.cierre, 0.2);
    habla(ci);
    for (const q of ['boris', 'lucho', 'v']) g.ges(q, 'asiente', ci.a + 0.3, g.fin(ci) + 0.3);
    for (const q of todos) g.ges(q, 'mira', 0.3, g.s, true);

    // ---- Posiciones (coordenadas del grupo, se calculan al empezar) ----
    let P = null, plano = null, marca = null, planoPing = null;
    const vigia = [c5.a - 0.05, g.fin(c6) + 0.1]; // todos miran hacia el ping
    const efectos = eventos([
        [ping, api => { SONIDOS.ping(); }],
        [suelo, api => {
            SONIDOS.polvo(); api.sonidos.golpe();
            for (let i = 0; i < 7; i++) {
                const a = i / 7 * Math.PI * 2;
                api.efecto(PIX.polvo, P.caida.x + Math.sin(a) * 0.5, P.caida.y + 0.2, P.caida.z + Math.cos(a) * 0.5, { tam: 0.5, vida: 1.1, vy: 0.35 });
            }
        }]
    ]);
    // Plano del salto: una grúa que baja con el Venjy (si el aire está libre de árboles); si no, el primero de varios
    // candidatos fijos con la línea libre a la cabeza en el borde y al lugar del aterrizaje
    const libre = (api, a, b) => {
        const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) * 3);
        for (let i = 1; i < n; i++) { const k = i / n; if (api.opaco(a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k)) return false; }
        return true;
    };
    const gruaEn = y => [P.caida.x + GRUA.x, Math.max(P.caida.y + GRUA.abajo, Math.min(P.borde.y + GRUA.arriba, y + 1.2)), P.caida.z + GRUA.z];
    function buscarPlano(api) {
        const arriba = [P.borde.x, P.borde.y + 1.6, P.borde.z], abajo = [P.caida.x, P.caida.y + 1.0, P.caida.z];
        const g0 = gruaEn(P.borde.y), g1 = gruaEn(P.caida.y);
        if (libre(api, g0, g1) && libre(api, g0, arriba) && libre(api, g1, abajo)) return null; // la grúa sirve
        for (const dist of [6.5, 7.5, 9]) for (const alto of [2.5, 4, 1.8]) for (const ang of [0.35, 0, 0.7, -0.35, 1.0]) {
            const c = [P.caida.x + Math.sin(ang) * dist, P.caida.y + alto, P.caida.z + Math.cos(ang) * dist];
            if (api.opaco(...c)) continue;
            if (libre(api, c, arriba) && libre(api, c, abajo)) return c;
        }
        return [P.caida.x + 4, P.caida.y + 4, P.caida.z + 8];
    }
    // Dónde está el Venjy en el instante x (borde, salto en arco por encima de la baranda, caída)
    function venjyEn(x) {
        if (x < asoma) return P.orig;
        if (x < salto) { const k = ruta(x, [[asoma, 0], [asoma + 1.0, 1]]); return { x: P.orig.x + (P.borde.x - P.orig.x) * k, y: P.orig.y, z: P.orig.z + (P.borde.z - P.orig.z) * k }; }
        if (x >= suelo) return P.caida;
        const u = (x - salto) / SALTO, alto = P.borde.y + 1.0;
        const hx = ruta(u, [[0, 0], [0.3, 0.8], [1, 1]]);
        const y = u < 0.3 ? P.borde.y + (alto - P.borde.y) * Math.sin(u / 0.3 * Math.PI / 2) : alto + (P.caida.y - alto) * ((u - 0.3) / 0.7) ** 2;
        return { x: P.borde.x + (P.caida.x - P.borde.x) * hx, y, z: P.borde.z + (P.caida.z - P.borde.z) * hx };
    }
    return cerrar(g, {
        ancla: ANCLA,
        actores: { lucho: 'lucho', v: VENJY },
        reparto: { [ANCLA]: 'n' },
        centro: api => {
            const b = api.posG('n'), l = api.posG('lucho') || b, v = api.posG('v') || b;
            P = {
                orig: { ...v },
                borde: { x: v.x + BORDE.x, y: v.y, z: v.z + BORDE.z },
                caida: { x: v.x + CAIDA.x, y: b.y, z: v.z + CAIDA.z },
                jugador: { x: b.x + JUGADOR.x, y: b.y, z: b.z + JUGADOR.z }
            };
            return { x: (b.x + l.x + P.caida.x + P.jugador.x) / 4, y: b.y, z: (b.z + l.z + P.caida.z + P.jugador.z) / 4 };
        },
        colocar: () => P.jugador,
        extra: {
            iniciar(api) {
                plano = buscarPlano(api);
                const l = api.posG('lucho') || api.posG('n');
                // El ping: a la izquierda de Lucho mirando al grupo, lejos y un poco en alto
                const yaw = rumbo(l, api.e.centro) + Math.PI / 2;
                marca = api.pegar(api.sprite(PING.filas, PING.colores, 1.1), null, null, [l.x + Math.sin(yaw) * 14, l.y + 2.5, l.z + Math.cos(yaw) * 14]);
                marca.visible = false;
                // Plano del ping: desde detrás del grupo, mirando hacia la marca (todos se dan vuelta a mirarla)
                const c = api.e.centro, dx = Math.sin(yaw), dz = Math.cos(yaw);
                const pos = [c.x - dx * 4.5, c.y + 2.8, c.z - dz * 4.5], mira = [c.x + dx * 6, c.y + 1.6, c.z + dz * 6];
                if (!api.opaco(...pos) && libre(api, pos, mira)) planoPing = { pos, mira };
                if (!api.actor('v')) return;
                api.girar('v', rumbo(P.borde, P.caida));
            },
            cuadro(api) {
                const x = api.e.t;
                efectos(api);
                // Plano manual desde que se asoma hasta un momento después de aterrizar
                const salto = x >= c1.a - 0.3 && x < suelo + 0.6 && api.actor('v'), enPing = planoPing && x >= ping - 0.1 && x < g.fin(c6);
                const manual = salto ? 'salto' : enPing ? 'ping' : null;
                if (manual !== (api.e.planoManual || null)) {
                    api.e.planoManual = manual;
                    api.camara(manual === 'salto' ? () => { const p = venjyEn(api.e.t); return { pos: plano || gruaEn(p.y), mira: [p.x, p.y + 1.3, p.z] }; }
                        : manual === 'ping' ? () => planoPing : null);
                }
                if (api.actor('v')) {
                    const p = venjyEn(x);
                    api.mover('v', p.x, p.y, p.z);
                    api.girar('v', x < suelo + 0.4 ? rumbo(P.borde, P.caida) : null);
                }
                // Todos miran hacia el ping mientras dura
                marca.visible = x >= ping && x < g.fin(c6);
                if (marca.visible) { const k = 1.1 + Math.sin(x * 9) * 0.12; marca.scale.set(k, k, 1); }
                const mira = x >= vigia[0] && x < vigia[1];
                for (const q of ['n', 'lucho', 'v', 'j']) if (api.actor(q) && !(q === 'v' && x < suelo + 0.4)) api.girar(q, mira ? rumbo(api.posG(q), marca.position) : null);
            }
        }
    });
}
