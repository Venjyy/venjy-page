// =========================================================
// VENJY · Navegación: buscar camino sobre el terreno de bloques y seguirlo (6d etapa 2)
// Puro: sin three.js ni DOM. Sirve para cualquier criatura de pie de 1×2 bloques (amigos que se visitan,
// acompañantes de 7i, y mañana lo que haga falta en el juego comercial).
//
// Tres piezas, de abajo hacia arriba:
//   1. Consulta: cómo se ve el mundo. `celda(x, y, z)` → LIBRE, SOLIDO, AGUA, LAVA o SIN_CARGAR, y
//      `columna(x, z)` → { y, agua } del mapa de alturas para lo que no está cargado (o null fuera del mapa).
//      `consultaMundo` arma una con `mundo.bloque` + `terreno.HT`; las pruebas arman la suya.
//   2. Búsqueda (A*): `crearBusqueda` avanza por tramos con un tope de nodos (no traba el cuadro); da el
//      camino como puntos { x, y, z } (centro de cada bloque, pies en y) ya suavizado, o el mejor parcial.
//   3. Caminante: `crearCaminante` sigue el camino. Cerca (detalle) mira los bloques columna a columna y, si
//      algo cambió (un árbol que no estaba en el mapa de alturas, un bloque que puso el jugador), vuelve a
//      buscar desde donde está; lejos avanza a saltos sin mirar nada (rendimiento, PENDIENTES 6d).
// `crearNavegador` reparte el tope de nodos por cuadro entre todas las búsquedas pendientes (una cola).
//
// Coordenadas: las del que llama (los amigos viven en las del creativo; `consultaMundo` recibe `dy`).
// Valores ajustables: NAV_BASE + mundo/datos/navegacion.json (pestaña Vida del Estudio).
// =========================================================

export const LIBRE = 0, SOLIDO = 1, AGUA = 2, LAVA = 3, SIN_CARGAR = -1;

// Valores del código; navegacion.json los ajusta (fijarNavegacion). Unidades: bloques y segundos.
export const NAV_BASE = {
    velocidad: 3.3,       // caminando, bloques por segundo (el jugador camina a 4,3 y corre a 5,6)
    subida: 1,            // cuánto sube de un paso (bloques enteros; 1 = como en Minecraft)
    caida: 3,             // cuánto se deja caer de un paso
    alto: 2,              // bloques libres que necesita sobre los pies
    costoSubida: 0.6,     // costo extra de subir un bloque (prefiere rodear cerros chicos)
    costoBajada: 0.15,    // costo extra por bloque de bajada
    costoAgua: 6,         // costo extra de pisar agua bajita (0 = nunca pisa agua)
    codicia: 1.3,         // >1 busca más rápido y el camino sale un poco más largo (1 = el más corto)
    nodosPorCuadro: 800,  // tope de nodos de búsqueda por cuadro entre todos (~1,5 ms en un PC medio)
    nodosMax: 200000,     // tope por búsqueda; al llegar entrega el mejor tramo parcial
    llegada: 1.2,         // a esta distancia (horizontal) del destino ya llegó
    aceptable: 4,         // un camino parcial que termina a menos de esto del destino también cuenta como llegada
    radioPisable: 12,     // si el destino no se puede pisar (dentro de una torre), busca el punto pisable más cercano hasta aquí
    atasco: 2.5,          // segundos sin acercarse antes de volver a buscar desde donde está
    reintentos: 3,        // búsquedas de nuevo antes de rendirse (sin camino)
    avanceReintentos: 8,  // si avanzó esto (bloques) hacia el destino desde la última búsqueda, los reintentos vuelven a 0
    saltoLejos: 1,        // lejos del jugador, segundos entre saltos de posición
    rapidezLejos: 4,      // lejos del jugador (nadie lo ve) camina esto más rápido: las visitas entre lugares lejanos caben en el día
    radioDetalle: 160,    // a menos de esto (del jugador) camina mirando los bloques; más lejos avanza a saltos
    giro: 8,              // qué tan rápido gira hacia donde camina (por segundo)
    suavizado: 64         // cuántos puntos hacia adelante intenta unir en línea recta al suavizar
};

let ajustes = { ...NAV_BASE };
// Mezcla navegacion.json (`caminar`) sobre los valores del código. Ignora lo que no sea número finito.
export function fijarNavegacion(datos) {
    ajustes = { ...NAV_BASE };
    const c = datos && datos.caminar;
    if (c) for (const k of Object.keys(NAV_BASE)) if (Number.isFinite(c[k])) ajustes[k] = c[k];
    return ajustes;
}
export const ajustesNavegacion = () => ajustes;

