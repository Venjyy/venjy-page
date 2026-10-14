// =========================================================
// Prueba de la carrera de gatas (7h-1, «Gran Premio del Living»): pista, física (salto, derrape con niveles, turbo,
// placas, truco, huecos y caída, paredes, choques), vueltas, IA en las tres dificultades con seis gatas, objetos (cajas,
// ruleta por puesto, pluma, ovillo, caja de cartón, pescado, hierba gatera y aspiradora; la IA los usa), y la red
// (carrera-red.js sobre actividades-red.js con una sala falsa en estrella: sala de espera, líder con la IA y los objetos,
// corredores, público, quien llega tarde, quien se va y otra carrera). node mundo/tests/carrera.mjs
// =========================================================
import { pathToFileURL, fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { readFileSync } from 'fs';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '../../');
const imp = p => import(pathToFileURL(resolve(raiz, p)).href);
const M = await imp('mundo/supervivencia/carrera-modelo.js');
const { crearActividades } = await imp('mundo/supervivencia/actividades-red.js');
const { crearCarreraRed, repartirGatas, ID_CARRERA } = await imp('mundo/supervivencia/carrera-red.js');

let fallos = 0;
const falla = msg => { if (fallos < 30) console.error('FALLO: ' + msg); fallos++; };
const DT = 1 / 60;

// ---------- 1. Reglas y JSON ----------
const json = JSON.parse(readFileSync(resolve(raiz, 'mundo/datos/carrera.json'), 'utf8'));
const R = M.reglasCarrera(json);
for (const k of ['vueltas', 'cuenta', 'tope']) if (!(R[k] > 0)) falla(`regla ${k} inválida`);
if (R.gatas.length !== 6) falla(`esperaba 6 gatas, hay ${R.gatas.length}`);
if (new Set(R.gatas.map(g => g.clave)).size !== R.gatas.length) falla('claves de gata repetidas');
{
    const r = M.reglasCarrera({ gata: { vel: 9 }, gatas: [{ clave: 'tigre', vel: 1.2 }, { clave: 'nueva', nombre: 'Nueva' }] });
    if (r.gata.acel !== M.CARRERA.gata.acel || r.gata.vel !== 9) falla('fundir gata');
    const tigre = r.gatas.find(g => g.clave === 'tigre');
    if (!tigre || tigre.vel !== 1.2 || !tigre.pelaje) falla('fundir una gata por clave pierde su pelaje');
    if (!r.gatas.find(g => g.clave === 'nueva')) falla('una gata nueva del JSON no se suma');
    if (M.reglasCarrera({ pista: { puntos: [[0, 0, 0]] } }).pista.puntos.length < 4) falla('pista corta no vuelve a la del código');
}

// ---------- 2. Pista ----------
const P = M.armarPista(R);
if (!(P.largo > 150)) falla(`pista corta: ${P.largo}`);
if (!P.m.some(q => !q.piso)) falla('la pista no tiene el hueco del salto');
if (!P.m.some(q => q.turbo)) falla('la pista no tiene placas de turbo');
if (!P.m.some(q => q.tunel)) falla('la pista no tiene túnel');
if (P.m.some(q => q.y < 0)) falla('la pista baja del piso');
for (let s = 0; s < P.largo; s += 3.3) {
    const p = M.puntoPista(P, s, 1.5), pr = M.proyectarCerca(P, p.x, p.z, s);
    if (Math.abs(pr.lat - 1.5) > 0.05) falla(`proyectar lat en ${s.toFixed(1)}: ${pr.lat.toFixed(2)}`);
    let ds = pr.s - s; ds -= Math.round(ds / P.largo) * P.largo;
    if (Math.abs(ds) > 0.3) falla(`proyectar s en ${s.toFixed(1)}: ${pr.s.toFixed(1)}`);
}
// La pista no se pisa a sí misma (a la misma altura)
{
    let peor = 1e9;
    for (let i = 0; i < P.N; i += 2) for (let j = i + 60; j < P.N; j += 2) {
        if (P.N - (j - i) < 60) continue;
        const a = P.m[i], b = P.m[j];
        if (Math.abs(a.y - b.y) < 3) peor = Math.min(peor, Math.hypot(a.x - b.x, a.z - b.z) - (a.ancho + b.ancho) / 2);
    }
    if (peor < 0) falla(`la pista se pisa a sí misma (${peor.toFixed(1)})`);
}

// ---------- 3. IA: seis gatas, tres dificultades ----------
function carrera(dificultad, semilla = 7) {
    const r = { ...R, dificultad };
    const rnd = M.azar(semilla);
    const gs = r.gatas.map((d, k) => M.nuevaGata(P, r, d, k));
    let t = 0, caidas = 0, derrapes = 0, turbos = 0, choques = 0;
    while (gs.some(g => g.fin === null) && t < r.tope) {
        for (const g of gs) {
            const ev = M.pasoGata(g, M.entradaIA(g, r, P, rnd), DT, r, P, t);
            if (ev.includes('cae')) caidas++;
            if (ev.includes('derrape')) derrapes++;
            if (ev.includes('turbo') || ev.includes('placa')) turbos++;
        }
        choques += M.chocarGatas(gs, r);
        t += DT;
    }
    return { gs, t, caidas, derrapes, turbos, choques };
}
const medidas = {};
for (const d of ['facil', 'normal', 'dificil']) {
    const c = carrera(d);
    medidas[d] = c;
    const sin = c.gs.filter(g => g.fin === null);
    if (sin.length) { falla(`${d}: ${sin.length} gatas no terminan (${sin.map(g => g.clave + ' ' + g.av.toFixed(0)).join(', ')})`); continue; }
    const mejor = Math.min(...c.gs.map(g => g.fin));
    const ideal = R.vueltas * P.largo / R.gata.vel;
    if (mejor > ideal * 2) falla(`${d}: la mejor tarda ${mejor.toFixed(1)} s (ideal ${ideal.toFixed(1)})`);
    if (c.derrapes < 6) falla(`${d}: la IA casi no derrapa (${c.derrapes})`);
    if (c.caidas > 6) falla(`${d}: la IA se cae mucho en el hueco (${c.caidas})`);
    for (const g of c.gs) if (g.tiempos.length !== R.vueltas) falla(`${d}: ${g.clave} con ${g.tiempos.length} tiempos de vuelta`);
}
if (medidas.facil.gs && medidas.dificil.gs) {
    const prom = c => c.gs.reduce((a, g) => a + (g.fin ?? 999), 0) / c.gs.length;
    if (!(prom(medidas.dificil) < prom(medidas.facil))) falla('difícil no es más rápida que fácil');
}
// Reproducible con la misma semilla
{
    const a = carrera('normal', 3), b = carrera('normal', 3);
    if (a.gs.map(g => g.fin).join() !== b.gs.map(g => g.fin).join()) falla('la IA no es reproducible');
}

