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
function fabricar(THREE, material) {
    const g = new THREE.Group();
    return {
        g,
        caja(w, h, d, color, x, y, z, rot) {
            const m = new THREE.Mesh(colorear(new THREE.BoxGeometry(w, h, d), color, true), material);
            m.position.set(x, y, z);
            if (rot) m.rotation.set(rot[0] || 0, rot[1] || 0, rot[2] || 0);
            g.add(m);
            return m;
        },
        cilindro(r, h, color, x, y, z, rot, seg = 14) {
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
function guitarra(THREE, mat) {
    const f = fabricar(THREE, mat);
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
function teclado(THREE, mat) {
    const f = fabricar(THREE, mat);
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
function tambor(THREE, mat) {
    const f = fabricar(THREE, mat);
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
