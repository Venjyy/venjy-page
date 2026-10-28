// Prueba de la tienda: node mundo/tests/tienda.mjs
// Valida ids, cantidades, misiones y diálogos únicos, y calibra los precios contra las recetas:
// el valor de lo que da una oferta nunca puede superar al de lo que pide (la tienda no gana al crafteo),
// ni lo que paga un amigo puede superar al valor de lo que recibe (no hay ciclos de ganancia).
import { B } from '../texturas.js';
import { O, nombreDe } from '../supervivencia/objetos.js';
import { VAL_ESMERALDA, valor, suma } from '../supervivencia/tienda-valor.js';
import { TIENDAS, fijarTienda } from '../supervivencia/tienda-datos.js';
import { MISIONES, NOMBRES_AMIGO } from '../supervivencia/misiones-datos.js';
import { REQ_MINIJUEGOS } from '../supervivencia/minijuegos-datos.js';

let fallos = 0;
const ok = (cond, msg) => { if (!cond) { fallos++; console.log('FALLA:', msg); } };

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
// mundo/datos/tienda.json: suma al final, ignora lo desconocido y se puede deshacer
{
    const antes = TIENDAS.pony.ofertas.length, cAntes = TIENDAS.pony.compra.length;
    fijarTienda({ tiendas: { pony: { ofertas: [{ da: [['manzana', 2]], pide: [['esmeralda', 1]] }, { da: [['no_existe', 1]], pide: [['esmeralda', 1]], req: 'x' }], compra: [{ da: ['pan', 3], esm: 1 }] }, nadie: { ofertas: [] } } });
    ok(TIENDAS.pony.ofertas.length === antes + 1 && TIENDAS.pony.ofertas[antes].da[0][0] === O.MANZANA, 'fijarTienda: suma la oferta válida al final');
    ok(TIENDAS.pony.compra.length === cAntes + 1 && !TIENDAS.nadie, 'fijarTienda: suma la compra e ignora al amigo sin tienda');
    fijarTienda(null);
    ok(TIENDAS.pony.ofertas.length === antes && TIENDAS.pony.compra.length === cAntes, 'fijarTienda(null) vuelve al código');
    // una persona nueva (personajes.json) tiene su tienda solo con datos; sin ofertas válidas no hay tienda; el texto propio solo vale con ES y EN
    fijarTienda({ tiendas: { rosa: { ofertas: [{ da: [['pan', 2]], pide: [['esmeralda', 1]] }], compra: [{ da: ['pan', 4], esm: 1 }], textos: { saludo: { es: 'Hola', en: 'Hi' }, compraOk: { es: 'solo es' } } }, vacia: { ofertas: [{ da: [['no_existe', 1]], pide: [['esmeralda', 1]] }] } } });
    ok(TIENDAS.rosa && TIENDAS.rosa.ofertas.length === 1 && TIENDAS.rosa.compra.length === 1 && TIENDAS.rosa.saludo.en === 'Hi', 'fijarTienda: crea la tienda de una persona nueva con su saludo');
    ok(TIENDAS.rosa.compraOk.es === 'Trato hecho.' && TIENDAS.rosa.noAlcanza.en && !TIENDAS.vacia, 'fijarTienda: texto a medias usa el de base; sin ofertas válidas no hay tienda');
    fijarTienda(null);
    ok(!TIENDAS.rosa && Object.keys(TIENDAS).length === 13, 'fijarTienda(null) quita las tiendas de personas nuevas');
}
ok(Object.keys(TIENDAS).length === 13, 'deben ser 13 tiendas');
console.log(`${Object.keys(TIENDAS).length} tiendas · ${ofertas} ofertas · ${fallos ? fallos + ' fallas' : 'tienda OK'}`);
process.exit(fallos ? 1 : 0);