// ---------------------------------------------------------
// 1. Consulta sobre el mundo de bloques del juego
// ---------------------------------------------------------
// tipos: TIPO de texturas.js (0 aire, 1 sólido, 2 hoja, 3 agua, 4 planta, 5 lava, 6 puerta cerrada,
// 7 panel que se atraviesa, 8 bloque con forma). `dy`: cuánto está subido el mundo real respecto a quien llama.
// `terreno` (HT, ES, BW, BD) da el suelo de lo no cargado; sin terreno, lo no cargado no se pisa.
export function consultaMundo({ mundo, terreno = null, tipos, dy = 0, nivelAgua = 14 }) {
    const CLASE = new Int8Array(256);
    for (let i = 0; i < 256; i++) {
        const t = tipos[i];
        CLASE[i] = t === 1 || t === 2 || t === 6 || t === 8 ? SOLIDO : t === 3 ? AGUA : t === 5 ? LAVA : LIBRE;
    }
    return {
        celda(x, y, z) {
            const id = mundo.bloque(x, y + dy, z);
            return id === -1 ? SIN_CARGAR : CLASE[id];
        },
        columna(x, z) {
            if (!terreno) return null;
            const { BW, BD, HT, ES } = terreno;
            if (x < 1 || z < 1 || x >= BW - 1 || z >= BD - 1) return null;
            const o = z * BW + x;
            if (ES[o] === 1) return null; // casas y construcciones: sin el bloque a bloque no se sabe por dónde entrar
            const y = HT[o] + 1;
            return { y, agua: y <= nivelAgua && ES[o] !== 2 };
        }
    };
}

// ---------------------------------------------------------
// Dónde quedan los pies al pasar a la columna (x, z) viniendo desde la altura y0 (en la columna ox, oz).
// NaN si no se puede: pared, caída muy alta, agua honda o lava. `agua` (salida) dice si pisa agua bajita.
// ---------------------------------------------------------
const salida = { agua: false };
function pie(C, A, x, z, y0, ox, oz) {
    salida.agua = false;
    const arriba = y0 + A.subida, abajo = y0 - A.caida;
    for (let y = arriba; y >= abajo && y >= 1; y--) {
        const piso = C.celda(x, y - 1, z);
        if (piso === SIN_CARGAR) return pieMapa(C, A, x, z, y0);
        if (piso !== SOLIDO) continue;
        // Encontró piso: o se puede parar aquí o no hay paso en esta columna (más abajo está tapado por este piso)
        for (let h = 0; h < A.alto; h++) {
            const c = C.celda(x, y + h, z);
            if (c === SIN_CARGAR) return pieMapa(C, A, x, z, y0);
            if (c === SOLIDO || c === LAVA) return NaN;
            if (c === AGUA) { if (h > 0 || !(A.costoAgua > 0)) return NaN; salida.agua = true; }
        }
        // Para subir hace falta espacio sobre la cabeza en la columna de donde viene
        for (let h = y0 + A.alto; h < y + A.alto; h++) {
            const c = C.celda(ox, h, oz);
            if (c === SOLIDO) return NaN;
        }
        return y;
    }
    return NaN;
}
function pieMapa(C, A, x, z, y0) {
    const col = C.columna(x, z);
    if (!col || col.y > y0 + A.subida || col.y < y0 - A.caida) return NaN;
    if (col.agua && !(A.costoAgua > 0)) return NaN;
    salida.agua = !!col.agua;
    return col.y;
}

// Altura donde se puede parar alguien que está en (x, y, z), buscando un poco arriba y abajo (sentado en un
// tronco, recién puesto por posiciones.json…). NaN si no hay suelo cerca.
export function apoyo(consulta, x, y, z, op = ajustes) {
    const bx = Math.floor(x), bz = Math.floor(z), by = Math.round(y);
    const A = { ...op, subida: 2, caida: 4 };
    return pie(consulta, A, bx, bz, by, bx, bz);
}

