// =========================================================
// VENJY · Fauna de ambiente (7f-3, parte 5) · solo supervivencia
// Mariposas y abejas junto a las flores, peces que saltan en los lagos y luciérnagas de noche en el borde del
// bosque. Aquí solo está la parte pura (sin Three.js): DÓNDE hay fauna (`colocarFauna`, anclas) y CÓMO se mueve
// cada bicho (`criaturaEn`, una función del tiempo, sin estado). Lo dibuja supervivencia/fauna.js, instanciado
// y solo cerca del jugador; se carga con import() al entrar a la supervivencia.
// Determinista: sale solo del terreno (el mismo mapa da las mismas anclas en cualquier hilo o worker) y no toca
// ningún chunk. Cada ancla se despeja de estructuras, caminos, tablones, señales, lugares, ruinas y páginas en
// un radio mayor que lo que se alejan sus bichos (`FAUNA.vuelo`), así que nada vuela sobre una obra.
// Anclas: [{ tipo: 'flores'|'lago'|'bosque', x, z, y }] con `y` = bloque de suelo (o NIVEL_AGUA + 1 en el lago),
// en coordenadas del creativo (el hilo principal suma `dy`).
// =========================================================
import { B } from './texturas.js';
import { plantaEn } from './voxeles.js';
import { crearLibre } from './caminos.js';

// Tope de bichos vivos a la vez = suma de TOPES (64). Cada ancla activa trae `porAncla` de su especie.
export const TOPES = { mariposa: 24, abeja: 12, pez: 8, luciernaga: 20 };
export const TOPE_TOTAL = TOPES.mariposa + TOPES.abeja + TOPES.pez + TOPES.luciernaga;
export const FAUNA = {
    porAncla: { mariposa: 4, abeja: 2, pez: 2, luciernaga: 4 },
    // Anclas distintas por tipo (más que las activas a la vez: solo se muestran las cercanas)
    anclas: { flores: 500, lago: 60, bosque: 300 },
    separacion: { flores: 14, lago: 20, bosque: 16 },
    vuelo: { mariposa: 3, abeja: 1.8, pez: 1.5, luciernaga: 3.6 }, // radio máximo desde el ancla (horizontal)
    despeje: 6,         // radio sin estructuras ni caminos alrededor de cada ancla (mayor que todo `vuelo`)
    lejosDeLugar: 6,    // sobre el radio de cada lugar y de cada obra
    minFlores: 2,       // flores (no pasto alto) en 7×7 columnas para que una zona cuente como «con flores»
    activa: 56,         // distancia a la que se muestran las anclas
    inactiva: 64        // y a la que se quitan (histéresis, para que no parpadeen en el borde)
};

const SEMILLA = 0x7f35;
const hash = (a, b, s) => {
    let h = Math.imul(a + 1, 374761393) ^ Math.imul(b + 1, 668265263) ^ Math.imul(s + 1, 2147483647);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return (h ^ (h >>> 16)) >>> 0;
};
// Número en [0, 1) fijo para (a, b, s)
const u = (a, b, s) => hash(a, b, s) / 4294967296;
const esFlor = id => id === B.FLOR_ROJA || id === B.FLOR_AMARILLA || id === B.FLOR_AZUL;

