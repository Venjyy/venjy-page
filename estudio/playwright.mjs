// =========================================================
// VENJY · Estudio · cómo se consigue Playwright y un navegador (sin npm install dentro del sitio)
// Lo usan estudio/capturar.mjs y los scripts de .claude/skills/animaciones-minecraft/ (capturar, posar).
// Paquete: variable PLAYWRIGHT (carpeta del paquete `playwright` o `playwright-core`) o el npm global
// (`npm root -g`). Navegador: PLAYWRIGHT_CHROMIUM (ejecutable), el Chromium de la caché ms-playwright
// (la revisión más nueva), o el Chrome / Edge instalados. Contrato: estudio/DISENO.md §6.
// =========================================================
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';

const ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];

export function raizGlobalNpm() {
    try {
        return execSync('npm root -g', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() || null;
    } catch (e) {
        return null;
    }
}

// Carpetas o archivos donde buscar el paquete, en orden.
export function candidatosPlaywright(env = process.env, raizGlobal = null) {
    const c = [];
    if (env.PLAYWRIGHT) c.push(env.PLAYWRIGHT);
    if (raizGlobal) c.push(path.join(raizGlobal, 'playwright'), path.join(raizGlobal, 'playwright-core'));
    return c;
}

// -> { chromium, origen }. Lanza un Error con las instrucciones si no hay paquete.
// `npm root -g` tarda ~1 s: solo se pregunta si la variable PLAYWRIGHT no dio el paquete.
export function cargarPlaywright(env = process.env, raizGlobal = undefined) {
    const req = createRequire(import.meta.url);
    const probados = [];
    const probar = lugares => {
        for (const c of lugares) {
            try {
                const m = req(c);
                if (m && m.chromium) return { chromium: m.chromium, origen: c };
                probados.push(`${c} (sin chromium)`);
            } catch (e) {
                probados.push(c);
            }
        }
        return null;
    };
    const r = probar(candidatosPlaywright(env, null)) || probar(candidatosPlaywright({}, raizGlobal === undefined ? raizGlobalNpm() : raizGlobal));
    if (r) return r;
    throw new Error(
        'No encuentro Playwright. Opciones: `npm i -g playwright-core` (y un Chromium: `npx playwright install chromium`), '
        + 'o apuntar la variable PLAYWRIGHT a la carpeta de un paquete `playwright` / `playwright-core` ya instalado.'
        + (probados.length ? ' Probé: ' + probados.join(', ') + '.' : '')
    );
}

function raizNavegadores(env) {
    if (env.PLAYWRIGHT_BROWSERS_PATH && env.PLAYWRIGHT_BROWSERS_PATH !== '0') return env.PLAYWRIGHT_BROWSERS_PATH;
    if (process.platform === 'win32') return path.join(env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'), 'ms-playwright');
    if (process.platform === 'darwin') return path.join(os.homedir(), 'Library', 'Caches', 'ms-playwright');
    return path.join(os.homedir(), '.cache', 'ms-playwright');
}

// Ejecutables de la caché de Playwright, del más nuevo al más viejo (el «headless shell» antes que el Chromium
// completo, que es lo que Playwright usa sin ventana). La revisión puede no ser la que pide el paquete: para
// capturas de esta página alcanza. Lista vacía si no hay caché.
export function buscarChromiumLocal(env = process.env) {
    const raiz = raizNavegadores(env);
    const win = process.platform === 'win32', mac = process.platform === 'darwin';
    const tipos = [
        ['chromium_headless_shell', win ? ['chrome-headless-shell-win64/chrome-headless-shell.exe'] : mac ? ['chrome-headless-shell-mac-arm64/chrome-headless-shell', 'chrome-headless-shell-mac-x64/chrome-headless-shell'] : ['chrome-headless-shell-linux64/chrome-headless-shell']],
        ['chromium', win ? ['chrome-win64/chrome.exe', 'chrome-win/chrome.exe'] : mac ? ['chrome-mac/Chromium.app/Contents/MacOS/Chromium'] : ['chrome-linux/chrome']]
    ];
    let nombres = [];
    try { nombres = fs.readdirSync(raiz); } catch (e) { return []; }
    const salida = [];
    for (const [prefijo, rel] of tipos) {
        const revs = nombres.filter(n => n.startsWith(prefijo + '-') && /^\d+$/.test(n.slice(prefijo.length + 1)))
            .sort((x, y) => Number(y.slice(prefijo.length + 1)) - Number(x.slice(prefijo.length + 1)));
        for (const c of revs) for (const r of rel) {
            const p = path.join(raiz, c, r);
            if (fs.existsSync(p)) salida.push(p);
        }
    }
    return salida;
}

// Abre un navegador: el que trae el paquete, y si no existe, los demás caminos. Devuelve el navegador.
export async function lanzarNavegador(chromium, env = process.env) {
    const intentos = [];
    if (env.PLAYWRIGHT_CHROMIUM) intentos.push({ executablePath: env.PLAYWRIGHT_CHROMIUM });
    intentos.push({});
    for (const p of buscarChromiumLocal(env)) intentos.push({ executablePath: p });
    intentos.push({ channel: 'chrome' }, { channel: 'msedge' });
    const fallos = [];
    for (const o of intentos) {
        try { return await chromium.launch({ args: ARGS, ...o }); } catch (e) {
            fallos.push((o.executablePath || o.channel || 'por defecto') + ': ' + String((e && e.message) || e).split('\n')[0]);
        }
    }
    throw new Error('No pude abrir un navegador. Probé:\n  ' + fallos.join('\n  '));
}

// Todo junto: paquete + navegador.
export async function abrirNavegador(env = process.env) {
    const { chromium } = cargarPlaywright(env);
    return lanzarNavegador(chromium, env);
}
