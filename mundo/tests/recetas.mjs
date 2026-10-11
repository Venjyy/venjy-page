// Prueba de recetas: node mundo/tests/recetas.mjs
import { B } from '../texturas.js';
import { O, OBJETOS, nombreDe } from '../supervivencia/objetos.js';
import { buscarReceta, FUNDICION, RECETAS, ingredientes } from '../supervivencia/recetas.js';

import { readFileSync } from 'node:fs';
const PINTORES_ICONOS = [...readFileSync(new URL('../supervivencia/iconos.js', import.meta.url), 'utf8').matchAll(/^    (\w+)\(p/gm)].map(m => m[1]);
let fallos = 0;
const ok = (cond, msg) => { if (!cond) { fallos++; console.log('FALLA:', msg); } };
const da = (rej, ancho) => { const r = buscarReceta(rej, ancho); return r ? r.da : null; };
const igual = (a, b) => a && b && a[0] === b[0] && a[1] === b[1];

// Sin forma: cualquier tronco en cualquier casilla
ok(igual(da([0, B.TRONCO_ABEDUL, 0, 0], 2), [B.TABLONES, 4]), 'tronco de abedul → 4 tablones');
ok(igual(da([0, 0, 0, 0, 0, 0, 0, 0, B.TRONCO], 3), [B.TABLONES, 4]), 'tronco en la mesa');
// Con forma, desplazada
const W = B.TABLONES, S = O.PALO, A = B.ADOQUIN, I = O.LINGOTE_HIERRO;
ok(igual(da([0, W, 0, W], 2), [O.PALO, 4]), 'palos en la columna derecha');
ok(igual(da([W, W, W, W], 2), [B.MESA, 1]), 'mesa 2×2');
ok(igual(da([A, A, A, 0, S, 0, 0, S, 0], 3), [O.PICO_PIEDRA, 1]), 'pico de piedra');
// Espejo: hacha hacia el otro lado
ok(igual(da([I, I, 0, I, S, 0, 0, S, 0], 3), [O.HACHA_HIERRO, 1]), 'hacha de hierro');
ok(igual(da([0, I, I, 0, S, I, 0, S, 0], 3), [O.HACHA_HIERRO, 1]), 'hacha de hierro espejada');
// No debe calzar
ok(da([A, A, A, 0, S, 0, 0, 0, 0], 3) === null, 'pico incompleto');
ok(da([A, A, 0, A], 2) === null, 'horno no cabe en 2×2');
ok(igual(da([A, A, A, A, 0, A, A, A, A], 3), [B.HORNO, 1]), 'horno');
ok(igual(da([O.CARBON_VEGETAL, 0, S, 0], 2), [B.ANTORCHA, 4]), 'antorcha con carbón vegetal');
ok(FUNDICION.get(B.MENA_HIERRO) === O.LINGOTE_HIERRO, 'horno: hierro');
// Todas las recetas dan algo con nombre y sus ingredientes existen
for (const r of RECETAS) {
    ok(r.da[0] && nombreDe(r.da[0]) !== '?', 'receta sin resultado válido');
    for (const g of ingredientes(r)) for (const id of [].concat(g.pedido)) ok(id && nombreDe(id) !== '?', 'ingrediente inválido en ' + nombreDe(r.da[0]));
}
// 7f-2: objetos nuevos (ícono pintado, par ES/EN, sin emojis) y recetas que no chocan con otras
const NUEVOS = ['RELOJ', 'MAPA', 'FAROL_MANO', 'CARTEL', 'BOTELLA', 'MAZO', 'PLUMA_JUGUETE', 'GUITARRA', 'TECLADO', 'TAMBOR'];
const ultimo = O.CARTA;
for (const k of NUEVOS) {
    const o = OBJETOS[O[k]];
    ok(O[k] > ultimo && o && o.nombre.es && o.nombre.en && o.icono && PINTORES_ICONOS.includes(o.icono), `objeto nuevo ${k}: id al final, ES/EN e ícono pintado`);
    ok(!/\p{Extended_Pictographic}/u.test(o.nombre.es + o.nombre.en), `${k}: sin emojis`);
    ok(RECETAS.some(r => r.da[0] === O[k]), `${k}: tiene receta`);
}
ok(new Set(NUEVOS.map(k => OBJETOS[O[k]].nombre.es)).size === NUEVOS.length, 'nombres nuevos únicos');
// cada receta se encuentra a sí misma en una rejilla de 3×3 (nada la tapa) y el reloj, el mapa y el mazo calzan
for (const r of RECETAS.filter(r => NUEVOS.some(k => O[k] === r.da[0]))) {
    const g = new Array(9).fill(0);
    if (r.forma) r.forma.forEach((f, y) => [...f].forEach((ch, x) => { if (ch !== ' ') g[y * 3 + x] = [].concat(r.clave[ch])[0]; }));
    else r.sin.forEach((p, i) => { g[i] = [].concat(p)[0]; });
    ok(buscarReceta(g, 3) === r, `receta de ${nombreDe(r.da[0])} choca con otra`);
}
ok(igual(da([0, O.LINGOTE_ORO, 0, O.LINGOTE_ORO, O.REDSTONE, O.LINGOTE_ORO, 0, O.LINGOTE_ORO, 0], 3), [O.RELOJ, 1]), 'reloj');
ok(igual(da([O.PAPEL, O.CARBON_VEGETAL, 0, O.PAPEL, O.PAPEL, 0, 0, 0, 0], 3), [O.MAZO, 1]), 'mazo sin forma con carbón vegetal');

// 7f-2 leche: objetos al final, ícono pintado, par ES/EN, devuelven el recipiente y la vaca da leche una vez cada 2 min
for (const k of ['CUBO_LECHE', 'BOTELLA_LECHE']) {
    const o = OBJETOS[O[k]];
    ok(O[k] > O.TAMBOR && o.nombre.es && o.nombre.en && PINTORES_ICONOS.includes(o.icono) && o.comida && o.efecto === 'leche', `${k}: objeto de leche`);
    ok(!/\p{Extended_Pictographic}/u.test(o.nombre.es + o.nombre.en), `${k}: sin emojis`);
}
ok(OBJETOS[O.CUBO_LECHE].devuelve === 'CUBO' && OBJETOS[O.BOTELLA_LECHE].devuelve === 'BOTELLA' && O[OBJETOS[O.BOTELLA_LECHE].devuelve], 'la leche devuelve su recipiente');
{
    const { pila } = await import('../supervivencia/inventario.js');
    globalThis.document = { createElement: () => ({ getContext: () => ({ fillRect() {}, set fillStyle(v) {} }) }) };
    globalThis.window = globalThis.window || { addEventListener() {} };
    const { crearGanado } = await import('../supervivencia/ganado.js');
    let mano = null; const mochila = []; const soltado = [];
    const inventario = {
        enMano: () => mano, ponerEnMano: p => { mano = p; },
        gastarMano: n => { mano.n -= n; if (mano.n <= 0) mano = null; }, agregar: (id, n) => { mochila.push([id, n]); return 0; }
    };
    const vaca = { tipo: 'vaca', x: 0, y: 0, z: 0, escala: 1, g: { visible: true }, cargado: true };
    const g = crearGanado({ animales: { lista: [vaca], quitar() {}, agregar() {}, asustar() {} }, entidades: { soltar: (...a) => soltado.push(a) }, inventario, jugador: { pos: { x: 0, y: 0, z: 0 } }, dy: 0, scene: { add() {}, remove() {} }, hud: {} });
    mano = pila(O.CUBO, 1);
    ok(g.interactuar(vaca) && mano.id === O.CUBO_LECHE, 'cubo + vaca → cubo de leche');
    mano = pila(O.CUBO, 1);
    ok(!g.interactuar(vaca) && mano.id === O.CUBO, 'vaca recién ordeñada no da más');
    g.actualizar(121);
    ok(g.interactuar(vaca) && mano.id === O.CUBO_LECHE, 'a los 2 minutos vuelve a dar');
    vaca.escala = 0.5; vaca.sv.ordenada = 0; mano = pila(O.BOTELLA, 3);
    ok(!g.interactuar(vaca) && mano.n === 3, 'la cría no se ordeña');
    vaca.escala = 1; vaca.sv.ordenada = 0;
    ok(g.interactuar(vaca) && mano.id === O.BOTELLA && mano.n === 2 && mochila.some(([id]) => id === O.BOTELLA_LECHE), 'botella (pila de 3) + vaca → botella de leche, quedan 2');
    const oveja = { ...vaca, tipo: 'oveja' }; mano = pila(O.CUBO, 1);
    ok(!g.interactuar(oveja), 'solo las vacas dan leche');
}
console.log(`${RECETAS.length} recetas · ${fallos ? fallos + ' fallas' : 'recetas OK'}`);
process.exit(fallos ? 1 : 0);
