// =========================================================
// Prueba de la carrera de gatas (7h-1, «Gran Premio del Living»): pista, física (salto, derrape con niveles, turbo,
// placas, truco, huecos y caída, paredes, choques), vueltas, IA en las tres dificultades con seis gatas, y la red
// (carrera-red.js sobre actividades-red.js con una sala falsa en estrella). node mundo/tests/carrera.mjs
// =========================================================
import { pathToFileURL, fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { readFileSync } from 'fs';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '../../');
const imp = p => import(pathToFileURL(resolve(raiz, p)).href);
const M = await imp('mundo/supervivencia/carrera-modelo.js');
const { crearActividades } = await imp('mundo/supervivencia/actividades-red.js');
const { crearCarreraRed, ID_CARRERA } = await imp('mundo/supervivencia/carrera-red.js');

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
    for (let i = 0; i < 600; i++) M.pasoGata(g, { ad: 1 }, DT, R, P);
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
}

// ---------- 6. Red (sala falsa en estrella) ----------
function sala(ids) {
    const nodos = new Map(), cola = [];
    let enviados = 0;
    for (const id of ids) {
        const n = { id };
        n.acts = crearActividades({ yo: id, esAnfitrion: id === ids[0], anfitrion: ids[0], enviar: m => { enviados++; cola.push({ de: id, m }); } });
        nodos.set(id, n);
    }
    function entregar() {
        let g = 0;
        while (cola.length && g++ < 100000) {
            const { de, m } = cola.shift();
            for (const [id, n] of nodos) if (id !== de && (!m.para || m.para === id)) n.acts.recibir({ ...m, de });
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
{
    const S = sala(['A', 'B', 'C', 'D']);
    const A = controlador(S, 'A'), B = controlador(S, 'B'), C = controlador(S, 'C'), D = controlador(S, 'D');
    B.red.abrir('gala'); S.entregar();
    if (B.red.fase !== 'esperando' || !A.red.esperando()) falla('B no queda esperando');
    A.red.abrir('gala'); S.entregar();
    const iA = ultimo(A, 'inicio'), iB = ultimo(B, 'inicio');
    if (!iA || !iB || iA[2] !== 'mila' || iB[2] !== 'gala') falla('no empieza la carrera con una gata cada uno');
    if (!ultimo(C, 'mirar')) falla('el público no ve el inicio');
    const g = M.nuevaGata(P, R, R.gatas[0], 0);
    for (let i = 0; i < 5; i++) { g.x += 1; A.red.estado(M.empacar(g)); }
    S.entregar();
    if (B.log.filter(x => x[0] === 'estado').length !== 5 || C.log.filter(x => x[0] === 'estado').length !== 5) falla('los estados no llegan a todos');
    C.red.hurra('gala'); S.entregar();
    for (const n of [A, B, D]) if (!ultimo(n, 'hurra')) falla(`${n.id} no ve el hurra`);
    D.log.length = 0; D.red.mirar(); S.entregar();
    if (!ultimo(D, 'mirar')) falla('quien llega tarde no recibe la carrera');
    B.red.meta(41.5); A.red.meta(43.25); S.entregar();
    const mC = C.log.filter(x => x[0] === 'meta').map(x => x[1] + '@' + x[2]).sort().join(',');
    if (mC !== 'gala@41.5,mila@43.25') falla(`llegadas que ve el público: ${mC}`);
    const antes = S.enviados; B.red.estado(M.empacar(g)); S.entregar();
    if (S.enviados - antes > 4) falla('un estado cuesta demasiados mensajes');
    A.red.salir(); B.red.salir(); S.entregar();
    if (A.acts.lista.length) falla('la actividad queda abierta');
    console.log(`  red: estado de ${JSON.stringify({ op: 'rafaga', id: ID_CARRERA, d: { t: 'e', ...M.empacar(g) } }).length} B`);
}
{
    const S = sala(['A', 'B']);
    const A = controlador(S, 'A'), B = controlador(S, 'B');
    A.red.abrir('mila'); S.entregar(); B.red.abrir('mila'); S.entregar();
    A.acts.salioJugador('B'); B.red.salir(); S.entregar();
    if (!ultimo(A, 'abandono')) falla('no se entera del abandono');
}

for (const [d, c] of Object.entries(medidas)) if (c.gs) {
    const o = M.puestos(c.gs);
    console.log(`  ${d}: ganó ${o[0].clave} en ${o[0].fin?.toFixed(1)} s · último ${o[o.length - 1].fin?.toFixed(1)} s · derrapes ${c.derrapes} · turbos ${c.turbos} · caídas ${c.caidas} · choques ${c.choques}`);
}
console.log(`  pista ${P.largo.toFixed(1)} bloques × ${R.vueltas} vueltas`);
if (fallos) { console.error(`\n${fallos} fallos`); process.exit(1); }
console.log('OK: carrera de gatas (pista, física, IA y red)');
