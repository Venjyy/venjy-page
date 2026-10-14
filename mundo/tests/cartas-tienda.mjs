// =========================================================
// Prueba de la tienda de cartas del Duelo (etapa A, punto 3, PR 2; sin navegador)
// Ejecutar: node mundo/tests/cartas-tienda.mjs
//
// Cubre supervivencia/cartas-tienda.js:
//   1. reglas, precios y pesos: valores del código, del JSON y fuera de rango
//   2. sobre: cuántas trae, las nuevas primero, hechizos mínimos, pesos 0 nunca salen, sin colección llena
//   3. comprar: cobra esmeraldas, suma a la colección (inventario.cartas), no alcanza, tope de copias, cerrada
//   4. la tienda: Lucho vende cartas y el JSON trae precio y peso de cada carta jugable
// Sale con código 0 si todo coincide, 1 si no.
// =========================================================
import { pathToFileURL, fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { readFileSync } from 'fs';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '../../');
const importar = r => import(pathToFileURL(resolve(raiz, r)).href);
const T = await importar('mundo/supervivencia/cartas-tienda.js');
const K = await importar('mundo/supervivencia/cartas-coleccion.js');
const D = await importar('mundo/supervivencia/cartas-datos.js');
const { Inventario } = await importar('mundo/supervivencia/inventario.js');
const { O } = await importar('mundo/supervivencia/objetos.js');
const { TIENDAS } = await importar('mundo/supervivencia/tienda-datos.js');
const JSON_MESA = JSON.parse(readFileSync(resolve(raiz, 'mundo/datos/cartas-mesa.json'), 'utf8'));

let fallos = 0;
const ok = (c, msg) => { if (!c) { fallos++; console.log('FALLA:', msg); } };
// Azar determinista para las pruebas
const azar = (s = 7) => () => ((s = (s * 16807) % 2147483647) / 2147483647);
const conEsmeraldas = n => { const inv = new Inventario(); if (n) inv.agregar(O.ESMERALDA, n); return inv; };
const esHechizo = id => D.CARTAS[id].tipo === 'hechizo';

// ---- 1. Reglas, precios y pesos ----
{
    const R = T.reglasTienda(null);
    ok(R.activa === 1 && R.sobrePrecio === 3 && R.sobreCartas === 3 && R.sobreNuevas === 1, 'reglas del código');
    const J = T.reglasTienda(JSON_MESA);
    for (const k of Object.keys(T.TIENDA_CARTAS)) ok(J[k] === JSON_MESA.tiendaCartas[k], `JSON: tiendaCartas.${k} se lee`);
    const raro = T.reglasTienda({ tiendaCartas: { sobrePrecio: 0, sobreCartas: 99, sobreNuevas: 50, sobreHechizos: 'x' } });
    ok(raro.sobrePrecio === 1 && raro.sobreCartas === 10 && raro.sobreNuevas === 10 && raro.sobreHechizos === 0, 'valores fuera de rango se acotan');
    ok(K.jugables().every(id => T.precioBase(id) >= 1 && T.precioBase(id) <= 3), 'precio base de 1 a 3 esmeraldas');
    ok(T.precioCarta('boris', { preciosCartas: { boris: 5 } }) === 5 && T.precioCarta('boris', null) === T.precioBase('boris'), 'precio del JSON o el base');
    ok(T.precioCarta('slimecito', null) === 0 || !D.CARTAS.slimecito, 'las fichas no se venden');
    ok(T.pesoSobre('rayo', null) === 1 && T.pesoSobre('rayo', { pesosSobre: { rayo: 0 } }) === 0, 'peso 1 por defecto, 0 del JSON');
    const cat = T.catalogo(null, { preciosCartas: { boris: 0 } });
    ok(!cat.some(o => o.id === 'boris') && cat.length === K.jugables().length - 1, 'precio 0 = no se vende suelta');
}

