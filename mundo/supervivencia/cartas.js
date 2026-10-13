// =========================================================
// VENJY · Supervivencia · Duelo de Cartas Pixel (7h-2): reglas puras e IA de Lucho
// Sin DOM ni Three: el panel (y luego el duelo entre jugadores) solo llama a estas funciones.
//   nuevaPartida(op) → estado (objeto plano, se puede clonar con JSON; el azar va en `r`, determinista)
//   partidaNivel(nivel, op) → nuevaPartida con la vida, la mano y los mazos de NIVELES (tú = jugador 0)
//   jugadas(e)       → acciones legales del jugador de turno
//   aplicar(e, a)    → cambia `e` y devuelve los eventos (para animar: roba, invoca, ataque, muere…)
//   jugadaIA(e, nivel) → una acción legal ('facil' | 'medio')
//   accionTutorial(e, esperada) → la acción legal que calza con un paso de TUTORIAL (o null)
//   calzaTutorial(e, a, esperada) → si la acción `a` es la que pide ese paso
//   atkDe(e, j, c) / defDe(e, j, c) → ATK y DEF reales (con bonos y auras: Hadad, Mila y Gala, Moisés)
// Turno: fase 'robo' (solo «robar»; antes actúan los efectos de inicio de turno) → fase 'principal':
// invocar (1 por turno, más con Venjy), hechizos sin límite, atacar con cada criatura (no la recién
// invocada, salvo el Enderman) y cambiar postura; «terminar». Sin costes: los combos salen de encadenar efectos.
// Con las 3 zonas llenas se invoca igual sobre una criatura propia (z ocupada): esa va al cementerio
// (su efecto al morir sí actúa, el escudo no la salva) y la nueva ocupa su zona; cuenta como la invocación del turno.
// Acciones: { t:'robar' } · { t:'invocar', m, z, modo:'ata'|'def', obj? } · { t:'hechizo', m, obj?, obj2? }
//           { t:'atacar', z, obj } (obj -1 = directo) · { t:'modo', z } · { t:'terminar' }
//   m = índice en tu mano, z = tu zona (0-2), obj = zona rival (o propia en Poción, Escudo y Abrazo).
// =========================================================
import { CARTAS, PIDE_RIVAL, PIDE_PROPIA, NIVELES, MAZOS } from './cartas-datos.js';

export const VIDA = 2000, MANO_INICIAL = 3, MANO_MAX = 7, ZONAS = 3, TOPE_TURNOS = 120;

// Azar determinista (mulberry32) guardado en el estado
function azar(e) {
    let x = (e.r = (e.r + 0x6d2b79f5) | 0);
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
}

export function nuevaPartida({ mazos, semilla = 1, empieza = 0, barajar = true, vidas = [VIDA, VIDA], mano = MANO_INICIAL } = {}) {
    const e = { r: semilla | 0, turno: empieza, n: 1, fase: 'robo', invoc: 1, ganador: null, motivo: null, jug: [] };
    for (let j = 0; j < 2; j++) {
        const mazo = mazos[j].slice();
        if (barajar) for (let i = mazo.length - 1; i > 0; i--) { const k = Math.floor(azar(e) * (i + 1)); [mazo[i], mazo[k]] = [mazo[k], mazo[i]]; }
        e.jug.push({ vida: vidas[j], mazo, mano: mazo.splice(0, mano), zonas: Array(ZONAS).fill(null), desc: [] });
    }
    return e;
}

export function partidaNivel(nivel, { semilla = 1, empieza = 0, mazo = MAZOS.jugador } = {}) {
    const N = NIVELES[nivel];
    return nuevaPartida({ mazos: [mazo, MAZOS[nivel]], semilla, empieza, vidas: [N.vida, N.vida], mano: N.mano });
}

export const clonar = e => JSON.parse(JSON.stringify(e));
const carta = id => CARTAS[id];
const ef = c => carta(c.id).efecto;
const rival = j => 1 - j;
const libres = J => J.zonas.map((c, z) => (c ? -1 : z)).filter(z => z >= 0);
const ocupadas = J => J.zonas.map((c, z) => (c ? z : -1)).filter(z => z >= 0);
const enMesa = (J, id) => J.zonas.some(c => c && c.id === id);

