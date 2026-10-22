// =========================================================
// Prueba de B4a (estudio/DISENO.md §40): los 16 reencuentros de escenas.json dan el mismo cuadro que reencuentros.js
// node mundo/tests/escenas-reencuentros.mjs
// Para cada pareja y en las dos direcciones (con la skin de uno y de otro) compara con el guion de JS cada 1/120 s: frases
// que se ven, tramo de cada actor (u, peso y metas de cada canal), golpes y actor del clon. Además: esquema, reglas y
// que cada escena la elija su `dispara`.
// =========================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validar } from '../../estudio/validar.mjs';
import { guionDeDatos, reglasEscenas, escenaQueDispara, amigoDeEscena, repartoDe, repartirGuion, tramoEn, metaTramo, sonidosDeEscena } from '../datos/escenas.js';
import { escenaDeReencuentro } from '../../estudio/migrar-reencuentros.mjs';

globalThis.window ??= { addEventListener() {} };
const aviso = console.warn;
console.warn = (...m) => { if (!String(m[0]).startsWith('[datos]')) aviso(...m); };
const { GESTOS } = await import('../supervivencia/escenas-skin.js');
const { GESTOS_AMISTAD } = await import('../supervivencia/escena-amistad-datos.js');
const { MOLDES, SONIDOS } = await import('../supervivencia/moldes.js');
const { reencuentro, durLinea, REENCUENTROS } = await import('../supervivencia/reencuentros.js');
const { PERSONAJES, GRUPOS } = await import('../supervivencia/amistad.js');
const { CODIGO_ESCENAS } = await import('../supervivencia/codigo-escenas.js');
const { sonidos } = await import('../supervivencia/sonidos.js');
console.warn = aviso;

const aqui = path.dirname(fileURLToPath(import.meta.url));
const datos = JSON.parse(fs.readFileSync(path.join(aqui, '..', 'datos', 'escenas.json'), 'utf8'));
let fallos = 0, pruebas = 0;
const ok = (c, m) => { pruebas++; if (!c) { fallos++; console.error('✗ ' + m); } };
const cerca = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;

// ---------- Esquema, reglas y dispara ----------
const claves = Object.keys(REENCUENTROS);
ok(claves.length === 16, 'hay 16 reencuentros en reencuentros.js');
ok(validar(datos, 'escenas').length === 0, 'escenas.json cumple el esquema ' + JSON.stringify(validar(datos, 'escenas').slice(0, 3)));
const cat = sonidosDeEscena(SONIDOS, sonidos);
const poses = JSON.parse(fs.readFileSync(path.join(aqui, '..', 'datos', 'poses.json'), 'utf8'));
const nombres = { gestos: new Set([...Object.keys(GESTOS), ...Object.keys(GESTOS_AMISTAD), ...Object.keys(MOLDES), ...Object.keys(poses.gestos || {})]), animaciones: new Set(), durLinea,
    personas: new Set(PERSONAJES), grupos: new Set(Object.keys(GRUPOS)), iconos: new Set(), pix: new Set(), sonidos: new Set(Object.keys(cat)), codigos: new Set(Object.keys(CODIGO_ESCENAS)) };
const errores = reglasEscenas(datos, nombres).filter(p => p.tipo === 'error');
ok(errores.length === 0, 'escenas.json: sin errores de reglas ' + JSON.stringify(errores.slice(0, 3)));

// El script y el JSON guardado dicen lo mismo (no se editó a mano sin querer: si el dueño ajusta una escena, esto avisa)
for (const k of claves) {
    const esperado = await escenaDeReencuentro(k, { reencuentro, durLinea, REENCUENTROS });
    ok(!!datos.escenas['reencuentro-' + k], `reencuentro-${k}: está en escenas.json`);
    if (!datos.escenas['reencuentro-' + k]) continue;
    const { revisado, ...guardada } = datos.escenas['reencuentro-' + k];
    if (JSON.stringify(guardada) !== JSON.stringify(esperado)) console.log(`  aviso: reencuentro-${k} ya no es el que da el script (¿lo ajustó el dueño?)`);
}

