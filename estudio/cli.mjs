// =========================================================
// VENJY · Estudio · CLI para el agente (estudio/DISENO.md §7)
//   node estudio/cli.mjs resumen [archivo|js:fuente] [clave] [--completo] [--idioma es|en|ambos] [--json]
//   node estudio/cli.mjs resumen dialogos [persona[.tema]] [--md [--escribir]]   (--md: tablas de mundo/DIALOGOS.md)
//   node estudio/cli.mjs validar [archivo...] [--contra HEAD] [--arreglar] [--permitir-cambios] [--json]
//   node estudio/cli.mjs glifos     (lee font/pixelcraft.ttf y guarda estudio/glifos.json)
//   node estudio/cli.mjs capturar layout|pose|gesto|escena <nombre> [--tiempos a,b] [--hoja] [--medir js] [--salida dir]   (estudio/capturar.mjs)
// Códigos de salida: 0 bien, 1 errores, 2 avisos que piden confirmación.
// =========================================================
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { formatear } from './formato.mjs';
import { validar } from './validar.mjs';
import { FUENTES } from './fuentes.mjs';
import { avisosDeTexto, esPar } from './avisos-textos.js';
import { leerGlifos, tablaDeRangos } from './glifos.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATOS = path.join(RAIZ, 'mundo', 'datos');
const ARCHIVO_GLIFOS = path.join(RAIZ, 'estudio', 'glifos.json');
const FUENTE_TTF = path.join(RAIZ, 'font', 'pixelcraft.ttf');

// Rangos de PixelCraft (estudio/glifos.json); null si todavía no se generó
function leerRangos() {
    try { return JSON.parse(fs.readFileSync(ARCHIVO_GLIFOS, 'utf8')).rangos; } catch (e) { return null; }
}

// ---------- argumentos ----------
function leerArgs(argv) {
    const pos = [], op = {};
    const conValor = new Set(['idioma', 'contra', 'salida', 'skin', 'tiempos', 'medir', 'plano', 'url', 'datos', 'pose']);
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a.startsWith('--')) {
            const k = a.slice(2);
            if (conValor.has(k)) op[k] = argv[++i];
            else op[k] = true;
        } else pos.push(a);
    }
    return { pos, op };
}

const cortar = (s, op) => (op.completo || s.length <= 90 ? s : s.slice(0, 89) + '…');
const rellenar = (s, n) => (s.length >= n ? s + ' ' : s.padEnd(n));
const num = v => (Number.isInteger(v) ? String(v) : String(Math.round(v * 1000) / 1000));
const sinCR = s => s.replace(/\r\n/g, '\n');

function leerIndice() {
    return JSON.parse(fs.readFileSync(path.join(DATOS, 'indice.json'), 'utf8'));
}
function leerDatos(nombre) {
    return JSON.parse(fs.readFileSync(path.join(DATOS, nombre + '.json'), 'utf8'));
}

function salir(lineas, op, codigo = 0, objeto = null) {
    if (op.json) console.log(JSON.stringify(objeto || lineas.map(l => (typeof l === 'string' ? { texto: l } : l)), null, 2));
    else for (const l of lineas) console.log(typeof l === 'string' ? l : l.texto);
    process.exit(codigo);
}

// ---------- resumen de los archivos JSON ----------
const lee = (meta) => (meta.lee ? path.basename(meta.lee) : `referencia (fase ${meta.fase})`);

function cuentaTextos(d) {
    let espacios = 0, textos = 0;
    for (const esp of Object.values(d.textos || {})) { espacios++; textos += Object.keys(esp).length; }
    return `${espacios} espacio${espacios === 1 ? '' : 's'}, ${textos} textos`;
}

const RESUMEN_JSON = {
    'ui-layout': d => {
        const s = d.supervivencia || {};
        const n = Object.keys((s.normal && s.normal.botones) || {}).length;
        const b = Object.keys((s.baja && s.baja.botones) || {}).length;
        return `${n} elementos (normal) · ${b} (baja)`;
    },
    textos: cuentaTextos,
    dialogos: d => {
        const c = contarDialogos(d);
        return `${c.temas} temas, ${c.skins} variantes de skin, ${c.opiniones} opiniones, ${c.textos} textos (${c.sinRevisar} sin revisar)`;
    },
    tienda: d => {
        const n = Object.keys(d.tiendas || {}).length;
        const o = Object.values(d.tiendas || {}).reduce((s, t) => s + (t.ofertas || []).length + (t.compra || []).length, 0);
        return `${n} tienda${n === 1 ? '' : 's'} con ofertas nuevas, ${o} ofertas`;
    },
    posiciones: d => `${Object.keys(d.personas || {}).length} personas`,
    poses: d => `${Object.keys(d.poses || {}).length} poses, ${Object.keys(d.gestos || {}).length} gestos`
};

