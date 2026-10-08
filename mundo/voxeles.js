// =========================================================
// VENJY · Voxeles
// Convierte el mapa 2D (E/T/F) en un mundo de bloques y lo malla
// por chunks de 16×16 con culling de caras y oclusión ambiental.
// =========================================================
import * as THREE from '../vendor/three.module.js';
import { crearRuido } from './mundo-datos.js';
import { B, TIPO, BLOQUES, TAM, COLS, FILAS, LUZ_EMISION } from './texturas.js';
import { geometriaSobreMi, levantarSobreMi } from './portafolio/sobremi.js';
import { colocarPescador, colocarEscenario, colocarCorrales, colocarLugares } from './construcciones.js';
import { geometriaExperiencia, levantarExperiencia, levantarVetas, levantarPantallaFaro, geometriaGatera, levantarGatera, geometriaCorreo, levantarCorreo } from './portafolio/bloques.js';

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
    const ruidoAltura = crearRuido(31337); // rompe las curvas de nivel rectas sin tocar las zonas planas
    const BW = W * ESCALA, BD = H * ESCALA;
    const HT = new Int16Array(BW * BD);   // altura del bloque superior
    const SUP = new Uint8Array(BW * BD);  // bloque de la superficie
    const SUB = new Uint8Array(BW * BD);  // bloques bajo la superficie (3 capas)
    const ES = new Uint8Array(BW * BD);   // 0 natural · 1 estructura · 2 puente

    const AV = aguaDeCamino(datos);
    // Campo de alturas suave por celda
    const G = new Float32Array(W * H);
    for (let i = 0; i < G.length; i++) {
        if (F[i]) G[i] = BASE_ESTRUCTURA;
        else if (T[i] === 'hojas') G[i] = vh(E[i] - 3);
        else if (AV[i]) G[i] = vh(10);
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
            // Las celdas 'madera' sin F (puente del mapa 2D) quedan como agua: trazarPuentes pone
            // después un tablero recto y continuo entre las dos orillas

            // Altura: interpolación bilineal entre centros de celda
            const u = (bx + 0.5) / ESCALA - 0.5, v = (bz + 0.5) / ESCALA - 0.5;
            const x0 = Math.floor(u), z0 = Math.floor(v);
            const fx = u - x0, fz = v - z0;
            const a = g(x0, z0), b = g(x0 + 1, z0), c = g(x0, z0 + 1), d = g(x0 + 1, z0 + 1);
            const h = Math.round(a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz + (ruidoAltura(bx / 7, bz / 7, 2) - 0.5) * 0.9);
            HT[o] = h;

            // Material: bioma de la celda, con el borde desordenado para no verse cuadriculado
            const hs = hash(bx, bz, 7);
            const jx = (hs % 3) - 1, jz = ((hs >>> 4) % 3) - 1;
            let ti = Math.min(H - 1, Math.max(0, Math.floor((bz + jz) / ESCALA))) * W
                + Math.min(W - 1, Math.max(0, Math.floor((bx + jx) / ESCALA)));
            if (F[ti] || AV[ti]) ti = ci;
            const tj = AV[ti] ? 'agua' : T[ti];

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
    const puentes = trazarPuentes(datos, AV, HT, SUP, SUB, ES, BW, BD);
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
    // Casas: se agrupan las columnas de cada casa y se les da techo a dos aguas
    const casas = [];
    const visto = new Uint8Array(BW * BD);
    const esVol = o => HUECO[o] >= 1 && HUECO[o] <= 3;
    for (let o0 = 0; o0 < BW * BD; o0++) {
        if (visto[o0] || !esVol(o0)) continue;
        const sup = SUP[o0];
        const pila = [o0];
        const cols = [];
        visto[o0] = 1;
        let minx = BW, maxx = 0, minz = BD, maxz = 0, dxs = 0, dn = 0;
        while (pila.length) {
            const o = pila.pop();
            cols.push(o);
            const bx = o % BW, bz = (o - bx) / BW;
            if (bx < minx) minx = bx;
            if (bx > maxx) maxx = bx;
            if (bz < minz) minz = bz;
            if (bz > maxz) maxz = bz;
            if (HUECO[o] === 3) { dxs += bx; dn++; }
            for (const p of [o - 1, o + 1, o - BW, o + BW]) {
                if (p >= 0 && p < BW * BD && !visto[p] && esVol(p) && SUP[p] === sup) { visto[p] = 1; pila.push(p); }
            }
        }
        const lleno = cols.length / ((maxx - minx + 1) * (maxz - minz + 1));
        const ejeX = maxx - minx >= maxz - minz;
        if (lleno >= 0.9) { // casa rectangular: el techo sube un bloque cada dos hacia la cumbrera
            for (const o of cols) {
                const bx = o % BW, bz = (o - bx) / BW;
                const p = ejeX ? Math.min(bz - minz, maxz - bz) : Math.min(bx - minx, maxx - bx);
                HT[o] = BASE_ESTRUCTURA + 5 + Math.min(8, p >> 1);
            }
        }
        casas.push({
            minx, maxx, minz, maxz, ejeX, sup, puertaX: dn ? Math.round(dxs / dn) : (minx + maxx) >> 1,
            amueblar: lleno >= 0.9 && ejeX && sup !== B.NARANJO && maxx - minx >= 20 && maxz - minz >= 14
        });
    }
    // «Sobre mí»: la casa roja más cercana al punto `casa` del mapa se amuebla con el CV y el libro
    let sobreMi = null;
    {
        const [pcx0, pcz0] = datos.P.casa;
        let mejor = null, dm = Infinity;
        for (const c of casas) {
            if (!c.amueblar || c.sup !== B.ROJO) continue;
            const d = Math.hypot((c.minx + c.maxx) / 2 - (pcx0 * ESCALA + 2), (c.minz + c.maxz) / 2 - (pcz0 * ESCALA + 2));
            if (d < dm) { dm = d; mejor = c; }
        }
        if (mejor) { mejor.sobreMi = true; sobreMi = geometriaSobreMi(mejor, BASE_ESTRUCTURA); }
    }
    // «Experiencia»: el edificio azul más cercano al punto `registro` lleva un puesto por trabajo
    let registro = null;
    {
        const [rx, rz] = datos.P.registro;
        let mejor = null, dm = Infinity;
        for (const c of casas) {
            if (!c.amueblar || c.sup !== B.AZUL) continue;
            const d = Math.hypot((c.minx + c.maxx) / 2 - (rx * ESCALA + 2), (c.minz + c.maxz) / 2 - (rz * ESCALA + 2));
            if (d < dm) { dm = d; mejor = c; }
        }
        if (mejor) { mejor.registro = true; registro = geometriaExperiencia(mejor, BASE_ESTRUCTURA); }
    }
    // «Mis gatas»: la casa naranja más cercana al punto `gatera` se decora por dentro (franjas junto a las paredes)
    let gatera = null;
    {
        const [gx0, gz0] = datos.P.gatera;
        let mejor = null, dm = Infinity;
        for (const c of casas) {
            if (c.sup !== B.NARANJO) continue;
            const d = Math.hypot((c.minx + c.maxx) / 2 - gx0 * ESCALA, (c.minz + c.maxz) / 2 - gz0 * ESCALA);
            if (d < dm) { dm = d; mejor = c; }
        }
        if (mejor) { mejor.gatera = true; mejor.amueblar = true; gatera = geometriaGatera(mejor, BASE_ESTRUCTURA); }
    }
    // «Contacto»: el edificio de cuarzo del correo era un anillo macizo y sin puerta. Se vacía en un solo
    // salón, se le abre la puerta al sur y se nivela una plaza delante (ES=3 evita árboles en ella).
    let correo = null;
    {
        const [qx, qz] = datos.P.correo;
        let mejor = null, dm = Infinity;
        for (const c of casas) {
            if (c.sup !== B.CUARZO) continue;
            const d = Math.hypot((c.minx + c.maxx) / 2 - qx * ESCALA, (c.minz + c.maxz) / 2 - qz * ESCALA);
            if (d < dm) { dm = d; mejor = c; }
        }
        if (mejor) {
            const c = mejor;
            for (let bz = c.minz + 1; bz < c.maxz; bz++) for (let bx = c.minx + 1; bx < c.maxx; bx++) HUECO[bz * BW + bx] = 1;
            for (let dx = 0; dx <= 1; dx++) HUECO[c.maxz * BW + c.puertaX + dx] = 3;
            for (let bz = c.maxz + 1; bz <= c.maxz + 8; bz++) {
                for (let bx = c.puertaX - 6; bx <= c.puertaX + 7; bx++) {
                    const o = bz * BW + bx;
                    ES[o] = 3; HT[o] = BASE_ESTRUCTURA; SUB[o] = B.TIERRA; HUECO[o] = 0;
                    SUP[o] = bx >= c.puertaX && bx <= c.puertaX + 1 ? B.GRIS : B.PASTO;
                }
            }
            c.correo = true; c.amueblar = true;
            correo = geometriaCorreo(c, BASE_ESTRUCTURA);
        }
    }
    // Lugares nuevos (construcciones.js): caseta del pescador y escenario de Salonas
    const tt = { BW, BD, HT, SUP, SUB, ES, datos, ESCALA, NIVEL_AGUA };
    const pescador = colocarPescador(tt, puentes);
    const escenario = colocarEscenario(tt);
    const corrales = colocarCorrales(tt);
    const lugares = colocarLugares(tt); // molino, atalaya, campamento, portal, iglú y naufragio
    const decor = [
        ...puentes,
        ...[pescador, escenario, ...corrales, ...lugares].filter(Boolean).map(l => l.decor).filter(Boolean),
        { t: 'pozo', x: (pax - 1) * ESCALA, z: (pay - 5) * ESCALA, cx: (pax - 1) * ESCALA + 4, cz: (pay - 5) * ESCALA + 4, r: 6 },
        { t: 'buzon', x: (pcx - 3) * ESCALA, z: (pcy - 5) * ESCALA, cx: (pcx - 3) * ESCALA + 2, cz: (pcy - 5) * ESCALA + 2, r: 6 },
        { t: 'mina', x: mix * ESCALA, z: (miy - 5) * ESCALA, cx: mix * ESCALA, cz: (miy - 5) * ESCALA - 14, r: 18 }
    ];
    const faro = { x: fcx * ESCALA, z: fcz * ESCALA, y: vh(19) + 1 };
    // Zonas donde puede haber emisores de luz (antorchas, piedra luminosa): los chunks a menos
    // de RADIO_LUZ bloques de una zona calculan la luz con la ventana ampliada (ver calcularLuz).
    // Quien coloque emisores fuera del decorado o del faro debe agregar aquí su rectángulo.
    const zonasLuz = decor.map(d => d.luz || { x0: d.cx - d.r, z0: d.cz - d.r, x1: d.cx + d.r, z1: d.cz + d.r });
    zonasLuz.push({ x0: faro.x - 12, z0: faro.z - 12, x1: faro.x + 12, z1: faro.z + 12 });
    for (const c of casas) zonasLuz.push({ x0: c.minx - 1, z0: c.minz - 1, x1: c.maxx + 1, z1: c.maxz + 1 });
    return { BW, BD, HT, SUP, SUB, ES, HUECO, faro, decor, casas, zonasLuz, datos, sobreMi, registro, gatera, correo, pescador, escenario, corrales, lugares, ediciones: new Map() };
}

