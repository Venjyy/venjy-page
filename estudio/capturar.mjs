// =========================================================
// VENJY · Estudio · `cli.mjs capturar` (contrato en estudio/DISENO.md §7)
//   capturar layout [aparato] [--seguro] [--datos archivo.json] [--idioma es|en]
//   capturar pose <clave> [--skin pony]            (clave de poses.json, o --pose '{"bDx":-1}')
//   capturar gesto <clave> [--tiempos 0,0.4,0.8] [--hoja] [--skin pony]
//   capturar escena <clave> [--tiempos 0.5,1.45] [--medir "manoD()"] [--plano k]
//   capturar combate <estilo>:<acción> [--cuadros 0,9,11,13,20] [--cadena tajo1,tajo2] [--carga 20] [--hoja] [--skin x]
//            corre el motor de combate de verdad (estados.js + animacion.js con combate.json y estilo-<estilo>.json):
//            la acción desde la guardia (o la cadena, clicando atacar seguido; --carga mantiene la carga n cuadros) y
//            dibuja los cuadros pedidos con el rig completo y el arma del estilo (katana y vaina). Sin --cuadros:
//            los cuadros clave de cada fase. La etiqueta dice cuadro, acción, c y fase.
// Opciones comunes: --salida <carpeta> (por defecto la temporal del sistema), --url <servidor>
// (por defecto levanta uno propio en un puerto libre: no hace falta tener node estudio/servidor.mjs abierto).
// Imprime solo rutas y números. Playwright: estudio/playwright.mjs (variable PLAYWRIGHT o npm global).
// =========================================================
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { iniciar } from './servidor.mjs';
import { APARATOS } from './layout.js';
import { calcularAvisos } from './avisos-layout.js';
import { evaluarGesto } from './evaluar.mjs';
import { abrirNavegador } from './playwright.mjs';
import { SELECTORES } from '../mundo/supervivencia/layout-datos.js';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATOS = path.join(RAIZ, 'mundo', 'datos');
const HABILIDADES = path.join(RAIZ, '.claude', 'skills', 'animaciones-minecraft');

// Nombres cortos de los aparatos de layout.js (los ids de la lista siguen valiendo)
const ALIAS = { vertical: 'cel-v', acostado: 'cel-h', 'android-v': 'and-v', 'android-h': 'and-h', tablet: 'tab' };

export function aparatoDe(texto) {
    const t = String(texto || 'acostado');
    const id = ALIAS[t] || t;
    const a = APARATOS.find(x => x.id === id && x.id !== 'pers');
    if (a) return a;
    const m = /^(\d{3,4})x(\d{3,4})$/.exec(t);
    if (m) return { id: t, w: Number(m[1]), h: Number(m[2]), seguro: {} };
    throw new Error(`aparato desconocido «${t}». Usa: ${Object.keys(ALIAS).join(', ')}, ${APARATOS.filter(a => a.id !== 'pers').map(a => a.id).join(', ')} o ANCHOxALTO`);
}

const leerJson = n => JSON.parse(fs.readFileSync(path.join(DATOS, n + '.json'), 'utf8'));
const seg = t => String(t).replace('.', '_');
const lista = (v, def) => (v === undefined || v === true ? def : String(v).split(',').map(Number));

function numeros(t) {
    if (t.some(n => !Number.isFinite(n))) throw new Error('--tiempos: números separados por comas, p. ej. 0,0.4,0.8');
    return t;
}

