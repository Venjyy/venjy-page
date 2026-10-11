// =========================================================
// Prueba de la ruleta de gestos (bloque 7c-2, sin navegador)
// Ejecutar: node mundo/tests/ruleta.mjs
//
// Cubre supervivencia/gestos-jugador.js y supervivencia/ruleta.js (con un DOM de mentira):
//   1. RULETA: 8 gestos, claves únicas, ES/EN, y cada uno se resuelve con un gesto que YA existe
//      (molde() de moldes.js: GESTOS, GESTOS_AMISTAD o MOLDES) o es la pose `sentado`
//   2. el cuerpo con cada gesto queda en los rangos de rig.md durante todo el gesto (posar con el gesto)
//   3. sector(): la rueda elige la casilla por dirección (arriba 0, reloj) y no elige en el centro
//   4. ciclo congelar/cancelar con la rueda real: B + mouse + soltar empieza el gesto, congela al jugador
//      y deja la cámara de frente; termina solo, con W, con un clic, con daño, con la pausa y con un panel
//      (sin tocar `congelado` si otro manda); al terminar vuelve la mirada de antes y el cuerpo sale suave
//   4b. comando /gesto (uno por nombre o clave, o todos en cola)
//   5. red: `em` { k } máx. 1 por segundo; cancelar dentro del segundo manda `em` vacío al cumplirse;
//      el otro jugador lo ve, lo suelta al moverse o con `em` vacío
// Sale con código 0 si todo coincide, 1 si no.
// =========================================================
import { pathToFileURL, fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '../../');
const importar = r => import(pathToFileURL(resolve(raiz, r)).href);

// escenas-skin.js (GESTOS, vía moldes.js) trae cuerpo.js, que escucha eventos de `window`
globalThis.window ??= { addEventListener() {} };
// ---- DOM de mentira (solo lo que usa ruleta.js) ----
const oyentes = {};
function nodo() {
    const n = { hidden: false, textContent: '', className: '', hijos: [], style: { setProperty() {} }, clases: new Set(), oyentes: {} };
    n.classList = { toggle: (c, v) => (v ? n.clases.add(c) : n.clases.delete(c)) };
    n.appendChild = h => n.hijos.push(h);
    n.addEventListener = (t, f) => { (n.oyentes[t] ||= []).push(f); };
    return n;
}
globalThis.document = {
    createElement: nodo,
    body: nodo(),
    addEventListener: (t, f) => { (oyentes[t] ||= []).push(f); }
};
const disparar = (t, e = {}) => { for (const f of oyentes[t] || []) f({ preventDefault() {}, repeat: false, ...e }); };

const G = await importar('mundo/supervivencia/gestos-jugador.js');
const P = await importar('mundo/supervivencia/pose-jugador.js');
const { crearRuleta } = await importar('mundo/supervivencia/ruleta.js');
const molde = await G.cargarMoldes();

let fallos = 0, pruebas = 0;
const ok = (cond, msg) => { pruebas++; if (!cond) { fallos++; console.error('FALLO: ' + msg); } };
const entre = (v, a, b, msg) => ok(Number.isFinite(v) && v >= a - 1e-9 && v <= b + 1e-9, `${msg}: ${v} fuera de [${a}, ${b}]`);
const cerca = (a, b, msg) => ok(Math.abs(a - b) < 1e-9, `${msg}: esperaba ${b}, salió ${a}`);

// ---- 1. Los 8 gestos existen ----
{
    ok(G.RULETA.length === 8, 'la rueda tiene 8 gestos');
    ok(new Set(G.RULETA.map(g => g.k)).size === 8, 'claves únicas');
    for (const g of G.RULETA) {
        ok(g.es && g.en, `${g.k}: texto ES/EN`);
        ok(g.pose === 'sentado' || typeof molde(g.molde) === 'function', `${g.k}: «${g.molde}» se resuelve con molde() (gesto existente)`);
        ok(g.d === 0 || (g.d >= 1.5 && g.d <= 8), `${g.k}: duración razonable (${g.d})`);
    }
}

