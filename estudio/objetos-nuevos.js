// =========================================================
// VENJY · Estudio · pestaña Objetos nuevos (Etapa B · B6d, estudio/DISENO.md §42)
// Edita mundo/datos/objetos.json: objetos nuevos del inventario. Vista simple: «Partir de» un objeto parecido (copia su
// ícono, si se come y cuántos caben), el nombre en español e inglés, «Se ve como» con la vista del ícono, «¿Se come?» y
// cuánto llena (la saturación se calcula sola). En Avanzado: saturación, efecto, qué devuelve, combustible, «no se vende»,
// y el nombre interno y el número (fijos una vez guardado: el número viaja en las partidas guardadas y no se reusa).
// Cada cambio se aplica en el Estudio (Tienda, Misiones y Recetas ya lo pueden usar) y en el juego (en vivo con ?estudio);
// Guardar escribe con If-Match. El ícono propio se dibuja en Píxeles con la misma clave.
// =========================================================
import { O, OBJETOS, EFECTOS, fijarObjetos, objetoDeDatos, nombreDe } from '../mundo/supervivencia/objetos.js';
import { B } from '../mundo/texturas.js';
import { pixelesObjeto, refrescarObjetos } from '../mundo/supervivencia/iconos.js';
import { instalarDeshacer } from './campo-comun.js';
import { crearCampos, refrescarNombres } from './campos-datos.js';
import { claveLibre, iconosBase, valorIcono, ponerIcono, saturacionDe, objetoNuevo, faltaDeObjeto, avisosObjeto, limpiarObjeto } from './objetos-nuevos-modelo.mjs';

const clonar = o => JSON.parse(JSON.stringify(o));
const esObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const EFECTO_TXT = { hambre: ['Da hambre', 'Causes hunger'], hambre30: ['A veces da hambre', 'Sometimes causes hunger'], veneno: ['Envenena', 'Poisons'], leche: ['Quita veneno y hambre (como la leche)', 'Cures poison and hunger (like milk)'] };

