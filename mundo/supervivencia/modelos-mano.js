// =========================================================
// VENJY · Supervivencia · Objetos con modelo 3D en la mano (7f-2)
// Guitarra, Teclado y Tambor no son un ícono extruido: son cajas y cilindros con color por vértice.
// Los usa la fábrica de mallas (mano.js): la mano en 1.ª persona y el cuerpo en 3.ª (pose-jugador.js).
// Las medidas están en las unidades del cuerpo de las personas (el bajo de Salonas, criaturas/npcs.js), con
// el mástil hacia +X y la cara hacia +Z: así, colgado del torso, se ve igual que el bajo de Salonas.
// `COLGAR[clave]`: dónde va en el torso (pos, rot) y cómo quedan los brazos (como Salonas: el izquierdo en el
// mástil, el derecho sobre las cuerdas). Sin DOM: Three llega de afuera (la fábrica lo trae).
// =========================================================

// Brillo por cara de BoxGeometry (+x, −x, +y, −y, +z, −z), como el sombreado de extruir() en mano.js
const SOMBRA_CARA = [0.8, 0.8, 1, 0.55, 0.9, 0.7];
const gamma = v => Math.pow(v, 2.2);

function colorear(geo, [r, g, b], porCara) {
    const n = geo.attributes.position.count, col = new Float32Array(n * 3), nor = geo.attributes.normal;
    for (let i = 0; i < n; i++) {
        let s;
        if (porCara) s = SOMBRA_CARA[Math.floor(i / 4)];
        else { const ny = nor.getY(i); s = ny > 0.5 ? 1 : ny < -0.5 ? 0.55 : 0.8; }
        col[i * 3] = gamma(r / 255 * s); col[i * 3 + 1] = gamma(g / 255 * s); col[i * 3 + 2] = gamma(b / 255 * s);
    }
    geo.setAttribute('color', new (geo.attributes.position.constructor)(col, 3));
    return geo;
}

// Ayudante: arma cajas con color sobre un grupo
// `grabar` (un arreglo) en vez de Three: solo anota las piezas, para dibujar el ícono (iconoModelo)
function fabricar(THREE, material, grabar) {
    const g = grabar ? null : new THREE.Group();
    return {
        g,
        caja(w, h, d, color, x, y, z, rot) {
            if (grabar) { grabar.push({ t: 'caja', w, h, d, color, x, y, z }); return null; }
            const m = new THREE.Mesh(colorear(new THREE.BoxGeometry(w, h, d), color, true), material);
            m.position.set(x, y, z);
            if (rot) m.rotation.set(rot[0] || 0, rot[1] || 0, rot[2] || 0);
            g.add(m);
            return m;
        },
        cilindro(r, h, color, x, y, z, rot, seg = 14) {
            if (grabar) { grabar.push({ t: 'cil', r, h, color, x, y, z }); return null; }
            const m = new THREE.Mesh(colorear(new THREE.CylinderGeometry(r, r, h, seg), color, false), material);
            m.position.set(x, y, z);
            if (rot) m.rotation.set(rot[0] || 0, rot[1] || 0, rot[2] || 0);
            g.add(m);
            return m;
        }
    };
}

const MADERA = [196, 128, 58], MADERA_OSC = [150, 92, 42], MASTIL = [120, 76, 44], DIAPASON = [40, 26, 18];
const PLATA = [214, 214, 208], NEGRO = [26, 24, 26];

