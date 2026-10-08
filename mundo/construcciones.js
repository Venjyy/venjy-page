// =========================================================
// VENJY · Lugares nuevos del mundo (fuera del portafolio)
// Caseta del pescador (Pony), escenario de Salonas, corrales de la granja y
// construcciones para explorar. Todo se decide en prepararTerreno de forma
// determinista (los workers lo recalculan con la misma semilla): se busca un
// sitio, se nivela el terreno y se arma una lista de bloques que colocarDecor pone.
// =========================================================
import { B } from './texturas.js';

// Decorado a partir de una función que coloca bloques: { t: 'bloques', bloques: [x, y, z, id, …], … }
export function aDecor(construir) {
    const bloques = [];
    let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity, maxY = 0;
    construir((x, y, z, id) => {
        bloques.push(x, y, z, id);
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (z < z0) z0 = z; if (z > z1) z1 = z;
        if (y > maxY) maxY = y;
    });
    if (!bloques.length) return null;
    return {
        t: 'bloques', bloques, cx: (x0 + x1) / 2, cz: (z0 + z1) / 2, r: Math.max(x1 - x0, z1 - z0) / 2 + 2, maxY: maxY + 1,
        luz: { x0: x0 - 1, z0: z0 - 1, x1: x1 + 1, z1: z1 + 1 }
    };
}

// ---------------------------------------------------------
// Buscar sitio: rectángulo w×d de columnas naturales (ES 0), parejas, sin árboles ni camino,
// recorriendo anillos desde (cx, cz). Devuelve { x0, z0, h } o null.
// ---------------------------------------------------------
export function buscarSitio(t, { cx, cz, rmin = 0, rmax = 60, w, d, desnivel = 2, hMin, hMax, materiales, permitirCamino = false, paso = 2, filtro = null }) {
    const { BW, BD, HT, ES, SUP, datos, ESCALA } = t;
    const { W, T } = datos;
    const hayArbol = (x, z) => {
        const ccx = Math.floor(x / ESCALA), ccz = Math.floor(z / ESCALA);
        for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
            const i = (ccz + dz) * W + ccx + dx;
            if (T[i] === 'hojas') return true;
        }
        return false;
    };
    const sirve = (x0, z0) => {
        if (x0 < 2 || z0 < 2 || x0 + w >= BW - 2 || z0 + d >= BD - 2) return null;
        let mn = Infinity, mx = -Infinity;
        for (let z = z0; z < z0 + d; z++) {
            for (let x = x0; x < x0 + w; x++) {
                const o = z * BW + x;
                if (ES[o]) return null;
                if (!permitirCamino && SUP[o] === B.CAMINO) return null;
                if (materiales && !materiales.includes(SUP[o])) return null;
                const h = HT[o];
                if (h < mn) mn = h; if (h > mx) mx = h;
                if (mx - mn > desnivel) return null;
            }
        }
        if (mn < (hMin ?? t.NIVEL_AGUA + 2)) return null;
        if (hMax !== undefined && mx > hMax) return null;
        // Árboles: se miran las esquinas y el centro (cada árbol ocupa una celda de 4×4)
        for (const [x, z] of [[x0, z0], [x0 + w - 1, z0], [x0, z0 + d - 1], [x0 + w - 1, z0 + d - 1], [x0 + (w >> 1), z0 + (d >> 1)]]) {
            if (hayArbol(x, z)) return null;
        }
        const s = { x0, z0, h: Math.round((mn + mx) / 2) };
        return !filtro || filtro(s) ? s : null;
    };
    for (let r = rmin; r <= rmax; r += paso) {
        // Anillo cuadrado de radio r, en orden fijo
        for (let k = -r; k <= r; k += paso) {
            for (const [dx, dz] of [[k, -r], [k, r], [-r, k], [r, k]]) {
                const s = sirve(Math.round(cx + dx - w / 2), Math.round(cz + dz - d / 2));
                if (s) return s;
            }
        }
    }
    return null;
}

const NATURAL = new Set([B.PASTO, B.CAMINO, B.ARENA, B.PIEDRA, B.NIEVE, B.GRIS]);

// Nivela el rectángulo a la altura h y lo marca como plaza (ES 3: sin árboles ni plantas)
export function nivelar(t, x0, z0, w, d, h, sup = null, borde = 1) {
    const { BW, HT, ES, SUP, SUB } = t;
    for (let z = z0 - borde; z < z0 + d + borde; z++) {
        for (let x = x0 - borde; x < x0 + w + borde; x++) {
            const o = z * BW + x;
            if (ES[o] === 1) continue;
            ES[o] = 3; HT[o] = h;
            if (sup !== null && x >= x0 && x < x0 + w && z >= z0 && z < z0 + d) SUP[o] = sup;
            else if (NATURAL.has(SUP[o])) { /* se queda la superficie natural (pasto, piedra, nieve, arena…) */ }
            else SUP[o] = B.PASTO;
            if (SUB[o] !== B.PIEDRA) SUB[o] = B.TIERRA;
        }
    }
}

