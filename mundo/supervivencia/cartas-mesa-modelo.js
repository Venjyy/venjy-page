// =========================================================
// VENJY · Supervivencia · Duelo de Cartas Pixel: la mesa 3D, parte pura (7h-2b, PR 4a)
// Sin DOM ni Three, para probarla en Node (mundo/tests/cartas-mesa.mjs):
//   MESA                     → medidas por defecto (metros y grados). Son datos planos: el Estudio podrá
//                              editarlas como un JSON más (`fusionar(MESA, datos)` en aplicarDatos de la mesa)
//   marcoMesa(L, lucho)      → centro, giro y asiento del jugador en el mundo
//   aMundo(M, x, z)          → punto local de la mesa (x a tu derecha, z hacia ti) en coordenadas del mundo
//   posZona / posManoRival / posMazo / posMano → dónde va cada carta
//   tocarCarta / tocarZona / elegirPostura / botonesMesa / zonasMarcadas
//                            → el mismo flujo de selección que el panel (cartas-panel.js), convertido en
//                              funciones puras: (estado, selección, toque) → { sel, accion }. `accion` siempre
//                              es una de jugadas(e) o null.
// =========================================================
import { CARTAS, PIDE_PROPIA } from './cartas-datos.js';
import { jugadas } from './cartas.js';

export const ALTO_CARTA = 76 / 50;

// Medidas por defecto. Local de la mesa: x a tu derecha, z hacia ti, y hacia arriba desde el suelo.
export const MESA = {
    // Dónde queda la mesa respecto de Lucho: `giro` (grados) es hacia dónde mira él (0 = +Z, el sur,
    // lejos de la atalaya); `dist` es cuánto más allá queda el centro y `lado` la corre a su derecha.
    mesa: { giro: 0, dist: 0.75, lado: 0, ancho: 1.8, fondo: 1.0, alto: 0.8 },
    carta: { ancho: 0.24 },                       // alto = ancho · 76/50
    zonas: { sep: 0.42, propia: 0.22, rival: -0.22 },
    manoRival: { sep: 0.1, z: -0.6, alto: 0.38, inclina: 20 },
    mazo: { x: 0.76, z: 0.26 },                   // el tuyo a tu derecha y cerca; el de Lucho, al revés
    asiento: { dist: 0.45 },                      // desde tu borde de la mesa
    camara1: { alto: 1.62, atras: 0, mira: [0, 0.3, -0.45] },
    // Al elegir una carta en 1.ª persona la cámara sube sobre la mesa (tu mano no tapa las zonas)
    enfoque: { alto: 1.25, z: 0.32, mira: [0, 0, -0.02] },
    // Cámaras de 3.ª persona: el botón Vista pasa por 1.ª persona y luego por cada una de esta lista
    terceras: [
        { alto: 2.5, atras: 2.4, lado: 1.9, mira: [0, 0.3, -0.4] },
        { alto: 2.2, atras: 2.2, lado: -2.0, mira: [0, 0.3, -0.4] }
    ],
    mini: { ancho: 0.3, max: 340, alto: 1.7, margen: 12 }, // vista de arriba en una esquina (3.ª persona)
    mano: { alto: 0.26, max: 230, solape: 0.72, sube: 0.18 } // tu mano en pantalla (fracción del alto)
};

const rad = g => g * Math.PI / 180;

// Marco de la mesa en el mundo: centro (x, z), suelo y, ángulo g (radianes) y tu asiento.
// `lucho` = { x, y, z } del amigo (sin el desplazamiento DY del grupo)
export function marcoMesa(L, lucho) {
    const g = rad(L.mesa.giro), s = Math.sin(g), c = Math.cos(g);
    const cx = lucho.x + s * L.mesa.dist - c * L.mesa.lado, cz = lucho.z + c * L.mesa.dist + s * L.mesa.lado;
    const M = { x: cx, y: lucho.y, z: cz, g, s, c };
    const a = aMundo(M, 0, L.mesa.fondo / 2 + L.asiento.dist);
    M.asiento = { x: a.x, z: a.z, yaw: g }; // jugador.yaw = g: mira hacia -local z, a Lucho
    M.yawLucho = g;                          // amigo.yaw = g: mira hacia +local z, a ti
    return M;
}
// Local (x a tu derecha, z hacia ti) → mundo. Con g = 0, z local = +Z del mundo y x local = +X.
export function aMundo(M, x, z) {
    return { x: M.x + M.c * x + M.s * z, z: M.z - M.s * x + M.c * z };
}

