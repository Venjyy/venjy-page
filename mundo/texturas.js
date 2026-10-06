// =========================================================
// VENJY · Texturas de bloques (atlas procedural 16×16)
// Todo se dibuja en canvas: no hay imágenes de Minecraft.
// =========================================================
import { azar } from './mundo-datos.js';

export const TAM = 16;
export const COLS = 8;
export const FILAS = 8;

const hex = c => {
    const n = parseInt(c.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const ajustar = ([r, g, b], f) => [Math.min(255, r * f), Math.min(255, g * f), Math.min(255, b * f)];

// Cada pintor recibe (x, y, r) y devuelve [r, g, b] o [r, g, b, a]
const ruidoso = (base, rango = 0.2, motas = null) => {
    const col = hex(base);
    const mota = motas && hex(motas.color);
    return (x, y, r) => {
        if (motas && r() < motas.p) return ajustar(mota, 0.85 + r() * 0.3);
        return ajustar(col, 1 - rango / 2 + r() * rango);
    };
};

const tablones = base => {
    const col = hex(base);
    const desfase = [0, 9, 4, 12];
    return (x, y, r) => {
        const fila = Math.floor(y / 4);
        if (y % 4 === 3) return ajustar(col, 0.62);
        if ((x + desfase[fila]) % 16 === 0) return ajustar(col, 0.7);
        const veta = (y % 4 === 1 && r() < 0.35) ? 0.86 : 1;
        return ajustar(col, (0.93 + r() * 0.12) * veta);
    };
};

// Bloque de metal/gema: marco claro, interior con brillo
const gema = (base, claro, oscuro) => {
    const b = hex(base), c = hex(claro), o = hex(oscuro);
    return (x, y, r) => {
        if (x === 0 || y === 0) return ajustar(c, 0.95 + r() * 0.1);
        if (x === 15 || y === 15) return ajustar(o, 0.95 + r() * 0.1);
        const brillo = (x + y > 8 && x + y < 13 && x > 2 && y > 2) ? 1.12 : 1;
        return ajustar(b, (0.92 + r() * 0.16) * brillo);
    };
};

// Lado con franja de pasto arriba y bordes irregulares
const ladoConTecho = (techo, fondo, alturas) => {
    const t = hex(techo);
    const f = ruidoso(fondo, 0.3, { p: 0.08, color: '#3b2a1c' });
    return (x, y, r) => {
        if (y < alturas[x % alturas.length]) return ajustar(t, 0.85 + r() * 0.3);
        return f(x, y, r);
    };
};

// Flor de 16×16: tallo verde y capullo de 4×4 arriba
function florPintor(x, y, r, color, centro) {
    if (x === 7 && y >= 7) return ajustar([60, 130, 44], 0.85 + r() * 0.3);
    if (x === 8 && y >= 10 && y <= 12) return ajustar([60, 130, 44], 0.8);
    if (x >= 5 && x <= 9 && y >= 2 && y <= 6) {
        if (x >= 6 && x <= 8 && y >= 3 && y <= 5) return centro;
        if ((x === 5 || x === 9) && (y === 2 || y === 6)) return [0, 0, 0, 0];
        return ajustar(color, 0.9 + r() * 0.2);
    }
    return [0, 0, 0, 0];
}

const PINTORES = {
    pasto_top: ruidoso('#79b24a', 0.3, { p: 0.08, color: '#5f9a35' }),
    pasto_lado: ladoConTecho('#79b24a', '#866043', [3, 4, 3, 5, 4, 3, 3, 4, 5, 3, 4, 4, 3, 5, 4, 3]),
    tierra: ruidoso('#866043', 0.3, { p: 0.08, color: '#3b2a1c' }),
    piedra: (x, y, r) => {
        const g = 118 * (0.82 + r() * 0.3);
        return [g, g, g];
    },
    arena: ruidoso('#dbd3a0', 0.14, { p: 0.05, color: '#c4ba85' }),
    nieve: ruidoso('#f3f8fb', 0.07, { p: 0.04, color: '#d5e3ee' }),
    agua: ruidoso('#2f5fd0', 0.12, { p: 0.1, color: '#4a79e6' }),
    hojas: (x, y, r) => {
        const v = r();
        if (v < 0.16) return [0, 0, 0, 0];
        const g = v < 0.5 ? [46, 120, 36] : v < 0.8 ? [58, 142, 44] : [36, 98, 30];
        return ajustar(g, 0.9 + r() * 0.2);
    },
    tronco_lado: (x, y, r) => {
        const franja = (x % 4 === 0 || x % 7 === 3) ? 0.72 : 1;
        return ajustar([102, 80, 49], franja * (0.85 + r() * 0.25));
    },
    tronco_top: (x, y, r) => {
        const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5));
        if (d > 6.5) return ajustar([85, 66, 40], 0.9 + r() * 0.2);
        const anillo = Math.floor(d) % 2 === 0 ? 1 : 0.86;
        return ajustar([172, 140, 88], anillo * (0.92 + r() * 0.16));
    },
    tablones: tablones('#a8834f'),
    cuarzo: (x, y, r) => {
        if (y === 15 || x === 15) return ajustar([225, 220, 210], 0.96 + r() * 0.06);
        return ajustar([238, 233, 224], 0.96 + r() * 0.06);
    },
    rojo: ruidoso('#a53a35', 0.12),
    azul: ruidoso('#3a52a8', 0.12),
    naranjo: ruidoso('#df7a22', 0.12),
    negro: ruidoso('#1f1f23', 0.14),
    oro: gema('#f6d73a', '#fff3a8', '#c79a14'),
    diamante: gema('#4fd9d0', '#b3fff6', '#1f9d97'),
    esmeralda: gema('#25d261', '#9bf5bb', '#0f8a3b'),
    podzol_top: ruidoso('#6b4a28', 0.3, { p: 0.12, color: '#8a5f30' }),
    podzol_lado: ladoConTecho('#6b4a28', '#866043', [2, 3, 2, 3, 3, 2, 3, 2, 2, 3, 3, 2, 3, 2, 3, 2]),
    arcilla: ruidoso('#9da3b8', 0.1),
    gris: (x, y, r) => {
        const junta = (y % 8 === 7) || ((x + (y < 8 ? 0 : 8)) % 16 === 15);
        const g = (junta ? 70 : 108) * (0.9 + r() * 0.2);
        return [g, g, g];
    },
    camino_top: ruidoso('#9a7144', 0.22, { p: 0.08, color: '#775227' }),
    cultivo_top: (x, y, r) => {
        const surco = x % 4 === 0 ? 0.7 : 1;
        return ajustar([92, 62, 38], surco * (0.88 + r() * 0.24));
    },
    cultivo_planta: (x, y, r) => {
        const v = r();
        if (v < 0.35) return [0, 0, 0, 0];
        return ajustar(v < 0.7 ? [64, 150, 52] : [98, 176, 60], 0.9 + r() * 0.2);
    },
    vidrio: (x, y, r) => {
        if (x === 0 || y === 0 || x === 15 || y === 15) return [200, 228, 238];
        if ((x - y === 0 || x - y === 1) && x > 2 && x < 9) return [232, 246, 252];
        return [0, 0, 0, 0];
    },
    piedra_labrada: (x, y, r) => {
        const junta = (x + (Math.floor(y / 4) % 2) * 4) % 8 === 0 || y % 4 === 0;
        const g = (junta ? 78 : 122) * (0.85 + r() * 0.25);
        return [g, g, g];
    },
    hojas_abedul: (x, y, r) => {
        const v = r();
        if (v < 0.16) return [0, 0, 0, 0];
        return ajustar(v < 0.5 ? [112, 156, 62] : v < 0.8 ? [128, 172, 70] : [92, 134, 52], 0.9 + r() * 0.2);
    },
    tronco_abedul_lado: (x, y, r) => {
        const mancha = r() < 0.12 || (y % 5 === 2 && x % 3 !== 0 && r() < 0.5);
        return mancha ? [46, 44, 40] : ajustar([226, 224, 214], 0.92 + r() * 0.14);
    },
    tronco_abedul_top: (x, y, r) => {
        const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5));
        return d > 6.5 ? ajustar([200, 198, 186], 0.9 + r() * 0.2) : ajustar([196, 176, 120], (Math.floor(d) % 2 ? 0.9 : 1) * (0.94 + r() * 0.12));
    },
    hojas_pino: (x, y, r) => {
        const v = r();
        if (v < 0.14) return [0, 0, 0, 0];
        return ajustar(v < 0.5 ? [30, 84, 52] : v < 0.8 ? [38, 100, 60] : [22, 66, 42], 0.9 + r() * 0.2);
    },
    tronco_pino_lado: (x, y, r) => {
        const franja = (x % 4 === 1 || x % 5 === 3) ? 0.7 : 1;
        return ajustar([68, 48, 28], franja * (0.85 + r() * 0.25));
    },
    pasto_alto: (x, y, r) => {
        const hojas = [[2, 11], [4, 8], [6, 12], [8, 7], [10, 11], [12, 9], [13, 12]];
        for (const [px, alto] of hojas) {
            if (x === px && y >= 15 - alto) return ajustar([80, 150, 52], 0.85 + (15 - y) / 30 + r() * 0.15);
        }
        return [0, 0, 0, 0];
    },
    flor_roja: (x, y, r) => florPintor(x, y, r, [208, 48, 52], [250, 210, 70]),
    flor_amarilla: (x, y, r) => florPintor(x, y, r, [246, 214, 58], [220, 130, 30]),
    flor_azul: (x, y, r) => florPintor(x, y, r, [76, 110, 226], [230, 236, 250]),
    trigo: (x, y, r) => {
        const tallos = [2, 5, 8, 11, 14];
        for (const px of tallos) {
            if (x === px && y >= 4) return ajustar([120, 160, 56], 0.85 + r() * 0.3);
            if (Math.abs(x - px) <= 1 && y >= 1 && y <= 5 && !(x !== px && y === 5 && r() < 0.5)) return ajustar([222, 190, 84], 0.82 + r() * 0.3);
        }
        return [0, 0, 0, 0];
    },
    tronco_pino_top: (x, y, r) => {
        const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5));
        return d > 6.5 ? ajustar([60, 42, 24], 0.9 + r() * 0.2) : ajustar([120, 90, 52], (Math.floor(d) % 2 ? 0.88 : 1) * (0.94 + r() * 0.12));
    }
};