// ---- 2. Sobre ----
{
    const col = K.coleccionInicial(null), R = K.reglasDe(null);
    for (let s = 1; s <= 40; s++) {
        const sobre = T.sacarSobre(col, null, azar(s));
        ok(sobre.length === 3, `sobre ${s}: 3 cartas`);
        ok(!(col[sobre[0]] > 0), `sobre ${s}: la primera es una que no tienes`);
        ok(sobre.every(id => K.jugables().includes(id)), `sobre ${s}: solo cartas jugables`);
    }
    const conH = T.sacarSobre(col, { tiendaCartas: { sobreCartas: 5, sobreHechizos: 2, sobreNuevas: 0 } }, azar(3));
    ok(conH.length === 5 && conH.filter(esHechizo).length >= 2, 'hechizos mínimos por sobre');
    const pesos = Object.fromEntries(K.jugables().map(id => [id, id === 'rayo' ? 1 : 0]));
    const solo = T.sacarSobre({}, { pesosSobre: pesos, tiendaCartas: { sobreCartas: 4 } }, azar(9));
    ok(solo.length === 4 && solo.every(id => id === 'rayo'), 'peso 0 nunca sale (con una sola carta posible se repite)');
    const llena = Object.fromEntries(K.jugables().map(id => [id, R.copias]));
    ok(T.sacarSobre(llena, null, azar(2)).length === 3, 'con la colección llena igual trae cartas');
    const casi = { ...llena }; delete casi.boris;
    ok(T.sacarSobre(casi, { tiendaCartas: { sobreNuevas: 1 } }, azar(4))[0] === 'boris', 'la nueva es la única que falta');
    const a = T.sacarSobre(col, null, azar(11)).join(), b = T.sacarSobre(col, null, azar(11)).join();
    ok(a === b, 'mismo azar, mismo sobre');
}

// ---- 3. Comprar ----
{
    const inv = conEsmeraldas(10);
    const antes = K.totalColeccion(K.coleccionDe(inv, null));
    const r = T.comprarSobre(inv, null, O.ESMERALDA, 3, azar(5));
    ok(r.ok && r.cartas.length === 3 && inv.contar(O.ESMERALDA) === 7, 'sobre: cobra 3 y trae 3');
    ok(inv.cartas && K.totalColeccion(inv.cartas.c) === antes + 3, 'sobre: las 3 van a la colección');
    const pobre = conEsmeraldas(2);
    const r2 = T.comprarSobre(pobre, null, O.ESMERALDA, 3, azar(5));
    ok(!r2.ok && r2.motivo === 'plata' && pobre.contar(O.ESMERALDA) === 2 && !pobre.cartas, 'sobre: no alcanza, no cobra ni toca la colección');
    const inv2 = conEsmeraldas(10);
    const s = T.comprarSuelta(inv2, null, 'lucho', O.ESMERALDA, 2);
    ok(s.ok && inv2.contar(O.ESMERALDA) === 8 && inv2.cartas.c.lucho === 1, 'suelta: cobra y suma la carta');
    T.comprarSuelta(inv2, null, 'lucho', O.ESMERALDA, 2);
    const tope = T.comprarSuelta(inv2, null, 'lucho', O.ESMERALDA, 2);
    ok(!tope.ok && tope.motivo === 'tope' && inv2.cartas.c.lucho === 2 && inv2.contar(O.ESMERALDA) === 6, 'suelta: no pasa de las copias de un mazo');
    ok(T.comprarSuelta(inv2, { tiendaCartas: { sueltaTope: 0 } }, 'lucho', O.ESMERALDA, 2).ok, 'suelta: sin tope sí se vende');
    ok(T.comprarSuelta(inv2, null, 'nada', O.ESMERALDA, 1).motivo === 'carta', 'suelta: una carta que no existe no se vende');
    const cerrada = { tiendaCartas: { activa: 0 } };
    ok(T.comprarSobre(inv2, cerrada, O.ESMERALDA, 3).motivo === 'cerrada' && T.comprarSuelta(inv2, cerrada, 'rayo', O.ESMERALDA, 1).motivo === 'cerrada', 'tienda cerrada');
    // El guardado lleva la colección comprada
    const otro = new Inventario(); otro.cargar(JSON.parse(JSON.stringify(inv2.serializar())));
    ok(otro.cartas && otro.cartas.c.lucho === 3, 'guardado: la colección comprada se guarda');
}

// ---- 4. La tienda y el JSON ----
{
    ok(TIENDAS.lucho && TIENDAS.lucho.cartas === true, 'Lucho vende cartas');
    ok(Object.values(TIENDAS).filter(t => t.cartas).length === 1, 'solo un amigo vende cartas');
    ok(K.jugables().every(id => Number.isFinite(JSON_MESA.preciosCartas[id]) && Number.isFinite(JSON_MESA.pesosSobre[id])), 'el JSON trae precio y peso de cada carta jugable');
}

console.log(fallos ? `${fallos} fallo(s)` : 'cartas-tienda: todo bien');
process.exit(fallos ? 1 : 0);
