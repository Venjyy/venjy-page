// =========================================================
// VENJY · Construcciones nuevas en datos (mundo/datos/construcciones.json) y su giro
// Lógica pura, sin DOM ni three.js: la usan construcciones.js (hilo principal y workers), el Estudio y las pruebas.
// Una construcción es una lista de bloques [dx, dy, dz, "BLOQUE", giro?] relativos a su bloque central:
// dy 0 es el primer bloque sobre el suelo (dy negativo, cimientos). El frente (la puerta) mira al sur (+z).
// Dónde va y hacia dónde mira lo dice posiciones.json → lugares.<clave> = { x, z, giro } (giro 0, 90, 180 o 270).
// Las 9 del código (construcciones.js) siguen allá como valor base; aquí solo van las nuevas.
// =========================================================
import { B } from '../texturas.js';

export const GIROS = [0, 90, 180, 270];
const MAX_BLOQUES = 20000; // tope para no colgar el armado del terreno con un JSON roto

// Grados del JSON -> cuartos de vuelta (0..3). Lo que no sea múltiplo de 90 se redondea al más cercano.
export function cuartos(giro) {
    const g = Number(giro);
    return Number.isFinite(g) ? (((Math.round(g / 90) % 4) + 4) % 4) : 0;
}

// Gira un desplazamiento (dx, dz) q cuartos de vuelta, con la misma regla que puntoAMundo (posiciones.js) con yaw
// = q · 90°: así las personas que cuelgan del lugar giran igual que sus bloques. 90°: el sur (+z) pasa al este (+x).
export function girarXZ(dx, dz, q) {
    switch (((q % 4) + 4) % 4) {
        case 1: return [dz, -dx];
        case 2: return [-dx, -dz];
        case 3: return [-dz, dx];
        default: return [dx, dz];
    }
}

// Bloques con 4 ids seguidos, uno por giro (0 norte, 1 este, 2 sur, 3 oeste; texturas.js): escalones y trampilla abierta
const CON_GIRO = [B.ESCALONES_PIEDRA, B.ESCALONES_TABLONES, B.ESCALONES_ADOQUIN, B.TRAMPILLA_ABIERTA];
function baseDe(id) { return CON_GIRO.find(b => id >= b && id < b + 4); }

// Id del bloque girado q cuartos (con girarXZ el norte pasa al oeste: giro g -> g - q)
export function girarBloque(id, q) {
    const b = baseDe(id);
    return b === undefined ? id : b + ((((id - b) - q) % 4) + 4) % 4;
}

// "TABLONES" o un número -> id, o null si no es un bloque. giro (0..3) solo para los que tienen 4 ids.
export function idBloque(nombre, giro = 0) {
    const id = typeof nombre === 'number' ? nombre : B[nombre];
    if (!Number.isInteger(id) || id < 0 || id > 255) return null;
    const b = baseDe(id);
    return b === undefined ? id : b + (((id - b) + (giro | 0)) % 4);
}
// id -> [nombre, giro] para escribir el JSON (el Estudio y «guardar como construcción»)
const NOMBRE = new Map();
for (const [k, v] of Object.entries(B)) if (Number.isInteger(v) && !NOMBRE.has(v)) NOMBRE.set(v, k);
export function nombreBloque(id) {
    const b = baseDe(id);
    return b === undefined ? [NOMBRE.get(id) ?? id, 0] : [NOMBRE.get(b), id - b];
}

// «Guardar como construcción» (§44, parte 3): la zona entre dos esquinas, hasta 32×32 y 24 de alto
export const ZONA_MAX = { lado: 32, alto: 24 };

