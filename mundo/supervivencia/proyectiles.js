// =========================================================
// VENJY · Supervivencia · Proyectiles
// Flechas (del arco del jugador y de los esqueletos) y bolas de fuego (jefes). Avanzan en
// pasos cortos contra los bloques y las cajas de las entidades; las flechas se clavan y las
// del jugador se pueden recoger. El daño de la flecha crece con la velocidad.
// =========================================================
import * as THREE from '../../vendor/three.module.js';
import { TIPO } from '../texturas.js';
import { O } from './objetos.js';
import { sonidos } from './sonidos.js';

const GRAV_FLECHA = 20;
const VIDA_CLAVADA = 60;

export function crearProyectiles({ scene, mundo, jugador, inventario, vida, objetivos }) {
    const lista = [];
    const geoFlecha = new THREE.BoxGeometry(0.06, 0.06, 0.6);
    const matFlecha = new THREE.MeshBasicMaterial({ color: 0x8a6a3c });
    const geoPunta = new THREE.BoxGeometry(0.1, 0.1, 0.12);
    const matPunta = new THREE.MeshBasicMaterial({ color: 0x9a9aa0 });
    const geoBola = new THREE.BoxGeometry(0.45, 0.45, 0.45);
    const matBola = new THREE.MeshBasicMaterial({ color: 0xff8a20 });

    function malla(tipo) {
        const g = new THREE.Group();
        if (tipo === 'bola') g.add(new THREE.Mesh(geoBola, matBola));
        else {
            g.add(new THREE.Mesh(geoFlecha, matFlecha));
            const p = new THREE.Mesh(geoPunta, matPunta); p.position.z = 0.32; g.add(p);
        }
        scene.add(g);
        return g;
    }

    // { pos, vel, dano, deJugador, tipo: 'flecha' | 'bola', recogible }
    function disparar(op) {
        const p = {
            tipo: op.tipo || 'flecha', pos: op.pos.clone(), vel: op.vel.clone(), dano: op.dano ?? null,
            deJugador: !!op.deJugador, recogible: !!op.recogible, clavada: false, edad: 0, malla: malla(op.tipo || 'flecha'),
            alImpactar: op.alImpactar || null
        };
        lista.push(p);
        return p;
    }

    function quitar(p) {
        const i = lista.indexOf(p);
        if (i >= 0) lista.splice(i, 1);
        scene.remove(p.malla);
    }

    const dirTmp = new THREE.Vector3();
    function impactarEntidad(p) {
        const pos = p.pos;
        const rapidez = p.vel.length();
        const dano = p.dano ?? Math.ceil(rapidez * 0.32);
        if (!p.deJugador) {
            // ¿Le pega al jugador?
            const j = jugador.pos;
            if (Math.abs(pos.x - j.x) < 0.45 && Math.abs(pos.z - j.z) < 0.45 && pos.y > j.y && pos.y < j.y + 1.85) {
                vida.danar(dano, p.tipo === 'bola' ? 'fuego' : 'flecha', { origen: { x: pos.x - p.vel.x, z: pos.z - p.vel.z } });
                if (p.tipo === 'bola') vida.fuego = Math.max(vida.fuego, 4);
                return true;
            }
        }
        for (const o of objetivos(pos.x, pos.z, 3)) {
            if (!p.deJugador && o.tipo !== 'animal') continue; // las flechas de monstruos no se pegan entre ellos
            const r = o.ancho / 2 + 0.1;
            if (Math.abs(pos.x - o.x) < r && Math.abs(pos.z - o.z) < r && pos.y > o.y && pos.y < o.y + o.alto) {
                o.golpear(dano, { x: pos.x - p.vel.x, z: pos.z - p.vel.z, fuerza: 0.4, proyectil: true, fuego: p.tipo === 'bola' });
                return true;
            }
        }
        return false;
    }

    function actualizar(dt) {
        for (let i = lista.length - 1; i >= 0; i--) {
            const p = lista[i];
            p.edad += dt;
            if (p.clavada) {
                if (p.edad > VIDA_CLAVADA) { quitar(p); continue; }
                // Recoger flechas propias al pasar
                if (p.recogible && jugador.pos.distanceTo(p.pos) < 1.6 && inventario.agregar(O.FLECHA, 1) === 0) { sonidos.recoger(); quitar(p); continue; }
                // Si se rompió el bloque donde estaba clavada, cae
                const id = mundo.bloque(p.pos.x + p.dir.x * 0.3, p.pos.y + p.dir.y * 0.3, p.pos.z + p.dir.z * 0.3);
                if (id === 0) { p.clavada = false; p.vel.set(0, -1, 0); }
                continue;
            }
            if (p.edad > 12 || p.pos.y < -10) { quitar(p); continue; }
            if (p.tipo === 'flecha') p.vel.y -= GRAV_FLECHA * dt;
            const paso = p.vel.length() * dt;
            const n = Math.max(1, Math.ceil(paso / 0.25));
            let fin = false;
            for (let k = 0; k < n && !fin; k++) {
                p.pos.addScaledVector(p.vel, dt / n);
                if (impactarEntidad(p)) {
                    fin = true;
                    if (p.alImpactar) p.alImpactar(p.pos);
                    quitar(p);
                    break;
                }
                const id = mundo.bloque(p.pos.x, p.pos.y, p.pos.z);
                if (id > 0 && (TIPO[id] === 1 || TIPO[id] === 2 || TIPO[id] === 6)) {
                    fin = true;
                    if (p.tipo === 'bola') { if (p.alImpactar) p.alImpactar(p.pos); quitar(p); break; }
                    // Se clava: retrocede un poco y queda quieta
                    dirTmp.copy(p.vel).normalize();
                    p.pos.addScaledVector(dirTmp, -0.2);
                    p.dir = dirTmp.clone();
                    p.clavada = true; p.edad = 0;
                    sonidos.golpeBloque(id);
                }
            }
            if (!lista.includes(p)) continue;
            p.malla.position.copy(p.pos);
            if (!p.clavada && p.vel.lengthSq() > 0.01) p.malla.lookAt(dirTmp.copy(p.pos).add(p.vel));
            if (p.tipo === 'bola') p.malla.rotation.x += dt * 8;
        }
    }

    return { lista, disparar, actualizar, quitar };
}
