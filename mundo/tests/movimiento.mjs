// Prueba del movimiento del jugador (bloque 7a, puntos 9 y 14): node mundo/tests/movimiento.mjs
// 9: salir del agua contra una orilla (a ras sí; de 2 bloques no; lava con menos impulso).
// 14: velocidades medias caminando, corriendo y saltando corriendo con los valores de la supervivencia
// (se leen de supervivencia/main.js para que la prueba no se desincronice), bono en B.CAMINO y que el
// creativo (valores por defecto de Jugador) no cambie.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
globalThis.window ??= { addEventListener() {} };
globalThis.document ??= { addEventListener() {}, pointerLockElement: null };
const { Jugador } = await import('../jugador.js');
const { B } = await import('../texturas.js');

let fallos = 0, pruebas = 0;
const ok = (cond, msg) => { pruebas++; if (!cond) { fallos++; console.log('FALLA:', msg); } };
const cerca = (a, b, tol, msg) => ok(Math.abs(a - b) <= tol, `${msg}: ${a.toFixed(2)} (esperado ${b} ± ${tol})`);

// Mundo falso: la función `f(x, y, z)` devuelve el id del bloque (ya con coordenadas enteras)
const mundoDe = f => ({ chunks: { has: () => true }, bloque: (x, y, z) => f(Math.floor(x), Math.floor(y), Math.floor(z)) });
const camara = { position: { set() {} }, rotation: { set() {} } };
const crear = (mundo, x, y, z) => {
    const j = new Jugador(camara, mundo, {}, { x: 2000, z: 2000 });
    j.sinVuelo = true;
    j.colocar(x, y, z);
    return j;
};
const simular = (j, seg, cadaCuadro) => { for (let i = 0; i < seg * 60; i++) { j.actualizar(1 / 60); cadaCuadro && cadaCuadro(i); } };

// Valores de la supervivencia leídos de main.js
const main = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../supervivencia/main.js'), 'utf8');
const leer = nombre => {
    const m = main.match(new RegExp('jugador\\.' + nombre + '\\s*=\\s*([0-9.]+)'));
    if (!m) throw new Error('main.js no fija jugador.' + nombre);
    return parseFloat(m[1]);
};
const SUR = { vCaminar: leer('vCaminar'), vCorrer: leer('vCorrer'), bonoCamino: leer('bonoCamino'), impulsoSalto: leer('impulsoSalto'), topeSalto: leer('topeSalto') };
const supervivencia = j => Object.assign(j, SUR);

// ---------------------------------------------------------
// 9 · Salir del agua
// ---------------------------------------------------------
// Suelo con la cara superior en y = `tope`; piscina en x ∈ [10, 19] con fondo en y = 5 y agua hasta y = 9 (superficie en 10)
function piscina(tope, liquido = B.AGUA) {
    return mundoDe((x, y, z) => {
        if (x >= 10 && x <= 19 && z >= 0 && z <= 9) return y <= 5 ? B.PIEDRA : y <= 9 ? liquido : B.AIRE;
        return y < tope ? B.PIEDRA : B.AIRE;
    });
}
function nadarHaciaOrilla(tope, liquido) {
    const j = supervivencia(crear(piscina(tope, liquido), 12.5, 6, 5));
    j.yaw = Math.PI / 2; // adelante = -x, hacia la orilla en x = 10
    j.teclas.add('KeyW'); j.teclas.add('Space');
    simular(j, 4);
    return j;
}
{
    const j = nadarHaciaOrilla(10, B.AGUA);
    ok(j.pos.x < 10, `orilla a ras: sale del agua (x = ${j.pos.x.toFixed(2)})`);
    ok(j.pos.y >= 10 - 0.01, `orilla a ras: queda sobre la orilla (y = ${j.pos.y.toFixed(2)})`);
}
// Orilla de 1 bloque sobre la superficie: con el impulso 7 del plan los pies llegan a +0,27 sobre la orilla solo
// si está a ras; una de +1 pide ≈ 10 m/s (decisión del dueño si hace falta; ver PENDIENTES 7a).
{
    const j = nadarHaciaOrilla(12, B.AGUA);
    ok(j.pos.x >= 10, `pared de 2 bloques sobre el agua: no sale (x = ${j.pos.x.toFixed(2)})`);
    ok(j.pos.y < 12, `pared de 2: no trepa (y = ${j.pos.y.toFixed(2)})`);
}
{
    // Agua abierta: Espacio sigue nadando hacia arriba a 4 m/s, sin impulso extra
    const j = supervivencia(crear(piscina(10), 15.5, 6, 5));
    j.teclas.add('Space');
    let vMax = 0;
    simular(j, 1, () => { vMax = Math.max(vMax, j.vel.y); });
    ok(vMax <= 4.01, `aguas abiertas: sin impulso extra (vel.y máx ${vMax.toFixed(2)})`);
}
{
    // Sin Espacio no hay impulso aunque choque contra la pared
    const j = supervivencia(crear(piscina(11), 12.5, 6, 5));
    j.yaw = Math.PI / 2;
    j.teclas.add('KeyW');
    simular(j, 3);
    ok(j.pos.x >= 10, `sin Espacio no sale (x = ${j.pos.x.toFixed(2)})`);
}
{
    // Lava: impulso menor (5) pero sale de una orilla a ras
    const j = nadarHaciaOrilla(10, B.LAVA);
    ok(j.pos.x < 10, `lava, orilla a ras: sale (x = ${j.pos.x.toFixed(2)})`);
    const k = nadarHaciaOrilla(11, B.LAVA);
    ok(k.pos.x >= 10, `lava, orilla de 1 bloque: no sale (x = ${k.pos.x.toFixed(2)})`);
}

