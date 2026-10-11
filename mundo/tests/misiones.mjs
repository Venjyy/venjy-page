// Prueba de los kits de misión (7d): node mundo/tests/misiones.mjs
// Cada misión de amigo trae un kit que se entrega una sola vez; las herramientas llevan la marca del amigo
// (media durabilidad, no cuentan para entregar ni vender) y el valor del kit es ≤ 1/3 del premio.
import { B } from '../texturas.js';
import { O, info } from '../supervivencia/objetos.js';
import { RECETAS, FUNDICION, ingredientes } from '../supervivencia/recetas.js';
import { TIENDAS } from '../supervivencia/tienda-datos.js';
import { MISIONES, KITS, NOMBRES_AMIGO, repartirKit } from '../supervivencia/misiones-datos.js';
import { Inventario, nombrePila } from '../supervivencia/inventario.js';

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

const ids = (x) => [].concat(x);
const pideIds = new Set(), tiendaIds = new Set();
for (const m of MISIONES) if (m.tipo === 'entregar') for (const [p] of m.pide) for (const id of ids(p)) pideIds.add(id);
for (const def of Object.values(TIENDAS)) for (const v of def.compra || []) tiendaIds.add(v.da[0]);

// 1 · cada misión tiene kit; todos los ids existen
ok(MISIONES.length === 36, 'deben ser 36 misiones');
for (const m of MISIONES) {
    ok(Array.isArray(m.kit) && m.kit.length > 0, `${m.id}: sin kit`);
    for (const [id, n, amigo] of m.kit || []) {
        ok(info(id) && n > 0 && Number.isInteger(n), `${m.id}: objeto o cantidad inválida`);
        if (amigo) ok(NOMBRES_AMIGO[amigo] && info(id).durabilidad && n === 1, `${m.id}: préstamo mal formado`);
        if (amigo) ok(m.id.startsWith(amigo), `${m.id}: el préstamo debe llevar la marca de su amigo`);
    }
}
ok(Object.keys(KITS).every(k => MISIONES.some(m => m.id === k)), 'KITS con una misión que no existe');

// 2 · provisiones: nada que pida otra misión ni compre una tienda (salvo semillas, zanahoria y papa para plantar)
const PLANTAR = new Set([O.SEMILLAS, O.ZANAHORIA, O.PAPA]);
for (const m of MISIONES) for (const [id, , amigo] of m.kit) {
    if (amigo) continue;
    ok(PLANTAR.has(id) || !pideIds.has(id), `${m.id}: la provisión ${info(id).es || id} la pide otra misión`);
    ok(!tiendaIds.has(id), `${m.id}: la provisión la compra una tienda`);
}
// lo prestado nunca cuenta: ninguna tienda compra herramientas; las misiones que piden una herramienta
// se prueban abajo con el inventario

// 3 · valor del kit ≤ 1/3 del premio (las prestadas valen un cuarto: media durabilidad y no se pueden vender)
for (const m of MISIONES) {
    const kit = m.kit.reduce((s, [id, n, amigo]) => s + valor(id) * n * (amigo ? 0.25 : 1), 0);
    const premio = suma(m.premio);
    ok(isFinite(kit) && isFinite(premio), `${m.id}: sin valor calculable`);
    ok(kit <= premio / 3 + 1e-9, `${m.id}: kit ${kit.toFixed(1)} > 1/3 del premio ${(premio / 3).toFixed(1)}`);
}

// 4 · se entrega una sola vez (aceptar, abandonar, aceptar) y se guarda/carga
const inv = new Inventario(), kits = new Set();
const pony1 = MISIONES.find(m => m.id === 'pony1');
ok(repartirKit(pony1, kits, inv).length === 0, 'el primer kit cabe');
const cana = inv.casillas.find(p => p && p.id === O.CANA);
ok(cana && cana.p === 'pony' && cana.d === Math.floor(info(O.CANA).durabilidad / 2), 'la caña es de Pony y viene a media durabilidad');
ok(nombrePila(cana, 'es') === 'Caña de pescar (de Pony)' && nombrePila(cana, 'en') === 'Fishing Rod (from Pony)', 'nombre con la marca ES/EN');
ok(repartirKit(pony1, kits, inv) === null, 'segunda vez: no repite');
ok(inv.casillas.filter(p => p && p.id === O.CANA).length === 1, 'una sola caña');
const kits2 = new Set([...kits]), inv2 = new Inventario();
inv2.cargar(JSON.parse(JSON.stringify(inv.serializar())));
ok(repartirKit(pony1, kits2, inv2) === null, 'tras guardar y cargar no repite');
ok(inv2.casillas.find(p => p && p.id === O.CANA).p === 'pony', 'la marca sobrevive guardar/cargar');

// 5 · inventario lleno: el kit queda completo en "sobran"
const lleno = new Inventario();
for (let i = 0; i < 36; i++) lleno.casillas[i] = { id: B.PIEDRA, n: 64, d: 0 };
const pony2 = MISIONES.find(m => m.id === 'pony2'), hadad2 = MISIONES.find(m => m.id === 'hadad2');
const sob = repartirKit(hadad2, new Set(), lleno);
ok(sob.length === 2 && sob[0][3] === 'hadad' && sob[0][2] > 0 && sob[1][1] === 3, 'lleno: espada y papas quedan en el suelo con marca y desgaste');
ok(repartirKit(pony2, new Set(), lleno)[0][1] === 3, 'lleno: las 3 galletas sobran');

// 6 · lo prestado no cuenta (pide, tienda, recetas) y no se junta con lo propio
const inv3 = new Inventario();
inv3.agregar(O.ESCUDO, 1, 10, 'andy');
ok(inv3.contar(O.ESCUDO) === 0, 'el escudo prestado no cuenta (nacho3 pide un escudo)');
ok(!inv3.quitar(O.ESCUDO, 1), 'no se puede entregar el escudo prestado');
inv3.agregar(O.ESCUDO, 1, 0);
ok(inv3.contar(O.ESCUDO) === 1 && inv3.quitar(O.ESCUDO, 1) && inv3.casillas.some(p => p && p.p === 'andy'), 'entrega el propio y conserva el prestado');
inv3.agregar(O.TIJERAS, 1, 5, 'lona'); inv3.agregar(O.TIJERAS, 1, 0);
ok(inv3.casillas.filter(p => p && p.id === O.TIJERAS).length === 2, 'tijeras prestadas y propias en casillas distintas');

// 7 · marca viaja con la pila partida/clic
import('../supervivencia/inventario.js').then(({ clicCasilla, pila }) => {
    const [c, cur] = clicCasilla(pila(O.CANA, 1, 3, 'pony'), null, 0);
    ok(c === null && cur.p === 'pony', 'tomar con el cursor conserva la marca');
    console.log(`${MISIONES.length} kits · ${fallos ? fallos + ' fallas' : 'misiones OK'}`);
    process.exit(fallos ? 1 : 0);
});
