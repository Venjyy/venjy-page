// =========================================================
// VENJY · Supervivencia · Duelo de Cartas Pixel (7h-2): reglas puras e IA de Lucho
// Sin DOM ni Three: el panel (y luego el duelo entre jugadores) solo llama a estas funciones.
//   nuevaPartida(op) → estado (objeto plano, se puede clonar con JSON; el azar va en `r`, determinista)
//   jugadas(e)       → acciones legales del jugador de turno
//   aplicar(e, a)    → cambia `e` y devuelve los eventos (para animar: roba, invoca, ataque, muere…)
//   jugadaIA(e, nivel) → una acción legal ('facil' | 'medio')
//   accionTutorial(e, esperada) → la acción legal que calza con un paso de TUTORIAL (o null)
// Turno: fase 'robo' (solo «robar») → fase 'principal': invocar (1 por turno, más con Venjy),
// hechizos sin límite, atacar con cada criatura (no la recién invocada) y cambiar postura; «terminar».
// Acciones: { t:'robar' } · { t:'invocar', m, z, modo:'ata'|'def', obj? } · { t:'hechizo', m, obj? }
//           { t:'atacar', z, obj } (obj -1 = directo) · { t:'modo', z } · { t:'terminar' }
//   m = índice en tu mano, z = tu zona (0-2), obj = zona rival (o propia para la Poción de Fuerza).
// =========================================================
import { CARTAS, PIDE_RIVAL, PIDE_PROPIA } from './cartas-datos.js';

export const VIDA = 2000, MANO_INICIAL = 3, MANO_MAX = 6, ZONAS = 3, TOPE_TURNOS = 80;

// Azar determinista (mulberry32) guardado en el estado
function azar(e) {
    let x = (e.r = (e.r + 0x6d2b79f5) | 0);
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
}

export function nuevaPartida({ mazos, semilla = 1, empieza = 0, barajar = true, vidas = [VIDA, VIDA] } = {}) {
    const e = { r: semilla | 0, turno: empieza, n: 1, fase: 'robo', invoc: 1, ganador: null, motivo: null, jug: [] };
    for (let j = 0; j < 2; j++) {
        const mazo = mazos[j].slice();
        if (barajar) for (let i = mazo.length - 1; i > 0; i--) { const k = Math.floor(azar(e) * (i + 1)); [mazo[i], mazo[k]] = [mazo[k], mazo[i]]; }
        e.jug.push({ vida: vidas[j], mazo, mano: mazo.splice(0, MANO_INICIAL), zonas: Array(ZONAS).fill(null), desc: [] });
    }
    return e;
}

export const clonar = e => JSON.parse(JSON.stringify(e));
const carta = id => CARTAS[id];
const rival = j => 1 - j;
const libres = J => J.zonas.map((c, z) => (c ? -1 : z)).filter(z => z >= 0);
const ocupadas = J => J.zonas.map((c, z) => (c ? z : -1)).filter(z => z >= 0);
export const atkDe = c => c.atk + c.bono;

// ---- Acciones legales ----
export function jugadas(e) {
    if (e.ganador !== null) return [];
    if (e.fase === 'robo') return [{ t: 'robar' }];
    const j = e.turno, J = e.jug[j], R = e.jug[rival(j)], out = [];
    const objRival = ocupadas(R);
    J.mano.forEach((id, m) => {
        const c = carta(id);
        if (c.tipo === 'criatura') {
            if (e.invoc <= 0) return;
            for (const z of libres(J)) for (const modo of ['ata', 'def']) {
                if (PIDE_RIVAL.has(c.efecto) && objRival.length) for (const obj of objRival) out.push({ t: 'invocar', m, z, modo, obj });
                else out.push({ t: 'invocar', m, z, modo });
            }
        } else if (PIDE_RIVAL.has(c.efecto)) for (const obj of objRival) out.push({ t: 'hechizo', m, obj });
        else if (PIDE_PROPIA.has(c.efecto)) for (const obj of ocupadas(J)) out.push({ t: 'hechizo', m, obj });
        else out.push({ t: 'hechizo', m });
    });
    for (const z of ocupadas(J)) {
        const c = J.zonas[z];
        for (const obj of objetivos(e, z)) out.push({ t: 'atacar', z, obj });
        if (!c.nueva && !c.cambio && !c.ataco) out.push({ t: 'modo', z });
    }
    out.push({ t: 'terminar' });
    return out;
}

