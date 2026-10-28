// =========================================================
// VENJY · Estudio · gizmo de las construcciones dentro del juego (Etapa B 6e, pestaña Posiciones)
// Solo se importa con ?estudio y al elegir una construcción (puente-juego.js). Dibuja una caja de alambre del tamaño
// del sitio que nivela (CONSTRUCCIONES de mundo/datos/posiciones.js) sobre la construcción y le cuelga un
// TransformControls que solo se mueve en X y Z. Al soltar avisa con `alCambio(clave, { x, z })` (bloque central).
// La construcción de verdad no se mueve aquí: el terreno se arma al cargar, así que se ve en su sitio nuevo cuando
// se guarda posiciones.json (el puente recarga el juego si cambiaron los lugares).
// Giro (lugares.<clave>.giro): la caja gira con él y lleva una marca en el frente (la puerta). Las construcciones nuevas
// (construcciones.json, `definir`) sin sitio todavía aparecen junto al jugador.
// =========================================================
import * as THREE from '../vendor/three.module.js';
import { TransformControls } from '../vendor/three-addons/TransformControls.js';
import { liberar, devolver } from './puntero-libre.js';
import { CONSTRUCCIONES, centrosDe } from '../mundo/datos/posiciones.js';
import { propiasDe } from '../mundo/datos/construcciones.js';

const ALTO = 8; // alto de la caja de alambre, en bloques (solo para verla)

// venjy: window.__venjy. alCambio(clave, { x, z })
export function crearGizmoLugar(venjy, alCambio) {
    let actual = null; // { clave, caja, controles, ayudante, y }
    let lugares = {}; // posiciones.json → lugares, lo último que mandó el Estudio
    let propias = {}; // construcciones.json (propiasDe): tamaño de las nuevas
    const defDe = clave => CONSTRUCCIONES[clave] || propias[clave] || null;
    const giroDe = clave => { const p = lugares[clave]; return (p && Number(p.giro)) || 0; };
    const lienzo = venjy.renderer.domElement;
    const padreDe = () => {
        const n = venjy.amigos && venjy.amigos.lista[0];
        return (n && n.p.g.parent) || (venjy.vista && venjy.vista.grupo) || null;
    };

    // Dónde va la caja: lo que diga el Estudio; si no, el sitio automático (si el terreno movió esta construcción
    // y el Estudio la devolvió a su sitio) o donde quedó en este terreno
    function centro(clave) {
        const t = venjy.terreno, aqui = centrosDe(t)[clave];
        const p = lugares[clave];
        if (p && Number.isFinite(p.x) && Number.isFinite(p.z)) return { bx: Math.round(p.x), bz: Math.round(p.z), y: aqui ? aqui.y : null };
        const auto = t && t.automaticos && t.automaticos[clave];
        if (auto && t.sitios && t.sitios[clave]) return { bx: auto.bx, bz: auto.bz, y: aqui ? aqui.y : null };
        if (aqui) return aqui;
        // Nueva sin sitio: frente al jugador, a unos bloques (el Estudio guarda ese punto al ponerla)
        const J = venjy.jugador;
        if (propias[clave] && J) {
            const lejos = Math.max(propias[clave].w, propias[clave].d) / 2 + 3;
            return { bx: Math.floor(J.pos.x - Math.sin(J.yaw) * lejos), bz: Math.floor(J.pos.z - Math.cos(J.yaw) * lejos), y: Math.floor(J.pos.y) };
        }
        return null;
    }
    function colocar() {
        const c = centro(actual.clave);
        if (!c) return;
        const y = c.y ?? actual.y;
        actual.y = y;
        actual.caja.position.set(c.bx + 0.5, y + ALTO / 2, c.bz + 0.5);
        actual.caja.rotation.y = giroDe(actual.clave) * Math.PI / 180; // el sur (+z) pasa al este con 90, como los bloques
        actual.caja.updateMatrixWorld(true);
    }
    function mirarA(obj) {
        const J = venjy.jugador, q = new THREE.Vector3();
        obj.getWorldPosition(q);
        const dx = q.x - J.pos.x, dz = q.z - J.pos.z, d = Math.hypot(dx, dz);
        if (d < 0.2) return;
        J.yaw = Math.atan2(dx, dz) - Math.PI;
        J.pitch = Math.max(-1.2, Math.min(1.2, Math.atan2(q.y - (J.pos.y + 1.6), d)));
    }
    function quitar() {
        if (!actual) return;
        actual.controles.detach();
        actual.ayudante.removeFromParent();
        actual.controles.dispose();
        actual.caja.removeFromParent();
        actual.caja.geometry.dispose(); actual.caja.material.dispose();
        for (const h of actual.caja.children) { h.geometry.dispose(); h.material.dispose(); }
        actual = null;
        devolver(venjy);
    }
    function poner(clave) {
        const def = defDe(clave);
        if (!def) throw new Error(`«${clave}» no es una construcción que se pueda mover`);
        const c = centro(clave);
        if (!c) throw new Error(`«${clave}» no está en este mundo`);
        const padre = padreDe();
        if (!padre) throw new Error('el juego todavía no está listo');
        if (actual && actual.clave === clave) { colocar(); mirarA(actual.caja); return punto(); }
        quitar();
        liberar(venjy);
        const geo = new THREE.EdgesGeometry(new THREE.BoxGeometry(def.w, ALTO, def.d));
        const caja = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xffd34d, depthTest: false, transparent: true }));
        caja.renderOrder = 999;
        caja.name = 'lugar-estudio';
        // Frente (puerta): una placa roja en el lado sur de la caja sin girar
        const frente = new THREE.Mesh(new THREE.BoxGeometry(Math.min(3, def.w), 2, 0.2), new THREE.MeshBasicMaterial({ color: 0xe0503c, depthTest: false, transparent: true, opacity: 0.8 }));
        frente.position.set(0, 1 - ALTO / 2, def.d / 2);
        frente.renderOrder = 999;
        caja.add(frente);
        padre.add(caja);
        actual = { clave, caja, controles: null, ayudante: null, y: c.y };
        colocar();
        mirarA(caja);
        const controles = new TransformControls(venjy.camara, lienzo);
        controles.setMode('translate');
        controles.setSize(1.4);
        controles.setTranslationSnap(1); // un bloque
        controles.showY = false; // la altura la pone el terreno
        controles.attach(caja);
        const ayudante = controles.getHelper();
        padre.add(ayudante);
        controles.addEventListener('dragging-changed', e => {
            if (e.value) return;
            const p = punto();
            lugares[clave] = { ...(lugares[clave] || {}), ...p };
            alCambio(clave, p);
        });
        Object.assign(actual, { controles, ayudante });
        return punto();
    }
    function punto() {
        if (!actual) return null;
        const q = actual.caja.position;
        return { x: Math.floor(q.x), z: Math.floor(q.z) };
    }
    return {
        // { clave }; clave null quita el gizmo. Devuelve { x, z } (bloque central) o null
        elegir({ clave }) { if (clave === null) { quitar(); return null; } return poner(clave); },
        // posiciones.json del Estudio (números del editor o «Volver a su sitio»): la caja va a donde dice
        sincronizar(datos) { lugares = (datos && datos.lugares) || {}; if (actual) colocar(); },
        // construcciones.json del Estudio o del disco: tamaño de las nuevas
        definir(datos) { propias = propiasDe(datos); },
        get activo() { return actual ? actual.clave : null; },
        punto,
        quitar
    };
}
