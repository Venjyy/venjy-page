// Prueba de navegador del Estudio, fase 4: pestaña Posiciones + gizmo en el juego + puente + guardado, con un Chromium real.
// node mundo/tests/estudio-posiciones-navegador.mjs   (necesita Playwright: variable PLAYWRIGHT o npm global; si no hay, se omite)
// Toca mundo/datos/posiciones.json un momento y lo deja como estaba (aunque falle).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { iniciar } from '../../estudio/servidor.mjs';
import { cargarPlaywright, lanzarNavegador } from '../../estudio/playwright.mjs';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
let chromium;
try { ({ chromium } = cargarPlaywright()); } catch (err) {
    console.log('estudio-posiciones-navegador omitida: ' + err.message.split('.')[0] + '.');
    process.exit(0);
}
let nav;
try { nav = await lanzarNavegador(chromium); } catch (err) {
    console.log('estudio-posiciones-navegador omitida: ' + err.message.split('\n')[0]);
    process.exit(0);
}
const srv = await iniciar({ puerto: 0, raiz });
const base = `http://127.0.0.1:${srv.address().port}`;
const archivo = path.join(raiz, 'mundo', 'datos', 'posiciones.json');
const original = fs.readFileSync(archivo);
const t0 = Date.now();
const seg = () => ((Date.now() - t0) / 1000).toFixed(1) + 's';
let fallos = 0;
const ok = (c, m) => { if (!c) { fallos++; console.log('FALLA: ' + m + '  [' + seg() + ']'); } };
const errores = [];
const tope = setTimeout(async () => { console.log('TOPE de tiempo'); try { await nav.close(); } catch (e) { /* ya cerrado */ } fs.writeFileSync(archivo, original); process.exit(1); }, 900000);
try {
    const ctx = await nav.newContext({ viewport: { width: 1500, height: 900 } });
    const pag = await ctx.newPage();
    pag.on('pageerror', e => errores.push('pageerror: ' + e.message));
    pag.on('console', m => { if (m.type() === 'error') errores.push('console: ' + m.text()); });
    const espera = (fn, arg, ms = 90000) => pag.waitForFunction(fn, arg, { timeout: ms, polling: 400 });

    await pag.goto(base + '/estudio/');
    await pag.waitForSelector('#estado-servidor.ok');
    await pag.click('.pestana[data-pestana="posiciones"]');
    ok(!(await pag.isVisible('#ps-giro')) && await pag.isVisible('#ps-lugar'), 'vista simple: los números van en Avanzado; las construcciones se ven');
    await pag.click('[data-vista="avanzado"]');
    ok(await pag.isVisible('#panel-posiciones') && await pag.isVisible('#juego'), 'la pestaña Posiciones enseña el juego y su panel');
    await espera(() => { const e = document.getElementById('juego-estado'); return e.textContent.includes('listo') || e.className.includes('error'); }, null, 240000);
    ok(/Juego listo/.test(await pag.textContent('#juego-estado')), 'el juego queda listo');
    const marco = pag.frames().find(f => f.url().includes('supervivencia.html'));

    // el juego ya colocó a todos con posiciones.json: n.x,n.z de Hadad = campamento + (-2.15, 2)
    const base0 = await marco.evaluate(() => {
        const v = window.__venjy, C = v.terreno.lugares.find(l => l.clave === 'campamento'), n = v.amigos.lista.find(q => q.clave === 'hadad');
        return { bx: C.bx, bz: C.bz, x: n.x, z: n.z, y: n.y, yaw: n.yaw, Cy: C.y, tieneGizmoLib: !!window.__venjy.estudioGizmo };
    });
    ok(base0.x === base0.bx - 2.15 && base0.z === base0.bz + 2 && base0.y === base0.Cy && base0.yaw === Math.PI / 2, 'Hadad en su sitio de siempre: ' + JSON.stringify(base0));
    ok(base0.tieneGizmoLib === false, 'el gizmo no se carga hasta elegir a alguien');

    // elegir a Hadad: el gizmo aparece sobre él
    await pag.selectOption('#ps-persona', 'hadad');
    await espera(() => /Gizmo en|drag it|Error|error|no existe|no tiene/.test(document.getElementById('ps-mensaje').textContent), null, 90000);
    ok(/Gizmo en/.test(await pag.textContent('#ps-mensaje')), 'mensaje de gizmo puesto: ' + await pag.textContent('#ps-mensaje'));
    const lib = await marco.evaluate(() => ({
        gizmo: window.__venjy.estudioGizmo && window.__venjy.estudioGizmo.activo,
        lock: !!document.pointerLockElement,
        mods: performance.getEntriesByType('resource').map(r => r.name).filter(n => /TransformControls/.test(n)).length
    }));
    ok(lib.gizmo === 'hadad' && !lib.lock, 'gizmo activo sobre hadad y el puntero libre: ' + JSON.stringify(lib));
    ok(lib.mods === 1, 'TransformControls se descargó una vez al elegir');

    // arrastrar el eje X (rojo) del gizmo con el mouse real: la cámara del juego puede estar en cualquier lado, así que se mide
    const caja = await (await marco.frameElement()).boundingBox();
    const punto = async d => {
        const s = await marco.evaluate(d2 => window.__venjy.estudioGizmo.sonda(d2), d);
        return s && s.delante ? { x: caja.x + s.x * s.lienzo[0], y: caja.y + s.y * s.lienzo[1], s } : null;
    };
    // los ejes que se ven mejor: el que más separa su punta del centro en pantalla. Si una escena arranca (o la cámara
    // se mueve) se vuelve a medir: el gizmo salta las escenas solo, pero tarda un par de cuadros.
    let mejor = null, centro = null, hover = null;
    for (let intento = 0; intento < 5 && !(hover && hover.eje); intento++) {
        await marco.waitForFunction(() => !window.__venjy.camaras.enCine, null, { timeout: 30000, polling: 300 });
        await pag.waitForTimeout(700);
        centro = await punto([0, 0, 0]);
        mejor = null;
        if (!centro) continue;
        for (const [nombre, d] of [['x', [0.34, 0, 0]], ['z', [0, 0, 0.34]]]) {
            const p = await punto(d);
            if (!p) continue;
            const largo = Math.hypot(p.x - centro.x, p.y - centro.y);
            if (!mejor || largo > mejor.largo) mejor = { nombre, p, largo, d };
        }
        if (!mejor || !(mejor.largo > 8)) continue;
        await pag.mouse.move(mejor.p.x - 3, mejor.p.y - 3);
        await pag.mouse.move(mejor.p.x, mejor.p.y);
        await pag.waitForTimeout(400);
        hover = await marco.evaluate(() => window.__venjy.estudioGizmo.sonda());
    }
    ok(!!centro && centro.s.visible, 'el gizmo está en pantalla');
    ok(mejor && mejor.largo > 8, 'un eje se distingue en pantalla: ' + JSON.stringify(mejor && { n: mejor.nombre, l: mejor.largo }));
    ok(hover && (hover.eje === 'X' || hover.eje === 'Z'), 'el mouse sobre el eje lo elige: ' + (hover && hover.eje));
    const antes = await marco.evaluate(() => { const n = window.__venjy.amigos.lista.find(q => q.clave === 'hadad'); return { x: n.x, z: n.z }; });
    await pag.mouse.down();
    const dirX = (mejor.p.x - centro.x) / mejor.largo, dirY = (mejor.p.y - centro.y) / mejor.largo;
    for (let i = 1; i <= 8; i++) { await pag.mouse.move(mejor.p.x + dirX * 14 * i, mejor.p.y + dirY * 14 * i); await pag.waitForTimeout(60); }
    await pag.mouse.up();
    await espera(() => /^Hadad:/.test(document.getElementById('ps-mensaje').textContent), null, 30000);
    const despues = await marco.evaluate(() => { const n = window.__venjy.amigos.lista.find(q => q.clave === 'hadad'); return { x: n.x, z: n.z, punto: window.__venjy.amigos.posiciones.punto('hadad') }; });
    const mov = Math.hypot(despues.x - antes.x, despues.z - antes.z);
    ok(mov > 0.2, `arrastrar movió a Hadad ${mov.toFixed(2)} bloques`);
    ok(despues.punto.ancla === 'campamento' && despues.punto.nota === 'al borde del tronco, hacia la fogata' && despues.punto.giro === 90, 'el punto conserva ancla, nota y giro: ' + JSON.stringify(despues.punto));
    const dxEditor = Number(await pag.inputValue('#ps-dx')), dzEditor = Number(await pag.inputValue('#ps-dz'));
    ok(Math.abs(dxEditor - despues.punto.dx) < 1e-9 && Math.abs(dzEditor - despues.punto.dz) < 1e-9, 'el editor muestra lo que mandó el juego');
    ok(Math.abs(despues.punto.dx - (-2.15 + (despues.x - antes.x))) < 0.011, `dx coherente con el movimiento: ${despues.punto.dx}`);
    ok(!(await pag.isDisabled('#ps-guardar')), 'Guardar se habilita con el cambio');
    ok((await pag.textContent('#ps-persona option[value="hadad"]')).includes('•'), 'la persona cambiada lleva el punto');

    // campos numéricos: se aplican al juego sin arrastrar
    await pag.fill('#ps-dz', '4.5');
    await pag.dispatchEvent('#ps-dz', 'change');
    await espera(() => true, null, 5000);
    await pag.waitForTimeout(600);
    const porCampo = await marco.evaluate(() => { const v = window.__venjy, C = v.terreno.lugares.find(l => l.clave === 'campamento'), n = v.amigos.lista.find(q => q.clave === 'hadad'); return n.z - C.bz; });
    ok(Math.abs(porCampo - 4.5) < 1e-6, `dz del campo llega al juego: ${porCampo}`);

    // modo girar y quitar gizmo
    await pag.click('[data-modo="girar"]');
    await espera(() => /Gizmo en/.test(document.getElementById('ps-mensaje').textContent), null, 60000);
    ok((await marco.evaluate(() => window.__venjy.estudioGizmo.activo)) === 'hadad', 'modo girar mantiene el gizmo');
    await pag.click('#ps-quitar');
    await pag.waitForTimeout(800);
    ok((await marco.evaluate(() => window.__venjy.estudioGizmo.activo)) === null, 'quitar gizmo');

    // guardar: el archivo cambia solo en Hadad y vuelve a leerse igual
    await pag.click('#ps-guardar');
    await espera(() => /^Guardado|^Saved/.test(document.getElementById('ps-mensaje').textContent), null, 20000);
    const guardado = JSON.parse(fs.readFileSync(archivo, 'utf8'));
    const orig = JSON.parse(original.toString('utf8'));
    ok(guardado.personas.hadad.dz === 4.5 && guardado.personas.hadad.dx === despues.punto.dx, 'el archivo trae lo movido: ' + JSON.stringify(guardado.personas.hadad));
    const otros = Object.keys(orig.personas).filter(k => k !== 'hadad' && JSON.stringify(orig.personas[k]) !== JSON.stringify(guardado.personas[k]));
    ok(otros.length === 0, 'nadie más cambió: ' + otros.join());
    ok(guardado.personas.hadad.nota === orig.personas.hadad.nota, 'la nota sigue');
    ok(await pag.isDisabled('#ps-guardar'), 'Guardar vuelve a deshabilitarse');

    // «Volver a lo guardado» tras otro cambio
    await pag.fill('#ps-giro', '135');
    await pag.dispatchEvent('#ps-giro', 'change');
    ok(!(await pag.isDisabled('#ps-restablecer')), 'restablecer disponible');
    await pag.click('#ps-restablecer');
    ok((await pag.inputValue('#ps-giro')) === '90', 'restablecer vuelve al giro guardado');

    // dy «suelo» (braulio): el campo dy se desactiva
    await pag.selectOption('#ps-persona', 'braulio');
    await pag.waitForTimeout(300);
    ok(await pag.isDisabled('#ps-dy') && await pag.isChecked('#ps-suelo'), 'braulio busca el suelo solo');
    await pag.selectOption('#ps-persona', 'moises');
    await pag.waitForTimeout(300);
    ok(/ignora|ignore|no se usa|not used/i.test(await pag.textContent('#ps-giro-nota')), 'moises avisa que su giro se calcula');

    // B6e: construcciones. Elegir el molino pone la caja sobre su centro (y suelta a la persona)
    const centroMolino = () => marco.evaluate(() => { const l = window.__venjy.terreno.lugares.find(q => q.clave === 'molino'); return { bx: l.bx, bz: l.bz }; });
    const m0 = await centroMolino();
    await pag.selectOption('#ps-lugar', 'molino');
    await espera(() => /Gizmo en Molino|Error|error/.test(document.getElementById('ps-mensaje').textContent), null, 30000);
    const g0 = await marco.evaluate(() => ({ activo: window.__venjy.estudioGizmoLugar && window.__venjy.estudioGizmoLugar.activo, punto: window.__venjy.estudioGizmoLugar && window.__venjy.estudioGizmoLugar.punto(), persona: window.__venjy.estudioGizmo && window.__venjy.estudioGizmo.activo }));
    ok(g0.activo === 'molino' && g0.punto.x === m0.bx && g0.punto.z === m0.bz && !g0.persona, 'caja del molino en su centro: ' + JSON.stringify({ g0, m0 }));
    // X a mano (Avanzado): la caja va allá; la construcción se mueve al guardar
    await pag.fill('#ps-lugar-x', String(m0.bx + 30));
    await pag.dispatchEvent('#ps-lugar-x', 'change');
    await pag.fill('#ps-lugar-z', String(m0.bz));
    await pag.dispatchEvent('#ps-lugar-z', 'change');
    await marco.waitForFunction(x => window.__venjy.estudioGizmoLugar.punto().x === x, m0.bx + 30, { timeout: 10000 });
    ok(true, 'la caja sigue a los números');
    await pag.click('#ps-guardar');
    await espera(() => /^Guardado|^Saved/.test(document.getElementById('ps-mensaje').textContent), null, 20000);
    ok(JSON.parse(fs.readFileSync(archivo, 'utf8')).lugares.molino.x === m0.bx + 30, 'el archivo trae lugares.molino');
    // el juego se recarga solo y arma el molino en su sitio nuevo
    await marco.waitForFunction(x => { const v = window.__venjy; const l = v && v.terreno && v.terreno.lugares.find(q => q.clave === 'molino'); return l && l.bx === x && v.consola; }, m0.bx + 30, { timeout: 240000, polling: 500 });
    ok(true, 'tras guardar, el juego se recargó con el molino movido');
    // volver a su sitio de siempre
    await espera(() => /listo/.test(document.getElementById('juego-estado').textContent), null, 120000);
    await pag.click('#ps-lugar-auto');
    await pag.click('#ps-guardar');
    await espera(() => /^Guardado|^Saved/.test(document.getElementById('ps-mensaje').textContent), null, 20000);
    ok(!('lugares' in JSON.parse(fs.readFileSync(archivo, 'utf8'))), 'sin construcciones movidas no queda la clave lugares');
    await marco.waitForFunction(x => { const v = window.__venjy; const l = v && v.terreno && v.terreno.lugares.find(q => q.clave === 'molino'); return l && l.bx === x && v.consola; }, m0.bx, { timeout: 240000, polling: 500 });
    ok(true, 'el molino vuelve a su sitio de siempre');
} catch (e) {
    fallos++;
    console.log('ERROR: ' + (e && e.message));
} finally {
    clearTimeout(tope);
    fs.writeFileSync(archivo, original);
    try { await nav.close(); } catch (e) { /* ya cerrado */ }
    srv.close();
}
const reales = errores.filter(e => !/preload|favicon|WebGL|GPU stall|swiftshader/i.test(e));
if (reales.length) { console.log('errores en consola:'); for (const e of reales.slice(0, 6)) console.log('  ' + e); }
console.log(fallos ? `estudio-posiciones-navegador: ${fallos} FALLAS` : 'estudio-posiciones-navegador: todo bien');
process.exit(fallos ? 1 : 0);