// Cuenta temas, variantes y pares ES/EN de dialogos.json, y cuántos no tienen «revisado»
function contarDialogos(d) {
    let temas = 0, skins = 0, opiniones = 0, textos = 0, sinRevisar = 0;
    const cuenta = t => { if (esPar(t)) { textos++; if (!t.revisado) sinRevisar++; } };
    for (const lista of Object.values(d.temas || {})) {
        for (const tema of lista) {
            temas++;
            cuenta(tema.p); cuenta(tema.r);
            for (const t of Object.values(tema.skin || {})) { skins++; cuenta(t); }
        }
    }
    for (const m of Object.values(d.opiniones || {})) for (const t of Object.values(m)) { opiniones++; cuenta(t); }
    for (const s of Object.values(d.saludos || {})) { cuenta(s.bajo); cuenta(s.alto); for (const t of Object.values(s.skin || {})) cuenta(t); }
    for (const t of Object.values(d.regalos || {})) cuenta(t);
    return { temas, skins, opiniones, textos, sinRevisar };
}

const coincide = (clave, filtro) => !filtro || clave === filtro || clave.startsWith(filtro + '.') || clave.startsWith(filtro);
const lado = (t, idioma) => (idioma === 'ambos' ? `${t.es} | ${t.en}` : t[idioma] || t.es);
const marcaRev = t => (t && t.revisado ? '' : ' [sin revisar]');

function filasDialogos(d, filtro, op) {
    const idioma = op.idioma || 'es';
    const filas = [];
    for (const [persona, lista] of Object.entries(d.temas || {})) {
        for (const tema of lista) {
            const clave = `${persona}.${tema.id}`;
            if (!coincide(clave, filtro)) continue;
            const marcas = [];
            if (tema.g) marcas.push(`[g ${tema.g}]`);
            if (tema.skin) marcas.push(`[skin ${Object.keys(tema.skin).length}]`);
            if (tema.req) marcas.push(`[req ${Object.entries(tema.req).map(([k, v]) => `${k} ${v}`).join(', ')}]`);
            if (tema.r && !tema.r.revisado) marcas.push('[sin revisar]');
            const r = tema.r ? lado(tema.r, idioma) : '(abre las opiniones)';
            filas.push({ clave, texto: `${lado(tema.p, idioma)} -> ${r}`, extra: marcas.join(' ') });
        }
    }
    for (const [persona, mapa] of Object.entries(d.opiniones || {})) {
        for (const [de, t] of Object.entries(mapa)) {
            const clave = `${persona}.opina.${de}`;
            if (coincide(clave, filtro)) filas.push({ clave, texto: lado(t, idioma), extra: '[opinión]' + marcaRev(t) });
        }
    }
    for (const [persona, s] of Object.entries(d.saludos || {})) {
        for (const [k, t] of [['bajo', s.bajo], ['alto', s.alto], ...Object.entries(s.skin || {}).map(([b, x]) => ['skin.' + b, x])]) {
            const clave = `${persona}.saludo.${k}`;
            if (coincide(clave, filtro)) filas.push({ clave, texto: lado(t, idioma), extra: '[saludo]' + marcaRev(t) });
        }
    }
    for (const [persona, t] of Object.entries(d.regalos || {})) {
        const clave = `${persona}.regalo`;
        if (coincide(clave, filtro)) filas.push({ clave, texto: lado(t, idioma), extra: '[regalo]' + marcaRev(t) });
    }
    return filas;
}

function filasTienda(d, filtro) {
    const filas = [];
    const pilas = l => l.map(([n, c]) => `${c} ${n}`).join(' + ');
    for (const [amigo, t] of Object.entries(d.tiendas || {})) {
        (t.ofertas || []).forEach((o, i) => { const k = `${amigo}.oferta${i}`; if (coincide(k, filtro)) filas.push({ clave: k, texto: `${pilas(o.da)} <- ${pilas(o.pide)}`, extra: o.req ? `[req ${o.req}]` : '' }); });
        (t.compra || []).forEach((v, i) => { const k = `${amigo}.compra${i}`; if (coincide(k, filtro)) filas.push({ clave: k, texto: `${pilas([v.da])} -> ${v.esm} esmeralda` }); });
    }
    return filas;
}

