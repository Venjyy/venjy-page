// =========================================================
// Estilo Sekiro (bloque 8 · L2): node mundo/tests/estilo-sekiro.mjs
// Cubre mundo/datos/estilo-sekiro.json con combate/estados.js, combate/postura.js, combate/animacion.js y
// arena/modelo.js (mundo/COMBATE.md §16.1-16.3):
//   1. Datos: el estilo pasa las reglas de validar; Lalo pelea con él en arena.json
//   2. Combo continuo: cada tajo sale de la pose donde quedó el anterior (en toda la ventana del combo, la pose del
//      tajo y la del primer cuadro del siguiente difieren menos que motor.saltoMax en todos los canales), clicando
//      seguido salen los 4 sin pasar por la guardia, y la pose que se ve nunca salta
//   3. Ventanas del desvío: perfecto, normal, bloqueo si se mantiene, golpe si se soltó; penalización por repetir
//      (cada toque dentro de 30 c quita 3 c, mínimo 3 y sin perfecto) y se recupera tras 45 c; +2 c en el táctil
//   4. Tabla de postura (golpe, bloqueo, desvío y perfecto, para los dos) y rotura → desequilibrado → trasRomper
//   5. Regeneración: nada el primer segundo; después 12/s × (0,4 + 0,6 × vida%) y ×1,5 con la guardia
//   6. Golpe cargado (se queda en el cuadro de la carga mientras se mantiene; más daño con la carga) y esquiva
//      (i-frames de c2 a c10)
//   7. Lalo de práctica: repite su patrón (combos y carga), desvía uno de cada desviaCada y es determinista
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
const A = await imp('mundo/supervivencia/combate/animacion.js');
const S = await imp('mundo/supervivencia/combate/postura.js');
const M = await imp('mundo/supervivencia/arena/modelo.js');
const { reglasEstilo } = await imp('mundo/supervivencia/combate/reglas.js');
const { evaluarGesto } = await imp('mundo/datos/gestos.js');
const COMB = leer('combate'), POSES = leer('poses');
D.fijarCombate(COMB);
L.fijarLimites(POSES.limites);
const SK = leer('estilo-sekiro'), PRUEBA = leer('estilo-prueba'), ARENA = leer('arena');
const HZ = D.COMBATE.motor.hz, SALTO = D.COMBATE.motor.saltoMax;
const estilos = { sekiro: SK, prueba: PRUEBA };
const RS = SK.reglas;

// ---------- 1. Datos ----------
{
    const r = reglasEstilo(SK, { combate: COMB, limites: POSES.limites }).filter(x => x.tipo === 'error').map(x => x.texto);
    ok(r.length === 0, `estilo-sekiro.json sin errores (${r.slice(0, 4).join(' · ')})`);
    ok(ARENA.peleadores.lalo.estilo === 'sekiro', 'Lalo pelea con el estilo sekiro');
    for (const k of ['tajo1', 'tajo2', 'tajo3', 'tajo4', 'fuerte']) ok(SK.ataques[k] && SK.ataques[k].efectos && SK.ataques[k].efectos.estela, `${k} tiene su estela en efectos`);
    ok(SK.arma && SK.arma.modelo === 'katana' && SK.arma.vaina, 'la katana es un modelo 3D con vaina');
}

