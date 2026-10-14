// =========================================================
// VENJY · Supervivencia · Carrera de gatas (7h-1): modelo puro
// Mila contra Gala en un circuito cerrado alrededor de la Gatera, al estilo de un juego de karts: cada
// jugador maneja su gata (acelerar, frenar, doblar y derrapar para cargar un turbo) y gana quien completa
// primero las vueltas. Aquí solo hay números: la física de una gata, el circuito (puntos relativos a la
// Gatera, cerrados en lazo), el avance (con vueltas que no se cuentan dos veces ni hacia atrás), el puesto
// y la IA de la gata rival en solitario. Lo dibuja y lo maneja carrera.js; lo sincroniza carrera-red.js.
// Sin DOM ni THREE: se prueba en Node (mundo/tests/carrera.mjs).
// Convención de giro (la de gatas.js): yaw 0 mira a +Z; avanzar es x += sin(yaw)·v, z += cos(yaw)·v.
// =========================================================

// Valores base (Estudio → Carrera; mundo/datos/carrera.json los ajusta por clave)
export const CARRERA = {
    vueltas: 3,
    cuenta: 3,          // segundos de la cuenta regresiva (3, 2, 1, ¡ya!)
    tope: 240,          // segundos máximos de carrera (después termina con el puesto que haya)
    pista: {
        ancho: 3.5,     // ancho de la pista (bloques); fuera de ella la gata va más lenta
        // Circuito: puntos [x, z] en bloques desde el centro de la Gatera, en orden; se cierra solo.
        // La salida es el primer tramo (del punto 0 al 1)
        // (la plaza plana entre la casa, al norte, y las lomas del sur; con una chicana al fondo)
        puntos: [[-6, 8], [6, 8], [13, 6], [16, 0], [15, -8], [10, -13], [3, -13], [-1, -8], [-6, -12], [-9, -7], [-9, 2]],
        salida: 2       // bloques antes de la línea de salida donde parten las gatas
    },
    gata: {
        vel: 7.5,       // velocidad máxima (bloques/s)
        acel: 6,        // aceleración
        freno: 12,      // frenar
        roce: 3,        // sin acelerar se va frenando
        atras: 0.35,    // marcha atrás (fracción de vel)
        giro: 2.4,      // giro (rad/s) a buena velocidad
        fuera: 0.5,     // fuera de la pista: fracción de vel
        derrape: 1.45,  // derrapando gira más (× giro)
        carga: 0.9,     // segundos derrapando para cargar el turbo
        turbo: 1.45,    // velocidad con turbo (× vel)
        turboDur: 0.9,  // segundos de turbo
        choque: 0.35    // al chocar con un bloque rebota con esta fracción de la velocidad
    },
    // Cada gata con su carácter (× los de arriba): Mila es más calma y dobla mejor, Gala corre más
    mila: { vel: 0.97, acel: 1.0, giro: 1.08 },
    gala: { vel: 1.03, acel: 1.06, giro: 0.94 },
    ia: {
        vel: 0.9,       // la gata del juego acelera hasta esta fracción
        mira: 4.5,      // bloques adelante que mira para doblar
        carril: 0.6,    // se corre hacia un lado (bloques) para no ir pegada a la tuya
        derrapa: 0.55   // dobla derrapando si el giro pedido pasa de esto (0-1)
    },
    red: { hz: 10, suave: 0.12 },   // mensajes por segundo de cada corredor y suavizado de la gata ajena (s)
    publico: { mirar: 40 },         // metros hasta el centro de la Gatera para ver la carrera de otros
    premio: {
        gana: [['BACALAO_COCIDO', 3], ['LANA', 2]],
        pierde: [['LANA', 1]]
    }
};
export const GATAS = ['mila', 'gala'];

const esObj = v => v && typeof v === 'object' && !Array.isArray(v);
function fundir(base, extra) {
    if (!esObj(extra)) return base;
    const r = { ...base };
    for (const k of Object.keys(extra)) {
        if (esObj(base[k]) && esObj(extra[k])) r[k] = fundir(base[k], extra[k]);
        else if (extra[k] !== undefined && extra[k] !== null) r[k] = extra[k];
    }
    return r;
}
// Reglas = base + JSON (lo que falte, del código)
export function reglasCarrera(datos) {
    const R = fundir(CARRERA, datos || {});
    if (!Array.isArray(R.pista.puntos) || R.pista.puntos.length < 3) R.pista = { ...R.pista, puntos: CARRERA.pista.puntos };
    return R;
}
// Las constantes de una gata (las comunes × su carácter)
export function fisicaDe(R, clave) {
    const g = R.gata, c = R[clave] || {};
    return { ...g, vel: g.vel * (c.vel ?? 1), acel: g.acel * (c.acel ?? 1), giro: g.giro * (c.giro ?? 1) };
}