// ---------------------------------------------------------
// Caseta del pescador (Pony): en la orilla del lago del puente más largo.
// Busca una columna de orilla baja con al menos 9 bloques de agua en línea recta hacia
// un lado cardinal, lejos del tablero del puente. Arma caseta en tierra y muelle sobre el agua.
// ---------------------------------------------------------
const DIRS = [[0, 1], [1, 0], [0, -1], [-1, 0]]; // +Z, +X, -Z, -X

export function colocarPescador(t, puentes) {
    // Del puente más largo al más corto, el primero que tenga una orilla que sirva
    for (const p of [...puentes].sort((a, b) => b.bloques.length - a.bloques.length)) {
        const r = pescadorJunto(t, p);
        if (r) return r;
    }
    return null;
}

function pescadorJunto(t, p) {
    const { BW, BD, HT, ES, SUP, SUB, NIVEL_AGUA } = t;
    const agua = o => HT[o] <= NIVEL_AGUA && ES[o] === 0;
    let mejor = null, mejorPuntos = Infinity;
    const R = Math.min(60, p.r + 30);
    for (let z = Math.floor(p.cz - R); z <= p.cz + R; z++) {
        for (let x = Math.floor(p.cx - R); x <= p.cx + R; x++) {
            if (x < 12 || z < 12 || x >= BW - 12 || z >= BD - 12) continue;
            const o = z * BW + x;
            if (ES[o] || HT[o] < NIVEL_AGUA + 1 || HT[o] > NIVEL_AGUA + 3) continue;
            for (let k = 0; k < 4; k++) {
                const [dx, dz] = DIRS[k];
                // Agua en línea recta (y a los lados del muelle) desde el bloque siguiente
                let ok = true;
                for (let s = 1; s <= 9 && ok; s++) {
                    for (const w of [-1, 0, 1, 2]) {
                        const xx = x + dx * s + (dz ? w : 0), zz = z + dz * s + (dx ? w : 0);
                        if (!agua(zz * BW + xx)) { ok = false; break; }
                    }
                }
                if (!ok) continue;
                // Tierra firme detrás para la caseta (7×7), sin estructuras
                const fx = x - dx * 4, fz = z - dz * 4;
                let tierra = true, mn = Infinity, mx = -Infinity;
                for (let zz = fz - 3; zz <= fz + 3 && tierra; zz++) {
                    for (let xx = fx - 3; xx <= fx + 3; xx++) {
                        const q = zz * BW + xx;
                        if (ES[q] || HT[q] <= NIVEL_AGUA) { tierra = false; break; }
                        mn = Math.min(mn, HT[q]); mx = Math.max(mx, HT[q]);
                    }
                }
                if (!tierra || mx - mn > 3) continue;
                // Lejos del tablero del puente, pero no tanto
                const dP = Math.hypot(x - p.cx, z - p.cz);
                let cercaTablero = false;
                const b = p.bloques;
                for (let i = 0; i < b.length; i += 4) if (Math.abs(b[i] - x) < 12 && Math.abs(b[i + 2] - z) < 12) { cercaTablero = true; break; }
                if (cercaTablero) continue;
                const puntos = Math.abs(dP - p.r * 0.6) + (mx - mn) * 3;
                if (puntos < mejorPuntos) { mejorPuntos = puntos; mejor = { x, z, k, fx, fz, h: Math.max(NIVEL_AGUA + 1, Math.round((mn + mx) / 2)) }; }
            }
        }
    }
    if (!mejor) return null;
    const { x, z, k, fx, fz, h } = mejor;
    const [dx, dz] = DIRS[k];
    // Terreno: plaza de la caseta y rampa suave hasta la orilla
    nivelar(t, fx - 3, fz - 3, 7, 7, h, B.TABLONES, 1);
    for (let s = -1; s <= 1; s++) {
        for (const w of [0, 1]) {
            const xx = x + dx * s + (dz ? w : 0), zz = z + dz * s + (dx ? w : 0);
            const o = zz * BW + xx;
            if (ES[o] === 1) continue;
            ES[o] = 3; HT[o] = h; SUP[o] = B.TABLONES;
        }
    }
    // Muelle de 2 de ancho y 8 de largo sobre el agua (ES 2: agua debajo, como el puente)
    const LARGO = 8;
    for (let s = 2; s <= LARGO; s++) {
        for (const w of [0, 1]) {
            const xx = x + dx * s + (dz ? w : 0), zz = z + dz * s + (dx ? w : 0);
            const o = zz * BW + xx;
            ES[o] = 2; HT[o] = h; SUP[o] = B.TABLONES; SUB[o] = B.ARENA;
        }
    }
    // Lado perpendicular (para el ancho del muelle y la puerta)
    const px = dz ? 1 : 0, pz = dx ? 1 : 0;
    const decor = aDecor(poner => {
        const y = h + 1;
        // Pilotes y postes del muelle
        for (const s of [2, 5, LARGO]) {
            for (const w of [-1, 2]) {
                const xx = x + dx * s + px * w, zz = z + dz * s + pz * w;
                for (let yy = NIVEL_AGUA - 4; yy <= h; yy++) poner(xx, yy, zz, B.TRONCO);
                poner(xx, y, zz, B.TRONCO);
            }
        }
        poner(x + dx * LARGO - px, y + 1, z + dz * LARGO - pz, B.ANTORCHA);
        poner(x + dx * 3 + px * 2, y, z + dz * 3 + pz * 2, B.BARRIL);
        // Caseta de 5×5 centrada en (fx, fz), con la puerta hacia el agua
        for (let a = -2; a <= 2; a++) {
            for (let c = -2; c <= 2; c++) {
                const xx = fx + a, zz = fz + c;
                const borde = Math.abs(a) === 2 || Math.abs(c) === 2;
                const esquina = Math.abs(a) === 2 && Math.abs(c) === 2;
                // Coordenada a lo largo de la dirección del agua y de lado
                const delante = a * dx + c * dz, lado = a * px + c * pz;
                for (let yy = y; yy <= y + 2; yy++) {
                    if (esquina) poner(xx, yy, zz, B.TRONCO);
                    else if (borde) {
                        const puerta = delante === 2 && (lado === 0 || lado === 1) && yy <= y + 1;
                        const ventana = yy === y + 1 && ((Math.abs(lado) === 2 && delante === 0) || (delante === -2 && lado === 0));
                        poner(xx, yy, zz, puerta ? B.AIRE : ventana ? B.VIDRIO : B.TABLONES);
                    } else poner(xx, yy, zz, B.AIRE);
                }
            }
        }
        // Techo a dos aguas de lana roja con alero
        for (let a = -3; a <= 3; a++) {
            for (let c = -3; c <= 3; c++) {
                const lado = Math.abs(a * px + c * pz);
                const tope = y + 3 + Math.max(0, 2 - lado);
                const dentro = Math.abs(a) <= 2 && Math.abs(c) <= 2;
                for (let yy = y + 3; yy <= tope; yy++) poner(fx + a, yy, fz + c, yy === tope || !dentro ? B.LANA_ROJA : B.TABLONES);
            }
        }
        // Dentro: cofre, barriles, fardo y antorcha
        const enCasa = (del, la) => [fx + dx * del + px * la, fz + dz * del + pz * la];
        let [ax, az] = enCasa(-1, -1); poner(ax, y, az, B.COFRE);
        [ax, az] = enCasa(-1, 1); poner(ax, y, az, B.BARRIL); poner(ax, y + 1, az, B.BARRIL); poner(ax, y + 2, az, B.ANTORCHA);
        [ax, az] = enCasa(0, -1); poner(ax, y, az, B.HENO);
        // Antorcha en la fachada, junto a la puerta
        [ax, az] = enCasa(3, -1); poner(ax, y, az, B.TRONCO); poner(ax, y + 1, az, B.ANTORCHA);
    });
    const yaw = Math.atan2(dx, dz); // mirando hacia el agua
    return {
        decor,
        // Punta del muelle: donde se sienta Pony (centro de los 2 bloques de ancho)
        x: x + dx * (LARGO + 0.35) + 0.5 + px * 0.5,
        z: z + dz * (LARGO + 0.35) + 0.5 + pz * 0.5,
        y: h + 1, yaw, dx, dz,
        caseta: { x: fx + 0.5, z: fz + 0.5 },
        cartel: { x: fx + dx * 3 + 0.5 + px * 2.5, z: fz + dz * 3 + 0.5 + pz * 2.5, y: h + 3.6 }
    };
}

