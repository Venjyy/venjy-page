// =========================================================
// VENJY · Estudio · CLI para el agente (estudio/DISENO.md §7)
//   node estudio/cli.mjs resumen [archivo|js:fuente] [clave] [--completo] [--idioma es|en|ambos] [--json]
//   node estudio/cli.mjs resumen dialogos [persona[.tema]] [--md [--escribir]]   (--md: tablas de mundo/DIALOGOS.md)
//   node estudio/cli.mjs resumen borradores [objetos|cartas|clave] [--dibujo]   (objetos y cartas nuevos del dueño, pestaña Píxeles)
//   node estudio/cli.mjs validar [archivo...] [--contra HEAD] [--arreglar] [--permitir-cambios] [--json]
//   node estudio/cli.mjs glifos     (lee font/pixelcraft.ttf y guarda estudio/glifos.json)
//   node estudio/cli.mjs capturar layout|pose|gesto|escena <nombre> [--tiempos a,b] [--hoja] [--medir js] [--salida dir]   (estudio/capturar.mjs)
//   node estudio/cli.mjs capturar combate <estilo>:<acción> [--cuadros a,b] [--cadena tajo1,tajo2] [--carga n] [--hoja]   (motor de combate real)
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
import { reglasEscenas, sonidosDeEscena } from '../mundo/datos/escenas.js';
import { reglasPoses, gestosDeDatos } from '../mundo/datos/gestos.js';
import { reglasPersonajes, esDelCodigo, lugarDe, horarioDe, posturaDe, frasesDe } from '../mundo/datos/personajes.js';
import { revisarDibujo, MEDIDAS } from '../mundo/datos/pixeles.js';
import { CONSTRUCCIONES } from '../mundo/datos/posiciones.js';
import { idBloque, propiasDe, cuartos } from '../mundo/datos/construcciones.js';
import { USOS, mapaTiempo } from '../mundo/supervivencia/musica-motor.js';
import { reglasCombate, reglasEstilo, lineaDeTiempo } from '../mundo/supervivencia/combate/reglas.js';
import { largoFases } from '../mundo/supervivencia/combate/datos.js';

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
    const conValor = new Set(['idioma', 'contra', 'salida', 'skin', 'tiempos', 'medir', 'plano', 'url', 'datos', 'pose', 'cuadros', 'cadena', 'carga']);
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
const indiceDe = nombre => { try { return leerIndice().archivos[nombre]; } catch (e) { return null; } };
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
    musica: d => {
        const t = Object.entries(d.temas || {}), b = t.filter(([, x]) => x.borrador).map(([k]) => k);
        return `${t.length} temas (${b.length ? 'borradores: ' + b.join(', ') : 'ningún borrador'}), ${Object.keys(d.canciones || {}).length} canciones, ${Object.keys(d.instrumentos || {}).length} instrumentos propios`;
    },
    'ui-layout': d => {
        const s = d.supervivencia || {};
        const n = Object.keys((s.normal && s.normal.botones) || {}).length;
        const b = Object.keys((s.baja && s.baja.botones) || {}).length;
        const ar = d.arena || {};
        const na = Object.keys((ar.normal && ar.normal.botones) || {}).length + Object.keys((ar.baja && ar.baja.botones) || {}).length;
        return `${n} elementos (normal) · ${b} (baja)` + (na ? ` · arena ${na}` : '');
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
    recetas: d => `${(d.recetas || []).length} recetas nuevas, ${Object.keys(d.fundicion || {}).length} fundiciones`,
    objetos: d => { const n = Object.keys(d.objetos || {}).length; return `${n} objeto${n === 1 ? '' : 's'} nuevo${n === 1 ? '' : 's'}, siguiente id ${d.siguienteId}`; },
    misiones: d => { const n = Object.keys(d.misiones || {}).length; return `${n} misión${n === 1 ? '' : 'es'} nueva${n === 1 ? '' : 's'}`; },
    posiciones: d => `${Object.keys(d.personas || {}).length} personas` + (Object.keys(d.lugares || {}).length ? `, ${Object.keys(d.lugares).length} construcciones movidas` : ''),
    personajes: d => {
        const e = Object.entries(d.personas || {});
        const nuevas = e.filter(([k]) => !esDelCodigo(k)), b = nuevas.filter(([, p]) => p.borrador).length;
        return `${nuevas.length} personas nuevas (${b} en borrador), ${e.length - nuevas.length} cambios de apariencia`;
    },
    poses: d => `${Object.keys(d.poses || {}).length} poses, ${Object.keys(d.gestos || {}).length} gestos`,
    escenas: d => {
        const e = Object.values(d.escenas || {});
        const g = e.filter(x => x.tipo === 'guion').length;
        return `${e.length} escenas (${e.length - g} de amistad, ${g} de guion)`;
    },
    iconos: d => {
        const v = Object.values(d.iconos || {});
        return `${v.length} íconos dibujados (${v.filter(x => x.estado === 'borrador').length} en borrador)`;
    },
    'cartas-arte': d => `${Object.keys(d.retratos || {}).length} retratos, reverso ${d.reverso ? 'propio' : 'del código'}, marcos de ${Object.keys(d.marcos || {}).length} familias`,
    borradores: d => {
        const o = Object.values(d.objetos || {}), c = Object.values(d.cartas || {});
        const p = [...o, ...c].filter(x => x.estado === 'borrador').length;
        return `${o.length} objetos y ${c.length} cartas nuevos (${p} por implementar)`;
    }
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

function filasRecetas(d, filtro) {
    const filas = [];
    (d.recetas || []).forEach((r, i) => { const k = `receta${i}`; if (coincide(k, filtro) || coincide(r.da[0], filtro)) filas.push({ clave: k, texto: `${r.forma ? r.forma.join('/') : (r.sin || []).map(p => [].concat(p)[0]).join(' + ')} -> ${r.da[1]} ${r.da[0]}` }); });
    for (const [a, b] of Object.entries(d.fundicion || {})) if (coincide(a, filtro)) filas.push({ clave: `fundicion.${a}`, texto: `${a} -> ${b}` });
    return filas;
}

function filasObjetos(d, filtro) {
    const filas = [];
    for (const [k, o] of Object.entries(d.objetos || {})) if (coincide(k, filtro)) filas.push({ clave: k, texto: `#${o.id} ${(o.nombre || {}).es} / ${(o.nombre || {}).en} · ícono ${o.icono}${o.color ? '/' + o.color : ''}`, extra: [o.comida ? `come ${o.comida.join('/')}` : '', o.efecto || '', o.devuelve ? `devuelve ${o.devuelve}` : '', o.apila && o.apila !== 64 ? `apila ${o.apila}` : '', o.combustible ? `fuego ${o.combustible}` : '', o.encargo ? 'encargo' : ''].filter(Boolean).join(' · ') });
    return filas;
}

function filasMisiones(d, filtro) {
    const pilas = l => (l || []).map(([n, c]) => `${c} ${n}`).join(' + ');
    return Object.entries(d.misiones || {}).filter(([id, m]) => coincide(id, filtro) || coincide(m.amigo, filtro)).map(([id, m]) => ({
        clave: id,
        texto: `${m.amigo} · ${m.tipo === 'entregar' ? 'entregar ' + pilas(m.pide) : m.tipo === 'matar' ? `matar ${m.n} ${m.mob}${m.noche ? ' de noche' : ''}` : 'sobrevivir la noche'} -> ${pilas(m.premio)}`,
        extra: m.titulo && m.titulo.es
    }));
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

function filasPersonajes(d, filtro) {
    const filas = [];
    for (const [k, p] of Object.entries(d.personas || {})) {
        if (filtro && !k.startsWith(filtro)) continue;
        if (esDelCodigo(k)) { filas.push({ clave: k, texto: 'del código: cambia ' + Object.keys(p.apariencia || {}).join(', '), extra: p.borrador ? '[borrador]' : '' }); continue; }
        const l = lugarDe(p), h = horarioDe(p), hb = p.hablar || {};
        filas.push({ clave: k, texto: `${p.nombre || '(sin nombre)'} · ${l.ancla} ${h.de}-${h.a} h · ${posturaDe(p)} · ${frasesDe(p).length} frases, ${(hb.temas || []).length} temas`, extra: p.borrador ? '[borrador]' : '' });
    }
    return filas;
}

function filasPosiciones(d, filtro) {
    const filas = [];
    for (const [k, p] of Object.entries(d.personas || {})) {
        if (filtro && !k.startsWith(filtro)) continue;
        filas.push({ clave: k, texto: `${p.ancla}${p.marco === 'ancla' ? ' (ejes del ancla)' : ''} ${num(p.dx ?? 0)},${p.dy === 'suelo' ? 'suelo' : num(p.dy ?? 0)},${num(p.dz ?? 0)} giro ${p.giro ?? 0}`, extra: p.nota ? '# ' + p.nota : '' });
    }
    // B6e: construcciones movidas (las demás están en su sitio automático)
    for (const [k, p] of Object.entries(d.lugares || {})) {
        if (filtro && !k.startsWith(filtro)) continue;
        filas.push({ clave: 'lugar ' + k, texto: `centro ${p.x},${p.z}`, extra: p.nota ? '# ' + p.nota : '' });
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

// Una fila por escena: clave, tipo, T, actores, tramos de gesto y marcas (golpes y corazones)
function filasEscenas(d, filtro, op) {
    const idioma = op.idioma || 'es';
    const filas = [];
    for (const [k, e] of Object.entries(d.escenas || {})) {
        if (filtro && !k.startsWith(filtro)) continue;
        const actores = ['n', 'j', ...Object.keys(e.actores || {})];
        const pista = Object.entries(e.pista || {}).map(([q, tr]) => `${q}: ${tr.map(([g, a, b]) => `${g} ${num(a)}-${num(b)}`).join(', ')}`).join(' | ');
        const tramos = Object.values(e.pista || {}).reduce((s, tr) => s + tr.length, 0);
        const marcas = [];
        if (e.golpes && e.golpes.length) marcas.push(`golpes ${e.golpes.map(num).join(',')}`);
        if (e.corazones && e.corazones.length) marcas.push(`corazones ${e.corazones.map(num).join(',')}`);
        const frases = e.tipo === 'guion' ? `${e.lineas.length} frases` : `linea ${e.linea.map(num).join('+')}`;
        let texto = `${e.tipo} T ${num(e.T)} r ${num(e.r)} actores ${actores.join(',')} ${tramos} tramos ${frases}${marcas.length ? ' ' + marcas.join(' ') : ''}`;
        if (e.tipo === 'amistad') texto += ` nivel ${e.nivel}`;
        if (e.camara) texto += ` camara ${Array.isArray(e.camara.planos) ? e.camara.planos.length + ' planos propios' : e.camara.planos}`;
        filas.push({ clave: k, texto, extra: pista });
        if (e.tipo === 'guion') {
            e.lineas.forEach((l, i) => filas.push({ clave: `${k}.${i + 1}`, texto: `${l.q} ${num(l.a)}${l.d !== undefined ? '+' + num(l.d) : ''} ${lado(l.texto, idioma)}`, extra: l.texto.revisado ? '' : '[sin revisar]' }));
        }
    }
    return filas;
}

// ---------- Píxeles (iconos, cartas-arte, borradores) ----------
const colores = d => (d ? `${d.paleta.length} colores` : '');
// Filas del dibujo, para --dibujo (el agente las lee o las copia tal cual)
const filasDibujo = (d, op) => (op.dibujo && d ? [{ clave: '', texto: `paleta ${d.paleta.map((c, i) => `${i < 62 ? '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'[i] : i}=${c}`).join(' ')}` }, ...d.filas.map(f => ({ clave: '', texto: f }))] : []);
function filasIconos(d, filtro, op) {
    const filas = [];
    for (const [k, dib] of Object.entries(d.iconos || {})) {
        if (filtro && !k.startsWith(filtro)) continue;
        filas.push({ clave: k, texto: `${dib.estado || 'listo'} · ${colores(dib)}` }, ...filasDibujo(dib, op));
    }
    return filas;
}
function filasCartasArte(d, filtro, op) {
    const filas = [];
    for (const [k, dib] of Object.entries(d.retratos || {})) {
        if (filtro && !k.startsWith(filtro)) continue;
        filas.push({ clave: k, texto: `retrato ${dib.estado || 'listo'} · ${colores(dib)}` }, ...filasDibujo(dib, op));
    }
    if (d.reverso && (!filtro || 'reverso'.startsWith(filtro))) filas.push({ clave: 'reverso', texto: `${d.reverso.estado || 'listo'} · ${colores(d.reverso)}` }, ...filasDibujo(d.reverso, op));
    for (const [fam, m] of Object.entries(d.marcos || {})) if (!filtro || fam.startsWith(filtro)) filas.push({ clave: `marco.${fam}`, texto: Object.entries(m).map(([k, v]) => `${k} ${v}`).join(' · ') });
    return filas;
}
// Una fila por objeto o carta nuevos con todo lo que llenó el dueño (filtro: objetos, cartas o el comienzo de una clave)
function filasBorradores(d, filtro, op) {
    const filas = [];
    const lado = tx => (tx ? `${tx.es}${tx.en ? ' / ' + tx.en : ' / (falta inglés)'}` : '');
    for (const [grupo, lista] of [['objetos', d.objetos], ['cartas', d.cartas]]) {
        for (const [k, b] of Object.entries(lista || {})) {
            if (filtro && filtro !== grupo && !k.startsWith(filtro)) continue;
            const partes = [`[${b.estado}]`, lado(b.nombre)];
            if (grupo === 'objetos') {
                if (b.que) partes.push(`qué hace: ${b.que}`);
                if (b.receta) partes.push(`receta: ${b.receta}`);
                partes.push(b.dibujo ? `dibujo 16×16 (${colores(b.dibujo)})` : 'sin dibujo');
            } else {
                partes.push(`plantilla ${b.plantilla}` + (b.plantilla === 'hechizo' ? '' : ` ATK ${b.atk ?? '?'} DEF ${b.def ?? '?'}`));
                partes.push(b.efecto ? `efecto: ${lado(b.efecto)}` : 'sin efecto');
                partes.push(b.boceto ? `boceto 40×26 (${colores(b.boceto)})` : 'sin boceto');
            }
            if (b.notas) partes.push(`notas: ${b.notas}`);
            if (b.fecha) partes.push(b.fecha);
            filas.push({ clave: `${grupo === 'objetos' ? 'objeto' : 'carta'}.${k}`, texto: partes.join(' · ') }, ...filasDibujo(b.dibujo || b.boceto, op));
        }
    }
    return filas;
}

// musica: un tema por fila (y a quién reemplaza en el juego); con una clave, sus capas
function filasMusica(d, filtro) {
    const temas = d.temas || {}, canciones = d.canciones || {};
    const capas = T => (T.capas || []).map((c, n) => {
        const tipo = ['ritmo', 'rel', 'acorde', 'notas', 'arpegio', 'bajo'].find(x => c[x] !== undefined) || '?';
        return { clave: `${n + 1}. ${c.nombre || c.inst}`, texto: `${tipo}${c.bajo ? ` (${c.bajo.length} notas)` : ''} · ${c.inst} · vol ${c.vol}${c.niveles ? ' · ' + c.niveles.join('/') : ''}${c.mudo ? ' · muda' : ''}` };
    });
    if (filtro && temas[filtro]) return capas(temas[filtro]);
    if (filtro && canciones[filtro]) {
        const C = canciones[filtro], M = mapaTiempo(C);
        return [...M.secciones.map(s => ({ clave: `${s.n + 1}. ${s.seccion}`, texto: `${s.compases} compases · ${num(s.bpm)} bpm · ${s.pasos} pasos · ${num(s.t0)}-${num(s.t1)} s${s.nivel !== s.seccion ? ' · nivel ' + s.nivel : ''}` })), ...capas(C)];
    }
    const filas = Object.entries(temas).filter(([k]) => !filtro || k.includes(filtro)).map(([k, T]) => {
        const reemplaza = Object.entries(USOS).find(([, u]) => [].concat(Array.isArray(u.temas) ? u.temas : Object.keys(u.temas)).includes(k));
        const estado = T.borrador ? 'BORRADOR' : reemplaza ? `suena: reemplaza a ${k} (${reemplaza[0]})` : 'listo (no reemplaza a ninguno)';
        return { clave: k, texto: `${estado} · ${T.bpm} bpm · ${(T.prog || []).join(' ')} · ${(T.capas || []).length} capas` };
    });
    for (const [k, C] of Object.entries(canciones)) if (!filtro || k.includes(filtro)) {
        const M = mapaTiempo(C);
        filas.push({ clave: 'cancion:' + k, texto: `${C.borrador ? 'BORRADOR' : 'lista'} · ${num(M.duracion)} s · ${M.secciones.map(s => s.seccion).join(' ')} · ${(C.capas || []).length} capas` });
    }
    for (const [k, I] of Object.entries(d.instrumentos || {})) if (!filtro || k.includes(filtro)) filas.push({ clave: 'inst:' + k, texto: `${I.onda || 'square'}${I.filtro ? ' · filtro ' + I.filtro.tipo : ''}${I.voces > 1 ? ' · ' + I.voces + ' voces' : ''}` });
    return filas;
}
// Combate: una fila por ataque, acción y reacción; con una clave, su línea de tiempo (fases, ventanas, i-frames, avance)
function filasEstilo(d, filtro) {
    const filas = [];
    const fases = f => `a ${f.anticipacion} · g ${f.activo} · r ${f.recuperacion} = ${largoFases(f)} c (${num(largoFases(f) / 60)} s)`;
    for (const [grupo, lista] of [['ataque', d.ataques], ['accion', d.acciones], ['reaccion', d.reacciones]]) {
        for (const [k, a] of Object.entries(lista || {})) {
            if (filtro && k !== filtro && !k.startsWith(filtro)) continue;
            const partes = [grupo + (a.altura ? ' ' + a.altura : '') + (a.peligro ? ' PELIGRO ' + a.peligro : ''), fases(a.fases)];
            if (a.dano !== undefined) partes.push(`daño ${a.dano}`);
            if (a.postura !== undefined) partes.push(`postura ${a.postura}`);
            if (a.alcance !== undefined) partes.push(`alcance ${num(a.alcance)}`);
            if (a.hitstop) partes.push(`hitstop ${a.hitstop}`);
            if (a.reaccion) partes.push(`-> ${a.reaccion}`);
            filas.push({ clave: k, texto: partes.join(' · ') });
            if (filtro) for (const l of lineaDeTiempo(a)) filas.push({ clave: '', texto: l });
        }
    }
    if (!filtro) filas.push({ clave: 'anim', texto: Object.keys(d.anim || {}).join(', ') });
    return filas;
}
function filasCombate(d, filtro) {
    if (filtro) return filasEstilo({ reacciones: d.reacciones }, filtro);
    const m = d.motor || {};
    return [
        { clave: 'motor', texto: `${m.hz} Hz · saltoMax ${m.saltoMax} · mezcla ${JSON.stringify(m.mezcla)} · suelo ${m.suelo} · pies ${JSON.stringify(m.pies)}` },
        { clave: 'entrada', texto: `buffer ${(d.entrada || {}).buffer} c · táctil ${(d.tactil || {}).buffer} c, ventanas +${(d.tactil || {}).ventanasExtra}` },
        { clave: 'curvas', texto: Object.keys(d.curvas || {}).join(', ') },
        { clave: 'peso', texto: Object.entries(d.peso || {}).map(([k, p]) => `${k} ${p.hitstop} c`).join(' · ') },
        ...filasEstilo({ reacciones: d.reacciones }, null).filter(f => f.clave !== 'anim')
    ];
}

const FILAS_JSON = { recetas: filasRecetas, objetos: filasObjetos, misiones: filasMisiones, musica: filasMusica, iconos: filasIconos, 'cartas-arte': filasCartasArte, borradores: filasBorradores, 'ui-layout': filasLayout, textos: filasTextos, dialogos: filasDialogos, tienda: filasTienda, posiciones: filasPosiciones, personajes: filasPersonajes, poses: filasPoses, escenas: filasEscenas };

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
            const cuenta1 = RESUMEN_JSON[nombre] || (meta.esquema === 'estilo' ? d => `${Object.keys(d.ataques || {}).length} ataques, ${Object.keys(d.acciones || {}).length} acciones, ${Object.keys(d.anim || {}).length} animaciones` : meta.esquema === 'combate' ? d => `${Object.keys(d.reacciones || {}).length} reacciones, ${Object.keys(d.curvas || {}).length} curvas, ${Object.keys(d.peso || {}).length} niveles de peso` : null);
            try { cuenta = cuenta1 ? cuenta1(leerDatos(nombre)) : '(sin resumen)'; } catch (e) { cuenta = 'ERROR: ' + e.message; }
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
        const fn = FILAS_JSON[objetivo] || (objetivo === 'combate' ? filasCombate : indice.archivos[objetivo].esquema === 'estilo' ? filasEstilo : null);
        filas = fn ? fn(leerDatos(objetivo), filtro, op) : [];
    } else {
        salir([`Desconocido: ${objetivo}. Archivos: ${Object.keys(indice.archivos).join(', ')} · fuentes: ${Object.keys(FUENTES).map(k => 'js:' + k).join(', ')}`], op, 1);
    }
    if (!filas.length) salir([`Sin resultados para ${objetivo}${filtro ? ' ' + filtro : ''}.`], op, objetivo === 'borradores' && !filtro ? 0 : 1);
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
// Claves de objetos (en minúscula) y de cartas, para revisar iconos, cartas-arte y borradores
// B6d: claves de mundo/datos/objetos.json (en Node objetos.js no lo carga: el juego sí, al arrancar)
function clavesObjetosNuevos() {
    try { return Object.keys(JSON.parse(fs.readFileSync(path.join(DATOS, 'objetos.json'), 'utf8')).objetos || {}); } catch (e) { return []; }
}

// B6d: lo que necesitan las reglas de objetos.json (claves del código y de bloques, íconos del código, dibujos y colores)
async function contextoObjetosNuevos() {
    const { O, OBJETOS, COLORES } = await import('../mundo/supervivencia/objetos.js');
    const { B } = await import('../mundo/texturas.js');
    const { reglasObjetos } = await import('./objetos-nuevos-modelo.mjs');
    let dibujos = new Set();
    try { dibujos = new Set(Object.keys(JSON.parse(fs.readFileSync(path.join(DATOS, 'iconos.json'), 'utf8')).iconos || {})); } catch (e) { /* sin iconos.json */ }
    const ocupada = k => O[String(k).toUpperCase()] !== undefined || B[String(k).toUpperCase()] !== undefined;
    return { reglas: reglasObjetos, ocupada, iconos: new Set(OBJETOS.filter(Boolean).map(o => o.icono)), dibujos, colores: new Set(Object.keys(COLORES)) };
}

async function refsPixeles() {
    const { O } = await import('../mundo/supervivencia/objetos.js');
    const { CARTAS } = await import('../mundo/supervivencia/cartas-datos.js');
    return { objetos: new Set([...Object.keys(O).map(k => k.toLowerCase()), ...clavesObjetosNuevos()]), cartas: new Set(Object.keys(CARTAS)) };
}

// Quién puede tener tienda o misiones en tienda.json y misiones.json: las 13 de hoy (tienda-datos.js) y las personas nuevas de personajes.json
async function personasDelJuego() {
    const { TIENDAS } = await import('../mundo/supervivencia/tienda-datos.js');
    const { esDelCodigo } = await import('../mundo/datos/personajes.js');
    const nuevas = new Set();
    try { for (const k of Object.keys(JSON.parse(fs.readFileSync(path.join(DATOS, 'personajes.json'), 'utf8')).personas || {})) if (!esDelCodigo(k)) nuevas.add(k); } catch (e) { /* sin personajes.json: solo las 13 */ }
    return new Set([...Object.keys(TIENDAS), ...nuevas]);
}

async function nombresDeObjetos() {
    const { O } = await import('../mundo/supervivencia/objetos.js');
    const { B } = await import('../mundo/texturas.js');
    const nombres = new Set(Object.keys(O).map(k => k.toLowerCase()));
    for (const [k, id] of Object.entries(B)) if (id > 0 && k !== 'AGUA' && k !== 'LAVA') nombres.add(k.toLowerCase());
    for (const k of clavesObjetosNuevos()) nombres.add(k);
    return nombres;
}

// Referencias de posiciones.json: las anclas que el juego resuelve (lugares de construcciones.js, el escenario y
// el faro) y las claves de PERSONAS (criaturas/amigos.js, leído como texto: el módulo necesita el DOM)
async function referenciasDePosiciones() {
    const { LUGARES } = await import('../mundo/construcciones.js');
    const fuente = fs.readFileSync(path.join(RAIZ, 'mundo', 'criaturas', 'amigos.js'), 'utf8');
    const bloque = (fuente.match(/export const PERSONAS = \{([\s\S]*?)\r?\n\};/) || [])[1] || '';
    const personas = new Set([...bloque.matchAll(/^ {4}([a-z0-9_]+): \{/gm)].map(m => m[1]));
    const { ANCLAS_ESCENARIO, ANCLAS_PUNTO, GIRO_CALCULADO } = await import('../mundo/datos/posiciones.js');
    // B5: las personas nuevas de personajes.json también tienen sitio en posiciones.json
    try { for (const k of Object.keys(JSON.parse(fs.readFileSync(path.join(DATOS, 'personajes.json'), 'utf8')).personas || {})) personas.add(k); } catch (e) { /* sin personajes.json */ }
    return { anclas: new Set([...LUGARES.map(l => l.clave), ...ANCLAS_ESCENARIO, ...ANCLAS_PUNTO]), personas, giroCalculado: GIRO_CALCULADO };
}

// Lo que el juego resuelve para escenas.json: los gestos (GESTOS, GESTOS_AMISTAD, MOLDES y, desde la fase 6, los gestos y
// poses de poses.json), las claves de ANIMACIONES y durLinea. Para poses.json: codigo (GESTOS y GESTOS_AMISTAD) y moldes. moldes.js y reencuentros.js traen cuerpo.js, que escucha eventos de `window`: basta un objeto mínimo.
async function nombresDeEscenas() {
    globalThis.window ??= { addEventListener() {} };
    // amigos.js (por reencuentros.js) pide posiciones.json con fetch al importarse: en Node falla y avisa; aquí no importa
    const aviso = console.warn;
    console.warn = (...m) => { if (!String(m[0]).startsWith('[datos]')) aviso(...m); };
    try {
        return await nombresDeEscenasImport();
    } finally { console.warn = aviso; }
}
async function nombresDeEscenasImport() {
    const { GESTOS } = await import('../mundo/supervivencia/escenas-skin.js');
    const { ANIMACIONES, GESTOS_AMISTAD } = await import('../mundo/supervivencia/escena-amistad-datos.js');
    const { MOLDES, PIX, SONIDOS } = await import('../mundo/supervivencia/moldes.js');
    const { durLinea } = await import('../mundo/supervivencia/reencuentros.js');
    const { PERSONAJES, GRUPOS } = await import('../mundo/supervivencia/amistad.js');
    const { CODIGO_ESCENAS } = await import('../mundo/supervivencia/codigo-escenas.js');
    const { sonidos } = await import('../mundo/supervivencia/sonidos.js');
    let iconos = [];
    try { iconos = Object.keys(JSON.parse(fs.readFileSync(path.join(DATOS, 'iconos.json'), 'utf8')).iconos || {}); } catch (e) { /* sin iconos.json válido */ }
    let poses = [];
    try { poses = gestosDeDatos(JSON.parse(fs.readFileSync(path.join(DATOS, 'poses.json'), 'utf8'))).map(([k]) => k); } catch (e) { /* sin poses.json válido: solo el código */ }
    const codigo = new Set([...Object.keys(GESTOS), ...Object.keys(GESTOS_AMISTAD)]);
    return { gestos: new Set([...codigo, ...Object.keys(MOLDES), ...poses]), codigo, moldes: new Set(Object.keys(MOLDES)), animaciones: new Set(Object.keys(ANIMACIONES)), durLinea,
        // B3 (DISENO §40): catálogos de las claves nuevas de escenas.json. Sonidos: los que suenan en una escena (SONIDOS y los del
        // juego sin argumentos, como el motor); codigos: CODIGO_ESCENAS de codigo-escenas.js
        personas: new Set(PERSONAJES), grupos: new Set(Object.keys(GRUPOS)), iconos: new Set(iconos), pix: new Set(Object.keys(PIX)),
        sonidos: new Set(Object.keys(sonidosDeEscena(SONIDOS, sonidos))), codigos: new Set(Object.keys(CODIGO_ESCENAS)) };
}

// Reglas de contenido que el esquema no expresa
function revisarSemantica(nombre, datos, problemas, arch, objetos, refs, escenas, pix, conTienda, nuevos) {
    const mal = texto => problemas.push({ archivo: arch, tipo: 'error', texto });
    const aviso = texto => problemas.push({ archivo: arch, tipo: 'aviso', texto });
    const dibujo = (ruta, d, [w, h]) => { if (d) for (const e of revisarDibujo(d, w, h)) mal(`${ruta}: ${e} (${w}×${h})`); };
    if (nombre === 'iconos' && pix) {
        for (const [k, d] of Object.entries(datos.iconos || {})) {
            dibujo(`$.iconos.${k}`, d, MEDIDAS.icono);
            if (!pix.objetos.has(k)) aviso(`$.iconos.${k}: no hay objeto con esa clave (OBJETOS de objetos.js): el juego no lo usa`);
        }
    }
    if (nombre === 'cartas-arte' && pix) {
        for (const [k, d] of Object.entries(datos.retratos || {})) {
            dibujo(`$.retratos.${k}`, d, MEDIDAS.retrato);
            if (!pix.cartas.has(k)) aviso(`$.retratos.${k}: no hay carta con esa clave (CARTAS de cartas-datos.js): el juego no lo usa`);
        }
        dibujo('$.reverso', datos.reverso, MEDIDAS.carta);
    }
    if (nombre === 'borradores' && pix) {
        for (const [k, b] of Object.entries(datos.objetos || {})) {
            dibujo(`$.objetos.${k}.dibujo`, b.dibujo, MEDIDAS.icono);
            if (b.estado === 'borrador' && pix.objetos.has(k)) aviso(`$.objetos.${k}: ya hay un objeto con esa clave en el juego (¿marcarlo hecho?)`);
        }
        for (const [k, b] of Object.entries(datos.cartas || {})) {
            dibujo(`$.cartas.${k}.boceto`, b.boceto, MEDIDAS.retrato);
            if (b.estado === 'borrador' && pix.cartas.has(k)) aviso(`$.cartas.${k}: ya hay una carta con esa clave en el juego (¿marcarla hecha?)`);
            if (b.plantilla === 'hechizo' && (b.atk !== undefined || b.def !== undefined)) aviso(`$.cartas.${k}: un hechizo no lleva ATK ni DEF`);
        }
    }
    if (nombre === 'escenas' && escenas) {
        for (const r of reglasEscenas(datos, escenas)) problemas.push({ archivo: arch, tipo: r.tipo, texto: r.texto });
    }
    // Combate (bloque 8 · N3): fases, ventanas, cancelaciones, claves de fase, curvas y límites
    if (nombre === 'combate' || (indiceDe(nombre) || {}).esquema === 'estilo') {
        const opcional = n => { try { return leerDatos(n); } catch (e) { return null; } };
        const limites = (opcional('poses') || {}).limites;
        const reglas = nombre === 'combate' ? reglasCombate(datos, { limites }) : reglasEstilo(datos, { combate: opcional('combate'), limites });
        for (const r of reglas) problemas.push({ archivo: arch, tipo: r.tipo, texto: r.texto });
    }
    if (nombre === 'poses' && escenas) {
        for (const r of reglasPoses(datos, escenas)) problemas.push({ archivo: arch, tipo: r.tipo, texto: r.texto });
    }
    if (nombre === 'posiciones' && refs) {
        // B6e: dos construcciones movidas que se pisan (el terreno nivela las dos y la segunda tapa a la primera).
        // También las nuevas de construcciones.json; con giro 90 o 270, ancho y fondo se cambian.
        let propias = {};
        try { propias = propiasDe(leerDatos('construcciones')); } catch (e) { /* sin construcciones.json */ }
        const tam = (k, p) => { const c = CONSTRUCCIONES[k] || propias[k]; return cuartos(p.giro) % 2 ? { w: c.d, d: c.w } : c; };
        for (const [k, p] of Object.entries(datos.lugares || {})) {
            if (!CONSTRUCCIONES[k] && !propias[k]) mal(`$.lugares.${k}: no es una construcción (CONSTRUCCIONES de mundo/datos/posiciones.js ni construcciones.json sin borrador)`);
            else if (p.giro && CONSTRUCCIONES[k] && !CONSTRUCCIONES[k].gira) problemas.push({ archivo: arch, tipo: 'aviso', texto: `$.lugares.${k}.giro: el juego lo ignora, se orienta solo` });
        }
        const movidas = Object.entries(datos.lugares || {}).filter(([k]) => CONSTRUCCIONES[k] || propias[k]);
        for (let i = 0; i < movidas.length; i++) for (let j = i + 1; j < movidas.length; j++) {
            const [ka, a] = movidas[i], [kb, b] = movidas[j], A = tam(ka, a), B = tam(kb, b);
            if (Math.abs(a.x - b.x) * 2 < A.w + B.w + 4 && Math.abs(a.z - b.z) * 2 < A.d + B.d + 4) problemas.push({ archivo: arch, tipo: 'aviso', texto: `$.lugares: ${ka} y ${kb} se pisan (sepáralas unos bloques)` });
        }
        for (const [grupo, puntos] of Object.entries({ personas: datos.personas, objetos: datos.objetos, poi: datos.poi })) {
            for (const [clave, p] of Object.entries(puntos || {})) {
                if (grupo === 'personas' && !refs.personas.has(clave)) mal(`$.personas.${clave}: no existe esa persona (PERSONAS de criaturas/amigos.js ni personajes.json)`);
                if (!refs.anclas.has(p.ancla)) mal(`$.${grupo}.${clave}.ancla: «${p.ancla}» no se resuelve en el juego (valen ${[...refs.anclas].join(', ')})`);
                if (grupo === 'personas' && refs.giroCalculado[clave] && p.giro) {
                    problemas.push({ archivo: arch, tipo: 'aviso', texto: `$.personas.${clave}.giro: el juego lo ignora, ${refs.giroCalculado[clave]}` });
                }
            }
        }
    }
    if (nombre === 'construcciones') {
        // Nombres de bloque que el juego no conoce, claves de las 9 del código y bloques repetidos en la misma celda
        for (const [k, c] of Object.entries(datos.construcciones || {})) {
            if (CONSTRUCCIONES[k]) mal(`$.construcciones.${k}: esa clave es de una construcción del código (elige otro nombre)`);
            const celdas = new Set();
            (c.bloques || []).forEach((b, i) => {
                if (!Array.isArray(b)) return;
                if (idBloque(b[3]) === null) mal(`$.construcciones.${k}.bloques[${i}]: «${b[3]}» no es un bloque (claves de B en mundo/texturas.js)`);
                const celda = b.slice(0, 3).join(',');
                if (celdas.has(celda)) problemas.push({ archivo: arch, tipo: 'aviso', texto: `$.construcciones.${k}.bloques[${i}]: ya hay un bloque en ${celda} (gana el último)` });
                celdas.add(celda);
            });
        }
    }
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
    if (nombre === 'personajes' && refs && objetos) {
        for (const r of reglasPersonajes(datos, { anclas: refs.anclas, objeto: n => objetos.has(String(n).toLowerCase()), gestos: escenas && escenas.gestos })) problemas.push({ archivo: arch, tipo: r.tipo, texto: r.texto });
    }
    if (nombre === 'objetos' && nuevos) {
        for (const r of nuevos.reglas(datos, nuevos)) problemas.push({ archivo: arch, tipo: r.tipo, texto: r.texto });
    }
    if (nombre === 'recetas' && objetos) {
        const revisa = (ruta, n) => { if (typeof n === 'string' && !objetos.has(n)) mal(`${ruta}: no existe el objeto «${n}» (los nombres son los de /dar)`); };
        (datos.recetas || []).forEach((r, i) => {
            const p = `$.recetas[${i}]`;
            revisa(`${p}.da`, r.da && r.da[0]);
            for (const [ch, v] of Object.entries(r.ingredientes || {})) [].concat(v).forEach(n => revisa(`${p}.ingredientes.${ch}`, n));
            (r.sin || []).forEach((v, j) => [].concat(v).forEach(n => revisa(`${p}.sin[${j}]`, n)));
            if (r.forma) {
                const letras = new Set(r.forma.join('').replace(/ /g, ''));
                for (const ch of letras) if (!(r.ingredientes || {})[ch]) mal(`${p}.forma: la letra «${ch}» no tiene ingrediente`);
                for (const ch of Object.keys(r.ingredientes || {})) if (!letras.has(ch)) mal(`${p}.ingredientes.${ch}: la letra no está en la forma`);
                if (new Set(r.forma.map(f => f.length)).size > 1 && r.forma.some(f => f.length < Math.max(...r.forma.map(x => x.length)))) problemas.push({ archivo: arch, tipo: 'aviso', texto: `${p}.forma: filas de distinto largo (se completan con vacío a la derecha)` });
            }
        });
        for (const [a, b] of Object.entries(datos.fundicion || {})) { revisa(`$.fundicion.${a}`, a); revisa(`$.fundicion.${a}`, b); }
    }
    if (nombre === 'misiones' && objetos) {
        const revisa = (ruta, pila) => { if (Array.isArray(pila) && !objetos.has(pila[0])) mal(`${ruta}: no existe el objeto «${pila[0]}» (los nombres son los de /dar)`); };
        for (const [id, m] of Object.entries(datos.misiones || {})) {
            const r = `$.misiones.${id}`;
            if (conTienda && !conTienda.has(m.amigo)) mal(`${r}.amigo: no existe esa persona (las 13 del juego o una de personajes.json)`);
            if (!id.startsWith(m.amigo)) mal(`${r}: el id debe empezar con la clave del amigo («${m.amigo}»)`);
            if (m.tipo === 'entregar' && !(m.pide || []).length) mal(`${r}.pide: una misión de entregar necesita qué entregar`);
            if (m.tipo === 'matar' && (!m.mob || !m.n)) mal(`${r}: una misión de matar necesita mob y n`);
            // B6e: visitar por lugares y hablar con alguien
            if (m.tipo === 'visitar' && !(m.lugares || []).length) mal(`${r}.lugares: una misión de visitar necesita adónde ir`);
            if (m.tipo === 'visitar' && m.n > (m.lugares || []).length) mal(`${r}.n: pide ${m.n} lugares y solo nombra ${(m.lugares || []).length}`);
            if (m.tipo === 'hablar' && !m.con) mal(`${r}.con: una misión de hablar necesita con quién`);
            if (m.tipo === 'hablar' && m.con && conTienda && !conTienda.has(m.con)) mal(`${r}.con: no existe esa persona (las 13 del juego o una de personajes.json)`);
            if (m.tipo === 'hablar' && m.con === m.amigo) mal(`${r}.con: tiene que ser otra persona, no quien da la misión`);
            (m.pide || []).forEach((p, j) => revisa(`${r}.pide[${j}]`, p));
            (m.premio || []).forEach((p, j) => revisa(`${r}.premio[${j}]`, p));
            (m.kit || []).forEach((p, j) => revisa(`${r}.kit[${j}]`, p));
        }
    }
    if (nombre === 'tienda' && objetos) {
        const revisa = (ruta, pila) => { if (Array.isArray(pila) && !objetos.has(pila[0])) mal(`${ruta}: no existe el objeto «${pila[0]}» (los nombres son los de /dar)`); };
        for (const [amigo, t] of Object.entries(datos.tiendas || {})) {
            if (conTienda && !conTienda.has(amigo)) mal(`$.tiendas.${amigo}: no existe esa persona (las 13 de tienda-datos.js o una de personajes.json)`);
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
    const objetos = nombres.includes('tienda') || nombres.includes('misiones') || nombres.includes('recetas') || nombres.includes('personajes') ? await nombresDeObjetos() : null;
    const refs = nombres.includes('posiciones') || nombres.includes('personajes') ? await referenciasDePosiciones() : null;
    const conTienda = nombres.includes('tienda') || nombres.includes('misiones') ? await personasDelJuego() : null;
    const escenas = nombres.some(n => ['escenas', 'poses', 'personajes'].includes(n)) ? await nombresDeEscenas() : null;
    const pix = nombres.some(n => ['iconos', 'cartas-arte', 'borradores'].includes(n)) ? await refsPixeles() : null;
    const nuevos = nombres.includes('objetos') ? await contextoObjetosNuevos() : null;
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
        revisarSemantica(nombre, datos, problemas, arch, objetos, refs, escenas, pix, conTienda, nuevos);
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
else salir(['Uso: node estudio/cli.mjs resumen [archivo|js:fuente] [clave] [--md] | validar [archivo...] [--contra HEAD] | glifos | capturar layout|pose|gesto|escena|combate <nombre> [--tiempos …] [--hoja] [--medir js]'], op, orden ? 1 : 0);
