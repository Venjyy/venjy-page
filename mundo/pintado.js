// =========================================================
// VENJY · Pintado del mapa 2D (sin DOM)
// Paleta de mapas de Minecraft y sombreado por elevación.
// Lo usa script.js (portafolio);
// la generación del terreno vive solo en mundo-datos.js.
// =========================================================

export const MC = {
    pasto: [127, 178, 56], arena: [247, 233, 163], agua: [64, 64, 255], piedra: [112, 112, 112],
    nieve: [255, 255, 255], hojas: [0, 124, 0], tierra: [151, 109, 77], madera: [143, 119, 72],
    cuarzo: [255, 252, 245], rojo: [153, 51, 51], azul: [51, 76, 178], naranjo: [216, 127, 51],
    negro: [25, 25, 25], oro: [250, 238, 77], diamante: [92, 219, 213], esmeralda: [0, 217, 58],
    podzol: [129, 86, 49], arcilla: [164, 168, 184], gris: [76, 76, 76]
};
export const TONOS = [180, 220, 255, 135];

// Devuelve el bitmap RGBA (W*H*4) con el sombreado de los mapas:
// más claro si el terreno sube hacia el norte.
export function pintarBitmap({ W, H, E, T, NIVEL_MAR }) {
    const datos = new Uint8ClampedArray(W * H * 4);
    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            const i = y * W + x;
            const tipo = T[i];
            const base = MC[tipo];
            let tono;
            if (tipo === 'agua') {
                const prof = NIVEL_MAR - E[i];
                const v = prof * 0.1 + ((x + y) & 1) * 0.2;
                tono = v < 0.5 ? 2 : v > 0.9 ? 0 : 1;
            } else {
                const norte = y > 0 ? E[i - W] : E[i];
                const dif = E[i] - norte;
                tono = dif > 0 ? 2 : dif === 0 ? 1 : dif < -2 ? 3 : 0;
            }
            const f = TONOS[tono] / 255;
            const o = i * 4;
            datos[o] = base[0] * f;
            datos[o + 1] = base[1] * f;
            datos[o + 2] = base[2] * f;
            datos[o + 3] = 255;
        }
    }
    return datos;
}
