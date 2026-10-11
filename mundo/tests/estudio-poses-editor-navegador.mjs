// Prueba de navegador del Estudio, fase 6b: la pestaña Poses con un Chromium real.
// node mundo/tests/estudio-poses-editor-navegador.mjs   (necesita Playwright: variable PLAYWRIGHT o npm global; si no hay, se omite)
// Abre /estudio/ en la pestaña Poses: la lista trae los gestos del JSON y los del código; la vista propia mide la mano
// igual que el modelo puro (Three.js contra puntaMano); un slider cambia el dato; «Posar en el juego» deja quieto a Andy
// con esos canales (su brazo y la mano medida en el juego coinciden) y lo suelta; Guardar escribe poses.json (válido) y
// la prueba lo deja como estaba.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { iniciar } from '../../estudio/servidor.mjs';
import { cargarPlaywright, lanzarNavegador } from '../../estudio/playwright.mjs';
import { validar } from '../../estudio/validar.mjs';
import { puntaMano } from '../../estudio/poses-modelo.mjs';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
let chromium;
try { ({ chromium } = cargarPlaywright()); } catch (err) {
    console.log('estudio-poses-editor-navegador omitida: ' + err.message.split('.')[0] + '.');
    process.exit(0);
}
let nav;
try { nav = await lanzarNavegador(chromium); } catch (err) {
    console.log('estudio-poses-editor-navegador omitida: ' + err.message.split('\n')[0]);
    process.exit(0);
}
const srv = await iniciar({ puerto: 0, raiz });
const base = `http://127.0.0.1:${srv.address().port}`;
const archivo = path.join(raiz, 'mundo', 'datos', 'poses.json');
const original = fs.readFileSync(archivo);
const t0 = Date.now();
const seg = () => ((Date.now() - t0) / 1000).toFixed(1) + 's';
let fallos = 0;
const ok = (c, m) => { if (!c) { fallos++; console.log('FALLA: ' + m + '  [' + seg() + ']'); } };
const cerca = (a, b, e = 0.002) => Math.abs(a - b) <= e;
const errores = [];
const restaurar = () => { try { fs.writeFileSync(archivo, original); } catch (e) { /* nada */ } };
const tope = setTimeout(async () => { console.log('TOPE de tiempo'); try { await nav.close(); } catch (e) { /* ya cerrado */ } restaurar(); process.exit(1); }, 420000);
try {
    const ctx = await nav.newContext({ viewport: { width: 1500, height: 1100 } });
    const pag = await ctx.newPage();
    pag.on('pageerror', e => errores.push('pageerror: ' + e.message));
    pag.on('console', m => { if (m.type() === 'error') errores.push('console: ' + m.text()); });
    const espera = (fn, arg, ms = 90000) => pag.waitForFunction(fn, arg, { timeout: ms, polling: 400 });

    await pag.goto(base + '/estudio/');
    await pag.waitForSelector('#estado-servidor.ok');
    await pag.click('.pestana[data-pestana="poses"]');
    ok(await pag.isVisible('#po-zona') && await pag.isVisible('#panel-poses'), 'la pestaña Poses enseña su zona y su panel');

    // 1. Lista: JSON y código
    await espera(() => document.querySelectorAll('#po-lista button.codigo').length > 0, null, 60000);
    const lista = await pag.$$eval('#po-lista button', bs => bs.map(b => [b.dataset.tipo, b.dataset.clave]));
    ok(lista.some(([t, k]) => t === 'gesto' && k === 'habla') && lista.some(([t, k]) => t === 'pose' && k === 'doblarse'), 'la lista trae gestos y poses del JSON');
    ok(lista.some(([t, k]) => t === 'codigo' && k === 'baile'), 'y los del código que el JSON no reemplaza (baile)');
    ok(!lista.some(([t, k]) => t === 'codigo' && k === 'habla'), 'habla no aparece dos veces');

    // 2. Pose doblarse: la vista propia mide lo mismo que el modelo
    await pag.click('#po-lista button[data-tipo="pose"][data-clave="doblarse"]');
    const vista = await pag.evaluate(() => ({ canales: window.__estudioPoses.canalesAhora(), d: window.__estudioPoses.medirVista('D'), i: window.__estudioPoses.medirVista('I') }));
    const md = puntaMano(vista.canales, 'D'), mi = puntaMano(vista.canales, 'I');
    ok(vista.d && cerca(vista.d.adelante, md.adelante) && cerca(vista.d.altura, md.altura) && cerca(vista.d.lado, md.lado), `mano D: vista ${JSON.stringify(vista.d)} = modelo ${JSON.stringify(md)}`);
    ok(vista.i && cerca(vista.i.adelante, mi.adelante) && cerca(vista.i.altura, mi.altura), `mano I: vista ${JSON.stringify(vista.i)} = modelo ${JSON.stringify(mi)}`);
    ok(/Mano D|Right hand/.test(await pag.textContent('#po-medida')), 'la medida se muestra');

    // 3. Slider: inc de doblarse a 0.4
    await pag.$eval('.po-canal[data-canal="inc"] input[type="range"]', el => { el.value = '0.4'; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); });
    ok(await pag.evaluate(() => window.__estudioPoses.datos().poses.doblarse.canales.inc) === 0.4, 'el slider cambia el dato');
    ok(/1 pose/.test(await pag.textContent('#po-resumen')), 'el resumen cuenta el cambio');

    // 4. En el juego: Andy posa doblarse (inc 0.4) y se suelta
    await espera(() => { const e = document.getElementById('juego-estado'); return e.textContent.includes('listo') || e.className.includes('error'); }, null, 300000);
    ok(/Juego listo/.test(await pag.textContent('#juego-estado')), 'el juego queda listo: ' + await pag.textContent('#juego-estado'));
    const marco = pag.frames().find(f => f.url().includes('supervivencia.html'));
    await pag.selectOption('#po-persona', 'andy');
    await pag.check('#po-en-juego');
    await espera(() => /mano D|right hand/i.test(document.getElementById('po-juego-medida').textContent) || /error/.test(document.getElementById('po-juego-medida').className), null, 30000);
    const enJuego = await marco.evaluate(() => { const n = window.__venjy.amigos.lista.find(q => q.clave === 'andy'); return { inc: n.p.cuerpo.rotation.x, bDx: n.p.brazoD.rotation.x, escena: typeof n.escena }; });
    ok(cerca(enJuego.inc, 0.4, 1e-6) && cerca(enJuego.bDx, -0.55, 1e-6) && enJuego.escena === 'function', 'Andy posa doblarse con inc 0.4: ' + JSON.stringify(enJuego));
    const texto = await pag.textContent('#po-juego-medida');
    const mj = puntaMano({ ...vista.canales, inc: 0.4 }, 'D');
    const [ja, jh] = (texto.match(/-?\d+\.\d+/g) || []).map(Number);
    ok(cerca(ja, mj.adelante, 0.006) && cerca(jh, mj.altura, 0.006), `la mano medida en el juego = modelo (${texto} / ${mj.adelante}, ${mj.altura})`);
    await pag.uncheck('#po-en-juego');
    await marco.waitForFunction(() => !window.__venjy.amigos.lista.find(q => q.clave === 'andy').escena, null, { timeout: 10000, polling: 400 });
    ok(true, 'Andy vuelve a su animación');

    // 5. Gesto habla: una clave en el canal bDx con el botón +k, y Guardar
    await pag.click('#po-lista button[data-tipo="gesto"][data-clave="habla"]');
    await pag.click('.po-canal[data-canal="bDx"] button:text("+k")');
    const k = await pag.evaluate(() => window.__estudioPoses.datos().gestos.habla.canales.bDx);
    ok(Array.isArray(k.k) && k.osc && k.osc.length === 1, '+k pasa la base a claves y conserva el oscilador: ' + JSON.stringify(k));
    ok(await pag.isVisible('#po-curva'), 'la curva del canal se ve');
    ok(!(await pag.isDisabled('#po-guardar')), 'se puede guardar');
    await pag.click('#po-guardar');
    await espera(() => /Guardado|Saved|No se|Not saved/.test(document.getElementById('po-mensaje').textContent), null, 20000);
    ok(/Guardado|Saved/.test(await pag.textContent('#po-mensaje')), 'guardado: ' + await pag.textContent('#po-mensaje'));
    const enDisco = JSON.parse(fs.readFileSync(archivo, 'utf8'));
    ok(enDisco.poses.doblarse.canales.inc === 0.4 && Array.isArray(enDisco.gestos.habla.canales.bDx.k), 'el disco tiene los cambios');
    ok(validar(enDisco, 'poses').length === 0, 'lo guardado es válido');

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
if (!fs.readFileSync(archivo).equals(original)) { fallos++; console.log('FALLA: poses.json no volvió a como estaba'); }
if (fallos) { console.log(`${fallos} fallos`); process.exit(1); }
console.log('estudio-poses-editor-navegador: todo bien (' + seg() + ')');
process.exit(0);