// Zonas rivales que puede atacar la criatura de tu zona z (-1 = directo)
export function objetivos(e, z) {
    const j = e.turno, c = e.jug[j].zonas[z], R = e.jug[rival(j)];
    if (!c || e.fase !== 'principal' || e.n === 1 || c.nueva || c.modo !== 'ata' || c.atada || c.ataques <= 0) return [];
    const vuela = carta(c.id).efecto === 'vuela';
    const en = ocupadas(R), guardias = en.filter(k => carta(R.zonas[k].id).efecto === 'guardian');
    const out = guardias.length && !vuela ? guardias : en.slice();
    if (!en.length || vuela) out.push(-1);
    return out;
}

const igual = (a, b) => a.t === b.t && a.m === b.m && a.z === b.z && a.modo === b.modo && a.obj === b.obj;
export const esLegal = (e, a) => jugadas(e).some(b => igual(a, b));

// ---- Aplicar ----
export function aplicar(e, a) {
    if (!esLegal(e, a)) throw new Error('jugada ilegal: ' + JSON.stringify(a));
    const ev = [], j = e.turno, J = e.jug[j], R = e.jug[rival(j)];
    switch (a.t) {
        case 'robar': {
            e.fase = 'principal';
            if (!J.mazo.length) { terminarPartida(e, ev, rival(j), 'mazo'); break; }
            robar(e, j, ev);
            break;
        }
        case 'invocar': {
            e.invoc--;
            const id = J.mano.splice(a.m, 1)[0];
            entrar(e, j, id, a.z, a.modo, a.obj, ev, false);
            break;
        }
        case 'hechizo': {
            const id = J.mano.splice(a.m, 1)[0], ef = carta(id).efecto;
            J.desc.push(id);
            ev.push({ t: 'hechizo', j, c: id, obj: a.obj });
            if (ef === 'poder') { J.zonas[a.obj].bono += 500; ev.push({ t: 'sube', j, z: a.obj, n: 500 }); }
            else if (ef === 'rayo') morir(e, rival(j), a.obj, ev);
            else if (ef === 'curar') { J.vida += 500; ev.push({ t: 'cura', j, n: 500 }); }
            break;
        }
        case 'atacar': atacar(e, j, a.z, a.obj, ev); break;
        case 'modo': {
            const c = J.zonas[a.z];
            c.modo = c.modo === 'ata' ? 'def' : 'ata'; c.cambio = true;
            ev.push({ t: 'modo', j, z: a.z, modo: c.modo });
            break;
        }
        case 'terminar': {
            for (const c of J.zonas) if (c) { c.nueva = false; c.atada = 0; }
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

// Pone la criatura en la zona y dispara su efecto de entrada (los combos salen de aquí)
function entrar(e, j, id, z, modo, obj, ev, gratis) {
    const J = e.jug[j], R = e.jug[rival(j)], c = carta(id);
    J.zonas[z] = { id, atk: c.atk, def: c.def, bono: 0, modo, nueva: true, ataques: 1, ataco: 0, atada: 0, cambio: false, racha: false };
    ev.push({ t: 'invoca', j, z, c: id, modo, gratis });
    const efecto = (extra = {}) => ev.push({ t: 'efecto', j, z, c: id, ef: c.efecto, ...extra });
    switch (c.efecto) {
        case 'horda': {
            const m = J.mano.indexOf('zombi'), libre = libres(J)[0];
            if (m >= 0 && libre !== undefined) { efecto(); J.mano.splice(m, 1); entrar(e, j, 'zombi', libre, modo, undefined, ev, true); }
            break;
        }
        case 'flecha': efecto(); danar(e, rival(j), 200, ev); break;
        case 'telarana': if (obj !== undefined && R.zonas[obj]) { efecto({ obj }); R.zonas[obj].atada = 1; ev.push({ t: 'atada', j: rival(j), z: obj }); } break;
        case 'robar': efecto(); robar(e, j, ev); break;
        case 'barco': if (obj !== undefined && R.zonas[obj]) {
            efecto({ obj });
            const vuelve = R.zonas[obj].id; R.zonas[obj] = null;
            if (R.mano.length >= MANO_MAX) R.desc.push(vuelve); else R.mano.push(vuelve);
            ev.push({ t: 'vuelve', j: rival(j), z: obj, c: vuelve });
        } break;
        case 'pesca': {
            const k = J.mazo.findIndex(x => carta(x).tipo === 'hechizo');
            if (k >= 0 && J.mano.length < MANO_MAX) { efecto(); const h = J.mazo.splice(k, 1)[0]; J.mano.push(h); ev.push({ t: 'roba', j, c: h, pesca: true }); }
            break;
        }
        case 'extra': efecto(); e.invoc++; break;
    }
}

function morir(e, j, z, ev) {
    const J = e.jug[j], c = J.zonas[z];
    if (!c) return;
    J.zonas[z] = null; J.desc.push(c.id);
    ev.push({ t: 'muere', j, z, c: c.id });
}

function danar(e, j, n, ev) {
    if (n <= 0 || e.ganador !== null) return;
    e.jug[j].vida = Math.max(0, e.jug[j].vida - n);
    ev.push({ t: 'dano', j, n });
    if (e.jug[j].vida <= 0) terminarPartida(e, ev, rival(j), 'vida');
}

function atacar(e, j, z, obj, ev) {
    const r = rival(j), A = e.jug[j].zonas[z];
    A.ataques--; A.ataco++;
    ev.push({ t: 'ataque', j, z, obj });
    if (obj < 0) { danar(e, r, atkDe(A), ev); return; }
    const D = e.jug[r].zonas[obj], a = atkDe(A);
    let muereA = false, muereD = false;
    if (D.modo === 'ata') {
        const b = atkDe(D);
        if (a > b) { muereD = true; danar(e, r, a - b, ev); }
        else if (a < b) { muereA = true; danar(e, j, b - a, ev); }
        else muereA = muereD = true;
    } else if (a > D.def) muereD = true;
    else if (a < D.def) danar(e, j, D.def - a, ev);
    // Creeper: si muere, se lleva al otro
    if (muereA && carta(A.id).efecto === 'explota' && !muereD) { ev.push({ t: 'efecto', j, z, c: A.id, ef: 'explota', obj }); muereD = true; }
    if (muereD && carta(D.id).efecto === 'explota' && !muereA) { ev.push({ t: 'efecto', j: r, z: obj, c: D.id, ef: 'explota', obj: z }); muereA = true; }
    if (muereD) morir(e, r, obj, ev);
    if (muereA) morir(e, j, z, ev);
    if (muereD && !muereA && carta(A.id).efecto === 'racha' && !A.racha) { A.racha = true; A.ataques++; ev.push({ t: 'efecto', j, z, c: A.id, ef: 'racha' }); }
}

function terminarPartida(e, ev, ganador, motivo) {
    if (e.ganador !== null) return;
    e.ganador = ganador; e.motivo = motivo;
    ev.push({ t: 'fin', ganador, motivo });
}

// ---------------------------------------------------------
// IA de Lucho
//   facil: reglas simples con algo de ruido (juega la más fuerte, ataca si gana)
//   medio: prueba cada jugada legal sobre una copia y elige la que deja mejor la mesa
// Siempre devuelve una jugada de jugadas(e).
// ---------------------------------------------------------
export function jugadaIA(e, nivel = 'facil') {
    const lista = jugadas(e);
    if (lista.length <= 1) return lista[0] || null;
    const j = e.turno;
    let mejor = lista[lista.length - 1], top = -Infinity;
    if (nivel === 'medio') {
        const base = valorar(e, j);
        for (const a of lista) {
            let v;
            if (a.t === 'terminar') v = base + 1;
            else { const c = clonar(e); aplicar(c, a); v = valorar(c, j); }
            if (v > top) { top = v; mejor = a; }
        }
        return mejor;
    }
    for (const a of lista) {
        const v = puntajeFacil(e, a) + azar(e) * 25;
        if (v > top) { top = v; mejor = a; }
    }
    return top > 0 ? mejor : lista.find(a => a.t === 'terminar');
}

function puntajeFacil(e, a) {
    const j = e.turno, J = e.jug[j], R = e.jug[rival(j)];
    if (a.t === 'terminar') return 0;
    if (a.t === 'modo') return -30;
    if (a.t === 'invocar') {
        const c = carta(J.mano[a.m]);
        return 50 + c.atk / 100 + (a.modo === 'def' ? -15 : 0) + (a.obj !== undefined ? atkDe(R.zonas[a.obj]) / 1000 : 0) - a.z;
    }
    if (a.t === 'hechizo') {
        const ef = carta(J.mano[a.m]).efecto;
        if (ef === 'curar') return J.vida < 1200 ? 40 : -1;
        if (ef === 'rayo') { const d = R.zonas[a.obj]; return atkDe(d) >= 800 ? 30 + atkDe(d) / 100 : 5; }
        if (ef === 'poder') return objetivos(e, a.obj).length ? 20 + atkDe(J.zonas[a.obj]) / 1000 : -1;
    }
    if (a.t === 'atacar') {
        const at = atkDe(J.zonas[a.z]);
        if (a.obj < 0) return 70 + at / 100;
        const d = R.zonas[a.obj], b = d.modo === 'ata' ? atkDe(d) : d.def;
        return at > b ? 60 + b / 100 : at === b ? -5 : -50;
    }
    return 0;
}

// Qué tan bien está el jugador j (más es mejor)
export function valorar(e, j) {
    if (e.ganador === j) return 1e6;
    if (e.ganador !== null) return e.ganador === 'empate' ? 0 : -1e6;
    const J = e.jug[j], R = e.jug[rival(j)];
    const mesa = P => P.zonas.reduce((s, c) => s + (c ? 200 + (c.modo === 'ata' ? atkDe(c) : c.def * 0.7) * 0.9 : 0), 0);
    return J.vida - R.vida * 1.2 + mesa(J) - mesa(R) + J.mano.length * 120 - R.mano.length * 60;
}

// ---------------------------------------------------------
// Tutorial: la acción legal que calza con un paso (cartas-datos.js, TUTORIAL.pasos / .lucho)
// El panel la usa para marcar qué tocar y para jugar los turnos de Lucho.
// ---------------------------------------------------------
export function accionTutorial(e, esp) {
    const J = e.jug[e.turno], R = e.jug[rival(e.turno)];
    const contraOk = (obj, contra) => (contra === undefined ? true : contra === null ? obj === -1 || obj === undefined : obj >= 0 && R.zonas[obj]?.id === contra);
    return jugadas(e).find(a => {
        if (a.t !== esp.t) return false;
        if (a.t === 'invocar' || a.t === 'hechizo') return J.mano[a.m] === esp.carta && (!esp.modo || a.modo === esp.modo) && contraOk(a.obj, esp.contra);
        if (a.t === 'atacar') return J.zonas[a.z]?.id === esp.carta && contraOk(a.obj, esp.contra);
        return true;
    }) || null;
}
