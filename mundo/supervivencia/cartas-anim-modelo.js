// =========================================================
// VENJY · Supervivencia · Duelo de Cartas Pixel: animaciones, parte pura (pulido, PR 1)
// Sin DOM ni Three, para probarla en Node (mundo/tests/cartas-mesa.mjs):
//   ANIM                       → tiempos, intensidad y colores por defecto. Van dentro de MESA
//                                (cartas-mesa-modelo.js), así que mundo/datos/cartas-mesa.json los ajusta igual
//                                que las medidas de la mesa (pestaña Mesa del Estudio).
//   planificar(ev, A, e)       → la línea de tiempo de una jugada a partir de los eventos de `aplicar` (no de la
//                                jugada): así cada equipo de un duelo de 2 jugadores anima lo mismo.
// El estado ya está aplicado cuando se anima: la línea de tiempo dice qué mostrar encima y qué esconder del
// estado final hasta que le toque (la carta que entra, la que robas) y qué fantasmas dibujar (la que muere).
// =========================================================

export const ANIM = {
    // activas: 0 = sin animaciones (el estado final es el mismo) · velocidad: 2 = el doble de rápido
    // arco: cuánto sube una carta que vuela (m) · alzar: altura a la que se muestra un hechizo (m)
    // embestida: cuánto del camino recorre la carta que ataca (0-1) · sacudida: cuánto tiembla la golpeada (m)
    // flota: cuánto sube un número (px) · numero: tamaño del número (px) · pulso: cuánto crece el brillo
    // tocarSalta: 1 = tocar la pantalla mientras anima la termina al tiro
    anim: { activas: 1, velocidad: 1, arco: 0.14, alzar: 0.22, embestida: 0.7, sacudida: 0.025, flota: 46, numero: 34, pulso: 1.6, tocarSalta: 1 },
    // Segundos que dura cada evento (a velocidad 1)
    duraciones: { roba: 0.4, quema: 0.5, invoca: 0.55, hechizo: 1.1, efecto: 0.45, ataque: 0.55, dano: 0.8, cura: 0.8, sube: 0.7, muere: 0.7, vuelve: 0.5, modo: 0.3, escudo: 0.45, salva: 0.5, atada: 0.4, abrazo: 0.6, turno: 1.1 },
    // Cuánto del evento pasa antes de que empiece el siguiente (0 = a la vez, 1 = cuando termina)
    sigue: { roba: 0.6, quema: 0.6, invoca: 0.85, hechizo: 0.9, efecto: 0.7, ataque: 0.55, dano: 0.25, cura: 0.3, sube: 0.3, muere: 0.75, vuelve: 0.8, modo: 1, escudo: 0.7, salva: 0.8, atada: 0.6, abrazo: 1, turno: 0.15 },
    // Color del brillo de cada hechizo (por su efecto) y de los números y destellos
    colores: {
        poder: '#ff8a3d', rayo: '#ffe14d', curar: '#5dff7a', escudo: '#5ab4ff', once: '#c77dff', revivir: '#f2f2f2', abrazo: '#ff8fc8',
        efecto: '#ffd24a', dano: '#ff5555', cura: '#55ff55', sube: '#55ff55', baja: '#ff8a3d', muere: '#b02020', atada: '#a0a0a0', salva: '#5ab4ff'
    }
};

const rival = j => 1 - j;