// ---------------------------------------------------------
// 14 · Velocidades
// ---------------------------------------------------------
const llano = (suelo = B.PASTO) => mundoDe((x, y) => y < 10 ? suelo : B.AIRE);
// Velocidad media sobre el plano en `seg` segundos tras 1 s de arranque
function media(j, seg, antes) {
    j.yaw = 0; // adelante = -z
    antes && antes(j);
    simular(j, 1);
    const z0 = j.pos.z, x0 = j.pos.x;
    simular(j, seg);
    return Math.hypot(j.pos.z - z0, j.pos.x - x0) / seg;
}
const nuevo = (suelo) => crear(llano(suelo), 1000, 10, 1000);

cerca(media(nuevo(), 5, j => j.teclas.add('KeyW')), 4.3, 0.15, 'creativo camina como siempre');
cerca(media(nuevo(), 5, j => { j.teclas.add('KeyW'); j.corre = true; }), 5.6, 0.15, 'creativo corre como siempre');
ok(nuevo().bonoCamino === 1, 'creativo: sin bono de camino');

const vCam = media(supervivencia(nuevo()), 5, j => j.teclas.add('KeyW'));
cerca(vCam, 4.6, 0.15, 'supervivencia camina');
ok(SUR.vCaminar === 4.6 && SUR.vCorrer === 7.0 && SUR.topeSalto === 8.6 && SUR.impulsoSalto === 1.8 && SUR.bonoCamino === 1.15, 'valores decididos en main.js (4,6 / 7,0 / 8,6 / 1,8 / ×1,15)');
const vCor = media(supervivencia(nuevo()), 5, j => { j.teclas.add('KeyW'); j.corre = true; });
cerca(vCor, 7.0, 0.2, 'supervivencia corre');
const vSalto = media(supervivencia(nuevo()), 5, j => { j.teclas.add('KeyW'); j.teclas.add('Space'); j.corre = true; });
ok(vSalto > vCor + 0.1, `saltar corriendo es más rápido que correr (${vSalto.toFixed(2)} > ${vCor.toFixed(2)})`);
ok(vSalto <= SUR.topeSalto + 0.1, `saltar corriendo no pasa el tope (${vSalto.toFixed(2)} ≤ ${SUR.topeSalto})`);
// Camino de tierra: +15 %
const vCamino = media(supervivencia(nuevo(B.CAMINO)), 5, j => { j.teclas.add('KeyW'); j.corre = true; });
cerca(vCamino / vCor, 1.15, 0.03, 'camino: +15 %');
const vCaminoPie = media(supervivencia(nuevo(B.CAMINO)), 5, j => j.teclas.add('KeyW'));
cerca(vCaminoPie / vCam, 1.15, 0.03, 'camino caminando: +15 %');
// Cooperativo: a 5 Hz la interpolación aguanta si un tick (0,2 s) mueve ≤ 1,5 bloques
ok(SUR.topeSalto * 0.2 <= 1.8, `un tick de 5 Hz a la velocidad tope mueve ${(SUR.topeSalto * 0.2).toFixed(2)} bloques`);

console.log(fallos ? `\n${fallos} de ${pruebas} pruebas fallaron` : `OK · ${pruebas} pruebas`);
process.exit(fallos ? 1 : 0);
