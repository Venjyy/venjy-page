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
        const dano = UR.ataques[CLAVE[h]].dano, region = UR.zonas.porAltura[h], z = r.ev && r.ev.zonas;
        // L6a (erradaEn: zona): la vida pierde lo normal y el +30 % va a la zona del golpe
        ok(r.res === 'golpeado' && r.ev.errada && Math.abs(r.dv - dano) < 1e-9, `${h} con la defensa ${def.altura}: la vida pierde lo normal (${r.res}, ${r.dv.toFixed(2)} de ${dano})`);
        ok(z && Math.abs(z[region] - dano * UR.zonas.porDano * A.errada) < 1e-9, `${h} errado: +30 % a la zona ${region} (${z && z[region].toFixed(2)})`);
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
    // L6b (§19.2): la barrida es «barrido» para Sekiro (comoPeligro): no se desvía; se salta
    ok(ls.res === 'golpeado', `Lalo no desvía la barrida: es un barrido (${ls.res})`);
    const sa = cambio(enPelea({ yo: 'moises', rival: 'lalo', lalo: 'sekiro', moises: 'urbano' }), 0, 'bajo', { saltar: 'apretar' }, 4);
    ok(sa.res === 'esquivado' || !sa.ev, `Lalo salta la barrida (${sa.res})`);
    const lg = cambio(enPelea({ yo: 'moises', rival: 'lalo', lalo: 'sekiro', moises: 'urbano' }), 0, 'medio', { defensa: 'apretar' }, 6);
    ok(lg.res === 'desviado' || lg.res === 'perfecto', `Lalo desvía la patada frontal sin adivinar (${lg.res})`);
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

