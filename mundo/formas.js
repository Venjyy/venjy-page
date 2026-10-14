// =========================================================
// VENJY · Formas de los bloques que no son un cubo entero (7f-2)
// Cajas en 1/16 de bloque por id. Las leen la malla (voxeles.js), el contorno de selección y las grietas
// (supervivencia/minado.js), el rayo (rayo.js) y el choque (jugador.js, fisica.js): todo sigue la misma forma.
// Sin DOM ni Three: se prueba en Node. Valores base aquí; mundo/datos/formas.json los cambia por forma
// (pestaña Formas del Estudio; esquema estudio/esquemas/formas.schema.json).
// Bloques tipo 8 ('f' en texturas.js): losas, escalones, trampilla y vallas de jardín; chocan por sus cajas.
// El resto (farol, cartel, cama, plantas, antorcha, puertas) solo da su forma al contorno, las grietas y el rayo.
// =========================================================
import { B, TIPO } from './texturas.js';

// Giro: hacia dónde queda la parte alta del escalón o el lado de la trampilla abierta.
// 0 norte (−Z), 1 este (+X), 2 sur (+Z), 3 oeste (−X)
export const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];

// a = esquina mínima, b = máxima, en 1/16 de bloque. En las cajas de farol y cartel, `lado`, `arriba`, `fondo` y
// `frente` son tiles y cada cara muestra el tile entero (uv 'caja'); las demás proyectan la textura del bloque.
export const FORMAS_BASE = {
    losa: { cajas: [{ a: [0, 0, 0], b: [16, 8, 16] }] },
    losa_arriba: { cajas: [{ a: [0, 8, 0], b: [16, 16, 16] }] },
    escalones: { cajas: [{ a: [0, 0, 0], b: [16, 8, 16] }, { a: [0, 8, 0], b: [16, 16, 8] }] }, // parte alta al norte (giro 0)
    trampilla: { cajas: [{ a: [0, 0, 0], b: [16, 3, 16] }] },
    trampilla_arriba: { cajas: [{ a: [0, 13, 0], b: [16, 16, 16] }] },
    trampilla_abierta: { cajas: [{ a: [0, 0, 0], b: [16, 16, 3] }] }, // pegada al lado norte (giro 0)
    // Valla de jardín: el poste y, hacia cada vecino que conecta, el brazo (dibujado hacia el norte). altoChoque: lo que
    // mide al chocar (24 = 1,5 bloques, como Minecraft: no se salta)
    valla_poste: { cajas: [{ a: [6, 0, 6], b: [10, 16, 10] }], altoChoque: 24 },
    valla_brazo: { cajas: [{ a: [7, 12, 0], b: [9, 15, 6] }, { a: [7, 6, 0], b: [9, 9, 6] }], altoChoque: 24 },
    farol: {
        uv: 'caja', cajas: [
            { a: [5, 0, 5], b: [11, 7, 11], lado: 'farol', arriba: 'farol_tapa', fondo: 'farol_tapa' },
            { a: [6, 7, 6], b: [10, 8, 10], lado: 'farol_tapa', arriba: 'farol_tapa' },
            { a: [7, 8, 7], b: [9, 10, 9], lado: 'farol_tapa', arriba: 'farol_tapa' }
        ]
    },
    cartel: {
        uv: 'caja', cajas: [
            { a: [7, 0, 7], b: [9, 9, 9], lado: 'cartel_poste', arriba: 'cartel_poste', fondo: 'cartel_poste' },
            { a: [1, 8, 7], b: [15, 15, 9], lado: 'cartel_poste', arriba: 'cartel_poste', fondo: 'cartel_poste', frente: 'cartel' }
        ]
    },
    // Solo contorno, grietas y rayo (la malla de estos la hace voxeles.js a su manera)
    cama: { cajas: [{ a: [0, 0, 0], b: [16, 9, 16] }] },
    antorcha: { cajas: [{ a: [6, 0, 6], b: [10, 10, 10] }] },
    flor: { cajas: [{ a: [5, 0, 5], b: [11, 10, 11] }] },
    planta: { cajas: [{ a: [2, 0, 2], b: [14, 13, 14] }] },
    cultivo: { cajas: [{ a: [0, 0, 0], b: [16, 16, 16] }] } // el alto se reparte entre las 4 etapas (la 1.ª mide 1/4)
};
// Contorno de selección, grietas y cuánto sube solo el jugador al caminar contra un escalón o una losa
export const AJUSTES_BASE = { paso: 0.6, contorno: { color: '#000000', opacidad: 0.75 }, grietas: { opacidad: 0.75 } };
export const NOMBRES_FORMA = Object.keys(FORMAS_BASE);