function textoBoton(b) {
    const partes = [];
    if (b.ancla) partes.push(b.ancla);
    if (b.x !== undefined || b.y !== undefined) partes.push(`${num(b.x ?? 0)},${num(b.y ?? 0)}`);
    if (b.desde === 'pie') partes.push('pie');
    if (b.w !== undefined || b.h !== undefined) partes.push(`${num(b.w ?? 0)}x${num(b.h ?? 0)}`);
    if (b.letra !== undefined) partes.push(`letra ${b.letra}`);
    if (b.palanca !== undefined) partes.push(`palanca ${b.palanca}`);
    if (b.seguro === false) partes.push('sin-seguro');
    if (b.oculto) partes.push('oculto');
    return partes.join(' ');
}

function filasLayout(d, filtro) {
    const s = d.supervivencia || {};
    const normal = (s.normal && s.normal.botones) || {};
    const baja = (s.baja && s.baja.botones) || {};
    const filas = [];
    for (const [k, b] of Object.entries(normal)) {
        if (filtro && !k.startsWith(filtro)) continue;
        let t = textoBoton(b);
        if (baja[k]) t += ' | baja ' + textoBoton({ ...b, ...baja[k] });
        filas.push({ clave: k, texto: t });
    }
    for (const [k, b] of Object.entries(baja)) {
        if (normal[k] || (filtro && !k.startsWith(filtro))) continue;
        filas.push({ clave: k, texto: '| baja ' + textoBoton(b) });
    }
    if (s.normal && s.normal.pie !== undefined && !filtro) filas.push({ clave: 'pie', texto: `normal ${s.normal.pie}` + (s.baja && s.baja.pie !== undefined ? ` | baja ${s.baja.pie}` : '') });
    return filas;
}

function filasTextos(d, filtro, op) {
    const idioma = op.idioma || 'es';
    const filas = [];
    for (const [esp, mapa] of Object.entries(d.textos || {})) {
        for (const [k, t] of Object.entries(mapa)) {
            const clave = `${esp}.${k}`;
            if (filtro && !clave.startsWith(filtro)) continue;
            filas.push({ clave, texto: idioma === 'ambos' ? `${t.es} | ${t.en}` : t[idioma] || t.es, extra: t.revisado ? '' : '[sin revisar]' });
        }
    }
    return filas;
}

function filasPosiciones(d, filtro) {
    const filas = [];
    for (const [k, p] of Object.entries(d.personas || {})) {
        if (filtro && !k.startsWith(filtro)) continue;
        filas.push({ clave: k, texto: `${p.ancla} ${num(p.dx ?? 0)},${num(p.dy ?? 0)},${num(p.dz ?? 0)} giro ${p.giro ?? 0}`, extra: p.nota ? '# ' + p.nota : '' });
    }
    return filas;
}

function textoCanal(k, c) {
    if (typeof c === 'number') return `${k} ${num(c)}`;
    const partes = [k];
    if (c.k) partes.push('k[' + c.k.map(([t, v]) => `${num(t)}:${num(v)}`).join(' ') + ']' + (c.interp && c.interp !== 'suave' ? ' ' + c.interp : ''));
    else if (c.base !== undefined) partes.push(num(c.base));
    for (const o of c.osc || []) {
        const pre = { sin: '~', abs: '|~|', pos: '+~', neg: '-~' }[o.forma] || '~';
        partes.push(`${pre}${num(o.amp)}@${num(o.frec)}` + (o.fase ? `+${num(o.fase)}` : '') + (o.env ? ` env ${num(o.env[0])}-${num(o.env[1])}` : ''));
    }
    return partes.join(' ');
}

function filasPoses(d, filtro) {
    const filas = [];
    for (const [k, p] of Object.entries(d.poses || {})) {
        if (filtro && !k.startsWith(filtro)) continue;
        filas.push({ clave: k, texto: 'pose  ' + Object.entries(p.canales).map(([c, v]) => textoCanal(c, v)).join('  ') });
    }
    for (const [k, g] of Object.entries(d.gestos || {})) {
        if (filtro && !k.startsWith(filtro)) continue;
        let t = `reloj ${g.reloj}` + (g.ciclo ? ` ciclo ${g.ciclo}` : '') + '  ' + Object.entries(g.canales).map(([c, v]) => textoCanal(c, v)).join('  ');
        for (const [v, canales] of Object.entries(g.variantes || {})) t += `  [${v}: ${Object.entries(canales).map(([c, x]) => textoCanal(c, x)).join(' ')}]`;
        filas.push({ clave: k, texto: t });
    }
    return filas;
}

