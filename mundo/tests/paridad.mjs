// =========================================================
// Prueba de paridad del mapa (sin navegador)
// Ejecutar: node mundo/tests/paridad.mjs
//
// Desde que script.js importa mundo/mundo-datos.js, el generador ya
// no está duplicado. Criterios:
//  1. Anti-duplicación: script.js no contiene el generador (ruido,
//     semillas, relieve, caminos) e importa mundo-datos.js y pintado.js.
//  2. Determinismo: generarDatos() da exactamente lo mismo dos veces
//     y conserva su forma { orient, W, H, E, T, F, P, tramos,
//     NIVEL_MAR, celda, titulo } con la capa F.
//  3. Bitmap: pintarBitmap() (lo que dibuja el portafolio) coincide
//     con un cálculo independiente de la fórmula de tonos de los
//     mapas de Minecraft, con la paleta escrita aquí aparte (±1 por
//     redondeo), en ambas orientaciones ('h' y 'v').
// Sale con código 0 si todo coincide, 1 si no.
// =========================================================

import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, resolve } from 'path';
import { readFileSync } from 'fs';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '../../');
const { generarDatos } = await import(pathToFileURL(resolve(raiz, 'mundo/mundo-datos.js')).href);
const { pintarBitmap } = await import(pathToFileURL(resolve(raiz, 'mundo/pintado.js')).href);

let fallos = 0;
const falla = msg => { console.error('FALLO: ' + msg); fallos++; };

// 1. Anti-duplicación
const script = readFileSync(resolve(raiz, 'script.js'), 'utf-8');
const prohibidos = ['function crearRuido', 'function azar', 'Relieve base', 'const DISENOS',
    'const RUTA', 'const LETRAS', 'const MC =', 'const TONOS', 'fbm('];
for (const t of prohibidos) if (script.includes(t)) falla(`script.js contiene una copia del generador: "${t}"`);
if (!/from '\.\/mundo\/mundo-datos\.js'/.test(script)) falla('script.js no importa mundo/mundo-datos.js');
if (!/from '\.\/mundo\/pintado\.js'/.test(script)) falla('script.js no importa mundo/pintado.js');
const html = readFileSync(resolve(raiz, 'index.html'), 'utf-8');
if (!/<script type="module" src="script\.js">/.test(html)) falla('index.html debe cargar script.js como módulo');

// Paleta independiente (valores de los colores de mapas de Minecraft)
const PALETA = {
    pasto: [127, 178, 56], arena: [247, 233, 163], agua: [64, 64, 255], piedra: [112, 112, 112],
    nieve: [255, 255, 255], hojas: [0, 124, 0], tierra: [151, 109, 77], madera: [143, 119, 72],
    cuarzo: [255, 252, 245], rojo: [153, 51, 51], azul: [51, 76, 178], naranjo: [216, 127, 51],
    negro: [25, 25, 25], oro: [250, 238, 77], diamante: [92, 219, 213], esmeralda: [0, 217, 58],
    podzol: [129, 86, 49], arcilla: [164, 168, 184], gris: [76, 76, 76]
};
// Multiplicadores de sombreado: oscuro, normal, claro, muy oscuro
const MULT = [180 / 255, 220 / 255, 1, 135 / 255];

for (const orient of ['h', 'v']) {
    const a = generarDatos(orient);
    const b = generarDatos(orient);
    const { W, H, E, T, F } = a;

    // 2. Forma y determinismo
    for (const k of ['orient', 'W', 'H', 'E', 'T', 'F', 'P', 'tramos', 'NIVEL_MAR', 'celda', 'titulo'])
        if (!(k in a)) falla(`[${orient}] falta la propiedad ${k}`);
    if (!(F instanceof Uint8Array) || F.length !== W * H) falla(`[${orient}] capa F inválida`);
    let difs = 0;
    for (let i = 0; i < W * H; i++) if (E[i] !== b.E[i] || T[i] !== b.T[i] || F[i] !== b.F[i]) difs++;
    if (difs) falla(`[${orient}] generarDatos no es determinista (${difs} celdas)`);

    // 3. Bitmap contra la fórmula independiente
    const px = pintarBitmap(a);
    if (px.length !== W * H * 4) falla(`[${orient}] tamaño de bitmap incorrecto`);
    let malos = 0;
    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            const i = y * W + x;
            const base = PALETA[T[i]];
            if (!base) { falla(`[${orient}] tipo desconocido ${T[i]}`); continue; }
            let tono;
            if (T[i] === 'agua') {
                const v = (a.NIVEL_MAR - E[i]) * 0.1 + ((x + y) % 2) * 0.2;
                tono = v < 0.5 ? 2 : v > 0.9 ? 0 : 1;
            } else {
                const dif = E[i] - (y > 0 ? E[i - W] : E[i]);
                tono = dif > 0 ? 2 : dif < 0 ? (dif < -2 ? 3 : 0) : 1;
            }
            const o = i * 4;
            for (let c = 0; c < 3; c++) {
                if (Math.abs(px[o + c] - Math.round(base[c] * MULT[tono])) > 1) { malos++; break; }
            }
            if (px[o + 3] !== 255) malos++;
        }
    }
    if (malos) falla(`[${orient}] ${malos} celdas con color distinto`);
    console.log(`[${orient}] celdas ${W * H}, distintas ${malos}`);
}

console.log(fallos ? `${fallos} fallo(s)` : 'paridad OK');
process.exit(fallos ? 1 : 0);