// ATK y DEF reales (bonos guardados + auras de la mesa de su dueño)
export function atkDe(e, j, c) {
    const J = e.jug[j], d = carta(c.id);
    let v = c.atk + c.bono;
    if (d.familia === 'amigo') for (const o of J.zonas) if (o && o !== c && ef(o) === 'jefe') v += 200;
    if (d.efecto === 'duo' && enMesa(J, d.pareja)) v += 400;
    return Math.max(0, v);
}
export function defDe(e, j, c) {
    let v = c.def;
    if (c.modo === 'def') for (const o of e.jug[j].zonas) if (o && ef(o) === 'iglu') v += 300;
    return v;
}

// ---- Acciones legales ----
export function jugadas(e) {
    if (e.ganador !== null) return [];
    if (e.fase === 'robo') return [{ t: 'robar' }];
    const j = e.turno, J = e.jug[j], R = e.jug[rival(j)], out = [];
    const objRival = ocupadas(R), propias = ocupadas(J);
    J.mano.forEach((id, m) => {
        const c = carta(id);
        if (c.tipo === 'criatura') {
            if (e.invoc <= 0) return;
            const objs = PIDE_RIVAL.has(c.efecto) ? objRival.filter(k => c.efecto !== 'punteria' || atkDe(e, rival(j), R.zonas[k]) <= 700) : [];
            const destinos = libres(J).length ? libres(J) : propias; // zonas llenas: reemplazas una propia
            for (const z of destinos) for (const modo of ['ata', 'def']) {
                if (objs.length) for (const obj of objs) out.push({ t: 'invocar', m, z, modo, obj });
                else out.push({ t: 'invocar', m, z, modo });
            }
        } else if (PIDE_RIVAL.has(c.efecto)) for (const obj of objRival) out.push({ t: 'hechizo', m, obj });
        else if (PIDE_PROPIA.has(c.efecto)) { for (const obj of propias) if (c.efecto !== 'escudo' || !J.zonas[obj].escudo) out.push({ t: 'hechizo', m, obj }); }
        else if (c.efecto === 'abrazo') { for (const obj of propias) for (const obj2 of propias) if (obj !== obj2) out.push({ t: 'hechizo', m, obj, obj2 }); }
        else if (c.efecto === 'revivir') { if (libres(J).length && mejorDescarte(J) >= 0) out.push({ t: 'hechizo', m }); }
        else out.push({ t: 'hechizo', m });
    });
    for (const z of propias) {
        const c = J.zonas[z];
        for (const obj of objetivos(e, z)) out.push({ t: 'atacar', z, obj });
        if (!c.nueva && !c.cambio && !c.ataco && !c.quieta) out.push({ t: 'modo', z });
    }
    out.push({ t: 'terminar' });
    return out;
}

// Zonas rivales que puede atacar la criatura de tu zona z (-1 = directo)
export function objetivos(e, z) {
    const j = e.turno, c = e.jug[j].zonas[z], R = e.jug[rival(j)];
    if (!c || e.fase !== 'principal' || e.n === 1 || (c.nueva && ef(c) !== 'prisa') || c.modo !== 'ata' || c.atada || c.ataques <= 0) return [];
    const vuela = ef(c) === 'vuela';
    const en = ocupadas(R), guardias = en.filter(k => ef(R.zonas[k]) === 'guardian');
    const out = guardias.length && !vuela ? guardias : en.slice();
    if (!en.length || vuela) out.push(-1);
    return out;
}

const igual = (a, b) => a.t === b.t && a.m === b.m && a.z === b.z && a.modo === b.modo && a.obj === b.obj && a.obj2 === b.obj2;
export const esLegal = (e, a) => jugadas(e).some(b => igual(a, b));