// ---------------------------------------------------------
// Circuito: puntos del mundo (cx, cz = centro de la Gatera) con el largo acumulado de cada tramo
// ---------------------------------------------------------
export function armarPista(R, cx = 0, cz = 0) {
    const P = R.pista.puntos.map(([x, z]) => ({ x: cx + x, z: cz + z }));
    const acum = [0];
    for (let i = 0; i < P.length; i++) {
        const a = P[i], b = P[(i + 1) % P.length];
        acum.push(acum[i] + Math.hypot(b.x - a.x, b.z - a.z));
    }
    return { P, acum, largo: acum[P.length], ancho: R.pista.ancho, cx, cz };
}
// Punto y dirección a la distancia s del inicio (s se envuelve en el lazo)
export function puntoEn(pista, s) {
    const { P, acum, largo } = pista;
    s = ((s % largo) + largo) % largo;
    let i = 0;
    while (i < P.length - 1 && acum[i + 1] <= s) i++;
    const a = P[i], b = P[(i + 1) % P.length];
    const L = acum[i + 1] - acum[i] || 1, u = (s - acum[i]) / L;
    return { x: a.x + (b.x - a.x) * u, z: a.z + (b.z - a.z) * u, yaw: Math.atan2(b.x - a.x, b.z - a.z), i };
}
// Proyección de (x, z) sobre el circuito: s (distancia desde el inicio) y lat (distancia al eje; + = a la derecha)
export function proyectar(pista, x, z) {
    const { P, acum } = pista;
    let mejor = null;
    for (let i = 0; i < P.length; i++) {
        const a = P[i], b = P[(i + 1) % P.length];
        const dx = b.x - a.x, dz = b.z - a.z, L2 = dx * dx + dz * dz || 1;
        const u = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / L2));
        const px = a.x + dx * u, pz = a.z + dz * u;
        const d = Math.hypot(x - px, z - pz);
        if (!mejor || d < mejor.d) {
            const L = Math.sqrt(L2);
            // derecha del sentido de avance: (dz, -dx) con yaw = atan2(dx, dz)
            const lado = Math.sign((x - px) * (-dz / L) + (z - pz) * (dx / L)) || 0;
            mejor = { d, s: acum[i] + u * L, lat: -lado * d };
        }
    }
    return mejor;
}

