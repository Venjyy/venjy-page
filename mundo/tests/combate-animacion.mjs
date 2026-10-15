// =========================================================
// Prueba del motor de animación del combate (bloque 8 · N3, mundo/COMBATE.md §15.6 y §1)
// Ejecutar: node mundo/tests/combate-animacion.mjs [--secuencias N]
// Cubre supervivencia/combate/cinematica.js y animacion.js con mundo/datos/combate.json y estilo-prueba.json:
//   1. Cinemática: las matrices de cada hueso y caja son las de crearPersona + aplicarAngulos (Three.js), con poses
//      al azar; suelo automático e IK de la pierna.
//   2. Formato: una animación sin claves de fase da lo mismo que evaluarGesto; las claves de fase siguen a la fase.
//   3. En 2000 secuencias de intenciones al azar (con semilla, con golpes recibidos y hitstop):
//      sin saltos (ningún canal cambia más de saltoMax por cuadro, salvo en los activos con velocidadMax),
//      pies (un pie apoyado se mueve menos de 0,02 por cuadro en el mundo), límites de cada canal y choques
//      (el antebrazo no entra más de 0,04 en el torso ni en la cabeza; el arma no entra en la cabeza propia).
//   4. Choques en todos los cuadros de cada animación del estilo y de las reacciones.
//   5. Hitstop congela la pose; mirada (la cabeza llega primero, con sus topes); suelo al doblar las rodillas.
// =========================================================
import { pathToFileURL, fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { readFileSync } from 'fs';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '../../');
const imp = p => import(pathToFileURL(resolve(raiz, p)).href);
const leer = n => JSON.parse(readFileSync(resolve(raiz, 'mundo/datos', n + '.json'), 'utf8'));
const argN = process.argv.indexOf('--secuencias');
const SECUENCIAS = argN > 0 ? parseInt(process.argv[argN + 1], 10) : 2000;

// Sin DOM: un lienzo que no dibuja (crearPersona pinta texturas)
const ctxVacio = new Proxy({}, { get: (_, k) => k === 'createImageData' ? (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) : () => {}, set: () => true });
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ctxVacio }) };
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.window ??= { addEventListener() {} };
globalThis.fetch = async () => ({ ok: false, status: 404, json: async () => null, text: async () => '' });
const avisar = console.warn; console.warn = () => {};
const THREE = await imp('vendor/three.module.js');
const CU = await imp('mundo/criaturas/cuerpo.js');
const P = await imp('mundo/supervivencia/pose-jugador.js');
console.warn = avisar;
const G = await imp('mundo/datos/gestos.js');
const L = await imp('mundo/datos/limites.js');
const D = await imp('mundo/supervivencia/combate/datos.js');
const E = await imp('mundo/supervivencia/combate/estados.js');
const A = await imp('mundo/supervivencia/combate/animacion.js');
const K = await imp('mundo/supervivencia/combate/cinematica.js');

