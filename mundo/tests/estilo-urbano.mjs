// =========================================================
// Estilo Urban Reign (bloque 8 · L5): node mundo/tests/estilo-urbano.mjs
// Cubre mundo/datos/estilo-urbano.json con combate/estados.js, combate/urbano.js, combate/ia.js y arena/modelo.js
// (mundo/COMBATE.md §17.3-17.5 y §19.6):
//   1. Datos: el estilo pasa las reglas de validar; Moisés pelea con él; la reacción lanzado existe
//   2. Alturas: W = alto, S = bajo, sin dirección = combo básico (jab), adelante = medio; lo mismo en la defensa
//   3. Ventanas del desvío por altura: reversión 0-3 c, desvío 4-8 c (contraataque según la altura), después los
//      i-frames de la esquiva neutra o del paso lateral; +2 c en el táctil
//   4. Altura errada dentro de la ventana: el golpe entra con +30 %; la esquiva neutra deja pasar alto y medio
//   5. Cancelación solo al conectar: jab → recto → gancho si pegan; si el jab falla, recuperación entera
//   6. El gancho lanza; golpe aéreo y agarre aéreo solo contra el lanzado
//   7. Esquiva neutra: castigo bajo 4 c más rápido en su ventana
//   8. Contra Sekiro: desvía la estocada (media) y el barrido (bajo); el agarre no se desvía; sin postura propia
//   9. CPU de Moisés: cadenas de alturas, desvía leyendo la altura (más con más dificultad), nunca bloquea, determinista
// =========================================================
import { pathToFileURL, fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { readFileSync } from 'fs';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '../../');
const imp = p => import(pathToFileURL(resolve(raiz, p)).href);
const leer = n => JSON.parse(readFileSync(resolve(raiz, 'mundo/datos', n + '.json'), 'utf8'));

let fallos = 0, pruebas = 0;
const ok = (cond, msg) => { pruebas++; if (!cond) { if (fallos < 40) console.error('FALLO: ' + msg); fallos++; } };

const D = await imp('mundo/supervivencia/combate/datos.js');
const L = await imp('mundo/datos/limites.js');
const E = await imp('mundo/supervivencia/combate/estados.js');
const M = await imp('mundo/supervivencia/arena/modelo.js');
const U = await imp('mundo/supervivencia/combate/urbano.js');
const { reglasEstilo } = await imp('mundo/supervivencia/combate/reglas.js');
const COMB = leer('combate'), POSES = leer('poses');
D.fijarCombate(COMB);
L.fijarLimites(POSES.limites);
const UR = leer('estilo-urbano'), SK = leer('estilo-sekiro'), PRUEBA = leer('estilo-prueba'), ARENA = leer('arena');
const estilos = { urbano: UR, sekiro: SK, prueba: PRUEBA };
const A = UR.reglas.altura;

// ---------- 1. Datos ----------
{
    const r = reglasEstilo(UR, { combate: COMB, limites: POSES.limites }).filter(x => x.tipo === 'error').map(x => x.texto);
    ok(r.length === 0, `estilo-urbano.json sin errores (${r.slice(0, 4).join(' · ')})`);
    ok(ARENA.peleadores.moises.estilo === 'urbano', 'Moisés pelea con el estilo urbano');
    ok(COMB.reacciones.lanzado && COMB.anim.lanzado, 'combate.json trae la reacción lanzado');
    ok(!UR.controles.defensaMantenida && !UR.bloqueo, 'Urban Reign no bloquea');
    for (const h of ['alto', 'medio', 'bajo']) ok(D.accionDe(UR, A.contra[h]), `contraataque ${h} (${A.contra[h]})`);
    ok(D.accionDe(UR, A.reversionAccion), 'reversión');
    const R = U.reglasAltura(UR);
    ok(R && R.ventana === 8 && R.reversion === 3 && Math.abs(R.errada - 1.3) < 1e-9, 'ventanas de §17.5: reversión 3, desvío 8, errada ×1,3');
    ok(U.reglasAltura(SK) === null, 'Sekiro no usa la defensa por altura');
}

