// =========================================================
// Prueba de B4b (estudio/DISENO.md §40): las bienvenidas migradas a escenas.json (y sus gestos a poses.json) dan el mismo
// cuadro que bienvenidas/<clave>.js: node mundo/tests/escenas-bienvenidas.mjs
// Cada 1/120 s compara frases que se ven, tramo de cada actor (u, peso y metas de cada canal), sonidos y T, r, golpes y
// corazones. Además: esquema, reglas y que cada escena la elija su `dispara`.
// =========================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validar } from '../../estudio/validar.mjs';
import { guionDeDatos, reglasEscenas, escenaQueDispara, amigoDeEscena, repartoDe, repartirGuion, tramoEn, metaTramo, eventosEn, sonidosDeEscena } from '../datos/escenas.js';
import { funcionGesto } from '../datos/gestos.js';
import { BIENVENIDAS, escenaDeBienvenida } from '../../estudio/migrar-bienvenidas.mjs';

globalThis.window ??= { addEventListener() {} };
const aviso = console.warn;
console.warn = (...m) => { if (!String(m[0]).startsWith('[datos]')) aviso(...m); };
const { GESTOS } = await import('../supervivencia/escenas-skin.js');
const { GESTOS_AMISTAD } = await import('../supervivencia/escena-amistad-datos.js');
const { MOLDES, SONIDOS } = await import('../supervivencia/moldes.js');
const { durLinea } = await import('../supervivencia/reencuentros.js');
const { PERSONAJES, GRUPOS } = await import('../supervivencia/amistad.js');
const { CODIGO_ESCENAS } = await import('../supervivencia/codigo-escenas.js');
const { sonidos } = await import('../supervivencia/sonidos.js');
console.warn = aviso;

const aqui = path.dirname(fileURLToPath(import.meta.url));
const leer = f => JSON.parse(fs.readFileSync(path.join(aqui, '..', 'datos', f), 'utf8'));
const datos = leer('escenas.json'), poses = leer('poses.json');
let fallos = 0, pruebas = 0;
const ok = (c, m) => { pruebas++; if (!c) { fallos++; console.error('✗ ' + m); } };
const cerca = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;

ok(validar(datos, 'escenas').length === 0, 'escenas.json cumple el esquema ' + JSON.stringify(validar(datos, 'escenas').slice(0, 3)));
ok(validar(poses, 'poses').length === 0, 'poses.json cumple el esquema ' + JSON.stringify(validar(poses, 'poses').slice(0, 3)));
const cat = sonidosDeEscena(SONIDOS, sonidos);
const nombres = { gestos: new Set([...Object.keys(GESTOS), ...Object.keys(GESTOS_AMISTAD), ...Object.keys(MOLDES), ...Object.keys(poses.gestos || {})]), animaciones: new Set(), durLinea,
    personas: new Set(PERSONAJES), grupos: new Set(Object.keys(GRUPOS)), iconos: new Set(), pix: new Set(), sonidos: new Set(Object.keys(cat)), codigos: new Set(Object.keys(CODIGO_ESCENAS)) };
const errores = reglasEscenas(datos, nombres).filter(p => p.tipo === 'error');
ok(errores.length === 0, 'escenas.json: sin errores de reglas ' + JSON.stringify(errores.slice(0, 3)));

const posesFn = Object.fromEntries(Object.entries(poses.gestos).map(([k, d]) => [k, funcionGesto(d, 'skin')]));
const deSkin = f => (u, t, i) => f(u, t, i.s, i.j);
const buscador = gestos => g => (gestos && gestos[g]) || GESTOS_AMISTAD[g] || (posesFn[g] && deSkin(posesFn[g])) || (GESTOS[g] && deSkin(GESTOS[g])) || null;

