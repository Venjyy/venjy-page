// Prueba del Estudio, fase 5 (diseño de escenas): node mundo/tests/estudio-escenas.mjs
// escenas.json en formato estable y válido; casos inválidos que el esquema rechaza; paridad exacta de las escenas
// piloto con ANIMACIONES (los datos y, cuadro a cuadro, qué gesto suena, su u y su peso, con la misma cuenta que
// gestoDe de escena-amistad.js); las reglas que el esquema no expresa (estudio/DISENO.md §13, mundo/datos/escenas.js,
// las mismas de `cli.mjs validar`); y el PR 5a: el motor real fusiona los datos (y sin ellos usa el código) y una
// escena de guion se completa con durLinea y se juega con jugarGuion; y el PR 5c: planosDe, la cámara que llega a
// iniciarCine (sin `camara`, igual que antes) y las operaciones de cámara del modelo; y B3a: las claves del motor genérico
// (dispara, lugar, giros, caminos, objetos, efectos, sonidos, marcas, codigo, ancla, 4.º elemento del tramo).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatear } from '../../estudio/formato.mjs';
import { validar } from '../../estudio/validar.mjs';
import { PERSONAJES } from '../supervivencia/amistad.js';
import { ANIMACIONES, GESTOS_AMISTAD, PLANOS_AMISTAD, PLANOS_GRUPO, PLANOS_GRUPO_TECHO } from '../supervivencia/escena-amistad-datos.js';
import { fusionar } from '../datos/cargador.js';
import { animacionDeDatos, guionDeDatos, reglasEscenas, planosDe, opcionesCamara, tiempoDeAncla, personasUsadas } from '../datos/escenas.js';
import * as M from '../../estudio/escenas-modelo.mjs';
import { crearManejador } from '../../estudio/puente-protocolo.js';
// escenas-skin.js (GESTOS) trae cuerpo.js, que escucha eventos de `window`: basta un objeto mínimo (como amistad.mjs)
globalThis.window ??= { addEventListener() {} };
const { GESTOS } = await import('../supervivencia/escenas-skin.js');
const { MOLDES } = await import('../supervivencia/moldes.js');
const { durLinea } = await import('../supervivencia/reencuentros.js');

let fallos = 0;
const ok = (cond, msg) => { if (!cond) { fallos++; console.log('FALLA:', msg); } };
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const leer = n => fs.readFileSync(path.join(RAIZ, 'mundo', 'datos', n), 'utf8');
const crudo = leer('escenas.json');
const datos = JSON.parse(crudo);
const poses = JSON.parse(leer('poses.json'));

// ---------- 1. Formato y esquema ----------
ok(formatear(datos) === crudo, 'escenas.json en formato estable');
ok(validar(datos, 'escenas').length === 0, 'escenas.json cumple su esquema: ' + validar(datos, 'escenas').join(' | '));
const indice = JSON.parse(leer('indice.json'));
ok(indice.archivos.escenas && indice.archivos.escenas.esquema === 'escenas' && indice.archivos.escenas.lee === 'mundo/supervivencia/escena-amistad.js', 'indice.json: escenas lo lee escena-amistad.js');

const malo = (cambio, que) => {
    const d = structuredClone(datos);
    cambio(d);
    ok(validar(d, 'escenas').length > 0, 'debió fallar: ' + que);
};
malo(d => { d.escenas.punos.tipo = 'baile'; }, 'tipo desconocido');
malo(d => { d.escenas.punos.pista.n[0] = ['puno', 0.45]; }, 'tramo sin hasta');
malo(d => { d.escenas.punos.linea = [2.3, 3, 1]; }, 'linea con 3 números');
malo(d => { delete d.escenas.pareja.r; }, 'sin r');
malo(d => { d.escenas.punos.lineas = []; }, 'amistad con lineas (es de guion)');
malo(d => { d.escenas.nueva = { tipo: 'guion', T: 4, r: 1.2, lineas: [{ q: 'n', a: 0.5, texto: { es: 'Hola' } }], pista: {} }; }, 'frase sin inglés');
malo(d => { d.escenas.punos.camara = { planos: [{ nombre: 'x', ang: 0, dist: 3 }] }; }, 'plano sin alto');
// Una escena de guion completa sí pasa (es la forma de las escenas nuevas)
{
    const d = structuredClone(datos);
    d.escenas.nueva = {
        tipo: 'guion', T: 6, r: 1.3, actores: { b: 'andy', c: { clave: 'nacho', radio: 6 } },
        lineas: [{ q: 'n', a: 0.6, texto: { es: 'Hola', en: 'Hi' } }, { q: 'todos', a: 3, d: 2.4, texto: { es: '¡Eso!', en: 'Yes!' } }],
        golpes: [1.45], pista: { n: [['puno', 0.45, 2.4]], b: [['risa', 3, 4.5]] },
        camara: { planos: [{ nombre: 'de lado', ang: 1.5708, dist: 3.6, alto: 1.75, orbita: 0.1, dolly: -0.4 }] }
    };
    ok(validar(d, 'escenas').length === 0, 'escena de guion de ejemplo válida: ' + validar(d, 'escenas').join(' | '));
    d.escenas.punos.camara = { planos: 'grupo-techo' };
    ok(validar(d, 'escenas').length === 0, 'juego de planos por nombre válido');
}

// ---------- 2. Paridad con ANIMACIONES ----------
// Contrato (mundo/datos/escenas.js, `animacionDeDatos`): una escena «amistad» del JSON, sin tipo, camara ni nota, es
// exactamente la entrada de ANIMACIONES. Con eso guionGenerico() arma el mismo guion.
const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const suave = u => u * u * (3 - 2 * u);
const lim = (v, a, b) => Math.max(a, Math.min(b, v));
const tramoU = (u, a, b) => lim((u - a) / (b - a), 0, 1);
const envolvente = (u, a, b, r) => suave(Math.min(tramoU(u, a, a + r), 1 - tramoU(u, b - r, b)));
// Copia de gestoDe (escena-amistad.js:327): el gesto que suena en t, su progreso u y su peso w
const gestoDe = (pista, t) => {
    for (const [g, desde, hasta] of pista || []) if (t >= desde && t < hasta) return { g, u: (t - desde) / (hasta - desde), w: envolvente(t, desde, hasta, Math.min(0.3, (hasta - desde) / 3)) };
    return null;
};

let comparaciones = 0, difMax = 0;
const pilotos = Object.entries(datos.escenas).filter(([, e]) => e.tipo === 'amistad');
ok(pilotos.length >= 2, 'al menos 2 escenas piloto');
for (const [clave, def] of pilotos) {
    const js = ANIMACIONES[clave];
    ok(js, `${clave}: existe en ANIMACIONES`);
    if (!js) continue;
    ok(igual(animacionDeDatos(def), js), `${clave}: mismos datos que ANIMACIONES (orden de claves incluido)`);
    const actores = new Set([...Object.keys(js.pista), ...Object.keys(def.pista)]);
    for (let i = 0; i <= Math.ceil(js.T * 120); i++) {
        const t = i / 120;
        for (const q of actores) {
            const a = gestoDe(js.pista[q], t), b = gestoDe(def.pista[q], t);
            comparaciones++;
            if (!a || !b) { ok(!a && !b, `${clave} ${q} t=${t}: uno tiene gesto y el otro no`); continue; }
            ok(a.g === b.g, `${clave} ${q} t=${t}: gesto ${a.g} ≠ ${b.g}`);
            difMax = Math.max(difMax, Math.abs(a.u - b.u), Math.abs(a.w - b.w));
        }
    }
    for (const k of ['linea', 'golpes', 'corazones']) {
        comparaciones++;
        ok(igual(def[k], js[k]), `${clave}: ${k} igual`);
    }
}
ok(difMax === 0, 'diferencia máxima 0 (fue ' + difMax + ')');

