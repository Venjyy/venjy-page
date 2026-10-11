// =========================================================
// Mesa 3D del Duelo de Cartas (7h-2b, PR 4a) en un navegador real: se omite sin Playwright.
// Ejecutar: node mundo/tests/cartas-mesa-navegador.mjs [carpeta-capturas]
// Abre supervivencia.html?estudio, abre la mesa junto a Lucho, empieza una partida fácil y juega tocando:
// tu carta de la mano → una zona marcada; termina el turno y espera a que Lucho juegue. Revisa que no haya
// errores en la página, que la vista cambie y que al salir se libere la cámara. Con una carpeta, deja capturas.
// =========================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { iniciar } from '../../estudio/servidor.mjs';
import { cargarPlaywright, lanzarNavegador } from '../../estudio/playwright.mjs';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const capturas = process.argv[2] || null;
let chromium;
try { ({ chromium } = cargarPlaywright()); } catch (err) { console.log('cartas-mesa-navegador omitida: ' + err.message.split('.')[0] + '.'); process.exit(0); }
let nav;
try { nav = await lanzarNavegador(chromium); } catch (err) { console.log('cartas-mesa-navegador omitida: ' + err.message.split('\n')[0]); process.exit(0); }
const srv = await iniciar({ puerto: 0, raiz });
const base = `http://127.0.0.1:${srv.address().port}`;
let fallos = 0;
const ok = (c, m) => { if (!c) { fallos++; console.log('FALLA: ' + m); } };
const errores = [];
const tope = setTimeout(async () => { console.log('TOPE de tiempo'); try { await nav.close(); } catch (e) { /* ya cerrado */ } process.exit(1); }, 300000);
try {
    const pag = await (await nav.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
    pag.on('pageerror', e => errores.push(String(e)));
    pag.on('console', m => { if (m.type() === 'error') errores.push(m.text()); });
    await pag.goto(`${base}/supervivencia.html?estudio`);
    await pag.waitForFunction(() => window.__venjy && window.__venjy.amigos.lista.some(n => n.clave === 'lucho'), null, { timeout: 240000, polling: 500 });
    await pag.evaluate(() => window.__venjy.abrirMesa('facil'));
    await pag.waitForFunction(() => window.__venjy.mesaCartas && window.__venjy.mesaCartas.activo, null, { timeout: 30000 });
    ok(await pag.evaluate(() => window.__venjy.camaras.enCine), 'la mesa toma la cámara');
    await pag.click('.cartas-mesa-hud .cartas-inicio button');
    await pag.waitForFunction(() => { const e = window.__venjy.mesaCartas.estado; return e && e.turno === 0 && e.fase === 'principal'; }, null, { timeout: 10000 });
    await pag.waitForTimeout(800);
    if (capturas) { fs.mkdirSync(capturas, { recursive: true }); await pag.screenshot({ path: path.join(capturas, 'mesa-1ra.png') }); }
    // Toca la primera criatura de tu mano y una zona marcada
    const m = await pag.evaluate(() => window.__venjy.mesaCartas.estado.jug[0].mano.length);
    ok(m > 0, 'tienes cartas en la mano');
    let jugo = false;
    for (let i = 0; i < m && !jugo; i++) {
        const p = await pag.evaluate(i => window.__venjy.mesaCartas.pantallaMano(i), i);
        const antes = await pag.evaluate(() => JSON.stringify(window.__venjy.mesaCartas.estado.jug[0].zonas));
        await pag.mouse.click(p.x, p.y);
        await pag.waitForTimeout(200);
        if (i === 0) {
            ok(await pag.isVisible('.cartas-mesa-lector canvas'), 'la carta elegida se abre en el lector');
            if (capturas) await pag.screenshot({ path: path.join(capturas, 'mesa-enfoque.png') });
        }
        for (let z = 0; z < 3 && !jugo; z++) {
            const q = await pag.evaluate(z => window.__venjy.mesaCartas.pantallaZona(0, z), z);
            await pag.mouse.click(q.x, q.y);
            await pag.waitForTimeout(250);
            jugo = antes !== await pag.evaluate(() => JSON.stringify(window.__venjy.mesaCartas.estado.jug[0].zonas));
        }
        if (!jugo) await pag.mouse.click(p.x, p.y); // la suelta
    }
    ok(jugo, 'tocar carta y zona invoca una criatura');
    await pag.evaluate(() => window.__venjy.mesaCartas.cambiarVista());
    await pag.waitForTimeout(600);
    ok(await pag.evaluate(() => window.__venjy.mesaCartas.vista === 3), 'cambia a 3.ª persona');
    ok(await pag.isVisible('.cartas-mesa-mini'), 'en 3.ª persona se ve la mesa de arriba');
    if (capturas) await pag.screenshot({ path: path.join(capturas, 'mesa-3ra.png') });
    await pag.click('.cartas-mesa-botones button'); // Terminar
    await pag.waitForFunction(() => { const e = window.__venjy.mesaCartas.estado; return e && (e.turno === 0 && e.fase === 'principal' && e.n >= 3 || e.ganador !== null); }, null, { timeout: 30000 });
    ok(true, 'Lucho juega su turno y vuelve el tuyo');
    if (capturas) await pag.screenshot({ path: path.join(capturas, 'mesa-turno2.png') });
    await pag.keyboard.press('Escape');
    await pag.waitForTimeout(300);
    ok(await pag.evaluate(() => !window.__venjy.mesaCartas.activo && !window.__venjy.camaras.enCine), 'Esc cierra la mesa y suelta la cámara');
    ok(!errores.length, 'sin errores en la página: ' + errores.slice(0, 3).join(' | '));
} catch (err) { fallos++; console.log('FALLA: ' + err.message); }
clearTimeout(tope);
await nav.close(); srv.close();
console.log(fallos ? `${fallos} fallos` : 'cartas-mesa-navegador: todo bien');
process.exit(fallos ? 1 : 0);