let cuadros = 0;
for (const k of BIENVENIDAS) {
    const nombre = 'bienvenida-' + k;
    const def = datos.escenas[nombre];
    ok(!!def, `${nombre}: está en escenas.json`);
    if (!def) continue;
    const mod = await import(`../supervivencia/bienvenidas/${k}.js`);
    const { escena } = escenaDeBienvenida(k, mod);
    const { revisado, ...guardada } = def;
    if (JSON.stringify(guardada) !== JSON.stringify(escena)) console.log(`  aviso: ${nombre} ya no es el que da el script (¿lo ajustó el dueño?)`);
    ok(escenaQueDispara(datos.escenas, { tipo: 'bienvenida', skin: k }) === nombre && amigoDeEscena(def, def.dispara, k) === 'venjy', `${nombre}: la elige su dispara`);

    const js = mod.bienvenida({ idioma: 'es' });
    let d = guionDeDatos(def, { durLinea, moldes: MOLDES, personajes: PERSONAJES });
    const r = repartoDe(d.personas, 'venjy', k, d.actores);
    d = repartirGuion({ ...d, reparto: r.reparto, actores: r.actores });
    ok(js.T === d.T && js.r === d.r, `${nombre}: T y r`);
    ok(JSON.stringify(js.golpes || []) === JSON.stringify(d.golpes || []) && JSON.stringify(js.corazones || []) === JSON.stringify(d.corazones || []), `${nombre}: golpes y corazones`);
    ok(!js.yaw && !d.giros && !d.caminos && !(d.objetos || []).length, `${nombre}: sin giros, caminos ni objetos`);

    // Sonidos del JS: api.sonidos.golpe y SONIDOS.bajo cuentan por cuadro
    const e = { t: 0, sonidos: 0, hechos: new Set() };
    const api = { e, sonidos: { golpe() { e.sonidos++; } } };
    const bajo = SONIDOS.bajo; SONIDOS.bajo = () => { e.sonidos++; };
    const bJS = buscador(js.gestos), bD = buscador(d.gestos);
    const hechos = new Set();
    let malos = 0, t0 = 0;
    const malo = m => { if (malos++ < 5) console.error(`  ${nombre}: ${m}`); };
    for (let n = 0; n / 120 < js.T; n++) {
        const t = n / 120; cuadros++;
        e.t = t;
        const frases = g => g.lineas.filter(l => t >= l.a && t < l.a + l.d).map(l => l.q + ':' + l.texto.es).join('|');
        if (frases(js) !== frases(d)) malo(`t=${t.toFixed(3)} frases`);
        for (const q of ['n', 'j']) {
            const x = tramoEn(js.pista[q], t), y = tramoEn(d.pista[q], t);
            const borde = (tr, p) => tr && (p[q] || []).some(z => (cerca(z[1], t) || cerca(z[2], t)));
            if (!x !== !y) { if (!borde(x, js.pista) && !borde(y, d.pista)) malo(`t=${t.toFixed(3)} ${q}: tramo ${x && x.g} ≠ ${y && y.g}`); continue; }
            if (!x) continue;
            if (!cerca(x.u, y.u) || !cerca(x.w, y.w)) malo(`t=${t.toFixed(3)} ${q}: u/w`);
            const i = { s: false, otroS: false, j: q === 'j', esc: 1 };
            const ma = metaTramo(x, t, i, bJS), mb = metaTramo(y, t, i, bD);
            for (const c of new Set([...Object.keys(ma), ...Object.keys(mb)])) if (!(ma[c] === mb[c] || cerca(ma[c], mb[c]))) malo(`t=${t.toFixed(3)} ${q} ${x.g}/${y.g}.${c}: ${ma[c]} ≠ ${mb[c]}`);
        }
        const antes = e.sonidos;
        if (js.extra && js.extra.cuadro) js.extra.cuadro(api);
        const sJS = e.sonidos - antes, sD = eventosEn(d.sonidos, t0, t, hechos, 's').length;
        if (sJS !== sD) malo(`t=${t.toFixed(3)} sonidos ${sJS} ≠ ${sD}`);
        t0 = t;
    }
    SONIDOS.bajo = bajo;
    ok(malos === 0, `${nombre}: mismo cuadro que el JS cada 1/120 s`);
}
console.log(`escenas-bienvenidas: ${pruebas - fallos}/${pruebas} bien (${cuadros} cuadros)`);
if (fallos) process.exit(1);
