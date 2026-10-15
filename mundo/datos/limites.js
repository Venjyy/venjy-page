// =========================================================
// VENJY · Límites duros de cada canal del rig (bloque 8 · N1, mundo/COMBATE.md §15.5)
// Puro: sin Three.js ni DOM. Lo usan supervivencia/pose-jugador.js (aplicarAngulos recorta a este rango) y el motor
// de combate (supervivencia/combate/animacion.js). Ni una animación ni la CPU pueden dejar un codo al revés o una
// rodilla hacia adelante. Los de los canales de siempre son más anchos que los rangos útiles de rig.md, para no
// cambiar ninguna pose de hoy. Se editan en mundo/datos/poses.json → limites ({ canal: [mín, máx] }); lo que falte
// o esté mal usa estos.
// =========================================================
export const LIMITES_BASE = {
    cx: [-1, 1], cy: [-1.6, 1.6], cz: [-0.6, 0.6],
    bDx: [-3, 1], bIx: [-3, 1], bDz: [-0.8, 1.6], bIz: [-1.6, 0.8], bDy: [-1.2, 1.2], bIy: [-1.2, 1.2],
    pDx: [-1.8, 1.2], pIx: [-1.8, 1.2], inc: [-0.6, 1.6], ry: [-1.2, 1.2], rz: [-0.6, 0.6],
    // Nuevos (N1): codo (− adelante y arriba), rodilla (+ la canilla atrás), pecho sobre las caderas,
    // pierna abierta hacia afuera y la muñeca virtual del arma
    codoD: [-2.6, 0], codoI: [-2.6, 0], rodD: [0, 2.4], rodI: [0, 2.4],
    pX: [-0.35, 0.9], pY: [-0.9, 0.9], pZ: [-0.3, 0.3], pDz: [-0.15, 0.5], pIz: [-0.15, 0.5],
    armaX: [-1.6, 1.6], armaZ: [-1.6, 1.6]
};
export const LIMITES = {};
export function fijarLimites(datos) {
    for (const [k, base] of Object.entries(LIMITES_BASE)) {
        const l = datos && datos[k];
        LIMITES[k] = Array.isArray(l) && l.length === 2 && l.every(Number.isFinite) && l[0] <= l[1] ? [l[0], l[1]] : base;
    }
}
fijarLimites(null);

// El valor del canal k de `a` recortado a su rango (0 si falta)
export const recortar = (a, k) => { const v = a[k] || 0, l = LIMITES[k]; return v < l[0] ? l[0] : v > l[1] ? l[1] : v; };
