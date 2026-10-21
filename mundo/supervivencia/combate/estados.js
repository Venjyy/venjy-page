// =========================================================
// VENJY · Combate · máquina de estados del peleador (bloque 8 · N3, mundo/COMBATE.md §15.2)
// Pura: sin Three.js ni DOM. Una sola máquina para el jugador, la CPU, los monstruos y los jefes con rig de persona;
// lo que cambia entre estilos son los datos (estilo-*.json: controles, ataques, acciones) y reglas chicas que se
// enchufan en recibir(). Corre a paso fijo (crearRelojFijo, 60 Hz): un llamado a paso() es un cuadro de los datos.
//   crearPeleador(estilo, { tactil })   estado inicial (guardia)
//   paso(p, intencion)                  un cuadro: lee la intención, guarda el buffer, avanza el estado y deja en
//                                       p.mov lo que se desplazó ([adelante, lado] en bloques) y en p.eventos lo que
//                                       pasó ({ tipo: 'inicio' | 'activo' | 'fin', clave })
//   recibir(p, golpe, reglas)           un golpe que llega: 'sinEfecto' | 'armadura' | 'esquivado' | 'desviado' |
//                                       'bloqueado' | 'golpeado' (con su reacción), en el orden de prioridad de §15.2
//   reaccionar(p, clave)                pasa a una reacción (la del que recibe, o «desviado» del atacante)
//   congelar(p, n)                      hitstop: n cuadros sin avanzar (el buffer sigue guardando)
//   conecto(p)                          el ataque actual pegó (abre las cancelaciones con siConecto)
//   cargaDe(p)                          0..1: cuánto cargó el ataque actual (def.carga: se queda en el cuadro `en`
//                                       mientras se mantiene su intención, hasta `max` cuadros)
//   alcanza(ataque, de, a)              ¿el objetivo está dentro del alcance y el arco del ataque?
//   crearRelojFijo(hz, maxPasos)        acumulador: avanzar(dt, fn) llama a fn las veces que toque y devuelve alfa
// Intención (la arma combate/intenciones.js en N4, o la CPU): { mover: [x, y], altura, atacar, defensa, esquivar,
// agarre, especial, saltar, fuerte, accion }, cada botón 'apretar' (este cuadro), 'mantener' o 'soltar'; accion: la
// clave de un ataque o una acción que empieza directo desde un estado libre (la CPU y los ataques peligrosos, L3);
// sostener: cuadros que el ataque en curso se queda en su último cuadro de anticipación (la CPU, L4: tajos retrasados
// y la anticipación mínima por dificultad; el jugador nunca lo manda).
// =========================================================
import { COMBATE, accionDe, largoFases, inicioFase, marca, enTramos, esAtaque } from './datos.js';
import { curva } from '../../datos/curvas.js';

export const LIBRES = new Set(['guardia', 'paso', 'bloqueo']);
export const SIN_INTERRUMPIR = new Set(['contra', 'remate', 'rematado']);
export const TERMINALES = new Set(['muerto', 'victoria']);
export const BOTONES = ['defensa', 'atacar', 'fuerte', 'esquivar', 'agarre', 'especial', 'saltar'];

export function crearPeleador(estilo, { tactil = false } = {}) {
    return {
        estilo, tactil,
        estado: 'guardia', clave: null, def: null, c: 0,
        conecto: false, congelado: 0, quieto: false, buffer: null, defensa: false, carga: 0, cargando: false,
        mover: [0, 0], dir: [1, 0], mov: [0, 0], velocidad: 0, sostener: 0,
        cambio: { n: 0, mezcla: 0 }, eventos: [], cuadros: 0
    };
}

const objeto = v => v && typeof v === 'object' && !Array.isArray(v);
const maxBuffer = p => (p.tactil ? COMBATE.tactil.buffer : COMBATE.entrada.buffer);