// ---- 2. Rangos de rig.md con cada gesto ----
{
    const RANGO = { cx: [-0.5, 0.6], cy: [-1.1, 1.1], cz: [-0.2, 0.2], bDx: [-2.9, 0.9], bIx: [-2.9, 0.9], bDz: [-0.9, 0.9], bIz: [-0.9, 0.9], pDx: [-1.6, 0.6], pIx: [-1.6, 0.6], inc: [-0.2, 0.7], rz: [-0.15, 0.15], y: [-0.7, 0.6], pz: [0, 0.3] };
    for (const def of G.RULETA) {
        const g = G.crearGesto(def.k, molde), e = P.crearEstado();
        let cuadros = 0;
        while (G.avanzarGesto(g, 1 / 30) && cuadros < 400) {
            const ent = { mov: 0, pitch: 0, ...G.entradaGesto(g) };
            P.avanzar(e, ent, 1 / 30);
            const a = P.angulos(e, ent);
            for (const [k, [lo, hi]] of Object.entries(RANGO)) entre(a[k], lo, hi, `${def.k} t=${g.t.toFixed(2)} ${k}`);
            cuadros++;
        }
        if (def.d) ok(Math.abs(cuadros / 30 - def.d) < 0.1, `${def.k}: dura ${def.d} s (${(cuadros / 30).toFixed(2)})`);
        if (def.k === 'saluda') {
            const g2 = G.crearGesto('saluda', molde); g2.t = 1;
            const a = P.angulos(P.crearEstado(), { mov: 0, ...G.entradaGesto(g2) });
            ok(a.bDx < -2.5, 'saludar: el brazo derecho arriba a mitad del gesto');
        }
    }
    // Sentarse: la pose sentado de 7c-1 hasta que se suelta
    const g = G.crearGesto('sentarse'), e = P.crearEstado();
    for (let i = 0; i < 60; i++) { G.avanzarGesto(g, 1 / 30); P.avanzar(e, { mov: 0, ...G.entradaGesto(g) }, 1 / 30); }
    ok(e.sentado > 0.9, 'sentarse: el cuerpo se sienta');
    ok(G.avanzarGesto(g, 30), 'sentarse: sigue a los 30 s (hasta moverse)');
    G.soltarGesto(g);
    ok(G.entradaGesto(g).sentado === false, 'sentarse: al soltar se levanta');
    ok(!G.avanzarGesto(g, 0.5), 'sentarse: al soltar termina tras la salida suave');
}

// ---- 3. Sectores ----
{
    ok(G.sector(0, -80) === 0, 'arriba = casilla 0');
    ok(G.sector(80, 0) === 2, 'derecha = casilla 2');
    ok(G.sector(0, 80) === 4, 'abajo = casilla 4');
    ok(G.sector(-80, 0) === 6, 'izquierda = casilla 6');
    ok(G.sector(60, -60) === 1, 'arriba a la derecha = casilla 1');
    ok(G.sector(5, -5) === -1, 'centro muerto: nada');
}