// ---------- layout ----------
async function capturarLayout({ navegador, base, aparato, salida, op, log }) {
    const a = aparatoDe(aparato);
    const pagina = await navegador.newPage({ viewport: { width: a.w, height: a.h } });
    const errores = [];
    pagina.on('pageerror', e => errores.push(e.message));
    await pagina.goto(`${base}/estudio/vista-tactil.html?idioma=${op.idioma === 'en' ? 'en' : 'es'}`);
    await pagina.waitForSelector('.tactil-boton.sv-romper', { state: 'attached', timeout: 20000 });
    if (op.datos && op.datos !== true) {
        const datos = JSON.parse(fs.readFileSync(op.datos, 'utf8'));
        await pagina.evaluate(d => window.postMessage({ tipo: 'layout', datos: d }, location.origin), datos);
    }
    if (op.seguro) {
        const s = a.seguro || {};
        await pagina.evaluate(m => window.postMessage(m, location.origin), { tipo: 'seguro', t: s.t || 0, r: s.r || 0, b: s.b || 0, l: s.l || 0 });
    }
    await pagina.waitForTimeout(150); // la vista aplica los mensajes y recalcula
    const medidas = await pagina.evaluate(selectores => Object.entries(selectores).map(([clave, sel]) => {
        const e = document.querySelector(sel);
        if (!e) return null;
        const r = e.getBoundingClientRect();
        return r.width && r.height ? { clave, r: { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height } } : null;
    }).filter(Boolean), SELECTORES);
    const avisos = calcularAvisos(medidas, a.w, a.h);
    const archivo = path.join(salida, `layout-${a.id}${op.seguro ? '-seguro' : ''}.png`);
    await pagina.screenshot({ path: archivo });
    await pagina.close();
    const choques = avisos.filter(x => x.tipo === 'choque').map(x => `${x.a}×${x.b}`);
    const fuera = avisos.filter(x => x.tipo === 'fuera').map(x => x.clave);
    const chicos = avisos.filter(x => x.tipo === 'chico').map(x => `${x.clave}(${x.ancho}×${x.alto})`);
    const ninguno = l => (l.length ? l.join(', ') : 'ninguno');
    log(`${archivo}  choques: ${ninguno(choques)}  fuera: ${ninguno(fuera)}  chicos: ${ninguno(chicos)}`);
    return { archivo, avisos, botones: medidas.length, errores };
}

// ---------- pose y gesto ----------
async function posarVarias({ navegador, base, skin, poses, salida, prefijo, hoja, log }) {
    const { posar } = await import(pathToFileURL(path.join(HABILIDADES, 'posar.mjs')).href);
    const archivos = [];
    for (const { etiqueta, pose } of poses) {
        archivos.push(await posar({ skin, pose, salida: path.join(salida, `${prefijo}${etiqueta ? '-' + etiqueta : ''}.png`), base, navegador, log: () => {} }));
    }
    if (!hoja || archivos.length < 2) {
        for (const a of archivos) log(a);
        return { archivos };
    }
    // Una sola imagen: las N capturas una bajo otra (cada una ya trae frente, 3/4 y lado)
    const pag = await navegador.newPage({ viewport: { width: 900, height: 420 } });
    const img = archivos.map(a => `<img style="display:block" src="data:image/png;base64,${fs.readFileSync(a).toString('base64')}">`).join('');
    await pag.setContent(`<body style="margin:0;background:#000">${img}</body>`);
    await pag.waitForFunction(() => [...document.images].every(i => i.complete && i.naturalWidth));
    const archivoHoja = path.join(salida, `${prefijo}-hoja.png`);
    await pag.screenshot({ path: archivoHoja, fullPage: true });
    await pag.close();
    for (const a of archivos) fs.unlinkSync(a);
    log(archivoHoja);
    return { archivos: [archivoHoja] };
}


