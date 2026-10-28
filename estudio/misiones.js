// =========================================================
// VENJY · Estudio · pestaña Misiones (Etapa B · B6b, estudio/DISENO.md §42)
// Edita mundo/datos/misiones.json: misiones NUEVAS de cada persona (entregar, eliminar monstruos o sobrevivir una noche),
// que el juego suma al final de las de misiones-datos.js; una persona nueva de personajes.json las tiene en su panel.
// Vista simple: «Nueva misión» partiendo de una parecida, textos ES/EN, qué pide y el premio. Kit, herramienta prestada
// y lo que ya hay en el código, en Avanzado. Avisa si falta algo (el juego ignora una misión incompleta) y si el kit
// vale más de 1/3 del premio. Cada cambio se manda al juego (en vivo con ?estudio); Guardar escribe con If-Match.
// =========================================================
import { MISIONES, NOMBRES_AMIGO } from '../mundo/supervivencia/misiones-datos.js';
import { VAL_ESMERALDA, valor, suma } from '../mundo/supervivencia/tienda-valor.js';
import { esDelCodigo } from '../mundo/datos/personajes.js';
import { TIPOS, MOBS, TEXTOS, idSiguiente, misionNueva, faltaDeMision, avisosMision, limpiarMision } from './misiones-modelo.mjs';
import { instalarDeshacer } from './campo-comun.js';
import { crearCampos, idDe, aNombres } from './campos-datos.js';

const clonar = o => JSON.parse(JSON.stringify(o));
const esObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const calc = { idDe, valor, suma, VAL_ESMERALDA };

