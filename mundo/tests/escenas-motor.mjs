// =========================================================
// Prueba del motor genérico de escenas (Etapa B 3b, estudio/DISENO.md §40): node mundo/tests/escenas-motor.mjs
// · Las piezas puras de mundo/datos/escenas.js que usa escena-amistad.js: dispara, reparto automático, opciones del
//   tramo (reloj, escala, espejo), giros, caminos, objetos y eventos de una vez.
// · Paridad: la bienvenida de Lalo y el momento de Lona escritos a mano en JSON (escenas-paridad.json, con sus gestos en
//   formato de poses.json) dan el mismo cuadro que bienvenidas/lalo.js y momentos/lona.js cada 1/120 s: frases, gesto
//   (u, peso y metas de cada canal), golpes, corazones, sonidos, giros y objetos visibles.
// =========================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validar } from '../../estudio/validar.mjs';
import {
    guionDeDatos, reglasEscenas, escenaQueDispara, amigoDeEscena, repartoDe, repartirGuion, tramoEn, metaTramo, claveEn,
    valorEn, caminoEn, objetoEn, eventosEn, sonidosDeEscena
} from '../datos/escenas.js';
import { funcionGesto } from '../datos/gestos.js';

// escenas-skin.js (GESTOS) trae cuerpo.js, que escucha eventos de `window`: basta un objeto mínimo
globalThis.window ??= { addEventListener() {} };
const { GESTOS } = await import('../supervivencia/escenas-skin.js');
const { GESTOS_AMISTAD } = await import('../supervivencia/escena-amistad-datos.js');
const { MOLDES, desplazar, espejo, SONIDOS } = await import('../supervivencia/moldes.js');
const { durLinea } = await import('../supervivencia/reencuentros.js');
const { PERSONAJES, GRUPOS } = await import('../supervivencia/amistad.js');
const { CODIGO_ESCENAS } = await import('../supervivencia/codigo-escenas.js');
const { sonidos } = await import('../supervivencia/sonidos.js');

const aqui = path.dirname(fileURLToPath(import.meta.url));
let fallos = 0, pruebas = 0;
const ok = (c, m) => { pruebas++; if (!c) { fallos++; console.error('✗ ' + m); } };
const cerca = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;

// ---------- 1. Piezas puras ----------
const esc = {
    a: { tipo: 'guion', dispara: { tipo: 'momento', persona: 'lona' } },
    b: { tipo: 'guion', dispara: { tipo: 'momento', persona: 'lona', skin: 'venjy' } },
    c: { tipo: 'guion', dispara: { tipo: 'reencuentro', personas: ['pony', 'salonas'] } },
    d: { tipo: 'guion', dispara: { tipo: 'bienvenida', skin: 'lalo' } },
    e: { tipo: 'guion', dispara: { tipo: 'grupo', grupo: 'tomatitos' } },
    f: { tipo: 'amistad', dispara: { tipo: 'bienvenida', skin: 'pony' } }
};
ok(escenaQueDispara(esc, { tipo: 'momento', persona: 'lona', skin: 'venjy' }) === 'b', 'dispara: con skin gana a sin skin');
ok(escenaQueDispara(esc, { tipo: 'momento', persona: 'lona', skin: 'pony' }) === 'a', 'dispara: sin skin vale para cualquiera');
ok(escenaQueDispara(esc, { tipo: 'momento', persona: 'andy', skin: 'pony' }) === null, 'dispara: otra persona no');
ok(escenaQueDispara(esc, { tipo: 'reencuentro', skin: 'salonas', persona: 'pony' }) === 'c', 'dispara: el reencuentro no tiene orden');
ok(escenaQueDispara(esc, { tipo: 'bienvenida', skin: 'lalo' }) === 'd' && escenaQueDispara(esc, { tipo: 'bienvenida', skin: 'pony' }) === null, 'dispara: bienvenida por skin (solo escenas «guion»)');
ok(escenaQueDispara(esc, { tipo: 'grupo', grupo: 'tomatitos', skin: 'pony' }) === 'e', 'dispara: grupo');
ok(escenaQueDispara(null, { tipo: 'grupo' }) === null, 'dispara: sin escenas, null');

