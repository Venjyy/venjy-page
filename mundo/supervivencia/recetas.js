// =========================================================
// VENJY · Supervivencia · Recetas
// Con forma (como en Minecraft: se puede mover dentro de la rejilla y espejar) y sin forma,
// para la rejilla 2×2 del inventario y la 3×3 de la mesa. Recetas de horno aparte.
// Todo es puro (sin DOM): mundo/tests/recetas.mjs lo prueba en Node.
// =========================================================
import { B } from '../texturas.js';
import { O } from './objetos.js';

// Grupos: cualquiera de estos ids sirve en esa casilla
const TRONCOS = [B.TRONCO, B.TRONCO_ABEDUL, B.TRONCO_PINO];
const CARBONES = [O.CARBON, O.CARBON_VEGETAL];
const LANAS = [B.LANA, B.LANA_ROJA];
const W = B.TABLONES, S = O.PALO;

export const RECETAS = [];
const conForma = (forma, clave, id, n = 1) => RECETAS.push({ forma, clave, da: [id, n] });
const sinForma = (lista, id, n = 1) => RECETAS.push({ sin: lista, da: [id, n] });

// ---- Básicas ----
for (const t of TRONCOS) sinForma([t], B.TABLONES, 4);
conForma(['W', 'W'], { W }, O.PALO, 4);
conForma(['WW', 'WW'], { W }, B.MESA);
conForma(['C', 'S'], { C: CARBONES, S }, B.ANTORCHA, 4);
conForma(['AAA', 'A A', 'AAA'], { A: B.ADOQUIN }, B.HORNO);
conForma(['WWW', 'W W', 'WWW'], { W }, B.COFRE);
conForma(['WW', 'WW', 'WW'], { W }, O.PUERTA, 3);
conForma(['S S', 'SSS', 'S S'], { S }, B.ESCALERA, 3);
conForma(['WSW', 'WSW'], { W, S }, B.VALLA, 3);
conForma(['LLL', 'WWW'], { L: LANAS, W }, O.CAMA);
conForma(['HH', 'HH'], { H: O.HILO }, B.LANA);
conForma(['W W', ' W '], { W }, O.CUENCO, 4);
conForma(['AA', 'AA'], { A: B.ADOQUIN }, B.GRIS, 4);
conForma(['AA', 'AA'], { A: B.ARENA }, B.CUARZO, 1); // «cuarzo» de arena: bloque blanco para construir

// ---- Herramientas: madera, piedra, hierro, oro, diamante ----
const MATS = [['MADERA', W], ['PIEDRA', B.ADOQUIN], ['HIERRO', O.LINGOTE_HIERRO], ['ORO', O.LINGOTE_ORO], ['DIAMANTE', O.DIAMANTE]];
for (const [m, M] of MATS) {
    conForma(['MMM', ' S ', ' S '], { M, S }, O['PICO_' + m]);
    conForma(['MM', 'MS', ' S'], { M, S }, O['HACHA_' + m]);
    conForma(['M', 'S', 'S'], { M, S }, O['PALA_' + m]);
    conForma(['MM', ' S', ' S'], { M, S }, O['AZADA_' + m]);
    conForma(['M', 'M', 'S'], { M, S }, O['ESPADA_' + m]);
}

// ---- Armaduras ----
for (const [m, M] of [['CUERO', O.CUERO], ['HIERRO', O.LINGOTE_HIERRO], ['ORO', O.LINGOTE_ORO], ['DIAMANTE', O.DIAMANTE]]) {
    conForma(['MMM', 'M M'], { M }, O['CASCO_' + m]);
    conForma(['M M', 'MMM', 'MMM'], { M }, O['PETO_' + m]);
    conForma(['MMM', 'M M', 'M M'], { M }, O['GREBAS_' + m]);
    conForma(['M M', 'M M'], { M }, O['BOTAS_' + m]);
}

// ---- Varios ----
conForma([' I', 'I '], { I: O.LINGOTE_HIERRO }, O.TIJERAS);
conForma(['I I', ' I '], { I: O.LINGOTE_HIERRO }, O.CUBO);
conForma([' SH', 'S H', ' SH'], { S, H: O.HILO }, O.ARCO);
conForma(['F', 'S', 'P'], { F: O.PEDERNAL, S, P: O.PLUMA }, O.FLECHA, 4);
conForma(['WIW', 'WWW', ' W '], { W, I: O.LINGOTE_HIERRO }, O.ESCUDO);
conForma(['  S', ' SH', 'S H'], { S, H: O.HILO }, O.CANA);
conForma([' I ', 'IRI', ' I '], { I: O.LINGOTE_HIERRO, R: O.REDSTONE }, O.BRUJULA);

// ---- Comida ----
conForma(['TTT'], { T: O.TRIGO }, O.PAN);
conForma(['HHH', 'TTT'], { H: O.HUEVO, T: O.TRIGO }, O.PASTEL); // un queque sencillo
sinForma([O.CUENCO, O.ZANAHORIA, O.PAPA_ASADA], O.ESTOFADO);
sinForma([O.HUESO], O.HARINA_HUESO, 3);

