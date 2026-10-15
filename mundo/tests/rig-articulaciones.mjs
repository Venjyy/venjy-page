// =========================================================
// Prueba del rig con codos, rodillas y pecho (bloque 8 · N1, mundo/COMBATE.md §15.5)
// Ejecutar: node mundo/tests/rig-articulaciones.mjs
//           node mundo/tests/rig-articulaciones.mjs --generar   (rehace la referencia: solo desde el rig de antes)
//
// Cubre criaturas/cuerpo.js (crearPersona) y supervivencia/pose-jugador.js:
//   1. Paridad: con los canales nuevos en 0, la matriz de mundo de cada caja visible es la misma que en `main`
//      antes de N1 (diferencia < 1e-9), guardada en mundo/tests/rig-referencia.json. Creadores: crearPersona con
//      accesorios en cada hueso (como los de amigos, NPCs y Venjys), el modelo del jugador con skins de amigos
//      (crearModelo + extras de pieles.js) y los enemigos persona (modeloPersona). 200 poses (poses.json, sus
//      gestos en distintos instantes y poses al azar con semilla) en 4 casos: de pie, sentado, jugador (posar,
//      con objetos en la mano) y jugador sentado. Las mitades de brazo y pierna se comparan con la caja entera
//      de antes (userData.rigEquivale: lo que se corre la mitad respecto del centro de la caja original).
//   2. UV: cada vértice de cada mitad usa la coordenada de textura que tenía ese punto en la caja entera
//      (mismo material, mismo lienzo: no cambia ni un píxel).
//   3. Límites: ningún hueso queda fuera de su rango después de aplicarAngulos (codo al revés, rodilla adelante).
//   4. Rótula invisible en 0 y visible doblada; doblar el codo mueve el antebrazo y el objeto de la mano.
// Sale con código 0 si todo coincide, 1 si no.
// =========================================================
import { pathToFileURL, fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { readFileSync, writeFileSync } from 'fs';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '../../');
const imp = p => import(pathToFileURL(resolve(raiz, p)).href);
const GENERAR = process.argv.includes('--generar');
const RUTA_REF = resolve(raiz, 'mundo/tests/rig-referencia.json');

// Sin DOM: un lienzo que no dibuja; sin red ni almacenamiento
const ctxVacio = new Proxy({}, { get: (_, k) => k === 'createImageData' ? (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) : () => {}, set: () => true });
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ctxVacio }) };
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.window ??= { addEventListener() {} };
globalThis.fetch = async () => ({ ok: false, status: 404, json: async () => null, text: async () => '' });
const avisar = console.warn; console.warn = () => {};
const logOriginal = console.log; console.log = () => {};

const THREE = await imp('vendor/three.module.js');
const C = await imp('mundo/criaturas/cuerpo.js');
const P = await imp('mundo/supervivencia/pose-jugador.js');
const G = await imp('mundo/datos/gestos.js');
const S = await imp('mundo/supervivencia/skin.js');
const E = await imp('mundo/supervivencia/enemigos.js');
console.warn = avisar; console.log = logOriginal;
const POSES_JSON = JSON.parse(readFileSync(resolve(raiz, 'mundo/datos/poses.json'), 'utf8'));

let fallos = 0, pruebas = 0;
const ok = (cond, msg) => { pruebas++; if (!cond) { if (fallos < 30) console.error('FALLO: ' + msg); fallos++; } };

