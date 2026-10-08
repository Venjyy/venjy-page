// =========================================================
// Video MP4 de una animación del modo supervivencia, cuadro por cuadro con reloj controlado
// (sale fluido aunque el navegador del contenedor dibuje lento). Necesita ffmpeg y el servidor
// (`python -m http.server 5510` en la raíz del repo).
//   node .claude/skills/animaciones-minecraft/grabar.mjs \
//     --preparar "const g = v.gatas.gatas.find(g => g.clave === 'gala'); await irJunto(g.x, g.z, g.y, 1.5)" \
//     --iniciar "v.caricias.forzar('gala')" --segundos 8.6 --salida /scratchpad/caricia.mp4
// · --preparar: JS asíncrono antes de grabar (mismas ayudas que capturar.mjs: esperar, irJunto).
// · --iniciar: JS que arranca la animación justo cuando empieza la grabación.
// · --segundos: duración del video · --fps (30) · --ancho/--alto (960×540).
// =========================================================
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { mkdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const arg = (n, def) => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : def; };
const preparar = arg('preparar', ''), iniciar = arg('iniciar', '');
const segundos = Number(arg('segundos', '8')), fps = Number(arg('fps', '30'));
const ancho = Number(arg('ancho', '960')), alto = Number(arg('alto', '540'));
const salida = arg('salida', './animacion.mp4');
const cuadros = salida.replace(/\.mp4$/, '') + '-cuadros';
rmSync(cuadros, { recursive: true, force: true }); mkdirSync(cuadros, { recursive: true });

const navegador = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pagina = await navegador.newPage({ viewport: { width: ancho, height: alto } });
pagina.on('pageerror', e => console.log('ERROR DE PÁGINA:', e.message));
// Reloj manual: mientras __manual es false todo corre normal; después, cada __paso(ms) avanza un cuadro
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
await pagina.goto('http://localhost:5510/supervivencia.html');
await pagina.waitForSelector('#nuevo-mundo:not([hidden])', { timeout: 30000 });
await pagina.click('#nuevo-mundo');
await pagina.fill('#nombre-mundo', 'Video');
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
    };`;
if (preparar) await pagina.evaluate(`(async () => { const v = window.__venjy; ${AYUDAS} ${preparar} })()`);
// Pasa a reloj manual (desde el tiempo real actual, para que el primer dt sea normal)
await pagina.evaluate(() => { window.__reloj = performance.now(); window.__manual = true; });
await pagina.waitForTimeout(300);
if (iniciar) await pagina.evaluate(`(() => { const v = window.__venjy; ${iniciar} })()`);
const total = Math.round(segundos * fps);
for (let i = 0; i < total; i++) {
    await pagina.evaluate(ms => window.__paso(ms), 1000 / fps);
    await pagina.screenshot({ path: `${cuadros}/${String(i).padStart(5, '0')}.png` });
    if (i % fps === 0) console.log(`segundo ${i / fps}`);
}
await navegador.close();
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', `${cuadros}/%05d.png`, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', salida]);
rmSync(cuadros, { recursive: true, force: true });
console.log('video', salida);
