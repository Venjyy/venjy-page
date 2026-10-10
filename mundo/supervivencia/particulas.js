// =========================================================
// VENJY · Supervivencia · Partículas
// Cubitos con velocidad, gravedad y vida corta: fragmentos al romper un bloque (con su color),
// humo, explosiones, salpicaduras y destellos de golpe crítico. Un solo InstancedMesh.
// =========================================================
import * as THREE from '../../vendor/three.module.js';
import { BLOQUES, TAM, COLS } from '../texturas.js';
import { marcar } from '../voxeles.js';

const MAX = 600;

export function crearParticulas({ scene, atlasLienzo }) {
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshBasicMaterial({ vertexColors: false });
    const malla = new THREE.InstancedMesh(geo, mat, MAX);
    malla.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    malla.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 3), 3);
    malla.count = 0;
    malla.frustumCulled = false;
    scene.add(malla);
    const p = [];
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), pos = new THREE.Vector3(), col = new THREE.Color();

    // Color promedio de la cara lateral de un bloque (para los fragmentos)
    const colores = new Map();
    function colorBloque(id) {
        if (colores.has(id)) return colores.get(id);
        let c = [0.5, 0.5, 0.5];
        const d = BLOQUES[id];
        if (d && atlasLienzo) {
            const ctx = atlasLienzo.getContext('2d', { willReadFrequently: true });
            const datos = ctx.getImageData((d.lado % COLS) * TAM, Math.floor(d.lado / COLS) * TAM, TAM, TAM).data;
            let r = 0, g = 0, b = 0, n = 0;
            for (let i = 0; i < datos.length; i += 4) if (datos[i + 3] > 128) { r += datos[i]; g += datos[i + 1]; b += datos[i + 2]; n++; }
            if (n) c = [Math.pow(r / n / 255, 2.2), Math.pow(g / n / 255, 2.2), Math.pow(b / n / 255, 2.2)];
        }
        colores.set(id, c);
        return c;
    }

    function emitir(x, y, z, vx, vy, vz, color, tam, vida, grav = 16) {
        if (p.length >= MAX) p.shift();
        p.push({ x, y, z, vx, vy, vz, c: color, tam, vida, max: vida, grav });
    }
    const az = (a) => (Math.random() - 0.5) * a;

    return {
        romper(id, x, y, z) {
            const t0 = performance.now();
            const c = colorBloque(id);
            for (let i = 0; i < 14; i++) {
                const k = 0.7 + Math.random() * 0.5;
                emitir(x + 0.5 + az(0.8), y + 0.5 + az(0.8), z + 0.5 + az(0.8), az(4), 2 + Math.random() * 3, az(4), [c[0] * k, c[1] * k, c[2] * k], 0.08 + Math.random() * 0.06, 0.6 + Math.random() * 0.4);
            }
            marcar('particulas', t0);
        },
        golpe(id, x, y, z) {
            const c = colorBloque(id);
            for (let i = 0; i < 3; i++) emitir(x + az(0.6) + 0.5, y + az(0.6) + 0.5, z + az(0.6) + 0.5, az(2), 1.5, az(2), c, 0.06, 0.35);
        },
        humo(x, y, z, n = 10) {
            for (let i = 0; i < n; i++) { const g = 0.25 + Math.random() * 0.2; emitir(x + az(0.8), y + az(0.8), z + az(0.8), az(0.8), 0.6 + Math.random(), az(0.8), [g, g, g], 0.15 + Math.random() * 0.15, 1 + Math.random(), -1); }
        },
        explosion(x, y, z) {
            for (let i = 0; i < 60; i++) {
                const g = 0.5 + Math.random() * 0.5;
                emitir(x + az(2), y + az(2), z + az(2), az(10), az(8) + 3, az(10), Math.random() < 0.3 ? [1, 0.5, 0.1] : [g, g, g], 0.2 + Math.random() * 0.3, 0.6 + Math.random() * 0.8, 4);
            }
        },
        salpicar(x, y, z) {
            for (let i = 0; i < 12; i++) emitir(x + az(0.5), y, z + az(0.5), az(2.5), 3 + Math.random() * 2, az(2.5), [0.25, 0.45, 0.95], 0.06, 0.6);
        },
        critico(x, y, z) {
            for (let i = 0; i < 10; i++) emitir(x + az(0.6), y + az(0.8), z + az(0.6), az(4), az(4) + 1, az(4), [1, 0.95, 0.6], 0.06, 0.5, 4);
        },
        fuego(x, y, z) { emitir(x + az(0.5), y + Math.random() * 0.6, z + az(0.5), az(0.4), 1.2, az(0.4), Math.random() < 0.5 ? [1, 0.6, 0.1] : [1, 0.85, 0.3], 0.08, 0.5, -1); },
        actualizar(dt) {
            const t0 = performance.now();
            for (let i = p.length - 1; i >= 0; i--) {
                const e = p[i];
                e.vida -= dt;
                if (e.vida <= 0) { p.splice(i, 1); continue; }
                e.vy -= e.grav * dt;
                e.x += e.vx * dt; e.y += e.vy * dt; e.z += e.vz * dt;
                const roce = Math.exp(-2 * dt); e.vx *= roce; e.vz *= roce;
            }
            malla.count = p.length;
            for (let i = 0; i < p.length; i++) {
                const e = p[i];
                const k = e.tam * Math.min(1, e.vida / e.max * 2);
                m4.compose(pos.set(e.x, e.y, e.z), q, s.set(k, k, k));
                malla.setMatrixAt(i, m4);
                malla.setColorAt(i, col.setRGB(e.c[0], e.c[1], e.c[2]));
            }
            malla.instanceMatrix.needsUpdate = true;
            if (malla.instanceColor) malla.instanceColor.needsUpdate = true;
            if (p.length) marcar('particulas', t0);
        }
    };
}
