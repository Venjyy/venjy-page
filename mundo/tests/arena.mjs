// =========================================================
// Arena del duelo (bloque 8 · L1): node mundo/tests/arena.mjs
// Cubre supervivencia/arena/modelo.js con mundo/datos/arena.json, combate.json y estilo-prueba.json:
//   1. Datos: arena.json se funde sobre ARENA (lo que falta usa el código; un tipo equivocado no entra)
//   2. Entrada: caminan a su marca y se miran
//   3. Rondas y reloj: K.O., tiempo (gana el de más vida en %), empate, mejor de 3 y tope de rondas
//   4. Eje, límites y empuje (miles de cuadros al azar con pasos laterales): nadie sale de la arena, nunca se
//      superponen, siempre se miran y f[0] nunca cambia de lado en la imagen
//   5. Cámara: encuadra siempre a los dos (también con pasos laterales y en pantallas angostas), gira a lo más
//      giroMax °/s, distancia entre distanciaMin y distanciaMax mientras alcance
//   6. Golpe de prueba y rival de práctica: el tajo pega una vez por ataque, el bloqueo deja pasar bloqueoDano,
//      el rival nunca ataca durante tu hitstop
//   7. Salida: cerrar la arena restaura todo (clases, capas, teclado, música, bloqueo del jugador) (arena.js)
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
D.fijarCombate(leer('combate'));
L.fijarLimites(leer('poses').limites);
const JSON_ARENA = leer('arena'), ESTILO = leer('estilo-prueba');
const R = M.reglasArena(JSON_ARENA);
const estilos = { prueba: ESTILO };
const HZ = D.COMBATE.motor.hz, DT = 1 / HZ;
const nueva = (o = {}) => M.nuevaPelea(o.R || R, { estilos, semilla: 7, ...o });
function entrar(P, C = null) {
    let n = 0;
    while (!P.listaEntrada && n < 2000) { M.pasoPelea(P, []); if (C) M.pasoCamara(C, P, DT); n++; }
    M.empezarRondas(P);
    return n;
}
const hasta = (P, fase, max = HZ * 10, it = () => []) => { let n = 0; while (P.fase !== fase && n < max) { M.pasoPelea(P, it(n)); n++; } return n; };
const dist = P => Math.hypot(P.f[0].x - P.f[1].x, P.f[0].z - P.f[1].z);
const angulo = a => Math.atan2(Math.sin(a), Math.cos(a));

// ---------- 1. Datos ----------
{
    const r = M.reglasArena({ rondas: { segundos: 30 }, camara: { fov: 'mucho' } });
    ok(r.rondas.segundos === 30 && r.rondas.mejorDe === M.ARENA.rondas.mejorDe, 'una clave del JSON ajusta y las demás salen del código');
    ok(r.camara.fov === M.ARENA.camara.fov, 'un tipo equivocado no entra');
    ok(M.reglasArena(null).escenario.largo === M.ARENA.escenario.largo, 'sin JSON: los valores del código');
    for (const k of Object.keys(JSON_ARENA)) if (!k.startsWith('$') && k !== 'version' && k !== 'nota') ok(k in M.ARENA, `arena.json → ${k} tiene su valor base en ARENA`);
    for (const k of ['lalo', 'moises']) ok(R.peleadores[k] && R.peleadores[k].nombre.es && R.peleadores[k].titulo.en, `peleador ${k} con nombre y título ES/EN`);
}

// ---------- 2. Entrada ----------
{
    const P = nueva();
    const s0 = dist(P);
    const n = entrar(P);
    ok(s0 > R.marcas.separacion + 0.5, `empiezan más afuera que su marca (${s0.toFixed(2)})`);
    ok(n < HZ * (R.entrada.caminarMarca + 1.5), `llegan caminando a la marca en ~caminarMarca s (${(n / HZ).toFixed(2)} s)`);
    ok(Math.abs(dist(P) - R.marcas.separacion) < 0.1, `quedan a la separación de las marcas (${dist(P).toFixed(2)})`);
    ok(P.f[0].x < P.f[1].x, 'el tuyo a la izquierda (−X), el rival a la derecha');
    for (const F of P.f) {
        const O = P.f[1 - F.i];
        ok(Math.abs(angulo(Math.atan2(O.x - F.x, O.z - F.z) - F.yaw)) < 0.05, `${F.clave} mira al rival`);
    }
    M.pasoPelea(P, []);
    ok(P.eventos.some(e => e.tipo === 'ronda' && e.n === 1), 'empezarRondas avisa «Ronda 1»');
}

