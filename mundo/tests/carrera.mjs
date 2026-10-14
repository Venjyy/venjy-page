// =========================================================
// Prueba de la carrera de gatas (7h-1): modelo (circuito, física, vueltas, IA) y red (carrera-red.js sobre
// actividades-red.js con una sala falsa en estrella: dos corredores, público que mira y alienta, quien llega tarde,
// abandono). node mundo/tests/carrera.mjs
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
const falla = msg => { if (fallos < 25) console.error('FALLO: ' + msg); fallos++; };

// ---------- 1. Reglas y JSON ----------
const json = JSON.parse(readFileSync(resolve(raiz, 'mundo/datos/carrera.json'), 'utf8'));
const R = M.reglasCarrera(json);
for (const k of ['vueltas', 'cuenta', 'tope']) if (!(R[k] > 0)) falla(`regla ${k} inválida`);
if (M.reglasCarrera({ gata: { vel: 9 } }).gata.acel !== M.CARRERA.gata.acel) falla('fundir pierde claves del código');
if (M.reglasCarrera({ gata: { vel: 9 } }).gata.vel !== 9) falla('fundir no aplica el JSON');
if (M.reglasCarrera({ pista: { puntos: [[0, 0]] } }).pista.puntos.length < 3) falla('pista con menos de 3 puntos no vuelve a la del código');

// ---------- 2. Circuito ----------
const P = M.armarPista(R, 100, 200);
if (!(P.largo > 40)) falla(`circuito muy corto: ${P.largo}`);
for (let s = 0; s < P.largo; s += 1.7) {
    const p = M.puntoEn(P, s), pr = M.proyectar(P, p.x, p.z);
    if (pr.d > 1e-6) falla(`punto ${s.toFixed(1)} fuera del eje`);
    if (Math.abs(pr.s - s) > 1e-6 && Math.abs(Math.abs(pr.s - s) - P.largo) > 1e-6) falla(`proyectar(${s.toFixed(1)}) = ${pr.s}`);
}
// Salidas: antes de la línea, separadas y dentro de la pista
const s0 = M.salida(P, R, 0), s1 = M.salida(P, R, 1);
if (Math.hypot(s0.x - s1.x, s0.z - s1.z) < 0.8) falla('las dos gatas parten encima');
for (const s of [s0, s1]) if (M.proyectar(P, s.x, s.z).d > P.ancho / 2) falla('salida fuera de la pista');

// ---------- 3. IA: termina las 3 vueltas sola, en un tiempo razonable, sin salirse mucho ----------
function correr(clave, k, dt = 1 / 60, ent = M.entradaIA) {
    const g = M.nuevaGata(P, R, clave, k);
    if (g.av > 0) falla('la gata parte después de la línea');
    let t = 0, fuera = 0, vueltaMax = 1;
    while (g.fin === null && t < R.tope) {
        M.pasoGata(g, ent(g, R, P, k), dt, R, P, null, t);
        t += dt;
        if (g.fuera) fuera += dt;
        vueltaMax = Math.max(vueltaMax, M.vueltaDe(g, R, P));
    }
    return { g, t, fuera, vueltaMax };
}
const ia = {};
for (const [k, c] of M.GATAS.entries()) {
    const r = correr(c, k);
    ia[c] = r;
    if (r.g.fin === null) { falla(`la IA con ${c} no termina (av ${r.g.av.toFixed(1)} de ${(R.vueltas * P.largo).toFixed(1)})`); continue; }
    const ideal = R.vueltas * P.largo / M.fisicaDe(R, c).vel;
    if (r.t > ideal * 2.2) falla(`la IA con ${c} tarda ${r.t.toFixed(1)} s (ideal ${ideal.toFixed(1)})`);
    if (r.fuera > r.t * 0.15) falla(`la IA con ${c} va ${(r.fuera / r.t * 100).toFixed(0)} % fuera de la pista`);
    if (r.vueltaMax !== R.vueltas) falla(`vuelta máxima ${r.vueltaMax}`);
}
// Determinista: la misma carrera da el mismo tiempo
if (correr('mila', 0).t !== ia.mila.t) falla('la IA no es determinista');
// Con pasos irregulares (como un navegador) también termina
{
    const g = M.nuevaGata(P, R, 'gala', 1);
    let t = 0, i = 0;
    while (g.fin === null && t < R.tope) { const dt = [1 / 30, 1 / 144, 1 / 60, 0.05][i++ % 4]; M.pasoGata(g, M.entradaIA(g, R, P, 1), dt, R, P, null, t); t += dt; }
    if (g.fin === null) falla('con pasos irregulares no termina');
}

