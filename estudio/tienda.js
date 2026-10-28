// =========================================================
// VENJY · Estudio · pestaña Tienda (Etapa B · B6, estudio/DISENO.md §42)
// Edita mundo/datos/tienda.json: ofertas y compras NUEVAS de cada persona, que el juego suma al final de las de tienda-datos.js,
// y la tienda entera de una persona nueva de personajes.json (con lo que dice al abrir y al cerrar un trato). Vista simple:
// «te da» y «a cambio de» con un objeto cada uno (esmeraldas por defecto) y «Partir de» una oferta que ya existe; varios
// objetos por lado y la misión que la desbloquea, en Avanzado. Avisa si la oferta regala (mismas reglas de mundo/tests/tienda.mjs).
// Cada cambio se manda al juego (en vivo con ?estudio); Guardar escribe con If-Match.
// =========================================================
import { O, nombreDe } from '../mundo/supervivencia/objetos.js';
import { B } from '../mundo/texturas.js';
import { TIENDAS, TEXTOS_TIENDA } from '../mundo/supervivencia/tienda-datos.js';
import { NOMBRES_AMIGO, MISIONES } from '../mundo/supervivencia/misiones-datos.js';
import { REQ_MINIJUEGOS } from '../mundo/supervivencia/minijuegos-datos.js';
import { VAL_ESMERALDA, valor, suma } from '../mundo/supervivencia/tienda-valor.js';
import { esDelCodigo } from '../mundo/datos/personajes.js';
import { avisosOferta, avisosCompra, limpiarTienda, ofertaValida, compraValida, resumenPilas, TEXTOS_CLAVES } from './tienda-modelo.mjs';
import { instalarDeshacer } from './campo-comun.js';

const clonar = o => JSON.parse(JSON.stringify(o));
const esObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
// Objetos y bloques con nombre, en minúscula como /dar
const NOMBRES = [...Object.keys(O), ...Object.keys(B).filter(k => B[k] > 0 && k !== 'AGUA' && k !== 'LAVA')].map(k => k.toLowerCase()).sort();
const idDe = n => { const k = String(n).toUpperCase(); return O[k] !== undefined ? O[k] : B[k]; };
const calc = { idDe, valor, suma, VAL_ESMERALDA };
const nombreDeId = id => (Object.keys(O).find(k => O[k] === id) || Object.keys(B).find(k => B[k] === id) || '').toLowerCase();
const aNombres = pilas => pilas.map(([id, n]) => [nombreDeId(id), n]);

