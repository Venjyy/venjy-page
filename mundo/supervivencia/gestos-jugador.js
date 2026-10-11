// =========================================================
// VENJY · Supervivencia · Gestos de la ruleta (7c-2, punto 18): datos y ciclo, sin DOM ni Three.js
// · RULETA: los 8 gestos de la rueda. No hay ángulos nuevos: cada uno nombra un gesto que ya existe
//   (GESTOS de escenas-skin.js, GESTOS_AMISTAD de 6b o MOLDES de 6c) y se resuelve por nombre con
//   `molde(nombre)` de moldes.js (ruleta.js lo carga con import() la primera vez). «Sentarse» usa la
//   pose `sentado` de pose-jugador.js. d = segundos que dura (0 = hasta moverse).
// · crearGesto / avanzarGesto / entradaGesto: el gesto en curso (local o de otro jugador) -> lo que
//   `posar` mezcla sobre el cuerpo quieto ({ gesto: { meta, w }, sentado }).
// · crearControl: el ciclo del jugador local. Al empezar congela el cuerpo (posición, giro y mirada) y
//   la cámara orbita libre; termina al acabar el gesto, con una tecla de movimiento (cancela), al recibir
//   daño o al abrir una ventana o la pausa. Red: evento `em` { k } por el canal fiable, máx. 1 por segundo
//   (`k` vacío = terminó antes de tiempo; si cae dentro del segundo, sale al cumplirse).
// Lo prueba mundo/tests/ruleta.mjs.
// =========================================================

// Orden en la rueda: empieza arriba y sigue como el reloj
export const RULETA = [
    { k: 'saluda', molde: 'saluda', d: 2.4, es: 'SALUDAR', en: 'WAVE' },
    { k: 'risa', molde: 'risa', d: 2.4, es: 'REÍR', en: 'LAUGH' },
    { k: 'celebra', molde: 'brazosArriba', d: 2.6, es: 'CELEBRAR', en: 'CHEER' },
    { k: 'tu', molde: 'tu', d: 2.0, es: 'SEÑALAR', en: 'POINT' },
    { k: 'baile', molde: 'baile', d: 6.0, es: 'BAILAR', en: 'DANCE' },
    { k: 'ojos', molde: 'ojos', d: 2.4, es: 'TAPARSE', en: 'FACEPALM' },
    { k: 'rasca', molde: 'rasca', d: 2.6, es: 'PENSAR', en: 'THINK' },
    { k: 'sentarse', pose: 'sentado', d: 0, es: 'SENTARSE', en: 'SIT' }
];
export const RED_MIN_S = 1;        // un evento `em` por segundo como mucho
export const RAMPA = [0.25, 0.3];  // segundos de entrada y salida del gesto (mezcla con el cuerpo quieto)
export const TOPE_S = 120;         // sentarse: se levanta solo a los 2 minutos
// Teclas que cancelan (el táctil escribe las mismas en jugador.teclas)
export const TECLAS_MOVER = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'ShiftLeft'];

export const porClave = k => RULETA.find(g => g.k === k) || null;

// moldes.js (con GESTOS y GESTOS_AMISTAD) se carga con import() al primer uso: no suma a la carga inicial
let promesaMoldes = null, moldeListo = null;
export function cargarMoldes() {
    return (promesaMoldes ||= import('./moldes.js').then(m => (moldeListo = m.molde)));
}
export const resolverListo = () => moldeListo;

const lim = (v, a, b) => Math.max(a, Math.min(b, v));
const suave = u => u * u * (3 - 2 * u);

// resolver(nombre) -> (u, t, info) => metas; null mientras moldes.js no ha cargado
export function crearGesto(k, resolver = null) {
    const def = porClave(k);
    if (!def) return null;
    return { k, def, f: def.molde && resolver ? resolver(def.molde) : null, t: 0, sale: -1 };
}
export const duracion = g => (g.def.d || TOPE_S);

// Avanza el reloj; false cuando terminó (incluida la salida suave)
export function avanzarGesto(g, dt) {
    g.t += dt;
    if (g.sale >= 0) { g.sale += dt; return g.sale < RAMPA[1]; }
    if (g.t >= duracion(g)) return false;
    return true;
}
// Pide la salida suave (cancelar): el cuerpo vuelve en RAMPA[1] s
export function soltarGesto(g) { if (g.sale < 0) g.sale = 0; }

// Peso del gesto en este instante (0..1)
export function peso(g) {
    const ent = suave(lim(g.t / RAMPA[0], 0, 1));
    const fin = g.sale >= 0 ? 1 - g.sale / RAMPA[1] : g.def.d ? lim((g.def.d - g.t) / RAMPA[1], 0, 1) : 1;
    return ent * suave(lim(fin, 0, 1));
}

