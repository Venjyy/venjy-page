// =========================================================
// VENJY · Sala del CV (geometría y construcción en bloques)
// Un salón junto al spawn con dos atriles: el de la izquierda (norte, mirando desde
// la puerta del oeste) es el CV en español y el de la derecha (sur) el CV en inglés.
// Lo usan voxeles.js (que la levanta bloque a bloque, también dentro de los workers)
// y el portafolio (que pone los carteles y paneles en los mismos puntos).
// =========================================================
import { B } from '../texturas.js';

// Origen y tamaño en bloques (junto al camino del spawn, sobre una llanura plana)
export const SALA_CV = { x0: 124, z0: 456, ancho: 31, fondo: 21, margen: 6, margenOeste: 11 };
const ALTO_PARED = 6;

export function geometriaSalaCV(base) {
    const { x0, z0, ancho, fondo } = SALA_CV;
    const x1 = x0 + ancho - 1, z1 = z0 + fondo - 1;
    const cx = x0 + (ancho >> 1), cz = z0 + (fondo >> 1);
    return {
        x0, x1, z0, z1, cx, cz, base,
        puerta: { x: x0, z: cz },
        atriles: [
            { id: 'cv-es', x: cx + 5, z: cz - 6 },
            { id: 'cv-en', x: cx + 5, z: cz + 6 }
        ],
        centro: { x: cx + 0.5, y: base + 8, z: cz + 0.5 }
    };
}

// poner(x, y, z, id) escribe un bloque (ya recorta a la ventana); y0 = primer nivel sobre el suelo
export function levantarSalaCV(poner, g, y0) {
    const { x0, x1, z0, z1, cx, cz } = g;
    const esquinaOLado = (x, z) => x === x0 || x === x1 || z === z0 || z === z1;

    // 1. Volumen libre (por si había árboles o relieve)
    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) for (let y = y0; y <= y0 + 14; y++) poner(x, y, z, B.AIRE);

    // 2. Paredes: base de ladrillo, cuarzo, pilares de tronco y ventanas
    for (let z = z0; z <= z1; z++) {
        for (let x = x0; x <= x1; x++) {
            if (!esquinaOLado(x, z)) continue;
            const ladoNS = z === z0 || z === z1;
            const pilar = ladoNS ? (x - x0) % 6 === 0 : (z - z0) % 5 === 0;
            for (let h = 0; h < ALTO_PARED; h++) {
                let id = h === 0 ? B.LADRILLO : B.CUARZO;
                if (pilar) id = B.TRONCO;
                else if ((h === 2 || h === 3) && ((ladoNS && [2, 3, 4].includes((x - x0) % 6)) || (x === x1 && [2, 3].includes((z - z0) % 5)))) id = B.VIDRIO;
                poner(x, y0 + h, z, id);
            }
        }
    }
    // Puerta del oeste: 3 de ancho, 3 de alto
    for (let dz = -1; dz <= 1; dz++) for (let h = 0; h < 3; h++) poner(x0, y0 + h, cz + dz, B.AIRE);

    // 3. Techo a dos aguas con hastiales
    for (let z = z0; z <= z1; z++) {
        for (let x = x0; x <= x1; x++) {
            const ry = y0 + ALTO_PARED + Math.min(5, Math.min(z - z0, z1 - z) >> 1);
            poner(x, ry, z, B.TABLONES);
            if (x === x0 || x === x1) for (let y = y0 + ALTO_PARED; y < ry; y++) poner(x, y, z, B.CUARZO);
        }
    }

    // 4. Alfombra roja en T: de la puerta al centro y a lo largo de los dos atriles
    for (let x = x0 + 1; x <= cx + 6; x++) for (let dz = -1; dz <= 1; dz++) poner(x, y0 - 1, cz + dz, B.ROJO);
    for (let z = cz - 7; z <= cz + 7; z++) for (let x = cx + 4; x <= cx + 6; x++) poner(x, y0 - 1, z, B.ROJO);

    // 5. Libreros en las paredes largas y antorchas en los pilares
    for (const zz of [z0 + 1, z1 - 1]) {
        for (let x = x0 + 2; x <= x1 - 2; x++) {
            if ((x - x0) % 6 === 0) { poner(x, y0 + 3, zz, B.ANTORCHA); continue; }
            if ((x - x0) % 6 === 1 || (x - x0) % 6 === 5) continue; // pasillo junto a los pilares
            poner(x, y0, zz, B.LIBRERO);
            poner(x, y0 + 1, zz, B.LIBRERO);
        }
    }

    // 6. Atriles: dos bloques de tablones y un librero abierto encima, con antorchas al lado
    for (const a of g.atriles) {
        poner(a.x, y0, a.z, B.TABLONES);
        poner(a.x, y0 + 1, a.z, B.TABLONES);
        poner(a.x, y0 + 2, a.z, B.LIBRERO);
        poner(a.x, y0, a.z - 2, B.ANTORCHA);
        poner(a.x, y0, a.z + 2, B.ANTORCHA);
    }

    // 7. Lámparas bajo la cumbrera
    for (const dx of [-9, -3, 3, 9]) poner(cx + dx, y0 + 10, cz, B.PIEDRA_LUMINOSA);
    for (const dx of [-5, 5]) for (const dz of [-6, 6]) poner(cx + dx, y0 + 7, cz + dz, B.PIEDRA_LUMINOSA);
}