// ¿Se puede estar de pie justo en el bloque (x, y, z)? (piso sólido debajo y `alto` libres; agua bajita vale)
function deP(C, A, x, y, z) {
    const piso = C.celda(x, y - 1, z);
    if (piso === SIN_CARGAR) { const col = C.columna(x, z); return !!col && col.y === y; }
    if (piso !== SOLIDO) return false;
    for (let h = 0; h < A.alto; h++) {
        const c = C.celda(x, y + h, z);
        if (c === SOLIDO || c === LAVA || (c === AGUA && h > 0)) return false;
    }
    return true;
}
// Suelo donde se puede estar de pie en la columna (x, z), el más cercano a yRef (primero a esa altura, luego uno
// arriba, uno abajo…) hasta `alcance` bloques. Para dejar en el piso a quien quedó en el aire (lejos avanza a
// saltos y entre dos puntos del camino no mira el terreno). NaN si no hay.
export function suelo(C, x, z, yRef, op = ajustes, alcance = 24) {
    const bx = Math.floor(x), bz = Math.floor(z), y0 = Math.round(yRef);
    for (let k = 0; k <= alcance; k++) {
        if (y0 - k >= 1 && deP(C, op, bx, y0 - k, bz)) return y0 - k;
        if (k && deP(C, op, bx, y0 + k, bz)) return y0 + k;
    }
    return NaN;
}
// ¿Tiene aire (o agua) bajo los pies? Sentado en un tronco o metido en un bloque no cuenta: solo el aire de verdad
const enElAire = (C, x, y, z) => { const c = C.celda(Math.floor(x), Math.round(y) - 1, Math.floor(z)); return c === LIBRE || c === AGUA; };
// Celda de partida: la suya a su altura; si está metido en algo (sentado en un tronco, en una silla), una vecina a
// la misma altura; si no, la suya un poco más arriba o abajo. null si no hay dónde pararse.
export function inicio(C, desde, op = ajustes) {
    const x = Math.floor(desde.x), z = Math.floor(desde.z), y = Math.round(desde.y);
    if (deP(C, op, x, y, z)) return { x, y, z };
    for (const [dx, dz] of DIRS) if (deP(C, op, x + dx, y, z + dz)) return { x: x + dx, y, z: z + dz };
    const ya = apoyo(C, desde.x, desde.y, desde.z, op);
    if (Number.isFinite(ya)) return { x, y: ya, z };
    if (!enElAire(C, desde.x, desde.y, desde.z)) return null;
    const ys = suelo(C, desde.x, desde.z, desde.y, op); // quedó en el aire: parte desde el suelo de abajo (o de arriba)
    return Number.isFinite(ys) ? { x, y: ys, z } : null;
}

// Punto pisable más cercano a (x, y, z), en anillos hasta `radioPisable` bloques y unos bloques arriba o abajo:
// convierte «el centro de la atalaya» (dentro de la torre) en «junto a la torre». null si no hay ninguno.
export function cercaPisable(C, x, y, z, op = ajustes) {
    const bx = Math.floor(x), bz = Math.floor(z), by = Number.isFinite(y) ? Math.round(y) : NaN;
    const R = Math.max(0, op.radioPisable | 0);
    for (let r = 0; r <= R; r++) {
        let mejor = null, mejorD = Infinity;
        for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
            if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue; // solo el borde del anillo
            const cx = bx + dx, cz = bz + dz;
            let cy = NaN;
            if (Number.isFinite(by)) { for (const d of [0, 1, -1, 2, -2, 3, -3, 4, -4]) if (deP(C, op, cx, by + d, cz)) { cy = by + d; break; } }
            else { const col = C.columna(cx, cz); if (col && !col.agua) cy = col.y; }
            if (!Number.isFinite(cy)) continue;
            const d = dx * dx + dz * dz + (Number.isFinite(by) ? (cy - by) * (cy - by) : 0);
            if (d < mejorD) { mejorD = d; mejor = { x: cx + 0.5, y: cy, z: cz + 0.5 }; }
        }
        if (mejor) return mejor;
    }
    return null;
}

// ---------------------------------------------------------
// 2. Búsqueda A* por tramos
// ---------------------------------------------------------
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
const RAIZ2 = Math.SQRT2;