// ---------- Azar con semilla ----------
function azar(semilla) { let s = semilla >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const entre = (r, a, b) => a + (b - a) * r();

// ---------- Creadores de personas ----------
const pintor = c => (x, y, r) => [c[0] + x * 3, c[1] + y * 2, c[2] + Math.floor(r() * 20)];
const PIEL = {
    cabeza: { frente: pintor([200, 160, 130]), atras: pintor([60, 40, 30]), lado: pintor([190, 150, 120]), arriba: pintor([50, 40, 30]) },
    cuerpo: { frente: pintor([40, 90, 160]), atras: pintor([30, 80, 150]) },
    brazo: { frente: pintor([40, 90, 160]), lado: pintor([35, 85, 155]), abajo: pintor([200, 160, 130]) },
    pierna: { frente: pintor([50, 50, 70]), lado: pintor([45, 45, 65]), abajo: pintor([20, 20, 20]) }
};
const cajita = (w, h, d) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial());
// Accesorios en cada hueso, como los ponen amigos.js, npcs.js, venjy.js y las escenas (pito, libro, capucha, sombrero)
function conAccesorios(p) {
    const a = cajita(0.42, 0.2, 0.1); a.position.set(0, 1.42, -0.17); p.cuerpo.add(a);
    const b = cajita(0.3, 0.2, 0.05); b.position.set(0, 1.1, 0.7); p.cuerpo.add(b);
    const c = cajita(0.8, 0.06, 0.8); c.position.y = 0.52; p.cuello.add(c);
    const d = cajita(0.04, 0.04, 0.2); d.position.set(0, -0.7, 0.1); d.rotation.x = -0.6; p.brazoD.add(d);
    const e = cajita(0.1, 0.02, 0.15); e.position.set(0, -0.74, 0.12); e.rotation.x = -1.1; p.brazoI.add(e);
    const f = cajita(0.3, 0.05, 0.3); f.position.set(0, -0.7, 0.05); p.piernaD.add(f);
    return p;
}
const CREADORES = {
    persona: () => conAccesorios(C.crearPersona(C.crearTinte(), PIEL, 100)),
    ...Object.fromEntries(S.BASES.slice(0, 4).map((b, i) => [`skin${i}`, () => S.crearModelo(b, 8800 + i)])),
    zombi: () => E.modeloPersona(C.crearTinte(), 'zombi', 300),
    esqueleto: () => E.modeloPersona(C.crearTinte(), 'esqueleto', 310),
    trauco: () => E.modeloPersona(C.crearTinte(), 'trauco', 320)
};

// Objetos en la mano (fábrica de mentira, como pose-jugador.mjs) y un instrumento colgado
const fabrica = {
    THREE,
    materiales: () => [new THREE.MeshBasicMaterial(), new THREE.MeshBasicMaterial()],
    malla: id => ({ malla: id === 900 ? cajita(0.5, 0.7, 0.15) : cajita(0.4, 0.4, 0.06), tipo: id === 900 ? 'modelo' : id < 256 ? 'bloque' : 'herramienta' }),
    clave: id => id === 900 ? 'guitarra' : id === 300 ? 'espada_hierro' : 'piedra'
};

// ---------- Poses ----------
// Canales de las escenas (rig.md) escritos directo en los huesos, como lo hacen las escenas y los gestos
function escribirDirecto(p, a) {
    p.cuello.rotation.set(a.cx || 0, a.cy || 0, a.cz || 0);
    p.brazoD.rotation.set(a.bDx || 0, 0, a.bDz || 0);
    p.brazoI.rotation.set(a.bIx || 0, 0, a.bIz || 0);
    p.piernaD.rotation.set(a.pDx || 0, 0, 0);
    p.piernaI.rotation.set(a.pIx || 0, 0, 0);
    p.cuerpo.rotation.set(a.inc || 0, 0, a.rz || 0);
    p.cuerpo.position.set(0, (a.y || 0) + (a.salto || 0), a.pz || 0);
}
const SENTADO = { y: -0.62, pDx: -1.45, pIx: -1.45, inc: 0.15 };
function listaPoses() {
    const r = azar(4242), lista = [];
    for (const [k, v] of Object.entries(POSES_JSON.poses || {})) lista.push({ k: `pose:${k}`, a: { ...v.canales } });
    for (const [k, def] of Object.entries(POSES_JSON.gestos || {})) {
        for (const t of [0.35, 1.7]) {
            const s = lista.length % 2 === 1, j = lista.length % 3 === 0;
            lista.push({ k: `gesto:${k}@${t}`, a: { ...G.evaluarGesto(def, (t % 2) / 2, t, { s, j, d: 2 }, {}) } });
        }
    }
    while (lista.length < 200) {
        const i = lista.length;
        lista.push({ k: `azar:${i}`, a: {
            cx: entre(r, -0.45, 0.5), cy: entre(r, -1.1, 1.1), cz: entre(r, -0.2, 0.2),
            bDx: entre(r, -2.9, 0.6), bDz: entre(r, -0.8, 0.9), bIx: entre(r, -2.9, 0.6), bIz: entre(r, -0.9, 0.8),
            bDy: entre(r, -0.6, 0.6), bIy: entre(r, -0.6, 0.6), ry: entre(r, -0.4, 0.4),
            pDx: entre(r, -1.6, 0.6), pIx: entre(r, -1.6, 0.6), inc: entre(r, -0.2, 0.7), rz: entre(r, -0.15, 0.15),
            y: entre(r, -0.7, 0.6), pz: entre(r, -0.2, 0.3)
        } });
    }
    return lista.slice(0, 200);
}
const POSES = listaPoses();
// Entradas del jugador para `posar` (una por pose, en orden)
const ENTRADAS = [
    { mov: 4 }, { mov: 7, corre: true }, { mov: 0, objeto: 300, golpe: true }, { mov: 0, objeto: 5, comiendo: true },
    { mov: 2, objeto: 300, tensando: true, pitch: 0.4 }, { mov: 0, objeto: 300, objeto2: 5, bloqueando: true }, { mov: 0, agachado: true, objeto2: 5 },
    { mov: 0, objeto: 900 }, { mov: 3, pitch: -0.6, objeto: 5 }
];

