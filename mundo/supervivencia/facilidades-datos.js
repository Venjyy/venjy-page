// =========================================================
// VENJY · Supervivencia · Facilidades de misión (7d-2), datos y lógica pura
// Columna «Facilidad (1)» de la tabla de 7d en mundo/PENDIENTES.md. Sin THREE ni DOM: se prueba en Node
// (mundo/tests/facilidades.mjs). El cableado con el juego vive en facilidades.js.
//   pesca   multiplicadores de la tabla de pesca mientras la misión está activa
//   pista   flecha en el minimapa y rumbo en el seguimiento hasta el punto más cercano (se busca al aceptar)
//   noche   un monstruo garantizado por noche (`n` para más), fuera de la zona segura (cada jugador para sí)
//   marcas  los lugares sin visitar se marcan con «?» en el minimapa
// Lo que no depende de una misión queda siempre puesto: huerto, horno y grava aquí; el corral de ovejas y las
// gallinas, en criaturas/animales.js (`corralesExtra`).
// =========================================================
import { B } from '../texturas.js';
import { O } from './objetos.js';

const t = (es, en) => ({ es, en });

export const FACILIDADES = {
    pony2: { pesca: { [O.PEZ_GLOBO]: 3, [O.SALMON]: 1.5 } },
    salonas2: { pista: { id: B.PIEDRA_LUMINOSA, nombre: t('piedra luminosa', 'glowstone') } },
    salonas3: { pista: { id: B.MENA_REDSTONE, y1: 16, nombre: t('redstone', 'redstone') } },
    hadad2: { noche: { mob: 'zombi' } },
    hadad3: { pista: { id: B.MENA_HIERRO, y0: 20, y1: 60, nombre: t('hierro', 'iron') } },
    andy3: { noche: { mob: 'creeper' } },
    nacho2: { pista: { id: B.MENA_CARBON, cerca: 8, nombre: t('carbón', 'coal') } },
    moises2: { pista: { arena: true, radio: 400, nombre: t('arena', 'sand') } }, // Moisés vive en el iglú, lejos de la orilla: la arena se busca más lejos (barato: solo mira el mapa 2D)
    moises3: { pista: { id: B.MENA_DIAMANTE, y1: 16, nombre: t('diamante', 'diamond') } },
    lalo3: { noche: { mob: 'trauco', bosque: true } },
    boris3: { pista: { id: B.MENA_DIAMANTE, nombre: t('diamante', 'diamond') } },
    lucho1: { noche: { mob: 'arana' } },
    lucho3: { noche: { mob: 'esqueleto' } },
    braulio1: { noche: { mob: 'esqueleto', piso: B.ARENA } }, // pide huesos (los suelta el esqueleto)
    braulio2: { marcas: 'lugares' },
    braulio3: { pista: { id: B.MENA_HIERRO, y0: 20, y1: 60, nombre: t('hierro', 'iron') } }
};
export const facilidadDe = id => FACILIDADES[id] || null;

export const RADIO_PISTA = 64; // bloques

// ---------------------------------------------------------
// Pesca: tabla del juego con multiplicadores. Pesos base = los umbrales de siempre (0,6 / 0,25 / 0,13 / 0,02).
// `mult` = { [id]: factor }; `r` en [0, 1).
// ---------------------------------------------------------
export const PESOS_PESCA = [[O.BACALAO, 0.6], [O.SALMON, 0.25], [O.PEZ_GLOBO, 0.13]];
export const PESO_TESORO = 0.02;
export function botinPesca(r, mult = null) {
    let total = PESO_TESORO;
    const pesos = PESOS_PESCA.map(([id, p]) => { const w = p * ((mult && mult[id]) || 1); total += w; return [id, w]; });
    let x = r * total;
    for (const [id, w] of pesos) { if (x < w) return id; x -= w; }
    return 0; // tesoro: lo elige pesca.js
}
// Probabilidad de cada resultado (para la prueba y para anotar en PENDIENTES)
export function probsPesca(mult = null) {
    let total = PESO_TESORO;
    const p = {};
    for (const [id, w0] of PESOS_PESCA) { const w = w0 * ((mult && mult[id]) || 1); total += w; p[id] = w; }
    for (const id in p) p[id] /= total;
    p.tesoro = PESO_TESORO / total;
    return p;
}

