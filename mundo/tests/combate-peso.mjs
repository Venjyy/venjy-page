// =========================================================
// Prueba del peso de los golpes y de las reacciones (bloque 8 · N5, mundo/COMBATE.md §15.4 y §18)
// Ejecutar: node mundo/tests/combate-peso.mjs
// Cubre supervivencia/combate/peso.js, el espejo de animacion.js y lo que usa arena/modelo.js, con combate.json,
// arena.json y estilo-sekiro.json:
//   1. Nivel de cada golpe y la reacción que toca: tabla altura × nivel, subir por nivel, tres leves acumuladas.
//   2. Temblor del hitstop (alterna cada `cada` cuadros, en el eje del golpe), sacudida por trauma (tope, suave,
//      baja sola) y cámara lenta (gana la más lenta, dura sus segundos).
//   3. Sonido por capas: impacto por material, cuerpo solo si entra, cola de ecos, el perfecto sube el tono 20 %.
//   4. Las 16 reacciones de §18: existen, duran lo de la tabla (± 2 c), sin saltos ni fuera de límites en cada
//      cuadro (también en espejo), derribo → levantarse con i-frames y polvo en la caída.
//   5. En la arena: un golpe congela a los dos y el que recibe tiembla; tres leves seguidas = la fuerte; contra la
//      pared rebota; el muñeco no ataca, no cae y no corre el reloj; probarReaccion juega cada una.
// =========================================================
import { pathToFileURL, fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { readFileSync } from 'fs';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '../../');
const imp = p => import(pathToFileURL(resolve(raiz, p)).href);
const leer = n => JSON.parse(readFileSync(resolve(raiz, 'mundo/datos', n + '.json'), 'utf8'));
const D = await imp('mundo/supervivencia/combate/datos.js');
const E = await imp('mundo/supervivencia/combate/estados.js');
const A = await imp('mundo/supervivencia/combate/animacion.js');
const W = await imp('mundo/supervivencia/combate/peso.js');
const L = await imp('mundo/datos/limites.js');
const M = await imp('mundo/supervivencia/arena/modelo.js');

let fallos = 0, pruebas = 0;
const ok = (cond, msg) => { pruebas++; if (!cond) { if (fallos < 40) console.error('FALLO: ' + msg); fallos++; } };
const casi = (a, b, e = 1e-9) => Math.abs(a - b) <= e;

const COMB = leer('combate'), SEKIRO = leer('estilo-sekiro'), ARENA = leer('arena');
D.fijarCombate(COMB);
L.fijarLimites(leer('poses').limites);
const C = D.COMBATE;

// ---------- 1. Nivel y reacción ----------
{
    ok(W.nivelDe({ hitstop: 'fuerte' }, 'golpeado') === 'fuerte', 'nivel del ataque');
    ok(W.nivelDe({}, 'golpeado') === 'ligero', 'nivel por defecto');
    ok(W.nivelDe({ hitstop: 'fuerte' }, 'perfecto') === 'perfecto' && W.nivelDe({ hitstop: 'fuerte' }, 'desviado') === 'desvio', 'nivel del desvío');
    ok(W.nivelDe({ remate: true }, 'golpeado') === 'remate', 'nivel del remate');
    ok(W.reaccionPara({ altura: 'medio' }, 'ligero') === 'medio_leve', 'tabla: medio ligero');
    ok(W.reaccionPara({ altura: 'bajo' }, 'fuerte') === 'derribo', 'tabla: bajo fuerte = derribo');
    ok(W.reaccionPara({ reaccion: 'alto_leve' }, 'ligero') === 'alto_leve', 'la del ataque');
    ok(W.reaccionPara({ reaccion: 'alto_leve' }, 'fuerte') === 'alto_fuerte', 'un golpe fuerte sube la del ataque');
    ok(W.reaccionPara({ reaccion: 'medio_leve' }, 'remate') === 'rematado', 'el remate deja rematado');
    // Acumular: tres leves seguidas sin defenderse
    const acc = W.crearAcumulador();
    const k = [];
    for (let i = 0; i < 4; i++) { acc.enReaccion = i > 0; k.push(W.reaccionPara({ reaccion: 'alto_leve' }, 'ligero', acc)); }
    ok(k.join() === 'alto_leve,alto_leve,alto_fuerte,alto_leve', 'tres leves seguidas = alto_fuerte (y vuelve a contar): ' + k);
    acc.leves = 2; acc.enReaccion = false;
    ok(W.reaccionPara({ reaccion: 'alto_leve' }, 'ligero', acc) === 'alto_leve' && acc.leves === 1, 'fuera de una reacción la cuenta empieza de nuevo');
    ok(W.ladoDe({ lado: 'derecha' }) === -1 && W.ladoDe({}) === 1, 'lado del golpe');
    // Toda reacción nombrada por elegir existe
    const nombradas = new Set();
    for (const t of Object.values(C.elegir.tabla)) Object.values(t).forEach(v => nombradas.add(v));
    for (const t of Object.values(C.elegir.subir)) Object.entries(t).forEach(([a, b]) => { nombradas.add(a); nombradas.add(b); });
    Object.values(C.elegir.acumular.a).forEach(v => nombradas.add(v));
    nombradas.add(C.elegir.pared.reaccion);
    for (const n of nombradas) ok(!!C.reacciones[n], 'elegir nombra una reacción que existe: ' + n);
}

