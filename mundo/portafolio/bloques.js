// =========================================================
// VENJY · Bloques de las zonas del portafolio (además de «Sobre mí», en sobremi.js)
//  · Experiencia: el edificio azul del registro, con un puesto (atril) por trabajo.
//  · Habilidades: vetas de mineral a lo largo del túnel de la mina.
//  · ProcedimientoSeguro: el soporte de la pantalla al pie del faro.
// Las usa voxeles.js (también dentro de los workers) y zonas.js (carteles y paneles en los mismos puntos).
// =========================================================
import { B } from '../texturas.js';

// ---------- Experiencia (registro) ----------
// c: casa azul de prepararTerreno ({ minx, maxx, minz, maxz, puertaX }); base: altura del piso
export function geometriaExperiencia(c, base) {
    const ix0 = c.minx + 1, ix1 = c.maxx - 1, iz0 = c.minz + 1, iz1 = c.maxz - 1;
    const px = c.puertaX, cz = (c.minz + c.maxz) >> 1;
    const zPuesto = cz + 3;
    // De izquierda (oeste) a derecha (este), entrando por la puerta del sur: el orden de la página
    const puestos = [-15, -5, 5, 15].map((dx, i) => ({ id: 'exp-' + i, x: px + dx, z: zPuesto }));
    return { base, ix0, ix1, iz0, iz1, px, cz, zPuesto, puestos, centro: { x: px + 0.5, y: base + 8, z: cz + 0.5 } };
}

export function levantarExperiencia(poner, g, y0) {
    const { ix0, ix1, iz0, iz1, px, zPuesto } = g;
    // Alfombra: de la puerta al pasillo de los puestos
    for (let z = iz1; z >= zPuesto; z--) for (let x = px - 1; x <= px + 1; x++) poner(x, y0 - 1, z, B.ROJO);
    for (let x = px - 18; x <= px + 18; x++) for (let dz = -1; dz <= 1; dz++) poner(x, y0 - 1, zPuesto + dz, B.ROJO);
    // Un atril por trabajo: dos tablones, un librero abierto encima y antorchas a los lados
    for (const p of g.puestos) {
        poner(p.x, y0, p.z, B.TABLONES);
        poner(p.x, y0 + 1, p.z, B.TABLONES);
        poner(p.x, y0 + 2, p.z, B.LIBRERO);
        poner(p.x - 2, y0, p.z, B.ANTORCHA);
        poner(p.x + 2, y0, p.z, B.ANTORCHA);
        poner(p.x, y0 + 7, p.z, B.PIEDRA_LUMINOSA);
    }
    // Libreros contra la pared norte y antorchas en las paredes largas
    for (let x = ix0 + 5; x <= ix1 - 5; x++) {
        if ((x - ix0) % 6 === 0) { poner(x, y0 + 2, iz0, B.ANTORCHA); continue; }
        poner(x, y0, iz0, B.LIBRERO);
        poner(x, y0 + 1, iz0, B.LIBRERO);
    }
    for (const x of [ix0 + 8, ix1 - 8]) if (Math.abs(x - px) > 2) poner(x, y0 + 2, iz1, B.ANTORCHA);
    for (const dx of [-12, 0, 12]) poner(px + dx, y0 + 9, g.cz - 3, B.PIEDRA_LUMINOSA);
}

// ---------- Habilidades (mina) ----------
// Una veta por grupo de la página, a lo largo del túnel (k = bloques desde la entrada)
export const VETAS = [
    { k: 5, mineral: B.DIAMANTE }, { k: 10, mineral: B.ORO }, { k: 15, mineral: B.ROJO },
    { k: 20, mineral: B.ESMERALDA }, { k: 25, mineral: B.AZUL }
];

// d: decorado 'mina' ({ x, z }); el túnel va hacia el norte (−z) desde d.z
export function levantarVetas(poner, d, y0) {
    for (const v of VETAS) {
        const z = d.z - v.k;
        for (const lado of [-4, 4]) {
            for (let dz = -1; dz <= 1; dz++) for (let y = y0; y <= y0 + 2; y++) poner(d.x + lado, y, z + dz, v.mineral);
        }
        poner(d.x - 3, y0, z - 1, B.ANTORCHA);
        poner(d.x + 3, y0, z + 1, B.ANTORCHA);
    }
}

// ---------- ProcedimientoSeguro (faro) ----------
// Pantalla al pie del faro, a la izquierda de la puerta (que da al sur): soporte negro con postes de tronco
export function geometriaPantallaFaro(f) {
    const x0 = f.x - 8, ancho = 6;               // bloques x0 .. x0+5
    const yBase = f.y + 1;                         // 1 bloque sobre la plataforma
    return {
        x0, ancho, z: f.z + 5, yBase, alto: 3,
        // centro del plano de la pantalla y su cara frontal (mira al sur)
        centro: { x: x0 + ancho / 2, y: yBase + 1.5, z: f.z + 5 + 1.02 }
    };
}

export function levantarPantallaFaro(poner, f) {
    const s = geometriaPantallaFaro(f);
    for (let dx = 0; dx < s.ancho; dx++) {
        poner(s.x0 + dx, f.y, s.z, B.NEGRO);                      // base
        for (let dy = 0; dy < s.alto; dy++) poner(s.x0 + dx, s.yBase + dy, s.z, B.NEGRO);  // fondo de la pantalla
        poner(s.x0 + dx, s.yBase + s.alto, s.z, B.TRONCO);        // viga superior
    }
    for (const dx of [0, s.ancho - 1]) for (let dy = 0; dy < s.alto; dy++) poner(s.x0 + dx, s.yBase + dy, s.z, B.TRONCO);
    for (const dx of [-1, s.ancho]) poner(s.x0 + dx, f.y, s.z + 1, B.ANTORCHA);
}

