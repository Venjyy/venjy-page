// =========================================================
// VENJY · Estudio · pestaña Vida: cómo caminan los amigos cuando dejan su sitio (6d etapa 2)
// Edita mundo/datos/navegacion.json: `caminar` (buscar camino sobre el terreno y seguirlo, mundo/navegacion.js) y
// `paseo` (animación, volver al sitio, visitas; mundo/supervivencia/paseos-datos.js). Comparte pantalla con el
// juego: «Probar» manda a una persona a un destino (mensaje `caminar`) y cada número va en vivo (mensaje `datos`).
// Los valores que muestra son los reales (código + JSON). Guardar escribe con If-Match, como Formas.
// Las rutinas y visitas por horario (PR 2 de 6d etapa 2) se suman aquí.
// =========================================================
import { NAV_BASE } from '../mundo/navegacion.js';
import { PASEO_BASE } from '../mundo/supervivencia/paseos-datos.js';

const clonar = o => JSON.parse(JSON.stringify(o));
// [es, en, min, max, paso] de cada campo (los textos largos están en el esquema)
const CAMINAR = {
    velocidad: ['velocidad (bloques/s)', 'speed (blocks/s)', 0.5, 6, 0.1],
    subida: ['sube de un paso (bloques)', 'steps up (blocks)', 0, 2, 1],
    caida: ['se deja caer (bloques)', 'drops down (blocks)', 1, 6, 1],
    alto: ['alto libre que necesita (bloques)', 'free height needed (blocks)', 1, 3, 1],
    costoSubida: ['costo de subir (más = rodea cerros)', 'climb cost (more = goes around hills)', 0, 5, 0.1],
    costoBajada: ['costo de bajar', 'drop cost', 0, 5, 0.05],
    costoAgua: ['costo de pisar agua bajita (0 = nunca)', 'shallow water cost (0 = never)', 0, 30, 1],
    codicia: ['codicia (1 = camino más corto; más = busca más rápido)', 'greed (1 = shortest path; more = faster search)', 1, 3, 0.05],
    nodosPorCuadro: ['nodos de búsqueda por cuadro (rendimiento)', 'search nodes per frame (performance)', 100, 10000, 100],
    nodosMax: ['tope de nodos por búsqueda', 'node cap per search', 5000, 1000000, 5000],
    llegada: ['llegó a menos de (bloques)', 'arrived within (blocks)', 0.5, 6, 0.1],
    atasco: ['atascado: busca de nuevo tras (s)', 'stuck: search again after (s)', 0.5, 10, 0.5],
    reintentos: ['reintentos antes de rendirse', 'retries before giving up', 0, 10, 1],
    saltoLejos: ['lejos: un salto cada (s)', 'far away: one jump every (s)', 0.2, 5, 0.1],
    radioDetalle: ['camina mirando bloques a menos de (bloques)', 'walks checking blocks within (blocks)', 16, 160, 4],
    giro: ['rapidez de giro', 'turn speed', 1, 20, 0.5],
    suavizado: ['suavizado del camino (puntos)', 'path smoothing (points)', 1, 64, 1]
};
const PASEO = {
    amplitud: ['balanceo al caminar', 'walk swing', 0, 1.2, 0.05],
    acomodar: ['se acomoda en su sitio en (s)', 'settles into place in (s)', 0, 3, 0.1],
    reintento: ['sin camino y a la vista: reintenta cada (s)', 'no path and in view: retry every (s)', 1, 20, 0.5],
    distanciaVisita: ['distancia a quien visita (bloques)', 'distance to the friend visited (blocks)', 1, 5, 0.1],
    mirarJugador: ['de pie, te mira a menos de (bloques)', 'standing, looks at you within (blocks)', 0, 16, 0.5]
};
// Destinos fijos de la prueba (además de las personas y los lugares de posiciones.json)
const DESTINOS = [['aqui', 'junto a mí', 'next to me'], ['sitio', 'su sitio (vuelve)', 'their spot (go back)']];
const LUGARES_EXTRA = ['molino', 'portal']; // lugares del mapa sin nadie (posiciones.json no los nombra)