ok(amigoDeEscena({}, esc.d.dispara, 'lalo') === 'venjy' && amigoDeEscena({}, esc.a.dispara, 'pony') === 'lona', 'amigo: bienvenida y momento');
ok(amigoDeEscena({}, esc.c.dispara, 'pony') === 'salonas' && amigoDeEscena({}, esc.c.dispara, 'salonas') === 'pony', 'amigo: el otro del reencuentro');
const miembros = GRUPOS.tomatitos.miembros;
ok(amigoDeEscena({ lugar: { centro: { desde: miembros[1] } } }, esc.e.dispara, miembros[0], miembros) === miembros[1], 'amigo: en grupo, de quien parte el centro');
ok(amigoDeEscena({ lineas: [{ q: miembros[0] }, { q: miembros[2] }] }, esc.e.dispara, miembros[0], miembros) === miembros[2], 'amigo: en grupo, el primero que sale y no es tu skin');

const rep = repartoDe(['andy', 'pony', 'hadad'], 'andy', 'pony', { x: 'nacho' });
ok(JSON.stringify(rep.reparto) === '{"andy":"n","pony":"j"}' && rep.actores.hadad === 'hadad' && rep.actores.x === 'nacho', 'reparto: amigo n, skin j, el resto actor extra');
const rg = repartirGuion({ reparto: { andy: 'n', pony: 'j' }, lineas: [{ q: 'pony' }], pista: { andy: [] }, giros: { pony: [[0, 'andy']] }, caminos: { andy: [[0, { hacia: 'pony', dist: 1 }], [1, 'sitio']] },
    objetos: [{ en: { q: 'andy', hueso: 'brazoD' } }, { en: { desde: 'pony' } }], efectos: [[1, 'chispa', { en: 'andy' }], [2, 'humo']], lugar: { centro: { desde: 'andy' }, jugador: { desde: 'centro' } } });
ok(rg.lineas[0].q === 'j' && rg.pista.n && rg.giros.j[0][1] === 'n' && rg.caminos.n[0][1].hacia === 'j' && rg.objetos[0].en.q === 'n' && rg.objetos[1].en.desde === 'j'
    && rg.efectos[0][2].en === 'n' && rg.efectos[1][2] === undefined && rg.lugar.centro.desde === 'n' && rg.lugar.jugador.desde === 'centro', 'reparto: llega a frases, pistas, giros, caminos, objetos, efectos y lugar');
const sinRep = { lineas: [] };
ok(repartirGuion(sinRep) === sinRep, 'reparto: sin reparto, el mismo guion');

// Opciones del tramo = lo que hacían desplazar, con y espejo de moldes.js
const buscar = g => MOLDES[g] || GESTOS_AMISTAD[g] || null;
const info = { s: false, otroS: false, j: false, esc: 1 };
let iguales = true;
for (let t = 4; t < 9; t += 0.07) {
    const tr = tramoEn([['secreto', 4, 8.6, { reloj: 3.6 }]], t);
    if (!tr) continue;
    const a = metaTramo(tr, t, info, buscar), b = desplazar('secreto', 3.6)(tr.u, t, info);
    for (const k of Object.keys(b)) if (!cerca(a[k], b[k])) iguales = false;
    const e1 = metaTramo({ ...tr, g: 'abrazo', op: { espejo: true, escala: { pz: 2 } } }, t, info, buscar), e2 = espejo('abrazo')(tr.u, t, info);
    for (const k of Object.keys(e2)) if (!cerca(e1[k], k === 'pz' ? e2[k] * 2 : e2[k])) iguales = false;
}
ok(iguales, 'tramo: reloj = desplazar; espejo y escala = espejo() y pz × k');
ok(tramoEn([['habla', 1, 2]], 0.5) === null && tramoEn([['habla', 1, 2]], 2) === null && tramoEn([['habla', 1, 2]], 1.5).op === null, 'tramo: fuera del tramo null; sin opciones op null');

