// =========================================================
// VENJY · Combate · CPU peleador (bloque 8 · L4, mundo/COMBATE.md §15.7 y §19.6)
// Puro y con semilla: sin Three.js ni DOM. Toda acción de la CPU es una intención que pasa por la misma máquina de
// estados que la del jugador (combate/estados.js); lo único propio es `sostener` (alarga su anticipación para que se
// lea y para los tajos retrasados).
//   reglasCPU(arena, estilo, dificultad)  arena.json → cpu (dificultades y reglas para todas las CPU) y
//                                         estilo-*.json → cpu (la tabla del estilo), fundidos sobre CPU_BASE
//   crearCPU(reglas, semilla)             estado de la CPU (su propio azar: la pelea no cambia si la CPU tira dados)
//   intencionCPU(S, F, O, libre)          la intención de F en este cuadro. F y O: peleadores de la arena
//                                         ({ p, x, z, vida, vidaMax, esp, estilo, pel }); libre: ¿la pelea corre?
//                                         Deja en S.eventos lo que la arena puede mostrar ({ tipo: 'provoca' })
// Cómo piensa (§15.7):
//   · ve tu estado con `retraso` cuadros de atraso (tiempo humano por dificultad); su propio estado lo sabe al día;
//   · desvía, bloquea o esquiva tus ataques con probabilidad (nunca ventanas perfectas): el toque llega `adelanto`
//     cuadros antes de tu activo, al azar dentro de la ventana del perfecto o de la normal. Lee el ritmo: si ya te vio
//     atacando, puede tomar el tajo que sigue de tu cadena aunque todavía no lo vea;
//   · ataca en cadenas de `cadena` tajos, a veces con un tajo retrasado (anticipación + `retrasado.cuadros`), y
//     después respira (`respiro` cuadros: se aleja, espera o provoca si estás lejos); en los primeros `castigo`
//     cuadros del respiro no se defiende (la ventana de castigo de §19.6);
//   · un peligroso cada `peligro.cada` s (× `peligro.factor` con menos de `peligro.pocaVida` de vida);
//   · nunca empieza nada durante tu hitstop, no repite el mismo ataque más de `repetirMax` veces seguidas y
//     su anticipación nunca baja de `minimo` (× `anticipacion` de la dificultad).
// =========================================================
import { COMBATE, accionDe, inicioFase } from './datos.js';
import { LIBRES, TERMINALES, destino } from './estados.js';

const DIF = (anticipacion, retraso, desvio, perfecto, bloqueo, esquiva, peligros, agresion) =>
    ({ anticipacion, retraso, desvio, perfecto, bloqueo, esquiva, peligros, agresion });
export const CPU_BASE = {
    dificultades: {
        //                 anticip. retraso desvío perfecto bloqueo esquiva lee peligros agresión
        facil: DIF(1.5, 22, 0.15, 0.1, 0.25, 0.1, 0.25, 0.6),
        normal: DIF(1.15, 16, 0.35, 0.25, 0.3, 0.15, 0.5, 0.8),
        dificil: DIF(1, 11, 0.6, 0.4, 0.25, 0.2, 0.75, 1),
        maestro: DIF(1, 8, 0.8, 0.6, 0.15, 0.2, 0.9, 1.15)
    },
    minimo: { normal: 8, peligroso: 14 },
    repetirMax: 3,
    castigo: 24,
    estilo: {
        cadena: [2, 4],
        retrasado: { prob: 0.25, cuadros: [8, 16] },
        fuerte: { prob: 0.15, carga: [8, 30] },
        patada: { prob: 0.5 },
        arte: { prob: 0.3 },
        peligro: { cada: [6, 12], pocaVida: 0.4, factor: 0.6, lista: [] },
        respiro: { cuadros: [36, 90], alejarse: 0.45, provocar: 0.35, lejos: 4 },
        distancia: { cerca: 1.2, margen: 0.85, acercarse: 0.8, alejarse: 0.7 },
        esperaInicial: [20, 50],
        provocar: null
    }
};

