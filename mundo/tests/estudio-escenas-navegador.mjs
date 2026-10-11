// Prueba de navegador del Estudio, fase 5 (PR 5b y 5c): pestaña Escenas, línea de tiempo, puente, guardado y planos de cámara,
// con un Chromium real.
// node mundo/tests/estudio-escenas-navegador.mjs   (necesita Playwright: variable PLAYWRIGHT o npm global; si no hay, se omite)
// Toca mundo/datos/escenas.json un momento y lo deja como estaba (aunque falle).
// CAPTURA=ruta.png guarda una captura de la pestaña (para el Artifact); CAPTURA_CAMARA=ruta.png, la del panel de cámara con «Ver».
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { iniciar } from '../../estudio/servidor.mjs';
import { cargarPlaywright, lanzarNavegador } from '../../estudio/playwright.mjs';
import { PLANOS_AMISTAD } from '../supervivencia/escena-amistad-datos.js';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
let chromium;
try { ({ chromium } = cargarPlaywright()); } catch (err) {
    console.log('estudio-escenas-navegador omitida: ' + err.message.split('.')[0] + '.');
    process.exit(0);
}
let nav;
try { nav = await lanzarNavegador(chromium); } catch (err) {
    console.log('estudio-escenas-navegador omitida: ' + err.message.split('\n')[0]);
    process.exit(0);
}
const srv = await iniciar({ puerto: 0, raiz });
const base = `http://127.0.0.1:${srv.address().port}`;
const archivo = path.join(raiz, 'mundo', 'datos', 'escenas.json');
const original = fs.readFileSync(archivo);
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
    ok(await pag.isEnabled('.pestana[data-pestana="escenas"]'), 'la pestaña Escenas está habilitada');
    await pag.click('.pestana[data-pestana="escenas"]');
    ok(await pag.isVisible('#es-linea') && await pag.isVisible('#juego') && await pag.isVisible('#panel-escenas'), 'Escenas enseña la línea, el juego y su panel');

    // el juego carga primero: abrir el mundo es lo que captura el mouse, y el editor tiene que soltarlo (puntero libre)
    await espera(() => { const e = document.getElementById('juego-estado'); return e.textContent.includes('listo') || e.className.includes('error'); }, null, 300000);
    ok(/Juego listo/.test(await pag.textContent('#juego-estado')), 'el juego queda listo: ' + await pag.textContent('#juego-estado'));
    const marco = pag.frames().find(f => f.url().includes('supervivencia.html'));
    await pag.waitForTimeout(1500);
    ok(await marco.evaluate(() => !document.pointerLockElement && document.head.textContent.includes('.clic-seguir')), 'el mouse queda libre en el juego (puntero-libre)');

    // lista: las dos del JSON y las dos del código
    await pag.waitForSelector('#es-lista button');
    const lista = await pag.$$eval('#es-lista button', bs => bs.map(b => b.textContent));
    ok(lista.length === 4, 'la lista trae 4 escenas: ' + lista.join(' | '));
    ok(lista.filter(x => /código/.test(x)).length === 2, 'abrazo y secreto salen «en código»: ' + lista.join(' | '));
    ok(lista.some(x => x.startsWith('punos') && /JSON/.test(x)), 'punos es del JSON');

    await espera(() => window.__estudioEscenas.motor(), null, 30000); // los gestos del juego se importan al abrir la pestaña
    // la línea de punos: filas n y j, una frase, un golpe
    await pag.click('#es-lista button[data-clave="punos"]');
    const cuenta = await pag.evaluate(() => ({
        tramos: document.querySelectorAll('.es-bloque.gesto').length,
        frases: document.querySelectorAll('.es-bloque.frase').length,
        golpes: document.querySelectorAll('.es-marca canvas').length,
        filas: [...document.querySelectorAll('.es-gestos .es-rotulo')].map(e => e.textContent)
    }));
    ok(cuenta.tramos === 5 && cuenta.frases === 1 && cuenta.golpes === 1 && cuenta.filas.length === 2, 'punos: 5 tramos, 1 frase, 1 golpe, 2 filas: ' + JSON.stringify(cuenta));

    // arrastrar el bloque «asiente» (fila j, 2.6–4.4) 0,4 s a la derecha con el mouse real
    const bloque = pag.locator('.es-bloque.gesto[data-q="j"][data-i="1"]');
    const px = Number(await pag.$eval('.es-interior', e => e.dataset.px));
    await bloque.scrollIntoViewIfNeeded();
    const cj = await bloque.boundingBox();
    const y = cj.y + cj.height / 2, x0 = cj.x + cj.width / 2;
    await pag.mouse.move(x0, y);
    await pag.mouse.down();
    for (let i = 1; i <= 6; i++) { await pag.mouse.move(x0 + 0.4 * px * i / 6, y); await pag.waitForTimeout(40); }
    await pag.mouse.up();
    let d = await pag.evaluate(() => JSON.parse(JSON.stringify(window.__estudioEscenas.datos.escenas.punos.pista.j)));
    ok(d[1][0] === 'asiente' && d[1][1] === 3 && d[1][2] === 4.8, 'arrastrar movió el bloque a 3–4.8: ' + JSON.stringify(d[1]));
    ok(await pag.inputValue('#es-desde') === '3' && await pag.inputValue('#es-hasta') === '4.8', 'el panel muestra 3 y 4.8');

    // estirar el borde derecho 0,3 s: el vecino de la derecha no existe, así que llega
    const b2 = await pag.locator('.es-bloque.gesto[data-q="j"][data-i="1"] .asa.der').boundingBox();
    await pag.mouse.move(b2.x + b2.width / 2, b2.y + b2.height / 2);
    await pag.mouse.down();
    for (let i = 1; i <= 4; i++) { await pag.mouse.move(b2.x + b2.width / 2 + 0.3 * px * i / 4, b2.y + b2.height / 2); await pag.waitForTimeout(40); }
    await pag.mouse.up();
    d = await pag.evaluate(() => window.__estudioEscenas.datos.escenas.punos.pista.j[1]);
    ok(d[1] === 3 && d[2] === 5.1, 'estirar el borde derecho dejó 3–5.1: ' + JSON.stringify(d));

    // el tope: arrastrar el mismo bloque hasta el final no pasa de T (5.6)
    const b3 = await pag.locator('.es-bloque.gesto[data-q="j"][data-i="1"]').boundingBox();
    await pag.mouse.move(b3.x + b3.width / 2, b3.y + b3.height / 2);
    await pag.mouse.down();
    await pag.mouse.move(b3.x + b3.width / 2 + 5 * px, b3.y + b3.height / 2, { steps: 5 });
    await pag.mouse.up();
    d = await pag.evaluate(() => window.__estudioEscenas.datos.escenas.punos.pista.j[1]);
    ok(d[2] === 5.6 && d[1] === 3.5, 'el bloque se detiene en T 5.6: ' + JSON.stringify(d));
    // y vuelve (Ctrl+Z tres veces), después se deja en 3–4.8 con los números
    await pag.fill('#es-desde', '3');
    await pag.dispatchEvent('#es-desde', 'change');
    await pag.fill('#es-hasta', '4.8');
    await pag.dispatchEvent('#es-hasta', 'change');
    d = await pag.evaluate(() => window.__estudioEscenas.datos.escenas.punos.pista.j[1]);
    ok(d[1] === 3 && d[2] === 4.8, 'los campos numéricos dejan 3–4.8: ' + JSON.stringify(d));

    // avisos en vivo: el gesto «volar» no existe
    await pag.dblclick('.es-bloque.gesto[data-q="j"][data-i="1"]');
    await pag.waitForSelector('#es-selector:not([hidden])');
    await pag.fill('#es-selector-texto', 'volar');
    ok((await pag.textContent('#es-selector-lista')).includes('Ningún'), 'el selector filtra: sin gesto «volar»');
    await pag.fill('#es-selector-texto', 'asie');
    const primero = await pag.textContent('#es-selector-lista button');
    ok(primero === 'asiente', 'el selector filtra por texto: ' + primero);
    await pag.keyboard.press('Enter');
    ok(await pag.isHidden('#es-selector'), 'Enter elige y cierra el selector');

    // doble clic en una fila vacía agrega un golpe y un corazón
    const filaGolpes = await pag.locator('.es-pista[data-fila="golpes"]').boundingBox();
    await pag.mouse.dblclick(filaGolpes.x + 4.0 * px, filaGolpes.y + filaGolpes.height / 2);
    const g = await pag.evaluate(() => window.__estudioEscenas.datos.escenas.punos.golpes);
    ok(g.length === 2 && g[1] === 4, 'doble clic en la fila de golpes agrega uno en 4 s: ' + JSON.stringify(g));
    await pag.keyboard.press('Delete');
    const g2 = await pag.evaluate(() => window.__estudioEscenas.datos.escenas.punos.golpes);
    ok(g2.length === 1 && g2[0] === 1.45, 'Supr borra la marca elegida: ' + JSON.stringify(g2));

    // guardar: una sola línea de escenas.json cambia (el tramo del jugador)
    ok(!(await pag.isDisabled('#es-guardar')), 'Guardar se habilita con el cambio');
    await pag.click('#es-guardar');
    await espera(() => /^Guardado|^Saved/.test(document.getElementById('es-mensaje').textContent), null, 20000);
    const antes = original.toString('utf8').split('\n'), despues = fs.readFileSync(archivo, 'utf8').split('\n');
    const difs = antes.map((l, i) => [l, despues[i]]).filter(([a, b]) => a !== b);
    ok(antes.length === despues.length && difs.length === 1, 'cambió una sola línea de escenas.json: ' + difs.length + ' ' + JSON.stringify(difs));
    ok(difs.length === 1 && /asiente/.test(difs[0][1]) && /3, 4.8/.test(difs[0][1]), 'la línea nueva es el tramo movido: ' + (difs[0] && difs[0][1]));
    ok(await pag.isDisabled('#es-guardar'), 'Guardar vuelve a deshabilitarse');

    await pag.selectOption('#es-persona', 'andy');
    ok(!(await pag.isDisabled('#es-jugar')), 'Reproducir se habilita con el juego listo');
    await pag.click('#es-jugar');
    await espera(() => /Reproduciendo|Playing|No pud|could|Error|necesita|error/i.test(document.getElementById('es-mensaje').textContent), null, 60000);
    const mensaje = await pag.textContent('#es-mensaje');
    ok(/Reproduciendo|Playing/.test(mensaje), 'la escena empezó: ' + mensaje);
    await espera(() => document.querySelector('#es-cabezal.activo'), null, 15000);
    const t1 = await marco.evaluate(() => window.__venjy.amistadEscena.escena && window.__venjy.amistadEscena.escena.t);
    await pag.waitForTimeout(900);
    const t2 = await marco.evaluate(() => window.__venjy.amistadEscena.escena && window.__venjy.amistadEscena.escena.t);
    ok(t1 !== null && t2 !== null && t2 > t1, `t avanza en el juego: ${t1} → ${t2}`);
    const tEd = await pag.evaluate(() => document.getElementById('es-tiempo').textContent);
    ok(/^t \d+\.\d\d \/ 5\.6 s$/.test(tEd) && !/^t 0\.00/.test(tEd), 'el cabezal del editor sigue a la escena: ' + tEd);

    // pausa, ir a 1.45 (cabezal) y parar
    await pag.click('#es-pausa');
    await pag.waitForTimeout(500);
    const p1 = await marco.evaluate(() => window.__venjy.amistadEscena.escena.t);
    await pag.waitForTimeout(700);
    const p2 = await marco.evaluate(() => window.__venjy.amistadEscena.escena.t);
    ok(p1 === p2, `en pausa t no avanza: ${p1} / ${p2}`);
    const regla = await pag.locator('.es-pista[data-fila="regla"]').boundingBox();
    await pag.mouse.click(regla.x + 1.45 * px, regla.y + regla.height / 2);
    await pag.waitForTimeout(600);
    const ir = await marco.evaluate(() => window.__venjy.amistadEscena.escena.t);
    ok(Math.abs(ir - 1.45) < 0.06, 'clic en la regla salta la escena a 1.45: ' + ir);
    if (process.env.CAPTURA) await pag.screenshot({ path: process.env.CAPTURA });
    await pag.click('#es-pausa');
    await pag.click('#es-parar');
    await pag.waitForTimeout(500);
    ok(await marco.evaluate(() => !window.__venjy.amistadEscena.activa), 'Parar termina la escena');

    // PR 5c · cámara: lista de planos, «Usar juego», «Ver» (solo ese plano) y vuelta a lo de siempre
    await pag.click('#es-lista button[data-clave="punos"]');
    const camDatos = () => pag.evaluate(() => { const c = window.__estudioEscenas.datos.escenas.punos.camara; return c ? JSON.parse(JSON.stringify(c)) : null; });
    const nPlanos = () => pag.locator('.es-plano').count();
    const planoJuego = () => marco.evaluate(() => window.__venjy.camaras.planoNombre);
    ok(/Sin cámara propia/.test(await pag.textContent('#es-camara-estado')) && await nPlanos() === 0 && await camDatos() === null, 'punos sin camara: el panel lo dice y no hay planos');
    await pag.click('#es-camara [data-juego="grupo"]');
    let cam = await camDatos();
    ok(cam && cam.planos === 'grupo' && await nPlanos() === 5, 'Usar juego: grupo guarda el nombre y enseña sus 5 planos: ' + JSON.stringify(cam));
    ok(await pag.inputValue('.es-plano[data-i="0"] input[data-campo="nombre"]') === 'grupo de lado' && await pag.inputValue('.es-plano[data-i="0"] input[data-campo="dist"]') === '6.2', 'los campos traen los números del juego');
    await pag.fill('.es-plano[data-i="0"] input[data-campo="dist"]', '7');
    await pag.dispatchEvent('.es-plano[data-i="0"] input[data-campo="dist"]', 'change');
    cam = await camDatos();
    ok(Array.isArray(cam.planos) && cam.planos.length === 5 && cam.planos[0].dist === 7 && cam.planos[1].dist === 6.4, 'editar un plano copia la lista del juego a una propia: ' + JSON.stringify(cam).slice(0, 120));
    await pag.click('#es-plano-agregar');
    await pag.fill('.es-plano[data-i="5"] input[data-campo="nombre"]', 'cenital');
    await pag.dispatchEvent('.es-plano[data-i="5"] input[data-campo="nombre"]', 'change');
    await pag.fill('.es-plano[data-i="5"] input[data-campo="alto"]', '5');
    await pag.dispatchEvent('.es-plano[data-i="5"] input[data-campo="alto"]', 'change');
    cam = await camDatos();
    ok(cam.planos.length === 6 && cam.planos[5].nombre === 'cenital' && cam.planos[5].alto === 5, 'Agregar plano y editar su nombre y alto');
    await pag.click('.es-plano[data-i="5"] [data-accion="subir"]');
    cam = await camDatos();
    ok(cam.planos[4].nombre === 'cenital' && cam.planos[5].nombre === 'grupo, picado', 'Subir cambia el orden');
    // «Ver»: la escena corre con solo ese plano
    await pag.click('.es-plano[data-i="4"] [data-accion="ver"]');
    await espera(() => /Reproduciendo|Playing|No pud|could|Error|necesita|error/i.test(document.getElementById('es-mensaje').textContent), null, 60000);
    let nombre = null;
    for (let i = 0; i < 40 && nombre === null; i++) { nombre = await planoJuego(); if (nombre === null) await pag.waitForTimeout(250); }
    ok(nombre === 'cenital', 'Ver: la cámara del juego usa solo el plano elegido («cenital»), vio ' + nombre);
    if (process.env.CAPTURA_CAMARA) { await pag.screenshot({ path: process.env.CAPTURA_CAMARA, fullPage: true }); }
    await pag.click('#es-parar');
    await pag.waitForTimeout(500);
    ok(await marco.evaluate(() => !window.__venjy.amistadEscena.activa), 'Parar termina la vista del plano');
    // Después de «Ver» el juego vuelve a la lista completa: la próxima reproducción usa los 6 planos
    await pag.click('#es-jugar');
    await espera(() => /Reproduciendo|Playing/.test(document.getElementById('es-mensaje').textContent), null, 60000);
    nombre = null;
    for (let i = 0; i < 40 && nombre === null; i++) { nombre = await planoJuego(); if (nombre === null) await pag.waitForTimeout(250); }
    const nombres = (await camDatos()).planos.map(p => p.nombre);
    ok(nombre !== null && nombres.includes(nombre), 'Reproducir: usa un plano de la lista propia (' + nombre + ')');
    await pag.click('#es-parar');
    await pag.waitForTimeout(500);
    // quitar todos los planos: la escena vuelve a la cámara de siempre (sin clave camara)
    while (await nPlanos() > 0) await pag.click('.es-plano[data-i="0"] [data-accion="quitar"]');
    ok(await camDatos() === null && /Sin cámara propia/.test(await pag.textContent('#es-camara-estado')), 'quitar el último plano elimina la camara');
    await pag.click('#es-jugar');
    await espera(() => /Reproduciendo|Playing/.test(document.getElementById('es-mensaje').textContent), null, 60000);
    nombre = null;
    for (let i = 0; i < 40 && nombre === null; i++) { nombre = await planoJuego(); if (nombre === null) await pag.waitForTimeout(250); }
    ok(nombre !== null && PLANOS_AMISTAD.some(p => p.nombre === nombre), 'sin camara: el plano es uno de PLANOS_AMISTAD (' + nombre + ')');
    await pag.click('#es-parar');
    await pag.waitForTimeout(500);

    // una escena en código (abrazo): editarla la copia al JSON; deshacer la saca
    await pag.click('#es-lista button[data-clave="abrazo"]');
    const fa = await pag.locator('.es-pista[data-fila="golpes"]').boundingBox();
    await pag.mouse.dblclick(fa.x + 2 * px * 0.9, fa.y + fa.height / 2);
    const copiada = await pag.evaluate(() => !!window.__estudioEscenas.datos.escenas.abrazo);
    ok(copiada, 'editar abrazo (en código) la copia al JSON');
    await pag.click('#es-deshacer');
    ok(!(await pag.evaluate(() => !!window.__estudioEscenas.datos.escenas.abrazo)), 'Deshacer la saca del JSON otra vez');

    // escena nueva de guion: aparece en la lista, válida y reproducible por clave
    await pag.click('#es-nueva');
    ok(await pag.evaluate(() => window.__estudioEscenas.actual === 'escena'), 'Nueva escena crea «escena» y la elige');
    await pag.click('.es-bloque.frase');
    ok(await pag.isVisible('#es-texto-es') && (await pag.inputValue('#es-texto-es')) === 'Hola', 'la frase de guion se edita en el panel');
    ok((await pag.textContent('#es-avisos')).includes('sin revisar'), 'el aviso de texto sin revisar sale en vivo');

    ok(errores.length === 0, 'sin errores de consola ni de página: ' + errores.slice(0, 3).join(' | '));
} catch (err) {
    fallos++;
    console.log('FALLA: ' + err.message.split('\n').slice(0, 4).join(' / ') + '  [' + seg() + ']');
} finally {
    clearTimeout(tope);
    restaurar();
    try { await nav.close(); } catch (e) { /* ya cerrado */ }
    srv.close();
}
const igual = fs.readFileSync(archivo).equals(original);
if (!igual) { fallos++; console.log('FALLA: escenas.json no volvió a como estaba'); }
if (fallos) { console.log(`${fallos} fallos`); process.exit(1); }
console.log('estudio-escenas-navegador: todo bien (' + seg() + ')');
process.exit(0);
