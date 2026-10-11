// =========================================================
// VENJY · Estudio · editor de posiciones (fase 4)
// Edita mundo/datos/posiciones.json (dónde está parada cada persona, relativo a su lugar). Comparte pantalla con
// el juego (pestaña Posiciones = el iframe de la pestaña Juego más este panel): se elige a alguien, el juego le
// pone un gizmo (estudio/gizmo-juego.js) y al soltarlo manda `cambio` con el punto nuevo. Los campos numéricos
// hacen lo mismo sin arrastrar. Cada cambio se aplica en vivo (mensaje `datos`); Guardar escribe el JSON con
// If-Match. Contrato: estudio/DISENO.md §6 y §12.
// =========================================================
import { formatear } from './formato.mjs';
import { GIRO_CALCULADO } from '../mundo/datos/posiciones.js';

const NOMBRES = {
    hadad: 'Hadad', andy: 'Andy', nacho: 'Nacho', moises: 'Moisés', lalo: 'Lalo', boris: 'Boris', lucho: 'Lucho',
    braulio: 'Braulio', conejeros: 'Conejeros'
};
const ANCLAS = [
    ['campamento', 'Campamento', 'Campsite'], ['iglu', 'Iglú', 'Igloo'], ['atalaya', 'Atalaya del bosque', 'Forest watchtower'],
    ['naufragio', 'Naufragio', 'Shipwreck'], ['molino', 'Molino viejo', 'Old windmill'], ['portal', 'Portal en ruinas', 'Ruined portal'],
    ['escenario', 'Escenario de Salonas', 'Salonas stage'], ['faro', 'Faro', 'Lighthouse']
];
const nombreDe = c => NOMBRES[c] || c;
const clonar = o => JSON.parse(JSON.stringify(o));
const CAMPOS_NUM = ['dx', 'dy', 'dz', 'giro'];