let fallos = 0, pruebas = 0;
const ok = (cond, msg) => { pruebas++; if (!cond) { if (fallos < 40) console.error('FALLO: ' + msg); fallos++; } };
function azar(semilla) { let s = semilla >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const entre = (r, a, b) => a + (b - a) * r();
const clon = o => JSON.parse(JSON.stringify(o));

const COMB = leer('combate'), ESTILO = leer('estilo-prueba'), POSES = leer('poses');
D.fijarCombate(COMB);
L.fijarLimites(POSES.limites);
const M = D.COMBATE.motor;
const ANGULARES = A.CANALES.filter(k => !['y', 'salto', 'pz'].includes(k));

// ---------- 1. Cinemática contra Three.js ----------
{
    const pintor = c => (x, y, r) => [c[0], c[1], c[2] + Math.floor(r() * 20)];
    const piel = { cabeza: { frente: pintor([200, 160, 130]) }, cuerpo: { frente: pintor([40, 90, 160]) }, brazo: { frente: pintor([40, 90, 160]) }, pierna: { frente: pintor([50, 50, 70]) } };
    const per = CU.crearPersona(CU.crearTinte(), piel, 7);
    const r = azar(11);
    let peor = 0;
    const comparar = (obj, Mi) => {
        const e = obj.matrixWorld.elements; // columna mayor
        const fila = [e[0], e[4], e[8], e[12], e[1], e[5], e[9], e[13], e[2], e[6], e[10], e[14]];
        for (let i = 0; i < 12; i++) peor = Math.max(peor, Math.abs(fila[i] - Mi[i]));
    };
    for (let n = 0; n < 300; n++) {
        const a = {};
        for (const k of Object.keys(L.LIMITES)) a[k] = entre(r, L.LIMITES[k][0] - 0.3, L.LIMITES[k][1] + 0.3); // también fuera de rango: se recortan igual
        a.y = entre(r, -0.3, 0.3); a.pz = entre(r, -0.2, 0.2);
        const rz = { x: entre(r, -5, 5), y: entre(r, 0, 3), z: entre(r, -5, 5), yaw: entre(r, -3, 3) };
        P.aplicarAngulos(per, a);
        per.g.position.set(rz.x, rz.y, rz.z); per.g.rotation.set(0, rz.yaw, 0);
        per.g.updateMatrixWorld(true);
        const m = K.fk(a, rz);
        for (const k of ['cuerpo', 'pecho', 'cuello', 'brazoD', 'brazoI', 'antebrazoD', 'antebrazoI', 'munecaD', 'munecaI', 'piernaD', 'piernaI', 'canillaD', 'canillaI']) comparar(per[k], m[k]);
        const c = K.cajas(m);
        const centro = (obj, caja) => { const v = new THREE.Vector3(); obj.getWorldPosition(v); peor = Math.max(peor, Math.abs(v.x - caja.c[0]), Math.abs(v.y - caja.c[1]), Math.abs(v.z - caja.c[2])); };
        centro(per.torso, c.torso); centro(per.cabeza, c.cabeza);
        for (const h of ['brazoD', 'brazoI', 'piernaD', 'piernaI']) {
            const cajas = CU.cajasDe(per[h]);
            centro(cajas[0], c[h]);
            centro(cajas[2], c[h.replace('brazo', 'antebrazo').replace('pierna', 'canilla')]);
        }
    }
    ok(peor < 1e-9, `fk = matrices de Three.js (peor diferencia ${peor.toExponential(1)})`);
    // Suelo: con las piernas derechas no se ajusta; dobladas, el cuerpo baja y el pie más bajo queda en 0
    ok(Math.abs(K.ajusteSuelo({})) < 1e-12, 'piernas derechas: el suelo no cambia nada');
    const doblado = { pDx: -0.6, rodD: 1.2, pIx: -0.6, rodI: 1.2 };
    const aj = K.ajusteSuelo(doblado);
    ok(aj < -0.05, `rodillas dobladas: el cuerpo baja (${aj.toFixed(3)})`);
    const md = K.fk({ ...doblado, y: aj });
    ok(Math.abs(Math.min(K.alturaPie(md, 'D'), K.alturaPie(md, 'I'))) < 1e-12, 'y el pie más bajo toca el suelo');
    // IK: el tobillo llega al objetivo
    const rr = azar(5);
    let peorIK = 0;
    for (let n = 0; n < 500; n++) {
        const lado = n % 2 ? 'I' : 'D';
        const a = { pDx: entre(rr, -1, 0.8), rodD: entre(rr, 0, 2), pIx: entre(rr, -1, 0.8), rodI: entre(rr, 0, 2), inc: entre(rr, -0.2, 0.3), ry: entre(rr, -0.5, 0.5), y: entre(rr, -0.2, 0) };
        const rz = { x: entre(rr, -3, 3), z: entre(rr, -3, 3), yaw: entre(rr, -3, 3) };
        const objetivo = K.tobillo(K.fk(a, rz), lado);
        const b = { ...a, pDx: entre(rr, -0.5, 0.5), rodD: entre(rr, 0, 1), pIx: entre(rr, -0.5, 0.5), rodI: entre(rr, 0, 1) };
        peorIK = Math.max(peorIK, K.resolverPierna(b, lado, objetivo, rz));
    }
    ok(peorIK < 1e-4, `IK de la pierna: el tobillo llega (peor ${peorIK.toExponential(1)})`);
    // Choques: dos cajas iguales en el mismo lugar entran su medida; separadas, 0
    const caja = (x) => ({ c: [x, 0, 0], ejes: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], h: [0.5, 0.5, 0.5] });
    ok(Math.abs(K.penetracion(caja(0), caja(0.9)) - 0.1) < 1e-9 && K.penetracion(caja(0), caja(1.1)) === 0, 'penetración entre cajas');
}

