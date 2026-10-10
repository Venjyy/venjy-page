// =========================================================
// VENJY · Ping de la sala cooperativa (bloque 7e) · lógica pura, sin DOM ni red
// - RTT directo (WebRTC y sala local): `rttDeStats` lee el candidate-pair activo de getStats().
// - RTT por el respaldo de Supabase: eco a cuestas del mensaje `p` (campo `ec`, cero mensajes nuevos):
//   cada equipo devuelve [t del último `p` recibido de ese par, ms que lo retuvo] y el emisor calcula
//   RTT = ahora − t − retenido (al estilo NTP: no hace falta que los relojes coincidan).
// - Desfase de reloj con el anfitrión (para 7g y 7h-3): con el RTT, la hora del anfitrión es
//   t + RTT/2 en el momento en que llega su `p`; se toma la mediana de las últimas muestras.
// - Colores del indicador: verde < 80 ms, amarillo < 150 ms, rojo ≥ 150 ms.
// =========================================================
export const LIMITE_VERDE = 80;
export const LIMITE_AMARILLO = 150;
const MAX_RTT = 10000;   // ms: más que eso es basura (o un eco viejo)
const MAX_RETENIDO = 5000;

// 0 verde · 1 amarillo · 2 rojo · null sin medida
export function nivelDeMs(ms) {
    if (ms == null || !Number.isFinite(ms)) return null;
    return ms < LIMITE_VERDE ? 0 : ms < LIMITE_AMARILLO ? 1 : 2;
}

// Barras de señal (de 1 a 4) para un nivel: rojo 1, amarillo 2-3, verde 4
export function barrasDeMs(ms) {
    const n = nivelDeMs(ms);
    if (n === null) return 0;
    if (n === 2) return 1;
    if (n === 1) return ms < 115 ? 3 : 2;
    return 4;
}

// RTT por eco: `ahora` del que recibe el eco, `t` el del emisor original, `retenido` lo que lo guardó el otro
export function rttDeEco(ahora, t, retenido) {
    const r = ahora - t - retenido;
    if (!Number.isFinite(r) || r < -5 || r > MAX_RTT) return null;
    return Math.max(0, r);
}

// getStats(): candidate-pair activo → RTT en ms (o null). `reportes` es cualquier iterable de objetos
// (en el navegador, el RTCStatsReport; en la prueba, un arreglo).
export function rttDeStats(reportes) {
    const lista = [...(typeof reportes.values === 'function' ? reportes.values() : reportes)];
    let elegido = null;
    for (const r of lista) if (r.type === 'transport' && r.selectedCandidatePairId) elegido = r.selectedCandidatePairId;
    let mejor = null;
    for (const r of lista) {
        if (r.type !== 'candidate-pair' || typeof r.currentRoundTripTime !== 'number') continue;
        const activo = r.id === elegido || r.selected === true || (r.nominated === true && r.state === 'succeeded');
        if (!activo) continue;
        if (!mejor || r.id === elegido) mejor = r;
    }
    if (!mejor) return null;
    const ms = mejor.currentRoundTripTime * 1000;
    return Number.isFinite(ms) && ms >= 0 && ms < MAX_RTT ? Math.round(ms * 10) / 10 : null;
}

const mediana = v => {
    const o = [...v].sort((a, b) => a - b), n = o.length;
    return n % 2 ? o[(n - 1) / 2] : (o[n / 2 - 1] + o[n / 2]) / 2;
};

// Mediana de las últimas N medidas: un pico suelto no cambia el color
export class Suave {
    constructor(n = 5) { this.n = n; this.l = []; }
    agregar(ms) {
        if (ms == null || !Number.isFinite(ms)) return;
        this.l.push(ms);
        if (this.l.length > this.n) this.l.shift();
    }
    get valor() { return this.l.length ? Math.round(mediana(this.l)) : null; }
    reiniciar() { this.l = []; }
}

// Desfase de reloj local → anfitrión (ms): hora del anfitrión = hora local + desfase
export class RelojAnfitrion {
    constructor(n = 9) { this.n = n; this.l = []; }
    // tAnfitrion: campo `t` de un `p` del anfitrión; ahora: hora local al recibirlo; rtt: ida y vuelta medida
    agregar(tAnfitrion, ahora, rtt) {
        if (!Number.isFinite(tAnfitrion) || !Number.isFinite(rtt)) return;
        this.l.push(tAnfitrion + rtt / 2 - ahora);
        if (this.l.length > this.n) this.l.shift();
    }
    get listo() { return this.l.length > 0; }
    get desfase() { return this.l.length ? mediana(this.l) : 0; }
    // Hora del anfitrión «ahora» según el reloj local
    anfitrion(ahora) { return ahora + this.desfase; }
}

// Eco: anota el último `p` recibido de cada par y arma lo que se devuelve
export class Eco {
    constructor() { this.vistos = new Map(); }
    anotar(de, t, ahora) { if (Number.isFinite(t)) this.vistos.set(de, { t, rec: ahora }); }
    // [t del par, ms que lo retuve] o null si no hay nada fresco
    para(de, ahora) {
        const v = this.vistos.get(de);
        if (!v) return null;
        const ret = Math.round(ahora - v.rec);
        return ret >= 0 && ret <= MAX_RETENIDO ? [v.t, ret] : null;
    }
    olvidar(de) { this.vistos.delete(de); }
}

// Ids cortos para el eco del anfitrión (una lista corta en cada `p`; solo hay invitados de respaldo, ≤ 3)
export const idCorto = id => String(id).slice(0, 6);

// Anfitrión: eco para varios invitados → [[idCorto, t, retenido], …]
export function ecoDeLista(eco, ids, ahora) {
    const l = [];
    for (const id of ids) { const e = eco.para(id, ahora); if (e) l.push([idCorto(id), e[0], e[1]]); }
    return l.length ? l : null;
}

// Invitado: busca su fila en el eco del anfitrión → [t, retenido] o null
export function ecoPropio(lista, miId) {
    if (!Array.isArray(lista)) return null;
    const c = idCorto(miId);
    for (const f of lista) if (Array.isArray(f) && f[0] === c && Number.isFinite(f[1]) && Number.isFinite(f[2])) return [f[1], f[2]];
    return null;
}
