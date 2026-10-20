// =========================================================
// VENJY · Curvas con nombre de las animaciones de combate (bloque 8 · N3, mundo/COMBATE.md §15.3)
// Puro. Cada curva es una lista de puntos de control [x, y] con x de 0 a 1 en orden creciente (y empieza en 0 y
// termina en 1, pero en el medio puede pasarse o bajar: sobrepaso del látigo, rebotes de asentar). Entre puntos se
// interpola con Hermite cúbico (tangentes de Catmull-Rom con el x de verdad): pasa por todos los puntos y no hace
// esquinas. Los valores base están aquí; combate.json → curvas los reemplaza por nombre (y suma curvas nuevas).
//   curva(nombre, f)     valor de la curva en f (0..1); un nombre que no existe se lee como «suave»
//   fijarCurvas(datos)   combate.json → curvas (o null: vuelven las de aquí)
// =========================================================
export const CURVAS_BASE = {
    // Recta: casi nunca (osciladores)
    lineal: [[0, 0], [1, 1]],
    // Ease-in-out (smoothstep muestreado): pasar a la guardia, mirar
    suave: [[0, 0], [0.2, 0.104], [0.5, 0.5], [0.8, 0.896], [1, 1]],
    // Ease-in (acelera): el último tramo de la anticipación, cuando el cuerpo «suelta» el golpe
    entrada: [[0, 0], [0.25, 0.0625], [0.5, 0.25], [0.75, 0.5625], [1, 1]],
    // Ease-out (frena): el golpe y los pasos
    salida: [[0, 0], [0.25, 0.4375], [0.5, 0.75], [0.75, 0.9375], [1, 1]],
    // Ease-out con sobrepaso del 8 % que vuelve en el último 20 %: golpes rápidos
    latigo: [[0, 0], [0.3, 0.62], [0.55, 0.97], [0.8, 1.08], [1, 1]],
    // Resorte amortiguado (2 rebotes que se apagan): la recuperación se asienta en la guardia
    asentar: [[0, 0], [0.18, 0.75], [0.35, 1.1], [0.55, 0.96], [0.75, 1.02], [1, 1]],
    // Baja un 6 % antes de subir (anticipación dentro de la anticipación): inicio de los golpes fuertes
    retroceso: [[0, 0], [0.2, -0.06], [0.45, 0.2], [0.75, 0.75], [1, 1]]
};

const tablas = new Map();

// Puntos -> { x, y, m } (pendientes en cada punto) para evaluar rápido
function preparar(puntos) {
    const n = puntos.length, x = puntos.map(p => p[0]), y = puntos.map(p => p[1]), m = new Array(n);
    for (let i = 0; i < n; i++) {
        const a = Math.max(0, i - 1), b = Math.min(n - 1, i + 1);
        m[i] = x[b] > x[a] ? (y[b] - y[a]) / (x[b] - x[a]) : 0;
    }
    return { x, y, m };
}

// ¿Sirven estos puntos? (al menos 2, x de 0 a 1 en orden estrictamente creciente, números)
export function curvaValida(p) {
    if (!Array.isArray(p) || p.length < 2) return false;
    for (let i = 0; i < p.length; i++) {
        if (!Array.isArray(p[i]) || p[i].length !== 2 || !p[i].every(Number.isFinite)) return false;
        if (i > 0 && !(p[i][0] > p[i - 1][0])) return false;
    }
    return p[0][0] === 0 && p[p.length - 1][0] === 1;
}

export function fijarCurvas(datos) {
    tablas.clear();
    for (const [k, p] of Object.entries(CURVAS_BASE)) tablas.set(k, preparar(p));
    for (const [k, p] of Object.entries(datos || {})) if (curvaValida(p)) tablas.set(k, preparar(p));
}
fijarCurvas(null);

export const nombresCurvas = () => [...tablas.keys()];

export function curva(nombre, f) {
    const c = tablas.get(nombre) || tablas.get('suave');
    if (f <= 0) return c.y[0];
    if (f >= 1) return c.y[c.y.length - 1];
    const { x, y, m } = c;
    let i = 1;
    while (x[i] < f) i++;
    const h = x[i] - x[i - 1], s = (f - x[i - 1]) / h, s2 = s * s, s3 = s2 * s;
    return (2 * s3 - 3 * s2 + 1) * y[i - 1] + (s3 - 2 * s2 + s) * h * m[i - 1] + (-2 * s3 + 3 * s2) * y[i] + (s3 - s2) * h * m[i];
}
