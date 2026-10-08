// =========================================================
// Revisor automático de escenas con globos (sin capturas, reloj manual de grabar.mjs).
// Recorre cada escena cuadro a cuadro a 15 fps y reporta, por escena:
//   · cuadros con globo · solape grave globo-cabeza/pecho (> 0,03) · solape globo-globo (> 0,03)
//   · globo fuera del área segura · medio alto mínimo del globo (< 0,17 falla)
//   · cambios de candidata dentro de una línea · duración de cada línea vs. lectura mínima
//     (1,0 s + 0,07 s por carácter).
//   node .claude/skills/animaciones-minecraft/revisar.mjs [--escenas lona,boris,...|todas] [--salida dir]
// · Una clave elige sus escenas: la conversación venjy y la corta de ese amigo, o «iglu» y «cuello».
// · Sale con código 1 si alguna escena FALLA o NO ARRANCA, o si hubo errores de página.
// · Necesita el juego en localhost:5510 (lo levanta si no responde) y el Chromium de Playwright.
// · Lo que NO cubre (sin ganchos de diagnóstico) está en NO_CUBIERTAS al final de la corrida.
// =========================================================
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const RAIZ = fileURLToPath(new URL('../../../', import.meta.url));
const arg = (n, def) => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : def; };
const pedidas = arg('escenas', 'todas');
const salida = arg('salida', join(tmpdir(), 'revisor-animaciones'));
const URL_JUEGO = 'http://localhost:5510/supervivencia.html';
const FPS = 15, PASO = 1000 / FPS, TOPE_CUADROS = 900;      // tope: 60 s de escena simulada
const GRAVE = 0.03, MIN_MEDIO_ALTO = 0.17, MARGEN = 0.038;   // margen = 0,04 - 0,002 (como medir.mjs)
const NO_CUBIERTAS = [
    'caricias a Mila y Gala (caricias.js): no expone diagnóstico de globos',
    'ronda del iglú con G (ronda-iglu.js): no expone diagnóstico de globos',
    'variantes «basada» de las escenas cortas: solo se prueba «identica» (la skin del mundo de prueba es la base)',
    'escena del cuello: sin datos de línea, no mide duración de líneas ni cambios de candidata',
    'escenas de misiones con cámara de lectura (camaras.js PLANOS): no tienen globos ni diagnóstico'
];

// ---------- Lista de escenas (claves leídas de escenas-datos.js) ----------
const datos = readFileSync(join(RAIZ, 'mundo/supervivencia/escenas-datos.js'), 'utf8');
const trozo = (desde, hasta) => datos.slice(datos.indexOf(desde), hasta ? datos.indexOf(hasta) : undefined);
const claves = (texto, re) => [...texto.matchAll(re)].map(m => m[1]);
const CORTAS = claves(trozo('export const CORTAS', 'export const VENJY'), /^    (\w+): \{/gm);
const VENJY = claves(trozo('export const VENJY', '// Iglú'), /^    (\w+): \[/gm);

const ESCENAS = [
    ...CORTAS.map(k => ({ id: `${k}-corta`, clave: k, nombre: `${k} · corta`, skin: k, actor: k, forzar: k, tipo: 'corta' })),
    ...VENJY.map(k => ({ id: `${k}-venjy`, clave: k, nombre: `${k} · venjy`, skin: 'venjy', actor: k, forzar: k, tipo: 'venjy' })),
    { id: 'iglu', clave: 'iglu', nombre: 'iglú (Lalo)', skin: 'venjy', actor: 'lalo', forzar: 'lalo', tipo: 'iglu' },
    { id: 'cuello', clave: 'cuello', nombre: 'cuello (Lona y Gala)', tipo: 'cuello' }
];
const elegidas = pedidas === 'todas' ? ESCENAS : ESCENAS.filter(e => pedidas.split(',').includes(e.clave));
const desconocidas = pedidas === 'todas' ? [] : pedidas.split(',').filter(k => !ESCENAS.some(e => e.clave === k));
if (desconocidas.length) console.log('Claves desconocidas (se ignoran):', desconocidas.join(', '));
if (!elegidas.length) { console.log('Nada que revisar.'); process.exit(1); }

// ---------- Servidor ----------
async function hayServidor() {
    try { return (await fetch(URL_JUEGO, { signal: AbortSignal.timeout(2000) })).ok; } catch { return false; }
}
if (!(await hayServidor())) {
    spawn('python3', ['-m', 'http.server', '5510'], { cwd: RAIZ, detached: true, stdio: 'ignore' }).unref();
    await new Promise(r => setTimeout(r, 1500));
    if (!(await hayServidor())) { console.log('No hay servidor en localhost:5510.'); process.exit(1); }
}

// ---------- Geometría y métricas ----------
const ov = (a, b) => Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) * Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));
const dentroSeguro = (r, franja) => r.x0 >= -1 + MARGEN && r.x1 <= 1 - MARGEN && r.y0 >= -1 + franja + MARGEN && r.y1 <= 1 - franja - MARGEN;
const minutos = ms => (ms / 60000).toFixed(1);