// desde, hasta: { x, y, z } (hasta.y opcional). Devuelve { estado, camino, nodos, avanzar(tope) }.
// estado: 'buscando' → 'listo' (llega) | 'parcial' (el mejor tramo dentro del tope) | 'sin-camino'.
export function crearBusqueda(consulta, desde, hasta, op = ajustes) {
    const A = op;
    const gx = Math.floor(hasta.x), gz = Math.floor(hasta.z);
    const gy = Number.isFinite(hasta.y) ? Math.round(hasta.y) : NaN;
    const r2 = A.llegada * A.llegada;
    // Nodos en arreglos que crecen (x, y, z, costo, padre); la clave empaqueta la celda
    let cap = 1024;
    let X = new Int32Array(cap), Y = new Int16Array(cap), Z = new Int32Array(cap), G = new Float32Array(cap), P = new Int32Array(cap);
    let cerrado = new Uint8Array(cap);
    let n = 0;
    const indice = new Map();
    const clave = (x, y, z) => ((y + 64) * 8192 + (z + 4096)) * 8192 + (x + 4096);
    // Montículo binario de (f, nodo)
    let hF = new Float64Array(cap), hN = new Int32Array(cap), hn = 0;
    function crecer() {
        cap *= 2;
        const c = (Tipo, v) => { const a = new Tipo(cap); a.set(v); return a; };
        X = c(Int32Array, X); Y = c(Int16Array, Y); Z = c(Int32Array, Z); G = c(Float32Array, G); P = c(Int32Array, P); cerrado = c(Uint8Array, cerrado);
    }
    function meter(f, i) {
        if (hn === hF.length) { const a = new Float64Array(hn * 2); a.set(hF); hF = a; const b = new Int32Array(hn * 2); b.set(hN); hN = b; }
        let k = hn++;
        while (k > 0) {
            const p = (k - 1) >> 1;
            if (hF[p] <= f) break;
            hF[k] = hF[p]; hN[k] = hN[p]; k = p;
        }
        hF[k] = f; hN[k] = i;
    }
    function sacar() {
        const r = hN[0], f = hF[--hn], i = hN[hn];
        let k = 0;
        for (;;) {
            let c = 2 * k + 1;
            if (c >= hn) break;
            if (c + 1 < hn && hF[c + 1] < hF[c]) c++;
            if (hF[c] >= f) break;
            hF[k] = hF[c]; hN[k] = hN[c]; k = c;
        }
        hF[k] = f; hN[k] = i;
        return r;
    }
    // Distancia octil al destino (× codicia). El camino sale «en diagonal y después recto»: suavizar() lo endereza
    const h = (x, z) => {
        const dx = Math.abs(x - gx), dz = Math.abs(z - gz);
        return (Math.max(dx, dz) + (RAIZ2 - 1) * Math.min(dx, dz)) * A.codicia;
    };
    function nodo(x, y, z, g, padre) {
        const k = clave(x, y, z);
        let i = indice.get(k);
        if (i === undefined) {
            if (n === cap) crecer();
            i = n++;
            X[i] = x; Y[i] = y; Z[i] = z; G[i] = g; P[i] = padre; cerrado[i] = 0;
            indice.set(k, i);
        } else if (cerrado[i] || g >= G[i]) return;
        else { G[i] = g; P[i] = padre; }
        meter(g + h(x, z), i);
    }

    const b = { estado: 'buscando', camino: null, nodos: 0, avanzar };
    const ini = inicio(consulta, desde, A);
    if (!ini) { b.estado = 'sin-camino'; return b; }
    nodo(ini.x, ini.y, ini.z, 0, -1);
    let mejor = 0, mejorH = Infinity;
    const vecinos = new Float64Array(8); // y de cada dirección recta (NaN si no se puede), para no cortar esquinas

    function llego(i) {
        const dx = X[i] + 0.5 - hasta.x, dz = Z[i] + 0.5 - hasta.z;
        return dx * dx + dz * dz <= r2 && (!Number.isFinite(gy) || Math.abs(Y[i] - gy) <= 2);
    }
    function terminar(i, estado) {
        const puntos = [];
        for (let k = i; k !== -1; k = P[k]) puntos.push({ x: X[k] + 0.5, y: Y[k], z: Z[k] + 0.5 });
        puntos.reverse();
        b.camino = suavizar(consulta, puntos, A);
        b.estado = estado;
    }
    function avanzar(tope = A.nodosPorCuadro) {
        if (b.estado !== 'buscando') return 0;
        let hechos = 0;
        while (hechos < tope) {
            if (hn === 0) { if (mejor > 0) terminar(mejor, 'parcial'); else b.estado = 'sin-camino'; return hechos; }
            const i = sacar();
            if (cerrado[i]) continue;
            cerrado[i] = 1;
            hechos++; b.nodos++;
            if (llego(i)) { terminar(i, 'listo'); return hechos; }
            const hi = h(X[i], Z[i]);
            if (hi < mejorH) { mejorH = hi; mejor = i; }
            if (b.nodos >= A.nodosMax) { terminar(mejor, mejor > 0 ? 'parcial' : 'sin-camino'); if (mejor === 0) b.camino = null; return hechos; }
            const x = X[i], y = Y[i], z = Z[i], g = G[i];
            for (let d = 0; d < 8; d++) {
                const dx = DIRS[d][0], dz = DIRS[d][1];
                let ny;
                if (d < 4) {
                    ny = pie(consulta, A, x + dx, z + dz, y, x, z);
                    vecinos[d] = ny;
                    if (!Number.isFinite(ny)) continue;
                } else {
                    // En diagonal solo en plano y con las dos rectas libres a la misma altura (no corta esquinas)
                    const a = vecinos[dx > 0 ? 0 : 1], c = vecinos[dz > 0 ? 2 : 3];
                    if (a !== y || c !== y) continue;
                    ny = pie(consulta, A, x + dx, z + dz, y, x, z);
                    if (ny !== y) continue;
                }
                let costo = d < 4 ? 1 : RAIZ2;
                if (ny > y) costo += (ny - y) * A.costoSubida;
                else if (ny < y) costo += (y - ny) * A.costoBajada;
                if (salida.agua) costo += A.costoAgua;
                nodo(x + dx, ny, z + dz, g + costo, i);
            }
        }
        return hechos;
    }
    return b;
}

