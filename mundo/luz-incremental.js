// =========================================================
// VENJY · Luz incremental (bloque 7b-1, solo supervivencia)
// Al romper o poner bloques, actualiza la luz por inundación (quitar y volver a propagar, como
// Minecraft) en vez de rehacer el chunk entero con llenarChunk. El resultado es el mismo punto
// fijo que calcula calcularLuz (voxeles.js) desde cero en el mismo dominio:
//   · cielo: 15 en toda celda sobre el bloque opaco más alto de su columna (el «piso»);
//     el resto, el máximo de sus vecinas transparentes menos 1.
//   · bloque: LUZ_EMISION del bloque; las celdas transparentes, además, el máximo de sus vecinas
//     menos 1. Las opacas no reciben luz.
// Lo comprueba mundo/tests/luz-incremental.mjs (ediciones al azar = llenarChunk desde cero).
//
// El «campo» es la caja de celdas donde se trabaja: { W, D, H, luz(i), poner(i, v), id(i) } con
// i = (y * D + z) * W + x y la luz empacada (cielo << 4) | bloque. Si luz() lanza ABORTAR (celda
// sin dato válido), el que llama deshace lo escrito y usa el camino lento.
// =========================================================
import { TIPO, LUZ_EMISION } from './texturas.js';

export const ABORTAR = { abortar: true };

let pisoCache = new Int16Array(0), pisoMarca = new Uint32Array(0), marca = 0;

// Actualiza la luz del campo. `editadas`: índices de celdas cuyo bloque cambió (el campo ya tiene
// los bloques nuevos). `pisosAntes`: Map(columna z * W + x -> piso antes de los cambios) de las
// columnas editadas (piso = 1 + y del bloque opaco más alto).
export function actualizarLuz(campo, editadas, pisosAntes) {
    const { W, D, H } = campo, WD = W * D;
    if (pisoCache.length < WD) { pisoCache = new Int16Array(WD); pisoMarca = new Uint32Array(WD); }
    marca = (marca + 1) >>> 0 || 1;
    const piso = c => {
        if (pisoMarca[c] !== marca) {
            let y = H - 1;
            while (y >= 0 && TIPO[campo.id(y * WD + c)] !== 1) y--;
            pisoCache[c] = y + 1; pisoMarca[c] = marca;
        }
        return pisoCache[c];
    };
    // Celdas cuyo cielo cambia porque se tapó o se destapó su columna
    const celdas = new Set(editadas);
    for (const [c, antes] of pisosAntes) {
        const ahora = piso(c);
        for (let y = Math.min(antes, ahora); y < Math.max(antes, ahora); y++) celdas.add(y * WD + c);
    }
    canal(campo, celdas, 4, i => (Math.floor(i / WD) >= piso(i % WD) ? 15 : 0));
    canal(campo, celdas, 0, i => LUZ_EMISION[campo.id(i)]);
}

// Un canal (cielo: sh = 4, bloque: sh = 0). `inicial(i)`: valor propio de la celda sin vecinas.
function canal(campo, celdas, sh, inicial) {
    const { W, D, H } = campo, WD = W * D;
    const nivel = i => (campo.luz(i) >> sh) & 15;
    const fijar = (i, v) => { const o = campo.luz(i); campo.poner(i, sh ? (o & 15) | (v << 4) : (o & 0xF0) | v); };
    const transparente = i => TIPO[campo.id(i)] !== 1;
    const vecinas = (i, f) => {
        const x = i % W, z = Math.floor(i / W) % D, y = Math.floor(i / WD);
        if (x > 0) f(i - 1);
        if (x < W - 1) f(i + 1);
        if (z > 0) f(i - W);
        if (z < D - 1) f(i + W);
        if (y > 0) f(i - WD);
        if (y < H - 1) f(i + WD);
    };
    const quitar = [], quitarV = [], sumar = [];
    for (const c of celdas) {
        const antes = nivel(c), propio = inicial(c);
        if (antes > propio) { fijar(c, propio); quitar.push(c); quitarV.push(antes); }
        if (propio > 0) { if (propio > nivel(c)) fijar(c, propio); sumar.push(c); }
        if (transparente(c)) vecinas(c, j => { if (nivel(j) > 0) sumar.push(j); }); // la luz de al lado puede entrar
    }
    // Quitar: toda celda que pudo depender de una quitada vuelve a su valor propio
    for (let q = 0; q < quitar.length; q++) {
        const v = quitarV[q];
        vecinas(quitar[q], j => {
            const lj = nivel(j);
            if (lj === 0) return;
            const pj = inicial(j);
            if (lj < v && lj > pj && transparente(j)) {
                fijar(j, pj); quitar.push(j); quitarV.push(lj);
                if (pj > 0) sumar.push(j);
            } else sumar.push(j); // fuente que vuelve a iluminar lo quitado
        });
    }
    // Volver a propagar (BFS, -1 por paso, solo hacia celdas transparentes)
    for (let q = 0; q < sumar.length; q++) {
        const L = nivel(sumar[q]) - 1;
        if (L <= 0) continue;
        vecinas(sumar[q], j => {
            if (nivel(j) < L && transparente(j)) { fijar(j, L); sumar.push(j); }
        });
    }
}

// Campo sobre los arreglos de un solo chunk (ventana de VENT×VENT con borde): el dominio de la
// luz local de la supervivencia, exactamente el de calcularLuz.
export function campoChunk(vox, luz, VENT, H, diario) {
    return {
        W: VENT, D: VENT, H,
        luz: i => luz[i],
        poner: (i, v) => { if (diario && luz[i] !== v) diario(i); luz[i] = v; },
        id: i => vox[i]
    };
}