// ---------------------------------------------------------
// Una gata en carrera
// ---------------------------------------------------------
// Puesto de salida: k = 0 a la izquierda, 1 a la derecha, un poco antes de la línea
export function salida(pista, R, k) {
    const p = puntoEn(pista, -R.pista.salida);
    const lado = (k ? 1 : -1) * Math.min(1, pista.ancho * 0.3);
    return { x: p.x + Math.cos(p.yaw) * lado, z: p.z - Math.sin(p.yaw) * lado, yaw: p.yaw };
}
export function nuevaGata(pista, R, clave, k) {
    const s = salida(pista, R, k);
    const pr = proyectar(pista, s.x, s.z);
    return {
        clave, x: s.x, z: s.z, yaw: s.yaw, v: 0,
        s: pr.s, av: pr.s > pista.largo / 2 ? pr.s - pista.largo : pr.s, // avance total (arranca un poco antes de 0)
        carga: 0, turbo: 0, derrapa: 0, fuera: false, fin: null, choco: 0
    };
}
const lim = (v, a, b) => Math.max(a, Math.min(b, v));
// Un paso de la física. ent = { ad: -1..1 (acelerar / frenar), giro: -1..1 (+ = a la izquierda), derrape: bool }.
// libre(x, z) opcional: false si ahí hay un bloque (choca y rebota). t = segundos de carrera (para `fin`)
export function pasoGata(g, ent, dt, R, pista, libre = null, t = 0) {
    if (g.fin !== null) { g.v *= Math.max(0, 1 - dt * 2); ent = { ad: 0, giro: 0, derrape: false }; }
    const F = fisicaDe(R, g.clave);
    const ad = lim(ent.ad || 0, -1, 1), giro = lim(ent.giro || 0, -1, 1);
    const pr0 = proyectar(pista, g.x, g.z);
    g.fuera = pr0.d > pista.ancho / 2;
    const tope = F.vel * (g.turbo > 0 ? F.turbo : 1) * (g.fuera ? F.fuera : 1);
    if (ad > 0) g.v += F.acel * ad * dt * (g.turbo > 0 ? 2 : 1);
    else if (ad < 0) g.v += (g.v > 0.2 ? -F.freno : -F.acel) * -ad * dt;
    else g.v -= Math.sign(g.v) * Math.min(Math.abs(g.v), F.roce * dt);
    if (g.v > tope) g.v = Math.max(tope, g.v - F.freno * dt); // fuera de la pista o al terminar el turbo, frena hasta el tope
    g.v = Math.max(g.v, -F.vel * F.atras);
    // Derrape: doblando fuerte a buena velocidad carga el turbo; al soltarlo con la carga llena, sale disparada
    const derrapando = !!ent.derrape && Math.abs(giro) > 0.3 && g.v > F.vel * 0.45 && g.fin === null;
    if (derrapando) { g.carga += dt; g.derrapa = Math.sign(giro); }
    else {
        if (g.derrapa && g.carga >= F.carga) g.turbo = F.turboDur;
        g.carga = 0; g.derrapa = 0;
    }
    g.turbo = Math.max(0, g.turbo - dt);
    // Giro: depende de la velocidad (quieta no gira) y al revés en marcha atrás
    const k = lim(Math.abs(g.v) / 2.5, 0, 1) * Math.sign(g.v || 1);
    g.yaw += giro * F.giro * (derrapando ? F.derrape : 1) * k * dt;
    g.yaw = Math.atan2(Math.sin(g.yaw), Math.cos(g.yaw));
    // Avanzar (con choque contra bloques)
    const nx = g.x + Math.sin(g.yaw) * g.v * dt, nz = g.z + Math.cos(g.yaw) * g.v * dt;
    g.choco = Math.max(0, g.choco - dt);
    if (libre && !libre(nx, nz)) { g.v = -g.v * F.choque; g.choco = 0.4; }
    else { g.x = nx; g.z = nz; }
    // Avance: la diferencia de s envuelta en ±medio largo (así cruzar la línea suma una vuelta y volver atrás la resta)
    const pr = proyectar(pista, g.x, g.z);
    let ds = pr.s - g.s;
    if (ds > pista.largo / 2) ds -= pista.largo;
    else if (ds < -pista.largo / 2) ds += pista.largo;
    g.s = pr.s; g.av += ds;
    if (g.fin === null && g.av >= R.vueltas * pista.largo) g.fin = t;
    return g;
}
// Vuelta en curso (1..vueltas) y fracción de la carrera (0..1)
export const vueltaDe = (g, R, pista) => lim(Math.floor(g.av / pista.largo) + 1, 1, R.vueltas);
export const fraccion = (g, R, pista) => lim(g.av / (R.vueltas * pista.largo), 0, 1);
// Orden de llegada: primero las que terminaron (por tiempo), después por avance
export function puestos(gs) {
    return gs.slice().sort((a, b) => {
        if (a.fin !== null && b.fin !== null) return a.fin - b.fin;
        if (a.fin !== null) return -1;
        if (b.fin !== null) return 1;
        return b.av - a.av;
    });
}

// ---------------------------------------------------------
// IA de la gata rival (en solitario): sigue el eje mirando unos bloques adelante, corrida a su carril;
// dobla derrapando en las curvas cerradas. Sin azar: la misma situación da la misma entrada
// ---------------------------------------------------------
export function entradaIA(g, R, pista, k = 1) {
    const I = R.ia;
    const pr = proyectar(pista, g.x, g.z);
    const p = puntoEn(pista, pr.s + I.mira);
    const lado = (k ? 1 : -1) * I.carril;
    const mx = p.x + Math.cos(p.yaw) * lado, mz = p.z - Math.sin(p.yaw) * lado;
    let d = Math.atan2(mx - g.x, mz - g.z) - g.yaw;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    const giro = lim(d * 1.6, -1, 1);
    const F = fisicaDe(R, g.clave);
    const quiere = F.vel * I.vel * (1 - Math.min(0.5, Math.abs(d) * 0.35));
    return { ad: g.v < quiere ? 1 : g.v > quiere + 0.6 ? -0.4 : 0, giro, derrape: Math.abs(giro) > I.derrapa };
}

// Estado de una gata para la red (redondeado: ~60 bytes) y su lectura
const r2 = n => Math.round(n * 100) / 100;
export const empacar = g => ({ x: r2(g.x), z: r2(g.z), y: r2(g.yaw), v: r2(g.v), a: r2(g.av), tb: g.turbo > 0 ? 1 : 0, d: g.derrapa | 0, f: g.fin === null ? null : r2(g.fin) });
export function desempacar(g, m) {
    if (!m) return g;
    g.x = m.x; g.z = m.z; g.yaw = m.y; g.v = m.v; g.av = m.a; g.turbo = m.tb ? 0.1 : 0; g.derrapa = m.d | 0;
    if (m.f !== null && m.f !== undefined && g.fin === null) g.fin = m.f;
    return g;
}
