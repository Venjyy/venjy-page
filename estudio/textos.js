// =========================================================
// VENJY · Estudio · editor de textos ES/EN (fase 3)
// Edita mundo/datos/dialogos.json (temas, opiniones, saludos y regalos de «Hablar»): tabla filtrable por persona
// y tipo, ES y EN lado a lado, marca «revisado» (el dueño aprueba los textos de personas reales), largo,
// avisos (emoji, glifos de PixelCraft, par incompleto, plantilla {n}) y vista en un globo real del juego
// por el puente. Guarda con PUT /api/datos/dialogos. Contrato: estudio/DISENO.md §6 y §11.
// =========================================================
import { formatear } from './formato.mjs';
import { avisosDeTexto, esPar, LARGO_GLOBO } from './avisos-textos.js';

const NOMBRES = {
    venjy: 'Venjy', pony: 'Pony', boris: 'Boris', moises: 'Moisés', lalo: 'Lalo', salonas: 'Salonas', lona: 'Lona',
    hadad: 'Hadad', andy: 'Andy', nacho: 'Nacho', braulio: 'Braulio', lucho: 'Lucho', conejeros: 'Conejeros'
};
const nombreDe = c => NOMBRES[c] || c;
const NIVELES = ['Desconocido', 'Conocido', 'Amigo', 'Buen amigo', 'Íntimo'];
const sinTildes = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const clonar = o => JSON.parse(JSON.stringify(o));
const TIPOS = [['', 'Todos', 'All'], ['tema', 'Preguntas y respuestas', 'Questions and answers'], ['opinion', 'Opiniones', 'Opinions'],
    ['saludo', 'Saludos', 'Greetings'], ['regalo', 'Regalos', 'Gifts']];