// ---------- 3. Reglas que el esquema no expresa (mundo/datos/escenas.js, las de `cli.mjs validar`) ----------
// Nombres que el juego resuelve (guion.gestos con MOLDES → GESTOS_AMISTAD → GESTOS, más los gestos y poses de
// poses.json, que aplicarPoses suma a GESTOS; como nombresDeEscenasImport de cli.mjs)
const nombres = { gestos: new Set([...Object.keys(GESTOS), ...Object.keys(GESTOS_AMISTAD), ...Object.keys(MOLDES), ...Object.keys(poses.gestos || {}), ...Object.keys(poses.poses || {})]), animaciones: new Set(Object.keys(ANIMACIONES)), durLinea };
{
    // Los textos nuevos quedan «sin revisar» hasta que el dueño los marca: es un aviso esperado, no un error
    // Los momentos (B4c) traen del JS la `d` de cada frase, más corta de lo que se lee en varias: también esperado (paridad con
    // el juego de hoy); «Acomodar frases» en la pestaña Escenas las alarga y mueve lo que depende de ellas, si el dueño lo pide
    const r = reglasEscenas(datos, { ...nombres, personas: new Set(PERSONAJES) }).filter(x => !/sin revisar/.test(x.texto) && !/^\$\.escenas\.momento-[\w-]+\.lineas\[\d+\]\.d: .*frase apurada/.test(x.texto));
    ok(r.length === 0, 'escenas.json sin errores ni avisos: ' + r.map(x => x.texto).join(' | '));
    // Cada regla da error (o aviso) cuando toca
    const con = (cambio, tipo, parte) => {
        const d = structuredClone(datos);
        cambio(d);
        const hallado = reglasEscenas(d, nombres);
        ok(hallado.some(x => x.tipo === tipo && x.texto.includes(parte)), `regla ${tipo} «${parte}»: ` + JSON.stringify(hallado));
    };
    const guion = () => ({ tipo: 'guion', T: 6, r: 1.3, actores: { b: 'andy' }, lineas: [{ q: 'n', a: 0.6, d: 2.5, texto: { es: 'Hola, ¿cómo estás hoy?', en: 'Hi, how are you today?', revisado: true } }], pista: { n: [['habla', 0.5, 3]] } });
    con(d => { d.escenas.punos.pista.n[1][1] = 2.0; }, 'error', 'se superpone');
    con(d => { d.escenas.punos.pista.n[0][2] = 9; }, 'error', 'pasa de T');
    con(d => { d.escenas.punos.pista.n[0][1] = 3; d.escenas.punos.pista.n[0][2] = 2; }, 'error', 'menor que hasta');
    con(d => { d.escenas.punos.pista.z = [['puno', 0, 1]]; }, 'error', 'actor no declarado');
    con(d => { d.escenas.punos.pista.n[0][0] = 'noexiste'; }, 'error', 'no existe en el juego');
    con(d => { d.escenas.punos.golpes = [2, 1]; }, 'error', 'no sigue en orden');
    con(d => { d.escenas.pareja.corazones = [3, 9]; }, 'error', 'menor que T');
    con(d => { d.escenas.punos.linea = [5, 3]; }, 'error', 'después de T');
    con(d => { d.escenas.nueva = { ...guion(), tipo: 'amistad' }; }, 'aviso', 'no está en ANIMACIONES');
    con(d => { d.escenas.nueva = guion(); d.escenas.nueva.lineas[0].q = 'x'; }, 'error', 'no es un actor declarado');
    con(d => { d.escenas.nueva = guion(); d.escenas.nueva.lineas[0].d = 0.5; }, 'aviso', 'frase apurada');
    con(d => { d.escenas.nueva = guion(); delete d.escenas.nueva.lineas[0].texto.revisado; }, 'aviso', 'sin revisar');
    con(d => { d.escenas.nueva = guion(); d.escenas.nueva.lineas.push({ q: 'b', a: 1, d: 2.5, texto: { es: 'Chao', en: 'Bye', revisado: true } }); }, 'aviso', 'antes de que termine');
    con(d => { d.escenas.nueva = guion(); d.escenas.nueva.lineas[0].a = 5.5; }, 'error', 'después de T');
}

