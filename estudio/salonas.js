// =========================================================
// VENJY · Estudio · pestaña Salonas: «La Gira» (juego de ritmo, S9)
// Edita mundo/datos/salonas.json (esquema: estudio/esquemas/salonas.schema.json): `juego` (canciones, carriles, cámara,
// audio, energía, Primus…), `reglas` (juicio, puntaje, partitura) y `textos` (pares ES/EN). El editor recorre el JSON:
// cada número, texto, color, interruptor o lista tiene su campo, así una clave nueva aparece sola. Las claves ausentes
// usan el valor del código (salonas.js), por eso no se inventan aquí. Cada cambio va en vivo (mensaje `datos` 'salonas',
// salonas.js lo lee en cada cuadro); Guardar escribe con PUT /api/datos/salonas y If-Match.
// Los botones táctiles (Pausa, Primus) se ubican en la pestaña Layout → página «Salonas».
// =========================================================
const clonar = o => JSON.parse(JSON.stringify(o));
const esObj = v => v && typeof v === 'object' && !Array.isArray(v);
const esPar = v => esObj(v) && typeof v.es === 'string' && typeof v.en === 'string' && Object.keys(v).length === 2;
const esColor = v => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);
const primitivo = v => ['string', 'number', 'boolean'].includes(typeof v);