// Guitarra acústica: dos lóbulos y cintura, boca oscura, mástil largo con trastes y clavijero; 6 clavijas
function guitarra(THREE, mat, grabar) {
    const f = fabricar(THREE, mat, grabar);
    f.caja(0.64, 0.58, 0.15, MADERA, -0.02, 0, 0);           // lóbulo grande
    f.caja(0.34, 0.34, 0.15, MADERA_OSC, 0.38, 0.01, 0);      // cintura
    f.caja(0.46, 0.44, 0.15, MADERA, 0.62, 0.01, 0);          // lóbulo chico
    f.caja(0.2, 0.2, 0.02, NEGRO, 0.14, 0, 0.085);            // boca
    f.caja(0.26, 0.06, 0.03, [64, 40, 24], -0.2, 0, 0.09);    // puente
    f.caja(0.78, 0.1, 0.07, MASTIL, 1.22, 0.015, 0.01);       // mástil
    f.caja(0.78, 0.075, 0.025, DIAPASON, 1.22, 0.015, 0.05);  // diapasón
    for (let k = 0; k < 5; k++) f.caja(0.014, 0.08, 0.03, PLATA, 0.95 + k * 0.14, 0.015, 0.055); // trastes
    f.caja(0.3, 0.16, 0.06, [64, 42, 26], 1.76, 0.02, 0.01);  // clavijero
    for (let k = 0; k < 3; k++) {
        f.caja(0.035, 0.035, 0.12, PLATA, 1.68 + k * 0.09, 0.09, 0.01);
        f.caja(0.035, 0.035, 0.12, PLATA, 1.68 + k * 0.09, -0.05, 0.01);
    }
    f.caja(1.55, 0.014, 0.014, [228, 228, 222], 0.9, 0.015, 0.1); // cuerdas
    return f.g;
}

// Teclado: caja oscura, perillas arriba, teclas blancas y negras
function teclado(THREE, mat, grabar) {
    const f = fabricar(THREE, mat, grabar);
    f.caja(1.2, 0.34, 0.1, [44, 46, 56], 0, 0, 0);
    f.caja(1.2, 0.06, 0.1, [28, 30, 38], 0, 0.14, 0.005); // panel de arriba
    const perilla = [[210, 60, 56], [240, 240, 236], [70, 130, 210], [240, 190, 50]];
    for (let k = 0; k < 8; k++) f.caja(0.05, 0.05, 0.03, perilla[k % 4], -0.46 + k * 0.13, 0.14, 0.07);
    f.caja(1.12, 0.17, 0.03, [238, 238, 232], 0, -0.06, 0.07); // teclas blancas
    for (let k = 0; k < 16; k++) f.caja(0.012, 0.17, 0.034, [150, 150, 146], -0.525 + k * 0.07, -0.06, 0.072); // separaciones
    for (const k of [0, 1, 3, 4, 5, 7, 8, 10, 11, 12]) f.caja(0.04, 0.095, 0.045, [24, 22, 24], -0.5 + (k + 0.7) * 0.07, -0.025, 0.08); // negras
    return f.g;
}

// Tambor: cilindro rojo con aros plateados y parche claro; las tensoras, una franja más oscura
function tambor(THREE, mat, grabar) {
    const f = fabricar(THREE, mat, grabar);
    f.cilindro(0.27, 0.3, [186, 48, 52], 0, 0, 0);
    f.cilindro(0.274, 0.05, PLATA, 0, 0.155, 0);        // aro de arriba
    f.cilindro(0.274, 0.05, PLATA, 0, -0.155, 0);       // aro de abajo
    f.cilindro(0.255, 0.012, [244, 236, 214], 0, 0.175, 0); // parche
    f.cilindro(0.272, 0.04, [120, 28, 32], 0, 0, 0);    // franja
    for (let k = 0; k < 8; k++) { // tensoras
        const a = k / 8 * Math.PI * 2;
        f.caja(0.025, 0.3, 0.025, PLATA, Math.cos(a) * 0.277, 0, Math.sin(a) * 0.277);
    }
    return f.g;
}

export const MODELOS = { guitarra, teclado, tambor };

// Colgados del torso, como el bajo de Salonas. Aquí solo los giros [x, y, z] de cada brazo; la posición, el giro y la
// escala del modelo en el torso están en AJUSTE_OBJETO.mano3 de objetos-mano-datos.js (y se editan en el Estudio).
export const COLGAR = {
    guitarra: { brazoI: [-1.05, 0, 0.55], brazoD: [-0.6, 0, 0.3] },
    teclado: { brazoI: [-1.0, 0, 0.45], brazoD: [-1.0, 0, -0.1] },
    tambor: { brazoI: [-0.9, 0, 0.1], brazoD: [-0.9, 0, -0.1] }
};