// ---------- Mis gatas (gatera): interior decorado ----------
// Las gatas eligen destinos al azar en el centro de la casa (x0+2…x1-2 en gatas.js), así que los
// muebles van solo en las franjas junto a las paredes y el pasillo de la puerta queda libre.
export function geometriaGatera(c, base) {
    return { base, minx: c.minx, maxx: c.maxx, minz: c.minz, maxz: c.maxz, px: c.puertaX };
}

export function levantarGatera(poner, g, y0) {
    const ix0 = g.minx + 1, ix1 = g.maxx - 1, iz0 = g.minz + 1, iz1 = g.maxz - 1;
    // Alfombra crema con borde naranjo al centro (solo el piso: las gatas caminan encima)
    for (let z = iz0 + 4; z <= iz1 - 4; z++) {
        for (let x = ix0 + 5; x <= ix1 - 5; x++) {
            const borde = z === iz0 + 4 || z === iz1 - 4 || x === ix0 + 5 || x === ix1 - 5;
            poner(x, y0 - 1, z, borde ? B.NARANJO : B.ARENA);
        }
    }
    // Repisa de libros bajo los cuadros de la pared norte
    for (let x = ix0 + 1; x <= ix1 - 1; x++) poner(x, y0, iz0, B.LIBRERO);
    // Camas junto a la pared oeste
    for (const z of [iz0 + 4, iz0 + 10]) for (let dz = 0; dz < 3; dz++) for (let dx = 0; dx < 2; dx++) poner(ix0 + dx, y0, z + dz, B.CAMA);
    // Rascadores: torre de troncos con plataformas (noreste) y poste (sureste)
    for (let y = 0; y < 4; y++) poner(ix1 - 1, y0 + y, iz0 + 3, B.TRONCO);
    for (const y of [1, 3]) for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 0; dx++) poner(ix1 - 1 + dx, y0 + y, iz0 + 3 + dz, B.TABLONES);
    for (let y = 0; y < 3; y++) poner(ix1, y0 + y, iz1 - 3, B.TRONCO);
    // Mesita con antorcha, comedero de gatas (dos bloques de piedra) y cofre de juguetes en el sureste
    poner(ix1, y0, iz0 + 12, B.TABLONES);
    poner(ix1, y0 + 1, iz0 + 12, B.ANTORCHA);
    poner(ix0, y0, iz1 - 1, B.GRIS); poner(ix0 + 1, y0, iz1 - 1, B.GRIS);
    poner(ix1, y0, iz1 - 6, B.COFRE);
    // Luz: antorchas en las paredes y lámparas bajo la cumbrera
    for (const z of [iz0 + 7, iz0 + 14]) { poner(ix0 - 0, y0 + 2, z, B.ANTORCHA); poner(ix1, y0 + 2, z, B.ANTORCHA); }
    for (const dx of [-6, 0, 6]) poner(g.px + dx, y0 + 6, (iz0 + iz1) >> 1, B.PIEDRA_LUMINOSA);
}

// ---------- Contacto (correo): el oficio de correos por dentro ----------
// c: casa de cuarzo ({ minx, maxx, minz, maxz, puertaX }); el edificio es un anillo con un bloque central
// macizo: prepararTerreno lo vacía para dejar un salón único y le abre la puerta en el muro sur.
export function geometriaCorreo(c, base) {
    const ix0 = c.minx + 1, ix1 = c.maxx - 1, iz0 = c.minz + 1, iz1 = c.maxz - 1;
    const px = c.puertaX, cz = (c.minz + c.maxz) >> 1;
    const zPuesto = cz - 2;
    const puestos = [-6, 1, 8].map((dx, i) => ({ id: 'cor-' + i, x: px + dx, z: zPuesto }));
    return { base, ix0, ix1, iz0, iz1, px, cz, zPuesto, maxz: c.maxz, puestos, centro: { x: px + 0.5, y: base + 8, z: cz + 0.5 } };
}

export function levantarCorreo(poner, g, y0) {
    const { ix0, ix1, iz0, iz1, px, zPuesto } = g;
    for (let z = iz1; z >= zPuesto; z--) for (let x = px; x <= px + 1; x++) poner(x, y0 - 1, z, B.ROJO);
    for (let x = px - 8; x <= px + 10; x++) for (let dz = -1; dz <= 1; dz++) poner(x, y0 - 1, zPuesto + dz, B.ROJO);
    // Un atril por canal (correo, GitHub, LinkedIn)
    for (const p of g.puestos) {
        poner(p.x, y0, p.z, B.TABLONES);
        poner(p.x, y0 + 1, p.z, B.TABLONES);
        poner(p.x, y0 + 2, p.z, B.LIBRERO);
        poner(p.x - 2, y0, p.z, B.ANTORCHA);
        poner(p.x + 2, y0, p.z, B.ANTORCHA);
        poner(p.x, y0 + 6, p.z, B.PIEDRA_LUMINOSA);
    }
    // Casilleros (libreros) contra la pared norte, antorchas y lámparas
    for (let x = ix0 + 2; x <= ix1 - 2; x++) {
        if ((x - ix0) % 5 === 0) { poner(x, y0 + 2, iz0, B.ANTORCHA); continue; }
        poner(x, y0, iz0, B.LIBRERO);
        poner(x, y0 + 1, iz0, B.LIBRERO);
    }
    for (const x of [ix0 + 4, ix1 - 4]) poner(x, y0 + 2, iz1, B.ANTORCHA);
    for (const dx of [-7, 0, 7]) poner(px + dx, y0 + 6, g.cz + 4, B.PIEDRA_LUMINOSA);
}
