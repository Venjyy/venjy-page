// =========================================================
// VENJY · Supervivencia · Subsuelo
// Lo que hay bajo el mapa del portafolio en el modo supervivencia: roca madre, cuevas
// (túneles «espagueti» y cavernas), lagos de lava, grava, menas por capas y piedra
// luminosa en los techos de las cuevas hondas. Todo es determinista (mismo resultado en el
// hilo principal y en los workers) y no depende del tamaño de la ventana.
//
// El mapa del creativo ya viene desplazado `dy` bloques hacia arriba (llenarSupervivencia en
// voxeles.js): aquí se rellena 0..dy-1 de piedra y luego se cavan cuevas y se ponen menas en
// toda la piedra que quede bajo la superficie.
// =========================================================
import { B } from '../texturas.js';

const NIVEL_AGUA_BASE = 14; // NIVEL_AGUA del creativo (voxeles.js); aquí se evita importar el motor

// ---- Azar determinista ----
function hash3(x, y, z, s) {
    let h = Math.imul(x, 374761393) ^ Math.imul(y, 1103515245) ^ Math.imul(z, 668265263) ^ Math.imul(s, 2147483647);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// Ruido de valor 3D suave en [-1, 1]
function ruido3(x, y, z, s) {
    const x0 = Math.floor(x), y0 = Math.floor(y), z0 = Math.floor(z);
    const fx = x - x0, fy = y - y0, fz = z - z0;
    const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy), uz = fz * fz * (3 - 2 * fz);
    const v = (a, b, c) => hash3(x0 + a, y0 + b, z0 + c, s);
    const l = (a, b, k) => a + (b - a) * k;
    const r = l(
        l(l(v(0, 0, 0), v(1, 0, 0), ux), l(v(0, 1, 0), v(1, 1, 0), ux), uy),
        l(l(v(0, 0, 1), v(1, 0, 1), ux), l(v(0, 1, 1), v(1, 1, 1), ux), uy),
        uz
    );
    return r * 2 - 1;
}

// ---- Campos de cuevas ----
// Se evalúan en una rejilla gruesa (cada PASO bloques) y se interpolan: así una ventana de
// 18×18×128 cuesta unos pocos miles de evaluaciones de ruido en vez de cientos de miles.
const PASO = 4;
const SEM_T1 = 9101, SEM_T2 = 9203, SEM_C = 9307, SEM_E = 9411;

function valorTunel1(x, y, z) { return ruido3(x / 28, y / 18, z / 28, SEM_T1) * 0.75 + ruido3(x / 11, y / 9, z / 11, SEM_T1 + 1) * 0.25; }
function valorTunel2(x, y, z) { return ruido3(x / 28, y / 18, z / 28, SEM_T2) * 0.75 + ruido3(x / 11, y / 9, z / 11, SEM_T2 + 1) * 0.25; }
function valorCaverna(x, y, z) { return ruido3(x / 40, y / 16, z / 40, SEM_C); }

// Rejilla reutilizable (se agranda si hace falta)
let rejilla = null;
function prepararRejilla(wx0, wz0, ancho, alto) {
    const gx0 = Math.floor(wx0 / PASO), gz0 = Math.floor(wz0 / PASO);
    const nx = Math.floor((wx0 + ancho - 1) / PASO) - gx0 + 2, nz = Math.floor((wz0 + ancho - 1) / PASO) - gz0 + 2;
    const ny = Math.floor((alto - 1) / PASO) + 2;
    const n = nx * ny * nz;
    if (!rejilla || rejilla.t1.length < n) rejilla = { t1: new Float32Array(n), t2: new Float32Array(n), c: new Float32Array(n) };
    const { t1, t2, c } = rejilla;
    let i = 0;
    for (let gy = 0; gy < ny; gy++) {
        for (let gz = 0; gz < nz; gz++) {
            for (let gx = 0; gx < nx; gx++, i++) {
                const x = (gx0 + gx) * PASO, y = gy * PASO, z = (gz0 + gz) * PASO;
                t1[i] = valorTunel1(x, y, z);
                t2[i] = valorTunel2(x, y, z);
                c[i] = valorCaverna(x, y, z);
            }
        }
    }
    return { gx0, gz0, nx, ny, nz };
}

function interpolar(arr, g, x, y, z) {
    const fx = x / PASO - g.gx0, fy = y / PASO, fz = z / PASO - g.gz0;
    const ix = Math.floor(fx), iy = Math.floor(fy), iz = Math.floor(fz);
    const tx = fx - ix, ty = fy - iy, tz = fz - iz;
    const NX = g.nx, NXZ = g.nx * g.nz;
    const i = iy * NXZ + iz * NX + ix;
    const a = arr[i] + (arr[i + 1] - arr[i]) * tx;
    const b = arr[i + NX] + (arr[i + NX + 1] - arr[i + NX]) * tx;
    const c = arr[i + NXZ] + (arr[i + NXZ + 1] - arr[i + NXZ]) * tx;
    const d = arr[i + NXZ + NX] + (arr[i + NXZ + NX + 1] - arr[i + NXZ + NX]) * tx;
    const ab = a + (b - a) * tz, cd = c + (d - c) * tz;
    return ab + (cd - ab) * ty;
}