export async function montarObjetosNuevos(ctx) {
    const $ = id => document.getElementById(id);
    const msg = $('on-mensaje'), btnGuardar = $('on-guardar'), form = $('on-form');
    let etag = null, original = null, datos = null;
    try {
        const r = await fetch('../mundo/datos/objetos.json', { cache: 'no-cache' });
        etag = r.headers.get('ETag'); original = JSON.parse(await r.text());
    } catch (e) { msg.textContent = 'No se pudo leer mundo/datos/objetos.json'; return; }
    if (!esObj(original.objetos)) original.objetos = {};
    datos = clonar(original);
    const sucio = () => JSON.stringify(datos) !== JSON.stringify(original);
    ctx.sucios.nuevos = sucio;
    const rotular = (es, en, clase = '') => { msg.textContent = ctx.idioma === 'en' ? en : es; msg.className = 'mensaje' + (clase ? ' ' + clase : ''); };
    const { t, campo, avanzado, titulo, nota, boton, avisos } = crearCampos(ctx, rotular);
    const hist = instalarDeshacer(ctx, { pestana: 'nuevos', idBoton: 'on-descartar', leer: () => JSON.stringify(datos), poner: x => { datos = JSON.parse(x); pintar(); cambio(false); } });

    // Los del código: los de OBJETOS que no vienen del archivo (objetos.js ya cargó objetos.json al importarse)
    const delCodigo = () => OBJETOS.filter(o => o && !o.datos);
    const ocupada = k => { const K = String(k).toUpperCase(); return B[K] !== undefined || (O[K] !== undefined && !OBJETOS[O[K]].datos); };
    const ICONOS = iconosBase(delCodigo());
    const iconosCodigo = new Set(ICONOS.map(i => i.icono));
    let dibujos = new Set();
    try { const r = await fetch('../mundo/datos/iconos.json', { cache: 'no-cache' }); dibujos = new Set(Object.keys((await r.json()).iconos || {})); } catch (e) { /* sin dibujos propios */ }
    const calc = { ocupada, aceptar: objetoDeDatos, tieneIcono: o => iconosCodigo.has(o.icono), tieneDibujo: k => dibujos.has(k) };
    const completos = () => { const s = { ...datos, objetos: {} }; for (const [k, o] of Object.entries(datos.objetos)) if (!faltaDeObjeto(k, o, datos, calc)) s.objetos[k] = limpiarObjeto(o); return s; };

    function cambio(anotar = true) {
        btnGuardar.disabled = !sucio() || !ctx.servidor.escritura;
        $('on-descartar').disabled = !sucio();
        if (anotar) hist.anotar();
        // lo incompleto no entra (el juego lo ignoraría igual): en el Estudio (Tienda, Misiones, Recetas) y en el juego
        const s = completos();
        fijarObjetos(s);
        refrescarNombres(ctx.idioma);
        refrescarObjetos();
        ctx.puente.enviarDatos('objetos', s);
    }

    function vistaIcono(o) {
        const c = document.createElement('canvas'); c.width = 16; c.height = 16; c.className = 'on-icono';
        const g = c.getContext('2d');
        if (OBJETOS[o.id] && OBJETOS[o.id].datos) pixelesObjeto(o.id).forEach((col, i) => { if (col) { g.fillStyle = `rgb(${col[0]},${col[1]},${col[2]})`; g.fillRect(i % 16, Math.floor(i / 16), 1, 1); } });
        return c;
    }
    const numero = (valor, min, max, paso, al) => {
        const i = document.createElement('input'); i.type = 'number'; i.min = min; i.max = max; i.step = paso; i.value = valor;
        i.addEventListener('change', () => { const n = Number(i.value); if (Number.isFinite(n)) al(Math.min(max, Math.max(min, n))); });
        return i;
    };
    const lista = (opciones, valor, al) => {
        const s = document.createElement('select');
        for (const [v, txt] of opciones) s.appendChild(Object.assign(document.createElement('option'), { value: v, textContent: txt, selected: v === valor }));
        s.addEventListener('change', () => al(s.value));
        return s;
    };
    const casilla = (es, en, valor, al) => {
        const l = document.createElement('label'); l.className = 'casilla-marca';
        const i = document.createElement('input'); i.type = 'checkbox'; i.checked = !!valor;
        i.addEventListener('change', () => al(i.checked));
        l.append(i, Object.assign(document.createElement('span'), { textContent: t(es, en) }));
        return l;
    };

    function tarjeta(clave, o) {
        const guardado = !!original.objetos[clave];
        const fila = document.createElement('div'); fila.className = 'pj-fila';
        const caja = document.createElement('div');
        const pintarAv = () => { caja.textContent = ''; caja.appendChild(avisos(avisosObjeto(clave, o, datos, calc))); };
        const al = (rehacer = false) => { cambio(); if (rehacer) pintar(); else pintarAv(); };
        const cab = document.createElement('div'); cab.className = 'on-cabeza';
        cab.append(vistaIcono(o), Object.assign(document.createElement('h4'), { className: 'pj-titulo', textContent: o.nombre[ctx.idioma] || o.nombre.es || t('Objeto sin nombre', 'Unnamed object') }));
        fila.append(cab);

        // Nombre: mientras no se guarda, el nombre interno sale del español (después queda fijo)
        const nom = document.createElement('div'); nom.className = 'pj-par';
        for (const [l, k] of [['ES', 'es'], ['EN', 'en']]) {
            const i = document.createElement('input'); i.type = 'text'; i.maxLength = 40; i.value = o.nombre[k] || '';
            i.addEventListener('change', () => {
                o.nombre[k] = i.value.trim();
                if (k === 'es' && !guardado && o.nombre.es) {
                    const nueva = claveLibre(o.nombre.es, { objetos: Object.fromEntries(Object.entries(datos.objetos).filter(([x]) => x !== clave)) }, ocupada);
                    if (nueva !== clave) { const nuevo = {}; for (const [x, v] of Object.entries(datos.objetos)) nuevo[x === clave ? nueva : x] = v; datos.objetos = nuevo; }
                }
                al(true);
            });
            nom.appendChild(campo(`Nombre (${l})`, `Name (${l})`, i));
        }
        fila.append(nom);

        const simple = document.createElement('div'); simple.className = 'pj-grupo';
        simple.append(campo('Se ve como', 'Looks like', lista(ICONOS.map(i => [i.valor, i.ejemplo[ctx.idioma] || i.ejemplo.es]), valorIcono(o), v => { ponerIcono(o, v); al(true); })));
        simple.append(campo('Cuántos caben en una casilla', 'How many fit in a slot', lista([['64', '64'], ['16', '16'], ['1', t('1 (no se apila)', '1 (does not stack)')]], String(o.apila || 64), v => { o.apila = Number(v); al(); })));
        simple.append(casilla('Se come', 'Edible', !!o.comida, v => { if (v) o.comida = [4, saturacionDe(4)]; else { delete o.comida; delete o.efecto; } al(true); }));
        if (o.comida) simple.append(campo('Cuánto llena (el pan, 5)', 'How filling (bread, 5)', numero(o.comida[0], 1, 20, 1, n => { o.comida = [n, saturacionDe(n)]; al(true); })));
        fila.append(simple);
        if (!dibujos.has(clave)) fila.append(nota('¿Quieres un dibujo propio? Guarda y píntalo en la pestaña Píxeles (ícono de este objeto).', 'Want your own drawing? Save and paint it in the Pixels tab (this object\'s icon).'));

        const av = document.createElement('div'); av.className = 'pj-grupo solo-avanzado';
        if (o.comida) {
            av.append(campo('Saturación (cuánto dura lleno)', 'Saturation (how long it lasts)', numero(o.comida[1], 0, 20, 0.1, n => { o.comida = [o.comida[0], n]; al(); })));
            av.append(campo('Al comerlo', 'When eaten', lista([['', t('Nada más', 'Nothing else')], ...EFECTOS.map(e => [e, t(...EFECTO_TXT[e])])], o.efecto || '', v => { if (v) o.efecto = v; else delete o.efecto; al(); })));
        }
        const dev = document.createElement('input'); dev.type = 'text'; dev.setAttribute('list', 'ti-objetos'); dev.value = o.devuelve || ''; dev.autocomplete = 'off'; dev.maxLength = 40;
        dev.addEventListener('change', () => {
            const v = dev.value.trim().toLowerCase().replace(/\s+/g, '_');
            if (!v) delete o.devuelve;
            else if (ocupada(v) || datos.objetos[v]) o.devuelve = v;
            else { dev.value = o.devuelve || ''; rotular('Ese objeto no existe: escribe su nombre y elige de la lista.', 'That object does not exist: type its name and pick from the list.', 'error'); return; }
            al();
        });
        av.append(campo('Deja en la mano al usarlo (cubo, botella…)', 'Leaves in hand when used (bucket, bottle…)', dev));
        av.append(campo('Fuego en el horno (segundos)', 'Furnace fuel (seconds)', numero(o.combustible || 0, 0, 1000, 1, n => { if (n) o.combustible = n; else delete o.combustible; al(); })));
        av.append(casilla('No se vende en las tiendas', 'Not sold in shops', o.encargo, v => { if (v) o.encargo = true; else delete o.encargo; al(); }));
        fila.append(av);
        fila.append(avanzado(nota(`Nombre interno «${clave}» (el de /dar, recetas, tienda y misiones) · número ${o.id}${guardado ? '' : t(' · el nombre interno sale del nombre en español hasta que guardes', ' · the internal name comes from the Spanish name until you save')}.`, `Internal name «${clave}» (used by /give, recipes, shop and quests) · number ${o.id}${guardado ? '' : ' · the internal name comes from the Spanish name until you save'}.`)));
        fila.append(boton('Borrar objeto', 'Delete object', () => {
            if (guardado && !confirm(t('¿Borrar este objeto? Si alguien lo tiene en una partida se verá como «?» (y vuelve si lo creas de nuevo con el mismo número). Las recetas, ofertas y misiones que lo usan dejarán de funcionar.', 'Delete this object? Anyone who has it in a save will see «?» (it comes back if you recreate it with the same number). Recipes, offers and quests that use it will stop working.'))) return;
            delete datos.objetos[clave]; cambio(); pintar();
        }), caja);
        pintarAv();
        return fila;
    }
    function pintar() {
        form.textContent = '';
        form.append(nota(`El juego tiene ${delCodigo().length} objetos en el código. Los nuevos se usan en Recetas, Tienda y Misiones con su nombre interno, y con /dar.`, `The game has ${delCodigo().length} objects in code. New ones are used in Recipes, Shop and Quests by their internal name, and with /give.`));
        form.append(titulo('Objetos nuevos', 'New objects'));
        const e = Object.entries(datos.objetos);
        if (!e.length) form.append(nota('Todavía no hay: elige uno parecido en «Partir de» y toca «Agregar objeto».', 'None yet: pick a similar one in «Start from» and press «Add object».'));
        for (const [k, o] of e) form.appendChild(tarjeta(k, o));
    }

    // ---------- Acciones ----------
    const selBase = $('on-base');
    function pintarBases() {
        selBase.textContent = '';
        selBase.appendChild(Object.assign(document.createElement('option'), { value: '', textContent: t('Un objeto vacío', 'An empty object') }));
        const grupo = (es, en, lista) => {
            const g = document.createElement('optgroup'); g.label = t(es, en);
            for (const o of lista) g.appendChild(Object.assign(document.createElement('option'), { value: String(o.id), textContent: nombreDe(o.id, ctx.idioma) }));
            selBase.appendChild(g);
        };
        const cod = delCodigo().filter(o => !o.herramienta && !o.armadura).sort((a, b) => nombreDe(a.id, ctx.idioma).localeCompare(nombreDe(b.id, ctx.idioma)));
        grupo('Comida', 'Food', cod.filter(o => o.comida));
        grupo('Materiales y otros', 'Materials and others', cod.filter(o => !o.comida));
    }
    $('on-nuevo').addEventListener('click', () => {
        const base = selBase.value === '' ? null : OBJETOS[Number(selBase.value)];
        const o = objetoNuevo(datos, base, { es: '', en: '' });
        datos.objetos[claveLibre('nuevo', datos, ocupada)] = o;
        rotular('Objeto agregado: ponle nombre en español e inglés.', 'Object added: give it a Spanish and English name.', 'ok');
        cambio(); pintar();
    });
    async function guardar() {
        for (const [k, o] of Object.entries(datos.objetos)) { const f = faltaDeObjeto(k, o, datos, calc); if (f) { const m = `${o.nombre.es || k}: ${f[ctx.idioma === 'en' ? 1 : 0]}`; rotular('No se guardó: ' + m, 'Not saved: ' + m, 'error'); return; } }
        const salida = { ...datos, objetos: Object.fromEntries(Object.entries(datos.objetos).map(([k, o]) => [k, limpiarObjeto(o)])) };
        rotular('Guardando…', 'Saving…');
        try {
            const resp = await fetch('../api/datos/objetos', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Estudio': '1', 'If-Match': etag || '*' }, body: JSON.stringify(salida) });
            const j = await resp.json().catch(() => ({}));
            if (resp.ok) { datos = clonar(salida); original = clonar(salida); etag = j.etag; rotular(`Guardado (${j.bytes} B).`, `Saved (${j.bytes} B).`, 'ok'); pintar(); }
            else if (resp.status === 412) rotular('El archivo cambió en disco: recarga el Estudio.', 'The file changed on disk: reload the Studio.', 'error');
            else rotular(`No se guardó (${resp.status}): ${(j.errores || []).slice(0, 2).join(' · ') || j.error || ''}`, `Not saved (${resp.status})`, 'error');
        } catch (e) { rotular('No se pudo hablar con el servidor.', 'Could not reach the server.', 'error'); }
        btnGuardar.disabled = !sucio() || !ctx.servidor.escritura;
    }
    btnGuardar.addEventListener('click', guardar);
    $('on-descartar').addEventListener('click', () => { datos = clonar(original); pintar(); cambio(); });
    window.addEventListener('keydown', e => {
        if (ctx.pestana === 'nuevos' && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); if (!btnGuardar.disabled) guardar(); }
    });
    ctx.alIdioma.push(() => { pintarBases(); pintar(); });
    btnGuardar.disabled = true;
    $('on-descartar').disabled = true;
    pintarBases();
    pintar();
}
