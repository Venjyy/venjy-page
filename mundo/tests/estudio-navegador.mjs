// Prueba de navegador del Estudio (fase 2): pestaña Juego + juego en un iframe + puente + SSE, con un Chromium real.
// node mundo/tests/estudio-navegador.mjs   (necesita Playwright: variable PLAYWRIGHT o npm global; si no hay, se omite)
// Toca mundo/datos/textos.json un momento y lo deja como estaba (aunque falle).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { iniciar } from '../../estudio/servidor.mjs';
import { cargarPlaywright, lanzarNavegador } from '../../estudio/playwright.mjs';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
let chromium;
try { ({ chromium } = cargarPlaywright()); } catch (err) {
    console.log('estudio-navegador omitida: ' + err.message.split('.')[0] + '.');
    process.exit(0);
}
let nav;
try { nav = await lanzarNavegador(chromium); } catch (err) {
    console.log('estudio-navegador omitida: ' + err.message.split('\n')[0]);
    process.exit(0);
}
const srv = await iniciar({ puerto: 0, raiz });
const base = `http://127.0.0.1:${srv.address().port}`;
const datosTxt = path.join(raiz, 'mundo', 'datos', 'textos.json');
const origTxt = fs.readFileSync(datosTxt);
const t0 = Date.now();
const seg = () => ((Date.now() - t0) / 1000).toFixed(1) + 's';
let fallos = 0;
const ok = (c, m) => { if (!c) { fallos++; console.log('FALLA: ' + m + '  [' + seg() + ']'); } };
const errores = [];
let pagGlobal = null;
const pagTexto = async () => { try { return await pagGlobal.textContent('#tp-mensaje'); } catch (e) { return '?'; } };
try {
    const ctx = await nav.newContext({ viewport: { width: 1500, height: 900 }, hasTouch: true });
    const pag = await ctx.newPage();
    pagGlobal = pag;
    pag.on('pageerror', e => errores.push('pageerror: ' + e.message));
    pag.on('console', m => { if (m.type() === 'error') errores.push('console: ' + m.text()); });

    await pag.goto(base + '/estudio/');
    await pag.waitForSelector('#estado-servidor.ok');
    // la casilla de controles táctiles está en la pestaña Juego (oculta hasta abrirla): se marca antes de abrirla
    await pag.evaluate(() => { document.getElementById('juego-tactil').checked = true; });
    await pag.click('.pestana[data-pestana="juego"]');
    await pag.waitForFunction(() => document.getElementById('juego').src.includes('estudio=tactil'));
    const marco = pag.frames().find(f => f.url().includes('supervivencia.html'));
    ok(!!marco, 'el iframe carga supervivencia.html?estudio=tactil');
    await pag.waitForFunction(() => {
        const e = document.getElementById('juego-estado');
        return e.textContent.includes('listo') || e.className.includes('error');
    }, null, { timeout: 240000 });
    ok(/Juego listo/.test(await pag.textContent('#juego-estado')), 'el Estudio ve el juego listo');

    // /tp por nombre y por X Z
    await pag.fill('#tp-destino', 'spawn');
    await pag.click('#tp-ir');
    await pag.waitForFunction(() => /^Listo|^Done/.test(document.getElementById('tp-mensaje').textContent), null, { timeout: 15000 });
    await pag.fill('#tp-x', '300');
    await pag.fill('#tp-z', '300');
    await pag.fill('#tp-y', '');
    await pag.click('#tp-ir-xyz');
    await pag.waitForFunction(() => document.getElementById('tp-mensaje').textContent.includes('300'), null, { timeout: 15000 });
    const pos = await marco.evaluate(() => { const p = window.__venjy.jugador.pos; return [p.x, p.z]; });
    ok(Math.abs(pos[0] - 300) < 3 && Math.abs(pos[1] - 300) < 3, `tp x z llegó a ${JSON.stringify(pos)}`);
    ok((await marco.evaluate(() => window.__venjy.consola.modoDev)) === false, 'el modo devenjy queda apagado después del /tp');
    const err = await pag.evaluate(async () => {
        const { crearCliente } = await import('/estudio/puente-cliente.js');
        const c = crearCliente({ tope: 4000 });
        try { await c.tp('lugar-que-no-existe'); return 'sin error'; } catch (e) { return e.message; } finally { c.cerrar(); }
    });
    ok(/no se movió/.test(err), 'tp a un destino que no existe da error');

    // layout y textos por el puente: se ven en el botón real del juego
    const medir = () => marco.evaluate(() => {
        const e = document.querySelector('.tactil-boton.sv-romper');
        return { b: getComputedStyle(e).bottom, t: e.textContent, d: getComputedStyle(e).display };
    });
    const a0 = await medir();
    ok(a0.d !== 'none' && a0.t === 'ROMPER', 'el botón real existe: ' + JSON.stringify(a0));
    const lay = JSON.parse(fs.readFileSync(path.join(raiz, 'mundo', 'datos', 'ui-layout.json'), 'utf8'));
    lay.supervivencia.normal.botones['sv-romper'].y += 40;
    lay.supervivencia.baja.botones['sv-romper'] = { ...(lay.supervivencia.baja.botones['sv-romper'] || {}), y: 150 };
    await pag.evaluate(async d => {
        const { crearCliente } = await import('/estudio/puente-cliente.js');
        const c = crearCliente();
        await c.enviar('datos', { nombre: 'ui-layout', datos: d });
        c.cerrar();
    }, lay);
    await pag.waitForTimeout(300);
    ok((await medir()).b !== a0.b, 'layout por el puente mueve el botón real');
    const txt = JSON.parse(fs.readFileSync(datosTxt, 'utf8'));
    txt.textos.tactil.romper = { es: 'PICAR', en: 'DIG' };
    await pag.evaluate(async d => {
        const { crearCliente } = await import('/estudio/puente-cliente.js');
        const c = crearCliente();
        await c.enviar('datos', { nombre: 'textos', datos: d });
        c.cerrar();
    }, txt);
    await pag.waitForTimeout(200);
    ok((await medir()).t === 'PICAR', 'textos por el puente: ROMPER -> PICAR');

    // SSE: editar el archivo en disco llega al juego sin que el Estudio mande nada
    txt.textos.tactil.romper = { es: 'MINAR', en: 'MINE' };
    fs.writeFileSync(datosTxt, JSON.stringify(txt, null, 2) + '\n');
    await marco.waitForFunction(() => document.querySelector('.tactil-boton.sv-romper').textContent === 'MINAR', null, { timeout: 8000 })
        .then(() => {}, () => ok(false, 'el cambio en disco no llegó al juego por SSE'));
    fs.writeFileSync(datosTxt, origTxt);
    await marco.waitForFunction(() => document.querySelector('.tactil-boton.sv-romper').textContent === 'ROMPER', null, { timeout: 8000 })
        .then(() => {}, () => ok(false, 'restaurar el archivo no llegó al juego por SSE'));
    await pag.click('#juego-datos');
    await pag.waitForFunction(() => /^Aplicados|^Applied/.test(document.getElementById('datos-mensaje').textContent), null, { timeout: 8000 })
        .then(() => {}, () => ok(false, 'el botón Aplicar los archivos guardados no respondió'));
    ok(errores.length === 0, 'sin errores de consola ni de página: ' + errores.slice(0, 3).join(' | '));
} catch (e) {
    const resumen = await pagGlobal.evaluate(() => ({
        estado: document.getElementById('juego-estado').textContent,
        tp: document.getElementById('tp-mensaje').textContent,
        datos: document.getElementById('datos-mensaje').textContent
    })).catch(() => ({}));
    ok(false, 'excepción: ' + e.message.split('\n')[0] + ' ' + JSON.stringify(resumen));
} finally {
    fs.writeFileSync(datosTxt, origTxt);
    await nav.close();
    await new Promise(r => srv.close(r));
    console.log(fallos ? `${fallos} fallas` : `estudio-navegador OK (${seg()})`);
    process.exit(fallos ? 1 : 0);
}
