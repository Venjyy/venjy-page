// =========================================================
// VENJY · Supervivencia · Vista desplazada para las criaturas
// Las gatas, animales, amigos y Venjys del creativo calculan todo en las coordenadas del mapa
// original (alturas de terreno.HT, agua en 14…). En la supervivencia el mapa sube `dy` bloques:
// en vez de tocar su lógica, viven dentro de un grupo subido `dy` y ven un mundo, un jugador y
// una cámara «bajados» `dy` (Proxy). Así siguen idénticas en los dos modos.
// =========================================================
import * as THREE from '../../vendor/three.module.js';

function envolver(objeto, propias) {
    return new Proxy(objeto, {
        get(t, k) {
            if (k in propias) return propias[k];
            const v = t[k];
            return typeof v === 'function' ? v.bind(t) : v;
        }
    });
}

export function vistaDesplazada({ scene, mundo, jugador, camara, dy }) {
    const grupo = new THREE.Group();
    grupo.position.y = dy;
    scene.add(grupo);
    const posJ = new THREE.Vector3(), posC = new THREE.Vector3();
    const camaraB = envolver(camara, { position: posC });
    const jugadorB = envolver(jugador, { pos: posJ, camara: camaraB });
    const mundoB = envolver(mundo, {
        bloque: (x, y, z) => mundo.bloque(x, y + dy, z),
        nivelLuz: (x, y, z) => mundo.nivelLuz(x, y + dy, z)
    });
    return {
        grupo, mundo: mundoB, jugador: jugadorB, camara: camaraB,
        // Cada cuadro, antes de actualizar las criaturas
        sincronizar() {
            posJ.copy(jugador.pos); posJ.y -= dy;
            posC.copy(camara.position); posC.y -= dy;
        },
        // Convierte una posición de criatura (mapa original) al mundo real
        aMundo: (x, y, z) => new THREE.Vector3(x, y + dy, z)
    };
}