// ---------------------------------------------------------
// Puentes: en el mapa 2D el camino cruza el agua como una línea ondulada de celdas 'madera',
// que en bloques quedaban como parches de 4×4 apenas unidos en diagonal. Aquí cada cruce se
// reemplaza por un tablero recto de orilla a orilla (~3 bloques útiles), con barandas de valla,
// postes de tronco con pilotes hasta el fondo y antorchas. Determinista: lo recalculan los workers.
// Devuelve decorados { t: 'puente', bloques: [x, y, z, id, …] } para colocarDecor.
// ---------------------------------------------------------
// Celdas del camino que en realidad cruzan agua. En el 2D los píxeles del camino se pisan: una celda
// que ya era 'madera' vuelve a pasar como 'tierra' de altura 15, así que la mayoría del cruce queda
// como tierra a ras del agua. Se reconocen por estar a nivel de playa con 3 o más vecinos de agua.
function aguaDeCamino(datos) {
    const { W, H, T, E, F, NIVEL_MAR } = datos;
    const AV = new Uint8Array(W * H);
    // Se repite para que el agua se propague por la cinta del camino (sus vecinas también son camino)
    for (let pasada = 0, cambio = true; pasada < 6 && cambio; pasada++) {
        cambio = false;
        for (let y = 1; y < H - 1; y++) {
            for (let x = 1; x < W - 1; x++) {
                const i = y * W + x;
                if (F[i] || AV[i]) continue;
                if (T[i] === 'madera') { AV[i] = 1; cambio = true; continue; }
                if (T[i] !== 'tierra' || E[i] > NIVEL_MAR + 1) continue;
                let n = 0;
                for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (T[i + dy * W + dx] === 'agua' || AV[i + dy * W + dx]) n++;
                if (n >= 3) { AV[i] = 1; cambio = true; }
            }
        }
    }
    return AV;
}