// ¿Se puede ir en línea recta de a a b? Recorre las columnas que cruza el segmento (cada 0,25 bloques más
// el ancho del cuerpo) siguiendo la altura de los pies, como lo haría el caminante.
function recto(C, A, a, b) {
    const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz);
    const pasos = Math.ceil(d / 0.25);
    let y = a.y, cx = Math.floor(a.x), cz = Math.floor(a.z);
    const r = 0.3; // medio ancho del cuerpo: que no roce las esquinas
    const nx = d ? -dz / d * r : 0, nz = d ? dx / d * r : 0;
    for (let s = 1; s <= pasos; s++) {
        const k = s / pasos, px = a.x + dx * k, pz = a.z + dz * k;
        const bx = Math.floor(px), bz = Math.floor(pz);
        if (bx !== cx || bz !== cz) {
            // De a una columna recta por vez (si cambia x y z a la vez, pasa por una de las dos)
            if (bx !== cx && bz !== cz) {
                const m = pie(C, A, bx, cz, y, cx, cz);
                if (m !== y) return false;
            }
            const ny = pie(C, A, bx, bz, y, cx, cz);
            if (!Number.isFinite(ny) || salida.agua) return false;
            y = ny; cx = bx; cz = bz;
        }
        // Los bordes del cuerpo: su columna tiene que estar a la misma altura (no rozar paredes ni bordes)
        for (const sg of [1, -1]) {
            const ex = Math.floor(px + nx * sg), ez = Math.floor(pz + nz * sg);
            if (ex === cx && ez === cz) continue;
            if (pie(C, A, ex, ez, y, cx, cz) !== y) return false;
        }
    }
    return y === b.y;
}

// Quita los puntos que sobran: desde cada punto, salta al más lejano (hasta `suavizado` adelante) al que se
// llega en línea recta (búsqueda binaria: pocas pruebas por tramo aunque la ventana sea grande). Queda una lista
// de quiebres con su altura.
export function suavizar(consulta, puntos, op = ajustes) {
    if (puntos.length <= 2) return puntos;
    const out = [puntos[0]];
    let i = 0;
    while (i < puntos.length - 1) {
        const tope = Math.min(puntos.length - 1, i + Math.max(1, op.suavizado | 0));
        let j = i + 1;
        if (recto(consulta, op, puntos[i], puntos[tope])) j = tope;
        else {
            let lo = i + 1, hi = tope; // lo se alcanza (vecino), hi no
            while (hi - lo > 1) { const m = (lo + hi) >> 1; if (recto(consulta, op, puntos[i], puntos[m])) lo = m; else hi = m; }
            j = lo;
        }
        out.push(puntos[j]);
        i = j;
    }
    return out;
}

