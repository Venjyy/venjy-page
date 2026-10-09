// =========================================================
// VENJY · Supervivencia · Amistad jugador ↔ personaje (bloque 6a)
// Lógica pura (sin DOM): la usan misiones.js, tienda.js, hablar.js y mundo/tests/amistad.mjs.
// · 0-100 puntos por personaje y 5 niveles (NIVELES).
// · Puntos = inicial (según tu skin y la tabla de relaciones de 6c) + ganados, con tope 100.
//   La inicial no se guarda: si cambias de skin, los amigos te ven como a otra persona.
// · Se gana al hablar, completar sus misiones, regalarle su objeto favorito, jugar su minijuego,
//   comprarle en la tienda y pelear cerca de su zona; casi todo con tope por día de juego (10 min).
// · Se guarda dentro de misiones.estado (serializar/cargar): un guardado viejo sin amistad parte en blanco.
// =========================================================
import { O } from './objetos.js';
import { B } from '../texturas.js';
import { TIENDAS } from './tienda-datos.js';

export const PERSONAJES = ['venjy', 'pony', 'boris', 'moises', 'lalo', 'salonas', 'lona', 'hadad', 'andy', 'nacho', 'braulio', 'lucho', 'conejeros'];

export const NIVELES = [
    { min: 0, es: 'Desconocido', en: 'Stranger' },
    { min: 15, es: 'Conocido', en: 'Acquaintance' },
    { min: 35, es: 'Amigo', en: 'Friend' },
    { min: 60, es: 'Buen amigo', en: 'Good friend' },
    { min: 85, es: 'Íntimo', en: 'Close friend' }
];
export const MAX = 100;

// Puntos por acción y tope por personaje y día de juego (null = sin tope)
export const PUNTOS = {
    hablar: { p: 1, tope: 3 },       // por tema distinto escuchado ese día
    mision: { p: 12, tope: null },   // cada misión suya completada
    regalo: { p: 8, tope: 8 },       // un regalo favorito al día
    minijuego: { p: 4, tope: 8 },    // jugar; ganar suma `gana`
    gana: { p: 4, tope: null },      // extra al ganar (comparte el tope de minijuego)
    tienda: { p: 2, tope: 4 },       // por compra
    pelea: { p: 1, tope: 3 }         // monstruo eliminado a menos de RADIO_PELEA de él
};
export const RADIO_PELEA = 40;

// Nivel de relación de la tabla de 6c (0 no se conocen · 1 conocidos · 2 amigos · 3 mejores amigos · 4 pareja)
const PARES = {
    'venjy-pony': 2, 'venjy-boris': 3, 'venjy-moises': 2, 'venjy-lalo': 3, 'venjy-salonas': 3, 'venjy-lona': 4, 'venjy-hadad': 1, 'venjy-andy': 1,
    'venjy-nacho': 1, 'venjy-braulio': 2, 'venjy-lucho': 3, 'venjy-conejeros': 1,
    'pony-salonas': 2, 'pony-hadad': 2, 'pony-andy': 3, 'pony-nacho': 2, 'pony-braulio': 2, 'pony-conejeros': 2,
    'boris-lucho': 3,
    'moises-lalo': 3, 'moises-lona': 1,
    'lalo-lona': 1,
    'salonas-hadad': 1, 'salonas-andy': 2, 'salonas-nacho': 1, 'salonas-braulio': 2, 'salonas-conejeros': 3,
    'hadad-andy': 3, 'hadad-nacho': 3, 'hadad-braulio': 1, 'hadad-conejeros': 1,
    'andy-nacho': 3, 'andy-braulio': 2, 'andy-conejeros': 1,
    'nacho-braulio': 1, 'nacho-conejeros': 1,
    'braulio-conejeros': 2
};
export function relacion(a, b) {
    if (!a || !b || a === b) return 0;
    return PARES[`${a}-${b}`] ?? PARES[`${b}-${a}`] ?? 0;
}
// Puntos de partida por nivel de relación: cada relación cae justo en el nivel de amistad del mismo número
const INICIAL = [0, 15, 35, 60, 85];
// Decisiones del dueño (2026-10-09): la amistad inicial es la de la tabla también con skin de Venjy (sin piso);
// con la skin del mismo personaje (tu clon) partes en «Amigo».
export const CLON = 35;
export function inicialDe(base, clave) {
    if (!base) return 0;
    if (base === clave) return CLON;
    return INICIAL[relacion(base, clave)];
}
export function nivelDe(puntos) {
    let n = 0;
    for (let i = 0; i < NIVELES.length; i++) if (puntos >= NIVELES[i].min) n = i;
    return n;
}

// Venjy y Lona son novios (bloque 6b): con la skin de uno, el otro te ve como su pareja. El nivel más alto
// se llama «Pareja» en lugar de «Íntimo» y su animación es la de pareja (no el saludo secreto).
export const esPareja = (base, clave) => (base === 'venjy' && clave === 'lona') || (base === 'lona' && clave === 'venjy');
export const PAREJA = { es: 'Pareja', en: 'Partner' };
export const nombreNivel = (n, base, clave) => (n === NIVELES.length - 1 && esPareja(base, clave) ? PAREJA : NIVELES[n]);
// Animaciones por nivel de amistad (escena-amistad.js): nivel mínimo de cada una
export const NIVEL_ANIMACION = { punos: 2, abrazo: 3, secreto: 4, pareja: 4 };
export const animacionesDe = (base, clave) => ['punos', 'abrazo', esPareja(base, clave) ? 'pareja' : 'secreto'];