// ---------- 2. Alturas ----------
function controla(tipo, altura, mover = [0, 0]) {
    const p = E.crearPeleador(UR);
    E.paso(p, { [tipo]: 'apretar', altura, mover });
    return p.clave;
}
{
    ok(controla('atacar', 'medio') === 'jab', 'sin dirección: jab (combo básico)');
    ok(controla('atacar', 'alto') === 'gancho_alto', 'W + clic: alto (gancho a la cabeza)');
    ok(controla('atacar', 'bajo') === 'barrida', 'S + clic: bajo (barrida)');
    ok(controla('atacar', 'medio', [1, 0]) === 'patada_frontal', 'adelante + clic: medio (patada frontal)');
    ok(controla('atacar', 'medio', [0.3, 0]) === 'jab', 'un poco adelante (bajo el umbral): jab');
    ok(controla('atacar', 'alto', [1, 0]) === 'gancho_alto', 'W manda sobre adelante');
    ok(controla('defensa', 'medio') === 'esquiva_neutra', 'defensa sin dirección: esquiva neutra');
    ok(controla('defensa', 'medio', [1, 0]) === 'esquiva_neutra', 'defensa + adelante: la neutra (desvía el medio)');
    ok(controla('defensa', 'alto') === 'defensa_alta' && controla('defensa', 'bajo') === 'defensa_baja', 'defensa + W o S');
    ok(controla('esquivar', 'alto') === 'paso_lateral_alto' && controla('esquivar', 'bajo') === 'paso_lateral_bajo', 'Shift + W o S: paso lateral');
    ok(UR.ataques.jab.altura === 'alto' && UR.ataques.patada_frontal.altura === 'medio' && UR.ataques.barrida.altura === 'bajo', 'cada golpe trae su altura');
}

// ---------- Pelea de prueba: f[0] ataca, f[1] defiende ----------
const avanzar = (P, n, f) => { for (let i = 0; i < n; i++) M.pasoPelea(P, f ? f(i) : [{}, {}]); };
function enPelea({ yo = 'lalo', rival = 'moises', lalo = 'urbano', moises = 'urbano', tactil = false, semilla = 3, dificultad = 'normal' } = {}) {
    const R = M.reglasArena({ ...ARENA, peleadores: { ...ARENA.peleadores, lalo: { ...ARENA.peleadores.lalo, estilo: lalo }, moises: { ...ARENA.peleadores.moises, estilo: moises } } });
    const P = M.nuevaPelea(R, { estilos, semilla, yo, rival, tactil, dificultad });
    let n = 0; while (!P.listaEntrada && n++ < 2000) M.pasoPelea(P, []);
    M.empezarRondas(P);
    n = 0; while (P.fase !== 'pelea' && n++ < 2000) M.pasoPelea(P, []);
    return P;
}
const ATAQUE = { alto: { atacar: 'apretar', altura: 'alto' }, medio: { atacar: 'apretar', altura: 'medio', mover: [1, 0] }, bajo: { atacar: 'apretar', altura: 'bajo' } };
const CLAVE = { alto: 'gancho_alto', medio: 'patada_frontal', bajo: 'barrida' };
// a (0 o 1) tira su golpe de altura h a b; b aprieta `def` (intención) de modo que su acción lleve d cuadros al impacto
const ESPERA = 20; // el golpe sale en el cuadro ESPERA (así la defensa puede apretarse antes que el ataque)
function cambio(P, a, h, def, d, { dist = 1.3, it = null, clave: k = null } = {}) {
    const b = 1 - a, F = P.f[a], O = P.f[b];
    O.x = F.x + (a === 0 ? dist : -dist); O.z = F.z;
    const atk = it || ATAQUE[h], clave = k || (it ? it.accion : CLAVE[h]);
    const ant = ESPERA + D.inicioFase(D.accionDe(F.estilo, clave).fases, 'activo');
    const v0 = O.vida, va = F.vida;
    let ev = null;
    for (let i = 0; i < 140 && !ev; i++) {
        const ints = [{}, {}];
        if (i === ESPERA) ints[a] = atk;
        if (def && d != null && i === ant - d) ints[b] = def;
        M.pasoPelea(P, ints);
        ev = P.eventos.find(e => e.tipo === 'golpe' && e.de === a) || null;
    }
    return { ev, res: ev && ev.resultado, dv: v0 - O.vida, va: va - F.vida, P, O, F };
}
const DEF = { alto: { defensa: 'apretar', altura: 'alto' }, medio: { defensa: 'apretar', altura: 'medio' }, bajo: { defensa: 'apretar', altura: 'bajo' } };

