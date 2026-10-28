// =========================================================
// VENJY · Supervivencia · Código del momento de Boris (Etapa B4c): el tronco que se parte en dos y cae
// Lo único que los datos no cubren: el tronco aparece entre los dos a un costado y en la marca `parte` se parte en dos mitades
// que se separan y giran. Las chispas del LoL y el hachazo ya son datos de la escena (momento-boris en escenas.json).
// =========================================================
const MADERA = ['ddbbbbdd', 'dbcccbbd', 'bccdccbb', 'bcdccccb', 'bccccdcb', 'bbccdccb', 'dbbcccbd', 'ddbbbbdd'];
const COL_MADERA = { b: '#7a5230', c: '#9a6a3e', d: '#4a2f18' };

export default function (m) {
    let C = null, dir = null, tronco = null, mitades = [];
    return {
        iniciar(api) {
            const n = api.posG('n'), j = api.posG('j');
            const dx = j.x - n.x, dz = j.z - n.z, L = Math.hypot(dx, dz) || 1;
            const ux = dx / L, uz = dz / L;
            dir = { px: -uz, pz: ux };
            C = { x: n.x + ux * 0.6 + dir.px * 0.25, y: n.y, z: n.z + uz * 0.6 + dir.pz * 0.25 };
            const tex = { filas: MADERA, colores: COL_MADERA };
            tronco = api.pegar(api.caja(0.5, 0.6, 0.5, null, tex), null, null, [C.x, C.y + 0.3, C.z]);
            mitades = [0, 1].map(() => {
                const mit = api.pegar(api.caja(0.25, 0.6, 0.5, null, tex), null, null, [C.x, C.y + 0.3, C.z]);
                mit.visible = false;
                return mit;
            });
        },
        // Se calcula desde api.e.t (sirve también hacia atrás con irA)
        cuadro(api) {
            const t = api.e.t;
            if (!tronco) return;
            tronco.visible = t < m.parte;
            const f = Math.max(0, t - m.parte), sep = 0.12 + Math.min(f, 0.8) * 0.6;
            mitades.forEach((mit, i) => {
                const lado = i ? 1 : -1;
                mit.visible = t >= m.parte;
                mit.position.set(C.x + dir.px * lado * sep, C.y + 0.3, C.z + dir.pz * lado * sep);
                mit.rotation.z = lado * Math.min(0.7, f * 1.6);
            });
            if (t >= m.parte && !api.e.hechos.has('tronco')) { api.e.hechos.add('tronco'); api.golpe({ x: C.x, y: C.y + 0.9, z: C.z }); }
        }
    };
}