// Centro local de la zona z (0-2) del jugador j (0 tú, 1 Lucho). Las dos filas van de izquierda a derecha
// como en el panel, para que la zona 1 sea siempre la de tu izquierda.
export function posZona(L, j, z) {
    return { x: (z - 1) * L.zonas.sep, z: j === 0 ? L.zonas.propia : L.zonas.rival };
}
export function posManoRival(L, i, n) {
    return { x: (i - (n - 1) / 2) * L.manoRival.sep, z: L.manoRival.z, y: L.mesa.alto + L.manoRival.alto };
}
export function posMazo(L, j) {
    return j === 0 ? { x: L.mazo.x, z: L.mazo.z } : { x: -L.mazo.x, z: -L.mazo.z };
}
// Tu mano en pantalla (px, origen abajo a la izquierda): centro, ancho y giro de cada carta en abanico
export function posMano(L, i, n, ancho, alto, elegida = false, encima = false) {
    const h = Math.min(alto * L.mano.alto, L.mano.max), w = h / ALTO_CARTA;
    const paso = Math.min(w * L.mano.solape, (ancho * 0.9 - w) / Math.max(1, n - 1));
    const k = i - (n - 1) / 2;
    const sube = elegida ? h * L.mano.sube : encima ? h * L.mano.sube * 0.5 : 0;
    return { x: ancho / 2 + k * paso, y: h * 0.42 - Math.abs(k) * h * 0.03 + sube, w, h, giro: -k * 0.05 };
}

// ---------- Selección (el mismo flujo del panel) ----------
// sel: null | { tipo: 'carta', m, modo?, acciones } | { tipo: 'objetivo', acciones } | { tipo: 'abrazo', acciones, primero }
//          | { tipo: 'propia', z, acciones }
export function ladoObjetivo(e, a) {
    const d = a.t === 'hechizo' ? CARTAS[e.jug[0].mano[a.m]] : null;
    return d && (PIDE_PROPIA.has(d.efecto) || d.efecto === 'abrazo') ? 0 : 1;
}
const nada = sel => ({ sel, accion: null });
const tuTurno = e => e && e.ganador === null && e.turno === 0;