// ¿Este objeto (clave de OBJETOS en minúscula) tiene modelo?
export const tieneModelo = clave => !!(clave && MODELOS[String(clave).toLowerCase()]);
export function construirModelo(THREE, clave, material) {
    return MODELOS[String(clave).toLowerCase()](THREE, material);
}

// ---------------------------------------------------------
// Ícono de 16×16 dibujado desde el mismo modelo (sin Three ni DOM): se lanza un rayo por cada subpíxel, de
// frente a una vista girada, y se pinta el color de la pieza más cercana con luz arriba a la izquierda.
// vista: { yaw, pitch, roll } en radianes (roll gira el dibujo en el plano: el mástil queda en diagonal).
// Devuelve 256 entradas [r, g, b] o null (el contorno lo pone el pintor con contornear()).
// ---------------------------------------------------------
export const VISTA_ICONO = {
    guitarra: { yaw: -0.5, pitch: 0.35, roll: 0.75 },
    teclado: { yaw: -0.45, pitch: 0.7, roll: 0.15 },
    tambor: { yaw: 0.4, pitch: 0.75, roll: 0 }
};
export function iconoModelo(clave, vista = null, lado = 16) {
    const k = String(clave).toLowerCase();
    const piezas = [];
    MODELOS[k](null, null, piezas);
    const v = vista || VISTA_ICONO[k] || { yaw: -0.4, pitch: 0.4, roll: 0 };
    // Matriz modelo → vista: M = Rz(roll) · Rx(pitch) · Ry(yaw)
    const cy = Math.cos(v.yaw), sy = Math.sin(v.yaw), cx = Math.cos(v.pitch), sx = Math.sin(v.pitch), cz = Math.cos(v.roll), sz = Math.sin(v.roll);
    const Ry = [[cy, 0, sy], [0, 1, 0], [-sy, 0, cy]], Rx = [[1, 0, 0], [0, cx, -sx], [0, sx, cx]], Rz = [[cz, -sz, 0], [sz, cz, 0], [0, 0, 1]];
    const mul = (A, B) => A.map((f, i) => [0, 1, 2].map(j => f[0] * B[0][j] + f[1] * B[1][j] + f[2] * B[2][j]));
    const M = mul(Rz, mul(Rx, Ry));
    const aplicar = (m, p) => [m[0][0] * p[0] + m[0][1] * p[1] + m[0][2] * p[2], m[1][0] * p[0] + m[1][1] * p[1] + m[1][2] * p[2], m[2][0] * p[0] + m[2][1] * p[1] + m[2][2] * p[2]];
    const T = [[M[0][0], M[1][0], M[2][0]], [M[0][1], M[1][1], M[2][1]], [M[0][2], M[1][2], M[2][2]]]; // inversa = traspuesta
    // Cada pieza como caja en el modelo: [mín, máx] (el cilindro, por su caja envolvente y su radio)
    const cajas = piezas.map(p => p.t === 'caja'
        ? { ...p, a: [p.x - p.w / 2, p.y - p.h / 2, p.z - p.d / 2], b: [p.x + p.w / 2, p.y + p.h / 2, p.z + p.d / 2] }
        : { ...p, a: [p.x - p.r, p.y - p.h / 2, p.z - p.r], b: [p.x + p.r, p.y + p.h / 2, p.z + p.r] });
    // Encuadre: caja que contiene todas las esquinas en la vista
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const c of cajas) for (const ex of [c.a[0], c.b[0]]) for (const ey of [c.a[1], c.b[1]]) for (const ez of [c.a[2], c.b[2]]) {
        const q = aplicar(M, [ex, ey, ez]);
        x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]);
    }
    const tam = Math.max(x1 - x0, y1 - y0) / (lado - 2); // 1 px de margen
    const cx0 = (x0 + x1) / 2, cy0 = (y0 + y1) / 2;
    const luz = (() => { const l = [-0.45, 0.75, 0.5], n = Math.hypot(...l); return l.map(e => e / n); })();
    // Rayo (origen o, dirección d) contra una pieza: { t, n } o null, con la normal en el modelo
    function golpe(c, o, d) {
        if (c.t === 'caja') {
            let t0 = -1e9, t1 = 1e9, nA = null;
            for (let i = 0; i < 3; i++) {
                if (Math.abs(d[i]) < 1e-9) { if (o[i] < c.a[i] || o[i] > c.b[i]) return null; continue; }
                let ta = (c.a[i] - o[i]) / d[i], tb = (c.b[i] - o[i]) / d[i], sg = -1;
                if (ta > tb) { const q = ta; ta = tb; tb = q; sg = 1; }
                if (ta > t0) { t0 = ta; nA = [0, 0, 0]; nA[i] = sg; }
                t1 = Math.min(t1, tb);
                if (t0 > t1) return null;
            }
            return nA ? { t: t0, n: nA } : null;
        }
        // cilindro vertical (eje y)
        let mejor = null;
        const ox = o[0] - c.x, oz = o[2] - c.z, ymin = c.y - c.h / 2, ymax = c.y + c.h / 2;
        const a = d[0] * d[0] + d[2] * d[2], b = 2 * (ox * d[0] + oz * d[2]), cc = ox * ox + oz * oz - c.r * c.r;
        if (a > 1e-9) {
            const disc = b * b - 4 * a * cc;
            if (disc >= 0) for (const t of [(-b - Math.sqrt(disc)) / (2 * a)]) {
                const y = o[1] + t * d[1];
                if (y >= ymin && y <= ymax && (!mejor || t < mejor.t)) mejor = { t, n: [(ox + t * d[0]) / c.r, 0, (oz + t * d[2]) / c.r] };
            }
        }
        if (Math.abs(d[1]) > 1e-9) for (const [yy, ny] of [[ymax, 1], [ymin, -1]]) {
            const t = (yy - o[1]) / d[1], px = ox + t * d[0], pz = oz + t * d[2];
            if (px * px + pz * pz <= c.r * c.r && (!mejor || t < mejor.t)) mejor = { t, n: [0, ny, 0] };
        }
        return mejor;
    }
    const salida = new Array(lado * lado).fill(null);
    const S = 3; // subpíxeles por lado
    const dir = aplicar(T, [0, 0, -1]);
    for (let py = 0; py < lado; py++) for (let px = 0; px < lado; px++) {
        let n = 0, R = 0, G = 0, Bl = 0;
        for (let sy2 = 0; sy2 < S; sy2++) for (let sx2 = 0; sx2 < S; sx2++) {
            const u = cx0 + (px + (sx2 + 0.5) / S - lado / 2) * tam, w = cy0 - (py + (sy2 + 0.5) / S - lado / 2) * tam;
            const o = aplicar(T, [u, w, 20]);
            let mejor = null, mc = null;
            for (const c of cajas) { const h = golpe(c, o, dir); if (h && (!mejor || h.t < mejor.t)) { mejor = h; mc = c; } }
            if (!mejor) continue;
            const nv = aplicar(M, mejor.n); // normal en la vista
            const brillo = 0.75 + 0.45 * Math.max(0, nv[0] * luz[0] + nv[1] * luz[1] + nv[2] * luz[2]);
            R += Math.min(255, mc.color[0] * brillo); G += Math.min(255, mc.color[1] * brillo); Bl += Math.min(255, mc.color[2] * brillo); n++;
        }
        if (n >= S * S / 3) salida[py * lado + px] = [Math.round(R / n), Math.round(G / n), Math.round(Bl / n)];
    }
    return salida;
}