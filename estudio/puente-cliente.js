// =========================================================
// VENJY · Estudio · cliente del puente (lado del Estudio y de las pruebas)
// crearCliente() habla con el juego por el BroadcastChannel 'venjy-estudio'. El juego puede estar en
// un iframe, en otra pestaña o en un segundo monitor: el canal no distingue. Protocolo: puente-protocolo.js.
// =========================================================
import { CANAL } from './puente-protocolo.js';

const TOPE_MS = 15000; // el juego puede tardar en responder mientras genera chunks

// opciones: { canal?: BroadcastChannel (para pruebas), tope?: ms }
export function crearCliente({ canal = new BroadcastChannel(CANAL), tope = TOPE_MS } = {}) {
    const pendientes = new Map();
    const oyentes = new Set();
    let n = 0;
    const prefijo = Math.random().toString(36).slice(2, 7);
    const estado = { listo: false, fase: 'sin-juego', mensaje: '', idioma: 'es' };

    canal.onmessage = e => {
        const m = e.data;
        if (!m || typeof m !== 'object' || m.de !== 'juego') return;
        if (m.tipo === 'listo') { estado.listo = true; estado.fase = 'listo'; estado.idioma = m.idioma || 'es'; }
        else if (m.tipo === 'estado') { estado.fase = m.fase; estado.listo = false; }
        else if (m.tipo === 'error' && m.id === undefined) { estado.fase = 'error'; estado.mensaje = m.mensaje || ''; estado.listo = false; }
        if (m.id !== undefined && pendientes.has(m.id)) {
            const p = pendientes.get(m.id);
            pendientes.delete(m.id);
            clearTimeout(p.reloj);
            if (m.tipo === 'error') p.mal(new Error(m.mensaje || 'error del juego')); else p.ok(m);
        }
        for (const f of oyentes) f(m, estado);
    };

    function enviar(tipo, campos = {}) {
        const id = `${prefijo}-${++n}`;
        return new Promise((ok, mal) => {
            const reloj = setTimeout(() => {
                pendientes.delete(id);
                mal(new Error(`el juego no respondió «${tipo}» en ${tope / 1000} s (¿está abierto con ?estudio?)`));
            }, tope);
            pendientes.set(id, { ok, mal, reloj });
            canal.postMessage({ de: 'estudio', tipo, id, ...campos });
        });
    }

    // Último `datos` por nombre: si el Estudio manda cien cambios en un cuadro, el juego recibe uno solo
    const cola = new Map();
    function enviarDatos(nombre, datos) {
        if (!cola.has(nombre)) {
            queueMicrotask(() => {
                const d = cola.get(nombre);
                cola.delete(nombre);
                enviar('datos', { nombre, datos: d }).catch(() => { /* sin juego abierto: la vista propia sigue funcionando */ });
            });
        }
        cola.set(nombre, datos);
    }

    return {
        estado,
        enviar,
        enviarDatos,
        hola: () => enviar('hola'),
        tp: destino => enviar('tp', typeof destino === 'string' ? { destino } : destino),
        alMensaje(f) { oyentes.add(f); return () => oyentes.delete(f); },
        cerrar() { for (const p of pendientes.values()) clearTimeout(p.reloj); pendientes.clear(); canal.close(); }
    };
}