// ---------- 4. PR 5a: el juego lee escenas.json ----------
// Fusión código ← JSON: sin cambios es igual al código; una fila de actor reemplaza la fila entera; la que falta queda
for (const [clave, def] of Object.entries(datos.escenas).filter(([, e]) => e.tipo === 'amistad')) {
    ok(igual(fusionar(ANIMACIONES[clave], animacionDeDatos(def)), ANIMACIONES[clave]), `${clave}: fusionar(ANIMACIONES, datos) da lo mismo que el código`);
}
{
    const def = structuredClone(datos.escenas.punos);
    def.pista.n = [['puno', 0.5, 2.0]];
    def.golpes = [1.6];
    const f = fusionar(ANIMACIONES.punos, animacionDeDatos(def));
    ok(igual(f.pista.n, [['puno', 0.5, 2.0]]), 'la fila n del JSON reemplaza la fila entera');
    ok(igual(f.pista.j, ANIMACIONES.punos.pista.j), 'la fila j que el JSON no cambia queda igual');
    const sinJ = structuredClone(datos.escenas.punos);
    delete sinJ.pista.j;
    ok(igual(fusionar(ANIMACIONES.punos, animacionDeDatos(sinJ)).pista.j, ANIMACIONES.punos.pista.j), 'una fila que falta en el JSON queda la del código');
    ok(igual(f.golpes, [1.6]) && f.T === 5.6, 'un golpe movido llega; lo que no está sigue como en el código');
    ok(ANIMACIONES.punos.golpes[0] === 1.45, 'ANIMACIONES no se modifica');
}
// guionDeDatos: d que falta vale durLinea(texto); gestos = moldes; actores tal cual; sin tipo/camara/nota del JSON
{
    const def = { tipo: 'guion', T: 9, r: 1.3, nota: 'x', camara: { planos: 'grupo' }, actores: { b: 'andy', c: { clave: 'nacho', radio: 6 } },
        lineas: [{ q: 'n', a: 0.6, texto: { es: 'Hola, ¿cómo estás hoy?', en: 'Hi, how are you today?' } }, { q: 'todos', a: 4, d: 2.2, texto: { es: '¡Eso!', en: 'Yes!' } }],
        golpes: [1.45], pista: { n: [['puno', 0.45, 2.4]] } };
    const g = guionDeDatos(def, { durLinea, moldes: MOLDES });
    ok(g.lineas[0].d === durLinea(def.lineas[0].texto) && g.lineas[1].d === 2.2, 'guionDeDatos: d que falta vale durLinea(texto)');
    ok(g.gestos === MOLDES && igual(g.actores, def.actores) && igual(g.pista, def.pista) && g.T === 9 && g.r === 1.3, 'guionDeDatos: gestos, actores, pista, T y r');
    ok(igual(g.camara, def.camara) && !('nota' in g) && g.tipo === 'guion', 'guionDeDatos: conserva camara (PR 5c), sin nota');
    ok(!('camara' in guionDeDatos({ ...def, camara: undefined }, { durLinea })), 'guionDeDatos: sin camara no agrega la clave');
    ok(durLinea(def.lineas[0].texto) >= 2.3 && durLinea(def.lineas[0].texto) <= 3.6, 'durLinea en su rango');
}
// El motor real (escena-amistad.js) con un DOM mínimo y personas de cajas: la misma base de amistad.mjs
{
    const THREE = await import('../../vendor/three.module.js');
    const lienzo2d = { fillRect() {}, fillStyle: '' };
    const elem = () => ({ style: {}, classList: { add() {}, remove() {} }, addEventListener() {}, getContext: () => lienzo2d, width: 0, height: 0 });
    globalThis.document ??= { createElement: elem, body: { appendChild() {}, classList: { add() {}, remove() {}, contains: () => false } }, addEventListener() {}, querySelector: () => null, querySelectorAll: () => [] };
    const { crearEscenaAmistad, aplicarDatosVivos } = await import('../supervivencia/escena-amistad.js');
    const rig = () => {
        const p = {};
        for (const k of ['g', 'cuerpo', 'torso', 'cuello', 'cabeza', 'brazoD', 'brazoI', 'piernaD', 'piernaI']) p[k] = new THREE.Group();
        p.g.add(p.cuerpo); p.cuerpo.add(p.torso, p.cuello, p.brazoD, p.brazoI, p.piernaD, p.piernaI); p.cuello.add(p.cabeza);
        return p;
    };
    const personas = [{ clave: 'pony', x: 10, y: 25, z: 10, yaw: 0, p: rig() }, { clave: 'andy', x: 40, y: 25, z: 40, yaw: 0, p: rig() }];
    const jugador = { pos: { x: 12, y: 73, z: 10 }, yaw: 0, pitch: 0, colocar(x, y, z) { this.pos.x = x; this.pos.y = y; this.pos.z = z; } };
    let ultimaCine = null;
    const camaras = { cuerpo: rig(), iniciarCine(a, o) { ultimaCine = o; }, terminarCine() {}, nuevaLinea() {}, enfocar() {}, set pose(f) {}, set manual(f) {} };
    const motor = crearEscenaAmistad({ grupo: new THREE.Group(), dy: 48, mundo: { bloque: () => 0 }, jugador, camara: new THREE.PerspectiveCamera(), camaras, misiones: {},
        personas: () => personas, personaDe: c => personas.find(n => n.clave === c) || null, bloquear() {}, liberar() {} });
    // Juega, lee T y tipo y salta: la siguiente prueba empieza limpia
    const jugar = async f => { motor.saltar(); const r = await f(); const T = motor.escena && motor.escena.T; const tipo = motor.escena && motor.escena.tipo; motor.saltar(); return { r, T, tipo }; };

    ok(motor.guiones().length === 0, 'el escenas.json de hoy no trae escenas de guion');
    // El archivo real (cargado al importar el módulo): punos con sus datos
    let r = await jugar(async () => motor.jugar('pony', 'punos'));
    ok(r.r === true && r.T === 5.6 && r.tipo === 'punos', 'jugar(punos) con escenas.json: T 5.6');
    // Datos vivos: otro T llega; sin datos (null) vuelve el del código (el mismo caso de ?sin-datos)
    const otros = structuredClone(datos);
    otros.escenas.punos.T = 7;
    aplicarDatosVivos(otros);
    r = await jugar(async () => motor.jugar('pony', 'punos'));
    ok(r.T === 7, 'datos vivos: T 7 llega al motor, vio ' + r.T);
    r = await jugar(async () => motor.jugar('pony', 'abrazo'));
    ok(r.r === true && r.T === ANIMACIONES.abrazo.T, 'abrazo (no está en el JSON): usa el código');
    aplicarDatosVivos(null);
    r = await jugar(async () => motor.jugar('pony', 'punos'));
    ok(r.T === ANIMACIONES.punos.T, 'sin datos: usa el código (T ' + r.T + ')');
    // Escena de guion: se juega con jugarGuion (la más cercana al jugador sin persona)
    const conGuion = structuredClone(datos);
    conGuion.escenas.prueba = { tipo: 'guion', T: 6, r: 1.3, lineas: [{ q: 'n', a: 0.6, texto: { es: 'Hola, ¿cómo estás hoy?', en: 'Hi, how are you today?' } }], pista: { n: [['saluda', 0.4, 2], ['habla', 2.2, 4.5]], j: [['saluda', 0.4, 2]] } };
    aplicarDatosVivos(conGuion);
    ok(motor.guiones().includes('prueba'), 'guiones() lista la escena de guion');
    r = await jugar(async () => motor.jugarGuion('prueba'));
    ok(r.r === true && r.T === 6 && r.tipo === 'guion', 'jugarGuion sin persona (la más cercana): empieza');
    ok(personas[0].escena === undefined && personas[1].escena === undefined, 'jugarGuion: al terminar nadie queda en escena');
    r = await jugar(async () => motor.jugarGuion('prueba', 'andy'));
    ok(r.r === true, 'jugarGuion con persona: empieza');
    ok((await jugar(async () => motor.jugarGuion('noexiste'))).r === false, 'jugarGuion de una clave que no existe: false');
    ok((await jugar(async () => motor.jugarGuion('punos'))).r === false, 'jugarGuion no juega una escena de tipo amistad');
    // PR 5c: la cámara que llega a iniciarCine
    aplicarDatosVivos(null);
    ultimaCine = null;
    await jugar(async () => motor.jugar('pony', 'punos'));
    ok(ultimaCine && ultimaCine.planos === PLANOS_AMISTAD && ultimaCine.minDist === 1.8 && ultimaCine.evitarDist === 2.4 && ultimaCine.holgura === 0.7 && ultimaCine.sinTerceros === true,
        'sin camara: los planos y distancias de siempre (PLANOS_AMISTAD)');
    ultimaCine = null;
    aplicarDatosVivos(datos); // el archivo real: punos sin camara
    await jugar(async () => motor.jugar('pony', 'punos'));
    ok(ultimaCine && ultimaCine.planos === PLANOS_AMISTAD, 'escenas.json de hoy (sin camara): PLANOS_AMISTAD');
    const conCamara = structuredClone(datos);
    conCamara.escenas.punos.camara = { planos: 'grupo' };
    aplicarDatosVivos(conCamara);
    await jugar(async () => motor.jugar('pony', 'punos'));
    ok(ultimaCine.planos === PLANOS_GRUPO && ultimaCine.minDist === 1.6 && ultimaCine.evitarDist === 2.0 && ultimaCine.holgura === 0.5 && !ultimaCine.sinTerceros,
        'escena amistad con camara «grupo»: PLANOS_GRUPO y distancias de grupo');
    conCamara.escenas.punos.camara = { planos: 'grupo-techo' };
    aplicarDatosVivos(conCamara);
    await jugar(async () => motor.jugar('pony', 'punos'));
    ok(ultimaCine.planos === PLANOS_GRUPO_TECHO && ultimaCine.minDist === 1 && ultimaCine.holgura === 0, 'camara «grupo-techo»: PLANOS_GRUPO_TECHO');
    const propios = [{ nombre: 'frontal', ang: 3, dist: 3, alto: 1.7, orbita: 0, dolly: 0 }, { nombre: 'alto', ang: 0.5, dist: 5, alto: 4 }];
    const conLista = structuredClone(datos);
    conLista.escenas.prueba = { tipo: 'guion', T: 6, r: 1.3, camara: { planos: propios }, lineas: [{ q: 'n', a: 0.6, texto: { es: 'Hola, ¿cómo estás hoy?', en: 'Hi, how are you today?' } }], pista: { n: [['saluda', 0.4, 2]], j: [] } };
    aplicarDatosVivos(conLista);
    await jugar(async () => motor.jugarGuion('prueba'));
    ok(igual(ultimaCine.planos, propios) && ultimaCine.minDist === 1.8 && ultimaCine.sinTerceros === true, 'guion con lista propia: esos planos y las distancias de amistad');
    delete conLista.escenas.prueba.camara;
    aplicarDatosVivos(conLista);
    await jugar(async () => motor.jugarGuion('prueba'));
    ok(ultimaCine.planos === PLANOS_AMISTAD, 'guion sin camara: PLANOS_AMISTAD');
    aplicarDatosVivos(null);
}

