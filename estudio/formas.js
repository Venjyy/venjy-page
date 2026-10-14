// =========================================================
// VENJY · Estudio · pestaña Formas: las cajas de los bloques que no son un cubo entero (7f-2)
// Edita mundo/datos/formas.json: las cajas (en 1/16 de bloque) de losas, escalones, trampilla, vallas de jardín,
// farol y cartel (malla y choque) y de cama, antorcha, flores, plantas y cultivos (contorno, grietas y rayo);
// además cuánto sube solo el jugador (paso) y el color del contorno y de las grietas. Comparte pantalla con el
// juego: «Darme el bloque» lo deja en tu mano para ponerlo y cada número va en vivo (mensaje `datos`: el mundo
// vuelve a mallar lo cargado). Los valores que muestra son los reales (código + JSON) de mundo/formas.js.
// Guardar escribe con If-Match, como Objetos.
// =========================================================
import { FORMAS_BASE, AJUSTES_BASE, NOMBRES_FORMA, fijarFormas, forma, ajustesFormas } from '../mundo/formas.js';
import { B } from '../mundo/texturas.js';

const clonar = o => JSON.parse(JSON.stringify(o));
const NOMBRE = {
    losa: ['Losa (abajo)', 'Slab (bottom)'], losa_arriba: ['Losa (arriba)', 'Slab (top)'],
    escalones: ['Escalones (parte alta al norte)', 'Stairs (high side north)'],
    trampilla: ['Trampilla cerrada (abajo)', 'Trapdoor closed (bottom)'], trampilla_arriba: ['Trampilla cerrada (arriba)', 'Trapdoor closed (top)'],
    trampilla_abierta: ['Trampilla abierta (lado norte)', 'Trapdoor open (north side)'],
    valla_poste: ['Valla de jardín: poste', 'Garden fence: post'], valla_brazo: ['Valla de jardín: brazo (hacia el norte)', 'Garden fence: arm (north)'],
    farol: ['Farol', 'Lantern'], cartel: ['Cartel', 'Sign'],
    cama: ['Cama (solo contorno y grietas)', 'Bed (outline and cracks only)'], antorcha: ['Antorcha (solo contorno)', 'Torch (outline only)'],
    flor: ['Flores (solo contorno)', 'Flowers (outline only)'], planta: ['Pasto y brotes (solo contorno)', 'Grass and saplings (outline only)'],
    cultivo: ['Cultivos maduros (solo contorno)', 'Grown crops (outline only)']
};
// Qué darte en la mano para probar cada forma (id de bloque o clave de OBJETOS)
const MUESTRA = {
    losa: B.LOSA_PIEDRA, losa_arriba: B.LOSA_PIEDRA, escalones: B.ESCALONES_PIEDRA, trampilla: B.TRAMPILLA, trampilla_arriba: B.TRAMPILLA,
    trampilla_abierta: B.TRAMPILLA, valla_poste: B.VALLA_ABEDUL, valla_brazo: B.VALLA_ABEDUL, farol: 'FAROL_MANO', cartel: 'CARTEL',
    cama: 'CAMA', antorcha: B.ANTORCHA, flor: B.FLOR_ROJA, planta: B.PASTO_ALTO, cultivo: 'SEMILLAS'
};
const EJES = ['x', 'y', 'z'];

