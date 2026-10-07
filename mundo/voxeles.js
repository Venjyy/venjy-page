// =========================================================
// VENJY · Voxeles
// Convierte el mapa 2D (E/T/F) en un mundo de bloques y lo malla
// por chunks de 16×16 con culling de caras y oclusión ambiental.
// =========================================================
import * as THREE from '../vendor/three.module.js';
import { B, TIPO, BLOQUES, TAM, COLS, FILAS, LUZ_EMISION } from './texturas.js';

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
    const [pax, pay] = datos.P.aldea, [pcx, pcy] = datos.P.correo, [mix, miy] = datos.P.mina;
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
            const enMina = (cz >= miy - 4 && cz <= miy - 2 && cx >= mix - 2 && cx <= mix + 1)
                || (cz === miy - 5 && cx >= mix - 3 && cx <= mix + 2);
            if (enMina) { // el foso de la mina se convierte en una plaza de piedra a ras del camino
                ES[o] = 0; HT[o] = BASE_ESTRUCTURA; SUP[o] = B.GRIS; SUB[o] = B.PIEDRA;
                continue;
            }
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
    // Cajas de la gatera: cajones abiertos de 2×2 por dentro
    const caja = o => ES[o] === 1 && (SUP[o] === B.NARANJO || SUP[o] === B.NEGRO) && HT[o] - BASE_ESTRUCTURA === 2;
    for (let o = BW + 1; o < BW * (BD - 1) - 1; o++) {
        if (!caja(o)) continue;
        const igual = p => caja(p) && SUP[p] === SUP[o];
        HUECO[o] = igual(o - 1) && igual(o + 1) && igual(o - BW) && igual(o + BW) ? 6 : 5;
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
        { t: 'pozo', x: (pax - 1) * ESCALA, z: (pay - 5) * ESCALA, cx: (pax - 1) * ESCALA + 4, cz: (pay - 5) * ESCALA + 4, r: 6 },
        { t: 'buzon', x: (pcx - 3) * ESCALA, z: (pcy - 5) * ESCALA, cx: (pcx - 3) * ESCALA + 2, cz: (pcy - 5) * ESCALA + 2, r: 6 },
        { t: 'mina', x: mix * ESCALA, z: (miy - 5) * ESCALA, cx: mix * ESCALA, cz: (miy - 5) * ESCALA - 14, r: 18 }
    ];
    const faro = { x: fcx * ESCALA, z: fcz * ESCALA, y: vh(19) + 1 };
    // Zonas donde puede haber emisores de luz (antorchas, piedra luminosa): los chunks a menos
    // de RADIO_LUZ bloques de una zona calculan la luz con la ventana ampliada (ver calcularLuz).
    // Quien coloque emisores fuera del decorado o del faro debe agregar aquí su rectángulo.
    const zonasLuz = decor.map(d => ({ x0: d.cx - d.r, z0: d.cz - d.r, x1: d.cx + d.r, z1: d.cz + d.r }));
    zonasLuz.push({ x0: faro.x - 4, z0: faro.z - 4, x1: faro.x + 4, z1: faro.z + 4 });
    return { BW, BD, HT, SUP, SUB, ES, HUECO, faro, decor, zonasLuz, datos };
}

// ---------------------------------------------------------
// Chunk: llena la ventana de bloques (con borde y árboles)
// ---------------------------------------------------------
const HOJAS_ID = [B.HOJAS, B.HOJAS_ABEDUL, B.HOJAS_PINO];
const TRONCO_ID = [B.TRONCO, B.TRONCO_ABEDUL, B.TRONCO_PINO];

