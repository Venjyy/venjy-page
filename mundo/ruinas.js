// =========================================================
// VENJY · Ruinas con cofre en el bosque (7f-3, parte 4) · solo supervivencia
// 6-8 ruinas chicas (arco musgoso o pilar caído) en claros de bosque, cada una con un cofre de botín
// (tabla `ruina` de supervivencia/botin.js). Determinista: sale solo de `datos` y del terreno, así que
// los workers dan lo mismo que el hilo principal; los bloques van como decorados `t: 'bloques'`
// (dentro de la malla del chunk, costo 0 por cuadro) y no entran a `zonasLuz` (no emiten luz).
// Devuelve { decor, ruinas }; `ruinas` = [{ x, y, z, tipo, cofre: { x, y, z } }] (coordenadas del creativo).
// =========================================================
import { B } from './texturas.js';
import { azar } from './mundo-datos.js';
import { aDecor, buscarSitio } from './construcciones.js';

export const RUINAS = {
    cantidad: 7,        // meta (6-8); si el mapa no da tantos claros, salen menos
    intentos: 600,      // puntos candidatos revisados, siempre en el mismo orden
    separacion: 90,     // bloques mínimos entre dos ruinas
    densidad: 28,       // celdas de bosque mínimas en un cuadro de 13×13 celdas (claro dentro del bosque)
    lejosDeLugar: 34,   // sobre el radio de cada lugar (las facilidades de 7d-2 llegan a ~18 del centro)
    lejosDeObra: 16,    // sobre el radio de cada decorado y estructura (casas, escenario, corrales, señales de los caminos)
    lejosDeCamino: 6,   // sin tierra de camino a esta distancia del claro
    lado: 7             // claro de 7×7: la ruina ocupa 5×5 y deja un bloque de margen
};

const SEMILLA = 0x7f34;

