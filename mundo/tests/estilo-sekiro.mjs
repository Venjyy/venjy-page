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
// L3 (§16.4, S11-S14; combate/peligro.js):
//   8. Tabla de respuestas de §16.4 (desvío, guardia, salto y esquiva contra barrido, estocada y agarre), la patada
//      que atraviesa la guardia y la ventana 2 c más corta contra la estocada
//   9. Aviso: el rombo se ve desde anticipación + aviso hasta el activo
//  10. Mikiri (ventana desde el aviso hasta activo + 2, solo hacia adelante y solo contra la estocada), salto que
//      esquiva el barrido, pisotón (+25 aunque se tape), agarre con lanzamiento y patada
//  11. Golpe final: al desequilibrado a tu alcance; rematado, gana la ronda, envaina; lejos o sin postura rota, tajo
//  12. Espíritu (perfecto 1, normal 1/3, tope 3) y arte de combate (cuesta 1, +40 aunque lo bloqueen, −15 la tuya)
//  13. El rival de práctica intercala los tres peligrosos
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
const G = await imp('mundo/supervivencia/combate/peligro.js');
const { reglasEstilo } = await imp('mundo/supervivencia/combate/reglas.js');
const { evaluarGesto } = await imp('mundo/datos/gestos.js');
const COMB = leer('combate'), POSES = leer('poses');
D.fijarCombate(COMB);
L.fijarLimites(POSES.limites);
const SK = leer('estilo-sekiro'), PRUEBA = leer('estilo-prueba'), ARENA = leer('arena');
const HZ = D.COMBATE.motor.hz, SALTO = D.COMBATE.motor.saltoMax;
const estilos = { sekiro: SK, prueba: PRUEBA, urbano: leer('estilo-urbano') };
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
    M.pasoPelea(P, [{ fuerte: 'apretar' }, {}]); // (atacar sería el golpe final, L3)
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
    const Rp = M.reglasArena({ ...ARENA, peleadores: { ...ARENA.peleadores, moises: { ...ARENA.peleadores.moises, estilo: 'prueba' } } }); // (Moisés en el estilo de prueba, como en L2-L3)
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

// ---------- 8. Peligrosos: la tabla de respuestas de §16.4 (combate/peligro.js) ----------
{
    const R = G.reglasPeligro(SK), T = R.peligro.respuestas;
    const p = estado => ({ estado });
    // Lo que deja cada defensa contra cada peligro: la fila de la tabla de COMBATE.md §16.4
    const tabla = {
        barrido: { desvio: 'golpeado', guardia: 'golpeado', salto: 'esquivado', esquiva: 'esquivado' },
        estocada: { desvio: 'desviado', guardia: 'golpeado', salto: 'golpeado', esquiva: 'esquivado' },
        agarre: { desvio: 'golpeado', guardia: 'golpeado', salto: 'esquivado', esquiva: 'esquivado' }
    };
    for (const [pel, fila] of Object.entries(tabla)) {
        const g = { peligro: pel };
        ok(G.responder(R, p('desvio'), g, 'desviado') === fila.desvio, `${pel}: desvío → ${fila.desvio}`);
        ok(G.responder(R, p('desvio'), g, 'perfecto') === (fila.desvio === 'desviado' ? 'perfecto' : 'golpeado'), `${pel}: desvío perfecto según la tabla`);
        ok(G.responder(R, p('bloqueo'), g, 'bloqueado') === fila.guardia, `${pel}: guardia → ${fila.guardia}`);
        ok(G.responder(R, p('salto'), g, 'golpeado') === fila.salto, `${pel}: salto → ${fila.salto}`);
        ok(G.responder(R, p('esquiva'), g, 'esquivado') === fila.esquiva, `${pel}: esquiva → ${fila.esquiva}`);
    }
    ok(G.responder(R, p('salto'), {}, 'golpeado') === 'golpeado', 'saltar no esquiva un tajo normal');
    ok(G.responder(R, p('bloqueo'), { rompeGuardia: true }, 'bloqueado') === 'golpeado', 'la patada atraviesa la guardia mantenida');
    ok(G.responder(R, p('desvio'), { rompeGuardia: true }, 'desviado') === 'desviado', 'la patada sí se desvía');
    // Estocada: la ventana del desvío es 2 c más corta (perfecto y normal)
    ok(T.estocada.ventana === -2 && G.ajusteVentana(R, { peligro: 'estocada' }) === -2 && G.ajusteVentana(R, {}) === 0, 'la estocada acorta la ventana del desvío 2 c');
    const s = S.crearPostura(S.reglasPostura(SK), 100);
    S.tocarDefensa(s, 1000);
    const q = { estado: 'desvio', clave: SK.controles.defensa, estilo: SK, defensa: false };
    q.c = s.perfecto - 1; ok(S.clasificar(s, q, 'desviado', 0) === 'perfecto' && S.clasificar(s, q, 'desviado', -2) === 'desviado', `estocada: el cuadro ${q.c} ya no es perfecto`);
    q.c = s.ventana - 1; ok(S.clasificar(s, q, 'desviado', 0) === 'desviado' && S.clasificar(s, q, 'desviado', -2) === 'golpeado', `estocada: el cuadro ${q.c} ya no desvía`);
    // Datos: cada peligroso con al menos 24 c de anticipación, en Lalo y en el estilo de prueba de Moisés
    for (const est of [SK, PRUEBA]) for (const k of ['barrido', 'estocada', 'agarre']) {
        const a = est.ataques[k];
        ok(a && a.peligro === k && a.fases.anticipacion >= 24, `${est.nombre.es}: ${k} es peligroso con ≥ 24 c de anticipación`);
    }
}