// ---------- 2. Temblor, sacudida y cámara lenta ----------
{
    const T = C.impacto.temblor, eje = [0.6, 0.8];
    const a = W.temblor(0, eje), b = W.temblor(T.cada, eje), c = W.temblor(T.cada - 1, eje);
    ok(casi(Math.hypot(...a), T.amplitud, 1e-9), 'temblor de amplitud ' + T.amplitud);
    ok(casi(a[0], -b[0]) && casi(a[1], -b[1]), 'el temblor cambia de lado cada ' + T.cada + ' c');
    ok(casi(a[0], c[0]), 'y se queda igual dentro de esos cuadros');
    ok(casi(a[0] * eje[1] - a[1] * eje[0], 0, 1e-12), 'el temblor va en el eje del golpe');
    const S = C.impacto.sacudida, s = W.crearSacudida();
    W.sumarTrauma(s, 0.7); W.sumarTrauma(s, 0.7);
    ok(s.trauma === 1, 'el trauma topa en 1');
    let maxD = 0, maxSalto = 0, prev = null;
    for (let i = 0; i < 120; i++) {
        W.pasoSacudida(s, 1 / 60);
        const d = Math.hypot(s.x, s.y, s.z);
        maxD = Math.max(maxD, Math.abs(s.x), Math.abs(s.y), Math.abs(s.z));
        if (prev) maxSalto = Math.max(maxSalto, Math.abs(s.x - prev));
        prev = s.x;
        ok(Math.abs(s.rz) <= S.giro * Math.PI / 180 + 1e-9, 'giro de la sacudida bajo su tope');
        void d;
    }
    ok(maxD <= S.desplazamiento + 1e-9, 'desplazamiento bajo su tope: ' + maxD);
    ok(maxSalto < S.desplazamiento * 0.5, 'la sacudida es suave (no salta de un cuadro al otro): ' + maxSalto.toFixed(4));
    ok(casi(s.trauma, Math.max(0, 1 - S.baja * 2), 1e-6), 'el trauma baja ' + S.baja + ' por s');
    const l = W.crearLenta();
    W.pedirLenta(l, { segundos: 0.25, escala: 0.4 });
    W.pedirLenta(l, { segundos: 0.1, escala: 0.7 }); // una menos lenta no la pisa
    ok(W.pasoLenta(l, 0.1) === 0.4, 'gana la cámara lenta más lenta');
    W.pasoLenta(l, 0.1); W.pasoLenta(l, 0.06);
    ok(W.pasoLenta(l, 0.01) === 1, 'la cámara lenta dura sus segundos');
}

// ---------- 3. Sonido por capas ----------
{
    const carne = W.capasSonido('medio', { material: 'carne', resultado: 'golpeado' });
    const metal = W.capasSonido('medio', { material: 'metal', resultado: 'bloqueado' });
    const perf = W.capasSonido('perfecto', { material: 'metal', resultado: 'perfecto' });
    const S = C.sonidos, ecos = 1 + S.cola.ecos;
    ok(carne.length === (S.impacto.carne.length + S.cuerpo.voces.length) * ecos, 'carne: impacto + cuerpo + ecos');
    ok(metal.length === S.impacto.metal.length * ecos, 'metal sin cuerpo (no entró)');
    ok(carne.every(v => v.vol >= 0 && v.vol <= 1 && v.dur > 0), 'volúmenes y duraciones válidos');
    const tono0 = metal.find(v => v.tipo === 'tono'), tonoP = perf.find(v => v.tipo === 'tono');
    ok(casi(tonoP.f0 / tono0.f0, S.perfecto.tono, 1e-9) && tonoP.dur > tono0.dur, 'el perfecto sube el tono y alarga la campana');
    const ecosV = carne.filter(v => v.retardo > 0);
    ok(ecosV.length && ecosV.every(v => v.vol < S.impacto.carne[0].vol), 'la cola son ecos más bajos y tardíos');
    const aire = W.capasSonido('fuerte', { aire: true }), aireL = W.capasSonido('ligero', { aire: true });
    ok(aire.length === S.aire.voces.length && aire[0].frec > aireL[0].frec, 'el aire sube de tono con el nivel');
}

