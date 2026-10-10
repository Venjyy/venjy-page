// =========================================================
// Vista previa rápida de una pose de persona (sin cargar el mundo): frente, 3/4 y lado.
// Uso (con `node estudio/servidor.mjs` en la raíz del repo):
//   node .claude/skills/animaciones-minecraft/posar.mjs --salida /scratchpad/pose.png \
//     --skin venjy --pose '{"bDx":-2.8,"bDz":0.42,"cx":0.12}' \
//     --cajas '[{"x":0,"y":0.35,"z":0.9,"w":0.5,"h":0.4,"d":0.9,"color":"#333"}]'
// Pose: cx cy cz (cuello) · bDx bDz (brazo derecho) · bIx bIz (izquierdo) · pDx pIx (piernas)
//       inc (torso adelante) · rz (torso de lado) · y (subir/bajar el cuerpo). Ver referencia/rig.md.
// Cajas: referencias semitransparentes en coordenadas del modelo (mira a +Z, pies en 0).
// =========================================================
import { pathToFileURL } from 'node:url';
import { abrirNavegador } from '../../../estudio/playwright.mjs';

// `node estudio/cli.mjs capturar pose|gesto …` llama a posar. `base` es el servidor (raíz del repo).
export async function posar({ skin = 'venjy', pose = {}, cajas = [], salida = './pose.png', base = 'http://localhost:5510', navegador = null, log = console.log } = {}) {
    const propio = !navegador;
    if (propio) navegador = await abrirNavegador();
    try {
        const p = await navegador.newPage({ viewport: { width: 900, height: 420 } });
        p.on('pageerror', e => log('ERROR:', e.message));
        await p.goto(base + '/.claude/skills/animaciones-minecraft/posar.html#' + encodeURIComponent(JSON.stringify({ skin, pose, cajas })));
        await p.waitForFunction(() => window.listo, null, { timeout: 20000 });
        await p.locator('canvas').screenshot({ path: salida });
        await p.close();
        log('pose', salida);
        return salida;
    } finally {
        if (propio) await navegador.close();
    }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    const arg = (n, def) => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : def; };
    await posar({ skin: arg('skin', 'venjy'), pose: JSON.parse(arg('pose', '{}')), cajas: JSON.parse(arg('cajas', '[]')), salida: arg('salida', './pose.png'), base: arg('base', 'http://localhost:5510') });
}
