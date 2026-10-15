// =========================================================
// VENJY · Combate · cinemática del rig de personas (bloque 8 · N3, mundo/COMBATE.md §15.5 y §15.6)
// Puro: sin Three.js. Repite la jerarquía de crearPersona (criaturas/cuerpo.js) con las mismas medidas, para que el
// motor sepa dónde quedan los pies, el arma y cada caja sin tener un modelo dibujado (la CPU, el servidor de la red y
// las pruebas). mundo/tests/combate-animacion.mjs compara estas matrices con las de Three.js.
//   fk(a, raiz)               matrices de mundo de cada hueso con los canales `a` (recortados a sus límites, como
//                             aplicarAngulos). raiz = { x, y, z, yaw } (el grupo g de la persona; falta = origen)
//   cajas(m, arma)            cajas orientadas (centro, ejes, medias) de torso, cabeza, brazos, piernas y el arma
//   pieMasBajo(a)             altura de la esquina más baja de las dos canillas con el cuerpo en y = 0
//   ajusteSuelo(a)            lo que hay que subir el cuerpo para que ese pie toque el suelo (suelo automático)
//   tobillo(m, lado)          punto del tobillo (punta de la canilla) en el mundo; lado 'D' o 'I'
//   resolverPierna(a, lado, objetivo, raiz)   IK de dos huesos: cambia pDx / pIx, rodD / rodI y la apertura pDz / pIz
//                             para que el tobillo llegue al objetivo. Devuelve el error que quedó.
//   penetracion(A, B)         cuánto entra una caja en la otra (0 si no se tocan), por ejes separadores
//   punto(M, x, y, z) / local(M, p)   de un sistema al mundo y del mundo a un sistema (matriz rígida 3×4)
// Ejes: la persona mira hacia +Z y su derecha es −X (como en cuerpo.js).
// =========================================================
import { recortar } from '../../datos/limites.js';

// Medidas de crearPersona (cuerpo.js): cintura, mitad de brazo o pierna, hombros y caderas
export const RIG = {
    cintura: 0.75, mitad: 0.375, hombroX: 0.375, hombroY: 0.75, caderaX: 0.125, caderaY: 0.75, cuelloY: 0.75,
    torso: { y: 0.375, medidas: [0.5, 0.75, 0.25] }, cabeza: { y: 0.25, medidas: [0.5, 0.5, 0.5] },
    extremidad: [0.25, 0.375, 0.25]
};

// ---------- Matrices 3×4 (fila mayor): [r00 r01 r02 tx · r10 r11 r12 ty · r20 r21 r22 tz] ----------
function matrizLocal(px, py, pz, x, y, z, o) {
    // Rotación de Euler en orden XYZ (la de Three.js): R = Rx · Ry · Rz
    const a = Math.cos(x), b = Math.sin(x), c = Math.cos(y), d = Math.sin(y), e = Math.cos(z), f = Math.sin(z);
    const ae = a * e, af = a * f, be = b * e, bf = b * f;
    o[0] = c * e; o[1] = -c * f; o[2] = d; o[3] = px;
    o[4] = af + be * d; o[5] = ae - bf * d; o[6] = -b * c; o[7] = py;
    o[8] = bf - ae * d; o[9] = be + af * d; o[10] = a * c; o[11] = pz;
    return o;
}
function por(A, B, o) {
    const r = new Array(12);
    for (let i = 0; i < 3; i++) {
        const a0 = A[i * 4], a1 = A[i * 4 + 1], a2 = A[i * 4 + 2];
        r[i * 4] = a0 * B[0] + a1 * B[4] + a2 * B[8];
        r[i * 4 + 1] = a0 * B[1] + a1 * B[5] + a2 * B[9];
        r[i * 4 + 2] = a0 * B[2] + a1 * B[6] + a2 * B[10];
        r[i * 4 + 3] = a0 * B[3] + a1 * B[7] + a2 * B[11] + A[i * 4 + 3];
    }
    if (o) { for (let i = 0; i < 12; i++) o[i] = r[i]; return o; }
    return r;
}
const hijo = (P, px, py, pz, x, y, z) => por(P, matrizLocal(px, py, pz, x, y, z, new Array(12)));
// Un punto de mundo en el sistema de la matriz M (inversa de una matriz rígida)
export const local = (M, p) => {
    const x = p[0] - M[3], y = p[1] - M[7], z = p[2] - M[11];
    return [M[0] * x + M[4] * y + M[8] * z, M[1] * x + M[5] * y + M[9] * z, M[2] * x + M[6] * y + M[10] * z];
};
export const punto = (M, x, y, z) => [
    M[0] * x + M[1] * y + M[2] * z + M[3], M[4] * x + M[5] * y + M[6] * z + M[7], M[8] * x + M[9] * y + M[10] * z + M[11]
];