export function colocarRuinas(terreno, datos, ESCALA, NIVEL_AGUA) {
    const { BW, BD, HT, SUP, ES } = terreno;
    const { W, H, T } = datos;
    const t = { BW, BD, HT, SUP, ES, datos, ESCALA, NIVEL_AGUA };

    // Lo que no se pisa: [x, z, radio]
    const obras = [];
    for (const l of terreno.lugares || []) obras.push([l.x, l.z, l.radio + RUINAS.lejosDeLugar]);
    for (const d of terreno.decor || []) if (d.cx !== undefined) obras.push([d.cx, d.cz, (d.r || 0) + RUINAS.lejosDeObra]);
    for (const c of terreno.casas || []) obras.push([(c.minx + c.maxx) / 2, (c.minz + c.maxz) / 2, Math.max(c.maxx - c.minx, c.maxz - c.minz) / 2 + RUINAS.lejosDeObra]);
    for (const e of [terreno.registro, terreno.correo, terreno.sobreMi]) if (e) obras.push([(e.ix0 + e.ix1) / 2, (e.iz0 + e.iz1) / 2, Math.max(e.ix1 - e.ix0, e.iz1 - e.iz0) / 2 + RUINAS.lejosDeLugar]);
    const g = terreno.gatera;
    if (g) obras.push([(g.minx + g.maxx) / 2, (g.minz + g.maxz) / 2, Math.max(g.maxx - g.minx, g.maxz - g.minz) / 2 + RUINAS.lejosDeLugar]);
    if (terreno.faro) obras.push([terreno.faro.x, terreno.faro.z, RUINAS.lejosDeLugar]);

    const hayBosque = (x, z) => {
        const ccx = Math.floor(x / ESCALA), ccz = Math.floor(z / ESCALA);
        let n = 0;
        for (let dz = -6; dz <= 6; dz++) for (let dx = -6; dx <= 6; dx++) {
            const cx = ccx + dx, cz = ccz + dz;
            if (cx >= 0 && cz >= 0 && cx < W && cz < H && T[cz * W + cx] === 'hojas') n++;
        }
        return n >= RUINAS.densidad;
    };
    const sinCamino = (x0, z0, w) => {
        const m = RUINAS.lejosDeCamino;
        for (let z = Math.max(0, z0 - m); z < Math.min(BD, z0 + w + m); z++)
            for (let x = Math.max(0, x0 - m); x < Math.min(BW, x0 + w + m); x++) if (SUP[z * BW + x] === B.CAMINO) return false;
        return true;
    };

    const rnd = azar(SEMILLA);
    const decor = [], ruinas = [];
    const w = RUINAS.lado;
    for (let i = 0; i < RUINAS.intentos && ruinas.length < RUINAS.cantidad; i++) {
        const px = Math.round(8 + rnd() * (BW - 16)), pz = Math.round(8 + rnd() * (BD - 16));
        const tipo = ruinas.length % 2; // se alternan: 0 arco, 1 pilar caído
        if (!hayBosque(px, pz)) continue;
        const s = buscarSitio(t, {
            cx: px, cz: pz, rmin: 0, rmax: 8, w, d: w, desnivel: 1, materiales: [B.PASTO], hMin: NIVEL_AGUA + 2,
            filtro: q => {
                const cx = q.x0 + (w >> 1), cz = q.z0 + (w >> 1);
                if (!hayBosque(cx, cz)) return false; // el claro sigue dentro del bosque, no solo el punto de partida
                if (ruinas.some(r => Math.hypot(r.x - cx, r.z - cz) < RUINAS.separacion)) return false;
                if (obras.some(([ox, oz, or]) => Math.hypot(ox - cx, oz - cz) < or)) return false;
                return sinCamino(q.x0, q.z0, w);
            }
        });
        if (!s) continue;
        const cx = s.x0 + (w >> 1), cz = s.z0 + (w >> 1);
        let h = 0;
        for (let z = cz - 2; z <= cz + 2; z++) for (let x = cx - 2; x <= cx + 2; x++) h = Math.max(h, HT[z * BW + x]);
        const usado = new Set();
        const d = aDecor(poner => {
            const pon = (x, y, z, id) => { const k = x + ',' + y + ',' + z; if (!usado.has(k)) { usado.add(k); poner(x, y, z, id); } };
            // Cimientos: la columna sube hasta h si el suelo queda más bajo (desnivel ≤ 1)
            const apoyo = (x, z) => { for (let y = HT[z * BW + x] + 1; y <= h; y++) pon(x, y, z, B.TIERRA); };
            const piedra = (x, y, z, k) => pon(x, y, z, [B.ADOQUIN, B.PIEDRA, B.ADOQUIN, B.LABRADA][k & 3]);
            if (tipo === 0) {
                // Arco musgoso: dos pilares (el derecho roto), dintel a medias, hojas encima y cofre debajo
                for (let y = 1; y <= 4; y++) piedra(cx - 2, h + y, cz, y + i);
                for (let y = 1; y <= 3; y++) piedra(cx + 2, h + y, cz, y + 1 + i);
                for (let x = cx - 1; x <= cx; x++) pon(x, h + 4, cz, B.LABRADA);
                pon(cx - 2, h + 5, cz, B.HOJAS); pon(cx - 1, h + 5, cz, B.HOJAS); pon(cx + 2, h + 4, cz, B.HOJAS);
                pon(cx + 1, h + 1, cz - 1, B.ADOQUIN); pon(cx - 1, h + 1, cz + 1, B.HOJAS);
                apoyo(cx - 2, cz); apoyo(cx + 2, cz); apoyo(cx, cz); apoyo(cx + 1, cz - 1); apoyo(cx - 1, cz + 1);
                pon(cx, h + 1, cz, B.COFRE);
            } else {
                // Pilar caído: tocón de columna, columna tumbada de 4 y cofre pegado al tocón
                for (let y = 1; y <= 3; y++) piedra(cx - 2, h + y, cz - 1, y + i);
                for (let x = cx - 1; x <= cx + 2; x++) { piedra(x, h + 1, cz + 1, x + i); apoyo(x, cz + 1); }
                pon(cx + 2, h + 2, cz + 1, B.HOJAS); pon(cx - 2, h + 4, cz - 1, B.HOJAS);
                pon(cx + 1, h + 1, cz - 2, B.ADOQUIN); pon(cx - 2, h + 1, cz + 2, B.HOJAS);
                apoyo(cx - 2, cz - 1); apoyo(cx - 1, cz - 1); apoyo(cx + 1, cz - 2); apoyo(cx - 2, cz + 2);
                pon(cx - 1, h + 1, cz - 1, B.COFRE);
            }
        });
        d.ruina = tipo === 0 ? 'arco' : 'pilar';
        decor.push(d);
        const cofre = tipo === 0 ? { x: cx, y: h + 1, z: cz } : { x: cx - 1, y: h + 1, z: cz - 1 };
        ruinas.push({ x: cx + 0.5, y: h, z: cz + 0.5, tipo: d.ruina, cofre });
    }
    return { decor, ruinas };
}