// ---- Qué forma usa cada id ----
const ID_FORMA = new Map(); // id -> { forma, giro }
const LOSAS = [[B.LOSA_PIEDRA, B.LOSA_PIEDRA_ARRIBA], [B.LOSA_TABLONES, B.LOSA_TABLONES_ARRIBA], [B.LOSA_ADOQUIN, B.LOSA_ADOQUIN_ARRIBA]];
for (const [abajo, arriba] of LOSAS) { ID_FORMA.set(abajo, { forma: 'losa', giro: 0 }); ID_FORMA.set(arriba, { forma: 'losa_arriba', giro: 0 }); }
export const ESCALONES = [B.ESCALONES_PIEDRA, B.ESCALONES_TABLONES, B.ESCALONES_ADOQUIN]; // cada uno con 4 ids seguidos (giros)
for (const base of ESCALONES) for (let g = 0; g < 4; g++) ID_FORMA.set(base + g, { forma: 'escalones', giro: g });
ID_FORMA.set(B.TRAMPILLA, { forma: 'trampilla', giro: 0 });
ID_FORMA.set(B.TRAMPILLA_ARRIBA, { forma: 'trampilla_arriba', giro: 0 });
for (let g = 0; g < 4; g++) ID_FORMA.set(B.TRAMPILLA_ABIERTA + g, { forma: 'trampilla_abierta', giro: g });
export const VALLAS_JARDIN = [B.VALLA_ABEDUL, B.VALLA_PINO];
ID_FORMA.set(B.FAROL, { forma: 'farol', giro: 0 });
ID_FORMA.set(B.CARTEL, { forma: 'cartel', giro: 0 });
ID_FORMA.set(B.CAMA, { forma: 'cama', giro: 0 });
ID_FORMA.set(B.ANTORCHA, { forma: 'antorcha', giro: 0 });
for (const id of [B.FLOR_ROJA, B.FLOR_AMARILLA, B.FLOR_AZUL]) ID_FORMA.set(id, { forma: 'flor', giro: 0 });
for (const id of [B.PASTO_ALTO, B.BROTE, B.BROTE_ABEDUL, B.BROTE_PINO]) ID_FORMA.set(id, { forma: 'planta', giro: 0 });
const ETAPA = new Map([[B.TRIGO, 3]]);
for (let n = 0; n < 4; n++) for (const b of [B.TRIGO_0, B.ZANAHORIA_0, B.PAPA_0]) ETAPA.set(b + n, n);
for (const id of ETAPA.keys()) ID_FORMA.set(id, { forma: 'cultivo', giro: 0 });

export const esForma = id => TIPO[id] === 8;
export const esValla = id => VALLAS_JARDIN.includes(id);
export const formaDe = id => ID_FORMA.get(id) || null;

// ---- Datos (código + formas.json) ----
let datos = { formas: {}, ...AJUSTES_BASE };
let version = 0, crudo = null;
const cache = new Map();
export function fijarFormas(d) {
    crudo = d || null;
    const j = d || {};
    datos = {
        formas: j.formas || {},
        paso: j.paso ?? AJUSTES_BASE.paso,
        contorno: { ...AJUSTES_BASE.contorno, ...(j.contorno || {}) },
        grietas: { ...AJUSTES_BASE.grietas, ...(j.grietas || {}) }
    };
    version++;
    cache.clear();
}
export const versionFormas = () => version;
export const formasCrudas = () => crudo; // el JSON tal cual (viaja a los workers de chunks)
export const ajustesFormas = () => datos;
// La forma con lo que diga el JSON (las cajas del JSON reemplazan a todas las del código)
export function forma(nombre) {
    const base = FORMAS_BASE[nombre];
    const j = datos.formas[nombre];
    if (!j) return base;
    return { ...base, ...j, cajas: j.cajas || base.cajas };
}