// ---------- 4. Vueltas: ir hacia atrás no suma; cruzar la línea al revés resta ----------
{
    const g = M.nuevaGata(P, R, 'mila', 0);
    g.yaw += Math.PI; // mirando al revés
    for (let t = 0; t < 8; t += 1 / 60) M.pasoGata(g, { ad: 1, giro: 0 }, 1 / 60, R, P, null, t);
    if (g.av > 0) falla(`hacia atrás suma avance (${g.av.toFixed(2)})`);
    if (g.fin !== null) falla('hacia atrás termina la carrera');
}
// Atajo imposible: teletransportarse al otro lado no da una vuelta (el avance se mueve como mucho medio circuito)
{
    const g = M.nuevaGata(P, R, 'mila', 0);
    const p = M.puntoEn(P, P.largo * 0.4); g.x = p.x; g.z = p.z;
    M.pasoGata(g, { ad: 0 }, 1 / 60, R, P);
    const p2 = M.puntoEn(P, P.largo * 0.9); g.x = p2.x; g.z = p2.z;
    M.pasoGata(g, { ad: 0 }, 1 / 60, R, P);
    if (g.av > P.largo * 0.5) falla(`atajo cuenta como avance (${g.av.toFixed(1)})`);
}

// ---------- 5. Física: turbo por derrape, fuera de pista lento, choque ----------
{
    const g = M.nuevaGata(P, R, 'gala', 0);
    g.v = M.fisicaDe(R, 'gala').vel;
    for (let t = 0; t < R.gata.carga + 0.1; t += 1 / 60) M.pasoGata(g, { ad: 1, giro: 1, derrape: true }, 1 / 60, R, P);
    if (g.carga < R.gata.carga) falla('el derrape no carga');
    M.pasoGata(g, { ad: 1, giro: 0, derrape: false }, 1 / 60, R, P);
    if (!(g.turbo > 0)) falla('soltar el derrape cargado no da turbo');
    const corto = M.nuevaGata(P, R, 'gala', 0);
    corto.v = 5;
    M.pasoGata(corto, { ad: 1, giro: 1, derrape: true }, 0.2, R, P);
    M.pasoGata(corto, { ad: 1, giro: 0 }, 1 / 60, R, P);
    if (corto.turbo > 0) falla('un derrape corto da turbo');
    // Fuera de la pista: la velocidad baja al tope de fuera
    const f = M.nuevaGata(P, R, 'mila', 0);
    f.x = P.cx; f.z = P.cz - 60; f.s = M.proyectar(P, f.x, f.z).s;
    for (let t = 0; t < 4; t += 1 / 60) M.pasoGata(f, { ad: 1 }, 1 / 60, R, P);
    const F = M.fisicaDe(R, 'mila');
    if (f.v > F.vel * F.fuera + 0.01) falla(`fuera de la pista va a ${f.v.toFixed(2)}`);
    // Choque: no atraviesa y rebota
    const c = M.nuevaGata(P, R, 'mila', 0);
    c.v = 5;
    const x0 = c.x, z0 = c.z;
    M.pasoGata(c, { ad: 1 }, 1 / 60, R, P, () => false);
    if (c.x !== x0 || c.z !== z0 || !(c.v < 0)) falla('el choque no detiene o no rebota');
}

// ---------- 6. Puestos ----------
{
    const a = { av: 10, fin: null }, b = { av: 30, fin: null }, c = { av: 300, fin: 40 }, d = { av: 300, fin: 38 };
    const o = M.puestos([a, b, c, d]);
    if (o[0] !== d || o[1] !== c || o[2] !== b || o[3] !== a) falla('puestos en mal orden');
}
// Empacar / desempacar
{
    const g = ia.gala.g, m = M.empacar(g), h = M.desempacar(M.nuevaGata(P, R, 'gala', 1), m);
    if (Math.abs(h.x - g.x) > 0.01 || Math.abs(h.av - g.av) > 0.01 || h.fin === null) falla('empacar pierde datos');
    if (JSON.stringify(m).length > 90) falla(`mensaje de estado largo: ${JSON.stringify(m).length} B`);
}

