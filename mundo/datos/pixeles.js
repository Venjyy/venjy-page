// =========================================================
// VENJY · Dibujos de píxeles en JSON (íconos de objetos, arte de las cartas, borradores)
// Sin DOM: lo usan el juego (iconos.js, cartas-arte.js), el Estudio (pestaña Píxeles), el CLI y las pruebas.
// Un dibujo es { paleta: ["#rrggbb", …], filas: ["..01..", …] }: cada fila es una línea de la imagen y cada
// carácter, el índice del color en la paleta ('.' = vacío, transparente). Con más de 62 colores cada píxel usa
// dos caracteres ('..' = vacío): el ancho de la fila dice cuál de los dos formatos es.
// Esquema: estudio/esquemas/comun.schema.json#/$defs/dibujo
// =========================================================
export const DIGITOS = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
export const MAX_COLORES = DIGITOS.length * DIGITOS.length;
// Medidas de cada clase de dibujo (ancho, alto)
export const MEDIDAS = {
    icono: [16, 16],      // objetos de la supervivencia (iconos.js)
    retrato: [40, 26],    // dentro de la zona `retrato` de la carta (cartas-arte.js)
    carta: [50, 76]       // reverso
};

export const hexDe = ([r, g, b]) => '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
export const rgbDe = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const HEX = /^#[0-9a-f]{6}$/i;

// Cuántos caracteres usa cada píxel según el ancho real de las filas (1 o 2), o 0 si no cuadra
function anchoPixel(d, w) {
    const n = d.filas.length ? d.filas[0].length : w;
    return n === w ? 1 : n === w * 2 ? 2 : 0;
}

// Dibujo -> arreglo de w*h con [r, g, b] o null. Lo que falte o no se entienda queda vacío.
export function decodificar(d, w, h) {
    const px = new Array(w * h).fill(null);
    if (!d || !Array.isArray(d.paleta) || !Array.isArray(d.filas)) return px;
    const cols = d.paleta.map(c => (HEX.test(c) ? rgbDe(c) : null));
    const k = anchoPixel(d, w) || 1;
    for (let y = 0; y < Math.min(h, d.filas.length); y++) {
        const f = String(d.filas[y]);
        for (let x = 0; x < w; x++) {
            const s = f.slice(x * k, x * k + k);
            if (!s || s[0] === '.') continue;
            const i = k === 1 ? DIGITOS.indexOf(s) : DIGITOS.indexOf(s[0]) * DIGITOS.length + DIGITOS.indexOf(s[1]);
            if (i >= 0 && cols[i]) px[y * w + x] = cols[i];
        }
    }
    return px;
}

// Arreglo de w*h ([r, g, b] | '#rrggbb' | null) -> dibujo. La paleta sale en orden de aparición.
export function codificar(px, w, h) {
    const paleta = [], indice = new Map();
    const hexes = px.map(c => (c ? (typeof c === 'string' ? c.toLowerCase() : hexDe(c)) : null));
    for (const c of hexes) if (c && !indice.has(c)) { indice.set(c, paleta.length); paleta.push(c); }
    if (paleta.length > MAX_COLORES) throw new Error(`demasiados colores (${paleta.length} > ${MAX_COLORES})`);
    const dos = paleta.length > DIGITOS.length;
    const car = i => (dos ? DIGITOS[Math.floor(i / DIGITOS.length)] + DIGITOS[i % DIGITOS.length] : DIGITOS[i]);
    const vacio = dos ? '..' : '.';
    const filas = [];
    for (let y = 0; y < h; y++) {
        let f = '';
        for (let x = 0; x < w; x++) { const c = hexes[y * w + x]; f += c ? car(indice.get(c)) : vacio; }
        filas.push(f);
    }
    return { paleta, filas };
}

// Errores de forma de un dibujo (lo que el esquema no alcanza a revisar): ['mensaje', …]
export function revisarDibujo(d, w, h) {
    const mal = [];
    if (!d || !Array.isArray(d.filas) || !Array.isArray(d.paleta)) return ['falta paleta o filas'];
    if (d.filas.length !== h) mal.push(`tiene ${d.filas.length} filas, van ${h}`);
    const k = anchoPixel(d, w);
    if (!k) { mal.push(`las filas miden ${d.filas[0].length}, van ${w} (o ${w * 2} con más de ${DIGITOS.length} colores)`); return mal; }
    if (k === 2 && d.paleta.length <= DIGITOS.length) mal.push(`usa dos caracteres por píxel con solo ${d.paleta.length} colores`);
    d.filas.forEach((f, y) => {
        if (f.length !== w * k) { mal.push(`fila ${y}: mide ${f.length}, van ${w * k}`); return; }
        for (let x = 0; x < w; x++) {
            const s = f.slice(x * k, x * k + k);
            if (s === '.'.repeat(k)) continue;
            const i = k === 1 ? DIGITOS.indexOf(s) : DIGITOS.indexOf(s[0]) * DIGITOS.length + DIGITOS.indexOf(s[1]);
            if (i < 0 || i >= d.paleta.length || (k === 2 && (DIGITOS.indexOf(s[0]) < 0 || DIGITOS.indexOf(s[1]) < 0))) { mal.push(`fila ${y}, columna ${x}: «${s}» no está en la paleta`); return; }
        }
    });
    return mal;
}

// Un dibujo vale para el juego si está listo (sin estado o "hecho") y no tiene errores de forma
export const listoParaJuego = (d, w, h) => !!d && d.estado !== 'borrador' && !revisarDibujo(d, w, h).length;
