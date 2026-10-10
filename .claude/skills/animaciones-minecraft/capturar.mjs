// =========================================================
// Capturas de una animación del modo supervivencia (Playwright + Chromium del contenedor)
// Uso (con `python -m http.server 5510` corriendo en la raíz del repo):
//   node .claude/skills/animaciones-minecraft/capturar.mjs \
//     --preparar "await v.escenas.forzar('pony')" \
//     --paso "v.escenas.pausar(); v.escenas.irA(t)" \
//     --tiempos 0.3,1.2,2.5,4,6 --salida /ruta/al/scratchpad/capturas
// · --preparar: JS asíncrono que se ejecuta una vez; `v` es window.__venjy. Tiene dos ayudas:
//     await esperar(ms)            espera (p. ej. a que carguen los chunks)
//     await irJunto(x, z, y, d)    lleva al jugador a d bloques (3) de (x, z) en coordenadas del
//                                  creativo (y del suelo sin el +48, como n.y de los amigos) y
//                                  espera a que cargue el terreno. Ej.: irJunto(n.x, n.z, n.y)
//     mundoDe(objeto3D, x, y, z)   posición en el mundo de un punto local de un hueso (devuelve {x,y,z})
//     manoD() / manoI()            punta de la mano derecha / izquierda del cuerpo del jugador
//     callarEscenas()              evita que una escena de skin se dispare sola (úsalo casi siempre)
//   ⚠ irJunto busca el suelo de arriba hacia abajo: bajo un techo (iglú, casa) te deja ENCIMA.
//     En interiores: await irJunto(...) para cargar chunks y luego v.jugador.colocar(x, yExacto, z).
// · --medir: JS que se evalúa en cada captura y se imprime (ej. "({ mano: manoD(), cabeza:
//   mundoDe(v.gatas.gatas[1].cabeza, 0, 0.3, 0.15) })"): compara contactos con números.
// · --paso: JS que se ejecuta antes de cada captura; `t` es el tiempo de la lista.
// · --tiempos: segundos (se pasan a --paso). Sin --paso, espera t segundos reales desde el inicio.
// · --plano k: deja la cámara de cine fija en el plano k (camaras.fijarPlano).
// Imprime los errores de la página y deja PNG llamados t-<segundos>.png en --salida.
// =========================================================
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { mkdirSync } from 'node:fs';

const arg = (n, def) => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : def; };
const preparar = arg('preparar', '');
const paso = arg('paso', '');
const tiempos = arg('tiempos', '0.5,2,4').split(',').map(Number);
const salida = arg('salida', './capturas');
const plano = arg('plano', null);
const medir = arg('medir', '');
const url = arg('url', 'http://localhost:5510/supervivencia.html');
mkdirSync(salida, { recursive: true });

const navegador = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pagina = await navegador.newPage({ viewport: { width: 1280, height: 720 } });
pagina.on('pageerror', e => console.log('ERROR DE PÁGINA:', e.message));
pagina.on('console', m => { if (m.type() === 'error') console.log('CONSOLA:', m.text()); });

await pagina.goto(url);
// Mundo nuevo en Pacífico (sin monstruos que molesten las capturas)
await pagina.waitForSelector('#nuevo-mundo:not([hidden])', { timeout: 30000 });
await pagina.click('#nuevo-mundo');
await pagina.fill('#nombre-mundo', 'Capturas');
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
        // Si quedó dentro de un bloque o en el aire, busca el suelo de arriba hacia abajo
        for (let yy = (y ?? 0) + DY + 12; yy > DY - 10; yy--) if (v.mundo.bloque(x + d, yy - 0.5, z) > 0) { v.jugador.colocar(x + d, yy, z); break; }
        v.jugador.yaw = Math.atan2(x - v.jugador.pos.x, z - v.jugador.pos.z) - Math.PI;
        await esperar(1500);
    };
    // Marca como vistas todas las escenas de skin: así no se disparan solas durante las capturas
    const callarEscenas = () => { for (const l of [v.npcs.lista, v.amigos.lista]) for (const n of l) v.misiones.estado.escenasSkin.add(n.clave); v.misiones.estado.escenasSkin.add('venjy'); if (v.escenas.callar) v.escenas.callar(); v.escenas.saltar(); if (v.amistadEscena) v.amistadEscena.saltar(); };
    const mundoDe = (o, x = 0, y = 0, z = 0) => { o.updateMatrixWorld(true); const p = o.localToWorld(new v.camara.position.constructor(x, y, z)); return { x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2) }; };
    const manoD = () => mundoDe(v.camaras.cuerpo.brazoD, 0, -0.75, 0);
    const manoI = () => mundoDe(v.camaras.cuerpo.brazoI, 0, -0.75, 0);`;
if (preparar) await pagina.evaluate(`(async () => { const v = window.__venjy; ${AYUDAS} ${preparar} })()`);
if (plano !== null) await pagina.evaluate(k => window.__venjy.camaras.fijarPlano(Number(k)), plano);

const inicio = Date.now();
for (const t of tiempos) {
    if (paso) {
        await pagina.evaluate(`(async () => { const v = window.__venjy; const t = ${t}; ${AYUDAS} ${paso} })()`);
        await pagina.waitForTimeout(700); // deja que el suavizado llegue a la pose
    } else {
        const falta = t * 1000 - (Date.now() - inicio);
        if (falta > 0) await pagina.waitForTimeout(falta);
    }
    if (medir) console.log('medida t=' + t, JSON.stringify(await pagina.evaluate(`(() => { const v = window.__venjy; ${AYUDAS} return (${medir}); })()`)));
    const archivo = `${salida}/t-${String(t).replace('.', '_')}.png`;
    await pagina.screenshot({ path: archivo });
    console.log('captura', archivo);
}
await navegador.close();