// ---------------------------------------------------------
// Escenario de Salonas: en la aldea, cerca del camino. Tarima de 7×5, amplificadores atrás,
// focos de piedra luminosa en postes y alfombra roja. Mira hacia el camino.
// ---------------------------------------------------------
export function colocarEscenario(t) {
    const { BW, SUP, datos, ESCALA } = t;
    const [ax, az] = datos.P.aldea;
    const cx = ax * ESCALA + 2, cz = az * ESCALA + 2;
    const s = buscarSitio(t, { cx, cz, rmin: 18, rmax: 70, w: 11, d: 9, desnivel: 2 })
        || buscarSitio(t, { cx, cz, rmin: 18, rmax: 130, w: 11, d: 9, desnivel: 3 });
    if (!s) return null;
    const { x0, z0, h } = s;
    // Hacia dónde está el camino más cercano: el escenario mira a ese lado
    let mejor = null, dm = Infinity;
    for (let z = z0 - 14; z < z0 + 9 + 14; z++) {
        for (let x = x0 - 14; x < x0 + 11 + 14; x++) {
            if (SUP[z * BW + x] !== B.CAMINO) continue;
            const d = Math.hypot(x - (x0 + 5), z - (z0 + 4));
            if (d < dm) { dm = d; mejor = [x - (x0 + 5), z - (z0 + 4)]; }
        }
    }
    const k = !mejor ? 0 : Math.abs(mejor[0]) > Math.abs(mejor[1]) ? (mejor[0] > 0 ? 1 : 3) : (mejor[1] > 0 ? 0 : 2);
    const [dx, dz] = DIRS[k];
    const px = dz ? 1 : 0, pz = dx ? 1 : 0;
    nivelar(t, x0, z0, 11, 9, h, null, 1);
    const ccx = x0 + 5, ccz = z0 + 4; // centro
    const decor = aDecor(poner => {
        const y = h + 1;
        // Tarima: 7 de ancho (lado) × 5 de fondo, un bloque de alto, con borde de troncos
        for (let del = -2; del <= 2; del++) {
            for (let la = -3; la <= 3; la++) {
                const xx = ccx + dx * del + px * la, zz = ccz + dz * del + pz * la;
                const borde = Math.abs(la) === 3 || Math.abs(del) === 2;
                poner(xx, y, zz, borde ? B.TRONCO : B.TABLONES);
                if (!borde && Math.abs(la) <= 1 && del <= 1) poner(xx, y, zz, B.LANA_ROJA);
            }
        }
        // Amplificadores atrás (2 de alto) y uno chico al lado
        for (const la of [-2, 2]) {
            const xx = ccx - dx * 1 + px * la, zz = ccz - dz * 1 + pz * la;
            poner(xx, y + 1, zz, B.AMPLIFICADOR); poner(xx, y + 2, zz, B.AMPLIFICADOR);
        }
        // Postes con focos en las esquinas de adelante y atrás
        for (const [del, la] of [[2, -3], [2, 3], [-2, -3], [-2, 3]]) {
            const xx = ccx + dx * del + px * la, zz = ccz + dz * del + pz * la;
            for (let yy = y + 1; yy <= y + 4; yy++) poner(xx, yy, zz, B.TRONCO);
            poner(xx, y + 5, zz, B.PIEDRA_LUMINOSA);
        }
        // Viga de atrás con lana (telón)
        for (let la = -3; la <= 3; la++) {
            const xx = ccx - dx * 2 + px * la, zz = ccz - dz * 2 + pz * la;
            poner(xx, y + 5, zz, Math.abs(la) === 3 ? B.PIEDRA_LUMINOSA : B.TABLONES);
            if (Math.abs(la) < 3) for (let yy = y + 1; yy <= y + 4; yy++) poner(xx, yy, zz, (la + yy) % 2 ? B.LANA_ROJA : B.NEGRO);
        }
        // Fardos de heno para el público
        for (const la of [-3, 0, 3]) {
            const xx = ccx + dx * 4 + px * la, zz = ccz + dz * 4 + pz * la;
            poner(xx, y, zz, B.HENO);
        }
    });
    return {
        decor, yaw: Math.atan2(dx, dz),
        x: ccx + 0.5, z: ccz + 0.5, y: h + 2, // sobre la tarima
        cartel: { x: ccx + 0.5 - dx * 2, z: ccz + 0.5 - dz * 2, y: h + 8 },
        rect: { x0: x0 - 1, z0: z0 - 1, x1: x0 + 11, z1: z0 + 9 }
    };
}

