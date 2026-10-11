// =========================================================
// VENJY · Supervivencia · Pose del cuerpo del jugador (7c-1)
// Una sola fuente para el cuerpo propio en tercera persona (camaras.js) y el de los demás
// jugadores del cooperativo (coop.js): caminar y correr, golpe en arco, objeto en la mano,
// comer, arco tensado, escudo y sentado (para 7g).
//  · `entrada` describe lo que hace el jugador ({ mov, corre, agachado, golpe, comiendo,
//    tensando, bloqueando, objeto, objeto2, pitch, sentado }); `estado` guarda lo suavizado.
//  · `avanzar` + `angulos` son puros (sin Three.js): los prueba mundo/tests/pose-jugador.mjs.
//  · `posar(modelo, estado, entrada, dt)` escribe los huesos del rig (referencia/rig.md de la
//    skill animaciones-minecraft) y pone el objeto en la mano con `ponerObjeto`.
//  · Red: el estado viaja en el mensaje `p` (sin mensajes nuevos): bits en `f` (`codificarF`).
// Las escenas y minijuegos que mueven el cuerpo siguen mandando: camaras.js no llama a `posar`
// mientras hay cine, `cine.pose` o la ronda del iglú.
// =========================================================

// Bits de `f` en el mensaje `p` (1 y 2 ya existían)
export const F = { AGACHADO: 1, MUERTO: 2, CORRE: 4, GOLPE: 8, COME: 16, TENSA: 32, BLOQUEA: 64 };

export function codificarF(e) {
    return (e.agachado ? F.AGACHADO : 0) | (e.muerto ? F.MUERTO : 0) | (e.corre ? F.CORRE : 0) | (e.golpe ? F.GOLPE : 0) |
        (e.comiendo ? F.COME : 0) | (e.tensando ? F.TENSA : 0) | (e.bloqueando ? F.BLOQUEA : 0);
}
export function decodificarF(f = 0) {
    return { agachado: !!(f & F.AGACHADO), muerto: !!(f & F.MUERTO), corre: !!(f & F.CORRE), golpe: !!(f & F.GOLPE), comiendo: !!(f & F.COME), tensando: !!(f & F.TENSA), bloqueando: !!(f & F.BLOQUEA) };
}

// Duraciones y valores (Minecraft: el golpe dura 6 ticks = 0,3 s)
export const GOLPE_S = 0.3;
const lim = (v, a, b) => Math.max(a, Math.min(b, v));
const suavizar = (cur, meta, dt, rapidez) => cur + (meta - cur) * Math.min(1, dt * rapidez);

// Poses meta (radianes, nombres cortos de rig.md). Las afina el subagente de animación.
export const POSES = {
    // Con algo en la mano el brazo va un poco adelante (Minecraft: −π/10)
    sostener: { bDx: -0.31 },
    // Golpe: el brazo sube adelante y baja cruzando hacia el pecho; el torso acompaña con un giro
    golpe: { alto: 1.2, extra: 0.75, cruce: 0.4, giro: 0.2 },
    // Correr: más amplitud y frecuencia, el cuerpo inclinado
    correr: { inc: 0.2, amp: 1.0 },
    caminar: { amp: 0.8 },
    // Comer: la mano a la boca y un vaivén corto
    comer: { bDx: -1.35, bDz: 0.35, vaiven: 0.12, f: 16, cx: 0.1 },
    // Arco: los dos brazos al frente siguiendo la mirada; el izquierdo cruza hacia el centro
    arco: { bDy: -0.1, bIy: 0.5 },
    // Escudo: el brazo del escudo al frente y hacia el centro
    escudo: { bx: -0.94, by: 0.52 },
    // Sentado en el suelo (atlas de rig.md); lo usa 7g
    sentado: { y: -0.62, pDx: -1.45, pIx: -1.45, inc: 0.15, bDx: -0.6, bIx: -0.6 }
};

export function crearEstado() {
    return { fase: 0, amp: 0, correr: 0, golpe: -1, comer: 0, tensar: 0, bloquear: 0, sentado: 0, t: 0 };
}