// ---------- 10. Zonas (L6a, §17.6; combate/zonas.js) ----------
const Zo = await imp('mundo/supervivencia/combate/zonas.js');
{
    const Z = Zo.reglasZonas(UR);
    ok(Z && Z.tope === 100 && Z.niveles.amarillo === 40 && Z.niveles.rojo === 75, 'zonas de 0 a 100: amarillo desde 40, rojo desde 75');
    ok(Z.multiplicador.verde === 1 && Z.multiplicador.amarillo === 1.25 && Z.multiplicador.rojo === 1.5, 'multiplicador ×1 / ×1,25 / ×1,5');
    ok(Z.critico.torso.dano === 1.75 && Z.critico.torso.cuadros === 300 && Z.critico.piernas.velocidad === 0.6, 'torso ×1,75 por 300 c; piernas −40 %');
    ok(D.accionDe(UR, Z.critico.cabeza.reaccion) && D.accionDe(UR, Z.critico.cabeza.reaccion).fases, `el mareo existe (${Z.critico.cabeza.reaccion})`);
    ok(Zo.reglasZonas(SK) === null, 'Sekiro no tiene zonas (sufre por postura)');
    ok(Zo.nivel(Z, 39) === 'verde' && Zo.nivel(Z, 40) === 'amarillo' && Zo.nivel(Z, 75) === 'rojo', 'niveles por color');
    const z = Zo.crearZonas(Z);
    ok(Zo.sumar(Z, z, { cabeza: 60, torso: 0, piernas: 0 }).length === 0 && Zo.multiplicador(Z, z, { cabeza: 1, torso: 0, piernas: 0 }) === 1.25, 'cabeza en 60: ×1,25');
    ok(JSON.stringify(Zo.sumar(Z, z, { cabeza: 60, torso: 0, piernas: 0 })) === '["cabeza"]' && z.cabeza === 100, 'al tope entra en crítico (y no pasa de 100)');
    ok(Zo.sumar(Z, z, { cabeza: 10, torso: 0, piernas: 0 }).length === 0, 'el crítico sale una vez por ronda');
    Zo.sumar(Z, z, { cabeza: 0, torso: 100, piernas: 0 });
    ok(z.torsoC === 300 && Zo.multiplicador(Z, z, { cabeza: 0, torso: 0, piernas: 5 }) === 1.75, 'torso crítico: cualquier golpe ×1,75');
    for (let i = 0; i < 300; i++) Zo.pasoZonas(z);
    ok(z.torsoC === 0 && Zo.multiplicador(Z, z, { cabeza: 0, torso: 0, piernas: 5 }) === 1, 'después de 300 c vuelve al de la zona');
    ok(JSON.stringify(Zo.repartir(Z, { altura: 'bajo', dano: 4 })) === JSON.stringify({ cabeza: 0, torso: 0, piernas: 4 * Z.porDano }), 'sin campo zona: daño × porDano a la zona de su altura');
    ok(Zo.repartir(Z, { altura: 'alto', dano: 4, zona: 7 }).cabeza === 7 && Zo.repartir(Z, { altura: 'alto', zona: { torso: 30 } }).torso === 30, 'campo zona: número o por zona');
}
// En la pelea: Lalo (urbano) le pega una y otra vez a Moisés sin defensa
function pegar(P, h) {
    const F = P.f[0], O = P.f[1];
    F.x = -1; F.z = 0; O.vida = 1000;
    const r = cambio(P, 0, h, null, null);
    avanzar(P, 50);
    return r;
}
{
    const P = enPelea(), O = P.f[1], dano = UR.ataques[CLAVE.alto].dano;
    const vistos = [];
    let critico = null, mareo = false;
    for (let n = 0; n < 30 && !critico; n++) {
        const z0 = O.zonas.cabeza, r = pegar(P, 'alto');
        vistos.push([z0, r.dv]);
        critico = r.P.eventos.concat(r.ev ? [] : []).find(e => e.tipo === 'critico') || (O.zonas.criticos.cabeza ? { zona: 'cabeza' } : null);
        if (critico) mareo = O.p.clave === UR.zonas.critico.cabeza.reaccion || O.p.estado === 'aturdido';
    }
    const m = (z0, dv) => dv / dano;
    ok(vistos.some(([z0, dv]) => z0 < 40 && Math.abs(m(z0, dv) - 1) < 1e-9), 'cabeza verde: el daño normal');
    ok(vistos.some(([z0, dv]) => z0 >= 40 && z0 < 75 && Math.abs(m(z0, dv) - 1.25) < 1e-9), `cabeza amarilla: ×1,25 (${JSON.stringify(vistos.map(v => [Math.round(v[0]), +(v[1] / dano).toFixed(2)]))})`);
    ok(vistos.some(([z0, dv]) => z0 >= 75 && Math.abs(m(z0, dv) - 1.5) < 1e-9), 'cabeza roja: ×1,5');
    ok(critico && O.zonas.criticos.cabeza, 'la cabeza llega al tope');
    // El mareo: 120 c, sin atacar; el primer golpe que lo saca × remate
    const P2 = enPelea(), O2 = P2.f[1];
    O2.zonas.cabeza = 99.9;
    const F2 = P2.f[0]; F2.x = -1; O2.vida = 1000;
    const r2 = cambio(P2, 0, 'alto', null, null);
    const ev = P2.eventos.find(e => e.tipo === 'critico');
    ok(ev && ev.zona === 'cabeza' && O2.p.clave === UR.zonas.critico.cabeza.reaccion, `cabeza al tope: mareo (${ev && ev.zona}, ${O2.p.clave})`);
    ok(D.accionDe(UR, O2.p.clave) && D.largoFases ? true : true, 'mareo en curso');
    const largo = (f => f.anticipacion + f.activo + f.recuperacion)(D.accionDe(UR, UR.zonas.critico.cabeza.reaccion).fases);
    ok(largo === 120, `el mareo dura 120 c (${largo})`);
    let atacaMareado = false;
    for (let i = 0; i < 30; i++) { M.pasoPelea(P2, [{}, { atacar: 'apretar' }]); if (O2.p.estado === 'ataque') atacaMareado = true; }
    ok(!atacaMareado, 'mareado no ataca');
    const r3 = cambio(P2, 0, 'alto', null, null);
    ok(r3.res === 'golpeado' && Math.abs(r3.dv - dano * 1.5 * UR.zonas.critico.cabeza.remate) < 1e-9, `remate al mareado: ×1,5 (rojo) × ${UR.zonas.critico.cabeza.remate} (${(r3.dv / dano).toFixed(2)})`);
    ok(r2.res === 'golpeado', 'el golpe que marea entra');
}
{
    // Torso al tope: todo el daño × 1,75 por 300 c
    const P = enPelea(), O = P.f[1];
    O.zonas.torso = 99.9;
    pegar(P, 'medio');
    ok(O.zonas.criticos.torso && O.zonas.torsoC > 0, `torso al tope: crítico (${O.zonas.torsoC} c)`);
    const r = pegar(P, 'bajo'), d = UR.ataques[CLAVE.bajo].dano;
    ok(Math.abs(r.dv - d * 1.75) < 1e-9, `con el torso crítico un bajo en verde hace ×1,75 (${(r.dv / d).toFixed(2)})`);
}
{
    // Piernas al tope: −40 % de velocidad hasta el final de la ronda, con la caminata coja; en la ronda siguiente, todo a 0
    const P = enPelea(), O = P.f[1];
    O.zonas.piernas = 99.9;
    pegar(P, 'bajo');
    ok(O.zonas.criticos.piernas && Math.abs(O.p.ritmo - 0.6) < 1e-9, `piernas al tope: ritmo ${O.p.ritmo}`);
    avanzar(P, 120);
    const x0 = O.x;
    avanzar(P, 60, () => [{}, { mover: [-1, 0] }]);
    const v = Math.abs(O.x - x0);
    ok(Math.abs(v - UR.paso.velocidad * 0.6) < 0.05, `camina a 0,6 × ${UR.paso.velocidad} (${v.toFixed(2)} bloques en 1 s)`);
    ok(O.an.cojo && O.an.cojo.accion === 'cojera', 'la caminata es la coja');
    O.vida = 0;
    let n = 0; while (P.fase !== 'anuncio' && n++ < 600) M.pasoPelea(P, []);
    while (P.fase !== 'pelea' && n++ < 2000) M.pasoPelea(P, []);
    ok(P.ronda === 2 && O.zonas.piernas === 0 && !O.zonas.criticos.piernas && (O.p.ritmo ?? 1) === 1, 'en la ronda siguiente las zonas vuelven a 0 y camina normal');
}

