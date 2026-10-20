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

// ---------- Armas del combate (bloque 8 · L2) ----------
// Katana: a lo largo de +Z (la hoja sale de la mano hacia +Z de la muñeca, como estilo-*.json → arma.caja), con el
// filo hacia −Y y el lomo hacia +Y; el origen es donde la agarra la mano derecha, junto a la guarda (la izquierda
// va atrás en el mango). La hoja se curva un poco hacia el lomo (sori) y termina en una punta (kissaki) que se angosta.
const ACERO = [196, 204, 214], FILO = [240, 244, 250], LOMO = [128, 136, 148], HAMON = [222, 228, 238];
const HIERRO = [46, 42, 40], ORO = [206, 168, 72], ITO = [34, 30, 52], SAME = [230, 224, 206], LACA = [26, 22, 28];
export const KATANA = { mango: [-0.24, 0.06], guarda: 0.075, hoja: [0.1, 0.86], ancho: 0.058, grosor: 0.024, sori: 0.045 };
function katana(THREE, mat, grabar) {
    const f = fabricar(THREE, mat, grabar), K = KATANA;
    // Mango (tsuka): piel clara (same) bajo el cordaje en rombos (ito), con su remate (kashira) y el collar (fuchi)
    const [m0, m1] = K.mango, largoM = m1 - m0;
    f.caja(0.046, 0.06, largoM, SAME, 0, 0, (m0 + m1) / 2);
    const vueltas = 7;
    for (let k = 0; k < vueltas; k++) {
        const z = m0 + 0.02 + (k + 0.5) * (largoM - 0.04) / vueltas;
        // Cada vuelta del cordaje cruza en X sobre las dos caras: queda el rombo de piel entre una y otra
        f.caja(0.05, 0.064, 0.016, ITO, 0, 0, z, [0, 0, (k % 2 ? 1 : -1) * 0.5]);
        f.caja(0.05, 0.03, 0.03, ITO, 0, 0, z);
    }
    f.caja(0.054, 0.068, 0.024, HIERRO, 0, 0, m0 - 0.008);          // kashira
    f.caja(0.058, 0.07, 0.016, ORO, 0, 0, m0 - 0.022);              // remate dorado
    f.caja(0.052, 0.066, 0.018, HIERRO, 0, 0, m1 + 0.004);          // fuchi
    f.caja(0.012, 0.02, 0.05, ORO, 0.026, 0.004, (m0 + m1) / 2 + 0.02); // menuki (adorno bajo el cordaje)
    // Guarda (tsuba): disco de hierro con borde dorado; habaki de cobre sobre la hoja
    f.cilindro(0.075, 0.014, HIERRO, 0, 0, K.guarda, [Math.PI / 2, 0, 0], 12);
    f.cilindro(0.078, 0.008, ORO, 0, 0, K.guarda, [Math.PI / 2, 0, 0], 12);
    f.caja(0.03, 0.068, 0.03, [184, 120, 72], 0, 0.002, K.guarda + 0.024);
    // Hoja: tramos que se curvan hacia el lomo; cada tramo con filo claro, línea del temple y lomo oscuro
    const [h0, h1] = K.hoja, n = 8, largo = (h1 - h0) / n;
    for (let k = 0; k < n; k++) {
        const u0 = k / n, u1 = (k + 1) / n, u = (u0 + u1) / 2;
        const y = K.sori * u * u, giro = -2 * K.sori * u / (h1 - h0); // la curva sube hacia la punta
        const punta = k === n - 1, alto = K.ancho * (1 - 0.18 * u) * (punta ? 0.7 : 1);
        const z = h0 + (k + 0.5) * largo, rot = [giro, 0, 0];
        f.caja(K.grosor, alto, largo + 0.004, ACERO, 0, y, z, rot);
        f.caja(K.grosor * 0.7, alto * 0.28, largo + 0.004, FILO, 0, y - alto * 0.38, z, rot);  // filo
        f.caja(K.grosor + 0.002, alto * 0.08, largo + 0.004, HAMON, 0, y - alto * 0.16, z, rot); // temple (hamon)
        f.caja(K.grosor * 0.8, alto * 0.18, largo + 0.004, LOMO, 0, y + alto * 0.42, z, rot);  // lomo
    }
    // Punta (kissaki): dos escalones que se angostan hacia el filo
    const yp = K.sori;
    f.caja(K.grosor * 0.8, K.ancho * 0.42, 0.04, ACERO, 0, yp + K.ancho * 0.12, h1 + 0.02, [-0.15, 0, 0]);
    f.caja(K.grosor * 0.6, K.ancho * 0.2, 0.03, FILO, 0, yp + K.ancho * 0.2, h1 + 0.05, [-0.3, 0, 0]);
    return f.g;
}
// Vaina (saya): laca negra con boca y contera de cuerno, y el cordón (sageo) atado cerca de la boca. Origen en la boca,
// a lo largo de +Z (como la hoja), con la curva hacia +Y.
function vaina_katana(THREE, mat, grabar) {
    const f = fabricar(THREE, mat, grabar), K = KATANA, largo = K.hoja[1] - K.hoja[0] + 0.08, n = 6, tramo = largo / n;
    for (let k = 0; k < n; k++) {
        const u = (k + 0.5) / n, y = K.sori * u * u, giro = -2 * K.sori * u / largo;
        f.caja(0.042, 0.078, tramo + 0.004, LACA, 0, y, (k + 0.5) * tramo, [giro, 0, 0]);
        f.caja(0.044, 0.012, tramo + 0.004, [60, 54, 66], 0, y + 0.03, (k + 0.5) * tramo, [giro, 0, 0]); // brillo
    }
    f.caja(0.05, 0.086, 0.03, [70, 58, 48], 0, 0, 0.015);                          // koiguchi (boca)
    f.caja(0.046, 0.082, 0.034, [70, 58, 48], 0, K.sori, largo - 0.017);           // kojiri (contera)
    f.caja(0.05, 0.03, 0.04, [92, 72, 140], 0, 0.045, 0.12);                       // kurikata y cordón
    f.caja(0.012, 0.02, 0.22, [92, 72, 140], 0.028, 0.03, 0.22, [0.25, 0, 0]);
    return f.g;
}