// ---- Bloques de almacenaje (ida y vuelta) ----
for (const [bloque, unidad] of [[B.BLOQUE_HIERRO, O.LINGOTE_HIERRO], [B.BLOQUE_CARBON, O.CARBON], [B.BLOQUE_REDSTONE, O.REDSTONE], [B.BLOQUE_LAPIS, O.LAPIS]]) {
    conForma(['MMM', 'MMM', 'MMM'], { M: unidad }, bloque);
    sinForma([bloque], unidad, 9);
}
conForma(['TTT', 'TTT', 'TTT'], { T: O.TRIGO }, B.HENO);
sinForma([B.HENO], O.TRIGO, 9);

// ---------------------------------------------------------
// Búsqueda: rejilla = arreglo de ids (0 vacío) de ancho `ancho` (2 o 3)
// ---------------------------------------------------------
const encaja = (pedido, id) => Array.isArray(pedido) ? pedido.includes(id) : pedido === id;

// Recorta filas y columnas vacías: devuelve { filas: [[id...]], w, h }
function recortar(rejilla, ancho) {
    const alto = rejilla.length / ancho;
    let x0 = ancho, x1 = -1, y0 = alto, y1 = -1;
    for (let y = 0; y < alto; y++) for (let x = 0; x < ancho; x++) {
        if (rejilla[y * ancho + x]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    }
    if (x1 < 0) return null;
    const filas = [];
    for (let y = y0; y <= y1; y++) filas.push(rejilla.slice(y * ancho + x0, y * ancho + x1 + 1));
    return { filas, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

function coincideForma(r, rec, espejo) {
    const f = rec.forma, h = f.length, w = Math.max(...f.map(s => s.length));
    if (h !== r.h || w !== r.w) return false;
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const ch = (f[y][espejo ? w - 1 - x : x] || ' ');
            const id = r.filas[y][x];
            if (ch === ' ') { if (id) return false; continue; }
            if (!id || !encaja(rec.clave[ch], id)) return false;
        }
    }
    return true;
}

function coincideSinForma(rejilla, rec) {
    const ids = rejilla.filter(Boolean);
    if (ids.length !== rec.sin.length) return false;
    const resto = rec.sin.slice();
    for (const id of ids) {
        const i = resto.findIndex(p => encaja(p, id));
        if (i < 0) return false;
        resto.splice(i, 1);
    }
    return true;
}

// Devuelve la receta que corresponde a la rejilla (o null)
export function buscarReceta(rejilla, ancho) {
    const r = recortar(rejilla, ancho);
    if (!r) return null;
    for (const rec of RECETAS) {
        if (rec.forma) {
            if (Math.max(...rec.forma.map(s => s.length)) > ancho || rec.forma.length > ancho) continue;
            if (coincideForma(r, rec, false) || coincideForma(r, rec, true)) return rec;
        } else if (coincideSinForma(rejilla, rec)) return rec;
    }
    return null;
}

// Ingredientes que pide una receta: lista de { pedido (id o grupo), n }
export function ingredientes(rec) {
    const cuenta = new Map();
    const sumar = p => { const k = Array.isArray(p) ? p.join('|') : String(p); const e = cuenta.get(k) || { pedido: p, n: 0 }; e.n++; cuenta.set(k, e); };
    if (rec.forma) { for (const fila of rec.forma) for (const ch of fila) if (ch !== ' ') sumar(rec.clave[ch]); }
    else rec.sin.forEach(sumar);
    return [...cuenta.values()];
}

// Ancho mínimo de rejilla que necesita una receta (2 o 3)
export function anchoDe(rec) {
    if (rec.sin) return rec.sin.length > 4 ? 3 : 2;
    return Math.max(rec.forma.length, ...rec.forma.map(s => s.length)) > 2 ? 3 : 2;
}

// ---------------------------------------------------------
// Horno: entrada -> resultado
// ---------------------------------------------------------
export const FUNDICION = new Map([
    [B.MENA_HIERRO, O.LINGOTE_HIERRO], [B.MENA_ORO, O.LINGOTE_ORO], [B.MENA_CARBON, O.CARBON],
    [B.MENA_DIAMANTE, O.DIAMANTE], [B.MENA_REDSTONE, O.REDSTONE], [B.MENA_LAPIS, O.LAPIS], [B.MENA_ESMERALDA, O.ESMERALDA],
    [B.ARENA, B.VIDRIO], [B.ADOQUIN, B.PIEDRA], [B.ARCILLA, B.LADRILLO], [B.GRIS, B.PIEDRA_AGRIETADA],
    [B.TRONCO, O.CARBON_VEGETAL], [B.TRONCO_ABEDUL, O.CARBON_VEGETAL], [B.TRONCO_PINO, O.CARBON_VEGETAL],
    [O.VACUNO, O.FILETE], [O.CERDO, O.CHULETA], [O.POLLO, O.POLLO_ASADO], [O.CORDERO, O.CORDERO_ASADO],
    [O.BACALAO, O.BACALAO_COCIDO], [O.SALMON, O.SALMON_COCIDO], [O.PAPA, O.PAPA_ASADA]
]);