// ---------- 3. Rondas y reloj ----------
{
    // Un K.O. por ronda para f[0]: mejor de 3 → gana en 2 rondas
    const P = nueva(); entrar(P);
    let peleen = 0, final = null;
    for (let ronda = 0; ronda < 3 && P.fase !== 'final'; ronda++) {
        hasta(P, 'pelea', HZ * 5, () => []);
        ok(P.fase === 'pelea', `ronda ${P.ronda}: tras el anuncio se pelea`);
        ok(Math.abs(P.reloj - R.rondas.segundos) < 1e-9, 'el reloj parte lleno');
        for (let i = 0; i < 30; i++) M.pasoPelea(P, []);
        ok(Math.abs(P.reloj - (R.rondas.segundos - 30 / HZ)) < 1e-6, 'el reloj baja con los cuadros');
        P.f[1].vida = 0;
        M.pasoPelea(P, []);
        ok(P.fase === 'ko' && P.eventos.some(e => e.tipo === 'ko' && e.ganador === 0), 'vida en 0 = K.O. del otro');
        const n = hasta(P, P.victorias[0] >= 2 ? 'final' : 'anuncio', HZ * 6, () => []);
        if (P.fase === 'final') final = P.ganador;
        ok(Math.abs(n - R.rondas.finRonda * HZ) <= 2, `la ronda siguiente espera finRonda (${(n / HZ).toFixed(2)} s)`);
        peleen++;
    }
    ok(final === 0 && P.victorias[0] === 2 && P.ronda === 2, `mejor de 3: gana en 2 rondas (victorias ${P.victorias})`);
    ok(P.f[1].vida === 0, 'en el final no se recoloca nada');
}
{
    // Tiempo: gana el de más vida en porcentaje (vidas máximas distintas)
    const R2 = M.reglasArena({ ...JSON_ARENA, rondas: { ...JSON_ARENA.rondas, segundos: 10 }, peleadores: { ...JSON_ARENA.peleadores, moises: { ...JSON_ARENA.peleadores.moises, vida: 200 } } });
    const P = nueva({ R: R2 }); entrar(P); hasta(P, 'pelea');
    P.f[0].vida = 60; P.f[1].vida = 110; // 60 % contra 55 %
    hasta(P, 'tiempo', HZ * 12);
    ok(P.fase === 'tiempo' && P.ganadorRonda === 0, 'al acabarse el tiempo gana el de más vida en %');
    hasta(P, 'anuncio', HZ * 6);
    ok(P.f[0].vida === P.f[0].vidaMax && P.f[1].vida === 200, 'la ronda nueva devuelve la vida');
    ok(Math.abs(P.f[0].x - P.f[0].marca) < 1e-9 && Math.abs(P.f[0].z - R2.marcas.z) < 1e-9, 'y los pone en su marca');
}
{
    // Empates: no suma nadie; el tope de rondas termina en empate
    const R3 = M.reglasArena({ ...JSON_ARENA, rondas: { ...JSON_ARENA.rondas, segundos: 10, maxRondas: 2 } });
    const P = nueva({ R: R3 }); entrar(P);
    let tope = 0;
    while (P.fase !== 'final' && tope++ < 5) hasta(P, 'final', HZ * 30, () => []) ;
    ok(P.fase === 'final' && P.ganador === null && P.victorias[0] === 0 && P.rondasJugadas === 2, `empates hasta el tope: empate (${P.rondasJugadas} rondas)`);
}