const FILAS_JSON = { 'ui-layout': filasLayout, textos: filasTextos, dialogos: filasDialogos, tienda: filasTienda, posiciones: filasPosiciones, poses: filasPoses };

// ---------- DIALOGOS.md ----------
async function dialogosMd(op) {
    const { cargarContexto, generarPersonas, contarFrases, escribirEnDocumento } = await import('./dialogos-md.mjs');
    const datos = leerDatos('dialogos');
    const md = generarPersonas(datos, await cargarContexto());
    if (!op.escribir) return salir(md.split('\n'), op);
    const archivo = path.join(RAIZ, 'mundo', 'DIALOGOS.md');
    const doc = sinCR(fs.readFileSync(archivo, 'utf8'));
    let nuevo;
    try { nuevo = escribirEnDocumento(doc, md); } catch (e) { return salir([String(e.message)], op, 1); }
    if (nuevo !== doc) fs.writeFileSync(archivo, nuevo);
    salir([`mundo/DIALOGOS.md: ${contarFrases(datos)} frases de «Hablar»${nuevo === doc ? ' (sin cambios)' : ' (actualizado)'}`], op);
}

// ---------- resumen ----------
async function resumen(pos, op) {
    const indice = leerIndice();
    const idioma = op.idioma || 'es';
    if (!['es', 'en', 'ambos'].includes(idioma)) salir(['--idioma: es, en o ambos'], op, 1);
    op.idioma = idioma;
    let [objetivo, filtro] = pos;
    if (objetivo === 'js:dialogos') objetivo = 'dialogos'; // ya no es una fuente JS: es mundo/datos/dialogos.json
    if (objetivo === 'dialogos' && op.md) return await dialogosMd(op);

    if (!objetivo) {
        const lineas = [];
        for (const [nombre, meta] of Object.entries(indice.archivos)) {
            let cuenta = '?';
            try { cuenta = RESUMEN_JSON[nombre] ? RESUMEN_JSON[nombre](leerDatos(nombre)) : '(sin resumen)'; } catch (e) { cuenta = 'ERROR: ' + e.message; }
            lineas.push({ clave: nombre, texto: `${rellenar(nombre, 12)}${cuenta} · ${meta.lee ? 'lee ' : ''}${lee(meta)}` });
        }
        for (const [nombre, f] of Object.entries(FUENTES)) {
            try {
                const { resumen: r } = await f.cargar();
                lineas.push({ clave: 'js:' + nombre, texto: `${rellenar('js:' + nombre, 12)}${r}` });
            } catch (e) {
                lineas.push({ clave: 'js:' + nombre, texto: `${rellenar('js:' + nombre, 12)}ERROR: ${e.message}` });
            }
        }
        return salir(lineas, op);
    }

    let filas;
    if (objetivo.startsWith('js:') || FUENTES[objetivo]) {
        const nombre = objetivo.replace(/^js:/, '');
        const f = FUENTES[nombre];
        if (!f) salir([`Fuente desconocida: ${nombre}. Hay: ${Object.keys(FUENTES).join(', ')}`], op, 1);
        filas = (await f.cargar()).filas(filtro, { idioma, completo: !!op.completo });
    } else if (indice.archivos[objetivo]) {
        const fn = FILAS_JSON[objetivo];
        filas = fn ? fn(leerDatos(objetivo), filtro, op) : [];
    } else {
        salir([`Desconocido: ${objetivo}. Archivos: ${Object.keys(indice.archivos).join(', ')} · fuentes: ${Object.keys(FUENTES).map(k => 'js:' + k).join(', ')}`], op, 1);
    }
    if (!filas.length) salir([`Sin resultados para ${objetivo}${filtro ? ' ' + filtro : ''}.`], op, 1);
    const ancho = Math.min(22, Math.max(...filas.map(f => f.clave.length)) + 2);
    salir(filas.map(f => ({ clave: f.clave, texto: rellenar(f.clave, ancho) + cortar(f.texto, op) + (f.extra ? '  ' + f.extra : '') })), op);
}

// ---------- validar ----------
const EMOJI = /\p{Extended_Pictographic}/u;

