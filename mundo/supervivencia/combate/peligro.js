// =========================================================
// VENJY · Combate · ataques peligrosos, mikiri, golpe final y espíritu (bloque 8 · L3, mundo/COMBATE.md §16.1 y §16.4)
// Puro: sin Three.js ni DOM. Lo usa la arena (arena/modelo.js) con las reglas del que recibe (o del que ataca, en el
// aviso); los valores vienen de estilo-*.json → reglas.peligro, mikiri, remate y espiritu (lo que falte, PELIGRO_BASE).
//   reglasPeligro(estilo)               reglas del estilo fundidas sobre PELIGRO_BASE
//   avisoDe(p, R)                       el peligro que se está avisando ('barrido' | 'estocada' | 'agarre' | …) o null:
//                                       desde anticipación + aviso hasta que empieza el activo
//   responder(R, p, golpe, resultado)   la tabla de §16.4: lo que el motor dijo pasa a 'golpeado' si esa defensa no
//                                       sirve contra ese peligro, y a 'esquivado' si el que recibe va saltando y saltar
//                                       sí sirve. golpe.rompeGuardia (la patada): la guardia mantenida no la para.
//   ajusteVentana(R, golpe)             cuadros que se suman a la ventana del desvío (la estocada, −2)
//   esMikiri(R, p, o)                   ¿p acaba de empezar una esquiva hacia o justo cuando o tira una estocada
//                                       (desde el aviso hasta activo + hasta)?
//   puedeRematar(R, F, O)               ¿F puede dar el golpe final a O (desequilibrado, a su alcance, F libre)?
//   crearEspiritu(R) / ganarEspiritu(s, resultado) / gastarEspiritu(s, n)   segmentos del arte de combate
//   ganarPorDano(s, R, hecho, recibido)  la barra SPA de Urban Reign (L6b): se llena con el daño hecho y el recibido
// =========================================================
import { inicioFase } from './datos.js';
import { LIBRES } from './estados.js';

export const PELIGRO_BASE = {
    peligro: {
        aviso: 4, destello: 2,
        respuestas: {
            barrido: { desvio: false, guardia: false, salto: true, esquiva: true },
            estocada: { desvio: true, guardia: false, salto: false, esquiva: true, ventana: -2 },
            agarre: { desvio: false, guardia: false, salto: true, esquiva: true },
            imparable: { desvio: false, guardia: false, salto: false, esquiva: true }
        }
    },
    mikiri: { accion: 'mikiri', hasta: 2, umbral: 0.5 },
    remate: { accion: 'remate', alcance: 2.8 },
    // porHecho / porRecibido (L6b, la barra SPA de Urban Reign): un segmento por cada tanto de daño hecho o recibido (0 = no)
    espiritu: { segmentos: 3, perfecto: 1, desvio: 0.34, porHecho: 0, porRecibido: 0 }
};
const objeto = v => v && typeof v === 'object' && !Array.isArray(v);
function fundir(base, extra) {
    const o = {};
    for (const k of new Set([...Object.keys(base), ...Object.keys(objeto(extra) ? extra : {})])) {
        const b = base[k], e = objeto(extra) ? extra[k] : undefined;
        if (e === undefined) o[k] = objeto(b) ? fundir(b, null) : b;
        else if (objeto(b) && objeto(e)) o[k] = fundir(b, e);
        else if (b === undefined || b === null || typeof e === typeof b) o[k] = e;
        else o[k] = b;
    }
    return o;
}
export const reglasPeligro = estilo => fundir(PELIGRO_BASE, estilo && estilo.reglas);

export function avisoDe(p, R) {
    const def = p && p.def;
    if (!def || !def.peligro || p.estado !== 'ataque') return null;
    const g = inicioFase(def.fases, 'activo');
    return p.c >= R.peligro.aviso && p.c < g ? def.peligro : null;
}

export function responder(R, p, golpe, resultado) {
    const t = golpe.peligro && R.peligro.respuestas[golpe.peligro];
    if (t) {
        if (p.estado === 'salto' && resultado === 'golpeado' && t.salto) return 'esquivado';
        if ((resultado === 'desviado' || resultado === 'perfecto') && !t.desvio) return 'golpeado';
        if (resultado === 'bloqueado' && !t.guardia) return 'golpeado';
        if (resultado === 'esquivado' && !t.esquiva) return 'golpeado';
    }
    if (golpe.rompeGuardia && resultado === 'bloqueado') return 'golpeado';
    return resultado;
}
export function ajusteVentana(R, golpe) {
    const t = golpe && golpe.peligro && R.peligro.respuestas[golpe.peligro];
    return (t && t.ventana) || 0;
}

// p: el que esquiva (su esquiva empezó en este cuadro, con p.dir hacia adelante); o: el rival
export function esMikiri(R, p, o, esquiva) {
    if (!p.def || p.clave !== esquiva || p.c > 1 || !(p.dir[0] >= R.mikiri.umbral)) return false;
    const d = o.def;
    if (!d || o.estado !== 'ataque' || d.peligro !== 'estocada') return false;
    const g = inicioFase(d.fases, 'activo');
    return o.c >= R.peligro.aviso && o.c <= g + R.mikiri.hasta;
}

// F y O: peleadores de la arena ({ p, x, z, post }); el desequilibrado es la reacción de la postura rota de O
export function puedeRematar(R, F, O) {
    const k = O.post && O.post.R.postura.desequilibrado;
    if (!O.post || !O.post.roto || O.p.clave !== k) return false;
    if (!LIBRES.has(F.p.estado) && !(F.p.estado === 'ataque' && F.p.def && F.p.c >= inicioFase(F.p.def.fases, 'recuperacion'))) return false;
    return Math.hypot(O.x - F.x, O.z - F.z) <= R.remate.alcance;
}

export const crearEspiritu = R => ({ valor: 0, tope: R.espiritu.segmentos });
export function ganarEspiritu(s, R, resultado) {
    const n = resultado === 'perfecto' ? R.espiritu.perfecto : resultado === 'desviado' ? R.espiritu.desvio : 0;
    s.valor = Math.min(s.tope, s.valor + n);
    return s;
}
export function ganarPorDano(s, R, hecho = 0, recibido = 0) {
    const E = R.espiritu;
    const n = (E.porHecho > 0 ? hecho / E.porHecho : 0) + (E.porRecibido > 0 ? recibido / E.porRecibido : 0);
    if (n > 0) s.valor = Math.min(s.tope, s.valor + n);
    return s;
}
export function gastarEspiritu(s, n = 1) {
    if (s.valor + 1e-9 < n) return false;
    s.valor = Math.max(0, s.valor - n);
    return true;
}