// Matrices de mundo de cada hueso
export function fk(a, raiz) {
    const r = raiz || {};
    const g = matrizLocal(r.x || 0, r.y || 0, r.z || 0, 0, r.yaw || 0, 0, new Array(12));
    const L = RIG.mitad, k = c => recortar(a, c);
    const cuerpo = hijo(g, 0, a.y || 0, a.pz || 0, k('inc'), k('ry'), k('rz'));
    const pecho = hijo(cuerpo, 0, RIG.cintura, 0, k('pX'), k('pY'), k('pZ'));
    const cuello = hijo(pecho, 0, RIG.cuelloY, 0, k('cx'), k('cy'), k('cz'));
    const brazoD = hijo(pecho, -RIG.hombroX, RIG.hombroY, 0, k('bDx'), k('bDy'), k('bDz'));
    const brazoI = hijo(pecho, RIG.hombroX, RIG.hombroY, 0, k('bIx'), k('bIy'), k('bIz'));
    const antebrazoD = hijo(brazoD, 0, -L, 0, k('codoD'), 0, 0);
    const antebrazoI = hijo(brazoI, 0, -L, 0, k('codoI'), 0, 0);
    const munecaD = hijo(antebrazoD, 0, -L, 0, k('armaX'), 0, k('armaZ'));
    const munecaI = hijo(antebrazoI, 0, -L, 0, 0, 0, 0);
    const piernaD = hijo(cuerpo, -RIG.caderaX, RIG.caderaY, 0, k('pDx'), 0, -k('pDz'));
    const piernaI = hijo(cuerpo, RIG.caderaX, RIG.caderaY, 0, k('pIx'), 0, k('pIz'));
    const canillaD = hijo(piernaD, 0, -L, 0, k('rodD'), 0, 0);
    const canillaI = hijo(piernaI, 0, -L, 0, k('rodI'), 0, 0);
    return { raiz: g, cuerpo, pecho, cuello, brazoD, brazoI, antebrazoD, antebrazoI, munecaD, munecaI, piernaD, piernaI, canillaD, canillaI };
}

// Caja orientada: centro (punto de mundo), ejes (columnas de la matriz) y medias medidas
function caja(M, cx, cy, cz, medidas) {
    return {
        c: punto(M, cx, cy, cz),
        ejes: [[M[0], M[4], M[8]], [M[1], M[5], M[9]], [M[2], M[6], M[10]]],
        h: [medidas[0] / 2, medidas[1] / 2, medidas[2] / 2]
    };
}
// arma: { mano: 'D' | 'I', caja: { centro: [x, y, z], medidas: [w, h, d] } } en coordenadas de la muñeca (la hoja
// sale hacia +Z de la muñeca: con el brazo colgando apunta adelante, como un objeto de Minecraft en la mano)
export function cajas(m, arma) {
    const e = RIG.extremidad, mY = -RIG.mitad / 2;
    const salida = {
        torso: caja(m.pecho, 0, RIG.torso.y, 0, RIG.torso.medidas),
        cabeza: caja(m.cuello, 0, RIG.cabeza.y, 0, RIG.cabeza.medidas),
        brazoD: caja(m.brazoD, 0, mY, 0, e), antebrazoD: caja(m.antebrazoD, 0, mY, 0, e),
        brazoI: caja(m.brazoI, 0, mY, 0, e), antebrazoI: caja(m.antebrazoI, 0, mY, 0, e),
        piernaD: caja(m.piernaD, 0, mY, 0, e), canillaD: caja(m.canillaD, 0, mY, 0, e),
        piernaI: caja(m.piernaI, 0, mY, 0, e), canillaI: caja(m.canillaI, 0, mY, 0, e)
    };
    if (arma && arma.caja) salida.arma = caja(arma.mano === 'I' ? m.munecaI : m.munecaD, ...arma.caja.centro, arma.caja.medidas);
    return salida;
}