// ---------- 3. Ventanas ----------
{
    for (const h of ['alto', 'medio', 'bajo']) {
        const dano = UR.ataques[CLAVE[h]].dano;
        const nada = cambio(enPelea(), 0, h, null, null);
        ok(nada.res === 'golpeado' && Math.abs(nada.dv - dano) < 1e-9, `${h} sin defensa: entra (${nada.res}, ${nada.dv})`);
        for (let d = 0; d <= A.reversion; d++) {
            const r = cambio(enPelea(), 0, h, DEF[h], d);
            ok(r.res === 'reversion' && r.dv === 0, `${h}, defensa ${d} c antes: reversión (${r.res})`);
            ok(r.O.p.clave === A.reversionAccion && r.F.p.clave === 'agarrado', `reversión: atrapa y lanza (${r.O.p.clave} / ${r.F.p.clave})`);
        }
        for (let d = A.reversion + 1; d <= A.ventana; d++) {
            const r = cambio(enPelea(), 0, h, DEF[h], d);
            ok(r.res === 'desviado' && r.dv === 0, `${h}, defensa ${d} c antes: desvío (${r.res})`);
            ok(r.O.p.clave === A.contra[h], `desvío ${h}: contraataque ${A.contra[h]} (${r.O.p.clave})`);
        }
        // Después de la ventana mandan los i-frames de la acción (paso lateral o esquiva neutra)
        for (const d of [A.ventana + 1, A.ventana + 2]) {
            const r = cambio(enPelea(), 0, h, DEF[h], d);
            ok(r.res === 'esquivado' || r.ev === null, `${h}, defensa ${d} c antes: fuera de la ventana, la esquiva (${r.res})`);
        }
    }
    // El contraataque pega en su activo: el atacante juega la reacción y pierde vida
    const r = cambio(enPelea(), 0, 'alto', DEF.alto, 6);
    const v = r.F.vida;
    avanzar(r.P, 20);
    const pq = UR.acciones.contra_alto.pareja;
    ok(Math.abs(v - r.F.vida - pq.dano) < 1e-9, `el contraataque alto quita ${pq.dano} (${(v - r.F.vida).toFixed(1)})`);
    // Táctil: +2 c en las dos ventanas (el tuyo es f[0]: defiende f[0])
    const t1 = cambio(enPelea({ yo: 'moises', rival: 'lalo', tactil: true }), 1, 'alto', DEF.alto, A.ventana + A.tactil);
    ok(t1.res === 'desviado', `táctil: desvío ${A.ventana + A.tactil} c antes (${t1.res})`);
    const t2 = cambio(enPelea({ yo: 'moises', rival: 'lalo', tactil: true }), 1, 'alto', DEF.alto, A.reversion + A.tactil);
    ok(t2.res === 'reversion', `táctil: reversión ${A.reversion + A.tactil} c antes (${t2.res})`);
    const t3 = cambio(enPelea({ yo: 'lalo', rival: 'moises' }), 1, 'alto', DEF.alto, A.ventana + A.tactil);
    ok(t3.res !== 'desviado', `en PC, ${A.ventana + A.tactil} c antes ya no desvía (${t3.res})`);
}

// ---------- 4. Altura errada ----------
{
    const base = UR.ataques.gancho_alto.dano;
    for (const [h, def] of [['alto', DEF.bajo], ['medio', DEF.alto], ['bajo', DEF.alto], ['bajo', DEF.medio]]) {
        const r = cambio(enPelea(), 0, h, def, 5);
        const dano = UR.ataques[CLAVE[h]].dano;
        ok(r.res === 'golpeado' && r.ev.errada && Math.abs(r.dv - dano * A.errada) < 1e-9, `${h} con la defensa ${def.altura}: entra con +30 % (${r.res}, ${r.dv.toFixed(2)} de ${dano})`);
    }
    const w = cambio(enPelea(), 0, 'alto', DEF.medio, 5);
    ok(w.res === 'esquivado' && w.dv === 0, `la esquiva neutra deja pasar el alto por arriba (${w.res})`);
    ok(base > 0, 'gancho_alto con daño');
    // Fuera de la ventana no hay errada: el golpe entra normal (o lo esquiva)
    const f = cambio(enPelea(), 0, 'bajo', DEF.medio, 11);
    ok(!(f.ev && f.ev.errada), `fuera de la ventana no hay errada (${f.res})`);
}

