// =========================================================
// VENJY · Estudio · visor 3D de la pestaña Combate (bloque 8 · N6b, mundo/COMBATE.md §25.2)
// Un lienzo con tres vistas arriba (frente, solo el que hace la acción; 3/4 y lado, los dos) y la hoja de cuadros abajo
// (los cuadros clave de la acción, en 3/4). Dos muñecos de cajas como los del juego (skin.js y aplicarAngulos): el que
// hace la acción y su rival, que reacciona. El arma va colgada de la muñeca (sigue a la mano sola) con su punta marcada
// en rojo y el camino de la punta durante la acción en amarillo. Las poses salen de combate-visor-modelo.mjs (simular).
//   crearVisor(lienzo)        -> { fijarEstilo(estilo), fijarSim(sim, hoja), dibujar(i), medir(i) }
// =========================================================
import { indiceDe } from './combate-visor-modelo.mjs';

export async function crearVisor(lienzo) {
    const [THREE, { crearModelo, BASES }, { aplicarAngulos }] = await Promise.all([
        import('../vendor/three.module.js'), import('../mundo/supervivencia/skin.js'), import('../mundo/supervivencia/pose-jugador.js')
    ]);
    const render = new THREE.WebGLRenderer({ canvas: lienzo, antialias: false, preserveDrawingBuffer: true });
    render.setClearColor(0x87b4e8);
    const W = lienzo.width, ALTO_HOJA = Math.round(lienzo.height * 0.28), ALTO_V = lienzo.height - ALTO_HOJA, ANCHO_V = W / 3;
    const matHoja = new THREE.MeshBasicMaterial({ color: 0xc9ccd6 }), matMango = new THREE.MeshBasicMaterial({ color: 0x3a2a1c });
    const matPunta = new THREE.MeshBasicMaterial({ color: 0xff3030, depthTest: false });
    const matRastro = new THREE.LineBasicMaterial({ color: 0xffff55, depthTest: false });

    function muneco(base, escena) {
        const m = crearModelo(base);
        m.tinte.aplicar(new THREE.Color(1, 1, 1));
        escena.add(m.g);
        return m;
    }
    // vista: 0 frente, 1 3/4, 2 lado
    const vistas = [0, 1, 2].map(i => {
        const e = new THREE.Scene();
        const suelo = new THREE.GridHelper(8, 8, 0x2c4a22, 0x2c4a22); e.add(suelo);
        const A = muneco(BASES[0], e), R = muneco(BASES[1] || BASES[0], e);
        R.g.visible = i !== 0;
        const rastro = new THREE.Line(new THREE.BufferGeometry(), matRastro); rastro.renderOrder = 8; e.add(rastro);
        // sin arma: la marca roja va donde la punta (la mano o el pie que golpea)
        const marca = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.08), matPunta); marca.renderOrder = 9; marca.visible = false; e.add(marca);
        const cam = new THREE.PerspectiveCamera(30, ANCHO_V / ALTO_V, 0.1, 60);
        return { e, suelo, A, R, rastro, marca, cam, armas: [] };
    });
    const camHoja = new THREE.PerspectiveCamera(30, 1, 0.1, 60);
    let sim = null, hoja = [];

    // El arma del estilo (arma.caja en coordenadas de la muñeca) en las dos manos que la llevan; sin caja, nada
    function fijarEstilo(estilo) {
        for (const v of vistas) {
            for (const a of v.armas) a.parent && a.parent.remove(a);
            v.armas = [];
            const arma = estilo && estilo.arma;
            if (!arma || !arma.caja) continue;
            for (const m of [v.A, v.R]) {
                const muneca = arma.mano === 'I' ? m.munecaI : m.munecaD;
                if (!muneca) continue;
                const [cx, cy, cz] = arma.caja.centro, [w, h, d] = arma.caja.medidas;
                const g = new THREE.Group();
                const hojaM = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), matHoja); hojaM.position.set(cx, cy, cz); g.add(hojaM);
                const lm = d * 0.22, mango = new THREE.Mesh(new THREE.BoxGeometry(w + 0.02, h + 0.02, lm), matMango);
                mango.position.set(cx, cy, cz - d / 2 + lm / 2); g.add(mango);
                const punta = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.07), matPunta);
                punta.position.set(cx, cy, cz + d / 2); punta.renderOrder = 9; punta.name = 'punta'; g.add(punta);
                muneca.add(g); v.armas.push(g);
            }
        }
    }
    // Cámaras según dónde quedan los dos (el centro no sigue al avance: la cámara no nada)
    function encuadrar() {
        const zc = sim ? sim.zR / 2 : 0.9;
        const [f, t, l] = vistas;
        f.cam.position.set(0, 1.3, 6.4); f.cam.lookAt(0, 1.0, 0);
        t.cam.position.set(Math.SQRT1_2 * 8.2, 1.9, zc + Math.SQRT1_2 * 8.2); t.cam.lookAt(0, 1.0, zc);
        l.cam.position.set(8.4, 1.4, zc); l.cam.lookAt(0, 1.0, zc);
        for (const v of vistas) v.suelo.position.set(0, 0, zc);
        camHoja.position.copy(t.cam.position); camHoja.quaternion.copy(t.cam.quaternion);
        camHoja.aspect = (W / Math.max(1, hoja.length || 8)) / ALTO_HOJA; camHoja.updateProjectionMatrix();
    }
    function posar(v, q) {
        aplicarAngulos(v.A, q.A); v.A.g.position.set(q.raizA.x, 0, q.raizA.z); v.A.g.rotation.y = q.raizA.yaw;
        aplicarAngulos(v.R, q.R); v.R.g.position.set(q.raizR.x, 0, q.raizR.z); v.R.g.rotation.y = q.raizR.yaw;
        v.marca.visible = !v.armas.length && !!q.punta;
        if (v.marca.visible) v.marca.position.set(...q.punta);
    }
    // Con una simulación nueva: el camino de la punta y la hoja de cuadros (que no cambia mientras corre el bucle)
    function fijarSim(s, cuadrosHoja) {
        sim = s; hoja = cuadrosHoja || [];
        const pts = s ? s.cuadros.filter(q => q.c >= 0 && q.c < s.total && q.punta).map(q => new THREE.Vector3(...q.punta)) : [];
        for (const v of vistas) { v.rastro.geometry.dispose(); v.rastro.geometry = new THREE.BufferGeometry().setFromPoints(pts); v.rastro.visible = pts.length > 1; }
        encuadrar();
        render.setScissorTest(true);
        const n = Math.max(1, hoja.length), ancho = W / n, v = vistas[1];
        render.setViewport(0, 0, W, ALTO_HOJA); render.setScissor(0, 0, W, ALTO_HOJA); render.setClearColor(0x2a1d12); render.clear();
        render.setClearColor(0x87b4e8);
        if (s) hoja.forEach((h, i) => {
            posar(v, s.cuadros[indiceDe(s, h.c)]);
            render.setViewport(i * ancho + 2, 2, ancho - 4, ALTO_HOJA - 4); render.setScissor(i * ancho + 2, 2, ancho - 4, ALTO_HOJA - 4);
            render.render(v.e, camHoja);
        });
    }
    function dibujar(i) {
        if (!sim) return;
        const q = sim.cuadros[Math.max(0, Math.min(sim.cuadros.length - 1, i))];
        render.setScissorTest(true);
        vistas.forEach((v, k) => {
            posar(v, q);
            render.setViewport(k * ANCHO_V, ALTO_HOJA, ANCHO_V, ALTO_V); render.setScissor(k * ANCHO_V, ALTO_HOJA, ANCHO_V, ALTO_V);
            render.render(v.e, v.cam);
        });
    }
    // Para revisar: la punta según Three.js en el cuadro i (debe dar lo mismo que sim.cuadros[i].punta, de cinematica.js)
    function medir(i) {
        if (!sim) return null;
        const v = vistas[0];
        posar(v, sim.cuadros[i]);
        v.A.g.updateMatrixWorld(true);
        const p = v.armas[0] ? v.armas[0].getObjectByName('punta') : v.marca.visible ? v.marca : null;
        if (!p) return null;
        const w = p.getWorldPosition(new THREE.Vector3());
        return [w.x, w.y, w.z].map(x => Math.round(x * 1000) / 1000);
    }
    return { fijarEstilo, fijarSim, dibujar, medir };
}
