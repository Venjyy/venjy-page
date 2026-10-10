// =========================================================
// VENJY · Estudio · `cli.mjs capturar` (contrato en estudio/DISENO.md §7)
//   capturar layout [aparato] [--seguro] [--datos archivo.json] [--idioma es|en]
//   capturar pose <clave> [--skin pony]            (clave de poses.json, o --pose '{"bDx":-1}')
//   capturar gesto <clave> [--tiempos 0,0.4,0.8] [--hoja] [--skin pony]
//   capturar escena <clave> [--tiempos 0.5,1.45] [--medir "manoD()"] [--plano k]
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


// ---------- orquestador ----------
// pos: ['layout'|'pose'|'gesto'|'escena', nombre?]; op: opciones del CLI. Devuelve { lineas, archivos, errores }.
export async function capturar(pos, op = {}, { log = console.log } = {}) {
    const [que, nombre] = pos;
    if (!['layout', 'pose', 'gesto', 'escena'].includes(que)) throw new Error('capturar pide layout, pose, gesto o escena');
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
