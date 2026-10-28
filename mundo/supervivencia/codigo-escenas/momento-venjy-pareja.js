// =========================================================
// VENJY · Supervivencia · Código del momento de Venjy con la skin de Lona (Etapa B4c): la flor que no se marchita pasa de su
// mano a la tuya. Marcas: aparece (la flor sale en su mano) · pasa (empieza a pasar) · llega (queda en tu mano).
// =========================================================
import { suave, lerp, tramo } from './comun.js';

const FLOR = ['..dd....', '.drrd...', 'drryrrd.', 'drryrrd.', '.drrd...', '...g....', '..gg....', '...g....'];
const COL_FLOR = { d: '#8a0014', r: '#e8203a', y: '#ffd84a', g: '#3f9e3f' };

export default function (m) {
    const st = {};
    return {
        iniciar(api) {
            st.flor = api.sprite(FLOR, COL_FLOR, 0.42);
            st.flor.visible = false;
            api.pegar(st.flor);
        },
        cuadro(api) {
            const t = api.e.t, f = st.flor, THREE = api.THREE;
            if (!f) return;
            if (t < m.aparece) { f.visible = false; if (f.parent !== api.grupo) api.soltar(f); return; }
            f.visible = true;
            if (t < m.pasa) {
                if (f.parent !== api.actor('n').p.brazoD) api.pegar(f, 'n', 'brazoD', [0, -0.7, 0.12]);
            } else if (t < m.llega) {
                // Pasa de la mano de Venjy a la del jugador: interpola en coordenadas del grupo
                if (f.parent !== api.grupo) api.soltar(f);
                const a = api.punta(api.actor('n'), 'D', new THREE.Vector3()), c = api.punta(api.actor('j'), 'D', new THREE.Vector3());
                const u = suave(tramo(t, m.pasa, m.llega));
                f.position.set(lerp(a.x, c.x, u), lerp(a.y, c.y, u), lerp(a.z, c.z, u));
            } else if (f.parent !== api.actor('j').p.brazoD) {
                api.pegar(f, 'j', 'brazoD', [0, -0.7, 0.12]);
            }
        }
    };
}
