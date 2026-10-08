// =========================================================
// Vista previa rápida de una pose de persona (sin cargar el mundo): frente, 3/4 y lado.
// Uso (con `python -m http.server 5510` en la raíz del repo):
//   node .claude/skills/animaciones-minecraft/posar.mjs --salida /scratchpad/pose.png \
//     --skin venjy --pose '{"bDx":-2.8,"bDz":0.42,"cx":0.12}' \
//     --cajas '[{"x":0,"y":0.35,"z":0.9,"w":0.5,"h":0.4,"d":0.9,"color":"#333"}]'
// Pose: cx cy cz (cuello) · bDx bDz (brazo derecho) · bIx bIz (izquierdo) · pDx pIx (piernas)
//       inc (torso adelante) · rz (torso de lado) · y (subir/bajar el cuerpo). Ver referencia/rig.md.
// Cajas: referencias semitransparentes en coordenadas del modelo (mira a +Z, pies en 0).
// =========================================================
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const arg = (n, def) => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : def; };
const op = { skin: arg('skin', 'venjy'), pose: JSON.parse(arg('pose', '{}')), cajas: JSON.parse(arg('cajas', '[]')) };
const salida = arg('salida', './pose.png');
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 900, height: 420 } });
p.on('pageerror', e => console.log('ERROR:', e.message));
await p.goto('http://localhost:5510/.claude/skills/animaciones-minecraft/posar.html#' + encodeURIComponent(JSON.stringify(op)));
await p.waitForFunction(() => window.listo, null, { timeout: 20000 });
await p.locator('canvas').screenshot({ path: salida });
console.log('pose', salida);
await b.close();