// ---------- Suelo automático ----------
// La esquina más baja de las dos canillas (con el cuerpo en y = 0 y la raíz en el origen)
const ESQUINAS = [];
for (const x of [-0.125, 0.125]) for (const y of [0, -RIG.mitad]) for (const z of [-0.125, 0.125]) ESQUINAS.push([x, y, z]);
export function pieMasBajo(a) {
    const m = fk({ ...a, y: 0 });
    return Math.min(alturaPie(m, 'D'), alturaPie(m, 'I'));
}
export const ajusteSuelo = a => -pieMasBajo(a);

// Altura de la esquina más baja de una canilla, en el mundo
export function alturaPie(m, lado) {
    const c = lado === 'I' ? m.canillaI : m.canillaD;
    let min = Infinity;
    for (const q of ESQUINAS) { const y = punto(c, q[0], q[1], q[2])[1]; if (y < min) min = y; }
    return min;
}
export const tobillo = (m, lado) => punto(lado === 'I' ? m.canillaI : m.canillaD, 0, -RIG.mitad, 0);

// ---------- IK de la pierna (dos huesos) ----------
// El tobillo va al objetivo (punto de mundo): la rodilla da el largo, la apertura (pDz / pIz) el costado y el muslo
// (pDx / pIx) el resto, todo dentro de sus límites. Devuelve lo que quedó de error (0 si llegó).
export function resolverPierna(a, lado, objetivo, raiz) {
    const W = fk(a, raiz).cuerpo, L = RIG.mitad, izq = lado === 'I';
    const kx = izq ? 'pIx' : 'pDx', kr = izq ? 'rodI' : 'rodD', kz = izq ? 'pIz' : 'pDz';
    // Objetivo en el sistema del cuerpo, respecto de la cadera
    const tx = objetivo[0] - W[3], ty = objetivo[1] - W[7], tz = objetivo[2] - W[11];
    const dx = W[0] * tx + W[4] * ty + W[8] * tz - (izq ? RIG.caderaX : -RIG.caderaX);
    const dy = W[1] * tx + W[5] * ty + W[9] * tz - RIG.caderaY;
    const dz = W[2] * tx + W[6] * ty + W[10] * tz;
    const dist = Math.min(Math.max(Math.hypot(dx, dy, dz), 1e-6), 2 * L * 0.9999);
    a[kr] = Math.acos(Math.max(-1, Math.min(1, dist * dist / (2 * L * L) - 1)));
    a[kr] = recortar(a, kr);
    const r = a[kr], vy = -L * (1 + Math.cos(r)), vz = -L * Math.sin(r);
    // Rz(φ) lleva el pie de costado: x = −vy·sen φ (φ = −pDz en la derecha, pIz en la izquierda)
    const sen = Math.max(-1, Math.min(1, dx / -vy));
    a[kz] = (izq ? 1 : -1) * Math.asin(sen);
    a[kz] = recortar(a, kz);
    const phi = izq ? a[kz] : -a[kz];
    const wy = vy * Math.cos(phi), wz = vz;
    let th = Math.atan2(dz, dy) - Math.atan2(wz, wy);
    if (th > Math.PI) th -= 2 * Math.PI; else if (th < -Math.PI) th += 2 * Math.PI;
    a[kx] = th;
    a[kx] = recortar(a, kx);
    const p = tobillo(fk(a, raiz), lado);
    return Math.hypot(p[0] - objetivo[0], p[1] - objetivo[1], p[2] - objetivo[2]);
}

// ---------- Choques entre cajas (ejes separadores) ----------
const dot = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
const cruz = (u, v) => [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
const radio = (B, eje) => B.h[0] * Math.abs(dot(B.ejes[0], eje)) + B.h[1] * Math.abs(dot(B.ejes[1], eje)) + B.h[2] * Math.abs(dot(B.ejes[2], eje));
export function penetracion(A, B) {
    const T = [B.c[0] - A.c[0], B.c[1] - A.c[1], B.c[2] - A.c[2]];
    const ejes = [...A.ejes, ...B.ejes];
    for (const u of A.ejes) for (const v of B.ejes) {
        const c = cruz(u, v), n = Math.hypot(c[0], c[1], c[2]);
        if (n > 1e-6) ejes.push([c[0] / n, c[1] / n, c[2] / n]);
    }
    let min = Infinity;
    for (const e of ejes) {
        const solape = radio(A, e) + radio(B, e) - Math.abs(dot(T, e));
        if (solape <= 0) return 0;
        if (solape < min) min = solape;
    }
    return min;
}