// ---------- 2. Combo continuo ----------
// Pose cruda de una acción en el cuadro c: la guardia y encima los canales de su animación (capas 1 y 2 del motor)
const tmp = {};
function guardia() {
    for (const k of Object.keys(tmp)) delete tmp[k];
    evaluarGesto(D.animDe(SK, SK.guardia.anim), 0, 0, null, tmp);
    return { ...tmp };
}
function pose(clave, c) {
    const def = D.accionDe(SK, clave), o = {};
    for (const k of Object.keys(tmp)) delete tmp[k];
    evaluarGesto(D.animDe(SK, SK.guardia.anim), 0, 0, null, tmp); Object.assign(o, tmp);
    const a = D.animDe(SK, def.anim || clave), f = def.fases, total = D.largoFases(f);
    for (const k of Object.keys(tmp)) delete tmp[k];
    evaluarGesto(a, total ? c / total : 0, c / HZ, { fases: f, c }, tmp); Object.assign(o, tmp);
    return o;
}
const NO_ANGULO = new Set(['y', 'salto', 'pz']);
function difMax(a, b) {
    let peor = 0, canal = '';
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
        if (NO_ANGULO.has(k)) continue;
        const d = Math.abs((a[k] || 0) - (b[k] || 0));
        if (d > peor) { peor = d; canal = k; }
    }
    return { peor, canal };
}
{
    const cadena = ['tajo1', 'tajo2', 'tajo3', 'tajo4'];
    for (let i = 0; i < 3; i++) {
        const k = cadena[i], sig = cadena[i + 1], def = SK.ataques[k], f = def.fases;
        const v = def.cancelar.find(x => x.a.includes(sig));
        ok(!!v, `${k} se cancela a ${sig}`);
        if (!v) continue;
        const desde = D.marca(v.desde, f), hasta = v.hasta === undefined ? D.largoFases(f) - 1 : D.marca(v.hasta, f);
        const inicio = pose(sig, 0);
        let peor = { peor: 0 }, donde = -1;
        for (let c = desde; c <= hasta; c++) { const d = difMax(pose(k, c), inicio); if (d.peor > peor.peor) { peor = d; donde = c; } }
        ok(peor.peor < SALTO, `${k} → ${sig}: el tajo siguiente sale de donde quedó el anterior (dif. ${peor.peor.toFixed(3)} en ${peor.canal}, cuadro ${donde}; tope ${SALTO})`);
        // Y el cierre de cada tajo vuelve a la guardia (al soltar la cadena)
    }
    for (const k of [...cadena, 'fuerte']) {
        const fin = difMax(pose(k, D.largoFases(SK.ataques[k].fases)), guardia());
        ok(fin.peor < 0.05, `${k} termina en la guardia al soltar la cadena (dif. ${fin.peor.toFixed(3)} en ${fin.canal})`);
    }

    // Clicando seguido: salen los 4 sin volver a la guardia, y la pose que se ve nunca salta más que saltoMax
    const p = E.crearPeleador(SK), an = A.crearAnimador(SK);
    const vistos = [];
    let guardiaEntre = false, ant = null, salto = { peor: 0 }, cuadros = 0;
    for (let i = 0; i < 160; i++) {
        E.paso(p, { atacar: i % 2 === 0 && vistos.length < 4 ? 'apretar' : undefined });
        if (p.estado === 'ataque' && vistos[vistos.length - 1] !== p.clave) vistos.push(p.clave);
        if (vistos.length && vistos.length < 4 && p.estado !== 'ataque') guardiaEntre = true;
        const o = { ...A.animar(an, p, { t: i / HZ }) };
        // En el activo de un ataque el tope es su velocidadMax (el golpe va rápido a propósito); fuera, saltoMax
        const tope = p.def && D.faseEn(p.def.fases, p.c).fase === 'activo' ? Math.min(p.def.velocidadMax || SALTO, D.COMBATE.motor.velocidadMax) : SALTO;
        if (ant) { const d = difMax(o, ant); d.peor /= tope; if (d.peor > salto.peor) { salto = d; salto.i = i; } }
        ant = o; cuadros++;
        if (vistos.length === 4 && p.estado !== 'ataque') break;
    }
    ok(vistos.join(',') === 'tajo1,tajo2,tajo3,tajo4', `clicando seguido sale el combo de 4 (${vistos.join(',')})`);
    ok(!guardiaEntre, 'entre tajo y tajo no vuelve a la guardia');
    ok(salto.peor <= 1 + 1e-6, `la pose que se ve nunca salta (peor ${(salto.peor * 100).toFixed(0)} % del tope en ${salto.canal}, cuadro ${salto.i})`);
}

