// =========================================================
// VENJY · Dónde van las 12 páginas del cuaderno de los Tomatitos (7f-3, parte 6) · solo supervivencia
// Una página por zona del mapa (4×3), en un orden barajado con la semilla fija del mundo: el mismo mapa da
// siempre los mismos sitios, en el hilo principal y en los workers. Cada página busca un rincón escondido:
// de preferencia al borde del bosque o cerca del agua, nunca sobre estructuras, caminos, señales ni lugares.
// Devuelve [{ i, x, z, y }] con `y` = bloque de suelo en coordenadas del creativo (el hilo principal suma `dy`).
// Los textos y el premio: supervivencia/cuaderno-datos.js; el estado de cada jugador: inventario.cuaderno.
// =========================================================
import { B } from './texturas.js';
import { crearLibre } from './caminos.js';

export const TOTAL_PAGINAS = 12;
export const ZONAS = { cols: 4, filas: 3 };
export const DISTANCIAS = { camino: 3, senal: 6, lugar: 12, estructura: 2, entrePaginas: 24 };

const hash = (a, b, s) => {
    let h = Math.imul(a + 1, 374761393) ^ Math.imul(b + 1, 668265263) ^ Math.imul(s + 1, 2147483647);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return (h ^ (h >>> 16)) >>> 0;
};

export function colocarPaginas(t) {
    const { BW, BD, HT, ES, SUP, datos, ESCALA, NIVEL_AGUA } = t;
    const { W, T } = datos;
    const libre = crearLibre({ BW, BD, HT, ES, SUP, datos, ESCALA, NIVEL_AGUA });
    const fijos = [
        ...(t.caminos || []).map(c => [c.x, c.z, DISTANCIAS.senal]),
        ...(t.lugares || []).map(l => [l.bx, l.bz, DISTANCIAS.lugar])
    ];
    const elegidas = [];
    const hojasCerca = (x, z) => {
        const cx = Math.floor(x / ESCALA), cz = Math.floor(z / ESCALA);
        for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) {
            const a = cx + dx, b = cz + dz;
            if (a >= 0 && b >= 0 && a < W && b < datos.H && T[b * W + a] === 'hojas') return true;
        }
        return false;
    };
    const aguaCerca = (x, z) => {
        for (let k = 0; k < 8; k++) {
            const a = Math.round(x + Math.cos(k * Math.PI / 4) * 5), b = Math.round(z + Math.sin(k * Math.PI / 4) * 5);
            if (a >= 0 && b >= 0 && a < BW && b < BD && HT[b * BW + a] < NIVEL_AGUA + 1) return true;
        }
        return false;
    };
    // Columna libre, sin camino a 3 bloques ni estructura a 2
    const despejado = (x, z) => {
        if (!libre(x, z)) return false;
        for (let dz = -DISTANCIAS.camino; dz <= DISTANCIAS.camino; dz++) for (let dx = -DISTANCIAS.camino; dx <= DISTANCIAS.camino; dx++) {
            const a = x + dx, b = z + dz;
            if (a < 0 || b < 0 || a >= BW || b >= BD) return false;
            const o = b * BW + a;
            if (SUP[o] === B.CAMINO) return false;
            if (Math.abs(dx) <= DISTANCIAS.estructura && Math.abs(dz) <= DISTANCIAS.estructura && ES[o]) return false;
        }
        return true;
    };
    const lejosDeTodo = (x, z) =>
        fijos.every(([fx, fz, d]) => Math.hypot(fx - x, fz - z) >= d) &&
        elegidas.every(e => Math.hypot(e.x - x, e.z - z) >= DISTANCIAS.entrePaginas);

    // Orden barajado de las zonas: la página i va a la zona orden[i]
    const nZonas = ZONAS.cols * ZONAS.filas;
    const orden = [...Array(nZonas).keys()].sort((a, b) => hash(a, 0, 77) - hash(b, 0, 77));
    for (let i = 0; i < TOTAL_PAGINAS; i++) {
        const zona = orden[i % nZonas];
        const x0 = Math.floor((zona % ZONAS.cols) * BW / ZONAS.cols), x1 = Math.floor(((zona % ZONAS.cols) + 1) * BW / ZONAS.cols);
        const z0 = Math.floor(Math.floor(zona / ZONAS.cols) * BD / ZONAS.filas), z1 = Math.floor((Math.floor(zona / ZONAS.cols) + 1) * BD / ZONAS.filas);
        let mejor = null, hallados = 0;
        for (let k = 0; k < 900 && hallados < 40; k++) {
            const x = x0 + hash(i, k, 1) % (x1 - x0), z = z0 + hash(i, k, 2) % (z1 - z0);
            if (!despejado(x, z) || !lejosDeTodo(x, z)) continue;
            hallados++;
            const puntos = (hojasCerca(x, z) ? 3 : 0) + (aguaCerca(x, z) ? 2 : 0);
            if (!mejor || puntos > mejor.puntos) mejor = { x, z, puntos };
        }
        if (mejor) elegidas.push({ i, x: mejor.x, z: mejor.z, y: HT[mejor.z * BW + mejor.x], puntos: mejor.puntos });
    }
    // Si alguna zona no tuvo sitio (agua, estructuras), las que faltan se buscan en todo el mapa
    for (let i = 0; i < TOTAL_PAGINAS; i++) {
        if (elegidas.some(e => e.i === i)) continue;
        for (let k = 0; k < 4000; k++) {
            const x = hash(i, k, 3) % BW, z = hash(i, k, 4) % BD;
            if (!despejado(x, z) || !lejosDeTodo(x, z)) continue;
            elegidas.push({ i, x, z, y: HT[z * BW + x], puntos: 0 });
            break;
        }
    }
    return elegidas.sort((a, b) => a.i - b.i).map(({ i, x, z, y }) => ({ i, x, z, y }));
}