// Recorre un JSON. Un par { es, en } pasa por avisosDeTexto (par incompleto, emoji, glifos de PixelCraft,
// plantilla {n} y largo); el resto de las cadenas solo se revisa por emoji.
function recorrer(v, ruta, alHallar, glifos) {
    if (typeof v === 'string') alHallar(ruta, v, null);
    else if (Array.isArray(v)) v.forEach((x, i) => recorrer(x, `${ruta}[${i}]`, alHallar, glifos));
    else if (v && typeof v === 'object') {
        const par = esPar(v);
        if (par) for (const a of avisosDeTexto(v, glifos)) alHallar(a.idioma ? `${ruta}.${a.idioma}` : ruta, null, a.texto, a.nivel);
        for (const [k, x] of Object.entries(v)) {
            if (par && (k === 'es' || k === 'en')) continue; // ya revisados arriba
            recorrer(x, `${ruta}.${k}`, alHallar, glifos);
        }
    }
}

// Nombres que acepta /dar: claves de O y de B en minúsculas (sin agua ni lava ni el aire)
async function nombresDeObjetos() {
    const { O } = await import('../mundo/supervivencia/objetos.js');
    const { B } = await import('../mundo/texturas.js');
    const nombres = new Set(Object.keys(O).map(k => k.toLowerCase()));
    for (const [k, id] of Object.entries(B)) if (id > 0 && k !== 'AGUA' && k !== 'LAVA') nombres.add(k.toLowerCase());
    return nombres;
}

// Reglas de contenido que el esquema no expresa
function revisarSemantica(nombre, datos, problemas, arch, objetos) {
    const mal = texto => problemas.push({ archivo: arch, tipo: 'error', texto });
    if (nombre === 'dialogos') {
        for (const [persona, lista] of Object.entries(datos.temas || {})) {
            const ids = new Set();
            for (const tema of lista) {
                if (ids.has(tema.id)) mal(`$.temas.${persona}: id «${tema.id}» repetido`);
                ids.add(tema.id);
                if (!tema.r && tema.id !== 'opina') mal(`$.temas.${persona}.${tema.id}: sin respuesta (solo «opina» la abre desde las opiniones)`);
                if (tema.id === 'opina' && !(datos.opiniones || {})[persona]) mal(`$.temas.${persona}.opina: no hay opiniones de ${persona}`);
            }
        }
        for (const persona of Object.keys(datos.saludos || {})) if (!datos.temas[persona]) mal(`$.saludos.${persona}: no tiene temas`);
    }
    if (nombre === 'tienda' && objetos) {
        const revisa = (ruta, pila) => { if (Array.isArray(pila) && !objetos.has(pila[0])) mal(`${ruta}: no existe el objeto «${pila[0]}» (los nombres son los de /dar)`); };
        for (const [amigo, t] of Object.entries(datos.tiendas || {})) {
            (t.ofertas || []).forEach((o, i) => {
                (o.da || []).forEach((p, j) => revisa(`$.tiendas.${amigo}.ofertas[${i}].da[${j}]`, p));
                (o.pide || []).forEach((p, j) => revisa(`$.tiendas.${amigo}.ofertas[${i}].pide[${j}]`, p));
            });
            (t.compra || []).forEach((c, i) => revisa(`$.tiendas.${amigo}.compra[${i}].da`, c.da));
        }
    }
}

function diferencias(antes, ahora, ruta, salida) {
    if (antes === ahora) return;
    const obj = x => x !== null && typeof x === 'object' && !Array.isArray(x);
    if (obj(antes) && obj(ahora)) {
        for (const k of Object.keys(antes)) {
            if (k === '$schema') continue;
            if (!(k in ahora)) salida.push([`${ruta}.${k}`, antes[k], undefined]);
            else diferencias(antes[k], ahora[k], `${ruta}.${k}`, salida);
        }
    } else if (JSON.stringify(antes) !== JSON.stringify(ahora)) salida.push([ruta, antes, ahora]);
}