// ---------- 3. Ventanas del desvío ----------
{
    const reglas = S.reglasPostura(SK);
    // Un golpe que llega n cuadros después de tocar defensa, con la defensa mantenida o suelta
    const probar = (n, mantener = false, previos = [], tactil = false) => {
        const p = E.crearPeleador(SK, { tactil }), s = S.crearPostura(reglas, 100);
        let cuadro = 0;
        for (const q of previos) { while (cuadro < q) { E.paso(p, {}); cuadro++; } S.tocarDefensa(s, cuadro, tactil); E.paso(p, { defensa: 'apretar' }); cuadro++; }
        while (cuadro < (previos.length ? previos[previos.length - 1] + 1 : 0)) { E.paso(p, {}); cuadro++; }
        // Espera a que el desvío anterior termine antes del toque que se mide
        while (p.estado !== 'guardia' && cuadro < 400) { E.paso(p, {}); cuadro++; }
        S.tocarDefensa(s, cuadro, tactil);
        E.paso(p, { defensa: 'apretar' });
        for (let i = 0; i < n; i++) E.paso(p, { defensa: mantener ? 'mantener' : undefined });
        return E.recibir(p, { reaccion: 'alto_leve', altura: 'alto' }, { alRecibir: (q, g, r) => S.clasificar(s, q, r) }).resultado;
    };
    const per = RS.desvio.perfecto, ven = RS.desvio.ventana;
    ok(probar(0) === 'perfecto' && probar(per - 1) === 'perfecto', `perfecto de 0 a ${per - 1} c (${probar(0)}, ${probar(per - 1)})`);
    ok(probar(per) === 'desviado' && probar(ven - 1) === 'desviado', `normal de ${per} a ${ven - 1} c (${probar(per)}, ${probar(ven - 1)})`);
    ok(probar(ven, true) === 'bloqueado', `después de la ventana, manteniendo, bloquea (${probar(ven, true)})`);
    ok(probar(ven, false) === 'golpeado', `después de la ventana, soltando, entra el golpe (${probar(ven, false)})`);
    ok(probar(per + 1, false, [], true) === 'perfecto' && probar(ven + 1, false, [], true) === 'desviado', 'en el táctil, +2 c a cada tramo');
    // Penalización: tocar dentro de 30 c del anterior
    const s = S.crearPostura(reglas, 100), r = RS.desvio.repetir;
    S.tocarDefensa(s, 0); ok(s.ventana === ven && s.perfecto === per, 'el primer toque tiene la ventana entera');
    S.tocarDefensa(s, 20); ok(s.ventana === ven - r.quita && s.perfecto === Math.max(0, per - r.quita), `repetir dentro de ${r.dentro} c quita ${r.quita} c (${s.ventana}/${s.perfecto})`);
    S.tocarDefensa(s, 40); S.tocarDefensa(s, 60); S.tocarDefensa(s, 80);
    ok(s.ventana === r.minimo && s.perfecto === 0, `spameando: mínimo ${r.minimo} c y sin perfecto (${s.ventana}/${s.perfecto})`);
    S.tocarDefensa(s, 80 + r.recupera); ok(s.ventana === ven && s.perfecto === per, `tras ${r.recupera} c sin tocar se recupera`);
    S.tocarDefensa(s, 80 + r.recupera + r.dentro + 5); ok(s.ventana === ven, 'entre dentro y recupera no penaliza ni recupera de más');
}