// Caso: 0 de pie · 1 sentado · 2 jugador · 3 jugador sentado
function posar(p, caso, i) {
    const { a } = POSES[i];
    if (caso < 2) {
        P.limpiar(p);
        escribirDirecto(p, caso === 1 ? { ...a, ...SENTADO, salto: 0 } : a);
        return;
    }
    // Jugador: estado suavizado desde cero y unos cuadros, más el gesto de la pose mezclado como la ruleta
    const e = P.crearEstado();
    const ent = { ...ENTRADAS[i % ENTRADAS.length], sentado: caso === 3, gesto: { meta: a, w: (i % 5) / 4 } };
    const golpe = ent.golpe;
    for (let k = 0; k < 1 + (i % 7); k++) { P.posar(p, e, ent, 1 / 30, fabrica); ent.golpe = false; }
    ent.golpe = golpe;
    // Con giro del brazo y del torso (bDy, ry) de aplicarAngulos
    const ang = P.angulos(e, ent);
    if (a.bDy !== undefined) { ang.bDy = a.bDy; ang.bIy = a.bIy; ang.ry += a.ry; }
    P.aplicarAngulos(p, ang);
}

// ---------- Huella de las cajas visibles ----------
const visible = o => { for (let n = o; n; n = n.parent) if (n.visible === false) return false; return true; };
const T = new THREE.Matrix4(), Mx = new THREE.Matrix4();
// Pesos fijos por elemento (la huella no depende del orden en que se recorren las cajas)
const PESOS = [1, 2, 3].map(k => { const r = azar(77 * k); return Array.from({ length: 16 }, () => entre(r, -1, 1)); });
function huella(p) {
    p.g.updateMatrixWorld(true);
    const h = [0, 0, 0, 0, 0, 0];
    let n = 0;
    p.g.traverse(o => {
        if (!o.isMesh || o.userData.rigNuevo || !visible(o)) return;
        Mx.copy(o.matrixWorld);
        const eq = o.userData.rigEquivale;
        if (eq) Mx.multiply(T.makeTranslation(0, eq, 0));
        n++;
        for (let k = 0; k < 3; k++) {
            let s = 0;
            for (let e = 0; e < 16; e++) s += PESOS[k][e] * Mx.elements[e];
            h[k] += s; h[k + 3] += s * s;
        }
    });
    return [n, ...h];
}

