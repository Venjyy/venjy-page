// =========================================================
// VENJY · Voxeles
// Convierte el mapa 2D (E/T/F) en un mundo de bloques y lo malla
// por chunks de 16×16 con culling de caras y oclusión ambiental.
// =========================================================
import * as THREE from '../vendor/three.module.js';
import { B, TIPO, BLOQUES, TAM, COLS, FILAS } from './texturas.js';

export const ESCALA = 4;        // 1 celda del mapa = 4×4 bloques
export const FACTOR_Y = 1.5;    // relieve vertical (el mapa 2D es muy plano a esta escala)
export const CHUNK = 16;
export const ALTO = 80;         // altura máxima del mundo en bloques
export const NIVEL_AGUA = 14;   // el agua llega hasta este bloque (incluido)
const VENT = CHUNK + 2;         // ventana de un chunk con 1 bloque de borde

const hash = (x, z, s) => {
    let h = Math.imul(x, 374761393) ^ Math.imul(z, 668265263) ^ Math.imul(s, 2147483647);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return (h ^ (h >>> 16)) >>> 0;
};

const vh = e => Math.round(NIVEL_AGUA + (e - NIVEL_AGUA) * FACTOR_Y);
export const BASE_ESTRUCTURA = vh(18);
const ALTO_LETRAS = 18; // las letras del título se elevan para leerse mejor

const MATERIAL_ESTRUCTURA = {
    rojo: B.ROJO, azul: B.AZUL, naranjo: B.NARANJO, negro: B.NEGRO, madera: B.TABLONES,
    cuarzo: B.CUARZO, oro: B.ORO, diamante: B.DIAMANTE, esmeralda: B.ESMERALDA, podzol: B.PODZOL,
    arcilla: B.ARCILLA, tierra: B.CULTIVO, hojas: B.HOJAS, pasto: B.PASTO, gris: B.GRIS
};