// Línea de tiempo de una lista de eventos. A = MESA fusionada (o ANIM). e = estado YA aplicado (para saber
// cuántas cartas tiene cada mano al final). Devuelve:
//   pasos:      [{ ...evento, k, ini, dur }] en orden (ini y dur en segundos, ya con la velocidad)
//   total:      cuándo termina todo
//   ocupantes:  { 'j:z': [{ c, desde, hasta }] } quién está en cada zona y entre qué pasos (desde -1 = ya estaba;
//               hasta null = se queda, es la carta del estado final; si no, es un fantasma que se va en ese paso)
//   manos:      [[{ k, i, de, z }], …] por jugador: qué carta de la mano final llega en qué paso (i = índice final)
//   vidaAntes:  [n, n] la vida que se veía antes de la jugada
//   alDesc:     [n, n] cuántas cartas llegan al descarte durante la animación (se muestran al llegar)
export function planificar(ev, A = ANIM, e = null) {
    const P = A.anim || ANIM.anim, D = { ...ANIM.duraciones, ...(A.duraciones || {}) }, S = { ...ANIM.sigue, ...(A.sigue || {}) };
    const vel = Math.max(0.1, Number(P.velocidad) || 1);
    const vacio = { pasos: [], total: 0, ocupantes: {}, manos: [[], []], vidaAntes: e ? [e.jug[0].vida, e.jug[1].vida] : [0, 0], alDesc: [0, 0] };
    if (!P.activas || !ev || !ev.length) return vacio;
    const pasos = [], ocupantes = {}, robos = [[], []], vidaAntes = vacio.vidaAntes.slice(), alDesc = [0, 0], vista = [false, false];
    const actual = {}; // 'j:z' → segmento abierto
    const seg = (j, z) => (ocupantes[`${j}:${z}`] || (ocupantes[`${j}:${z}`] = []));
    function sale(j, z, c, k) {
        const key = `${j}:${z}`;
        let s = actual[key];
        if (!s) { s = { c, desde: -1, hasta: null }; seg(j, z).push(s); } // ya estaba antes de la jugada
        s.hasta = k; actual[key] = null;
    }
    let t = 0, ultimoVuelve = [null, null];
    for (const x of ev) {
        const dur = (D[x.t] ?? 0) / vel;
        const k = pasos.length;
        const paso = { ...x, k, ini: t, dur };
        switch (x.t) {
            case 'invoca': {
                const key = `${x.j}:${x.z}`, s = { c: x.c, desde: k, hasta: null };
                if (actual[key]) actual[key].hasta = k; // no debería pasar: la zona se vacía antes
                seg(x.j, x.z).push(s); actual[key] = s;
                break;
            }
            case 'muere': sale(x.j, x.z, x.c, k); alDesc[x.j]++; break;
            case 'vuelve': sale(x.j, x.z, x.c, k); ultimoVuelve[x.j] = x.z; break;
            case 'abrazo': sale(x.j, x.z2, x.c, k); break;
            case 'roba': robos[x.j].push(paso); if (x.de === 'mesa') paso.zDe = ultimoVuelve[x.j]; break;
            case 'quema': alDesc[x.j]++; break;
            case 'hechizo': alDesc[x.j]++; break;
            case 'dano': case 'cura': // la vida antes de la jugada es la del primer cambio (antes = la que tenía)
                if (!vista[x.j] && Number.isFinite(x.antes)) { vidaAntes[x.j] = x.antes; vista[x.j] = true; }
                break;
        }
        pasos.push(paso);
        t += dur * Math.min(1, Math.max(0, S[x.t] ?? 1));
    }
    // Lo que queda abierto es la carta del estado final (hasta null)
    const total = pasos.reduce((m, p) => Math.max(m, p.ini + p.dur), 0);
    // Las cartas robadas son las últimas de la mano final, en el orden en que llegaron
    const manos = [0, 1].map(j => {
        const n = e ? e.jug[j].mano.length : robos[j].length;
        return robos[j].map((p, q) => ({ k: p.k, i: n - robos[j].length + q, de: p.de, z: p.zDe })).filter(r => r.i >= 0);
    });
    return { pasos, total, ocupantes, manos, vidaAntes, alDesc };
}

// Quién está en la zona (j, z) en el paso k: el segmento cuyo intervalo lo contiene (o null)
export function ocupanteEn(plan, j, z, k) {
    const lista = plan.ocupantes[`${j}:${z}`];
    if (!lista) return null;
    let mejor = null;
    for (const s of lista) if (s.desde <= k && (s.hasta === null || s.hasta >= k)) mejor = s;
    return mejor;
}

// Avance suave 0→1
export const suave = u => (u <= 0 ? 0 : u >= 1 ? 1 : u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
export const sale0 = u => (u <= 0 ? 0 : u >= 1 ? 1 : 1 - Math.pow(1 - u, 3));
export { rival };
