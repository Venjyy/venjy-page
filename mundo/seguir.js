// =========================================================
// VENJY · Seguir a alguien por su rastro (7i, amigos acompañantes)
// Puro: sin three.js ni DOM. Sirve para cualquier criatura de pie que acompaña a otra (hoy los amigos que te siguen;
// mañana mascotas o compañeros del juego comercial). Usa la consulta y el caminante de navegacion.js.
//
// Idea: no busca camino mientras puede. Guarda «migas» (dónde pisó el líder, cada `miga` bloques) y camina por esa
// misma línea unos pasos atrás: por donde pasó el líder no hay paredes. Solo si el rastro se corta (saltó un hueco,
// nadó, se subió a un pilar, lo teletransportaron) o se atasca, busca camino con el caminante (A*) hasta el líder y
// vuelve al rastro apenas lo encuentra. Si no puede llegar, o el líder se aleja más de `radioEspera`, espera donde
// quedó (evento 'espera': quien lo usa dice «¡Espérame!»); si el líder sigue alejándose más de `radioAparecer` y nadie
// lo ve, aparece detrás de él fuera de la vista (evento 'aparecio'), como los lobos de Minecraft. Nunca a la vista.
//
// Estados: 'quieto' (cerca, te mira) · 'siguiendo' (modo 'rastro' o 'camino') · 'esperando'.
// Valores: SEGUIR_BASE + mundo/datos/navegacion.json → `seguir` (pestaña Vida del Estudio).
// =========================================================
import { apoyo, cercaPisable, crearCaminante, ajustesNavegacion } from './navegacion.js';

export const SEGUIR_BASE = {
    distancia: 2.5,     // se queda a esto de ti (bloques)
    holgura: 1.5,       // quieto, no parte hasta que te alejes `distancia` + esto (no anda a saltitos detrás de ti)
    rapidezMax: 1.6,    // si se queda atrás camina hasta esto más rápido (× la velocidad de caminar)
    alcanzar: 6,        // … y a esa rapidez llega cuando va esto (bloques) más atrás de `distancia`
    miga: 0.5,          // cada cuánto (bloques) guarda por dónde pisaste
    migas: 240,         // cuántas guarda como mucho (240 × 0,5 = 120 bloques de rastro)
    corte: 3,           // entre dos migas más que esto (te teletransportaron, caíste lejos): el rastro se corta
    subidaRastro: 1.5,  // si entre dos migas sube más que esto (te subiste a un pilar): el rastro se corta
    caidaRastro: 5,     // … y si baja más que esto
    atasco: 3,          // segundos sin poder andar por tu rastro antes de buscar camino
    buscarCada: 1.5,    // buscando camino: si te moviste, corrige el destino cada esto (s)
    radioEspera: 24,    // más lejos que esto, o sin camino: «¡Espérame!» y espera donde quedó
    retomar: 18,        // esperando, vuelve a seguirte si te acercas a menos de esto
    reintento: 3,       // esperando porque no hay camino: lo intenta de nuevo cada esto (s)
    radioAparecer: 40,  // más lejos que esto y sin que lo veas: aparece detrás de ti
    detras: 5,          // … a esto detrás de ti (bloques, por tu rastro si se puede)
    anguloVista: 70     // grados a cada lado de hacia dónde miras: más allá no lo ves (para aparecer sin que se note)
};
let ajustesS = { ...SEGUIR_BASE };
// navegacion.json → `seguir` (ignora lo que no sea número finito)
export function fijarSeguir(d) {
    ajustesS = { ...SEGUIR_BASE };
    if (d) for (const k of Object.keys(SEGUIR_BASE)) if (Number.isFinite(d[k])) ajustesS[k] = d[k];
    return ajustesS;
}
export const ajustesSeguir = () => ajustesS;

const angulo = a => Math.atan2(Math.sin(a), Math.cos(a));
const lim01 = v => Math.max(0, Math.min(1, v));