export async function montarMisiones(ctx) {
    const $ = id => document.getElementById(id);
    const msg = $('mi-mensaje'), btnGuardar = $('mi-guardar'), sel = $('mi-persona'), form = $('mi-form');
    let etag = null, original = null, datos = null, actual = null, personas = {};
    try {
        const r = await fetch('../mundo/datos/misiones.json', { cache: 'no-cache' });
        etag = r.headers.get('ETag'); original = JSON.parse(await r.text());
    } catch (e) { msg.textContent = 'No se pudo leer mundo/datos/misiones.json'; return; }
    if (!esObj(original.misiones)) original.misiones = {};
    try { personas = (await (await fetch('../mundo/datos/personajes.json', { cache: 'no-cache' })).json()).personas || {}; } catch (e) { personas = {}; }
    datos = clonar(original);
    const sucio = () => JSON.stringify(datos) !== JSON.stringify(original);
    ctx.sucios.misiones = sucio;
    const rotular = (es, en, clase = '') => { msg.textContent = ctx.idioma === 'en' ? en : es; msg.className = 'mensaje' + (clase ? ' ' + clase : ''); };
    const { t, nombreObj, campo, avanzado, titulo, nota, boton, listaPilas, avisos, par } = crearCampos(ctx, rotular);
    const hist = instalarDeshacer(ctx, { pestana: 'misiones', idBoton: 'mi-descartar', leer: () => JSON.stringify(datos), poner: x => { datos = JSON.parse(x); pintar(); cambio(false); } });
    const base = k => Object.prototype.hasOwnProperty.call(NOMBRES_AMIGO, k);
    const nuevas = () => Object.keys(personas).filter(k => !esDelCodigo(k) && !base(k));
    const claves = () => [...Object.keys(NOMBRES_AMIGO), ...nuevas()];
    const nombreDePersona = k => (personas[k] && personas[k].nombre) || NOMBRES_AMIGO[k] || k;
    const delCodigo = k => MISIONES.filter(m => m.amigo === k);
    const delArchivo = k => Object.entries(datos.misiones).filter(([, m]) => m.amigo === k);
    const L = x => (x && (x[ctx.idioma] || x.es)) || '';

    function cambio(anotar = true) {
        btnGuardar.disabled = !sucio() || !ctx.servidor.escritura;
        $('mi-descartar').disabled = !sucio();
        if (anotar) hist.anotar();
        // lo incompleto no se manda al juego (lo ignoraría igual) ni se guarda
        const completas = {};
        for (const [id, m] of Object.entries(datos.misiones)) if (!faltaDeMision(m)) completas[id] = limpiarMision(m);
        ctx.puente.enviarDatos('misiones', { ...datos, misiones: completas });
    }

    // ---------- Pintar ----------
    function pintarLista() {
        sel.textContent = '';
        for (const k of claves()) {
            const o = document.createElement('option'); o.value = k;
            const n = delArchivo(k).length;
            o.textContent = nombreDePersona(k) + (base(k) ? '' : t(' (nueva)', ' (new)')) + (n ? ` · +${n}` : '');
            sel.appendChild(o);
        }
        if (actual) sel.value = actual;
    }
    function resumenCodigo(m) {
        const pilas = l => l.map(([id, n]) => `${n} ${nombreObj(aNombres([[id, n]])[0][0])}`).join(' + ');
        const que = m.tipo === 'entregar' ? t('entregar ', 'hand in ') + pilas(m.pide) : m.tipo === 'matar' ? t(`eliminar ${m.n} ${m.mob === '*' ? 'monstruos' : m.mob}`, `defeat ${m.n} ${m.mob === '*' ? 'monsters' : m.mob}`) : m.tipo === 'visitar' ? t('visitar lugares', 'visit places') : t('sobrevivir la noche', 'survive the night');
        return `${m.id} · ${L(m.titulo)} — ${que}`;
    }
    function kitFila(m, k, i, al) {
        const fila = document.createElement('div'); fila.className = 'pj-lista';
        const una = listaPilas([k], 'Provisión', 'Supply', () => al());
        fila.append(una);
        const prestada = document.createElement('label'); prestada.className = 'casilla-marca';
        const c = document.createElement('input'); c.type = 'checkbox'; c.checked = k.length === 3;
        c.addEventListener('change', () => { if (c.checked) { k[1] = 1; k[2] = m.amigo; } else k.length = 2; al(true); });
        const s = document.createElement('span'); s.textContent = t('Herramienta prestada (media durabilidad, no se puede vender)', 'Borrowed tool (half durability, cannot be sold)');
        prestada.append(c, s);
        fila.append(prestada, boton('Quitar', 'Remove', () => { m.kit.splice(i, 1); al(true); }));
        return avanzado(fila);
    }
    function tarjeta(id, m) {
        const fila = document.createElement('div'); fila.className = 'pj-fila';
        const caja = document.createElement('div');
        const pintarAv = () => { caja.textContent = ''; caja.appendChild(avisos(avisosMision(m, calc))); };
        const al = (rehacer = false) => { cambio(); if (rehacer) pintar(); else pintarAv(); };
        const cab = document.createElement('h4'); cab.className = 'pj-titulo'; cab.textContent = `${id} · ${t(TIPOS.find(x => x[0] === m.tipo)[1], TIPOS.find(x => x[0] === m.tipo)[2])}`;
        fila.append(cab);
        for (const [k, es, en] of TEXTOS) fila.append(par(es, en, m[k], v => { m[k] = v || { es: '', en: '' }; al(); }));
        if (m.tipo === 'entregar') fila.append(listaPilas(m.pide, 'Pide', 'Asks for', al));
        if (m.tipo === 'matar') {
            const mob = document.createElement('select');
            for (const [v, es, en] of MOBS) mob.appendChild(Object.assign(document.createElement('option'), { value: v, textContent: t(es, en) }));
            mob.value = m.mob; mob.addEventListener('change', () => { m.mob = mob.value; al(); });
            const n = document.createElement('input'); n.type = 'number'; n.min = 1; n.max = 99; n.step = 1; n.value = m.n;
            n.addEventListener('change', () => { m.n = Math.min(99, Math.max(1, Math.round(Number(n.value)) || 1)); al(); });
            const dn = document.createElement('label'); dn.className = 'casilla-marca';
            const cn = document.createElement('input'); cn.type = 'checkbox'; cn.checked = !!m.noche;
            cn.addEventListener('change', () => { if (cn.checked) m.noche = true; else delete m.noche; al(); });
            const sn = document.createElement('span'); sn.textContent = t('Solo cuentan de noche', 'Only count at night'); dn.append(cn, sn);
            const par2 = document.createElement('div'); par2.className = 'pj-par'; par2.append(campo('Monstruo', 'Monster', mob), campo('Cuántos', 'How many', n));
            fila.append(par2, dn);
        }
        fila.append(listaPilas(m.premio, 'Premio', 'Reward', al));
        if (!Array.isArray(m.kit)) m.kit = [];
        m.kit.forEach((k, i) => fila.append(kitFila(m, k, i, al)));
        fila.append(avanzado(boton('Agregar al kit', 'Add to kit', () => { m.kit.push(['pan', 2]); al(true); })));
        fila.append(boton('Borrar misión', 'Delete quest', () => { delete datos.misiones[id]; cambio(); pintar(); }), caja);
        pintarAv();
        return fila;
    }
    function pintar() {
        pintarLista();
        form.textContent = '';
        $('mi-ir').disabled = !actual;
        if (!actual) { form.appendChild(nota('Elige a alguien.', 'Pick someone.')); return; }
        const cod = delCodigo(actual);
        form.append(nota(base(actual) ? `${nombreDePersona(actual)} tiene ${cod.length} misiones en el juego; las nuevas van después.` : `${nombreDePersona(actual)} todavía no tiene misiones: crea una y aparecerá en su panel.`,
            base(actual) ? `${nombreDePersona(actual)} has ${cod.length} quests in the game; new ones come after.` : `${nombreDePersona(actual)} has no quests yet: create one and it shows in their panel.`));
        if (cod.length) {
            const ul = document.createElement('div'); ul.className = 'pj-lista';
            for (const m of cod) ul.appendChild(Object.assign(document.createElement('p'), { className: 'pj-nota', textContent: resumenCodigo(m) }));
            form.append(avanzado(titulo('Ya están en el juego (no se cambian aquí)', 'Already in the game (not changed here)')), avanzado(ul));
        }
        form.append(titulo('Misiones nuevas', 'New quests'));
        for (const [id, m] of delArchivo(actual)) form.appendChild(tarjeta(id, m));
    }

    // ---------- Acciones ----------
    const selTipo = $('mi-tipo'), selBase = $('mi-base');
    function pintarBases() {
        selTipo.textContent = '';
        for (const [v, es, en] of TIPOS) selTipo.appendChild(Object.assign(document.createElement('option'), { value: v, textContent: t(es, en) }));
        pintarOpcionesBase();
    }
    function pintarOpcionesBase() {
        selBase.textContent = '';
        selBase.appendChild(Object.assign(document.createElement('option'), { value: '', textContent: t('Una misión vacía', 'An empty quest') }));
        for (const m of MISIONES.filter(x => x.tipo === selTipo.value)) selBase.appendChild(Object.assign(document.createElement('option'), { value: m.id, textContent: `${NOMBRES_AMIGO[m.amigo] || m.amigo}: ${L(m.titulo)}` }));
    }
    selTipo.addEventListener('change', pintarOpcionesBase);
    $('mi-nueva').addEventListener('click', () => {
        if (!actual) return;
        const usados = [...MISIONES.map(m => m.id), ...Object.keys(datos.misiones)];
        const id = idSiguiente(actual, usados);
        const b = MISIONES.find(m => m.id === selBase.value);
        const m = misionNueva(selTipo.value, actual);
        if (b) {
            if (b.pide) m.pide = aNombres(b.pide);
            if (b.mob) { m.mob = b.mob; m.n = b.n; if (b.noche) m.noche = true; }
            m.premio = aNombres(b.premio);
        }
        datos.misiones[id] = m;
        rotular(`${id} creada: escribe sus textos en español e inglés para que el juego la use.`, `${id} created: write its Spanish and English texts so the game uses it.`, 'ok');
        cambio(); pintar();
    });
    sel.addEventListener('change', () => { actual = sel.value; pintar(); });
    function problemas() {
        for (const [id, m] of Object.entries(datos.misiones)) { const f = faltaDeMision(m); if (f) return `${id}: ${f[ctx.idioma === 'en' ? 1 : 0]}`; }
        return '';
    }
    async function guardar() {
        const err = problemas();
        if (err) { rotular('No se guardó: ' + err, 'Not saved: ' + err, 'error'); return; }
        const salida = { ...datos, misiones: {} };
        for (const [id, m] of Object.entries(datos.misiones)) salida.misiones[id] = limpiarMision(m);
        rotular('Guardando…', 'Saving…');
        try {
            const resp = await fetch('../api/datos/misiones', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Estudio': '1', 'If-Match': etag || '*' }, body: JSON.stringify(salida) });
            const j = await resp.json().catch(() => ({}));
            if (resp.ok) { datos = clonar(salida); original = clonar(salida); etag = j.etag; rotular(`Guardado (${j.bytes} B).`, `Saved (${j.bytes} B).`, 'ok'); pintar(); }
            else if (resp.status === 412) rotular('El archivo cambió en disco: recarga el Estudio.', 'The file changed on disk: reload the Studio.', 'error');
            else rotular(`No se guardó (${resp.status}): ${(j.errores || []).slice(0, 2).join(' · ') || j.error || ''}`, `Not saved (${resp.status})`, 'error');
        } catch (e) { rotular('No se pudo hablar con el servidor.', 'Could not reach the server.', 'error'); }
        btnGuardar.disabled = !sucio() || !ctx.servidor.escritura;
    }
    btnGuardar.addEventListener('click', guardar);
    $('mi-descartar').addEventListener('click', () => { datos = clonar(original); pintar(); cambio(); });
    $('mi-ir').addEventListener('click', async () => {
        try { await ctx.puente.tp(actual); rotular(`Junto a ${nombreDePersona(actual)} (pestaña Juego).`, `Next to ${nombreDePersona(actual)} (Game tab).`, 'ok'); }
        catch (e) { rotular('Abre la pestaña Juego primero: ' + e.message, 'Open the Game tab first: ' + e.message, 'error'); }
    });
    window.addEventListener('keydown', e => {
        if (ctx.pestana === 'misiones' && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); if (!btnGuardar.disabled) guardar(); }
    });
    ctx.alIdioma.push(() => { pintarBases(); pintar(); });
    actual = claves()[0] || null;
    btnGuardar.disabled = true;
    $('mi-descartar').disabled = true;
    pintarBases();
    pintar();
}