export function colocarFauna(terreno, datos, ESCALA, NIVEL_AGUA) {
    const { BW, BD, HT, SUP, ES } = terreno;
    const { W, H, T } = datos;
    const libre = crearLibre({ BW, BD, HT, ES, SUP, datos, ESCALA, NIVEL_AGUA });

    // Lo que no se pisa: [x, z, radio]
    const obras = [];
    for (const l of terreno.lugares || []) obras.push([l.x, l.z, l.radio + FAUNA.lejosDeLugar]);
    for (const d of terreno.decor || []) if (d.cx !== undefined) obras.push([d.cx, d.cz, (d.r || 0) + FAUNA.lejosDeLugar]);
    for (const c of terreno.casas || []) obras.push([(c.minx + c.maxx) / 2, (c.minz + c.maxz) / 2, Math.max(c.maxx - c.minx, c.maxz - c.minz) / 2 + FAUNA.lejosDeLugar]);
    for (const e of [terreno.registro, terreno.correo, terreno.sobreMi]) if (e) obras.push([(e.ix0 + e.ix1) / 2, (e.iz0 + e.iz1) / 2, Math.max(e.ix1 - e.ix0, e.iz1 - e.iz0) / 2 + FAUNA.lejosDeLugar]);
    const g = terreno.gatera;
    if (g) obras.push([(g.minx + g.maxx) / 2, (g.minz + g.maxz) / 2, Math.max(g.maxx - g.minx, g.maxz - g.minz) / 2 + FAUNA.lejosDeLugar]);
    if (terreno.faro) obras.push([terreno.faro.x, terreno.faro.z, FAUNA.lejosDeLugar + 4]);
    for (const c of terreno.caminos || []) obras.push([c.x, c.z, FAUNA.despeje]);
    for (const r of terreno.ruinas || []) obras.push([r.x, r.z, FAUNA.despeje + 3]);
    for (const p of terreno.paginas || []) obras.push([p.x, p.z, FAUNA.despeje - 2]);

    // Sin estructura (ES), camino ni tablones en un cuadrado de radio `r` alrededor de (x, z)
    const despejado = (x, z, r) => {
        if (x - r < 3 || z - r < 3 || x + r >= BW - 3 || z + r >= BD - 3) return false;
        for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
            const o = (z + dz) * BW + x + dx;
            if (ES[o] || SUP[o] === B.CAMINO || SUP[o] === B.TABLONES) return false;
        }
        return !obras.some(([ox, oz, or]) => Math.hypot(ox - x, oz - z) < or);
    };
    const celdaHojas = (x, z) => {
        const cx = Math.floor(x / ESCALA), cz = Math.floor(z / ESCALA);
        return cx >= 0 && cz >= 0 && cx < W && cz < H && T[cz * W + cx] === 'hojas';
    };
    const hojasCerca = (x, z) => {
        for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) if (celdaHojas(x + dx * ESCALA, z + dz * ESCALA)) return true;
        return false;
    };
    const aguaCerca = (x, z, r) => {
        for (let dz = -r; dz <= r; dz += 2) for (let dx = -r; dx <= r; dx += 2) {
            const xx = x + dx, zz = z + dz;
            if (xx >= 0 && zz >= 0 && xx < BW && zz < BD && HT[zz * BW + xx] <= NIVEL_AGUA) return true;
        }
        return false;
    };

    // Candidatos por tipo: { x, z, y, p } con p = puntaje (mayor, mejor); se barre la malla de a 4 bloques
    const cand = { flores: [], lago: [], bosque: [] };
    for (let z = 8; z < BD - 8; z += 4) {
        for (let x = 8; x < BW - 8; x += 4) {
            const o = z * BW + x, h = HT[o];
            if (ES[o]) continue;
            if (h <= NIVEL_AGUA - 2) {
                // Lago: agua de al menos 2 bloques de hondo y todo el cuadro de 7×7 también bajo el agua, sin puentes
                let ok = true;
                for (let dz = -3; dz <= 3 && ok; dz++) for (let dx = -3; dx <= 3; dx++) {
                    const q = (z + dz) * BW + x + dx;
                    if (HT[q] > NIVEL_AGUA - 1 || ES[q]) { ok = false; break; }
                }
                if (ok) cand.lago.push({ x, z, y: NIVEL_AGUA + 1, p: hash(x, z, SEMILLA) });
                continue;
            }
            if (SUP[o] !== B.PASTO || h < NIVEL_AGUA + 1 || !libre(x, z)) continue;
            // Flores: cuántas flores hay en 7×7 columnas alrededor (el pasto alto no cuenta)
            let flores = 0;
            for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) {
                const q = (z + dz) * BW + x + dx;
                if (!ES[q] && SUP[q] === B.PASTO && HT[q] > NIVEL_AGUA && esFlor(plantaEn(x + dx, z + dz))) flores++;
            }
            if (flores >= FAUNA.minFlores) cand.flores.push({ x, z, y: h, p: flores * 4096 + (hash(x, z, SEMILLA + 1) & 4095) });
            // Luciérnagas: pasto al borde del bosque (la celda no es bosque pero hay hojas a 2 celdas), mejor con agua cerca
            if (!celdaHojas(x, z) && hojasCerca(x, z)) {
                cand.bosque.push({ x, z, y: h, p: (aguaCerca(x, z, 10) ? 8192 : 0) + (hash(x, z, SEMILLA + 2) & 4095) });
            }
        }
    }

    // Los mejores primero, con separación y despeje mínima entre anclas del mismo tipo; empate por posición (orden fijo)
    const anclas = [];
    for (const tipo of ['flores', 'lago', 'bosque']) {
        const lista = cand[tipo].sort((a, b) => b.p - a.p || a.z - b.z || a.x - b.x);
        const elegidas = [];
        for (const c of lista) {
            if (elegidas.length >= FAUNA.anclas[tipo]) break;
            if (elegidas.some(e => Math.hypot(e.x - c.x, e.z - c.z) < FAUNA.separacion[tipo])) continue;
            if (!despejado(c.x, c.z, FAUNA.despeje)) continue; // lo caro se mira solo en los que van ganando
            elegidas.push(c);
        }
        for (const c of elegidas) anclas.push({ tipo, x: c.x, z: c.z, y: c.y });
    }
    return anclas.map((a, i) => ({ i, ...a }));
}