function colocarArbol(vox, wx0, wz0, ancho, tx, ty, tz, h, tipo = 0) {
    const poner = (x, y, z, id, sobreescribe) => {
        const lx = x - wx0, lz = z - wz0;
        if (lx < 0 || lz < 0 || lx >= ancho || lz >= ancho || y < 0 || y >= ALTO) return;
        const i = (y * ancho + lz) * ancho + lx;
        if (vox[i] === B.AIRE || TIPO[vox[i]] === 4 || (sobreescribe && vox[i] === HOJAS_ID[tipo])) vox[i] = id;
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

// Llena el chunk (ventana VENT con borde 1) y calcula su luz.
// Devuelve { vox, maxY, luz }; luz usa el mismo índice que vox (ver calcularLuz).
export function llenarChunk(terreno, cx, cz) {
    const relleno = llenarVentana(terreno, cx * CHUNK - 1, cz * CHUNK - 1, VENT);
    relleno.luz = calcularLuz(terreno, cx, cz, relleno);
    return relleno;
}

// Llena una ventana cuadrada de `ancho` columnas con origen (wx0, wz0) en bloques del mundo.
// El resultado no depende del tamaño de la ventana: sirve tanto para el chunk como para la
// ventana ampliada del cálculo de luz. `destino` permite reutilizar un arreglo (se limpia).
function llenarVentana(terreno, wx0, wz0, ancho, destino = null) {
    const { BW, BD, HT, SUP, SUB, ES, HUECO, datos } = terreno;
    const VENT = ancho; // dentro de esta función la "ventana" es la pedida
    const vox = destino ? destino.fill(0) : new Uint8Array(VENT * VENT * ALTO);
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
                else if (y === tope) id = hueco === 6 ? B.AIRE : sup;
                else if (hueco && hueco <= 3 && y >= BASE_ESTRUCTURA) {
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
            else if (es === 0 && sup === B.PASTO && tope > NIVEL_AGUA && tope + 1 < ALTO) {
                const q = hash(bx, bz, 11) % 1000;
                const planta = q < 80 ? B.PASTO_ALTO : q < 88 ? B.FLOR_ROJA : q < 96 ? B.FLOR_AMARILLA : q < 102 ? B.FLOR_AZUL : 0;
                if (planta) vox[((tope + 1) * VENT + lz) * VENT + lx] = planta;
            }
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
            colocarArbol(vox, wx0, wz0, VENT, tx, HT[o], tz, alto, tipo);
            if (HT[o] + alto + 2 > maxY) maxY = HT[o] + alto + 2;
        }
    }
    // Decorados: pozo de la aldea y buzón del correo
    for (const d of terreno.decor) {
        if (Math.abs(d.cx - (wx0 + VENT / 2)) < d.r + VENT / 2 && Math.abs(d.cz - (wz0 + VENT / 2)) < d.r + VENT / 2) {
            colocarDecor(vox, wx0, wz0, VENT, d, BASE_ESTRUCTURA + 1);
            maxY = Math.max(maxY, BASE_ESTRUCTURA + 8);
        }
    }
    // Faro: torre de rayas con linterna en la cima
    const f = terreno.faro;
    if (Math.abs(f.x - (wx0 + VENT / 2)) < 4 + VENT / 2 && Math.abs(f.z - (wz0 + VENT / 2)) < 4 + VENT / 2) {
        colocarFaro(vox, wx0, wz0, VENT, f);
        maxY = Math.max(maxY, f.y + 38);
    }
    return { vox, maxY: Math.min(ALTO - 1, maxY + 1) };
}

function colocarDecor(vox, wx0, wz0, ancho, d, y0) {
    const poner = (x, y, z, id) => {
        const lx = x - wx0, lz = z - wz0;
        if (lx < 0 || lz < 0 || lx >= ancho || lz >= ancho || y < 0 || y >= ALTO) return;
        vox[(y * ancho + lz) * ancho + lx] = id;
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
    } else if (d.t === 'mina') {
        const ores = [B.DIAMANTE, B.ORO, B.ESMERALDA];
        for (let k = 1; k <= 28; k++) {
            const z = d.z - k;
            for (let dx = -3; dx <= 3; dx++) for (let y = y0; y <= y0 + 3; y++) poner(d.x + dx, y, z, B.AIRE);
            if (k % 7 === 1) { // marco de madera
                for (let y = y0; y <= y0 + 2; y++) { poner(d.x - 3, y, z, B.TRONCO); poner(d.x + 3, y, z, B.TRONCO); }
                for (let dx = -3; dx <= 3; dx++) poner(d.x + dx, y0 + 3, z, B.TABLONES);
            } else if (k % 5 === 3) { // vetas de mineral en las paredes
                poner(d.x - 4, y0 + 1, z, ores[k % 3]);
                poner(d.x + 4, y0 + 2, z, ores[(k + 1) % 3]);
            }
        }
        // Antorchas pegadas a las paredes cada 7 bloques, alternando el lado
        for (let k = 4; k <= 28; k += 7) {
            const lado = (k - 4) % 14 === 0 ? -1 : 1;
            poner(d.x + lado * 3, y0 + 1, d.z - k, B.ANTORCHA);
        }
        poner(d.x, y0, d.z - 28, B.ORO);
        poner(d.x, y0 + 1, d.z - 28, B.DIAMANTE);
    } else if (d.t === 'buzon') {
        for (let y = 0; y < 3; y++) poner(d.x + 1, y0 + y, d.z + 1, B.TRONCO);
        poner(d.x + 1, y0 + 3, d.z + 1, B.ROJO);
        poner(d.x + 2, y0 + 3, d.z + 1, B.ROJO);
        poner(d.x + 3, y0 + 4, d.z + 1, B.NARANJO);
    }
}

function colocarFaro(vox, wx0, wz0, ancho, f) {
    const poner = (x, y, z, id) => {
        const lx = x - wx0, lz = z - wz0;
        if (lx < 0 || lz < 0 || lx >= ancho || lz >= ancho || y < 0 || y >= ALTO) return;
        vox[(y * ancho + lz) * ancho + lx] = id;
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
    // Linterna: pilares de diamante en las esquinas y vidrio en los lados para que se vea el farol
    for (let y = 32; y <= 34; y++) {
        anillo(y, 1, B.DIAMANTE, false);
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) poner(f.x + dx, f.y + y, f.z + dz, B.VIDRIO);
    }
    poner(f.x, f.y + 32, f.z, B.PIEDRA_LUMINOSA);
    poner(f.x, f.y + 33, f.z, B.PIEDRA_LUMINOSA);
    anillo(35, 2, B.NEGRO, true);
    poner(f.x, f.y + 36, f.z, B.NEGRO);
}

// ---------------------------------------------------------
// Luz por bloque (tipo Minecraft): dos canales 0-15
//  · cielo: 15 en toda celda con vista directa al cielo (sobre el bloque opaco más alto de su
//    columna; aire, vidrio, hojas, plantas y agua dejan pasar) y desde ahí se propaga por BFS,
//    -1 por bloque, hacia cuevas, el túnel de la mina e interiores (entra por puertas y ventanas).
//  · bloque: BFS desde los emisores (LUZ_EMISION de texturas.js), -1 por bloque.
// Se guarda empacada en un byte por celda: (cielo << 4) | bloque, con el mismo índice que vox.
//
// Bordes entre chunks sin costuras: el valor de una celda solo depende de lo que hay a menos
// de 15 pasos, así que se calcula sobre una ventana ampliada RADIO_LUZ bloques por lado y el
// resultado es exacto (idéntico al que calcularía el vecino para las mismas celdas).
// Como eso cuesta, hay un atajo exacto: el terreno natural es un mapa de alturas sin aleros, de
// modo que si en la ventana del chunk ninguna celda transparente queda bajo un bloque opaco y no
// hay emisores cerca (zonasLuz de prepararTerreno, o en la propia ventana), toda celda
// transparente tiene cielo 15 y bloque 0. Solo los chunks con casas, puentes, faro, pozo o mina
// (o a menos de RADIO_LUZ de un decorado) pagan la ventana ampliada.
// ---------------------------------------------------------
const RADIO_LUZ = 14;                 // la luz de un emisor 15 se apaga a los 15 pasos
const VL = VENT + 2 * RADIO_LUZ;      // ancho de la ventana ampliada
const VOX_GRANDE = new Uint8Array(VL * VL * ALTO);
const CIELO = new Uint8Array(VL * VL * ALTO);
const BLOQ = new Uint8Array(VL * VL * ALTO);
const COLA = new Int32Array(VL * VL * ALTO);
const PISO = new Int16Array(VL * VL);
export const LUZ_CIELO_ABIERTO = 15 << 4;
const EMISOR = 2; // valor de luz de bloque en el vértice que marca una cara emisora (brillo pleno)

// Propaga la luz del arreglo `nivel` desde las `n` celdas en COLA (BFS, cola circular)
function propagar(nivel, vox, G, tope, n) {
    const M = COLA.length, GG = G * G;
    let cab = 0, fin = n;
    while (cab !== fin) {
        const i = COLA[cab];
        cab = cab + 1 === M ? 0 : cab + 1;
        const L = nivel[i] - 1;
        if (L <= 0) continue;
        const x = i % G, z = ((i - x) / G) % G, y = (i - x - z * G) / GG;
        const ir = j => {
            if (nivel[j] < L && TIPO[vox[j]] !== 1) {
                nivel[j] = L;
                COLA[fin] = j;
                fin = fin + 1 === M ? 0 : fin + 1;
            }
        };
        if (x > 0) ir(i - 1);
        if (x < G - 1) ir(i + 1);
        if (z > 0) ir(i - G);
        if (z < G - 1) ir(i + G);
        if (y > 0) ir(i - GG);
        if (y < tope - 1) ir(i + GG);
    }
}

function calcularLuz(terreno, cx, cz, relleno) {
    const { vox, maxY } = relleno;
    const tope = Math.min(ALTO, maxY + 2); // desde aquí hacia arriba todo es aire a cielo abierto
    const NN = VENT * VENT;
    const luz = new Uint8Array(NN * ALTO);
    luz.fill(LUZ_CIELO_ABIERTO, tope * NN);

    // ¿Necesita la ventana ampliada? Emisores cercanos según las zonas del terreno
    const wx0 = cx * CHUNK - 1, wz0 = cz * CHUNK - 1;
    let ampliada = terreno.zonasLuz.some(r =>
        r.x1 >= wx0 - RADIO_LUZ && r.x0 <= wx0 + VENT + RADIO_LUZ && r.z1 >= wz0 - RADIO_LUZ && r.z0 <= wz0 + VENT + RADIO_LUZ);

    // Atajo: piso de cielo por columna; si hay celdas transparentes cubiertas o emisores, se descarta
    if (!ampliada) {
        for (let c = 0; c < NN && !ampliada; c++) {
            let y = tope - 1;
            for (; y >= 0; y--) {
                const id = vox[y * NN + c];
                if (LUZ_EMISION[id]) { ampliada = true; break; }
                if (TIPO[id] === 1) break;
            }
            for (let k = y + 1; k < tope; k++) luz[k * NN + c] = LUZ_CIELO_ABIERTO;
            for (let k = y - 1; k >= 0 && !ampliada; k--) {
                const id = vox[k * NN + c];
                if (TIPO[id] !== 1 || LUZ_EMISION[id]) ampliada = true;
            }
        }
        if (!ampliada) return luz;
    }

    // Ventana ampliada: se llena otra vez el terreno con RADIO_LUZ de margen y se propaga
    const G = VL, GG = G * G, R = RADIO_LUZ;
    const g = llenarVentana(terreno, wx0 - R, wz0 - R, G, VOX_GRANDE);
    const big = g.vox;
    const topeG = Math.min(ALTO, g.maxY + 2);
    CIELO.fill(0, 0, topeG * GG);
    BLOQ.fill(0, 0, topeG * GG);
    for (let c = 0; c < GG; c++) {
        let y = topeG - 1;
        while (y >= 0 && TIPO[big[y * GG + c]] !== 1) y--;
        PISO[c] = y + 1;
        for (let k = y + 1; k < topeG; k++) CIELO[k * GG + c] = 15;
    }
    // Semillas de cielo: celdas a cielo abierto junto a una celda transparente cubierta
    let n = 0;
    for (let z = 0; z < G; z++) {
        for (let x = 0; x < G; x++) {
            const c = z * G + x, p = PISO[c];
            const vecino = v => {
                for (let y = p; y < PISO[v]; y++) {
                    if (TIPO[big[y * GG + v]] !== 1) COLA[n++] = y * GG + c;
                }
            };
            if (x > 0) vecino(c - 1);
            if (x < G - 1) vecino(c + 1);
            if (z > 0) vecino(c - G);
            if (z < G - 1) vecino(c + G);
        }
    }
    propagar(CIELO, big, G, topeG, n);
    // Emisores
    n = 0;
    for (let i = 0; i < topeG * GG; i++) {
        const e = LUZ_EMISION[big[i]];
        if (e) { BLOQ[i] = e; COLA[n++] = i; }
    }
    if (n) propagar(BLOQ, big, G, topeG, n);

    // Recorta la ventana del chunk (topeG >= tope: la ventana ampliada contiene la del chunk)
    for (let y = 0; y < topeG; y++) {
        for (let lz = 0; lz < VENT; lz++) {
            const gi = y * GG + (lz + R) * G + R, li = (y * VENT + lz) * VENT;
            for (let lx = 0; lx < VENT; lx++) luz[li + lx] = (CIELO[gi + lx] << 4) | BLOQ[gi + lx];
        }
    }
    return luz;
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
    constructor() { this.p = []; this.u = []; this.c = []; this.l = []; this.i = []; this.n = 0; }
    get vacio() { return this.n === 0; }
    geometria() {
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
        g.setAttribute('uv', new THREE.Float32BufferAttribute(this.u, 2));
        g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
        g.setAttribute('luz', new THREE.Float32BufferAttribute(this.l, 2)); // cielo, bloque (0..1)
        g.setIndex(this.i);
        g.computeBoundingSphere();
        return g;
    }
}

export function mallarChunk(cx, cz, relleno) {
    const { vox, maxY } = relleno;
    const luz = relleno.luz;
    const solido = new Buffer(), agua = new Buffer();
    const ox = cx * CHUNK, oz = cz * CHUNK;
    const at = (x, y, z) => (y < 0 ? 1 : y >= ALTO ? 0 : TIPO[vox[(y * VENT + z) * VENT + x]]);
    const ocluye = (x, y, z) => { const t = at(x, y, z); return t === 1 || t === 2 ? 1 : 0; };
    // Luz empacada de una celda transparente; -1 si es opaca (no aporta al promedio)
    const luzEn = (x, y, z) => {
        if (y >= ALTO) return LUZ_CIELO_ABIERTO;
        if (y < 0) return -1;
        const i = (y * VENT + z) * VENT + x;
        if (TIPO[vox[i]] === 1) return -1;
        return luz ? luz[i] : LUZ_CIELO_ABIERTO;
    };
    // Suma de muestras para la luz suave de cada vértice
    let sumaCielo = 0, sumaBloque = 0, muestras = 0;
    const sumar = v => { if (v >= 0) { sumaCielo += v >> 4; sumaBloque += v & 15; muestras++; } };

    for (let y = 0; y <= maxY; y++) {
        for (let z = 1; z <= CHUNK; z++) {
            for (let x = 1; x <= CHUNK; x++) {
                const id = vox[(y * VENT + z) * VENT + x];
                if (id === 0) continue;
                const tipo = TIPO[id];
                const def = BLOQUES[id];
                const emite = LUZ_EMISION[id];
                if (tipo === 4) { // planta: dos planos cruzados, visibles por ambos lados
                    const planos = [[[0, 0, 0], [1, 0, 1], [1, 1, 1], [0, 1, 0]], [[1, 0, 0], [0, 0, 1], [0, 1, 1], [1, 1, 0]]];
                    const cuv = [[0, 0], [1, 0], [1, 1], [0, 1]];
                    const s = aSRGB(0.92);
                    const propia = luzEn(x, y, z);
                    const lc = (propia >> 4) / 15, lb = emite ? EMISOR : (propia & 15) / 15;
                    // Antorcha de pared: sin apoyo abajo y con un muro al lado, se pega a él inclinada
                    let px = 0, pz = 0, sube = 0;
                    if (emite && at(x, y - 1, z) !== 1) {
                        const muro = [[1, 0], [-1, 0], [0, 1], [0, -1]].find(([dx, dz]) => at(x + dx, y, z + dz) === 1);
                        if (muro) { px = muro[0]; pz = muro[1]; sube = 0.2; }
                    }
                    for (const plano of planos) {
                        const b0 = solido.n;
                        plano.forEach((c, k) => {
                            const corre = c[1] ? 0.22 : 0.4; // la base va más pegada al muro que la llama
                            solido.p.push(ox + x - 1 + c[0] + px * corre, y + c[1] + sube, oz + z - 1 + c[2] + pz * corre);
                            const [u, w] = uvTile(def.top, cuv[k][0], cuv[k][1]);
                            solido.u.push(u, w);
                            solido.c.push(s, s, s);
                            solido.l.push(lc, lb);
                        });
                        solido.i.push(b0, b0 + 1, b0 + 2, b0, b0 + 2, b0 + 3, b0, b0 + 2, b0 + 1, b0, b0 + 3, b0 + 2);
                        solido.n += 4;
                    }
                    continue;
                }
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

                        // Luz suave: promedio de las celdas transparentes que tocan el vértice
                        // (la vecina de la cara, las dos laterales y la diagonal si no está tapada)
                        sumaCielo = 0; sumaBloque = 0; muestras = 0;
                        sumar(luzEn(nx, ny, nz));
                        const [t1, t2] = cara.t;
                        const d1 = co[t1] * 2 - 1, d2 = co[t2] * 2 - 1;
                        const ax = t1 === 0 ? d1 : t2 === 0 ? d2 : 0;
                        const ay = t1 === 1 ? d1 : t2 === 1 ? d2 : 0;
                        const az = t1 === 2 ? d1 : t2 === 2 ? d2 : 0;
                        const l1 = luzEn(nx + (t1 === 0 ? d1 : 0), ny + (t1 === 1 ? d1 : 0), nz + (t1 === 2 ? d1 : 0));
                        const l2 = luzEn(nx + (t2 === 0 ? d2 : 0), ny + (t2 === 1 ? d2 : 0), nz + (t2 === 2 ? d2 : 0));
                        sumar(l1); sumar(l2);
                        if (l1 >= 0 || l2 >= 0) sumar(luzEn(nx + ax, ny + ay, nz + az));
                        if (muestras === 0) muestras = 1;
                        buf.l.push(sumaCielo / (muestras * 15), emite ? EMISOR : sumaBloque / (muestras * 15));
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
// Material con luz por bloque
// Parchea un MeshBasicMaterial del mundo (onBeforeCompile) para usar el atributo 'luz'
// (cielo, bloque en 0..1). El color difuso del material se ignora como multiplicador: pasa a ser
// el uniform uLuzCielo (vec3, 0..1), el tinte día/noche que cielo.js escribe en material.color
// cada cuadro (se comparte la misma referencia, así que se actualiza solo).
// Brillo = max(cielo, bloque) con la curva del lightmap de Minecraft (curvaLuz) y un mínimo
// ambiental; se multiplica por la sombra de cara y el AO del color de vértice, como antes.
// ---------------------------------------------------------
export const LUZ_MINIMA = 0.07;              // brillo sRGB de la oscuridad total (no negro puro)
const COLOR_LUZ_BLOQUE = [1.0, 0.8, 0.56];   // luz de antorcha cálida (lineal)

export function aplicarLuzMaterial(material) {
    if (!material || material.userData.luzVoxel) return;
    material.userData.luzVoxel = true;
    const minimo = Math.pow(LUZ_MINIMA, 2.2).toFixed(6);
    const [r, g, b] = COLOR_LUZ_BLOQUE.map(v => v.toFixed(3));
    material.onBeforeCompile = shader => {
        shader.uniforms.uLuzCielo = { value: material.color };
        shader.vertexShader = shader.vertexShader
            .replace('#include <common>', '#include <common>\nattribute vec2 luz;\nvarying vec2 vLuz;')
            .replace('#include <begin_vertex>', '#include <begin_vertex>\n\tvLuz = luz;');
        shader.fragmentShader = shader.fragmentShader
            .replace('uniform vec3 diffuse;', `uniform vec3 diffuse;
uniform vec3 uLuzCielo;
varying vec2 vLuz;
// Curva del lightmap de Minecraft (brillo 30 %): b = f / (4 - 3f), aclarada un 30 % hacia
// 1 - (1 - b)^4; se calcula en sRGB y se pasa a lineal. Nivel 15 da exactamente 1.
float curvaLuz( float f ) {
	float b = f / ( 4.0 - 3.0 * f );
	float c = 1.0 - b;
	b = mix( b, 1.0 - c * c * c * c, 0.3 );
	return pow( b, 2.2 );
}`)
            .replace('vec4 diffuseColor = vec4( diffuse, opacity );', 'vec4 diffuseColor = vec4( vec3( 1.0 ), opacity );')
            .replace('#include <color_fragment>', `#include <color_fragment>
	float brilloCielo = curvaLuz( vLuz.x );
	float brilloBloque = curvaLuz( min( vLuz.y, 1.0 ) );
	vec3 luzMundo = max( uLuzCielo * brilloCielo, vec3( ${r}, ${g}, ${b} ) * brilloBloque );
	luzMundo = mix( luzMundo, vec3( 1.0 ), step( 1.5, vLuz.y ) ); // caras emisoras: brillo pleno
	diffuseColor.rgb *= max( luzMundo, vec3( ${minimo} ) );`);
    };
    material.needsUpdate = true;
}

// ---------------------------------------------------------
// Gestor de chunks: carga por distancia con presupuesto por cuadro
// ---------------------------------------------------------
export class MundoVoxel {
    constructor(scene, terreno, materiales, distancia = 8) {
        this.scene = scene;
        this.terreno = terreno;
        this.mat = materiales;
        aplicarLuzMaterial(materiales.solido);
        aplicarLuzMaterial(materiales.agua);
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

    // Luz empacada de la celda: (cielo << 4) | bloque, 0-15 cada uno; -1 si no está cargada.
    // Ej.: const v = mundo.nivelLuz(x, y, z); cielo = v >> 4; bloque = v & 15.
    nivelLuz(x, y, z) {
        x = Math.floor(x); y = Math.floor(y); z = Math.floor(z);
        if (y >= ALTO) return LUZ_CIELO_ABIERTO;
        const ch = this.chunks.get(Math.floor(x / CHUNK) + ',' + Math.floor(z / CHUNK));
        if (!ch || y < 0) return -1;
        const lx = x - Math.floor(x / CHUNK) * CHUNK + 1, lz = z - Math.floor(z / CHUNK) * CHUNK + 1;
        return ch.luz[(y * VENT + lz) * VENT + lx];
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
            this.chunks.set(k, { mallas, vox: relleno.vox, luz: relleno.luz });
        }
        return this.cola.length;
    }
}