function trazarPuentes(datos, AV, HT, SUP, SUB, ES, BW, BD) {
    const { W, H, tramos, orient } = datos;
    const anchoCamino = orient === 'h' ? 1 : 0;
    const esMadera = (x, y) => {
        for (let oy = 0; oy <= 1; oy++) {
            for (let ox = 0; ox <= anchoCamino; ox++) {
                const xx = x + ox, yy = y + oy;
                if (xx >= 0 && yy >= 0 && xx < W && yy < H && AV[yy * W + xx]) return true;
            }
        }
        return false;
    };
    const centro = ([x, y]) => [x * ESCALA + (anchoCamino ? ESCALA : ESCALA / 2), y * ESCALA + ESCALA];
    const lista = [];
    for (const px of tramos) {
        let i = 0;
        while (i < px.length) {
            if (!esMadera(px[i][0], px[i][1])) { i++; continue; }
            // Tramo sobre el agua; se unen los cortes de hasta 2 píxeles de tierra
            let j = i, k = i + 1;
            while (k < px.length && k - j <= 3) { if (esMadera(px[k][0], px[k][1])) j = k; k++; }
            if (i > 0 && j < px.length - 1) {
                const p = construirPuente(centro(px[i - 1]), centro(px[j + 1]), HT, SUP, SUB, ES, BW, BD);
                if (p) lista.push(p);
            }
            i = j + 1;
        }
    }
    return lista;
}

