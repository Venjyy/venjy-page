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
export function buscarSitio(t, { cx, cz, rmin = 0, rmax = 60, w, d, desnivel = 2, hMin, hMax, materiales, permitirCamino = false, paso = 2 }) {
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
        return { x0, z0, h: Math.round((mn + mx) / 2) };
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

// Nivela el rectángulo a la altura h y lo marca como plaza (ES 3: sin árboles ni plantas)
export function nivelar(t, x0, z0, w, d, h, sup = null, borde = 1) {
    const { BW, HT, ES, SUP, SUB } = t;
    for (let z = z0 - borde; z < z0 + d + borde; z++) {
        for (let x = x0 - borde; x < x0 + w + borde; x++) {
            const o = z * BW + x;
            if (ES[o] === 1) continue;
            ES[o] = 3; HT[o] = h;
            if (sup !== null && x >= x0 && x < x0 + w && z >= z0 && z < z0 + d) SUP[o] = sup;
            else if (SUP[o] === B.CAMINO || SUP[o] === B.ARENA) { /* se queda */ }
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