// ---------- 4. Tabla de postura y rotura ----------
const R2 = M.reglasArena({ ...ARENA, peleadores: { ...ARENA.peleadores, moises: { ...ARENA.peleadores.moises, estilo: 'sekiro' } } });
const avanzar = (P, n, f) => { for (let i = 0; i < n; i++) M.pasoPelea(P, f ? f(i) : [{}, {}]); };
function enPelea(R = R2, semilla = 3) {
    const P = M.nuevaPelea(R, { estilos, semilla });
    let n = 0; while (!P.listaEntrada && n++ < 2000) M.pasoPelea(P, []);
    M.empezarRondas(P);
    n = 0; while (P.fase !== 'pelea' && n++ < 2000) M.pasoPelea(P, []);
    return P;
}
// f[0] tira tajo1 a f[1] puesto a 1,4 bloques; defensa: lo que hace f[1] (y cuándo toca)
function golpe(defensa, tocaAntes = null) {
    const P = enPelea();
    P.f[1].x = P.f[0].x + 1.4; P.f[1].z = P.f[0].z;
    const ant = D.inicioFase(SK.ataques.tajo1.fases, 'activo');
    let res = null, ev = null;
    const v0 = P.f[1].vida, p0 = [P.f[0].post.valor, P.f[1].post.valor];
    for (let i = 0; i < 60 && !res; i++) {
        let d = {};
        if (defensa === 'bloqueo') d = { defensa: i === 0 ? 'apretar' : 'mantener' };
        else if (tocaAntes != null && i === ant - tocaAntes + 1) d = { defensa: 'apretar' };
        if (defensa === 'bloqueo' && i === 0) { M.pasoPelea(P, [{}, d]); for (let k = 0; k < 30; k++) M.pasoPelea(P, [{}, { defensa: 'mantener' }]); P.f[1].x = P.f[0].x + 1.4; P.f[1].z = P.f[0].z; continue; }
        M.pasoPelea(P, [i === 0 || (defensa === 'bloqueo' && i === 1) ? { atacar: 'apretar' } : {}, d]);
        ev = P.eventos.find(e => e.tipo === 'golpe');
        if (ev) res = ev.resultado;
    }
    return { res, ev, dv: v0 - P.f[1].vida, da: P.f[0].post.valor - p0[0], dr: P.f[1].post.valor - p0[1], P };
}
{
    const pz = SK.ataques.tajo1.postura, T = RS.tabla;
    const g = golpe('nada');
    ok(g.res === 'golpeado' && Math.abs(g.dv - SK.ataques.tajo1.dano) < 1e-9, `golpe sin defensa quita su daño (${g.res}, ${g.dv})`);
    ok(Math.abs(g.dr - pz * T.golpeado.recibe) < 1e-6 && Math.abs(g.da) < 1e-6, `golpe: +${T.golpeado.recibe} × postura al que recibe (${g.dr.toFixed(2)}, ${g.da.toFixed(2)})`);
    const b = golpe('bloqueo');
    ok(b.res === 'bloqueado' && b.dv === 0, `bloqueo: sin daño (${b.res}, ${b.dv})`);
    ok(Math.abs(b.dr - pz * T.bloqueado.recibe) < 1e-6, `bloqueo: +${T.bloqueado.recibe} × postura (${b.dr.toFixed(2)})`);
    const n = golpe('desvio', RS.desvio.perfecto + 2);
    ok(n.res === 'desviado' && n.dv === 0, `desvío normal tocando ${RS.desvio.perfecto + 2} c antes (${n.res})`);
    ok(Math.abs(n.dr - pz * T.desviado.recibe) < 1e-6 && Math.abs(n.da - pz * T.desviado.atacante) < 1e-6, `desvío normal: ${T.desviado.recibe} y ${T.desviado.atacante} × postura (${n.dr.toFixed(2)}, ${n.da.toFixed(2)})`);
    ok(n.P.f[1].p.clave === RS.desvio.choque, `el que desvía hace su choque (${n.P.f[1].p.clave})`);
    const pf = golpe('desvio', 1);
    ok(pf.res === 'perfecto' && pf.dv === 0, `desvío perfecto tocando 1 c antes (${pf.res})`);
    ok(Math.abs(pf.dr) < 1e-6 && Math.abs(pf.da - (pz * T.perfecto.atacante + T.perfecto.extra)) < 1e-6, `perfecto: 0 al que desvía, postura + ${T.perfecto.extra} al atacante (${pf.dr.toFixed(2)}, ${pf.da.toFixed(2)})`);
    ok(pf.P.f[1].p.clave === RS.desvio.choquePerfecto && pf.P.f[0].p.clave === 'desviado', `perfecto: choque perfecto y el atacante rebota (${pf.P.f[1].p.clave}, ${pf.P.f[0].p.clave})`);
    // Rotura: al tope, desequilibrado; al terminar queda en trasRomper × tope
    const P = enPelea();
    P.f[1].x = P.f[0].x + 1.4; P.f[1].z = P.f[0].z;
    P.f[1].post.valor = P.f[1].post.tope - 1;
    M.pasoPelea(P, [{ atacar: 'apretar' }, {}]);
    let roto = false, k = 0;
    for (; k < 60 && !roto; k++) { M.pasoPelea(P, [{}, {}]); roto = P.eventos.some(e => e.tipo === 'postura' && e.i === 1); }
    ok(roto && P.f[1].p.clave === RS.postura.desequilibrado, `al tope de postura queda desequilibrado (${P.f[1].p.clave})`);
    const dur = D.largoFases(D.accionDe(SK, RS.postura.desequilibrado).fases);
    // Golpeado mientras está desequilibrado: recibe el daño pero no sale del desequilibrio
    const vida = P.f[1].vida;
    avanzar(P, 30, () => [{}, {}]);
    M.pasoPelea(P, [{ atacar: 'apretar' }, {}]);
    avanzar(P, 25, () => [{}, {}]);
    ok(P.f[1].vida < vida && P.f[1].p.clave === RS.postura.desequilibrado, `golpeado desequilibrado: pierde vida y sigue desequilibrado (${P.f[1].p.clave})`);
    for (let i = 0; i < dur && P.f[1].post.roto; i++) M.pasoPelea(P, [{}, {}]);
    ok(!P.f[1].post.roto && Math.abs(P.f[1].post.valor - P.f[1].post.tope * RS.postura.trasRomper) < 1, `al recomponerse queda en ${RS.postura.trasRomper} × tope (${P.f[1].post.valor.toFixed(1)})`);
}