function construirPuente([ax, az], [bx, bz], HT, SUP, SUB, ES, BW, BD) {
    const L = Math.hypot(bx - ax, bz - az);
    if (L < 2) return null;
    const ux = (bx - ax) / L, uz = (bz - az) / L, nx = -uz, nz = ux;
    const dentro = (x, z) => x >= 0 && z >= 0 && x < BW && z < BD;
    const orilla = (x, z) => dentro(x, z) ? Math.max(NIVEL_AGUA + 1, HT[Math.floor(z) * BW + Math.floor(x)]) : NIVEL_AGUA + 1;
    const hA = orilla(ax, az), hB = orilla(bx, bz);
    // En tierra firme el tablero sigue como rampa que baja 1 bloque por bloque hasta topar con el suelo
    const EXT = 8;
    const tablero = new Map(); // o -> { h, s }
    for (let s = -EXT; s <= L + EXT; s += 0.5) {
        const t = Math.min(1, Math.max(0, s / L));
        const h = Math.round(hA + (hB - hA) * t) - Math.ceil(Math.max(0, -s, s - L));
        for (let w = -2; w <= 2; w += 0.5) {
            const x = Math.floor(ax + ux * s + nx * w), z = Math.floor(az + uz * s + nz * w);
            if (!dentro(x, z)) continue;
            const o = z * BW + x;
            if (!tablero.has(o)) tablero.set(o, { h, s });
        }
    }
    const agua = new Set();
    for (const [o, { h }] of tablero) {
        if (ES[o] === 1) continue;
        if (HT[o] <= NIVEL_AGUA || ES[o] === 2) {
            agua.add(o);
            ES[o] = 2; HT[o] = Math.max(h, NIVEL_AGUA + 1); SUP[o] = B.TABLONES; SUB[o] = B.ARENA;
        } else if (HT[o] <= h) {
            ES[o] = 3; HT[o] = h; SUP[o] = B.TABLONES;
        }
    }
    // Barandas: bordes del tablero que dan al agua. Cada 4 bloques, poste con pilote; cada 12, antorcha
    const bloques = [];
    let x0 = BW, z0 = BD, x1 = 0, z1 = 0, maxY = 0;
    for (const o of agua) {
        const x = o % BW, z = (o - x) / BW;
        const { s } = tablero.get(o), h = HT[o];
        // Con las 8 vecinas: en tramos diagonales la baranda queda unida por los lados (sin rendijas en las esquinas)
        const borde = [o - 1, o + 1, o - BW, o + BW, o - BW - 1, o - BW + 1, o + BW - 1, o + BW + 1]
            .some(p => !tablero.has(p) && HT[p] <= NIVEL_AGUA && ES[p] !== 2);
        if (!borde) continue;
        const k = Math.round(s);
        if (k % 4 === 0) {
            for (let y = NIVEL_AGUA - 4; y < h; y++) bloques.push(x, y, z, B.TRONCO);
            bloques.push(x, h + 1, z, B.TRONCO);
            if (k % 12 === 0) bloques.push(x, h + 2, z, B.ANTORCHA);
        } else bloques.push(x, h + 1, z, B.VALLA);
        x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z);
        maxY = Math.max(maxY, h + 2);
    }
    if (!bloques.length) return null;
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    return {
        t: 'puente', bloques, cx, cz, r: Math.max(x1 - x0, z1 - z0) / 2 + 2, maxY, a: [ax, az], b: [bx, bz],
        luz: { x0: x0 - 1, z0: z0 - 1, x1: x1 + 1, z1: z1 + 1 }
    };
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
    if (terreno.arena) return llenarArena(terreno, wx0, wz0, ancho, destino);
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
                if (es === 2) id = y === tope ? sup : y > NIVEL_AGUA ? B.AIRE : y > NIVEL_AGUA - 4 ? B.AGUA : B.ARENA;
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
            colocarDecor(vox, wx0, wz0, VENT, d, d.y ?? BASE_ESTRUCTURA + 1);
            maxY = Math.max(maxY, d.maxY ?? BASE_ESTRUCTURA + 8);
        }
    }
    // Casas: chimenea, cama, librero, mesa con antorcha y cofre
    for (const c of terreno.casas) {
        if (c.amueblar && c.maxx + 2 > wx0 && c.minx - 2 < wx0 + VENT && c.maxz + 2 > wz0 && c.minz - 2 < wz0 + VENT) {
            amueblarCasa(vox, wx0, wz0, VENT, c, terreno);
        }
    }
    // Faro: torre de rayas con linterna en la cima
    const f = terreno.faro;
    if (Math.abs(f.x - (wx0 + VENT / 2)) < 12 + VENT / 2 && Math.abs(f.z - (wz0 + VENT / 2)) < 12 + VENT / 2) {
        colocarFaro(vox, wx0, wz0, VENT, f);
        maxY = Math.max(maxY, f.y + 38);
    }
    maxY = Math.max(maxY, aplicarEdiciones(terreno, vox, wx0, wz0, VENT));
    return { vox, maxY: Math.min(ALTO - 1, maxY + 1) };
}

