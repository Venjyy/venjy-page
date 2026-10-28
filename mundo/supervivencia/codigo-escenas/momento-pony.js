// =========================================================
// VENJY · Supervivencia · Código del momento de Pony (Etapa B4c): el salmón que sale del agua, vuela en arco a sus brazos, lo
// abraza y se va con un destello. La caña ya es un objeto de la escena (momento-pony en escenas.json).
// Marcas: sale (el salmón sale del agua, con golpe) · llega (cae en sus brazos) · suelta (al chocar los cinco se va).
// =========================================================
import { suave, lerp, tramo } from './comun.js';

// Salmón: franjas rosadas y rojas
const COL_PEZ = { p: '#ff9a8a', r: '#d9573f', k: '#7a2a1a', w: '#fff1e6' };
const FILAS_PEZ = ['pppppppp', 'pprpppwp', 'rrrrrrrr', 'pppppppp', 'pprpppwp', 'rrrrrrrr', 'pppppppp', 'pppkpppp'];

export default function (m) {
    const st = {};
    return {
        iniciar(api) {
            // El salmón es un grupo de tres cajas (cuerpo, cola, aleta); el grupo se quita al terminar
            st.pez = new api.THREE.Group();
            const cuerpo = api.caja(0.4, 0.42, 1.6, null, { filas: FILAS_PEZ, colores: COL_PEZ });
            const cola = api.caja(0.04, 0.42, 0.34, '#d9573f'); cola.position.set(0, 0, -0.97);
            const aleta = api.caja(0.04, 0.14, 0.3, '#d9573f'); aleta.position.set(0, 0.28, 0.1);
            st.pez.add(cuerpo, cola, aleta);
            st.pez.visible = false;
            api.pegar(st.pez);
        },
        cuadro(api) {
            const t = api.e.t, THREE = api.THREE, pez = st.pez;
            if (!pez) return;
            const A = api.actor('n'), yaw = A.n.yaw;
            // Salmón: sale del agua (2.6 delante de Pony), vuela en arco a sus brazos (sale-llega) y lo abraza
            const pg = api.posG('n');
            const S = { x: pg.x + Math.sin(yaw) * 2.6, y: pg.y + 0.1, z: pg.z + Math.cos(yaw) * 2.6 };
            if (t >= m.sale && !api.e.hechos.has('chP')) { api.e.hechos.add('chP'); api.golpe(S); }
            if (t < m.sale) {
                pez.visible = false;
                if (pez.parent !== api.grupo) api.soltar(pez);
            } else if (t < m.llega) {
                pez.visible = true;
                if (pez.parent !== api.grupo) api.soltar(pez);
                const a = api.punta(A, 'D', new THREE.Vector3()), c = api.punta(A, 'I', new THREE.Vector3());
                const u = tramo(t, m.sale, m.llega), k = suave(u);
                pez.position.set(lerp(S.x, (a.x + c.x) / 2, k), lerp(S.y, (a.y + c.y) / 2, k) + Math.sin(Math.PI * u) * 1.2, lerp(S.z, (a.z + c.z) / 2, k));
                pez.rotation.set(-0.5 * Math.sin(Math.PI * u), yaw, 0);
            } else if (t < m.suelta) {
                pez.visible = true;
                if (pez.parent !== A.p.cuerpo) api.pegar(pez, 'n', 'cuerpo', [0, 1.05, 0.4], [0, Math.PI / 2, 0]);
            } else {
                // Al chocar los cinco el salmón se va con un destello
                if (pez.visible) {
                    pez.updateWorldMatrix(true, false);
                    const p = api.grupo.worldToLocal(pez.getWorldPosition(new THREE.Vector3()));
                    api.efecto('chispa', p.x, p.y, p.z, { tam: 0.5, vida: 0.5 });
                }
                pez.visible = false;
            }
        },
        terminar() {
            if (st.pez && st.pez.parent) st.pez.parent.remove(st.pez);
        }
    };
}
