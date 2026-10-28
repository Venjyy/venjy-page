// =========================================================
// VENJY · Estudio · pestaña Recetas (Etapa B · B6c, estudio/DISENO.md §42)
// Edita mundo/datos/recetas.json: recetas de fabricación nuevas (en una rejilla de 3×3 como la mesa de crafteo, o sin forma)
// y fundiciones del horno nuevas; el juego las suma después de las de recetas.js. Vista simple: «Partir de» una receta que ya
// existe, casillas con un objeto cada una (la misma casilla repetida es el mismo objeto) y qué se fabrica. Varios objetos
// que sirven en una casilla (separados por coma, como los troncos) y la fundición, en Avanzado. Avisa si falta algo o si ya hay
// una igual en el juego. Cada cambio se manda al juego (en vivo con ?estudio); Guardar escribe con If-Match.
// =========================================================
import { RECETAS, FUNDICION, buscarReceta } from '../mundo/supervivencia/recetas.js';
import { nombreDe } from '../mundo/supervivencia/objetos.js';
import { instalarDeshacer } from './campo-comun.js';
import { crearCampos, NOMBRES, idDe, nombreDeId } from './campos-datos.js';
import { parseCelda, textoCelda, formaAGrid, gridAForma, recetaNueva, faltaDeReceta, avisosReceta, limpiarReceta } from './recetas-modelo.mjs';

const clonar = o => JSON.parse(JSON.stringify(o));
const esObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);