// Regalos favoritos (1 o 2 por personaje): solo esos se pueden regalar
export const FAVORITOS = {
    venjy: [O.PASTEL],
    pony: [O.SALMON_COCIDO, O.BACALAO_COCIDO],
    salonas: [O.REDSTONE, O.PAPEL],
    lona: [B.LANA, B.LANA_ROJA],
    hadad: [O.PAPA_ASADA],
    andy: [O.POLLO_ASADO],
    nacho: [O.CHULETA, O.FILETE],
    moises: [O.ESTOFADO],
    lalo: [O.PAN],
    boris: [O.MANZANA],
    lucho: [O.GALLETA],
    braulio: [O.HUESO],
    conejeros: [O.ZANAHORIA, O.PAPEL]
};

// Tienda: descuento por nivel. Precio ≥ 2 esmeraldas: baja el precio; precio 1: la yapa (más unidades).
// Solo en ofertas pagadas con esmeraldas y nunca deja comprar más barato de lo que alguien te compra (sin reventa).
export const DESCUENTO = [0, 0, 0.1, 0.2, 0.3];
// Unidades por esmeralda que paga la tienda que mejor compra cada objeto
const VENTA = (() => {
    const m = new Map();
    for (const t of Object.values(TIENDAS)) for (const v of t.compra || []) {
        const [id, n] = v.da, u = n / v.esm;
        if (!m.has(id) || u < m.get(id)) m.set(id, u);
    }
    return m;
})();
export function precioAmigo(oferta, nivel) {
    const d = DESCUENTO[nivel] || 0;
    const pide = oferta.pide, da = oferta.da;
    if (!d || pide.length !== 1 || pide[0][0] !== O.ESMERALDA || da.length !== 1) return { da, pide, rebaja: false };
    const p = pide[0][1], [id, n] = da[0];
    let p2 = p, n2 = n;
    if (p >= 2) p2 = Math.max(1, Math.round(p * (1 - d)));
    else if (n >= 2) n2 = n + Math.ceil(n * d);
    const u = VENTA.get(id);
    if (u !== undefined) {
        n2 = Math.max(n, Math.min(n2, Math.floor(p2 * u)));
        if (n2 / p2 > u) p2 = Math.max(p2, Math.ceil(n2 / u));
    }
    if (p2 === p && n2 === n) return { da, pide, rebaja: false };
    return { da: [[id, n2]], pide: [[O.ESMERALDA, p2]], rebaja: true };
}

// ¿Se cumple un requisito de tema? req: { nivel, mision, mj (juego o marca), jefe }; todos deben cumplirse
export function cumple(req, nivel, h) {
    if (!req) return true;
    if (req.nivel !== undefined && nivel < req.nivel) return false;
    if (req.mision && !h.hechas.has(req.mision)) return false;
    if (req.mj && !h.minijuegos.has(req.mj)) return false;
    if (req.jefe && !h.jefes.has(req.jefe)) return false;
    return true;
}

// ---------------------------------------------------------
// Estado por jugador. ctx: dia() -> número de día de juego, base() -> clave de la base de tu skin o null
// ---------------------------------------------------------
export function crearAmistad(ctx) {
    let ganados = {};          // clave -> puntos ganados
    let hoy = {};              // clave -> { d, hablar, regalo, minijuego, tienda, pelea, temas: [] }
    let alSubir = null;        // (clave, nivel) al subir de nivel

    const puntos = clave => Math.min(MAX, inicialDe(ctx.base(), clave) + (ganados[clave] || 0));
    const nivel = clave => nivelDe(puntos(clave));
    function registroDe(clave) {
        const d = ctx.dia();
        let r = hoy[clave];
        if (!r || r.d !== d) { r = { d, hablar: 0, regalo: 0, minijuego: 0, tienda: 0, pelea: 0, temas: [] }; hoy[clave] = r; }
        return r;
    }
    // Suma puntos por un motivo (respeta el tope del día). Devuelve los puntos sumados.
    function sumar(clave, motivo, extra = 0) {
        if (!PERSONAJES.includes(clave)) return 0;
        const def = PUNTOS[motivo];
        if (!def) return 0;
        const cat = motivo === 'gana' ? 'minijuego' : motivo;
        let p = def.p + extra;
        if (def.tope !== null || motivo === 'gana') {
            const r = registroDe(clave), tope = PUNTOS[cat].tope;
            p = Math.max(0, Math.min(p, tope - r[cat]));
            r[cat] += p;
        }
        if (!p) return 0;
        const antes = nivel(clave);
        ganados[clave] = (ganados[clave] || 0) + p;
        const ahora = nivel(clave);
        if (ahora > antes && alSubir) alSubir(clave, ahora);
        return p;
    }
    // Hablar: suma solo por temas distintos del día
    function hablar(clave, tema) {
        const r = registroDe(clave);
        if (r.temas.includes(tema)) return 0;
        r.temas.push(tema);
        return sumar(clave, 'hablar');
    }
    const regaloHoy = clave => registroDe(clave).regalo > 0;

    return {
        puntos, nivel, sumar, hablar, regaloHoy, registroDe,
        inicial: clave => inicialDe(ctx.base(), clave),
        ganados: clave => ganados[clave] || 0,
        set alSubir(f) { alSubir = f; },
        serializar: () => ({ ganados: { ...ganados }, hoy: JSON.parse(JSON.stringify(hoy)) }),
        cargar(o) {
            ganados = {}; hoy = {};
            if (!o) return;
            for (const k of PERSONAJES) if (Number.isFinite(o.ganados?.[k])) ganados[k] = Math.max(0, o.ganados[k]);
            if (o.hoy && typeof o.hoy === 'object') for (const k of PERSONAJES) if (o.hoy[k]) hoy[k] = { hablar: 0, regalo: 0, minijuego: 0, tienda: 0, pelea: 0, temas: [], ...o.hoy[k] };
        }
    };
}
