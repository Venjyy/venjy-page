// =========================================================
// VENJY · Supervivencia · Valor de los objetos para calibrar la tienda (puro)
// Lo usan mundo/tests/tienda.mjs y la pestaña Tienda del Estudio: la tienda no puede ganarle al crafteo.
// =========================================================
import { B } from '../texturas.js';
import { O } from './objetos.js';
import { RECETAS, FUNDICION, ingredientes } from './recetas.js';

// Valor de lo que se obtiene «a mano» (unidad = un tronco). La esmeralda es escasa: vale 10.
export const VAL_ESMERALDA = 10;
const BASE = new Map([
    [B.TRONCO, 1], [B.TRONCO_ABEDUL, 1], [B.TRONCO_PINO, 1], [B.ADOQUIN, 1], [B.ARENA, 0.5], [B.NIEVE, 0.5], [B.PIEDRA, 1], [B.TIERRA, 0.25],
    [O.CARBON, 2], [O.LINGOTE_HIERRO, 4], [O.LINGOTE_ORO, 8], [O.DIAMANTE, 24], [O.ESMERALDA, VAL_ESMERALDA], [O.REDSTONE, 2], [O.LAPIS, 3],
    [O.PEDERNAL, 1], [O.HILO, 2], [O.PLUMA, 1], [O.CUERO, 3], [O.HUESO, 1], [O.POLVORA, 2], [O.TRIGO, 1], [O.SEMILLAS, 0.5], [O.HUEVO, 2],
    [O.ZANAHORIA, 1], [O.PAPA, 1], [O.MANZANA, 2], [O.VACUNO, 3], [O.CERDO, 3], [O.POLLO, 2], [O.CORDERO, 3], [O.BACALAO, 2], [O.SALMON, 3],
    [O.PEZ_GLOBO, 8], [B.LANA, 2], [B.LANA_ROJA, 2], [B.PIEDRA_LUMINOSA, 4], [O.LIBRO, 5], [O.GALLETA, 2], [O.PAPEL, 1.5], [B.ARCILLA, 1], [B.HENO, 9]
]);
const memo = new Map(), enCurso = new Set();
export function valor(id) {
    if (memo.has(id)) return memo.get(id);
    if (enCurso.has(id)) return Infinity;
    enCurso.add(id);
    let v = BASE.has(id) ? BASE.get(id) : Infinity;
    for (const r of RECETAS) {
        if (r.da[0] !== id) continue;
        let c = 0;
        for (const g of ingredientes(r)) c += g.n * Math.min(...[].concat(g.pedido).map(valor));
        v = Math.min(v, c / r.da[1]);
    }
    for (const [entrada, salida] of FUNDICION) if (salida === id) v = Math.min(v, valor(entrada) + 0.5);
    enCurso.delete(id);
    memo.set(id, v);
    return v;
}
export const suma = lista => lista.reduce((s, [id, n]) => s + valor(id) * n, 0);