// ---- 4. Ciclo con la rueda real ----
let reloj = 0;
const realNow = performance.now.bind(performance);
performance.now = () => reloj * 1000;
function mundo() {
    const jugador = { activo: true, sinMirar: false, congelado: false, teclas: new Set(), yaw: 1, pitch: 0.3, enSuelo: true, vuela: false, enAgua: () => false };
    const vida = { vida: 20, muerto: false };
    const camaras = { enCine: false };
    const enviados = [];
    const estado = { otro: false };
    const ruleta = crearRuleta({
        jugador, camaras, vida, hud: { mensaje() {} }, idioma: 'es',
        coop: () => ({ gesto: k => enviados.push({ k, t: reloj }) }),
        puede: () => jugador.activo && !estado.otro, otroManda: () => estado.otro
    });
    const paso = (s = 1 / 30) => { reloj += s; ruleta.actualizar(s); };
    return { jugador, vida, camaras, enviados, estado, ruleta, paso };
}
// Abre con B, mueve el mouse hacia la casilla i y suelta
function elegir(m, i) {
    disparar('keydown', { code: 'KeyB' });
    const a = i * Math.PI * 2 / 8;
    disparar('mousemove', { movementX: Math.sin(a) * 90, movementY: -Math.cos(a) * 90 });
    disparar('keyup', { code: 'KeyB' });
}
{
    // Hay que limpiar los oyentes entre mundos: cada crearRuleta suma los suyos
    const limpiar = () => { for (const k of Object.keys(oyentes)) delete oyentes[k]; };

    // a) Empieza, congela, la cámara de frente; mientras la rueda está abierta no se mira
    limpiar(); reloj = 10;
    let m = mundo();
    disparar('keydown', { code: 'KeyB' });
    ok(m.ruleta.abierta && m.jugador.sinMirar, 'B abre la rueda y el mouse deja de mover la cámara');
    disparar('mousemove', { movementX: 0, movementY: -90 });
    disparar('keyup', { code: 'KeyB' });
    ok(!m.ruleta.abierta && !m.jugador.sinMirar, 'soltar B cierra la rueda y devuelve la mirada');
    ok(m.ruleta.activo && m.jugador.congelado, 'soltar sobre un gesto lo hace y congela al jugador');
    cerca(m.ruleta.congelado().yaw, 1, 'el cuerpo queda mirando a donde miraba');
    cerca(m.jugador.yaw, 1 + Math.PI + 0.5, 'la cámara empieza de frente y en diagonal');
    const e = m.ruleta.entrada();
    ok(e && e.objeto === 0 && e.yawFijo === 1 && e.pitchFijo === 0, 'entradaPose: sin objetos y con el giro congelado');
    m.jugador.yaw += 2; m.jugador.pitch = -0.6; // el jugador orbita
    m.paso();
    cerca(m.ruleta.congelado().yaw, 1, 'orbitar no gira el cuerpo');
    // b) Termina solo (saludar dura 2,4 s)
    for (let i = 0; i < 80 && m.ruleta.activo; i++) m.paso();
    ok(!m.ruleta.activo && !m.jugador.congelado, 'al acabar el gesto el jugador queda libre');
    cerca(m.jugador.yaw, 1, 'al terminar vuelve la mirada de antes (yaw)');
    cerca(m.jugador.pitch, 0.3, 'al terminar vuelve la mirada de antes (pitch)');
    ok(m.enviados.length === 1 && m.enviados[0].k === 'saluda', 'red: un solo `em` al empezar, nada al terminar solo');

    // c) Cancelar con W: libre al tiro y el cuerpo vuelve suave
    for (const [nombre, accion, motivo] of [
        ['W', m => m.jugador.teclas.add('KeyW'), 'mueve'],
        ['clic', () => disparar('mousedown'), 'mueve'],
        ['daño', m => { m.vida.vida -= 2; }, 'dano'],
        ['pausa', m => { m.jugador.activo = false; }, 'ventana'],
        ['cine', m => { m.camaras.enCine = true; }, 'ventana']
    ]) {
        limpiar(); reloj += 5;
        m = mundo();
        elegir(m, 4); // bailar
        ok(m.ruleta.activo, `${nombre}: empezó el baile`);
        m.paso();
        accion(m);
        m.paso();
        ok(!m.ruleta.activo, `${nombre}: cancela`);
        ok(!m.jugador.congelado, `${nombre}: el jugador queda libre (no se traba)`);
        cerca(m.jugador.yaw, 1, `${nombre}: vuelve la mirada de antes`);
        ok(m.ruleta.entrada() && m.ruleta.entrada().gesto, `${nombre}: el cuerpo sale suave del gesto`);
        for (let i = 0; i < 12; i++) m.paso();
        ok(m.ruleta.entrada() === null, `${nombre}: la salida suave termina`);
        if (nombre === 'W') ok(m.jugador.teclas.has('KeyW'), 'W: la tecla sigue apretada y el jugador camina');
    }

    // d) Un panel (otro manda): cancela sin soltar `congelado`, que es de la escena
    limpiar(); reloj += 5;
    m = mundo();
    elegir(m, 0);
    m.paso();
    m.estado.otro = true; m.jugador.congelado = true; // la escena lo congela también
    m.paso();
    ok(!m.ruleta.activo && m.jugador.congelado, 'panel o escena: cancela sin tocar `congelado`');

    // e) En el aire no se puede; la pausa cierra la rueda sin hacer nada
    limpiar(); reloj += 5;
    m = mundo();
    m.jugador.enSuelo = false;
    elegir(m, 0);
    ok(!m.ruleta.activo && !m.jugador.congelado, 'en el aire no hay gesto');
    m.jugador.enSuelo = true;
    disparar('keydown', { code: 'KeyB' });
    m.jugador.activo = false; m.paso();
    ok(!m.ruleta.abierta && !m.jugador.sinMirar, 'la pausa cierra la rueda');
    m.jugador.activo = true;
    disparar('keyup', { code: 'KeyB' });
    ok(!m.ruleta.activo, 'soltar B tras la pausa no hace nada');
    // f) Soltar en el centro no hace nada
    disparar('keydown', { code: 'KeyB' });
    disparar('keyup', { code: 'KeyB' });
    ok(!m.ruleta.activo, 'soltar en el centro no hace nada');

    // g) Red: máx. 1 por segundo; el `em` vacío espera su segundo
    limpiar(); reloj = 100;
    m = mundo();
    elegir(m, 2);
    m.paso();
    m.jugador.teclas.add('KeyW'); m.paso(); m.jugador.teclas.clear(); // cancela a los 0,07 s
    ok(m.enviados.length === 1, 'red: el `em` vacío no sale dentro del mismo segundo');
    elegir(m, 3); // dentro del segundo: no empieza (tope)
    ok(!m.ruleta.activo, 'red: no se empieza otro gesto antes de 1 s');
    for (let i = 0; i < 40; i++) m.paso();
    ok(m.enviados.length === 2 && m.enviados[1].k === '' && m.enviados[1].t - m.enviados[0].t >= 1 - 1e-9, 'red: el `em` vacío sale al cumplirse el segundo');
    elegir(m, 3);
    ok(m.ruleta.activo, 'red: pasado el segundo se puede empezar otro');
    m.paso();
    const ts = m.enviados.map(x => x.t);
    ok(ts.every((t, i) => i === 0 || t - ts[i - 1] >= 1 - 1e-9), 'red: nunca más de un `em` por segundo');
    // Cambiar de gesto con uno en curso: sin `em` vacío de por medio
    reloj += 1.5;
    elegir(m, 0); m.paso();
    ok(m.ruleta.activo && m.enviados.at(-1).k === 'saluda' && m.enviados.filter(x => x.k === '').length === 1, 'cambiar de gesto: manda el nuevo, sin cancelar de por medio');
}

