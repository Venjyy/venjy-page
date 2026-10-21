// =========================================================
// VENJY · Combate · intenciones (bloque 8 · N4, mundo/COMBATE.md §15.1)
// Puro (sin DOM; solo toca navigator y el mando al vibrar). Junta el teclado y el mouse, el mando (Gamepad API) y
// el táctil en UNA intención por cuadro lógico, la que lee estados.paso():
//   { mover: [x, y], altura, atacar, defensa, esquivar, agarre, especial, saltar, fuerte, modoEspecial, foco }
// con cada control 'apretar' (este cuadro), 'mantener' o 'soltar'. x = adelante (+) o atrás en el eje del duelo;
// y = paso lateral (+ = hacia el fondo de la pantalla), que solo viene con la esquiva.
// Todo lo ajustable está en combate.json → teclas (perfiles de PC y del mando) y → tactil (umbrales y vibración).
//   crearIntenciones({ perfil, lado, carga })   perfil 'raton' | 'teclado' (o uno propio del JSON); lado +1 si el
//                                               peleador mira a la derecha de la pantalla, -1 si a la izquierda;
//                                               carga: mantener atacar da fuerte (cargaDe(estilo))
//   .teclaAbajo(code) / .teclaArriba(code)       KeyboardEvent.code; el mouse es 'Mouse0' y 'Mouse2'. Devuelve true
//                                               si la tecla es del combate (para preventDefault)
//   .leerMando(gamepad)                          una vez por cuadro, antes de leer()
//   .tactilAbajo(zona, id, x, y, t) / .tactilMover(id, x, y, t) / .tactilArriba(id, x, y, t) / .tactilCancelar(id)
//                                               zona: 'joy' | 'libre' | un control; t en ms (event.timeStamp)
//   .leer(ahora)                                 la intención de este cuadro (ahora en ms, para decidir los toques)
//   .joystick()                                  { x0, y0, x, y } del joystick flotante o null (para dibujarlo)
//   .vibrar(tipo)                                'golpe' | 'fuerte' | 'desvio' | 'perfecto', en el aparato que se usó
//   .soltarTodo()                                al perder el foco
// Táctil (§15.1): ATACAR y DEFENSA esperan para saber qué gesto es. Si el dedo recorre tactil.deslizar.px en vertical
// antes de tactil.deslizar.ms, es un deslizamiento (arriba = alto, abajo = bajo) y sale en ese momento; si se suelta
// antes, es un toque (altura neutra); si pasan los ms, es mantener. Nada pide dos dedos en la derecha.
// =========================================================
import { COMBATE } from './datos.js';

export const CONTROLES = ['atacar', 'defensa', 'esquivar', 'agarre', 'especial', 'saltar', 'modoEspecial', 'foco'];
const GESTO = new Set(['atacar', 'defensa']);      // en el táctil: toque, mantener o deslizar arriba o abajo
const ORDEN_ALTURA = ['defensa', 'atacar', 'agarre', 'especial', 'esquivar'];
const DIRECCIONES = ['izquierda', 'derecha', 'alto', 'bajo'];

export const cargaDe = estilo => !!(estilo && estilo.controles && estilo.controles.fuerte);

export function patronVibracion(tipo, cfg = COMBATE.tactil.vibracion) {
    if (!cfg || !cfg.activa || !Array.isArray(cfg[tipo])) return null;
    const k = typeof cfg.intensidad === 'number' ? cfg.intensidad : 1;
    // Las posiciones pares vibran (se escalan); las impares son pausas
    const p = cfg[tipo].map((ms, i) => Math.max(0, Math.round(i % 2 ? ms : ms * k)));
    return p.some((ms, i) => i % 2 === 0 && ms > 0) ? p : null;
}

