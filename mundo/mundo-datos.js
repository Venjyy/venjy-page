// =========================================================
// VENJY · Datos del mundo (sin DOM)
// Copia fiel de generarMundo() de script.js: mismas semillas y
// mismo orden de llamadas a r(), para que el mapa 3D sea
// idéntico al mapa 2D del portafolio.
// Añade la capa F (1 = celda de estructura) y alturas exactas.
// =========================================================

export function azar(semilla) {
    let a = semilla >>> 0;
    return function () {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export function crearRuido(semilla) {
    const r = azar(semilla);
    const tam = 256;
    const valores = new Float32Array(tam * tam);
    for (let i = 0; i < valores.length; i++) valores[i] = r();
    const suave = t => t * t * (3 - 2 * t);
    const v = (x, y) => valores[(y & (tam - 1)) * tam + (x & (tam - 1))];
    function ruido(x, y) {
        const x0 = Math.floor(x), y0 = Math.floor(y);
        const fx = suave(x - x0), fy = suave(y - y0);
        const a = v(x0, y0), b = v(x0 + 1, y0), c = v(x0, y0 + 1), d = v(x0 + 1, y0 + 1);
        return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
    }
    return function fbm(x, y, octavas = 4) {
        let suma = 0, amp = 0.5, frec = 1, total = 0;
        for (let o = 0; o < octavas; o++) {
            suma += ruido(x * frec, y * frec) * amp;
            total += amp;
            amp *= 0.5;
            frec *= 2;
        }
        return suma / total;
    };
}

export const NIVEL_MAR = 14;

const LETRAS = {
    V: ['X...X', 'X...X', 'X...X', 'X...X', '.X.X.', '.X.X.', '..X..'],
    E: ['XXXXX', 'X....', 'X....', 'XXXX.', 'X....', 'X....', 'XXXXX'],
    N: ['X...X', 'XX..X', 'X.X.X', 'X..XX', 'X...X', 'X...X', 'X...X'],
    J: ['..XXX', '...X.', '...X.', '...X.', 'X..X.', 'X..X.', '.XX..'],
    Y: ['X...X', 'X...X', '.X.X.', '..X..', '..X..', '..X..', '..X..']
};

export const DISENOS = {
    h: {
        W: 384, H: 256, celda: 8, titulo: [0.5, 0.3], mar: [1.08, 1.12, 0.36],
        lago: [0.05, 0.98, 0.1],
        puntos: {
            spawn: [0.06, 0.47], casa: [0.15, 0.13], registro: [0.47, 0.11], mina: [0.84, 0.15],
            aldea: [0.73, 0.8], gatera: [0.49, 0.84], correo: [0.22, 0.8], faro: [0.935, 0.9]
        },
        desvios: { 'mina-aldea': [[0.92, 0.42], [0.86, 0.62]] }
    },
    v: {
        W: 256, H: 384, celda: 6, titulo: [0.434, 0.5], mar: [1.1, 1.06, 0.42],
        lago: [0.02, 0.97, 0.14],
        puntos: {
            spawn: [0.1, 0.38], casa: [0.2, 0.12], registro: [0.64, 0.1], mina: [0.8, 0.27],
            aldea: [0.78, 0.74], gatera: [0.5, 0.86], correo: [0.2, 0.76], faro: [0.87, 0.94]
        },
        desvios: { 'mina-aldea': [[0.93, 0.5]], 'spawn-casa': [], 'gatera-correo': [] }
    }
};

export const RUTA = ['spawn', 'casa', 'registro', 'mina', 'aldea', 'gatera', 'correo'];

export function generarDatos(orient = 'h') {
    const d = DISENOS[orient];
    const { W, H, celda } = d;
    const fbm = crearRuido(1424);
    const humedad = crearRuido(77);
    const r = azar(2026);
    const E = new Float32Array(W * H);
    const T = new Array(W * H).fill('pasto');
    const F = new Uint8Array(W * H); // 1 = celda de estructura (casa, letra, pozo…)
    const idx = (x, y) => y * W + x;
    const P = {};
    for (const k in d.puntos) P[k] = [Math.round(d.puntos[k][0] * W), Math.round(d.puntos[k][1] * H)];

    // Relieve base
    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            let e = fbm(x / 70, y / 70, 5);
            const mx = x / W - d.mar[0], my = y / H - d.mar[1];
            const dm = Math.hypot(mx * (W / H), my);
            e -= Math.max(0, (d.mar[2] + 0.28) - dm) * 1.4;
            const lx = x / W - d.lago[0], ly = y / H - d.lago[1];
            const dl = Math.hypot(lx * (W / H), ly);
            e -= Math.max(0, d.lago[2] - dl) * 2.2;
            E[idx(x, y)] = Math.floor(e * 40) + 2;
        }
    }

    // Montaña de la mina
    const [mx, my] = P.mina;
    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            const dd = Math.hypot(x - mx, y - my) / (W * 0.16);
            if (dd < 1) E[idx(x, y)] += Math.round((1 - dd * dd) * 22 * (0.8 + fbm(x / 9, y / 9, 2) * 0.4));
        }
    }

    // Isla del faro (ProcedimientoSeguro)
    const [fx, fy] = P.faro;
    const radioIsla = Math.round(W * 0.034);
    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            const dd = Math.hypot(x - fx, y - fy);
            if (dd < radioIsla) E[idx(x, y)] = Math.max(E[idx(x, y)], NIVEL_MAR + 1 + Math.round((1 - dd / radioIsla) * 4));
            else if (dd < radioIsla + 7) E[idx(x, y)] = Math.min(E[idx(x, y)], NIVEL_MAR - 2);
        }
    }

    // Zonas habitables: tierra firme y pareja
    const aplanar = (cx, cy, radio, alto) => {
        for (let y = Math.max(0, cy - radio); y < Math.min(H, cy + radio); y++) {
            for (let x = Math.max(0, cx - radio); x < Math.min(W, cx + radio); x++) {
                const dd = Math.hypot(x - cx, y - cy) / radio;
                if (dd > 1) continue;
                const i = idx(x, y);
                const w = Math.min(1, (1 - dd) * 2.2);
                E[i] = Math.round(E[i] * (1 - w) + alto * w);
            }
        }
    };
    ['spawn', 'casa', 'registro', 'aldea', 'gatera', 'correo'].forEach(k => aplanar(P[k][0], P[k][1], Math.round(W * 0.07), 18));

    // Llanura del título
    const letras = 'VENJY';
    const anchoT = (letras.length * 5 + (letras.length - 1)) * celda;
    const altoT = 7 * celda;
    const tx0 = Math.round(d.titulo[0] * W - anchoT / 2);
    const ty0 = Math.round(d.titulo[1] * H - altoT / 2);
    const margen = celda * 2;
    const ecx = tx0 + anchoT / 2, ecy = ty0 + altoT / 2;
    const erx = anchoT / 2 + margen * 2.2, ery = altoT / 2 + margen * 2.2;
    for (let y = Math.floor(ecy - ery); y < ecy + ery; y++) {
        for (let x = Math.floor(ecx - erx); x < ecx + erx; x++) {
            if (x < 0 || y < 0 || x >= W || y >= H) continue;
            const dd = Math.pow(Math.pow(Math.abs(x - ecx) / erx, 4) + Math.pow(Math.abs(y - ecy) / ery, 4), 0.25)
                + (fbm(x / 11, y / 11, 2) - 0.5) * 0.35;
            const w = Math.max(0, Math.min(1, (1 - dd) * 3));
            if (w === 0) continue;
            const i = idx(x, y);
            E[i] = Math.round(E[i] * (1 - w) + 18 * w);
        }
    }

    // Biomas
    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            const i = idx(x, y);
            const e = E[i];
            const hu = humedad(x / 40, y / 40, 3);
            if (e < NIVEL_MAR) T[i] = 'agua';
            else if (e <= NIVEL_MAR + 1) T[i] = 'arena';
            else if (e > 37) T[i] = 'nieve';
            else if (e > 30) T[i] = 'piedra';
            else if (hu > 0.56) {
                if (r() < 0.5) { T[i] = 'hojas'; E[i] = e + 2 + Math.floor(r() * 2); }
                else T[i] = 'pasto';
            } else {
                T[i] = 'pasto';
                if (r() < 0.06) E[i] = e + 1;
                if (hu > 0.5 && r() < 0.05) { T[i] = 'hojas'; E[i] = e + 3; }
            }
        }
    }

    // El título queda limpio de árboles
    for (let y = Math.floor(ecy - ery); y < ecy + ery; y++) {
        for (let x = Math.floor(ecx - erx); x < ecx + erx; x++) {
            if (x < 0 || y < 0 || x >= W || y >= H) continue;
            const dd = Math.pow(Math.pow(Math.abs(x - ecx) / erx, 4) + Math.pow(Math.abs(y - ecy) / ery, 4), 0.25)
                + (fbm(x / 11, y / 11, 2) - 0.5) * 0.35;
            if (dd > 0.82) continue;
            const i = idx(x, y);
            if (T[i] === 'hojas' || T[i] === 'agua' || T[i] === 'arena') T[i] = 'pasto';
            E[i] = 18 + (r() < 0.07 ? 1 : 0);
        }
    }

    // Caminos de tierra entre zonas (con bordes irregulares)
    const tramos = [];
    for (let s = 0; s < RUTA.length - 1; s++) {
        const a = RUTA[s], b = RUTA[s + 1];
        const desvio = (d.desvios[`${a}-${b}`] || []).map(([px, py]) => [Math.round(px * W), Math.round(py * H)]);
        const vertices = [P[a], ...desvio, P[b]];
        const pixeles = [];
        for (let v = 0; v < vertices.length - 1; v++) {
            const [x0, y0] = vertices[v], [x1, y1] = vertices[v + 1];
            const pasos = Math.ceil(Math.hypot(x1 - x0, y1 - y0));
            for (let k = 0; k <= pasos; k++) {
                const t = k / pasos;
                const ondula = (fbm((x0 + k) / 13, (y0 + k) / 17, 2) - 0.5) * 10 * Math.sin(Math.PI * t);
                const nx = -(y1 - y0) / pasos, ny = (x1 - x0) / pasos;
                const x = Math.round(x0 + (x1 - x0) * t + nx * ondula);
                const y = Math.round(y0 + (y1 - y0) * t + ny * ondula);
                const ultimo = pixeles[pixeles.length - 1];
                if (!ultimo || ultimo[0] !== x || ultimo[1] !== y) pixeles.push([x, y]);
            }
        }
        tramos.push(pixeles);
        pixeles.forEach(([x, y]) => {
            for (let oy = 0; oy <= 1; oy++) {
                for (let ox = 0; ox <= (orient === 'h' ? 1 : 0); ox++) {
                    const xx = x + ox, yy = y + oy;
                    if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
                    const i = idx(xx, yy);
                    if (T[i] === 'agua') { T[i] = 'madera'; E[i] = NIVEL_MAR + 1; }
                    else if (T[i] !== 'nieve' && T[i] !== 'piedra') { T[i] = 'tierra'; E[i] = Math.min(E[i], 18); }
                    else T[i] = 'gris';
                }
            }
        });
    }

    // Construcciones
    const bloque = (x, y, w, h, tipo, alto) => {
        for (let yy = y; yy < y + h; yy++) {
            for (let xx = x; xx < x + w; xx++) {
                if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
                const i = idx(xx, yy);
                T[i] = tipo;
                E[i] = 18 + alto;
                F[i] = 1;
            }
        }
    };
    const casa = (cx, cy, w, h, techo) => {
        bloque(cx, cy, w, h, techo, 4);
        bloque(cx + 1, cy + 1, w - 2, 1, techo, 5);
        bloque(cx + Math.floor(w / 2), cy + h, 1, 1, 'madera', 1);
    };
    const [cax, cay] = P.casa;
    casa(cax - 4, cay - 9, 8, 6, 'rojo');
    bloque(cax + 6, cay - 6, 3, 3, 'hojas', 4);
    const [rx, ry] = P.registro;
    casa(rx - 6, ry - 10, 12, 7, 'azul');
    bloque(rx - 8, ry - 9, 2, 5, 'madera', 2);
    const [mix, miy] = P.mina;
    bloque(mix - 2, miy - 4, 4, 3, 'negro', -2);
    bloque(mix - 3, miy - 5, 6, 1, 'madera', 2);
    const [ax, ay] = P.aldea;
    casa(ax - 12, ay - 12, 6, 5, 'madera');
    casa(ax + 3, ay - 13, 7, 5, 'podzol');
    casa(ax - 4, ay - 20, 6, 5, 'madera');
    for (let k = 0; k < 4; k++) bloque(ax + 4, ay + 2 + k * 2, 8, 1, k % 2 ? 'tierra' : 'hojas', 0);
    bloque(ax - 1, ay - 5, 2, 2, 'oro', 3);
    const [gx, gy] = P.gatera;
    casa(gx - 4, gy - 10, 7, 5, 'naranjo');
    bloque(gx + 5, gy - 4, 1, 1, 'naranjo', 1);
    bloque(gx + 6, gy - 4, 1, 1, 'negro', 1);
    bloque(gx - 7, gy - 3, 1, 1, 'negro', 1);
    bloque(gx - 6, gy - 3, 1, 1, 'naranjo', 1);
    const [cx, cy] = P.correo;
    bloque(cx - 3, cy - 10, 5, 5, 'cuarzo', 6);
    bloque(cx - 2, cy - 9, 3, 3, 'arcilla', 7);
    bloque(cx - 3, cy - 5, 1, 1, 'rojo', 2);
    bloque(fx - 2, fy - 2, 4, 4, 'cuarzo', 3);
    bloque(fx - 1, fy - 1, 2, 2, 'diamante', 5);

    // Letras del título: cuarzo en relieve
    [...letras].forEach((ch, n) => {
        LETRAS[ch].forEach((fila, fy2) => {
            [...fila].forEach((v, fx2) => {
                if (v !== 'X') return;
                const x0 = tx0 + (n * 6 + fx2) * celda, y0 = ty0 + fy2 * celda;
                for (let y = y0; y < y0 + celda; y++) {
                    for (let x = x0; x < x0 + celda; x++) {
                        const i = idx(x, y);
                        T[i] = 'cuarzo';
                        E[i] = 24;
                        F[i] = 1;
                    }
                }
            });
        });
    });

    return { orient, W, H, E, T, F, P, tramos, NIVEL_MAR, celda, titulo: { tx0, ty0, anchoT, altoT } };
}