// ---------- Destino de una intención guardada ----------
// Un control por altura ({ alto, medio, bajo, neutro, adelante }): `adelante` es el de la altura neutra con el cuerpo
// yendo hacia el rival (Urban Reign, §17.3: adelante + clic = medio)
function controlDe(p, e) {
    let k = (p.estilo.controles || {})[e.tipo];
    if (objeto(k)) k = (e.adelante && k.adelante) || k[e.altura] || k.medio || k.neutro || null;
    return k || null;
}
export function destino(p, e) {
    if (TERMINALES.has(p.estado)) return null;
    const objetivo = controlDe(p, e);
    if (LIBRES.has(p.estado)) return objetivo && (accionDe(p.estilo, objetivo) || LIBRES.has(objetivo)) && objetivo !== p.estado ? objetivo : null;
    if (!p.def) return null;
    const f = p.def.fases, fin = largoFases(f) - 1;
    for (const v of p.def.cancelar || []) {
        if (v.siConecto && !p.conecto) continue;
        const d = marca(v.desde, f), h = v.hasta === undefined ? fin : marca(v.hasta, f);
        if (d === null || h === null || p.c < d || p.c > h) continue;
        if (v.altura && v.altura !== (e.adelante ? 'adelante' : e.altura)) continue; // (el castigo bajo de la esquiva neutra)
        // Un ataque de la lista que responda a esta intención (combos); si el control apunta a uno de ellos, ese
        const ataques = v.a.filter(k => esAtaque(p.estilo, k) && (p.estilo.ataques[k].intencion || 'atacar') === e.tipo);
        if (ataques.length) return ataques.includes(objetivo) ? objetivo : ataques[0];
        if (objetivo && v.a.includes(objetivo)) return objetivo;
    }
    return null;
}

// ---------- Cambios de estado ----------
function marcarCambio(p, mezcla) { p.cambio = { n: p.cambio.n + 1, mezcla }; }

export function iniciar(p, clave, { buffer = false, dir = null } = {}) {
    if (LIBRES.has(clave)) return volver(p, clave);
    const def = accionDe(p.estilo, clave);
    if (!def) return false;
    const m = COMBATE.motor.mezcla;
    p.estado = def.estado; p.clave = clave; p.def = def; p.c = 0; p.conecto = false; p.carga = 0; p.cargando = false; p.sostener = 0;
    const base = def.direccion || [1, 0];
    p.dir = def.usaDireccion && dir && Math.hypot(dir[0], dir[1]) > 0.3 ? normal(dir) : [base[0], base[1]];
    marcarCambio(p, def.mezcla ?? (buffer ? m.buffer : m.normal));
    p.eventos.push({ tipo: 'inicio', clave });
    if (def.fases && inicioFase(def.fases, 'activo') === 0 && def.fases.activo) p.eventos.push({ tipo: 'activo', clave });
    return true;
}
const normal = v => { const n = Math.hypot(v[0], v[1]); return [v[0] / n, v[1] / n]; };

function volver(p, estado) {
    const m = COMBATE.motor.mezcla;
    if (p.def) p.eventos.push({ tipo: 'fin', clave: p.clave });
    p.estado = estado; p.clave = null; p.def = null; p.c = 0; p.conecto = false;
    marcarCambio(p, estado === 'guardia' ? m.guardia : m.normal);
    return true;
}

function terminar(p) {
    const def = p.def, ctl = p.estilo.controles || {};
    let sig = def.siguiente;
    if (!sig) sig = p.estado === 'desvio' && p.defensa && ctl.defensaMantenida ? ctl.defensaMantenida : 'guardia';
    p.eventos.push({ tipo: 'fin', clave: p.clave });
    if (LIBRES.has(sig)) { p.def = null; volver(p, sig); }
    else if (!iniciar(p, sig)) volver(p, 'guardia');
}

// Bloques avanzados hasta el cuadro c (root motion): avance = { fase, hasta, curva } o una lista de tramos
export function avanceEn(def, c) {
    if (!def.avance) return 0;
    let d = 0;
    for (const t of Array.isArray(def.avance) ? def.avance : [def.avance]) {
        const ini = inicioFase(def.fases, t.fase), largo = def.fases[t.fase] || 0;
        if (ini === null) continue;
        const f = largo ? Math.max(0, Math.min(1, (c - ini) / largo)) : (c >= ini ? 1 : 0);
        d += (t.hasta || 0) * curva(t.curva || 'salida', f);
    }
    return d;
}