// Pelea de laboratorio: f[0] Lalo (sekiro) y f[1] Moisés (prueba) a `d` bloques, en pelea
function lab(d = 1.6) {
    const P = enPelea();
    P.f[1].x = P.f[0].x + d; P.f[1].z = P.f[0].z;
    return P;
}
const fijar = (P, d) => { P.f[1].x = P.f[0].x + d; P.f[1].z = P.f[0].z; };
// Corre n cuadros; it(i) da las intenciones; devuelve los eventos de la arena
function correr(P, n, it = () => [{}, {}], d = null) {
    const ev = [];
    for (let i = 0; i < n; i++) { if (d != null) fijar(P, d); M.pasoPelea(P, it(i)); ev.push(...P.eventos); }
    return ev;
}

// ---------- 9. Aviso del peligro ----------
{
    const P = lab(2.4);
    const ev = correr(P, 40, i => [{}, i === 0 ? { accion: 'estocada' } : {}], 2.4);
    const e = ev.find(x => x.tipo === 'peligro');
    ok(e && e.i === 1 && e.peligro === 'estocada' && e.destello === SK.reglas.peligro.destello, `la estocada avisa (evento peligro, destello ${e && e.destello})`);
    // El aviso se ve desde anticipación + aviso hasta que empieza el activo
    const Q = lab(2.4), def = PRUEBA.ataques.estocada, g = D.inicioFase(def.fases, 'activo'), visto = [];
    correr(Q, 1, () => [{}, { accion: 'estocada' }], 2.4);
    for (let i = 0; i < g + 4; i++) { visto.push([Q.f[1].p.c, !!M.avisoPeligro(Q, 1)]); correr(Q, 1, undefined, 2.4); }
    const desde = visto.find(v => v[1]), hasta = [...visto].reverse().find(v => v[1]);
    ok(desde && desde[0] === G.reglasPeligro(PRUEBA).peligro.aviso && hasta[0] === g - 1, `el rombo se ve de c${desde && desde[0]} a c${hasta && hasta[0]} (activo en c${g})`);
    ok(!M.avisoPeligro(lab(), 0), 'sin peligro no hay aviso');
}