// ---------- PR 5b: modelo de la línea de tiempo (estudio/escenas-modelo.mjs) ----------
{
    const base = structuredClone(datos.escenas.punos);   // n: puno 0.45-2.4, risa 2.5-3.6, habla 3.6-5.3; j: puno 0.45-2.4, asiente 2.6-4.4; T 5.6
    const nombres = { gestos: new Set([...Object.keys(GESTOS), ...Object.keys(GESTOS_AMISTAD), ...Object.keys(MOLDES)]), animaciones: Object.keys(ANIMACIONES), durLinea };
    const sinErrores = (def, k = 'punos') => reglasEscenas({ escenas: { [k]: def } }, nombres).filter(a => a.tipo === 'error');
    const copiaIntacta = JSON.stringify(base);

    // mover: encaja a 0,05 y se detiene contra el vecino y contra T
    let r = M.moverTramo(base, 'n', 1, 2.83);                      // risa (1.1 s) entre puno (hasta 2.4) y habla (desde 3.6): solo cabe 2.5
    ok(r.cambio === true && r.def.pista.n[1][1] === 2.5 && r.def.pista.n[1][2] === 3.6 || r.cambio === false, 'moverTramo: la risa queda pegada a sus vecinos');
    ok(r.def.pista.n[1][1] === 2.5 && r.def.pista.n[1][2] === 3.6, 'moverTramo: la risa no se sale del hueco: ' + JSON.stringify(r.def.pista.n[1]));
    r = M.moverTramo(base, 'j', 1, 3.02);                          // asiente 2.6-4.4 (1.8 s)
    ok(r.cambio && r.def.pista.j[1][1] === 3 && r.def.pista.j[1][2] === 4.8, 'moverTramo: encaja a 0,05 y conserva la duración: ' + JSON.stringify(r.def.pista.j[1]));
    r = M.moverTramo(base, 'j', 1, 9);
    ok(r.def.pista.j[1][2] === 5.6 && r.def.pista.j[1][1] === 3.8, 'moverTramo: se detiene en T: ' + JSON.stringify(r.def.pista.j[1]));
    r = M.moverTramo(base, 'j', 1, 0);
    ok(r.def.pista.j[1][1] === 2.4 && r.def.pista.j[1][2] === 4.2, 'moverTramo: se detiene contra el vecino de la izquierda: ' + JSON.stringify(r.def.pista.j[1]));
    r = M.moverTramo(base, 'n', 0, 0);
    ok(r.def.pista.n[0][1] === 0 && r.def.pista.n[0][2] === 1.95, 'moverTramo: el primero llega a 0, no a negativo');
    ok(JSON.stringify(base) === copiaIntacta, 'el modelo no modifica la escena que recibe');

    // estirar
    r = M.estirarTramo(base, 'n', 0, 'hasta', 3);
    ok(r.def.pista.n[0][2] === 2.5 && r.def.pista.n[0][1] === 0.45, 'estirarTramo: tope contra el vecino (2.5): ' + JSON.stringify(r.def.pista.n[0]));
    r = M.estirarTramo(base, 'n', 0, 'hasta', 0.2);
    ok(Math.abs(r.def.pista.n[0][2] - 0.55) < 1e-9, 'estirarTramo: mínimo 0,1 s: ' + r.def.pista.n[0][2]);
    r = M.estirarTramo(base, 'n', 2, 'hasta', 9);
    ok(r.def.pista.n[2][2] === 5.6, 'estirarTramo: tope en T');
    r = M.estirarTramo(base, 'j', 1, 'desde', 1.0);
    ok(r.def.pista.j[1][1] === 2.4 && r.def.pista.j[1][2] === 4.4, 'estirarTramo: el borde izquierdo se detiene contra el vecino');

    // agregar y borrar
    r = M.agregarTramo(base, 'j', 'risa', 5.0, 2);
    ok(r && r.def.pista.j[2] && r.def.pista.j[2][0] === 'risa' && r.def.pista.j[2][1] === 5 && r.def.pista.j[2][2] === 5.6, 'agregarTramo: recortado al hueco hasta T: ' + JSON.stringify(r && r.def.pista.j));
    r = M.agregarTramo(base, 'j', 'risa', 1.0, 0.2);
    ok(r && r.def.pista.j[1][1] === 2.4, 'agregarTramo: sobre otro tramo se coloca justo detrás de él: ' + JSON.stringify(r && r.def.pista.j));
    r = M.agregarTramo({ ...base, T: 5.3 }, 'n', 'risa', 5.2, 1);
    ok(r === null, 'agregarTramo: sin hueco da null');
    r = M.borrarTramo(base, 'j', 1);
    ok(r.def.pista.j.length === 1, 'borrarTramo');
    r = M.borrarTramo(M.borrarTramo(base, 'j', 1).def, 'j', 0);
    ok(Array.isArray(r.def.pista.j) && r.def.pista.j.length === 0, 'una fila vacía queda como [] (no se borra la clave)');
    ok(M.cambiarGesto(base, 'n', 0, 'abrazo').def.pista.n[0][0] === 'abrazo', 'cambiarGesto');

    // marcas
    r = M.agregarMarca(base, 'golpes', 3.337);
    ok(r && r.def.golpes.join() === '1.45,3.35' && r.i === 1, 'agregarMarca: encaja y queda en orden: ' + JSON.stringify(r && r.def.golpes));
    r = M.agregarMarca(r.def, 'golpes', 0.5);
    ok(r.def.golpes.join() === '0.5,1.45,3.35' && r.i === 0, 'agregarMarca antes de las demás');
    ok(M.agregarMarca(base, 'golpes', 1.45) === null, 'agregarMarca: no repite un instante');
    r = M.moverMarca(M.agregarMarca(base, 'golpes', 2).def, 'golpes', 0, 9);
    ok(r.def.golpes[0] === 1.95, 'moverMarca: no pasa a la siguiente (queda 0,05 antes): ' + JSON.stringify(r.def.golpes));
    r = M.moverMarca(base, 'golpes', 0, 99);
    ok(r.def.golpes[0] === 5.55, 'moverMarca: tope T - 0,05');
    r = M.borrarMarca(base, 'golpes', 0);
    ok(Array.isArray(r.def.golpes) && r.def.golpes.length === 0, 'borrarMarca en una escena amistad deja [] (reemplaza la lista del código)');

    // frases
    r = M.moverFrase(base, 0, 4.9);
    ok(r.def.linea[0] === 2.6 && r.def.linea[1] === 3, 'moverFrase: la frase no pasa de T: ' + JSON.stringify(r.def.linea));
    r = M.estirarFrase(base, 0, 'hasta', 99);
    ok(r.def.linea[1] === 3.3, 'estirarFrase: tope en T');
    r = M.estirarFrase(base, 0, 'desde', 0);
    ok(r.def.linea[0] === 0 && r.def.linea[1] === 5.3, 'estirarFrase desde el borde izquierdo: el final no se mueve');
    r = M.cambiarT(base, 1.5, durLinea);
    ok(r.def.T === 5.3 && r.cambio, 'cambiarT: no baja de donde llega lo que hay (5.3): ' + r.def.T);
    ok(M.cambiarT(base, 7, durLinea).def.T === 7, 'cambiarT sube');
    ok(M.finMinimo(base, durLinea) === 5.3, 'finMinimo: ' + M.finMinimo(base, durLinea));

    // todo lo que sale del modelo cumple el esquema y las reglas (400 operaciones al azar con semilla fija)
    {
        let sem = 12345;
        const rnd = () => (sem = (sem * 1664525 + 1013904223) % 4294967296) / 4294967296;
        let d = structuredClone(datos.escenas.pareja);
        let malas = 0, cambios = 0;
        const filas = ['n', 'j'];
        for (let n = 0; n < 400; n++) {
            const q = filas[Math.floor(rnd() * 2)], f = d.pista[q], i = Math.floor(rnd() * Math.max(1, f.length)), v = rnd() * 10 - 0.5;
            const op = Math.floor(rnd() * 7);
            let res = null;
            if (op === 0) res = M.moverTramo(d, q, i, v);
            else if (op === 1) res = M.estirarTramo(d, q, i, rnd() < 0.5 ? 'desde' : 'hasta', v);
            else if (op === 2) res = M.agregarTramo(d, q, 'saluda', v, 0.3 + rnd() * 2);
            else if (op === 3 && f.length > 1) res = M.borrarTramo(d, q, i);
            else if (op === 4) res = M.moverMarca(d, 'corazones', Math.floor(rnd() * 3), v);
            else if (op === 5) res = M.moverFrase(d, 0, v);
            else res = M.estirarFrase(d, 0, rnd() < 0.5 ? 'desde' : 'hasta', v);
            if (!res || !res.cambio) continue;
            cambios++;
            d = res.def;
            if (validar({ version: 1, escenas: { pareja: d } }, 'escenas').length || sinErrores(d, 'pareja').length) malas++;
        }
        ok(cambios > 100 && malas === 0, `400 operaciones al azar (${cambios} con cambio): todas cumplen esquema y reglas (${malas} malas)`);
    }

    // copia del código: editar abrazo/secreto lo lleva al JSON con la forma del piloto
    const copia = M.desdeCodigo(ANIMACIONES.secreto);
    ok(validar({ version: 1, escenas: { secreto: copia } }, 'escenas').length === 0, 'desdeCodigo: la copia de secreto cumple el esquema');
    ok(JSON.stringify(Object.keys(copia)) === JSON.stringify(['tipo', 'nivel', 'T', 'r', 'linea', 'golpes', 'pista']), 'desdeCodigo: orden de claves como el piloto');
    ok(JSON.stringify(fusionar(ANIMACIONES.secreto, animacionDeDatos(copia))) === JSON.stringify(ANIMACIONES.secreto), 'desdeCodigo: fusionada da lo mismo que el código');
    ok(copia.pista !== ANIMACIONES.secreto.pista, 'desdeCodigo: copia profunda (no comparte la pista con el código)');

    // escena de guion nueva: válida, y sus frases se editan con tope
    {
        const g = M.escenaNueva();
        ok(validar({ version: 1, escenas: { nueva: g } }, 'escenas').length === 0, 'escenaNueva cumple el esquema');
        let r2 = M.agregarFrase(g, 'j', 3);
        ok(r2 && r2.def.lineas.length === 2 && r2.def.lineas[1].q === 'j', 'agregarFrase');
        r2 = M.estirarFrase(r2.def, 1, 'hasta', 5.5, durLinea);
        ok(r2.def.lineas[1].d === 2.5 && r2.i === 1, 'estirarFrase fija d cuando no estaba');
        r2 = M.cambiarFrase(r2.def, 1, { es: 'Chao', en: 'Bye' });
        ok(r2.def.lineas[1].texto.es === 'Chao' && r2.def.lineas[1].texto.en === 'Bye', 'cambiarFrase');
        ok(M.borrarFrase(g, 0).cambio === false, 'no se borra la única frase');
        ok(M.quitarActor(M.ponerActor(r2.def, 'b', 'andy').def, 'b').def.actores === undefined, 'ponerActor y quitarActor');
        const usada = M.cambiarFrase(M.ponerActor(r2.def, 'b', 'andy').def, 1, { q: 'b' }).def;
        ok(M.quitarActor(usada, 'b') === null, 'no se quita un actor que una frase usa');
        ok(M.claveLibre(['escena', 'escena-2'], 'escena') === 'escena-3', 'claveLibre');
    }

    // historial
    const h = M.crearHistorial(3);
    for (const v of [1, 2, 3, 4]) h.meter({ v });
    ok(h.largo === 3 && h.deshacer().v === 4 && h.deshacer().v === 3 && h.deshacer().v === 2 && h.deshacer() === null, 'historial: tope y orden');

    // «una línea»: mover un tramo cambia una sola línea de escenas.json
    {
        const nuevoDatos = structuredClone(datos);
        nuevoDatos.escenas.punos = M.moverTramo(datos.escenas.punos, 'j', 1, 3.0).def;
        const a = formatear(datos).split('\n'), b = formatear(nuevoDatos).split('\n');
        const dif = a.filter((l, i) => l !== b[i]).length;
        ok(a.length === b.length && dif === 1, 'mover un tramo cambia una sola línea del archivo (' + dif + ')');
    }
}