// Terreno de la arena skywars (online/arena.js): copia la ventana desde un arreglo denso
function llenarArena(terreno, wx0, wz0, ancho, destino) {
    const { vox: fuente, W, D } = terreno.arena;
    const vox = destino ? destino.fill(0) : new Uint8Array(ancho * ancho * ALTO);
    if (terreno.arena.maxY === undefined) {
        let m = 0;
        for (let i = 0; i < fuente.length; i++) if (fuente[i]) { const y = Math.floor(i / (W * D)); if (y > m) m = y; }
        terreno.arena.maxY = m;
    }
    const x0 = Math.max(0, wx0), x1 = Math.min(W, wx0 + ancho);
    if (x1 > x0) {
        for (let y = 0; y <= terreno.arena.maxY; y++) {
            for (let lz = 0; lz < ancho; lz++) {
                const z = wz0 + lz;
                if (z < 0 || z >= D) continue;
                const o = (y * D + z) * W;
                vox.set(fuente.subarray(o + x0, o + x1), (y * ancho + lz) * ancho + (x0 - wx0));
            }
        }
    }
    const maxY = Math.max(terreno.arena.maxY, aplicarEdiciones(terreno, vox, wx0, wz0, ancho));
    return { vox, maxY: Math.min(ALTO - 1, maxY + 1) };
}

// ---------------------------------------------------------
// Ediciones de bloques (romper / poner)
// Se guardan por chunk en terreno.ediciones: clave de chunk -> Map('x,y,z' -> id).
// llenarVentana las aplica al final, así que el llenado, la luz y el mallado las ven igual en
// el hilo principal y en los workers (que reciben la misma lista).
// ---------------------------------------------------------
export function claveChunk(x, z) { return Math.floor(x / CHUNK) + ',' + Math.floor(z / CHUNK); }

export function guardarEdicion(terreno, x, y, z, id) {
    const k = claveChunk(x, z);
    let m = terreno.ediciones.get(k);
    if (!m) terreno.ediciones.set(k, m = new Map());
    m.set(x + ',' + y + ',' + z, id);
}

function aplicarEdiciones(terreno, vox, wx0, wz0, ancho) {
    if (!terreno.ediciones.size) return 0;
    let maxY = 0;
    const c0x = Math.floor(wx0 / CHUNK), c1x = Math.floor((wx0 + ancho - 1) / CHUNK);
    const c0z = Math.floor(wz0 / CHUNK), c1z = Math.floor((wz0 + ancho - 1) / CHUNK);
    for (let cz = c0z; cz <= c1z; cz++) {
        for (let cx = c0x; cx <= c1x; cx++) {
            const m = terreno.ediciones.get(cx + ',' + cz);
            if (!m) continue;
            for (const [clave, id] of m) {
                const [x, y, z] = clave.split(',').map(Number);
                const lx = x - wx0, lz = z - wz0;
                if (lx < 0 || lz < 0 || lx >= ancho || lz >= ancho || y < 0 || y >= ALTO) continue;
                vox[(y * ancho + lz) * ancho + lx] = id;
                if (y > maxY) maxY = y;
            }
        }
    }
    return maxY;
}

// ¿Hay ediciones en alguno de los chunks que tocan el rectángulo (con margen)?
function hayEdicionesCerca(terreno, x0, z0, x1, z1) {
    if (!terreno.ediciones.size) return false;
    for (let cz = Math.floor(z0 / CHUNK); cz <= Math.floor(z1 / CHUNK); cz++) {
        for (let cx = Math.floor(x0 / CHUNK); cx <= Math.floor(x1 / CHUNK); cx++) {
            if (terreno.ediciones.has(cx + ',' + cz)) return true;
        }
    }
    return false;
}