// ---------- Un cuadro ----------
function guardar(p, tipo, intencion) {
    // Gana la última, salvo la defensa, que gana siempre (defenderse nunca se pierde por haber apretado atacar antes)
    if (p.buffer && p.buffer.tipo === 'defensa' && tipo !== 'defensa') return;
    const altura = intencion.altura || 'neutro', m = intencion.mover || [0, 0];
    const neutra = altura === 'neutro' || altura === COMBATE.entrada.alturaNeutra;
    p.buffer = { tipo, altura, adelante: neutra && m[0] >= COMBATE.entrada.adelante, dir: [m[0], m[1]], edad: 0 };
}

export function paso(p, intencion = {}) {
    p.eventos.length = 0;
    p.mov = [0, 0];
    p.mover = intencion.mover || [0, 0];
    p.defensa = intencion.defensa === 'apretar' || intencion.defensa === 'mantener';
    // Los botones apretados en este cuadro van al buffer (la defensa al final: así queda si llegan dos)
    for (let i = BOTONES.length - 1; i >= 0; i--) if (intencion[BOTONES[i]] === 'apretar') guardar(p, BOTONES[i], intencion);
    if (TERMINALES.has(p.estado)) { p.buffer = null; return p; }
    // Hitstop: nada avanza (p.quieto le dice al motor de animación que deje la pose); el buffer no envejece
    p.quieto = p.congelado > 0;
    if (p.quieto) { p.congelado--; return p; }
    p.cuadros++;
    // 1. El estado con tiempo avanza un cuadro (y el cuerpo, con su avance)
    // Carga (S7): mientras se mantiene su intención, la acción se queda en el cuadro `en` hasta `max` cuadros
    const ca = p.def && p.def.carga, boton = ca ? intencion[p.def.intencion || 'atacar'] : null;
    p.cargando = !!ca && p.c === marca(ca.en, p.def.fases) && (boton === 'apretar' || boton === 'mantener') && p.carga < ca.max;
    if (intencion.sostener > 0 && p.def && p.estado === 'ataque') p.sostener = intencion.sostener | 0;
    const ga = p.def && p.def.fases && p.def.fases.activo ? inicioFase(p.def.fases, 'activo') : 0;
    if (p.cargando) p.carga++;
    else if (p.sostener > 0 && ga > 0 && p.c === ga - 1) p.sostener--; // anticipación sostenida (CPU)
    else if (p.def) {
        p.c++;
        const f = p.def.fases, d = avanceEn(p.def, p.c) - avanceEn(p.def, p.c - 1);
        p.mov = [p.dir[0] * d, p.dir[1] * d];
        if (f.activo && p.c === inicioFase(f, 'activo')) p.eventos.push({ tipo: 'activo', clave: p.clave });
        if (p.c >= largoFases(f)) terminar(p);
    }
    // 2. El buffer se consume en el primer cuadro en que el estado deja salir hacia lo guardado
    if (p.buffer) {
        const k = destino(p, p.buffer);
        if (k) { const b = p.buffer; p.buffer = null; iniciar(p, k, { buffer: b.edad > 0, dir: b.dir }); }
    }
    // 2b. La CPU pide una acción por su clave (no sale de ningún control: los peligrosos de §16.4)
    if (intencion.accion && LIBRES.has(p.estado) && accionDe(p.estilo, intencion.accion)) { p.buffer = null; iniciar(p, intencion.accion); }
    // 3. Estados libres: guardia, paso (caminar en guardia) y bloqueo (mientras se mantiene la defensa)
    if (LIBRES.has(p.estado)) {
        if (p.estado === 'bloqueo') { if (!p.defensa) volver(p, 'guardia'); }
        else {
            const n = Math.hypot(p.mover[0], p.mover[1]);
            p.estado = n > COMBATE.motor.paso.umbral ? 'paso' : 'guardia';
            // p.ritmo: lo pone la arena (las piernas en crítico de Urban Reign, combate/zonas.js); 1 si no
            const v = ((p.estilo.paso && p.estilo.paso.velocidad) || 0) * (p.ritmo ?? 1) / COMBATE.motor.hz;
            if (p.estado === 'paso') p.mov = [p.mover[0] * v, p.mover[1] * v];
        }
    }
    p.velocidad = Math.hypot(p.mov[0], p.mov[1]) * COMBATE.motor.hz;
    // 4. Lo guardado envejece
    if (p.buffer && ++p.buffer.edad >= maxBuffer(p)) p.buffer = null;
    return p;
}

