// =========================================================
// Hoja de planos: una captura por cada plano de la cámara de cine, en una sola imagen con rótulos.
// Sirve para elegir y corregir planos (qué tapa, qué se corta, qué sobra) de un vistazo.
//   node .claude/skills/animaciones-minecraft/planos.mjs \
//     --preparar "callarEscenas(); await irJunto(...); v.ronda.forzar(); await esperar(2000); v.ronda.pausar()" \
//     --planos 5 --salida /scratchpad/planos.png [--medir "<expresión>"]
// · --planos: cuántos planos tiene la lista (k = 0 … n−1). Usa camaras.fijarPlano(k).
// · Imprime por plano el nombre y, si existe, camaras.diagnostico (ver referencia/camara.md).
// =========================================================
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { mkdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const arg = (n, def) => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : def; };
const preparar = arg('preparar', ''), n = Number(arg('planos', '5')), salida = arg('salida', './planos.png');
const medir = arg('medir', '');
const dir = salida.replace(/\.png$/, '') + '-cuadros';
rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });

const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 960, height: 540 } });
p.on('pageerror', e => console.log('ERROR DE PÁGINA:', e.message));
await p.goto('http://localhost:5510/supervivencia.html');
await p.waitForSelector('#nuevo-mundo:not([hidden])', { timeout: 30000 });
await p.click('#nuevo-mundo'); await p.fill('#nombre-mundo', 'Planos');
await p.check('input[name="dificultad"][value="0"]'); await p.click('#crear');
await p.waitForFunction(() => window.__venjy && window.__venjy.jugador, null, { timeout: 120000 });
await p.waitForTimeout(2500);
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
    const callarEscenas = () => { for (const l of [v.npcs.lista, v.amigos.lista]) for (const n of l) v.misiones.estado.escenasSkin.add(n.clave); v.misiones.estado.escenasSkin.add('venjy'); if (v.escenas.callar) v.escenas.callar(); v.escenas.saltar(); if (v.amistadEscena) v.amistadEscena.saltar(); };`;
if (preparar) await p.evaluate(`(async () => { const v = window.__venjy; ${AYUDAS} ${preparar} })()`);
for (let k = 0; k < n; k++) {
    await p.evaluate(k => window.__venjy.camaras.fijarPlano(k), k);
    await p.waitForTimeout(1800);
    const info = await p.evaluate(`(() => { const v = window.__venjy; const c = v.camaras; return { plano: c.planoActual ?? null, diag: c.diagnostico ?? null${medir ? ', medida: (' + medir + ')' : ''} }; })()`);
    console.log(`plano ${k}:`, JSON.stringify(info));
    await p.screenshot({ path: `${dir}/${k}.png` });
}
await b.close();
// Hoja: 2 columnas, cada cuadro rotulado con su índice
const entradas = [], filtros = [];
for (let k = 0; k < n; k++) { entradas.push('-i', `${dir}/${k}.png`); filtros.push(`[${k}]scale=480:-1,drawbox=x=0:y=0:w=44:h=30:color=black@0.7:t=fill,drawtext=text='${k}':x=12:y=4:fontsize=24:fontcolor=white[c${k}]`); }
const cols = 2, filas = Math.ceil(n / cols);
const capas = Array.from({ length: n }, (_, k) => `[c${k}]`).join('');
const layout = Array.from({ length: n }, (_, k) => `${(k % cols) * 480}_${Math.floor(k / cols) * 270}`).join('|');
const filtro = n === 1 ? `${filtros[0]};[c0]null[o]` : `${filtros.join(';')};${capas}xstack=inputs=${n}:layout=${layout}:fill=black[o]`;
try {
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...entradas, '-filter_complex', filtro, '-map', '[o]', '-frames:v', '1', salida]);
} catch (e) { // sin drawtext (ffmpeg sin freetype): hoja sin rótulos, en orden de lectura
    const f2 = Array.from({ length: n }, (_, k) => `[${k}]scale=480:-1[c${k}]`).join(';') + `;${capas}xstack=inputs=${n}:layout=${layout}:fill=black[o]`;
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...entradas, '-filter_complex', f2, '-map', '[o]', '-frames:v', '1', salida]);
}
console.log('hoja', salida, `(${filas} filas × ${cols}; se lee de izquierda a derecha, de arriba abajo)`);