// ---------------------------------------------------------
// Terreno: altura y materiales por columna de bloques
// ---------------------------------------------------------
export function prepararTerreno(datos) {
    const { W, H, E, T, F } = datos;
    const BW = W * ESCALA, BD = H * ESCALA;
    const HT = new Int16Array(BW * BD);   // altura del bloque superior
    const SUP = new Uint8Array(BW * BD);  // bloque de la superficie
    const SUB = new Uint8Array(BW * BD);  // bloques bajo la superficie (3 capas)
    const ES = new Uint8Array(BW * BD);   // 0 natural · 1 estructura · 2 puente

    // Campo de alturas suave por celda
    const G = new Float32Array(W * H);
    for (let i = 0; i < G.length; i++) {
        if (F[i]) G[i] = BASE_ESTRUCTURA;
        else if (T[i] === 'hojas') G[i] = vh(E[i] - 3);
        else if (T[i] === 'madera') G[i] = vh(10);
        else G[i] = vh(E[i]);
    }
    const g = (cx, cz) => G[Math.min(H - 1, Math.max(0, cz)) * W + Math.min(W - 1, Math.max(0, cx))];

    for (let bz = 0; bz < BD; bz++) {
        const cz = Math.floor(bz / ESCALA);
        for (let bx = 0; bx < BW; bx++) {
            const cx = Math.floor(bx / ESCALA);
            const ci = cz * W + cx;
            const o = bz * BW + bx;
            const tipo = T[ci];

            if (F[ci]) {
                ES[o] = 1;
                HT[o] = vh(E[ci]);
                SUP[o] = MATERIAL_ESTRUCTURA[tipo] || B.PIEDRA;
                SUB[o] = B.TIERRA;
                continue;
            }
            if (tipo === 'madera') { // puente sobre el agua
                ES[o] = 2;
                HT[o] = NIVEL_AGUA + 1;
                SUP[o] = B.TABLONES;
                SUB[o] = B.ARENA;
                continue;
            }

            // Altura: interpolación bilineal entre centros de celda
            const u = (bx + 0.5) / ESCALA - 0.5, v = (bz + 0.5) / ESCALA - 0.5;
            const x0 = Math.floor(u), z0 = Math.floor(v);
            const fx = u - x0, fz = v - z0;
            const a = g(x0, z0), b = g(x0 + 1, z0), c = g(x0, z0 + 1), d = g(x0 + 1, z0 + 1);
            const h = Math.round(a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz);
            HT[o] = h;

            // Material: bioma de la celda, con el borde desordenado para no verse cuadriculado
            const hs = hash(bx, bz, 7);
            const jx = (hs % 3) - 1, jz = ((hs >>> 4) % 3) - 1;
            let ti = Math.min(H - 1, Math.max(0, Math.floor((bz + jz) / ESCALA))) * W
                + Math.min(W - 1, Math.max(0, Math.floor((bx + jx) / ESCALA)));
            if (F[ti] || T[ti] === 'madera') ti = ci;
            const tj = T[ti];

            if (h < NIVEL_AGUA) {
                const f = h >= NIVEL_AGUA - 4 ? B.ARENA : B.TIERRA;
                SUP[o] = f; SUB[o] = f;
            } else if (tj === 'arena' || tj === 'agua') { SUP[o] = B.ARENA; SUB[o] = B.ARENA; }
            else if (tj === 'nieve') { SUP[o] = B.NIEVE; SUB[o] = B.PIEDRA; }
            else if (tj === 'piedra') { SUP[o] = B.PIEDRA; SUB[o] = B.PIEDRA; }
            else if (tj === 'gris') { SUP[o] = B.GRIS; SUB[o] = B.PIEDRA; }
            else if (tj === 'tierra') { SUP[o] = B.CAMINO; SUB[o] = B.TIERRA; }
            else { SUP[o] = B.PASTO; SUB[o] = B.TIERRA; }
        }
    }
    // Segunda pasada: volumen de casas, puertas, letras altas y pedestal del faro
    const HUECO = new Uint8Array(BW * BD); // 1 interior hueco · 2 pared · 3 pared con puerta
    const { tx0, ty0, anchoT, altoT } = datos.titulo;
    const [fcx, fcz] = datos.P.faro;
    const [pax, pay] = datos.P.aldea, [pcx, pcy] = datos.P.correo;
    const CASAS = new Set([B.ROJO, B.AZUL, B.NARANJO, B.PODZOL, B.TABLONES, B.CUARZO]);
    const esCasa = o => ES[o] === 1 && HT[o] - BASE_ESTRUCTURA >= 4 && CASAS.has(SUP[o]);
    for (let bz = 0; bz < BD; bz++) {
        const cz = Math.floor(bz / ESCALA);
        for (let bx = 0; bx < BW; bx++) {
            const o = bz * BW + bx;
            if (ES[o] !== 1) continue;
            const cx = Math.floor(bx / ESCALA);
            if (cx >= fcx - 2 && cx < fcx + 2 && cz >= fcz - 2 && cz < fcz + 2) {
                ES[o] = 3; HT[o] = vh(19); SUP[o] = B.PIEDRA; SUB[o] = B.PIEDRA;
                continue;
            }
            if (SUP[o] === B.HOJAS && HT[o] === BASE_ESTRUCTURA) { SUP[o] = B.CULTIVO; HUECO[o] = 4; continue; } // trigo
            const enPozo = cx >= pax - 1 && cx <= pax && cz >= pay - 5 && cz <= pay - 4;
            const enBuzon = cx === pcx - 3 && cz === pcy - 5;
            if (SUP[o] === B.HOJAS || enPozo || enBuzon) { // bosquecillo a árboles; pozo y buzón a decorado
                ES[o] = 0; HT[o] = BASE_ESTRUCTURA; SUP[o] = B.PASTO; SUB[o] = B.TIERRA;
                continue;
            }
            const enTitulo = cx >= tx0 && cx < tx0 + anchoT && cz >= ty0 && cz < ty0 + altoT;
            if (enTitulo && SUP[o] === B.CUARZO) { HT[o] = BASE_ESTRUCTURA + ALTO_LETRAS; continue; }
            if (!esCasa(o) || bx < 1 || bz < 1 || bx >= BW - 1 || bz >= BD - 1) continue;
            const igual = p => esCasa(p) && SUP[p] === SUP[o];
            HUECO[o] = igual(o - 1) && igual(o + 1) && igual(o - BW) && igual(o + BW) ? 1 : 2;
        }
    }
    // Puertas: el felpudo de madera queda a ras del piso y se abre un hueco de 2×3 en la pared
    for (let cz = 1; cz < H; cz++) {
        for (let cx = 0; cx < W; cx++) {
            const ci = cz * W + cx;
            if (!F[ci] || T[ci] !== 'madera' || E[ci] !== 19) continue;
            for (let dz = 0; dz < ESCALA; dz++) {
                for (let dx = 0; dx < ESCALA; dx++) {
                    const o = (cz * ESCALA + dz) * BW + cx * ESCALA + dx;
                    HT[o] = BASE_ESTRUCTURA; SUP[o] = B.TABLONES; SUB[o] = B.TIERRA;
                }
            }
            for (let dx = 1; dx <= 2; dx++) {
                const o = (cz * ESCALA - 1) * BW + cx * ESCALA + dx;
                if (HUECO[o] === 2) HUECO[o] = 3;
            }
        }
    }
    const decor = [
        { t: 'pozo', x: (pax - 1) * ESCALA, z: (pay - 5) * ESCALA },
        { t: 'buzon', x: (pcx - 3) * ESCALA, z: (pcy - 5) * ESCALA }
    ];
    const faro = { x: fcx * ESCALA, z: fcz * ESCALA, y: vh(19) + 1 };
    return { BW, BD, HT, SUP, SUB, ES, HUECO, faro, decor, datos };
}