export async function montarPosiciones(ctx) {
    const $ = id => document.getElementById(id);
    const t = (es, en) => (ctx.idioma === 'en' ? en : es);
    const sel = $('ps-persona'), msg = $('ps-mensaje'), btnGuardar = $('ps-guardar');
    const campo = { ancla: $('ps-ancla'), marco: $('ps-marco'), dx: $('ps-dx'), dy: $('ps-dy'), dz: $('ps-dz'), giro: $('ps-giro'), nota: $('ps-nota') };

    const r = await fetch('../mundo/datos/posiciones.json', { cache: 'no-cache' });
    let etag = r.headers.get('ETag');
    let original = JSON.parse(await r.text());
    let datos = clonar(original);
    let actual = Object.keys(datos.personas)[0] || null;
    let modo = 'mover';
    const historial = [];

    const sucio = () => JSON.stringify(datos) !== JSON.stringify(original);
    function rotular(es, en, clase = '') { msg.textContent = t(es, en); msg.className = 'mensaje' + (clase ? ' ' + clase : ''); }
    const enviarAlJuego = () => ctx.puente.enviarDatos('posiciones', datos);
    const listoElJuego = () => ctx.puente.estado.listo;

    // ---------- Pintar ----------
    function pintarLista() {
        const guardada = actual;
        sel.textContent = '';
        for (const clave of Object.keys(datos.personas)) {
            const o = document.createElement('option');
            o.value = clave;
            const cambiado = JSON.stringify(datos.personas[clave]) !== JSON.stringify(original.personas[clave]);
            o.textContent = nombreDe(clave) + (cambiado ? ' •' : '');
            sel.appendChild(o);
        }
        if (guardada && datos.personas[guardada]) sel.value = guardada;
    }
    function pintarCampos() {
        const p = actual && datos.personas[actual];
        const cuerpo = $('ps-campos');
        cuerpo.hidden = !p;
        if (!p) return;
        campo.ancla.value = p.ancla;
        campo.marco.value = p.marco === 'ancla' ? 'ancla' : 'lugar';
        const suelo = p.dy === 'suelo';
        $('ps-suelo').checked = suelo;
        campo.dy.disabled = suelo;
        campo.dx.value = p.dx; campo.dz.value = p.dz; campo.giro.value = p.giro ?? 0;
        campo.dy.value = suelo ? '' : p.dy ?? 0;
        campo.nota.value = p.nota || '';
        const calc = GIRO_CALCULADO[actual];
        $('ps-giro-nota').hidden = !calc;
        $('ps-giro-nota').textContent = calc ? t(`El juego calcula hacia dónde mira: ${calc}. El giro no se usa.`, `The game works out where they look: ${calc}. Rotation is not used.`) : '';
        const meta = original.personas[actual];
        $('ps-restablecer').disabled = JSON.stringify(p) === JSON.stringify(meta);
        for (const b of document.querySelectorAll('[data-modo]')) b.classList.toggle('activo', b.dataset.modo === modo);
    }
    function pintarResumen() {
        const n = Object.keys(datos.personas).filter(k => JSON.stringify(datos.personas[k]) !== JSON.stringify(original.personas[k])).length;
        btnGuardar.disabled = !ctx.servidor.escritura || !sucio();
        $('ps-deshacer').disabled = !historial.length;
        $('ps-descartar').disabled = !sucio();
        $('ps-resumen').textContent = n ? t(`${n} persona(s) con cambios sin guardar.`, `${n} person(s) with unsaved changes.`) : t('Sin cambios.', 'No changes.');
    }
    function pintar() { pintarLista(); pintarCampos(); pintarResumen(); }

    // ---------- Cambios ----------
    function snapshot() { historial.push(JSON.stringify(datos)); if (historial.length > 60) historial.shift(); }
    function aplicar(punto, desdeJuego = false) {
        snapshot();
        datos.personas[actual] = punto;
        pintar();
        if (!desdeJuego) enviarAlJuego();
    }
    // Un campo del editor: se reconstruye el punto en el orden estable del archivo (ancla, marco, dx, dy, dz, giro, nota)
    function desdeCampos() {
        const p = datos.personas[actual];
        const punto = { ancla: campo.ancla.value };
        if (campo.marco.value === 'ancla') punto.marco = 'ancla';
        const num = (el, previo) => (Number.isFinite(el.valueAsNumber) ? el.valueAsNumber : previo);
        punto.dx = num(campo.dx, p.dx);
        punto.dy = $('ps-suelo').checked ? 'suelo' : num(campo.dy, typeof p.dy === 'number' ? p.dy : 0);
        punto.dz = num(campo.dz, p.dz);
        if (p.giro !== undefined || Number(campo.giro.value) !== 0) punto.giro = num(campo.giro, p.giro ?? 0);
        const nota = campo.nota.value.trim();
        if (nota) punto.nota = nota;
        return punto;
    }
    function alCampo() {
        if (!actual) return;
        const nuevo = desdeCampos();
        if (JSON.stringify(nuevo) === JSON.stringify(datos.personas[actual])) return;
        aplicar(nuevo);
    }

    // ---------- Gizmo ----------
    async function ponerGizmo() {
        if (!actual) return;
        if (!listoElJuego()) { rotular('El juego todavía no está listo: espera a que cargue el mundo.', 'The game is not ready yet: wait for the world to load.', 'error'); return; }
        try {
            rotular('Poniendo el gizmo…', 'Placing the gizmo…');
            await ctx.puente.enviar('datos', { nombre: 'posiciones', datos });
            if ($('ps-ir-junto').checked) await ctx.puente.tp(actual);
            await ctx.puente.enviar('elegir', { objeto: 'persona', clave: actual, modo: modo === 'girar' ? 'girar' : 'mover' });
            rotular(`Gizmo en ${nombreDe(actual)}: arrástralo en el juego (Esc suelta el mouse).`, `Gizmo on ${nombreDe(actual)}: drag it in the game (Esc frees the mouse).`, 'ok');
        } catch (e) {
            rotular(e.message, e.message, 'error');
        }
    }
    async function quitarGizmo() {
        if (!listoElJuego()) return;
        try { await ctx.puente.enviar('elegir', { objeto: 'nada' }); } catch (e) { /* sin juego: nada que quitar */ }
    }

    // ---------- Guardar ----------
    async function guardar() {
        rotular('Guardando…', 'Saving…');
        try {
            const resp = await fetch('../api/datos/posiciones', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'X-Estudio': '1', 'If-Match': etag || '*' },
                body: JSON.stringify(datos)
            });
            const j = await resp.json().catch(() => ({}));
            if (resp.ok) {
                original = clonar(datos);
                etag = j.etag;
                historial.length = 0;
                rotular(`Guardado (${j.bytes} B).`, `Saved (${j.bytes} B).`, 'ok');
            } else if (resp.status === 412) {
                rotular('El archivo cambió en disco: recarga y vuelve a mover.', 'The file changed on disk: reload and move again.', 'error');
            } else if (resp.status === 422 && j.errores) {
                const e = j.errores.slice(0, 3).join(' · ');
                rotular('No se guardó: ' + e, 'Not saved: ' + e, 'error');
            } else {
                rotular(`No se guardó (${resp.status}): ${j.error || ''}`, `Not saved (${resp.status}): ${j.error || ''}`, 'error');
            }
        } catch (e) {
            rotular('No se pudo hablar con el servidor.', 'Could not reach the server.', 'error');
        }
        pintar();
    }
    function descargar() {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([formatear(datos)], { type: 'application/json' }));
        a.download = 'posiciones.json';
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    }
    function reemplazar(nuevo) {
        datos = nuevo;
        if (!datos.personas[actual]) actual = Object.keys(datos.personas)[0] || null;
        pintar();
        enviarAlJuego();
    }

    // ---------- Arranque ----------
    for (const [v, es, en] of ANCLAS) {
        const o = document.createElement('option');
        o.value = v; o.dataset.es = `${es} (${v})`; o.dataset.en = `${en} (${v})`; o.textContent = ctx.idioma === 'en' ? o.dataset.en : o.dataset.es;
        campo.ancla.appendChild(o);
    }
    sel.addEventListener('change', () => { actual = sel.value; pintarCampos(); if (!$('seccion-juego').hidden && ctx.pestana === 'posiciones') ponerGizmo(); });
    for (const k of [...CAMPOS_NUM, 'nota']) campo[k].addEventListener('change', alCampo);
    campo.ancla.addEventListener('change', alCampo);
    campo.marco.addEventListener('change', alCampo);
    $('ps-suelo').addEventListener('change', alCampo);
    for (const b of document.querySelectorAll('[data-modo]')) b.addEventListener('click', () => { modo = b.dataset.modo; pintarCampos(); ponerGizmo(); });
    $('ps-quitar').addEventListener('click', () => { quitarGizmo(); rotular('Gizmo quitado.', 'Gizmo removed.'); });
    $('ps-ir').addEventListener('click', async () => {
        try { await ctx.puente.tp(actual); rotular(`Junto a ${nombreDe(actual)}.`, `Next to ${nombreDe(actual)}.`, 'ok'); } catch (e) { rotular(e.message, e.message, 'error'); }
    });
    $('ps-restablecer').addEventListener('click', () => { aplicar(clonar(original.personas[actual])); });
    $('ps-deshacer').addEventListener('click', () => { if (historial.length) reemplazar(JSON.parse(historial.pop())); });
    $('ps-descartar').addEventListener('click', () => { snapshot(); reemplazar(clonar(original)); });
    btnGuardar.addEventListener('click', guardar);
    $('ps-descargar').addEventListener('click', descargar);

    // El juego avisa cuando se suelta el gizmo
    ctx.puente.alMensaje(m => {
        if (m.tipo !== 'cambio' || m.nombre !== 'posiciones' || !m.valor) return;
        const clave = String(m.ruta || '').replace(/^personas\./, '');
        if (!datos.personas[clave]) return;
        actual = clave;
        aplicar(m.valor, true);
        enviarAlJuego(); // el juego guarda lo que el editor tiene como «previo» (ancla, marco, nota)
        rotular(`${nombreDe(clave)}: ${m.valor.dx}, ${m.valor.dy}, ${m.valor.dz}, giro ${m.valor.giro}.`, `${nombreDe(clave)}: ${m.valor.dx}, ${m.valor.dy}, ${m.valor.dz}, rotation ${m.valor.giro}.`, 'ok');
    });
    ctx.alPestana.push(clave => {
        if (clave === 'posiciones') ponerGizmo(); else quitarGizmo();
    });
    window.addEventListener('beforeunload', e => { if (sucio()) { e.preventDefault(); e.returnValue = ''; } });
    window.addEventListener('keydown', e => {
        if (ctx.pestana !== 'posiciones') return;
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); if (!btnGuardar.disabled) guardar(); }
    });
    ctx.alIdioma.push(() => {
        for (const o of campo.ancla.options) o.textContent = o.dataset[ctx.idioma] || o.dataset.es;
        pintarCampos(); pintarResumen();
    });
    pintar();
}