// ---------------------------------------------------------
// Corrales de la granja (aldea): cerco de vallas con postes de tronco, portón abierto hacia
// la aldea, bebedero y fardos de heno. Devuelve [{ rect, decor, tipo }] (rect = interior pisable).
// ---------------------------------------------------------
export function colocarCorrales(t) {
    const { datos, ESCALA } = t;
    const [ax, az] = datos.P.aldea;
    const cx = ax * ESCALA + 2, cz = az * ESCALA + 2;
    const lista = [];
    for (const [tipo, w, d] of [['vacas', 16, 12], ['ovejas', 13, 11]]) {
        const s = buscarSitio(t, { cx, cz, rmin: 20, rmax: 90, w: w + 2, d: d + 2, desnivel: 2 })
            || buscarSitio(t, { cx, cz, rmin: 20, rmax: 140, w: w + 2, d: d + 2, desnivel: 3 });
        if (!s) continue;
        const x0 = s.x0 + 1, z0 = s.z0 + 1, h = s.h;
        nivelar(t, s.x0, s.z0, w + 2, d + 2, h, null, 1);
        // Portón: en el lado más cercano al centro de la aldea
        const mx = x0 + w / 2, mz = z0 + d / 2;
        const ddx = cx - mx, ddz = cz - mz;
        const lado = Math.abs(ddx) > Math.abs(ddz) ? (ddx > 0 ? 'e' : 'o') : (ddz > 0 ? 's' : 'n');
        const decor = aDecor(poner => {
            const y = h + 1;
            for (let x = x0 - 1; x <= x0 + w; x++) {
                for (let z = z0 - 1; z <= z0 + d; z++) {
                    const bx = x === x0 - 1 || x === x0 + w, bz = z === z0 - 1 || z === z0 + d;
                    if (!bx && !bz) continue;
                    const porton = (lado === 'n' && z === z0 - 1 || lado === 's' && z === z0 + d) && Math.abs(x - Math.floor(mx)) <= 0
                        || (lado === 'o' && x === x0 - 1 || lado === 'e' && x === x0 + w) && Math.abs(z - Math.floor(mz)) <= 0;
                    if (porton) continue;
                    const esquina = bx && bz, poste = esquina || (bx ? (z - z0) % 4 === 0 : (x - x0) % 4 === 0);
                    poner(x, y, z, poste ? B.TRONCO : B.VALLA);
                    if (esquina) poner(x, y + 1, z, B.ANTORCHA);
                }
            }
            // Bebedero de 3 bloques con borde de piedra labrada, hundido en el suelo
            const bx = x0 + 1, bz = z0 + 1;
            for (let k = -1; k <= 3; k++) {
                for (let j = -1; j <= 1; j++) {
                    const borde = k === -1 || k === 3 || j !== 0;
                    poner(bx + k, h, bz + 1 + j, borde ? B.LABRADA : B.AGUA);
                }
            }
            // Fardos de heno apilados en una esquina
            const hx = x0 + w - 2, hz = z0 + d - 2;
            poner(hx, y, hz, B.HENO); poner(hx - 1, y, hz, B.HENO); poner(hx, y, hz - 1, B.HENO); poner(hx, y + 1, hz, B.HENO);
        });
        lista.push({ tipo, decor, h, rect: { x0: x0 + 0.6, z0: z0 + 0.6, x1: x0 + w - 0.6, z1: z0 + d - 0.6 }, evitar: [{ x0: x0, z0: z0, x1: x0 + 5, z1: z0 + 3.5 }, { x0: x0 + w - 3.5, z0: z0 + d - 3.5, x1: x0 + w, z1: z0 + d }] });
    }
    return lista;
}