// ---------------------------------------------------------
// Chunk: llena la ventana de bloques (con borde y árboles)
// ---------------------------------------------------------
const HOJAS_ID = [B.HOJAS, B.HOJAS_ABEDUL, B.HOJAS_PINO];
const TRONCO_ID = [B.TRONCO, B.TRONCO_ABEDUL, B.TRONCO_PINO];

function colocarArbol(vox, wx0, wz0, tx, ty, tz, h, tipo = 0) {
    const poner = (x, y, z, id, sobreescribe) => {
        const lx = x - wx0, lz = z - wz0;
        if (lx < 0 || lz < 0 || lx >= VENT || lz >= VENT || y < 0 || y >= ALTO) return;
        const i = (y * VENT + lz) * VENT + lx;
        if (vox[i] === B.AIRE || (sobreescribe && vox[i] === HOJAS_ID[tipo])) vox[i] = id;
    };
    const tope = ty + h;
    const hoja = HOJAS_ID[tipo], tronco = TRONCO_ID[tipo];
    if (tipo === 2) { // pino: copa cónica
        for (let y = ty + 2; y <= tope + 2; y++) {
            const k = y - (ty + 2);
            const r = y >= tope + 1 ? 0 : Math.max(1, 2 - Math.floor(k * 3 / (h + 1)) + (k % 2 === 0 ? 1 : 0));
            for (let dz = -r; dz <= r; dz++) {
                for (let dx = -r; dx <= r; dx++) {
                    if (Math.abs(dx) + Math.abs(dz) > r + (r > 1 ? 1 : 0)) continue;
                    poner(tx + dx, y, tz + dz, hoja, false);
                }
            }
        }
        for (let y = ty + 1; y <= tope + 1; y++) poner(tx, y, tz, tronco, true);
        return;
    }
    for (let y = tope - 2; y <= tope + 1; y++) {
        const r = y >= tope ? 1 : 2;
        for (let dz = -r; dz <= r; dz++) {
            for (let dx = -r; dx <= r; dx++) {
                if (r === 2 && Math.abs(dx) === 2 && Math.abs(dz) === 2 && (hash(tx + dx, tz + dz, y) & 1)) continue;
                if (y === tope + 1 && Math.abs(dx) + Math.abs(dz) > 1) continue;
                poner(tx + dx, y, tz + dz, hoja, false);
            }
        }
    }
    for (let y = ty + 1; y <= tope; y++) poner(tx, y, tz, tronco, true);
}