function amueblarCasa(vox, wx0, wz0, ancho, c, terreno) {
    const poner = (x, y, z, id) => {
        const lx = x - wx0, lz = z - wz0;
        if (lx < 0 || lz < 0 || lx >= ancho || lz >= ancho || y < 0 || y >= ALTO) return;
        vox[(y * ancho + lz) * ancho + lx] = id;
    };
    const y0 = BASE_ESTRUCTURA + 1;
    if (c.gatera) { levantarGatera(poner, terreno.gatera, y0); return; }   // sin chimenea: las gatas necesitan el espacio
    if (c.correo) { levantarCorreo(poner, terreno.correo, y0); return; }
    const ix0 = c.minx + 1, ix1 = c.maxx - 1, iz0 = c.minz + 1, iz1 = c.maxz - 1;
    const cz = (c.minz + c.maxz) >> 1;
    // Chimenea contra la pared oeste, con un hogar de antorcha y salida sobre el techo
    const tope = terreno.HT[cz * terreno.BW + ix0 + 1] + 3;
    for (let x = ix0; x <= ix0 + 2; x++) {
        for (let z = cz - 1; z <= cz + 1; z++) for (let y = y0; y <= tope; y++) poner(x, y, z, B.LADRILLO);
    }
    poner(ix0 + 2, y0, cz, B.ANTORCHA);
    poner(ix0 + 2, y0 + 1, cz, B.AIRE);
    // La casa de «Sobre mí» lleva sus propios muebles (atriles del CV, mesa con el libro)
    if (c.sobreMi) { levantarSobreMi(poner, terreno.sobreMi, y0); return; }
    if (c.registro) { levantarExperiencia(poner, terreno.registro, y0); return; }
    // Muebles (se omiten los que no caben)
    const hay = (x, z, w, d) => x >= ix0 + 4 && x + w - 1 <= ix1 && z >= iz0 && z + d - 1 <= iz1
        && !(x <= c.puertaX + 2 && x + w - 1 >= c.puertaX - 1 && z + d - 1 >= cz);
    const bloques = (x, z, w, d, id, alto = 1) => {
        for (let dz = 0; dz < d; dz++) for (let dx = 0; dx < w; dx++) for (let y = 0; y < alto; y++) poner(x + dx, y0 + y, z + dz, id);
    };
    if (hay(ix1 - 3, iz0, 2, 3)) bloques(ix1 - 3, iz0, 2, 3, B.CAMA);
    if (hay(ix0 + 5, iz0, 3, 1)) bloques(ix0 + 5, iz0, 3, 1, B.LIBRERO, 2);
    const mx = Math.min(ix1 - 1, Math.max(ix0 + 6, c.puertaX + 3));
    if (hay(mx, cz, 2, 2)) { bloques(mx, cz, 2, 2, B.TABLONES); poner(mx, y0 + 1, cz, B.ANTORCHA); }
    if (hay(ix1, iz1, 1, 1)) poner(ix1, y0, iz1, B.COFRE);
    // Antorchas en las paredes largas para que el interior no quede a oscuras
    for (const x of [ix0 + 10, ix1 - 8, (ix0 + ix1) >> 1]) {
        poner(x, y0 + 2, iz0, B.ANTORCHA);
        if (Math.abs(x - c.puertaX) > 2) poner(x, y0 + 2, iz1, B.ANTORCHA);
    }
}

function colocarDecor(vox, wx0, wz0, ancho, d, y0) {
    const poner = (x, y, z, id) => {
        const lx = x - wx0, lz = z - wz0;
        if (lx < 0 || lz < 0 || lx >= ancho || lz >= ancho || y < 0 || y >= ALTO) return;
        vox[(y * ancho + lz) * ancho + lx] = id;
    };
    if (d.t === 'puente' || d.t === 'bloques') {
        const b = d.bloques;
        for (let i = 0; i < b.length; i += 4) poner(b[i], b[i + 1], b[i + 2], b[i + 3]);
    } else if (d.t === 'pozo') {
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
        for (let k = 1; k <= 27; k++) poner(d.x, y0 - 1, d.z - k, B.RIEL);
        poner(d.x + 2, y0, d.z - 27, B.COFRE);
        poner(d.x, y0, d.z - 28, B.ORO);
        poner(d.x, y0 + 1, d.z - 28, B.DIAMANTE);
        levantarVetas(poner, d, y0); // una veta por grupo de habilidades
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
    levantarPantallaFaro(poner, f); // pantalla de ProcedimientoSeguro al pie del faro
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

    if (!ampliada) ampliada = hayEdicionesCerca(terreno, wx0 - RADIO_LUZ, wz0 - RADIO_LUZ, wx0 + VENT + RADIO_LUZ, wz0 + VENT + RADIO_LUZ);

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
    // Arreglos tipados listos para transferir desde un worker
    datos() {
        return {
            p: new Float32Array(this.p), u: new Float32Array(this.u), c: new Float32Array(this.c),
            l: new Float32Array(this.l), i: new Uint32Array(this.i)
        };
    }
    geometria() { return geometriaDe(this.datos()); }
}

// Construye la geometría de Three.js a partir de los arreglos de un chunk (hilo principal)
export function geometriaDe(d) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(d.p, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(d.u, 2));
    g.setAttribute('color', new THREE.BufferAttribute(d.c, 3));
    g.setAttribute('luz', new THREE.BufferAttribute(d.l, 2)); // cielo, bloque (0..1)
    g.setIndex(new THREE.BufferAttribute(d.i, 1));
    g.computeBoundingSphere();
    return g;
}

