// =========================================================
// VENJY · Combate · postura y desvío de Sekiro (bloque 8 · L2, mundo/COMBATE.md §16.1)
// Puro: sin Three.js ni DOM. Lo usa la arena (arena/modelo.js) por cada peleador; los valores vienen de
// estilo-*.json → reglas (lo que falte usa POSTURA_BASE). Un cuadro = 1/60 s (paso fijo de combate/estados.js).
//   reglasPostura(estilo)              reglas del estilo fundidas sobre POSTURA_BASE
//   crearPostura(reglas, tope)         { valor, tope, calma, toques, ultimoToque, perfecto, ventana, roto }
//   tocarDefensa(s, cuadro, tactil)    un toque de defensa: calcula la ventana del desvío que empieza (con la
//                                      penalización por repetir) y la guarda en s.perfecto / s.ventana
//   clasificar(s, p, resultado)        para estados.recibir (reglas.alRecibir): un 'desviado' del motor pasa a
//                                      'perfecto', 'desviado', 'bloqueado' o 'golpeado' según el cuadro del desvío
//   sumar(s, n)                        suma postura; true si llegó al tope (se rompe)
//   pasoPostura(s, { vida, bloqueo, activo })   un cuadro: baja sola tras `espera` s de calma
//   romper(s) / recomponer(s)          al tope / al terminar el desequilibrio (queda en trasRomper × tope)
//   fraccion(s), cansado(s)            para el HUD y la respiración
// =========================================================
export const POSTURA_BASE = {
    postura: { baja: 12, espera: 1, vidaMin: 0.4, guardia: 1.5, cansancio: 0.7, trasRomper: 0.5, desequilibrado: 'desequilibrado' },
    tabla: {
        golpeado: { recibe: 0.5, atacante: 0, extra: 0 },
        bloqueado: { recibe: 1, atacante: 0, extra: 0 },
        desviado: { recibe: 0.3, atacante: 0.5, extra: 0 },
        perfecto: { recibe: 0, atacante: 1, extra: 8 }
    },
    desvio: { perfecto: 5, ventana: 11, tactil: 2, repetir: { dentro: 30, quita: 3, minimo: 3, recupera: 45 }, choque: null, choquePerfecto: null },
    bloqueoDano: null
};
const HZ = 60;
const objeto = v => v && typeof v === 'object' && !Array.isArray(v);
function fundir(base, extra) {
    const o = {};
    for (const k of new Set([...Object.keys(base), ...Object.keys(objeto(extra) ? extra : {})])) {
        const b = base[k], e = objeto(extra) ? extra[k] : undefined;
        if (e === undefined) o[k] = objeto(b) ? fundir(b, null) : b;
        else if (objeto(b) && objeto(e)) o[k] = fundir(b, e);
        else if (b === null || b === undefined || typeof e === typeof b) o[k] = e;
        else o[k] = b;
    }
    return o;
}
export const reglasPostura = estilo => fundir(POSTURA_BASE, estilo && estilo.reglas);

export function crearPostura(reglas, tope = 100) {
    return { R: reglas, valor: 0, tope, calma: 0, toques: 0, ultimoToque: -1e9, perfecto: reglas.desvio.perfecto, ventana: reglas.desvio.ventana, roto: false };
}

// Cada toque dentro de `dentro` c del anterior quita `quita` c a la ventana y al perfecto (la ventana nunca baja de
// `minimo`); `recupera` c sin tocar la devuelven entera. En el celular, +tactil a cada tramo.
export function tocarDefensa(s, cuadro, tactil = false) {
    const D = s.R.desvio, rp = D.repetir, desde = cuadro - s.ultimoToque;
    if (desde >= rp.recupera) s.toques = 0;
    else if (desde <= rp.dentro) s.toques++;
    s.ultimoToque = cuadro;
    const quita = s.toques * rp.quita, extra = tactil ? D.tactil : 0;
    s.ventana = Math.max(rp.minimo, D.ventana - quita) + extra;
    s.perfecto = Math.max(0, D.perfecto - quita) + (D.perfecto - quita > 0 ? extra : 0);
    return s;
}

// p: el peleador que recibe (estados.js); resultado: lo que dijo el motor. Solo cambia los desvíos: el motor deja
// pasar como 'desviado' toda la fase activa del desvío y aquí se mide con la ventana del toque.
export function clasificar(s, p, resultado) {
    if (resultado !== 'desviado' || !p || p.estado !== 'desvio') return resultado;
    // En el choque de un desvío anterior no hay ventana: cada golpe pide su toque (cancela a desvío desde activo+N)
    if (p.clave !== p.estilo?.controles?.defensa) return p.defensa ? 'bloqueado' : 'golpeado';
    if (p.c < s.perfecto) return 'perfecto';
    if (p.c < s.ventana) return 'desviado';
    return p.defensa ? 'bloqueado' : 'golpeado';
}

export function sumar(s, n) {
    if (!(n > 0) || s.roto) return false;
    s.valor = Math.min(s.tope, s.valor + n);
    s.calma = 0;
    return s.valor >= s.tope;
}
export function romper(s) { s.roto = true; s.valor = s.tope; }
export function recomponer(s) { s.roto = false; s.valor = s.tope * s.R.postura.trasRomper; s.calma = 0; }

// vida: 0..1; bloqueo: la guardia mantenida; activo: atacó o lo golpearon en este cuadro (corta la calma)
export function pasoPostura(s, { vida = 1, bloqueo = false, activo = false } = {}) {
    const P = s.R.postura;
    if (s.roto) return s;
    if (activo) { s.calma = 0; return s; }
    s.calma++;
    if (s.calma <= P.espera * HZ) return s;
    const k = (P.vidaMin + (1 - P.vidaMin) * Math.max(0, Math.min(1, vida))) * (bloqueo ? P.guardia : 1);
    s.valor = Math.max(0, s.valor - P.baja * k / HZ);
    return s;
}
export const fraccion = s => (s.tope > 0 ? s.valor / s.tope : 0);
export const cansado = s => fraccion(s) >= s.R.postura.cansancio;