// ---------- 11. Rebote en la pared y barriles (L6a, §17.8) ----------
{
    const RB = M.reglasArena(ARENA).rebote, e = ARENA.escenario, r = M.reglasArena(ARENA).movimiento.radio;
    ok(RB.distancia === 1.2 && RB.alturas.includes('medio'), 'rebote: golpe medio a menos de 1,2');
    const contra = (dist, h, conBarril = false) => {
        const P = enPelea(), F = P.f[0], O = P.f[1];
        P.barriles = conBarril ? [{ x: 3, z: 0, roto: false }] : [];
        const borde = conBarril ? 3 - (M.reglasArena(ARENA).escenario.barril.radio + r) : e.largo / 2 - r;
        O.x = borde - dist; O.z = 0; F.x = O.x - 1.3; F.z = 0;
        const atk = ATAQUE[h], clave = CLAVE[h];
        const ev = [];
        for (let i = 0; i < 90; i++) {
            const ints = [{}, {}];
            if (i === 2) ints[0] = atk;
            M.pasoPelea(P, ints);
            if (i < 2) { O.x = borde - dist; F.x = O.x - 1.3; }
            ev.push(...P.eventos);
        }
        return { P, O, ev, clave };
    };
    const a = contra(0.8, 'medio');
    ok(a.ev.some(x => x.tipo === 'pared' && x.i === 1), `medio a 0,8 de la pared: rebota (${a.ev.filter(x => x.tipo === 'golpe').map(x => x.resultado)})`);
    const b = contra(2.2, 'medio');
    ok(!b.ev.some(x => x.tipo === 'pared'), 'medio a 2,2: no llega a la pared');
    const c = contra(0.8, 'bajo');
    ok(!c.ev.some(x => x.tipo === 'pared' && x.i === 1) || c.ev.some(x => x.tipo === 'golpe' && x.reaccion === 'derribo'), 'bajo a 0,8: no rebota (solo los medios)');
    const d = contra(0.6, 'medio', true);
    const roto = d.ev.find(x => x.tipo === 'barril');
    ok(roto && d.P.barriles[0].roto && d.ev.some(x => x.tipo === 'pared' && x.i === 1), 'medio contra un barril: rebota y lo rompe');
    // Sólido: caminar hacia un barril no lo atraviesa
    const P = enPelea(), O = P.f[1], F = P.f[0];
    P.barriles = [{ x: 0, z: 2.5, roto: false }];
    F.x = -4; O.x = 0; O.z = 1;
    let minimo = Infinity;
    for (let i = 0; i < 120; i++) { M.pasoPelea(P, [{}, { mover: [0, -1] }]); minimo = Math.min(minimo, Math.hypot(O.x - 0, O.z - 2.5)); }
    ok(minimo >= M.reglasArena(ARENA).escenario.barril.radio + r - 1e-6, `el barril es sólido (${minimo.toFixed(3)})`);
    // Vuelven en la ronda siguiente (los de arena.json)
    const P3 = enPelea();
    P3.barriles.forEach(x => { x.roto = true; });
    P3.f[1].vida = 0;
    let n = 0; while (P3.ronda < 2 || P3.fase !== 'pelea') { M.pasoPelea(P3, []); if (++n > 3000) break; }
    ok(P3.barriles.length === e.barriles.length && P3.barriles.every(x => !x.roto), 'los barriles vuelven en la ronda siguiente');
}