// ---------------------------------------------------------
// Construcciones para explorar: seis lugares fuera del camino, cada uno con algo dentro.
// Cada uno busca su sitio desde un punto del mapa (fracción del ancho y alto) y debe quedar
// lejos de las zonas del portafolio, del camino y de los otros lugares.
// Devuelve [{ clave, nombre: { es, en }, x, z, radio, decor }]
// ---------------------------------------------------------
export const LUGARES = [
    { clave: 'molino', nombre: { es: 'Molino viejo', en: 'Old windmill' }, f: [0.27, 0.55], w: 9, d: 9 },
    { clave: 'atalaya', nombre: { es: 'Atalaya del bosque', en: 'Forest watchtower' }, f: [0.62, 0.48], w: 9, d: 13, bosque: true }, // 13 de fondo: la leñera de Boris va al sur
    { clave: 'campamento', nombre: { es: 'Campamento', en: 'Campsite' }, f: [0.36, 0.36], w: 13, d: 11 },
    { clave: 'portal', nombre: { es: 'Portal en ruinas', en: 'Ruined portal' }, f: [0.75, 0.32], w: 11, d: 9, alto: true },
    { clave: 'iglu', nombre: { es: 'Iglú', en: 'Igloo' }, f: null, w: 11, d: 11, nieve: true },
    { clave: 'naufragio', nombre: { es: 'Naufragio', en: 'Shipwreck' }, f: [0.62, 0.97], w: 15, d: 9, playa: true }
];