const objeto = v => v && typeof v === 'object' && !Array.isArray(v);
function fundir(base, extra) {
    if (!objeto(extra)) return objeto(base) ? fundir(base, {}) : base;
    const o = {};
    for (const k of new Set([...Object.keys(base || {}), ...Object.keys(extra)])) {
        const b = base ? base[k] : undefined, e = extra[k];
        if (e === undefined) o[k] = objeto(b) ? fundir(b, {}) : Array.isArray(b) ? [...b] : b;
        else if (objeto(b) && objeto(e)) o[k] = fundir(b, e);
        else if (b === undefined || b === null || e === null || typeof e === typeof b) o[k] = Array.isArray(e) ? [...e] : objeto(e) ? fundir({}, e) : e;
        else o[k] = b;
    }
    return o;
}
export function reglasCPU(arena, estilo, dificultad = 'normal') {
    const g = fundir(CPU_BASE, arena || {});
    const dif = g.dificultades[dificultad] || g.dificultades.normal;
    return { ...g, dificultad, dif, e: fundir(CPU_BASE.estilo, (estilo && estilo.cpu) || {}) };
}

// Generador con semilla (el mismo de la arena)
function azar(semilla) {
    let s = semilla >>> 0;
    return () => { s = (s + 0x6D2B79F5) >>> 0; let q = s; q = Math.imul(q ^ (q >>> 15), q | 1); q ^= q + Math.imul(q ^ (q >>> 7), q | 61); return ((q ^ (q >>> 14)) >>> 0) / 4294967296; };
}
const entre = (S, [a, b]) => a + S.rnd() * Math.max(0, b - a);
const entero = (S, r) => Math.round(entre(S, r));

export function crearCPU(reglas, semilla = 1) {
    return {
        R: reglas, rnd: azar(semilla), cuadro: 0, vista: [], eventos: [],
        modo: 'espera', espera: 0, cadena: 0, hechos: [], carga: -1, ultimoPeligro: 0, proximoPeligro: 0,
        defensa: null, bloquea: 0, tirado: -1, cadenaVista: -1, castigo: 0, serial: -1, accion: null
    };
}

// Lo que la CPU «ve» de O: una foto por cuadro, y lee la de hace `retraso` cuadros
const foto = O => ({ estado: O.p.estado, clave: O.p.clave, c: O.p.c, n: O.p.cambio.n, def: O.p.def, x: O.x, z: O.z });
function vista(S) {
    const r = S.R.dif.retraso, v = S.vista;
    return v.length > r ? v[v.length - 1 - r] : null;
}
const esAtaqueDe = (p, k) => { const d = accionDe(p.estilo, k); return !!(d && d.estado === 'ataque'); };
// ¿Empezar la acción k haría que se repita más de repetirMax veces seguidas?
function repite(S, k) {
    const h = S.hechos, m = S.R.repetirMax;
    return h.length >= m && h.slice(-m).every(x => x === k);
}