// Copia la zona entre las esquinas a y b ({ x, y, z } del mundo) a la lista del JSON. leer(x, y, z) -> id (0 aire,
// -1 sin cargar). Lo horizontal lo dan las esquinas; la esquina más baja es el piso (dy −1: se mira el suelo al marcar)
// y hacia arriba llega hasta el bloque más alto que haya (o la esquina más alta), sin pasar de 24 capas con el piso.
// El bloque central es el del medio (la puerta se supone al sur: si no, se gira en Posiciones).
// Devuelve { bloques, ancho, fondo, alto, centro: { x, y, z } } o { error } (en español, para el Estudio).
export function bloquesDeZona(leer, a, b) {
    const x0 = Math.min(a.x, b.x), x1 = Math.max(a.x, b.x), z0 = Math.min(a.z, b.z), z1 = Math.max(a.z, b.z);
    const y0 = Math.min(a.y, b.y), yEsq = Math.max(a.y, b.y);
    const ancho = x1 - x0 + 1, fondo = z1 - z0 + 1;
    if (ancho > ZONA_MAX.lado || fondo > ZONA_MAX.lado) return { error: `la zona mide ${ancho}×${fondo}: el máximo es ${ZONA_MAX.lado}×${ZONA_MAX.lado}` };
    if (yEsq - y0 + 1 > ZONA_MAX.alto) return { error: `la zona tiene ${yEsq - y0 + 1} de alto: el máximo es ${ZONA_MAX.alto}` };
    const cx = Math.floor((x0 + x1) / 2), cz = Math.floor((z0 + z1) / 2);
    const bloques = [];
    let tope = yEsq, encima = 0;
    for (let y = y0; y < y0 + ZONA_MAX.alto; y++) {
        for (let z = z0; z <= z1; z++) {
            for (let x = x0; x <= x1; x++) {
                const id = leer(x, y, z);
                if (id === -1) return { error: 'parte de la zona no está cargada: acércate y vuelve a marcar' };
                if (!(id > 0)) continue;
                const [nombre, giro] = nombreBloque(id);
                bloques.push(giro ? [x - cx, y - y0 - 1, z - cz, nombre, giro] : [x - cx, y - y0 - 1, z - cz, nombre]);
                if (y > y0) encima++;
                if (y > tope) tope = y;
            }
        }
    }
    if (!encima) return { error: 'no hay nada construido sobre el piso de la zona' };
    return { bloques, ancho, fondo, alto: tope - y0 + 1, centro: { x: cx, y: y0, z: cz } };
}

// Nombre en español -> clave nueva para construcciones.json («Casa del árbol» -> casa-del-arbol), sin repetir ninguna
// de `ocupadas` (las del código y las que ya hay)
export function claveDe(nombre, ocupadas = []) {
    let base = String(nombre || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
        .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40).replace(/-+$/, '');
    if (!/^[a-z]/.test(base)) base = 'construccion' + (base ? '-' + base : '');
    const usadas = new Set(ocupadas);
    let clave = base, n = 2;
    while (usadas.has(clave)) clave = `${base}-${n++}`;
    return clave;
}

// Tamaño del sitio que nivela: rectángulo centrado en el bloque central que cubre todos los bloques (impar)
export function medidas(bloques) {
    let mx = 0, mz = 0;
    for (let i = 0; i < bloques.length; i += 4) { mx = Math.max(mx, Math.abs(bloques[i])); mz = Math.max(mz, Math.abs(bloques[i + 2])); }
    return { w: 2 * mx + 1, d: 2 * mz + 1 };
}

// construcciones.json -> { clave: { nombre: { es, en }, w, d, bloques: [dx, dy, dz, id, …] } } con las que valen
// (sin borrador, con al menos un bloque conocido). Los bloques que no se reconocen se saltan.
export function propiasDe(datos) {
    const salida = {};
    const lista = datos && datos.construcciones;
    if (!lista || typeof lista !== 'object') return salida;
    for (const [clave, c] of Object.entries(lista)) {
        if (!c || c.borrador || !Array.isArray(c.bloques)) continue;
        const bloques = [];
        for (const b of c.bloques.slice(0, MAX_BLOQUES)) {
            if (!Array.isArray(b) || b.length < 4 || !b.slice(0, 3).every(Number.isInteger)) continue;
            const id = idBloque(b[3], (Number(b[4]) | 0) & 3); // giro del bloque: 0..3, no grados
            if (id !== null) bloques.push(b[0], b[1], b[2], id);
        }
        if (!bloques.length) continue;
        const nombre = c.nombre && typeof c.nombre === 'object' ? { es: c.nombre.es || clave, en: c.nombre.en || c.nombre.es || clave } : { es: clave, en: clave };
        salida[clave] = { nombre, ...medidas(bloques), bloques };
    }
    return salida;
}
