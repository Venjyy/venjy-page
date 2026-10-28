// =========================================================
// VENJY · Supervivencia · Código del momento de Conejeros (Etapa B4c): el dibujo .exe que se revela en tres capas y flota entre
// los dos. El golpecito en el hombro ya es dato de la escena (momento-conejeros en escenas.json).
// Marcas: capa1, capa2, capa3 (cuándo se revela cada capa).
// =========================================================
const suaveT = (u, a, b) => Math.max(0, Math.min(1, (u - a) / (b - a)));

// Dibujo píxel 12×12 (trazo negro sobre transparente), en tres capas de 4 filas que se revelan una tras otra
const DIBUJO = [
    'k.k......k.k',
    'k.k......k.k',
    'k.k......k.k',
    'kkkkkkkkkkkk',
    'k..........k',
    'k..k....k..k',
    'k..........k',
    'k.....kk...k',
    'k..........k',
    'k..........k',
    '.k........k.',
    '..kkkkkkkk..'
];
const CAPAS = [0, 4, 8].map(desde => DIBUJO.map((f, i) => (i >= desde && i < desde + 4 ? f : '............')));

export default function (m) {
    const REVELA = [m.capa1, m.capa2, m.capa3];
    let capas = [], centro = null;
    return {
        iniciar(api) {
            const N = api.posG('n'), J = api.posG('j');
            centro = N && J ? { x: (N.x + J.x) / 2, y: (N.y + J.y) / 2 + 1.9, z: (N.z + J.z) / 2 } : null;
            capas = CAPAS.map(filas => {
                const s = api.sprite(filas, { k: '#161616' }, 0.9);
                api.pegar(s, null, null, [0, 0, 0]);
                s.visible = false;
                return s;
            });
        },
        cuadro(api) {
            const t = api.e.t;
            if (!centro) return;
            const flota = 0.06 * Math.sin(t * 2.2);
            capas.forEach((s, i) => {
                const u = suaveT(t, REVELA[i], REVELA[i] + 0.3);
                s.visible = u > 0;
                s.material.opacity = u;
                s.position.set(centro.x + 0.05 * Math.sin(t * 1.3), centro.y + flota, centro.z);
            });
        }
    };
}
