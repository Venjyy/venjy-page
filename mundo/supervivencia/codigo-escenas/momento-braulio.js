// =========================================================
// VENJY · Supervivencia · Código del momento de Braulio (Etapa B4c): el cofre que sube de la arena, se abre y la concha dorada
// que pasa de la mano de Braulio a la tuya. Las chispas de la arena ya son datos de la escena (momento-braulio en escenas.json).
// Marcas: aparece (sube el cofre) · arriba (llegó) · abre (se abre la tapa y sale la concha) · toma (Braulio la toma) ·
// da (se la da) · entregada (queda en tu mano).
// =========================================================
import { suave, lerp, tramo } from './comun.js';

const COL_COFRE = { g: '#f5c542', b: '#7a4a1f', d: '#5a3414' };
const FILAS_COFRE = ['gggggggg', 'gbbbbbbg', 'gdbbbbdg', 'gbbbbbbg', 'gbbbbbbg', 'gdbbbbdg', 'gbbbbbbg', 'gggggggg'];
const COL_CONCHA = { g: '#c98a1b', y: '#ffd84a', w: '#fff7c2' };
const FILAS_CONCHA = ['...g...', '..ggg..', '.gyyyg.', 'gywyyyg', '.gyyyg.', '..ggg..', '...g...'];

export default function (m) {
    const st = {};
    return {
        iniciar(api) {
            // Cofre: la tapa es un grupo bisagra (atrás, arriba) dentro del cofre
            st.cofre = api.caja(0.4, 0.3, 0.3, null, { filas: FILAS_COFRE, colores: COL_COFRE });
            st.bisagra = new api.THREE.Group();
            st.bisagra.position.set(0, 0.15, -0.15);
            const tapa = api.caja(0.4, 0.1, 0.3, null, { filas: FILAS_COFRE, colores: COL_COFRE });
            tapa.position.set(0, 0.05, 0.15);
            st.bisagra.add(tapa);
            st.cofre.add(st.bisagra);
            st.cofre.visible = false;
            api.pegar(st.cofre);
            st.concha = api.sprite(FILAS_CONCHA, COL_CONCHA, 0.36);
            st.concha.visible = false;
            api.pegar(st.concha);
        },
        cuadro(api) {
            const t = api.e.t, THREE = api.THREE, { cofre, bisagra, concha } = st;
            if (!cofre) return;
            const A = api.actor('n'), J = api.actor('j');
            const n = api.posG('n'), j = api.posG('j');
            const medio = { x: (n.x + j.x) / 2, y: (n.y + j.y) / 2, z: (n.z + j.z) / 2 };
            // Cofre: sube desde el suelo (aparece-arriba) y se abre (abre-toma)
            cofre.visible = t >= m.aparece;
            if (cofre.visible) {
                cofre.position.set(medio.x, medio.y + lerp(-0.45, 0.15, suave(tramo(t, m.aparece, m.arriba))), medio.z);
                bisagra.rotation.set(-1.7 * suave(tramo(t, m.abre, m.toma)), 0, 0);
            }
            // Concha: sale del cofre (abre-toma), la toma Braulio (toma), se la da al jugador (da-entregada) y queda en su mano
            if (t < m.abre) {
                concha.visible = false;
                if (concha.parent !== api.grupo) api.soltar(concha);
            } else if (t < m.toma) {
                concha.visible = true;
                if (concha.parent !== api.grupo) api.soltar(concha);
                const a = api.punta(A, 'D', new THREE.Vector3()), u = suave(tramo(t, m.abre, m.toma));
                concha.position.set(lerp(medio.x, a.x, u), lerp(medio.y + 0.4, a.y, u), lerp(medio.z, a.z, u));
            } else if (t < m.da) {
                concha.visible = true;
                if (concha.parent !== A.p.brazoD) api.pegar(concha, 'n', 'brazoD', [0, -0.7, 0.12]);
            } else if (t < m.entregada) {
                concha.visible = true;
                if (concha.parent !== api.grupo) api.soltar(concha);
                const a = api.punta(A, 'D', new THREE.Vector3()), c = api.punta(J, 'D', new THREE.Vector3());
                const u = suave(tramo(t, m.da, m.entregada));
                concha.position.set(lerp(a.x, c.x, u), lerp(a.y, c.y, u), lerp(a.z, c.z, u));
            } else {
                concha.visible = true;
                if (concha.parent !== J.p.brazoD) api.pegar(concha, 'j', 'brazoD', [0, -0.7, 0.12]);
            }
        }
    };
}
