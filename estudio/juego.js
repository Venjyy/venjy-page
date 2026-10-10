// =========================================================
// VENJY · Estudio · pestaña Juego (fase 2)
// El juego real (supervivencia.html?estudio) en un iframe y el puente BroadcastChannel para hablarle:
// estado, /tp y «aplicar los archivos guardados». Lo que se mueve en Layout llega por ctx.puente
// (layout.js llama a enviarDatos en cada cambio). El iframe se crea al abrir la pestaña por primera vez.
// =========================================================

import { DATOS_VIVOS as ARCHIVOS_VIVOS } from './puente-protocolo.js';
const ESTADOS = {
    'sin-juego': { es: 'Sin juego: abre la pestaña Juego o supervivencia.html?estudio', en: 'No game: open the Game tab or supervivencia.html?estudio' },
    esperando: { es: 'Cargando el juego…', en: 'Loading the game…' },
    abriendo: { es: 'Abriendo el mundo «Estudio»…', en: 'Opening the “Estudio” world…' },
    listo: { es: 'Juego listo', en: 'Game ready' },
    error: { es: 'Error del juego: ', en: 'Game error: ' }
};

export function montarJuego(ctx) {
    const $ = id => document.getElementById(id);
    const marco = $('juego'), estado = $('juego-estado'), tpMsg = $('tp-mensaje'), datosMsg = $('datos-mensaje');
    const puente = ctx.puente;
    let creado = false;

    function urlJuego() {
        const q = $('juego-tactil').checked ? 'estudio=tactil' : 'estudio';
        return new URL('../supervivencia.html?' + q, location.href).href;
    }
    function pintarEstado() {
        const e = puente.estado;
        const t = ESTADOS[e.fase] || ESTADOS['sin-juego'];
        estado.textContent = t[ctx.idioma] + (e.fase === 'error' ? e.mensaje : '');
        estado.className = 'mensaje' + (e.fase === 'listo' ? ' ok' : e.fase === 'error' ? ' error' : '');
    }
    function rotular(el, texto, clase = '') {
        el.textContent = texto;
        el.className = 'mensaje' + (clase ? ' ' + clase : '');
    }
    const decir = (el, es, en, clase) => rotular(el, ctx.idioma === 'en' ? en : es, clase);

    function cargarIframe() {
        puente.estado.fase = 'esperando';
        puente.estado.listo = false;
        pintarEstado();
        marco.src = urlJuego();
        $('juego-aparte').href = urlJuego();
    }

    ctx.juego = {
        // Se llama al abrir la pestaña: el juego se carga la primera vez que se mira
        activar() {
            if (creado) return;
            creado = true;
            cargarIframe();
        }
    };

    puente.alMensaje(() => pintarEstado());
    ctx.alIdioma.push(pintarEstado);
    pintarEstado();

    $('juego-tactil').addEventListener('change', () => { if (creado) cargarIframe(); else $('juego-aparte').href = urlJuego(); });
    $('juego-recargar').addEventListener('click', () => { creado = true; cargarIframe(); });

    async function ir(carga) {
        decir(tpMsg, 'Viajando…', 'Travelling…');
        try {
            const r = await puente.tp(carga);
            const p = r.pos;
            decir(tpMsg, `Listo: ${p.x} ${p.y} ${p.z}`, `Done: ${p.x} ${p.y} ${p.z}`, 'ok');
        } catch (e) {
            rotular(tpMsg, e.message, 'error');
        }
    }
    $('tp-ir').addEventListener('click', () => {
        const d = $('tp-destino').value.trim();
        if (!d) { decir(tpMsg, 'Escribe un lugar o una persona.', 'Type a place or a person.', 'error'); return; }
        ir(d);
    });
    $('tp-destino').addEventListener('keydown', e => { if (e.key === 'Enter') $('tp-ir').click(); });
    $('tp-ir-xyz').addEventListener('click', () => {
        const x = $('tp-x').valueAsNumber, y = $('tp-y').valueAsNumber, z = $('tp-z').valueAsNumber;
        if (!Number.isFinite(x) || !Number.isFinite(z)) { decir(tpMsg, 'X y Z son obligatorias.', 'X and Z are required.', 'error'); return; }
        ir(Number.isFinite(y) ? { x, y, z } : { x, z });
    });

    // Vuelve a leer del disco los archivos que el juego aplica en vivo y los manda (sirve tras editar a mano o con un agente)
    $('juego-datos').addEventListener('click', async () => {
        try {
            for (const n of ARCHIVOS_VIVOS) {
                const r = await fetch(`../mundo/datos/${n}.json`, { cache: 'no-cache' });
                if (!r.ok) throw new Error(`${n}.json: HTTP ${r.status}`);
                await puente.enviar('datos', { nombre: n, datos: await r.json() });
            }
            decir(datosMsg, `Aplicados: ${ARCHIVOS_VIVOS.join(', ')}.`, `Applied: ${ARCHIVOS_VIVOS.join(', ')}.`, 'ok');
        } catch (e) {
            rotular(datosMsg, e.message, 'error');
        }
    });
}