// ---------- Recibir un golpe ----------
// golpe: { reaccion, altura, peligro, ... } (lo del ataque que llega). reglas.alRecibir(p, golpe, resultado) puede
// cambiar el resultado (reglas de defensa de cada estilo: peligros, altura del desvío).
export function recibir(p, golpe = {}, reglas = null) {
    let r;
    const def = p.def, f = def && def.fases;
    const extra = p.tactil ? COMBATE.tactil.ventanasExtra : 0;
    if (TERMINALES.has(p.estado) || SIN_INTERRUMPIR.has(p.estado) || (def && def.ininterrumpible)) r = 'sinEfecto';
    else if (def && enTramos(def.armadura, f, p.c)) r = 'armadura';
    else if (def && enTramos(def.iframes, f, p.c, p.estado === 'esquiva' ? extra : 0)) r = 'esquivado';
    else if (p.estado === 'desvio' && enVentana(p, extra)) r = 'desviado';
    else if (p.estado === 'bloqueo' || (p.estado === 'desvio' && p.defensa)) r = 'bloqueado';
    else r = 'golpeado';
    if (reglas && reglas.alRecibir) r = reglas.alRecibir(p, golpe, r) || r;
    if (r === 'golpeado') reaccionar(p, golpe.reaccion || 'alto_leve');
    return { resultado: r };
}
// Ventana del desvío: su tramo `ventana` o la fase activa entera (+ los cuadros extra del táctil)
function enVentana(p, extra) {
    const f = p.def.fases;
    if (p.def.ventana) return enTramos([p.def.ventana], f, p.c, extra);
    const ini = inicioFase(f, 'activo');
    return p.c >= ini && p.c < ini + (f.activo || 0) + extra;
}

export function reaccionar(p, clave) { return iniciar(p, clave); }
export function congelar(p, n) { p.congelado = Math.max(p.congelado, n | 0); }
export function conecto(p) { p.conecto = true; }
export const cargaDe = p => (p.def && p.def.carga && p.def.carga.max ? Math.min(1, p.carga / p.def.carga.max) : 0);
export function fijarEstado(p, estado) { if (p.def) p.def = null; p.estado = estado; p.clave = null; p.c = 0; marcarCambio(p, COMBATE.motor.mezcla.normal); }

// de / a: { x, z, yaw } (yaw 0 = mira hacia +Z). Alcance en bloques; arco en grados respecto del frente.
export function alcanza(ataque, de, a) {
    const dx = a.x - de.x, dz = a.z - de.z, d = Math.hypot(dx, dz);
    if (d > (ataque.alcance || 0)) return false;
    if (d < 1e-6) return true;
    let ang = Math.atan2(dx, dz) - (de.yaw || 0);
    ang = Math.atan2(Math.sin(ang), Math.cos(ang)) * 180 / Math.PI;
    const arco = ataque.arco || [-45, 45];
    return ang >= arco[0] && ang <= arco[1];
}

// ---------- Paso fijo ----------
export function crearRelojFijo(hz = COMBATE.motor.hz, maxPasos = COMBATE.motor.maxPasos) {
    const dt = 1 / hz;
    let acc = 0;
    return {
        dt,
        avanzar(segundos, fn) {
            acc += segundos;
            let n = 0;
            while (acc >= dt - 1e-9 && n < maxPasos) { fn(); acc -= dt; n++; }
            if (n === maxPasos && acc > dt) acc = 0; // pestaña en pausa: no se recupera el tiempo perdido
            return Math.max(0, acc / dt);
        }
    };
}