// ---------- 4. Física ----------
const G0 = R.gatas[0];
const enRecta = () => { const g = M.nuevaGata(P, R, G0, 0); for (let i = 0; i < 100; i++) M.pasoGata(g, { ad: 1 }, DT, R, P); return g; };
// Acelera en la recta hasta su tope
{
    const g = enRecta(), F = M.fisicaDe(R, g);
    if (g.v < F.vel * 0.9) falla(`en la recta no llega al tope: ${g.v.toFixed(1)}`);
}
// Con turbo no pasa de vel × turbo, y al terminar vuelve al tope normal
{
    const g = enRecta(), F = M.fisicaDe(R, g);
    g.turbo = 2;
    let max = 0;
    for (let i = 0; i < 100; i++) { M.pasoGata(g, { ad: 1 }, DT, R, P); max = Math.max(max, g.v); }
    if (max > F.vel * F.turbo + 0.01) falla(`con turbo llega a ${max.toFixed(1)} (tope ${(F.vel * F.turbo).toFixed(1)})`);
    for (let i = 0; i < 150; i++) M.pasoGata(g, { ad: 1 }, DT, R, P);
    if (g.v > F.vel + 0.01) falla(`después del turbo sigue a ${g.v.toFixed(1)}`);
}
// Espacio salta (una vez por pulsación)
{
    const g = enRecta();
    const ev = M.pasoGata(g, { ad: 1, salto: true }, DT, R, P);
    if (!ev.includes('salto') || g.suelo) falla('Espacio no salta');
    let aterriza = false;
    for (let i = 0; i < 60 && !aterriza; i++) aterriza = M.pasoGata(g, { ad: 1, salto: true }, DT, R, P).includes('aterriza');
    if (!aterriza) falla('el salto no aterriza');
    if (g.derrape) falla('sin doblar, el salto no debe derrapar');
    if (M.pasoGata(g, { ad: 1, salto: true }, DT, R, P).includes('salto')) falla('mantener Espacio salta otra vez');
}
// Saltar doblando: derrape, niveles y turbo al soltar
{
    const g = enRecta(), F = M.fisicaDe(R, g);
    M.pasoGata(g, { ad: 1, giro: 1, salto: true }, DT, R, P);
    let empezo = false;
    for (let i = 0; i < 60 && !empezo; i++) empezo = M.pasoGata(g, { ad: 1, giro: 1, salto: true }, DT, R, P).includes('derrape');
    if (!empezo || g.derrape !== 1) falla('caer doblando no derrapa');
    let niveles = 0;
    for (let t = 0; t < F.niveles[2] + 0.2; t += DT) { const ev = M.pasoGata(g, { ad: 1, giro: 1, salto: true }, DT, R, P); if (ev.includes('nivel')) niveles++; if (!g.derrape) break; }
    if (g.derrape && niveles !== 3) falla(`niveles del derrape: ${niveles}`);
    if (g.derrape && g.nivel !== 2) falla(`nivel final ${g.nivel}`);
    const ev = M.pasoGata(g, { ad: 1, giro: 0, salto: false }, DT, R, P);
    if (g.derrape === 1 && !ev.includes('turbo')) falla('soltar el derrape morado no da turbo');
    if (g.derrape === 0 && Math.abs(g.turbo - (F.turbos[2] - DT)) > 0.05 && niveles === 3) falla(`turbo morado dura ${g.turbo.toFixed(2)}`);
}
// Un derrape corto (sin nivel) no da turbo
{
    const g = enRecta();
    M.pasoGata(g, { ad: 1, giro: 1, salto: true }, DT, R, P);
    for (let i = 0; i < 60 && !g.derrape; i++) M.pasoGata(g, { ad: 1, giro: 1, salto: true }, DT, R, P);
    M.pasoGata(g, { ad: 1, giro: 1, salto: true }, DT, R, P);
    M.pasoGata(g, { ad: 1, giro: 0, salto: false }, DT, R, P);
    if (g.turbo > 0) falla('un derrape corto da turbo');
}
// Pared: no se sale y frena
{
    const g = enRecta();
    g.yaw += 1.2;
    let pared = false;
    for (let i = 0; i < 120; i++) { if (M.pasoGata(g, { ad: 1 }, DT, R, P).includes('pared')) pared = true; }
    if (!pared) falla('no choca con la pared');
    if (Math.abs(g.lat) > M.enPista(P, g.s).ancho / 2) falla('se sale de la pista por la pared');
}
// Hueco: lenta, cae y Lona la devuelve antes del hueco; rápida, lo salta
{
    const sH = P.m.find(q => !q.piso).s;
    const lenta = M.nuevaGata(P, R, G0, 0);
    const p = M.puntoPista(P, sH - 0.5, 0);
    Object.assign(lenta, { x: p.x, z: p.z, y: M.enPista(P, sH - 0.5).y, yaw: p.yaw, s: sH - 0.5, av: sH - 0.5, v: 4 });
    let cae = false, vuelve = false;
    for (let i = 0; i < 400 && !vuelve; i++) { const ev = M.pasoGata(lenta, { ad: cae ? 0 : 0.3 }, DT, R, P); if (ev.includes('cae')) cae = true; if (ev.includes('vuelve')) vuelve = true; }
    if (!cae || !vuelve) falla(`lenta en el hueco: cae ${cae}, vuelve ${vuelve}`);
    if (vuelve && !M.enPista(P, lenta.s).piso) falla('Lona la devuelve sobre el hueco');
    if (vuelve && lenta.av > sH) falla('volver de la caída hace avanzar');
    // Rápida desde 30 bloques antes, por el centro
    const rap = M.nuevaGata(P, R, G0, 0), s0 = sH - 30, q = M.puntoPista(P, s0, 0);
    Object.assign(rap, { x: q.x, z: q.z, y: M.enPista(P, s0).y, yaw: q.yaw, s: s0, av: s0, v: M.fisicaDe(R, rap).vel });
    let caeR = false;
    for (let i = 0; i < 240; i++) {
        const pr = M.enPista(P, rap.s + 6);
        const d = Math.atan2(Math.sin(pr.yaw - rap.yaw), Math.cos(pr.yaw - rap.yaw));
        if (M.pasoGata(rap, { ad: 1, giro: Math.max(-1, Math.min(1, d * 2 - rap.lat * 0.2)) }, DT, R, P).includes('cae')) caeR = true;
    }
    if (caeR) falla('a toda velocidad no salta el hueco');
}
// Truco: saltar en el aire después de una cresta da turbo al caer (se prueba con el hueco: vuela)
{
    const sH = P.m.find(q => !q.piso).s;
    const g = M.nuevaGata(P, R, G0, 0), s0 = sH - 20, q = M.puntoPista(P, s0, 0);
    Object.assign(g, { x: q.x, z: q.z, y: M.enPista(P, s0).y, yaw: q.yaw, s: s0, av: s0, v: M.fisicaDe(R, g).vel });
    let truco = false, turbo = false, salto = false;
    for (let i = 0; i < 200; i++) {
        const pr = M.enPista(P, g.s + 6), d = Math.atan2(Math.sin(pr.yaw - g.yaw), Math.cos(pr.yaw - g.yaw));
        const enAire = !g.suelo && g.enAire > 0.15 && !salto;
        if (enAire) salto = true;
        const ev = M.pasoGata(g, { ad: 1, giro: Math.max(-1, Math.min(1, d * 2)), salto: enAire }, DT, R, P);
        if (ev.includes('truco')) truco = true;
        if (truco && ev.includes('turbo')) turbo = true;
    }
    if (!truco || !turbo) falla(`truco en el aire: truco ${truco}, turbo ${turbo}`);
}
// Placa de turbo
{
    const i = P.m.findIndex(q => q.turbo), q = P.m[i], lat = -q.turbo.lado * q.ancho * 0.3;
    const g = M.nuevaGata(P, R, G0, 0), s0 = q.s - 3, p = M.puntoPista(P, s0, lat);
    Object.assign(g, { x: p.x, z: p.z, y: q.y, yaw: p.yaw, s: s0, av: s0, v: 8 });
    let placa = false;
    for (let k = 0; k < 60; k++) if (M.pasoGata(g, { ad: 1 }, DT, R, P).includes('placa')) placa = true;
    if (!placa) falla('pasar por la placa no da turbo');
}
// Hacia atrás no suma vueltas
{
    const g = M.nuevaGata(P, R, G0, 0);
    g.yaw += Math.PI;
    // (siempre mirando hacia atrás: si rebota en una curva y se da vuelta, ya va bien)
    for (let i = 0; i < 600; i++) { M.pasoGata(g, { ad: 1 }, DT, R, P); g.yaw = M.enPista(P, g.s).yaw + Math.PI; }
    if (g.av > 0 || g.fin !== null) falla('hacia atrás suma avance');
}
// Choques entre gatas
{
    const a = M.nuevaGata(P, R, R.gatas[0], 0), b = M.nuevaGata(P, R, R.gatas[1], 1);
    b.x = a.x + 0.3; b.z = a.z; b.y = a.y;
    if (!M.chocarGatas([a, b], R) || Math.hypot(a.x - b.x, a.z - b.z) < R.gata.radio * 2 - 1e-6) falla('las gatas no se separan al chocar');
}
// Puestos
{
    const a = { av: 10, fin: null }, b = { av: 30, fin: null }, c = { av: 300, fin: 40 }, d = { av: 300, fin: 38 };
    const o = M.puestos([a, b, c, d]);
    if (o[0] !== d || o[1] !== c || o[2] !== b || o[3] !== a) falla('puestos en mal orden');
}