export async function montarTextos(ctx) {
    const $ = id => document.getElementById(id);
    const lista = $('tx-lista'), mensaje = $('tx-mensaje'), btnGuardar = $('tx-guardar');
    const t = (es, en) => (ctx.idioma === 'en' ? en : es);

    let original = null, datos = null, etag = null, glifos = null;
    let filas = [], elegida = null;
    const historial = [];
    let ultimo = '', ultimaEdicion = 0, reloj = 0;

    // ---------- Carga ----------
    try {
        const rg = await fetch(new URL('./glifos.json', import.meta.url), { cache: 'no-cache' });
        if (rg.ok) glifos = (await rg.json()).rangos;
    } catch (e) { glifos = null; }
    const r = await fetch('../mundo/datos/dialogos.json', { cache: 'no-cache' });
    etag = r.headers.get('ETag');
    original = JSON.parse(await r.text());
    datos = clonar(original);
    ultimo = JSON.stringify(datos);

    const sucio = () => JSON.stringify(datos) !== JSON.stringify(original);

    // ---------- Filas: un par ES/EN por fila, en el orden de DIALOGOS.md ----------
    function construir() {
        filas = [];
        let n = 0;
        const agregar = (persona, tipo, clave, rotulo, par, meta = '', conGlobo = true) => {
            if (!esPar(par)) return;
            filas.push({ id: n++, persona, tipo, clave, rotulo, par, meta, conGlobo, av: [], el: null });
        };
        for (const persona of Object.keys(datos.temas)) {
            const s = datos.saludos[persona];
            if (s) {
                agregar(persona, 'saludo', `${persona}.saludo.bajo`, ['Saludo (nivel bajo)', 'Greeting (low level)'], s.bajo);
                agregar(persona, 'saludo', `${persona}.saludo.alto`, ['Saludo (Amigo o más)', 'Greeting (Friend or more)'], s.alto);
                for (const [b, x] of Object.entries(s.skin || {})) agregar(persona, 'saludo', `${persona}.saludo.skin.${b}`, [`Saludo con skin ${nombreDe(b)}`, `Greeting with ${nombreDe(b)} skin`], x);
            }
            for (const tema of datos.temas[persona]) {
                const base = `${persona}.${tema.id}`;
                const meta = [];
                if (tema.g) meta.push(`gesto ${tema.g}`);
                if (tema.req) meta.push('req ' + Object.entries(tema.req).map(([k, v]) => (k === 'nivel' ? `${k} ${NIVELES[v] || v}` : `${k} ${v}`)).join(', '));
                agregar(persona, 'tema', `${base}.p`, ['Pregunta (botón)', 'Question (button)'], tema.p, meta.join(' · '), false);
                if (tema.r) agregar(persona, 'tema', `${base}.r`, ['Respuesta', 'Answer'], tema.r, meta.join(' · '));
                for (const [b, x] of Object.entries(tema.skin || {})) agregar(persona, 'tema', `${base}.skin.${b}`, [`Respuesta con skin ${nombreDe(b)}`, `Answer with ${nombreDe(b)} skin`], x, meta.join(' · '));
                if (tema.id === 'opina' && !tema.r) {
                    for (const [de, x] of Object.entries(datos.opiniones[persona] || {})) agregar(persona, 'opinion', `${persona}.opina.${de}`, [`Opina de ${nombreDe(de)}`, `Thinks of ${nombreDe(de)}`], x, meta.join(' · '));
                }
            }
            agregar(persona, 'regalo', `${persona}.regalo`, ['Al recibir su regalo', 'On receiving its gift'], datos.regalos[persona], datos.gestoRegalo && datos.gestoRegalo[persona] ? `gesto ${datos.gestoRegalo[persona]}` : '');
        }
    }

    // ---------- Avisos ----------
    function evaluar(f) {
        f.av = avisosDeTexto(f.par, glifos);
        if (f.el) {
            f.el.classList.toggle('con-error', f.av.some(a => a.nivel === 'error'));
            f.el.classList.toggle('con-aviso', !f.av.some(a => a.nivel === 'error') && f.av.length > 0);
            const ul = f.el.querySelector('.tx-avisos');
            ul.textContent = '';
            for (const a of f.av) { const li = document.createElement('li'); li.className = a.nivel; li.textContent = a.texto; ul.appendChild(li); }
            f.el.querySelector('.tx-largo').textContent = `ES ${f.par.es.length} · EN ${f.par.en.length}` + (Number.isInteger(f.par.max) ? ` / ${f.par.max}` : '');
            f.el.querySelector('.tx-largo').classList.toggle('pasa', f.par.es.length > (f.par.max || LARGO_GLOBO) || f.par.en.length > (f.par.max || LARGO_GLOBO));
        }
    }

    function resumen() {
        const sin = filas.filter(f => !f.par.revisado).length;
        const err = filas.filter(f => f.av.some(a => a.nivel === 'error')).length;
        const avi = filas.filter(f => f.av.length && !f.av.some(a => a.nivel === 'error')).length;
        $('tx-resumen').textContent = t(`${filas.length} textos · ${sin} sin revisar · ${err} con errores · ${avi} con avisos`,
            `${filas.length} texts · ${sin} unreviewed · ${err} with errors · ${avi} with warnings`);
        const ul = $('tx-lista-avisos');
        ul.textContent = '';
        const malos = filas.filter(f => f.av.length).slice(0, 40);
        if (!malos.length) {
            const li = document.createElement('li'); li.className = 'nada'; li.textContent = t('Sin avisos.', 'No warnings.'); ul.appendChild(li);
        }
        for (const f of malos) {
            const li = document.createElement('li');
            li.className = f.av.some(a => a.nivel === 'error') ? 'error' : 'aviso';
            const b = document.createElement('button'); b.type = 'button';
            b.textContent = `${f.clave}: ${f.av[0].texto}`;
            b.addEventListener('click', () => irA(f));
            li.appendChild(b); ul.appendChild(li);
        }
        btnGuardar.disabled = !ctx.servidor.escritura || !sucio() || filas.some(f => f.av.some(a => a.nivel === 'error'));
        $('tx-deshacer').disabled = !historial.length;
        $('tx-descartar').disabled = !sucio();
    }

    function rotular(es, en, clase) {
        mensaje.dataset.es = es; mensaje.dataset.en = en;
        mensaje.textContent = t(es, en);
        mensaje.className = 'mensaje' + (clase ? ' ' + clase : '');
    }

    // ---------- Edición ----------
    function enviarAlJuego() {
        clearTimeout(reloj);
        reloj = setTimeout(() => { if (ctx.puente.estado.listo) ctx.puente.enviarDatos('dialogos', datos); }, 500);
    }
    function guardarSnapshot() {
        const ahora = Date.now();
        if (ahora - ultimaEdicion > 800) {
            historial.push(ultimo);
            if (historial.length > 60) historial.shift();
        }
        ultimaEdicion = ahora;
    }
    function cambio() {
        ultimo = JSON.stringify(datos);
        enviarAlJuego();
        resumen();
        if (sucio() && !mensaje.classList.contains('error')) rotular('Hay cambios sin guardar.', 'There are unsaved changes.', '');
    }

    function crearFila(f) {
        const el = document.createElement('div');
        el.className = 'fila-texto';
        el.dataset.id = f.id;
        const info = document.createElement('div'); info.className = 'tx-info';
        const clave = document.createElement('b'); clave.textContent = f.clave;
        const rot = document.createElement('span'); rot.className = 'tx-rotulo'; rot.textContent = f.rotulo[ctx.idioma === 'en' ? 1 : 0];
        info.append(clave, rot);
        if (f.meta) { const m = document.createElement('small'); m.textContent = f.meta; info.appendChild(m); }
        const campo = idioma => {
            const ta = document.createElement('textarea');
            ta.rows = 3; ta.lang = idioma; ta.spellcheck = true; ta.value = f.par[idioma];
            ta.setAttribute('aria-label', `${f.clave} ${idioma.toUpperCase()}`);
            ta.addEventListener('input', () => {
                guardarSnapshot();
                f.par[idioma] = ta.value;
                evaluar(f);
                cambio();
            });
            ta.addEventListener('focus', () => elegir(f));
            return ta;
        };
        const lado = document.createElement('div'); lado.className = 'tx-lado';
        const rev = document.createElement('label'); rev.className = 'casilla-marca';
        const chk = document.createElement('input'); chk.type = 'checkbox'; chk.checked = !!f.par.revisado;
        chk.addEventListener('change', () => {
            guardarSnapshot();
            if (chk.checked) f.par.revisado = true; else delete f.par.revisado;
            el.classList.toggle('revisado', chk.checked);
            cambio();
        });
        const rtxt = document.createElement('span'); rtxt.textContent = t('Revisado', 'Reviewed'); rtxt.className = 'tx-rev-texto';
        rev.append(chk, rtxt);
        const largo = document.createElement('span'); largo.className = 'tx-largo';
        const av = document.createElement('ul'); av.className = 'tx-avisos';
        lado.append(rev, largo, av);
        el.append(info, campo('es'), campo('en'), lado);
        el.classList.toggle('revisado', !!f.par.revisado);
        el.addEventListener('click', () => elegir(f));
        f.el = el;
        evaluar(f);
    }

    // ---------- Filtros y lista ----------
    function visible(f) {
        const p = $('tx-persona').value, ti = $('tx-tipo').value, q = sinTildes($('tx-buscar').value.trim());
        if (p && f.persona !== p) return false;
        if (ti && f.tipo !== ti) return false;
        if ($('tx-sin-revisar').checked && f.par.revisado) return false;
        if ($('tx-con-avisos').checked && !f.av.length) return false;
        if (q && !sinTildes(`${f.clave} ${f.par.es} ${f.par.en}`).includes(q)) return false;
        return true;
    }
    function pintarLista() {
        const arriba = lista.scrollTop;
        lista.textContent = '';
        let n = 0;
        for (const f of filas) {
            if (!f.el) crearFila(f);
            if (visible(f)) { lista.appendChild(f.el); n++; }
        }
        $('tx-visibles').textContent = t(`Mostrando ${n} de ${filas.length}`, `Showing ${n} of ${filas.length}`);
        lista.scrollTop = arriba;
        resumen();
    }
    function reconstruir() {
        construir();
        for (const f of filas) crearFila(f);
        if (elegida) elegida = filas.find(f => f.clave === elegida.clave) || null;
        pintarLista();
        refrescarPanel();
    }

    function elegir(f) {
        if (elegida === f) return;
        if (elegida && elegida.el) elegida.el.classList.remove('elegida');
        elegida = f;
        if (f && f.el) f.el.classList.add('elegida');
        refrescarPanel();
    }
    function irA(f) {
        $('tx-persona').value = '';
        $('tx-tipo').value = '';
        $('tx-buscar').value = '';
        $('tx-sin-revisar').checked = false;
        $('tx-con-avisos').checked = false;
        pintarLista();
        elegir(f);
        f.el.scrollIntoView({ block: 'center' });
    }
    function refrescarPanel() {
        const f = elegida;
        $('tx-elegido').textContent = f ? f.clave : t('Elige un texto', 'Pick a text');
        $('tx-elegido-meta').textContent = f ? `${f.rotulo[ctx.idioma === 'en' ? 1 : 0]}${f.meta ? ' · ' + f.meta : ''}` : '';
        for (const b of ['tx-globo-es', 'tx-globo-en']) $(b).disabled = !f || !f.conGlobo;
        $('tx-globo-nota').textContent = f && !f.conGlobo ? t('Una pregunta es el texto de un botón, no un globo.', 'A question is button text, not a bubble.') : '';
    }

    // ---------- Vista en el juego ----------
    async function verGlobo(idioma) {
        const f = elegida;
        if (!f || !f.conGlobo) return;
        if (!ctx.puente.estado.listo) { rotular('Abre la pestaña Juego y espera a que el mundo esté listo.', 'Open the Game tab and wait for the world to be ready.', 'error'); return; }
        try {
            rotular('Mostrando el globo…', 'Showing the bubble…', '');
            await ctx.puente.enviar('datos', { nombre: 'dialogos', datos });
            if ($('tx-ir-junto').checked) await ctx.puente.tp(f.persona);
            await ctx.puente.enviar('globo', { persona: f.persona, texto: f.par[idioma] });
            rotular(`Globo de ${nombreDe(f.persona)} en el juego (${idioma.toUpperCase()}). Dura unos segundos.`, `${nombreDe(f.persona)}'s bubble is in the game (${idioma.toUpperCase()}). It lasts a few seconds.`, 'ok');
        } catch (e) {
            rotular(e.message, e.message, 'error');
        }
    }

    // ---------- Guardar ----------
    async function guardar() {
        rotular('Guardando…', 'Saving…', '');
        try {
            const r2 = await fetch('../api/datos/dialogos', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'X-Estudio': '1', 'If-Match': etag || '*' },
                body: JSON.stringify(datos)
            });
            const j = await r2.json().catch(() => ({}));
            if (r2.ok) {
                original = clonar(datos);
                etag = j.etag;
                historial.length = 0;
                rotular(`Guardado (${j.bytes} B).`, `Saved (${j.bytes} B).`, 'ok');
            } else if (r2.status === 412) {
                rotular('El archivo cambió en disco: recarga y vuelve a aplicar tus cambios.', 'The file changed on disk: reload and apply your changes again.', 'error');
            } else if (r2.status === 422 && j.errores) {
                rotular('No se guardó: ' + j.errores.slice(0, 3).join(' · '), 'Not saved: ' + j.errores.slice(0, 3).join(' · '), 'error');
            } else {
                rotular(`No se guardó (${r2.status}): ${j.error || ''}`, `Not saved (${r2.status}): ${j.error || ''}`, 'error');
            }
        } catch (err) {
            rotular('No se pudo hablar con el servidor.', 'Could not reach the server.', 'error');
        }
        resumen();
    }
    function descargar() {
        const blob = new Blob([formatear(datos)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'dialogos.json';
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    }
    function reemplazar(nuevo) {
        datos = nuevo;
        ultimo = JSON.stringify(datos);
        reconstruir();
        enviarAlJuego();
    }
    function deshacer() {
        if (!historial.length) return;
        reemplazar(JSON.parse(historial.pop()));
        ultimaEdicion = 0;
    }
    function marcarVisibles(valor) {
        const vis = filas.filter(visible);
        if (!vis.length) return;
        guardarSnapshot();
        ultimaEdicion = 0;
        for (const f of vis) {
            if (valor) f.par.revisado = true; else delete f.par.revisado;
            f.el.classList.toggle('revisado', valor);
            f.el.querySelector('input[type="checkbox"]').checked = valor;
        }
        cambio();
        pintarLista();
    }

    // ---------- Arranque ----------
    const selP = $('tx-persona'), selT = $('tx-tipo');
    selP.textContent = '';
    const opt = (v, es, en) => { const o = document.createElement('option'); o.value = v; o.dataset.es = es; o.dataset.en = en; o.textContent = ctx.idioma === 'en' ? en : es; return o; };
    selP.appendChild(opt('', 'Todas las personas', 'Everyone'));
    for (const p of Object.keys(datos.temas)) selP.appendChild(opt(p, nombreDe(p), nombreDe(p)));
    for (const [v, es, en] of TIPOS) selT.appendChild(opt(v, es, en));
    for (const id of ['tx-persona', 'tx-tipo', 'tx-sin-revisar', 'tx-con-avisos']) $(id).addEventListener('change', pintarLista);
    $('tx-buscar').addEventListener('input', pintarLista);
    $('tx-marcar').addEventListener('click', () => marcarVisibles(true));
    $('tx-desmarcar').addEventListener('click', () => marcarVisibles(false));
    $('tx-globo-es').addEventListener('click', () => verGlobo('es'));
    $('tx-globo-en').addEventListener('click', () => verGlobo('en'));
    $('tx-deshacer').addEventListener('click', deshacer);
    $('tx-descartar').addEventListener('click', () => { guardarSnapshot(); ultimaEdicion = 0; reemplazar(clonar(original)); });
    btnGuardar.addEventListener('click', guardar);
    $('tx-descargar').addEventListener('click', descargar);

    window.addEventListener('beforeunload', e => { if (sucio()) { e.preventDefault(); e.returnValue = ''; } });
    window.addEventListener('keydown', e => {
        if ($('seccion-textos').hidden) return;
        const el = e.target;
        const escribiendo = el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName);
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); if (!btnGuardar.disabled) guardar(); return; }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !escribiendo) { e.preventDefault(); deshacer(); }
    });
    ctx.alIdioma.push(() => {
        for (const f of filas) if (f.el) {
            f.el.querySelector('.tx-rotulo').textContent = f.rotulo[ctx.idioma === 'en' ? 1 : 0];
            f.el.querySelector('.tx-rev-texto').textContent = t('Revisado', 'Reviewed');
        }
        pintarLista();
        refrescarPanel();
    });

    if (!glifos) rotular('Falta estudio/glifos.json: no se revisan los glifos de PixelCraft (node estudio/cli.mjs glifos).', 'estudio/glifos.json is missing: PixelCraft glyphs are not checked (node estudio/cli.mjs glifos).', 'error');
    reconstruir();
}