// ---------- 5. Regeneración ----------
{
    const reglas = S.reglasPostura(SK), P = RS.postura;
    const baja = (vida, bloqueo, seg) => {
        const s = S.crearPostura(reglas, 100); s.valor = 80;
        for (let i = 0; i < seg * HZ; i++) S.pasoPostura(s, { vida, bloqueo });
        return 80 - s.valor;
    };
    ok(baja(1, false, P.espera) === 0, `nada el primer ${P.espera} s`);
    const esperado = (vida, k = 1) => P.baja * (P.vidaMin + (1 - P.vidaMin) * vida) * k;
    const d1 = baja(1, false, P.espera + 1), d5 = baja(0.5, false, P.espera + 1), d0 = baja(0, false, P.espera + 1), dg = baja(1, true, P.espera + 1);
    ok(Math.abs(d1 - esperado(1)) < 0.3, `con toda la vida baja ${P.baja}/s (${d1.toFixed(2)})`);
    ok(Math.abs(d5 - esperado(0.5)) < 0.3, `con media vida baja ${esperado(0.5).toFixed(1)}/s (${d5.toFixed(2)})`);
    ok(Math.abs(d0 - esperado(0)) < 0.3, `sin vida baja ${esperado(0).toFixed(1)}/s (${d0.toFixed(2)})`);
    ok(Math.abs(dg - esperado(1, P.guardia)) < 0.3, `con la guardia ×${P.guardia} (${dg.toFixed(2)})`);
    const s = S.crearPostura(reglas, 100); s.valor = 50;
    for (let i = 0; i < 3 * HZ; i++) S.pasoPostura(s, { activo: i % 30 === 0 });
    ok(s.valor === 50, 'atacando seguido no baja');
}