ok(claveEn([[1, 'a'], [3, 'b']], 0.5) === undefined && claveEn([[1, 'a'], [3, 'b']], 2)[1] === 'a' && claveEn([[1, 'a'], [3, 'b']], 3)[1] === 'b', 'claveEn: la última que ya pasó');
ok(valorEn(null, 2) === 1 && valorEn([[1, 0], [3, 1]], 0) === 0 && cerca(valorEn([[1, 0], [3, 1]], 2), 0.5) && valorEn([[1, 0], [3, 1]], 9) === 1, 'valorEn: extremos y suavizado');
const puntos = { sitio: { x: 0, y: 0, z: 0 }, lejos: { x: 4, y: 0, z: 0 } };
const pt = a => puntos[typeof a === 'string' ? a : 'lejos'];
const cam = [[1, 'sitio'], [3, { desde: 'centro' }], [5, 'sitio']];
const c0 = caminoEn(cam, 0.5, pt), c1 = caminoEn(cam, 2, pt), c2 = caminoEn(cam, 3.5, pt), c3 = caminoEn(cam, 6, pt);
ok(c0.x === 0 && c0.rumbo === null && cerca(c1.x, 2) && cerca(c1.rumbo, Math.PI / 2) && c2.x < 4 && cerca(c2.rumbo, -Math.PI / 2) && c3.x === 0 && c3.rumbo === null, 'caminos: ida, vuelta y rumbo hacia donde camina');
ok(caminoEn(null, 1, pt) === null && caminoEn([[0, 'sitio'], [1, 'nadie']], 0.5, a => (a === 'sitio' ? puntos.sitio : null)) === null, 'caminos: sin claves o sin punto, null');
const ob = { dibujo: 'a', desde: 1, hasta: 3, crece: [[1, 0], [2, 1]], cambia: [[2, 'b']] };
ok(!objetoEn(ob, 0.5).visible && objetoEn(ob, 1).visible && !objetoEn(ob, 3).visible && objetoEn(ob, 1.5).dibujo === 'a' && objetoEn(ob, 2.5).dibujo === 'b' && objetoEn(ob, 2.5).escala === 1, 'objetos: se ven entre desde y hasta, crecen y cambian');
const hechos = new Set();
ok(eventosEn([[1, 'x'], [1, 'y']], 0.99, 1.01, hechos, 's').length === 2 && eventosEn([[1, 'x']], 1.01, 1.02, hechos, 's').length === 0, 'eventos: una vez cada uno (también dos en el mismo instante)');
ok(eventosEn([[1, 'x']], 2, 2.01, new Set(), 's').length === 0, 'eventos: un salto adelante que lo pasa por más de 0.3 s no lo toca');
const cat = sonidosDeEscena(SONIDOS, sonidos);
ok(typeof cat.golpe === 'function' && typeof cat.mar === 'function' && !('golpeBloque' in cat), 'sonidos: SONIDOS y los del juego sin argumentos');
ok(CODIGO_ESCENAS && typeof CODIGO_ESCENAS === 'object' && Object.values(CODIGO_ESCENAS).every(f => typeof f === 'function'), 'CODIGO_ESCENAS: nombre -> función que carga el módulo');

// ---------- 2. El JSON de paridad cumple los esquemas y las reglas ----------
const paridad = JSON.parse(fs.readFileSync(path.join(aqui, 'escenas-paridad.json'), 'utf8'));
ok(validar(paridad.escenas, 'escenas').length === 0, 'escenas-paridad.json: las escenas cumplen su esquema ' + JSON.stringify(validar(paridad.escenas, 'escenas').slice(0, 3)));
ok(validar(paridad.poses, 'poses').length === 0, 'escenas-paridad.json: los gestos cumplen el esquema de poses ' + JSON.stringify(validar(paridad.poses, 'poses').slice(0, 3)));
const propios = Object.keys(paridad.poses.gestos);
const nombres = { gestos: new Set([...Object.keys(GESTOS), ...Object.keys(GESTOS_AMISTAD), ...Object.keys(MOLDES), ...propios]), animaciones: new Set(), durLinea,
    personas: new Set(PERSONAJES), grupos: new Set(Object.keys(GRUPOS)), iconos: new Set(), pix: new Set(), sonidos: new Set(Object.keys(cat)), codigos: new Set(Object.keys(CODIGO_ESCENAS)) };
