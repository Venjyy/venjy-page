// =========================================================
// VENJY · Estudio · editor de layout táctil
// Muestra vista-tactil.html (la capa táctil real) en un iframe del tamaño del aparato y deja mover,
// agrandar y numerar cada botón. Guarda mundo/datos/ui-layout.json con PUT /api/datos/ui-layout.
// Contrato y reglas: estudio/DISENO.md §5.
// =========================================================
import { SELECTORES } from '../mundo/supervivencia/layout-datos.js';
import { formatear } from './formato.mjs';

// Orden de la lista: clave, nombre ES, nombre EN
const BOTONES = [
    ['joy', 'Joystick', 'Joystick'],
    ['saltar', 'Saltar', 'Jump'],
    ['bajar', 'Agachar / bajar', 'Sneak / down'],
    ['pausa', 'Pausa', 'Pause'],
    ['pantalla', 'Pantalla completa', 'Full screen'],
    ['sv-romper', 'Romper', 'Break'],
    ['sv-usar', 'Usar', 'Use'],
    ['sv-inventario', 'Inventario', 'Inventory'],
    ['sv-soltar', 'Soltar', 'Drop'],
    ['sv-camara', 'Cámara', 'Camera'],
    ['sv-comando', 'Comando /', 'Command /'],
    ['sv-acariciar', 'Acariciar', 'Pet'],
    ['mision', 'Misión', 'Quest']
];
const NOMBRE = Object.fromEntries(BOTONES.map(([c, es, en]) => [c, { es, en }]));

// Ancla de cada botón en el CSS de hoy (para los que todavía no están en el JSON)
const DEF = {
    joy: { ancla: 'ii', desde: 'pie' },
    saltar: { ancla: 'id', desde: 'pie' },
    bajar: { ancla: 'id', desde: 'pie' },
    pausa: { ancla: 'sd' },
    pantalla: { ancla: 'sd' },
    'sv-romper': { ancla: 'id', desde: 'pie' },
    'sv-usar': { ancla: 'id', desde: 'pie' },
    'sv-acariciar': { ancla: 'id', desde: 'pie' },
    'sv-inventario': { ancla: 'si' },
    'sv-soltar': { ancla: 'si' },
    'sv-camara': { ancla: 'si' },
    'sv-comando': { ancla: 'si' },
    mision: { ancla: 'si', seguro: false }
};
const LADOS = { si: ['left', 'top'], sd: ['right', 'top'], ii: ['left', 'bottom'], id: ['right', 'bottom'] };
const ANCLAS = [['si', 'Arriba izquierda', 'Top left'], ['sd', 'Arriba derecha', 'Top right'], ['ii', 'Abajo izquierda', 'Bottom left'], ['id', 'Abajo derecha', 'Bottom right']];

const APARATOS = [
    { id: 'cel-v', es: 'Celular vertical 390×844', en: 'Phone portrait 390×844', w: 390, h: 844, seguro: { t: 47, b: 34 } },
    { id: 'cel-h', es: 'Celular acostado 844×390', en: 'Phone landscape 844×390', w: 844, h: 390, seguro: { l: 47, r: 47, b: 21 } },
    { id: 'and-v', es: 'Android vertical 412×915', en: 'Android portrait 412×915', w: 412, h: 915, seguro: { t: 32, b: 24 } },
    { id: 'and-h', es: 'Android acostado 915×412', en: 'Android landscape 915×412', w: 915, h: 412, seguro: { l: 32, r: 32, b: 16 } },
    { id: 'tab', es: 'Tablet 820×1180', en: 'Tablet 820×1180', w: 820, h: 1180, seguro: { t: 24, b: 20 } },
    { id: 'pers', es: 'Personalizado', en: 'Custom', w: 800, h: 400, seguro: {} }
];

const LIMITES = { x: [-200, 2000], y: [-200, 2000], w: [24, 400], h: [24, 400], letra: [0.5, 2], palanca: [16, 200], pie: [0, 400] };
const clamp = (v, [a, b]) => Math.min(b, Math.max(a, v));
const redondear = v => Math.round(v * 10) / 10;
const clonar = o => JSON.parse(JSON.stringify(o));
const hay = v => v !== undefined && v !== null;

