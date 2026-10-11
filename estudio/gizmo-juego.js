// =========================================================
// VENJY · Estudio · gizmo de posiciones dentro del juego (fase 4)
// Solo se importa con ?estudio y al elegir la primera persona (puente-juego.js): sin eso el juego no baja
// TransformControls. Pone un marcador invisible en el mismo grupo que la persona (el de la supervivencia va
// subido 48 bloques, así que el marcador usa las mismas coordenadas de terreno que n.x, n.y, n.z) y le cuelga el
// gizmo. Al soltar convierte la posición a { ancla, marco, dx, dy, dz, giro } con mundo/datos/posiciones.js
// (la inversa de la fórmula de posiciones.schema.json) y avisa con `alCambio`.
// =========================================================
import * as THREE from '../vendor/three.module.js';
import { TransformControls } from '../vendor/three-addons/TransformControls.js';

const MODOS = { mover: 'translate', girar: 'rotate' };

// venjy: window.__venjy. alCambio(clave, punto): el puente lo manda al Estudio como `cambio`.
export function crearGizmo(venjy, alCambio) {
    const amigos = venjy.amigos;
    let actual = null; // { n, marcador, controles, ayudante, modo, suelo, reloj }
    const lienzo = venjy.renderer.domElement;
    let pedirOriginal = null, activoOriginal = null, estilo = null, ultimoSalto = 0;

    // Con el gizmo puesto el puntero queda libre: el juego no lo recaptura al hacer clic (arrastrar el gizmo es un clic),
    // no abre la pausa al soltarlo ni muestra «Haz clic para seguir jugando». Quitar el gizmo lo deja todo como estaba.
    function liberarPuntero() {
        if (pedirOriginal) return;
        const J = venjy.jugador;
        pedirOriginal = lienzo.requestPointerLock;
        lienzo.requestPointerLock = () => Promise.resolve();
        activoOriginal = J.alCambiarActivo;
        J.alCambiarActivo = activo => { if (activo && activoOriginal) activoOriginal(activo); };
        if (document.pointerLockElement) document.exitPointerLock();
        if (activoOriginal) activoOriginal(true); // esconde una pausa que ya estuviera abierta
        estilo = document.createElement('style');
        estilo.textContent = '.clic-seguir { display: none !important; }';
        document.head.appendChild(estilo);
    }
    function devolverPuntero() {
        if (!pedirOriginal) return;
        lienzo.requestPointerLock = pedirOriginal;
        pedirOriginal = null;
        venjy.jugador.alCambiarActivo = activoOriginal;
        activoOriginal = null;
        if (estilo) estilo.remove();
        estilo = null;
    }

    function quitar() {
        if (!actual) return;
        cancelAnimationFrame(actual.reloj);
        actual.controles.detach();
        actual.ayudante.removeFromParent();
        actual.controles.dispose();
        actual.marcador.removeFromParent();
        actual = null;
        devolverPuntero();
    }

    // Gira la cabeza del jugador hacia la persona (con el gizmo a media pantalla, no detrás de la barra de objetos).
    // Convención de escenas-skin.js: yaw = atan2(dx, dz) - PI hacia lo que se mira; pitch positivo mira arriba.
    function mirarA(marcador) {
        const J = venjy.jugador, q = new THREE.Vector3();
        marcador.getWorldPosition(q);
        const dx = q.x - J.pos.x, dz = q.z - J.pos.z, d = Math.hypot(dx, dz);
        if (d < 0.2) return; // encima de la persona: se deja la vista como está
        J.yaw = Math.atan2(dx, dz) - Math.PI;
        J.pitch = Math.max(-1.2, Math.min(1.2, Math.atan2((q.y + 0.9) - (J.pos.y + 1.6), d)));
    }

    // El marcador manda mientras el gizmo esté puesto: braulio camina y las escenas mueven a n.x, n.z cada cuadro
    function seguir() {
        if (!actual) return;
        const { n, marcador, suelo } = actual;
        n.x = marcador.position.x; n.z = marcador.position.z; n.yaw = marcador.rotation.y;
        if (suelo) marcador.position.y = n.y; else n.y = marcador.position.y; // los de «suelo» ponen su altura solos
        amigos.posiciones.aplicarMiradas();
        // Una escena que arranque con el gizmo puesto se salta con su propio «Saltar» (no con un Esc: abriría la pausa)
        const ahora = performance.now();
        if (venjy.camaras && venjy.camaras.enCine && ahora - ultimoSalto > 400) {
            ultimoSalto = ahora;
            for (const e of [venjy.escenas, venjy.amistadEscena]) if (e && e.saltar) e.saltar();
        }
        actual.reloj = requestAnimationFrame(seguir);
    }

    function poner(clave, modo) {
        const n = amigos.lista.find(q => q.clave === clave);
        if (!n) throw new Error(`«${clave}» no existe en este mundo (¿falta su lugar?)`);
        const previo = amigos.posiciones.previo(clave);
        if (!previo) throw new Error(`«${clave}» no tiene entrada en posiciones.json: agrégala con ancla, dx y dz`);
        if (!amigos.posiciones.ancla(clave)) throw new Error(`el ancla «${previo.ancla}» no existe en este mundo`);
        quitar();
        liberarPuntero();
        const padre = n.p.g.parent;
        const marcador = new THREE.Object3D();
        marcador.position.set(n.x, n.y, n.z);
        marcador.rotation.y = n.yaw;
        padre.add(marcador);
        padre.updateMatrixWorld(true);
        mirarA(marcador);
        const controles = new TransformControls(venjy.camara, lienzo);
        controles.setMode(MODOS[modo]);
        controles.setSize(1.1);
        controles.setTranslationSnap(null);
        controles.setRotationSnap(THREE.MathUtils.degToRad(5));
        const suelo = previo.dy === 'suelo';
        controles.showY = modo === 'girar' || !suelo; // los de «suelo» buscan su suelo solos: solo se mueven en X y Z
        if (modo === 'girar') { controles.showX = false; controles.showZ = false; }
        controles.attach(marcador);
        const ayudante = controles.getHelper();
        padre.add(ayudante);
        controles.addEventListener('dragging-changed', e => {
            if (e.value) return;
            const punto = amigos.posiciones.punto(clave);
            if (punto) alCambio(clave, punto);
        });
        actual = { n, marcador, controles, ayudante, modo, suelo, reloj: 0 };
        actual.reloj = requestAnimationFrame(seguir);
        return amigos.posiciones.punto(clave);
    }

    return {
        // { clave, modo }; clave null quita el gizmo. Devuelve el punto actual de la persona.
        elegir({ clave, modo = 'mover' }) {
            if (clave === null) { quitar(); return null; }
            return poner(clave, modo);
        },
        // El Estudio cambió números en el editor: el marcador va a donde quedó la persona
        sincronizar() {
            if (!actual) return;
            const { n, marcador } = actual;
            marcador.position.set(n.x, n.y, n.z);
            marcador.rotation.y = n.yaw;
        },
        get activo() { return actual ? actual.n.clave : null; },
        // Solo para pruebas y capturas: dónde cae en pantalla (0..1) un punto a `d` unidades del gizmo, en ejes del mundo
        sonda(d = [0, 0, 0]) {
            if (!actual) return null;
            const q = new THREE.Vector3();
            actual.marcador.getWorldPosition(q);
            const escala = q.distanceTo(venjy.camara.position) * 1.1 / 4; // TransformControls: distancia * size / 4
            q.add(new THREE.Vector3(d[0], d[1], d[2]).multiplyScalar(escala)).project(venjy.camara);
            return { x: (q.x + 1) / 2, y: (1 - q.y) / 2, delante: q.z < 1, visible: actual.ayudante.visible, eje: actual.controles.axis, arrastrando: actual.controles.dragging, lienzo: [lienzo.clientWidth, lienzo.clientHeight] };
        },
        quitar
    };
}