// ---------- 5. Editor de pista (estudio/pista-modelo.mjs) ----------
{
    const PM = await imp('estudio/pista-modelo.mjs');
    if (PM.avisosPista(R).some(a => a.tipo === 'error')) falla(`la pista del código tiene errores: ${PM.avisosPista(R).map(a => a.es).join('; ')}`);
    // Insertar un punto corre los índices de huecos, turbos y túneles que van después
    const p1 = PM.insertarPunto(R.pista, 3, [0, 0, 0]);
    if (p1.puntos.length !== R.pista.puntos.length + 1) falla('insertar no agrega');
    R.pista.huecos.forEach((h, i) => { if (p1.huecos[i].punto !== (h.punto >= 3 ? h.punto + 1 : h.punto)) falla('insertar no corre el hueco'); });
    R.pista.tuneles.forEach((h, i) => { if (p1.tuneles[i].desde !== (h.desde >= 3 ? h.desde + 1 : h.desde)) falla('insertar no corre el túnel'); });
    // Quitar el punto del hueco quita el hueco; quitar otro antes lo corre
    const iH = R.pista.huecos[0].punto;
    if (PM.quitarPunto(R.pista, iH).huecos.length !== R.pista.huecos.length - 1) falla('quitar el punto no quita su hueco');
    if (PM.quitarPunto(R.pista, 0).huecos[0].punto !== iH - 1) falla('quitar un punto anterior no corre el hueco');
    if (PM.quitarPunto({ ...R.pista, puntos: R.pista.puntos.slice(0, 4) }, 0).puntos.length !== 4) falla('quitar baja de 4 puntos');
    // Insertar y quitar el mismo punto deja la pista igual
    if (JSON.stringify(PM.quitarPunto(p1, 3)) !== JSON.stringify(R.pista)) falla('insertar y quitar no es neutro');
    // Avisos: un ovillo encima de la pista y una pista que se cruza
    const conOvillo = M.reglasCarrera({ muebles: [...R.muebles, { tipo: 'ovillo', x: P.m[40].x, z: P.m[40].z, a: 4, f: 4, h: 4 }] });
    if (!PM.avisosPista(conOvillo).some(a => a.tipo === 'error' && a.es.includes('ovillo'))) falla('no avisa del ovillo sobre la pista');
    const cruzada = M.reglasCarrera({ pista: { puntos: [[-30, 0, -30], [30, 0, 30], [30, 0, -30], [-30, 0, 30]], huecos: [], turbos: [], tuneles: [] }, muebles: [] });
    if (!PM.avisosPista(cruzada).some(a => a.es.includes('cruza'))) falla('no avisa de la pista que se cruza');
    // Probar con la IA
    const r = PM.probarIA(R);
    if (!r.ok || r.porGata.length !== R.gatas.length) falla('probarIA no termina con la pista del código');

    // Rampa sola: una caja sobre la recta levanta la pista encima (con pendiente ≤ rampa) y no avisa; un ovillo sigue avisando
    const ovalo = { puntos: [[-100, 0, 70], [100, 0, 70], [115, 0, 40], [100, 0, -60], [-100, 0, -60], [-115, 0, 40]], huecos: [], turbos: [], tuneles: [], cajas: [] };
    const enRecta = M.armarPista(M.reglasCarrera({ pista: ovalo, muebles: [] })).m.find(q => q.x > 0);
    const conCaja = M.reglasCarrera({ pista: ovalo, muebles: [{ tipo: 'caja', x: enRecta.x, z: enRecta.z, a: 10, f: 14, h: 5 }] });
    const PC = M.armarPista(conCaja), sobre = PC.m.filter(q => Math.hypot(q.x - enRecta.x, q.z - enRecta.z) < 2);
    if (!sobre.length || sobre.some(q => q.y < 5)) falla('la pista no sube sobre la caja');
    if (PC.m.some(q => Math.abs(q.pend) > conCaja.pista.rampa + 0.05)) falla('la rampa sola es más empinada que `rampa`');
    if (PM.avisosPista(conCaja).some(a => a.es.includes('pisa'))) falla('avisa de una caja con rampa sola');
    if (M.armarPista(M.reglasCarrera({ pista: { ...ovalo, apoyar: 0 }, muebles: conCaja.muebles })).m.some(q => q.y > 0.01)) falla('apoyar = 0 no apaga la rampa');
    if (!PM.probarIA(conCaja).ok) falla('la IA no termina con la rampa sobre la caja');
    // Piezas plantilla: cada una se pone en la recta, la IA termina, se rehace con otra medida y se quita dejando la pista como estaba
    for (const tipo of Object.keys(PM.PIEZAS)) {
        let p = PM.ponerPieza(ovalo, 0, tipo);
        if (PM.PIEZAS[tipo].gen === 'curva') continue; // (se dan vuelta: en esta recta no conectan)
        const z = p.piezas[0];
        if (z.desde !== 1 || z.hasta !== p.puntos.length - ovalo.puntos.length) falla(`${tipo}: rango de la pieza`);
        const Rp = M.reglasCarrera({ pista: { ...p, puntos: tipo === 'bajada' ? p.puntos.map((q, i) => (i <= z.hasta ? q : [q[0], q[1] + 14, q[2]])) : p.puntos }, muebles: [] });
        if (tipo !== 'bajada' && PM.avisosPista(Rp).some(a => a.tipo === 'error')) falla(`${tipo}: ${PM.avisosPista(Rp).map(a => a.es).join('; ')}`);
        if (tipo !== 'bajada' && !PM.probarIA(Rp).ok) falla(`${tipo}: la IA no termina`);
        const med = PM.MEDIDAS[PM.PIEZAS[tipo].gen][0];
        const p2 = PM.rehacerPieza(p, 0, { [med[0]]: med[4] });
        if (p2.piezas[0].hasta !== p2.puntos.length - ovalo.puntos.length || p2.piezas[0][med[0]] !== med[4]) falla(`${tipo}: rehacer no corre el rango`);
        if (p2.huecos.length !== PM.generarPieza(p2.piezas[0]).huecos.length) falla(`${tipo}: rehacer duplica o pierde el hueco`);
        const p3 = PM.quitarPieza(p2, 0);
        if (JSON.stringify(p3.puntos) !== JSON.stringify(ovalo.puntos) || p3.huecos.length || p3.turbos.length || p3.piezas.length) falla(`${tipo}: quitar la pieza no deja la pista como estaba`);
    }
    // La vuelta 360 pasa por encima de sí misma (sin avisar de cruce) y tiene su hueco de altura
    {
        const p = PM.ponerPieza(ovalo, 0, 'vuelta'), Pv = M.armarPista(M.reglasCarrera({ pista: p, muebles: [] }));
        if (Math.max(...Pv.m.map(q => q.y)) < 5) falla('la vuelta 360 no sube');
    }
    // Un punto insertado dentro de una pieza la suelta; uno antes corre su rango
    {
        const p = PM.ponerPieza(ovalo, 0, 'vuelta');
        if (PM.insertarPunto(p, 3, [0, 0, 0]).piezas.length) falla('insertar dentro de una pieza no la suelta');
        if (PM.insertarPunto(p, 0, [0, 0, 0]).piezas[0].desde !== 2) falla('insertar antes no corre la pieza');
        if (PM.quitarPunto(p, 0).piezas[0].desde !== 0) falla('quitar antes no corre la pieza');
        if (PM.piezaDe(p, 4) !== 0 || PM.piezaDe(p, 0) !== -1) falla('piezaDe');
    }
}