const errores = reglasEscenas(paridad.escenas, nombres).filter(p => p.tipo === 'error');
ok(errores.length === 0, 'escenas-paridad.json: sin errores de reglas ' + JSON.stringify(errores.slice(0, 3)));

// ---------- 3. Paridad cuadro a cuadro ----------
// Gestos propios del JSON: como en el juego, aplicarPoses los suma a GESTOS (firma skin: u, t, s, j)
const posesFn = Object.fromEntries(Object.entries(paridad.poses.gestos).map(([k, d]) => [k, funcionGesto(d, 'skin')]));
const deSkin = f => (u, t, i) => f(u, t, i.s, i.j);
const buscador = gestos => g => (gestos && gestos[g]) || GESTOS_AMISTAD[g] || (posesFn[g] && deSkin(posesFn[g])) || (GESTOS[g] && deSkin(GESTOS[g])) || null;

// Un api de mentira para correr extra.iniciar / extra.cuadro de los JS: cuenta sonidos y sabe qué objeto se ve
function apiFalsa(e) {
    const grupo = {}, huesos = { n: { brazoD: {}, brazoI: {} }, j: { cuerpo: {} } };
    const objeto = () => ({ visible: true, parent: null, scale: { set() {}, setScalar() {} }, position: { set() {} }, rotation: { set() {} } });
    const creados = [];
    const api = {
        e, grupo, THREE: { Vector3: class { constructor() { this.x = 0; this.y = 0; this.z = 0; } } },
        caja() { const o = objeto(); creados.push(o); return o; },
        pegar(o, q, h) { o.parent = q ? huesos[q][h] : grupo; return o; },
        soltar(o) { o.parent = grupo; return o; },
        punta: () => ({ x: 0, y: 0, z: 0 }),
        actor: q => ({ p: huesos[q] }),
        sonidos: { golpe() { e.sonidos++; } }
    };
    return { api, creados };
}