// ---- Aplicar ----
export function aplicar(e, a) {
    if (!esLegal(e, a)) throw new Error('jugada ilegal: ' + JSON.stringify(a));
    const ev = [], j = e.turno, J = e.jug[j], R = e.jug[rival(j)];
    switch (a.t) {
        case 'robar': {
            // Inicio de turno: la Bruja cura antes de robar
            for (let z = 0; z < ZONAS; z++) if (J.zonas[z] && ef(J.zonas[z]) === 'pocion') { ev.push({ t: 'efecto', j, z, c: J.zonas[z].id, ef: 'pocion' }); curar(e, j, 200, ev); }
            e.fase = 'principal';
            if (!J.mazo.length) { terminarPartida(e, ev, rival(j), 'mazo'); break; }
            robar(e, j, ev);
            break;
        }
        case 'invocar': {
            e.invoc--;
            const id = J.mano.splice(a.m, 1)[0];
            if (J.zonas[a.z]) morir(e, j, a.z, ev, false, true); // reemplazo: la criatura propia se va al cementerio
            entrar(e, j, id, a.z, a.modo, a.obj, ev, false, a.m);
            break;
        }
        case 'hechizo': lanzar(e, j, a, ev); break;
        case 'atacar': atacar(e, j, a.z, a.obj, ev); break;
        case 'modo': {
            const c = J.zonas[a.z];
            c.modo = c.modo === 'ata' ? 'def' : 'ata'; c.cambio = true;
            ev.push({ t: 'modo', j, z: a.z, modo: c.modo });
            break;
        }
        case 'terminar': {
            for (const c of J.zonas) if (c) { c.nueva = false; c.atada = 0; c.quieta = false; }
            e.turno = rival(j); e.n++; e.fase = 'robo'; e.invoc = 1;
            for (const c of R.zonas) if (c) { c.ataques = 1; c.ataco = 0; c.cambio = false; c.racha = false; }
            if (e.n > TOPE_TURNOS) {
                const [a0, a1] = [e.jug[0].vida, e.jug[1].vida];
                terminarPartida(e, ev, a0 === a1 ? 'empate' : a0 > a1 ? 0 : 1, 'tope');
            } else ev.push({ t: 'turno', j: e.turno, n: e.n });
            break;
        }
    }
    return ev;
}

function robar(e, j, ev) {
    const J = e.jug[j];
    if (!J.mazo.length) return;
    const id = J.mazo.shift();
    if (J.mano.length >= MANO_MAX) { J.desc.push(id); ev.push({ t: 'quema', j, c: id }); }
    else { J.mano.push(id); ev.push({ t: 'roba', j, c: id }); }
}
function aMano(e, j, id, ev, de) {
    const J = e.jug[j];
    if (J.mano.length >= MANO_MAX) { if (!carta(id).ficha) J.desc.push(id); ev.push({ t: 'quema', j, c: id }); }
    else { J.mano.push(id); ev.push({ t: 'roba', j, c: id, de }); }
}
function curar(e, j, n, ev) { const antes = e.jug[j].vida; e.jug[j].vida += n; ev.push({ t: 'cura', j, n, antes }); }

// Índice en el descarte de la criatura más fuerte (-1 si no hay)
function mejorDescarte(J) {
    let k = -1;
    J.desc.forEach((id, i) => { const c = carta(id); if (c.tipo === 'criatura' && !c.ficha && (k < 0 || c.atk > carta(J.desc[k]).atk)) k = i; });
    return k;
}
// La criatura rival más fuerte (para efectos que entran solos: Tótem, Lona)
function mejorRival(e, j, filtro = () => true) {
    const r = rival(j), R = e.jug[r];
    let k;
    for (const z of ocupadas(R)) if (filtro(R.zonas[z]) && (k === undefined || atkDe(e, r, R.zonas[z]) > atkDe(e, r, R.zonas[k]))) k = z;
    return k;
}