// ---------------------------------------------------------
// Rumbo (el norte es -Z y el este +X, como el minimapa)
// ---------------------------------------------------------
const RUMBO = {
    es: ['norte', 'noreste', 'este', 'sureste', 'sur', 'suroeste', 'oeste', 'noroeste'],
    en: ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest']
};
export function rumbo8(dx, dz) {
    const a = Math.atan2(dx, -dz);
    return ((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8;
}
export const TXT = {
    es: { pista: (nombre, m, dx, dz, y) => `Pista: ${nombre} a ${m} m al ${RUMBO.es[rumbo8(dx, dz)]}${y != null ? ` (y ${y})` : ''}`, sinPista: 'Sin pistas cerca: explora más lejos', lugares: 'Lugares sin visitar: ?' },
    en: { pista: (nombre, m, dx, dz, y) => `Hint: ${nombre} ${m} m to the ${RUMBO.en[rumbo8(dx, dz)]}${y != null ? ` (y ${y})` : ''}`, sinPista: 'No hints nearby: explore farther', lugares: 'Unvisited places: ?' }
};
// Texto del seguimiento: «Pista: hierro a 40 m al noreste (y 31)» (la distancia se redondea de a 5 m)
export function textoPista(pista, nombre, x, z, idioma = 'es') {
    const T = TXT[idioma] || TXT.es;
    if (!pista || pista.nada) return T.sinPista;
    const dx = pista.x - x, dz = pista.z - z;
    return T.pista(nombre ? (nombre[idioma] || nombre.es) : '', Math.max(5, Math.round(Math.hypot(dx, dz) / 5) * 5), dx, dz, pista.arena ? null : pista.y);
}

// Arena de superficie (orilla) más cercana a (cx, cz) dentro de `radio`: { x, y, z, d, arena: true } o null
export function buscarArena(terreno, cx, cz, radio = RADIO_PISTA) {
    const { BW, BD, HT, SUP, ES } = terreno;
    let mejor = null, dMejor = Infinity;
    for (let z = Math.max(0, Math.floor(cz - radio)); z <= Math.min(BD - 1, Math.floor(cz + radio)); z++) {
        for (let x = Math.max(0, Math.floor(cx - radio)); x <= Math.min(BW - 1, Math.floor(cx + radio)); x++) {
            const o = z * BW + x;
            if (SUP[o] !== B.ARENA || ES[o]) continue;
            const d = Math.hypot(x - cx, z - cz);
            if (d < dMejor && d <= radio) { dMejor = d; mejor = { x, y: HT[o] + (terreno.dy || 0), z, d, arena: true }; }
        }
    }
    return mejor;
}

// ---------------------------------------------------------
// Monstruo garantizado por noche: un intento extra cada pocos segundos hasta que aparece 1 por noche.
// `noche` = número de día (dia.dias); cada jugador lleva su propia cuenta.
// ---------------------------------------------------------
export const REINTENTO_S = 4;
export function crearGarantia() {
    const g = { noche: -1, hechos: 0, espera: 0 };
    return {
        estado: g,
        // Devuelve la definición `noche` de la misión si toca intentar ahora, o null
        tocar(dt, def, esNoche, dias) {
            if (!def || !esNoche) { g.espera = 0; return null; }
            if (g.noche !== dias) { g.noche = dias; g.hechos = 0; g.espera = 0; }
            if (g.hechos >= (def.n || 1)) return null;
            g.espera -= dt;
            if (g.espera > 0) return null;
            g.espera = REINTENTO_S;
            return def;
        },
        confirmar() { g.hechos++; },
        serializar: () => ({ n: g.noche, h: g.hechos }),
        cargar(o) { if (o) { g.noche = o.n ?? -1; g.hechos = o.h | 0; } g.espera = 0; }
    };
}

// ---------------------------------------------------------
// Sitios y planos de lo que queda puesto (huerto de Lalo, parche de grava, horno de la gatera)
// `alturaDe(x, z)` = y del bloque más alto del suelo en el mundo (HT + dy).
// ---------------------------------------------------------
// Terreno plano y libre de estructuras a 9-16 bloques del centro de un lugar: { x0, z0, h } (h = y de la tierra)
export function elegirSitio(terreno, lugar, w, d, { dMin = 9, dMax = 18, desnivel = 2, nivelAgua = 14 } = {}) {
    const { BW, BD, HT, ES } = terreno;
    let mejor = null;
    for (let dist = dMin; dist <= dMax; dist += 1) {
        for (let k = 0; k < 16; k++) {
            const a = k / 16 * Math.PI * 2;
            const x0 = Math.round(lugar.bx + Math.cos(a) * dist - w / 2), z0 = Math.round(lugar.bz + Math.sin(a) * dist - d / 2);
            if (x0 < 2 || z0 < 2 || x0 + w >= BW - 2 || z0 + d >= BD - 2) continue;
            let mn = Infinity, mx = -Infinity, libre = true;
            for (let z = z0 - 1; z <= z0 + d && libre; z++) for (let x = x0 - 1; x <= x0 + w; x++) {
                const o = z * BW + x;
                if (ES[o] || HT[o] < nivelAgua + 2) { libre = false; break; }
                mn = Math.min(mn, HT[o]); mx = Math.max(mx, HT[o]);
            }
            if (!libre || mx - mn > desnivel) continue;
            const puntaje = (mx - mn) * 100 + dist;
            if (!mejor || puntaje < mejor.puntaje) mejor = { x0, z0, h: HT[(z0 + (d >> 1)) * BW + x0 + (w >> 1)], puntaje };
        }
    }
    return mejor && { x0: mejor.x0, z0: mejor.z0, h: mejor.h };
}

// Huerto de 9×5: dos filas de trigo, una de zanahoria y dos de papa; un solo bloque de agua al centro riega
// todo (el riego alcanza 4 bloques). Cultivos ya sembrados a medio crecer.
export const HUERTO = { w: 9, d: 5, agua: [4, 3], filas: [B.TRIGO_2, B.TRIGO_2, B.ZANAHORIA_1, B.PAPA_1, B.PAPA_1] };
export function planoHuerto(x0, z0, h, alturaDe) {
    const bloques = [], cultivos = [];
    for (let j = 0; j < HUERTO.d; j++) for (let i = 0; i < HUERTO.w; i++) {
        const x = x0 + i, z = z0 + j, suelo = alturaDe(x, z);
        // Se nivela a h: se rellena de tierra lo que está más bajo y se despeja lo de arriba (árboles, nieve)
        for (let y = suelo + 1; y < h; y++) bloques.push([x, y, z, B.TIERRA]);
        for (let y = h + 1; y <= Math.max(suelo, h) + 8; y++) bloques.push([x, y, z, B.AIRE]);
        const agua = i === HUERTO.agua[0] && j === HUERTO.agua[1];
        bloques.push([x, h, z, agua ? B.AGUA : B.TIERRA_LABRADA_HUMEDA]);
        if (!agua) { bloques.push([x, h + 1, z, HUERTO.filas[j]]); cultivos.push([x, h + 1, z]); }
    }
    return { bloques, cultivos };
}

// Parche de grava de 5×5 y dos capas (el pedernal sale en 1 de cada 10 gravas): sustituye la superficie
export const GRAVA = { w: 5, d: 5, capas: 2 };
export function planoGrava(x0, z0, alturaDe) {
    const bloques = [];
    for (let j = 0; j < GRAVA.d; j++) for (let i = 0; i < GRAVA.w; i++) {
        const x = x0 + i, z = z0 + j, suelo = alturaDe(x, z);
        for (let c = 0; c < GRAVA.capas; c++) bloques.push([x, suelo - c, z, B.GRAVA]);
    }
    return { bloques };
}

// Horno contra la pared este de la gatera, entre las antorchas, libre de muebles (g = terreno.gatera)
export function planoHorno(g, dy = 0) {
    return { bloques: [[g.maxx - 1, g.base + 1 + dy, g.minz + 1 + 8, B.HORNO]] };
}
