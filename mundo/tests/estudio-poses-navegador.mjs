// Prueba de navegador del Estudio, fase 6a: el juego lee poses.json y el puente lo cambia en vivo, con un Chromium real.
// node mundo/tests/estudio-poses-navegador.mjs   (necesita Playwright: variable PLAYWRIGHT o npm global; si no hay, se omite)
// Abre /estudio/ (pestaña Escenas, que trae el juego), comprueba que GESTOS ya tiene lo de poses.json, juega «punos»
// con Andy, la pausa en el golpe y cambia el gesto puno por el puente: el brazo del amigo sigue al dato nuevo y vuelve
// al de siempre. Después cambia poses.json en disco (el juego lo relee por /api/eventos) y lo deja como estaba.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { iniciar } from '../../estudio/servidor.mjs';
import { cargarPlaywright, lanzarNavegador } from '../../estudio/playwright.mjs';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
let chromium;
try { ({ chromium } = cargarPlaywright()); } catch (err) {
    console.log('estudio-poses-navegador omitida: ' + err.message.split('.')[0] + '.');
    process.exit(0);
}
let nav;
try { nav = await lanzarNavegador(chromium); } catch (err) {
    console.log('estudio-poses-navegador omitida: ' + err.message.split('\n')[0]);
    process.exit(0);
}
const srv = await iniciar({ puerto: 0, raiz });
const base = `http://127.0.0.1:${srv.address().port}`;
const archivo = path.join(raiz, 'mundo', 'datos', 'poses.json');
const original = fs.readFileSync(archivo);
const datos = JSON.parse(original.toString('utf8'));
const t0 = Date.now();
const seg = () => ((Date.now() - t0) / 1000).toFixed(1) + 's';
let fallos = 0;
const ok = (c, m) => { if (!c) { fallos++; console.log('FALLA: ' + m + '  [' + seg() + ']'); } };
const errores = [];
const restaurar = () => { try { fs.writeFileSync(archivo, original); } catch (e) { /* nada */ } };
const tope = setTimeout(async () => { console.log('TOPE de tiempo'); try { await nav.close(); } catch (e) { /* ya cerrado */ } restaurar(); process.exit(1); }, 420000);
try {
    const ctx = await nav.newContext({ viewport: { width: 1500, height: 1000 } });
    const pag = await ctx.newPage();
    pag.on('pageerror', e => errores.push('pageerror: ' + e.message));
    pag.on('console', m => { if (m.type() === 'error') errores.push('console: ' + m.text()); });
    const espera = (fn, arg, ms = 90000) => pag.waitForFunction(fn, arg, { timeout: ms, polling: 400 });

    await pag.goto(base + '/estudio/');
    await pag.waitForSelector('#estado-servidor.ok');
    await pag.click('.pestana[data-pestana="escenas"]');
    await espera(() => { const e = document.getElementById('juego-estado'); return e.textContent.includes('listo') || e.className.includes('error'); }, null, 300000);
    ok(/Juego listo/.test(await pag.textContent('#juego-estado')), 'el juego queda listo: ' + await pag.textContent('#juego-estado'));
    const marco = pag.frames().find(f => f.url().includes('supervivencia.html'));

    // 1. El juego pidió poses.json una vez y GESTOS ya tiene lo del archivo (las poses fijas entran como gestos)
    const lectura = await marco.evaluate(async () => {
        const { GESTOS } = await import('/mundo/supervivencia/escenas-skin.js');
        const recursos = performance.getEntriesByType('resource').map(r => r.name);
        return {
            pedidos: recursos.filter(n => /\/mundo\/datos\/poses\.json/.test(n)).length,
            doblarse: typeof GESTOS.doblarse === 'function' ? GESTOS.doblarse(0, 0, false, false).inc : null,
            habla: GESTOS.habla(0.5, 0.3, false, false).bDx
        };
    });
    ok(lectura.pedidos === 1, 'poses.json se pidió una vez: ' + lectura.pedidos);
    ok(lectura.doblarse === 0.6, 'la pose doblarse es un gesto del juego: ' + lectura.doblarse);
    ok(lectura.habla === -0.9 + Math.sin(0.3 * 5) * 0.3, 'habla da lo mismo que el código: ' + lectura.habla);

    // 2. El editor de Escenas acepta los nombres de poses.json
    await espera(() => window.__estudioEscenas && window.__estudioEscenas.motor() && window.__estudioEscenas.motor().gestos, null, 30000);
    ok(await pag.evaluate(() => { const g = window.__estudioEscenas.motor().gestos; return g.has('doblarse') && g.has('puno') && g.has('habla'); }), 'el editor de Escenas da por válidas las poses de poses.json');

    // 3. punos con Andy, en pausa justo en el golpe (t 1.45): el brazo del amigo sigue a puno
    await pag.click('#es-lista button[data-clave="punos"]');
    await pag.selectOption('#es-persona', 'andy');
    await pag.click('#es-jugar');
    await espera(() => /Reproduciendo|Playing|No pud|could|Error|necesita|error/i.test(document.getElementById('es-mensaje').textContent), null, 60000);
    ok(/Reproduciendo|Playing/.test(await pag.textContent('#es-mensaje')), 'la escena empezó: ' + await pag.textContent('#es-mensaje'));
    await marco.evaluate(() => { const ea = window.__venjy.amistadEscena; ea.pausar(true); ea.irA(1.45); });
    const brazo = async () => { await pag.waitForTimeout(900); return marco.evaluate(() => { const a = window.__venjy.amistadEscena.actores; return a && a.n ? a.n.p.brazoD.rotation.x : null; }); };
    const antes = await brazo();
    ok(antes !== null && antes < -0.6 && antes > -1.2, `puno del archivo: brazo a ${antes && antes.toFixed(3)} (el código da -0.98)`);

    // Cambio en vivo por el puente (BroadcastChannel), como lo manda el Estudio
    const mandar = d => pag.evaluate(d2 => new Promise((ok2, mal) => {
        const c = new BroadcastChannel('venjy-estudio'), id = 'poses-' + Math.random();
        const fin = setTimeout(() => { c.close(); mal(new Error('sin respuesta')); }, 10000);
        c.onmessage = e => { if (e.data && e.data.id === id) { clearTimeout(fin); c.close(); ok2(e.data); } };
        c.postMessage({ de: 'estudio', tipo: 'datos', id, nombre: 'poses', datos: d2 });
    }), d);
    const editado = JSON.parse(JSON.stringify(datos));
    editado.gestos.puno.canales.bDx = -2.5;
    const r1 = await mandar(editado);
    ok(r1.tipo === 'ok', 'el juego acepta poses en vivo: ' + JSON.stringify(r1));
    const vivo = await brazo();
    ok(vivo !== null && vivo < -2.0, `puno editado: brazo a ${vivo && vivo.toFixed(3)} (pide -2.5)`);
    const r2 = await mandar(datos);
    ok(r2.tipo === 'ok', 'vuelve a los datos del archivo');
    const vuelta = await brazo();
    ok(vuelta !== null && Math.abs(vuelta - antes) < 0.05, `puno otra vez como antes: ${vuelta && vuelta.toFixed(3)}`);
    console.log(`brazo de Andy en el golpe: archivo ${antes.toFixed(3)} · editado ${vivo.toFixed(3)} · de vuelta ${vuelta.toFixed(3)}`);
    await marco.evaluate(() => { const ea = window.__venjy.amistadEscena; ea.pausar(false); ea.saltar(); });

    // 4. Cambio en disco: el juego lo relee solo (/api/eventos) y un gesto nuevo aparece en GESTOS
    const disco = JSON.parse(JSON.stringify(datos));
    disco.gestos.aplaude = { reloj: 't', canales: { bDx: -1.4, bIx: -1.4, bDz: 0.2, bIz: -0.2 } };
    fs.writeFileSync(archivo, JSON.stringify(disco, null, 2) + '\n');
    await marco.waitForFunction(async () => { const { GESTOS } = await import('/mundo/supervivencia/escenas-skin.js'); return typeof GESTOS.aplaude === 'function'; }, null, { timeout: 20000, polling: 400 });
    ok(true, 'aplaude llegó desde el disco');
    restaurar();
    await marco.waitForFunction(async () => { const { GESTOS } = await import('/mundo/supervivencia/escenas-skin.js'); return !('aplaude' in GESTOS); }, null, { timeout: 20000, polling: 400 });

    const graves = errores.filter(e => !/favicon|net::ERR_ABORTED/.test(e));
    ok(graves.length === 0, 'sin errores en consola: ' + graves.slice(0, 5).join(' | '));
} catch (err) {
    fallos++;
    console.log('FALLA (excepción): ' + (err && err.stack || err));
} finally {
    clearTimeout(tope);
    restaurar();
    try { await nav.close(); } catch (e) { /* ya cerrado */ }
    srv.close();
}
const igual = fs.readFileSync(archivo).equals(original);
if (!igual) { fallos++; console.log('FALLA: poses.json no volvió a como estaba'); }
if (fallos) { console.log(`${fallos} fallos`); process.exit(1); }
console.log('estudio-poses-navegador: todo bien (' + seg() + ')');
process.exit(0);