// ---------- 2. Formato ----------
{
    // Una animación sin claves de fase (un gesto de poses.json como guardia) da lo mismo que evaluarGesto
    D.fijarCombate({ ...COMB, motor: { ...COMB.motor, suelo: false, choques: { ...COMB.motor.choques, tope: -1 }, pies: { ...COMB.motor.pies, anclar: false } } });
    let peor = 0, n = 0;
    for (const [k, def] of Object.entries(POSES.gestos || {})) {
        const est = { controles: {}, guardia: { anim: 'g' }, anim: { g: def } };
        const p = E.crearPeleador(est), an = A.crearAnimador(est);
        for (let i = 0; i < 40; i++) {
            const t = i * 0.13;
            E.paso(p, {});
            const o = A.animar(an, p, { t });
            const ref = G.evaluarGesto(def, 0, t, null, {});
            for (const c of Object.keys(ref)) {
                if (c === 'y' || c === 'salto') continue;
                const l = L.LIMITES[c], v = l ? Math.min(l[1], Math.max(l[0], ref[c])) : ref[c];
                peor = Math.max(peor, Math.abs(o[c] - v)); n++;
            }
        }
        void k;
    }
    ok(n > 100 && peor < 1e-12, `una animación sin claves de fase = evaluarGesto (${n} comparaciones, peor ${peor})`);
    D.fijarCombate(COMB);
    // Claves de fase: valen lo suyo en su cuadro y siguen a la fase si se estira
    const def = { reloj: 'fases', canales: { bDx: { k: [['a', 0, 0], ['a', 0.6, -1.4, 'salida'], ['g', 1, 0.5], ['r', 1, 0]] } } };
    const val = (fases, c) => G.evaluarGesto(def, 0, 0, { fases, c }, {}).bDx;
    const f1 = { anticipacion: 10, activo: 4, recuperacion: 10 }, f2 = { anticipacion: 20, activo: 4, recuperacion: 10 };
    ok(Math.abs(val(f1, 6) + 1.4) < 1e-12 && Math.abs(val(f2, 12) + 1.4) < 1e-12, 'la clave al 60 % de la anticipación sigue a la fase estirada');
    ok(Math.abs(val(f1, 14) - 0.5) < 1e-12 && Math.abs(val(f2, 24) - 0.5) < 1e-12, 'la clave del final del activo sigue al activo');
    ok(Math.abs(val(f1, 3) - (-1.4 * 0.75)) < 1e-9, 'la clave llega con su curva (salida al 50 % = 0,75)');
    ok(val({ anticipacion: 'x' }, 3) !== undefined, 'fases raras no rompen');
}