// ---------- Paridad cuadro a cuadro ----------
const buscador = gestos => g => (gestos && gestos[g]) || GESTOS_AMISTAD[g] || (GESTOS[g] && ((u, t, i) => GESTOS[g](u, t, i.s, i.j))) || null;
let cuadros = 0;
for (const k of claves) {
    const [a, b] = k.split('-');
    const def = datos.escenas['reencuentro-' + k];
    if (!def) continue;
    for (const [skin, amigo] of [[a, b], [b, a]]) {
        const nombre = `${k} (skin ${skin})`;
        ok(escenaQueDispara(datos.escenas, { tipo: 'reencuentro', skin, persona: amigo }) === 'reencuentro-' + k, `${nombre}: la elige su dispara`);
        ok(amigoDeEscena(def, def.dispara, skin) === amigo, `${nombre}: n es el otro de la pareja`);
        const js = repartirGuion(reencuentro(skin, amigo));
        let d = guionDeDatos(def, { durLinea, moldes: MOLDES, personajes: PERSONAJES });
        const r = repartoDe(d.personas, amigo, skin, d.actores);
        d = repartirGuion({ ...d, reparto: r.reparto, actores: r.actores });
        ok(js.T === d.T && js.r === d.r, `${nombre}: T y r`);
        ok(JSON.stringify(js.golpes) === JSON.stringify(d.golpes) && !js.corazones, `${nombre}: golpes`);
        ok(JSON.stringify(js.actores) === JSON.stringify(d.actores) && d.actores.c.clave === skin && d.actores.c.radio === 9, `${nombre}: el clon es tu skin con radio 9`);
        ok(JSON.stringify(Object.keys(js.pista).sort()) === JSON.stringify(Object.keys(d.pista).sort()), `${nombre}: mismos actores en la pista`);
        const bJS = buscador(js.gestos), bD = buscador(d.gestos);
        let malos = 0;
        const malo = m => { if (malos++ < 5) console.error(`  ${nombre}: ${m}`); };
        for (let n = 0; n / 120 < js.T; n++) {
            const t = n / 120; cuadros++;
            const frases = g => g.lineas.filter(l => t >= l.a && t < l.a + l.d).map(l => l.q + ':' + l.texto.es).join('|');
            if (frases(js) !== frases(d)) malo(`t=${t.toFixed(3)} frases`);
            for (const q of ['n', 'j', 'c']) {
                const x = tramoEn(js.pista[q], t), y = tramoEn(d.pista[q], t);
                const borde = (tr, p) => tr && (p[q] || []).some(z => z[0] === tr.g && (cerca(z[1], t) || cerca(z[2], t)));
                if (!x !== !y) { if (!borde(x, js.pista) && !borde(y, d.pista)) malo(`t=${t.toFixed(3)} ${q}: tramo ${x && x.g} ≠ ${y && y.g}`); continue; }
                if (!x) continue;
                if (!cerca(x.u, y.u) || !cerca(x.w, y.w)) malo(`t=${t.toFixed(3)} ${q}: u/w`);
                const i = { s: false, otroS: false, j: q === 'j', esc: 1 };
                const ma = metaTramo(x, t, i, bJS), mb = metaTramo(y, t, i, bD);
                for (const c of new Set([...Object.keys(ma), ...Object.keys(mb)])) if (!(ma[c] === mb[c] || cerca(ma[c], mb[c]))) malo(`t=${t.toFixed(3)} ${q} ${x.g}.${c}: ${ma[c]} ≠ ${mb[c]}`);
            }
        }
        ok(malos === 0, `${nombre}: mismo cuadro que el JS cada 1/120 s`);
    }
}
console.log(`escenas-reencuentros: ${pruebas - fallos}/${pruebas} bien (${cuadros} cuadros)`);
if (fallos) process.exit(1);