// ---------- combate ----------
// Simula en Node con el motor real y devuelve [{ etiqueta, pose }] de los cuadros pedidos (o de los clave)
async function posesCombate(nombre, op) {
    const [estilo, accion] = String(nombre || '').split(':');
    if (!estilo || !accion) throw new Error('combate pide <estilo>:<acción>, p. ej. sekiro:tajo1');
    const archivo = path.join(DATOS, `estilo-${estilo}.json`);
    if (!fs.existsSync(archivo)) throw new Error(`no existe mundo/datos/estilo-${estilo}.json`);
    const ES = JSON.parse(fs.readFileSync(archivo, 'utf8'));
    const imp = r => import(pathToFileURL(path.join(RAIZ, r)).href);
    const D = await imp('mundo/supervivencia/combate/datos.js'), E = await imp('mundo/supervivencia/combate/estados.js');
    const A = await imp('mundo/supervivencia/combate/animacion.js'), L = await imp('mundo/datos/limites.js');
    D.fijarCombate(leerJson('combate'));
    L.fijarLimites(leerJson('poses').limites);
    const cadena = op.cadena && op.cadena !== true ? String(op.cadena).split(',') : [accion];
    for (const k of cadena) if (!D.accionDe(ES, k)) throw new Error(`«${k}» no está en estilo-${estilo}.json (ni en combate.json → reacciones)`);
    const carga = op.carga && op.carga !== true ? Number(op.carga) : 0;
    const p = E.crearPeleador(ES), an = A.crearAnimador(ES), cuadros = [];
    // Primero unos cuadros en guardia (la mezcla parte de ahí), después la acción o la cadena
    for (let i = 0; i < 12; i++) { E.paso(p, {}); A.animar(an, p, { t: i / 60 }); }
    const vistos = [];
    for (let i = 0; i < 400; i++) {
        let it = {};
        if (i === 0 && !cadena.length) it = {};
        const def0 = D.accionDe(ES, cadena[0]);
        if (cadena.length > 1) { if (i % 2 === 0 && vistos.length < cadena.length) it.atacar = 'apretar'; }
        else if (i === 0 && def0.intencion === 'fuerte') it.fuerte = 'apretar';
        else if (i === 0 && def0.tipo === 'ataque') it.accion = cadena[0]; // por su clave: con controles por altura (Urban Reign) el clic solo daría el jab
        if (def0.intencion === 'fuerte' && i > 0) it.fuerte = i <= carga ? 'mantener' : 'soltar';
        if (i === 0 && def0.tipo !== 'ataque' && cadena.length === 1) E.iniciar(p, cadena[0]);
        E.paso(p, it);
        if (p.def && vistos[vistos.length - 1] !== p.clave && cadena.includes(p.clave)) vistos.push(p.clave);
        const pose = { ...A.animar(an, p, { t: (i + 12) / 60 }) };
        const fase = p.def ? D.faseEn(p.def.fases, p.c).fase : p.estado;
        cuadros.push({ i, clave: p.clave || p.estado, c: p.c, fase, pose, def: p.def });
        if (vistos.length >= cadena.length && !p.def) break;
    }
    let elegir;
    if (op.cuadros && op.cuadros !== true) elegir = String(op.cuadros).split(',').map(Number);
    else {
        // Clave: el primero, la mitad de la anticipación, el primero y el último del activo, r+6 y el último, por acción
        const s2 = new Set([0]);
        for (const [n, q] of cuadros.entries()) {
            if (!q.def) continue;
            const f = q.def.fases, a = f.anticipacion || 0, g = f.activo || 0;
            for (const c of [Math.floor(a / 2), a, a + g - 1, a + g + 6, a + g + (f.recuperacion || 0) - 1]) if (q.c === c) s2.add(n);
        }
        s2.add(cuadros.length - 1);
        elegir = [...s2].sort((x, y) => x - y);
    }
    return elegir.filter(n => cuadros[n]).map(n => {
        const q = cuadros[n];
        return { etiqueta: `c${n}`, texto: `cuadro ${n} · ${q.clave} c${q.c} · ${q.fase}`, pose: q.pose, arma: ES.arma };
    });
}
async function posarCombate({ navegador, base, skin, poses, salida, prefijo, hoja, log }) {
    const archivos = [];
    for (const { etiqueta, texto, pose, arma } of poses) {
        const pag = await navegador.newPage({ viewport: { width: 900, height: 420 } });
        await pag.goto(base + '/.claude/skills/animaciones-minecraft/posar-combate.html#' + encodeURIComponent(JSON.stringify({ skin, pose, arma, etiqueta: texto })));
        await pag.waitForFunction(() => window.listo, null, { timeout: 20000 });
        const a = path.join(salida, `${prefijo}-${etiqueta}.png`);
        await pag.screenshot({ path: a });
        await pag.close();
        archivos.push(a);
    }
    if (!hoja || archivos.length < 2) { for (const a of archivos) log(a); return { archivos }; }
    const pag = await navegador.newPage({ viewport: { width: 900, height: 420 } });
    const img = archivos.map(a => `<img style="display:block" src="data:image/png;base64,${fs.readFileSync(a).toString('base64')}">`).join('');
    await pag.setContent(`<body style="margin:0;background:#000">${img}</body>`);
    await pag.waitForFunction(() => [...document.images].every(i => i.complete && i.naturalWidth));
    const archivoHoja = path.join(salida, `${prefijo}-hoja.png`);
    await pag.screenshot({ path: archivoHoja, fullPage: true });
    await pag.close();
    for (const a of archivos) fs.unlinkSync(a);
    log(archivoHoja);
    return { archivos: [archivoHoja] };
}