// ---------- 6. Carga y esquiva ----------
{
    const def = SK.ataques.fuerte, en = D.marca(def.carga.en, def.fases);
    const p = E.crearPeleador(SK);
    E.paso(p, { fuerte: 'apretar' });
    ok(p.clave === 'fuerte', 'mantener atacar saca el golpe cargado');
    for (let i = 0; i < en + 20; i++) E.paso(p, { fuerte: 'mantener' });
    ok(p.c === en && p.carga === 20 - 1 + 1 && p.cargando, `mientras se mantiene se queda en el cuadro ${en} (c ${p.c}, carga ${p.carga})`);
    for (let i = 0; i < def.carga.max + 10; i++) E.paso(p, { fuerte: 'mantener' });
    ok(p.carga === def.carga.max && p.c > en, `la carga llega a lo más a ${def.carga.max} y el golpe sigue solo (carga ${p.carga}, c ${p.c})`);
    ok(Math.abs(E.cargaDe(p) - 1) < 1e-9, 'cargaDe = 1 con la carga llena');
    // Más daño con la carga
    const dano = carga => {
        const P = enPelea();
        P.f[1].x = P.f[0].x + 1.6; P.f[1].z = P.f[0].z;
        let ev = null;
        M.pasoPelea(P, [{ fuerte: 'apretar' }, {}]);
        for (let i = 0; i < 120 && !ev; i++) { M.pasoPelea(P, [{ fuerte: i < carga ? 'mantener' : 'soltar' }, {}]); ev = P.eventos.find(e => e.tipo === 'golpe'); P.f[1].x = P.f[0].x + 1.6; P.f[1].z = P.f[0].z; }
        return ev ? ev.dano : -1;
    };
    const d0 = dano(0), dl = dano(80);
    ok(d0 > 0 && Math.abs(dl - d0 * (1 + def.carga.extra)) < 1e-6, `cargado entero hace ×${1 + def.carga.extra} (${d0} → ${dl})`);
    // Esquiva: i-frames de c2 a c10
    const q = E.crearPeleador(SK);
    E.paso(q, { esquivar: 'apretar' });
    const iframes = [];
    for (let c = 1; c < 20 && q.estado === 'esquiva'; c++) {
        E.paso(q, {});
        const r = q.def && D.enTramos(q.def.iframes, q.def.fases, q.c);
        if (r) iframes.push(q.c);
    }
    ok(iframes[0] === 2 && iframes[iframes.length - 1] === 10, `esquiva con i-frames de c2 a c10 (${iframes[0]}..${iframes[iframes.length - 1]})`);
}

// ---------- 7. Lalo de práctica ----------
{
    const Rp = M.reglasArena({ ...ARENA, peleadores: { ...ARENA.peleadores, moises: { ...ARENA.peleadores.moises } } });
    const correr = semilla => {
        const P = M.nuevaPelea(Rp, { estilos, semilla, yo: 'moises', rival: 'lalo' });
        let n = 0; while (!P.listaEntrada && n++ < 2000) M.pasoPelea(P, []);
        M.empezarRondas(P); n = 0; while (P.fase !== 'pelea' && n++ < 2000) M.pasoPelea(P, []);
        const claves = [], desvios = [];
        let traza = '';
        for (let i = 0; i < HZ * 30 && P.fase === 'pelea'; i++) {
            P.f[0].vida = P.f[0].vidaMax; P.f[1].vida = P.f[1].vidaMax;
            const yo = i % 90 === 0 ? { atacar: 'apretar' } : {};
            const it = M.intencionPractica(P, 1);
            M.pasoPelea(P, [yo, it]);
            for (const e of P.f[1].p.eventos) if (e.tipo === 'inicio' && SK.ataques[e.clave]) { claves.push(e.clave); traza += i + e.clave + ','; }
            for (const e of P.eventos) if (e.tipo === 'golpe' && e.de === 0 && (e.resultado === 'desviado' || e.resultado === 'perfecto')) desvios.push(i);
        }
        return { claves, desvios, traza };
    };
    const a = correr(11), b = correr(11);
    ok(a.traza === b.traza && a.traza.length > 0, 'el Lalo de práctica es determinista con la misma semilla');
    const cadena = a.claves.join(',');
    ok(/tajo1,tajo2(,|$)/.test(cadena), `encadena tajos de su patrón (${cadena.slice(0, 80)})`);
    ok(a.claves.includes('fuerte'), 'tira el golpe cargado de su patrón');
    ok(a.desvios.length > 0, `desvía algunos de tus ataques (${a.desvios.length})`);
}

console.log(fallos ? `estilo-sekiro: ${fallos} de ${pruebas} pruebas fallaron` : `estilo-sekiro: ${pruebas} pruebas OK`);
process.exit(fallos ? 1 : 0);