export function tocarCarta(e, sel, m, postura = 'ata') {
    if (!tuTurno(e) || e.fase !== 'principal') return nada(sel);
    if (sel && sel.tipo === 'carta' && sel.m === m) return nada(null); // tocarla otra vez la suelta
    const a = jugadas(e).filter(x => x.m === m && (x.t === 'invocar' || x.t === 'hechizo'));
    if (!a.length) return nada(sel);
    const d = CARTAS[e.jug[0].mano[m]];
    if (d.tipo === 'criatura') return nada({ tipo: 'carta', m, modo: postura, acciones: a.filter(x => x.modo === postura) });
    if (a.length === 1 && a[0].z === undefined && a[0].obj === undefined && a[0].obj2 === undefined) return { sel: null, accion: a[0] };
    return nada({ tipo: 'carta', m, acciones: a });
}
export function elegirPostura(e, sel, modo) {
    if (!sel || sel.tipo !== 'carta' || sel.modo === undefined) return sel;
    return { ...sel, modo, acciones: jugadas(e).filter(a => a.m === sel.m && a.t === 'invocar' && a.modo === modo) };
}
export function tocarZona(e, sel, j, z) {
    if (!tuTurno(e)) return nada(sel);
    if (sel && sel.tipo === 'carta') {
        const usaZona = sel.acciones.some(x => x.z !== undefined);
        const a = usaZona ? (j === 0 ? sel.acciones.filter(x => x.z === z) : [])
            : sel.acciones.filter(x => ladoObjetivo(e, x) === j && x.obj === z);
        if (!a.length) return nada(sel);
        const d = CARTAS[e.jug[0].mano[sel.m]];
        if (d.efecto === 'abrazo' && !usaZona) return nada({ tipo: 'abrazo', acciones: a, primero: z });
        // Un hechizo con objetivo se juega al tocar la zona (en el panel pedía tocarla dos veces)
        if (a.length === 1 && (!usaZona || a[0].obj === undefined)) return { sel: null, accion: a[0] };
        return nada({ tipo: 'objetivo', acciones: a });
    }
    if (sel && sel.tipo === 'abrazo') {
        const a = z !== sel.primero && sel.acciones.find(x => x.obj === sel.primero && x.obj2 === z);
        return a ? { sel: null, accion: a } : nada(sel);
    }
    if (sel && sel.tipo === 'objetivo') {
        const a = sel.acciones.find(x => ladoObjetivo(e, x) === j && (x.obj === z || x.obj2 === z));
        return a ? { sel: null, accion: a } : nada(sel);
    }
    if (j === 0 && e.jug[0].zonas[z]) {
        if (sel && sel.tipo === 'propia' && sel.z === z) return nada(null);
        const a = jugadas(e).filter(x => (x.t === 'atacar' || x.t === 'modo') && x.z === z);
        return nada(a.length ? { tipo: 'propia', z, acciones: a } : sel);
    }
    if (sel && sel.tipo === 'propia' && j === 1) {
        const a = sel.acciones.find(x => x.t === 'atacar' && x.obj === z);
        return a ? { sel: null, accion: a } : nada(sel);
    }
    return nada(sel);
}
// Acciones de los botones (o null si el botón va apagado). `directo` también se dispara tocando a Lucho.
export function botonesMesa(e, sel) {
    const L = tuTurno(e) ? jugadas(e) : [];
    const propia = sel && sel.tipo === 'propia';
    return {
        robar: L.find(a => a.t === 'robar') || null,
        terminar: L.find(a => a.t === 'terminar') || null,
        cambiar: propia ? L.find(a => a.t === 'modo' && a.z === sel.z) || null : null,
        directo: propia ? sel.acciones.find(a => a.t === 'atacar' && a.obj === -1) || null : null,
        postura: !!(sel && sel.tipo === 'carta' && sel.modo !== undefined)
    };
}
// Zonas que se iluminan con la selección: lista de [j, z]
export function zonasMarcadas(e, sel) {
    const out = [];
    if (!sel || !e) return out;
    for (const j of [0, 1]) for (let z = 0; z < 3; z++) {
        let ok = false;
        if (sel.tipo === 'carta') {
            const usaZona = sel.acciones.some(a => a.z !== undefined);
            ok = usaZona ? j === 0 && sel.acciones.some(a => a.z === z) : sel.acciones.some(a => ladoObjetivo(e, a) === j && a.obj === z);
        } else if (sel.tipo === 'abrazo') ok = j === 0 && sel.acciones.some(a => a.obj === sel.primero && a.obj2 === z);
        else if (sel.tipo === 'propia') ok = j === 1 && sel.acciones.some(a => a.t === 'atacar' && a.obj === z);
        else ok = sel.acciones.some(a => ladoObjetivo(e, a) === j && (a.obj === z || a.obj2 === z));
        if (ok) out.push([j, z]);
    }
    return out;
}

// Pausa antes de cada paso automático (robar o jugada de Lucho), en segundos: los mismos del panel
export const pausaAuto = e => (e.fase === 'robo' ? (e.turno === 0 ? 0.4 : 0.7) : 0.7);