const fmt = v => (v === undefined ? '-' : JSON.stringify(v));
function paridadDe(nombre, js, clave, contexto, idsJS = []) {
    const def = paridad.escenas.escenas[clave];
    const amigo = amigoDeEscena(def, def.dispara, contexto.skin);
    let d = guionDeDatos(def, { durLinea, moldes: MOLDES, personajes: PERSONAJES });
    const r = repartoDe(d.personas, amigo, contexto.skin, d.actores);
    d = repartirGuion({ ...d, reparto: r.reparto, actores: r.actores });
    ok(js.T === d.T && js.r === d.r, `${nombre}: T y r (${js.T}/${d.T}, ${js.r}/${d.r})`);
    ok(fmt(js.golpes || []) === fmt(d.golpes || []) && fmt(js.corazones || []) === fmt(d.corazones || []), `${nombre}: golpes y corazones`);
    ok(!js.yaw && !d.giros && !d.caminos, `${nombre}: sin giros ni caminos en los dos`);
    ok(Object.keys(r.actores).length === 0 && Object.keys(js.actores || {}).length === 0, `${nombre}: sin actores extra`);
    const bJS = buscador(js.gestos), bD = buscador(d.gestos);
    const e = { t: 0, sonidos: 0 }, { api, creados } = apiFalsa(e);
    if (js.extra && js.extra.iniciar) js.extra.iniciar(api);
    const hechos = new Set();
    let malos = 0, cuadros = 0;
    const malo = m => { if (malos++ < 6) console.error(`  ${nombre}: ${m}`); };
    let t0 = 0;
    for (let k = 0; k / 120 < js.T; k++) {
        const t = k / 120;
        e.t = t; cuadros++;
        // Frases que se ven
        const frases = g => g.lineas.filter(l => t >= l.a && t < l.a + l.d).map(l => l.q + ':' + l.texto.es).join('|');
        if (frases(js) !== frases(d)) malo(`t=${t.toFixed(3)} frases ${frases(js)} ≠ ${frases(d)}`);
        // Gesto: u, peso y metas de cada canal
        for (const q of ['n', 'j']) {
            const a = tramoEn(js.pista[q], t), b = tramoEn(d.pista[q], t);
            // Un borde a menos de 1e-9 s no cuenta: el JS suma tiempos (f(5) = 23.200000000000003) y el JSON guarda 23.2
            const enBorde = (tr, p) => tr && (p[q] || []).some(x => x[0] === tr.g && (cerca(x[1], t) || cerca(x[2], t)));
            if (!a !== !b) { if (!enBorde(a, js.pista) && !enBorde(b, d.pista)) malo(`t=${t.toFixed(3)} ${q}: tramo ${a && a.g} ≠ ${b && b.g}`); continue; }
            if (!a) continue;
            if (!cerca(a.u, b.u) || !cerca(a.w, b.w)) malo(`t=${t.toFixed(3)} ${q}: u/w ${a.u}/${a.w} ≠ ${b.u}/${b.w}`);
            const i = { s: false, otroS: false, j: q === 'j', esc: 1 };
            const ma = { ...metaTramo(a, t, i, bJS) }, mb = { ...metaTramo(b, t, i, bD) };
            for (const c of new Set([...Object.keys(ma), ...Object.keys(mb)])) if (!(ma[c] === mb[c] || cerca(ma[c], mb[c]))) malo(`t=${t.toFixed(3)} ${q} ${a.g}/${b.g}.${c}: ${ma[c]} ≠ ${mb[c]}`);
        }
        // Sonidos de una vez
        const antes = e.sonidos;
        if (js.extra && js.extra.cuadro) js.extra.cuadro(api, 1 / 120);
        const sJS = e.sonidos - antes, sD = eventosEn(d.sonidos, t0, t, hechos, 's').length;
        if (sJS !== sD) malo(`t=${t.toFixed(3)} sonidos ${sJS} ≠ ${sD}`);
        // Objetos visibles
        const vJS = creados.map((o, i) => (o.visible ? idsJS[i] : null)).filter(Boolean).sort().join(',');
        const vD = (d.objetos || []).filter(o => objetoEn(o, t).visible).map(o => o.id).sort().join(',');
        if (vJS !== vD) malo(`t=${t.toFixed(3)} objetos ${vJS} ≠ ${vD}`);
        t0 = t;
    }
    ok(malos === 0, `${nombre}: mismo cuadro que el JS cada 1/120 s (${cuadros} cuadros, ${malos} distintos)`);
    return cuadros;
}

const { bienvenida } = await import('../supervivencia/bienvenidas/lalo.js');
const { momento } = await import('../supervivencia/momentos/lona.js');
const cLalo = paridadDe('Lalo (bienvenida)', bienvenida({ idioma: 'es' }), 'lalo-bienvenida', { skin: 'lalo' });
const cLona = paridadDe('Lona (momento)', momento({ base: 'pony' }), 'lona-bufanda', { skin: 'pony' }, ['tejida', 'agujaD', 'agujaI', 'anillo', 'punta']);
// El JSON disparado: la escena de Lalo la elige su bienvenida y la de Lona su momento con cualquier skin menos la de pareja
ok(escenaQueDispara(paridad.escenas.escenas, { tipo: 'bienvenida', skin: 'lalo' }) === 'lalo-bienvenida', 'paridad: la bienvenida de Lalo la dispara su skin');
ok(escenaQueDispara(paridad.escenas.escenas, { tipo: 'momento', persona: 'lona', skin: 'pony' }) === 'lona-bufanda', 'paridad: el momento de Lona lo dispara su persona');