// ---- 4b. Comando /gesto: cola que arranca al volver al juego; moverse la corta ----
{
    for (const k of Object.keys(oyentes)) delete oyentes[k];
    reloj += 10;
    const m = mundo();
    m.jugador.activo = false; // consola abierta
    m.ruleta.comando('todos');
    for (let i = 0; i < 30; i++) m.paso();
    ok(!m.ruleta.activo, '/gesto: con la consola abierta no empieza');
    m.jugador.activo = true;
    for (let i = 0; i < 30 && !m.ruleta.activo; i++) m.paso();
    ok(m.ruleta.activo && m.enviados.at(-1).k === 'saluda', '/gesto todos: empieza por saludar al volver al juego');
    for (let i = 0; i < 200 && m.enviados.at(-1).k !== 'risa'; i++) m.paso();
    ok(m.enviados.at(-1).k === 'risa', '/gesto todos: sigue con el siguiente al terminar');
    m.jugador.teclas.add('KeyW'); m.paso(); m.jugador.teclas.clear();
    for (let i = 0; i < 120; i++) m.paso();
    ok(!m.ruleta.activo, '/gesto todos: moverse corta la cola');
    m.ruleta.comando('bailar');
    for (let i = 0; i < 40 && !m.ruleta.activo; i++) m.paso();
    ok(m.ruleta.activo && m.enviados.filter(x => x.k).at(-1).k === 'baile', '/gesto bailar: por el nombre en español');
}

// ---- 5. El otro jugador ----
{
    let g = G.recibirEm(null, 'baile');
    ok(g && g.k === 'baile' && g.f, 'remoto: empieza el gesto (moldes ya cargado)');
    g = G.pasoRemoto(g, 0.5, 0);
    ok(g && G.entradaGesto(g).gesto.w > 0.9, 'remoto: quieto, el gesto sigue');
    g = G.pasoRemoto(g, 0.1, 3);
    ok(g && g.sale >= 0, 'remoto: al moverse, sale suave');
    for (let i = 0; i < 10 && g; i++) g = G.pasoRemoto(g, 0.05, 3);
    ok(g === null, 'remoto: y termina');
    g = G.recibirEm(null, 'sentarse');
    g = G.recibirEm(g, '');
    ok(G.entradaGesto(g).sentado === false, 'remoto: `em` vacío lo levanta');
    ok(G.recibirEm(null, 'no-existe') === null, 'remoto: clave desconocida no hace nada');
    // La sala solo entrega los tipos de la lista TIPOS de coop.js: sin `em` ahí, el otro nunca ve el gesto
    const { readFileSync } = await import('node:fs');
    const coop = readFileSync(resolve(raiz, 'mundo/supervivencia/coop.js'), 'utf8');
    const tipos = (coop.match(/const TIPOS = \[([^\]]*)\]/) || [])[1] || '';
    ok(/'em'/.test(tipos), 'coop.js: `em` está en TIPOS (la sala lo escucha)');
    ok(coop.includes('em(m) {'),'coop.js: hay manejador para `em`');
}

performance.now = realNow;
console.log(`ruleta.mjs: ${pruebas - fallos}/${pruebas} bien`);
process.exit(fallos ? 1 : 0);
