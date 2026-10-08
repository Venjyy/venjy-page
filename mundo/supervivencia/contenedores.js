// =========================================================
// VENJY · Supervivencia · Cofres y hornos
// Estado por posición ('x,y,z'). Los cofres y barriles del mapa (casas, mina, lugares para
// explorar) traen botín la primera vez que se abren, según dónde están. Los hornos funden
// aunque su ventana esté cerrada: combustible, progreso y bloque encendido/apagado.
// =========================================================
import { B } from '../texturas.js';
import { O, combustibleDe, TIEMPO_COCCION, apilaDe } from './objetos.js';
import { FUNDICION } from './recetas.js';
import { pila } from './inventario.js';
import { botinDe } from './botin.js';

export const CASILLAS_COFRE = 27;

export function crearContenedores({ mundo, terreno }) {
    const estados = new Map(); // clave -> { tipo: 'cofre', casillas } | { tipo: 'horno', entrada, combustible, salida, quema, quemaMax, progreso }
    const clave = (x, y, z) => x + ',' + y + ',' + z;

    function obtener(x, y, z, id) {
        const k = clave(x, y, z);
        let e = estados.get(k);
        if (e) return e;
        if (id === B.HORNO || id === B.HORNO_ENCENDIDO) e = { tipo: 'horno', entrada: null, combustible: null, salida: null, quema: 0, quemaMax: 0, progreso: 0 };
        else e = { tipo: 'cofre', casillas: botinInicial(x, y, z) };
        estados.set(k, e);
        return e;
    }

    // ¿El cofre era parte del mapa (no lo puso el jugador)? Si fue puesto por el jugador, no hay botín.
    const puestos = new Set();
    function marcarPuesto(x, y, z) { puestos.add(clave(x, y, z)); }

    function botinInicial(x, y, z) {
        const casillas = new Array(CASILLAS_COFRE).fill(null);
        if (puestos.has(clave(x, y, z))) return casillas;
        const lista = botinDe(lugarDe(x, z), azarDe(x, y, z));
        // Reparte en casillas al azar (determinista)
        const azar = azarDe(x * 7, y * 3, z * 11);
        for (const [id, n] of lista) {
            let k = Math.floor(azar() * CASILLAS_COFRE), intentos = 0;
            while (casillas[k] && intentos++ < CASILLAS_COFRE) k = (k + 1) % CASILLAS_COFRE;
            if (!casillas[k]) casillas[k] = pila(id, Math.min(n, apilaDe(id)));
        }
        return casillas;
    }

    // Qué lugar del mapa queda más cerca (para elegir la tabla de botín)
    function lugarDe(x, z) {
        let mejor = 'casa', dm = Infinity;
        const prueba = (nombre, px, pz, radio) => { const d = Math.hypot(px - x, pz - z); if (d < radio && d < dm) { dm = d; mejor = nombre; } };
        for (const l of terreno.lugares || []) prueba(l.clave, l.x, l.z, l.radio + 4);
        const mina = (terreno.decor || []).find(d => d.t === 'mina');
        if (mina) prueba('mina', mina.x, mina.z - 14, 26);
        if (terreno.pescador && terreno.pescador.caseta) prueba('pescador', terreno.pescador.caseta.x, terreno.pescador.caseta.z, 10);
        return mejor;
    }

    // Horno: un paso de simulación
    function tickHorno(k, e, dt) {
        const entrada = e.entrada, resultado = entrada && FUNDICION.get(entrada.id);
        const cabe = resultado && (!e.salida || (e.salida.id === resultado && e.salida.n < apilaDe(resultado)));
        let cambio = false;
        if (e.quema <= 0 && cabe && e.combustible) {
            const t = combustibleDe(e.combustible.id);
            if (t > 0) {
                e.quema = e.quemaMax = t;
                const devuelve = e.combustible.id === O.CUBO_LAVA ? O.CUBO : 0;
                e.combustible.n--;
                if (!e.combustible.n) e.combustible = devuelve ? pila(devuelve) : null;
                cambio = true;
            }
        }
        if (e.quema > 0) {
            e.quema -= dt;
            if (cabe) {
                e.progreso += dt;
                if (e.progreso >= TIEMPO_COCCION) {
                    e.progreso = 0;
                    if (e.salida) e.salida.n++; else e.salida = pila(resultado);
                    entrada.n--;
                    if (!entrada.n) e.entrada = null;
                    cambio = true;
                }
            } else e.progreso = Math.max(0, e.progreso - dt * 2);
        } else e.progreso = Math.max(0, e.progreso - dt * 2);
        // Bloque encendido o apagado
        const encendido = e.quema > 0;
        if (encendido !== !!e.encendido) {
            e.encendido = encendido;
            const [x, y, z] = k.split(',').map(Number);
            const actual = mundo.bloque(x, y, z);
            if (actual === B.HORNO || actual === B.HORNO_ENCENDIDO) mundo.editar(x, y, z, encendido ? B.HORNO_ENCENDIDO : B.HORNO);
        }
        return cambio;
    }

    let alCambiar = null;
    function actualizar(dt) {
        for (const [k, e] of estados) if (e.tipo === 'horno' && (e.quema > 0 || (e.entrada && e.combustible))) { if (tickHorno(k, e, dt) && alCambiar) alCambiar(k); }
    }

    // Al romper un contenedor: devuelve todo lo que tenía (para soltarlo)
    function quitar(x, y, z) {
        const k = clave(x, y, z);
        const e = estados.get(k);
        estados.delete(k);
        puestos.delete(k);
        if (!e) {
            // cofre del mapa que nunca se abrió: igual suelta su botín
            return botinInicial(x, y, z).filter(Boolean);
        }
        if (e.tipo === 'cofre') return e.casillas.filter(Boolean);
        return [e.entrada, e.combustible, e.salida].filter(Boolean);
    }

    function serializar() {
        const s = p => (p ? [p.id, p.n, p.d] : 0);
        const lista = [];
        for (const [k, e] of estados) {
            if (e.tipo === 'cofre') lista.push([k, 'c', e.casillas.map(s)]);
            else lista.push([k, 'h', [s(e.entrada), s(e.combustible), s(e.salida)], +e.quema.toFixed(2), e.quemaMax, +e.progreso.toFixed(2)]);
        }
        return { estados: lista, puestos: [...puestos] };
    }
    function cargar(o) {
        estados.clear(); puestos.clear();
        if (!o) return;
        const l = v => (v ? pila(v[0], v[1], v[2] || 0) : null);
        for (const [k, t, datos, quema, quemaMax, progreso] of o.estados || []) {
            if (t === 'c') estados.set(k, { tipo: 'cofre', casillas: datos.map(l).concat(new Array(CASILLAS_COFRE).fill(null)).slice(0, CASILLAS_COFRE) });
            else {
                const [entrada, combustible, salida] = datos.map(l);
                estados.set(k, { tipo: 'horno', entrada, combustible, salida, quema: quema || 0, quemaMax: quemaMax || 0, progreso: progreso || 0, encendido: (quema || 0) > 0 });
            }
        }
        for (const k of o.puestos || []) puestos.add(k);
    }

    return {
        obtener, quitar, marcarPuesto, actualizar, serializar, cargar, estados,
        set alCambiar(f) { alCambiar = f; }
    };
}

// Azar determinista por posición
export function azarDe(x, y, z) {
    let s = (Math.imul(x, 73856093) ^ Math.imul(y, 19349663) ^ Math.imul(z, 83492791)) >>> 0;
    return () => {
        s = (s + 0x6D2B79F5) >>> 0;
        let t = s;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