export function colocarLugares(t) {
    const { BW, BD, HT, ES, SUP, datos, ESCALA, NIVEL_AGUA } = t;
    const { W, T, P } = datos;
    const puntos = Object.values(P).map(([x, z]) => [x * ESCALA + 2, z * ESCALA + 2]);
    const hechos = [];
    const bosqueCerca = (x, z, rad) => {
        const cx = Math.floor(x / ESCALA), cz = Math.floor(z / ESCALA);
        let n = 0;
        for (let dz = -rad; dz <= rad; dz++) for (let dx = -rad; dx <= rad; dx++) if (T[(cz + dz) * W + cx + dx] === 'hojas') n++;
        return n;
    };
    for (const L of LUGARES) {
        const cx = L.f ? L.f[0] * BW : P.mina[0] * ESCALA, cz = L.f ? L.f[1] * BD : P.mina[1] * ESCALA;
        const filtro = ({ x0, z0 }) => {
            const mx = x0 + L.w / 2, mz = z0 + L.d / 2;
            if (puntos.some(([px, pz]) => Math.hypot(px - mx, pz - mz) < (L.nieve ? 40 : 70))) return false;
            if (hechos.some(h => Math.hypot(h.x - mx, h.z - mz) < 90)) return false;
            // Ni encima de la llanura de las letras del título
            const ti = datos.titulo, M0 = 90;
            if (mx > ti.tx0 * ESCALA - M0 && mx < (ti.tx0 + ti.anchoT) * ESCALA + M0 && mz > ti.ty0 * ESCALA - M0 && mz < (ti.ty0 + ti.altoT) * ESCALA + M0) return false;
            // Lejos del camino y de otras construcciones: se revisa un margen de 8 bloques alrededor
            const M = 8;
            for (let z = z0 - M; z < z0 + L.d + M; z += 2) {
                for (let x = x0 - M; x < x0 + L.w + M; x += 2) {
                    if (x < 0 || z < 0 || x >= BW || z >= BD) return false;
                    const o = z * BW + x;
                    if (SUP[o] === B.CAMINO || SUP[o] === B.TABLONES || ES[o] === 1 || ES[o] === 3) return false;
                }
            }
            if (L.bosque && bosqueCerca(mx, mz, 4) < 10) return false;
            if (L.alto && HT[Math.floor(mz) * BW + Math.floor(mx)] < NIVEL_AGUA + 14) return false;
            if (L.playa) { // en la orilla: parte del casco en agua poco profunda y parte en la arena
                let agua = 0, total = 0;
                for (let z = z0; z < z0 + L.d; z++) for (let x = x0; x < x0 + L.w; x++, total++) if (HT[z * BW + x] < NIVEL_AGUA) agua++;
                if (agua < total * 0.25 || agua > total * 0.7) return false;
            }
            return true;
        };
        const op = { cx, cz, rmin: 0, rmax: 300, w: L.w, d: L.d, paso: 4, filtro };
        let s;
        if (L.nieve) s = buscarSitio(t, { ...op, desnivel: 4, materiales: [B.NIEVE, B.PIEDRA, B.GRIS], hMin: NIVEL_AGUA + 10 });
        else if (L.playa) s = buscarSitio(t, { ...op, rmax: 800, paso: 3, desnivel: 6, materiales: [B.ARENA], hMin: NIVEL_AGUA - 3, hMax: NIVEL_AGUA + 3 });
        else s = buscarSitio(t, { ...op, desnivel: L.alto ? 4 : 2 }) || buscarSitio(t, { ...op, desnivel: 3, rmax: 500 });
        if (!s) continue;
        let { x0, z0, h } = s;
        if (L.playa) { // el naufragio no se nivela: se apoya en el fondo, con el casco a la altura del agua
            h = NIVEL_AGUA;
            for (let z = z0 - 1; z <= z0 + L.d; z++) for (let x = x0 - 1; x <= x0 + L.w; x++) ES[z * BW + x] = 3;
        } else {
            const sup = L.nieve ? B.NIEVE : null;
            nivelar(t, x0, z0, L.w, L.d, h, sup, 1);
            if (sup !== null) for (let z = z0 - 1; z <= z0 + L.d; z++) for (let x = x0 - 1; x <= x0 + L.w; x++) SUP[z * BW + x] = sup;
        }
        const cxL = x0 + (L.w >> 1), czL = z0 + (L.d >> 1);
        const decor = aDecor(poner => CONSTRUIR[L.clave](poner, cxL, h + 1, czL, h, t));
        // bx, bz, y: bloque central y primer bloque sobre el suelo (para ubicar a los NPCs)
        hechos.push({ clave: L.clave, nombre: L.nombre, x: cxL + 0.5, z: czL + 0.5, bx: cxL, bz: czL, y: h + 1, radio: Math.max(L.w, L.d) + 6, decor });
    }
    return hechos;
}