// Gira una caja (1/16) un cuarto de vuelta en sentido horario visto desde arriba, `n` veces: (x, z) → (16 − z, x)
function girar(c, n) {
    let [x0, y0, z0] = c.a, [x1, y1, z1] = c.b;
    for (let k = 0; k < n; k++) {
        const nx0 = 16 - z1, nx1 = 16 - z0;
        z0 = x0; z1 = x1; x0 = nx0; x1 = nx1;
    }
    return { ...c, a: [x0, y0, z0], b: [x1, y1, z1] };
}
const aBloque = (c, uv, dx = 0, dy = 0, dz = 0) => ({
    x0: c.a[0] / 16 + dx, y0: c.a[1] / 16 + dy, z0: c.a[2] / 16 + dz,
    x1: c.b[0] / 16 + dx, y1: c.b[1] / 16 + dy, z1: c.b[2] / 16 + dz,
    uv, lado: c.lado, arriba: c.arriba, fondo: c.fondo, frente: c.frente
});

// ¿Se une la valla hacia ese vecino? Con otra valla de jardín, la valla vieja o un bloque sólido
export const conectaValla = v => v > 0 && (esValla(v) || v === B.VALLA || TIPO[v] === 1);
const GROSOR_PANEL = 3 / 16;
// Orientación de un panel (puerta o escalera de mano) según sus vecinos, sin metadatos:
//  · puerta cerrada: tapa el hueco entre dos muros (plano que une los vecinos sólidos)
//  · puerta abierta: pegada al muro, como girada sobre la bisagra
//  · escalera de mano: contra el primer muro sólido que tenga al lado
// Devuelve [x0, z0, x1, z1] del panel dentro del bloque (0..1).
export function cajaPanel(id, solidoEn) {
    const ex = solidoEn(1, 0) || solidoEn(-1, 0), ez = solidoEn(0, 1) || solidoEn(0, -1);
    const abierta = id === B.PUERTA_ABIERTA_ABAJO || id === B.PUERTA_ABIERTA_ARRIBA;
    if (id === B.ESCALERA) {
        if (solidoEn(0, -1)) return [0, 0, 1, GROSOR_PANEL];
        if (solidoEn(0, 1)) return [0, 1 - GROSOR_PANEL, 1, 1];
        if (solidoEn(-1, 0)) return [0, 0, GROSOR_PANEL, 1];
        if (solidoEn(1, 0)) return [1 - GROSOR_PANEL, 0, 1, 1];
        return [0, 0.5 - GROSOR_PANEL / 2, 1, 0.5 + GROSOR_PANEL / 2];
    }
    const planoX = ex || !ez; // la puerta cerrada se extiende a lo largo de X (une muros al este y oeste)
    if (!abierta) return planoX ? [0, 0.5 - GROSOR_PANEL / 2, 1, 0.5 + GROSOR_PANEL / 2] : [0.5 - GROSOR_PANEL / 2, 0, 0.5 + GROSOR_PANEL / 2, 1];
    // abierta: girada 90°, pegada al lado oeste (o norte)
    return planoX ? [0, 0, GROSOR_PANEL, 1] : [0, 0, 1, GROSOR_PANEL];
}

// Máscara de conexión de una valla (bit g = conecta hacia DIRS[g])
export function mascaraValla(vecino) {
    let m = 0;
    for (let g = 0; g < 4; g++) if (conectaValla(vecino(DIRS[g][0], 0, DIRS[g][1]))) m |= 1 << g;
    return m;
}