// ---------- 3. Secuencias al azar ----------
const golpe = { reaccion: 'alto_leve', altura: 'alto' };
const peorSalto = {}, peorPie = { d: 0, donde: '' }, peorChoque = { antebrazo: 0, arma: 0, donde: '' };
let fueraLimites = 0, saltos = 0, deslices = 0, choques = 0, cuadros = 0, apoyados = 0;
function revisarCuadro(o, rz, ctx) {
    const m = K.fk(o, rz), c = K.cajas(m, ESTILO.arma);
    for (const k of Object.keys(L.LIMITES)) { const l = L.LIMITES[k]; if (o[k] < l[0] - 1e-9 || o[k] > l[1] + 1e-9) fueraLimites++; }
    for (const ab of ['antebrazoD', 'antebrazoI']) for (const q of ['torso', 'cabeza']) {
        const pe = K.penetracion(c[ab], c[q]);
        if (pe > peorChoque.antebrazo) { peorChoque.antebrazo = pe; peorChoque.dondeA = `${ab}/${q} ${ctx}`; }
        if (pe > 0.04) choques++;
    }
    const pa = K.penetracion(c.arma, c.cabeza);
    if (pa > peorChoque.arma) { peorChoque.arma = pa; peorChoque.donde = ctx; }
    if (pa > 0.01) choques++;
    return m;
}
for (let s = 0; s < SECUENCIAS; s++) {
    const r = azar(1000 + s);
    const tactil = r() < 0.3;
    const p = E.crearPeleador(ESTILO, { tactil }), an = A.crearAnimador(ESTILO);
    const rz = { x: 0, z: 0, yaw: entre(r, -3, 3) };
    let mover = [0, 0], defensa = false, mirada = entre(r, -1, 1), previa = null, pies = null;
    for (let i = 0; i < 150; i++) {
        const it = { mover };
        if (r() < 0.06) mover = r() < 0.4 ? [0, 0] : [Math.round(entre(r, -1, 1)), 0];
        if (r() < 0.06) it.atacar = 'apretar';
        if (!defensa && r() < 0.03) { defensa = true; it.defensa = 'apretar'; } else if (defensa) { if (r() < 0.08) defensa = false; else it.defensa = 'mantener'; }
        if (r() < 0.025) { it.esquivar = 'apretar'; it.mover = [Math.round(entre(r, -1, 1)), Math.round(entre(r, -1, 1))]; }
        E.paso(p, it);
        if (r() < 0.02) E.recibir(p, golpe);
        if (r() < 0.01) E.congelar(p, 4 + Math.floor(r() * 6));
        // El atacante desviado o bloqueado: solo con su golpe en el aire (como en el juego)
        if (r() < 0.15 && p.estado === 'ataque' && D.faseEn(p.def.fases, p.c).fase === 'activo') E.reaccionar(p, r() < 0.5 ? 'desviado' : 'bloqueado');
        // La raíz avanza con el peleador (adelante = hacia donde mira)
        const sy = Math.sin(rz.yaw), cy = Math.cos(rz.yaw);
        rz.x += p.mov[0] * sy - p.mov[1] * cy; rz.z += p.mov[0] * cy + p.mov[1] * sy;
        mirada += entre(r, -0.05, 0.05);
        const o = A.animar(an, p, { t: i / 60, raiz: rz, mirada });
        cuadros++;
        const ctx = `sec ${s} cuadro ${i} ${p.estado}${p.clave ? ' ' + p.clave + ' c' + p.c : ''}`;
        const m = revisarCuadro(o, rz, ctx);
        if (previa) {
            const activo = p.def && p.def.fases && D.faseEn(p.def.fases, p.c).fase === 'activo' && p.def.velocidadMax;
            const tope = activo ? Math.min(p.def.velocidadMax, M.velocidadMax) : M.saltoMax;
            for (const k of ANGULARES) {
                const d = Math.abs(o[k] - previa[k]);
                if (!peorSalto[k] || d > peorSalto[k].d) peorSalto[k] = { d, ctx };
                if (d > tope + 1e-9) saltos++;
            }
            // Pies: apoyado en los dos cuadros = no se mueve en el mundo
            for (const lado of ['D', 'I']) {
                const h = K.alturaPie(m, lado), t = K.tobillo(m, lado);
                if (h <= 0.01 && pies[lado].h <= 0.01) {
                    apoyados++;
                    const d = Math.hypot(t[0] - pies[lado].t[0], t[2] - pies[lado].t[2]);
                    if (d > peorPie.d) { peorPie.d = d; peorPie.donde = `${lado} ${ctx}`; }
                    if (d > 0.02) deslices++;
                }
            }
        }
        previa = { ...o };
        pies = { D: { h: K.alturaPie(m, 'D'), t: K.tobillo(m, 'D') }, I: { h: K.alturaPie(m, 'I'), t: K.tobillo(m, 'I') } };
    }
}
const peores = Object.entries(peorSalto).sort((a, b) => b[1].d - a[1].d).slice(0, 4).map(([k, v]) => `${k} ${v.d.toFixed(3)} (${v.ctx})`).join(' · ');
ok(saltos === 0, `sin saltos: ${saltos} cambios pasan el tope en ${cuadros} cuadros. Peores: ${peores}`);
ok(fueraLimites === 0, `límites: ${fueraLimites} canales fuera de rango`);
ok(deslices === 0, `pies: ${deslices} de ${apoyados} cuadros con un pie apoyado que se movió más de 0,02 (peor ${peorPie.d.toFixed(4)}, ${peorPie.donde})`);
ok(apoyados > cuadros * 0.5, `hubo pies apoyados (${apoyados} de ${cuadros * 2})`);
ok(choques === 0, `choques: ${choques} (peor antebrazo ${peorChoque.antebrazo.toFixed(3)} ${peorChoque.dondeA || ''}; peor arma en la cabeza ${peorChoque.arma.toFixed(3)} ${peorChoque.donde})`);