export function llenarChunk(terreno, cx, cz) {
    const { BW, BD, HT, SUP, SUB, ES, HUECO, datos } = terreno;
    const vox = new Uint8Array(VENT * VENT * ALTO);
    const wx0 = cx * CHUNK - 1, wz0 = cz * CHUNK - 1;
    let maxY = 0;

    for (let lz = 0; lz < VENT; lz++) {
        for (let lx = 0; lx < VENT; lx++) {
            const bx = wx0 + lx, bz = wz0 + lz;
            let h, sup, sub, es = 0, hueco = 0;
            if (bx < 0 || bz < 0 || bx >= BW || bz >= BD) { h = 8; sup = B.ARENA; sub = B.ARENA; }
            else { const o = bz * BW + bx; h = HT[o]; sup = SUP[o]; sub = SUB[o]; es = ES[o]; hueco = HUECO[o]; }
            const tope = Math.min(ALTO - 1, h);
            // Piso natural (para estructuras, solo hasta la base)
            const suelo = es === 1 ? Math.min(tope, BASE_ESTRUCTURA - 1) : tope;
            const pared = sup === B.CUARZO ? B.CUARZO : B.TABLONES;
            for (let y = 0; y <= tope; y++) {
                let id;
                if (es === 2) id = y === tope ? sup : y > NIVEL_AGUA - 4 ? B.AGUA : B.ARENA;
                else if (y === tope) id = sup;
                else if (hueco && y >= BASE_ESTRUCTURA) {
                    if (y === BASE_ESTRUCTURA) id = B.TABLONES; // piso a ras del suelo
                    else if (hueco === 1) id = B.AIRE;
                    else if (hueco === 3 && y <= BASE_ESTRUCTURA + 3) id = B.AIRE;
                    else if (hueco === 2 && pared === B.TABLONES && y >= BASE_ESTRUCTURA + 2 && y <= BASE_ESTRUCTURA + 3
                        && [2, 3].includes((bx + bz) & 7)) id = B.VIDRIO;
                    else id = pared;
                }
                else if (es === 1 && y >= BASE_ESTRUCTURA) id = sup;
                else if (y > suelo - 4) id = sub;
                else id = B.PIEDRA;
                vox[(y * VENT + lz) * VENT + lx] = id;
            }
            if (hueco === 4 && tope + 1 < ALTO) vox[((tope + 1) * VENT + lz) * VENT + lx] = B.TRIGO;
            if (es !== 2) for (let y = tope + 1; y <= NIVEL_AGUA; y++) vox[(y * VENT + lz) * VENT + lx] = B.AGUA;
            if (Math.max(tope, NIVEL_AGUA) > maxY) maxY = Math.max(tope, NIVEL_AGUA);
        }
    }

    // Árboles: uno por celda de bosque, con posición y tamaño deterministas
    const { W, H, T, F } = datos;
    const c0x = Math.floor((wx0 - 3) / ESCALA), c1x = Math.floor((wx0 + VENT + 3) / ESCALA);
    const c0z = Math.floor((wz0 - 3) / ESCALA), c1z = Math.floor((wz0 + VENT + 3) / ESCALA);
    for (let ccz = Math.max(0, c0z); ccz <= Math.min(H - 1, c1z); ccz++) {
        for (let ccx = Math.max(0, c0x); ccx <= Math.min(W - 1, c1x); ccx++) {
            const ci = ccz * W + ccx;
            if (T[ci] !== 'hojas') continue;
            const hs = hash(ccx, ccz, 3);
            const tx = ccx * ESCALA + 1 + (hs % 2), tz = ccz * ESCALA + 1 + ((hs >>> 3) % 2);
            const o = tz * BW + tx;
            if (ES[o] || SUP[o] !== B.PASTO || HT[o] < NIVEL_AGUA + 1) continue;
            const tipo = HT[o] > vh(26) ? 2 : ((hs >>> 9) % 4 === 0 ? 1 : 0); // 0 roble, 1 abedul, 2 pino
            const alto = tipo === 2 ? 6 + ((hs >>> 6) % 3) : 4 + ((hs >>> 6) % 2) + tipo;
            if (HT[o] + alto + 3 >= ALTO) continue;
            colocarArbol(vox, wx0, wz0, tx, HT[o], tz, alto, tipo);
            if (HT[o] + alto + 2 > maxY) maxY = HT[o] + alto + 2;
        }
    }
    // Decorados: pozo de la aldea y buzón del correo
    for (const d of terreno.decor) {
        if (Math.abs(d.x + 4 - (wx0 + VENT / 2)) < 24 && Math.abs(d.z + 4 - (wz0 + VENT / 2)) < 24) {
            colocarDecor(vox, wx0, wz0, d, BASE_ESTRUCTURA + 1);
            maxY = Math.max(maxY, BASE_ESTRUCTURA + 8);
        }
    }
    // Faro: torre de rayas con linterna en la cima
    const f = terreno.faro;
    if (Math.abs(f.x - (wx0 + VENT / 2)) < 40 && Math.abs(f.z - (wz0 + VENT / 2)) < 40) {
        colocarFaro(vox, wx0, wz0, f);
        maxY = Math.max(maxY, f.y + 38);
    }
    return { vox, maxY: Math.min(ALTO - 1, maxY + 1) };
}