// Cajas de un bloque en unidades de bloque (0..1 dentro de su celda) o null si es un cubo entero.
// `vecino(dx, dy, dz)` → id de la celda vecina (lo usan las vallas, los paneles y la antorcha de pared).
// choque = true: las que chocan (la valla mide su altoChoque); solo tiene sentido en los bloques tipo 8.
export function cajasDe(id, vecino, choque = false) {
    const t = TIPO[id];
    if (t === 6 || t === 7) {
        const [x0, z0, x1, z1] = cajaPanel(id, (dx, dz) => TIPO[vecino(dx, 0, dz)] === 1);
        return [{ x0, y0: 0, z0, x1, y1: 1, z1 }];
    }
    if (esValla(id)) {
        const m = mascaraValla(vecino);
        const k = (choque ? 1000 : 0) + id * 16 + m;
        if (cache.has(k)) return cache.get(k);
        const poste = forma('valla_poste'), brazo = forma('valla_brazo');
        const alto = c => (choque && poste.altoChoque ? { ...c, a: [c.a[0], 0, c.a[2]], b: [c.b[0], poste.altoChoque, c.b[2]] } : c);
        const altoB = c => (choque && brazo.altoChoque ? { ...c, a: [c.a[0], 0, c.a[2]], b: [c.b[0], brazo.altoChoque, c.b[2]] } : c);
        const lista = poste.cajas.map(c => aBloque(alto(c)));
        for (let g = 0; g < 4; g++) if (m & (1 << g)) for (const c of brazo.cajas) lista.push(aBloque(altoB(girar(c, g))));
        cache.set(k, lista);
        return lista;
    }
    const f = ID_FORMA.get(id);
    if (!f) return null;
    if (f.forma === 'antorcha') {
        // de pared: sin apoyo abajo y con un muro al lado, se corre hacia él y sube (como la malla en cruz)
        const fa = forma('antorcha');
        if (TIPO[vecino(0, -1, 0)] !== 1) {
            const g = DIRS.findIndex(([dx, dz]) => TIPO[vecino(dx, 0, dz)] === 1);
            if (g >= 0) return fa.cajas.map(c => aBloque(c, undefined, DIRS[g][0] * 0.3, 0.2, DIRS[g][1] * 0.3));
        }
        return fa.cajas.map(c => aBloque(c));
    }
    const k = (choque ? 1000 : 0) + id * 16;
    if (cache.has(k)) return cache.get(k);
    const fo = forma(f.forma);
    let lista = fo.cajas.map(c => aBloque(girar(c, f.giro), fo.uv));
    if (f.forma === 'cultivo') {
        const parte = ((ETAPA.get(id) ?? 3) + 1) / 4;
        lista = lista.map(c => ({ ...c, y1: c.y0 + (c.y1 - c.y0) * parte }));
    }
    cache.set(k, lista);
    return lista;
}

// ---- Rayo contra las cajas de una celda ----
// o: origen, d: dirección (normalizada); x, y, z: la celda. Devuelve { t, normal } de la caja más cercana o null.
export function rayoCajas(o, d, x, y, z, cajas) {
    let mejor = null;
    for (const c of cajas) {
        const min = [x + c.x0, y + c.y0, z + c.z0], max = [x + c.x1, y + c.y1, z + c.z1];
        let t0 = -Infinity, t1 = Infinity, eje = -1, signo = 0;
        let fuera = false;
        for (let k = 0; k < 3; k++) {
            if (Math.abs(d[k]) < 1e-12) { if (o[k] < min[k] || o[k] > max[k]) { fuera = true; break; } continue; }
            let a = (min[k] - o[k]) / d[k], b = (max[k] - o[k]) / d[k];
            let s = -1; // la cara de entrada: la mínima si el rayo va hacia +
            if (a > b) { [a, b] = [b, a]; s = 1; }
            if (a > t0) { t0 = a; eje = k; signo = s; }
            t1 = Math.min(t1, b);
            if (t0 > t1) { fuera = true; break; }
        }
        if (fuera || t1 < 0) continue;
        const t = Math.max(0, t0);
        if (!mejor || t < mejor.t) {
            const normal = [0, 0, 0];
            if (eje >= 0 && t0 >= 0) normal[eje] = signo;
            mejor = { t, normal };
        }
    }
    return mejor;
}