// ---------- 1. Paridad ----------
const actual = {};
for (const [nombre, crear] of Object.entries(CREADORES)) {
    actual[nombre] = [];
    for (let caso = 0; caso < 4; caso++) {
        const p = crear();
        // Que cada caso empiece con el objeto o sin él igual que antes: `posar` de jugador pone y quita objetos
        for (let i = caso; i < POSES.length; i += 4) { posar(p, caso, i); actual[nombre].push([caso, i, ...huella(p)]); }
    }
}
if (GENERAR) {
    writeFileSync(RUTA_REF, JSON.stringify({ nota: 'Huella de las matrices de mundo de cada caja visible, rig de antes de N1 (main 840717e). La genera rig-articulaciones.mjs --generar; no editar a mano.', poses: POSES.length, creadores: Object.fromEntries(Object.entries(actual).map(([k, v]) => [k, v.map(f => f.map(x => Number(x.toPrecision(14))))])) }) + '\n');
    console.log(`rig-referencia.json generado: ${Object.keys(actual).length} creadores × ${POSES.length} poses`);
    process.exit(0);
}
const ref = JSON.parse(readFileSync(RUTA_REF, 'utf8'));
let peor = 0;
for (const [nombre, filas] of Object.entries(ref.creadores)) {
    const act = actual[nombre];
    ok(act && act.length === filas.length, `${nombre}: ${act ? act.length : 0} poses, la referencia tiene ${filas.length}`);
    if (!act) continue;
    let malas = 0;
    filas.forEach((f, j) => {
        const a = act[j];
        if (a[2] !== f[2]) { malas++; if (malas <= 3) ok(false, `${nombre} caso ${f[0]} pose ${POSES[f[1]].k}: ${a[2]} cajas visibles, antes ${f[2]}`); return; }
        let d = 0;
        for (let k = 3; k < f.length; k++) d = Math.max(d, Math.abs(a[k] - f[k]));
        peor = Math.max(peor, d);
        if (d >= 1e-9) { malas++; if (malas <= 3) ok(false, `${nombre} caso ${f[0]} pose ${POSES[f[1]].k}: diferencia ${d.toExponential(2)}`); }
    });
    ok(malas === 0, `${nombre}: ${malas} poses distintas de la referencia`);
}

