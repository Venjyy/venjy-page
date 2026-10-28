// =========================================================
// VENJY · Supervivencia · Código del momento de Lona, «La bufanda» (Etapa B4c): la bufanda de franjas que crece entre sus manos
// mientras teje con dos agujas, y la bufanda puesta en tu cuello (anillo y punta). La pareja (momento-lona-venjy) usa el mismo
// código con otra rapidez de las agujas (`freq`). Marcas: inicio (empieza a tejer) · fin (la bufanda llegó a su largo) ·
// entrega (se la pone al jugador).
// =========================================================
import { suave, tramo } from './comun.js';

// Franjas rojas y blancas (la bufanda); la punta en el cuello del jugador va con la misma textura
const FRANJAS = ['rr', 'rr', 'ww', 'ww', 'rr', 'rr', 'ww', 'ww'];
const COL_BUFANDA = { r: '#d8283c', w: '#f4f4f4' };

export const bufanda = freq => m => {
    const st = {};
    return {
        iniciar(api) {
            // Bufanda que teje (crece entre las manos), agujas y la bufanda puesta (anillo y punta)
            st.tejida = api.caja(0.16, 1, 0.06, null, { filas: FRANJAS, colores: COL_BUFANDA });
            st.agujaD = api.caja(0.04, 0.5, 0.04, '#c9c9c9');
            st.agujaI = api.caja(0.04, 0.5, 0.04, '#c9c9c9');
            st.anillo = api.caja(0.56, 0.12, 0.32, null, { filas: FRANJAS, colores: COL_BUFANDA });
            st.punta = api.caja(0.16, 0.6, 0.05, null, { filas: FRANJAS, colores: COL_BUFANDA });
            for (const o of [st.tejida, st.anillo, st.punta]) { o.visible = false; api.pegar(o); }
            st.agujaD.visible = st.agujaI.visible = false;
        },
        cuadro(api) {
            const t = api.e.t, THREE = api.THREE;
            const { tejida, agujaD, agujaI, anillo, punta } = st;
            if (!tejida) return;
            const tejiendo = t >= m.inicio && t < m.entrega;
            // Agujas: en cada mano, giran de un lado a otro (se cruzan)
            const brazoD = api.actor('n').p.brazoD, brazoI = api.actor('n').p.brazoI;
            const giro = Math.sin(t * freq * 1.5) * 0.7;
            agujaD.visible = agujaI.visible = tejiendo;
            if (tejiendo) {
                if (agujaD.parent !== brazoD) api.pegar(agujaD, 'n', 'brazoD', [0, -0.7, 0.12]);
                if (agujaI.parent !== brazoI) api.pegar(agujaI, 'n', 'brazoI', [0, -0.7, 0.12]);
                agujaD.rotation.set(0, 0, giro);
                agujaI.rotation.set(0, 0, -giro);
            }
            // Bufanda: cuelga entre las manos y crece hasta 0.9
            tejida.visible = tejiendo;
            if (tejiendo) {
                if (tejida.parent !== api.grupo) api.soltar(tejida);
                const a = api.punta(api.actor('n'), 'D', new THREE.Vector3()), c = api.punta(api.actor('n'), 'I', new THREE.Vector3());
                const L = Math.max(0.01, 0.6 * suave(tramo(t, m.inicio, m.fin)));
                tejida.scale.set(1, L, 1);
                tejida.position.set((a.x + c.x) / 2, (a.y + c.y) / 2 - L / 2, (a.z + c.z) / 2);
                tejida.rotation.set(0, 0, 0);
            }
            // Se la pone al jugador: anillo en el cuello y punta que cuelga al frente
            const puesta = t >= m.entrega;
            anillo.visible = punta.visible = puesta;
            if (puesta) {
                const k = 0.2 + 0.8 * suave(tramo(t, m.entrega, m.entrega + 0.5));
                if (anillo.parent !== api.actor('j').p.cuerpo) { api.pegar(anillo, 'j', 'cuerpo', [0, 1.45, 0]); api.pegar(punta, 'j', 'cuerpo', [0.08, 1.12, 0.16]); }
                anillo.scale.setScalar(k); punta.scale.setScalar(k);
            }
        }
    };
};

export default bufanda(18);