// ---- Choque de una caja (x0..x1, y0..y1, z0..z1) con los bloques tipo 8 del mundo ----
// mundo.bloque(x, y, z) → id. Solo mira las formas: los cubos enteros los sigue viendo cada cuerpo como siempre.
// Mira una capa más abajo por las vallas (miden 1,5).
const vecinoEn = (mundo, x, y, z) => (dx, dy, dz) => mundo.bloque(x + dx, y + dy, z + dz);
function recorrer(mundo, x0, y0, z0, x1, y1, z1, f) {
    for (let y = Math.floor(y0) - 1; y <= Math.floor(y1); y++) {
        for (let z = Math.floor(z0); z <= Math.floor(z1); z++) {
            for (let x = Math.floor(x0); x <= Math.floor(x1); x++) {
                const id = mundo.bloque(x, y, z);
                if (id <= 0 || TIPO[id] !== 8) continue;
                for (const c of cajasDe(id, vecinoEn(mundo, x, y, z), true)) {
                    if (x + c.x1 <= x0 || x + c.x0 >= x1 || z + c.z1 <= z0 || z + c.z0 >= z1) continue;
                    if (f(y + c.y0, y + c.y1)) return true;
                }
            }
        }
    }
    return false;
}
export function chocaFormas(mundo, x0, y0, z0, x1, y1, z1) {
    return recorrer(mundo, x0, y0, z0, x1, y1, z1, (b, a) => a > y0 && b < y1);
}
// La cara de arriba más alta de las formas que pisa la caja, entre yBajo y yAlto (−Infinity si no hay)
export function topeFormas(mundo, x0, z0, x1, z1, yBajo, yAlto) {
    let tope = -Infinity;
    recorrer(mundo, x0, yBajo, z0, x1, yAlto, z1, (b, a) => { if (a >= yBajo - 1e-6 && a <= yAlto + 1e-6 && a > tope) tope = a; return false; });
    return tope;
}
// La cara de abajo más baja de las formas sobre la caja, entre yBajo y yAlto (Infinity si no hay)
export function pisoFormas(mundo, x0, z0, x1, z1, yBajo, yAlto) {
    let piso = Infinity;
    recorrer(mundo, x0, yBajo, z0, x1, yAlto, z1, (b, a) => { if (b >= yBajo - 1e-6 && b <= yAlto + 1e-6 && b < piso) piso = b; return false; });
    return piso;
}

// ---- Contorno: aristas de las cajas sin las que quedan entre dos cajas (escalones, vallas) ----
// Devuelve una lista plana [x, y, z, x, y, z, …] de segmentos en unidades de bloque.
export function aristasContorno(cajas) {
    const lineas = new Map(); // eje + coordenadas fijas -> lista de [desde, hasta]
    const r = v => Math.round(v * 1000) / 1000;
    const sumar = (eje, f1, f2, a, b) => {
        const k = eje + ':' + r(f1) + ':' + r(f2);
        if (!lineas.has(k)) lineas.set(k, { eje, f1: r(f1), f2: r(f2), tramos: [] });
        lineas.get(k).tramos.push([r(a), r(b)]);
    };
    for (const c of cajas) {
        for (const y of [c.y0, c.y1]) for (const z of [c.z0, c.z1]) sumar(0, y, z, c.x0, c.x1);
        for (const x of [c.x0, c.x1]) for (const z of [c.z0, c.z1]) sumar(1, x, z, c.y0, c.y1);
        for (const x of [c.x0, c.x1]) for (const y of [c.y0, c.y1]) sumar(2, x, y, c.z0, c.z1);
    }
    const salida = [];
    for (const { eje, f1, f2, tramos } of lineas.values()) {
        const cortes = [...new Set(tramos.flat())].sort((a, b) => a - b);
        const quedan = []; // tramos que se dibujan, unidos si van seguidos
        for (let i = 0; i + 1 < cortes.length; i++) {
            const a = cortes[i], b = cortes[i + 1], m = (a + b) / 2;
            const n = tramos.filter(([p, q]) => p <= m && m <= q).length;
            if (n % 2 === 0) continue; // compartida por dos cajas: queda dentro de una cara
            const u = quedan[quedan.length - 1];
            if (u && u[1] === a) u[1] = b; else quedan.push([a, b]);
        }
        for (const [a, b] of quedan) {
            const p = eje === 0 ? [a, f1, f2, b, f1, f2] : eje === 1 ? [f1, a, f2, f1, b, f2] : [f1, f2, a, f1, f2, b];
            salida.push(...p);
        }
    }
    return salida;
}