// ---------- 5. Cancelación solo al conectar ----------
function combo(dist, apretarEn) {
    const P = enPelea(), F = P.f[0], O = P.f[1];
    O.x = F.x + dist; O.z = F.z;
    const claves = [];
    for (let i = 0; i < 90; i++) {
        const a = i === 0 || apretarEn.includes(i) ? { atacar: 'apretar', altura: 'medio' } : {};
        M.pasoPelea(P, [a, {}]);
        if (!dist) { O.x = F.x + 1.3; O.z = F.z; }
        for (const e of F.p.eventos) if (e.tipo === 'inicio') claves.push(e.clave);
        if (dist > 2) { O.x = F.x + dist; O.z = F.z; }
    }
    return claves;
}
{
    const j = UR.ataques.jab.fases, finJab = D.largoFases(j), r2 = D.inicioFase(j, 'recuperacion') + 2;
    // Apretando cada cuadro: el siguiente sale apenas abre su ventana
    const todo = Array.from({ length: 80 }, (_, i) => i + 1);
    const c = combo(1.3, todo);
    ok(c[0] === 'jab' && c[1] === 'recto' && c[2] === 'gancho', `conectando: jab → recto → gancho (${c.slice(0, 3).join(', ')})`);
    // Fallando (lejos): ningún cancel; el siguiente jab sale recién al terminar la recuperación entera
    const P = enPelea(), F = P.f[0], O = P.f[1];
    O.x = F.x + 4; O.z = F.z;
    let inicioSegundo = -1;
    for (let i = 0; i < 60; i++) {
        M.pasoPelea(P, [{ atacar: 'apretar', altura: 'medio' }, {}]);
        O.x = F.x + 4; O.z = F.z;
        if (i > 0 && inicioSegundo < 0 && F.p.eventos.some(e => e.tipo === 'inicio')) inicioSegundo = i;
    }
    ok(inicioSegundo >= finJab, `fallando, el jab no se cancela: lo siguiente sale en c${inicioSegundo} (recuperación entera hasta c${finJab})`);
    const P2 = enPelea(); P2.f[1].x = P2.f[0].x + 4;
    const vistos = [];
    for (let i = 0; i < 45; i++) { M.pasoPelea(P2, [{ atacar: 'apretar', altura: 'medio' }, {}]); P2.f[1].x = P2.f[0].x + 4; for (const e of P2.f[0].p.eventos) if (e.tipo === 'inicio') vistos.push(e.clave); }
    ok(vistos.length >= 2 && vistos.every(k => k === 'jab'), `fallando siempre sale jab, nunca el recto (${vistos.join(', ')})`);
    // Conectando, la ventana abre en r+2 y no antes
    const P3 = enPelea(); P3.f[1].x = P3.f[0].x + 1.3;
    let recto = -1;
    for (let i = 0; i < 40 && recto < 0; i++) {
        M.pasoPelea(P3, [i === 0 || i >= 2 ? { atacar: 'apretar', altura: 'medio' } : {}, {}]);
        if (P3.f[0].p.clave === 'recto' && recto < 0) recto = P3.f[0].p.cuadros;
    }
    ok(recto > 0, `el recto sale tras el jab que conectó (cuadro ${recto}; ventana desde r+2 = c${r2})`);
}

// ---------- 6. Lanzado y remates aéreos ----------
function lanzar(remate) {
    const P = enPelea(), F = P.f[0], O = P.f[1];
    O.x = F.x + 1.2; O.z = F.z;
    const ev = [];
    let lanzado = false;
    for (let i = 0; i < 160; i++) {
        const p = F.p;
        let it = {};
        if (p.estado === 'guardia' && !lanzado) it = { atacar: 'apretar', altura: 'medio' };
        else if ((p.clave === 'jab' || p.clave === 'recto')) it = { atacar: 'apretar', altura: 'medio' };
        else if (p.clave === 'gancho' && p.conecto) it = { saltar: 'apretar' };
        else if (p.clave === 'salto' && remate) it = remate === 'golpe' ? { atacar: 'apretar' } : { agarre: 'apretar' };
        M.pasoPelea(P, [it, {}]);
        if (O.p.clave === 'lanzado') lanzado = true;
        for (const e of P.eventos) if (e.tipo === 'golpe' && e.de === 0) ev.push(e);
    }
    return { P, ev, lanzado };
}
{
    const g = lanzar('golpe');
    ok(g.lanzado, 'el gancho del combo lanza al rival');
    const aereo = g.ev.find(e => e.clave === 'golpe_aereo');
    ok(aereo && aereo.resultado === 'golpeado' && aereo.reaccion === 'derribo', `golpe aéreo al lanzado: derribo (${aereo && aereo.reaccion})`);
    const a = lanzar('agarre');
    const ag = a.ev.find(e => e.clave === 'agarre_aereo' || e.clave === 'azote'); // (el evento sale con la acción que sigue: azote)
    ok(ag && ag.resultado === 'golpeado' && ag.reaccion === 'agarrado', `agarre aéreo al lanzado: lo azota (${ag && ag.reaccion})`);
    // Contra un rival de pie, el golpe aéreo no pega
    const P = enPelea(), F = P.f[0], O = P.f[1];
    O.x = F.x + 1.2; O.z = F.z;
    let pego = false;
    M.pasoPelea(P, [{ saltar: 'apretar' }, {}]);
    for (let i = 0; i < 50; i++) {
        M.pasoPelea(P, [F.p.clave === 'salto' ? { atacar: 'apretar' } : {}, {}]);
        O.x = F.x + 1.2; O.z = F.z;
        if (P.eventos.some(e => e.tipo === 'golpe' && e.de === 0)) pego = true;
    }
    ok(!pego, 'el golpe aéreo no pega al rival de pie (soloSi lanzado)');
}