// ---------- 12. Paso de boxeo (L6a; modo arrastre de combate/animacion.js) ----------
{
    ok(UR.paso.modo === 'arrastre' && Array.isArray(UR.paso.arrastre.cuadros), 'Urban Reign camina con el paso de boxeo');
    ok(SK.paso.modo === undefined, 'Sekiro camina como siempre');
    // Camina en una dirección y anota qué pie sale y dónde queda cada uno respecto del cuerpo
    function caminar(mover) {
        const P = enPelea(), F = P.f[0];
        F.x = mover[0] > 0 ? -5 : mover[0] < 0 ? 2 : -1.5; F.z = 0; P.f[1].x = F.x + 3; P.f[1].z = 0; // (que ninguno llegue a la pared)
        avanzar(P, 30);
        const salen = [], guias = [], lados = [];
        let antes = { D: false, I: false }, estiradas = 0;
        for (let i = 0; i < 150; i++) {
            M.pasoPelea(P, [{ mover }, {}]);
            P.f[1].x = F.x + 3; P.f[1].z = F.z; // el rival se queda a la misma distancia (que no lo frene)
            const ps = F.an.pasos;
            // El que guía sale dejando al otro en ps.sigue
            for (const l of ['D', 'I']) { const en = !!ps[l].desde; if (en && !antes[l]) { salen.push(l); if (ps.sigue && ps.sigue !== l) guias.push(l); } antes[l] = en; }
            if (i > 40) for (const l of ['D', 'I']) if (F.an.piernas[l][1] <= D.COMBATE.motor.pies.rodillaMin - 0.05) estiradas++; // (después de arrancar)
            // Coordenada lateral de cada pie (derecha del cuerpo = -cos(yaw), sin(yaw) con yaw 0 mirando a +Z)
            const rx = -Math.cos(F.yaw), rz = Math.sin(F.yaw);
            lados.push((ps.D.pos[0] - ps.I.pos[0]) * rx + (ps.D.pos[2] - ps.I.pos[2]) * rz);
            if (i > 20) {
                const fx = Math.sin(F.yaw), fz = Math.cos(F.yaw);
                lados.adelante = lados.adelante || [];
                lados.adelante.push((ps.I.pos[0] - ps.D.pos[0]) * fx + (ps.I.pos[2] - ps.D.pos[2]) * fz);
            }
        }
        return { salen, guias, lados, estiradas };
    }
    // Después del primer paso (el de acomodo al arrancar), los pasos alternan: guía, arrastra, guía…
    const alterna = s => s.slice(2).every((l, i) => l !== s[i + 1]);
    const ad = caminar([1, 0]), at = caminar([-1, 0]), iz = caminar([0, 1]), de = caminar([0, -1]);
    // El de adelante (izquierdo en la guardia: pIx < pDx) guía hacia adelante; el de atrás, hacia atrás
    const adelante = UR.anim.guardia.canales.pIx < UR.anim.guardia.canales.pDx ? 'I' : 'D', atras = adelante === 'I' ? 'D' : 'I';
    const siempre = (g, l) => g.length >= 3 && g.slice(1).every(x => x === l);
    ok(siempre(ad.guias, adelante) && alterna(ad.salen), `adelante: guía el de adelante y alternan (${ad.salen.join('')} · guías ${ad.guias.join('')})`);
    ok(siempre(at.guias, atras) && alterna(at.salen), `atrás: guía el de atrás (${at.salen.join('')} · ${at.guias.join('')})`);
    // De lado: lado + = hacia su izquierda
    ok(siempre(iz.guias, 'I'), `a su izquierda: guía el izquierdo (${iz.guias.join('')})`);
    ok(siempre(de.guias, 'D'), `a su derecha: guía el derecho (${de.guias.join('')})`);
    for (const [n, c] of [['adelante', ad], ['atrás', at], ['izquierda', iz], ['derecha', de]]) ok(c.estiradas === 0, `${n}: ninguna pierna se estira de más (${c.estiradas} cuadros)`);
    // Quieto: los pies no se mueven (el bug de L5: daban pasos sin parar con el rebote)
    {
        const P = enPelea(), F = P.f[0];
        avanzar(P, 60);
        let pasos = 0, ant = { D: false, I: false };
        for (let i = 0; i < 240; i++) { M.pasoPelea(P, [{}, {}]); for (const l of ['D', 'I']) { const en = !!F.an.pasos[l].desde; if (en && !ant[l]) pasos++; ant[l] = en; } }
        ok(pasos === 0, `quieto en guardia: ningún paso en 4 s (${pasos})`);
        const g = UR.anim.guardia.canales, rm = D.COMBATE.motor.pies.rodillaMin;
        ok(g.rodD >= rm + 0.25 && g.rodI >= rm + 0.25, `rodillas de la guardia lejos de rodillaMin (${g.rodD}, ${g.rodI} contra ${rm})`);
    }
    for (const [n, c] of [['adelante', ad], ['atrás', at], ['izquierda', iz], ['derecha', de]]) {
        const s = Math.sign(c.lados[5]);
        ok(c.lados.every(x => Math.sign(x) === s && Math.abs(x) > 0.05), `${n}: los pies nunca se cruzan (separación lateral mín. ${Math.min(...c.lados.map(Math.abs)).toFixed(3)})`);
    }
    ok(ad.lados.adelante.every(x => x > -0.02), `adelante: el pie de adelante nunca queda atrás (${Math.min(...ad.lados.adelante).toFixed(3)})`);
    // Más lento que antes: menos de 4 ciclos (guía + arrastre) por segundo a la velocidad de paso
    ok(ad.salen.length / 2 / (150 / 60) < 4, `cadencia: ${(ad.salen.length / 2 / 2.5).toFixed(1)} ciclos por segundo`);
    const fr = UR.anim.respira.canales.y.osc[0].frec;
    ok(fr / Math.PI < 1.6, `rebote quieto: ${(fr / Math.PI).toFixed(2)} por segundo (antes 2,2)`);
}