// ---------- 4. Las 16 reacciones ----------
const TABLA = {
    alto_leve: 14, alto_fuerte: 30, medio_leve: 18, medio_empuje: 26, medio_fuerte: 40, bajo_leve: 16, derribo: 38, levantarse: 30,
    pared: 60, aturdido: 120, desequilibrado: 90, desviado: 18, desviado_largo: 30, bloqueado: 8, rematado: null, cojera: null
};
{
    const ANG = A.CANALES.filter(k => !['y', 'salto', 'pz'].includes(k));
    for (const [k, dur] of Object.entries(TABLA)) {
        const def = D.accionDe(SEKIRO, k);
        ok(!!def, 'existe la reacción ' + k);
        if (!def) continue;
        const total = D.largoFases(def.fases);
        // (bloqueado y desviado ya venían de L2 con 13 y 20 c: se aceptan; el resto, la tabla ± 2 c)
        if (dur != null && !['bloqueado', 'desviado'].includes(k)) ok(Math.abs(total - dur) <= 2, `${k} dura ${total} c (tabla ${dur})`);
        ok(!!D.animDe(SEKIRO, def.anim || k), 'tiene animación: ' + k);
        for (const espejo of def.espejo ? [false, true] : [false]) {
            const p = E.crearPeleador(SEKIRO), an = A.crearAnimador(SEKIRO);
            for (let i = 0; i < 20; i++) { E.paso(p, {}); A.animar(an, p, { t: i / 60 }); }
            E.reaccionar(p, k); p.espejo = espejo;
            // (como combate-animacion.mjs: en el activo de una acción con velocidadMax el tope es ese)
            let prev = { ...A.animar(an, p, { t: 0 }) }, salto = 0, fuera = 0, peor = '';
            for (let c = 0; c < total + 8; c++) {
                E.paso(p, {});
                const o = A.animar(an, p, { t: c / 60 });
                const activo = p.def && p.def.fases && D.faseEn(p.def.fases, p.c).fase === 'activo' && p.def.velocidadMax;
                const tope = activo ? Math.min(p.def.velocidadMax, C.motor.velocidadMax) : C.motor.saltoMax;
                for (const ch of ANG) {
                    const d = Math.abs((o[ch] || 0) - (prev[ch] || 0)) - tope + C.motor.saltoMax;
                    if (d > salto) { salto = d; peor = ch + '@' + c + (activo ? ' (activo)' : ''); }
                }
                for (const ch of Object.keys(L.LIMITES)) { const l = L.LIMITES[ch]; if (o[ch] < l[0] - 1e-9 || o[ch] > l[1] + 1e-9) fuera++; }
                prev = { ...o };
            }
            ok(salto <= C.motor.saltoMax + 1e-9, `${k}${espejo ? ' (espejo)' : ''}: sin saltos (${salto.toFixed(3)} en ${peor})`);
            ok(fuera === 0, `${k}${espejo ? ' (espejo)' : ''}: dentro de los límites`);
        }
    }
    const der = D.accionDe(SEKIRO, 'derribo'), lev = D.accionDe(SEKIRO, 'levantarse');
    ok(der.siguiente === 'levantarse', 'derribo → levantarse');
    ok(D.enTramos(lev.iframes, lev.fases, 1) && D.enTramos(lev.iframes, lev.fases, D.largoFases(lev.fases) - 1), 'levantarse con i-frames enteros');
    ok(der.efectos && der.efectos.polvo && der.efectos.polvo.length > 0, 'derribo levanta polvo al caer');
    ok(D.accionDe(SEKIRO, 'aturdido').efectos.sobre === 'estrellas' && D.accionDe(SEKIRO, 'desequilibrado').efectos.sobre === 'marcaRoja', 'estrellas y marca roja');
    ok(D.accionDe(SEKIRO, 'rematado').estado === 'rematado', 'rematado no se interrumpe');
    // Espejo: cambia derecha e izquierda y los giros laterales
    const o = A.espejar({ bDx: 1, bIx: 2, bDz: 0.3, cy: 0.5, armaX: 0.7 });
    ok(o.bDx === 2 && o.bIx === 1 && o.bIz === -0.3 && !('bDz' in o) && o.cy === -0.5 && o.armaX === 0.7, 'espejar: ' + JSON.stringify(o));
}