// Lo que pose-jugador.js mezcla: { gesto: { meta, w } | null, sentado }
export function entradaGesto(g, info = { j: true }) {
    if (!g) return null;
    if (g.def.pose === 'sentado') return { gesto: null, sentado: g.sale < 0 };
    if (!g.f) return { gesto: null, sentado: false };
    const u = lim(g.t / duracion(g), 0, 1);
    return { gesto: { meta: g.f(u, g.t, info), w: peso(g) }, sentado: false };
}

// Casilla de la rueda según el desplazamiento (pantalla: y hacia abajo); -1 dentro del centro muerto
export function sector(dx, dy, n = RULETA.length, muerto = 28) {
    if (Math.hypot(dx, dy) < muerto) return -1;
    const ang = Math.atan2(dx, -dy); // 0 arriba, crece como el reloj
    return ((Math.round(ang / (2 * Math.PI / n)) % n) + n) % n;
}

// ---------------------------------------------------------
// Ciclo del jugador local
// ---------------------------------------------------------
// ahora() en segundos (para la red). Uso por cuadro: control.paso(dt, { mueve, dano, ventana }).
export function crearControl({ ahora = () => performance.now() / 1000 } = {}) {
    let actual = null;       // { g, yaw, pitch }
    let ultimoEm = -Infinity, ultimoInicio = -Infinity, pendiente = null;
    const salida = [];       // mensajes `em` listos para mandar
    function mandar(k) {
        const t = ahora();
        if (t - ultimoEm >= RED_MIN_S) { ultimoEm = t; pendiente = null; salida.push({ k }); }
        else pendiente = { k };
    }
    const c = {
        get activo() { return !!actual && actual.g.sale < 0; },
        get gesto() { return actual ? actual.g : null; },
        // El cuerpo congelado: hacia dónde mira (lo usan la cámara, el cuerpo y el mensaje `p`)
        get fijo() { return actual ? { yaw: actual.yaw, pitch: 0 } : null; },
        get pitchAntes() { return actual ? actual.pitch : 0; },
        get listo() { return ahora() - ultimoInicio >= RED_MIN_S; },
        // Empieza un gesto; false si no existe o si no pasó 1 s desde el último (tope de la red)
        iniciar(k, yaw, pitch, resolver) {
            if (ahora() - ultimoInicio < RED_MIN_S) return false;
            const g = crearGesto(k, resolver);
            if (!g) return false;
            ultimoInicio = ahora();
            actual = { g, yaw, pitch };
            mandar(k);
            return true;
        },
        // moldes.js llegó después de empezar: completa la función del gesto
        resolver(resolver) { if (actual && !actual.g.f && actual.g.def.molde) actual.g.f = resolver(actual.g.def.molde); },
        // Corta ya (sin salida suave) y avisa a los demás (salvo al cambiar de gesto); devuelve el gesto cortado o null
        cancelar(motivo = 'cancelado', avisar = true) {
            if (!actual) return null;
            const g = actual;
            actual = null;
            if (avisar) mandar('');
            c.ultimo = motivo;
            return g;
        },
        // Un cuadro: devuelve null mientras sigue, o el motivo del fin ('fin', 'mueve', 'dano', 'ventana')
        paso(dt, { mueve = false, dano = false, ventana = false } = {}) {
            if (pendiente && ahora() - ultimoEm >= RED_MIN_S) { ultimoEm = ahora(); salida.push(pendiente); pendiente = null; }
            if (!actual) return null;
            const motivo = ventana ? 'ventana' : dano ? 'dano' : mueve ? 'mueve' : null;
            if (motivo) { c.cancelar(motivo); return motivo; }
            if (!avanzarGesto(actual.g, dt)) { actual = null; c.ultimo = 'fin'; return 'fin'; }
            return null;
        },
        // Mensajes para la red (se vacía al leer)
        mensajes() { return salida.splice(0); },
        ultimo: null
    };
    return c;
}

// ---------------------------------------------------------
// Otros jugadores (coop.js)
// ---------------------------------------------------------
// Llegó `em` { k }: k vacío = terminó antes de tiempo. Devuelve el gesto que queda en ese jugador.
export function recibirEm(g, k) {
    if (!k) { if (g) soltarGesto(g); return g; }
    const n = crearGesto(k, moldeListo);
    if (n && n.def.molde && !n.f) cargarMoldes().then(r => { if (!n.f) n.f = r(n.def.molde); }).catch(() => {});
    return n || g;
}
// Cada cuadro: si se mueve (canceló con una tecla) sale suave; null cuando ya no hay gesto
export function pasoRemoto(g, dt, mov) {
    if (!g) return null;
    if (mov > 0.8) soltarGesto(g);
    return avanzarGesto(g, dt) ? g : null;
}
