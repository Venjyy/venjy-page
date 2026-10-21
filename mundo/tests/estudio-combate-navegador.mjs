// Prueba de navegador de la pestaña Combate del Estudio (bloque 8 · N6c) con un Chromium real: visor (pausa del golpe,
// empuje, rival de otro estilo, canal nuevo), los paneles Peso («oír»), Reacciones, Controles (capturar una tecla) y CPU,
// y «Probar en el juego» (la arena en práctica: el rival repite el ataque elegido).
// node mundo/tests/estudio-combate-navegador.mjs   (necesita Playwright: variable PLAYWRIGHT o npm global; si no hay, se omite)
// No guarda nada; igual deja combate.json y los estilos como estaban (aunque falle).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { iniciar } from '../../estudio/servidor.mjs';
import { cargarPlaywright, lanzarNavegador } from '../../estudio/playwright.mjs';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
let chromium;
try { ({ chromium } = cargarPlaywright()); } catch (err) {
    console.log('estudio-combate-navegador omitida: ' + err.message.split('.')[0] + '.');
    process.exit(0);
}
let nav;
try { nav = await lanzarNavegador(chromium); } catch (err) {
    console.log('estudio-combate-navegador omitida: ' + err.message.split('\n')[0]);
    process.exit(0);
}
const srv = await iniciar({ puerto: 0, raiz });
const base = `http://127.0.0.1:${srv.address().port}`;
const archivos = ['combate', 'estilo-sekiro', 'estilo-urbano'].map(n => path.join(raiz, 'mundo', 'datos', n + '.json'));
const originales = archivos.map(a => fs.readFileSync(a));
const restaurar = () => archivos.forEach((a, i) => { if (!fs.readFileSync(a).equals(originales[i])) fs.writeFileSync(a, originales[i]); });
const t0 = Date.now();
const seg = () => ((Date.now() - t0) / 1000).toFixed(1) + 's';
let fallos = 0;
const ok = (c, m) => { if (!c) { fallos++; console.log('FALLA: ' + m + '  [' + seg() + ']'); } };
const errores = [];
const tope = setTimeout(async () => { console.log('TOPE de tiempo'); try { await nav.close(); } catch (e) { /* ya cerrado */ } restaurar(); process.exit(1); }, 420000);
try {
    const ctx = await nav.newContext({ viewport: { width: 1500, height: 950 } });
    const pag = await ctx.newPage();
    pag.on('pageerror', e => errores.push('pageerror: ' + e.message));
    pag.on('console', m => { if (m.type() === 'error') errores.push('console: ' + m.text()); });
    const espera = (fn, arg, ms = 90000) => pag.waitForFunction(fn, arg, { timeout: ms, polling: 300 });
    const co = (fn, arg) => pag.evaluate(fn, arg);

    await pag.goto(base + '/estudio/');
    await pag.waitForSelector('#estado-servidor.ok');
    // (las pestañas se conectan después de montar todas: se reintenta el clic hasta que abre)
    await espera(() => { document.querySelector('.pestana[data-pestana="combate"]').click(); return !document.getElementById('co-zona').hidden && !!window.__estudioCombate; });
    await co(() => window.__estudioCombate.elegir('estilo-sekiro', 'ataques', 'tajo1'));

    // ---- Visor: pausa del golpe y empuje ----
    const s1 = await co(() => { const s = window.__estudioCombate.sim(); return { hs: s.hitstop, emp: s.empuje, n: s.cuadros.length, z0: s.cuadros[0].raizR.z, z1: s.cuadros[s.cuadros.length - 1].raizR.z }; });
    ok(s1.hs > 0 && s1.z1 > s1.z0, 'el visor congela el golpe y empuja al rival: ' + JSON.stringify(s1));
    await pag.locator('#co-peso').dispatchEvent('click');
    const s2 = await co(() => { const s = window.__estudioCombate.sim(); return { hs: s.hitstop, n: s.cuadros.length }; });
    ok(s2.hs === 0 && s2.n === s1.n - s1.hs, 'sin «pausa y empuje» el bucle es el de antes');
    await pag.locator('#co-peso').dispatchEvent('click');
    // ---- Rival de otro estilo ----
    await pag.selectOption('#co-rival', 'estilo-urbano');
    const r = await co(() => { const s = window.__estudioCombate.sim(); return { reac: s.reaccion, medir: window.__estudioCombate.medir(s.antes + s.golpe) }; });
    ok(!!r.reac && Array.isArray(r.medir), 'rival de Urban Reign: reacciona y la punta se mide: ' + JSON.stringify(r));
    await pag.selectOption('#co-rival', '');
    // ---- Canal nuevo ----
    await pag.locator('#co-ver-claves').dispatchEvent('click');
    ok(await pag.isVisible('#co-canal-nuevo'), 'aparece «+ Canal» con las claves');
    const canal = await pag.inputValue('#co-canal-nuevo select');
    await pag.locator('#co-canal-nuevo button').dispatchEvent('click');
    const tiene = await co(k => { const a = window.__estudioCombate.archivos['estilo-sekiro'].datos; const n = a.ataques.tajo1.anim || 'tajo1'; return !!(a.anim[n] && a.anim[n].canales[k]); }, canal);
    ok(tiene && !(await pag.isDisabled('#co-guardar')), `el canal ${canal} se agregó a la animación y se puede guardar`);
    await pag.locator('#co-ver-claves').dispatchEvent('click');
    await pag.locator('#co-descartar').dispatchEvent('click');

    // ---- Paneles ----
    await pag.locator('#co-paneles [data-panel="peso"]').dispatchEvent('click');
    ok(await pag.isVisible('#co-campos [data-capa="todo"]'), 'Peso trae los botones «Oír»');
    await pag.locator('#co-campos [data-capa="impacto"]').dispatchEvent('click');
    const son = await co(() => window.__estudioCombate.ultimoSonido);
    ok(Array.isArray(son) && son.length > 0 && son.every(v => !v.retardo), 'oír el impacto solo: ' + (son && son.length));
    // el hitstop del nivel del tajo llega al visor
    const nivel = await co(() => window.__estudioCombate.sim().nivel);
    await pag.selectOption('#co-campos select >> nth=0', nivel);
    const campo = pag.locator('#co-campos label.campo', { hasText: 'Pausa del golpe' }).locator('input[type=number]');
    await campo.fill('13'); await campo.dispatchEvent('change');
    ok(await co(() => window.__estudioCombate.sim().hitstop) === 13, 'cambiar la pausa del golpe cambia el visor');
    ok(!(await pag.isDisabled('#co-guardar')), 'Guardar se habilita');
    await pag.locator('#co-paneles [data-panel="reacciones"]').dispatchEvent('click');
    ok(await pag.locator('#co-campos select').count() >= 9, 'Reacciones trae la tabla altura × nivel');
    await pag.locator('#co-paneles [data-panel="controles"]').dispatchEvent('click');
    const tecla = pag.locator('#co-campos button[data-accion="saltar"][data-i="0"]');
    await tecla.dispatchEvent('click');
    await pag.keyboard.press('KeyG');
    const salta = await co(() => window.__estudioCombate.archivos.combate.datos.teclas.arena[window.__estudioCombate.archivos.combate.datos.teclas.perfil].saltar[0]);
    ok(salta === 'KeyG', 'capturar una tecla nueva para saltar: ' + salta);
    await pag.locator('#co-paneles [data-panel="cpu"]').dispatchEvent('click');
    ok(await pag.locator('#co-campos input[type=number]').count() >= 6, 'CPU trae sus campos');
    await pag.locator('#co-descartar').dispatchEvent('click');
    await pag.locator('#co-paneles [data-panel="accion"]').dispatchEvent('click');

    // ---- Probar en el juego ----
    await espera(() => { const e = document.getElementById('juego-estado'); return e.textContent.includes('listo') || e.className.includes('error'); }, null, 240000);
    ok(/listo/i.test(await pag.textContent('#juego-estado')), 'el juego queda listo');
    await co(() => window.__estudioCombate.elegir('estilo-sekiro', 'ataques', 'tajo1'));
    await pag.locator('#co-probar').dispatchEvent('click');
    await espera(() => /Arena abierta|Arena open|No se pudo|Could not/.test(document.getElementById('co-mensaje').textContent), null, 60000);
    ok(/Arena abierta|Arena open/.test(await pag.textContent('#co-mensaje')), 'probar: ' + await pag.textContent('#co-mensaje'));
    const marco = pag.frames().find(f => f.url().includes('supervivencia.html'));
    await marco.waitForFunction(() => { const a = window.__venjy.arena; return a && a.estado && a.estado.fase === 'pelea'; }, null, { timeout: 60000, polling: 300 });
    const visto = await marco.evaluate(() => new Promise(fin => {
        const a = window.__venjy.arena, vistos = new Set(), t = Date.now();
        const mirar = () => { const p = a.estado && a.estado.P && a.estado.P.f[1].p; if (p && p.estado === 'ataque') vistos.add(p.clave); if (Date.now() - t > 9000 || vistos.size) fin({ vistos: [...vistos], probar: a.estado && a.estado.probar }); else setTimeout(mirar, 50); };
        mirar();
    }));
    ok(visto.vistos.length === 1 && visto.vistos[0] === 'tajo1' && visto.probar && visto.probar.accion === 'tajo1', 'en la arena el rival repite tajo1: ' + JSON.stringify(visto));
    await pag.locator('#co-terminar').dispatchEvent('click');
    await espera(() => /Arena cerrada|Arena closed/.test(document.getElementById('co-mensaje').textContent), null, 30000);
} catch (e) {
    fallos++;
    console.log('ERROR: ' + (e && e.message));
} finally {
    clearTimeout(tope);
    restaurar();
    try { await nav.close(); } catch (e) { /* ya cerrado */ }
    srv.close();
}
const reales = errores.filter(e => !/preload|favicon|WebGL|GPU stall|swiftshader|AudioContext/i.test(e));
if (reales.length) { console.log('errores en consola:'); for (const e of reales.slice(0, 6)) console.log('  ' + e); }
console.log(fallos ? `estudio-combate-navegador: ${fallos} FALLAS` : 'estudio-combate-navegador: todo bien');
process.exit(fallos ? 1 : 0);
