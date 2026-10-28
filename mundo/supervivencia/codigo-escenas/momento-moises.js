// =========================================================
// VENJY · Supervivencia · Código del momento de Moisés (Etapa B4c): el monito de nieve que crece pieza a pieza entre los dos
// (tres bolas y la cara). Marcas: baja, medio, alta (cuándo empieza a crecer cada bola) y cara (nariz y ojos).
// =========================================================
const suaveT = (u, a, b) => Math.max(0, Math.min(1, (u - a) / (b - a)));

const BLANCO = '#f4f8ff', NARANJA = '#ff8a1e', NEGRO = '#161616';

export default function (m) {
    let piezas = [];
    return {
        iniciar(api) {
            const M = api.posG('n');                     // pies de Moisés (coordenadas del grupo)
            const J = api.jugador.pos;                   // jugador (mundo; x, z igual que el grupo)
            const suelo = M.y;
            // Dirección del jugador hacia Moisés y su derecha (mirando hacia Moisés)
            const ax = M.x - J.x, az = M.z - J.z, al = Math.hypot(ax, az) || 1;
            const fx = ax / al, fz = az / al;            // del jugador hacia Moisés
            const dx = -fz, dz = fx;                     // derecha del jugador (mirando hacia Moisés)
            // Monito: entre los dos, a un costado (0.6 a la derecha del jugador)
            const bx = J.x + ax * 0.5 + dx * 0.6, bz = J.z + az * 0.5 + dz * 0.6;
            // Hacia dónde mira el monito: hacia el jugador
            const sx = J.x - bx, sz = J.z - bz, sl = Math.hypot(sx, sz) || 1;
            const giro = Math.atan2(sx / sl, sz / sl);
            const cajas = [
                { m: api.caja(0.5, 0.5, 0.5, BLANCO), t0: m.baja, dur: 0.6, x: bx, y0: suelo, z: bz, h: 0.5 },
                { m: api.caja(0.38, 0.38, 0.38, BLANCO), t0: m.medio, dur: 0.6, x: bx, y0: suelo + 0.5, z: bz, h: 0.38 },
                { m: api.caja(0.28, 0.28, 0.28, BLANCO), t0: m.alta, dur: 0.6, x: bx, y0: suelo + 0.88, z: bz, h: 0.28 }
            ];
            // Cara en la cabeza (la cabeza va de suelo + 0.88 a suelo + 1.16): nariz hacia el jugador y dos ojos
            const cy = suelo + 1.02, px = -sz / sl, pz = sx / sl; // (px, pz): derecha del monito
            const cara = [
                { m: api.caja(0.06, 0.06, 0.22, NARANJA), t0: m.cara, dur: 0.4, x: bx + sx / sl * 0.18, y0: cy, z: bz + sz / sl * 0.18, h: null, giro },
                { m: api.caja(0.07, 0.07, 0.07, NEGRO), t0: m.cara, dur: 0.4, x: bx + sx / sl * 0.15 + px * 0.1, y0: cy + 0.1, z: bz + sz / sl * 0.15 + pz * 0.1, h: null },
                { m: api.caja(0.07, 0.07, 0.07, NEGRO), t0: m.cara, dur: 0.4, x: bx + sx / sl * 0.15 - px * 0.1, y0: cy + 0.1, z: bz + sz / sl * 0.15 - pz * 0.1, h: null }
            ];
            piezas = [...cajas, ...cara];
            for (const p of piezas) {
                api.pegar(p.m, null, null, [p.x, p.y0, p.z], p.giro !== undefined ? [0, p.giro, 0] : [0, 0, 0]);
                p.m.visible = false;
            }
        },
        cuadro(api) {
            const t = api.e.t;
            for (const p of piezas) {
                const k = suaveT(t, p.t0, p.t0 + p.dur);
                const s = k * k * (3 - 2 * k);           // suave: crece desde 0
                p.m.visible = s > 0.01;
                p.m.scale.setScalar(Math.max(s, 0.0001));
                // Las cajas crecen desde su base; la nariz y los ojos, desde su centro
                p.m.position.set(p.x, p.h ? p.y0 + p.h * s / 2 : p.y0, p.z);
            }
        }
    };
}