export function crearIntenciones({ perfil = null, lado = 1, carga = false } = {}) {
    const c = {};
    for (const k of CONTROLES) c[k] = { fuentes: new Set(), pulso: false, prev: false, n: 0, altura: null, fuente: '', cargando: false, cargado: false, dir: null };
    const teclas = new Set();
    const toques = new Map();
    let joy = null, ultima = 'pc', gamepad = null;
    const mando = { x: 0, altura: null, prev: {} };
    let nombrePerfil = perfil;
    let gesto = new Set(GESTO); // (fijarGestos: los controles por altura del estilo también esperan el gesto, L6b)

    const T = () => COMBATE.tactil;
    const K = () => COMBATE.teclas;
    const mapa = () => {
        const a = K().arena || {};
        return a[nombrePerfil || K().perfil] || a.raton || {};
    };
    const alturaNeutra = () => COMBATE.entrada.alturaNeutra || 'medio';
    const tiene = (lista, code) => Array.isArray(lista) && lista.includes(code);
    const sostenida = nombre => { const l = mapa()[nombre]; return Array.isArray(l) && l.some(code => teclas.has(code)); };

    function presionar(k, fuente, altura = null) {
        const s = c[k];
        if (!s.fuentes.size) { s.pulso = true; s.altura = altura; s.dir = null; }
        else if (altura && !s.altura) s.altura = altura;
        s.fuentes.add(fuente);
        s.fuente = fuente;
    }
    const soltar = (k, fuente) => c[k].fuentes.delete(fuente);

    // ---------- PC ----------
    function teclaAbajo(code) {
        const m = mapa();
        const controles = CONTROLES.filter(k => tiene(m[k], code));
        if (!controles.length && !DIRECCIONES.some(d => tiene(m[d], code))) return false;
        ultima = 'pc';
        if (teclas.has(code)) return true; // repetición del sistema
        teclas.add(code);
        for (const k of controles) presionar(k, 'pc:' + code);
        return true;
    }
    function teclaArriba(code) {
        if (!teclas.delete(code)) return false;
        for (const k of CONTROLES) soltar(k, 'pc:' + code);
        return true;
    }

    // ---------- Mando ----------
    function leerMando(gp) {
        if (!gp || !gp.buttons) { gamepad = null; return; }
        gamepad = gp;
        const cfg = K().mando || {};
        let usado = false;
        for (const k of CONTROLES) {
            const idx = cfg[k];
            const apretado = Array.isArray(idx) && idx.some(i => { const b = gp.buttons[i]; return b && (b.pressed || b.value > 0.5); });
            if (apretado && !mando.prev[k]) presionar(k, 'mando');
            if (!apretado && mando.prev[k]) soltar(k, 'mando');
            mando.prev[k] = apretado;
            usado = usado || apretado;
        }
        const ax = gp.axes || [];
        const x = ax[cfg.ejeX] || 0, y = ax[cfg.ejeY] || 0;
        mando.x = Math.abs(x) > (cfg.zonaMuerta ?? 0.2) ? Math.max(-1, Math.min(1, x)) : 0;
        mando.altura = y < -(cfg.altura ?? 0.5) ? 'alto' : y > (cfg.altura ?? 0.5) ? 'bajo' : null;
        if (usado || mando.x || mando.altura) ultima = 'mando';
    }

    // ---------- Táctil ----------
    function decidir(id, t, altura) {
        const q = toques.get(id);
        if (!q || q.decidido) return;
        q.decidido = true;
        presionar(q.zona, 'tactil:' + id, altura);
    }
    function revisarTiempo(ahora) {
        const ms = T().deslizar.ms;
        for (const [id, q] of toques) if (gesto.has(q.zona) && !q.decidido && ahora - q.t0 >= ms) decidir(id, ahora, alturaNeutra());
    }
    function tactilAbajo(zona, id, x, y, t) {
        ultima = 'tactil';
        if (zona === 'joy') { joy = { id, x0: x, y0: y, x, y }; return; }
        if (zona !== 'libre' && !c[zona]) return;
        const q = { zona, x0: x, y0: y, t0: t, decidido: false };
        toques.set(id, q);
        if (zona !== 'libre' && !gesto.has(zona)) decidir(id, t, null);
    }
    function tactilMover(id, x, y, t) {
        if (joy && joy.id === id) { joy.x = x; joy.y = y; return; }
        const q = toques.get(id);
        if (!q || q.decidido) return;
        const dx = x - q.x0, dy = y - q.y0;
        if (q.zona === 'libre') {
            const e = T().esquiva, d = Math.hypot(dx, dy);
            if (d >= e.px && t - q.t0 <= e.ms) {
                q.decidido = true;
                presionar('esquivar', 'tactil:' + id);
                c.esquivar.dir = [dx / d, -dy / d];
                soltar('esquivar', 'tactil:' + id); // el pulso queda para leer()
            }
            return;
        }
        if (!gesto.has(q.zona)) return;
        const u = T().deslizar;
        if (t - q.t0 >= u.ms) { decidir(id, t, alturaNeutra()); return; }
        if (Math.abs(dy) >= u.px && Math.abs(dy) >= Math.abs(dx)) decidir(id, t, dy < 0 ? 'alto' : 'bajo');
    }
    function tactilArriba(id, x, y, t) {
        if (joy && joy.id === id) { joy = null; return; }
        const q = toques.get(id);
        if (!q) return;
        if (x !== undefined) tactilMover(id, x, y, t);
        if (q.zona !== 'libre') {
            if (!q.decidido) decidir(id, t, alturaNeutra()); // toque
            soltar(q.zona, 'tactil:' + id);
        }
        toques.delete(id);
    }
    function tactilCancelar(id) {
        if (joy && joy.id === id) { joy = null; return; }
        const q = toques.get(id);
        if (!q) return;
        if (q.decidido && q.zona !== 'libre') soltar(q.zona, 'tactil:' + id);
        toques.delete(id);
    }

    function soltarTodo() {
        teclas.clear();
        toques.clear();
        joy = null;
        for (const k of CONTROLES) c[k].fuentes.clear();
        mando.prev = {};
    }

    // ---------- Un cuadro ----------
    function leer(ahora) {
        if (ahora === undefined) ahora = typeof performance !== 'undefined' ? performance.now() : Date.now();
        revisarTiempo(ahora);
        const it = {};
        const izq = sostenida('izquierda'), der = sostenida('derecha'), alto = sostenida('alto'), bajo = sostenida('bajo');
        let mx = (der ? 1 : 0) - (izq ? 1 : 0), my = 0;
        if (joy) {
            const j = T().joystick, v = Math.max(-1, Math.min(1, (joy.x - joy.x0) / j.radio));
            mx = Math.abs(v) < j.zonaMuerta ? 0 : v;
        }
        if (mando.x) mx = mando.x;
        let altura = alto && !bajo ? 'alto' : bajo && !alto ? 'bajo' : alturaNeutra();
        if (mando.altura) altura = mando.altura;
        const pulsados = new Set(CONTROLES.filter(k => c[k].pulso));

        for (const k of CONTROLES) {
            const s = c[k], abajo = s.fuentes.size > 0;
            if ((s.pulso || abajo) && !s.altura) s.altura = altura; // la altura vale la del cuadro en que se aprieta
            const n = abajo ? (s.pulso ? 1 : s.n + 1) : 0;
            if (k === 'atacar' && carga) {
                // Mantener carga: el ataque normal sale al soltar antes de teclas.fuerte cuadros; si llega, sale fuerte
                const tope = K().fuerte;
                if (s.pulso) s.cargando = true;
                if (abajo) {
                    if (s.cargando && n === tope) { it.fuerte = 'apretar'; s.cargado = true; } else if (s.cargado) it.fuerte = 'mantener';
                } else if (s.cargando) {
                    if (s.cargado) it.fuerte = 'soltar'; else it.atacar = 'apretar';
                    s.cargando = false; s.cargado = false;
                }
                if (!it.atacar) pulsados.delete('atacar');
            } else {
                const r = s.pulso ? 'apretar' : abajo ? 'mantener' : s.prev ? 'soltar' : undefined;
                if (r) it[k] = r;
            }
            if (k === 'especial' && abajo && s.fuente.startsWith('tactil') && n === T().especialModo) it.modoEspecial = 'apretar';
            s.n = n;
            s.prev = s.pulso || abajo;
            s.pulso = false;
        }
        // Dos controles juntos (Q + E): sale el otro cuando el segundo se aprieta con el primero sostenido
        for (const [destino, par] of Object.entries(K().juntos || {})) {
            if (!Array.isArray(par) || par.length !== 2 || !c[par[0]] || !c[par[1]]) continue;
            const [a, b] = par.map(k => c[k]);
            if (a.fuentes.size && b.fuentes.size && (pulsados.has(par[0]) || pulsados.has(par[1])) && !a.fuente.startsWith('tactil')) it[destino] = 'apretar';
        }
        if (it.esquivar === 'apretar') {
            const d = c.esquivar.dir;
            if (d) { mx = d[0]; my = d[1]; c.esquivar.dir = null; } else my = (alto ? 1 : 0) - (bajo ? 1 : 0) || (mando.altura === 'alto' ? 1 : mando.altura === 'bajo' ? -1 : 0);
        }
        // La altura del cuadro es la del control que se apretó (la del gesto en el táctil)
        const conAltura = ORDEN_ALTURA.find(k => it[k] === 'apretar' || (k === 'atacar' && it.fuerte === 'apretar'));
        it.altura = conAltura && c[conAltura].altura ? c[conAltura].altura : altura;
        for (const k of CONTROLES) if (!c[k].fuentes.size && !c[k].prev) c[k].altura = null;
        it.mover = [mx * lado, my];
        return it;
    }

    function vibrar(tipo) {
        if (ultima === 'tactil') {
            const p = patronVibracion(tipo);
            if (p && typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') navigator.vibrate(p);
            return p;
        }
        if (ultima === 'mando' && gamepad && gamepad.vibrationActuator) {
            const v = (K().mando.vibracion || {})[tipo], cfg = T().vibracion;
            if (!Array.isArray(v) || !cfg.activa) return null;
            const k = cfg.intensidad ?? 1;
            const efecto = { duration: v[0], strongMagnitude: Math.min(1, v[1] * k), weakMagnitude: Math.min(1, v[2] * k) };
            try { gamepad.vibrationActuator.playEffect('dual-rumble', efecto); } catch (e) { /* el mando no vibra */ }
            return efecto;
        }
        return null;
    }

    return {
        teclaAbajo, teclaArriba, leerMando, tactilAbajo, tactilMover, tactilArriba, tactilCancelar, leer, soltarTodo, vibrar,
        joystick: () => (joy ? { ...joy } : null),
        fijarPerfil(p) { soltarTodo(); nombrePerfil = p; },
        fijarLado(l) { lado = l < 0 ? -1 : 1; },
        fijarCarga(b) { carga = !!b; },
        // Controles que en el táctil esperan el gesto (deslizar arriba o abajo = altura), además de ATACAR y DEFENSA
        fijarGestos(lista = []) { gesto = new Set([...GESTO, ...lista]); },
        get ultima() { return ultima; }
    };
}