export async function montarRecetas(ctx) {
    const $ = id => document.getElementById(id);
    const msg = $('re-mensaje'), btnGuardar = $('re-guardar'), form = $('re-form');
    let etag = null, original = null, datos = null;
    try {
        const r = await fetch('../mundo/datos/recetas.json', { cache: 'no-cache' });
        etag = r.headers.get('ETag'); original = JSON.parse(await r.text());
    } catch (e) { msg.textContent = 'No se pudo leer mundo/datos/recetas.json'; return; }
    if (!Array.isArray(original.recetas)) original.recetas = [];
    if (!esObj(original.fundicion)) original.fundicion = {};
    datos = clonar(original);
    const sucio = () => JSON.stringify(datos) !== JSON.stringify(original);
    ctx.sucios.recetas = sucio;
    const rotular = (es, en, clase = '') => { msg.textContent = ctx.idioma === 'en' ? en : es; msg.className = 'mensaje' + (clase ? ' ' + clase : ''); };
    const { t, nombreObj, campo, avanzado, titulo, nota, boton, avisos, entradaObjeto, entradaCantidad } = crearCampos(ctx, rotular);
    const hist = instalarDeshacer(ctx, { pestana: 'recetas', idBoton: 're-descartar', leer: () => JSON.stringify(datos), poner: x => { datos = JSON.parse(x); pintar(); cambio(false); } });
    const calc = { idDe, buscar: (rej, ancho) => buscarReceta(rej, ancho), nombreDe: id => nombreDe(id, ctx.idioma) };

    function cambio(anotar = true) {
        btnGuardar.disabled = !sucio() || !ctx.servidor.escritura;
        $('re-descartar').disabled = !sucio();
        if (anotar) hist.anotar();
        // lo incompleto no se manda al juego (lo ignoraría igual) ni se guarda
        ctx.puente.enviarDatos('recetas', { ...datos, recetas: datos.recetas.filter(r => !faltaDeReceta(r)).map(limpiarReceta) });
    }

    // Casilla: uno o varios nombres (coma); un nombre que no existe vuelve a lo de antes
    function celda(valorIni, al, rotuloEs = 'Objeto', rotuloEn = 'Object') {
        const i = document.createElement('input'); i.type = 'text'; i.setAttribute('list', 'ti-objetos'); i.value = textoCelda(valorIni); i.autocomplete = 'off'; i.maxLength = 120;
        i.addEventListener('change', () => {
            const v = parseCelda(i.value);
            if ([].concat(v).filter(Boolean).every(n => NOMBRES.includes(n))) al(v);
            else { i.value = textoCelda(valorIni); rotular('Ese objeto no existe: escribe su nombre y elige de la lista.', 'That object does not exist: type its name and pick from the list.', 'error'); }
        });
        const l = document.createElement('label'); l.className = 'campo'; l.title = t(rotuloEs, rotuloEn); l.append(i);
        return l;
    }
    function tarjeta(r, i) {
        const fila = document.createElement('div'); fila.className = 'pj-fila';
        const caja = document.createElement('div');
        const pintarAv = () => { caja.textContent = ''; caja.appendChild(avisos(avisosReceta(r, calc))); };
        const al = (rehacer = false) => { cambio(); if (rehacer) pintar(); else pintarAv(); };
        fila.append(Object.assign(document.createElement('h4'), { className: 'pj-titulo', textContent: `${t('Receta', 'Recipe')} ${i + 1} · ${r.forma !== undefined ? t('con forma', 'shaped') : t('sin forma', 'shapeless')}` }));
        if (r.forma !== undefined) {
            const g = formaAGrid(r);
            const rej = document.createElement('div'); rej.className = 'pj-grupo';
            g.forEach((c, k) => rej.appendChild(celda(c, v => { g[k] = v; const f = gridAForma(g); if (f) { r.forma = f.forma; r.ingredientes = f.ingredientes; } else { r.forma = []; r.ingredientes = {}; } al(); }, `Casilla ${k + 1}`, `Cell ${k + 1}`)));
            fila.append(nota('Las casillas con el mismo objeto cuentan como el mismo ingrediente. La receta se puede mover y espejar en la mesa.', 'Cells with the same object count as the same ingredient. The recipe can be moved and mirrored on the table.'), rej);
            fila.append(avanzado(nota('Varios objetos en una casilla (sirve cualquiera): sepáralos con coma, como «tronco, tronco_pino».', 'Several objects in a cell (any works): separate them with a comma, like «tronco, tronco_pino».')));
        } else {
            const lista = document.createElement('div'); lista.className = 'pj-grupo';
            r.sin.forEach((c, k) => {
                const caja2 = document.createElement('div'); caja2.className = 'pj-lista';
                caja2.append(celda(c, v => { r.sin[k] = v; al(); }, `Objeto ${k + 1}`, `Object ${k + 1}`));
                if (r.sin.length > 1) caja2.append(boton('Quitar', 'Remove', () => { r.sin.splice(k, 1); al(true); }));
                lista.appendChild(caja2);
            });
            fila.append(nota('Se juntan en cualquier casilla de la rejilla.', 'They are combined in any cell of the grid.'), lista);
            if (r.sin.length < 9) fila.append(boton('Agregar objeto', 'Add object', () => { r.sin.push('pan'); al(true); }));
        }
        const dobl = document.createElement('div'); dobl.className = 'pj-par';
        dobl.append(campo('Fabrica', 'Makes', entradaObjeto(r.da[0], v => { r.da[0] = v; al(); })), campo('Cantidad', 'Amount', entradaCantidad(r.da[1], n => { r.da[1] = n; al(); })));
        fila.append(dobl, boton('Borrar receta', 'Delete recipe', () => { datos.recetas.splice(i, 1); cambio(); pintar(); }), caja);
        pintarAv();
        return fila;
    }
    function pintarFundicion() {
        const f = [titulo('Horno: fundiciones nuevas', 'Furnace: new smelting')];
        Object.entries(datos.fundicion).forEach(([a, b]) => {
            const fila = document.createElement('div'); fila.className = 'pj-fila';
            const dobl = document.createElement('div'); dobl.className = 'pj-par';
            dobl.append(campo('Entra', 'Goes in', (entradaObjeto(a, v => {
                if (v !== a && datos.fundicion[v] !== undefined) { rotular('Ese objeto ya tiene fundición.', 'That object already has smelting.', 'error'); pintar(); return; }
                const nuevo = {}; for (const [k, x] of Object.entries(datos.fundicion)) nuevo[k === a ? v : k] = x; datos.fundicion = nuevo; cambio(); pintar();
            }))), campo('Sale', 'Comes out', entradaObjeto(b, v => { datos.fundicion[a] = v; cambio(); pintar(); })));
            fila.append(dobl, boton('Borrar', 'Delete', () => { delete datos.fundicion[a]; cambio(); pintar(); }));
            const ia = idDe(a);
            const av = ia !== undefined && FUNDICION.has(ia) ? [['El juego ya funde eso: no se cambia.', 'The game already smelts that: it is not changed.']] : [];
            if (av.length) fila.append(avisos(av));
            f.push(fila);
        });
        f.push(boton('Agregar fundición', 'Add smelting', () => {
            const libre = NOMBRES.find(n => !(n in datos.fundicion) && !FUNDICION.has(idDe(n)));
            datos.fundicion[libre] = 'pan'; cambio(); pintar();
        }));
        return f;
    }
    function pintar() {
        form.textContent = '';
        form.append(nota(`El juego tiene ${RECETAS.length} recetas y ${FUNDICION.size} fundiciones; las nuevas van después y, si calzan igual, gana la primera.`, `The game has ${RECETAS.length} recipes and ${FUNDICION.size} smelting entries; new ones come after and, if they match equally, the first wins.`));
        form.append(titulo('Recetas nuevas', 'New recipes'));
        datos.recetas.forEach((r, i) => form.appendChild(tarjeta(r, i)));
        const bloque = document.createElement('div'); bloque.className = 'solo-avanzado pj-form';
        bloque.append(...pintarFundicion());
        form.append(bloque);
    }

    // ---------- Acciones ----------
    const selTipo = $('re-tipo'), selBase = $('re-base');
    const nombresDe = p => (Array.isArray(p) ? p.map(nombreDeId) : nombreDeId(p));
    const etiqueta = r => `${nombreDe(r.da[0], ctx.idioma)} ×${r.da[1]}`;
    function pintarBases() {
        selTipo.textContent = '';
        for (const [v, es, en] of [['forma', 'Con forma (rejilla)', 'Shaped (grid)'], ['sin', 'Sin forma', 'Shapeless']]) selTipo.appendChild(Object.assign(document.createElement('option'), { value: v, textContent: t(es, en) }));
        selBase.textContent = '';
        selBase.appendChild(Object.assign(document.createElement('option'), { value: '', textContent: t('Una receta vacía', 'An empty recipe') }));
        RECETAS.forEach((r, i) => selBase.appendChild(Object.assign(document.createElement('option'), { value: String(i), textContent: `${etiqueta(r)} · ${r.forma ? t('con forma', 'shaped') : t('sin forma', 'shapeless')}` })));
    }
    $('re-nueva').addEventListener('click', () => {
        const b = selBase.value === '' ? null : RECETAS[Number(selBase.value)];
        let r;
        if (!b) r = recetaNueva(selTipo.value);
        else if (b.forma) { r = { forma: b.forma.slice(), ingredientes: {}, da: [nombreDeId(b.da[0]), b.da[1]] }; for (const [ch, p] of Object.entries(b.clave)) r.ingredientes[ch] = nombresDe(p); }
        else r = { sin: b.sin.map(nombresDe), da: [nombreDeId(b.da[0]), b.da[1]] };
        datos.recetas.push(r);
        rotular('Receta agregada: cambia lo que fabrica o los ingredientes para que no sea igual a la que copiaste.', 'Recipe added: change what it makes or the ingredients so it is not the same as the one you copied.', 'ok');
        cambio(); pintar();
    });
    async function guardar() {
        for (const [i, r] of datos.recetas.entries()) { const f = faltaDeReceta(r); if (f) { const m = `${t('Receta', 'Recipe')} ${i + 1}: ${f[ctx.idioma === 'en' ? 1 : 0]}`; rotular('No se guardó: ' + m, 'Not saved: ' + m, 'error'); return; } }
        const salida = { ...datos, recetas: datos.recetas.map(limpiarReceta) };
        rotular('Guardando…', 'Saving…');
        try {
            const resp = await fetch('../api/datos/recetas', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Estudio': '1', 'If-Match': etag || '*' }, body: JSON.stringify(salida) });
            const j = await resp.json().catch(() => ({}));
            if (resp.ok) { datos = clonar(salida); original = clonar(salida); etag = j.etag; rotular(`Guardado (${j.bytes} B).`, `Saved (${j.bytes} B).`, 'ok'); pintar(); }
            else if (resp.status === 412) rotular('El archivo cambió en disco: recarga el Estudio.', 'The file changed on disk: reload the Studio.', 'error');
            else rotular(`No se guardó (${resp.status}): ${(j.errores || []).slice(0, 2).join(' · ') || j.error || ''}`, `Not saved (${resp.status})`, 'error');
        } catch (e) { rotular('No se pudo hablar con el servidor.', 'Could not reach the server.', 'error'); }
        btnGuardar.disabled = !sucio() || !ctx.servidor.escritura;
    }
    btnGuardar.addEventListener('click', guardar);
    $('re-descartar').addEventListener('click', () => { datos = clonar(original); pintar(); cambio(); });
    window.addEventListener('keydown', e => {
        if (ctx.pestana === 'recetas' && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); if (!btnGuardar.disabled) guardar(); }
    });
    ctx.alIdioma.push(() => { pintarBases(); pintar(); });
    btnGuardar.disabled = true;
    $('re-descartar').disabled = true;
    pintarBases();
    pintar();
}
