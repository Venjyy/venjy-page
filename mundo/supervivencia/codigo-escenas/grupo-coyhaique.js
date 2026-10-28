// =========================================================
// VENJY · Supervivencia · Código del grupo de Coyhaique (Etapa B4d): los dos planos manuales de la cámara (A mientras el Venjy
// de la mina entra por el túnel, B el resto con un acercamiento lento) y la bola de nieve que vuela de Lalo a ti y de ti a
// Lalo. El paseo del Venjy y de Moisés, la nieve y los sonidos son datos de la escena (grupo-coyhaique-<skin> en escenas.json).
// Marcas: llega (el Venjy termina de entrar: cambia el plano) · tiro1 (Lalo lanza) · tiro2 (tú lanzas). La bola tarda VUELO.
// Quién es quién: Moisés es 'n' salvo que tu skin sea la suya (entonces es el actor 'moises'): rol() lo resuelve.
// =========================================================
import { PIX } from '../moldes.js';

const BOLA = PIX.bola;
const VUELO = 0.5;                    // lo que tarda una bola de nieve
// Planos fijos, medidos en el iglú desde donde se sienta Moisés (adentro caben justo los cuatro: no hay espacio para girar)
const CAM = {
    A: { pos: [1.1, 1.75, -2.85] },
    B: { pos: [1.1, 1.7, 3.2], hasta: [1.1, 1.7, 2.5], mira: [0.6, 1.3, -0.8] }
};
const TUNEL_Z = 2.1;                  // el plano A sigue al Venjy mientras está a más de esto al sur de Moisés

export default function (m) {
    let bola = null;
    return {
        iniciar(api) {
            const rol = p => (api.actor(p) ? p : 'n');
            bola = api.pegar(api.sprite(BOLA.filas, BOLA.colores, 0.24), null, null, [0, 0, 0]);
            bola.visible = false;
            const o = api.origen(rol('moises'));
            const en = d => [o.x + d[0], o.y + d[1], o.z + d[2]];
            // A mientras el Venjy viene por el túnel (lo sigue con la mirada); B el resto
            api.camara(() => {
                const x = api.e.t, v = api.actor('v') && api.posG('v');
                if (v && x < m.llega && v.z > o.z + TUNEL_Z) return { pos: en(CAM.A.pos), mira: [v.x, v.y + 1.3, v.z] };
                const k = Math.min(1, x / api.e.T), a = CAM.B.pos, b = CAM.B.hasta;
                return { pos: en([a[0] + (b[0] - a[0]) * k, a[1], a[2] + (b[2] - a[2]) * k]), mira: en(CAM.B.mira) };
            });
        },
        cuadro(api) {
            const x = api.e.t, rol = q => (api.actor(q) ? q : 'n');
            // Cabezas en coordenadas del grupo (la tuya y el sombrero de Lalo)
            const cabeza = (q, alto) => { const p = api.posG(q); return { x: p.x, y: p.y + alto, z: p.z }; };
            // Dónde va la bola en el instante x (de la mano que lanza a la cabeza del otro, en arco)
            let p = null;
            for (const [s, de, a, alto] of [[m.tiro1, rol('lalo'), 'j', 1.75], [m.tiro2, 'j', rol('lalo'), 2.05]]) {
                if (x < s || x >= s + VUELO || !api.actor(de) || !api.actor(a)) continue;
                const u = (x - s) / VUELO, p0 = cabeza(de, 2.0), p1 = cabeza(a, alto);
                p = { x: p0.x + (p1.x - p0.x) * u, y: p0.y + (p1.y - p0.y) * u + Math.sin(u * Math.PI) * 0.45, z: p0.z + (p1.z - p0.z) * u };
                break;
            }
            bola.visible = !!p;
            if (p) bola.position.set(p.x, p.y, p.z);
        }
    };
}