// Normaliza un cuadro: activos (globos con sus zonas de cabeza/pecho), pares (rects de todos los globos visibles), línea
function normalizar(f, esCuello) {
    if (!f) return null;
    if (esCuello) {
        const activos = ['lona', 'gala'].filter(k => f[k]).map(k => ({ quien: k, id: f[k].id, rect: f[k].rect, zonas: f[k].zonas.filter(z => z.tipo !== 'globo'), franja: f[k].franja }));
        return { t: f.t, activos, pares: activos.map(a => a.rect), linea: null };
    }
    const activos = f.globo ? [{ quien: f.globo.quien, id: f.globo.id, rect: f.globo, zonas: f.zonas.filter(z => z.tipo !== 'globo'), franja: f.franja }] : [];
    return { t: f.t, plano: f.planoNombre, activos, pares: f.globos || [], linea: f.linea };
}

function evaluar(cuadros, esCuello) {
    const m = { cuadros: cuadros.length, conGlobo: 0, solapeGrave: 0, globoGlobo: 0, globoGloboGrave: 0, fuera: 0, minMedioAlto: null, cambiosCandidata: esCuello ? null : 0, lineas: [] };
    const lineas = new Map(), ultimo = {};
    for (const f of cuadros) {
        if (f.linea && !lineas.has(f.linea.a)) lineas.set(f.linea.a, { a: f.linea.a, d: f.linea.d, texto: f.linea.texto });
        if (f.activos.length) m.conGlobo++;
        for (const g of f.activos) {
            const s = g.zonas.reduce((q, z) => q + ov(g.rect, z), 0);
            if (s > 0.03) m.solapeGrave++;
            if (!dentroSeguro(g.rect, g.franja)) m.fuera++;
            const mh = (g.rect.y1 - g.rect.y0) / 2;
            m.minMedioAlto = m.minMedioAlto === null ? mh : Math.min(m.minMedioAlto, mh);
            if (f.linea) {
                const p = ultimo[g.quien];
                if (p && p.a === f.linea.a && p.id !== g.id) m.cambiosCandidata++;
                ultimo[g.quien] = { a: f.linea.a, id: g.id };
            }
        }
        for (let i = 0; i < f.pares.length; i++) for (let j = i + 1; j < f.pares.length; j++) {
            const o = ov(f.pares[i], f.pares[j]);
            if (o > 1e-6) m.globoGlobo++;
            if (o > GRAVE) m.globoGloboGrave++;
        }
    }
    for (const l of lineas.values()) {
        const need = 1.0 + 0.07 * [...l.texto].length;
        m.lineas.push({ a: l.a, d: +l.d.toFixed(2), necesita: +need.toFixed(2), corta: l.d < need - 1e-6, texto: l.texto });
    }
    if (esCuello) m.lineas = null;
    return m;
}

function veredicto(e, m, arranco, tipoVisto) {
    const fallos = [];
    if (!arranco) return { estado: 'NO ARRANCÓ', fallos: ['forzar() no devolvió escena o terminó en el primer cuadro'] };
    if (tipoVisto && tipoVisto !== e.tipo) fallos.push(`tipo de escena ${tipoVisto} (se esperaba ${e.tipo})`);
    if (m.conGlobo === 0) fallos.push('ningún cuadro con globo');
    if (m.solapeGrave) fallos.push(`${m.solapeGrave} cuadros con solape grave globo-cabeza/pecho`);
    if (m.globoGloboGrave) fallos.push(`${m.globoGloboGrave} cuadros con solape globo-globo`);
    if (m.fuera) fallos.push(`${m.fuera} cuadros con globo fuera del área segura`);
    if (m.minMedioAlto !== null && m.minMedioAlto < MIN_MEDIO_ALTO) fallos.push(`medio alto mínimo ${m.minMedioAlto.toFixed(3)} < ${MIN_MEDIO_ALTO}`);
    if (m.cambiosCandidata) fallos.push(`${m.cambiosCandidata} cambios de candidata dentro de una línea`);
    if (m.lineas) { const c = m.lineas.filter(l => l.corta).length; if (c) fallos.push(`${c} líneas más cortas que su lectura mínima`); }
    return { estado: fallos.length ? 'FALLA' : 'OK', fallos };
}

