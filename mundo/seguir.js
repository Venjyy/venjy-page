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
// Torre (7i PR 2): si te subes a un pilar (estás `torreAltura` o más por encima, a menos de `torreCerca`, durante
// `torreEspera` s), arma su propia torre al lado de la tuya: salta y pone un bloque bajo los pies (opciones.poner) hasta
// tu altura; si le pusieron un bloque encima, lo rompe (opciones.romper) y se lo guarda. Lleva `torreBloques` bloques:
// sin bloques se queda donde llegó (evento 'sinBloques'). Si bajas, baja rompiéndola (opciones.quitar) y los recupera;
// si te vas por arriba, la deja y la quita (y los recupera) cuando no la ves.
// Peleas: `perseguir(dt, p)` lo lleva hasta un monstruo (quien decide la pelea es supervivencia/acompanante-pelea.js) y
// `dejar()` lo devuelve a tu rastro.
//
// Estados: 'quieto' (cerca, te mira) · 'siguiendo' (modo 'rastro', 'camino' o 'torre') · 'esperando' · 'peleando'.
// Valores: SEGUIR_BASE + mundo/datos/navegacion.json → `seguir` (pestaña Vida del Estudio).
// =========================================================
import { apoyo, cercaPisable, crearCaminante, ajustesNavegacion, LIBRE } from './navegacion.js';

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
    anguloVista: 70,    // grados a cada lado de hacia dónde miras: más allá no lo ves (para aparecer sin que se note)
    torreAltura: 2.5,   // estás esto o más por encima de él (te subiste a un pilar)…
    torreCerca: 5,      // … a menos de esto en horizontal (bloques)…
    torreEspera: 2,     // … durante esto (s): arma su propia torre al lado de la tuya
    torreCada: 0.5,     // subiendo: un bloque cada esto (s)
    torreBajar: 0.4,    // bajando: rompe un bloque cada esto (s)
    torreRomper: 0.8,   // si le pusieron un bloque encima, lo rompe en esto (s)
    torreBloques: 16    // bloques que lleva al empezar a acompañarte (los recupera al bajar o al quitar la torre)
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
    let torre = null, relojTorre = 0; // torre: { fase: 'ir' | 'subir' | 'arriba' | 'bajar', bx, bz, y (pies), bloques, reloj }
    const restos = []; // bloques de torres que dejó atrás: los quita (y los recupera) cuando no los ves
    const s = {
        estado: 'quieto', modo: 'rastro', porque: null, evento: null,
        moviendo: false, fase: 0, rapidez: 1, espera: 0, mirarYaw: undefined,
        bloques: S().torreBloques | 0, // los que lleva para su torre
        get migas() { return migas; },
        get i() { return i; },
        get torre() { return torre; },
        get restos() { return restos; },
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
        reiniciar() { dejarTorre(); migas.length = 0; i = -1; veda = -1; w.parar(); s.modo = 'rastro'; s.estado = 'quieto'; s.porque = null; s.evento = null; s.espera = 0; yObj = NaN; },
        parar() { w.parar(); s.moviendo = false; },
        // Quita al tiro las torres que puso (al dejar de acompañarte). Si estaba arriba de una, queda en el suelo
        limpiar() {
            if (torre) { const b = torre.bloques[0]; if (b) { cuerpo.y = b[1]; cuerpo.yObj = b[1]; } }
            dejarTorre();
            quitarRestos();
        },
        // Pelea: camina hasta `p` ({ x, y, z }) y lo mira al llegar a `alcance`. Devuelve 'alcance' | 'yendo' |
        // 'sin-camino' | 'torre' (está arriba de su torre: no baja a pelear)
        perseguir(dt, p, { alcance = 2, repensar = 0.5, detalle = true } = {}) {
            s.evento = null; s.moviendo = false; s.mirarYaw = undefined;
            if (torre) return 'torre';
            s.estado = 'peleando';
            const d = Math.hypot(p.x - cuerpo.x, p.z - cuerpo.z);
            if (d <= alcance && Math.abs(p.y - cuerpo.y) < 2) {
                if (w.destino) w.parar();
                mirar(p, dt * 2); w.asentar(dt);
                return 'alcance';
            }
            relojBuscar += dt;
            if (!w.destino || w.estado === 'llego' || (relojBuscar >= repensar && Math.hypot(w.destino.x - p.x, w.destino.z - p.z) > alcance * 0.5)) {
                relojBuscar = 0;
                const q = cercaPisable(C, p.x, p.y, p.z, { ...N(), radioPisable: 2 }) || p;
                faseW = w.fase; w.ir(q);
            }
            const e = w.actualizar(dt, { detalle });
            s.moviendo = w.moviendo; s.fase += w.fase - faseW; faseW = w.fase;
            return e === 'sin-camino' ? 'sin-camino' : 'yendo';
        },
        // Quieto donde está, mirando a `p` (orden «Espérame aquí»; anota igual tu rastro)
        quedarse(dt, p) { s.evento = null; s.moviendo = false; if (torre) return; if (w.destino) w.parar(); s.estado = 'quieto'; if (p) mirar(p, dt); w.asentar(dt); },
        // Ir a un punto (volver a donde le dijiste que esperara). true al llegar
        irA(dt, p, detalle = true) {
            s.evento = null; s.moviendo = false;
            if (Math.hypot(p.x - cuerpo.x, p.z - cuerpo.z) < 0.6) { if (w.destino) w.parar(); return true; }
            if (!w.destino || Math.hypot(w.destino.x - p.x, w.destino.z - p.z) > 0.5) { faseW = w.fase; w.ir(p); }
            const e = w.actualizar(dt, { detalle });
            s.moviendo = w.moviendo; s.fase += w.fase - faseW; faseW = w.fase;
            if (e === 'sin-camino' || e === 'llego') { w.parar(); return true; }
            return false;
        },
        // Termina la pelea (o la espera de una orden): vuelve a tu rastro desde donde quedó
        dejar() { w.parar(); s.estado = 'siguiendo'; s.modo = 'rastro'; s.porque = null; i = -1; reloj = 0; andado = 0; yObj = NaN; },
        // lider: { x, y, z, yaw? }; visible(p) → ¿lo ve el líder?; detalle: cerca del jugador (mira los bloques)
        actualizar(dt, { lider, visible = () => false, detalle = true }) {
            const A = S(), NV = N();
            s.moviendo = false; s.evento = null;
            const dL = Math.hypot(cuerpo.x - lider.x, cuerpo.z - lider.z), dy = Math.abs(cuerpo.y - lider.y);
            if (restos.length) limpiarRestos(visible);
            // Muy lejos y nadie lo ve: aparece detrás del líder (si estaba en su torre, la deja)
            if (dL > A.radioAparecer && !visible(cuerpo) && aparecer(lider, visible)) { s.evento = 'aparecio'; return s.estado; }
            // Su torre (sube, espera arriba o baja rompiéndola)
            if (torre && pasoTorre(dt, lider, A, NV, detalle)) return s.estado;
            // Te subiste a un pilar: arma la suya al lado (si puede poner bloques)
            if (!torre && opciones.poner && lider.y - cuerpo.y >= A.torreAltura && dL <= A.torreCerca) {
                if ((relojTorre += dt) >= A.torreEspera && armarTorre(lider, NV)) return s.estado;
            } else relojTorre = 0;
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
    // ---- Torre ----
    // Columna junto a la tuya donde pueda pararse a su altura (lo que haya encima lo rompe al subir)
    function armarTorre(lider, NV) {
        const y0 = Math.round(cuerpo.y), lx = Math.floor(lider.x), lz = Math.floor(lider.z);
        relojTorre = 0;
        if (s.bloques <= 0) { s.evento = 'sinBloques'; return false; }
        let mejor = null, dm = Infinity;
        for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
            if (!dx && !dz) continue;
            const bx = lx + dx, bz = lz + dz, y = apoyo(C, bx + 0.5, y0, bz + 0.5, NV);
            if (!Number.isFinite(y) || y >= Math.round(lider.y)) continue;
            // Preferible libre hacia arriba (romper cuesta tiempo)
            let tapados = 0;
            for (let h = y + NV.alto; h < Math.round(lider.y) + NV.alto; h++) if (C.celda(bx, h, bz) !== LIBRE) tapados++;
            const d = Math.hypot(bx + 0.5 - cuerpo.x, bz + 0.5 - cuerpo.z) + Math.abs(y - y0) * 2 + tapados * 3 + (dx && dz ? 0.3 : 0);
            if (d < dm) { dm = d; mejor = { bx, bz, y }; }
        }
        if (!mejor) return false;
        torre = { fase: 'ir', ...mejor, bloques: [], reloj: 0 };
        s.estado = 'siguiendo'; s.modo = 'torre'; s.porque = null;
        faseW = w.fase; w.ir({ x: mejor.bx + 0.5, y: mejor.y, z: mejor.bz + 0.5 });
        return true;
    }
    // Deja la torre donde está (la quita después, cuando no la ves)
    function dejarTorre() {
        if (!torre) return;
        restos.push(...torre.bloques);
        torre = null; relojTorre = 0;
        if (s.modo === 'torre') { s.modo = 'rastro'; i = -1; }
    }
    function quitarRestos() {
        if (opciones.quitar) for (const b of restos.reverse()) opciones.quitar(b[0], b[1], b[2]);
        s.bloques += restos.length;
        restos.length = 0;
    }
    function limpiarRestos(visible) {
        // Mientras esté parado cerca de una, o la veas, se queda
        if (restos.some(b => Math.hypot(b[0] + 0.5 - cuerpo.x, b[2] + 0.5 - cuerpo.z) < 3 || visible({ x: b[0] + 0.5, y: b[1], z: b[2] + 0.5 }))) return;
        quitarRestos();
    }
    // Un cuadro de la torre. false: ya no está en la torre (sigue lo de siempre)
    function pasoTorre(dt, lider, A, NV, detalle) {
        const t = torre, cx = t.bx + 0.5, cz = t.bz + 0.5;
        s.moviendo = false; s.estado = 'siguiendo'; s.modo = 'torre';
        const dL = Math.hypot(cuerpo.x - lider.x, cuerpo.z - lider.z);
        if (dL > A.radioEspera) { dejarTorre(); return false; } // te teletransportaron: espera o aparece como siempre
        if (t.fase === 'ir') {
            const d = Math.hypot(cx - cuerpo.x, cz - cuerpo.z);
            if (d < 0.35 || (w.estado === 'llego' && d < 1.2)) {
                w.parar(); cuerpo.x = cx; cuerpo.z = cz; cuerpo.y = t.y; yObj = t.y;
                t.fase = 'subir'; t.reloj = 0;
                return true;
            }
            const e = w.actualizar(dt, { detalle });
            s.moviendo = w.moviendo; s.fase += w.fase - faseW; faseW = w.fase;
            if (e === 'sin-camino' || (e === 'llego' && d >= 1.2)) { torre = null; esperar('camino'); }
            return true;
        }
        mirar(lider, dt);
        const sobre = lider.y - t.y;
        if (t.fase === 'arriba') {
            if (sobre >= 1.5 && dL <= A.torreCerca && s.bloques > 0) { t.fase = 'subir'; t.reloj = 0; }
            else if (sobre <= -1.5 && t.bloques.length) { t.fase = 'bajar'; t.reloj = 0; }
            else if (dL > A.distancia + A.holgura + 1) { dejarTorre(); return false; } // te fuiste por arriba: te sigue
        } else if (t.fase === 'subir') {
            if (sobre < 0.5) t.fase = 'arriba';
            else {
                // ¿Le pusieron algo encima? Lo rompe primero (más lento que poner) y se lo guarda
                let tapa = -1;
                for (let h = NV.alto; h >= 1 && tapa < 0; h--) if (C.celda(t.bx, t.y + h, t.bz) !== LIBRE) tapa = t.y + h;
                t.reloj += dt;
                if (tapa >= 0) {
                    if (t.reloj >= A.torreRomper) {
                        t.reloj = 0;
                        if (opciones.romper && opciones.romper(t.bx, tapa, t.bz)) { s.bloques++; s.evento = 'rompe'; }
                        else t.fase = 'arriba'; // no se puede romper (roca madre, una mesa…): se queda donde llegó
                    }
                } else if (t.reloj >= A.torreCada) {
                    t.reloj = 0;
                    if (s.bloques <= 0) { t.fase = 'arriba'; s.evento = 'sinBloques'; }
                    else if (opciones.poner(t.bx, t.y, t.bz)) { t.bloques.push([t.bx, t.y, t.bz]); t.y++; s.bloques--; s.evento = 'salta'; }
                    else t.fase = 'arriba';
                }
            }
        } else if (t.fase === 'bajar') {
            if (sobre >= 1.5 && dL <= A.torreCerca && s.bloques > 0) { t.fase = 'subir'; t.reloj = 0; }
            else if ((t.reloj += dt) >= A.torreBajar) {
                t.reloj = 0;
                const b = t.bloques[t.bloques.length - 1];
                if (b && b[1] === t.y - 1) { if (opciones.quitar) opciones.quitar(b[0], b[1], b[2]); t.bloques.pop(); t.y--; s.bloques++; s.evento = 'rompe'; }
                if (!t.bloques.length) { torre = null; s.modo = 'rastro'; i = -1; cuerpo.y = t.y; yObj = NaN; return false; }
            }
        }
        // La altura sigue a los pies: sube de un salto, baja un poco más lento
        cuerpo.x = cx; cuerpo.z = cz;
        cuerpo.y += (t.y - cuerpo.y) * Math.min(1, dt * (t.y > cuerpo.y ? 18 : 10));
        if (Math.abs(t.y - cuerpo.y) < 0.02) cuerpo.y = t.y;
        cuerpo.yObj = t.y;
        return true;
    }
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
        dejarTorre();
        w.parar();
        cuerpo.x = x; cuerpo.y = y; cuerpo.z = z; cuerpo.yObj = y; yObj = y;
        s.estado = 'quieto'; s.modo = 'rastro'; s.porque = null; reloj = 0; andado = 0;
    }
    return s;
}
