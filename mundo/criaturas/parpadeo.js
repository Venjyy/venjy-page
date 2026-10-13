// =========================================================
// VENJY · Parpadeo (prueba)
// Los ojos van pintados en la cara; para cerrarlos se pone sobre cada uno un parche del color de la
// piel que se muestra ~120 ms cada 3-6 s. Un solo reloj (requestAnimationFrame) recorre a todos.
// Para sacarlo: quitar la llamada en amigos.js; si no gusta, se borra este archivo.
// =========================================================
import * as THREE from '../../vendor/three.module.js';
import { texturaPixeles, liso } from './cuerpo.js';

const rnd = (a, b) => a + Math.random() * (b - a);
const CIERRE = 0.12;
const ojos = new Set();
let corriendo = false;

function bucle() {
    const t = performance.now() / 1000;
    for (const o of ojos) {
        if (t >= o.proximo) { o.cierra = t + CIERRE; o.proximo = t + rnd(3, 6); }
        const cerrado = t < o.cierra;
        if (o.parche.visible !== cerrado) o.parche.visible = cerrado;
    }
    requestAnimationFrame(bucle);
}

// p: persona de crearPersona; piel: color [r,g,b] de la cara; semilla para la textura
export function agregarParpadeo(p, tinte, piel, semilla) {
    const mapa = texturaPixeles(2, 1, semilla, liso(piel, 0.07));
    const parche = new THREE.Group();
    // Ojos en las columnas 3-4 y 11-12 de la fila 7 (pieles.js, OJO): 1 px = 1/32 de bloque; la cara está en z = 0,25
    for (const x of [-0.125, 0.125]) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(0.0625, 0.03125, 0.006), tinte.caras(mapa));
        m.position.set(x, 0.265, 0.252);
        parche.add(m);
    }
    parche.visible = false;
    p.cuello.add(parche);
    ojos.add({ parche, proximo: performance.now() / 1000 + rnd(1, 6), cierra: 0 });
    if (!corriendo && typeof requestAnimationFrame === 'function') { corriendo = true; requestAnimationFrame(bucle); }
}
