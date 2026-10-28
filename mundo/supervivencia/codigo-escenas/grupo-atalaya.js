// =========================================================
// VENJY · Supervivencia · Código del trío de la atalaya (Etapa B4d): el Venjy del mirador camina al borde, salta la baranda en
// arco y cae con polvo; la cámara lo sigue con una grúa que baja (o un plano fijo si hay árboles en medio) y después, desde
// detrás del grupo, mira el ping de Lucho (rombo naranjo a lo lejos) mientras todos se dan vuelta a mirarlo. Frases, gestos,
// el centro (lugar.centro.promedio) y los sonidos (ping, polvo, golpe) son datos de la escena (grupo-atalaya-<skin>).
// Marcas: asoma → borde (camina al borde) · plano (empieza el plano del salto) · salto → suelo (en el aire) · giro (deja de
// mirar hacia donde cae) · finPlano · planoPing → ping → finPing (el rombo y su plano) · mira → finMira (todos miran el ping).
// Quién es quién: Boris es 'n' salvo con tu skin de Boris (entonces es el actor 'boris' y 'n' es Lucho): rol() lo resuelve.
// Al terminar, el motor devuelve al Venjy a su sitio (api.mover).
// =========================================================
import { PIX, ruta } from '../moldes.js';

const rumbo = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);
// Medido en el mapa desde el sitio del Venjy de arriba (el mirador, 11 bloques sobre el suelo)
const BORDE = { x: 1.0, z: 4.0 };      // dentro de la baranda, borde sur
const CAIDA = { x: 0.8, z: 6.1 };      // donde aterriza (el mismo punto que el tercero de lugar.centro.promedio)
// Grúa: la cámara baja siguiendo la caída, entre Boris y Lucho (desde el aterrizaje), de la altura del mirador al suelo
const GRUA = { x: 2.2, z: 5.9, arriba: 1.2, abajo: 3.0 };
const PING = { dist: 14, alto: 2.5, tam: 1.1 };          // el rombo: a la izquierda de Lucho mirando al grupo
const POLVO = { n: 7, radio: 0.5, tam: 0.5, vida: 1.1, vy: 0.35 };