export async function montarVida(ctx) {
    const $ = id => document.getElementById(id);
    const t = (es, en) => (ctx.idioma === 'en' ? en : es);
    const caja = $('vi-campos'), msg = $('vi-mensaje'), btnGuardar = $('vi-guardar');
    const selPersona = $('vi-persona'), selDestino = $('vi-destino');
    let etag = null, original = null, datos = null, personas = [], lugares = [];
    try {
        const r = await fetch('../mundo/datos/navegacion.json', { cache: 'no-cache' });
        etag = r.headers.get('ETag'); original = JSON.parse(await r.text()); datos = clonar(original);
    } catch (e) { caja.textContent = 'No se pudo leer mundo/datos/navegacion.json'; return; }
    try {
        const pos = await (await fetch('../mundo/datos/posiciones.json', { cache: 'no-cache' })).json();
        personas = Object.keys(pos.personas || {});
        lugares = [...new Set([...Object.values(pos.personas || {}).map(p => p.ancla).filter(Boolean), ...LUGARES_EXTRA])];
    } catch (e) { /* sin posiciones: la prueba queda sin lista */ }
    datos.caminar = datos.caminar || {}; datos.paseo = datos.paseo || {};
    const sucio = () => JSON.stringify(datos) !== JSON.stringify(original);
    const rotular = (es, en, clase = '') => { msg.textContent = t(es, en); msg.className = 'mensaje' + (clase ? ' ' + clase : ''); };
    const cambio = () => {
        ctx.puente.enviarDatos('navegacion', datos);
        btnGuardar.disabled = !sucio() || !ctx.servidor.escritura;
    };

    function numero(etiqueta, valor, min, max, paso, poner) {
        const fila = document.createElement('label'); fila.className = 'campo';
        const s = document.createElement('span'); s.textContent = etiqueta;
        const rg = document.createElement('input'); rg.type = 'range'; rg.min = min; rg.max = max; rg.step = paso; rg.value = valor;
        const n = document.createElement('input'); n.type = 'number'; n.min = min; n.max = max; n.step = paso; n.value = valor; n.style.width = '6em';
        const fijar = v => { if (!Number.isFinite(v)) return; v = Math.min(max, Math.max(min, v)); rg.value = v; n.value = v; poner(v); };
        rg.addEventListener('input', () => fijar(Number(rg.value)));
        n.addEventListener('change', () => fijar(Number(n.value)));
        const d = document.createElement('div'); d.className = 'fila-botones'; d.append(rg, n);
        fila.append(s, d);
        return fila;
    }
    const seccion = (titulo, abierta = true) => {
        const sec = document.createElement('details'); sec.className = 'panel'; sec.open = abierta;
        const h = document.createElement('summary'); h.textContent = titulo;
        sec.appendChild(h);
        caja.appendChild(sec);
        return sec;
    };
    const boton = (es, en, f) => {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'boton chico secundario'; b.textContent = t(es, en);
        b.addEventListener('click', f);
        return b;
    };
    function grupo(titulo, parte, campos, base) {
        const sec = seccion(titulo);
        for (const [k, [es, en, min, max, paso]] of Object.entries(campos)) {
            const v = Number.isFinite(datos[parte][k]) ? datos[parte][k] : base[k];
            const fila = numero(t(es, en) + (k in datos[parte] ? ' *' : ''), v, min, max, paso, x => { datos[parte][k] = x; cambio(); });
            sec.appendChild(fila);
        }
        sec.appendChild(boton('Volver a los valores del código', 'Back to the code values', () => { datos[parte] = {}; cambio(); pintar(); }));
    }
    function llenarPrueba() {
        const p = selPersona.value, d = selDestino.value;
        selPersona.textContent = ''; selDestino.textContent = '';
        for (const c of personas) selPersona.appendChild(new Option(c, c));
        for (const [c, es, en] of DESTINOS) selDestino.appendChild(new Option(t(es, en), c));
        for (const l of lugares) selDestino.appendChild(new Option(t('lugar: ', 'place: ') + l, l));
        for (const c of personas) selDestino.appendChild(new Option(t('visitar a ', 'visit ') + c, c));
        if (p) selPersona.value = p;
        if (d) selDestino.value = d;
    }
    function pintar() {
        caja.textContent = '';
        llenarPrueba();
        grupo(t('Buscar camino y caminar', 'Pathfinding and walking'), 'caminar', CAMINAR, NAV_BASE);
        grupo(t('Paseos de los amigos', 'Friends’ walks'), 'paseo', PASEO, PASEO_BASE);
        btnGuardar.disabled = !sucio() || !ctx.servidor.escritura;
    }
    const ESTADOS = {
        'en-sitio': ['en su sitio', 'at their spot'], buscando: ['buscando camino', 'finding a path'], caminando: ['caminando', 'walking'],
        alla: ['llegó', 'arrived'], volviendo: ['volviendo', 'going back'], acomodando: ['acomodándose', 'settling in'],
        'sin-camino': ['sin camino', 'no path'], quieto: ['de pie', 'standing']
    };
    async function caminar(destino) {
        const persona = selPersona.value;
        if (!persona) return;
        try {
            const r = await ctx.puente.enviar('caminar', { persona, destino });
            const e = (r && r.paseo) || {};
            const nombre = ESTADOS[e.estado] ? t(...ESTADOS[e.estado]) : e.estado || '?';
            const resto = Number.isFinite(e.restante) ? t(` · faltan ${e.restante} bloques`, ` · ${e.restante} blocks left`) : '';
            rotular(`${persona}: ${nombre}${resto}`, `${persona}: ${nombre}${resto}`, 'ok');
        } catch (err) { rotular(err.message, err.message, 'error'); }
    }
    async function guardar() {
        rotular('Guardando…', 'Saving…');
        try {
            const resp = await fetch('../api/datos/navegacion', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Estudio': '1', 'If-Match': etag || '*' }, body: JSON.stringify(datos) });
            const j = await resp.json().catch(() => ({}));
            if (resp.ok) { original = clonar(datos); etag = j.etag; rotular(`Guardado (${j.bytes} B).`, `Saved (${j.bytes} B).`, 'ok'); }
            else if (resp.status === 412) rotular('El archivo cambió en disco: recarga el Estudio.', 'The file changed on disk: reload the Studio.', 'error');
            else rotular(`No se guardó (${resp.status}): ${(j.errores || []).slice(0, 2).join(' · ') || j.error || ''}`, `Not saved (${resp.status})`, 'error');
        } catch (e) { rotular('No se pudo hablar con el servidor.', 'Could not reach the server.', 'error'); }
        btnGuardar.disabled = !sucio() || !ctx.servidor.escritura;
        pintar();
    }
    $('vi-ir').addEventListener('click', () => caminar(selDestino.value));
    $('vi-volver').addEventListener('click', () => caminar('sitio'));
    $('vi-estado').addEventListener('click', () => caminar(''));
    $('vi-descartar').addEventListener('click', () => { datos = clonar(original); datos.caminar = datos.caminar || {}; datos.paseo = datos.paseo || {}; cambio(); pintar(); });
    btnGuardar.addEventListener('click', guardar);
    window.addEventListener('keydown', e => {
        if (ctx.pestana === 'vida' && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); if (!btnGuardar.disabled) guardar(); }
    });
    window.addEventListener('beforeunload', e => { if (sucio()) { e.preventDefault(); e.returnValue = ''; } });
    ctx.alIdioma.push(pintar);
    pintar();
}