// ¿Es cueva el bloque? (sin contar márgenes de protección)
function esCueva(g, x, y, z) {
    if (y < 5) return false;
    const a = interpolar(rejilla.t1, g, x, y, z), b = interpolar(rejilla.t2, g, x, y, z);
    // túneles: donde los dos campos se acercan a cero a la vez; más anchos en lo hondo
    const ancho = y < 40 ? 0.016 : 0.011;
    if (a * a + b * b < ancho) return true;
    // cavernas grandes solo en lo hondo, con piso plano (se aplanan hacia abajo)
    if (y < 44) {
        const c = interpolar(rejilla.c, g, x, y, z) - (y < 14 ? (14 - y) * 0.03 : 0);
        if (c > 0.52) return true;
    }
    return false;
}

// ---- Menas por capas (y del mundo de 128) ----
// Cada mena aparece en celdas de 2×2×2: la celda decide el tipo y cada bloque de la celda
// tiene ~60 % de ser mineral, así salen vetas pequeñas e irregulares.
const MENAS = [
    { id: B.MENA_DIAMANTE, y0: 5, y1: 16, p: 0.0016 },
    { id: B.MENA_REDSTONE, y0: 5, y1: 18, p: 0.006 },
    { id: B.MENA_ORO, y0: 5, y1: 34, p: 0.0024 },
    { id: B.MENA_LAPIS, y0: 10, y1: 32, p: 0.0022 },
    { id: B.MENA_HIERRO, y0: 5, y1: 72, p: 0.0095 },
    { id: B.MENA_CARBON, y0: 5, y1: 110, p: 0.012 },
    { id: B.MENA_ESMERALDA, y0: 48, y1: 110, p: 0.0006 }
];

function menaEn(x, y, z) {
    const cx = x >> 1, cy = y >> 1, cz = z >> 1;
    const h = hash3(cx, cy, cz, 7717);
    let acumulado = 0;
    for (const m of MENAS) {
        if (y < m.y0 || y > m.y1) continue;
        acumulado += m.p;
        if (h < acumulado) return hash3(x, y, z, 7718) < 0.6 ? m.id : 0;
    }
    // grava en bolsones de 4×4×4
    if (hash3(x >> 2, y >> 2, z >> 2, 7719) < 0.006 && hash3(x, y, z, 7720) < 0.8) return B.GRAVA;
    return 0;
}

// ---- Relleno de una ventana ----
export function llenarSubsuelo(terreno, vox, wx0, wz0, ancho) {
    const { BW, BD, HT, ES } = terreno;
    const dy = terreno.dy;
    const NN = ancho * ancho;
    const alto = vox.length / NN;
    const g = prepararRejilla(wx0, wz0, ancho, alto);
    const NIVEL_AGUA = NIVEL_AGUA_BASE + dy;
    for (let lz = 0; lz < ancho; lz++) {
        for (let lx = 0; lx < ancho; lx++) {
            const x = wx0 + lx, z = wz0 + lz, c = lz * ancho + lx;
            const dentro = x >= 0 && z >= 0 && x < BW && z < BD;
            const o = dentro ? z * BW + x : -1;
            const sup = (dentro ? HT[o] : 8) + dy;
            const es = dentro ? ES[o] : 0;
            // Piedra bajo el mapa
            for (let y = 0; y < dy; y++) vox[y * NN + c] = B.PIEDRA;
            // Roca madre irregular en el fondo
            vox[c] = B.ROCA_MADRE;
            for (let y = 1; y <= 3; y++) if (hash3(x, y, z, 31) < 0.75 - y * 0.2) vox[y * NN + c] = B.ROCA_MADRE;
            // Margen de protección: bajo estructuras, el agua y la playa no se cava cerca de la superficie
            // (las cuevas no deben asomarse por un muro, el fondo del mar ni los sitios de los amigos)
            const agua = sup <= NIVEL_AGUA + 1;
            const margen = es ? 12 : agua ? 7 : 0;
            const topeCueva = sup - margen;
            const vecinoProtegido = !es && dentro && !agua && protegidoCerca(terreno, x, z);
            for (let y = 4; y < sup && y < alto; y++) {
                const i = y * NN + c;
                const id = vox[i];
                if (id !== B.PIEDRA && !(y > sup - 6 && !es && !agua && (id === B.TIERRA || id === B.PASTO || id === B.ARENA || id === B.NIEVE))) continue;
                const puedeCavar = y < topeCueva - (vecinoProtegido ? 10 : 0);
                if (puedeCavar && esCueva(g, x, y, z)) {
                    // Cerca de la superficie solo se abren bocas en algunas zonas (no todo el mapa agujereado)
                    if (y > sup - 6 && ruido3(x / 48, 0, z / 48, SEM_E) < 0.35) continue;
                    vox[i] = y <= 10 ? B.LAVA : B.AIRE;
                    continue;
                }
                if (id !== B.PIEDRA) continue;
                const m = menaEn(x, y, z);
                if (m) vox[i] = m;
            }
            // Piedra luminosa colgando del techo de las cuevas hondas
            for (let y = 12; y < Math.min(36, sup - 8); y++) {
                const i = y * NN + c;
                if (vox[i] === B.PIEDRA && vox[i - NN] === B.AIRE && hash3(x, y, z, 5151) < 0.012) vox[i] = B.PIEDRA_LUMINOSA;
            }
        }
    }
}

// ¿Hay una estructura (o plaza nivelada) a menos de 3 bloques? Evita bocas de cueva junto a muros
function protegidoCerca(terreno, x, z) {
    const { BW, BD, ES } = terreno;
    for (let dz = -3; dz <= 3; dz += 3) {
        for (let dx = -3; dx <= 3; dx += 3) {
            const xx = x + dx, zz = z + dz;
            if (xx < 0 || zz < 0 || xx >= BW || zz >= BD) continue;
            if (ES[zz * BW + xx]) return true;
        }
    }
    return false;
}