// Pone la criatura en la zona y dispara su efecto de entrada (los combos salen de aquí)
// m = índice en la mano (jugada normal) o de = de dónde sale (mano, mazo, desc, mesa) si entra gratis: para animar
function entrar(e, j, id, z, modo, obj, ev, gratis, m, de) {
    const J = e.jug[j], r = rival(j), R = e.jug[r], d = carta(id);
    J.zonas[z] = { id, atk: d.atk, def: d.def, bono: 0, modo, nueva: true, ataques: 1, ataco: 0, atada: 0, cambio: false, racha: false, quieta: false, escudo: false, unidos: [] };
    ev.push(gratis ? { t: 'invoca', j, z, c: id, modo, gratis, de } : { t: 'invoca', j, z, c: id, modo, gratis, m });
    if (PIDE_RIVAL.has(d.efecto) && obj === undefined) obj = mejorRival(e, j, c => d.efecto !== 'punteria' || atkDe(e, r, c) <= 700);
    const efecto = (extra = {}) => ev.push({ t: 'efecto', j, z, c: id, ef: d.efecto, ...extra });
    switch (d.efecto) {
        case 'horda': {
            const m = J.mano.indexOf('zombi'), libre = libres(J)[0];
            if (m >= 0 && libre !== undefined) { efecto(); J.mano.splice(m, 1); entrar(e, j, 'zombi', libre, modo, undefined, ev, true, undefined, 'mano'); }
            break;
        }
        case 'flecha': efecto(); danar(e, r, 200, ev); break;
        case 'telarana': if (obj !== undefined && R.zonas[obj]) { efecto({ obj }); R.zonas[obj].atada = 1; ev.push({ t: 'atada', j: r, z: obj }); } break;
        case 'petrifica': if (obj !== undefined && R.zonas[obj]) {
            efecto({ obj }); const o = R.zonas[obj];
            o.modo = 'def'; o.atada = 1; o.quieta = true;
            ev.push({ t: 'modo', j: r, z: obj, modo: 'def' }, { t: 'atada', j: r, z: obj });
        } break;
        case 'punteria': if (obj !== undefined && R.zonas[obj]) { efecto({ obj }); morir(e, r, obj, ev); } break;
        case 'robar': efecto(); robar(e, j, ev); break;
        case 'barco': if (obj !== undefined && R.zonas[obj]) {
            efecto({ obj });
            const o = R.zonas[obj]; R.zonas[obj] = null;
            ev.push({ t: 'vuelve', j: r, z: obj, c: o.id });
            if (!carta(o.id).ficha) aMano(e, r, o.id, ev, 'mesa');
            for (const u of o.unidos) R.desc.push(u);
        } break;
        case 'pesca': {
            const k = J.mazo.findIndex(x => carta(x).tipo === 'hechizo');
            if (k >= 0) { efecto(); aMano(e, j, J.mazo.splice(k, 1)[0], ev, 'mazo'); }
            break;
        }
        case 'explora': {
            const k = J.mazo.findIndex(x => carta(x).tipo === 'criatura');
            if (k >= 0) { efecto(); aMano(e, j, J.mazo.splice(k, 1)[0], ev, 'mazo'); }
            break;
        }
        case 'marea': {
            const k = mejorDescarte(J);
            if (k >= 0) { efecto(); aMano(e, j, J.desc.splice(k, 1)[0], ev, 'desc'); }
            break;
        }
        case 'gatera': {
            const k = J.mazo.findIndex(x => x === 'mila' || x === 'gala'), libre = libres(J)[0];
            if (k >= 0 && libre !== undefined) { efecto(); entrar(e, j, J.mazo.splice(k, 1)[0], libre, modo, undefined, ev, true, undefined, 'mazo'); }
            break;
        }
        case 'aullido': if (ocupadas(R).length) { efecto(); for (const k of ocupadas(R)) { R.zonas[k].bono -= 200; ev.push({ t: 'sube', j: r, z: k, n: -200 }); } } break;
        case 'riff': if (ocupadas(J).length > 1) { efecto(); for (const k of ocupadas(J)) if (k !== z) { J.zonas[k].bono += 100; ev.push({ t: 'sube', j, z: k, n: 100 }); } } break;
        case 'asado': { efecto(); curar(e, j, 300 * J.zonas.filter(c => c && carta(c.id).familia === 'amigo').length, ev); break; }
        case 'baile': {
            const k = ocupadas(J).filter(x => J.zonas[x].ataco && J.zonas[x].ataques <= 0);
            if (k.length) { efecto(); for (const x of k) J.zonas[x].ataques = 1; }
            break;
        }
        case 'extra': efecto(); e.invoc++; break;
    }
}