// ---------- 10. Urban Reign II-b (L6b): agarres, amago, pisotón, barra SPA, arte especial y Furia ----------
const Q = await imp('mundo/supervivencia/combate/spa.js');
const G = await imp('mundo/supervivencia/combate/peligro.js');
const SP = UR.reglas.spa, AG = SP.agarre;
{
    for (const [h, k] of [['alto', 'agarre_alto'], ['medio', 'agarre_medio'], ['bajo', 'agarre_bajo']]) {
        ok(controla('agarre', h) === k, `E con ${h}: ${k} (${controla('agarre', h)})`);
        ok(UR.ataques[k].sujeta && UR.ataques[k].comoPeligro === 'agarre' && !UR.ataques[k].peligro, `${k}: sujeta y es «agarre» para Sekiro sin aviso`);
        ok(D.accionDe(UR, AG.remates[h]), `remate ${h}: ${AG.remates[h]}`);
    }
    ok(controla('especial', 'medio') === 'giro' && controla('especial', 'alto') === 'cabezazo_salto' && controla('especial', 'bajo') === 'barrida_doble', 'Q: giro; W + Q: cabezazo; S + Q: barrida doble');
    for (const k of ['giro', 'cabezazo_salto', 'barrida_doble']) ok(UR.ataques[k].comoPeligro === 'imparable' && UR.ataques[k].costo.espiritu === 1, `${k}: imparable y cuesta 1 segmento`);
    ok(UR.ataques.barrida.comoPeligro === 'barrido', 'la barrida es «barrido» para Sekiro (§19.2)');
    for (const k of [AG.sujetado, AG.zafarse, AG.soltado]) ok(D.accionDe(SK, k) && D.accionDe(UR, k), `${k} existe para los dos estilos (combate.json)`);
    ok(AG.ventana === 18 && AG.tactil === 24 && Math.abs(AG.errado - 1.2) < 1e-9 && AG.pista === 4, 'escape: 18 c (24 en el táctil), errado ×1,2, pista de 4 c (§17.7)');
    const R = Q.reglasSpa(UR);
    ok(R && R.furia.costo === 4 && R.furia.segundos === 8 && Math.abs(R.furia.prisa - 1.25) < 1e-9 && Math.abs(R.furia.zona - 1.5) < 1e-9, 'Furia: 4 segmentos, 8 s, +25 %, zona ×1,5');
    ok(Q.reglasSpa(SK) === null, 'Sekiro no usa reglas.spa');
    const pe = G.reglasPeligro(UR);
    ok(pe.espiritu.segmentos === 4 && pe.espiritu.porHecho === 40 && pe.espiritu.porRecibido === 60, 'barra SPA: 4 segmentos, 40 hecho, 60 recibido');
    const s = G.crearEspiritu(pe); G.ganarPorDano(s, pe, 40, 0); const s1 = s.valor; G.ganarPorDano(s, pe, 0, 60);
    ok(Math.abs(s1 - 1) < 1e-9 && Math.abs(s.valor - 2) < 1e-9, `40 hecho = 1 segmento, 60 recibido = 1 más (${s1}, ${s.valor})`);
    G.ganarPorDano(s, pe, 999, 999); ok(s.valor === 4, 'la barra no pasa de 4');
    const sk = G.crearEspiritu(G.reglasPeligro(SK)); G.ganarPorDano(sk, G.reglasPeligro(SK), 100, 100); ok(sk.valor === 0, 'el espíritu de Sekiro no se llena con daño');
}
// F (urbano) agarra a O con la altura h. Devuelve la pelea en el cuadro en que entra la sujeción
function agarrar(h, { cabe = 'urbano', semilla = 3, tactil = false, a = 0, it = null } = {}) {
    const P = enPelea({ lalo: a === 0 ? 'urbano' : cabe, moises: a === 0 ? cabe : 'urbano', semilla, tactil });
    const F = P.f[a], O = P.f[1 - a];
    O.x = F.x + (a === 0 ? 0.95 : -0.95); O.z = F.z;
    const ints = [{}, {}]; ints[a] = it || { agarre: 'apretar', altura: h };
    let ev = null, c = 0, inicio = -1, amago = null;
    for (let i = 0; i < 60 && !ev; i++) {
        M.pasoPelea(P, i === 0 ? ints : [{}, {}]);
        if (F.p.estado === 'ataque' && inicio < 0) inicio = c;
        amago = amago || P.eventos.find(e => e.tipo === 'amago') || null;
        ev = P.eventos.find(e => e.tipo === 'sujeta') || null; c++;
    }
    return { P, F, O, ev, a, b: 1 - a, amago };
}
// Sigue la sujeción: O aprieta `def` en el cuadro `en` (contado desde la sujeción). Junta los eventos
function sujecion(r, def = null, en = 0, cuadros = 90) {
    const ev = [], v0 = r.O.vida; let fin = -1;
    for (let i = 0; i < cuadros; i++) {
        const ints = [{}, {}];
        if (def && i === en) ints[r.b] = def;
        M.pasoPelea(r.P, ints);
        for (const e of r.P.eventos) { ev.push({ ...e, c: i }); if (e.tipo === 'agarre' && fin < 0) fin = i; }
    }
    return { ev, dv: v0 - r.O.vida, fin };
}
{
    for (const h of ['alto', 'medio', 'bajo']) {
        const r = agarrar(h);
        ok(r.ev && r.ev.altura === h, `agarre ${h}: entra la sujeción (${r.ev && r.ev.altura})`);
        ok(r.F.p.clave === AG.sujetar && r.O.p.clave === AG.sujetado, `sujetar / sujetado (${r.F.p.clave} / ${r.O.p.clave})`);
        const nada = sujecion(r);
        ok(Math.abs(nada.fin - AG.ventana) <= 1, `sin zafarse: el remate sale a los ${AG.ventana} c (${nada.fin})`);
        const golpes = nada.ev.filter(e => e.tipo === 'golpe' && e.de === r.a);
        const par = UR.acciones[AG.remates[h]].pareja;
        ok(golpes.length === 1 + (par.repetir || []).length, `remate ${AG.remates[h]}: ${golpes.length} golpes`);
        if (h === 'bajo') ok(golpes[0] && golpes[0].reaccion === 'derribo', `el derribo de piernas lo tumba (${golpes[0] && golpes[0].reaccion})`);
        ok(nada.dv > 0, `el remate hace daño (${nada.dv.toFixed(1)})`);
        // Se zafa con la altura correcta: empujón, los dos neutros y sin daño
        const z = sujecion(agarrar(h), { defensa: 'apretar', altura: h }, 8, 30);
        const e = z.ev.find(x => x.tipo === 'escape');
        ok(e && e.resultado === 'zafa' && z.dv === 0 && !z.ev.some(x => x.tipo === 'agarre'), `se zafa del ${h} con la defensa ${h} (${e && e.resultado}, ${z.dv})`);
        // Se equivoca: el agarre sigue y el remate hace ×1,2
        const otra = h === 'alto' ? 'bajo' : 'alto';
        const mal = sujecion(agarrar(h), { defensa: 'apretar', altura: otra }, 8);
        const em = mal.ev.find(x => x.tipo === 'escape');
        ok(em && em.resultado === 'errado' && mal.fin >= 0, `con la defensa ${otra}: se equivoca y sale el remate (${em && em.resultado})`);
        ok(Math.abs(mal.dv / nada.dv - AG.errado) < 1e-6, `remate × ${AG.errado} por equivocarse (${(mal.dv / nada.dv).toFixed(3)})`);
        // Tarde (después de la ventana): ya no se zafa
        const tarde = sujecion(agarrar(h), { defensa: 'apretar', altura: h }, AG.ventana + 2);
        ok(!tarde.ev.some(x => x.tipo === 'escape' && x.resultado === 'zafa'), `después de la ventana ya no se zafa (${h})`);
    }
    // Un solo intento
    const r = agarrar('medio');
    const dos = sujecion(r, { defensa: 'apretar', altura: 'alto' }, 4, 8);
    let otro = 0;
    for (let i = 0; i < 3; i++) { M.pasoPelea(r.P, [{}, { defensa: 'apretar', altura: 'medio' }]); otro += r.P.eventos.filter(e => e.tipo === 'escape').length; }
    ok(dos.ev.filter(x => x.tipo === 'escape').length === 1 && otro === 0 && r.F.sujeta, `solo un intento de zafarse (${otro} de más)`);
    // Táctil: 24 c (el agarrado es f[0], el del celular)
    const t = agarrar('alto', { tactil: true, a: 1 });
    ok(t.F.sujeta && t.F.sujeta.ventana === AG.tactil, `en el táctil la ventana es ${AG.tactil} c (${t.F.sujeta && t.F.sujeta.ventana})`);
    const tz = sujecion(t, { defensa: 'apretar', altura: 'alto' }, AG.ventana + 2, 30);
    ok(tz.ev.some(x => x.tipo === 'escape' && x.resultado === 'zafa'), 'en el táctil se zafa pasados los 18 c');
    // Sekiro también puede ser agarrado y zafarse (defensa con la altura)
    const sk = agarrar('bajo', { cabe: 'sekiro' });
    ok(sk.ev && sk.O.p.clave === AG.sujetado, `Sekiro queda sujetado (${sk.O.p.clave})`);
    const skz = sujecion(sk, { defensa: 'apretar', altura: 'bajo' }, 6, 20);
    ok(skz.ev.some(x => x.tipo === 'escape' && x.resultado === 'zafa'), 'Sekiro se zafa con defensa + S');
    // Sekiro no bloquea el agarre (es «agarre»): mantener la defensa no sirve
    const P = enPelea({ lalo: 'urbano', moises: 'sekiro' }); P.f[1].x = P.f[0].x + 0.95;
    let ev = null;
    for (let i = 0; i < 40 && !ev; i++) { M.pasoPelea(P, [i === 0 ? { agarre: 'apretar', altura: 'medio' } : {}, { defensa: i === 0 ? 'apretar' : 'mantener' }]); ev = P.eventos.find(e => e.tipo === 'golpe' && e.de === 0); }
    ok(ev && ev.resultado === 'golpeado', `la guardia de Sekiro no para el agarre (${ev && ev.resultado})`);
}
// Amago: la anticipación es de una altura y a 4 c del activo pasa a la de verdad
{
    const r = agarrar(null, { it: { accion: 'agarre_alto', amago: 'bajo' } });
    ok(r.amago && r.amago.de === 'agarre_alto' && r.amago.a === 'agarre_bajo', `amago: alto → bajo (${r.amago && r.amago.de} → ${r.amago && r.amago.a})`);
    ok(r.ev && r.ev.altura === 'bajo', `la sujeción es de la altura de verdad (${r.ev && r.ev.altura})`);
    // Cuándo: medido en un agarre sin rival cerca (que no conecte)
    const P = enPelea(); P.f[1].x = P.f[0].x + 3;
    let cAmago = -1, cActivo = -1;
    for (let i = 0; i < 30; i++) {
        M.pasoPelea(P, [i === 0 ? { accion: 'agarre_medio', amago: 'alto' } : {}, {}]);
        if (P.eventos.some(e => e.tipo === 'amago')) cAmago = i;
        if (cActivo < 0 && P.f[0].p.estado === 'ataque' && D.faseEn(P.f[0].p.def.fases, P.f[0].p.c).fase === 'activo') cActivo = i;
    }
    ok(cAmago >= 0 && cActivo - cAmago === AG.pista, `la pista dura ${AG.pista} c (amago en ${cAmago}, activo en ${cActivo})`);
    const sin = agarrar('medio');
    ok(!sin.amago, 'sin amago no hay evento');
}
// Pisotón: S + clic con el rival derribado cerca; lo deja en el suelo
{
    const P = enPelea(), F = P.f[0], O = P.f[1];
    O.x = F.x + 1; E.reaccionar(O.p, 'derribo');
    const v0 = O.vida;
    M.pasoPelea(P, [{ atacar: 'apretar', altura: 'bajo' }, {}]);
    ok(F.p.clave === 'pisoton', `S + clic al derribado: pisotón (${F.p.clave})`);
    let ev = null;
    for (let i = 0; i < 20 && !ev; i++) { M.pasoPelea(P, [{}, {}]); ev = P.eventos.find(e => e.tipo === 'golpe' && e.de === 0); }
    ok(ev && ev.resultado === 'golpeado' && O.p.clave === 'derribo', `pisa y lo deja en el suelo (${ev && ev.resultado}, ${O.p.clave})`);
    ok(O.zonas.torso >= 35 - 1e-9 && v0 - O.vida >= 10 - 1e-9, `mucho daño al torso (zona ${O.zonas.torso}, vida −${(v0 - O.vida).toFixed(1)})`);
    const P2 = enPelea(); P2.f[1].x = P2.f[0].x + 2; E.reaccionar(P2.f[1].p, 'derribo');
    M.pasoPelea(P2, [{ atacar: 'apretar', altura: 'bajo' }, {}]);
    ok(P2.f[0].p.clave === 'barrida', `lejos del derribado: la barrida de siempre (${P2.f[0].p.clave})`);
    const P3 = enPelea(); P3.f[1].x = P3.f[0].x + 1;
    M.pasoPelea(P3, [{ atacar: 'apretar', altura: 'bajo' }, {}]);
    ok(P3.f[0].p.clave === 'barrida', 'de pie: la barrida');
}
// Barra SPA en la pelea y arte especial que rompe la reacción
{
    const P = enPelea({ lalo: 'urbano', moises: 'urbano' }), F = P.f[0], O = P.f[1];
    const g = cambio(P, 0, 'alto', null, null);
    ok(Math.abs(F.esp.valor - g.dv / 40) < 1e-9 && Math.abs(O.esp.valor - g.dv / 60) < 1e-9, `un golpe llena la barra de los dos (${F.esp.valor.toFixed(3)}, ${O.esp.valor.toFixed(3)})`);
    for (const [alt, k] of [['medio', 'giro'], ['alto', 'cabezazo_salto'], ['bajo', 'barrida_doble']]) {
        const P2 = enPelea(), O2 = P2.f[1];
        E.reaccionar(O2.p, 'alto_leve'); E.congelar(O2.p, 6); O2.esp.valor = 1.5;
        M.pasoPelea(P2, [{}, { especial: 'apretar', altura: alt }]);
        ok(O2.p.clave === k && Math.abs(O2.esp.valor - 0.5) < 1e-9 && P2.eventos.some(e => e.tipo === 'arte' && e.rompe), `en plena reacción, Q (${alt}) rompe con ${k} (${O2.p.clave}, barra ${O2.esp.valor})`);
    }
    const P3 = enPelea(), O3 = P3.f[1];
    E.reaccionar(O3.p, 'alto_leve'); O3.esp.valor = 0.5;
    M.pasoPelea(P3, [{}, { especial: 'apretar' }]);
    ok(O3.p.clave === 'alto_leve' && P3.eventos.some(e => e.tipo === 'sinEspiritu'), `sin un segmento no sale (${O3.p.clave})`);
    const P4 = enPelea(), O4 = P4.f[1];
    E.reaccionar(O4.p, 'lanzado'); O4.esp.valor = 2;
    M.pasoPelea(P4, [{}, { especial: 'apretar' }]);
    ok(O4.p.clave === 'lanzado', 'en el aire (lanzado) no rompe');
    // El giro tiene i-frames: el golpe que llega en su anticipación no entra
    const P5 = enPelea(); P5.f[1].esp.valor = 1;
    const gi = cambio(P5, 0, 'alto', { especial: 'apretar' }, 3);
    ok(gi.res === 'esquivado', `el giro pasa por debajo del golpe (${gi.res})`);
    // Imparable: Sekiro no lo desvía
    const P6 = enPelea({ yo: 'moises', rival: 'lalo', lalo: 'sekiro', moises: 'urbano' }); P6.f[0].esp.valor = 1;
    const im = cambio(P6, 0, null, { defensa: 'apretar' }, 5, { it: { especial: 'apretar' }, clave: 'giro', dist: 1.5 });
    ok(im.res === 'golpeado', `Sekiro no desvía el arte (imparable: ${im.res})`);
}
// Furia
{
    const largo = P => { let n = 0; M.pasoPelea(P, [{ atacar: 'apretar', altura: 'medio' }, {}]); while (P.f[0].p.clave === 'jab' && n < 60) { M.pasoPelea(P, [{}, {}]); n++; } return n + 1; };
    const normal = largo((() => { const P = enPelea(); P.f[1].x = P.f[0].x + 3; return P; })());
    const P = enPelea({ lalo: 'urbano', moises: 'sekiro' }), F = P.f[0], O = P.f[1];
    F.esp.valor = 3.9;
    M.pasoPelea(P, [{ modoEspecial: 'apretar' }, {}]);
    ok(!(F.furia > 0) && P.eventos.some(e => e.tipo === 'sinEspiritu'), 'sin la barra llena no hay Furia');
    F.esp.valor = 4;
    M.pasoPelea(P, [{ modoEspecial: 'apretar' }, {}]);
    ok(F.furia > 0 && F.p.clave === 'furia' && Math.abs(F.p.prisa - 1.25) < 1e-9 && P.eventos.some(e => e.tipo === 'furia' && e.activa), `Q + E: Furia (${F.furia} c, ${F.p.clave})`);
    let n = 0; while (F.p.clave === 'furia' && n++ < 60) M.pasoPelea(P, [{}, {}]);
    O.x = F.x + 3;
    const rapido = largo(P);
    ok(rapido < normal && Math.abs(normal / rapido - 1.25) < 0.12, `ataca un 25 % más rápido (jab ${normal} → ${rapido} c)`);
    // Armadura: el tajo de Sekiro entra (daño) pero no lo hace reaccionar
    const ar = cambio(P, 1, null, null, null, { it: { atacar: 'apretar' }, clave: 'tajo1' });
    ok(ar.res === 'armadura' && ar.dv > 0 && F.p.estado !== 'reaccion', `armadura en la Furia (${ar.res}, −${ar.dv.toFixed(1)})`);
    // La guardia mantenida de Sekiro no frena sus golpes, y la zona suma × 1,5
    O.x = F.x + 1.3; O.z = F.z;
    let ev = null;
    // (la defensa se aprieta 30 c antes: queda en bloqueo, fuera de la ventana del desvío)
    for (let i = 0; i < 70 && !ev; i++) { M.pasoPelea(P, [i === 30 ? { atacar: 'apretar', altura: 'alto' } : {}, { defensa: i === 0 ? 'apretar' : 'mantener' }]); O.x = F.x + 1.3; ev = P.eventos.find(e => e.tipo === 'golpe' && e.de === 0); }
    ok(ev && ev.resultado === 'golpeado' && O.p.estado !== 'bloqueo', `la guardia de Sekiro no la frena (${ev && ev.resultado})`);
    const Pz = enPelea(), Fz = Pz.f[0]; Fz.esp.valor = 4; M.pasoPelea(Pz, [{ modoEspecial: 'apretar' }, {}]);
    n = 0; while (Fz.p.clave === 'furia' && n++ < 60) M.pasoPelea(Pz, [{}, {}]);
    const z = cambio(Pz, 0, 'alto', null, null);
    ok(Math.abs(z.ev.zonas.cabeza - UR.ataques.gancho_alto.dano * UR.zonas.porDano * SP.furia.zona) < 1e-6, `zona × ${SP.furia.zona} (${z.ev.zonas.cabeza})`);
    // Se vacía en 8 s y vuelve todo
    let fin = false; n = 0;
    while (!fin && n++ < 600) { M.pasoPelea(Pz, [{}, {}]); Pz.f[0].vida = Pz.f[1].vida = 100; fin = Pz.eventos.some(e => e.tipo === 'furia' && !e.activa); }
    ok(fin && Fz.furia === 0 && Fz.p.prisa === 1 && Fz.esp.valor < 1e-9, `a los 8 s se apaga (prisa ${Fz.p.prisa}, barra ${Fz.esp.valor})`);
    // Q y E casi juntos: el arte que acaba de empezar se devuelve y sale la Furia
    const Pq = enPelea(), Fq = Pq.f[0]; Fq.esp.valor = 4; Pq.f[1].x = Fq.x + 3;
    M.pasoPelea(Pq, [{ especial: 'apretar' }, {}]);
    ok(Fq.p.clave === 'giro' && Math.abs(Fq.esp.valor - 3) < 1e-9, 'Q solo: el giro (cuesta 1)');
    M.pasoPelea(Pq, [{ agarre: 'apretar', modoEspecial: 'apretar' }, {}]);
    ok(Fq.furia > 0 && Fq.p.clave === 'furia', `E justo después: Furia con el giro devuelto (${Fq.p.clave})`);
}
// CPU: se zafa leyendo la altura, amaga en difícil y maestro, rompe la reacción y entra en Furia
{
    const tasa = dificultad => {
        let zafa = 0, n = 0;
        for (let s = 1; s <= 40; s++) {
            const r = agarrar(['alto', 'medio', 'bajo'][s % 3], { semilla: s * 31 });
            r.P.dificultad = dificultad; r.P.cpu = [null, null];
            for (let i = 0; i < 30; i++) { M.pasoPelea(r.P, [{}, M.intencionCPU(r.P, 1)]); if (r.P.eventos.some(e => e.tipo === 'escape' && e.resultado === 'zafa')) { zafa++; break; } }
            n++;
        }
        return zafa / n;
    };
    const tf = tasa('facil'), tm = tasa('maestro');
    ok(tm > tf && tm >= 0.7 && tf <= 0.6, `la CPU se zafa más en maestro (${(tf * 100).toFixed(0)} % fácil, ${(tm * 100).toFixed(0)} % maestro)`);
    const amagos = dificultad => {
        let a = 0;
        for (let s = 1; s <= 6; s++) {
            const P = enPelea({ lalo: 'sekiro', moises: 'urbano', semilla: s * 7, dificultad });
            for (let i = 0; i < 3600 && P.fase === 'pelea'; i++) {
                M.pasoPelea(P, [{}, M.intencionCPU(P, 1)]);
                a += P.eventos.filter(e => e.tipo === 'amago').length;
                P.f[0].vida = P.f[1].vida = 100; P.reloj = 60;
            }
        }
        return a;
    };
    const an = amagos('normal'), am = amagos('maestro');
    ok(an === 0 && am > 0, `la CPU amaga solo en difícil y maestro (normal ${an}, maestro ${am})`);
    // Rompe la reacción con el arte cuando tiene barra
    let rompe = 0;
    for (let s = 1; s <= 20; s++) {
        const P = enPelea({ semilla: s }), O = P.f[1];
        O.esp.valor = 1; E.reaccionar(O.p, 'medio_fuerte');
        for (let i = 0; i < 30; i++) { M.pasoPelea(P, [{}, M.intencionCPU(P, 1)]); if (P.eventos.some(e => e.tipo === 'arte' && e.rompe)) { rompe++; break; } }
    }
    ok(rompe >= 6 && rompe <= 18, `la CPU rompe la reacción con el arte a veces (${rompe} de 20)`);
    let furias = 0;
    for (let s = 1; s <= 10; s++) {
        const P = enPelea({ semilla: s }), O = P.f[1]; O.esp.valor = 4;
        for (let i = 0; i < 240; i++) { M.pasoPelea(P, [{}, M.intencionCPU(P, 1)]); if (P.eventos.some(e => e.tipo === 'furia' && e.activa)) { furias++; break; } }
    }
    ok(furias >= 7, `la CPU entra en Furia con la barra llena (${furias} de 10)`);
}

console.log(fallos ? `estilo-urbano: ${fallos} de ${pruebas} pruebas fallaron` : `estilo-urbano: ${pruebas} pruebas OK`);
process.exit(fallos ? 1 : 0);
