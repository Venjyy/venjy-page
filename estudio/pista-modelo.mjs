// =========================================================
// VENJY · Estudio · Editor de pista de la carrera de gatas (7h-1): lo puro (sin DOM)
// Lo usan estudio/carrera-pista.js (el plano y el perfil) y mundo/tests/carrera.mjs.
//   · insertarPunto / quitarPunto: cambian `pista.puntos` y corrigen los índices de huecos, turbos y túneles;
//   · avisosPista: lo que está mal o es riesgoso (la pista se pisa a sí misma, un mueble del piso la invade,
//     un hueco sin rampa, puntos muy juntos, fuera de la sala);
//   · probarIA: una carrera completa de las gatas del juego, al instante, y lo que pasó (tiempos, derrapes, caídas).
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
    for (const t of p.tuneles || []) { t.desde = mover(t.desde); t.hasta = mover(t.hasta); }
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
    p.tuneles = (p.tuneles || []).map(t => ({ ...t, desde: mover(t.desde), hasta: mover(t.hasta) })).filter(t => t.desde !== t.hasta);
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
    return av;
}

// Una carrera de prueba con la IA (todas las gatas): { ok, mejor, ultimo, derrapes, caidas, turbos, porGata: [{ clave, fin }] }
export function probarIA(R, { dificultad = 'normal', semilla = 11, dt = 1 / 60 } = {}) {
    const r = { ...R, dificultad };
    const P = M.armarPista(r), rnd = M.azar(semilla);
    const gs = r.gatas.map((d, k) => M.nuevaGata(P, r, d, k));
    let t = 0, derrapes = 0, caidas = 0, turbos = 0;
    while (gs.some(g => g.fin === null) && t < r.tope) {
        for (const g of gs) {
            const ev = M.pasoGata(g, M.entradaIA(g, r, P, rnd), dt, r, P, t);
            for (const e of ev) { if (e === 'derrape') derrapes++; else if (e === 'cae') caidas++; else if (e === 'turbo' || e === 'placa') turbos++; }
        }
        M.chocarGatas(gs, r);
        t += dt;
    }
    const fines = gs.map(g => g.fin).filter(f => f !== null);
    return {
        ok: fines.length === gs.length, largo: P.largo, mejor: fines.length ? Math.min(...fines) : null, ultimo: fines.length ? Math.max(...fines) : null,
        derrapes, caidas, turbos, porGata: M.puestos(gs).map(g => ({ clave: g.clave, nombre: g.def.nombre, fin: g.fin }))
    };
}