function lanzar(e, j, a, ev) {
    const J = e.jug[j], r = rival(j), id = J.mano.splice(a.m, 1)[0], h = carta(id).efecto;
    J.desc.push(id);
    ev.push({ t: 'hechizo', j, c: id, m: a.m, obj: a.obj, obj2: a.obj2 });
    switch (h) {
        case 'poder': J.zonas[a.obj].bono += 500; ev.push({ t: 'sube', j, z: a.obj, n: 500 }); break;
        case 'rayo': morir(e, r, a.obj, ev); break;
        case 'curar': curar(e, j, 500, ev); break;
        case 'escudo': J.zonas[a.obj].escudo = true; ev.push({ t: 'escudo', j, z: a.obj }); break;
        case 'once': robar(e, j, ev); robar(e, j, ev); break;
        case 'revivir': {
            const vuelve = J.desc.splice(mejorDescarte(J), 1)[0];
            entrar(e, j, vuelve, libres(J)[0], 'ata', undefined, ev, true, undefined, 'desc');
            break;
        }
        case 'abrazo': {
            const A = J.zonas[a.obj], B = J.zonas[a.obj2];
            A.bono += atkDe(e, j, B); A.def = Math.max(A.def, B.def);
            A.unidos.push(B.id, ...B.unidos);
            J.zonas[a.obj2] = null;
            ev.push({ t: 'abrazo', j, z: a.obj, z2: a.obj2, c: B.id });
            break;
        }
    }
}

function morir(e, j, z, ev, combate = false, reemplaza = false) {
    const J = e.jug[j], c = J.zonas[z];
    if (!c) return false;
    if (c.escudo && !reemplaza) { c.escudo = false; ev.push({ t: 'salva', j, z, c: c.id }); return false; }
    J.zonas[z] = null;
    if (!carta(c.id).ficha) J.desc.push(c.id);
    for (const u of c.unidos) J.desc.push(u);
    ev.push({ t: 'muere', j, z, c: c.id, combate, reemplaza });
    // Al morir
    if (ef(c) === 'divide') {
        const zs = (reemplaza ? libres(J).filter(k => k !== z) : [z, ...libres(J).filter(k => k !== z)]).slice(0, 2); // en reemplazo la zona z es de la nueva
        if (zs.length) ev.push({ t: 'efecto', j, z, c: c.id, ef: 'divide' });
        for (const k of zs) entrar(e, j, 'slimecito', k, 'def', undefined, ev, true, undefined, 'mesa');
    } else if (ef(c) === 'hincha') { ev.push({ t: 'efecto', j, z, c: c.id, ef: 'hincha' }); robar(e, j, ev); robar(e, j, ev); }
    return true;
}

function danar(e, j, n, ev) {
    if (n <= 0 || e.ganador !== null) return;
    const antes = e.jug[j].vida; // antes: para animar la vida (n puede pasar de lo que quedaba)
    e.jug[j].vida = Math.max(0, antes - n);
    ev.push({ t: 'dano', j, n, antes });
    if (e.jug[j].vida <= 0) terminarPartida(e, ev, rival(j), 'vida');
}

function atacar(e, j, z, obj, ev) {
    const r = rival(j), A = e.jug[j].zonas[z];
    A.ataques--; A.ataco++;
    ev.push({ t: 'ataque', j, z, obj });
    if (obj < 0) { danar(e, r, atkDe(e, j, A), ev); return; }
    const D = e.jug[r].zonas[obj], a = atkDe(e, j, A);
    let muereA = false, muereD = false;
    if (D.modo === 'ata') {
        const b = atkDe(e, r, D);
        if (a > b) { muereD = true; danar(e, r, a - b, ev); }
        else if (a < b) { muereA = true; danar(e, j, b - a, ev); }
        else muereA = muereD = true;
    } else {
        const d = defDe(e, r, D);
        if (a > d) muereD = true;
        else if (a < d) danar(e, j, d - a, ev);
    }
    // Creeper: si muere, se lleva al otro
    if (muereA && ef(A) === 'explota' && !muereD) { ev.push({ t: 'efecto', j, z, c: A.id, ef: 'explota', obj }); muereD = true; }
    if (muereD && ef(D) === 'explota' && !muereA) { ev.push({ t: 'efecto', j: r, z: obj, c: D.id, ef: 'explota', obj: z }); muereA = true; }
    const derriba = muereD && morir(e, r, obj, ev, true);
    const cae = muereA && morir(e, j, z, ev, true);
    if (!derriba || cae || e.ganador !== null) return;
    if (ef(A) === 'racha' && !A.racha) { A.racha = true; A.ataques++; ev.push({ t: 'efecto', j, z, c: A.id, ef: 'racha' }); }
    if (ef(A) === 'traga') { A.bono += 200; ev.push({ t: 'efecto', j, z, c: A.id, ef: 'traga' }, { t: 'sube', j, z, n: 200 }); }
}

