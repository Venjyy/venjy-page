// =========================================================
// VENJY · Cielo: domo con gradiente, sol cuadrado y nubes de bloques
// =========================================================
import * as THREE from '../vendor/three.module.js';
import { crearRuido } from './mundo-datos.js';

export const COLOR_HORIZONTE = new THREE.Color('#bcd5f6');
const COLOR_ZENIT = new THREE.Color('#6b9fee');

function crearDomo() {
    const g = new THREE.SphereGeometry(900, 16, 12);
    const pos = g.attributes.position;
    const col = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
        const t = Math.max(0, Math.min(1, pos.getY(i) / 900));
        c.copy(COLOR_HORIZONTE).lerp(COLOR_ZENIT, Math.pow(t, 0.6));
        col.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const m = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false });
    const domo = new THREE.Mesh(g, m);
    domo.renderOrder = -2;
    return domo;
}

function crearSol() {
    const c = document.createElement('canvas');
    c.width = c.height = 16;
    const x = c.getContext('2d');
    x.fillStyle = '#fff6a8'; x.fillRect(0, 0, 16, 16);
    x.fillStyle = '#ffffff'; x.fillRect(3, 3, 10, 10);
    const t = new THREE.CanvasTexture(c);
    t.magFilter = THREE.NearestFilter;
    t.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(110, 110),
        new THREE.MeshBasicMaterial({ map: t, fog: false, depthWrite: false, transparent: true }));
    m.renderOrder = -1;
    return m;
}

// Nubes planas: celdas de 12×12 bloques con grosor 4, a 150 de altura
function crearNubes(anchoMundo, fondoMundo) {
    const CELDA = 12, GROSOR = 4, Y = 150;
    const ruido = crearRuido(555);
    const nx = Math.ceil(anchoMundo / CELDA), nz = Math.ceil(fondoMundo / CELDA);
    const llena = (i, j) => i >= 0 && j >= 0 && i < nx && j < nz && ruido(i / 6, j / 6, 3) > 0.56;
    const p = [], col = [], idx = [];
    const quad = (v, s) => {
        const b = p.length / 3;
        v.forEach(q => p.push(q[0], q[1], q[2]));
        for (let k = 0; k < 4; k++) col.push(s, s, s);
        idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
    };
    for (let j = 0; j < nz; j++) {
        for (let i = 0; i < nx; i++) {
            if (!llena(i, j)) continue;
            const x0 = i * CELDA, x1 = x0 + CELDA, z0 = j * CELDA, z1 = z0 + CELDA, y0 = Y, y1 = Y + GROSOR;
            quad([[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]], 1);
            quad([[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], 0.72);
            if (!llena(i + 1, j)) quad([[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]], 0.86);
            if (!llena(i - 1, j)) quad([[x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [x0, y0, z0]], 0.86);
            if (!llena(i, j + 1)) quad([[x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [x0, y0, z1]], 0.8);
            if (!llena(i, j - 1)) quad([[x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [x1, y0, z0]], 0.8);
        }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx);
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.85, fog: false }));
    m.frustumCulled = false;
    return m;
}

export function crearCielo(scene, anchoMundo, fondoMundo) {
    const domo = crearDomo();
    const sol = crearSol();
    const nubes = crearNubes(anchoMundo, fondoMundo);
    scene.add(domo, sol, nubes);
    scene.background = COLOR_HORIZONTE;
    const dirSol = new THREE.Vector3(0.45, 0.8, -0.4).normalize();
    return {
        actualizar(camara) {
            domo.position.copy(camara.position);
            sol.position.copy(camara.position).addScaledVector(dirSol, 700);
            sol.lookAt(camara.position);
        }
    };
}