// ---------- 2-4. Solo con el rig nuevo ----------
const p = CREADORES.persona();
ok(p.pecho && p.antebrazoD && p.antebrazoI && p.canillaD && p.canillaI && p.munecaD && p.munecaI, 'crearPersona entrega pecho, antebrazos, canillas y muñecas');
if (p.antebrazoD) {
    // 2. UV: la mitad usa la v que tenía ese punto en la caja entera (alto 0,75: v = (y + 0,75) / 0,75 en el pivote)
    const v = new THREE.Vector3();
    let malasUV = 0, revisadas = 0;
    for (const [hueso, art] of [[p.brazoD, p.antebrazoD], [p.piernaI, p.canillaI]]) {
        const sup = hueso.children[0], inf = art.children.find(o => o.isMesh && !o.userData.rigNuevo);
        ok(sup.isMesh && inf && sup.material === inf.material, 'las dos mitades comparten el material (el mismo lienzo)');
        for (const m of [sup, inf]) {
            const pos = m.geometry.attributes.position, uv = m.geometry.attributes.uv, grupos = m.geometry.groups;
            for (const gr of grupos) {
                if (gr.materialIndex === 2 || gr.materialIndex === 3) continue; // arriba y abajo: la cara entera, como antes
                for (let k = gr.start; k < gr.start + gr.count; k++) {
                    const ix = m.geometry.index.getX(k);
                    v.fromBufferAttribute(pos, ix);
                    m.updateMatrix(); v.applyMatrix4(m.matrix);
                    if (m === inf) v.applyMatrix4(art.matrix);
                    const esperada = (v.y + 0.75) / 0.75;
                    revisadas++;
                    if (Math.abs(uv.getY(ix) - esperada) > 1e-9) malasUV++;
                }
            }
        }
    }
    ok(revisadas > 0 && malasUV === 0, `UV de las mitades: ${malasUV} de ${revisadas} vértices con otra v que la caja entera`);
    const original = new THREE.BoxGeometry(0.25, 0.75, 0.25);
    const uSup = p.brazoD.children[0].geometry.attributes.uv;
    let malasU = 0;
    for (let k = 0; k < uSup.count; k++) if (Math.abs(uSup.getX(k) - original.attributes.uv.getX(k)) > 1e-12) malasU++;
    ok(malasU === 0, `la u de las mitades es la de la caja entera (${malasU} distintas)`);

    // 3. Límites
    P.aplicarAngulos(p, { cx: 0, cy: 0, bDx: 0, bDy: 9, bDz: 0, bIx: 0, bIy: -9, bIz: 0, pDx: 0, pIx: 0, inc: 0, ry: 0, y: 0, codoD: 1, codoI: -9, rodD: -1, rodI: 9, pX: 5, pY: -5, pZ: 5, pDz: 3, pIz: -3, armaX: 9, armaZ: -9 });
    const L = P.LIMITES;
    const dentro = (v, [a, b], msg) => ok(v >= a - 1e-12 && v <= b + 1e-12, `${msg}: ${v} fuera de [${a}, ${b}]`);
    dentro(p.antebrazoD.rotation.x, L.codoD, 'codo derecho al revés');
    dentro(p.antebrazoI.rotation.x, L.codoI, 'codo izquierdo');
    dentro(p.canillaD.rotation.x, L.rodD, 'rodilla derecha hacia adelante');
    dentro(p.canillaI.rotation.x, L.rodI, 'rodilla izquierda');
    dentro(p.pecho.rotation.x, L.pX, 'pecho pX'); dentro(p.pecho.rotation.y, L.pY, 'pecho pY'); dentro(p.pecho.rotation.z, L.pZ, 'pecho pZ');
    dentro(p.brazoD.rotation.y, L.bDy, 'bDy'); dentro(p.brazoI.rotation.y, L.bIy, 'bIy');
    dentro(-p.piernaD.rotation.z, L.pDz, 'pDz'); dentro(p.piernaI.rotation.z, L.pIz, 'pIz');
    dentro(p.munecaD.rotation.x, L.armaX, 'armaX'); dentro(p.munecaD.rotation.z, L.armaZ, 'armaZ');
    ok(p.antebrazoD.rotation.x === 0 && p.canillaD.rotation.x === 0, 'un codo o una rodilla al revés queda en 0');
    // Los rangos se pueden cambiar desde poses.json → limites
    P.fijarLimites({ codoD: [-1, 0] });
    P.aplicarAngulos(p, { codoD: -2 });
    ok(Math.abs(p.antebrazoD.rotation.x + 1) < 1e-12, 'poses.json → limites cambia el rango del codo');
    P.fijarLimites({ codoD: 'malo', rodI: [3, 1] });
    ok(P.LIMITES.codoD[0] === -2.6 && P.LIMITES.rodI[1] === 2.4, 'un límite mal escrito deja el del código');
    P.fijarLimites(null);

    // 4. Rótula y codo
    P.limpiar(p);
    P.aplicarAngulos(p, {});
    const rotula = p.antebrazoD.userData.rotula;
    ok(rotula && rotula.visible === false, 'la rótula no se ve con el codo en 0');
    P.ponerObjeto(p, 300, fabrica, 0);
    p.g.updateMatrixWorld(true);
    const antes = new THREE.Vector3().setFromMatrixPosition(p.objetoD.malla.matrixWorld);
    P.aplicarAngulos(p, { codoD: -1.5, rodI: 1.2 });
    p.g.updateMatrixWorld(true);
    const despues = new THREE.Vector3().setFromMatrixPosition(p.objetoD.malla.matrixWorld);
    ok(rotula.visible && p.canillaI.userData.rotula.visible, 'la rótula aparece al doblar');
    ok(despues.z - antes.z > 0.2 && despues.y - antes.y > 0.2, `doblar el codo sube y adelanta el objeto (Δy ${(despues.y - antes.y).toFixed(2)}, Δz ${(despues.z - antes.z).toFixed(2)})`);
    ok(p.objetoD.malla.parent === p.munecaD, 'el objeto cuelga de la muñeca del antebrazo');
    P.limpiar(p);
    ok(p.antebrazoD.rotation.x === 0 && p.canillaI.rotation.x === 0 && !rotula.visible, 'limpiar endereza codos y rodillas');
}

console.log(`rig-articulaciones.mjs: ${pruebas - fallos}/${pruebas} bien (peor diferencia ${peor.toExponential(1)})`);
process.exit(fallos ? 1 : 0);