// Pegada al borde doblando contra él: se desliza y sigue avanzando (antes quedaba quieta)
{
    const g = M.nuevaGata(P, R, R.gatas[0], 0), s0 = P.puntos[0] + 2, borde = -(M.enPista(P, s0).ancho / 2 - R.gata.radio);
    const q = M.puntoPista(P, s0, borde);
    Object.assign(g, { s: s0, av: s0, lat: borde, x: q.x, y: q.y, z: q.z, yaw: q.yaw, v: R.gata.vel * 0.9 });
    let paredes = 0;
    for (let i = 0; i < 90; i++) paredes += M.pasoGata(g, { ad: 1, giro: -1 }, DT, R, P, 0).filter(e => e === 'pared').length;
    if (!(g.v > R.gata.vel * 0.6)) falla(`empujando el borde se queda pegada (v ${g.v.toFixed(1)})`);
    if (!(g.av - s0 > 20)) falla(`empujando el borde no avanza (${(g.av - s0).toFixed(1)} bloques en 1,5 s)`);
    if (paredes > 1) falla(`rozar el borde cuenta ${paredes} choques`);
}

// ---------- 5b. Objetos: cajas, ruleta por puesto, los seis objetos y la IA que los usa ----------
const conObjetos = {};
{
    const PM = await imp('estudio/pista-modelo.mjs');
    const O = R.objetos;
    if (!O || !O.activos) falla('objetos apagados en el código');
    if (M.reglasCarrera({ objetos: { ovillo: { vel: 50 } } }).objetos.ovillo.golpe !== M.CARRERA.objetos.ovillo.golpe) falla('fundir objetos pierde valores');
    const cajas = M.cajasDe(R, P);
    if (cajas.length !== R.pista.cajas.length * O.cuantas) falla(`cajas: ${cajas.length}`);
    for (const c of cajas) if (!M.enPista(P, c.s).piso) falla('una caja sobre el hueco');
    if (M.cajasDe(M.reglasCarrera({ objetos: { activos: 0 } }), P).length) falla('sin objetos igual hay cajas');
    // Ruleta según el puesto: la primera nunca saca la aspiradora y saca menos plumas que la última
    const rr = M.azar(5), cuenta = (p) => { const c = {}; for (let i = 0; i < 3000; i++) { const k = M.sortearObjeto(R, p, 6, rr); c[k] = (c[k] || 0) + 1; } return c; };
    const c1 = cuenta(0), c6 = cuenta(5);
    if (c1.aspiradora) falla('la primera sacó la aspiradora');
    if (!c6.aspiradora) falla('la última nunca saca la aspiradora');
    if (!((c6.pluma || 0) > (c1.pluma || 0))) falla('la última no saca más plumas que la primera');
    if (Object.keys(c6).length !== M.OBJETOS.length) falla(`a la última le faltan objetos: ${Object.keys(c6)}`);
    // Montaje: tres gatas en una recta (k0 atrás, k1 al medio, k2 adelante), quietas
    const sR = P.puntos[1] + 2;
    const armar = (lats = [0, 0, 0], sep = 6) => {
        const gs = [0, 1, 2].map(k => M.nuevaGata(P, R, R.gatas[k], k));
        gs.forEach((g, k) => { const s = sR + k * sep, q = M.puntoPista(P, s, lats[k]); Object.assign(g, { s, av: s, lat: lats[k], x: q.x, y: q.y, z: q.z, yaw: q.yaw, v: 0 }); });
        return { gs, W: { cajas: [], sueltos: [], t: 0, sig: 1 } };
    };
    const nada = [{}, {}, {}];
    const correr = (gs, W, seg, ents = nada) => { const ev = []; for (let t = 0; t < seg; t += DT) { gs.forEach((g, i) => M.pasoGata(g, ents[i] || {}, DT, R, P, t)); ev.push(...M.pasoObjetos(W, gs, ents, DT, R, P, M.azar(1))); } return ev; };
    const usar = (gs, W, k, tipo, ent = {}) => { gs[k].objeto = tipo; gs[k].ruleta = 0; const e = [{}, {}, {}]; e[k] = { usar: true, ...ent }; return M.pasoObjetos(W, gs, e, DT, R, P, M.azar(1)); };
    // Tomar una caja: ruleta, luego listo; la caja vuelve a los `reaparece` s
    {
        const { gs, W } = armar();
        W.cajas.push({ s: gs[0].s, lat: gs[0].lat, hasta: 0 });
        const ev = M.pasoObjetos(W, gs, nada, DT, R, P, M.azar(2));
        if (!ev.some(e => e.e === 'caja' && e.k === 0) || !gs[0].objeto || !(gs[0].ruleta > 0)) falla('no toma la caja');
        if (!(W.cajas[0].hasta > W.t)) falla('la caja tomada no desaparece');
        const ev2 = correr(gs, W, O.ruleta + 0.1);
        if (!ev2.some(e => e.e === 'listo')) falla('la ruleta no termina');
        if (gs[0].ruleta) falla('la ruleta sigue');
        const ob = gs[0].objeto; correr(gs, W, O.reaparece);
        if (gs[0].objeto !== ob) falla('se tomó otra caja teniendo objeto');
    }
    // Pluma: turbo
    { const { gs, W } = armar(); usar(gs, W, 0, 'pluma'); if (!(gs[0].turbo >= O.pluma.turbo - 1e-9) || gs[0].objeto) falla('la pluma no da turbo'); }
    // Ovillo: corre adelante y le pega a la de adelante (no a quien lo tiró)
    {
        const { gs, W } = armar();
        gs[1].v = 5;
        usar(gs, W, 0, 'ovillo');
        if (W.sueltos.length !== 1) falla('el ovillo no sale');
        const ev = correr(gs, W, 1);
        const g = ev.find(e => e.e === 'golpe');
        if (!g || g.k !== 1 || g.de !== 0) falla(`el ovillo no le pega a la de adelante (${JSON.stringify(g)})`);
        if (gs[0].aturdida > 0) falla('el ovillo le pegó a quien lo tiró');
        if (!(gs[1].aturdida > 0 || gs[1].inmune > 0)) falla('la golpeada no queda aturdida');
        // con freno: hacia atrás
        const b = armar(); usar(b.gs, b.W, 2, 'ovillo', { ad: -1 });
        const evb = correr(b.gs, b.W, 1); if (!evb.some(e => e.e === 'golpe' && e.k === 1)) falla('el ovillo con freno no va atrás');
    }
    // Aturdida: no acelera
    {
        const { gs } = armar(); gs[0].aturdida = 1; gs[0].v = 10;
        for (let i = 0; i < 30; i++) M.pasoGata(gs[0], { ad: 1 }, DT, R, P, 0);
        if (!(gs[0].v < 5)) falla(`aturdida igual acelera (${gs[0].v.toFixed(1)})`);
    }
    // Caja de cartón: se deja atrás y la que viene choca
    {
        const { gs, W } = armar([0, 0, 0], 4);
        usar(gs, W, 2, 'caja');
        if (W.sueltos[0].s > gs[2].s) falla('la caja no queda atrás');
        gs[1].v = 8;
        const ev = correr(gs, W, 1.5, [{}, { ad: 1 }, {}]);
        if (!ev.some(e => e.e === 'golpe' && e.k === 1 && e.o === 'caja')) falla('la caja no golpea a la que viene');
    }
    // Pescado: cae delante de la que va adelante, la atrae de lado y se lo come
    {
        const { gs, W } = armar([0, 3, 0], 6);
        usar(gs, W, 0, 'pescado');
        const pz = W.sueltos[0];
        if (!pz || pz.s < gs[1].s) falla('el pescado no cae delante de la que va adelante');
        pz.lat = -2.5; pz.s = gs[1].s + 18; // (la de adelante viene corriendo; aquí parte quieta)
        const lat0 = gs[1].lat;
        const ev = [];
        for (let t = 0; t < 3; t += DT) {
            const ents = [{}, M.entradaIA(gs[1], R, P, null, null, { gs, W }), {}]; // la del medio maneja sola
            gs.forEach((g, i) => M.pasoGata(g, ents[i], DT, R, P, t)); ev.push(...M.pasoObjetos(W, gs, ents, DT, R, P, M.azar(1)));
        }
        if (!ev.some(e => e.e === 'come' && e.k === 1)) falla(`no se come el pescado (lat ${lat0} → ${gs[1].lat.toFixed(2)})`);
        if (gs[0].come > 0) falla('el pescado atrajo a quien lo tiró');
    }
    // Hierba gatera: controles al revés para las que están cerca
    {
        const { gs, W } = armar([0, 0, 0], 6);
        gs[2].av += O.hierba.alcance + 20; // muy lejos
        usar(gs, W, 0, 'hierba');
        if (!(gs[1].reves > 0)) falla('la hierba no da vuelta los controles');
        if (gs[2].reves > 0) falla('la hierba alcanza a una muy lejana');
        if (gs[0].reves > 0) falla('la hierba le da a quien la usa');
        const a = armar(); a.gs[1].reves = 2; a.gs[1].v = 10; a.gs[2].v = 10;
        const y1 = a.gs[1].yaw, y2 = a.gs[2].yaw;
        for (let i = 0; i < 10; i++) { M.pasoGata(a.gs[1], { giro: 1 }, DT, R, P, 0); M.pasoGata(a.gs[2], { giro: 1 }, DT, R, P, 0); }
        if (Math.sign(a.gs[1].yaw - y1) === Math.sign(a.gs[2].yaw - y2)) falla('con la hierba dobla para el mismo lado');
    }
    // Aspiradora: las de adelante saltan del susto y frenan; las de atrás no
    {
        const { gs, W } = armar();
        gs.forEach(g => { g.v = 15; });
        usar(gs, W, 1, 'aspiradora');
        if (!(gs[2].susto > 0) || gs[2].suelo || !(gs[2].v < 15)) falla('la aspiradora no asusta a la de adelante');
        if (gs[0].susto > 0) falla('la aspiradora asusta a la de atrás');
        const F = M.fisicaDe(R, gs[2]);
        correr(gs, W, 0.5, [{}, {}, { ad: 1 }]);
        if (gs[2].v > F.vel * O.aspiradora.freno + 0.5) falla('asustada corre a toda velocidad');
    }
    // Carreras de la IA con objetos: todas terminan, los usan y es reproducible
    const conObj = (dif, semilla = 7) => {
        const r = { ...R, dificultad: dif }, rnd = M.azar(semilla), W = M.nuevosObjetos(r, P);
        const gs = r.gatas.map((d, k) => M.nuevaGata(P, r, d, k)), cuenta = {};
        let t = 0;
        while (gs.some(g => g.fin === null) && t < r.tope) {
            const ents = gs.map(g => M.entradaIA(g, r, P, rnd, null, { gs, W }));
            gs.forEach((g, i) => M.pasoGata(g, ents[i], DT, r, P, t));
            for (const e of M.pasoObjetos(W, gs, ents, DT, r, P, rnd)) cuenta[e.e === 'usa' ? e.o : e.e] = (cuenta[e.e === 'usa' ? e.o : e.e] || 0) + 1;
            M.chocarGatas(gs, r); t += DT;
        }
        return { gs, cuenta };
    };
    for (const d of ['facil', 'normal', 'dificil']) {
        const c = conObj(d); conObjetos[d] = c;
        if (c.gs.some(g => g.fin === null)) falla(`${d} con objetos: no terminan todas`);
        const usados = M.OBJETOS.reduce((a, k) => a + (c.cuenta[k] || 0), 0);
        if (usados < 12) falla(`${d}: la IA casi no usa objetos (${usados})`);
        if (!c.cuenta.golpe) falla(`${d}: ningún golpe en toda la carrera`);
    }
    if (conObj('normal', 4).gs.map(g => g.fin).join() !== conObj('normal', 4).gs.map(g => g.fin).join()) falla('la carrera con objetos no es reproducible');
    // Editor: insertar y quitar puntos corre o quita las cajas; aviso si quedan sobre el hueco
    const iC = R.pista.cajas[1].punto;
    if (PM.insertarPunto(R.pista, 0, [0, 0, 0]).cajas[1].punto !== iC + 1) falla('insertar no corre las cajas');
    if (PM.quitarPunto(R.pista, iC).cajas.length !== R.pista.cajas.length - 1) falla('quitar el punto no quita sus cajas');
    const iH = R.pista.huecos[0].punto;
    const sobreHueco = M.reglasCarrera({ pista: { cajas: [{ punto: iH, avance: 2 }] } });
    if (!PM.avisosPista(sobreHueco).some(a => a.es.includes('cajas'))) falla('no avisa de cajas sobre el hueco');
    if (!(PM.probarIA(R).objetos > 0)) falla('probarIA no usa objetos');
}

