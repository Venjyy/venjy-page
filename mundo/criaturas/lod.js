// =========================================================
// VENJY · Nivel de detalle de personajes lejanos (7b-2)
// Sin imports. `LOD.salto` lo fija el menú «Rendimiento» de la supervivencia (1 = todos los cuadros; en el
// creativo no se toca y todo queda como antes). `LOD.animales` es lo mismo para `animales.js` (4 por defecto). `pasoLejano` devuelve el dt acumulado con el que debe
// actualizarse el personaje este cuadro, o 0 si le toca saltarse.
// =========================================================
export const LOD = { salto: 1, animales: 4, radio: 60 };

let fase = 0;
// n guarda `lodAcum`, `lodN` y `lodFase` (se crean solos). Sin salto, cerca o con escena, interacción o vida de amigos: siempre dt.
export function pasoLejano(n, dJ, dt, salto = LOD.salto, radio = LOD.radio) {
    if (salto <= 1 || dJ <= radio || n.escena || n.inter || n.vida) {
        if (n.lodAcum) { dt += n.lodAcum; n.lodAcum = 0; }
        return dt;
    }
    if (n.lodFase === undefined) { n.lodFase = fase++ % salto; n.lodN = 0; n.lodAcum = 0; }
    n.lodAcum += dt;
    if ((++n.lodN + n.lodFase) % salto !== 0) return 0;
    const d = Math.min(n.lodAcum, 0.2);
    n.lodAcum = 0;
    return d;
}
