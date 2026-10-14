// =========================================================
// VENJY · Rayo por la grilla de bloques (Amanatides-Woo)
// Devuelve el primer bloque que acepta `acepta(id, tipo)` a menos de `alcance` desde la cámara,
// con la celda vacía anterior (`previo`, donde se pondría un bloque) y la normal de la cara.
// Lo usan la edición online y la supervivencia. Con `preciso` (supervivencia) los bloques con forma (losas,
// escalones, vallas, plantas, farol… ver formas.js) solo se apuntan si el rayo toca sus cajas; la normal es la de
// la caja tocada, `previo` la celda de al lado de esa cara y `punto` dónde pegó.
// =========================================================
import * as THREE from '../vendor/three.module.js';
import { TIPO } from './texturas.js';
import { ALTO } from './voxeles.js';
import { cajasDe, rayoCajas } from './formas.js';

const dir = new THREE.Vector3();

export const BLOQUES_APUNTABLES = (id, tipo) => tipo === 1 || tipo === 2 || tipo === 4 || tipo === 6 || tipo === 7 || tipo === 8;

export function lanzarRayo(camara, mundo, alcance, acepta = BLOQUES_APUNTABLES, origen = null, direccion = null, preciso = false) {
    if (direccion) dir.copy(direccion); else camara.getWorldDirection(dir);
    const o = origen || camara.position;
    let x = Math.floor(o.x), y = Math.floor(o.y), z = Math.floor(o.z);
    const pasoX = Math.sign(dir.x), pasoY = Math.sign(dir.y), pasoZ = Math.sign(dir.z);
    const dx = dir.x ? Math.abs(1 / dir.x) : Infinity;
    const dy = dir.y ? Math.abs(1 / dir.y) : Infinity;
    const dz = dir.z ? Math.abs(1 / dir.z) : Infinity;
    let tx = dir.x ? ((pasoX > 0 ? x + 1 - o.x : o.x - x) * dx) : Infinity;
    let ty = dir.y ? ((pasoY > 0 ? y + 1 - o.y : o.y - y) * dy) : Infinity;
    let tz = dir.z ? ((pasoZ > 0 ? z + 1 - o.z : o.z - z) * dz) : Infinity;
    let previo = null, dist = 0, normal = [0, 0, 0];
    while (dist <= alcance) {
        if (y < 0) return null;
        const id = y >= ALTO ? 0 : mundo.bloque(x, y, z);
        if (id === -1) return null; // chunk sin cargar
        if (id > 0 && acepta(id, TIPO[id])) {
            if (!preciso) return { x, y, z, id, previo, normal, dist };
            const cajas = cajasDe(id, (a, b, c) => mundo.bloque(x + a, y + b, z + c));
            const pega = cajas ? rayoCajas([o.x, o.y, o.z], [dir.x, dir.y, dir.z], x, y, z, cajas) : null;
            if (!cajas) return { x, y, z, id, previo, normal, dist, punto: [o.x + dir.x * dist, o.y + dir.y * dist, o.z + dir.z * dist] };
            if (pega && pega.t <= alcance) {
                const n = pega.normal[0] || pega.normal[1] || pega.normal[2] ? pega.normal : normal;
                return { x, y, z, id, previo: [x + n[0], y + n[1], z + n[2]], normal: n, dist: pega.t, punto: [o.x + dir.x * pega.t, o.y + dir.y * pega.t, o.z + dir.z * pega.t] };
            }
        }
        previo = [x, y, z];
        if (tx < ty && tx < tz) { dist = tx; tx += dx; x += pasoX; normal = [-pasoX, 0, 0]; }
        else if (ty < tz) { dist = ty; ty += dy; y += pasoY; normal = [0, -pasoY, 0]; }
        else { dist = tz; tz += dz; z += pasoZ; normal = [0, 0, -pasoZ]; }
        if (y >= ALTO && pasoY >= 0) return null;
    }
    return null;
}