export function intencionCPU(S, F, O, libre = true) {
    S.eventos.length = 0;
    S.cuadro++;
    S.vista.push(foto(O));
    if (S.vista.length > 64) S.vista.shift();
    // Lo que empezó en el cuadro anterior: historial (sin repetir) y la anticipación sostenida
    const it = {};
    for (const e of F.p.eventos) {
        if (e.tipo !== 'inicio' || !esAtaqueDe(F.p, e.clave)) continue;
        S.hechos.push(e.clave); if (S.hechos.length > 8) S.hechos.shift();
        const s = sostenerDe(S, F.p.def, S.retrasar);
        S.retrasar = false;
        if (s > 0) it.sostener = s;
    }
    if (!libre || TERMINALES.has(F.p.estado)) return it;
    const R = S.R, E = R.e, d = Math.hypot(O.x - F.x, O.z - F.z);
    const vO = vista(S);
    if (S.castigo > 0) S.castigo--;
    // 1. Defensa contra tu ataque
    const def = defender(S, F, O, vO, it);
    if (def) return def;
    if (S.bloquea > 0) { S.bloquea--; it.defensa = 'mantener'; if (O.p.estado === 'ataque') return it; S.bloquea = 0; }
    // Tu hitstop: nada empieza (la carga y la cadena esperan)
    const enHitstop = O.p.congelado > 0 || O.p.quieto;
    // 2. La carga del fuerte en curso
    if (S.carga >= 0) { it.fuerte = S.carga-- > 0 ? 'mantener' : 'soltar'; return it; }
    // 3. La cadena en curso: aprieta atacar cuando el estado deja salir al tajo siguiente (sin repetir de más)
    if (S.modo === 'cadena') {
        if (F.p.estado === 'ataque' && F.p.cambio.n !== S.serial) { S.serial = F.p.cambio.n; S.cadena--; }
        if (S.cadena > 0 && !enHitstop && F.p.estado === 'ataque') {
            const k = destino(F.p, { tipo: 'atacar', altura: 'neutro' });
            if (k && !repite(S, k) && esAtaqueDe(F.p, k)) { it.atacar = 'apretar'; if (S.rnd() < E.retrasado.prob) S.retrasar = true; }
            else if (k && repite(S, k)) S.cadena = 0;
            return it;
        }
        if (F.p.estado === 'ataque') return it;
        if (LIBRES.has(F.p.estado)) respirar(S); // terminó la cadena (o se la cortaron)
        else return it;
    }
    // 4. Respiro: se aleja, espera o provoca; después vuelve a buscarte
    if (S.modo === 'respiro') {
        if (S.espera-- > 0) {
            if (S.alejarse && d < E.respiro.lejos) it.mover = [-E.distancia.alejarse, 0];
            if (S.provoca && d >= E.respiro.lejos && !S.provoco) {
                S.provoco = true; S.eventos.push({ tipo: 'provoca' });
                if (E.provocar && accionDe(F.p.estilo, E.provocar) && LIBRES.has(F.p.estado)) it.accion = E.provocar;
            }
            return it;
        }
        S.modo = 'espera'; S.espera = entero(S, E.esperaInicial); S.accion = null;
    }
    if (!LIBRES.has(F.p.estado)) return it;
    // 5. Elegir el próximo ataque y acercarse a su alcance
    if (!S.accion) S.accion = elegir(S, F, O, vO);
    const a = S.accion, ad = accionDe(F.p.estilo, a.clave);
    if (!ad || a.nada) { S.accion = null; return it; }
    const alcance = (ad.alcance || 2) * E.distancia.margen;
    if (d > alcance) it.mover = [E.distancia.acercarse, 0];
    else if (d < E.distancia.cerca && a.tipo !== 'patada') it.mover = [-E.distancia.alejarse, 0];
    if (S.espera > 0) { S.espera--; return it; }
    if (d > alcance || enHitstop) return it;
    // 6. ¡Ahora! (siempre desde un estado libre y nunca durante tu hitstop)
    S.accion = null;
    if (a.tipo === 'peligro' || a.tipo === 'arte') {
        it.accion = a.tipo === 'arte' ? undefined : a.clave;
        if (a.tipo === 'arte') it.especial = 'apretar';
        if (a.tipo === 'peligro') S.ultimoPeligro = S.cuadro;
        S.modo = 'cadena'; S.cadena = 1; S.serial = F.p.cambio.n;
        return it;
    }
    if (a.tipo === 'fuerte') { it.fuerte = 'apretar'; S.carga = entero(S, E.fuerte.carga); S.modo = 'cadena'; S.cadena = 1; S.serial = F.p.cambio.n; return it; }
    if (a.tipo === 'patada') { it.agarre = 'apretar'; S.modo = 'cadena'; S.cadena = 1; S.serial = F.p.cambio.n; return it; }
    it.atacar = 'apretar';
    if (S.rnd() < E.retrasado.prob) S.retrasar = true;
    S.modo = 'cadena'; S.cadena = a.golpes; S.serial = F.p.cambio.n;
    return it;
}

