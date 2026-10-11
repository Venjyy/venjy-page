// =========================================================
// VENJY · Supervivencia · Menú «Rendimiento» (7b-2)
// Lógica pura, sin DOM ni three: preajustes, normalización de lo guardado, límite de FPS,
// distancia automática (portada de mundo/main.js `autoAjustar`) y estadística de cuadros.
// Lo cablea main.js; la prueba es mundo/tests/rendimiento.mjs.
// =========================================================

export const CLAVE = 'venjy-sv-rendimiento';
export const LIMITES_FPS = [0, 30, 60];          // 0 = libre
export const NIVELES_PARTICULAS = ['todas', 'pocas', 'minimas'];
export const SALTOS_LEJANOS = [1, 2, 4];         // personajes a más de RADIO_LEJOS: 1 de cada N cuadros
export const FACTOR_PARTICULAS = { todas: 1, pocas: 0.4, minimas: 0.12 };
export const ESCALA = { min: 0.5, max: 1.5, paso: 0.05 };
export const DISTANCIA = { min: 4, max: 14 };
export const RADIO_LEJOS = 60;                   // bloques; el mismo que usa criaturas/animales.js (`RADIO_DETALLE`)

// Preajustes. «equilibrado» es lo que había antes del menú (distancia 8, escala min(dpr, 1,5), todo encendido).
// `escala` es función del dpr del equipo para que «equilibrado» siga igual en pantallas de 1× y de 2×.
const escalaNativa = dpr => Math.min(dpr || 1, 1.5);
export const PRESETS = {
    rapido: dpr => ({ distancia: 5, escala: Math.min(0.75, escalaNativa(dpr)), particulas: 'pocas', nubes: false, lejos: 4, limite: 0, auto: true }),
    equilibrado: dpr => ({ distancia: 8, escala: escalaNativa(dpr), particulas: 'todas', nubes: true, lejos: 2, limite: 0, auto: false }),
    bonito: dpr => ({ distancia: 12, escala: 1.5, particulas: 'todas', nubes: true, lejos: 1, limite: 0, auto: false })
};
export const NOMBRES_PRESET = ['rapido', 'equilibrado', 'bonito'];
const CAMPOS = ['distancia', 'escala', 'particulas', 'nubes', 'lejos', 'limite', 'auto'];

const redondear = (v, paso) => Math.round(v / paso) * paso;
const entre = (v, a, b) => Math.min(b, Math.max(a, v));
const cercano = (v, lista) => lista.reduce((m, x) => (Math.abs(x - v) < Math.abs(m - v) ? x : m), lista[0]);

// Valida un objeto cualquiera (lo leído de localStorage) y completa con el preajuste equilibrado.
export function normalizar(crudo, dpr = 1) {
    const base = PRESETS.equilibrado(dpr);
    const c = crudo && typeof crudo === 'object' ? crudo : {};
    const num = (v, def) => (typeof v === 'number' && isFinite(v) ? v : def);
    const r = {
        distancia: entre(Math.round(num(c.distancia, base.distancia)), DISTANCIA.min, DISTANCIA.max),
        escala: +entre(redondear(num(c.escala, base.escala), ESCALA.paso), ESCALA.min, ESCALA.max).toFixed(2),
        particulas: NIVELES_PARTICULAS.includes(c.particulas) ? c.particulas : base.particulas,
        nubes: typeof c.nubes === 'boolean' ? c.nubes : base.nubes,
        lejos: cercano(num(c.lejos, base.lejos), SALTOS_LEJANOS),
        limite: cercano(num(c.limite, base.limite), LIMITES_FPS),
        auto: typeof c.auto === 'boolean' ? c.auto : base.auto,
        fps: typeof c.fps === 'boolean' ? c.fps : true,   // contador de FPS: hoy siempre visible
        ms: typeof c.ms === 'boolean' ? c.ms : false      // ms por cuadro junto a los FPS
    };
    return r;
}

// Qué preajuste coincide con la configuración (o 'personalizado' si ninguno).
export function presetDe(cfg, dpr = 1) {
    for (const k of NOMBRES_PRESET) {
        const p = PRESETS[k](dpr);
        if (CAMPOS.every(f => (f === 'escala' ? Math.abs(p[f] - cfg[f]) < 0.026 : p[f] === cfg[f]))) return k;
    }
    return 'personalizado';
}

