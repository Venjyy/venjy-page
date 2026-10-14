// =========================================================
// VENJY · Estudio · Editor de pista de la carrera de gatas (7h-1): lo puro (sin DOM)
// Lo usan estudio/carrera-pista.js (el plano y el perfil) y mundo/tests/carrera.mjs.
//   · insertarPunto / quitarPunto: cambian `pista.puntos` y corrigen los índices de huecos, turbos, túneles y cajas;
//   · avisosPista: lo que está mal o es riesgoso (la pista se pisa a sí misma, un mueble del piso la invade,
//     un hueco sin rampa, puntos muy juntos, fuera de la sala);
//   · probarIA: una carrera completa de las gatas del juego, al instante, y lo que pasó (tiempos, derrapes, caídas);
//   · piezas plantilla (PIEZAS: vuelta 360, espiral, horquilla, salto…): un grupo de puntos con entrada y salida que se
//     pone después de un punto, se mueve y gira entero y se rehace al cambiar sus medidas (`pista.piezas`).
// =========================================================
import * as M from '../mundo/supervivencia/carrera-modelo.js';

const clonar = o => JSON.parse(JSON.stringify(o));

// pista = { puntos, huecos, turbos, tuneles, ... } (se devuelve una copia)
export function insertarPunto(pista, i, punto) {
    const p = clonar(pista);
    p.puntos.splice(i, 0, punto);
    const mover = k => (k >= i ? k + 1 : k);
    for (const h of p.huecos || []) h.punto = mover(h.punto);
    for (const t of p.turbos || []) t.punto = mover(t.punto);
    for (const c of p.cajas || []) c.punto = mover(c.punto);
    for (const t of p.tuneles || []) { t.desde = mover(t.desde); t.hasta = mover(t.hasta); }
    // Un punto dentro de una pieza la suelta (sus puntos quedan sueltos)
    if (p.piezas) p.piezas = p.piezas.filter(z => !(i > z.desde && i <= z.hasta)).map(z => ({ ...z, desde: mover(z.desde), hasta: mover(z.hasta) }));
    return p;
}
export function quitarPunto(pista, i) {
    const p = clonar(pista);
    if (p.puntos.length <= 4) return p;
    p.puntos.splice(i, 1);
    const n = p.puntos.length;
    const mover = k => (k > i ? k - 1 : k === i ? Math.min(k, n - 1) : k);
    p.huecos = (p.huecos || []).filter(h => h.punto !== i).map(h => ({ ...h, punto: mover(h.punto) }));
    p.turbos = (p.turbos || []).filter(t => t.punto !== i).map(t => ({ ...t, punto: mover(t.punto) }));
    if (p.cajas) p.cajas = p.cajas.filter(c => c.punto !== i).map(c => ({ ...c, punto: mover(c.punto) }));
    p.tuneles = (p.tuneles || []).map(t => ({ ...t, desde: mover(t.desde), hasta: mover(t.hasta) })).filter(t => t.desde !== t.hasta);
    if (p.piezas) p.piezas = p.piezas.filter(z => i < z.desde || i > z.hasta).map(z => ({ ...z, desde: mover(z.desde), hasta: mover(z.hasta) }));
    return p;
}
// El segmento (entre el punto i y el i+1) más cercano a (x, z): { i, d } (para insertar con doble clic)
export function segmentoCercano(puntos, x, z) {
    let mejor = null;
    for (let i = 0; i < puntos.length; i++) {
        const a = puntos[i], b = puntos[(i + 1) % puntos.length];
        const dx = b[0] - a[0], dz = b[2] - a[2], L2 = dx * dx + dz * dz || 1;
        const u = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[2]) * dz) / L2));
        const d = Math.hypot(x - a[0] - dx * u, z - a[2] - dz * u);
        if (!mejor || d < mejor.d) mejor = { i, d, u };
    }
    return mejor;
}