export async function montarTienda(ctx) {
    const $ = id => document.getElementById(id);
    const t = (es, en) => (ctx.idioma === 'en' ? en : es);
    const msg = $('ti-mensaje'), btnGuardar = $('ti-guardar'), sel = $('ti-persona'), form = $('ti-form');
    let etag = null, original = null, datos = null, actual = null, personas = {};
    try {
        const r = await fetch('../mundo/datos/tienda.json', { cache: 'no-cache' });
        etag = r.headers.get('ETag'); original = JSON.parse(await r.text());
    } catch (e) { msg.textContent = 'No se pudo leer mundo/datos/tienda.json'; return; }
    if (!esObj(original.tiendas)) original.tiendas = {};
    try { personas = (await (await fetch('../mundo/datos/personajes.json', { cache: 'no-cache' })).json()).personas || {}; } catch (e) { personas = {}; }
    datos = clonar(original);
    const sucio = () => JSON.stringify(datos) !== JSON.stringify(original);
    ctx.sucios.tienda = sucio;
    const rotular = (es, en, clase = '') => { msg.textContent = t(es, en); msg.className = 'mensaje' + (clase ? ' ' + clase : ''); };
    const hist = instalarDeshacer(ctx, { pestana: 'tienda', idBoton: 'ti-descartar', leer: () => JSON.stringify(datos), poner: x => { datos = JSON.parse(x); pintar(); cambio(false); } });
    const base = k => Object.prototype.hasOwnProperty.call(NOMBRES_AMIGO, k) && !!TIENDAS[k];
    const nuevas = () => Object.keys(personas).filter(k => !esDelCodigo(k));
    const claves = () => [...Object.keys(TIENDAS).filter(base), ...nuevas().filter(k => !base(k))];
    const nombreDePersona = k => (personas[k] && personas[k].nombre) || NOMBRES_AMIGO[k] || k;
    const nombreObj = n => { const id = idDe(n); return id === undefined ? n : nombreDe(id, ctx.idioma); };
    const tienda = () => {
        if (!esObj(datos.tiendas[actual])) datos.tiendas[actual] = {};
        return datos.tiendas[actual];
    };

    function cambio(anotar = true) {
        for (const k of Object.keys(datos.tiendas)) { const l = limpiarTienda(datos.tiendas[k]); if (l) datos.tiendas[k] = l; else delete datos.tiendas[k]; }
        btnGuardar.disabled = !sucio() || !ctx.servidor.escritura;
        $('ti-descartar').disabled = !sucio();
        if (anotar) hist.anotar();
        ctx.puente.enviarDatos('tienda', datos);
    }

    // ---------- Campos ----------
    const rotulo = (es, en) => { const s = document.createElement('span'); s.textContent = t(es, en); return s; };
    const campo = (es, en, input) => { const l = document.createElement('label'); l.className = 'campo'; l.append(rotulo(es, en), input); return l; };
    const avanzado = el => { el.classList.add('solo-avanzado'); return el; };
    const titulo = (es, en) => { const h = document.createElement('h3'); h.className = 'pj-titulo'; h.textContent = t(es, en); return h; };
    const nota = (es, en) => Object.assign(document.createElement('p'), { className: 'pj-nota', textContent: t(es, en) });
    const boton = (es, en, f, clase = 'boton chico secundario') => { const b = document.createElement('button'); b.type = 'button'; b.className = clase; b.textContent = t(es, en); b.addEventListener('click', f); return b; };
    function entradaObjeto(valorInicial, al) {
        const i = document.createElement('input'); i.type = 'text'; i.setAttribute('list', 'ti-objetos'); i.value = valorInicial; i.maxLength = 40; i.autocomplete = 'off';
        i.addEventListener('change', () => {
            const v = i.value.trim().toLowerCase().replace(/\s+/g, '_');
            if (NOMBRES.includes(v)) al(v);
            else { i.value = valorInicial; rotular('Ese objeto no existe: escribe su nombre y elige de la lista.', 'That object does not exist: type its name and pick from the list.', 'error'); }
        });
        return i;
    }
    function entradaCantidad(valorInicial, al) {
        const i = document.createElement('input'); i.type = 'number'; i.min = 1; i.max = 64; i.step = 1; i.value = valorInicial;
        i.addEventListener('change', () => { const n = Math.round(Number(i.value)); if (Number.isFinite(n)) al(Math.min(64, Math.max(1, n))); });
        return i;
    }
    // Lista de pilas [nombre, n] (da / pide): en Simple, una; «Agregar objeto» y quitar, en Avanzado
    function listaPilas(pilas, rotuloEs, rotuloEn, alCambiar) {
        const caja = document.createElement('div'); caja.className = 'pj-lista';
        pilas.forEach((p, i) => {
            const fila = document.createElement('div'); fila.className = 'pj-par';
            fila.append(campo(rotuloEs, rotuloEn, entradaObjeto(p[0], v => { p[0] = v; alCambiar(); })), campo('Cantidad', 'Amount', entradaCantidad(p[1], n => { p[1] = n; alCambiar(); })));
            if (i > 0) fila.appendChild(boton('Quitar', 'Remove', () => { pilas.splice(i, 1); alCambiar(true); }));
            caja.appendChild(i > 0 ? avanzado(fila) : fila);
        });
        caja.appendChild(avanzado(boton('Agregar objeto', 'Add object', () => { pilas.push(['esmeralda', 1]); alCambiar(true); })));
        return caja;
    }
    function avisos(lista) {
        const d = document.createElement('div'); d.className = 'pj-avisos';
        for (const [es, en] of lista) d.appendChild(Object.assign(document.createElement('p'), { textContent: t(es, en) }));
        return d;
    }
    // Par ES/EN de lo que dice
    function par(rotEs, rotEn, valorIni, al) {
        const fila = document.createElement('div'); fila.className = 'pj-par';
        const v = esObj(valorIni) ? clonar(valorIni) : { es: '', en: '' };
        const poner = () => al(v.es && v.en ? { es: v.es, en: v.en } : null);
        for (const [l, k] of [['ES', 'es'], ['EN', 'en']]) {
            const i = document.createElement('input'); i.type = 'text'; i.maxLength = 160; i.value = v[k] || '';
            i.addEventListener('change', () => { v[k] = i.value.trim(); poner(); });
            fila.appendChild(campo(`${rotEs} (${l})`, `${rotEn} (${l})`, i));
        }
        return fila;
    }

    // ---------- Pintar ----------
    function pintarLista() {
        sel.textContent = '';
        for (const k of claves()) {
            const o = document.createElement('option'); o.value = k;
            const extra = datos.tiendas[k] ? ((datos.tiendas[k].ofertas || []).length + (datos.tiendas[k].compra || []).length) : 0;
            o.textContent = nombreDePersona(k) + (base(k) ? '' : t(' (nueva)', ' (new)')) + (extra ? ` · +${extra}` : '');
            sel.appendChild(o);
        }
        if (actual) sel.value = actual;
    }
    function filaOferta(o, i) {
        const fila = document.createElement('div'); fila.className = 'pj-fila';
        const caja = document.createElement('div');
        const pintarAvisosFila = () => { caja.textContent = ''; caja.appendChild(avisos(avisosOferta(o, calc))); };
        const al = (rehacer = false) => { cambio(); if (rehacer) pintar(); else pintarAvisosFila(); };
        const req = document.createElement('select');
        const opciones = [['', t('Sin requisito', 'No requirement')], ...MISIONES.filter(m => m.amigo === actual).map(m => [m.id, m.id]), ...Object.keys(REQ_MINIJUEGOS).filter(k => k === `mj-${actual}`).map(k => [k, k])];
        for (const [v, tx] of opciones) req.appendChild(Object.assign(document.createElement('option'), { value: v, textContent: tx }));
        req.value = o.req || '';
        req.addEventListener('change', () => { if (req.value) o.req = req.value; else delete o.req; cambio(); });
        fila.append(
            listaPilas(o.da, 'Te da', 'You get', al), listaPilas(o.pide, 'A cambio de', 'In exchange for', al),
            avanzado(campo('Se desbloquea al completar', 'Unlocks after completing', req)),
            boton('Borrar oferta', 'Delete offer', () => { tienda().ofertas.splice(i, 1); cambio(); pintar(); }), caja
        );
        pintarAvisosFila();
        return fila;
    }
    function filaCompra(c, i) {
        const fila = document.createElement('div'); fila.className = 'pj-fila';
        const caja = document.createElement('div');
        const pintarAv = () => { caja.textContent = ''; caja.appendChild(avisos(avisosCompra(c, calc))); };
        const doble = document.createElement('div'); doble.className = 'pj-par';
        doble.append(campo('Te compra', 'Buys from you', entradaObjeto(c.da[0], v => { c.da[0] = v; cambio(); pintarAv(); })), campo('Cantidad', 'Amount', entradaCantidad(c.da[1], n => { c.da[1] = n; cambio(); pintarAv(); })));
        fila.append(doble, campo('Esmeraldas que paga', 'Emeralds it pays', entradaCantidad(c.esm, n => { c.esm = n; cambio(); pintarAv(); })), boton('Borrar compra', 'Delete purchase', () => { tienda().compra.splice(i, 1); cambio(); pintar(); }), caja);
        pintarAv();
        return fila;
    }
    function ofertasDeBase() {
        const r = [];
        const nm = ([id, n]) => `${n} ${nombreDe(id, ctx.idioma)}`;
        for (const k of Object.keys(TIENDAS).filter(base)) for (const o of TIENDAS[k].ofertas) {
            r.push({ etiqueta: `${nombreDePersona(k)}: ${o.da.map(nm).join(' + ')} ← ${o.pide.map(nm).join(' + ')}`, oferta: o });
        }
        return r;
    }

    function pintar() {
        pintarLista();
        form.textContent = '';
        $('ti-ir').disabled = !actual;
        if (!actual) { form.appendChild(nota('Elige a alguien.', 'Pick someone.')); return; }
        const d = datos.tiendas[actual] || {};
        const propia = !base(actual);
        if (propia) {
            const hay = (d.ofertas || []).length;
            form.append(nota(hay ? `${nombreDePersona(actual)} ya tiene tienda en el juego.` : `${nombreDePersona(actual)} todavía no tiene tienda: agrega una oferta para que aparezca la pestaña «Tienda» en su panel.`,
                hay ? `${nombreDePersona(actual)} already has a shop in the game.` : `${nombreDePersona(actual)} has no shop yet: add an offer and the «Shop» tab shows in their panel.`));
        } else {
            form.append(titulo('Ya está en el juego (no se cambia aquí)', 'Already in the game (not changed here)'));
            const ul = document.createElement('div'); ul.className = 'pj-lista';
            for (const o of TIENDAS[actual].ofertas) ul.appendChild(Object.assign(document.createElement('p'), { className: 'pj-nota', textContent: `${resumenPilas(aNombres(o.da), nombreObj)} ← ${resumenPilas(aNombres(o.pide), nombreObj)}` }));
            for (const c of TIENDAS[actual].compra || []) ul.appendChild(Object.assign(document.createElement('p'), { className: 'pj-nota', textContent: t(`Te compra ${c.da[1]} ${nombreDe(c.da[0], 'es')} por ${c.esm} esm.`, `Buys ${c.da[1]} ${nombreDe(c.da[0], 'en')} for ${c.esm} em.`) }));
            form.append(avanzado(ul));
        }
        form.append(titulo('Ofertas nuevas', 'New offers'));
        (d.ofertas || []).forEach((o, i) => form.appendChild(filaOferta(o, i)));
        const bases = ofertasDeBase();
        const selBase = document.createElement('select');
        selBase.appendChild(Object.assign(document.createElement('option'), { value: '', textContent: t('Una oferta vacía', 'An empty offer') }));
        bases.forEach((b, i) => selBase.appendChild(Object.assign(document.createElement('option'), { value: String(i), textContent: b.etiqueta })));
        form.append(campo('Partir de', 'Start from', selBase), boton('Agregar oferta', 'Add offer', () => {
            const tt = tienda(); if (!Array.isArray(tt.ofertas)) tt.ofertas = [];
            const b = selBase.value === '' ? null : bases[Number(selBase.value)].oferta;
            const oferta = b ? { da: aNombres(b.da), pide: aNombres(b.pide) } : { da: [['pan', 1]], pide: [['esmeralda', 1]] };
            if (!ofertaValida(oferta)) { rotular('Esa oferta usa un objeto que no se puede copiar.', 'That offer uses an object that cannot be copied.', 'error'); return; }
            tt.ofertas.push(oferta); cambio(); pintar();
        }, 'boton chico'));
        form.append(titulo('Lo que te compra', 'What they buy'));
        (d.compra || []).forEach((c, i) => form.appendChild(filaCompra(c, i)));
        form.append(boton('Agregar compra', 'Add purchase', () => {
            const tt = tienda(); if (!Array.isArray(tt.compra)) tt.compra = [];
            tt.compra.push({ da: ['pan', 4], esm: 1 }); cambio(); pintar();
        }, 'boton chico'));
        if (propia) {
            form.append(titulo('Lo que dice', 'What they say'), nota('Si dejas uno vacío, usa un texto genérico.', 'Leave one empty to use a generic text.'));
            for (const [k, es, en] of TEXTOS_CLAVES) {
                form.appendChild(par(es, en, (d.textos || {})[k] || null, v => {
                    const tt = tienda(); if (!esObj(tt.textos)) tt.textos = {};
                    if (v) tt.textos[k] = v; else delete tt.textos[k];
                    cambio();
                }));
                form.appendChild(avanzado(nota(`${t('Genérico', 'Generic')}: ${TEXTOS_TIENDA[k][ctx.idioma]}`, `Generic: ${TEXTOS_TIENDA[k][ctx.idioma]}`)));
            }
        }
    }

    // ---------- Acciones ----------
    sel.addEventListener('change', () => { actual = sel.value; pintar(); });
    function problemas() {
        for (const [k, tt] of Object.entries(datos.tiendas)) {
            for (const o of tt.ofertas || []) if (!ofertaValida(o)) return `${nombreDePersona(k)}: una oferta tiene un objeto o una cantidad que no vale.`;
            for (const c of tt.compra || []) if (!compraValida(c)) return `${nombreDePersona(k)}: una compra tiene un objeto o una cantidad que no vale.`;
        }
        return '';
    }
    async function guardar() {
        const err = problemas();
        if (err) { rotular('No se guardó: ' + err, 'Not saved: ' + err, 'error'); return; }
        rotular('Guardando…', 'Saving…');
        try {
            const resp = await fetch('../api/datos/tienda', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Estudio': '1', 'If-Match': etag || '*' }, body: JSON.stringify(datos) });
            const j = await resp.json().catch(() => ({}));
            if (resp.ok) { original = clonar(datos); etag = j.etag; rotular(`Guardado (${j.bytes} B).`, `Saved (${j.bytes} B).`, 'ok'); }
            else if (resp.status === 412) rotular('El archivo cambió en disco: recarga el Estudio.', 'The file changed on disk: reload the Studio.', 'error');
            else rotular(`No se guardó (${resp.status}): ${(j.errores || []).slice(0, 2).join(' · ') || j.error || ''}`, `Not saved (${resp.status})`, 'error');
        } catch (e) { rotular('No se pudo hablar con el servidor.', 'Could not reach the server.', 'error'); }
        btnGuardar.disabled = !sucio() || !ctx.servidor.escritura;
        pintarLista();
    }
    btnGuardar.addEventListener('click', guardar);
    $('ti-descartar').addEventListener('click', () => { datos = clonar(original); pintar(); cambio(); });
    $('ti-ir').addEventListener('click', async () => {
        try { await ctx.puente.tp(actual); rotular(`Junto a ${nombreDePersona(actual)} (pestaña Juego).`, `Next to ${nombreDePersona(actual)} (Game tab).`, 'ok'); }
        catch (e) { rotular('Abre la pestaña Juego primero: ' + e.message, 'Open the Game tab first: ' + e.message, 'error'); }
    });
    window.addEventListener('keydown', e => {
        if (ctx.pestana === 'tienda' && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); if (!btnGuardar.disabled) guardar(); }
    });
    const lista = document.createElement('datalist'); lista.id = 'ti-objetos';
    for (const n of NOMBRES) lista.appendChild(Object.assign(document.createElement('option'), { value: n, label: nombreObj(n) }));
    document.body.appendChild(lista);
    ctx.alIdioma.push(() => pintar());
    actual = claves()[0] || null;
    btnGuardar.disabled = true;
    $('ti-descartar').disabled = true;
    pintar();
}