// ---------- Navegador y mundo ----------
const navegador = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pagina = await navegador.newPage({ viewport: { width: 960, height: 540 } });
let erroresPagina = 0;
pagina.on('pageerror', e => { erroresPagina++; console.log('ERROR DE PÁGINA:', e.message); });
// Reloj manual (igual que grabar.mjs): con __manual true, cada __paso(ms) avanza un cuadro
await pagina.addInitScript(() => {
    const real = window.requestAnimationFrame.bind(window);
    let cola = [];
    window.__manual = false; window.__reloj = 0;
    window.requestAnimationFrame = cb => {
        if (window.__manual) { cola.push(cb); return 1; }
        return real(t => (window.__manual ? cola.push(cb) : cb(t)));
    };
    window.__paso = ms => { window.__reloj += ms; const c = cola; cola = []; for (const f of c) f(window.__reloj); };
});
const inicioCorrida = Date.now();
await pagina.goto(URL_JUEGO);
await pagina.waitForSelector('#nuevo-mundo:not([hidden])', { timeout: 30000 });
await pagina.click('#nuevo-mundo');
await pagina.fill('#nombre-mundo', 'Revisor');
await pagina.check('input[name="dificultad"][value="0"]');
await pagina.click('#crear');
await pagina.waitForFunction(() => window.__venjy && window.__venjy.jugador, null, { timeout: 120000 });
await pagina.waitForTimeout(2500);

const AYUDAS = `
    const esperar = ms => new Promise(r => setTimeout(r, ms));
    const irJunto = async (x, z, y = 0, d = 3) => {
        const DY = v.terreno.dy || 48;
        v.jugador.colocar(x + d, (y ?? 0) + DY + 1, z);
        await esperar(5000);
        for (let yy = (y ?? 0) + DY + 12; yy > DY - 10; yy--) if (v.mundo.bloque(x + d, yy - 0.5, z) > 0) { v.jugador.colocar(x + d, yy, z); break; }
        v.jugador.yaw = Math.atan2(x - v.jugador.pos.x, z - v.jugador.pos.z) - Math.PI;
        await esperar(1500);
    };
    const callar = () => { for (const l of [v.npcs.lista, v.amigos.lista]) for (const n of l) v.misiones.estado.escenasSkin.add(n.clave); v.misiones.estado.escenasSkin.add('venjy'); };`;

const modoReal = () => pagina.evaluate(() => { window.__manual = false; window.__paso(0); });
const modoManual = async () => {
    await pagina.evaluate(() => { window.__reloj = performance.now(); window.__manual = true; });
    await pagina.waitForTimeout(300);
};
const cuadro = (esCuello) => pagina.evaluate(({ ms, esCuello }) => {
    window.__paso(ms);
    const v = window.__venjy;
    return esCuello ? window.__cuelloDiag() : v.escenas.diag();
}, { ms: PASO, esCuello });

// Preparación de una escena de skin: persona junto al jugador, skin y globos callados
async function prepararSkin(e) {
    await pagina.evaluate(`(async () => {
        const v = window.__venjy; ${AYUDAS}
        v.escenas.reiniciar(); callar();
        v.ponerSkin('${e.skin}');
        const p = '${e.actor}' === 'venjy' ? v.venjys.lista.find(n => n.lugar === 'inicio')
            : [...v.npcs.lista, ...v.amigos.lista].find(n => n.clave === '${e.actor}');
        if (!p) return 'sin persona';
        await irJunto(p.x, p.z, p.y, 3);
        callar();
        return 'ok';
    })()`);
}

async function correrSkin(e) {
    await modoReal();
    await prepararSkin(e);
    await modoManual();
    const ok = await pagina.evaluate(`window.__venjy.escenas.forzar('${e.forzar}')`);
    const cuadros = [];
    if (!ok) return { cuadros, arranco: false, forzado: false };
    let tope = false;
    for (let i = 0; ; i++) {
        if (i >= TOPE_CUADROS) { tope = true; break; }
        const d = await cuadro(false);
        if (!d) break;
        cuadros.push(d);
    }
    if (tope) await pagina.evaluate(() => window.__venjy.escenas.saltar && window.__venjy.escenas.saltar());
    await modoReal();
    return { cuadros, arranco: cuadros.length > 0, tope, forzado: true };
}