function mallarBuffers(cx, cz, relleno) {
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
    return { solido: solido.vacio ? null : solido, agua: agua.vacio ? null : agua };
}

export function mallarChunk(cx, cz, relleno) {
    const b = mallarBuffers(cx, cz, relleno);
    return { solido: b.solido && b.solido.geometria(), agua: b.agua && b.agua.geometria() };
}

// Igual que mallarChunk pero devuelve arreglos tipados (para el worker)
export function mallarChunkCrudo(cx, cz, relleno) {
    const b = mallarBuffers(cx, cz, relleno);
    return { solido: b.solido && b.solido.datos(), agua: b.agua && b.agua.datos() };
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
        this.todosWorkers = [];  // incluye los que aún arrancan (para no perder ediciones)
        this.workers = [];       // workers de chunks listos para recibir trabajo
        this.enVuelo = new Map(); // clave de chunk pedido a un worker -> versión de ediciones al pedirlo
        this.terrenoPrincipal = terreno; // el mundo normal (la arena lo reemplaza temporalmente)
        this.gen = 0;             // cambia al cambiar de terreno: descarta resultados atrasados de los workers
        this.version = 0;         // sube con cada edición
        this.versionChunk = new Map(); // clave de chunk -> última versión que lo afectó
        this.remallado = new Set();    // chunks que deben volver a mallarse por una edición
        this.resultados = [];     // chunks ya calculados esperando su malla en el hilo principal
    }

    // Arranca workers que generan y mallan chunks fuera del hilo principal.
    // Si el navegador no los soporta, procesar() cae al mallado en el hilo principal.
    iniciarWorkers(orient, cantidad = 2) {
        try {
            for (let n = 0; n < cantidad; n++) {
                const w = new Worker(new URL('./worker-chunks.js', import.meta.url), { type: 'module' });
                const est = { w, listo: false, pedidos: 0 };
                this.todosWorkers.push(est);
                w.onmessage = e => {
                    const m = e.data;
                    if (m.t === 'listo') { est.listo = true; this.workers.push(est); }
                    else if (m.t === 'chunk') { est.pedidos--; if (m.gen === this.gen) this.resultados.push(m); }
                    else if (m.t === 'error') { console.error('worker de chunks:', m.mensaje); est.pedidos = Math.max(0, est.pedidos - 1); }
                };
                w.onerror = err => { console.error('worker de chunks:', err.message); est.listo = false; };
                w.postMessage({ t: 'init', orient, ediciones: this.listaEdiciones() });
            }
        } catch (e) { /* sin workers: se malla en el hilo principal */ }
    }

    // Un cuadro de trabajo: reparte chunks a los workers y crea las mallas de los que ya llegaron.
    // Sin workers listos, malla en el hilo principal con el presupuesto indicado.
    procesar(presupuestoMs = 5) {
        if (!this.workers.length) return this.construir(presupuestoMs);
        const t0 = performance.now();
        this.procesarRemallado(1);
        while (this.resultados.length && performance.now() - t0 < presupuestoMs) {
            const m = this.resultados.shift();
            const ver = this.enVuelo.get(m.k) || 0;
            this.enVuelo.delete(m.k);
            if (this.chunks.has(m.k) || !this.deseado(m.x, m.z)) continue;
            this.instalar(m.k, m.g, m.vox, m.luz);
            if ((this.versionChunk.get(m.k) || 0) > ver) this.remallado.add(m.k); // se editó mientras el worker trabajaba
        }
        const MAX = 3; // pedidos simultáneos por worker
        for (const est of this.workers) {
            while (est.pedidos < MAX && this.cola.length) {
                const { x, z, k } = this.cola.shift();
                if (this.chunks.has(k) || this.enVuelo.has(k)) continue;
                this.enVuelo.set(k, this.version);
                est.pedidos++;
                est.w.postMessage({ t: 'chunk', x, z, k, g: this.gen });
            }
        }
        return this.cola.length + this.enVuelo.size;
    }

    // ---- Edición de bloques ----
    listaEdiciones() {
        const lista = [];
        for (const m of this.terreno.ediciones.values()) {
            for (const [clave, id] of m) { const [x, y, z] = clave.split(',').map(Number); lista.push([x, y, z, id]); }
        }
        return lista;
    }

    // Cambia un bloque. `inmediato`: malla ya el chunk (y vecinos de borde); el resto, en cola.
    editar(x, y, z, id, inmediato = true) {
        this.editarLote([[x, y, z, id]], inmediato);
    }

    editarLote(lista, inmediato = false) {
        const tocados = new Set();
        const R = RADIO_LUZ + 1;
        this.version++;
        for (const [x, y, z, id] of lista) {
            if (y < 0 || y >= ALTO || x < 0 || z < 0 || x >= this.terreno.BW || z >= this.terreno.BD) continue;
            guardarEdicion(this.terreno, x, y, z, id);
            for (let cz = Math.floor((z - R) / CHUNK); cz <= Math.floor((z + R) / CHUNK); cz++) {
                for (let cx = Math.floor((x - R) / CHUNK); cx <= Math.floor((x + R) / CHUNK); cx++) {
                    const k = cx + ',' + cz;
                    this.versionChunk.set(k, this.version);
                    tocados.add(k);
                }
            }
            // Los vecinos directos (borde del chunk) se rehacen siempre ya: se ven las caras ocultas
            if (inmediato) {
                const propio = claveChunk(x, z);
                this.remallarYa(propio);
                const lx = ((x % CHUNK) + CHUNK) % CHUNK, lz = ((z % CHUNK) + CHUNK) % CHUNK;
                if (lx === 0) this.remallarYa(claveChunk(x - 1, z));
                if (lx === CHUNK - 1) this.remallarYa(claveChunk(x + 1, z));
                if (lz === 0) this.remallarYa(claveChunk(x, z - 1));
                if (lz === CHUNK - 1) this.remallarYa(claveChunk(x, z + 1));
            }
        }
        for (const k of tocados) if (this.chunks.has(k)) this.remallado.add(k);
        if (this.terreno === this.terrenoPrincipal) for (const est of this.todosWorkers) est.w.postMessage({ t: 'ediciones', lista });
    }

    remallarYa(k) {
        this.remallado.delete(k);
        const ch = this.chunks.get(k);
        if (!ch) return;
        const [cx, cz] = k.split(',').map(Number);
        const relleno = llenarChunk(this.terreno, cx, cz);
        this.liberar(ch);
        this.chunks.delete(k);
        this.instalar(k, mallarChunkCrudo(cx, cz, relleno), relleno.vox, relleno.luz);
    }

    // Rehace hasta `maximo` chunks pendientes por cuadro
    procesarRemallado(maximo = 1) {
        for (const k of this.remallado) {
            if (maximo-- <= 0) break;
            this.remallarYa(k);
        }
    }

    // Cambia el mundo entero (p. ej. a la arena y de vuelta). Los workers solo conocen el mundo normal.
    cambiarTerreno(terreno) {
        for (const ch of this.chunks.values()) this.liberar(ch);
        this.chunks.clear();
        this.cola = []; this.resultados = []; this.enVuelo.clear(); this.remallado.clear(); this.versionChunk.clear();
        this.ultimo = null;
        this.gen++;
        this.terreno = terreno;
        this.cx = terreno.BW / CHUNK;
        this.cz = terreno.BD / CHUNK;
        this.workers = terreno === this.terrenoPrincipal ? this.todosWorkers.filter(e => e.listo) : [];
    }

    deseado(x, z) {
        if (!this.ultimo) return true;
        const dx = x - this.ultimo[0], dz = z - this.ultimo[1];
        return dx * dx + dz * dz <= (this.distancia + 1) * (this.distancia + 1);
    }

    instalar(k, g, vox, luz) {
        const mallas = [];
        if (g.solido) {
            const m = new THREE.Mesh(geometriaDe(g.solido), this.mat.solido);
            m.matrixAutoUpdate = false;
            this.scene.add(m); mallas.push(m);
        }
        if (g.agua) {
            const m = new THREE.Mesh(geometriaDe(g.agua), this.mat.agua);
            m.matrixAutoUpdate = false;
            m.renderOrder = 1;
            this.scene.add(m); mallas.push(m);
        }
        this.chunks.set(k, { mallas, vox, luz });
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
            if (this.enVuelo.has(k)) continue; // ya lo está calculando un worker
            const relleno = llenarChunk(this.terreno, x, z);
            const c = mallarChunkCrudo(x, z, relleno);
            this.instalar(k, c, relleno.vox, relleno.luz);
        }
        this.procesarRemallado(1);
        return this.cola.length;
    }
}