// Constructores: (poner, cx, y, cz, h) con y = primer bloque sobre el suelo y h = altura del suelo
const CONSTRUIR = {
    // Molino de viento: torre de tablones con esquinas de tronco, techo de lana roja y aspas al sur
    molino(poner, cx, y, cz) {
        for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) poner(cx + dx, y - 1, cz + dz, B.LABRADA);
        const ALTO = 9;
        for (let k = 0; k < ALTO; k++) {
            const r = k < 6 ? 2 : 1;
            for (let dx = -r; dx <= r; dx++) {
                for (let dz = -r; dz <= r; dz++) {
                    const borde = Math.abs(dx) === r || Math.abs(dz) === r;
                    const esquina = Math.abs(dx) === r && Math.abs(dz) === r;
                    let id = B.AIRE;
                    if (borde) id = esquina ? B.TRONCO : (k === 3 && (dx === 0 || dz === 0) ? B.VIDRIO : B.TABLONES);
                    if (dz === r && dx === 0 && k < 2) id = B.AIRE; // puerta al sur
                    poner(cx + dx, y + k, cz + dz, id);
                }
            }
        }
        for (let k = 0; k < 3; k++) { // techo piramidal
            const r = 2 - k;
            for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) poner(cx + dx, y + ALTO + k, cz + dz, B.LANA_ROJA);
        }
        // Aspas: cubo de tronco y cuatro brazos con velas de lana
        const az = cz + 3, ay = y + 8; // el aspa de abajo queda sobre la puerta
        poner(cx, ay, az, B.TRONCO);
        for (let k = 1; k <= 5; k++) {
            poner(cx + k, ay, az, B.TABLONES); poner(cx - k, ay, az, B.TABLONES);
            poner(cx, ay + k, az, B.TABLONES); poner(cx, ay - k, az, B.TABLONES);
            if (k >= 2) { poner(cx + k, ay + 1, az, B.LANA); poner(cx - k, ay - 1, az, B.LANA); poner(cx - 1, ay + k, az, B.LANA); poner(cx + 1, ay - k, az, B.LANA); }
        }
        // Dentro: fardos, cofre y antorcha
        poner(cx - 1, y, cz - 1, B.HENO); poner(cx + 1, y, cz - 1, B.HENO); poner(cx + 1, y + 1, cz - 1, B.HENO);
        poner(cx - 1, y, cz + 1, B.COFRE);
        poner(cx, y + 2, cz - 1, B.ANTORCHA);
        poner(cx + 1, y, cz + 3, B.ANTORCHA);
    },
    // Atalaya: cuatro pilares, escalera de caracol alrededor de un tronco central y mirador con baranda
    atalaya(poner, cx, y, cz) {
        const ALTO = 10;
        for (const [dx, dz] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) for (let k = 0; k <= ALTO + 3; k++) poner(cx + dx, y + k, cz + dz, B.TRONCO);
        for (let k = 0; k <= ALTO; k++) poner(cx, y + k, cz, B.TRONCO_PINO);
        const anillo = [[1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1], [1, 0]];
        const huecos = new Set();
        for (let k = 0; k < ALTO; k++) {
            const [dx, dz] = anillo[k % 8];
            poner(cx + dx, y + k, cz + dz, B.TABLONES);
            if (k >= ALTO - 4) huecos.add(dx + ',' + dz);
        }
        // Mirador de 7×7 con hueco sobre los últimos escalones
        for (let dx = -3; dx <= 3; dx++) {
            for (let dz = -3; dz <= 3; dz++) {
                if (huecos.has(dx + ',' + dz)) continue;
                if (dx === 0 && dz === 0) continue;
                poner(cx + dx, y + ALTO, cz + dz, B.TABLONES);
                if (Math.abs(dx) === 3 || Math.abs(dz) === 3) poner(cx + dx, y + ALTO + 1, cz + dz, B.VALLA);
            }
        }
        poner(cx, y + ALTO, cz, B.TRONCO_PINO);
        for (const [dx, dz] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) poner(cx + dx, y + ALTO + 2, cz + dz, B.ANTORCHA);
        // Techo
        for (let k = 0; k < 3; k++) {
            const r = 3 - k;
            for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) if (Math.abs(dx) === r || Math.abs(dz) === r || k === 2) poner(cx + dx, y + ALTO + 4 + k, cz + dz, B.TABLONES);
        }
        poner(cx + 2, y + ALTO + 1, cz - 1, B.COFRE);
        poner(cx - 2, y + ALTO + 1, cz + 1, B.BARRIL);
        // Leñera de Boris al sur: tocón para cortar y leña apilada
        poner(cx - 1, y, cz + 5, B.TRONCO);
        for (const [dx, dz, k] of [[3, 5, 2], [4, 5, 2], [3, 6, 1], [4, 6, 1], [4, 4, 1]]) for (let j = 0; j < k; j++) poner(cx + dx, y + j, cz + dz, B.TRONCO);
    },
    // Campamento: dos carpas de lana, fogata con troncos alrededor, cofre y barril
    campamento(poner, cx, y, cz) {
        const carpa = (x0, z0, lana) => {
            for (let k = 0; k < 4; k++) {
                poner(x0 - 1, y, z0 + k, lana); poner(x0 + 1, y, z0 + k, lana);
                poner(x0, y + 1, z0 + k, lana);
            }
            poner(x0, y, z0, B.CAMA);
        };
        carpa(cx - 4, cz - 4, B.LANA);
        carpa(cx + 4, cz - 4, B.LANA_ROJA);
        // Fogata: piedra luminosa hundida con borde de piedra
        poner(cx, y - 1, cz + 1, B.PIEDRA_LUMINOSA);
        for (const [dx, dz] of [[-1, 0], [1, 0], [0, 1], [0, -1], [-1, 1], [1, 1], [-1, -1], [1, -1]]) poner(cx + dx, y - 1, cz + 1 + dz, B.GRIS);
        poner(cx, y, cz + 1, B.ANTORCHA);
        // Troncos para sentarse
        for (const dx of [-1, 0, 1]) poner(cx + dx, y, cz + 4, B.TRONCO);
        poner(cx - 3, y, cz + 1, B.TRONCO); poner(cx - 3, y, cz + 2, B.TRONCO);
        poner(cx + 3, y, cz + 1, B.TRONCO); poner(cx + 3, y, cz + 2, B.TRONCO);
        poner(cx + 5, y, cz + 3, B.COFRE); poner(cx + 5, y, cz + 2, B.BARRIL); poner(cx - 5, y, cz + 3, B.HENO);
    },
    // Portal en ruinas: marco de obsidiana roto, piedra agrietada, ladrillos y un poco de oro
    portal(poner, cx, y, cz) {
        const roto = new Set(['2,0', '3,4', '0,3']);
        for (let k = 0; k <= 4; k++) {
            for (let a = 0; a <= 3; a++) {
                const borde = k === 0 || k === 4 || a === 0 || a === 3;
                if (!borde) continue;
                const clave = a + ',' + k;
                poner(cx - 1 + a, y + k, cz, roto.has(clave) ? (k === 4 ? B.AIRE : B.PIEDRA_AGRIETADA) : B.OBSIDIANA);
            }
        }
        // Piso irregular alrededor
        for (let dx = -4; dx <= 4; dx++) {
            for (let dz = -3; dz <= 3; dz++) {
                const q = (dx * 7 + dz * 13 + 99) % 5;
                if (Math.hypot(dx, dz * 1.3) > 4.3) continue;
                poner(cx + dx, y - 1, cz + dz, q === 0 ? B.LADRILLO : q === 1 ? B.OBSIDIANA : q === 2 ? B.GRIS : B.PIEDRA_AGRIETADA);
            }
        }
        for (const [dx, dz, id] of [[-3, 1, B.PIEDRA_AGRIETADA], [3, -1, B.LADRILLO], [-2, -2, B.OBSIDIANA], [3, 2, B.PIEDRA_AGRIETADA]]) poner(cx + dx, y, cz + dz, id);
        poner(cx + 3, y + 1, cz + 2, B.PIEDRA_AGRIETADA);
        poner(cx + 2, y, cz + 2, B.COFRE);
        poner(cx - 3, y, cz - 1, B.ORO);
        poner(cx - 1, y + 5, cz, B.PIEDRA_LUMINOSA); // brasa sobre el marco
    },
    // Iglú: cúpula de nieve con túnel al sur; dentro, alfombra, cama, cofre y antorcha
    iglu(poner, cx, y, cz) {
        const R = 4;
        for (let dx = -R; dx <= R; dx++) {
            for (let dz = -R; dz <= R; dz++) {
                for (let k = 0; k <= R; k++) {
                    const d = Math.hypot(dx, dz, k * 1.15);
                    if (d > R + 0.5) continue;
                    poner(cx + dx, y + k, cz + dz, d > R - 1 ? B.NIEVE : B.AIRE); // cáscara gruesa: sin huecos
                }
                if (Math.hypot(dx, dz) < R - 0.5) poner(cx + dx, y - 1, cz + dz, B.LANA);
            }
        }
        for (let dz = R - 1; dz <= R + 2; dz++) { // túnel
            for (const dx of [-1, 0, 1]) for (let k = 0; k <= 2; k++) {
                const muro = Math.abs(dx) === 1 || k === 2;
                poner(cx + dx, y + k, cz + dz, muro && dz > R - 1 ? B.NIEVE : B.AIRE);
            }
        }
        poner(cx - 2, y, cz - 2, B.CAMA); poner(cx - 2, y, cz - 1, B.CAMA);
        poner(cx + 2, y, cz - 2, B.COFRE);
        poner(cx + 2, y, cz, B.BARRIL); poner(cx + 2, y + 1, cz, B.ANTORCHA);
    },
    // Naufragio: casco de tablones medio enterrado en la arena, mástil roto y vela rota
    naufragio(poner, cx, y, cz, h, t) {
        const L = 6, NA = t.NIVEL_AGUA;
        const vacio = yy => (yy <= NA ? B.AGUA : B.AIRE);
        for (let a = -L; a <= L; a++) {
            const ancho = Math.abs(a) > L - 2 ? 1 : 2;      // proa y popa más angostas
            const hunde = a > 2 ? 1 : 0;                      // la proa quedó más enterrada
            for (let b = -ancho; b <= ancho; b++) {
                for (let k = -1; k <= 2; k++) {
                    const yy = y + k - hunde;
                    const casco = Math.abs(b) === ancho || k === -1;
                    const roto = (a === 1 && b === ancho && k >= 1) || (a === -3 && b === -ancho && k === 2);
                    poner(cx + a, yy, cz + b, casco && !roto ? B.TABLONES : vacio(yy));
                }
                if (Math.abs(b) < ancho && (a + 99) % 3 === 0) poner(cx + a, y + 2 - hunde, cz + b, B.TABLONES); // restos de cubierta
            }
        }
        // Quilla hasta el fondo (en el agua el casco no queda flotando)
        for (let a = -L + 1; a <= L - 1; a++) for (let yy = y - 2 - (a > 2 ? 1 : 0); yy >= Math.max(1, NA - 6); yy--) poner(cx + a, yy, cz, B.TABLONES);
        for (let k = 0; k <= 6; k++) poner(cx - 1, y + k, cz, B.TRONCO);
        for (let k = 3; k <= 5; k++) for (const dz of [-2, -1, 1]) if (!(k === 4 && dz === 1)) poner(cx - 1, y + k, cz + dz, B.LANA);
        poner(cx - 4, y, cz, B.COFRE);
        poner(cx + 3, y - 1, cz + 1, B.BARRIL);
        poner(cx + 2, y, cz - 3, B.BARRIL);
        poner(cx - 3, y, cz + 1, B.ANTORCHA);
    }
};