// ---- Colocar (lógica pura; la usa minado.js) ----
// Giro según hacia dónde miras (mira = [dx, dz] de la cámara): la parte alta del escalón queda lejos de ti
export function giroDe(mira) {
    const [dx, dz] = mira;
    return Math.abs(dz) >= Math.abs(dx) ? (dz < 0 ? 0 : 2) : (dx > 0 ? 1 : 3);
}
const LOSA_DE = new Map(); // id (abajo o arriba) -> [abajo, arriba, doble]
for (const [abajo, arriba] of LOSAS) { const t = [abajo, arriba, abajo + (B.LOSA_PIEDRA_DOBLE - B.LOSA_PIEDRA)]; LOSA_DE.set(abajo, t); LOSA_DE.set(arriba, t); }
export const losaDe = id => LOSA_DE.get(id) || null;
const ESCALON_BASE = new Map();
for (const base of ESCALONES) for (let g = 0; g < 4; g++) ESCALON_BASE.set(base + g, base);
export const escalonBase = id => ESCALON_BASE.get(id) ?? null;
export const esTrampilla = id => id === B.TRAMPILLA || id === B.TRAMPILLA_ARRIBA || (id >= B.TRAMPILLA_ABIERTA && id < B.TRAMPILLA_ABIERTA + 4);
// Clic derecho sobre una trampilla: cerrada → abierta contra el lado al que miras; abierta → cerrada abajo
export const alternarTrampilla = (id, mira) => (id >= B.TRAMPILLA_ABIERTA ? B.TRAMPILLA : B.TRAMPILLA_ABIERTA + giroDe(mira));

// Qué queda al poner `id` (lo de la mano) apuntando a `o` (lanzarRayo con preciso: normal, previo y punto).
// Devuelve { pos: [x, y, z], id, fusion } o null si `id` no es un bloque con forma. `fusion`: dos losas iguales
// en la misma celda se vuelven la losa doble (la celda ya está ocupada por la primera).
export function colocarForma(id, o, mira, bloque) {
    if (!o) return null;
    const ny = o.normal[1];
    const arribaDe = () => (ny === -1 ? true : ny === 1 ? false : (o.punto ? o.punto[1] - Math.floor(o.punto[1]) >= 0.5 : false));
    const losa = losaDe(id);
    if (losa) {
        const [abajo, arriba, doble] = losa;
        if ((o.id === abajo && ny === 1) || (o.id === arriba && ny === -1)) return { pos: [o.x, o.y, o.z], id: doble, fusion: true };
        const d = o.previo;
        if (!d) return null;
        const ahi = bloque(d[0], d[1], d[2]);
        if (ahi === abajo || ahi === arriba) return { pos: d, id: doble, fusion: true };
        return { pos: d, id: arribaDe() ? arriba : abajo, fusion: false };
    }
    if (!o.previo) return null;
    const base = escalonBase(id);
    if (base !== null) return { pos: o.previo, id: base + giroDe(mira), fusion: false };
    if (esTrampilla(id)) return { pos: o.previo, id: arribaDe() ? B.TRAMPILLA_ARRIBA : B.TRAMPILLA, fusion: false };
    if (esValla(id)) return { pos: o.previo, id, fusion: false };
    return null;
}