// ---------- 4. El motor real con escenas del JSON ----------
// escena-amistad.js con un DOM mínimo y personas de cajas falsas (como amistad.mjs). Sin frases: los globos piden el DOM
// entero. Los cargadores eligen la escena del JSON por su `dispara`, y lugar, caminos, giros, objetos y efectos corren y se
// deshacen al terminar.
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
    const SITIOS = { hadad: [721.85, 25, 538, 1.57], andy: [725.3, 25, 539.6, 3.14], nacho: [727.15, 25, 538, -1.57], lona: [600, 25, 500, 0], venjy: [400, 25, 400, 0] };
    const personas = Object.entries(SITIOS).map(([clave, [x, y, z, yaw]]) => ({ clave, x, y, z, yaw, p: rig() }));
    const jugador = { pos: { x: 724, y: 73, z: 536 }, yaw: 0, pitch: 0, colocar(x, y, z) { this.pos.x = x; this.pos.y = y; this.pos.z = z; } };
    const camaras = { cuerpo: rig(), iniciarCine() {}, terminarCine() {}, nuevaLinea() {}, enfocar() {}, set pose(f) {}, set manual(f) { this.m = f; } };
    const grupo = new THREE.Group();
    const motor = crearEscenaAmistad({ grupo, dy: 48, mundo: { bloque: () => 0 }, jugador, camara: new THREE.PerspectiveCamera(), camaras, misiones: {},
        personas: () => personas, personaDe: c => personas.find(n => n.clave === c) || null, bloquear() {}, liberar() {}, base: () => 'pony' });
    const foto = () => JSON.stringify(personas.map(n => [n.clave, n.x, n.y, n.z, n.yaw]));
    const sinFrases = d => ({ ...d, lineas: [] });
    const fogata = {
        tipo: 'guion', dispara: { tipo: 'grupo', grupo: 'tomatitos', skin: 'andy' }, T: 4, r: 1.3, lineas: [],
        pista: { hadad: [['secreto', 0.4, 2.0, { reloj: 0, espejo: true }]], nacho: [['habla', 0.2, 3.5]] },
        lugar: { centro: { desde: 'hadad', mas: [2.65, 0, -0.5] }, jugador: { desde: 'centro', mas: [0, 0, -2.15] } },
        caminos: { nacho: [[0.5, 'sitio'], [1.5, { hacia: 'hadad', dist: 1 }], [2.5, { desde: 'centro', mas: [1, 0, 0] }], [3.5, 'sitio']] },
        giros: { hadad: [[0.2, 'centro'], [1.0, 90], [2.0, null]], andy: [[0.3, 'nacho']] },
        objetos: [{ id: 'celu', dibujo: 'celular', en: { q: 'todos', hueso: 'brazoD', mas: [0, -0.7, 0.1] }, desde: 0.5, hasta: 3, cambia: [[2, 'visto']] },
            { id: 'caja', dibujo: { caja: [0.3, 0.3, 0.3], color: '#aa5522' }, en: { desde: 'centro', mas: [0, 0.5, 0] }, crece: [[0, 0.2], [1, 1]] }],
        efectos: [[1, 'humo', { en: 'centro', n: 3 }], [1.2, 'nieve', { en: 'nacho' }], [1.4, 'chispa']],
        sonidos: [[1, 'golpe'], [1.1, 'mar']]
    };
    const nombresB = { ...nombres, pix: new Set(['celular', 'visto']) };
    ok(reglasEscenas({ version: 1, escenas: { fogata } }, nombresB).filter(p => p.tipo === 'error').length === 0, 'motor: la escena de prueba del grupo cumple las reglas ' + JSON.stringify(reglasEscenas({ version: 1, escenas: { fogata } }, nombresB).filter(p => p.tipo === 'error').slice(0, 2)));
    const conFrase = { ...fogata, lineas: [{ q: 'hadad', a: 0.5, texto: { es: 'Hola', en: 'Hi' } }] }; // el esquema pide una frase; el motor la corre sin ellas
    ok(validar({ version: 1, escenas: { fogata: conFrase } }, 'escenas').length === 0, 'motor: la escena de prueba del grupo cumple el esquema ' + JSON.stringify(validar({ version: 1, escenas: { fogata: conFrase } }, 'escenas').slice(0, 3)));
    aplicarDatosVivos({ version: 1, escenas: { 'lona-bufanda': sinFrases(paridad.escenas.escenas['lona-bufanda']), 'lalo-bienvenida': sinFrases(paridad.escenas.escenas['lalo-bienvenida']), fogata } });

    // Momento de Lona desde el JSON: sus cinco objetos aparecen y desaparecen a su hora y se borran al terminar
    const antes = foto(), hijos0 = grupo.children.length;
    ok(await motor.momento('lona', null, { base: 'pony' }) === true && motor.escena.datos === 'lona-bufanda' && motor.escena.tipo === 'momento', 'motor: momento(lona) corre la escena del JSON');
    const vistos = [];
    for (let x = 0; motor.activa; x += 0.05) {
        motor.actualizar(0.05);
        if (Math.abs(x - 3) < 0.03 || Math.abs(x - 9) < 0.03) vistos.push(motor.actores.n.p.brazoD.children.filter(o => o.isMesh && o.visible).length + "/" + camaras.cuerpo.cuerpo.children.filter(o => o.isMesh && o.visible).length);
    }
    ok(vistos.join(' ') === '2/0 0/2', `motor: tejida y aguja en la mano de Lona y luego la bufanda en el jugador (${vistos.join(' ')})`);
    ok(motor.actores === null && foto() === antes && grupo.children.length === hijos0 && !camaras.cuerpo.cuerpo.children.some(o => o.isMesh), 'motor: al terminar no queda ningún objeto y todos están en su sitio');

    // La bienvenida de Lalo desde el JSON: venjy es 'n' y lalo (tu skin) es 'j'
    ok(await motor.bienvenida('lalo') === true && motor.escena.datos === 'lalo-bienvenida' && motor.actores.n.clave === 'venjy' && !motor.actores.lalo, 'motor: bienvenida(lalo) corre la del JSON con el reparto automático');
    motor.saltar();
    ok(await motor.bienvenida('pony') === false || motor.escena.datos === null, 'motor: sin escena en el JSON, la de JS');
    if (motor.activa) motor.saltar();

    // Grupo: lugar, caminos, giros, objetos para todos, efectos y sonidos
    const antesG = foto();
    ok(await motor.grupo('tomatitos', 'andy') === true && motor.escena.datos === 'fogata' && motor.escena.clave === 'hadad', 'motor: grupo(tomatitos, andy) corre la del JSON con hadad de ancla');
    const hadad = personas.find(n => n.clave === 'hadad'), nacho = personas.find(n => n.clave === 'nacho');
    const centro = { x: hadad.x + 2.65, z: hadad.z - 0.5 };
    ok(Math.abs(jugador.pos.x - centro.x) < 1e-9 && Math.abs(jugador.pos.z - (centro.z - 2.15)) < 1e-9 && jugador.pos.y === 73, 'motor: el jugador queda donde dice lugar.jugador (desde el centro)');
    ok(!!motor.actores.nacho && Object.keys(motor.actores).sort().join() === 'j,n,nacho', 'motor: nacho entra solo como actor extra; andy es el jugador');
    let maxD = 0, giro90 = false, celus = 0, efectosMax = 0;
    for (let x = 0; motor.activa; x += 1 / 60) {
        motor.actualizar(1 / 60);
        if (!motor.activa) break;
        maxD = Math.max(maxD, Math.hypot(nacho.x - SITIOS.nacho[0], nacho.z - SITIOS.nacho[2]));
        if (x > 1.8 && x < 1.95) giro90 = Math.abs(hadad.yaw - Math.PI / 2) < 0.05;
        if (Math.abs(x - 1) < 0.01) celus = Object.values(motor.actores).filter(a => a.p.brazoD.children.some(o => o.visible)).length;
        efectosMax = Math.max(efectosMax, grupo.children.filter(o => o.isSprite).length);
    }
    ok(maxD > 1, `motor: nacho camina (se alejó ${maxD.toFixed(2)} bloques de su sitio)`);
    ok(giro90, 'motor: hadad gira a los 90° del mundo que dice su giro');
    ok(celus === 3, `motor: un celular en la mano de cada uno de los tres (${celus})`);
    ok(efectosMax >= 5, `motor: salen humo, nieve y chispa (${efectosMax} sprites a la vez)`);
    ok(foto() === antesG && grupo.children.length === hijos0, 'motor: al terminar el grupo, todos en su sitio y sin objetos ni efectos');
    aplicarDatosVivos(null);
}

console.log(`escenas-motor: ${pruebas - fallos}/${pruebas} bien (paridad: ${cLalo} + ${cLona} cuadros)`);
if (fallos) process.exit(1);