export default function (m) {
    let P = null, plano = null, marca = null, planoPing = null, manual = null, polvo = false;
    const libre = (api, a, b) => {
        const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) * 3);
        for (let i = 1; i < n; i++) { const k = i / n; if (api.opaco(a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k)) return false; }
        return true;
    };
    const gruaEn = y => [P.caida.x + GRUA.x, Math.max(P.caida.y + GRUA.abajo, Math.min(P.borde.y + GRUA.arriba, y + 1.2)), P.caida.z + GRUA.z];
    // La grúa si el aire está libre de árboles; si no, el primero de varios planos fijos con la línea libre al borde y al suelo
    function buscarPlano(api) {
        const arriba = [P.borde.x, P.borde.y + 1.6, P.borde.z], abajo = [P.caida.x, P.caida.y + 1.0, P.caida.z];
        const g0 = gruaEn(P.borde.y), g1 = gruaEn(P.caida.y);
        if (libre(api, g0, g1) && libre(api, g0, arriba) && libre(api, g1, abajo)) return null;
        for (const dist of [6.5, 7.5, 9]) for (const alto of [2.5, 4, 1.8]) for (const ang of [0.35, 0, 0.7, -0.35, 1.0]) {
            const c = [P.caida.x + Math.sin(ang) * dist, P.caida.y + alto, P.caida.z + Math.cos(ang) * dist];
            if (api.opaco(...c)) continue;
            if (libre(api, c, arriba) && libre(api, c, abajo)) return c;
        }
        return [P.caida.x + 4, P.caida.y + 4, P.caida.z + 8];
    }
    // Dónde está el Venjy en el instante x: en su sitio, camina al borde, salta en arco por encima de la baranda y cae
    function venjyEn(x) {
        if (x < m.asoma) return P.orig;
        if (x < m.salto) { const k = ruta(x, [[m.asoma, 0], [m.borde, 1]]); return { x: P.orig.x + (P.borde.x - P.orig.x) * k, y: P.orig.y, z: P.orig.z + (P.borde.z - P.orig.z) * k }; }
        if (x >= m.suelo) return P.caida;
        const u = (x - m.salto) / (m.suelo - m.salto), alto = P.borde.y + 1.0;
        const hx = ruta(u, [[0, 0], [0.3, 0.8], [1, 1]]);
        const y = u < 0.3 ? P.borde.y + (alto - P.borde.y) * Math.sin(u / 0.3 * Math.PI / 2) : alto + (P.caida.y - alto) * ((u - 0.3) / 0.7) ** 2;
        return { x: P.borde.x + (P.caida.x - P.borde.x) * hx, y, z: P.borde.z + (P.caida.z - P.borde.z) * hx };
    }
    return {
        iniciar(api) {
            const rol = p => (api.actor(p) ? p : 'n');
            const b = api.origen(rol('boris')), v = api.actor('v') ? api.origen('v') : b;
            P = {
                orig: { ...v },
                borde: { x: v.x + BORDE.x, y: v.y, z: v.z + BORDE.z },
                caida: { x: v.x + CAIDA.x, y: b.y, z: v.z + CAIDA.z }
            };
            plano = buscarPlano(api);
            const l = api.posG(rol('lucho'));
            const yaw = rumbo(l, api.e.centro) + Math.PI / 2;
            marca = api.pegar(api.sprite(PIX.ping.filas, PIX.ping.colores, PING.tam), null, null, [l.x + Math.sin(yaw) * PING.dist, l.y + PING.alto, l.z + Math.cos(yaw) * PING.dist]);
            marca.visible = false;
            // Plano del ping: desde detrás del grupo, mirando hacia la marca
            const c = api.e.centro, dx = Math.sin(yaw), dz = Math.cos(yaw);
            const pos = [c.x - dx * 4.5, c.y + 2.8, c.z - dz * 4.5], mira = [c.x + dx * 6, c.y + 1.6, c.z + dz * 6];
            if (!api.opaco(...pos) && libre(api, pos, mira)) planoPing = { pos, mira };
            if (api.actor('v')) api.girar('v', rumbo(P.borde, P.caida));
        },
        cuadro(api) {
            const x = api.e.t, hay = api.actor('v');
            // Plano manual desde que se asoma hasta un momento después de aterrizar, y el del ping
            const salta = x >= m.plano && x < m.finPlano && hay, enPing = planoPing && x >= m.planoPing && x < m.finPing;
            const ahora = salta ? 'salto' : enPing ? 'ping' : null;
            if (ahora !== manual) {
                manual = ahora;
                api.camara(ahora === 'salto' ? () => { const p = venjyEn(api.e.t); return { pos: plano || gruaEn(p.y), mira: [p.x, p.y + 1.3, p.z] }; }
                    : ahora === 'ping' ? () => planoPing : null);
            }
            if (hay) {
                const p = venjyEn(x);
                api.mover('v', p.x, p.y, p.z);
                api.girar('v', x < m.giro ? rumbo(P.borde, P.caida) : null);
            }
            // Polvo al aterrizar (una vez; vuelve a salir si la línea de tiempo retrocede)
            if (x < m.suelo) polvo = false;
            else if (!polvo && x < m.suelo + 0.6) {
                polvo = true;
                for (let i = 0; i < POLVO.n; i++) {
                    const a = i / POLVO.n * Math.PI * 2;
                    api.efecto(PIX.polvo, P.caida.x + Math.sin(a) * POLVO.radio, P.caida.y + 0.2, P.caida.z + Math.cos(a) * POLVO.radio, { tam: POLVO.tam, vida: POLVO.vida, vy: POLVO.vy });
                }
            }
            // El rombo late mientras dura y todos lo miran
            marca.visible = x >= m.ping && x < m.finPing;
            if (marca.visible) { const k = PING.tam + Math.sin(x * 9) * 0.12; marca.scale.set(k, k, 1); }
            const mira = x >= m.mira && x < m.finMira;
            for (const q of ['n', 'boris', 'lucho', 'v', 'j']) if (api.actor(q) && !(q === 'v' && x < m.giro)) api.girar(q, mira ? rumbo(api.posG(q), marca.position) : null);
        }
    };
}