// ---------- PR 5b: mensaje `escena` del puente ----------
{
    const llamadas = [];
    const responder = crearManejador({
        idioma: () => 'es', aplicarDatos() {},
        escena: async o => { llamadas.push(o); return { activa: true }; }
    });
    const m = x => responder({ de: 'estudio', id: 1, tipo: 'escena', ...x });
    const r = await m({ accion: 'jugar', clave: 'punos', persona: 'andy' });
    ok(r.tipo === 'ok' && r.escena.activa && llamadas[0].clave === 'punos' && llamadas[0].persona === 'andy', 'puente: escena jugar');
    ok((await m({ accion: 'pausa', v: true })).tipo === 'ok' && llamadas[1].accion === 'pausa' && llamadas[1].v === true, 'puente: escena pausa');
    ok((await m({ accion: 'ir', t: 1.45 })).tipo === 'ok' && llamadas[2].t === 1.45, 'puente: escena ir');
    ok((await m({ accion: 'parar' })).tipo === 'ok', 'puente: escena parar');
    for (const [x, que] of [[{ accion: 'bailar' }, 'acción desconocida'], [{ accion: 'jugar' }, 'jugar sin clave'], [{ accion: 'jugar', clave: 'a b' }, 'clave con espacio'],
        [{ accion: 'ir' }, 'ir sin t'], [{ accion: 'ir', t: -1 }, 'ir con t negativo'], [{ accion: 'pausa', v: 'si' }, 'pausa con v no booleano'],
        [{ accion: 'jugar', clave: 'punos', persona: '../x' }, 'persona no válida']]) {
        ok((await m(x)).tipo === 'error', 'puente: rechaza ' + que);
    }
    const sin = await crearManejador({ idioma: () => 'es', aplicarDatos() {} })({ de: 'estudio', id: 2, tipo: 'escena', accion: 'parar' });
    ok(sin.tipo === 'error', 'puente: un juego sin escena() contesta error');
}

// ---------- PR 5c: planos de cámara ----------
{
    ok(planosDe({ planos: 'amistad' }) === PLANOS_AMISTAD && planosDe({ planos: 'grupo' }) === PLANOS_GRUPO && planosDe({ planos: 'grupo-techo' }) === PLANOS_GRUPO_TECHO,
        'planosDe(nombre) devuelve la constante del juego');
    ok(PLANOS_AMISTAD.length === 5 && PLANOS_GRUPO.length === 5 && PLANOS_GRUPO_TECHO.length === 4, 'las constantes mantienen su cantidad de planos');
    // Los mismos números de siempre (se movieron de escena-amistad.js sin cambiarlos)
    ok(PLANOS_AMISTAD[0].dist === 3.6 && PLANOS_AMISTAD[4].alto === 2.5 && PLANOS_GRUPO[4].dist === 7.0 && PLANOS_GRUPO_TECHO[3].dist === 2.8, 'las constantes conservan sus números');
    const lista = [{ nombre: 'a', ang: 1, dist: 4, alto: 2 }];
    ok(planosDe({ planos: lista }) === lista, 'planosDe(lista) la devuelve tal cual');
    ok(planosDe(undefined) === null && planosDe({}) === null && planosDe({ planos: 'otro' }) === null && planosDe({ planos: [] }) === null, 'planosDe sin camara o con nombre que no existe: null');
    ok(opcionesCamara(undefined) === null && opcionesCamara({ planos: 'otro' }) === null, 'opcionesCamara sin camara: null');
    const og = opcionesCamara({ planos: 'grupo' });
    ok(og.planos === PLANOS_GRUPO && og.minDist === 1.6 && og.holgura === 0.5 && !('sinTerceros' in og), 'opcionesCamara(grupo)');

    // El esquema y el modelo
    const base = structuredClone(datos.escenas.punos);
    const copia = JSON.stringify(base);
    ok(validar({ version: 1, escenas: { punos: { ...base, camara: { planos: 'grupo' } } } }, 'escenas').length === 0, 'esquema: camara con nombre');
    ok(validar({ version: 1, escenas: { punos: { ...base, camara: { planos: [{ nombre: 'x', ang: 0, dist: 3, alto: 1 }] } } } }, 'escenas').length === 0, 'esquema: camara con lista');
    ok(validar({ version: 1, escenas: { punos: { ...base, camara: { planos: [{ nombre: 'x', ang: 9, dist: 3, alto: 1 }] } } } }, 'escenas').length > 0, 'esquema rechaza ang fuera de rango');
    ok(validar({ version: 1, escenas: { punos: { ...base, camara: { planos: 'techo' } } } }, 'escenas').length > 0, 'esquema rechaza un nombre de juego desconocido');

    let r = M.usarJuego(base, 'grupo');
    ok(r.cambio && r.def.camara.planos === 'grupo' && M.juegoDeCamara(r.def) === 'grupo', 'usarJuego(grupo)');
    ok(!M.usarJuego(r.def, 'grupo').cambio && !M.usarJuego(base, 'no-existe').cambio, 'usarJuego repetido o desconocido: sin cambio');
    ok(igual(M.planosDeEscena(r.def), PLANOS_GRUPO) && M.planosDeEscena(r.def)[0] !== PLANOS_GRUPO[0], 'planosDeEscena: copia de los números del juego');
    // editar un plano de un juego con nombre lo copia a lista propia, sin tocar la constante
    r = M.cambiarPlano(r.def, 1, 'dist', 5.5);
    ok(r.cambio && Array.isArray(r.def.camara.planos) && r.def.camara.planos[1].dist === 5.5 && r.def.camara.planos.length === 5, 'cambiarPlano copia la lista del juego');
    ok(PLANOS_GRUPO[1].dist === 6.4, 'las constantes del juego no se modifican');
    ok(validar({ version: 1, escenas: { punos: r.def } }, 'escenas').length === 0, 'lo que sale del modelo cumple el esquema');
    // tope de números a los límites del esquema; nombre vacío no cambia
    ok(M.cambiarPlano(r.def, 0, 'ang', 50).def.camara.planos[0].ang === 3.2 && M.cambiarPlano(r.def, 0, 'alto', -4).def.camara.planos[0].alto === 0, 'cambiarPlano recorta a los límites');
    ok(!M.cambiarPlano(r.def, 0, 'nombre', '   ').cambio && !M.cambiarPlano(r.def, 0, 'dist', NaN).cambio && !M.cambiarPlano(r.def, 9, 'dist', 3).cambio, 'cambiarPlano rechaza vacío, NaN y fuera de lista');
    // agregar hasta el tope, orden y quitar
    let d = M.usarJuego(base, 'amistad').def;
    for (let n = 5; n < M.MAX_PLANOS; n++) { const a = M.agregarPlano(d); ok(a && a.i === n, 'agregarPlano #' + (n + 1)); d = a.def; }
    ok(M.agregarPlano(d) === null, 'agregarPlano: tope de ' + M.MAX_PLANOS);
    ok(new Set(d.camara.planos.map(p => p.nombre)).size === M.MAX_PLANOS, 'los planos agregados tienen nombres distintos');
    ok(validar({ version: 1, escenas: { punos: d } }, 'escenas').length === 0, '8 planos cumplen el esquema');
    const antes = d.camara.planos.map(p => p.nombre);
    r = M.moverPlano(d, 0, 1);
    ok(r.cambio && r.i === 1 && r.def.camara.planos[1].nombre === antes[0] && r.def.camara.planos[0].nombre === antes[1], 'moverPlano baja uno');
    ok(!M.moverPlano(d, 0, -1).cambio && !M.moverPlano(d, M.MAX_PLANOS - 1, 1).cambio, 'moverPlano en el borde: sin cambio');
    r = M.quitarPlano(d, 2);
    ok(r.cambio && r.def.camara.planos.length === 7 && !r.def.camara.planos.some(p => p.nombre === antes[2]), 'quitarPlano');
    // quitar el último deja la escena sin camara propia
    let u = M.agregarPlano(base);
    ok(u.cambio && u.def.camara.planos.length === 1, 'agregarPlano en una escena sin camara empieza una lista');
    u = M.quitarPlano(u.def, 0);
    ok(u.cambio && !('camara' in u.def), 'quitar el único plano elimina camara');
    ok(JSON.stringify(base) === copia, 'el modelo no toca la escena que recibe');
}

