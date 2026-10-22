// =========================================================
// VENJY · Estudio · gizmo de la mesa del Duelo dentro del juego (B0-V)
// Solo se importa con ?estudio y al tocar «Mover la mesa» o «Girar la mesa» en la pestaña Mesa (puente-juego.js).
// Con la mesa cerrada dibuja una copia (el mismo mueble de armarMesa) donde quedaría junto a Lucho y le cuelga un
// TransformControls, como el gizmo de Posiciones (gizmo-juego.js). Al soltar convierte el centro y el ángulo a
// { giro, dist, lado } de cartas-mesa.json (mesa-simple.mjs, la inversa de marcoMesa) y avisa con `alCambio`.
// =========================================================
import * as THREE from '../vendor/three.module.js';
import { TransformControls } from '../vendor/three-addons/TransformControls.js';
import { liberar, devolver } from './puntero-libre.js';
import { armarMesa } from '../mundo/supervivencia/mesas-colocadas.js';
import { MESA, marcoMesa } from '../mundo/supervivencia/cartas-mesa-modelo.js';
import { fusionar } from '../mundo/datos/cargador.js';
import { mesaDesdeCentro } from './mesa-simple.mjs';

// venjy: window.__venjy (datosMesa = lo último que mandó el Estudio). alCambio({ giro, dist, lado })
export function crearGizmoMesa(venjy, alCambio) {
    let actual = null; // { copia, controles, ayudante, lucho, modo }
    const lienzo = venjy.renderer.domElement;
    const medidas = () => fusionar(MESA, venjy.datosMesa || null);
    const luchoDe = () => (venjy.amigos && venjy.amigos.lista.find(n => n.clave === 'lucho')) || null;

    function vaciar(g) {
        for (const o of [...g.children]) { g.remove(o); o.geometry.dispose(); for (const m of [o.material].flat()) m.dispose(); }
    }
    // Arma la copia con las medidas y colores de ahora y la pone donde la deja el JSON
    function colocar() {
        const L = medidas(), n = actual.lucho;
        vaciar(actual.copia);
        armarMesa(actual.copia, L.mesa, L.mueble, o => new THREE.MeshBasicMaterial({ ...o, transparent: true, opacity: 0.85 }));
        const M = marcoMesa(L, { x: n.x, y: n.y, z: n.z });
        actual.copia.position.set(M.x, M.y, M.z);
        actual.copia.rotation.set(0, M.g, 0);
        actual.copia.updateMatrixWorld(true);
    }
    // Gira la cabeza del jugador hacia la mesa (misma convención que gizmo-juego.js)
    function mirarA(obj) {
        const J = venjy.jugador, q = new THREE.Vector3();
        obj.getWorldPosition(q);
        const dx = q.x - J.pos.x, dz = q.z - J.pos.z, d = Math.hypot(dx, dz);
        if (d < 0.2) return;
        J.yaw = Math.atan2(dx, dz) - Math.PI;
        J.pitch = Math.max(-1.2, Math.min(1.2, Math.atan2(q.y + 0.8 - (J.pos.y + 1.6), d)));
    }
    function quitar() {
        if (!actual) return;
        actual.controles.detach();
        actual.ayudante.removeFromParent();
        actual.controles.dispose();
        vaciar(actual.copia);
        actual.copia.removeFromParent();
        actual = null;
        devolver(venjy);
    }
    function poner(modo) {
        if (venjy.mesaCartas && venjy.mesaCartas.activo) venjy.mesaCartas.cerrar(); // la mesa abierta se come los clics
        const n = luchoDe();
        if (!n) throw new Error('Lucho no está en este mundo');
        if (actual && actual.modo === modo) return punto();
        quitar();
        liberar(venjy);
        const copia = new THREE.Group(); copia.name = 'mesa-estudio';
        n.p.g.parent.add(copia);
        actual = { copia, lucho: n, modo, controles: null, ayudante: null };
        colocar();
        mirarA(copia);
        const controles = new TransformControls(venjy.camara, lienzo);
        controles.setMode(modo === 'girar' ? 'rotate' : 'translate');
        controles.setSize(1.1);
        controles.setRotationSnap(THREE.MathUtils.degToRad(5));
        controles.showY = modo === 'girar'; // la mesa va en el suelo de Lucho: se mueve en X y Z y gira en Y
        if (modo === 'girar') { controles.showX = false; controles.showZ = false; }
        controles.attach(copia);
        const ayudante = controles.getHelper();
        copia.parent.add(ayudante);
        controles.addEventListener('dragging-changed', e => { if (!e.value) alCambio(punto()); });
        Object.assign(actual, { controles, ayudante });
        return punto();
    }
    function punto() {
        if (!actual) return null;
        const { copia, lucho } = actual;
        return mesaDesdeCentro(lucho, copia.position, copia.rotation.y);
    }
    return {
        // modo: 'mover' | 'girar' | null (quita la copia). Devuelve { giro, dist, lado } o null
        elegir(modo) { if (!modo) { quitar(); return null; } return poner(modo); },
        // El Estudio mandó cartas-mesa nuevo (números, medidas o colores): la copia se rehace donde quedó
        sincronizar() { if (actual) colocar(); },
        get activo() { return actual ? actual.modo : null; },
        punto,
        quitar
    };
}
