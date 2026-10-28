// =========================================================
// VENJY · Estudio · editor de posiciones (fase 4)
// Edita mundo/datos/posiciones.json (dónde está parada cada persona, relativo a su lugar). Comparte pantalla con
// el juego (pestaña Posiciones = el iframe de la pestaña Juego más este panel): se elige a alguien, el juego le
// pone un gizmo (estudio/gizmo-juego.js) y al soltarlo manda `cambio` con el punto nuevo. Los campos numéricos
// hacen lo mismo sin arrastrar. Cada cambio se aplica en vivo (mensaje `datos`); Guardar escribe el JSON con
// If-Match. Contrato: estudio/DISENO.md §6 y §12.
// B6e: sección «Construcciones» (posiciones.json → lugares.<clave> = { x, z }): el gizmo de lugares (gizmo-lugar.js)
// mueve una caja del tamaño del sitio; la construcción se arma en su sitio nuevo al guardar (el juego se recarga).
// Giro (lugares.<clave>.giro, 0/90/180/270): botón «Girar 90°»; el escenario y los corrales se orientan solos. Las
// construcciones nuevas de construcciones.json salen en la misma lista: «Mover con el gizmo» la pone frente al jugador.
// «Guardar como construcción» (§44, parte 3): el juego marca dos esquinas con la mira y copia la zona (zona-juego.js); aquí
// se pide el nombre y se suma a construcciones.json (PUT con If-Match). El nombre en inglés, después, en Avanzado.
// Vista simple: persona, lugar y los botones; los números (dx, dy, dz, giro, x, z), la puerta y las notas, en Avanzado.
// =========================================================
import { formatear } from './formato.mjs';
import { GIRO_CALCULADO, CONSTRUCCIONES } from '../mundo/datos/posiciones.js';
import { personasNuevas, lugarDe, nombreDe as nombrePersonaje } from '../mundo/datos/personajes.js';
import { propiasDe, claveDe } from '../mundo/datos/construcciones.js';

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
    // B5: las personas nuevas de personajes.json salen en la lista con su lugar de ahí; si nadie las mueve, no se escriben
    // en posiciones.json (su lugar base sigue en personajes.json). Al moverlas, posiciones.json suma su clave y gana.
    const basePersonajes = {};
    try {
        const rp = await fetch('../mundo/datos/personajes.json', { cache: 'no-cache' });
        for (const { clave, def } of personasNuevas(await rp.json())) {
            NOMBRES[clave] = nombrePersonaje(clave, def);
            if (!original.personas[clave]) { basePersonajes[clave] = lugarDe(def); original.personas[clave] = clonar(basePersonajes[clave]); }
        }
    } catch (e) { /* sin personajes.json: solo los del código */ }
    const paraGuardar = () => {
        const d = clonar(datos);
        if (d.lugares && !Object.keys(d.lugares).length) delete d.lugares; // sin construcciones movidas no se escribe la clave
        for (const [k, b] of Object.entries(basePersonajes)) if (JSON.stringify(d.personas[k]) === JSON.stringify(b)) delete d.personas[k];
        return d;
    };
    // Construcciones nuevas (construcciones.json, sin borrador): se ponen, mueven y giran como las del código
    let propias = {};
    try { propias = propiasDe(await (await fetch('../mundo/datos/construcciones.json', { cache: 'no-cache' })).json()); } catch (e) { /* sin archivo: solo las del código */ }
    let datos = clonar(original);
    let actual = Object.keys(datos.personas)[0] || null;
    let modo = 'mover';
    const historial = [];
    let lugar = Object.keys(CONSTRUCCIONES)[0];
    const lugarCampo = { sel: $('ps-lugar'), x: $('ps-lugar-x'), z: $('ps-lugar-z'), giro: $('ps-lugar-giro'), nota: $('ps-lugar-nota'), estado: $('ps-lugar-estado') };
    const idi = () => (ctx.idioma === 'en' ? 'en' : 'es');
    const nombreLugar = c => (CONSTRUCCIONES[c] ? CONSTRUCCIONES[c][idi()] : propias[c] ? propias[c].nombre[idi()] : c);
    const clavesLugar = () => [...Object.keys(CONSTRUCCIONES), ...Object.keys(propias).filter(k => !CONSTRUCCIONES[k])];
    const defLugar = c => CONSTRUCCIONES[c] || propias[c] || null;
    const gira = c => !!(propias[c] || (CONSTRUCCIONES[c] && CONSTRUCCIONES[c].gira));
    const PUERTA = { 0: ['al sur', 'south'], 90: ['al este', 'east'], 180: ['al norte', 'north'], 270: ['al oeste', 'west'] };
    const lugaresDe = d => d.lugares || {};

    const sucio = () => JSON.stringify(datos) !== JSON.stringify(original);
    ctx.sucios.posiciones = sucio; // punto en la pestaña (campo-comun.js, B0-C)
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
    function pintarLugares() {
        const sel = lugarCampo.sel;
        sel.textContent = '';
        for (const clave of clavesLugar()) {
            const o = document.createElement('option');
            o.value = clave;
            const cambiado = JSON.stringify(lugaresDe(datos)[clave]) !== JSON.stringify(lugaresDe(original)[clave]);
            const marca = propias[clave] ? (lugaresDe(datos)[clave] ? t('nueva', 'new') : t('nueva, sin poner', 'new, not placed')) : lugaresDe(datos)[clave] ? t('movida', 'moved') : '';
            o.textContent = nombreLugar(clave) + (marca ? ` (${marca})` : '') + (cambiado ? ' •' : '');
            sel.appendChild(o);
        }
        sel.value = lugar;
        const p = lugaresDe(datos)[lugar];
        lugarCampo.x.value = p ? p.x : '';
        lugarCampo.z.value = p ? p.z : '';
        const g = (p && p.giro) || 0;
        lugarCampo.giro.value = String(g);
        lugarCampo.giro.disabled = !p || !gira(lugar);
        lugarCampo.nota.value = (p && p.nota) || '';
        lugarCampo.nota.disabled = !p;
        $('ps-lugar-auto').disabled = !p;
        $('ps-lugar-auto').textContent = propias[lugar] ? t('Sacarla del mundo', 'Take it out of the world') : t('Volver a su sitio de siempre', 'Back to its usual spot');
        $('ps-lugar-girar').disabled = !gira(lugar);
        $('ps-lugar-en-campo').hidden = !propias[lugar];
        if (propias[lugar]) $('ps-lugar-en').value = propias[lugar].nombre.en;
        $('ps-lugar-en').disabled = !ctx.servidor.escritura;
        const puerta = t(` Puerta ${PUERTA[g][0]}.`, ` Door facing ${PUERTA[g][1]}.`);
        lugarCampo.estado.textContent = !gira(lugar) && !p
            ? t('En su sitio de siempre (el juego lo busca solo). No gira: se orienta solo.', 'In its usual spot (the game finds it by itself). It does not turn: it faces the right way by itself.')
            : propias[lugar] && !p
                ? t('Todavía no está en el mundo: «Mover con el gizmo» la pone frente a ti.', 'Not in the world yet: «Move with the gizmo» puts it in front of you.')
                : p
                    ? t(`Movida: su centro va en ${p.x}, ${p.z}.`, `Moved: its center goes at ${p.x}, ${p.z}.`) + (gira(lugar) ? puerta : '')
                    : t('En su sitio de siempre (el juego lo busca solo).', 'In its usual spot (the game finds it by itself).');
    }
    function pintarResumen() {
        const n = Object.keys(datos.personas).filter(k => JSON.stringify(datos.personas[k]) !== JSON.stringify(original.personas[k])).length
            + clavesLugar().filter(k => JSON.stringify(lugaresDe(datos)[k]) !== JSON.stringify(lugaresDe(original)[k])).length;
        btnGuardar.disabled = !ctx.servidor.escritura || !sucio();
        $('ps-deshacer').disabled = !historial.length;
        $('ps-descartar').disabled = !sucio();
        $('ps-resumen').textContent = n ? t(`${n} cambio(s) sin guardar.`, `${n} unsaved change(s).`) : t('Sin cambios.', 'No changes.');
    }
    function pintar() { pintarLista(); pintarCampos(); pintarLugares(); pintarResumen(); }

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

    // ---------- Construcciones (B6e) ----------
    // p: { x, z, giro? } nuevo o null (vuelve a su sitio de siempre). El giro (si p no lo trae) y la nota se conservan
    // mientras siga movida; giro 0 no se escribe.
    function moverLugar(clave, p, desdeJuego = false) {
        snapshot();
        const previo = lugaresDe(datos)[clave];
        if (!datos.lugares) datos.lugares = {};
        const giro = p && p.giro !== undefined ? Number(p.giro) : (previo && previo.giro) || 0;
        if (p) datos.lugares[clave] = { x: Math.round(p.x), z: Math.round(p.z), ...(giro && gira(clave) ? { giro } : {}), ...(previo && previo.nota ? { nota: previo.nota } : {}) };
        else delete datos.lugares[clave];
        if (!Object.keys(datos.lugares).length && !original.lugares) delete datos.lugares; // sin cambios vuelve a estar limpio
        lugar = clave;
        pintar();
        if (!desdeJuego) enviarAlJuego();
    }
    async function gizmoLugar(ir) {
        if (!listoElJuego()) { rotular('El juego todavía no está listo: espera a que cargue el mundo.', 'The game is not ready yet: wait for the world to load.', 'error'); return; }
        try {
            await ctx.puente.enviar('datos', { nombre: 'posiciones', datos });
            const r = await ctx.puente.enviar('elegir', { objeto: 'lugar', clave: lugar });
            const c = r && r.punto;
            // Nueva sin poner: el gizmo la deja frente al jugador y ese punto queda como su sitio
            if (c && propias[lugar] && !lugaresDe(datos)[lugar]) moverLugar(lugar, c);
            if (ir && c) {
                await ctx.puente.tp({ x: c.x + 0.5, z: c.z + defLugar(lugar).d / 2 + 10 });
                await ctx.puente.enviar('elegir', { objeto: 'lugar', clave: lugar }); // vuelve a mirar la caja desde donde quedaste
            }
            rotular(`Gizmo en ${nombreLugar(lugar)}: arrastra la caja amarilla (Esc suelta el mouse).`, `Gizmo on ${nombreLugar(lugar)}: drag the yellow box (Esc frees the mouse).`, 'ok');
        } catch (e) {
            rotular(e.message, e.message, 'error');
        }
    }
    // Girar 90°: si no estaba movida, primero toma su centro de hoy (lo da el gizmo)
    async function girarLugar() {
        if (!gira(lugar)) return;
        let p = lugaresDe(datos)[lugar];
        if (!p) {
            if (!listoElJuego()) { rotular('El juego todavía no está listo: espera a que cargue el mundo.', 'The game is not ready yet: wait for the world to load.', 'error'); return; }
            try {
                await ctx.puente.enviar('datos', { nombre: 'posiciones', datos });
                const r = await ctx.puente.enviar('elegir', { objeto: 'lugar', clave: lugar });
                p = r && r.punto;
            } catch (e) { rotular(e.message, e.message, 'error'); return; }
            if (!p) return;
        }
        const giro = ((Number(p.giro) || 0) + 90) % 360;
        moverLugar(lugar, { x: p.x, z: p.z, giro });
        rotular(`${nombreLugar(lugar)}: puerta ${PUERTA[giro][0]}. Guarda para verla así.`, `${nombreLugar(lugar)}: door facing ${PUERTA[giro][1]}. Save to see it.`, 'ok');
    }
    // ---------- Guardar como construcción (§44, parte 3) ----------
    // construcciones.json se lee de nuevo justo antes de escribir (ETag fresco) y solo se le suma o cambia una clave
    async function escribirConstrucciones(cambiar) {
        const r = await fetch('../mundo/datos/construcciones.json', { cache: 'no-cache' });
        if (!r.ok) throw new Error(t('No se pudo leer construcciones.json.', 'Could not read construcciones.json.'));
        const etagC = r.headers.get('ETag');
        const json = await r.json();
        cambiar(json);
        const resp = await fetch('../api/datos/construcciones', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'X-Estudio': '1', 'If-Match': etagC || '*' },
            body: JSON.stringify(json)
        });
        const j = await resp.json().catch(() => ({}));
        if (resp.status === 412) throw new Error(t('construcciones.json cambió mientras guardabas: vuelve a intentarlo.', 'construcciones.json changed while saving: try again.'));
        if (resp.status === 422 && j.errores) throw new Error(t('No se guardó: ', 'Not saved: ') + j.errores.slice(0, 3).join(' · '));
        if (!resp.ok) throw new Error(t(`No se guardó (${resp.status}): `, `Not saved (${resp.status}): `) + (j.error || ''));
        propias = propiasDe(json);
        return json;
    }
    const zonaEstado = (es, en, clase = '') => { const p = $('ps-zona-estado'); p.textContent = t(es, en); p.className = 'mensaje' + (clase ? ' ' + clase : ''); };
    let zonaLista = false; // dos esquinas que se pueden copiar
    function pintarZona() {
        $('ps-zona-guardar').disabled = !zonaLista || !$('ps-zona-nombre').value.trim() || !ctx.servidor.escritura;
    }
    async function marcarEsquina() {
        if (!listoElJuego()) { zonaEstado('El juego todavía no está listo: espera a que cargue el mundo.', 'The game is not ready yet: wait for the world to load.', 'error'); return; }
        try {
            const r = (await ctx.puente.enviar('zona', { accion: 'marcar' })).zona;
            zonaLista = r.esquinas === 2 && !r.error;
            if (r.esquinas === 1) zonaEstado('Primera esquina marcada. Ahora mira el suelo de la esquina opuesta y vuelve a marcar.', 'First corner marked. Now look at the ground of the opposite corner and mark again.', 'ok');
            else if (r.error) zonaEstado(`La zona no sirve: ${r.error}. Marca de nuevo.`, `That area does not work: ${r.error}. Mark again.`, 'error');
            else zonaEstado(`Zona de ${r.ancho}×${r.fondo} y ${r.alto} de alto (${r.bloques} bloques). Ponle nombre y guárdala.`, `Area of ${r.ancho}×${r.fondo}, ${r.alto} high (${r.bloques} blocks). Name it and save it.`, 'ok');
        } catch (e) { zonaLista = false; zonaEstado(e.message, e.message, 'error'); }
        pintarZona();
    }
    async function guardarZona() {
        const nombre = $('ps-zona-nombre').value.trim();
        if (!nombre || !zonaLista) return;
        $('ps-zona-guardar').disabled = true;
        zonaEstado('Guardando…', 'Saving…');
        try {
            const r = (await ctx.puente.enviar('zona', { accion: 'copiar' })).zona;
            let clave = null;
            await escribirConstrucciones(json => {
                if (!json.construcciones) json.construcciones = {};
                clave = claveDe(nombre, [...Object.keys(CONSTRUCCIONES), ...Object.keys(json.construcciones)]);
                // El inglés se completa después (Avanzado → Nombre en inglés); mientras, el juego muestra el español
                json.construcciones[clave] = { nombre: { es: nombre, en: nombre }, bloques: r.bloques };
            });
            await ctx.puente.enviar('zona', { accion: 'quitar' }).catch(() => {});
            zonaLista = false;
            $('ps-zona-nombre').value = '';
            lugar = clave;
            pintar();
            zonaEstado(`«${nombre}» guardada (${r.bloques.length} bloques). Elígela arriba y pulsa «Mover con el gizmo» para ponerla en el mundo.`, `«${nombre}» saved (${r.bloques.length} blocks). Pick it above and press «Move with the gizmo» to put it in the world.`, 'ok');
        } catch (e) { zonaEstado(e.message, e.message, 'error'); }
        pintarZona();
    }
    async function nombreIngles() {
        const en = $('ps-lugar-en').value.trim(), clave = lugar;
        if (!propias[clave]) return;
        try {
            await escribirConstrucciones(json => {
                const c = json.construcciones && json.construcciones[clave];
                if (!c) throw new Error(t('Esa construcción ya no está en construcciones.json.', 'That building is no longer in construcciones.json.'));
                c.nombre = { es: (c.nombre && c.nombre.es) || clave, en: en || (c.nombre && c.nombre.es) || clave };
            });
            pintar();
            rotular('Nombre en inglés guardado.', 'English name saved.', 'ok');
        } catch (e) { rotular(e.message, e.message, 'error'); }
    }
    function alCampoLugar() {
        const x = lugarCampo.x.valueAsNumber, z = lugarCampo.z.valueAsNumber;
        if (!Number.isFinite(x) || !Number.isFinite(z)) return;
        moverLugar(lugar, { x, z });
    }

    // ---------- Guardar ----------
    async function guardar() {
        rotular('Guardando…', 'Saving…');
        try {
            const resp = await fetch('../api/datos/posiciones', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'X-Estudio': '1', 'If-Match': etag || '*' },
                body: JSON.stringify(paraGuardar())
            });
            const j = await resp.json().catch(() => ({}));
            if (resp.ok) {
                const conLugares = JSON.stringify(lugaresDe(datos)) !== JSON.stringify(lugaresDe(original));
                original = clonar(datos);
                etag = j.etag;
                historial.length = 0;
                if (conLugares) rotular(`Guardado (${j.bytes} B). El juego se recarga para armar las construcciones en su sitio.`, `Saved (${j.bytes} B). The game reloads to build the buildings in their spot.`, 'ok');
                else rotular(`Guardado (${j.bytes} B).`, `Saved (${j.bytes} B).`, 'ok');
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
        a.href = URL.createObjectURL(new Blob([formatear(paraGuardar())], { type: 'application/json' }));
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

    lugarCampo.sel.addEventListener('change', () => { lugar = lugarCampo.sel.value; pintarLugares(); if (ctx.pestana === 'posiciones' && listoElJuego()) gizmoLugar(false); });
    $('ps-lugar-mover').addEventListener('click', () => gizmoLugar(false));
    $('ps-lugar-ir').addEventListener('click', () => gizmoLugar(true));
    $('ps-lugar-girar').addEventListener('click', girarLugar);
    lugarCampo.giro.addEventListener('change', () => { const p = lugaresDe(datos)[lugar]; if (p) moverLugar(lugar, { x: p.x, z: p.z, giro: Number(lugarCampo.giro.value) }); });
    $('ps-lugar-auto').addEventListener('click', () => { moverLugar(lugar, null); rotular(`${nombreLugar(lugar)} vuelve a su sitio de siempre al guardar.`, `${nombreLugar(lugar)} goes back to its usual spot when you save.`, 'ok'); });
    $('ps-lugar-en').addEventListener('change', nombreIngles);
    $('ps-zona-marcar').addEventListener('click', marcarEsquina);
    $('ps-zona-quitar').addEventListener('click', async () => {
        zonaLista = false;
        pintarZona();
        try { await ctx.puente.enviar('zona', { accion: 'quitar' }); zonaEstado('Marcas borradas.', 'Marks cleared.'); } catch (e) { zonaEstado(e.message, e.message, 'error'); }
    });
    $('ps-zona-nombre').addEventListener('input', pintarZona);
    $('ps-zona-guardar').addEventListener('click', guardarZona);
    lugarCampo.x.addEventListener('change', alCampoLugar);
    lugarCampo.z.addEventListener('change', alCampoLugar);
    lugarCampo.nota.addEventListener('change', () => {
        const p = lugaresDe(datos)[lugar];
        if (!p) return;
        snapshot();
        const nota = lugarCampo.nota.value.trim();
        datos.lugares[lugar] = { x: p.x, z: p.z, ...(p.giro ? { giro: p.giro } : {}), ...(nota ? { nota } : {}) };
        pintar();
    });

    // El juego avisa cuando se suelta el gizmo
    ctx.puente.alMensaje(m => {
        if (m.tipo !== 'cambio' || m.nombre !== 'posiciones' || !m.valor) return;
        if (String(m.ruta || '').startsWith('lugares.')) {
            const clave = m.ruta.slice(8);
            if (!defLugar(clave)) return;
            moverLugar(clave, m.valor, true);
            rotular(`${nombreLugar(clave)}: ${m.valor.x}, ${m.valor.z}. Guarda para verla ahí.`, `${nombreLugar(clave)}: ${m.valor.x}, ${m.valor.z}. Save to see it there.`, 'ok');
            return;
        }
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
    pintarZona();
}
