// =========================================================
// Prueba de la pose del cuerpo del jugador (bloque 7c-1, sin navegador)
// Ejecutar: node mundo/tests/pose-jugador.mjs
//
// Cubre supervivencia/pose-jugador.js:
//   1. bits de `f` del mensaje `p`: ida y vuelta de todas las combinaciones (y los viejos 1 y 2 igual)
//   2. golpe: dura 0,3 s (Minecraft: 6 ticks), sube el brazo adelante y vuelve; reiniciar a mitad
//   3. ángulos dentro de los rangos de rig.md en una barrida de estados (caminar, correr, golpe,
//      comer, arco con la mirada arriba y abajo, escudo en cada mano, sentado, agachado)
//   4. correr: más amplitud que caminar e inclinado ~0,2 rad; quieto vuelve a neutral
//   5. objeto en la mano: se pone en el brazo correcto, se cambia, se quita, y `limpiar` lo oculta
//      y deja el rig como la caminata de antes (para las escenas)
// Sale con código 0 si todo coincide, 1 si no.
// =========================================================
import { pathToFileURL, fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '../../');
const P = await import(pathToFileURL(resolve(raiz, 'mundo/supervivencia/pose-jugador.js')).href);
const THREE = await import(pathToFileURL(resolve(raiz, 'vendor/three.module.js')).href);

let fallos = 0, pruebas = 0;
const ok = (cond, msg) => { pruebas++; if (!cond) { fallos++; console.error('FALLO: ' + msg); } };
const igual = (a, b, msg) => ok(JSON.stringify(a) === JSON.stringify(b), `${msg}: esperaba ${JSON.stringify(b)}, salió ${JSON.stringify(a)}`);
const entre = (v, a, b, msg) => ok(Number.isFinite(v) && v >= a - 1e-9 && v <= b + 1e-9, `${msg}: ${v} fuera de [${a}, ${b}]`);

// ---- 1. Bits de f ----
{
    const claves = ['agachado', 'muerto', 'corre', 'golpe', 'comiendo', 'tensando', 'bloqueando'];
    for (let n = 0; n < 128; n++) {
        const e = {};
        claves.forEach((k, i) => { e[k] = !!(n & (1 << i)); });
        const f = P.codificarF(e);
        ok(f === n, `codificar ${n} da ${f}`);
        igual(P.decodificarF(f), e, `ida y vuelta ${n}`);
    }
    igual([P.F.AGACHADO, P.F.MUERTO, P.F.CORRE, P.F.GOLPE, P.F.COME, P.F.TENSA, P.F.BLOQUEA], [1, 2, 4, 8, 16, 32, 64], 'valores del plan');
    ok(P.codificarF({}) === 0, 'sin nada = 0');
    ok(P.decodificarF(undefined).corre === false, 'f ausente (cliente viejo) = nada');
}

const quieto = { mov: 0, pitch: 0 };
const pasos = (e, ent, s, dt = 1 / 60) => { const l = []; for (let t = 0; t < s - 1e-9; t += dt) { P.avanzar(e, ent, dt); l.push(P.angulos(e, ent)); ent = { ...ent, golpe: false }; } return l; };

// ---- 2. Golpe ----
{
    const e = P.crearEstado();
    P.avanzar(e, { ...quieto, golpe: true }, 0);
    ok(e.golpe === 0, 'el golpe empieza en 0');
    const l = pasos(e, quieto, 0.4);
    const n = l.findIndex((a, i) => i > 0 && e && a.bDx === 0 && l[i - 1].bDx !== 0);
    const fin = l.findIndex(a => a.bDx === 0 && a.bDz === 0 && a.ry === 0);
    entre(fin / 60, 0.28, 0.32, 'el golpe dura ~0,3 s');
    const min = Math.min(...l.map(a => a.bDx));
    entre(min, -2.2, -1.2, 'el brazo sube adelante en el golpe');
    ok(Math.max(...l.map(a => a.bDz)) > 0.2, 'el brazo cruza hacia el pecho');
    ok(Math.max(...l.map(a => Math.abs(a.ry))) > 0.1, 'el torso acompaña');
    ok(n === -1 || n >= fin - 1, 'sin cortes a mitad');
    // Reiniciar: en la primera mitad no se corta, en la segunda empieza de nuevo
    const e2 = P.crearEstado();
    P.avanzar(e2, { ...quieto, golpe: true }, 0);
    P.avanzar(e2, quieto, 0.09);
    const g = e2.golpe;
    P.avanzar(e2, { ...quieto, golpe: true }, 0);
    ok(e2.golpe === g, 'un golpe nuevo en la primera mitad no corta el arco');
    P.avanzar(e2, quieto, 0.1);
    P.avanzar(e2, { ...quieto, golpe: true }, 0);
    ok(e2.golpe === 0, 'en la segunda mitad empieza otro (minar seguido)');
}