// ---------------------------------------------------------
// Movimiento: posición de un bicho en el tiempo `t` (s), solo de (ancla, k, t). Devuelve
// { x, y, z, vis, ang, br }: `y` en coordenadas del creativo, `vis` si se dibuja, `ang` rumbo (rad),
// `br` brillo 0-1 (parpadeo de luciérnagas). `k` = número del bicho dentro de su ancla.
// Nunca se aleja del centro de la columna del ancla (a.x + 0,5, a.z + 0,5) más que FAUNA.vuelo[especie].
// ---------------------------------------------------------
export const ESPECIES_DE = { flores: ['mariposa', 'abeja'], lago: ['pez'], bosque: ['luciernaga'] };

export function criaturaEn(especie, a, k, t) {
    const s = a.i * 7 + k * 13 + 1;
    const f1 = u(s, 1, SEMILLA), f2 = u(s, 2, SEMILLA), f3 = u(s, 3, SEMILLA), f4 = u(s, 4, SEMILLA);
    const R = FAUNA.vuelo[especie], Re = R * Math.SQRT1_2; // por eje: dos senos de radio R/√2 no pasan de R juntos
    const seno = Math.sin;
    if (especie === 'mariposa') {
        const r = Re * (0.5 + 0.5 * f1), w1 = 0.35 + 0.3 * f2, w2 = 0.3 + 0.3 * f3;
        const x = a.x + 0.5 + r * seno(w1 * t + f4 * 6.28), z = a.z + 0.5 + r * seno(w2 * t + f2 * 6.28);
        const dx = r * w1 * Math.cos(w1 * t + f4 * 6.28), dz = r * w2 * Math.cos(w2 * t + f2 * 6.28);
        return { x, y: a.y + 1.2 + 0.5 * seno(0.8 * t + f3 * 6.28) + 0.3 * f1, z, vis: true, ang: Math.atan2(dz, dx), br: 1 };
    }
    if (especie === 'abeja') {
        // Bucle corto y rápido alrededor de una flor, con vaivén
        const r = Re * (0.4 + 0.6 * f1), w = 1.6 + 0.8 * f2, ph = f3 * 6.28;
        const x = a.x + 0.5 + r * seno(w * t + ph), z = a.z + 0.5 + r * seno(w * 1.3 * t + ph * 2);
        return { x, y: a.y + 1.1 + 0.25 * seno(3 * t + ph), z, vis: true, ang: Math.atan2(r * w * 1.3 * Math.cos(w * 1.3 * t + ph * 2), r * w * Math.cos(w * t + ph)), br: 1 };
    }
    if (especie === 'pez') {
        // Un salto de 0,9 s cada 3,5-7 s; fuera del salto no se ve (está bajo el agua)
        const P = 3.5 + 3.5 * f1, D = 0.9, ph = f2 * P;
        const tt = (t + ph) % P;
        const dir = f3 * 6.28, off = (f4 - 0.5) * 1.0;
        if (tt >= D) return { x: a.x + 0.5, y: a.y, z: a.z + 0.5, vis: false, ang: dir, br: 1 };
        const q = tt / D, ciclo = Math.floor((t + ph) / P);
        const rumbo = dir + ciclo * 1.7; // cada salto sale hacia otro lado
        const avance = (q - 0.5) * 2.0 * 0.7; // -0,7 a 0,7 bloques desde el punto de salto
        const x = a.x + 0.5 + off * Math.cos(rumbo + 1.57) + avance * Math.cos(rumbo);
        const z = a.z + 0.5 + off * Math.sin(rumbo + 1.57) + avance * Math.sin(rumbo);
        const alto = 1.3 * 4 * q * (1 - q);
        const ang = Math.atan2(5.2 * (1 - 2 * q), 1.4); // cabeceo: sube de nariz y cae de nariz
        return { x, y: a.y + alto, z, vis: true, ang, br: 1, salto: q, rumbo };
    }
    // Luciérnaga: vaga despacio, a media altura, y parpadea
    const r = Re * (0.4 + 0.6 * f1), w1 = 0.18 + 0.2 * f2, w2 = 0.16 + 0.2 * f3;
    const x = a.x + 0.5 + r * seno(w1 * t + f4 * 6.28), z = a.z + 0.5 + r * seno(w2 * t + f1 * 6.28);
    const br = Math.max(0, seno(1.3 * t + f2 * 6.28));
    return { x, y: a.y + 1.0 + 0.9 * (0.5 + 0.5 * seno(0.4 * t + f4 * 6.28)) + 0.4 * f3, z, vis: true, ang: 0, br: br * br };
}