// Avanza lo suavizado. entrada.golpe = true empieza (o reinicia en su segunda mitad) un golpe.
export function avanzar(e, ent, dt) {
    e.t += dt;
    const mov = Math.min(9, ent.mov || 0);
    const corre = ent.corre && mov > 1 ? 1 : 0;
    e.correr = suavizar(e.correr, corre, dt, 6);
    // Frecuencia: la de siempre (2,6 por bloque) y algo más corriendo
    e.fase += mov * dt * (2.6 + 0.5 * e.correr);
    const ampMax = POSES.caminar.amp + (POSES.correr.amp - POSES.caminar.amp) * e.correr;
    e.amp = suavizar(e.amp, Math.min(ampMax, mov * 0.18 * (1 + 0.25 * e.correr)), dt, 10);
    if (ent.golpe && (e.golpe < 0 || e.golpe > 0.5)) e.golpe = 0;
    else if (e.golpe >= 0) { e.golpe += dt / GOLPE_S; if (e.golpe >= 1) e.golpe = -1; }
    e.comer = suavizar(e.comer, ent.comiendo ? 1 : 0, dt, 10);
    e.tensar = suavizar(e.tensar, ent.tensando ? 1 : 0, dt, 10);
    e.bloquear = suavizar(e.bloquear, ent.bloqueando ? 1 : 0, dt, 12);
    e.sentado = suavizar(e.sentado, ent.sentado ? 1 : 0, dt, 6);
    return e;
}

const mezcla = (a, b, k) => a + (b - a) * k;

// Ángulos del cuadro (puro). Devuelve los campos de rig.md más ry (giro del torso) y bDy/bIy.
export function angulos(e, ent, escudo = 0) {
    const a = { cx: 0, cy: 0, bDx: 0, bDy: 0, bDz: 0, bIx: 0, bIy: 0, bIz: 0, pDx: 0, pIx: 0, inc: 0, ry: 0, y: 0 };
    // Caminar / correr
    const b = Math.sin(e.fase) * e.amp;
    a.pDx = b; a.pIx = -b;
    a.bDx = -b * 0.8; a.bIx = b * 0.8;
    a.inc = (ent.agachado ? 0.35 : 0) + POSES.correr.inc * e.correr;
    const pit = ent.pitch || 0;
    a.cx = lim(-pit * 0.8, -0.8, 0.8);
    // Objeto en la mano: el brazo un poco adelante
    if (ent.objeto) a.bDx = a.bDx * 0.5 + POSES.sostener.bDx;
    if (ent.objeto2) a.bIx = a.bIx * 0.5 + POSES.sostener.bDx;
    // Comer
    if (e.comer > 0.001) {
        const c = POSES.comer, v = Math.abs(Math.sin(e.t * c.f)) * c.vaiven;
        a.bDx = mezcla(a.bDx, c.bDx + v, e.comer);
        a.bDz = mezcla(a.bDz, c.bDz, e.comer);
        a.cx = mezcla(a.cx, c.cx + v * 0.5, e.comer);
    }
    // Arco tensado: brazos al frente siguiendo la mirada
    if (e.tensar > 0.001) {
        const mira = -Math.PI / 2 - pit;
        a.bDx = mezcla(a.bDx, mira, e.tensar); a.bDy = mezcla(a.bDy, POSES.arco.bDy, e.tensar);
        a.bIx = mezcla(a.bIx, mira, e.tensar); a.bIy = mezcla(a.bIy, POSES.arco.bIy, e.tensar);
    }
    // Escudo: con el escudo en la mano principal (escudo = 1) bloquea la derecha; si no, la izquierda
    if (e.bloquear > 0.001) {
        const s = POSES.escudo;
        if (escudo === 1) { a.bDx = mezcla(a.bDx, a.bDx * 0.5 + s.bx, e.bloquear); a.bDy = mezcla(a.bDy, -s.by, e.bloquear); }
        else { a.bIx = mezcla(a.bIx, a.bIx * 0.5 + s.bx, e.bloquear); a.bIy = mezcla(a.bIy, s.by, e.bloquear); }
    }
    // Golpe en arco (encima de todo lo anterior)
    if (e.golpe >= 0) {
        const g = POSES.golpe, p = e.golpe;
        const f1 = Math.sin(Math.sqrt(p) * Math.PI), f2 = Math.sin(p * Math.PI);
        a.ry = Math.sin(Math.sqrt(p) * Math.PI * 2) * g.giro;
        a.bDx -= f1 * g.alto + f2 * g.extra * 0.5;
        a.bDz += f2 * g.cruce;
        a.bIx += a.ry; // el brazo libre acompaña el giro
    }
    // Sentado
    if (e.sentado > 0.001) {
        const s = POSES.sentado;
        a.y = mezcla(a.y, s.y, e.sentado);
        a.pDx = mezcla(a.pDx, s.pDx, e.sentado); a.pIx = mezcla(a.pIx, s.pIx, e.sentado);
        a.inc = mezcla(a.inc, s.inc, e.sentado);
        if (e.golpe < 0 && e.comer < 0.5) { a.bDx = mezcla(a.bDx, s.bDx, e.sentado); a.bIx = mezcla(a.bIx, s.bIx, e.sentado); }
    }
    a.bDx = lim(a.bDx, -2.9, 0.9); a.bIx = lim(a.bIx, -2.9, 0.9);
    return a;
}

