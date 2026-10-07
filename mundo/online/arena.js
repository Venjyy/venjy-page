// =========================================================
// VENJY · Arena skywars
// Mapa aparte generado por código: islas flotantes sobre el vacío, con cofres de botín.
// Se rellena en un arreglo denso (la arena es pequeña) y voxeles.js lo copia por ventanas,
// de modo que el llenado, la luz y el mallado son los mismos que los del mundo normal.
// =========================================================
import { B } from '../texturas.js';
import { ALTO } from '../voxeles.js';

export const TAM_ARENA = 224;            // bloques por lado (14 chunks)
const CENTRO = TAM_ARENA / 2;
export const VACIO_Y = -12;              // por debajo de esto, el jugador cae al vacío

function mulberry(semilla) {
    let a = semilla >>> 0;
    return () => {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// Botín de un cofre: depende solo de (ronda, número de cofre), así todos ven lo mismo.
// arma: 0 puños, 1 madera, 2 piedra, 3 hierro, 4 diamante · armadura: 0 a 4 · cura: puntos de vida
export function botinDe(ronda, indice, central) {
    const r = mulberry(ronda * 7919 + indice * 104729 + 13);
    const x = r();
    const botin = { arma: 0, armadura: 0, cura: 0 };
    if (central) {
        botin.arma = x < 0.45 ? 3 : 4;
        botin.armadura = 2 + Math.floor(r() * 3);
        botin.cura = 6;
    } else if (x < 0.4) botin.arma = 1 + Math.floor(r() * 2);
    else if (x < 0.75) botin.armadura = 1 + Math.floor(r() * 2);
    else { botin.cura = 6; botin.arma = r() < 0.5 ? 1 : 0; }
    return botin;
}

export const ARMAS = [
    { nombre: { es: 'Puños', en: 'Fists' }, dano: 2 },
    { nombre: { es: 'Espada de madera', en: 'Wooden sword' }, dano: 4 },
    { nombre: { es: 'Espada de piedra', en: 'Stone sword' }, dano: 5 },
    { nombre: { es: 'Espada de hierro', en: 'Iron sword' }, dano: 6 },
    { nombre: { es: 'Espada de diamante', en: 'Diamond sword' }, dano: 8 }
];

// Crea el terreno de la arena. Cada ronda cambia el botín, no la forma.
export function crearTerrenoArena() {
    const W = TAM_ARENA, D = TAM_ARENA;
    const vox = new Uint8Array(W * D * ALTO);
    const r = mulberry(20261007);
    const cofres = [];
    const spawns = [];

    const poner = (x, y, z, id) => {
        if (x < 0 || z < 0 || x >= W || z >= D || y < 0 || y >= ALTO) return;
        vox[(y * D + z) * W + x] = id;
    };

    // Isla: disco con borde irregular, capa de pasto, tierra y piedra, y una punta hacia abajo
    function isla(cx, cz, yTop, radio, opciones = {}) {
        const profundo = opciones.profundo || Math.round(radio * 0.9) + 2;
        const fase = r() * 6.28;
        const ruido = (a) => 1 + 0.22 * Math.sin(a * 3 + fase) + 0.12 * Math.sin(a * 5 + fase * 2);
        for (let dz = -radio - 2; dz <= radio + 2; dz++) {
            for (let dx = -radio - 2; dx <= radio + 2; dx++) {
                const d = Math.hypot(dx, dz) / (radio * ruido(Math.atan2(dz, dx)));
                if (d > 1) continue;
                const hondo = Math.max(1, Math.round(profundo * (1 - d * d)));
                for (let k = 0; k < hondo; k++) {
                    const y = yTop - k;
                    const id = k === 0 ? (opciones.arena ? B.ARENA : B.PASTO) : k <= 2 ? B.TIERRA : B.PIEDRA;
                    poner(cx + dx, y, cz + dz, id);
                }
            }
        }
    }

    function arbol(x, yBase, z, alto = 4) {
        for (let k = 1; k <= alto; k++) poner(x, yBase + k, z, B.TRONCO);
        for (let dy = alto - 1; dy <= alto + 1; dy++) {
            const rad = dy === alto + 1 ? 1 : 2;
            for (let dz = -rad; dz <= rad; dz++) for (let dx = -rad; dx <= rad; dx++) {
                if (Math.abs(dx) === rad && Math.abs(dz) === rad && dy !== alto) continue;
                if (dx === 0 && dz === 0 && dy <= alto) continue;
                poner(x + dx, yBase + dy, z + dz, B.HOJAS);
            }
        }
    }

    function cofre(x, yTop, z, central) {
        poner(x, yTop + 1, z, B.COFRE);
        cofres.push({ x, y: yTop + 1, z, central, indice: cofres.length });
    }

    // Islas de salida en anillo
    const N = 8;
    for (let k = 0; k < N; k++) {
        const a = (k / N) * Math.PI * 2;
        const x = Math.round(CENTRO + Math.cos(a) * 82), z = Math.round(CENTRO + Math.sin(a) * 82);
        const yTop = 50;
        isla(x, z, yTop, 6);
        // El árbol queda detrás del jugador (hacia fuera) y el cofre delante
        arbol(x + Math.round(Math.cos(a) * 3), yTop, z + Math.round(Math.sin(a) * 3), 4);
        cofre(x - Math.round(Math.cos(a) * 2), yTop, z - Math.round(Math.sin(a) * 2), false);
        spawns.push({ x: x + 0.5, y: yTop + 1, z: z + 0.5, mira: a + Math.PI });
    }
    // Islas intermedias con cofres
    for (let k = 0; k < N; k++) {
        const a = ((k + 0.5) / N) * Math.PI * 2;
        const x = Math.round(CENTRO + Math.cos(a) * 52), z = Math.round(CENTRO + Math.sin(a) * 52);
        const yTop = 46 + Math.floor(r() * 7) - 3;
        isla(x, z, yTop, 4);
        cofre(x, yTop, z, false);
        if (k % 2 === 0) poner(x + 2, yTop + 1, z + 1, B.ORO);
    }
    // Islotes sueltos para hacer puentes
    for (let k = 0; k < 10; k++) {
        const a = r() * Math.PI * 2, d = 25 + r() * 70;
        const x = Math.round(CENTRO + Math.cos(a) * d), z = Math.round(CENTRO + Math.sin(a) * d);
        isla(x, z, 44 + Math.floor(r() * 14), 2 + Math.floor(r() * 2), { arena: r() < 0.5, profundo: 4 });
    }
    // Isla central grande con ruinas, antorchas y los cofres buenos
    const yc = 52;
    isla(CENTRO, CENTRO, yc, 15, { profundo: 14 });
    for (let dz = -4; dz <= 4; dz++) for (let dx = -4; dx <= 4; dx++) {
        const borde = Math.max(Math.abs(dx), Math.abs(dz)) === 4;
        if (borde && (dx + dz) % 2 === 0) for (let h = 1; h <= 3; h++) poner(CENTRO + dx, yc + h, CENTRO + dz, B.LADRILLO);
    }
    for (const [dx, dz] of [[2, 2], [-2, 2], [2, -2], [-2, -2]]) cofre(CENTRO + dx, yc, CENTRO + dz, true);
    for (const [dx, dz] of [[4, 4], [-4, 4], [4, -4], [-4, -4]]) poner(CENTRO + dx, yc + 4, CENTRO + dz, B.PIEDRA_LUMINOSA);
    poner(CENTRO, yc + 1, CENTRO, B.DIAMANTE);

    return {
        arena: { vox, W, D, cofres, spawns },
        BW: W, BD: D,
        ediciones: new Map(),
        zonasLuz: [], decor: [], casas: [], faro: { x: -999, z: -999, y: 0 },
        HT: null, datos: null
    };
}