export const NOMBRES_TILE = Object.keys(PINTORES);
export const TILE = Object.fromEntries(NOMBRES_TILE.map((n, i) => [n, i]));

export function crearAtlas() {
    const ancho = COLS * TAM, alto = FILAS * TAM;
    const canvas = document.createElement('canvas');
    canvas.width = ancho;
    canvas.height = alto;
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(ancho, alto);
    NOMBRES_TILE.forEach((nombre, n) => {
        const ox = (n % COLS) * TAM, oy = Math.floor(n / COLS) * TAM;
        const r = azar(1000 + n * 31);
        for (let y = 0; y < TAM; y++) {
            for (let x = 0; x < TAM; x++) {
                const [cr, cg, cb, ca = 255] = PINTORES[nombre](x, y, r);
                const i = ((oy + y) * ancho + ox + x) * 4;
                img.data[i] = cr; img.data[i + 1] = cg; img.data[i + 2] = cb; img.data[i + 3] = ca;
            }
        }
    });
    ctx.putImageData(img, 0, 0);
    return canvas;
}

// ---------------------------------------------------------
// Bloques: id → texturas por cara
// tipo: 's' sólido opaco, 'h' hoja (recortada), 'a' agua
// ---------------------------------------------------------
const def = (nombre, tipo, top, lado = top, fondo = lado) =>
    ({ nombre, tipo, top: TILE[top], lado: TILE[lado], fondo: TILE[fondo] });

