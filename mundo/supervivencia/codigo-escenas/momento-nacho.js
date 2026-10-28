// =========================================================
// VENJY · Supervivencia · Código del momento de Nacho (Etapa B4c): el filete que da una vuelta sobre la espátula, pasa al plato
// y viaja a tu mano. La espátula y los vasos ya son objetos de la escena (momento-nacho en escenas.json).
// Marcas: vuelo y vueloFin (la vuelta en el aire) · plato (se baja de la plancha al plato) · pase y entregado (el plato viaja a
// tu mano) · retira (el plato y el filete desaparecen).
// =========================================================
import { suave, lerp, tramo } from './comun.js';

export default function (m) {
    let filete = null, plato = null;
    return {
        iniciar(api) {
            filete = api.pegar(api.caja(0.3, 0.06, 0.2, '#8a3b22'), null, null, [0, 0, 0]);
            plato = api.pegar(api.caja(0.34, 0.02, 0.34, '#f4f1ea'), null, null, [0, 0, 0]);
            plato.visible = false;
        },
        // Filete sobre la espátula (da una vuelta en el aire), luego en el plato, luego en la mano del jugador
        cuadro(api) {
            const t = api.e.t, V = api.THREE.Vector3;
            if (!filete) return;
            const mano = q => api.punta(api.actor(q), q === 'j' ? 'I' : 'D', new V());
            const pn = mano('n');
            filete.visible = t < m.retira;
            plato.visible = t >= m.plato && t < m.retira;
            if (t < m.plato) {
                const vuelo = t >= m.vuelo && t < m.vueloFin, s = tramo(t, m.vuelo, m.vueloFin);
                const lift = vuelo ? Math.sin(Math.PI * s) * 0.5 : 0;
                filete.position.set(pn.x, pn.y + 0.05 + lift, pn.z);
                filete.rotation.x = vuelo ? -s * Math.PI * 2 : 0;
                return;
            }
            filete.rotation.x = 0;
            let b = pn;
            if (t >= m.entregado) b = mano('j');
            else if (t >= m.pase) {
                const pj = mano('j'), k = suave(tramo(t, m.pase, m.entregado)), arco = Math.sin(Math.PI * tramo(t, m.pase, m.entregado)) * 0.45;
                b = { x: lerp(pn.x, pj.x, k), y: lerp(pn.y, pj.y, k) + arco, z: lerp(pn.z, pj.z, k) };
            }
            plato.position.set(b.x, b.y, b.z);
            filete.position.set(b.x, b.y + 0.07, b.z);
        }
    };
}