// ¿Ve el líder el punto (x, z)? Con su cámara en `ojo` mirando hacia `yaw` (three.js: hacia -z con yaw 0).
// `radio`: más lejos no se dibuja. Muy cerca (< 4) siempre se ve.
export function seVe(ojo, yaw, p, anguloVista = SEGUIR_BASE.anguloVista, radio = 160) {
    const dx = p.x - ojo.x, dz = p.z - ojo.z, d = Math.hypot(dx, dz);
    if (d > radio) return false;
    if (d < 4) return true;
    const c = (dx * -Math.sin(yaw) + dz * -Math.cos(yaw)) / d;
    return c > Math.cos(anguloVista * Math.PI / 180);
}

// cuerpo: { x, y, z, yaw } (se mueve en el lugar: el que llama lo dibuja). opciones.seguir / opciones.ajustes:
// funciones que dan SEGUIR_BASE y NAV_BASE ajustados (por defecto los de los JSON).
export function crearSeguidor(navegador, cuerpo, opciones = {}) {
    const C = navegador.consulta;
    const S = () => (opciones.seguir ? opciones.seguir() : ajustesS);
    const N = () => (opciones.ajustes ? opciones.ajustes() : ajustesNavegacion());
    const w = crearCaminante(navegador, cuerpo, { ajustes: N });
    const migas = []; // { x, y, z } (y = pies sobre el suelo) o null (el rastro se corta ahí)
    let i = -1;       // la miga hacia la que camina (-1: fuera del rastro)
    let veda = -1; // migas hasta aquí no le sirven (más adelante estaba tapado): no vuelve a ellas
    let yObj = NaN, andado = 0, reloj = 0, relojBuscar = 0, faseW = 0;
    const s = {
        estado: 'quieto', modo: 'rastro', porque: null, evento: null,
        moviendo: false, fase: 0, rapidez: 1, espera: 0, mirarYaw: undefined,
        get migas() { return migas; },
        get i() { return i; },
        caminante: w,
        // Por dónde pisó el líder (cada cuadro; solo guarda cada `miga` bloques). Sin suelo bajo los pies (nadando
        // en lo hondo, cayendo de muy alto, volando): corta el rastro
        anotar(p) {
            const A = S();
            const y = apoyo(C, p.x, p.y, p.z, N());
            if (!Number.isFinite(y)) { cortar(); return; }
            const u = migas[migas.length - 1];
            if (u) {
                const d = Math.hypot(p.x - u.x, p.z - u.z);
                if (d < A.miga && Math.abs(y - u.y) < 0.5) return;
                if (d > A.corte || y - u.y > A.subidaRastro || u.y - y > A.caidaRastro) cortar();
            }
            migas.push({ x: p.x, y, z: p.z });
            while (migas.length > Math.max(8, A.migas | 0)) { migas.shift(); i--; veda--; }
            if (i < -1) i = -1;
            if (veda < -1) veda = -1;
        },
        // Olvida el rastro y queda quieto (al empezar a acompañar o al soltarlo)
        reiniciar() { migas.length = 0; i = -1; veda = -1; w.parar(); s.modo = 'rastro'; s.estado = 'quieto'; s.porque = null; s.evento = null; s.espera = 0; yObj = NaN; },
        parar() { w.parar(); s.moviendo = false; },
        // lider: { x, y, z, yaw? }; visible(p) → ¿lo ve el líder?; detalle: cerca del jugador (mira los bloques)
        actualizar(dt, { lider, visible = () => false, detalle = true }) {
            const A = S(), NV = N();
            s.moviendo = false; s.evento = null;
            const dL = Math.hypot(cuerpo.x - lider.x, cuerpo.z - lider.z), dy = Math.abs(cuerpo.y - lider.y);
            // Muy lejos y nadie lo ve: aparece detrás del líder
            if (dL > A.radioAparecer && !visible(cuerpo) && aparecer(lider, visible)) { s.evento = 'aparecio'; return s.estado; }
            if (s.estado === 'esperando') {
                s.espera += dt;
                const sigue = dL < A.retomar && (s.porque === 'lejos' || s.espera >= A.reintento);
                if (!sigue) { mirar(lider, dt); w.asentar(dt); return s.estado; }
                s.estado = 'siguiendo'; s.porque = null; s.modo = 'rastro'; i = -1;
            }
            // Cerca: quieto mirándote (con holgura, para no andar a saltitos)
            // (siguiendo, una miga de margen: la que sigue ya queda a menos de `distancia` y no se adelanta)
            const umbral = A.distancia + (s.estado === 'quieto' ? A.holgura : A.miga + 0.1);
            if (dL <= umbral && dy < 3) {
                if (s.estado !== 'quieto') { w.parar(); s.modo = 'rastro'; }
                s.estado = 'quieto'; i = -1; reloj = 0; andado = 0;
                mirar(lider, dt); w.asentar(dt);
                return s.estado;
            }
            if (dL > A.radioEspera) return esperar('lejos');
            s.estado = 'siguiendo'; s.mirarYaw = undefined;
            // Se queda atrás: camina más rápido (hasta rapidezMax)
            s.rapidez = 1 + (Math.max(1, A.rapidezMax) - 1) * lim01((dL - A.distancia) / Math.max(0.1, A.alcanzar));
            if (s.modo === 'rastro') {
                // Atasco: si en `atasco` s no anduvo medio bloque (el rastro no lo lleva a ti), busca camino
                const x0 = cuerpo.x, z0 = cuerpo.z;
                pasoRastro(dt, lider, A, NV);
                if (s.modo === 'rastro') {
                    andado += Math.hypot(cuerpo.x - x0, cuerpo.z - z0); reloj += dt;
                    if (andado > 0.5) { andado = 0; reloj = 0; } else if (reloj > A.atasco) { veda = i; porCamino(lider); }
                }
            } else pasoCamino(dt, lider, A, detalle);
            return s.estado;
        }
    };
    function cortar() { if (migas.length && migas[migas.length - 1] !== null) migas.push(null); }
    function mirar(lider, dt) {
        const meta = Math.atan2(lider.x - cuerpo.x, lider.z - cuerpo.z);
        s.mirarYaw = meta;
        cuerpo.yaw += angulo(meta - cuerpo.yaw) * Math.min(1, dt * 3);
    }
    function esperar(porque) {
        if (s.estado !== 'esperando') s.evento = 'espera';
        w.parar(); s.estado = 'esperando'; s.porque = porque; s.espera = 0; s.modo = 'rastro'; i = -1;
        return s.estado;
    }
    // La miga más cercana a menos de `maxD`, después del último corte (el tramo por donde va el líder ahora)
    function unirse(maxD) {
        let j = -1, dj = maxD;
        for (let k = migas.length - 1; k >= 0; k--) {
            const p = migas[k];
            if (!p || k <= veda) break;
            const d = Math.hypot(p.x - cuerpo.x, p.z - cuerpo.z);
            if (d < dj - 0.05 && Math.abs(p.y - cuerpo.y) < 1.5) { dj = d; j = k; }
        }
        return j;
    }
    function porCamino(lider) {
        s.modo = 'camino'; relojBuscar = 0; reloj = 0; andado = 0;
        const q = cercaPisable(C, lider.x, lider.y, lider.z, { ...N(), radioPisable: 4 }) || { x: lider.x, y: lider.y, z: lider.z };
        faseW = w.fase;
        w.ir(q);
    }
    function pasoRastro(dt, lider, A, NV) {
        if (i < 0 || i >= migas.length || !migas[i]) {
            // La miga más cercana: estaba quieto a unos pasos de ti y partiste, así que tu rastro empieza cerca (va
            // derecho hasta ella; si algo lo tapa, el atasco lo manda a buscar camino)
            i = unirse(A.distancia + A.holgura + 1.5);
            if (i < 0) { porCamino(lider); return; }
        }
        let resto = NV.velocidad * s.rapidez * dt;
        const x0 = cuerpo.x, z0 = cuerpo.z;
        while (resto > 0 && i < migas.length) {
            const p = migas[i];
            if (!p) { porCamino(lider); return; } // el rastro se corta aquí
            // No se adelanta: la miga que queda a menos de `distancia` del líder ya es «estar con él»
            if (Math.hypot(p.x - lider.x, p.z - lider.z) < A.distancia) break;
            const dx = p.x - cuerpo.x, dz = p.z - cuerpo.z, d = Math.hypot(dx, dz);
            const paso = Math.min(d, resto);
            const nx = cuerpo.x + (d > 1e-6 ? dx / d * paso : 0), nz = cuerpo.z + (d > 1e-6 ? dz / d * paso : 0);
            // Columna nueva: ¿se puede pisar? (pusiste un bloque en tu rastro, rompiste el piso): si no, busca camino
            if (Math.floor(nx) !== Math.floor(cuerpo.x) || Math.floor(nz) !== Math.floor(cuerpo.z)) {
                const y0 = Number.isFinite(yObj) ? yObj : Math.round(cuerpo.y);
                const y = apoyo(C, nx, y0, nz, NV);
                if (!Number.isFinite(y) || y - y0 > NV.subida + 0.01 || y0 - y > NV.caida) { veda = i; porCamino(lider); return; }
                yObj = y;
            }
            cuerpo.x = nx; cuerpo.z = nz; resto -= paso;
            if (!Number.isFinite(yObj)) yObj = p.y;
            if (paso >= d) i++;
            else break;
        }
        const mx = cuerpo.x - x0, mz = cuerpo.z - z0, movido = Math.hypot(mx, mz);
        if (movido > 1e-4) {
            s.moviendo = true; s.fase += movido * 2.6;
            cuerpo.yaw += angulo(Math.atan2(mx, mz) - cuerpo.yaw) * Math.min(1, dt * NV.giro);
        }
        if (Number.isFinite(yObj)) {
            // La altura sigue a los pies: sube de un saltito, baja un poco más lento
            cuerpo.y += (yObj - cuerpo.y) * Math.min(1, dt * (yObj > cuerpo.y ? 14 : 10));
            if (Math.abs(yObj - cuerpo.y) < 0.02) cuerpo.y = yObj;
            cuerpo.yObj = yObj;
        }
    }
    function pasoCamino(dt, lider, A, detalle) {
        // De vuelta al rastro apenas pasa junto a él
        const j = unirse(1);
        if (j >= 0 && migas.length - j > 1) { w.parar(); s.modo = 'rastro'; i = j; reloj = 0; andado = 0; return; }
        relojBuscar += dt;
        if (relojBuscar >= A.buscarCada && w.destino && Math.hypot(w.destino.x - lider.x, w.destino.z - lider.z) > A.distancia) porCamino(lider);
        const e = w.actualizar(dt, { detalle });
        s.moviendo = w.moviendo; s.fase += w.fase - faseW; faseW = w.fase;
        if (e === 'sin-camino') esperar('camino');
        else if (e === 'llego') { s.modo = 'rastro'; i = -1; }
    }
    // Detrás del líder, fuera de su vista: por su rastro (a `detras` bloques andados hacia atrás) o, si no, un punto
    // pisable a su espalda. false si no hay dónde sin que se vea (lo intenta en el próximo cuadro)
    function aparecer(lider, visible) {
        const A = S(), NV = N();
        let andado = 0, prev = null;
        for (let k = migas.length - 1; k >= 0; k--) {
            const p = migas[k];
            if (!p) break;
            if (prev) andado += Math.hypot(p.x - prev.x, p.z - prev.z);
            prev = p;
            if (andado < A.detras || visible(p)) continue;
            const y = apoyo(C, p.x, p.y, p.z, NV);
            if (!Number.isFinite(y)) continue;
            poner(p.x, y, p.z); i = k + 1;
            return true;
        }
        const yaw = Number.isFinite(lider.yaw) ? lider.yaw : 0;
        const q = cercaPisable(C, lider.x + Math.sin(yaw) * A.detras, lider.y, lider.z + Math.cos(yaw) * A.detras, { ...NV, radioPisable: 4 });
        if (!q || visible(q)) return false;
        poner(q.x, q.y, q.z); i = -1;
        return true;
    }
    function poner(x, y, z) {
        w.parar();
        cuerpo.x = x; cuerpo.y = y; cuerpo.z = z; cuerpo.yObj = y; yObj = y;
        s.estado = 'quieto'; s.modo = 'rastro'; s.porque = null; reloj = 0; andado = 0;
    }
    return s;
}