export const B = {
    AIRE: 0, PASTO: 1, TIERRA: 2, PIEDRA: 3, ARENA: 4, NIEVE: 5, AGUA: 6, HOJAS: 7, TRONCO: 8,
    TABLONES: 9, CUARZO: 10, ROJO: 11, AZUL: 12, NARANJO: 13, NEGRO: 14, ORO: 15, DIAMANTE: 16,
    ESMERALDA: 17, PODZOL: 18, ARCILLA: 19, GRIS: 20, CAMINO: 21, CULTIVO: 22,
    TRIGO: 23, VIDRIO: 24, LABRADA: 25, HOJAS_ABEDUL: 26, TRONCO_ABEDUL: 27, HOJAS_PINO: 28, TRONCO_PINO: 29,
    PASTO_ALTO: 30, FLOR_ROJA: 31, FLOR_AMARILLA: 32, FLOR_AZUL: 33
};

export const BLOQUES = [];
BLOQUES[B.PASTO] = def('pasto', 's', 'pasto_top', 'pasto_lado', 'tierra');
BLOQUES[B.TIERRA] = def('tierra', 's', 'tierra');
BLOQUES[B.PIEDRA] = def('piedra', 's', 'piedra');
BLOQUES[B.ARENA] = def('arena', 's', 'arena');
BLOQUES[B.NIEVE] = def('nieve', 's', 'nieve');
BLOQUES[B.AGUA] = def('agua', 'a', 'agua');
BLOQUES[B.HOJAS] = def('hojas', 'h', 'hojas');
BLOQUES[B.TRONCO] = def('tronco', 's', 'tronco_top', 'tronco_lado', 'tronco_top');
BLOQUES[B.TABLONES] = def('tablones', 's', 'tablones');
BLOQUES[B.CUARZO] = def('cuarzo', 's', 'cuarzo');
BLOQUES[B.ROJO] = def('rojo', 's', 'rojo');
BLOQUES[B.AZUL] = def('azul', 's', 'azul');
BLOQUES[B.NARANJO] = def('naranjo', 's', 'naranjo');
BLOQUES[B.NEGRO] = def('negro', 's', 'negro');
BLOQUES[B.ORO] = def('oro', 's', 'oro');
BLOQUES[B.DIAMANTE] = def('diamante', 's', 'diamante');
BLOQUES[B.ESMERALDA] = def('esmeralda', 's', 'esmeralda');
BLOQUES[B.PODZOL] = def('podzol', 's', 'podzol_top', 'podzol_lado', 'tierra');
BLOQUES[B.ARCILLA] = def('arcilla', 's', 'arcilla');
BLOQUES[B.GRIS] = def('gris', 's', 'gris');
BLOQUES[B.CAMINO] = def('camino', 's', 'camino_top', 'tierra', 'tierra');
BLOQUES[B.CULTIVO] = def('cultivo', 's', 'cultivo_top', 'tierra', 'tierra');
BLOQUES[B.TRIGO] = def('trigo', 'p', 'trigo');
BLOQUES[B.PASTO_ALTO] = def('pasto alto', 'p', 'pasto_alto');
BLOQUES[B.FLOR_ROJA] = def('amapola', 'p', 'flor_roja');
BLOQUES[B.FLOR_AMARILLA] = def('diente de leon', 'p', 'flor_amarilla');
BLOQUES[B.FLOR_AZUL] = def('aciano', 'p', 'flor_azul');
BLOQUES[B.VIDRIO] = def('vidrio', 'h', 'vidrio');
BLOQUES[B.LABRADA] = def('piedra labrada', 's', 'piedra_labrada');
BLOQUES[B.HOJAS_ABEDUL] = def('hojas de abedul', 'h', 'hojas_abedul');
BLOQUES[B.TRONCO_ABEDUL] = def('tronco de abedul', 's', 'tronco_abedul_top', 'tronco_abedul_lado', 'tronco_abedul_top');
BLOQUES[B.HOJAS_PINO] = def('hojas de pino', 'h', 'hojas_pino');
BLOQUES[B.TRONCO_PINO] = def('tronco de pino', 's', 'tronco_pino_top', 'tronco_pino_lado', 'tronco_pino_top');

// Tipo de cada id en un arreglo plano para el mallado: 0 aire, 1 sólido, 2 hoja, 3 agua, 4 planta en cruz
export const TIPO = new Uint8Array(BLOQUES.length);
BLOQUES.forEach((b, i) => { if (b) TIPO[i] = b.tipo === 's' ? 1 : b.tipo === 'h' ? 2 : b.tipo === 'p' ? 4 : 3; });