export async function montarFormas(ctx) {
    const $ = id => document.getElementById(id);
    const t = (es, en) => (ctx.idioma === 'en' ? en : es);
    const caja = $('fo-campos'), msg = $('fo-mensaje'), btnGuardar = $('fo-guardar'), lista = $('fo-elegir');
    let etag = null, original = null, datos = null;
    try {
        const r = await fetch('../mundo/datos/formas.json', { cache: 'no-cache' });
        etag = r.headers.get('ETag'); original = JSON.parse(await r.text()); datos = clonar(original);
    } catch (e) { caja.textContent = 'No se pudo leer mundo/datos/formas.json'; return; }
    datos.formas = datos.formas || {}; original.formas = original.formas || {};
    fijarFormas(datos);
    const sucio = () => JSON.stringify(datos) !== JSON.stringify(original);
    const rotular = (es, en, clase = '') => { msg.textContent = t(es, en); msg.className = 'mensaje' + (clase ? ' ' + clase : ''); };
    const cambio = () => {
        fijarFormas(datos);
        ctx.puente.enviarDatos('formas', datos);
        btnGuardar.disabled = !sucio() || !ctx.servidor.escritura;
    };
    let sel = 'losa';
    function llenarLista() {
        lista.textContent = '';
        lista.appendChild(new Option(t('General: paso, contorno y grietas', 'General: step, outline and cracks'), '_general'));
        for (const k of NOMBRES_FORMA) lista.appendChild(new Option(t(...NOMBRE[k]) + (datos.formas[k] ? ' *' : ''), k));
        lista.value = sel;
    }

    function numero(etiqueta, valor, min, max, paso, poner) {
        const fila = document.createElement('label'); fila.className = 'campo';
        const s = document.createElement('span'); s.textContent = etiqueta;
        const rg = document.createElement('input'); rg.type = 'range'; rg.min = min; rg.max = max; rg.step = paso; rg.value = valor;
        const n = document.createElement('input'); n.type = 'number'; n.min = min; n.max = max; n.step = paso; n.value = valor; n.style.width = '5em';
        const fijar = v => { if (!Number.isFinite(v)) return; v = Math.min(max, Math.max(min, v)); rg.value = v; n.value = v; poner(v); };
        rg.addEventListener('input', () => fijar(Number(rg.value)));
        n.addEventListener('change', () => fijar(Number(n.value)));
        const d = document.createElement('div'); d.className = 'fila-botones'; d.append(rg, n);
        fila.append(s, d);
        return fila;
    }
    const boton = (es, en, f, clase = 'boton chico secundario') => {
        const b = document.createElement('button'); b.type = 'button'; b.className = clase; b.textContent = t(es, en);
        b.addEventListener('click', f);
        return b;
    };
    const seccion = titulo => {
        const sec = document.createElement('details'); sec.className = 'panel'; sec.open = true;
        const h = document.createElement('summary'); h.textContent = titulo;
        sec.appendChild(h);
        caja.appendChild(sec);
        return sec;
    };

    function pintarGeneral() {
        const a = ajustesFormas();
        const s1 = seccion(t('Jugador', 'Player'));
        s1.appendChild(numero(t('paso: sube solo (bloques; 0 = saltar)', 'step: climbs by itself (blocks; 0 = jump)'), a.paso, 0, 1, 0.05, v => { datos.paso = v; cambio(); }));
        const s2 = seccion(t('Contorno del bloque apuntado', 'Outline of the targeted block'));
        const fila = document.createElement('label'); fila.className = 'campo';
        const sp = document.createElement('span'); sp.textContent = 'color';
        const col = document.createElement('input'); col.type = 'color'; col.value = a.contorno.color;
        col.addEventListener('input', () => { datos.contorno = { ...a.contorno, ...(datos.contorno || {}), color: col.value }; cambio(); });
        fila.append(sp, col);
        s2.appendChild(fila);
        s2.appendChild(numero(t('opacidad', 'opacity'), a.contorno.opacidad, 0, 1, 0.05, v => { datos.contorno = { ...a.contorno, ...(datos.contorno || {}), opacidad: v }; cambio(); }));
        const s3 = seccion(t('Grietas al romper', 'Cracks while breaking'));
        s3.appendChild(numero(t('opacidad', 'opacity'), a.grietas.opacidad, 0, 1, 0.05, v => { datos.grietas = { ...(datos.grietas || {}), opacidad: v }; cambio(); }));
        const volver = boton('Volver a los valores del código', 'Back to the code values', () => {
            datos.paso = AJUSTES_BASE.paso; datos.contorno = clonar(AJUSTES_BASE.contorno); datos.grietas = clonar(AJUSTES_BASE.grietas);
            cambio(); pintar();
        });
        caja.appendChild(volver);
    }

    function pintarForma(k) {
        const real = forma(k);
        // Cada cambio guarda la forma completa (todas sus cajas) para que no dependa del código
        const propia = () => datos.formas[k] || (datos.formas[k] = { cajas: clonar(real.cajas), ...(real.altoChoque ? { altoChoque: real.altoChoque } : {}) });
        const cajas = real.cajas;
        cajas.forEach((c, i) => {
            const sec = seccion(t(`Caja ${i + 1}`, `Box ${i + 1}`) + (c.lado ? ` (${c.lado})` : ''));
            for (const [extremo, es, en] of [['a', 'desde', 'from'], ['b', 'hasta', 'to']]) {
                EJES.forEach((e, j) => sec.appendChild(numero(`${t(es, en)} ${e} (1/16)`, c[extremo][j], 0, 16, 1, v => {
                    const f = propia();
                    f.cajas[i][extremo][j] = v;
                    cambio();
                })));
            }
            if (cajas.length > 1) sec.appendChild(boton('Quitar esta caja', 'Remove this box', () => { const f = propia(); f.cajas.splice(i, 1); cambio(); pintar(); }));
        });
        if (cajas.length < 8) caja.appendChild(boton('Agregar una caja', 'Add a box', () => {
            const f = propia();
            const u = f.cajas[f.cajas.length - 1];
            f.cajas.push({ ...clonar(u), a: [4, 0, 4], b: [12, 8, 12] });
            cambio(); pintar();
        }));
        if (FORMAS_BASE[k].altoChoque) {
            const sec = seccion(t('Choque', 'Collision'));
            sec.appendChild(numero(t('alto al chocar (1/16; 24 = 1,5 bloques)', 'collision height (1/16; 24 = 1.5 blocks)'), real.altoChoque, 1, 32, 1, v => { propia().altoChoque = v; cambio(); }));
        }
        if (datos.formas[k]) caja.appendChild(boton('Volver al valor del código', 'Back to the code value', () => { delete datos.formas[k]; cambio(); pintar(); }));
    }

    function pintar() {
        caja.textContent = '';
        llenarLista();
        if (sel === '_general') pintarGeneral(); else pintarForma(sel);
        btnGuardar.disabled = !sucio() || !ctx.servidor.escritura;
    }
    async function guardar() {
        rotular('Guardando…', 'Saving…');
        try {
            const resp = await fetch('../api/datos/formas', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Estudio': '1', 'If-Match': etag || '*' }, body: JSON.stringify(datos) });
            const j = await resp.json().catch(() => ({}));
            if (resp.ok) { original = clonar(datos); etag = j.etag; rotular(`Guardado (${j.bytes} B).`, `Saved (${j.bytes} B).`, 'ok'); }
            else if (resp.status === 412) rotular('El archivo cambió en disco: recarga el Estudio.', 'The file changed on disk: reload the Studio.', 'error');
            else rotular(`No se guardó (${resp.status}): ${(j.errores || []).slice(0, 2).join(' · ') || j.error || ''}`, `Not saved (${resp.status})`, 'error');
        } catch (e) { rotular('No se pudo hablar con el servidor.', 'Could not reach the server.', 'error'); }
        btnGuardar.disabled = !sucio() || !ctx.servidor.escritura;
    }
    async function enMano() {
        const m = MUESTRA[sel] ?? B.LOSA_PIEDRA;
        try {
            await ctx.puente.enviar('objeto', { clave: String(m) });
            ctx.puente.enviarDatos('formas', datos);
            rotular('Listo: ponlo en el mundo y mueve los números (el mundo se vuelve a dibujar solo).', 'Done: place it and move the numbers (the world redraws by itself).', 'ok');
        } catch (e) { rotular(e.message, e.message, 'error'); }
    }
    lista.addEventListener('change', () => { sel = lista.value; pintar(); });
    $('fo-mano').addEventListener('click', enMano);
    $('fo-descartar').addEventListener('click', () => { datos = clonar(original); cambio(); pintar(); });
    btnGuardar.addEventListener('click', guardar);
    window.addEventListener('keydown', e => {
        if (ctx.pestana === 'formas' && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); if (!btnGuardar.disabled) guardar(); }
    });
    window.addEventListener('beforeunload', e => { if (sucio()) { e.preventDefault(); e.returnValue = ''; } });
    ctx.alIdioma.push(pintar);
    pintar();
}
