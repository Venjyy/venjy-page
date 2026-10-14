// =========================================================
// VENJY · Estudio · pestaña Inicio: menú de inicio de la supervivencia (estudio/DISENO.md §21)
// Edita mundo/datos/inicio.json: logo, subtítulo y pie (ES/EN), la lista de frases amarillas que saltan junto al
// logo (sale una al azar) y cómo se ve la frase (color, giro, latido, ritmo y posición). Vista previa propia con las
// mismas reglas que supervivencia.css; «Abrir el menú real» lo muestra en otra pestaña. Lo que falte usa INICIO
// (mundo/supervivencia/inicio-datos.js). Guardar escribe con If-Match, como Objetos.
// =========================================================
import { INICIO, ORDEN_CARGA, datosInicio, avanceCarga } from '../mundo/supervivencia/inicio-datos.js';

const clonar = o => JSON.parse(JSON.stringify(o));
const TEXTOS = [['logo', 'Logo', 'Logo'], ['sub', 'Subtítulo', 'Subtitle'], ['pie', 'Pie', 'Footer']];
const ASPECTO = [
    ['giro', 'Giro (grados)', 'Tilt (degrees)', -90, 90, 1],
    ['pulso', 'Latido (0,1 = 10 %)', 'Pulse (0.1 = 10 %)', 0, 1, 0.01],
    ['ritmo', 'Latidos por segundo', 'Beats per second', 0, 10, 0.1],
    ['x', 'X (% desde la derecha)', 'X (% from the right)', -100, 100, 1],
    ['y', 'Y (% desde abajo)', 'Y (% from the bottom)', -100, 150, 1]
];

