// =========================================================
// VENJY · Estudio · vista simple de la pestaña Objetos (B0-V, puro: lo usan objetos.js y las pruebas)
// En vez de 7 números por vista: «Tamaño» con palabras (sobre el tamaño del tipo, o del código si es un tipo),
// botones para mover un poco (subir, bajar, a un lado, adelante) y girar de a 15°, e «Igual que el tipo» para
// volver al agarre común. Un agarre es { pos: [x, y, z] en bloques, rot: [x, y, z] en grados, escala }.
// En la mano de primera persona x = a la derecha, y = arriba, z = hacia ti; en el cuerpo de tercera las
// direcciones siguen al brazo (el dueño mira el resultado en vivo).
// =========================================================
const redondo = (v, d = 3) => Math.round(v * 10 ** d) / 10 ** d;
const clonar = v => ({ pos: v.pos.slice(), rot: v.rot.slice(), escala: v.escala });

export const PASO_MOVER = 0.02; // bloques por clic
export const PASO_GIRO = 15; // grados por clic

// [clave, es, en, eje (0 x, 1 y, 2 z), signo]
export const MOVER = [
    ['arriba', 'Subir', 'Up', 1, 1], ['abajo', 'Bajar', 'Down', 1, -1],
    ['izquierda', 'A la izquierda', 'Left', 0, -1], ['derecha', 'A la derecha', 'Right', 0, 1],
    ['adelante', 'Más lejos', 'Farther', 2, -1], ['atras', 'Más cerca', 'Closer', 2, 1]
];
// [clave, es, en, eje, signo]
export const GIRAR = [
    ['inclinar', 'Inclinar', 'Tilt', 0, 1], ['inclinarAtras', 'Inclinar al revés', 'Tilt back', 0, -1],
    ['girar', 'Girar', 'Turn', 1, 1], ['girarAtras', 'Girar al revés', 'Turn back', 1, -1],
    ['ladear', 'Ladear', 'Roll', 2, 1], ['ladearAtras', 'Ladear al revés', 'Roll back', 2, -1]
];
// Tamaño sobre la base (el del tipo o el del código)
export const TAMANOS = [[0.6, 'mucho más chico', 'much smaller'], [0.8, 'más chico', 'smaller'], [1, 'igual que el tipo', 'same as the type'],
    [1.25, 'más grande', 'bigger'], [1.5, 'mucho más grande', 'much bigger']];

export function mover(v, eje, signo, paso = PASO_MOVER) {
    const n = clonar(v);
    n.pos[eje] = redondo(n.pos[eje] + signo * paso);
    return n;
}
// Gira y deja el ángulo entre -180 y 180
export function girar(v, eje, signo, paso = PASO_GIRO) {
    const n = clonar(v);
    let g = n.rot[eje] + signo * paso;
    while (g > 180) g -= 360;
    while (g <= -180) g += 360;
    n.rot[eje] = redondo(g, 1);
    return n;
}
// Qué tamaño de TAMANOS es (null = a mano)
export function tamanoDe(v, base) {
    const op = TAMANOS.find(([f]) => redondo(base.escala * f) === redondo(v.escala));
    return op ? op[0] : null;
}
export function conTamano(v, base, f) {
    const n = clonar(v);
    n.escala = Math.min(3, Math.max(0.1, redondo(base.escala * f)));
    return n;
}

// Arrastre (panel «Arrastra aquí» de objetos.js): el objeto se ve moverse en vivo en el juego. dx, dy en px de pantalla
// (dy positivo = hacia abajo) y rueda en «muescas» (positivo = hacia ti). Mover: derecha, arriba y lejos/cerca;
// girar: arrastrar de lado gira, de arriba abajo inclina y la rueda ladea.
export const PX_MOVER = 0.002; // bloques por px
export const PX_GIRO = 0.5; // grados por px
export const RUEDA_MOVER = 0.02; // bloques por muesca
export const RUEDA_GIRO = 5; // grados por muesca
export function arrastrar(v, modo, dx, dy, rueda = 0) {
    let n = clonar(v);
    if (modo === 'girar') {
        if (dx) n = girar(n, 1, 1, dx * PX_GIRO);
        if (dy) n = girar(n, 0, 1, dy * PX_GIRO);
        if (rueda) n = girar(n, 2, 1, rueda * RUEDA_GIRO);
    } else {
        if (dx) n = mover(n, 0, 1, dx * PX_MOVER);
        if (dy) n = mover(n, 1, -1, dy * PX_MOVER);
        if (rueda) n = mover(n, 2, 1, rueda * RUEDA_MOVER);
    }
    return n;
}
