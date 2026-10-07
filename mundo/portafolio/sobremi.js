// =========================================================
// VENJY · «Sobre mí»: el interior de la casa roja del mapa
// Es la zona 1 del portafolio. Dentro de la casa (puerta al sur) hay dos atriles con el CV:
// entrando, a la izquierda (oeste) el CV en español y a la derecha (este) el CV en inglés;
// al fondo, la mesa con el libro de presentación y el retrato.
// Lo usan voxeles.js (levanta los bloques, también dentro de los workers) y zonas.js (pone los
// carteles y paneles en los mismos puntos).
// =========================================================
import { B } from '../texturas.js';

// c: casa detectada en prepararTerreno ({ minx, maxx, minz, maxz, puertaX }); base: altura del piso
export function geometriaSobreMi(c, base) {
    const ix0 = c.minx + 1, ix1 = c.maxx - 1, iz0 = c.minz + 1, iz1 = c.maxz - 1;
    const px = c.puertaX, cz = (c.minz + c.maxz) >> 1;
    const zAtril = iz1 - 6;
    return {
        base, ix0, ix1, iz0, iz1, px, cz, zAtril,
        atriles: [
            { id: 'cv-es', x: px - 8, z: zAtril },
            { id: 'cv-en', x: px + 8, z: zAtril }
        ],
        mesa: { x: px - 1, z: iz0 + 5 },                                   // esquina de la mesa 2×2
        libro: { x: px + 0.5, y: base + 2.6, z: iz0 + 6.5 },                // punto de interés del libro
        retrato: { x: px + 0.5, y: base + 3.1, z: c.minz + 1.03 },          // pegado a la pared norte
        centro: { x: px + 0.5, y: base + 8, z: cz + 0.5 }
    };
}

// poner(x, y, z, id) escribe un bloque; y0 = primer nivel sobre el piso. La chimenea y el piso ya existen.
export function levantarSobreMi(poner, g, y0) {
    const { ix0, ix1, iz0, iz1, px, cz, zAtril } = g;

    // Alfombra roja: de la puerta al fondo y a lo ancho de los atriles
    for (let z = iz1; z >= iz0 + 3; z--) for (let x = px - 1; x <= px + 1; x++) poner(x, y0 - 1, z, B.ROJO);
    for (let x = px - 10; x <= px + 10; x++) for (let dz = -1; dz <= 1; dz++) poner(x, y0 - 1, zAtril + dz, B.ROJO);

    // Mesa del fondo con el libro de presentación y dos antorchas
    for (let dz = 0; dz < 2; dz++) for (let dx = 0; dx < 2; dx++) poner(g.mesa.x + dx, y0, g.mesa.z + dz, B.TABLONES);
    poner(g.mesa.x + 1, y0 + 1, g.mesa.z + 1, B.LIBRERO);
    poner(g.mesa.x, y0 + 1, g.mesa.z, B.ANTORCHA);

    // Libreros contra la pared norte, dejando libre el centro (retrato) y la cama
    for (let x = ix0 + 5; x <= ix1 - 6; x++) {
        if (Math.abs(x - px) <= 3) continue;
        poner(x, y0, iz0, B.LIBRERO);
        poner(x, y0 + 1, iz0, B.LIBRERO);
    }
    // Cama en la esquina noreste
    for (let dz = 0; dz < 3; dz++) for (let dx = 0; dx < 2; dx++) poner(ix1 - 3 + dx, y0, iz0 + dz, B.CAMA);
    poner(ix1, y0, iz1, B.COFRE);

    // Atriles: dos tablones y un librero abierto encima, con antorchas a los lados
    for (const a of g.atriles) {
        poner(a.x, y0, a.z, B.TABLONES);
        poner(a.x, y0 + 1, a.z, B.TABLONES);
        poner(a.x, y0 + 2, a.z, B.LIBRERO);
        poner(a.x, y0, a.z - 2, B.ANTORCHA);
        poner(a.x, y0, a.z + 2, B.ANTORCHA);
    }

    // Antorchas en las paredes largas y lámparas bajo la cumbrera
    for (const x of [ix0 + 10, ix1 - 8, (ix0 + ix1) >> 1]) {
        poner(x, y0 + 2, iz0, B.ANTORCHA);
        if (Math.abs(x - px) > 2) poner(x, y0 + 2, iz1, B.ANTORCHA);
    }
    for (const dx of [-12, -6, 0, 6, 12]) poner(px + dx, y0 + 8, cz, B.PIEDRA_LUMINOSA);
    for (const a of g.atriles) poner(a.x, y0 + 6, a.z, B.PIEDRA_LUMINOSA);
}