// Cuadros de anticipación sostenida: el mínimo legible (× la dificultad) y, si toca, el tajo retrasado
function sostenerDe(S, def, retrasar) {
    if (!def || !def.fases) return 0;
    const R = S.R, ant = inicioFase(def.fases, 'activo') || 0;
    if (ant <= 0) return 0;
    const min = (def.peligro ? R.minimo.peligroso : R.minimo.normal);
    let quiere = Math.max(Math.round(ant * R.dif.anticipacion), min);
    if (retrasar) quiere += entero(S, R.e.retrasado.cuadros);
    return Math.max(0, quiere - ant);
}

// Qué ataque sigue, con pesos por situación: castigo (estás en recuperación o reaccionando), tu bloqueo, y el reloj
// de los peligrosos. Nunca uno que se repita más de repetirMax veces.
function elegir(S, F, O, vO) {
    const R = S.R, E = R.e, ctl = (F.estilo && F.estilo.controles) || {};
    const hz = COMBATE.motor.hz;
    if (!S.proximoPeligro) S.proximoPeligro = S.cuadro + Math.round(entre(S, E.peligro.cada) * hz);
    // Los peligrosos: la lista del estilo o, si no trae, todos sus ataques con `peligro`
    const todos = E.peligro.lista && E.peligro.lista.length ? E.peligro.lista : Object.keys((F.p.estilo && F.p.estilo.ataques) || {}).filter(k => F.p.estilo.ataques[k].peligro);
    const pel = todos.filter(k => accionDe(F.p.estilo, k) && !repite(S, k));
    if (pel.length && S.cuadro >= S.proximoPeligro && S.rnd() < 0.5 + R.dif.agresion / 2) {
        const factor = F.vida / F.vidaMax < E.peligro.pocaVida ? E.peligro.factor : 1;
        S.proximoPeligro = S.cuadro + Math.round(entre(S, E.peligro.cada) * hz * factor);
        return { tipo: 'peligro', clave: pel[Math.floor(S.rnd() * pel.length) % pel.length] };
    }
    const arte = ctl.especial && accionDe(F.p.estilo, ctl.especial);
    if (arte && F.esp && arte.costo && F.esp.valor + 1e-9 >= (arte.costo.espiritu || 0) && !repite(S, ctl.especial) && S.rnd() < E.arte.prob)
        return { tipo: 'arte', clave: ctl.especial };
    const patada = ctl.agarre && esAtaqueDe(F.p, ctl.agarre) && !repite(S, ctl.agarre);
    if (patada && vO && vO.estado === 'bloqueo' && S.rnd() < E.patada.prob) return { tipo: 'patada', clave: ctl.agarre };
    if (ctl.fuerte && esAtaqueDe(F.p, ctl.fuerte) && !repite(S, ctl.fuerte) && S.rnd() < E.fuerte.prob) return { tipo: 'fuerte', clave: ctl.fuerte };
    let golpes = entero(S, E.cadena);
    // Castigo: si te vio recuperándote o reaccionando, la cadena sale entera y sin esperar
    if (vO && (vO.estado === 'reaccion' || (vO.estado === 'ataque' && vO.def && vO.c >= inicioFase(vO.def.fases, 'recuperacion')))) { S.espera = 0; golpes = E.cadena[1]; }
    else S.espera = Math.max(S.espera, Math.round(12 / R.dif.agresion * S.rnd()));
    const k = ctl.atacar;
    if (!repite(S, k)) return { tipo: 'cadena', clave: k, golpes: Math.max(1, golpes) };
    // Ya repitió su tajo de más: otra cosa (el fuerte, la patada o un peligroso), o espera
    if (ctl.fuerte && esAtaqueDe(F.p, ctl.fuerte) && !repite(S, ctl.fuerte)) return { tipo: 'fuerte', clave: ctl.fuerte };
    if (patada) return { tipo: 'patada', clave: ctl.agarre };
    if (pel.length) return { tipo: 'peligro', clave: pel[0] };
    S.hechos.push(null);
    return { tipo: 'cadena', clave: k, golpes: 1, nada: true };
}

function respirar(S) {
    const E = S.R.e;
    S.modo = 'respiro'; S.espera = entero(S, E.respiro.cuadros); S.castigo = S.R.castigo; S.accion = null;
    S.alejarse = S.rnd() < E.respiro.alejarse; S.provoca = S.rnd() < E.respiro.provocar; S.provoco = false;
}