// ---------- 6. Red (sala falsa en estrella) ----------
// Modelo: lo que viaja de una gata y de los objetos
{
    const g = M.nuevaGata(P, R, R.gatas[0], 0);
    for (let i = 0; i < 90; i++) M.pasoGata(g, { ad: 1 }, DT, R, P, i * DT);
    g.aturdida = 0.8;
    const m = M.empacar(g);
    if (JSON.stringify(m).length > 160) falla(`una gata empacada pesa ${JSON.stringify(m).length} B`);
    const h = M.desempacar(M.nuevaGata(P, R, R.gatas[0], 0), m);
    if (Math.abs(h.x - g.x) > 0.01 || Math.abs(h.s - g.s) > 0.01 || Math.abs(h.lat - g.lat) > 0.01 || h.aturdida < 0.7) falla('desempacar no copia la gata');
    // Seguir: se acerca a donde va (sin saltos) y el efecto se acaba solo
    const lejos = { ...m, x: m.x + 2 };
    M.recibirRed(h, lejos);
    const x0 = h.x;
    M.seguirRed(h, DT, P);
    if (!(h.x > x0 && h.x < lejos.x + 1)) falla('seguirRed no se acerca suave');
    for (let i = 0; i < 60; i++) M.seguirRed(h, DT, P);
    if (h.aturdida > 0) falla('el efecto no se acaba en la gata ajena');
    // Un efecto puesto por el líder no lo borra un estado viejo
    h.come = 1; M.recibirRed(h, m); if (h.come < 1) falla('un estado viejo borra el pescado');
    // Efectos que manda el líder
    const k = M.nuevaGata(P, R, R.gatas[1], 1); k.v = 20;
    M.efectoObjeto(k, { k: 1, e: 'golpe', o: 'ovillo' }, R);
    if (!(k.aturdida > 0) || k.v >= 20) falla('efectoObjeto golpe');
    M.efectoObjeto(k, { k: 1, e: 'caja', o: 'pluma' }, R);
    if (k.objeto !== 'pluma' || !(k.ruleta > 0)) falla('efectoObjeto caja');
    M.efectoObjeto(k, { k: 1, e: 'reves', o: 'hierba' }, R); if (!(k.reves > 0)) falla('efectoObjeto hierba');
    k.suelo = true; M.efectoObjeto(k, { k: 1, e: 'susto', o: 'aspiradora' }, R); if (!(k.susto > 0) || k.suelo) falla('efectoObjeto aspiradora');
    // Objetos: ida y vuelta, y el ovillo sigue rodando entre paquetes
    const W = M.nuevosObjetos(R, P);
    W.t = 5; W.cajas[0].hasta = 7;
    W.sueltos.push({ id: 3, tipo: 'ovillo', s: 10, lat: 1, y: 0, v: 30, de: 0, gracia: 0, vida: 4 }, { id: 4, tipo: 'caja', s: 40, lat: -1, y: 0, v: 0, de: 1, gracia: 0, vida: 30 });
    const w = M.empacarObjetos(W), W2 = M.aplicarObjetos(M.nuevosObjetos(R, P), w);
    if (W2.cajas[0].hasta !== 7 || W2.cajas[1].hasta !== 0 || W2.sueltos.length !== 2 || W2.sueltos[0].tipo !== 'ovillo' || W2.sueltos[1].s !== 40) falla('objetos de ida y vuelta');
    M.avanzarObjetos(W2, 0.1, P);
    if (Math.abs(W2.sueltos[0].s - 13) > 0.01 || Math.abs(W2.t - 5.1) > 1e-6) falla('el ovillo no sigue rodando entre paquetes');
    console.log(`  red: gata ${JSON.stringify(m).length} B · objetos ${JSON.stringify(w).length} B`);
}
// Reparto de gatas: la elegida; si se repite, la primera libre; los que miran o siguen en la carrera anterior, no
{
    const claves = R.gatas.map(g => g.clave);
    const { gatas, orden } = repartirGatas(['a', 'b', 'c', 'd', 'e'], { a: { gata: 'gala' }, b: { gata: 'gala' }, c: { gata: 'tigre', mira: 1 }, d: { gata: 'mila', fuera: 1 }, e: {} }, claves);
    const ia = claves.indexOf('gala');
    if (gatas.a !== ia || gatas.b === ia || gatas.b === undefined || 'c' in gatas || 'd' in gatas || gatas.e === undefined) falla(`reparto: ${JSON.stringify(gatas)}`);
    if (orden.length !== claves.length || new Set(orden).size !== claves.length) falla('la parrilla no tiene a todas');
    if (orden[orden.length - 3] !== gatas.a || orden[orden.length - 1] !== gatas.e) falla('los jugadores no parten atrás en orden');
    const ocho = repartirGatas(['1', '2', '3', '4', '5', '6', '7', '8'], {}, claves);
    if (Object.keys(ocho.gatas).length !== claves.length) falla('con más jugadores que gatas, sobran gatas o faltan');
}
function sala(ids) {
    const nodos = new Map(), cola = [];
    let enviados = 0;
    for (const id of ids) {
        const n = { id, recibidos: 0 };
        n.acts = crearActividades({ yo: id, esAnfitrion: id === ids[0], anfitrion: ids[0], enviar: m => { enviados++; cola.push({ de: id, m }); } });
        nodos.set(id, n);
    }
    function entregar() {
        let g = 0;
        while (cola.length && g++ < 100000) {
            const { de, m } = cola.shift();
            for (const [id, n] of nodos) if (id !== de && (!m.para || m.para === id)) { n.recibidos++; n.acts.recibir({ ...m, de }); }
        }
    }
    return { nodos, entregar, get enviados() { return enviados; } };
}
function controlador(S, id) {
    const n = S.nodos.get(id);
    n.log = [];
    n.red = crearCarreraRed({ acts: n.acts, yo: id, al: new Proxy({}, { get: (o, k) => (...a) => n.log.push([k, ...a]) }) });
    return n;
}
const ultimo = (n, k) => [...n.log].reverse().find(x => x[0] === k);
const cuenta = (n, k) => n.log.filter(x => x[0] === k).length;
{
    // A es el anfitrión de la sala y no corre; B abre la carrera (líder), C y D se suman, F mira; E no entra
    const S = sala(['A', 'B', 'C', 'D', 'E', 'F']);
    const [A, B, C, D, E, F] = ['A', 'B', 'C', 'D', 'E', 'F'].map(id => controlador(S, id));
    const claves = R.gatas.map(g => g.clave);
    B.red.entrar('mila'); S.entregar();
    if (B.red.fase !== 'sala' || !B.red.soyLider || !ultimo(B, 'sala')) falla('B no queda en la sala de espera como líder');
    C.red.entrar('mila'); D.red.entrar('gala'); F.red.entrar('mila', true); S.entregar();
    if (C.red.soyLider || ultimo(C, 'sala')[1].jug.length !== 4) falla('la sala de espera no tiene a los cuatro');
    C.red.elegir('tigre'); S.entregar();
    if (S.nodos.get('B').acts.actividad(ID_CARRERA).d.C.gata !== 'tigre') falla('elegir no cambia la gata');
    if (C.red.largar(claves, 'normal')) falla('larga quien no es el líder');
    B.red.pista('techo'); S.entregar();
    const dB = S.nodos.get('C').acts.actividad(ID_CARRERA).d.B;
    if (dB.pista !== 'techo' || dB.gata !== 'mila') falla('la pista del líder no queda en sus datos');
    B.red.largar(claves, 'dificil', 'techo'); S.entregar();
    const [iB, iC, iD, iF] = [B, C, D, F].map(n => ultimo(n, 'inicio'));
    if (!iB || !iC || !iD || !iF) falla('no todos reciben el inicio');
    else {
        if (iB[2] !== claves.indexOf('mila') || iC[2] !== claves.indexOf('tigre') || iD[2] !== claves.indexOf('gala') || iF[2] !== null) falla('las gatas no son las elegidas');
        if (!iB[3] || iC[3]) falla('el líder no es B');
        if (iC[1].semilla !== iB[1].semilla || iC[1].dificultad !== 'dificil' || iC[1].orden.join() !== iB[1].orden.join()) falla('la carrera no es la misma en todos');
        if (iC[1].pista !== 'techo' || iF[1].pista !== 'techo') falla('la pista no viaja en el inicio');
    }
    if (E.log.length || A.log.length) falla('quien no está en la carrera recibe algo de ella');
    const kB = B.red.mia, kC = C.red.mia, kD = D.red.mia;
    // Estados de los corredores: a los de la carrera y a nadie más
    const g = M.nuevaGata(P, R, R.gatas[kC], 0);
    const rE = S.nodos.get('E').recibidos, antes = S.enviados;
    for (let i = 0; i < 5; i++) { g.x += 1; C.red.estado(M.empacar(g)); }
    S.entregar();
    for (const n of [B, D, F]) if (n.log.filter(x => x[0] === 'estado' && x[1] === kC).length !== 5) falla(`${n.id} no recibe los estados de C`);
    if (S.nodos.get('E').recibidos !== rE) falla('el estado llega a quien no está en la carrera');
    if ((S.enviados - antes) / 5 > 4) falla(`un estado cuesta ${(S.enviados - antes) / 5} mensajes`);
    // El líder: IA y objetos; usar, golpes, hurras y llegadas
    B.red.paquete({ 0: M.empacar(g) }, M.empacarObjetos(M.nuevosObjetos(R, P)), 12.5); S.entregar();
    if (!ultimo(C, 'paquete') || !ultimo(F, 'paquete') || ultimo(F, 'paquete')[1].tc !== 12.5) falla('el paquete del líder no llega');
    C.red.paquete({ 0: M.empacar(g) }, null, 1); S.entregar();
    if (cuenta(D, 'paquete') !== 1) falla('se acepta un paquete de quien no es el líder');
    C.red.usar(true, 'ovillo'); S.entregar();
    const u = ultimo(B, 'usar');
    if (!u || u[1] !== kC || u[2] !== true || u[3] !== 'ovillo') falla('el líder no recibe el uso del objeto');
    if (ultimo(D, 'usar')) falla('el uso le llega a quien no es el líder');
    B.red.objetos([{ k: kC, e: 'golpe', o: 'ovillo', de: kB }]); S.entregar();
    if (!ultimo(C, 'objetos') || ultimo(C, 'objetos')[1][0].e !== 'golpe') falla('los golpes no llegan');
    F.red.hurra(kD); S.entregar();
    for (const n of [B, C, D]) if (!ultimo(n, 'hurra') || ultimo(n, 'hurra')[2] !== kD) falla(`${n.id} no ve el hurra`);
    C.red.meta(50.123); S.entregar();
    for (const n of [B, D, F]) { const m = ultimo(n, 'meta'); if (!m || m[1] !== kC || m[2] !== 50.12) falla(`${n.id} no ve la llegada de C`); }
    // Llega tarde: mira la carrera en curso
    E.red.entrar('sombra'); S.entregar();
    if (!ultimo(E, 'inicio') || ultimo(E, 'inicio')[2] !== null) falla('quien llega tarde no mira la carrera');
    // Se va el líder: C toma la IA y la gata de B
    B.red.salir(); S.entregar();
    if (!ultimo(C, 'lider') || ultimo(C, 'lider')[1] !== true) falla('C no queda de líder');
    for (const n of [C, D]) if (!ultimo(n, 'abandono') || ultimo(n, 'abandono')[1] !== kB) falla(`${n.id} no se entera del abandono`);
    // Otra carrera: C vuelve a la sala de espera; D, E y F siguen en la anterior y no corren la nueva
    C.red.aLaSala(); S.entregar();
    if (C.red.fase !== 'sala' || cuenta(C, 'inicio') !== 1) falla('C no vuelve a la sala de espera (o vuelve a la carrera vieja)');
    const i2 = C.red.largar(claves, 'normal'); S.entregar();
    if (!i2 || Object.keys(i2.gatas).join() !== 'C') falla(`la nueva carrera tiene a ${i2 && Object.keys(i2.gatas)}`);
    if (cuenta(D, 'inicio') !== 1) falla('D entra a la nueva carrera sin volver a la sala');
    D.red.aLaSala(); S.entregar();
    if (cuenta(D, 'inicio') !== 2 || ultimo(D, 'inicio')[2] !== null) falla('D, al volver, no mira la carrera en curso');
    for (const n of [C, D, E, F]) n.red.salir();
    S.entregar();
    if (S.nodos.get('A').acts.lista.length) falla('la actividad queda abierta');
}
{
    // Llena: con 8 dentro, el 9.º no entra
    const ids = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];
    const S = sala(ids);
    const ns = ids.map(id => controlador(S, id));
    for (const n of ns.slice(0, 8)) { n.red.entrar('mila'); S.entregar(); }
    ns[8].red.entrar('mila'); S.entregar();
    if (ns[8].red.fase !== 'libre' || !ultimo(ns[8], 'rechazo')) falla('entra un 9.º a la carrera');
}