// ---------- 7. Castigo bajo de la esquiva neutra ----------
{
    const p = E.crearPeleador(UR);
    E.paso(p, { defensa: 'apretar', altura: 'medio' });
    ok(p.clave === 'esquiva_neutra', 'empieza la esquiva neutra');
    const f = UR.acciones.esquiva_neutra.fases, desde = D.marca('recuperacion+3', f);
    while (p.c < desde - 1) E.paso(p, {});
    const q = JSON.parse(JSON.stringify({ c: p.c }));
    E.paso(p, { atacar: 'apretar', altura: 'bajo' });
    ok(p.clave === 'barrida_castigo', `S + clic en la ventana de castigo: barrida rápida (${p.clave}, c${q.c})`);
    const ant = D.inicioFase(UR.ataques.barrida_castigo.fases, 'activo'), antN = D.inicioFase(UR.ataques.barrida.fases, 'activo');
    ok(antN - ant === 4, `sale 4 c antes que la barrida normal (${ant} contra ${antN})`);
    const p2 = E.crearPeleador(UR);
    E.paso(p2, { defensa: 'apretar', altura: 'medio' });
    while (p2.c < desde - 1) E.paso(p2, {});
    E.paso(p2, { atacar: 'apretar', altura: 'medio' });
    ok(p2.clave === 'jab', `sin S, el jab de siempre (${p2.clave})`);
    const p3 = E.crearPeleador(UR);
    E.paso(p3, { defensa: 'apretar', altura: 'medio' });
    E.paso(p3, {}); E.paso(p3, { atacar: 'apretar', altura: 'bajo' });
    ok(p3.clave === 'esquiva_neutra', 'en plena esquiva no sale el castigo');
}

// ---------- 8. Contra Sekiro ----------
{
    const pelea = () => enPelea({ lalo: 'sekiro', moises: 'urbano' });
    const est = cambio(pelea(), 0, null, DEF.medio, 6, { it: { accion: 'estocada' } });
    ok(est.res === 'desviado', `desvía la estocada de Lalo con la altura media (${est.res})`);
    const bar = cambio(pelea(), 0, null, DEF.bajo, 6, { it: { accion: 'barrido' } });
    ok(bar.res === 'desviado', `desvía el barrido de Lalo con S (${bar.res})`);
    const aga = cambio(pelea(), 0, null, DEF.alto, 6, { it: { accion: 'agarre' }, dist: 1.4 });
    ok(aga.res !== 'desviado' && aga.res !== 'reversion', `el agarre no se desvía (${aga.res})`);
    const tajo = cambio(pelea(), 0, null, null, null, { it: { atacar: 'apretar' }, clave: 'tajo1' });
    ok(tajo.res === 'golpeado' && tajo.O.post.valor === 0, `Moisés no tiene postura: recibe el tajo sin sumar (${tajo.O.post.valor})`);
    const dv = cambio(pelea(), 0, null, DEF.alto, 6, { it: { atacar: 'apretar' }, clave: 'tajo1' });
    ok(dv.res === 'desviado' && dv.F.post.valor > 0, `desviar el tajo alto le suma postura a Lalo (${dv.F.post.valor.toFixed(1)})`);
    // Urban Reign → Sekiro: Lalo desvía los golpes de Moisés sin adivinar la altura
    const P = enPelea({ yo: 'moises', rival: 'lalo', lalo: 'sekiro', moises: 'urbano' });
    const ls = cambio(P, 0, 'bajo', { defensa: 'apretar' }, 6);
    ok(ls.res === 'desviado' || ls.res === 'perfecto', `Lalo desvía la barrida sin adivinar (${ls.res})`);
}