// ---------- 4. Choques en cada animación ----------
{
    let peorA = 0, peorArma = 0, donde = '';
    const acciones = [...Object.keys(ESTILO.ataques), ...Object.keys(ESTILO.acciones), ...Object.keys(COMB.reacciones)];
    for (const clave of acciones) {
        const p = E.crearPeleador(ESTILO), an = A.crearAnimador(ESTILO);
        for (let i = 0; i < 20; i++) { E.paso(p, {}); A.animar(an, p, { t: i / 60 }); }
        E.iniciar(p, clave);
        let i = 0;
        while (p.clave === clave && i < 400) {
            const o = A.animar(an, p, { t: i / 60 });
            const c = K.cajas(K.fk(o), ESTILO.arma);
            for (const ab of ['antebrazoD', 'antebrazoI']) for (const q of ['torso', 'cabeza']) { const pe = K.penetracion(c[ab], c[q]); if (pe > peorA) { peorA = pe; donde = `${clave} c${p.c} ${ab}/${q}`; } }
            peorArma = Math.max(peorArma, K.penetracion(c.arma, c.cabeza));
            E.paso(p, {}); i++;
        }
    }
    for (const est of ['guardia', 'paso', 'bloqueo']) {
        const p = E.crearPeleador(ESTILO), an = A.crearAnimador(ESTILO);
        for (let i = 0; i < 120; i++) {
            E.paso(p, est === 'paso' ? { mover: [1, 0] } : est === 'bloqueo' ? { defensa: i ? 'mantener' : 'apretar' } : {});
            const o = A.animar(an, p, { t: i / 60 });
            const c = K.cajas(K.fk(o), ESTILO.arma);
            for (const ab of ['antebrazoD', 'antebrazoI']) for (const q of ['torso', 'cabeza']) { const pe = K.penetracion(c[ab], c[q]); if (pe > peorA) { peorA = pe; donde = `${est} ${ab}/${q}`; } }
            peorArma = Math.max(peorArma, K.penetracion(c.arma, c.cabeza));
        }
    }
    ok(peorA <= 0.04, `el antebrazo no entra más de 0,04 en el torso ni en la cabeza (peor ${peorA.toFixed(3)}, ${donde})`);
    ok(peorArma <= 0.01, `el arma no entra en la cabeza propia (peor ${peorArma.toFixed(3)})`);
}

// ---------- 5. Hitstop, mirada, suelo y estado inicial ----------
{
    const p = E.crearPeleador(ESTILO), an = A.crearAnimador(ESTILO);
    for (let i = 0; i < 30; i++) { E.paso(p, {}); A.animar(an, p, { t: i / 60 }); }
    E.paso(p, { atacar: 'apretar' });
    for (let i = 0; i < 10; i++) { E.paso(p, {}); A.animar(an, p, { t: i / 60 }); }
    const antes = { ...A.animar(an, p, { t: 1 }) };
    E.congelar(p, 6);
    let igual = true;
    for (let i = 0; i < 6; i++) { E.paso(p, {}); const o = A.animar(an, p, { t: 2 + i }); for (const k of A.CANALES) if (o[k] !== antes[k]) igual = false; }
    ok(igual, 'durante el hitstop la pose queda congelada');
    E.paso(p, {});
    ok(A.animar(an, p, { t: 3 }).bDx !== antes.bDx, 'y después sigue');
}
{
    const p = E.crearPeleador(ESTILO), an = A.crearAnimador(ESTILO);
    const base = { ...A.animar(an, p, { t: 0, mirada: 0 }) };
    let cabezaPrimero = false;
    for (let i = 0; i < 120; i++) {
        E.paso(p, {});
        const o = A.animar(an, p, { t: 0, mirada: 1.2 });
        if (i === 4) cabezaPrimero = an.mirada.cabeza > an.mirada.pecho * 2;
        void o;
    }
    const o = A.animar(an, p, { t: 0, mirada: 1.2 });
    ok(cabezaPrimero, 'la cabeza mira primero');
    ok(Math.abs(an.mirada.pecho - M.mirada.pecho.tope) < 0.01 && Math.abs(an.mirada.cabeza - M.mirada.cabeza.tope) < 0.02, `topes de la mirada (pecho ${an.mirada.pecho.toFixed(3)}, cabeza ${an.mirada.cabeza.toFixed(3)})`);
    ok(o.pY > base.pY + 0.25 && o.cy > base.cy + 0.4, 'el cuello y el pecho giran hacia el objetivo');
}
{
    const p = E.crearPeleador(ESTILO), an = A.crearAnimador(ESTILO);
    E.paso(p, {});
    const o = A.animar(an, p, { t: 0 });
    const mg = K.fk(o);
    ok(o.y < -0.02 && Math.abs(Math.min(K.alturaPie(mg, 'D'), K.alturaPie(mg, 'I'))) < 1e-9, `en guardia (rodillas flexionadas) el cuerpo baja solo y el pie toca el suelo (y ${o.y.toFixed(3)})`);
    const b = A.interpolar({ bDx: 0 }, { bDx: 1 }, 0.25, {});
    ok(Math.abs(b.bDx - 0.25) < 1e-12, 'interpolar');
}

console.log(`combate-animacion.mjs: ${pruebas - fallos}/${pruebas} bien (${SECUENCIAS} secuencias, ${cuadros} cuadros)`);
process.exit(fallos ? 1 : 0);
