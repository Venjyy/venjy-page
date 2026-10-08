// =========================================================
// VENJY · Física de cajas contra los bloques
// La usan los monstruos de la supervivencia (y lo que se mueva con gravedad): una caja de
// `ancho` × `alto` con los pies en `pos`, colisión por ejes como el jugador (jugador.js).
// =========================================================
import { TIPO, B } from './texturas.js';

// ¿Bloquea el paso el bloque (x, y, z)? Sin cargar cuenta como sólido (no se cae al vacío)
export function solidoEn(mundo, x, y, z) {
    const id = mundo.bloque(x, y, z);
    if (id === -1) return y >= 0;
    const t = TIPO[id];
    return t === 1 || t === 2 || t === 6;
}

export function chocaCaja(mundo, px, py, pz, ancho, alto) {
    const r = ancho / 2;
    for (let y = Math.floor(py); y <= Math.floor(py + alto - 0.001); y++) {
        for (let z = Math.floor(pz - r); z <= Math.floor(pz + r - 0.0001); z++) {
            for (let x = Math.floor(px - r); x <= Math.floor(px + r - 0.0001); x++) {
                if (solidoEn(mundo, x, y, z)) return true;
            }
        }
    }
    return false;
}

// Mueve el cuerpo `c` ({ pos, vel, ancho, alto }) un paso dt con gravedad. Deja en `c`:
// enSuelo, chocoLado (pegó contra una pared al avanzar), enAgua y enLava.
export function moverCuerpo(mundo, c, dt, { gravedad = 32, flota = true } = {}) {
    const p = c.pos, v = c.vel;
    const idPies = mundo.bloque(p.x, p.y + 0.2, p.z), idCuerpo = mundo.bloque(p.x, p.y + c.alto * 0.6, p.z);
    c.enAgua = idPies === B.AGUA || idCuerpo === B.AGUA;
    c.enLava = idPies === B.LAVA || idCuerpo === B.LAVA;
    if (c.enAgua || c.enLava) {
        v.y += ((flota ? 1.6 : -2) - v.y) * Math.min(1, dt * 3);
    } else {
        v.y -= gravedad * dt;
        if (v.y < -50) v.y = -50;
    }
    const pasos = Math.max(1, Math.ceil(Math.max(Math.abs(v.x), Math.abs(v.y), Math.abs(v.z)) * dt / 0.35));
    const h = dt / pasos;
    c.chocoLado = false;
    const antes = c.enSuelo;
    c.enSuelo = false;
    for (let i = 0; i < pasos; i++) {
        const dx = v.x * h, dy = v.y * h, dz = v.z * h;
        if (!chocaCaja(mundo, p.x + dx, p.y, p.z, c.ancho, c.alto)) p.x += dx; else { c.chocoLado = true; }
        if (!chocaCaja(mundo, p.x, p.y, p.z + dz, c.ancho, c.alto)) p.z += dz; else { c.chocoLado = true; }
        if (!chocaCaja(mundo, p.x, p.y + dy, p.z, c.ancho, c.alto)) p.y += dy;
        else {
            if (dy < 0) { c.enSuelo = true; p.y = Math.floor(p.y + dy) + 1; }
            v.y = 0;
        }
    }
    // Caída: altura máxima en el aire (para daño por caída si se quiere)
    if (!c.enSuelo && !c.enAgua) c.yMax = Math.max(c.yMax ?? p.y, p.y);
    else { c.caida = antes ? 0 : (c.yMax ?? p.y) - p.y; c.yMax = null; }
    // Atrapado dentro de un bloque (le pusieron uno encima): sube
    if (chocaCaja(mundo, p.x, p.y, p.z, c.ancho * 0.6, Math.min(c.alto, 0.9))) { p.y = Math.floor(p.y) + 1; v.y = 0; }
}

// Intersección rayo-caja (caja de pies en (x,y,z), ancho y alto). Devuelve la distancia o -1.
export function rayoCaja(ox, oy, oz, dx, dy, dz, x, y, z, ancho, alto) {
    const r = ancho / 2;
    const min = [x - r, y, z - r], max = [x + r, y + alto, z + r];
    const o = [ox, oy, oz], d = [dx, dy, dz];
    let t0 = 0, t1 = Infinity;
    for (let k = 0; k < 3; k++) {
        if (Math.abs(d[k]) < 1e-9) { if (o[k] < min[k] || o[k] > max[k]) return -1; continue; }
        let a = (min[k] - o[k]) / d[k], b = (max[k] - o[k]) / d[k];
        if (a > b) [a, b] = [b, a];
        t0 = Math.max(t0, a); t1 = Math.min(t1, b);
        if (t0 > t1) return -1;
    }
    return t0;
}
