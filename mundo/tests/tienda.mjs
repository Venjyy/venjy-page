// Prueba de la tienda: node mundo/tests/tienda.mjs
// Valida ids, cantidades, misiones y diálogos únicos, y calibra los precios contra las recetas:
// el valor de lo que da una oferta nunca puede superar al de lo que pide (la tienda no gana al crafteo),
// ni lo que paga un amigo puede superar al valor de lo que recibe (no hay ciclos de ganancia).
import { B } from '../texturas.js';
import { O, nombreDe } from '../supervivencia/objetos.js';
import { RECETAS, FUNDICION, ingredientes } from '../supervivencia/recetas.js';
import { TIENDAS } from '../supervivencia/tienda-datos.js';
import { MISIONES, NOMBRES_AMIGO } from '../supervivencia/misiones-datos.js';
import { REQ_MINIJUEGOS } from '../supervivencia/minijuegos-datos.js';

let fallos = 0;
const ok = (cond, msg) => { if (!cond) { fallos++; console.log('FALLA:', msg); } };

// Valor de lo que se obtiene «a mano» (unidad = un tronco). La esmeralda es escasa: vale 10.
const VAL_ESMERALDA = 10;
const BASE = new Map([
    [B.TRONCO, 1], [B.TRONCO_ABEDUL, 1], [B.TRONCO_PINO, 1], [B.ADOQUIN, 1], [B.ARENA, 0.5], [B.NIEVE, 0.5], [B.PIEDRA, 1], [B.TIERRA, 0.25],
    [O.CARBON, 2], [O.LINGOTE_HIERRO, 4], [O.LINGOTE_ORO, 8], [O.DIAMANTE, 24], [O.ESMERALDA, VAL_ESMERALDA], [O.REDSTONE, 2], [O.LAPIS, 3],
    [O.PEDERNAL, 1], [O.HILO, 2], [O.PLUMA, 1], [O.CUERO, 3], [O.HUESO, 1], [O.POLVORA, 2], [O.TRIGO, 1], [O.SEMILLAS, 0.5], [O.HUEVO, 2],
    [O.ZANAHORIA, 1], [O.PAPA, 1], [O.MANZANA, 2], [O.VACUNO, 3], [O.CERDO, 3], [O.POLLO, 2], [O.CORDERO, 3], [O.BACALAO, 2], [O.SALMON, 3],
    [O.PEZ_GLOBO, 8], [B.LANA, 2], [B.LANA_ROJA, 2], [B.PIEDRA_LUMINOSA, 4], [O.LIBRO, 5], [O.GALLETA, 2], [O.PAPEL, 1.5], [B.ARCILLA, 1], [B.HENO, 9]
]);
const memo = new Map(), enCurso = new Set();
function valor(id) {
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
const suma = lista => lista.reduce((s, [id, n]) => s + valor(id) * n, 0);

const ids = new Set(MISIONES.map(m => m.id));
const frases = new Map();
const unica = (clave, tipo, o) => {
    ok(o && o.es && o.en, `${clave}.${tipo}: falta ES/EN`);
    for (const l of ['es', 'en']) {
        const k = o[l];
        ok(!frases.has(l + k), `${clave}.${tipo}: diálogo repetido con ${frases.get(l + k)}`);
        frases.set(l + k, `${clave}.${tipo}`);
    }
};

let ofertas = 0;
for (const [clave, def] of Object.entries(TIENDAS)) {
    ok(NOMBRES_AMIGO[clave], `${clave}: amigo desconocido`);
    ok(def.ofertas.length >= 3, `${clave}: pocas ofertas`);
    for (const tipo of ['saludo', 'compraOk', 'ventaOk', 'noAlcanza']) unica(clave, tipo, def[tipo]);
    for (const o of def.ofertas) {
        ofertas++;
        const e = `${clave} ${o.da.map(([id]) => nombreDe(id))}`;
        for (const [id, n] of [...o.da, ...o.pide]) { ok(id && nombreDe(id) !== '?', `${e}: id inválido`); ok(Number.isInteger(n) && n > 0, `${e}: cantidad inválida`); }
        if (o.req) ok((ids.has(o.req) && o.req.startsWith(clave)) || (REQ_MINIJUEGOS[o.req] && o.req === `mj-${clave}`), `${e}: req «${o.req}» no es misión ni minijuego de ${clave}`);
        const da = suma(o.da), pide = suma(o.pide);
        ok(isFinite(da) && isFinite(pide), `${e}: sin valor calculable`);
        ok(pide >= da, `${e}: la tienda regala (da ${da.toFixed(1)} > pide ${pide.toFixed(1)})`);
        ok(!o.da.some(([id]) => o.pide.some(([p]) => p === id)), `${e}: da y pide lo mismo`);
    }
    for (const v of def.compra || []) {
        const [id, n] = v.da;
        ok(nombreDe(id) !== '?' && n > 0 && v.esm > 0, `${clave}: compra inválida`);
        ok(v.esm * VAL_ESMERALDA <= n * valor(id), `${clave}: paga de más por ${nombreDe(id)} (${v.esm * VAL_ESMERALDA} > ${(n * valor(id)).toFixed(1)})`);
    }
}
ok(Object.keys(TIENDAS).length === 13, 'deben ser 13 tiendas');
console.log(`${Object.keys(TIENDAS).length} tiendas · ${ofertas} ofertas · ${fallos ? fallos + ' fallas' : 'tienda OK'}`);
process.exit(fallos ? 1 : 0);