// Tu ataque: la CPU lo toma cuando lo ve (con su retraso) o, si ya te vio atacando, lee el tajo que sigue de tu cadena.
// Tira los dados una vez por ataque: desvío (toque `adelanto` c antes del activo), bloqueo, esquiva o nada.
// Contra un peligroso: salta el barrido, mikiri contra la estocada, esquiva el agarre (con la prob. `peligros`).
function defender(S, F, O, vO, it) {
    const p = O.p;
    if (vO && vO.estado === 'ataque') S.cadenaVista = S.cuadro;
    if (S.defensa && (p.cambio.n !== S.defensa.n || p.estado !== 'ataque')) S.defensa = null;
    if (!S.defensa) planear(S, F, O, vO);
    // El plan se cumple cuando tu ataque llega a `adelanto` cuadros de su activo
    const pl = S.defensa;
    if (!pl) return null;
    const g = inicioFase(p.def.fases, 'activo');
    if (pl.tipo === 'bloqueo') { S.defensa = null; S.bloquea = 90; return { ...it, defensa: 'apretar' }; }
    if (p.c < g - pl.adelanto) return null;
    S.defensa = null;
    if (pl.tipo === 'desvio') return { ...it, defensa: 'apretar' };
    if (pl.tipo === 'esquiva') return { ...it, esquivar: 'apretar', mover: pl.mover };
    return { ...it, saltar: 'apretar' };
}
function planear(S, F, O, vO) {
    const R = S.R, D = R.dif, p = O.p;
    if (p.estado !== 'ataque' || !p.def || S.tirado === p.cambio.n) return;
    // ¿Lo ve? (su foto atrasada ya muestra este ataque, o te vio atacando hace poco: lee el ritmo de tu cadena)
    const visto = (vO && vO.estado === 'ataque' && vO.n === p.cambio.n) || (S.cadenaVista >= S.cuadro - 1 && vO && vO.n !== p.cambio.n);
    if (!visto) return;
    S.tirado = p.cambio.n;
    const g = inicioFase(p.def.fases, 'activo');
    if (p.c >= g || S.castigo > 0) return; // tarde, o en su ventana de castigo
    const ctl = (F.estilo && F.estilo.controles) || {}, Pr = F.pel && F.pel.peligro && F.pel.peligro.respuestas;
    const r = S.rnd();
    if (p.def.peligro) {
        if (r >= D.peligros) return;
        const t = (Pr && Pr[p.def.peligro]) || {};
        if (p.def.peligro === 'barrido' && t.salto && ctl.saltar) S.defensa = { tipo: 'salto', n: p.cambio.n, adelanto: 4 };
        else if (p.def.peligro === 'estocada' && ctl.esquivar) S.defensa = { tipo: 'esquiva', n: p.cambio.n, adelanto: 3, mover: [1, 0] }; // mikiri
        else if (t.esquiva && ctl.esquivar) S.defensa = { tipo: 'esquiva', n: p.cambio.n, adelanto: 5, mover: [-1, 0] };
        return;
    }
    const V = (F.post && F.post.R && F.post.R.desvio) || { perfecto: 5, ventana: 11 };
    if (ctl.defensa && r < D.desvio) {
        const perf = S.rnd() < D.perfecto;
        const adelanto = perf ? 1 + Math.floor(S.rnd() * Math.max(1, V.perfecto - 1)) : V.perfecto + Math.floor(S.rnd() * Math.max(1, V.ventana - V.perfecto - 1));
        S.defensa = { tipo: 'desvio', n: p.cambio.n, adelanto };
    } else if (ctl.defensaMantenida && r < D.desvio + D.bloqueo) S.defensa = { tipo: 'bloqueo', n: p.cambio.n };
    else if (ctl.esquivar && r < D.desvio + D.bloqueo + D.esquiva) S.defensa = { tipo: 'esquiva', n: p.cambio.n, adelanto: 4, mover: [-1, 0] };
    return null;
}