// ---------- 10. Mikiri, salto y pisotón, agarre y patada ----------
{
    const def = PRUEBA.ataques.estocada, g = D.inicioFase(def.fases, 'activo'), Rk = G.reglasPeligro(SK);
    // Esquivar hacia el rival en el cuadro c de su estocada
    // (empieza a 4,6 bloques y la estocada avanza: la punta todavía no llegó en activo + 2)
    const mikiri = (c, adelante = 1) => {
        const P = lab(4.6);
        correr(P, 1, () => [{}, { accion: 'estocada' }]);
        while (P.f[1].p.c < c) correr(P, 1);
        const ev = correr(P, 1, () => [{ esquivar: 'apretar', mover: [adelante, 0] }, {}]);
        return { P, ev };
    };
    const a = mikiri(Rk.peligro.aviso);
    ok(a.P.f[0].p.clave === 'mikiri' && a.P.f[1].p.clave === 'pisado' && a.ev.some(e => e.tipo === 'mikiri'), `esquivar hacia el rival al aviso es mikiri (${a.P.f[0].p.clave} / ${a.P.f[1].p.clave})`);
    const post0 = a.P.f[1].post.valor;
    const ev = correr(a.P, 40);
    const pis = ev.find(e => e.tipo === 'golpe' && e.resultado === 'mikiri');
    ok(pis && Math.abs(a.P.f[1].post.valor - post0 - SK.acciones.mikiri.pareja.postura) < 1, `el mikiri pisa la hoja: +${SK.acciones.mikiri.pareja.postura} de postura al rival (${(a.P.f[1].post.valor - post0).toFixed(1)})`);
    ok(a.P.f[0].vida === a.P.f[0].vidaMax, 'el mikiri no recibe daño');
    const visto = new Set(); for (let i = 0; i < 80; i++) { correr(a.P, 1); visto.add(a.P.f[1].p.clave); }
    ok(visto.has('desviado_largo'), 'después del pisado queda en desviado_largo');
    ok(mikiri(g + Rk.mikiri.hasta).P.f[0].p.clave === 'mikiri', `todavía es mikiri en activo + ${Rk.mikiri.hasta}`);
    ok(mikiri(g + Rk.mikiri.hasta + 1).P.f[0].p.clave !== 'mikiri', 'un cuadro después ya no');
    ok(mikiri(Rk.peligro.aviso - 1).P.f[0].p.clave !== 'mikiri', 'antes del aviso no es mikiri');
    ok(mikiri(Rk.peligro.aviso, -1).P.f[0].p.clave === 'esquiva', 'esquivar hacia atrás es una esquiva normal');
    // Contra un tajo (sin peligro) la esquiva hacia adelante es una esquiva
    {
        const P = lab(2);
        correr(P, 1, () => [{}, { atacar: 'apretar' }], 2);
        correr(P, 3, undefined, 2);
        correr(P, 1, () => [{ esquivar: 'apretar', mover: [1, 0] }, {}]);
        ok(P.f[0].p.clave === 'esquiva', 'contra un tajo normal no hay mikiri');
    }
    // Barrido: saltar a tiempo lo esquiva; la guardia y el desvío no sirven
    const barrido = defensa => {
        const P = lab(1.8), b = PRUEBA.ataques.barrido, gb = D.inicioFase(b.fases, 'activo');
        correr(P, 1, () => [{}, { accion: 'barrido' }], 1.8);
        const ev = correr(P, gb + 10, i => [defensa(i, gb), {}], 1.8);
        // (la guardia se arma con un toque y se mantiene)
        return { P, r: (ev.find(e => e.tipo === 'golpe' && e.de === 1) || {}).resultado || 'nada' };
    };
    const salto = barrido((i, gb) => (i === gb - 8 ? { saltar: 'apretar' } : {}));
    ok(salto.r === 'esquivado' || salto.r === 'nada', `saltar el barrido lo esquiva (${salto.r})`);
    ok(salto.P.f[0].vida === salto.P.f[0].vidaMax, 'saltando el barrido no pierde vida');
    ok(barrido(i => ({ defensa: i === 0 ? 'apretar' : 'mantener' })).r === 'golpeado', 'el barrido atraviesa la guardia');
    ok(barrido((i, gb) => (i === gb - 3 ? { defensa: 'apretar' } : {})).r === 'golpeado', 'el barrido no se desvía');
    // Pisotón: en el aire, saltar otra vez sobre el rival le suma 25 aunque se tape
    {
        const P = lab(1.2);
        const post0 = P.f[1].post.valor;
        correr(P, 1, () => [{ saltar: 'apretar' }, { defensa: 'apretar' }], 1.2);
        ok(P.f[0].p.clave === 'salto', `saltar sale el salto (${P.f[0].p.clave})`);
        correr(P, 8, () => [{}, { defensa: 'mantener' }], 1.2);
        correr(P, 1, () => [{ saltar: 'apretar' }, { defensa: 'mantener' }], 1.2);
        ok(P.f[0].p.clave === 'pisoton', `saltar otra vez en el aire es el pisotón (${P.f[0].p.clave})`);
        const ev = correr(P, 20, () => [{}, { defensa: 'mantener' }], 1.2);
        const e = ev.find(x => x.tipo === 'golpe' && x.de === 0);
        ok(e && e.resultado === 'golpeado' && Math.abs(P.f[1].post.valor - post0 - SK.ataques.pisoton.posturaFija) < 1.5, `el pisotón entra aunque se tape y suma ${SK.ataques.pisoton.posturaFija} (${e && e.resultado}, ${(P.f[1].post.valor - post0).toFixed(1)})`);
    }
    // Agarre: si entra, el que agarra lanza y el otro queda agarrado; esquivar lo evita
    {
        const P = lab(1.4);
        correr(P, 1, () => [{}, { accion: 'agarre' }], 1.4);
        const ga = D.inicioFase(PRUEBA.ataques.agarre.fases, 'activo');
        const ev = correr(P, ga + 2, i => [{ defensa: i === 0 ? 'apretar' : 'mantener' }, {}], 1.4);
        const e = ev.find(x => x.tipo === 'golpe' && x.de === 1);
        ok(e && e.resultado === 'golpeado' && P.f[0].p.clave === 'agarrado' && P.f[1].p.clave === 'lanzamiento', `el agarre atraviesa la guardia y lo lanza (${e && e.resultado}, ${P.f[0].p.clave} / ${P.f[1].p.clave})`);
        const Q = lab(1.4);
        correr(Q, 1, () => [{}, { accion: 'agarre' }], 1.4);
        const ev2 = correr(Q, ga + 2, i => [i === ga - 4 ? { esquivar: 'apretar', mover: [-1, 0] } : {}, {}]);
        ok(!ev2.some(x => x.tipo === 'golpe' && x.de === 1 && x.resultado === 'golpeado'), 'esquivar hacia atrás evita el agarre');
    }
    // Patada (E): atraviesa la guardia mantenida
    {
        const P = lab(1.5);
        const ev = correr(P, 30, i => [i === 0 ? { agarre: 'apretar' } : {}, { defensa: i === 0 ? 'apretar' : 'mantener' }], 1.5);
        const e = ev.find(x => x.tipo === 'golpe' && x.de === 0);
        ok(e && e.clave === 'patada' && e.resultado === 'golpeado', `la patada atraviesa la guardia (${e && e.clave} ${e && e.resultado})`);
    }
}

