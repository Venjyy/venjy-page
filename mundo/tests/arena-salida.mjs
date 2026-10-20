// =========================================================
// Arena del duelo (L1): la parte de arena.js con un DOM mínimo. La llama mundo/tests/arena.mjs (sección 7).
// Recorre abrir → ventisca → menú → VS → vuelo → rondas → resultado → salir, con teclas simuladas, y revisa que
// salir deje todo como estaba: la clase del body, la capa, el teclado del mundo, la capa táctil y el jugador.
// =========================================================
import { pathToFileURL, fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '../../');
const imp = p => import(pathToFileURL(resolve(raiz, p)).href);

const ctxVacio = new Proxy({}, { get: (_, k) => k === 'createImageData' ? (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) : () => {}, set: () => true });
function nodo(tag = 'div') {
    let texto = '';
    const n = { tagName: tag.toUpperCase(), children: [], style: { setProperty() {} }, hidden: false, disabled: false, className: '', type: '', oyentes: {}, width: 0, height: 0 };
    n.classList = {
        add: (...cs) => { const s = new Set(n.className.split(/\s+/).filter(Boolean)); cs.forEach(c => s.add(c)); n.className = [...s].join(' '); },
        remove: (...cs) => { const s = new Set(n.className.split(/\s+/).filter(Boolean)); cs.forEach(c => s.delete(c)); n.className = [...s].join(' '); },
        toggle: (c, v) => { if (v === undefined ? !n.className.split(/\s+/).includes(c) : v) n.classList.add(c); else n.classList.remove(c); },
        contains: c => n.className.split(/\s+/).includes(c)
    };
    n.appendChild = x => { n.children.push(x); x.padre = n; return x; };
    n.append = (...xs) => xs.flat().forEach(x => n.appendChild(typeof x === 'string' ? Object.assign(nodo('#text'), { textContent: x }) : x));
    n.remove = () => { if (n.padre) n.padre.children = n.padre.children.filter(x => x !== n); };
    n.addEventListener = (t, f) => { (n.oyentes[t] ||= []).push(f); };
    n.click = () => { for (const f of n.oyentes.click || []) f({ preventDefault() {} }); };
    n.getContext = () => ctxVacio;
    Object.defineProperty(n, 'textContent', { get: () => texto, set: v => { texto = String(v ?? ''); n.children = []; } });
    return n;
}
const buscar = (n, pred, out = []) => { for (const x of n.children || []) { if (pred(x)) out.push(x); buscar(x, pred, out); } return out; };
const oyentesDoc = {};
const body = nodo('body');
globalThis.document = {
    body, head: nodo('head'), createElement: nodo, pointerLockElement: null,
    addEventListener: (t, f) => { (oyentesDoc[t] ||= []).push(f); }, removeEventListener() {}
};
globalThis.window = { innerWidth: 1600, innerHeight: 900, addEventListener() {}, removeEventListener() {}, setTimeout, clearTimeout };
globalThis.localStorage ??= { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.fetch ??= async () => ({ ok: false, status: 404, json: async () => null, text: async () => '' });
// Una tecla al documento: devuelve si alguien la detuvo o la tomó (preventDefault)
function tecla(tipo, code) {
    const e = { code, repeat: false, prevenido: false, detenido: false, preventDefault() { this.prevenido = true; }, stopPropagation() { this.detenido = true; } };
    for (const f of oyentesDoc[tipo] || []) f(e);
    return e;
}

export async function probar({ ok, R, estilos, leer }) {
    const avisar = console.warn; console.warn = () => {};
    const CU = await imp('mundo/criaturas/cuerpo.js');
    const { crearArena } = await imp('mundo/supervivencia/arena/arena.js');
    console.warn = avisar;
    const pintor = c => () => [c[0], c[1], c[2]];
    const piel = { cabeza: { frente: pintor([200, 160, 130]) }, cuerpo: { frente: pintor([40, 90, 160]) }, brazo: { frente: pintor([40, 90, 160]) }, pierna: { frente: pintor([50, 50, 70]) } };
    const personas = {};
    const escenaFalsa = () => ({
        scene: {}, armar() {}, dibujar() {}, celebrar() { escenaFalsa.celebro = true; }, aplicar() {}, destruir() {},
        peleador: k => (personas[k] ||= CU.crearPersona(CU.crearTinte(), piel, 3)),
        primerPlano: () => ({ pos: [0, 1.6, 1], mira: [0, 1.6, 0] })
    });
    const reg = { bloquear: 0, liberar: 0, amistad: [], dado: [] };
    const misiones = { estado: { minijuegos: new Set() }, alMinijuego: (j, f) => reg.amistad.push(j + ':' + f) };
    const arena = crearArena({
        idioma: 'es', tactil: () => false, puede: () => true,
        bloquear: () => reg.bloquear++, liberar: () => reg.liberar++,
        datos: () => leer('arena'), estilos, crearEscena: escenaFalsa, misiones,
        inventario: { agregar: (id, n) => { reg.dado.push([id, n]); return 0; } }, entidades: null, jugador: { pos: { x: 0, y: 0, z: 0 } }
    });
    const capa = body.children.find(x => x.className.includes('ar-capa'));
    const visible = cls => buscar(capa, x => x.className.split(' ').includes(cls) && x.classList.contains('visible')).length > 0;
    const correr = (s, paso = 1 / 60) => { for (let t = 0; t < s; t += paso) arena.actualizar(paso); };
    // Un K.O. al rival y esperar a que la ronda termine (con la cámara lenta del K.O. tarda más en tiempo real)
    const ko = Q => { let n = 0; while (Q.fase !== 'pelea' && n++ < 2000) arena.actualizar(1 / 60); Q.f[1].vida = 0; const r = Q.rondasJugadas; n = 0; while ((Q.rondasJugadas === r || Q.fase === 'ko') && n++ < 2000) arena.actualizar(1 / 60); };
    const botonTexto = t => buscar(capa, x => x.tagName === 'BUTTON' && x.textContent.startsWith(t))[0];

    ok(!tecla('keydown', 'KeyW').detenido, 'cerrada: la arena no toca el teclado del mundo');
    ok(arena.abrir('moises') === true && arena.activa, 'abrir');
    ok(body.classList.contains('en-arena') && capa.classList.contains('visible') && reg.bloquear === 1, 'abrir: oculta el HUD y la capa táctil del mundo (body.en-arena) y bloquea al jugador');
    ok(arena.abrir() === false, 'no se abre dos veces');
    correr(R.entrada.ventisca + 0.1);
    ok(arena.estado.fase === 'menu' && visible('ar-menu'), 'tras la ventisca, el menú');
    ok(tecla('keydown', 'KeyW').detenido, 'abierta: el mundo no recibe teclas');
    ok(arena.estado.P.f[0].clave === 'moises', 'el peleador de quien te retó viene elegido');
    tecla('keydown', 'Enter');
    ok(arena.estado.fase === 'vs' && visible('ar-vs'), 'Enter: la presentación VS');
    correr(R.entrada.vs + 0.05);
    ok(arena.estado.fase === 'vuelo' && visible('ar-titulo'), 'el VS da paso al vuelo con el nombre del escenario');
    tecla('keydown', 'Space');
    ok(arena.estado.fase === 'pelea' && visible('ar-hud'), 'Espacio salta el vuelo: la pelea con su HUD');
    const P = arena.estado.P;
    ok(Math.abs(Math.hypot(P.f[0].x - P.f[1].x, P.f[0].z - P.f[1].z) - R.marcas.separacion) < 0.1, 'al saltar el vuelo quedan en su marca');
    correr(R.rondas.anuncio + R.rondas.peleen + 0.1);
    ok(P.fase === 'pelea', '«Ronda 1» → «¡Peleen!» → pelea');
    const x0 = P.f[0].x;
    const t = tecla('keydown', 'KeyD');
    ok(t.prevenido, 'una tecla del combate se toma (preventDefault)');
    correr(0.5);
    tecla('keyup', 'KeyD');
    ok(P.f[0].x > x0 + 0.2, `D camina hacia el rival (${(P.f[0].x - x0).toFixed(2)})`);
    // Pausa con Esc y seguir
    tecla('keydown', 'Escape');
    ok(arena.estado.pausa && visible('ar-pausa'), 'Esc pausa');
    const xp = P.f[0].x; correr(0.3);
    ok(P.f[0].x === xp, 'en pausa nada avanza');
    botonTexto('Seguir').click();
    ok(!arena.estado.pausa, 'Seguir');
    // Dos K.O. → resultado con premio y amistad
    ko(P); ko(P);
    ok(arena.estado.fase === 'final' && visible('ar-final'), `dos K.O.: el resultado (${P.victorias})`);
    ok(reg.amistad.includes('duelo:gana'), 'amistad con los dos (minijuego duelo)');
    const pv = R.premios.primeraVictoria.normal;
    ok(pv && reg.dado.length === 1 && reg.dado[0][1] === pv.cantidad, 'primera victoria en normal: su objeto');
    // Revancha: otra pelea sin presentación; ganar otra vez no repite el objeto
    tecla('keydown', 'Enter');
    ok(arena.estado.fase === 'vuelo', `Revancha (Enter): directo al vuelo (${arena.estado.fase})`);
    tecla('keydown', 'Space');
    const P2 = arena.estado.P;
    ko(P2); ko(P2);
    ok(arena.estado.fase === 'final' && reg.dado.length === 1, 'la segunda victoria en la misma dificultad no repite el objeto');
    // Salir: ventisca inversa y todo como estaba
    botonTexto('Salir').click();
    ok(arena.activa && arena.estado.fase === 'cerrando', 'Salir: la ventisca inversa');
    correr(R.entrada.ventisca + 0.1);
    ok(!arena.activa, 'tras la ventisca se cierra');
    ok(!body.classList.contains('en-arena') && !capa.classList.contains('visible'), 'salir: vuelven el HUD y la capa táctil del mundo');
    ok(reg.liberar === 1 && reg.bloquear === 1, 'salir: libera al jugador una vez');
    ok(!tecla('keydown', 'KeyW').detenido && !tecla('keydown', 'KeyD').prevenido, 'salir: el teclado vuelve al mundo');
    ok(buscar(capa, x => x.classList.contains('visible')).length === 0, 'salir: no queda ninguna capa de la arena a la vista');
    ok(arena.dibuja({ domElement: {} }) === false, 'cerrada: el mundo se dibuja como siempre');
    // Y se puede volver a abrir
    ok(arena.abrir() === true, 'se puede volver a abrir');
    arena.cerrar();
    ok(!arena.activa && reg.liberar === 2 && !body.classList.contains('en-arena'), 'cerrar de una vez también restaura');
    return true;
}
