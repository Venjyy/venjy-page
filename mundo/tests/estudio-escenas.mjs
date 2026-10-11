// Prueba del Estudio, fase 5 (diseño de escenas): node mundo/tests/estudio-escenas.mjs
// escenas.json en formato estable y válido; casos inválidos que el esquema rechaza; paridad exacta de las escenas
// piloto con ANIMACIONES (los datos y, cuadro a cuadro, qué gesto suena, su u y su peso, con la misma cuenta que
// gestoDe de escena-amistad.js); y las reglas que el esquema no expresa (estudio/DISENO.md §13), que el PR 5a
// pasa a `cli.mjs validar`: tramos en orden, dentro de T, actores declarados y gestos que existen.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatear } from '../../estudio/formato.mjs';
import { validar } from '../../estudio/validar.mjs';
import { ANIMACIONES, GESTOS_AMISTAD } from '../supervivencia/escena-amistad-datos.js';
// escenas-skin.js (GESTOS) trae cuerpo.js, que escucha eventos de `window`: basta un objeto mínimo (como amistad.mjs)
globalThis.window ??= { addEventListener() {} };
const { GESTOS } = await import('../supervivencia/escenas-skin.js');
const { MOLDES } = await import('../supervivencia/moldes.js');

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
ok(indice.archivos.escenas && indice.archivos.escenas.esquema === 'escenas' && indice.archivos.escenas.lee === null, 'indice.json lista escenas (lee null hasta el PR 5a)');

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
// Contrato del PR 5a (mundo/datos/escenas.js, `animacionDeDatos`): una escena «amistad» del JSON, sin tipo, camara
// ni nota, es exactamente la entrada de ANIMACIONES. Con eso guionGenerico() arma el mismo guion.
const animacionDeDatos = def => { const { tipo, camara, nota, ...resto } = def; return resto; };
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

// ---------- 3. Reglas que el esquema no expresa (las hereda `validar` en el PR 5a) ----------
// Nombres que el juego resuelve hoy (guion.gestos con MOLDES → GESTOS_AMISTAD → GESTOS). Los de poses.json se suman
// cuando la fase 6 le ponga `lee`; hoy todos están también en el código.
const nombres = new Set([...Object.keys(GESTOS), ...Object.keys(GESTOS_AMISTAD), ...Object.keys(MOLDES)]);
ok(Object.keys(poses.gestos || {}).every(g => nombres.has(g)), 'los gestos de poses.json también existen en el código');
for (const [clave, e] of Object.entries(datos.escenas)) {
    const q0 = new Set(['n', 'j', ...Object.keys(e.actores || {})]);
    for (const [q, tramos] of Object.entries(e.pista)) {
        ok(q0.has(q), `${clave}: actor ${q} declarado`);
        let fin = 0;
        for (const [g, desde, hasta] of tramos) {
            ok(nombres.has(g), `${clave} ${q}: gesto ${g} existe`);
            ok(desde < hasta && hasta <= e.T, `${clave} ${q} ${g}: ${desde} < ${hasta} ≤ T`);
            ok(desde >= fin, `${clave} ${q} ${g}: no se superpone con el anterior`);
            fin = hasta;
        }
    }
    for (const k of ['golpes', 'corazones']) for (let i = 0; i < (e[k] || []).length; i++)
        ok(e[k][i] < e.T && (i === 0 || e[k][i] > e[k][i - 1]), `${clave}: ${k} en orden y antes de T`);
    if (e.linea) ok(e.linea[0] + e.linea[1] <= e.T, `${clave}: la frase termina antes de T`);
}

console.log(`escenas: ${pilotos.length} pilotos, ${comparaciones} comparaciones, diferencia máxima ${difMax}`);
if (fallos) { console.log(`${fallos} fallos`); process.exit(1); }
console.log('estudio-escenas: todo bien');