// ---------- 4 y 5. Eje, límites, empuje y cámara (al azar) ----------
function azar(semilla) { let s = semilla >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let q = s; q = Math.imul(q ^ (q >>> 15), q | 1); q ^= q + Math.imul(q ^ (q >>> 7), q | 61); return ((q ^ (q >>> 14)) >>> 0) / 4294967296; }; }
function intencionAzar(r, estado) {
    const it = { mover: [estado.x, 0] };
    if (r() < 0.04) estado.x = r() < 0.3 ? 0 : r() < 0.5 ? -1 : 1;
    if (r() < 0.05) it.atacar = 'apretar';
    if (r() < 0.06) { it.esquivar = 'apretar'; it.mover = [Math.round(r() * 2 - 1), r() < 0.5 ? -1 : 1]; } // pasos laterales a menudo
    if (r() < 0.02) it.defensa = 'apretar';
    return it;
}
for (const aspecto of [16 / 9, 4 / 3, 2.2]) {
    const sm = M.separacionMax(R, aspecto);
    let peorEncuadre = 0, peorGiro = 0, fuera = 0, cerca = Infinity, cambioLado = 0, noMira = 0, cuadros = 0, distMin = Infinity, distMax = 0, sepMax = 0;
    for (let s = 0; s < 6; s++) {
        const r = azar(100 + s), e0 = { x: 0 }, e1 = { x: 0 };
        const P = nueva({ semilla: s + 1, aspecto }), C = M.crearCamara(R);
        entrar(P, C);
        let phiAnt = null;
        for (let i = 0; i < HZ * 60 && P.fase !== 'final'; i++) {
            const it0 = intencionAzar(r, e0), it1 = intencionAzar(r, e1);
            // Para que la pelea dure: nadie muere en esta parte
            for (const F of P.f) F.vida = Math.max(F.vida, 50);
            M.pasoPelea(P, [it0, it1]);
            const cam = M.pasoCamara(C, P, DT, aspecto);
            if (P.fase !== 'pelea') { phiAnt = null; continue; }
            cuadros++;
            const q = M.encuadre(cam, [...M.puntosCuerpo(P.f[0], R), ...M.puntosCuerpo(P.f[1], R)], aspecto);
            peorEncuadre = Math.max(peorEncuadre, q.peor);
            if (phiAnt != null) peorGiro = Math.max(peorGiro, Math.abs(angulo(C.phi - phiAnt)) / DT * 180 / Math.PI);
            phiAnt = C.phi;
            if (M.ladoEnImagen(cam, P.f[0].x, P.f[0].z) >= M.ladoEnImagen(cam, P.f[1].x, P.f[1].z)) cambioLado++;
            const e = R.escenario, rr = R.movimiento.radio;
            for (const F of P.f) if (Math.abs(F.x) > e.largo / 2 - rr + 1e-9 || Math.abs(F.z) > e.ancho / 2 - rr + 1e-9) fuera++;
            const d = dist(P);
            cerca = Math.min(cerca, d); sepMax = Math.max(sepMax, d);
            if (d >= 1.2) distMin = Math.min(distMin, C.dist);
            distMax = Math.max(distMax, C.dist);
            for (const F of P.f) {
                const O = P.f[1 - F.i];
                if (E.LIBRES.has(F.p.estado) && F.p.c > 20 && Math.abs(angulo(Math.atan2(O.x - F.x, O.z - F.z) - F.yaw)) > 0.6) noMira++;
            }
        }
    }
    const k = `aspecto ${aspecto.toFixed(2)}`;
    ok(cuadros > HZ * 100, `${k}: se jugó (${cuadros} cuadros)`);
    ok(fuera === 0, `${k}: nadie sale de la arena (${fuera})`);
    ok(cerca >= R.movimiento.duro - 0.02, `${k}: nunca se superponen (lo más cerca: ${cerca.toFixed(3)})`);
    ok(sepMax <= sm + 0.05, `${k}: no se alejan más de lo que encuadra la cámara (${sepMax.toFixed(2)} ≤ ${sm.toFixed(2)})`);
    ok(peorEncuadre <= 1, `${k}: la cámara encuadra siempre a los dos (peor ${peorEncuadre.toFixed(3)})`);
    ok(peorGiro <= R.camara.giroMax + 0.5, `${k}: gira a lo más giroMax °/s (${peorGiro.toFixed(1)})`);
    ok(cambioLado === 0, `${k}: el tuyo nunca cambia de lado en la imagen (${cambioLado})`);
    ok(noMira < cuadros * 0.01, `${k}: en guardia siempre se miran (${noMira} cuadros sin mirar)`);
    // (el piso que nunca pierde a nadie puede pasar un poco la máxima mientras el centro alcanza a un peleador que se aleja)
    ok(distMin >= R.camara.distanciaMin - 1e-6 && distMax <= R.camara.distanciaMax + 0.5, `${k}: distancia entre ${distMin.toFixed(2)} y ${distMax.toFixed(2)}`);
}
{
    // El paso lateral desplaza el eje y la cámara orbita para seguir perpendicular
    const P = nueva(), C = M.crearCamara(R);
    entrar(P, C); hasta(P, 'pelea'); M.pasoCamara(C, P, DT);
    const phi0 = C.phi;
    for (let i = 0; i < 8; i++) {
        M.pasoPelea(P, [{ esquivar: 'apretar', mover: [0, 1] }, {}]);
        M.pasoCamara(C, P, DT);
        for (let j = 0; j < 25; j++) { M.pasoPelea(P, [{}, {}]); M.pasoCamara(C, P, DT); }
    }
    for (let j = 0; j < 90; j++) { M.pasoPelea(P, [{}, {}]); M.pasoCamara(C, P, DT); }
    const ux = P.f[1].x - P.f[0].x, uz = P.f[1].z - P.f[0].z, n = Math.hypot(ux, uz);
    const perp = Math.abs((Math.sin(C.phi) * ux + Math.cos(C.phi) * uz) / n);
    ok(Math.abs(angulo(C.phi - phi0)) > 0.3, `los pasos laterales giran el eje y la cámara lo sigue (${(angulo(C.phi - phi0) * 57.3).toFixed(0)}°)`);
    ok(perp < 0.05, `y queda perpendicular al eje (coseno ${perp.toFixed(3)})`);
}

