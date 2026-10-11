// Prueba del Estudio, fase 5 (diseño de escenas): node mundo/tests/estudio-escenas.mjs
// escenas.json en formato estable y válido; casos inválidos que el esquema rechaza; paridad exacta de las escenas
// piloto con ANIMACIONES (los datos y, cuadro a cuadro, qué gesto suena, su u y su peso, con la misma cuenta que
// gestoDe de escena-amistad.js); las reglas que el esquema no expresa (estudio/DISENO.md §13, mundo/datos/escenas.js,
// las mismas de `cli.mjs validar`); y el PR 5a: el motor real fusiona los datos (y sin ellos usa el código) y una
// escena de guion se completa con durLinea y se juega con jugarGuion.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatear } from '../../estudio/formato.mjs';
import { validar } from '../../estudio/validar.mjs';
import { ANIMACIONES, GESTOS_AMISTAD } from '../supervivencia/escena-amistad-datos.js';
import { fusionar } from '../datos/cargador.js';
import { animacionDeDatos, guionDeDatos, reglasEscenas } from '../datos/escenas.js';
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
// Nombres que el juego resuelve hoy (guion.gestos con MOLDES → GESTOS_AMISTAD → GESTOS). Los de poses.json se suman
// cuando la fase 6 le ponga `lee`; hoy todos están también en el código.
const nombres = { gestos: new Set([...Object.keys(GESTOS), ...Object.keys(GESTOS_AMISTAD), ...Object.keys(MOLDES)]), animaciones: new Set(Object.keys(ANIMACIONES)), durLinea };
ok(Object.keys(poses.gestos || {}).every(g => nombres.gestos.has(g)), 'los gestos de poses.json también existen en el código');
{
    const r = reglasEscenas(datos, nombres);
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
    ok(!('camara' in g) && !('nota' in g) && g.tipo === 'guion', 'guionDeDatos: sin camara ni nota');
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
    const camaras = { cuerpo: rig(), iniciarCine() {}, terminarCine() {}, nuevaLinea() {}, enfocar() {}, set pose(f) {}, set manual(f) {} };
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
    ok(motor.guiones().join() === 'prueba', 'guiones() lista la escena de guion');
    r = await jugar(async () => motor.jugarGuion('prueba'));
    ok(r.r === true && r.T === 6 && r.tipo === 'guion', 'jugarGuion sin persona (la más cercana): empieza');
    ok(personas[0].escena === undefined && personas[1].escena === undefined, 'jugarGuion: al terminar nadie queda en escena');
    r = await jugar(async () => motor.jugarGuion('prueba', 'andy'));
    ok(r.r === true, 'jugarGuion con persona: empieza');
    ok((await jugar(async () => motor.jugarGuion('noexiste'))).r === false, 'jugarGuion de una clave que no existe: false');
    ok((await jugar(async () => motor.jugarGuion('punos'))).r === false, 'jugarGuion no juega una escena de tipo amistad');
    aplicarDatosVivos(null);
}

console.log(`escenas: ${pilotos.length} pilotos, ${comparaciones} comparaciones, diferencia máxima ${difMax}`);
if (fallos) { console.log(`${fallos} fallos`); process.exit(1); }
console.log('estudio-escenas: todo bien');