function colocarDecor(vox, wx0, wz0, d, y0) {
    const poner = (x, y, z, id) => {
        const lx = x - wx0, lz = z - wz0;
        if (lx < 0 || lz < 0 || lx >= VENT || lz >= VENT || y < 0 || y >= ALTO) return;
        vox[(y * VENT + lz) * VENT + lx] = id;
    };
    if (d.t === 'pozo') {
        for (let dz = 0; dz < 8; dz++) {
            for (let dx = 0; dx < 8; dx++) {
                const borde = dx === 0 || dx === 7 || dz === 0 || dz === 7;
                const esquina = (dx === 0 || dx === 7) && (dz === 0 || dz === 7);
                if (borde) {
                    poner(d.x + dx, y0, d.z + dz, B.LABRADA);
                    poner(d.x + dx, y0 + 1, d.z + dz, B.LABRADA);
                } else {
                    for (let y = y0 - 3; y < y0; y++) poner(d.x + dx, y, d.z + dz, B.AGUA);
                }
                if (esquina) for (let y = y0 + 2; y <= y0 + 4; y++) poner(d.x + dx, y, d.z + dz, B.TRONCO);
                poner(d.x + dx, y0 + 5, d.z + dz, B.TABLONES);
            }
        }
    } else if (d.t === 'buzon') {
        for (let y = 0; y < 3; y++) poner(d.x + 1, y0 + y, d.z + 1, B.TRONCO);
        poner(d.x + 1, y0 + 3, d.z + 1, B.ROJO);
        poner(d.x + 2, y0 + 3, d.z + 1, B.ROJO);
        poner(d.x + 3, y0 + 4, d.z + 1, B.NARANJO);
    }
}

function colocarFaro(vox, wx0, wz0, f) {
    const poner = (x, y, z, id) => {
        const lx = x - wx0, lz = z - wz0;
        if (lx < 0 || lz < 0 || lx >= VENT || lz >= VENT || y < 0 || y >= ALTO) return;
        vox[(y * VENT + lz) * VENT + lx] = id;
    };
    const anillo = (y, r, id, relleno) => {
        for (let dz = -r; dz <= r; dz++) {
            for (let dx = -r; dx <= r; dx++) {
                const borde = Math.abs(dx) === r || Math.abs(dz) === r;
                if (borde || relleno) poner(f.x + dx, f.y + y, f.z + dz, id);
                else poner(f.x + dx, f.y + y, f.z + dz, B.AIRE);
            }
        }
    };
    for (let y = 0; y < 31; y++) anillo(y, y < 18 ? 3 : 2, (y >> 2) & 1 ? B.ROJO : B.CUARZO, y === 0);
    for (let y = 0; y < 3; y++) { poner(f.x, f.y + y, f.z + 3, B.AIRE); } // puerta
    anillo(31, 3, B.NEGRO, true);
    for (let y = 32; y <= 34; y++) anillo(y, 1, B.DIAMANTE, false);
    poner(f.x, f.y + 33, f.z, B.ORO);
    anillo(35, 2, B.NEGRO, true);
    poner(f.x, f.y + 36, f.z, B.NEGRO);
}