// ---------- B3a: claves del motor genérico (estudio/DISENO.md §40): esquema, guionDeDatos y reglas ----------
{
    const catalogos = { ...nombres, personas: ['venjy', 'pony', 'lalo', 'nacho', 'lona'], grupos: ['tomatitos', 'atalaya'], iconos: ['cana'], pix: ['celular', 'concha'], sonidos: ['mar', 'foto'], codigos: ['concha-braulio'] };
    const lineasBase = [
        { q: 'n', a: 0.6, d: 2.4, texto: { es: 'Mira esto', en: 'Look at this' } },
        { q: 'j', a: 3.15, texto: { es: '¡Qué bueno!', en: 'Nice!' } },
        { q: 'pony', a: 5.6, d: 2.4, texto: { es: 'Yo también', en: 'Me too' }, ancla: { frase: 1, de: 'fin', mas: 0.15 } }
    ];
    // La escena completa: usa todas las claves nuevas
    const completa = () => ({
        tipo: 'guion', T: 12, r: 1.4, actores: { b: 'nacho' }, base: 'otra',
        dispara: { tipo: 'momento', persona: 'lona', skin: 'venjy' },
        lugar: { centro: { desde: 'b', mas: [2.65, 0, -0.5] }, jugador: { desde: 'centro', mas: [0, 0, -2.15] } },
        lineas: structuredClone(lineasBase),
        pista: { n: [['puno', 0.45, 2.4, { reloj: 0.05, escala: { pz: 1.7 }, espejo: true, ancla: { frase: 0, de: 'inicio', mas: -0.15 } }], ['risa', 3, 4.5]], j: [['asiente', 2.6, 4.4, { ancla: { frase: 1, de: 'inicio', mas: -0.55 } }]] },
        giros: { n: [[0, 'centro'], [4, 'j'], [8, 90], [10, null]] },
        caminos: { b: [[1, { hacia: 'n', dist: 1 }], [5, { desde: 'centro', mas: [1, 0, 0] }], [9, 'sitio']] },
        objetos: [
            { id: 'celu', dibujo: 'celular', en: { q: 'todos', hueso: 'brazoD', mas: [0, -0.4, 0.1] }, desde: 1.6, hasta: 7, tam: 0.5, crece: [[2, 1.5]], cambia: [[4, 'concha']], ancla: { frase: 0, de: 'fin', mas: -1.4 } },
            { id: 'caja', dibujo: { caja: [1, 1, 2], color: '#aa8855' }, en: { desde: 'centro', mas: [0, 0, 1] } }
        ],
        efectos: [[2.2, 'chispa', { en: 'n', alto: 1.2, n: 8, ancla: { frase: 0, de: 'fin', mas: -0.8 } }], [2.2, 'humo'], [6, 'corazon', { en: 'centro' }]],
        sonidos: [[1, 'mar'], [3, 'foto']],
        marcas: { llega: 3.2, vuelta: { t: 7.4, ancla: { frase: 2, de: 'inicio', mas: 1.8 } } }
    });
    const errores = (def, nom = catalogos, extra = {}) => reglasEscenas({ escenas: { nueva: def, ...extra } }, nom).filter(a => a.tipo === 'error').map(a => a.texto);
    const avisos = (def, nom = catalogos) => reglasEscenas({ escenas: { nueva: def } }, nom).filter(a => a.tipo === 'aviso' && !/sin revisar/.test(a.texto)).map(a => a.texto);
    const hay = (lista, trozo) => lista.some(t => t.includes(trozo));

    // Esquema: la completa pasa; lo mal formado no
    const enDatos = def => { const d = structuredClone(datos); d.escenas.nueva = def; return d; };
    ok(validar(enDatos(completa()), 'escenas').length === 0, 'escena B3 completa cumple el esquema: ' + validar(enDatos(completa()), 'escenas').join(' | '));
    const malo3 = (cambio, que) => { const e = completa(); cambio(e); ok(validar(enDatos(e), 'escenas').length > 0, 'debió fallar el esquema: ' + que); };
    malo3(e => { e.dispara = { tipo: 'fiesta' }; }, 'dispara con tipo desconocido');
    malo3(e => { e.dispara = { tipo: 'bienvenida' }; }, 'bienvenida sin skin');
    malo3(e => { e.dispara = { tipo: 'reencuentro', personas: ['pony'] }; }, 'reencuentro con una sola persona');
    malo3(e => { e.pista.n[0][3] = { reloj: 1, otra: 2 }; }, 'opción de tramo desconocida');
    malo3(e => { e.pista.n[1] = ['risa', 3, 4.5, {}, 1]; }, 'tramo de 5 elementos');
    malo3(e => { e.pista.n[1] = ['risa', 3, 4.5, { ancla: { frase: 0 } }]; }, 'ancla sin de');
    malo3(e => { e.objetos[0].en.hueso = 'pie'; }, 'hueso que no existe');
    malo3(e => { delete e.objetos[0].dibujo; }, 'objeto sin dibujo');
    malo3(e => { e.objetos[1].dibujo = { caja: [1, 1], color: '#aa8855' }; }, 'caja de 2 medidas');
    // B4b: el tipo puede ser un dibujo de PIX, así que «rayo» ya no lo frena el esquema sino la regla
    { const e = completa(); e.efectos[1] = [2, 'rayo']; ok(hay(errores(e), '«rayo» no es un efecto'), 'regla: efecto fuera del catálogo'); }
    { const e = completa(); e.efectos[1] = [2.2, 'celular', { en: { q: 'n', mano: 'D' }, mas: [0.5, 0, 0], vida: 1, vy: 0.2, cada: 0.2, hasta: 3, encoge: [4, 5] }]; ok(validar(enDatos(e), 'escenas').length === 0 && errores(e).length === 0, 'efecto de PIX con mano, mas, cada y encoge: ' + errores(e).join(' | ')); }
    { const e = completa(); e.efectos[1] = [2, 'celular', { cada: 0.2 }]; ok(hay(errores(e), 'cada y hasta van juntos'), 'regla: cada sin hasta'); }
    { const e = completa(); e.objetos[1].dibujo = { caja: [1, 1, 1], pix: 'nada' }; ok(hay(errores(e), '«nada» no es un dibujo de PIX'), 'regla: caja con un PIX que no existe'); }
    { const e = completa(); e.yaw = { n: { k: [[1, 0], [2, 0.3], [1.5, 0]] } }; ok(validar(enDatos(e), 'escenas').length === 0 && hay(errores(e), 'yaw.n.k'), 'yaw relativo: cumple el esquema y la regla pide claves en orden'); }
    malo3(e => { e.sonidos[0] = [1, 'mar', { nota: 'do' }]; }, 'nota de sonido que no es número');
    malo3(e => { e.sonidos[0] = [1]; }, 'sonido sin nombre');
    malo3(e => { e.caminos.b[0] = [1]; }, 'clave de camino sin destino');
    malo3(e => { e.giros.n[0] = [0]; }, 'clave de giro sin mira');
    malo3(e => { e.marcas.llega = -1; }, 'marca negativa');
    malo3(e => { e.lugar.centro = { mas: [0, 0, 0] }; }, 'lugar sin desde');
    malo3(e => { e.lugar.extra = {}; }, 'clave de más en lugar');
    // En las de «amistad» las claves nuevas no existen
    { const d = structuredClone(datos); d.escenas.punos.dispara = { tipo: 'bienvenida', skin: 'lalo' }; ok(validar(d, 'escenas').length > 0, 'debió fallar el esquema: dispara en una escena de amistad'); }

    // La completa no tiene errores con los catálogos (y los avisos son solo los esperados: ninguno)
    ok(errores(completa()).length === 0, 'la escena B3 completa no da errores: ' + errores(completa()).join(' | '));
    ok(avisos(completa()).length === 0, 'la escena B3 completa no da avisos: ' + avisos(completa()).join(' | '));
    // Sin catálogos (como en el editor sin juego) esas comprobaciones se saltan y no se rompe nada
    ok(errores(completa(), nombres).every(x => x.includes('«pony»')), 'sin catálogos no hay errores falsos (solo «pony», que sin lista de personas no se conoce): ' + errores(completa(), nombres).join(' | '));

    // dispara
    { const e = completa(); e.dispara = { tipo: 'bienvenida', skin: 'zorro' }; ok(hay(errores(e), '«zorro» no es una persona'), 'dispara: skin inexistente'); }
    { const e = completa(); e.dispara = { tipo: 'grupo', grupo: 'club' }; ok(hay(errores(e), '«club» no es un grupo'), 'dispara: grupo inexistente'); }
    { const e = completa(); e.dispara = { tipo: 'reencuentro', personas: ['pony', 'pony'] }; ok(hay(errores(e), 'la misma'), 'dispara: reencuentro de uno consigo mismo'); }
    { const e = completa(); e.dispara = { tipo: 'momento', persona: 'lona' }; ok(!hay(errores(e), 'dispara'), 'dispara: momento sin skin vale'); }
    {
        const e = completa();
        const otra = completa(); otra.dispara = { tipo: 'momento', persona: 'lona', skin: 'venjy' };
        ok(hay(errores(e, catalogos, { vieja: otra }), 'igual que el de la escena «nueva»'), 'dispara repetido es error');
        const r1 = completa(); r1.dispara = { tipo: 'reencuentro', personas: ['pony', 'lalo'] };
        const r2 = completa(); r2.dispara = { tipo: 'reencuentro', personas: ['lalo', 'pony'] };
        ok(hay(errores(r2, catalogos, { primera: r1 }), 'igual que'), 'reencuentro: el orden de las personas no importa');
        const s1 = completa(); s1.dispara = { tipo: 'momento', persona: 'lona', skin: 'pony' };
        ok(!hay(errores(s1, catalogos, { primera: e }), 'igual que'), 'dispara: con otra skin es otra escena');
    }

    // q con clave de persona (decisión 6), solo si se sabe quiénes son
    { const e = completa(); e.lineas.push({ q: 'zorro', a: 9, d: 2, texto: { es: 'Hola', en: 'Hi' } }); ok(hay(errores(e), '«zorro» no es un actor declarado'), 'frase de alguien que no existe'); }
    { const e = completa(); e.pista.lalo = [['risa', 1, 2]]; ok(errores(e).length === 0, 'pista por clave de persona vale'); ok(hay(errores(e, { ...nombres }), 'pista.lalo: actor no declarado'), 'sin catálogo de personas, una clave suelta sigue siendo error'); }

    // tiempos
    { const e = completa(); e.giros.n[2] = [3, 90]; ok(hay(errores(e), 'giros.n[2]'), 'giros desordenados'); }
    { const e = completa(); e.giros.n[3] = [12, null]; ok(hay(errores(e), 'giros.n[3]') && hay(errores(e), 'menor que T'), 'giro en T o después'); }
    { const e = completa(); e.giros.n[1] = [4, 'zorro']; ok(hay(errores(e), '«zorro» no es centro ni un actor'), 'giro hacia quien no existe'); }
    { const e = completa(); e.giros.zorro = [[1, null]]; ok(hay(errores(e), 'giros.zorro: actor no declarado'), 'giro de quien no existe'); }
    { const e = completa(); e.caminos.b[1] = [0.5, 'sitio']; ok(hay(errores(e), 'caminos.b[1]'), 'camino desordenado'); }
    { const e = completa(); e.caminos.b.pop(); ok(hay(errores(e), 'la última clave tiene que ser "sitio"'), 'camino que no vuelve al sitio'); }
    { const e = completa(); e.caminos.b[0] = [1, { hacia: 'zorro' }]; ok(hay(errores(e), '.hacia: «zorro»'), 'camino hacia quien no existe'); }
    { const e = completa(); e.caminos.b[1] = [5, { desde: 'zorro', mas: [0, 0, 0] }]; ok(hay(errores(e), '.desde: «zorro»'), 'camino desde algo que no existe'); }
    { const e = completa(); e.efectos[2] = [1, 'corazon']; ok(hay(errores(e), 'efectos[2]'), 'efectos desordenados'); }
    { const e = completa(); e.efectos.push([6, 'chispa']); ok(!hay(errores(e), 'efectos[3]'), 'dos efectos en el mismo instante valen'); }
    { const e = completa(); e.sonidos.push([12, 'mar']); ok(hay(errores(e), 'sonidos[2]') && hay(errores(e), 'menor que T'), 'sonido en T'); }
    { const e = completa(); e.sonidos[0] = [1, 'trueno']; ok(hay(errores(e), '«trueno» no existe'), 'sonido fuera del catálogo'); }
    { const e = completa(); e.efectos[0][2].en = 'zorro'; ok(hay(errores(e), 'efectos[0].en'), 'efecto en quien no existe'); }
    { const e = completa(); e.marcas.llega = 12; ok(hay(errores(e), 'marcas.llega'), 'marca en T'); }

    // objetos
    { const e = completa(); e.objetos[0].dibujo = 'cohete'; ok(hay(errores(e), '«cohete» no es un ícono'), 'dibujo fuera del catálogo'); }
    { const e = completa(); e.objetos[0].cambia = [[4, 'cohete']]; ok(hay(errores(e), 'cambia[0]'), 'cambia a un dibujo que no existe'); }
    { const e = completa(); e.objetos[1].id = 'celu'; ok(hay(errores(e), '«celu» repetido'), 'id de objeto repetido'); }
    { const e = completa(); e.objetos[0].en.q = 'zorro'; ok(hay(errores(e), 'objetos[0].en.q'), 'objeto en la mano de quien no existe'); }
    { const e = completa(); e.objetos[1].en.desde = 'zorro'; ok(hay(errores(e), 'objetos[1].en.desde'), 'objeto en el mundo desde algo que no existe'); }
    { const e = completa(); e.objetos[0].hasta = 0.5; ok(hay(errores(e), 'tiene que ser menor que hasta'), 'objeto que se ve al revés'); }
    { const e = completa(); e.objetos[0].hasta = 13; ok(hay(errores(e), 'pasa de T'), 'objeto que pasa de T'); }
    { const e = completa(); e.objetos[0].crece = [[3, 2], [2, 1]]; ok(hay(errores(e), 'crece[1]'), 'crece desordenado'); }
    { const e = completa(); e.lugar.centro.desde = 'centro'; ok(hay(errores(e), 'lugar.centro.desde'), 'el centro no parte de sí mismo'); }
    { const e = completa(); e.lugar.jugador.desde = 'zorro'; ok(hay(errores(e), 'lugar.jugador.desde'), 'jugador desde alguien que no existe'); }
    { const e = completa(); e.codigo = 'nada'; ok(hay(errores(e), '«nada» no está en CODIGO_ESCENAS'), 'codigo que no existe'); e.codigo = 'concha-braulio'; ok(errores(e).length === 0, 'codigo que existe'); }

    // anclas
    { const e = completa(); e.lineas[2].ancla.frase = 5; ok(hay(errores(e), 'no hay frase 5'), 'ancla a una frase que no existe'); }
    { const e = completa(); e.lineas[1].ancla = { frase: 1, de: 'fin' }; ok(hay(errores(e), 'solo puede depender de una frase anterior'), 'una frase no se ancla a sí misma'); }
    { const e = completa(); e.lineas[2].a = 6.5; ok(hay(avisos(e), 'lineas[2]: el número guardado (6.5)'), 'ancla que no coincide: aviso'); ok(errores(e).length === 0, 'el desajuste del ancla no es error'); }
    { const e = completa(); e.objetos[0].desde = 2; ok(hay(avisos(e), 'objetos[0]'), 'ancla de objeto desajustada'); }
    { const e = completa(); e.pista.n[0][3].ancla.mas = 1; ok(hay(avisos(e), 'pista.n[0]'), 'ancla de tramo desajustada'); }
    { const e = completa(); e.efectos[0][1] = 'humo'; e.efectos[0][0] = 1; ok(hay(avisos(e), 'efectos[0]'), 'ancla de efecto desajustada'); }
    { const e = completa(); e.marcas.vuelta.t = 5; ok(hay(avisos(e), 'marcas.vuelta'), 'ancla de marca desajustada'); }
    { const e = completa(); e.lineas[0].d = undefined; delete e.lineas[0].d; const sin = { ...catalogos, durLinea: null }; ok(reglasEscenas({ escenas: { nueva: e } }, sin).every(a => !/ancla/.test(a.texto)), 'sin durLinea no se juzga un ancla al fin'); }

    // tiempoDeAncla
    {
        const L = [{ a: 1, d: 2, texto: { es: 'x', en: 'x' } }, { a: 4, texto: { es: 'x', en: 'x' } }];
        ok(tiempoDeAncla(L, { frase: 0, de: 'inicio' }) === 1 && tiempoDeAncla(L, { frase: 0, de: 'inicio', mas: -0.5 }) === 0.5, 'tiempoDeAncla: inicio');
        ok(tiempoDeAncla(L, { frase: 0, de: 'fin', mas: 0.15 }) === 3.15, 'tiempoDeAncla: fin con d');
        ok(tiempoDeAncla(L, { frase: 1, de: 'fin' }, () => 2.5) === 6.5 && tiempoDeAncla(L, { frase: 1, de: 'fin' }) === null, 'tiempoDeAncla: fin sin d usa durLinea o da null');
        ok(tiempoDeAncla(L, { frase: 7, de: 'inicio' }) === null, 'tiempoDeAncla: frase inexistente');
    }

    // guionDeDatos: una escena sin claves nuevas sale como siempre (la forma de antes de B3)
    {
        const e = structuredClone(datos.escenas['duelo-reto']);
        const { tipo, camara, nota, lineas, ...resto } = e;
        const antes = { ...resto, ...(camara ? { camara } : {}), tipo: 'guion', lineas: lineas.map(l => ({ q: l.q, a: l.a, d: l.d !== undefined ? l.d : durLinea(l.texto), texto: l.texto })), gestos: MOLDES };
        ok(igual(guionDeDatos(e, { durLinea, moldes: MOLDES }), antes), 'guionDeDatos: sin claves nuevas, igual que antes de B3');
        ok(igual(guionDeDatos(e, { durLinea, moldes: MOLDES, personajes: catalogos.personas }), antes), 'guionDeDatos: con personajes pero sin personas usadas, igual que antes');
    }
    // guionDeDatos con todas las claves nuevas
    {
        const e = completa(), copia = JSON.stringify(e);
        const g = guionDeDatos(e, { durLinea, moldes: MOLDES, personajes: catalogos.personas });
        ok(JSON.stringify(e) === copia, 'guionDeDatos no toca la escena que recibe');
        ok(g.tipo === 'guion' && g.gestos === MOLDES && !('base' in g) && !('nota' in g), 'guionDeDatos: tipo, gestos y sin base');
        ok(g.lineas.length === 3 && g.lineas.every(l => !('ancla' in l)) && g.lineas[1].d === durLinea(e.lineas[1].texto) && g.lineas[2].d === 2.4, 'guionDeDatos: frases sin ancla y con d completado');
        ok(g.lineas[2].a === 5.6, 'guionDeDatos: corre el número guardado, no el del ancla');
        ok(igual(g.pista.n[0], ['puno', 0.45, 2.4, { reloj: 0.05, escala: { pz: 1.7 }, espejo: true }]), 'guionDeDatos: el 4.º elemento queda sin ancla');
        ok(igual(g.pista.n[1], ['risa', 3, 4.5]) && igual(g.pista.j[0], ['asiente', 2.6, 4.4]), 'guionDeDatos: un tramo con solo ancla vuelve a 3 elementos');
        ok(igual(g.giros, e.giros) && igual(g.caminos, e.caminos) && igual(g.lugar, e.lugar) && igual(g.dispara, e.dispara) && igual(g.sonidos, e.sonidos), 'guionDeDatos: giros, caminos, lugar, dispara y sonidos pasan tal cual');
        ok(igual(g.objetos[0], { id: 'celu', dibujo: 'celular', en: { q: 'todos', hueso: 'brazoD', mas: [0, -0.4, 0.1] }, desde: 1.6, hasta: 7, tam: 0.5, crece: [[2, 1.5]], cambia: [[4, 'concha']] }), 'guionDeDatos: objeto sin ancla');
        ok(igual(g.objetos[1], { id: 'caja', dibujo: { caja: [1, 1, 2], color: '#aa8855' }, en: { desde: 'centro', mas: [0, 0, 1] }, desde: 0, hasta: 12, crece: [], cambia: [] }), 'guionDeDatos: objeto con lo que falta completado (desde 0, hasta T)');
        ok(igual(g.efectos, [[2.2, 'chispa', { en: 'n', alto: 1.2, n: 8 }], [2.2, 'humo', {}], [6, 'corazon', { en: 'centro' }]]), 'guionDeDatos: efectos con opciones siempre y sin ancla');
        ok(igual(g.marcas, { llega: 3.2, vuelta: 7.4 }), 'guionDeDatos: marcas solo con su número');
        ok(igual(g.personas, ['pony']), 'guionDeDatos: personas usadas como q (' + JSON.stringify(g.personas) + ')');
        ok(JSON.stringify(g).includes('ancla') === false, 'guionDeDatos: ninguna ancla llega al motor');
        // Un objeto en `todos` o por hueso no cuenta como persona; una escena sin `personajes` no trae `personas`
        ok(!('personas' in guionDeDatos(e, { durLinea, moldes: MOLDES })), 'guionDeDatos: sin lista de personajes no hay personas');
    }
    // personasUsadas mira todas las q
    {
        const e = completa();
        e.giros.n.push([11, 'lalo']); e.caminos.lona = [[1, { hacia: 'nacho' }], [3, 'sitio']]; e.objetos[0].en.q = 'lona'; e.efectos.push([8, 'humo', { en: 'venjy' }]);
        ok(igual(personasUsadas(e, new Set(catalogos.personas)), ['lalo', 'lona', 'nacho', 'pony', 'venjy']), 'personasUsadas: frases, giros, caminos, objetos y efectos (' + JSON.stringify(personasUsadas(e, new Set(catalogos.personas))) + ')');
        ok(igual(personasUsadas(e, new Set(['pony'])), ['pony']), 'personasUsadas: solo las que son personas');
    }
}

console.log(`escenas: ${pilotos.length} pilotos, ${comparaciones} comparaciones, diferencia máxima ${difMax}`);
if (fallos) { console.log(`${fallos} fallos`); process.exit(1); }
console.log('estudio-escenas: todo bien');
