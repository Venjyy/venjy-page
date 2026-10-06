// =========================================================
// Prueba de paridad: verifica que mundo-datos.js reproduce
// exactamente el mapa 2D de script.js
// Ejecutar: node mundo/tests/paridad.mjs
// =========================================================

import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { readFileSync } from 'fs';
import { createContext, runInContext } from 'vm';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '../../');

// Leer script.js hasta la línea 784
const scriptPath = resolve(projectRoot, 'script.js');
const scriptCode = readFileSync(scriptPath, 'utf-8');
const lines = scriptCode.split('\n');
const codeUntilPortada = lines.slice(0, 784).join('\n');

// Crear un document falso para el VM
let capturedImageData = null;
const fakeCanvas = {
  width: 0,
  height: 0,
  toDataURL: () => 'data:image/png;base64,FAKE',
  getContext: (type) => {
    if (type === '2d') {
      return {
        createImageData: (w, h) => ({
          data: new Uint8ClampedArray(w * h * 4)
        }),
        putImageData: (img) => {
          capturedImageData = img.data;
        },
        getImageData: (x, y, w, h) => ({
          data: capturedImageData || new Uint8ClampedArray(w * h * 4)
        }),
        drawImage: () => {},
        fillStyle: '',
        fillRect: () => {},
        globalAlpha: 1
      };
    }
    return {};
  }
};

const fakeDocument = {
  documentElement: {
    classList: { add: () => {} },
    style: { setProperty: () => {} }
  },
  createElement: (tag) => {
    if (tag === 'canvas') {
      return { ...fakeCanvas };
    }
    return { style: {}, querySelectorAll: () => [] };
  },
  getElementById: () => ({
    style: {},
    appendChild: () => {},
    querySelector: () => null
  }),
  querySelector: () => null,
  querySelectorAll: () => []
};

const sandbox = {
  document: fakeDocument,
  window: {
    matchMedia: () => ({ matches: false }),
    innerWidth: 1024,
    innerHeight: 768
  },
  Math,
  Float32Array,
  Array,
  Set,
  console
};

// Ejecutar el código de script.js en el contexto
createContext(sandbox);
runInContext(codeUntilPortada, sandbox);

// Exponer las funciones generarMundo, MC y TONOS
runInContext(
  `this.generarMundo = generarMundo; this.MC = MC; this.TONOS = TONOS; this.NIVEL_MAR = 14;`,
  sandbox
);

// Capturar el bitmap de generarMundo('h')
const resultado2d = sandbox.generarMundo('h');
const W = resultado2d.W;
const H = resultado2d.H;
const NIVEL_MAR = 14;

// Los datos de imagen fueron capturados en capturedImageData durante putImageData
if (!capturedImageData) {
  console.error('Error: no se capturaron datos de imagen de putImageData');
  process.exit(1);
}
const canvas2dPixels = capturedImageData;

// Importar mundo-datos.js
const mundoDatosPath = resolve(projectRoot, 'mundo/mundo-datos.js');
const mundoDatosModule = await import(`file://${mundoDatosPath}`);
const generarDatos = mundoDatosModule.generarDatos;

// Generar datos del mundo 3D
const datos = generarDatos('h');
const E = datos.E;
const T = datos.T;
const MC = sandbox.MC;
const TONOS = sandbox.TONOS;

// Calcular el bitmap esperado
const idx = (x, y) => y * W + x;
let pixelDistintos = 0;

for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = idx(x, y);
    const tipo = T[i];
    const base = MC[tipo];

    if (!base) {
      console.error(`Tipo desconocido: ${tipo} en (${x}, ${y})`);
      continue;
    }

    let tono;
    if (tipo === 'agua') {
      const prof = NIVEL_MAR - E[i];
      const v = prof * 0.1 + ((x + y) & 1) * 0.2;
      tono = v < 0.5 ? 2 : v > 0.9 ? 0 : 1;
    } else {
      const norte = y > 0 ? E[idx(x, y - 1)] : E[i];
      const dif = E[i] - norte;
      tono = dif > 0 ? 2 : dif === 0 ? 1 : dif < -2 ? 3 : 0;
    }

    const f = TONOS[tono] / 255;
    const o = i * 4;

    const esperado = [
      Math.round(base[0] * f),
      Math.round(base[1] * f),
      Math.round(base[2] * f),
      255
    ];

    const actual = [
      canvas2dPixels[o],
      canvas2dPixels[o + 1],
      canvas2dPixels[o + 2],
      canvas2dPixels[o + 3]
    ];

    // Comparar con tolerancia de ±1 por redondeo
    if (Math.abs(actual[0] - esperado[0]) > 1 ||
        Math.abs(actual[1] - esperado[1]) > 1 ||
        Math.abs(actual[2] - esperado[2]) > 1) {
      pixelDistintos++;
    }
  }
}

console.log(`celdas ${W * H}, distintas ${pixelDistintos}`);
process.exit(pixelDistintos > 0 ? 1 : 0);