export const MODELOS = { guitarra, teclado, tambor, katana, vaina_katana };
// Las que no son objetos del inventario (por ahora): las elige el estilo (estilo-*.json → arma.modelo / arma.vaina) y
// la pestaña Objetos del Estudio las muestra aparte para ajustar su agarre
export const ARMAS = { katana: { es: 'Katana', en: 'Katana' }, vaina_katana: { es: 'Vaina de la katana', en: 'Katana scabbard' } };

// Colgados del torso, como el bajo de Salonas. Aquí solo los giros [x, y, z] de cada brazo; la posición, el giro y la
// escala del modelo en el torso están en AJUSTE_OBJETO.mano3 de objetos-mano-datos.js (y se editan en el Estudio).
export const COLGAR = {
    guitarra: { brazoI: [-1.05, 0, 0.55], brazoD: [-0.6, 0, 0.3] },
    teclado: { brazoI: [-1.0, 0, 0.45], brazoD: [-1.0, 0, -0.1] },
    tambor: { brazoI: [-0.9, 0, 0.1], brazoD: [-0.9, 0, -0.1] }
};

// El arma de un estilo en una persona (arena, capturas): el modelo en la muñeca y la vaina en la cadera, con el agarre
// de objetos-mano.json (agarre('mano3', clave, 'modelo'), que llega de afuera para que este módulo siga sin datos).
// arma: estilo-*.json → arma ({ mano, modelo, vaina }). Devuelve { arma, vaina } (grupos ya colgados) o null.
export function colocarArma(THREE, p, arma, material, agarre) {
    if (!arma || !arma.modelo || !MODELOS[arma.modelo]) return null;
    const muneca = arma.mano === 'I' ? p.munecaI : p.munecaD;
    if (!muneca) return null;
    const ag = agarre('mano3', arma.modelo, 'modelo');
    const m = MODELOS[arma.modelo](THREE, material), g = new THREE.Group();
    g.position.set(...ag.pos); g.rotation.set(...ag.rot); m.scale.setScalar(ag.escala);
    g.add(m);
    // La posición se mide desde el hombro (como los objetos de pose-jugador.js): se le suma lo que hay hasta la muñeca
    g.position.y -= muneca.position.y + muneca.parent.position.y;
    muneca.add(g);
    let vaina = null;
    if (arma.vaina && MODELOS[arma.vaina] && p.cuerpo) {
        const av = agarre('mano3', arma.vaina, 'modelo');
        vaina = MODELOS[arma.vaina](THREE, material);
        vaina.position.set(...av.pos); vaina.rotation.set(...av.rot); vaina.scale.setScalar(av.escala);
        p.cuerpo.add(vaina);
    }
    return { arma: g, vaina };
}

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