function enHEAD(ref, nombre) {
    try {
        const s = execFileSync('git', ['show', `${ref}:mundo/datos/${nombre}.json`], { cwd: RAIZ, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
        return JSON.parse(s);
    } catch (e) { return null; }
}

async function validarCmd(pos, op) {
    const indice = leerIndice();
    const todos = Object.keys(indice.archivos);
    const nombres = pos.length ? pos : ['indice', ...todos];
    const problemas = [];
    let limpios = 0;
    const rangos = leerRangos();
    const objetos = nombres.includes('tienda') ? await nombresDeObjetos() : null;
    if (!rangos) problemas.push({ archivo: 'glifos.json', tipo: 'error', texto: 'falta estudio/glifos.json (genéralo con: node estudio/cli.mjs glifos)' });

    for (const nombre of nombres) {
        const meta = nombre === 'indice' ? { esquema: 'indice' } : indice.archivos[nombre];
        const arch = nombre + '.json';
        if (!meta) { problemas.push({ archivo: arch, tipo: 'error', texto: 'no está en mundo/datos/indice.json' }); continue; }
        const antes = problemas.length;
        let crudo, datos;
        try { crudo = fs.readFileSync(path.join(DATOS, arch), 'utf8'); datos = JSON.parse(crudo); } catch (e) {
            problemas.push({ archivo: arch, tipo: 'error', texto: 'JSON no válido o ausente: ' + e.message });
            continue;
        }
        for (const e of validar(datos, meta.esquema)) problemas.push({ archivo: arch, tipo: 'error', texto: e });
        const bien = formatear(datos);
        if (bien !== sinCR(crudo)) {
            if (op.arreglar) fs.writeFileSync(path.join(DATOS, arch), bien);
            else problemas.push({ archivo: arch, tipo: 'error', texto: 'formato: no es el estable (usa --arreglar)' });
        }
        recorrer(datos, '$', (ruta, valor, aviso, nivel) => {
            if (aviso) problemas.push({ archivo: arch, tipo: nivel === 'aviso' ? 'aviso' : 'error', texto: `${ruta}: ${aviso}` });
            else if (EMOJI.test(valor)) problemas.push({ archivo: arch, tipo: 'error', texto: `${ruta}: emoji en «${valor}» (los íconos se dibujan, no se escriben)` });
        }, rangos);
        revisarSemantica(nombre, datos, problemas, arch, objetos);
        if (op.contra) {
            const viejo = enHEAD(op.contra, nombre);
            if (viejo) {
                const difs = [];
                diferencias(viejo, datos, '$', difs);
                for (const [ruta, a, b] of difs) {
                    const fmt = v => (v === undefined ? '(quitado)' : typeof v === 'string' ? `«${v}»` : JSON.stringify(v));
                    problemas.push({ archivo: arch, tipo: op['permitir-cambios'] ? 'cambio-permitido' : 'cambio', texto: `CAMBIO ${ruta}: ${fmt(a)} -> ${fmt(b)}${op['permitir-cambios'] ? '' : ' (usa --permitir-cambios si lo pidió el dueño)'}` });
                }
            }
        }
        if (problemas.length === antes) limpios++;
    }
    const lineas = problemas.map(p => `${rellenar(p.archivo, 18)}${p.texto}`);
    lineas.push(`${problemas.some(p => p.tipo === 'error') || problemas.some(p => p.tipo === 'cambio') ? 'PROBLEMAS' : 'OK'} ${limpios} de ${nombres.length} archivos`);
    const codigo = problemas.some(p => p.tipo === 'error') ? 1 : problemas.some(p => p.tipo === 'cambio') ? 2 : 0;
    salir(lineas, op, codigo, { ok: codigo === 0, limpios, total: nombres.length, problemas });
}

// ---------- entrada ----------
const [orden, ...resto] = process.argv.slice(2);
const { pos, op } = leerArgs(resto);
if (orden === 'resumen') await resumen(pos, op);
else if (orden === 'validar') await validarCmd(pos, op);
else if (orden === 'glifos') {
    try {
        const t = tablaDeRangos(leerGlifos(FUENTE_TTF));
        fs.writeFileSync(ARCHIVO_GLIFOS, formatear({ fuente: 'font/pixelcraft.ttf', total: t.total, rangos: t.rangos }));
        salir([`estudio/glifos.json: ${t.total} glifos en ${t.rangos.length} rangos`], op);
    } catch (e) { salir(['glifos: ' + e.message], op, 1); }
}
else if (orden === 'capturar') {
    // Playwright y el servidor se cargan solo aquí: resumen y validar no los necesitan
    const { capturar } = await import('./capturar.mjs');
    try {
        const r = await capturar(pos, op, { log: () => {} });
        salir(r.lineas, op, r.errores.length ? 2 : 0, r);
    } catch (e) {
        salir(['capturar: ' + String((e && e.message) || e)], op, 1);
    }
}
else salir(['Uso: node estudio/cli.mjs resumen [archivo|js:fuente] [clave] [--md] | validar [archivo...] [--contra HEAD] | glifos | capturar layout|pose|gesto|escena <nombre> [--tiempos …] [--hoja] [--medir js]'], op, orden ? 1 : 0);