// ---------------------------------------------------------
// Cola de búsquedas: reparte el tope por cuadro (una a la vez, en orden de llegada)
// ---------------------------------------------------------
export function crearNavegador(consulta, opciones = {}) {
    const cola = [];
    const op = () => opciones.ajustes ? opciones.ajustes() : ajustes;
    return {
        consulta,
        pedir(desde, hasta) {
            const b = crearBusqueda(consulta, desde, hasta, op());
            if (b.estado === 'buscando') cola.push(b);
            return b;
        },
        cancelar(b) { const i = cola.indexOf(b); if (i >= 0) cola.splice(i, 1); if (b && b.estado === 'buscando') b.estado = 'cancelada'; },
        actualizar(tope = op().nodosPorCuadro) {
            while (tope > 0 && cola.length) {
                const b = cola[0];
                tope -= Math.max(1, b.avanzar(tope));
                if (b.estado !== 'buscando') cola.shift();
            }
        },
        get pendientes() { return cola.length; }
    };
}

// ---------------------------------------------------------
// 3. Caminante: sigue un camino. Estado: 'quieto' | 'buscando' | 'caminando' | 'llego' | 'sin-camino'
// ---------------------------------------------------------
// cuerpo: { x, y, z, yaw } (se mueve en el lugar: el que llama lo dibuja). `alMover` opcional.
export function crearCaminante(navegador, cuerpo, opciones = {}) {
    const op = () => opciones.ajustes ? opciones.ajustes() : ajustes;
    const C = navegador.consulta;
    const w = {
        estado: 'quieto', camino: null, i: 0, destino: null, busqueda: null, asentando: NaN, deLejos: false, dBuscar: Infinity,
        moviendo: false, fase: 0, distancia: 0, reintentos: 0,
        ir(destino) {
            w.destino = { x: destino.x, y: destino.y, z: destino.z };
            w.reintentos = 0; w.ultimaD = Infinity; w.asentando = NaN; w.dBuscar = Infinity;
            buscar();
        },
        parar() {
            if (w.busqueda) navegador.cancelar(w.busqueda);
            w.busqueda = null; w.camino = null; w.destino = null; w.estado = 'quieto'; w.moviendo = false;
        },
        // Lleva el cuerpo al final del camino al tiro (por ejemplo, si nadie lo ve y hay apuro)
        saltarAlFinal() {
            const fin = w.camino ? w.camino[w.camino.length - 1] : w.destino;
            if (!fin) return;
            cuerpo.x = fin.x; cuerpo.z = fin.z; if (Number.isFinite(fin.y)) cuerpo.y = fin.y;
            w.camino = null; w.estado = 'llego'; w.moviendo = false;
        },
        // Quieto (llegó o espera): si quedó sin piso (lo dejaron a saltos, rompieron el bloque de abajo) baja o sube al
        // suelo más cercano. Devuelve true si lo movió. Cerca del jugador; lejos no hace falta.
        asentar(dt = 1) {
            const A = op();
            let ys = w.asentando;
            if (!Number.isFinite(ys)) {
                if (!enElAire(C, cuerpo.x, cuerpo.y, cuerpo.z) || deP(C, A, Math.floor(cuerpo.x), Math.round(cuerpo.y), Math.floor(cuerpo.z))) return false;
                ys = suelo(C, cuerpo.x, cuerpo.z, cuerpo.y, A);
                if (!Number.isFinite(ys)) return false;
            }
            cuerpo.y += (ys - cuerpo.y) * Math.min(1, dt * 10);
            w.asentando = ys;
            if (Math.abs(ys - cuerpo.y) < 0.02) { cuerpo.y = ys; w.asentando = NaN; }
            cuerpo.yObj = ys;
            return true;
        },
        // Lo que falta por recorrer (bloques, en planta)
        get restante() {
            if (!w.camino) return w.destino ? Math.hypot(w.destino.x - cuerpo.x, w.destino.z - cuerpo.z) : 0;
            let d = 0, px = cuerpo.x, pz = cuerpo.z;
            for (let k = w.i; k < w.camino.length; k++) { d += Math.hypot(w.camino[k].x - px, w.camino[k].z - pz); px = w.camino[k].x; pz = w.camino[k].z; }
            return d;
        },
        actualizar(dt, { detalle = true } = {}) {
            w.moviendo = false;
            // Primer cuadro cerca después de avanzar a saltos: el mapa de alturas no tiene árboles ni lo que pusiste;
            // si quedó sin piso o metido en algo, a un lugar donde quepa y busca de nuevo desde ahí
            if (detalle && w.deLejos) { w.deLejos = false; if (reubicar() && w.destino && w.estado !== 'llego') buscar(); }
            if (!detalle && w.estado !== 'quieto') w.deLejos = true;
            if (w.estado === 'buscando') {
                const b = w.busqueda;
                if (!b || b.estado === 'buscando') return w.estado;
                w.busqueda = null;
                if (b.estado === 'sin-camino' || b.estado === 'cancelada' || !b.camino || b.camino.length < 1) return rendirse();
                // El camino parte del centro de su celda: si está lejos de ese punto (al borde, junto a un tronco), primero va
                // ahí; ir derecho al segundo punto puede rozar la esquina que el camino suavizado sí esquivaba
                w.camino = b.camino; w.parcial = b.estado === 'parcial';
                w.i = Math.hypot(b.camino[0].x - cuerpo.x, b.camino[0].z - cuerpo.z) > 0.25 ? 0 : 1;
                w.estado = 'caminando'; w.lejos = 0; w.reloj = 0; w.mejor = Infinity;
            }
            if (w.estado !== 'caminando') return w.estado;
            return detalle ? pasoCerca(dt) : pasoLejos(dt);
        }
    };
    // Si no se puede estar de pie donde está (en el aire o metido en follaje), al punto pisable más cercano. true si lo movió
    function reubicar() {
        const A = op();
        if (deP(C, A, Math.floor(cuerpo.x), Math.round(cuerpo.y), Math.floor(cuerpo.z))) return false;
        if (enElAire(C, cuerpo.x, cuerpo.y, cuerpo.z)) {
            const ys = suelo(C, cuerpo.x, cuerpo.z, cuerpo.y, A);
            if (Number.isFinite(ys)) { cuerpo.y = cuerpo.yObj = ys; return true; }
        }
        const q = cercaPisable(C, cuerpo.x, cuerpo.y, cuerpo.z, { ...A, radioPisable: Math.min(A.radioPisable, 6) });
        if (!q) return false;
        cuerpo.x = q.x; cuerpo.y = cuerpo.yObj = q.y; cuerpo.z = q.z;
        return true;
    }
    // En un viaje largo aparecen árboles y cosas que el mapa de alturas no tenía (los chunks se cargan mientras camina):
    // cada choque busca de nuevo. Si desde la última búsqueda avanzó de verdad, eso no cuenta como fracaso
    function avance() {
        if (!w.destino) return;
        const d = Math.hypot(w.destino.x - cuerpo.x, w.destino.z - cuerpo.z);
        if (d < w.dBuscar - op().avanceReintentos) { w.reintentos = 0; w.dBuscar = d; }
    }
    function buscar() {
        if (w.destino) w.dBuscar = Math.min(w.dBuscar, Math.hypot(w.destino.x - cuerpo.x, w.destino.z - cuerpo.z));
        if (w.busqueda) navegador.cancelar(w.busqueda);
        w.camino = null;
        w.busqueda = navegador.pedir({ x: cuerpo.x, y: cuerpo.y, z: cuerpo.z }, w.destino);
        w.estado = 'buscando';
    }
    function rendirse() {
        if (w.reintentos++ < op().reintentos && w.destino) { buscar(); return w.estado; }
        w.estado = 'sin-camino'; w.camino = null;
        return w.estado;
    }
    // Terminó el camino. Si quedó cerca (`aceptable`), llegó. Si era parcial y este tramo acercó al menos un bloque, busca
    // el resto desde aquí; si no acercó (el destino no se alcanza), se rinde: nunca busca en vano una y otra vez
    function finDeCamino() {
        const d = w.destino, A = op();
        const dist = d ? Math.hypot(d.x - cuerpo.x, d.z - cuerpo.z) : 0;
        if (dist <= Math.max(A.llegada + 0.5, A.aceptable)) { w.estado = 'llego'; w.camino = null; return w.estado; }
        const avanzo = dist < w.ultimaD - 1;
        w.ultimaD = Math.min(w.ultimaD, dist);
        if (avanzo && w.reintentos++ < A.reintentos + 8) { buscar(); return w.estado; }
        w.estado = 'sin-camino'; w.camino = null;
        return w.estado;
    }
    // Lejos: nadie mira. Junta el tiempo y cada `saltoLejos` s avanza de un viaje lo que habría caminado (× `rapidezLejos`)
    function pasoLejos(dt) {
        const A = op();
        w.lejos += dt;
        if (w.lejos < A.saltoLejos) return w.estado;
        let resto = A.velocidad * A.rapidezLejos * w.lejos;
        w.lejos = 0;
        while (resto > 0 && w.i < w.camino.length) {
            const p = w.camino[w.i], dx = p.x - cuerpo.x, dz = p.z - cuerpo.z, d = Math.hypot(dx, dz);
            if (d <= resto) { cuerpo.x = p.x; cuerpo.z = p.z; cuerpo.y = p.y; resto -= d; w.distancia += d; w.i++; }
            else {
                // A mitad de un tramo: la altura del terreno de ahí (el tramo suavizado puede cruzar lomas)
                const yi = cuerpo.y + (p.y - cuerpo.y) * (resto / d);
                cuerpo.x += dx / d * resto; cuerpo.z += dz / d * resto; w.distancia += resto; cuerpo.yaw = Math.atan2(dx, dz); resto = 0;
                const ys = suelo(C, cuerpo.x, cuerpo.z, yi, A);
                cuerpo.y = Number.isFinite(ys) ? ys : yi;
            }
        }
        cuerpo.yObj = cuerpo.y;
        w.reloj = 0; w.mejor = Infinity;
        avance();
        return w.i >= w.camino.length ? finDeCamino() : w.estado;
    }
    // Cerca: camina de verdad, mirando cada columna nueva; si cambió algo, busca de nuevo desde aquí
    function pasoCerca(dt) {
        const A = op();
        const p = w.camino[w.i];
        const dx = p.x - cuerpo.x, dz = p.z - cuerpo.z, d = Math.hypot(dx, dz);
        if (d < 0.08) { cuerpo.x = p.x; cuerpo.z = p.z; w.i++; return w.i >= w.camino.length ? finDeCamino() : w.estado; }
        const paso = Math.min(d, A.velocidad * dt);
        const nx = cuerpo.x + dx / d * paso, nz = cuerpo.z + dz / d * paso;
        const bx = Math.floor(cuerpo.x), bz = Math.floor(cuerpo.z), nbx = Math.floor(nx), nbz = Math.floor(nz);
        // Sin piso bajo los pies (venía de lejos, a saltos): al suelo antes de seguir (pasa a radioDetalle, no se ve)
        if (enElAire(C, cuerpo.x, cuerpo.y, cuerpo.z) && !deP(C, A, bx, Math.round(cuerpo.y), bz)) { const ys = suelo(C, cuerpo.x, cuerpo.z, cuerpo.y, A); if (Number.isFinite(ys)) cuerpo.y = cuerpo.yObj = ys; }
        const yPies = Math.round(cuerpo.y);
        let yObj = yPies;
        if (nbx !== bx || nbz !== bz) {
            yObj = pie(C, A, nbx, nbz, yPies, bx, bz);
            if (!Number.isFinite(yObj)) return atascado();
        } else {
            yObj = Number.isFinite(cuerpo.yObj) ? cuerpo.yObj : yPies;
        }
        cuerpo.yObj = yObj;
        cuerpo.x = nx; cuerpo.z = nz;
        // La altura sigue a los pies: sube de un saltito, baja un poco más lento
        const ky = Math.min(1, dt * (yObj > cuerpo.y ? 14 : 10));
        cuerpo.y += (yObj - cuerpo.y) * ky;
        if (Math.abs(yObj - cuerpo.y) < 0.02) cuerpo.y = yObj;
        const meta = Math.atan2(dx, dz);
        let da = meta - cuerpo.yaw;
        da = Math.atan2(Math.sin(da), Math.cos(da));
        cuerpo.yaw += da * Math.min(1, dt * A.giro);
        w.moviendo = true; w.distancia += paso;
        avance();
        w.fase += paso * 2.6; // ~un paso por bloque, como caminar() de cuerpo.js
        // Atasco: si en `atasco` s no se acercó medio bloque al punto siguiente, busca de nuevo
        w.reloj += dt;
        const r = w.restante;
        if (r < w.mejor - 0.5) { w.mejor = r; w.reloj = 0; }
        else if (w.reloj > A.atasco) return atascado();
        return w.estado;
    }
    function atascado() {
        if (w.reintentos++ >= op().reintentos) { w.estado = 'sin-camino'; w.camino = null; return w.estado; }
        buscar();
        return w.estado;
    }
    return w;
}