function terminarPartida(e, ev, ganador, motivo) {
    if (e.ganador !== null) return;
    e.ganador = ganador; e.motivo = motivo;
    ev.push({ t: 'fin', ganador, motivo });
}

// ---------------------------------------------------------
// IA de Lucho: prueba cada jugada legal sobre una copia y valora cómo queda la mesa.
//   Con las zonas llenas también reemplaza (la valoración compara lo que sale con lo que entra y la carta gastada).
//   facil: mira solo lo inmediato, con ruido; a veces se olvida de sus hechizos y no siempre ataca bien
//   medio: sin ruido y con mejor criterio (cuida su vida, valora los efectos que quedan en la mesa)
// Siempre devuelve una jugada de jugadas(e).
// ---------------------------------------------------------
export function jugadaIA(e, nivel = 'facil') {
    const lista = jugadas(e);
    if (lista.length <= 1) return lista[0] || null;
    const j = e.turno, medio = nivel === 'medio';
    const olvida = !medio && azar(e) < 0.35;
    const base = valorar(e, j, medio);
    let mejor = lista[lista.length - 1], top = base + (medio ? 1 : 60);
    for (const a of lista) {
        if (a.t === 'terminar') continue;
        if (olvida && a.t === 'hechizo') continue;
        // Reemplazo (zonas llenas): primero ataca con la criatura que se va a sacrificar
        if (a.t === 'invocar' && e.jug[j].zonas[a.z] && objetivos(e, a.z).length) continue;
        const c = clonar(e); aplicar(c, a);
        const v = valorar(c, j, medio) + (medio ? 0 : (azar(e) - 0.5) * 500);
        if (v > top) { top = v; mejor = a; }
    }
    return mejor;
}

// Qué tan bien está el jugador j (más es mejor)
const PESO_EFECTO = { guardian: 250, jefe: 300, iglu: 200, pocion: 250, vuela: 150, racha: 150, traga: 150, divide: 200, hincha: 200, explota: 100, duo: 100 };
export function valorar(e, j, fino = true) {
    if (e.ganador === j) return 1e6;
    if (e.ganador !== null) return e.ganador === 'empate' ? 0 : -1e6;
    const r = rival(j), J = e.jug[j], R = e.jug[r];
    const mesa = (k, P) => P.zonas.reduce((s, c) => {
        if (!c) return s;
        const fuerza = c.modo === 'ata' ? atkDe(e, k, c) : defDe(e, k, c) * 0.7;
        return s + 200 + fuerza * 0.9 + (fino ? (PESO_EFECTO[ef(c)] || 0) + (c.escudo ? 300 : 0) - (c.atada ? 150 : 0) : 0);
    }, 0);
    // Medio cuida más su vida cuando le queda poca
    const vida = fino ? J.vida + Math.max(0, 1200 - J.vida) * 0.8 : J.vida;
    return vida - R.vida * 1.2 + mesa(j, J) - mesa(r, R) + J.mano.length * 120 - R.mano.length * 60;
}

// ---------------------------------------------------------
// Tutorial: la acción legal que calza con un paso (cartas-datos.js, TUTORIAL.pasos / .lucho)
// La mesa la usa para marcar qué tocar (resaltadoTutorial) y para jugar los turnos de Lucho.
// ---------------------------------------------------------
export function accionTutorial(e, esp) {
    return jugadas(e).find(a => calzaTutorial(e, a, esp)) || null;
}
// ¿La acción `a` del jugador de turno es la que pide el paso? (la mesa deja jugar solo esa en el tutorial;
// la zona donde se invoca da lo mismo)
export function calzaTutorial(e, a, esp) {
    if (!a || !esp || a.t !== esp.t) return false;
    const J = e.jug[e.turno], R = e.jug[rival(e.turno)];
    const contraOk = (obj, contra) => (contra === undefined ? true : contra === null ? obj === -1 || obj === undefined : obj >= 0 && R.zonas[obj]?.id === contra);
    if (a.t === 'invocar' || a.t === 'hechizo') return J.mano[a.m] === esp.carta && (!esp.modo || a.modo === esp.modo) && contraOk(a.obj, esp.contra);
    if (a.t === 'atacar') return J.zonas[a.z]?.id === esp.carta && contraOk(a.obj, esp.contra);
    return true;
}