// ---------- 11. Golpe final ----------
{
    const P = lab(1.6), O = P.f[1];
    S.romper(O.post); E.reaccionar(O.p, O.post.R.postura.desequilibrado);
    const ev0 = correr(P, 1, () => [{ atacar: 'apretar' }, {}], 1.6);
    ok(P.f[0].p.clave === 'remate' && ev0.some(e => e.tipo === 'remate' && e.de === 0), `atacar al desequilibrado es el golpe final (${P.f[0].p.clave})`);
    const ga = D.inicioFase(SK.acciones.remate.fases, 'activo');
    const ev = correr(P, ga + 2);
    const g = ev.find(e => e.tipo === 'golpe' && e.de === 0);
    ok(O.p.clave === 'rematado' && g && g.nivel === 'remate', `en el activo el rival pasa a rematado con peso remate (${O.p.clave}, ${g && g.nivel})`);
    ok(O.vida === 0 && P.fase === 'ko', `el golpe final gana la ronda (vida ${O.vida}, fase ${P.fase})`);
    const resto = correr(P, 60);
    ok(resto.some(e => e.tipo === 'envainar' && e.i === 0), 'termina envainando (evento envainar)');
    ok(D.largoFases(SK.acciones.remate.fases) === 60, 'el golpe final dura 60 c');
    // Lejos no: el tajo normal
    const Q = lab(3.6); S.romper(Q.f[1].post); E.reaccionar(Q.f[1].p, Q.f[1].post.R.postura.desequilibrado);
    correr(Q, 1, () => [{ atacar: 'apretar' }, {}], 3.6);
    ok(Q.f[0].p.clave === SK.controles.atacar, `fuera de alcance sale el tajo (${Q.f[0].p.clave})`);
    // Sin postura rota tampoco
    const Z = lab(1.6); correr(Z, 1, () => [{ atacar: 'apretar' }, {}], 1.6);
    ok(Z.f[0].p.clave === SK.controles.atacar, 'sin la postura rota sale el tajo');
}