// ---------- orquestador ----------
// pos: ['layout'|'pose'|'gesto'|'escena', nombre?]; op: opciones del CLI. Devuelve { lineas, archivos, errores }.
export async function capturar(pos, op = {}, { log = console.log } = {}) {
    const [que, nombre] = pos;
    if (!['layout', 'pose', 'gesto', 'escena', 'combate'].includes(que)) throw new Error('capturar pide layout, pose, gesto, escena o combate');
    const salida = path.resolve(op.salida && op.salida !== true ? op.salida : path.join(os.tmpdir(), 'venjy-estudio'));
    fs.mkdirSync(salida, { recursive: true });
    const lineas = [];
    const decir = (...a) => { const l = a.join(' '); lineas.push(l); log(l); };
    const skin = op.skin && op.skin !== true ? op.skin : 'venjy';

    // pose y gesto no necesitan navegador si faltan datos: se valida antes de abrir nada
    let poses = null, escena = null;
    if (que === 'pose') {
        let pose;
        if (op.pose && op.pose !== true) pose = JSON.parse(op.pose);
        else {
            const def = leerJson('poses').poses[nombre];
            if (!def) throw new Error(`pose «${nombre}» no está en poses.json (hay: ${Object.keys(leerJson('poses').poses).join(', ')})`);
            pose = def.canales;
        }
        poses = [{ etiqueta: '', pose }];
    } else if (que === 'gesto') {
        const def = leerJson('poses').gestos[nombre];
        if (!def) throw new Error(`gesto «${nombre}» no está en poses.json (hay: ${Object.keys(leerJson('poses').gestos).join(', ')})`);
        const tiempos = numeros(lista(op.tiempos, [0, 0.4, 0.8, 1.2]));
        poses = tiempos.map(t => ({ etiqueta: `t${seg(t)}`, pose: evaluarGesto(def, t) }));
    } else if (que === 'combate') {
        poses = await posesCombate(nombre, op);
    } else if (que === 'escena') {
        if (!nombre) throw new Error('escena pide una clave (la de /escena en el juego: pony, venjy, …)');
        if (!/^[\w-]+$/.test(nombre)) throw new Error('clave de escena no válida');
        escena = nombre;
    }

    let servidor = null, base;
    if (op.url && op.url !== true) base = String(op.url).replace(/\/$/, '');
    else {
        servidor = await iniciar({ puerto: 0, raiz: RAIZ });
        base = `http://127.0.0.1:${servidor.address().port}`;
    }
    let navegador = null;
    try {
        navegador = await abrirNavegador();
        const archivos = [];
        let errores = [];
        if (que === 'layout') {
            const r = await capturarLayout({ navegador, base, aparato: nombre, salida, op, log: decir });
            archivos.push(r.archivo);
            errores = r.errores;
        } else if (que === 'escena') {
            const { capturarEscena } = await import(pathToFileURL(path.join(HABILIDADES, 'capturar.mjs')).href);
            const tiempos = numeros(lista(op.tiempos, [0.5, 1.5, 3]));
            const r = await capturarEscena({
                // va junto a la persona (si la escena es de una) y fuerza la escena; callarEscenas evita que otra se dispare sola
                preparar: `callarEscenas(); const p = v.escenas.personas().find(q => q.clave === ${JSON.stringify(escena)}); if (p) await irJunto(p.x, p.z, p.y); await v.escenas.forzar(${JSON.stringify(escena)});`,
                paso: 'v.escenas.pausar(); v.escenas.irA(t);',
                tiempos, salida, plano: op.plano && op.plano !== true ? op.plano : null,
                medir: op.medir && op.medir !== true ? op.medir : '',
                url: base + '/supervivencia.html', navegador, log: () => {}
            });
            for (const m of r.medidas) decir(`medida t=${m.t} ${JSON.stringify(m.medida)}`);
            for (const a of r.archivos) decir(a);
            archivos.push(...r.archivos);
            errores = r.errores;
        } else if (que === 'combate') {
            const r = await posarCombate({ navegador, base, skin, poses, salida, prefijo: `combate-${String(nombre).replace(':', '-')}${op.cadena && op.cadena !== true ? '-cadena' : ''}`, hoja: !!op.hoja, log: decir });
            archivos.push(...r.archivos);
        } else {
            const r = await posarVarias({ navegador, base, skin, poses, salida, prefijo: `${que}-${nombre || 'libre'}`, hoja: !!op.hoja, log: decir });
            archivos.push(...r.archivos);
        }
        if (errores.length) decir(`errores de página: ${errores.length} (primero: ${errores[0]})`);
        return { lineas, archivos, errores };
    } finally {
        if (navegador) await navegador.close();
        if (servidor) await new Promise(r => servidor.close(r));
    }
}