// ---------- 9. CPU de Moisés ----------
function cpuAtaca(semilla, dificultad = 'normal', cuadros = 1800) {
    const P = enPelea({ lalo: 'sekiro', moises: 'urbano', semilla, dificultad });
    const vistos = [];
    for (let i = 0; i < cuadros && P.fase === 'pelea'; i++) {
        M.pasoPelea(P, [{}, M.intencionCPU(P, 1)]);
        for (const e of P.f[1].p.eventos) if (e.tipo === 'inicio') vistos.push(e.clave);
        P.f[0].vida = P.f[0].vidaMax; P.f[1].vida = P.f[1].vidaMax; P.reloj = 60;
    }
    return vistos;
}
{
    const v = cpuAtaca(11);
    const set = new Set(v);
    ok(set.has('jab'), 'Moisés tantea con jabs');
    ok(['gancho_alto', 'barrida', 'patada_frontal'].filter(k => set.has(k)).length >= 2, `cambia de altura (${[...set].join(', ')})`);
    ok(!set.has('bloqueo'), 'nunca bloquea');
    ok(JSON.stringify(v) === JSON.stringify(cpuAtaca(11)), 'determinista con la misma semilla');
    let max = 0, run = 0, prev = null;
    for (const k of v.filter(k => UR.ataques[k])) { run = k === prev ? run + 1 : 1; prev = k; max = Math.max(max, run); }
    ok(max <= 3, `no repite el mismo golpe más de 3 veces seguidas (${max})`);
}
function cpuDefiende(dificultad, semilla = 5) {
    const P = enPelea({ lalo: 'sekiro', moises: 'urbano', semilla, dificultad });
    const r = { desviado: 0, reversion: 0, golpeado: 0, esquivado: 0, errada: 0, otros: 0, n: 0 };
    let espera = 40;
    for (let i = 0; i < 6000 && P.fase === 'pelea'; i++) {
        const F = P.f[0], O = P.f[1];
        let it = {};
        // La estocada (media) y el barrido (bajo) de Lalo: 24 c de anticipación, tiempo de sobra para leer la altura
        // (un tajo de 9 c casi no se alcanza a ver con el retraso humano de la CPU)
        if (E.LIBRES.has(F.p.estado) && --espera <= 0) { it = { accion: r.n % 2 ? 'barrido' : 'estocada' }; espera = 80; r.n++; }
        const d = Math.hypot(O.x - F.x, O.z - F.z);
        if (d > 1.8) it.mover = [0.6, 0];
        M.pasoPelea(P, [it, M.intencionCPU(P, 1)]);
        for (const e of P.eventos) if (e.tipo === 'golpe' && e.de === 0) { if (e.errada) r.errada++; r[e.resultado] = (r[e.resultado] || 0) + 1; }
        F.vida = F.vidaMax; O.vida = O.vidaMax; P.reloj = 60;
    }
    return r;
}
{
    const f = cpuDefiende('facil'), m = cpuDefiende('maestro');
    const lee = r => r.desviado + r.reversion;
    console.log(`  CPU de Moisés contra la estocada y el barrido: fácil ${JSON.stringify(f)} · maestro ${JSON.stringify(m)}`);
    ok(m.n > 20 && f.n > 20, `tiraste ataques (${f.n}, ${m.n})`);
    ok(lee(m) > lee(f), `en maestro desvía más que en fácil (${lee(f)} contra ${lee(m)})`);
    ok(lee(m) > 0 && (m.esquivado || 0) + lee(m) > 0, `maestro desvía o esquiva (${JSON.stringify(m)})`);
    ok(f.errada + (f.golpeado || 0) > m.errada + (m.golpeado || 0), `en fácil lee peor la altura (${JSON.stringify(f)})`);
}

console.log(fallos ? `estilo-urbano: ${fallos} de ${pruebas} pruebas fallaron` : `estilo-urbano: ${pruebas} pruebas OK`);
process.exit(fallos ? 1 : 0);
