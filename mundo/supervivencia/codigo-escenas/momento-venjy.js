// =========================================================
// VENJY · Supervivencia · Código del momento de Venjy, «Tu bloque» (Etapa B4c): el bloque dorado que sale entre los dos, gira,
// vuela a las manos del jugador y sube con él cuando alza los brazos. Marcas: aparece (sale, con golpe) · creceFin (llegó a su
// tamaño) · vuela (sale hacia tus manos) · llega (en tus manos) · alza (sube con tus brazos) · alzaFin (arriba) ·
// choque (el destello de celebrar).
// =========================================================
import { suave, lerp, tramo } from './comun.js';

// Texturas píxel del bloque
const COL_BLOQUE = { d: '#8a5a00', g: '#f5c542', l: '#ffe68a', s: '#fff7c2' };
function filasBloque() {
    const f = [];
    for (let y = 0; y < 16; y++) {
        let s = '';
        for (let x = 0; x < 16; x++) {
            const borde = x === 0 || y === 0 || x === 15 || y === 15;
            const estrella = ((x === 7 || x === 8) && y >= 3 && y <= 12) || ((y === 7 || y === 8) && x >= 3 && x <= 12);
            s += borde ? 'd' : estrella ? 's' : (x < 3 || y < 3) ? 'l' : 'g';
        }
        f.push(s);
    }
    return f;
}

// El bloque en las manos del jugador (coordenadas de su cuerpo) y arriba, con los brazos en alto
const EN_MANOS = [0, 1.26, 0.95];
const EN_ALTO = [0, 2.3, 0.3];

export default function (m) {
    const st = {};
    return {
        iniciar(api) {
            st.bloque = api.caja(0.44, 0.44, 0.44, null, { filas: filasBloque(), colores: COL_BLOQUE });
            st.bloque.visible = false;
            api.pegar(st.bloque);
        },
        cuadro(api) {
            const t = api.e.t, b = st.bloque, THREE = api.THREE;
            if (!b) return;
            if (t < m.aparece) { b.visible = false; if (b.parent !== api.grupo) api.soltar(b); return; }
            b.visible = true;
            const n = api.posG('n'), j = api.posG('j');
            const medio = { x: (n.x + j.x) / 2, y: (n.y + j.y) / 2 + 1.3, z: (n.z + j.z) / 2 };
            if (t < m.vuela) {
                if (b.parent !== api.grupo) api.soltar(b);
                b.position.set(medio.x, medio.y, medio.z);
                b.rotation.set(0, (t - m.aparece) * 1.6, 0);
                b.scale.setScalar(suave(tramo(t, m.aparece, m.creceFin)));
            } else if (t < m.llega) {
                // Vuela a las manos del jugador: el destino se calcula cada cuadro (el jugador está quieto)
                const cu = api.actor('j').p.cuerpo;
                cu.updateWorldMatrix(true, false);
                const dest = api.grupo.worldToLocal(cu.localToWorld(new THREE.Vector3(...EN_MANOS)));
                const u = suave(tramo(t, m.vuela, m.llega));
                if (b.parent !== api.grupo) api.soltar(b);
                b.position.set(lerp(medio.x, dest.x, u), lerp(medio.y, dest.y, u) + Math.sin(Math.PI * u) * 0.6, lerp(medio.z, dest.z, u));
                b.rotation.set(0, 0, 0);
                b.scale.setScalar(1);
            } else {
                if (b.parent !== api.actor('j').p.cuerpo) api.pegar(b, 'j', 'cuerpo', EN_MANOS, [0, 0, 0]);
                b.scale.setScalar(1);
                const k = suave(tramo(t, m.alza, m.alzaFin));
                b.position.set(...EN_MANOS.map((v, i) => lerp(v, EN_ALTO[i], k)));
                b.rotation.set(0, 0, 0);
            }
            if (t >= m.aparece && !api.e.hechos.has('chB')) { api.e.hechos.add('chB'); api.golpe(medio); }
            if (t >= m.choque && !api.e.hechos.has('chL')) {
                api.e.hechos.add('chL');
                api.golpe(api.grupo.worldToLocal(b.getWorldPosition(new THREE.Vector3())));
            }
        }
    };
}