// ---------- 12. Espíritu y arte de combate ----------
{
    const R = G.reglasPeligro(SK), s = G.crearEspiritu(R);
    ok(s.tope === 3 && s.valor === 0, 'tres segmentos de espíritu, vacíos al empezar');
    G.ganarEspiritu(s, R, 'perfecto'); ok(s.valor === 1, 'el perfecto da un segmento');
    G.ganarEspiritu(s, R, 'desviado'); ok(Math.abs(s.valor - 1 - R.espiritu.desvio) < 1e-9, 'el normal da un tercio');
    for (let i = 0; i < 9; i++) G.ganarEspiritu(s, R, 'perfecto'); ok(s.valor === 3, 'no pasa del tope');
    // Sin espíritu el arte no sale
    const P = lab(1.8);
    const ev = correr(P, 1, () => [{ especial: 'apretar' }, {}], 1.8);
    ok(P.f[0].p.clave !== 'arte' && ev.some(e => e.tipo === 'sinEspiritu'), 'sin espíritu no sale el arte');
    // Con espíritu: lo gasta, suma 40 aunque lo bloqueen y baja 15 la tuya
    const Q = lab(1.8); Q.f[0].esp.valor = 1; Q.f[0].post.valor = 30;
    const post0 = Q.f[1].post.valor;
    correr(Q, 1, () => [{ especial: 'apretar' }, { defensa: 'apretar' }], 1.8);
    ok(Q.f[0].p.clave === 'arte' && Q.f[0].esp.valor === 0, `el arte gasta un segmento (${Q.f[0].p.clave}, ${Q.f[0].esp.valor})`);
    const ev2 = correr(Q, 30, () => [{}, { defensa: 'mantener' }], 1.8);
    const e = ev2.find(x => x.tipo === 'golpe' && x.de === 0);
    ok(e && e.resultado === 'bloqueado' && Math.abs(Q.f[1].post.valor - post0 - SK.ataques.arte.posturaFija) < 1.5, `bloqueado igual suma ${SK.ataques.arte.posturaFija} (${e && e.resultado}, ${(Q.f[1].post.valor - post0).toFixed(1)})`);
    ok(Q.f[0].post.valor <= 30 + SK.ataques.arte.posturaPropia + 0.5, `y te baja ${-SK.ataques.arte.posturaPropia} de la tuya (${Q.f[0].post.valor.toFixed(1)})`);
    // Los desvíos del jugador llenan su espíritu en la pelea
    const Z = lab(1.4);
    correr(Z, 1, () => [{}, { atacar: 'apretar' }], 1.4);
    const gt = D.inicioFase(PRUEBA.ataques[PRUEBA.controles.atacar].fases, 'activo');
    correr(Z, gt + 6, i => [i === gt - 3 ? { defensa: 'apretar' } : {}, {}], 1.4);
    ok(Z.f[0].esp.valor > 0, `desviar llena el espíritu (${Z.f[0].esp.valor.toFixed(2)})`);
}

// ---------- 13. La práctica intercala los peligrosos ----------
{
    const P = enPelea(M.reglasArena({ ...ARENA, peleadores: { ...ARENA.peleadores, moises: { ...ARENA.peleadores.moises, estilo: 'prueba' } } }), 5); // (Moisés en el estilo de prueba, como en L3)
    const vistos = new Set();
    for (let i = 0; i < HZ * 40 && P.fase === 'pelea'; i++) {
        P.f[0].vida = P.f[0].vidaMax; P.f[1].vida = P.f[1].vidaMax;
        M.pasoPelea(P, [{}, M.intencionPractica(P, 1)]);
        for (const e of P.f[1].p.eventos) if (e.tipo === 'inicio' && PRUEBA.ataques[e.clave] && PRUEBA.ataques[e.clave].peligro) vistos.add(e.clave);
    }
    ok(['estocada', 'barrido', 'agarre'].every(k => vistos.has(k)), `el rival de práctica tira los tres peligrosos (${[...vistos].join(', ')})`);
}

console.log(fallos ? `estilo-sekiro: ${fallos} de ${pruebas} pruebas fallaron` : `estilo-sekiro: ${pruebas} pruebas OK`);
process.exit(fallos ? 1 : 0);