// ---------- Más pistas (cocina, patio, techo): cada una con su escenario, sala, muebles y pista ----------
{
    const PM = await imp('estudio/pista-modelo.mjs');
    const lista = M.reglasCarrera({}).listaPistas;
    if (lista.join() !== 'living,cocina,patio,techo') falla(`pistas: ${lista.join()}`);
    for (const k of lista) {
        const Rk = M.reglasCarrera(json, k);
        if (Rk.pistaClave !== k || !Rk.nombres[k] || !Rk.cortos[k]) falla(`${k}: sin clave o sin nombre`);
        if (k !== 'living' && (Rk.escenario.tipo !== k || Rk.nombre.es === R.nombre.es)) falla(`${k}: no trae su escenario o su nombre`);
        const av = PM.avisosPista(Rk).filter(a => a.tipo === 'error');
        if (av.length) falla(`${k}: la pista del código tiene errores: ${av.map(a => a.es).join('; ')}`);
        for (const d of ['facil', 'normal', 'dificil']) for (const semilla of [11, 7]) {
            const r = PM.probarIA(Rk, { dificultad: d, semilla });
            if (!r.ok) falla(`${k} ${d} (semilla ${semilla}): la IA no termina`);
            else if (r.caidas > 6) falla(`${k} ${d}: ${r.caidas} caídas`);
            if (!r.derrapes) falla(`${k} ${d}: la IA no derrapa`);
        }
        console.log(`  pista ${k}: ${M.armarPista(Rk).largo.toFixed(1)} bloques · ${Rk.muebles.length} muebles`);
    }
    // Lo general sale de la raíz; las listas, solo de la pista (no se cuelan los huecos del living)
    const r = M.reglasCarrera({ pista: { ancho: 7 }, pistas: { cocina: { pista: { huecos: [] }, sala: { ancho: 200 } } } }, 'cocina');
    if (r.pista.ancho !== 7 || r.pista.huecos.length || r.pista.puntos.length !== M.CARRERA.pistas.cocina.pista.puntos.length) falla('pista de la cocina: mezcla mal la raíz y lo suyo');
    if (r.sala.ancho !== 200 || r.sala.fondo !== M.CARRERA.pistas.cocina.sala.fondo) falla('sala de la cocina: no funde por clave');
    if (M.reglasCarrera({ pistas: { cocina: { muebles: [] } } }, 'cocina').muebles.length) falla('muebles de la cocina: el JSON no los reemplaza');
    if (M.reglasCarrera({}, 'luna').pistaClave !== 'living') falla('una pista que no existe no vuelve al living');
    if (M.reglasCarrera({ pistas: { cocina: { escenario: { tipo: 'patio' } } } }, 'cocina').escenario.cielo !== M.ESCENARIO_BASE.patio.cielo) falla('cambiar el tipo de escenario no trae sus colores');
    // Una pista nueva solo en el JSON
    const n = M.reglasCarrera({ pistas: { nieve: { nombre: { es: 'Nieve', en: 'Snow' }, pista: { puntos: [[0, 0, 0], [30, 0, 0], [30, 0, 30], [0, 0, 30]] } } } }, 'nieve');
    if (n.pistaClave !== 'nieve' || !n.listaPistas.includes('nieve') || n.pista.puntos.length !== 4 || n.muebles.length) falla('una pista nueva del JSON no se arma');
}

for (const [d, c] of Object.entries(medidas)) if (c.gs) {
    const o = M.puestos(c.gs);
    console.log(`  ${d}: ganó ${o[0].clave} en ${o[0].fin?.toFixed(1)} s · último ${o[o.length - 1].fin?.toFixed(1)} s · derrapes ${c.derrapes} · turbos ${c.turbos} · caídas ${c.caidas} · choques ${c.choques}`);
}
for (const [d, c] of Object.entries(conObjetos)) { const o = M.puestos(c.gs); console.log(`  ${d} con objetos: ganó ${o[0].clave} en ${o[0].fin?.toFixed(1)} s · último ${o[o.length - 1].fin?.toFixed(1)} s · ${JSON.stringify(c.cuenta)}`); }
console.log(`  pista ${P.largo.toFixed(1)} bloques × ${R.vueltas} vueltas`);
if (fallos) { console.error(`\n${fallos} fallos`); process.exit(1); }
console.log('OK: carrera de gatas (pista, física, IA, objetos y red)');