// Avisos: [{ tipo: 'error' | 'ojo', es, en, x?, z? }]
export function avisosPista(R) {
    const P = M.armarPista(R), av = [];
    // La pista se pisa a sí misma (a la misma altura)
    let peor = null;
    for (let i = 0; i < P.N; i += 2) for (let j = i + 60; j < P.N; j += 2) {
        if (P.N - (j - i) < 60) continue;
        const a = P.m[i], b = P.m[j];
        if (Math.abs(a.y - b.y) >= 3) continue;
        const d = Math.hypot(a.x - b.x, a.z - b.z) - (a.ancho + b.ancho) / 2;
        if (d < 0 && (!peor || d < peor.d)) peor = { d, x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 };
    }
    if (peor) av.push({ tipo: 'error', es: 'La pista se cruza consigo misma a la misma altura', en: 'The track crosses itself at the same height', x: peor.x, z: peor.z });
    // Muebles del piso que pisan la pista
    for (const m of R.muebles || []) {
        if (['alfombra', 'sofa', 'mesa'].includes(m.tipo)) continue;
        if (R.pista.apoyar && M.subeEncima(m)) continue; // la pista sube sola encima (rampa)
        for (const q of P.m) {
            if (q.y > m.h + 1) continue;
            const dx = Math.max(0, Math.abs(q.x - m.x) - m.a / 2), dz = Math.max(0, Math.abs(q.z - m.z) - m.f / 2);
            if (Math.hypot(dx, dz) < q.ancho / 2) { av.push({ tipo: 'error', es: `${m.tipo} pisa la pista`, en: `${m.tipo} is on the track`, x: m.x, z: m.z }); break; }
        }
    }
    // Patas de la mesa sobre la pista
    for (const m of R.muebles || []) if (m.tipo === 'mesa') {
        for (const [px, pz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
            const lx = m.x + px * (m.a / 2 - 1), lz = m.z + pz * (m.f / 2 - 1);
            if (P.m.some(q => q.y < m.h && Math.hypot(q.x - lx, q.z - lz) < q.ancho / 2 + 0.8)) { av.push({ tipo: 'error', es: 'Una pata de la mesa queda sobre la pista', en: 'A table leg is on the track', x: lx, z: lz }); break; }
        }
        if (P.m.some(q => q.y + 2.2 > m.h && Math.abs(q.x - m.x) < m.a / 2 && Math.abs(q.z - m.z) < m.f / 2)) av.push({ tipo: 'error', es: 'La pista choca con la mesa (muy alta bajo la mesa)', en: 'The track hits the table (too high under it)', x: m.x, z: m.z });
    }
    // Fuera de la sala
    const S = R.sala;
    if (P.m.some(q => Math.abs(q.x - S.x) > S.ancho / 2 - q.ancho / 2 || Math.abs(q.z - S.z) > S.fondo / 2 - q.ancho / 2)) av.push({ tipo: 'error', es: 'La pista se sale de la sala', en: 'The track leaves the room' });
    // Puntos muy juntos
    const pts = R.pista.puntos;
    pts.forEach((a, i) => { const b = pts[(i + 1) % pts.length]; if (Math.hypot(a[0] - b[0], a[2] - b[2]) < 3) av.push({ tipo: 'ojo', es: `Los puntos ${i + 1} y ${(i + 1) % pts.length + 1} están muy juntos (la curva sale rara)`, en: `Points ${i + 1} and ${(i + 1) % pts.length + 1} are too close`, x: a[0], z: a[2] }); });
    // Pendientes muy fuertes
    const empinada = P.m.find(q => Math.abs(q.pend) > 0.7);
    if (empinada) av.push({ tipo: 'ojo', es: 'Hay una subida o bajada muy empinada', en: 'There is a very steep slope', x: empinada.x, z: empinada.z });
    // Huecos: deben empezar en una subida o en lo alto (si no, nadie los salta)
    for (const h of R.pista.huecos || []) {
        const s0 = P.puntos[h.punto]; if (s0 === undefined) continue;
        const q = M.enPista(P, s0 - 1), q2 = M.enPista(P, s0 + (h.largo || 4) + 1);
        if (q.y - q2.y < -0.5) av.push({ tipo: 'ojo', es: `El hueco del punto ${h.punto + 1} cae más alto que donde sale: cuesta saltarlo`, en: `The gap at point ${h.punto + 1} lands higher than it starts`, x: q.x, z: q.z });
    }
    // Cajas de objetos sobre un hueco (nadie las toma)
    for (const c of R.pista.cajas || []) {
        const s0 = P.puntos[c.punto]; if (s0 === undefined) continue;
        const q = M.enPista(P, s0 + (c.avance || 0));
        if (!q.piso) av.push({ tipo: 'ojo', es: `Las cajas del punto ${c.punto + 1} quedan sobre un hueco`, en: `The item boxes at point ${c.punto + 1} are over a gap`, x: q.x, z: q.z });
    }
    return av;
}

// Una carrera de prueba con la IA (todas las gatas, con objetos): { ok, mejor, ultimo, derrapes, caidas, turbos, objetos, golpes, porGata: [{ clave, fin }] }
export function probarIA(R, { dificultad = 'normal', semilla = 11, dt = 1 / 60 } = {}) {
    const r = { ...R, dificultad };
    const P = M.armarPista(r), rnd = M.azar(semilla);
    const gs = r.gatas.map((d, k) => M.nuevaGata(P, r, d, k)), W = M.nuevosObjetos(r, P);
    let t = 0, derrapes = 0, caidas = 0, turbos = 0, objetos = 0, golpes = 0;
    while (gs.some(g => g.fin === null) && t < r.tope) {
        const ents = gs.map(g => M.entradaIA(g, r, P, rnd, null, { gs, W }));
        gs.forEach((g, i) => {
            const ev = M.pasoGata(g, ents[i], dt, r, P, t);
            for (const e of ev) { if (e === 'derrape') derrapes++; else if (e === 'cae') caidas++; else if (e === 'turbo' || e === 'placa') turbos++; }
        });
        for (const e of M.pasoObjetos(W, gs, ents, dt, r, P, rnd)) { if (e.e === 'usa') objetos++; else if (['golpe', 'come', 'reves', 'susto'].includes(e.e)) golpes++; }
        M.chocarGatas(gs, r);
        t += dt;
    }
    const fines = gs.map(g => g.fin).filter(f => f !== null);
    return {
        ok: fines.length === gs.length, largo: P.largo, mejor: fines.length ? Math.min(...fines) : null, ultimo: fines.length ? Math.max(...fines) : null,
        derrapes, caidas, turbos, objetos, golpes, porGata: M.puestos(gs).map(g => ({ clave: g.clave, nombre: g.def.nombre, fin: g.fin }))
    };
}

// ---------------------------------------------------------
// Piezas plantilla
// ---------------------------------------------------------
// Cada pieza es un grupo de puntos [desde..hasta] de `pista.puntos` con su entrada (el primero) y su salida (el último);
// `pista.piezas` guarda { tipo, desde, hasta, giro (grados: hacia dónde mira la entrada) } y sus medidas. La pista
// sigue siendo una lista de puntos (el juego no sabe de piezas): el dueño conecta la entrada y la salida con el resto.
// Medidas por forma: [clave, es, en, mínimo, máximo, paso]
export const MEDIDAS = {
    espiral: [['vueltas', 'vueltas', 'turns', 0.5, 4, 0.25], ['radio', 'radio (bloques)', 'radius (blocks)', 8, 40, 0.5], ['sube', 'sube (bloques; menos = baja)', 'climbs (blocks; minus = down)', -40, 40, 0.5], ['lado', 'lado (1 izq., -1 der.)', 'side (1 left, -1 right)', -1, 1, 2]],
    curva: [['angulo', 'ángulo (grados)', 'angle (degrees)', 15, 270, 15], ['radio', 'radio (bloques)', 'radius (blocks)', 8, 60, 0.5], ['sube', 'sube (bloques)', 'climbs (blocks)', -20, 20, 0.5], ['lado', 'lado (1 izq., -1 der.)', 'side (1 left, -1 right)', -1, 1, 2]],
    salto: [['alto', 'alto de la rampa', 'ramp height', 1, 12, 0.5], ['largo', 'largo de la rampa', 'ramp length', 6, 40, 1], ['hueco', 'largo del hueco', 'gap length', 2, 16, 0.5]],
    eses: [['curvas', 'curvas', 'bends', 2, 8, 1], ['ancho', 'cuánto se abre (bloques)', 'how wide (blocks)', 2, 20, 0.5], ['largo', 'largo (bloques)', 'length (blocks)', 20, 140, 2]],
    recta: [['largo', 'largo (bloques)', 'length (blocks)', 8, 120, 2], ['sube', 'sube (bloques)', 'climbs (blocks)', -20, 20, 0.5]]
};
export const PIEZAS = {
    vuelta: { es: 'Vuelta 360 (pasa por encima)', en: '360 loop (crosses over)', gen: 'espiral', vueltas: 1, radio: 13, sube: 6, lado: 1 },
    espiral: { es: 'Subida en espiral', en: 'Spiral climb', gen: 'espiral', vueltas: 2, radio: 15, sube: 14, lado: 1 },
    bajada: { es: 'Bajada en espiral', en: 'Spiral descent', gen: 'espiral', vueltas: 2, radio: 15, sube: -14, lado: 1 },
    horquilla: { es: 'Horquilla (vuelta en U)', en: 'Hairpin (U-turn)', gen: 'curva', angulo: 180, radio: 12, sube: 0, lado: 1 },
    curva: { es: 'Curva de 90°', en: '90° bend', gen: 'curva', angulo: 90, radio: 18, sube: 0, lado: 1 },
    salto: { es: 'Rampa con salto', en: 'Ramp jump', gen: 'salto', alto: 3.5, largo: 14, hueco: 6 },
    eses: { es: 'Eses', en: 'Chicane', gen: 'eses', curvas: 3, ancho: 7, largo: 56 },
    rampa: { es: 'Recta con subida', en: 'Straight climb', gen: 'recta', largo: 30, sube: 6 }
};
const ENTRA = 6, SALE = 8; // bloques rectos antes y después (para que la pieza conecte derecha)
const r1 = v => Math.round(v * 10) / 10;
// Medidas de una pieza (las suyas o las de su plantilla)
export const medidasDe = pz => Object.fromEntries((MEDIDAS[PIEZAS[pz.tipo]?.gen] || []).map(([k]) => [k, pz[k] ?? PIEZAS[pz.tipo][k]]));
// Puntos locales: { puntos: [[u (a la izquierda), y, f (adelante)]], huecos: [{ punto, largo }], turbos } (índices locales)
export function generarPieza(pz) {
    const d = { ...medidasDe(pz) }, gen = PIEZAS[pz.tipo]?.gen;
    const pts = [[0, 0, 0]], huecos = [], turbos = [];
    if (gen === 'espiral' || gen === 'curva') {
        const r = d.radio, lado = d.lado < 0 ? -1 : 1;
        const total = gen === 'espiral' ? d.vueltas * Math.PI * 2 : d.angulo * Math.PI / 180;
        const pasos = Math.max(2, Math.ceil(total / (Math.PI / 5)));
        pts.push([0, 0, ENTRA]);
        for (let k = 1; k <= pasos; k++) {
            const a = (k / pasos) * total;
            pts.push([lado * r * (1 - Math.cos(a)), d.sube * k / pasos, ENTRA + r * Math.sin(a)]);
        }
        const fin = pts[pts.length - 1];
        pts.push([fin[0] + lado * Math.sin(total) * SALE, d.sube, fin[2] + Math.cos(total) * SALE]);
    } else if (gen === 'salto') {
        const top = ENTRA + d.largo, cae = top + d.hueco + 4;
        pts.push([0, 0, ENTRA], [0, d.alto, top], [0, Math.max(0, d.alto - 0.5), cae], [0, 0, cae + d.largo], [0, 0, cae + d.largo + SALE]);
        huecos.push({ punto: 2, largo: d.hueco });
        turbos.push({ punto: 1, avance: 0, lado: 0, largo: 3 });
    } else if (gen === 'eses') {
        const n = Math.round(d.curvas);
        for (let k = 1; k <= n; k++) pts.push([(k % 2 ? 1 : -1) * d.ancho, 0, d.largo * k / (n + 1)]);
        pts.push([0, 0, d.largo], [0, 0, d.largo + SALE]);
    } else {
        pts.push([0, d.sube / 2, d.largo / 2], [0, d.sube, d.largo], [0, d.sube, d.largo + SALE]);
    }
    return { puntos: pts, huecos, turbos };
}
// La pieza en el mundo: entrada en (x, y, z) mirando hacia `giro` (grados; 0 = hacia +z)
export function piezaEnMundo(pz, x, y, z) {
    const g = (pz.giro || 0) * Math.PI / 180, sg = Math.sin(g), cg = Math.cos(g), G = generarPieza(pz);
    return { ...G, puntos: G.puntos.map(([u, py, f]) => [r1(x + f * sg + u * cg), r1(Math.max(0, Math.min(60, y + py))), r1(z + f * cg - u * sg)]) };
}
// Cambia los puntos [desde..hasta] por `nuevos` y corre los índices de lo que viene después (lo de adentro se queda si cabe)
function reemplazarTramo(p, desde, hasta, nuevos) {
    const viejos = hasta - desde + 1, delta = nuevos.length - viejos;
    p.puntos.splice(desde, viejos, ...nuevos);
    const mover = k => (k > hasta ? k + delta : k < desde ? k : k - desde < nuevos.length ? k : -1);
    const fil = (lista, f) => (lista || []).map(f).filter(Boolean);
    p.huecos = fil(p.huecos, h => (mover(h.punto) < 0 ? null : { ...h, punto: mover(h.punto) }));
    p.turbos = fil(p.turbos, t => (mover(t.punto) < 0 ? null : { ...t, punto: mover(t.punto) }));
    if (p.cajas) p.cajas = fil(p.cajas, c => (mover(c.punto) < 0 ? null : { ...c, punto: mover(c.punto) }));
    p.tuneles = fil(p.tuneles, t => (mover(t.desde) < 0 || mover(t.hasta) < 0 ? null : { ...t, desde: mover(t.desde), hasta: mover(t.hasta) }));
    if (p.piezas) p.piezas = p.piezas.map(z => (z.desde > hasta ? { ...z, desde: z.desde + delta, hasta: z.hasta + delta } : z));
}
// Pone una pieza nueva después del punto i: su entrada, `ENTRA` bloques más allá, mirando hacia el punto siguiente
export function ponerPieza(pista, i, tipo) {
    const p = clonar(pista), n = p.puntos.length, a = p.puntos[i], b = p.puntos[(i + 1) % n];
    const giro = Math.round(Math.atan2(b[0] - a[0], b[2] - a[2]) * 180 / Math.PI);
    const pz = { tipo, giro, ...medidasDe({ tipo }) }, g = giro * Math.PI / 180;
    const W = piezaEnMundo(pz, a[0] + Math.sin(g) * ENTRA, a[1], a[2] + Math.cos(g) * ENTRA);
    let q = p;
    W.puntos.forEach((pt, k) => { q = insertarPunto(q, i + 1 + k, pt); });
    for (const h of W.huecos) (q.huecos = q.huecos || []).push({ punto: i + 1 + h.punto, largo: h.largo });
    for (const t of W.turbos) (q.turbos = q.turbos || []).push({ ...t, punto: i + 1 + t.punto });
    (q.piezas = q.piezas || []).push({ ...pz, desde: i + 1, hasta: i + W.puntos.length });
    return q;
}
// Rehace la pieza k con `cambios` (medidas o giro), con la entrada donde está ahora
export function rehacerPieza(pista, k, cambios = {}) {
    const p = clonar(pista), z = p.piezas[k], e = p.puntos[z.desde];
    const viejo = piezaEnMundo(z, e[0], e[1], e[2]);
    // Quita los huecos y turbos que había puesto la pieza (los que agregó el dueño se quedan)
    p.huecos = (p.huecos || []).filter(h => !viejo.huecos.some(v => z.desde + v.punto === h.punto && v.largo === h.largo));
    p.turbos = (p.turbos || []).filter(t => !viejo.turbos.some(v => z.desde + v.punto === t.punto && v.largo === t.largo && v.avance === (t.avance || 0)));
    Object.assign(z, cambios);
    const W = piezaEnMundo(z, e[0], e[1], e[2]);
    reemplazarTramo(p, z.desde, z.hasta, W.puntos);
    z.hasta = z.desde + W.puntos.length - 1;
    for (const h of W.huecos) p.huecos.push({ punto: z.desde + h.punto, largo: h.largo });
    for (const t of W.turbos) p.turbos.push({ ...t, punto: z.desde + t.punto });
    return p;
}
// Quita la pieza k con sus puntos (si quedan al menos 4)
export function quitarPieza(pista, k) {
    const p = clonar(pista), z = p.piezas[k];
    if (p.puntos.length - (z.hasta - z.desde + 1) < 4) return p;
    p.piezas.splice(k, 1);
    const fuera = i => i >= z.desde && i <= z.hasta;
    p.huecos = (p.huecos || []).filter(h => !fuera(h.punto));
    p.turbos = (p.turbos || []).filter(t => !fuera(t.punto));
    if (p.cajas) p.cajas = p.cajas.filter(c => !fuera(c.punto));
    p.tuneles = (p.tuneles || []).filter(t => !fuera(t.desde) && !fuera(t.hasta));
    reemplazarTramo(p, z.desde, z.hasta, []);
    return p;
}
// La pieza que tiene el punto i (su índice en `pista.piezas`, o -1)
export const piezaDe = (pista, i) => (pista.piezas || []).findIndex(z => i >= z.desde && i <= z.hasta);
