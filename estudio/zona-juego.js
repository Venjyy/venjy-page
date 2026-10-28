// =========================================================
// VENJY · Estudio · «Guardar como construcción» dentro del juego (estudio/DISENO.md §44, parte 3)
// Solo se importa con ?estudio, la primera vez que el Estudio marca una esquina (puente-juego.js, mensaje `zona`).
// `marcar` toma el bloque que mira la mira (el suelo de una esquina); con dos esquinas dibuja la caja de la zona.
// `copiar` devuelve los bloques de la zona en el formato de construcciones.json (bloquesDeZona); el Estudio pide el
// nombre y guarda el JSON. Nada de esto cambia el mundo.
// =========================================================
import * as THREE from '../vendor/three.module.js';
import { lanzarRayo } from '../mundo/rayo.js';
import { bloquesDeZona } from '../mundo/datos/construcciones.js';

const ALCANCE = 48; // bloques: se marca desde lejos para ver la construcción entera

export function crearZona(venjy) {
    let esquinas = []; // [{ x, y, z }] (0, 1 o 2)
    let caja = null;
    const leer = (x, y, z) => venjy.mundo.bloque(x, y, z);

    function borrarCaja() {
        if (!caja) return;
        caja.removeFromParent();
        caja.geometry.dispose(); caja.material.dispose();
        caja = null;
    }
    // Caja de alambre verde: con una esquina, ese bloque; con dos, la zona hasta donde llega lo construido
    function dibujar(alto) {
        borrarCaja();
        const [a, b = a] = esquinas;
        const x0 = Math.min(a.x, b.x), z0 = Math.min(a.z, b.z), y0 = Math.min(a.y, b.y);
        const w = Math.abs(a.x - b.x) + 1, d = Math.abs(a.z - b.z) + 1, h = alto || Math.abs(a.y - b.y) + 1;
        caja = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w + 0.04, h + 0.04, d + 0.04)),
            new THREE.LineBasicMaterial({ color: 0x5cd65c, depthTest: false, transparent: true }));
        caja.renderOrder = 999;
        caja.name = 'zona-estudio';
        caja.position.set(x0 + w / 2, y0 + h / 2, z0 + d / 2);
        venjy.scene.add(caja);
    }
    function resumen() {
        if (esquinas.length < 2) return { esquinas: esquinas.length };
        const r = bloquesDeZona(leer, esquinas[0], esquinas[1]);
        if (r.error) return { esquinas: 2, error: r.error };
        return { esquinas: 2, ancho: r.ancho, fondo: r.fondo, alto: r.alto, bloques: r.bloques.length };
    }

    return {
        // Marca el bloque que mira la mira; una tercera marca empieza de nuevo. Devuelve resumen() (con dos, el tamaño)
        marcar() {
            const o = lanzarRayo(venjy.camara, venjy.mundo, ALCANCE);
            if (!o) throw new Error(`mira un bloque a menos de ${ALCANCE} bloques (el suelo de una esquina)`);
            if (esquinas.length >= 2) esquinas = [];
            esquinas.push({ x: o.x, y: o.y, z: o.z });
            const r = resumen();
            dibujar(r.alto);
            return r;
        },
        // { bloques, ancho, fondo, alto, centro } o lanza con el motivo
        copiar() {
            if (esquinas.length < 2) throw new Error('marca primero las dos esquinas');
            const r = bloquesDeZona(leer, esquinas[0], esquinas[1]);
            if (r.error) throw new Error(r.error);
            return r;
        },
        quitar() { esquinas = []; borrarCaja(); }
    };
}