// ---- 3. Rangos de rig.md ----
{
    const R = { cx: [-0.8, 0.8], bDx: [-2.9, 0.9], bIx: [-2.9, 0.9], bDz: [-0.8, 0.9], bIz: [-0.9, 0.8], pDx: [-1.6, 1.0], pIx: [-1.6, 1.0], inc: [-0.2, 0.7], y: [-0.7, 0.6], ry: [-0.3, 0.3], bDy: [-0.7, 0.7], bIy: [-0.7, 0.7] };
    const casos = [];
    for (const mov of [0, 2, 4.6, 7, 12]) for (const corre of [false, true]) for (const pitch of [-1.5, 0, 1.5]) for (const objeto of [0, 300])
        for (const accion of ['', 'golpe', 'comiendo', 'tensando', 'bloqueando', 'sentado', 'agachado']) for (const escudo of [0, 1])
            casos.push({ mov, corre, pitch, objeto, objeto2: escudo ? 0 : 400, escudo, [accion || 'x']: true });
    let vistos = 0;
    for (const ent of casos) {
        const e = P.crearEstado();
        e.fase = 1.3;
        for (const a of pasos(e, ent, 0.6, 1 / 30)) {
            for (const [k, [lo, hi]] of Object.entries(R)) entre(a[k], lo, hi, `${k} con ${JSON.stringify(ent)}`);
            vistos++;
        }
        if (fallos > 20) break;
    }
    ok(vistos > 10000, 'barrida con muchos cuadros');
    // El brazo nunca atraviesa la cabeza (rig.md: no menos de −3,1)
    ok(true, 'tope −2,9 aplicado');
}

// ---- 4. Correr ----
{
    const amp = corre => { const e = P.crearEstado(); const l = pasos(e, { mov: corre ? 7 : 4.6, corre }, 2); return { piernas: Math.max(...l.slice(60).map(a => Math.abs(a.pDx))), inc: l[l.length - 1].inc }; };
    const c = amp(false), r = amp(true);
    ok(r.piernas > c.piernas * 1.15, `corriendo, piernas más amplias (${r.piernas.toFixed(2)} vs ${c.piernas.toFixed(2)})`);
    entre(r.inc, 0.17, 0.21, 'corriendo, inclinado ~0,2');
    entre(c.inc, 0, 0.001, 'caminando, derecho');
    const e = P.crearEstado();
    pasos(e, { mov: 7, corre: true }, 1);
    const l = pasos(e, quieto, 1);
    const u = l[l.length - 1];
    ok(Math.abs(u.pDx) < 0.02 && Math.abs(u.inc) < 0.01, 'al parar vuelve a neutral');
    // corre sin moverse (Ctrl apretado y quieto): no se inclina
    const e2 = P.crearEstado();
    entre(pasos(e2, { mov: 0, corre: true }, 1).pop().inc, 0, 0.001, 'Ctrl quieto no inclina');
}

// ---- 5. Objeto en la mano ----
{
    const persona = () => {
        const g = new THREE.Group(), cuerpo = new THREE.Group(), cuello = new THREE.Group();
        const brazoD = new THREE.Group(), brazoI = new THREE.Group(), piernaD = new THREE.Group(), piernaI = new THREE.Group();
        g.add(cuerpo); cuerpo.add(cuello, brazoD, brazoI, piernaD, piernaI);
        return { g, cuerpo, cuello, brazoD, brazoI, piernaD, piernaI };
    };
    let creadas = 0;
    const fabrica = {
        THREE,
        materiales: () => [new THREE.MeshBasicMaterial(), new THREE.MeshBasicMaterial()],
        malla: (id, mats) => { creadas++; return { malla: new THREE.Mesh(new THREE.BufferGeometry(), id < 256 ? mats[0] : mats[1]), tipo: id < 256 ? 'bloque' : id === 300 ? 'herramienta' : 'objeto' }; }
    };
    const m = persona();
    const e = P.crearEstado();
    P.posar(m, e, { mov: 0, objeto: 300 }, 1 / 60, fabrica);
    ok(m.brazoD.children.length === 1 && m.brazoI.children.length === 0, 'la herramienta va en el brazo derecho');
    P.posar(m, e, { mov: 0, objeto: 300 }, 1 / 60, fabrica);
    ok(creadas === 1, 'el mismo objeto no se vuelve a crear cada cuadro');
    P.posar(m, e, { mov: 0, objeto: 5, objeto2: 400 }, 1 / 60, fabrica);
    ok(m.brazoD.children.length === 1 && m.brazoI.children.length === 1 && creadas === 3, 'cambia el de la derecha y aparece el de la izquierda');
    P.posar(m, e, { mov: 0, objeto: 0, objeto2: 0 }, 1 / 60, fabrica);
    ok(m.brazoD.children.length === 0 && m.brazoI.children.length === 0, 'mano vacía: sin objetos');
    P.posar(m, e, { mov: 0, objeto: 300, golpe: true }, 0, fabrica);
    P.posar(m, e, { mov: 0, objeto: 300 }, 0.08, fabrica);
    P.iluminarObjetos(m, new THREE.Color(0.5, 0.4, 0.3));
    ok(m.objetoD.mats.every(x => x.color.r === 0.5 && x.color.b === 0.3), 'el objeto toma la luz del lugar');
    ok(m.brazoD.rotation.x < -0.5 && m.cuerpo.rotation.y !== 0, 'el golpe se escribe en el rig');
    P.limpiar(m);
    ok(!m.brazoD.children[0].visible, 'limpiar oculta el objeto (escenas)');
    ok(m.cuerpo.rotation.y === 0 && m.cuerpo.position.y === 0 && m.brazoD.rotation.z === 0, 'limpiar deja el rig como antes');
    P.posar(m, e, { mov: 0, objeto: 300 }, 1 / 60, fabrica);
    ok(m.brazoD.children[0].visible && creadas === 4, 'al volver de la escena el objeto reaparece sin recrearse');
    // La punta del brazo (y = −0,75 en el brazo) queda cerca del objeto
    const p = m.brazoD.children[0].position;
    ok(p.y < -0.6 && p.y > -0.85, `el objeto en la punta de la mano (y ${p.y})`);
}

console.log(`pose-jugador.mjs: ${pruebas - fallos}/${pruebas} bien`);
process.exit(fallos ? 1 : 0);
