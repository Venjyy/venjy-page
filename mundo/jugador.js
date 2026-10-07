// =========================================================
// VENJY · Jugador en modo creativo
// Caminar con colisión, vuelo con doble salto (como Minecraft),
// sin hambre, vida ni inventario.
// =========================================================
import * as THREE from '../vendor/three.module.js';
import { TIPO, B } from './texturas.js';
import { ALTO, CHUNK, NIVEL_AGUA } from './voxeles.js';

const ANCHO = 0.6, ALTURA = 1.8, OJOS = 1.62;
const GRAVEDAD = 32, SALTO = 9;
const V_CAMINAR = 4.3, V_CORRER = 5.6, V_VUELO = 10.9, V_VUELO_RAPIDO = 21.6;
const DOBLE_TOQUE_MS = 300;
const TECHO = 600; // altura máxima de vuelo: permite ver el mapa entero desde arriba

export class Jugador {
    constructor(camara, mundo, elemento, limites) {
        this.camara = camara;
        this.mundo = mundo;
        this.el = elemento;
        this.limites = limites; // { x, z } tamaño del mundo en bloques
        this.pos = new THREE.Vector3(); // pies
        this.vel = new THREE.Vector3();
        this.yaw = 0;
        this.pitch = 0;
        this.vuela = false;
        this.enSuelo = false;
        this.corre = false;
        this.teclas = new Set();
        this.ultimoEspacio = 0;
        this.ultimoAdelante = 0;
        this.activo = false;
        this.sensibilidad = 0.0022;

        document.addEventListener('pointerlockchange', () => {
            this.activo = document.pointerLockElement === this.el;
            if (!this.activo) this.teclas.clear();
            this.alCambiarActivo && this.alCambiarActivo(this.activo);
        });
        document.addEventListener('mousemove', e => {
            if (!this.activo) return;
            this.yaw -= e.movementX * this.sensibilidad;
            this.pitch -= e.movementY * this.sensibilidad;
            this.pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.pitch));
        });
        document.addEventListener('keydown', e => this.tecla(e, true));
        document.addEventListener('keyup', e => this.tecla(e, false));
        window.addEventListener('blur', () => this.teclas.clear());
    }

    tecla(e, abajo) {
        if (!this.activo) return;
        const c = e.code;
        if (['Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft', 'ControlLeft', 'Tab'].includes(c)) e.preventDefault();
        if (abajo) {
            if (e.repeat) return;
            const ahora = performance.now();
            if (c === 'Space') {
                if (ahora - this.ultimoEspacio < DOBLE_TOQUE_MS) this.alternarVuelo();
                this.ultimoEspacio = ahora;
            }
            if (c === 'KeyW') {
                if (ahora - this.ultimoAdelante < DOBLE_TOQUE_MS) this.corre = true;
                this.ultimoAdelante = ahora;
            }
            if (c === 'ControlLeft') this.corre = true;
            this.teclas.add(c);
        } else {
            this.teclas.delete(c);
            if (c === 'KeyW' || c === 'ControlLeft') this.corre = this.teclas.has('ControlLeft');
        }
    }

    alternarVuelo() {
        this.vuela = !this.vuela;
        this.vel.y = 0;
        this.alCambiarVuelo && this.alCambiarVuelo(this.vuela);
    }

    colocar(x, y, z) {
        this.pos.set(x, y, z);
        this.vel.set(0, 0, 0);
    }

    solido(x, y, z) {
        const id = this.mundo.bloque(x, y, z);
        if (id === -1) {
            if (y < 0) return true; // nunca se sale por debajo del mundo
            if (y >= ALTO) return false;
            // Chunk sin cargar: volando se atraviesa; caminando es una pared segura
            // para no caer a través de un suelo que aún no existe.
            return !this.vuela && !this.cargadoEn(x, z);
        }
        return TIPO[id] === 1 || TIPO[id] === 2;
    }

    // ¿Está cargado el chunk que contiene el bloque (x, z)?
    cargadoEn(x, z) {
        return this.mundo.chunks.has(Math.floor(x / CHUNK) + ',' + Math.floor(z / CHUNK));
    }

    // ¿Colisiona la caja del jugador en la posición dada?
    choca(px, py, pz) {
        const r = ANCHO / 2;
        for (let y = Math.floor(py); y <= Math.floor(py + ALTURA - 0.001); y++) {
            for (let z = Math.floor(pz - r); z <= Math.floor(pz + r); z++) {
                for (let x = Math.floor(px - r); x <= Math.floor(px + r); x++) {
                    if (this.solido(x, y, z)) return true;
                }
            }
        }
        return false;
    }

    mover(dx, dy, dz) {
        const p = this.pos;
        // Volando y atrapado dentro de bloques (un chunk se cargó encima): se sale libremente
        if (this.vuela && this.choca(p.x, p.y, p.z) && p.y >= 0) { p.x += dx; p.y += dy; p.z += dz; return; }
        if (!this.choca(p.x + dx, p.y, p.z)) p.x += dx; else this.vel.x = 0;
        if (!this.choca(p.x, p.y, p.z + dz)) p.z += dz; else this.vel.z = 0;
        this.enSuelo = false;
        if (!this.choca(p.x, p.y + dy, p.z)) p.y += dy;
        else {
            if (dy < 0) {
                this.enSuelo = true;
                p.y = Math.floor(p.y + dy) + 1; // apoyar sobre el bloque
            } else p.y = Math.floor(p.y + ALTURA + dy) - ALTURA - 0.001;
            this.vel.y = 0;
        }
    }

    enAgua() {
        const id = this.mundo.bloque(this.pos.x, this.pos.y + 0.5, this.pos.z);
        return id === B.AGUA;
    }

    actualizar(dt) {
        dt = Math.min(dt, 0.05);
        const t = this.teclas;
        const adelante = (t.has('KeyW') ? 1 : 0) - (t.has('KeyS') ? 1 : 0);
        const lado = (t.has('KeyD') ? 1 : 0) - (t.has('KeyA') ? 1 : 0);
        if (!adelante) this.corre = this.corre && t.has('ControlLeft');

        const sen = Math.sin(this.yaw), cos = Math.cos(this.yaw);
        let ix = -sen * adelante + cos * lado;
        let iz = -cos * adelante - sen * lado;
        const n = Math.hypot(ix, iz);
        if (n > 0) { ix /= n; iz /= n; }

        const agua = !this.vuela && this.enAgua();
        let v = this.vuela ? (this.corre ? V_VUELO_RAPIDO : V_VUELO) : (this.corre ? V_CORRER : V_CAMINAR);
        if (agua) v *= 0.6;

        // Suavizado de la velocidad horizontal
        const k = this.vuela || !this.enSuelo ? 6 : 14;
        const a = 1 - Math.exp(-k * dt);
        this.vel.x += (ix * v - this.vel.x) * a;
        this.vel.z += (iz * v - this.vel.z) * a;

        if (this.vuela) {
            const vy = ((t.has('Space') ? 1 : 0) - (t.has('ShiftLeft') ? 1 : 0)) * (this.corre ? 14 : 9);
            this.vel.y += (vy - this.vel.y) * (1 - Math.exp(-8 * dt));
        } else if (agua) {
            this.vel.y += (-2.5 - this.vel.y) * (1 - Math.exp(-3 * dt));
            if (t.has('Space')) this.vel.y = 4;
        } else {
            if (this.cargadoEn(this.pos.x, this.pos.z)) this.vel.y -= GRAVEDAD * dt;
            else this.vel.y = 0; // congela la caída mientras el suelo no esté cargado
            if (this.vel.y < -60) this.vel.y = -60;
            if (t.has('Space') && this.enSuelo) { this.vel.y = SALTO; this.enSuelo = false; }
        }

        const pasos = Math.max(1, Math.ceil(Math.max(Math.abs(this.vel.x), Math.abs(this.vel.y), Math.abs(this.vel.z)) * dt / 0.4));
        for (let i = 0; i < pasos; i++) {
            if (this.vuela && this.noclipVuelo) {
                this.pos.x += this.vel.x * dt / pasos; this.pos.y += this.vel.y * dt / pasos; this.pos.z += this.vel.z * dt / pasos;
            } else {
                this.mover(this.vel.x * dt / pasos, this.vel.y * dt / pasos, this.vel.z * dt / pasos);
            }
        }
        if (this.vuela && this.enSuelo && !t.has('Space')) { /* se mantiene en vuelo, como Minecraft */ }

        // Límites del mundo
        const m = 2;
        this.pos.x = Math.max(m, Math.min(this.limites.x - m, this.pos.x));
        this.pos.z = Math.max(m, Math.min(this.limites.z - m, this.pos.z));
        if (this.pos.y < 0) { this.pos.y = this.vuela ? 0 : NIVEL_AGUA + 40; this.vel.y = Math.max(this.vel.y, 0); }
        if (this.pos.y > TECHO) this.pos.y = TECHO;

        this.camara.position.set(this.pos.x, this.pos.y + OJOS, this.pos.z);
        this.camara.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
    }
}