export async function montarSalonas(ctx) {
    const $ = id => document.getElementById(id);
    const t = (es, en) => (ctx.idioma === 'en' ? en : es);
    const caja = $('sa-campos'), msg = $('sa-mensaje'), btnGuardar = $('sa-guardar');
    let etag = null, original = null, datos = null;
    try {
        const r = await fetch('../mundo/datos/salonas.json', { cache: 'no-cache' });
        etag = r.headers.get('ETag'); original = JSON.parse(await r.text()); datos = clonar(original);
    } catch (e) { caja.textContent = 'No se pudo leer mundo/datos/salonas.json'; return; }

    const sucio = () => JSON.stringify(datos) !== JSON.stringify(original);
    const rotular = (es, en, clase = '') => { msg.textContent = t(es, en); msg.className = 'mensaje' + (clase ? ' ' + clase : ''); };
    const cambio = () => { ctx.puente.enviarDatos('salonas', datos); btnGuardar.disabled = !sucio() || !ctx.servidor.escritura; };
    const el = (tag, cls, texto) => { const e = document.createElement(tag); if (cls) e.className = cls; if (texto != null) e.textContent = texto; return e; };
    const campo = (etiqueta, ...hijos) => { const l = el('label', 'campo'); l.appendChild(el('span', '', etiqueta)); hijos.forEach(h => l.appendChild(h)); return l; };
    const poner = (padre, k, v) => { padre[k] = v; cambio(); };

    // Un campo por valor, según su tipo. `padre[k]` es el valor; se escribe ahí mismo.
    function campoDe(padre, k) {
        const v = padre[k];
        if (typeof v === 'number') {
            const i = el('input'); i.type = 'number'; i.step = Number.isInteger(v) ? '1' : 'any'; i.value = v; i.style.width = '7em';
            i.addEventListener('change', () => { if (i.value !== '' && Number.isFinite(Number(i.value))) poner(padre, k, Number(i.value)); else i.value = padre[k]; });
            return campo(k, i);
        }
        if (typeof v === 'boolean') {
            const i = el('input'); i.type = 'checkbox'; i.checked = v;
            i.addEventListener('change', () => poner(padre, k, i.checked));
            return campo(k, i);
        }
        if (esColor(v)) {
            const i = el('input'); i.type = 'color'; i.value = v;
            i.addEventListener('change', () => poner(padre, k, i.value));
            return campo(k, i);
        }
        if (typeof v === 'string') {
            const i = el('input'); i.type = 'text'; i.value = v; i.maxLength = 200; i.style.width = '16em';
            i.addEventListener('change', () => poner(padre, k, i.value));
            return campo(k, i);
        }
        if (Array.isArray(v) && v.every(primitivo)) {
            // lista de números o textos: valores separados por coma, cada uno con el tipo que ya tenía
            const num = v.length > 0 && v.every(x => typeof x === 'number');
            const i = el('input'); i.type = 'text'; i.value = v.join(', '); i.style.width = '16em';
            i.addEventListener('change', () => {
                const partes = i.value.split(',').map(s => s.trim()).filter(s => s !== '');
                if (num && partes.some(s => !Number.isFinite(Number(s)))) { rotular('Esa lista solo lleva números.', 'That list only takes numbers.', 'error'); i.value = padre[k].join(', '); return; }
                poner(padre, k, num ? partes.map(Number) : partes);
            });
            return campo(k, i);
        }
        // lista de objetos u otra forma: JSON a mano
        const a = el('textarea'); a.rows = 4; a.style.width = '24em'; a.value = JSON.stringify(v, null, 1);
        a.addEventListener('change', () => {
            try { poner(padre, k, JSON.parse(a.value)); } catch (e) { rotular('JSON no válido: no se aplicó.', 'Invalid JSON: not applied.', 'error'); a.value = JSON.stringify(padre[k], null, 1); }
        });
        return campo(k, a);
    }

    function parTexto(padre, k) {
        const f = el('div', 'campo'); f.appendChild(el('span', '', k));
        for (const l of ['es', 'en']) {
            const i = el('input'); i.type = 'text'; i.title = l.toUpperCase(); i.maxLength = 200; i.style.width = '22em'; i.value = padre[k][l];
            i.addEventListener('change', () => poner(padre[k], l, i.value));
            f.appendChild(i);
        }
        return f;
    }

    // Llena `dentro` con los campos de `obj`; los sub-objetos van en grupos plegables
    function llenar(dentro, obj, textos) {
        for (const k of Object.keys(obj)) {
            const v = obj[k];
            if (textos && esPar(v)) dentro.appendChild(parTexto(obj, k));
            else if (esObj(v)) {
                const d = el('details', 'grupo-ajustes');
                d.appendChild(el('summary', '', k));
                const sub = el('div', 'grupo-cuerpo'); d.appendChild(sub);
                llenar(sub, v, textos);
                dentro.appendChild(d);
            } else dentro.appendChild(campoDe(obj, k));
        }
    }

    function pintar() {
        caja.textContent = '';
        for (const [clave, es, en, textos] of [['juego', 'Juego', 'Game', false], ['reglas', 'Reglas', 'Rules', false], ['textos', 'Textos (ES / EN)', 'Texts (ES / EN)', true]]) {
            const sec = el('section', 'panel'); sec.appendChild(el('h2', '', t(es, en)));
            const cuerpo = el('div', 'grupo-cuerpo');
            llenar(cuerpo, datos[clave] || {}, textos);
            sec.appendChild(cuerpo); caja.appendChild(sec);
        }
        btnGuardar.disabled = !sucio() || !ctx.servidor.escritura;
    }

    async function guardar() {
        rotular('Guardando…', 'Saving…');
        try {
            const resp = await fetch('../api/datos/salonas', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Estudio': '1', 'If-Match': etag || '*' }, body: JSON.stringify(datos) });
            const j = await resp.json().catch(() => ({}));
            if (resp.ok) { original = clonar(datos); etag = j.etag; rotular(`Guardado (${j.bytes} B).`, `Saved (${j.bytes} B).`, 'ok'); }
            else if (resp.status === 412) rotular('El archivo cambió en disco: recarga el Estudio.', 'The file changed on disk: reload the Studio.', 'error');
            else rotular(`No se guardó (${resp.status}): ${(j.errores || []).slice(0, 2).join(' · ') || j.error || ''}`, `Not saved (${resp.status})`, 'error');
        } catch (e) { rotular('No se pudo hablar con el servidor.', 'Could not reach the server.', 'error'); }
        btnGuardar.disabled = !sucio() || !ctx.servidor.escritura;
    }

    const alRehacer = []; // f() cuando se descartan los cambios: la pestaña Ritmo comparte estos datos (ajustes a mano)
    const descartar = () => { datos = clonar(original); cambio(); pintar(); alRehacer.forEach(f => f()); };
    $('sa-descartar').addEventListener('click', descartar);
    btnGuardar.addEventListener('click', guardar);
    window.addEventListener('keydown', e => {
        if (ctx.pestana === 'salonas' && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); if (!btnGuardar.disabled) guardar(); }
    });
    window.addEventListener('beforeunload', e => { if (sucio()) { e.preventDefault(); e.returnValue = ''; } });
    ctx.alIdioma.push(() => pintar());
    // La pestaña Ritmo (S10a) edita ajustes dentro de este mismo JSON: comparte datos, envío en vivo y Guardar.
    ctx.salonas = { datos: () => datos, cambio, sucio, guardar, descartar, alRehacer, mensaje: () => msg.textContent };
    pintar();
}