// ---------- 5. En la arena ----------
{
    const R = M.reglasArena(ARENA);
    for (const k of Object.keys(R.peleadores)) R.peleadores[k].estilo = 'sekiro';
    const estilos = { sekiro: SEKIRO };
    const lista = (P, n, it = () => [{}, {}]) => { const ev = []; for (let i = 0; i < n; i++) { M.pasoPelea(P, it(i)); ev.push(...P.eventos); } return ev; };
    const pelea = (op = {}) => {
        const P = M.nuevaPelea(R, { estilos, semilla: 3, ...op });
        lista(P, 600); M.empezarRondas(P); lista(P, 200);
        P.f[1].x = P.f[0].x + 1.2; P.f[1].z = P.f[0].z;
        return P;
    };
    const tajo = SEKIRO.controles && SEKIRO.controles.atacar;
    // Un golpe: congela a los dos y el que recibe tiembla
    {
        const P = pelea({ muneco: true });
        let golpe = null, tiembla = false, quietos = false;
        for (let i = 0; i < 90 && !golpe; i++) {
            M.pasoPelea(P, [i === 0 ? { atacar: 'apretar' } : {}, {}]);
            golpe = P.eventos.find(e => e.tipo === 'golpe');
        }
        ok(!!golpe, 'el tajo pega al muñeco (control ' + JSON.stringify(tajo) + ')');
        if (golpe) {
            ok(golpe.nivel && golpe.material === 'carne' && Array.isArray(golpe.eje), 'el golpe trae nivel, material y eje');
            ok(P.f[0].p.congelado > 0 && P.f[1].p.congelado > 0, 'el hitstop congela a los dos');
            for (let i = 0; i < 4; i++) { M.pasoPelea(P, [{}, {}]); if (Math.hypot(...P.f[1].temblor) > 0) tiembla = true; if (P.f[0].p.quieto && P.f[1].p.quieto) quietos = true; }
            ok(tiembla && quietos, 'el que recibe tiembla durante el hitstop');
            lista(P, 30);
            ok(P.f[1].temblor[0] === 0 && P.f[1].temblor[1] === 0, 'al terminar el hitstop deja de temblar');
        }
    }
    // Tres leves seguidas sin defenderse: la tercera es la fuerte
    {
        const P = pelea({ muneco: true });
        const reacciones = [];
        for (let i = 0; i < 400 && reacciones.length < 3; i++) {
            M.pasoPelea(P, [i % 6 === 0 ? { atacar: 'apretar' } : {}, {}]);
            for (const e of P.eventos) if (e.tipo === 'golpe' && e.resultado === 'golpeado') reacciones.push(e.reaccion);
            P.f[1].x = P.f[0].x + 1.2; P.f[1].z = P.f[0].z;
        }
        ok(reacciones.length === 3, 'tres golpes seguidos: ' + reacciones);
        if (reacciones.length === 3) ok(reacciones[2] !== reacciones[0] && /fuerte|derribo/.test(reacciones[2]), 'la tercera leve seguida se vuelve la fuerte: ' + reacciones);
    }
    // El muñeco: no ataca, no cae y el reloj no corre
    {
        const P = pelea({ muneco: true });
        const reloj = P.reloj;
        P.f[1].vida = 3;
        const ev = lista(P, 300, i => [i % 5 === 0 ? { atacar: 'apretar' } : {}, {}]);
        ok(P.reloj === reloj, 'con el muñeco el reloj no corre');
        ok(P.f[1].vida >= 1 && !ev.some(e => e.tipo === 'ko'), 'el muñeco no cae');
        ok(!ev.some(e => e.tipo === 'golpe' && e.de === 1), 'el muñeco no ataca');
        lista(P, Math.round((R.muneco.recupera + 0.2) * 60));
        ok(P.f[1].vida === P.f[1].vidaMax, 'el muñeco recupera la vida');
        const todas = M.reaccionesMuneco(P);
        // Las 16 de §18 y las de pareja de L3 (pisado, agarrado): todas las de combate.json
        const n = Object.keys(COMB.reacciones).length;
        ok(n >= 16 && todas.length === n, `el muñeco puede jugar las ${n}: ${todas.length}`);
        for (const k of todas) {
            ok(M.probarReaccion(P, 1, k), 'probarReaccion ' + k);
            ok(P.f[1].p.clave === k, 'juega ' + k);
            lista(P, 1);
        }
    }
    // Contra la pared: rebota
    {
        const P = pelea({ muneco: true });
        const F = P.f[1], e = R.escenario;
        F.x = e.largo / 2 - R.movimiento.radio - 0.01; P.f[0].x = F.x - 1.2;
        E.reaccionar(F.p, 'medio_empuje'); F.empuje = 0.8;
        const ev = lista(P, 3);
        ok(ev.some(x => x.tipo === 'pared') && F.p.clave === 'pared', 'empujado contra la pared, choca de espalda');
        ok(F.empuje < 0, 'y rebota hacia adelante');
        const ev2 = lista(P, 70);
        ok(ev2.some(x => x.tipo === 'polvo'), 'la pared levanta polvo');
    }
}

console.log(`combate-peso.mjs: ${pruebas - fallos}/${pruebas} bien`);
if (fallos) process.exit(1);
