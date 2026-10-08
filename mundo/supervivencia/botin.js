// =========================================================
// VENJY · Supervivencia · Botín de los cofres del mapa
// Cada lugar tiene su tabla: [id, mínimo, máximo, probabilidad]. Se sortea con un azar
// determinista por posición, así el mismo cofre trae lo mismo en cualquier partida nueva.
// =========================================================
import { B } from '../texturas.js';
import { O } from './objetos.js';

const TABLAS = {
    mina: [[O.CARBON, 3, 9, 1], [O.LINGOTE_HIERRO, 1, 4, 0.8], [O.PAN, 1, 3, 0.7], [B.ANTORCHA, 4, 10, 0.9], [O.PICO_HIERRO, 1, 1, 0.25], [O.DIAMANTE, 1, 2, 0.15], [O.REDSTONE, 2, 6, 0.4], [B.RIEL, 2, 8, 0.4]],
    naufragio: [[O.BACALAO, 2, 5, 0.9], [O.LINGOTE_ORO, 1, 3, 0.6], [O.ESMERALDA, 1, 2, 0.4], [O.CUERO, 1, 3, 0.5], [O.BRUJULA, 1, 1, 0.2], [O.ZANAHORIA, 1, 4, 0.5]],
    portal: [[O.LINGOTE_ORO, 2, 6, 1], [B.OBSIDIANA, 1, 3, 0.7], [O.PEDERNAL, 1, 4, 0.6], [O.MANZANA, 1, 2, 0.5], [O.ESPADA_ORO, 1, 1, 0.3], [O.PICO_ORO, 1, 1, 0.2]],
    iglu: [[O.MANZANA, 1, 3, 0.9], [O.CARBON, 1, 4, 0.7], [O.PAPA, 1, 4, 0.6], [O.LINGOTE_ORO, 1, 1, 0.3], [O.ESTOFADO, 1, 1, 0.4]],
    molino: [[O.TRIGO, 3, 9, 1], [O.PAN, 1, 3, 0.8], [O.SEMILLAS, 2, 8, 0.8], [B.HENO, 1, 2, 0.4], [O.AZADA_PIEDRA, 1, 1, 0.3]],
    atalaya: [[O.FLECHA, 4, 12, 0.9], [O.ARCO, 1, 1, 0.3], [O.PAN, 1, 2, 0.7], [O.HILO, 1, 4, 0.5], [B.TRONCO_PINO, 2, 6, 0.6]],
    campamento: [[O.FILETE, 1, 3, 0.8], [O.PALO, 2, 6, 0.7], [B.ANTORCHA, 2, 6, 0.7], [O.CARBON, 1, 4, 0.6]],
    pescador: [[O.BACALAO, 2, 6, 1], [O.SALMON, 1, 3, 0.7], [O.CANA, 1, 1, 0.5], [O.HILO, 1, 3, 0.5]],
    casa: [[O.PAN, 1, 3, 0.8], [O.MANZANA, 1, 3, 0.7], [O.SEMILLAS, 1, 6, 0.6], [O.PALO, 2, 6, 0.6], [O.LINGOTE_HIERRO, 1, 2, 0.3], [O.TRIGO, 1, 4, 0.5], [O.ZANAHORIA, 1, 3, 0.4], [O.PAPA, 1, 3, 0.4]]
};

export function botinDe(lugar, azar) {
    const tabla = TABLAS[lugar] || TABLAS.casa;
    const lista = [];
    for (const [id, min, max, p] of tabla) {
        if (!id || azar() >= p) continue;
        lista.push([id, min + Math.floor(azar() * (max - min + 1))]);
    }
    if (!lista.length) lista.push([O.PAN, 1]);
    return lista;
}