// Aplica un preajuste sobre la configuración: solo toca los campos del preajuste (no fps ni ms).
export function aplicarPreset(cfg, nombre, dpr = 1) {
    const f = PRESETS[nombre];
    if (!f) return cfg;
    const p = f(dpr);
    for (const k of CAMPOS) cfg[k] = k === 'escala' ? +redondear(p[k], ESCALA.paso).toFixed(2) : p[k];
    return cfg;
}

// ---------------------------------------------------------
// Límite de FPS. `toca(ahora_ms)` dice si este requestAnimationFrame debe dibujar.
// Con un objetivo que avanza de a `intervalo` (no «tiempo desde el último») para que 144 Hz con
// límite 60 dé 60 y no 48.
// ---------------------------------------------------------
export class LimitadorFps {
    constructor(limite = 0) { this.fijar(limite); }
    fijar(limite) { this.limite = limite > 0 ? limite : 0; this.intervalo = this.limite ? 1000 / this.limite : 0; this.objetivo = 0; }
    toca(ahora) {
        if (!this.limite) return true;
        if (ahora + 1 < this.objetivo) return false;               // 1 ms de tolerancia al reloj del navegador
        this.objetivo = this.objetivo && ahora - this.objetivo < this.intervalo * 2 ? this.objetivo + this.intervalo : ahora + this.intervalo;
        return true;
    }
}

// ---------------------------------------------------------
// Distancia automática (portada de mundo/main.js `autoAjustar`): el slider es el máximo; baja un chunk si
// los FPS promedio de 3 ventanas de 3 s son bajos y sube uno si sobran 10 s seguidos.
// Con límite de FPS, los umbrales se miden contra el límite y no contra 60.
// ---------------------------------------------------------
export class AutoDistancia {
    constructor() { this.reiniciar(); }
    reiniciar() { this.tiempo = 0; this.ultimoCambio = -99; this.ventana = 0; this.ventanaFps = 0; this.medidas = []; this.alto = 0; }
    // fps: medidos en `paso` segundos. En: { activo, cargando, actual, max, objetivo (FPS, 60 si libre), minimo }
    // Devuelve la distancia nueva o null si no cambia.
    paso(fps, paso, { activo = true, cargando = false, actual, max, objetivo = 60, minimo = 5 }) {
        if (!activo || cargando) { this.ventana = 0; this.ventanaFps = 0; this.alto = 0; return null; }
        this.tiempo += paso;
        this.ventana += paso; this.ventanaFps += fps * paso;
        this.alto = fps > objetivo * 0.97 ? this.alto + paso : 0;
        if (this.ventana >= 3) {
            this.medidas.push(this.ventanaFps / this.ventana);
            if (this.medidas.length > 3) this.medidas.shift();
            this.ventana = 0; this.ventanaFps = 0;
        }
        if (this.tiempo < 6 || this.tiempo - this.ultimoCambio < 5) return actual > max ? this._cambio(max) : null;
        const prom = this.medidas.reduce((a, b) => a + b, 0) / (this.medidas.length || 1);
        let nueva = actual;
        if (this.medidas.length >= 3 && prom < objetivo * 0.67 && actual > minimo) nueva = actual - 1;
        else if (this.alto >= 10 && actual < max) nueva = actual + 1;
        else if (actual > max) nueva = max;
        return nueva !== actual ? this._cambio(nueva) : null;
    }
    _cambio(n) { this.ultimoCambio = this.tiempo; this.medidas.length = 0; this.alto = 0; return n; }
}

// ---------------------------------------------------------
// Estadística de los últimos N cuadros (ms de trabajo de CPU por cuadro).
// ---------------------------------------------------------
export class Cuadros {
    constructor(n = 120) { this.n = n; this.v = []; }
    agregar(ms) { this.v.push(ms); if (this.v.length > this.n) this.v.shift(); }
    percentil(p) {
        if (!this.v.length) return 0;
        const o = [...this.v].sort((a, b) => a - b);
        return o[Math.min(o.length - 1, Math.floor(p * o.length))];
    }
    get mediana() { return this.percentil(0.5); }
    get p95() { return this.percentil(0.95); }
}

export { pasoLejano, LOD } from '../criaturas/lod.js';