// ---------------------------------------------------------
// Mallado
// ---------------------------------------------------------
const CARAS = [
    // +X
    { d: [1, 0, 0], c: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]], t: [1, 2], sombra: 0.6, lado: true },
    // -X
    { d: [-1, 0, 0], c: [[0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0]], t: [1, 2], sombra: 0.6, lado: true },
    // +Y
    { d: [0, 1, 0], c: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]], t: [0, 2], sombra: 1, top: true },
    // -Y
    { d: [0, -1, 0], c: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], t: [0, 2], sombra: 0.5, fondo: true },
    // +Z
    { d: [0, 0, 1], c: [[1, 0, 1], [1, 1, 1], [0, 1, 1], [0, 0, 1]], t: [0, 1], sombra: 0.8, lado: true },
    // -Z
    { d: [0, 0, -1], c: [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]], t: [0, 1], sombra: 0.8, lado: true }
];
// Texturas: u según la cara
const UV_U = [c => 1 - c[2], c => c[2], c => c[0], c => c[0], c => c[0], c => 1 - c[0]];
const UV_V = [c => c[1], c => c[1], c => 1 - c[2], c => c[2], c => c[1], c => c[1]];

const aSRGB = s => Math.pow(s, 2.2); // el sombreado de Minecraft se aplica sobre color sRGB
const AO_NIVEL = [aSRGB(0.55), aSRGB(0.7), aSRGB(0.85), 1];
const SOMBRA = CARAS.map(c => aSRGB(c.sombra));

const AW = COLS * TAM, AH = FILAS * TAM, EPS = 0.02;
function uvTile(tile, u, v) {
    const tx = tile % COLS, ty = Math.floor(tile / COLS);
    const u0 = (tx * TAM + EPS) / AW, u1 = ((tx + 1) * TAM - EPS) / AW;
    const v1 = 1 - (ty * TAM + EPS) / AH, v0 = 1 - ((ty + 1) * TAM - EPS) / AH;
    return [u0 + (u1 - u0) * u, v0 + (v1 - v0) * v];
}

class Buffer {
    constructor() { this.p = []; this.u = []; this.c = []; this.i = []; this.n = 0; }
    get vacio() { return this.n === 0; }
    geometria() {
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
        g.setAttribute('uv', new THREE.Float32BufferAttribute(this.u, 2));
        g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
        g.setIndex(this.i);
        g.computeBoundingSphere();
        return g;
    }
}

export function mallarChunk(cx, cz, relleno) {
    const { vox, maxY } = relleno;
    const solido = new Buffer(), agua = new Buffer();
    const ox = cx * CHUNK, oz = cz * CHUNK;
    const at = (x, y, z) => (y < 0 ? 1 : y >= ALTO ? 0 : TIPO[vox[(y * VENT + z) * VENT + x]]);
    const ocluye = (x, y, z) => { const t = at(x, y, z); return t === 1 || t === 2 ? 1 : 0; };

    for (let y = 0; y <= maxY; y++) {
        for (let z = 1; z <= CHUNK; z++) {
            for (let x = 1; x <= CHUNK; x++) {
                const id = vox[(y * VENT + z) * VENT + x];
                if (id === 0) continue;
                const tipo = TIPO[id];
                const def = BLOQUES[id];
                for (let f = 0; f < 6; f++) {
                    const cara = CARAS[f];
                    const nx = x + cara.d[0], ny = y + cara.d[1], nz = z + cara.d[2];
                    const tv = at(nx, ny, nz);
                    if (tipo === 1 && tv === 1) continue;
                    if (tipo === 2 && (tv === 1 || tv === 2)) continue;
                    if (tipo === 3 && tv !== 0) continue;
                    if (tipo === 3 && !cara.top && !cara.lado) continue;

                    const buf = tipo === 3 ? agua : solido;
                    const tile = cara.top ? def.top : cara.fondo ? def.fondo : def.lado;
                    const ao = [0, 0, 0, 0];
                    const base = buf.n;
                    for (let k = 0; k < 4; k++) {
                        const co = cara.c[k];
                        let alturaAgua = 1;
                        if (tipo === 3) alturaAgua = 0.88;
                        const px = ox + x - 1 + co[0], py = y + (co[1] ? alturaAgua : 0), pz = oz + z - 1 + co[2];
                        buf.p.push(px, py, pz);
                        const [u, v] = uvTile(tile, UV_U[f](co), UV_V[f](co));
                        buf.u.push(u, v);

                        let a = 3;
                        if (tipo !== 3) {
                            const [t1, t2] = cara.t;
                            const s1 = (co[t1] * 2 - 1), s2 = (co[t2] * 2 - 1);
                            const e1 = [0, 0, 0], e2 = [0, 0, 0];
                            e1[t1] = s1; e2[t2] = s2;
                            const o1 = ocluye(nx + e1[0], ny + e1[1], nz + e1[2]);
                            const o2 = ocluye(nx + e2[0], ny + e2[1], nz + e2[2]);
                            const oc = ocluye(nx + e1[0] + e2[0], ny + e1[1] + e2[1], nz + e1[2] + e2[2]);
                            a = o1 && o2 ? 0 : 3 - (o1 + o2 + oc);
                        }
                        ao[k] = a;
                        const s = SOMBRA[f] * AO_NIVEL[a];
                        buf.c.push(s, s, s);
                    }
                    if (ao[0] + ao[2] > ao[1] + ao[3]) buf.i.push(base, base + 1, base + 2, base, base + 2, base + 3);
                    else buf.i.push(base + 1, base + 2, base + 3, base + 1, base + 3, base);
                    buf.n += 4;
                }
            }
        }
    }
    return { solido: solido.vacio ? null : solido.geometria(), agua: agua.vacio ? null : agua.geometria() };
}

