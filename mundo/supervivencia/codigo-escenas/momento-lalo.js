// =========================================================
// VENJY · Supervivencia · Código del momento de Lalo (Etapa B4c): el sombrero viaja de su cabeza a su mano, a la cabeza del
// jugador y de vuelta. Marcas: sale (lo saca) · mano (lo tiene en la mano, camino a ti) · cabezaJ (llega a tu cabeza) ·
// vuelve (lo recupera) · llega (de vuelta en su cabeza).
// =========================================================
import { suave, tramo } from './comun.js';

const C = [0, 0.56, 0];                 // centro del sombrero, en coordenadas del cuello

function poner(o, padre) { if (o.parent !== padre) { if (o.parent) o.parent.remove(o); padre.add(o); } }

export default function (m) {
    let piezas = [];                    // { o, pos, rot, off } (pos/rot: en el cuello de Lalo)
    return {
        iniciar(api) {
            const cuello = api.actor('n').p.cuello;
            const hijos = cuello.children.filter(c => c.position.y >= 0.45 && c.position.y <= 0.7);
            piezas = hijos.map(o => ({ o, pos: o.position.clone(), rot: o.rotation.clone(), off: o.position.clone().sub(new api.THREE.Vector3(...C)) }));
            // Registro para que al terminar vuelvan a la cabeza de Lalo (api.prestar guarda el dueño y la posición)
            for (const p of piezas) api.prestar(p.o, 'n', 'cuello', p.pos.toArray(), [p.rot.x, p.rot.y, p.rot.z]);
        },
        cuadro(api) {
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
            if (t >= m.sale && t < m.mano) P = new T3.Vector3().lerpVectors(cabezaN, mano, suave(tramo(t, m.sale, m.mano)));
            else if (t >= m.mano && t < m.cabezaJ) P = new T3.Vector3().lerpVectors(mano, cabezaJ, suave(tramo(t, m.mano, m.cabezaJ)));
            else if (t >= m.vuelve && t < m.llega) P = new T3.Vector3().lerpVectors(cabezaJ, cabezaN, suave(tramo(t, m.vuelve, m.llega)));
            for (const p of piezas) {
                if (P) {
                    poner(p.o, api.grupo);
                    p.o.position.copy(P).add(p.off);
                } else if (t >= m.cabezaJ && t < m.vuelve) {
                    poner(p.o, cuelloJ);
                    p.o.position.copy(p.pos);
                } else {
                    poner(p.o, cuelloN);
                    p.o.position.copy(p.pos);
                }
            }
        }
    };
}