async function correrCuello(e) {
    await modoReal();
    await pagina.evaluate(`(async () => {
        const v = window.__venjy; ${AYUDAS}
        const n = v.npcs.lona;
        await irJunto(n.x, n.z, n.y, 3);
        callar();
        n.ruta = null; n.espera = 999;
        const g = v.gatas.gatas.find(g => g.clave === 'gala');
        g.ruta = []; g.espera = 999; g.x = n.x + 3.2; g.z = n.z + 1.2; g.y = n.y;
        v.dar(43, 4); v.misiones.estado.activa = 'lona3';
        await esperar(1500);
    })()`);
    await modoManual();
    const cuadros = [];
    let arranco = false;
    for (let intento = 0; intento < 2 && !arranco; intento++) {
        await pagina.evaluate(() => window.__venjy.misiones.hablar('lona'));
        for (let i = 0; i < 2 && !arranco; i++) {
            const d = await cuadro(true);
            if (d && d.t !== null) arranco = true;
        }
    }
    if (arranco) {
        for (let i = 0; ; i++) {
            if (i >= TOPE_CUADROS) break;
            const d = await cuadro(true);
            if (!d || d.t === null) break;
            cuadros.push(d);
        }
    }
    await modoReal();
    return { cuadros, arranco, forzado: true };
}

// ---------- Corrida ----------
mkdirSync(salida, { recursive: true });
const filas = [];
const resumen = {};
for (const e of elegidas) {
    const t0 = Date.now();
    const r = e.tipo === 'cuello' ? await correrCuello(e) : await correrSkin(e);
    const esCuello = e.tipo === 'cuello';
    const norm = r.cuadros.map(c => normalizar(c, esCuello)).filter(Boolean);
    const m = evaluar(norm, esCuello);
    const tipoVisto = !esCuello && r.cuadros[0] ? r.cuadros[0].tipo : null;
    const v = veredicto(e, m, r.arranco, tipoVisto);
    if (r.tope) v.fallos.push('escena más larga que el tope de 60 s (se cortó)');
    if (!r.forzado && !esCuello) v.fallos.push('forzar() devolvió false: persona no encontrada');
    resumen[e.id] = { escena: e.nombre, clave: e.clave, tipo: e.tipo, estado: v.estado, fallos: v.fallos, metricas: m, segundos: +((Date.now() - t0) / 1000).toFixed(1) };
    writeFileSync(join(salida, `${e.id}.json`), JSON.stringify({ escena: e.nombre, tipo: e.tipo, cuadros: r.cuadros }));
    filas.push(resumen[e.id]);
    console.log(`${v.estado.padEnd(12)} ${e.nombre} (${r.cuadros.length} cuadros, ${resumen[e.id].segundos} s)`);
}
await navegador.close();
writeFileSync(join(salida, 'resumen.json'), JSON.stringify(resumen, null, 1));

// ---------- Tabla ----------
const f = (x, d = 0) => x === null ? 'n/d' : typeof x === 'number' ? x.toFixed(d) : String(x);
console.log('\nEscena                      Cuadros  ConGlobo  SolGrave  GloboGlobo  Fuera  MedioAltoMin  Candidata  LíneasCortas  Estado');
for (const r of filas) {
    const m = r.metricas;
    const cortas = m.lineas ? `${m.lineas.filter(l => l.corta).length}/${m.lineas.length}` : 'n/d';
    console.log([
        r.escena.padEnd(27), String(m.cuadros).padStart(7), String(m.conGlobo).padStart(9), String(m.solapeGrave).padStart(9),
        String(m.globoGloboGrave).padStart(11), String(m.fuera).padStart(6), f(m.minMedioAlto, 3).padStart(13),
        f(m.cambiosCandidata).padStart(10), cortas.padStart(13), r.estado
    ].join(' '));
}
const fallidas = filas.filter(r => r.estado !== 'OK');
if (fallidas.length) {
    console.log('\nDetalle de lo que falla:');
    for (const r of fallidas) console.log(` · ${r.escena}: ${r.fallos.join('; ')}`);
}
if (erroresPagina) console.log(`\nErrores de página: ${erroresPagina}`);
console.log('\nNo cubiertas por el revisor:');
for (const t of NO_CUBIERTAS) console.log(` · ${t}`);
console.log(`\nDatos por escena en ${salida}. Tiempo de corrida: ${minutos(Date.now() - inicioCorrida)} min.`);
process.exitCode = fallidas.length || erroresPagina ? 1 : 0;