// ---------------------------------------------------------
// Gestor de chunks: carga por distancia con presupuesto por cuadro
// ---------------------------------------------------------
export class MundoVoxel {
    constructor(scene, terreno, materiales, distancia = 8) {
        this.scene = scene;
        this.terreno = terreno;
        this.mat = materiales;
        this.distancia = distancia;
        this.chunks = new Map();
        this.cx = terreno.BW / CHUNK;
        this.cz = terreno.BD / CHUNK;
        this.cola = [];
        this.ultimo = null;
    }

    bloque(x, y, z) {
        x = Math.floor(x); y = Math.floor(y); z = Math.floor(z);
        const ch = this.chunks.get(Math.floor(x / CHUNK) + ',' + Math.floor(z / CHUNK));
        if (!ch || y < 0 || y >= ALTO) return -1; // -1: aún no cargado
        const lx = x - Math.floor(x / CHUNK) * CHUNK + 1, lz = z - Math.floor(z / CHUNK) * CHUNK + 1;
        return ch.vox[(y * VENT + lz) * VENT + lx];
    }

    planificar(px, pz) {
        const pcx = Math.floor(px / CHUNK), pcz = Math.floor(pz / CHUNK);
        if (this.ultimo && this.ultimo[0] === pcx && this.ultimo[1] === pcz) return;
        this.ultimo = [pcx, pcz];
        const R = this.distancia;
        const deseados = new Set();
        const nuevos = [];
        for (let dz = -R; dz <= R; dz++) {
            for (let dx = -R; dx <= R; dx++) {
                const d2 = dx * dx + dz * dz;
                if (d2 > R * R) continue;
                const x = pcx + dx, z = pcz + dz;
                if (x < 0 || z < 0 || x >= this.cx || z >= this.cz) continue;
                const k = x + ',' + z;
                deseados.add(k);
                if (!this.chunks.has(k)) nuevos.push({ x, z, d2, k });
            }
        }
        nuevos.sort((a, b) => a.d2 - b.d2);
        this.cola = nuevos;
        for (const [k, ch] of this.chunks) {
            if (deseados.has(k)) continue;
            this.liberar(ch);
            this.chunks.delete(k);
        }
    }

    liberar(ch) {
        for (const m of ch.mallas) { this.scene.remove(m); m.geometry.dispose(); }
    }

    // Construye chunks hasta agotar el presupuesto en ms; devuelve cuántos quedan
    construir(presupuestoMs = 6) {
        const t0 = performance.now();
        while (this.cola.length && performance.now() - t0 < presupuestoMs) {
            const { x, z, k } = this.cola.shift();
            if (this.chunks.has(k)) continue;
            const relleno = llenarChunk(this.terreno, x, z);
            const g = mallarChunk(x, z, relleno);
            const mallas = [];
            if (g.solido) {
                const m = new THREE.Mesh(g.solido, this.mat.solido);
                m.matrixAutoUpdate = false;
                this.scene.add(m); mallas.push(m);
            }
            if (g.agua) {
                const m = new THREE.Mesh(g.agua, this.mat.agua);
                m.matrixAutoUpdate = false;
                m.renderOrder = 1;
                this.scene.add(m); mallas.push(m);
            }
            this.chunks.set(k, { mallas, vox: relleno.vox });
        }
        return this.cola.length;
    }
}