// ---------- 7. Red: sala falsa en estrella ----------
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
function controlador(S, id, opciones = {}) {
    const n = S.nodos.get(id);
    n.log = [];
    n.red = crearCarreraRed({
        acts: n.acts, yo: id, ...opciones,
        al: new Proxy({}, { get: (o, k) => (...a) => n.log.push([k, ...a]) })
    });
    return n;
}
const ultimo = (n, k) => [...n.log].reverse().find(x => x[0] === k);
{
    const S = sala(['A', 'B', 'C', 'D']);
    const A = controlador(S, 'A'), B = controlador(S, 'B'), C = controlador(S, 'C'), D = controlador(S, 'D');
    // B espera rival eligiendo a Gala
    if (!B.red.abrir('gala')) falla('abrir falla');
    S.entregar();
    if (B.red.fase !== 'esperando') falla(`B no espera: ${B.red.fase}`);
    if (!A.red.esperando()) falla('A no ve que B espera');
    // A entra: le toca Mila (la otra) y empieza
    A.red.abrir('gala');
    S.entregar();
    const iA = ultimo(A, 'inicio'), iB = ultimo(B, 'inicio');
    if (!iA || !iB) falla('no empieza la carrera');
    else {
        if (iA[2] !== 'mila' || iB[2] !== 'gala') falla(`gatas: A ${iA[2]}, B ${iB[2]}`);
        if (JSON.stringify(iA[1]) !== JSON.stringify(iB[1])) falla('los dos inicios no calzan');
    }
    // C mira (no corre): ve el inicio por la sala
    if (!ultimo(C, 'mirar')) falla('C (público) no ve el inicio');
    // Estados: A manda los suyos y B y C los reciben
    const g = M.nuevaGata(P, R, 'mila', 0);
    for (let i = 0; i < 5; i++) { g.x += 1; A.red.estado(M.empacar(g)); }
    S.entregar();
    const eB = B.log.filter(x => x[0] === 'estado'), eC = C.log.filter(x => x[0] === 'estado');
    if (eB.length !== 5 || eC.length !== 5) falla(`estados: B ${eB.length}, C ${eC.length}`);
    if (eB.length && eB[4][1] !== 'mila') falla('el estado no dice de qué gata es');
    if (A.log.some(x => x[0] === 'estado')) falla('A recibe sus propios estados');
    // Los estados no quedan en el registro (quien llega tarde no los necesita)
    // C alienta a Gala: todos lo ven
    C.red.hurra('gala');
    S.entregar();
    for (const n of [A, B, D]) if (!ultimo(n, 'hurra')) falla(`${n.id} no ve el hurra`);
    // D llega tarde: pide ver y recibe el inicio
    D.log.length = 0;
    D.red.mirar();
    S.entregar();
    if (!ultimo(D, 'mirar')) falla('D (tarde) no recibe la carrera');
    // Meta: B llega primero, A después; los dos y el público reciben las dos llegadas
    B.red.meta(41.5); A.red.meta(43.25);
    S.entregar();
    for (const n of [A, B, C]) {
        const ms = n.log.filter(x => x[0] === 'meta');
        if (ms.length < 1) falla(`${n.id} no ve las llegadas`);
    }
    const mC = C.log.filter(x => x[0] === 'meta').map(x => x[1] + '@' + x[2]).sort().join(',');
    if (mC !== 'gala@41.5,mila@43.25') falla(`llegadas que ve C: ${mC}`);
    // Medida: mensajes por estado = 1 al anfitrión + 1 a cada otro
    const antes = S.enviados;
    B.red.estado(M.empacar(g));
    S.entregar();
    const porEstado = S.enviados - antes;
    if (porEstado > 4) falla(`un estado cuesta ${porEstado} mensajes en una sala de 4`);
    // Salir: la actividad se cierra al salir los dos
    A.red.salir(); B.red.salir(); S.entregar();
    if (A.acts.lista.length) falla('la actividad queda abierta');
    console.log(`  red: un estado = ${porEstado} mensajes (sala de 4), ${JSON.stringify({ op: 'rafaga', id: ID_CARRERA, d: { t: 'e', ...M.empacar(g) } }).length} B`);
}
// Abandono: si el rival se va de la sala, el otro gana solo
{
    const S = sala(['A', 'B']);
    const A = controlador(S, 'A'), B = controlador(S, 'B');
    A.red.abrir('mila'); S.entregar(); B.red.abrir('mila'); S.entregar();
    A.acts.salioJugador('B'); B.red.salir(); S.entregar();
    if (!ultimo(A, 'abandono')) falla('A no se entera del abandono');
}
// Cancelar la espera
{
    const S = sala(['A', 'B']);
    const A = controlador(S, 'A'), B = controlador(S, 'B');
    A.red.abrir('mila'); S.entregar();
    A.red.salir(); S.entregar();
    if (B.red.esperando()) falla('sigue esperando tras cancelar');
    if (A.red.fase !== 'libre') falla('A no queda libre');
}

console.log(`  IA: Mila ${ia.mila.t.toFixed(1)} s, Gala ${ia.gala.t.toFixed(1)} s · circuito ${P.largo.toFixed(1)} bloques × ${R.vueltas} vueltas`);
if (fallos) { console.error(`\n${fallos} fallos`); process.exit(1); }
console.log('OK: carrera de gatas (modelo, IA y red)');