// ---------- 6. Golpe de prueba y rival de práctica ----------
{
    const P = nueva(); entrar(P); hasta(P, 'pelea');
    P.f[1].x = P.f[0].x + 1.4; // dentro del alcance del tajo
    const v0 = P.f[1].vida;
    let golpes = 0;
    M.pasoPelea(P, [{ atacar: 'apretar' }, {}]); golpes += P.eventos.filter(e => e.tipo === 'golpe').length;
    for (let i = 0; i < 40; i++) { M.pasoPelea(P, [{}, {}]); golpes += P.eventos.filter(e => e.tipo === 'golpe').length; }
    ok(golpes === 1 && Math.abs(v0 - P.f[1].vida - ESTILO.ataques.tajo.dano) < 1e-9, `el tajo pega una vez y quita su daño (${golpes} golpes, ${v0 - P.f[1].vida})`);
    // Bloqueando: pasa bloqueoDano del daño
    hasta(P, 'pelea', 10, () => [{}, {}]);
    M.pasoPelea(P, [{}, { defensa: 'apretar' }]);
    for (let i = 0; i < 40; i++) M.pasoPelea(P, [{}, { defensa: 'mantener' }]);
    P.f[1].x = P.f[0].x + 1.4; P.f[1].z = P.f[0].z;
    const v1 = P.f[1].vida;
    let res = null;
    M.pasoPelea(P, [{ atacar: 'apretar' }, { defensa: 'mantener' }]);
    for (let i = 0; i < 40 && !res; i++) { M.pasoPelea(P, [{}, { defensa: 'mantener' }]); const g = P.eventos.find(e => e.tipo === 'golpe'); if (g) res = g.resultado; }
    ok(res === 'bloqueado' && Math.abs(v1 - P.f[1].vida - ESTILO.ataques.tajo.dano * R.golpe.bloqueoDano) < 1e-9, `bloqueado: pasa bloqueoDano (${res}, ${(v1 - P.f[1].vida).toFixed(2)})`);
    // Fuera del alcance no pega
    P.f[1].x = P.f[0].x + 3.5;
    let lejos = 0;
    M.pasoPelea(P, [{ atacar: 'apretar' }, {}]);
    for (let i = 0; i < 40; i++) { M.pasoPelea(P, [{}, {}]); lejos += P.eventos.filter(e => e.tipo === 'golpe').length; }
    ok(lejos === 0, 'fuera del alcance el tajo no pega');
}
{
    // El rival de práctica se acerca, ataca cada tanto y nunca durante tu hitstop; es determinista
    const correr = semilla => {
        const P = nueva({ semilla }); entrar(P); hasta(P, 'pelea');
        let ataques = 0, enHitstop = 0, traza = '';
        for (let i = 0; i < HZ * 20 && P.fase === 'pelea'; i++) {
            P.f[0].vida = P.f[0].vidaMax;
            const it = M.intencionPractica(P, 1);
            if (it.atacar === 'apretar') { ataques++; if (P.f[0].p.congelado > 0) enHitstop++; traza += i + ','; }
            M.pasoPelea(P, [{}, it]);
        }
        return { ataques, enHitstop, traza };
    };
    const a = correr(5), b = correr(5);
    const esperados = 20 / ((R.practica.ataqueCada[0] + R.practica.ataqueCada[1]) / 2);
    ok(a.ataques >= esperados * 0.5 && a.ataques <= esperados * 1.6, `el rival ataca cada ataqueCada s (${a.ataques} en 20 s)`);
    ok(a.enHitstop === 0, 'nunca ataca durante tu hitstop');
    ok(a.traza === b.traza, 'con la misma semilla hace lo mismo');
}

// ---------- 7. Salida (arena.js) ----------
const salida = await imp('mundo/tests/arena-salida.mjs').catch(e => ({ probar: null, error: e }));
if (salida.probar) { const r = await salida.probar({ ok, R, estilos, leer }); if (r) pruebas += 0; }
else ok(false, 'falta mundo/tests/arena-salida.mjs: ' + (salida.error && salida.error.message));

console.log(fallos ? `arena: ${fallos} de ${pruebas} pruebas fallaron` : `arena: ${pruebas} pruebas OK`);
process.exit(fallos ? 1 : 0);