export async function montarLayout(ctx) {
    const $ = id => document.getElementById(id);
    const vista = $('vista'), capa = $('capa'), escenario = $('escenario'), marco = $('marco');
    const selAparato = $('aparato'), campoPie = $('campo-pie'), mensaje = $('mensaje');
    const btnGuardar = $('guardar');

    let original = null, datos = null, etag = null;
    let aparato = APARATOS[1];
    let persW = 800, persH = 400;
    let escala = 1, elegido = null, listo = false;
    const historial = [];

    const tam = () => (aparato.id === 'pers' ? { w: persW, h: persH } : { w: aparato.w, h: aparato.h });
    const perfil = () => (tam().h <= 460 ? 'baja' : 'normal');
    const sucio = () => JSON.stringify(datos) !== JSON.stringify(original);
    const nombre = clave => NOMBRE[clave][ctx.idioma];

    // ---------- Datos ----------
    function pantalla(crear) {
        if (!datos.supervivencia) { if (!crear) return null; datos.supervivencia = {}; }
        return datos.supervivencia;
    }
    function perfilDatos(p, crear) {
        const s = pantalla(crear);
        if (!s) return null;
        if (!s[p]) { if (!crear) return null; s[p] = {}; }
        return s[p];
    }
    function botonDatos(p, clave, crear) {
        const pd = perfilDatos(p, crear);
        if (!pd) return null;
        if (!pd.botones) { if (!crear) return null; pd.botones = {}; }
        if (!pd.botones[clave]) { if (!crear) return null; pd.botones[clave] = {}; }
        return pd.botones[clave];
    }
    // Botón tal como queda en el perfil actual: CSS de hoy < normal < baja
    function efectivo(clave) {
        const n = botonDatos('normal', clave, false) || {};
        const b = perfil() === 'baja' ? botonDatos('baja', clave, false) || {} : {};
        return { ...DEF[clave], ...n, ...b };
    }

    function empujar() {
        historial.push(JSON.stringify(datos));
        if (historial.length > 100) historial.shift();
    }
    function deshacer() {
        if (!historial.length) return;
        datos = JSON.parse(historial.pop());
        enviar();
        refrescarPanel();
    }

    // ---------- Vista ----------
    const doc = () => (listo ? vista.contentDocument : null);
    function enviar() {
        if (!listo) return;
        vista.contentWindow.postMessage({ tipo: 'layout', datos }, location.origin);
        const s = ctx.zonaSegura ? aparato.seguro : {};
        vista.contentWindow.postMessage({ tipo: 'seguro', t: s.t || 0, r: s.r || 0, b: s.b || 0, l: s.l || 0 }, location.origin);
    }

    // Mide un botón en px de la vista, con la ancla `c` (puede ser distinta de la guardada)
    function medir(clave, c) {
        const d = doc();
        const e = d && d.querySelector(SELECTORES[clave]);
        if (!e) return null;
        const r = e.getBoundingClientRect();
        if (!r.width && !r.height) return null;
        const cont = (clave === 'mision' ? d.getElementById('hud') : d.querySelector('.tactil')).getBoundingClientRect();
        const [h, v] = LADOS[c.ancla];
        const x = h === 'left' ? r.left - cont.left : cont.right - r.right;
        let y;
        if (v === 'top') y = r.top - cont.top;
        else {
            const linea = c.desde === 'pie' ? d.getElementById('sonda-pie').getBoundingClientRect().bottom : cont.bottom;
            y = linea - r.bottom;
        }
        const fuente = parseFloat(vista.contentWindow.getComputedStyle(e).fontSize) / 16;
        return { x: redondear(x), y: redondear(y), w: redondear(r.width), h: redondear(r.height), letra: Math.round(fuente * 20) / 20, rect: r };
    }

    // Escribe campos en el perfil actual. En baja solo se guarda lo que difiere de normal.
    function escribir(clave, campos) {
        const p = perfil();
        const normal = botonDatos('normal', clave, false);
        const destino = botonDatos(p, clave, true);
        if (!destino.ancla && (p === 'normal' || !(normal && normal.ancla))) {
            // primera vez en este botón: se guarda completo para que el CSS no dependa de nada más
            const eff = efectivo(clave);
            const m = medir(clave, eff);
            Object.assign(destino, { ancla: eff.ancla });
            if (eff.desde) destino.desde = eff.desde;
            if (eff.seguro === false) destino.seguro = false;
            if (m) {
                destino.x = m.x; destino.y = m.y;
                if (clave !== 'mision') { destino.w = m.w; destino.h = m.h; }
            }
        }
        const base = { ...DEF[clave], ...(normal || {}) };
        for (const [k, v] of Object.entries(campos)) {
            if (v === undefined || v === null || Number.isNaN(v)) { delete destino[k]; continue; }
            if (p === 'baja' && hay(base[k]) && base[k] === v && k !== 'ancla') delete destino[k];
            else destino[k] = v;
        }
        if (!Object.keys(destino).length) {
            const pd = perfilDatos(p, false);
            if (pd && pd.botones) delete pd.botones[clave];
        }
    }

    // ---------- Panel ----------
    function opcion(valor, es, en, sel) {
        const o = document.createElement('option');
        o.value = valor;
        o.dataset.es = es; o.dataset.en = en;
        o.textContent = ctx.idioma === 'en' ? en : es;
        if (sel) o.selected = true;
        return o;
    }
    function campo(es, en, control, ancho) {
        const l = document.createElement('label');
        l.className = 'campo' + (ancho ? ' ancho' : '');
        const s = document.createElement('span');
        s.dataset.es = es; s.dataset.en = en;
        s.textContent = ctx.idioma === 'en' ? en : es;
        l.append(s, control);
        return l;
    }
    function numero(valor, limites, paso, alCambiar) {
        const i = document.createElement('input');
        i.type = 'number';
        i.step = paso || 1;
        if (limites) { i.min = limites[0]; i.max = limites[1]; }
        i.value = hay(valor) ? valor : '';
        i.addEventListener('change', () => alCambiar(i.value === '' ? undefined : Number(i.value)));
        return i;
    }

    function pintarCampos() {
        const caja = $('campos');
        caja.textContent = '';
        if (!elegido) { $('restablecer').hidden = true; return; }
        const eff = efectivo(elegido);
        const m = medir(elegido, eff);
        const val = k => (m && hay(m[k]) ? m[k] : eff[k]);
        const conf = (k, v) => {
            empujar();
            const lim = LIMITES[k];
            escribir(elegido, { [k]: lim && v !== undefined ? clamp(v, lim) : v });
            enviar();
        };

        const sAncla = document.createElement('select');
        for (const [v, es, en] of ANCLAS) sAncla.appendChild(opcion(v, es, en, eff.ancla === v));
        sAncla.addEventListener('change', () => {
            const nueva = { ancla: sAncla.value, desde: LADOS[sAncla.value][1] === 'bottom' ? eff.desde || 'borde' : undefined };
            const mm = medir(elegido, nueva);
            empujar();
            escribir(elegido, { ancla: nueva.ancla, desde: nueva.desde, x: mm ? mm.x : eff.x, y: mm ? mm.y : eff.y });
            enviar();
        });
        caja.appendChild(campo('Ancla', 'Anchor', sAncla, true));

        if (LADOS[eff.ancla][1] === 'bottom') {
            const sDesde = document.createElement('select');
            sDesde.appendChild(opcion('borde', 'Borde de la pantalla', 'Screen edge', eff.desde !== 'pie'));
            sDesde.appendChild(opcion('pie', 'Sobre la barra rápida (pie)', 'Above the hotbar (pie)', eff.desde === 'pie'));
            sDesde.addEventListener('change', () => {
                const nueva = { ancla: eff.ancla, desde: sDesde.value };
                const mm = medir(elegido, nueva);
                empujar();
                escribir(elegido, { desde: nueva.desde, y: mm ? mm.y : eff.y });
                enviar();
            });
            caja.appendChild(campo('Medir desde', 'Measure from', sDesde, true));
        }

        caja.appendChild(campo('x (px)', 'x (px)', numero(val('x'), LIMITES.x, 1, v => conf('x', v))));
        caja.appendChild(campo('y (px)', 'y (px)', numero(val('y'), LIMITES.y, 1, v => conf('y', v))));
        if (elegido !== 'mision') {
            caja.appendChild(campo('Ancho', 'Width', numero(val('w'), LIMITES.w, 1, v => conf('w', v))));
            caja.appendChild(campo('Alto', 'Height', numero(val('h'), LIMITES.h, 1, v => conf('h', v))));
        }
        caja.appendChild(campo('Letra (rem)', 'Font (rem)', numero(hay(eff.letra) ? eff.letra : (m && m.letra), LIMITES.letra, 0.05, v => conf('letra', v))));
        if (elegido === 'joy') caja.appendChild(campo('Palanca (px)', 'Stick (px)', numero(eff.palanca, LIMITES.palanca, 1, v => conf('palanca', v))));

        const marca = (es, en, activo, alCambiar) => {
            const i = document.createElement('input');
            i.type = 'checkbox';
            i.checked = activo;
            i.addEventListener('change', () => alCambiar(i.checked));
            const l = document.createElement('label');
            l.className = 'casilla-marca';
            const s = document.createElement('span');
            s.dataset.es = es; s.dataset.en = en;
            s.textContent = ctx.idioma === 'en' ? en : es;
            l.append(i, s);
            l.style.gridColumn = '1 / -1';
            return l;
        };
        caja.appendChild(marca('Suma la zona segura', 'Adds the safe area', eff.seguro !== false, v => {
            empujar();
            const porDefecto = DEF[elegido].seguro !== false;
            escribir(elegido, { seguro: v === porDefecto && perfil() === 'normal' ? undefined : v });
            enviar();
        }));
        caja.appendChild(marca('Oculto en este perfil', 'Hidden in this profile', !!eff.oculto, v => {
            empujar();
            const normal = botonDatos('normal', elegido, false);
            escribir(elegido, { oculto: v ? true : (perfil() === 'baja' && normal && normal.oculto ? false : undefined) });
            enviar();
        }));
        $('restablecer').hidden = !botonDatos(perfil(), elegido, false);
    }

    const enOriginal = (p, clave) => {
        const s = original.supervivencia;
        return (s && s[p] && s[p].botones && s[p].botones[clave]) || null;
    };
    const editado = clave => ['normal', 'baja'].some(p => JSON.stringify(botonDatos(p, clave, false)) !== JSON.stringify(enOriginal(p, clave)));

    function pintarLista() {
        const ul = $('lista');
        ul.textContent = '';
        for (const [clave] of BOTONES) {
            const li = document.createElement('li');
            const b = document.createElement('button');
            b.type = 'button';
            b.textContent = nombre(clave);
            if (clave === elegido) b.classList.add('elegido');
            if (editado(clave)) b.classList.add('editado');
            b.addEventListener('click', () => elegir(clave));
            li.appendChild(b);
            ul.appendChild(li);
        }
    }

    function elegir(clave) {
        elegido = clave;
        const t = $('titulo-elegido');
        t.dataset.es = clave ? NOMBRE[clave].es : 'Elige un botón';
        t.dataset.en = clave ? NOMBRE[clave].en : 'Pick a button';
        t.textContent = t.dataset[ctx.idioma];
        refrescarPanel();
    }

    function refrescarPanel() {
        pintarCampos();
        pintarLista();
        const p = perfil();
        const pie = perfilDatos(p, false);
        campoPie.value = pie && hay(pie.pie) ? pie.pie : '';
        campoPie.placeholder = p === 'baja' ? '50' : '60';
        const pr = $('perfil-actual');
        pr.dataset.es = p === 'baja' ? 'Perfil: baja (alto ≤ 460)' : 'Perfil: normal';
        pr.dataset.en = p === 'baja' ? 'Profile: low (height ≤ 460)' : 'Profile: normal';
        pr.textContent = pr.dataset[ctx.idioma];
        btnGuardar.disabled = !ctx.servidor.escritura || !sucio();
        if (sucio() && !mensaje.classList.contains('error')) rotular('Hay cambios sin guardar.', 'There are unsaved changes.', '');
        $('deshacer').disabled = !historial.length;
        $('descartar').disabled = !sucio();
    }

    function rotular(es, en, clase) {
        mensaje.dataset.es = es; mensaje.dataset.en = en;
        mensaje.textContent = ctx.idioma === 'en' ? en : es;
        mensaje.className = 'mensaje' + (clase ? ' ' + clase : '');
    }

    // ---------- Asas, avisos y arrastre ----------
    function render() {
        const d = doc();
        if (!d) return;
        capa.textContent = '';
        const { w, h } = tam();
        const visibles = [];
        for (const [clave] of BOTONES) {
            const e = d.querySelector(SELECTORES[clave]);
            if (!e) continue;
            const r = e.getBoundingClientRect();
            if (!r.width || !r.height) continue;
            visibles.push({ clave, r });
        }
        const avisos = [];
        const marcas = new Map();
        const marcar = (clave, clase) => { marcas.set(clave, (marcas.get(clave) || '') + ' ' + clase); };
        for (let i = 0; i < visibles.length; i++) {
            const a = visibles[i];
            for (let j = i + 1; j < visibles.length; j++) {
                const b = visibles[j];
                const ancho = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left);
                const alto = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
                if (ancho > 1 && alto > 1) {
                    marcar(a.clave, 'choque'); marcar(b.clave, 'choque');
                    avisos.push(['choque', `${NOMBRE[a.clave].es} y ${NOMBRE[b.clave].es} se tapan`, `${NOMBRE[a.clave].en} and ${NOMBRE[b.clave].en} overlap`]);
                }
            }
            if (a.clave !== 'mision' && Math.min(a.r.width, a.r.height) < 44) {
                marcar(a.clave, 'chico');
                avisos.push(['chico', `${NOMBRE[a.clave].es} mide menos de 44 px (${Math.round(a.r.width)}×${Math.round(a.r.height)})`, `${NOMBRE[a.clave].en} is under 44 px (${Math.round(a.r.width)}×${Math.round(a.r.height)})`]);
            }
            if (a.r.left < -0.5 || a.r.top < -0.5 || a.r.right > w + 0.5 || a.r.bottom > h + 0.5) {
                marcar(a.clave, 'fuera');
                avisos.push(['fuera', `${NOMBRE[a.clave].es} sale de la pantalla`, `${NOMBRE[a.clave].en} is off screen`]);
            }
        }
        for (const { clave, r } of visibles) {
            const asa = document.createElement('div');
            asa.className = 'asa' + (clave === elegido ? ' elegida' : '') + (marcas.get(clave) || '');
            asa.tabIndex = 0;
            asa.dataset.clave = clave;
            Object.assign(asa.style, { left: r.left * escala + 'px', top: r.top * escala + 'px', width: r.width * escala + 'px', height: r.height * escala + 'px' });
            const rot = document.createElement('span');
            rot.className = 'rotulo';
            rot.textContent = nombre(clave);
            asa.appendChild(rot);
            if (clave !== 'mision') {
                // la esquina que se arrastra es la contraria a la ancla: así x e y no cambian
                const [hl, vl] = LADOS[efectivo(clave).ancla];
                const esq = document.createElement('span');
                esq.className = 'esquina ' + (vl === 'top' ? 'b' : 't') + (hl === 'left' ? 'r' : 'l');
                esq.dataset.modo = 'tam';
                asa.appendChild(esq);
            }
            asa.addEventListener('pointerdown', e => empezarArrastre(e, clave, asa));
            capa.appendChild(asa);
        }
        const ul = $('avisos');
        ul.textContent = '';
        if (!avisos.length) avisos.push(['nada', 'Sin avisos.', 'No warnings.']);
        for (const [clase, es, en] of avisos) {
            const li = document.createElement('li');
            li.className = clase;
            li.dataset.es = es; li.dataset.en = en;
            li.textContent = ctx.idioma === 'en' ? en : es;
            ul.appendChild(li);
        }
    }

    let arrastre = null;
    function empezarArrastre(e, clave, asa) {
        e.preventDefault();
        if (elegido !== clave) elegir(clave);
        const eff = efectivo(clave);
        const m = medir(clave, eff);
        if (!m) return;
        empujar();
        // el DOM de las asas se rehace al enviar: se arrastra por la clave, no por el nodo
        arrastre = { clave, modo: e.target.dataset && e.target.dataset.modo === 'tam' ? 'tam' : 'mover', sx: e.clientX, sy: e.clientY, m, eff, cambio: false };
        asa.setPointerCapture && asa.setPointerCapture(e.pointerId);
        window.addEventListener('pointermove', moverArrastre);
        window.addEventListener('pointerup', terminarArrastre, { once: true });
    }
    let cuadro = 0;
    function moverArrastre(e) {
        if (!arrastre) return;
        const a = arrastre;
        const paso = e.shiftKey ? 1 : 2;
        const snap = v => Math.round(v / paso) * paso;
        const dx = (e.clientX - a.sx) / escala;
        const dy = (e.clientY - a.sy) / escala;
        const [hl, vl] = LADOS[a.eff.ancla];
        const campos = {};
        if (a.modo === 'mover') {
            campos.x = clamp(snap(a.m.x + (hl === 'left' ? dx : -dx)), LIMITES.x);
            campos.y = clamp(snap(a.m.y + (vl === 'top' ? dy : -dy)), LIMITES.y);
        } else {
            campos.w = clamp(snap(a.m.w + (hl === 'left' ? dx : -dx)), LIMITES.w);
            campos.h = clamp(snap(a.m.h + (vl === 'top' ? dy : -dy)), LIMITES.h);
        }
        a.campos = campos;
        a.cambio = true;
        cancelAnimationFrame(cuadro);
        cuadro = requestAnimationFrame(() => {
            if (!arrastre) return;
            // se parte de los datos al empezar para no acumular ancla ni completar de más
            escribir(a.clave, a.campos);
            enviar();
        });
    }
    function terminarArrastre() {
        window.removeEventListener('pointermove', moverArrastre);
        const a = arrastre;
        arrastre = null;
        if (a && !a.cambio) historial.pop();
        refrescarPanel();
    }

    // ---------- Aparato, escala y zona segura ----------
    function ajustar() {
        const { w, h } = tam();
        const disponibleW = Math.max(200, marco.clientWidth - 28);
        const disponibleH = Math.max(260, window.innerHeight - marco.getBoundingClientRect().top - 90);
        escala = Math.min(1, disponibleW / w, disponibleH / h);
        escenario.style.width = w * escala + 'px';
        escenario.style.height = h * escala + 'px';
        Object.assign(vista.style, { width: w + 'px', height: h + 'px', transform: `scale(${escala})` });
        $('campo-w').hidden = $('campo-h').hidden = aparato.id !== 'pers';
        // la vista ajusta sus medidas con el tamaño del iframe; las asas se rehacen cuando responde
        requestAnimationFrame(() => { enviar(); setTimeout(() => { render(); refrescarPanel(); }, 60); });
    }

    function llenarAparatos() {
        selAparato.textContent = '';
        for (const a of APARATOS) selAparato.appendChild(opcion(a.id, a.es, a.en, a === aparato));
    }

    // ---------- Guardar ----------
    async function guardar() {
        rotular('Guardando…', 'Saving…', '');
        try {
            const r = await fetch('../api/datos/ui-layout', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'X-Estudio': '1', 'If-Match': etag || '*' },
                body: JSON.stringify(datos)
            });
            const j = await r.json().catch(() => ({}));
            if (r.ok) {
                original = clonar(datos);
                etag = j.etag;
                historial.length = 0;
                rotular(`Guardado (${j.bytes} B).`, `Saved (${j.bytes} B).`, 'ok');
            } else if (r.status === 412) {
                rotular('El archivo cambió en disco: recarga y vuelve a aplicar tus cambios.', 'The file changed on disk: reload and apply your changes again.', 'error');
            } else if (r.status === 422 && j.errores) {
                rotular('No se guardó: ' + j.errores.slice(0, 3).join(' · '), 'Not saved: ' + j.errores.slice(0, 3).join(' · '), 'error');
            } else {
                rotular(`No se guardó (${r.status}): ${j.error || ''}`, `Not saved (${r.status}): ${j.error || ''}`, 'error');
            }
        } catch (err) {
            rotular('No se pudo hablar con el servidor.', 'Could not reach the server.', 'error');
        }
        refrescarPanel();
    }

    function descargar() {
        const blob = new Blob([formatear(datos)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'ui-layout.json';
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    }

    // ---------- Arranque ----------
    const r = await fetch('../mundo/datos/ui-layout.json', { cache: 'no-cache' });
    etag = r.headers.get('ETag');
    original = JSON.parse(await r.text());
    datos = clonar(original);

    llenarAparatos();
    $('zona-segura').addEventListener('change', e => { ctx.zonaSegura = e.target.checked; enviar(); setTimeout(() => { render(); }, 60); });
    selAparato.addEventListener('change', () => {
        aparato = APARATOS.find(a => a.id === selAparato.value) || aparato;
        ajustar();
    });
    $('pers-w').addEventListener('change', e => { persW = clamp(Number(e.target.value) || 800, [240, 1400]); ajustar(); });
    $('pers-h').addEventListener('change', e => { persH = clamp(Number(e.target.value) || 400, [240, 1400]); ajustar(); });
    campoPie.addEventListener('change', () => {
        empujar();
        const pd = perfilDatos(perfil(), true);
        if (campoPie.value === '') delete pd.pie; else pd.pie = clamp(Number(campoPie.value), LIMITES.pie);
        enviar();
        setTimeout(() => { render(); refrescarPanel(); }, 60);
    });
    $('deshacer').addEventListener('click', deshacer);
    $('descartar').addEventListener('click', () => { empujar(); datos = clonar(original); enviar(); refrescarPanel(); });
    $('restablecer').addEventListener('click', () => {
        if (!elegido) return;
        empujar();
        const pd = perfilDatos(perfil(), false);
        if (pd && pd.botones) delete pd.botones[elegido];
        enviar();
        setTimeout(() => { render(); refrescarPanel(); }, 60);
    });
    btnGuardar.addEventListener('click', guardar);
    $('descargar').addEventListener('click', descargar);

    window.addEventListener('message', e => {
        if (e.origin !== location.origin || e.source !== vista.contentWindow) return;
        if (e.data && e.data.tipo === 'listo') { listo = true; ajustar(); }
        else if (e.data && e.data.tipo === 'aplicado') { render(); if (!arrastre) refrescarPanel(); }
    });
    window.addEventListener('resize', () => { if (listo) ajustar(); });
    window.addEventListener('beforeunload', e => { if (sucio()) { e.preventDefault(); e.returnValue = ''; } });
    window.addEventListener('keydown', e => {
        const t = e.target;
        const escribiendo = t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName);
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !escribiendo) { e.preventDefault(); deshacer(); return; }
        if (escribiendo || !elegido || !/^Arrow/.test(e.key)) return;
        e.preventDefault();
        const paso = e.shiftKey ? 10 : 1;
        const dx = e.key === 'ArrowLeft' ? -paso : e.key === 'ArrowRight' ? paso : 0;
        const dy = e.key === 'ArrowUp' ? -paso : e.key === 'ArrowDown' ? paso : 0;
        const eff = efectivo(elegido);
        const m = medir(elegido, eff);
        if (!m) return;
        const [hl, vl] = LADOS[eff.ancla];
        empujar();
        escribir(elegido, {
            x: clamp(m.x + (hl === 'left' ? dx : -dx), LIMITES.x),
            y: clamp(m.y + (vl === 'top' ? dy : -dy), LIMITES.y)
        });
        enviar();
    });

    // Cuando cambia el idioma, el iframe se recarga para que las etiquetas de los botones salgan en ese idioma
    ctx.alIdioma.push(() => {
        const url = new URL(vista.src, location.href);
        url.searchParams.set('idioma', ctx.idioma);
        listo = false;
        vista.src = url.href;
        pintarLista();
        pintarCampos();
    });

    vista.src = 'vista-tactil.html?idioma=' + ctx.idioma;
    elegir(null);
}