// Escribe los ángulos en el rig (huesos de crearPersona)
export function aplicarAngulos(m, a) {
    m.cuello.rotation.set(a.cx, a.cy, 0);
    m.brazoD.rotation.set(a.bDx, a.bDy, a.bDz);
    m.brazoI.rotation.set(a.bIx, a.bIy, a.bIz);
    m.piernaD.rotation.set(a.pDx, 0, 0);
    m.piernaI.rotation.set(a.pIx, 0, 0);
    m.cuerpo.rotation.set(a.inc, a.ry, 0);
    m.cuerpo.position.y = a.y;
}

// Deja el rig como lo dejaba la caminata de antes (para escenas: cine.pose, ronda, minijuegos)
export function limpiar(m) {
    for (const h of [m.brazoD, m.brazoI, m.piernaD, m.piernaI]) { h.rotation.y = 0; h.rotation.z = 0; }
    m.cuerpo.rotation.set(0, 0, 0);
    m.cuerpo.position.y = 0;
    ocultarObjetos(m);
}

// ---------- Objeto en la mano del cuerpo ----------
// fabrica = mano.fabrica (mallas de mano.js con su geometría en caché por id).
// Cada modelo tiene su par de materiales (para teñirlos con la luz de donde está).
// Colocación en la punta del brazo (en coordenadas del brazo: cuelga hacia −y, el frente es +z)
export const AGARRE = {
    objeto: { pos: [0, -0.68, 0.08], rot: [0, -Math.PI / 2, 0], escala: 0.55, mango: [-0.32, -0.32] },
    herramienta: { pos: [0, -0.68, 0.08], rot: [Math.PI / 4, -Math.PI / 2, 0], escala: 0.62, mango: [-0.36, -0.36] },
    bloque: { pos: [0, -0.78, 0.12], rot: [0, Math.PI / 4, 0], escala: 1.4 }
};

function soporte(m, lado) {
    const k = lado ? 'objetoI' : 'objetoD';
    if (!m[k]) m[k] = { id: 0, malla: null, mats: null };
    return m[k];
}
export function ponerObjeto(m, id, fabrica, lado = 0) {
    const s = soporte(m, lado);
    if (s.id === id) { if (s.malla) s.malla.visible = true; return; }
    const brazo = lado ? m.brazoI : m.brazoD;
    if (s.malla) { brazo.remove(s.malla); s.malla = null; }
    s.id = id;
    if (!id || !fabrica) return;
    if (!s.mats) s.mats = fabrica.materiales();
    const { malla, tipo } = fabrica.malla(id, s.mats);
    const ag = AGARRE[tipo] || AGARRE.objeto;
    const g = new fabrica.THREE.Group();
    g.position.set(...ag.pos);
    g.rotation.set(...ag.rot);
    malla.scale.setScalar(ag.escala);
    malla.rotation.set(0, 0, 0);
    // El mango (abajo a la izquierda del dibujo) queda en la mano
    if (ag.mango) malla.position.set(-ag.mango[0] * ag.escala, -ag.mango[1] * ag.escala, 0);
    g.add(malla);
    brazo.add(g);
    s.malla = g;
}
export function ocultarObjetos(m) {
    for (const lado of [0, 1]) { const s = m[lado ? 'objetoI' : 'objetoD']; if (s && s.malla) s.malla.visible = false; }
}
// Tiñe los objetos con la luz del lugar (la misma que recibe el cuerpo)
export function iluminarObjetos(m, color) {
    for (const lado of [0, 1]) {
        const s = m[lado ? 'objetoI' : 'objetoD'];
        if (s && s.mats) for (const mat of s.mats) mat.color.copy(color);
    }
}

// Todo junto: avanzar, escribir huesos y poner los objetos
export function posar(m, e, ent, dt, fabrica, escudo = 0) {
    avanzar(e, ent, dt);
    aplicarAngulos(m, angulos(e, ent, escudo));
    if (fabrica) { ponerObjeto(m, ent.objeto || 0, fabrica, 0); ponerObjeto(m, ent.objeto2 || 0, fabrica, 1); }
}