export async function montarInicio(ctx) {
    const $ = id => document.getElementById(id);
    const t = (es, en) => (ctx.idioma === 'en' ? en : es);
    const msg = $('in-mensaje'), btnGuardar = $('in-guardar');
    let etag = null, original = null, datos = null, indiceFrase = 0, indiceConsejo = 0, etapaVista = ORDEN_CARGA[0];
    try {
        const r = await fetch('../mundo/datos/inicio.json', { cache: 'no-cache' });
        etag = r.headers.get('ETag'); original = JSON.parse(await r.text());
    } catch (e) { msg.textContent = 'No se pudo leer mundo/datos/inicio.json'; return; }
    // Se edita sobre lo real (código + JSON): así los campos nunca salen vacíos
    const completar = o => ({ ...o, titulo: datosInicio(o).titulo, carga: datosInicio(o).carga });
    original = completar(original);
    datos = clonar(original);
    const sucio = () => JSON.stringify(datos) !== JSON.stringify(original);
    const rotular = (es, en, clase = '') => { msg.textContent = t(es, en); msg.className = 'mensaje' + (clase ? ' ' + clase : ''); };
    const cambio = () => { vista(); vistaCarga(); btnGuardar.disabled = !sucio() || !ctx.servidor.escritura; };

    function vista() {
        const T = datos.titulo, L = ctx.idioma;
        $('in-v-logo').textContent = T.logo[L] || T.logo.es;
        $('in-v-sub').textContent = T.sub[L] || T.sub.es;
        $('in-v-pie').textContent = T.pie[L] || T.pie.es;
        const f = $('in-v-frase'), v = T.frase, fr = T.frases[indiceFrase % Math.max(1, T.frases.length)];
        f.textContent = fr ? fr[L] || fr.es : '';
        f.style.setProperty('--frase-color', v.color);
        f.style.setProperty('--frase-giro', v.giro + 'deg');
        f.style.setProperty('--frase-pulso', 1 + v.pulso);
        f.style.setProperty('--frase-ritmo', v.ritmo > 0 ? (1 / v.ritmo).toFixed(3) + 's' : '0s');
        f.style.setProperty('--frase-x', v.x + '%');
        f.style.setProperty('--frase-y', v.y + '%');
    }

    function vistaCarga() {
        const C = datos.carga, L = ctx.idioma, a = C.aspecto, v = $('in-c-vista');
        const T = x => (x && (x[L] || x.es)) || '';
        v.style.setProperty('--c-fondo', a.fondo); v.style.setProperty('--c-fondo2', a.fondo2);
        v.style.setProperty('--c-barra', a.barra); v.style.setProperty('--c-barra-fondo', a.barraFondo);
        v.style.setProperty('--c-texto', a.texto); v.style.setProperty('--c-cuadro', Math.round(a.cuadro / 2) + 'px');
        $('in-c-titulo').textContent = T(C.titulo);
        $('in-c-relleno').style.width = avanceCarga(datos, etapaVista) + '%';
        $('in-c-etapa').textContent = T(C.etapas[etapaVista] && C.etapas[etapaVista].nombre);
        const c = C.consejos[indiceConsejo % Math.max(1, C.consejos.length)];
        $('in-c-consejo').textContent = c ? `${T(C.rotuloConsejo)}: ${T(c)}` : '';
    }
    function campoNumero(rotulo, valor, min, max, paso, al) {
        const l = document.createElement('label'); l.className = 'campo';
        const s = document.createElement('span'); s.textContent = rotulo;
        const i = document.createElement('input'); i.type = 'number'; i.min = min; i.max = max; i.step = paso; i.value = valor;
        i.addEventListener('input', () => { const n = Number(i.value); if (i.value !== '' && Number.isFinite(n)) al(Math.min(max, Math.max(min, n))); });
        l.append(s, i); return l;
    }
    function campoColor(rotulo, valor, al) {
        const l = document.createElement('label'); l.className = 'campo';
        const s = document.createElement('span'); s.textContent = rotulo;
        const i = document.createElement('input'); i.type = 'color'; i.value = valor;
        i.addEventListener('input', () => al(i.value));
        l.append(s, i); return l;
    }
    function pintarCarga() {
        const C = datos.carga, caja = $('in-c-textos'); caja.textContent = '';
        for (const [k, es, en] of [['titulo', 'Título', 'Title'], ['rotuloConsejo', 'Rótulo del consejo', 'Tip label']]) for (const L of ['es', 'en']) {
            caja.appendChild(campoTexto(`${t(es, en)} ${L.toUpperCase()}`, C[k][L], v => { C[k][L] = v || INICIO.carga[k][L]; cambio(); }));
        }
        for (const k of ORDEN_CARGA) {
            const e = C.etapas[k];
            for (const L of ['es', 'en']) caja.appendChild(campoTexto(`${t('Etapa', 'Stage')} ${k} ${L.toUpperCase()}`, e.nombre[L], v => { e.nombre[L] = v || INICIO.carga.etapas[k].nombre[L]; etapaVista = k; cambio(); }));
            caja.appendChild(campoNumero(`${t('Peso en la barra', 'Bar weight')} · ${k}`, e.peso, 0.1, 100, 0.5, n => { e.peso = n; etapaVista = k; cambio(); }));
        }
        const sel = $('in-c-sel'); sel.textContent = '';
        for (const k of ORDEN_CARGA) { const o = document.createElement('option'); o.value = k; o.textContent = k; o.selected = k === etapaVista; sel.appendChild(o); }
        const ac = $('in-c-aspecto'); ac.textContent = '';
        const a = C.aspecto;
        for (const [k, es, en] of [['fondo', 'Tierra (tono 1)', 'Dirt (tone 1)'], ['fondo2', 'Tierra (tono 2)', 'Dirt (tone 2)'], ['barra', 'Barra', 'Bar'], ['barraFondo', 'Fondo de la barra', 'Bar background'], ['texto', 'Texto', 'Text']])
            ac.appendChild(campoColor(t(es, en), a[k], v => { a[k] = v; cambio(); }));
        ac.appendChild(campoNumero(t('Tamaño del cuadro de tierra (px)', 'Dirt tile size (px)'), a.cuadro, 8, 256, 1, n => { a.cuadro = n; cambio(); }));
        ac.appendChild(campoNumero(t('Tiempo mínimo visible (s)', 'Minimum time shown (s)'), C.tiempos.minimo, 0, 10, 0.1, n => { C.tiempos.minimo = n; cambio(); }));
        ac.appendChild(campoNumero(t('Desvanecido (s)', 'Fade out (s)'), C.tiempos.salida, 0, 3, 0.05, n => { C.tiempos.salida = n; cambio(); }));
        const lc = $('in-consejos'); lc.textContent = '';
        C.consejos.forEach((f, n) => {
            const fila = document.createElement('div'); fila.className = 'fila-texto in-fila';
            for (const L of ['es', 'en']) {
                const ta = document.createElement('textarea'); ta.value = f[L]; ta.rows = 2; ta.maxLength = 140; ta.spellcheck = false;
                ta.setAttribute('aria-label', `${t('Consejo', 'Tip')} ${n + 1} ${L.toUpperCase()}`);
                ta.addEventListener('focus', () => { indiceConsejo = n; vistaCarga(); });
                ta.addEventListener('input', () => { f[L] = ta.value; fila.classList.toggle('con-error', !f.es.trim() || !f.en.trim()); cambio(); });
                fila.appendChild(ta);
            }
            const quitar = document.createElement('button'); quitar.type = 'button'; quitar.className = 'boton chico secundario';
            quitar.textContent = t('Quitar', 'Remove');
            quitar.addEventListener('click', () => { C.consejos.splice(n, 1); pintarCarga(); cambio(); });
            fila.appendChild(quitar);
            lc.appendChild(fila);
        });
        vistaCarga();
    }

    function campoTexto(rotulo, valor, al) {
        const l = document.createElement('label'); l.className = 'campo';
        const s = document.createElement('span'); s.textContent = rotulo;
        const i = document.createElement('input'); i.type = 'text'; i.value = valor; i.maxLength = 80; i.spellcheck = false;
        i.addEventListener('input', () => al(i.value));
        l.append(s, i); return l;
    }
    function pintarTextos() {
        const caja = $('in-textos'); caja.textContent = '';
        for (const [k, es, en] of TEXTOS) for (const L of ['es', 'en']) {
            caja.appendChild(campoTexto(`${t(es, en)} ${L.toUpperCase()}`, datos.titulo[k][L], v => { datos.titulo[k][L] = v || INICIO.titulo[k][L]; cambio(); }));
        }
    }
    function pintarAspecto() {
        const caja = $('in-aspecto'); caja.textContent = '';
        const v = datos.titulo.frase;
        const lc = document.createElement('label'); lc.className = 'campo';
        const sc = document.createElement('span'); sc.textContent = t('Color', 'Color');
        const ic = document.createElement('input'); ic.type = 'color'; ic.value = v.color;
        ic.addEventListener('input', () => { v.color = ic.value; cambio(); });
        lc.append(sc, ic); caja.appendChild(lc);
        for (const [k, es, en, min, max, paso] of ASPECTO) {
            const l = document.createElement('label'); l.className = 'campo';
            const s = document.createElement('span'); s.textContent = t(es, en);
            const i = document.createElement('input'); i.type = 'number'; i.min = min; i.max = max; i.step = paso; i.value = v[k];
            i.addEventListener('input', () => { const n = Number(i.value); if (i.value !== '' && Number.isFinite(n)) { v[k] = Math.min(max, Math.max(min, n)); cambio(); } });
            l.append(s, i); caja.appendChild(l);
        }
    }
    function pintarFrases() {
        const caja = $('in-frases'); caja.textContent = '';
        datos.titulo.frases.forEach((f, n) => {
            const fila = document.createElement('div'); fila.className = 'fila-texto in-fila';
            for (const L of ['es', 'en']) {
                const ta = document.createElement('textarea'); ta.value = f[L]; ta.rows = 1; ta.maxLength = 60; ta.spellcheck = false;
                ta.setAttribute('aria-label', `${t('Frase', 'Splash')} ${n + 1} ${L.toUpperCase()}`);
                ta.addEventListener('focus', () => { indiceFrase = n; vista(); });
                ta.addEventListener('input', () => { f[L] = ta.value; fila.classList.toggle('con-error', !f.es.trim() || !f.en.trim()); cambio(); });
                fila.appendChild(ta);
            }
            const quitar = document.createElement('button'); quitar.type = 'button'; quitar.className = 'boton chico secundario';
            quitar.textContent = t('Quitar', 'Remove');
            quitar.addEventListener('click', () => { datos.titulo.frases.splice(n, 1); pintarFrases(); cambio(); });
            fila.appendChild(quitar);
            caja.appendChild(fila);
        });
    }
    function pintar() { pintarTextos(); pintarAspecto(); pintarFrases(); pintarCarga(); vista(); }

    async function guardar() {
        if (datos.titulo.frases.some(f => !f.es.trim() || !f.en.trim())) { rotular('Cada frase necesita ES y EN.', 'Each splash needs ES and EN.', 'error'); return; }
        if (datos.carga.consejos.some(f => !f.es.trim() || !f.en.trim())) { rotular('Cada consejo necesita ES y EN.', 'Each tip needs ES and EN.', 'error'); return; }
        rotular('Guardando…', 'Saving…');
        try {
            const resp = await fetch('../api/datos/inicio', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Estudio': '1', 'If-Match': etag || '*' }, body: JSON.stringify(datos) });
            const j = await resp.json().catch(() => ({}));
            if (resp.ok) { original = clonar(datos); etag = j.etag; rotular(`Guardado (${j.bytes} B).`, `Saved (${j.bytes} B).`, 'ok'); }
            else if (resp.status === 412) rotular('El archivo cambió en disco: recarga el Estudio.', 'The file changed on disk: reload the Studio.', 'error');
            else rotular(`No se guardó (${resp.status}): ${(j.errores || []).slice(0, 2).join(' · ') || j.error || ''}`, `Not saved (${resp.status})`, 'error');
        } catch (e) { rotular('No se pudo hablar con el servidor.', 'Could not reach the server.', 'error'); }
        btnGuardar.disabled = !sucio() || !ctx.servidor.escritura;
    }

    $('in-agregar').addEventListener('click', () => {
        datos.titulo.frases.push({ es: '¡Nueva frase!', en: 'New splash!' });
        indiceFrase = datos.titulo.frases.length - 1;
        pintarFrases(); cambio();
    });
    $('in-c-agregar').addEventListener('click', () => {
        datos.carga.consejos.push({ es: 'Nuevo consejo.', en: 'New tip.' });
        indiceConsejo = datos.carga.consejos.length - 1;
        pintarCarga(); cambio();
    });
    $('in-c-otro').addEventListener('click', () => { indiceConsejo++; vistaCarga(); });
    $('in-c-sel').addEventListener('change', e => { etapaVista = e.target.value; vistaCarga(); });
    $('in-otra').addEventListener('click', () => { indiceFrase++; vista(); });
    $('in-descartar').addEventListener('click', () => { datos = clonar(original); pintar(); cambio(); });
    btnGuardar.addEventListener('click', guardar);
    window.addEventListener('keydown', e => {
        if (ctx.pestana === 'inicio' && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); if (!btnGuardar.disabled) guardar(); }
    });
    ctx.alIdioma.push(() => pintar());
    pintar();
}
