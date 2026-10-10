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
const V_AGACHADO = 1.35, BAJA_OJOS_AGACHADO = 0.3;
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
        this.agachado = false; // Shift en el suelo: lento y sin caerse de los bordes
        this.ojos = OJOS;
        this.teclas = new Set();
        this.ultimoEspacio = 0;
        this.ultimoAdelante = 0;
        this.activo = false;
        this.sensibilidad = 0.0022;
        // Ganchos del modo online (arena): sin vuelo, sin piso en y<0, jugador congelado
        this.sinVuelo = false;
        this.congelado = false;
        this.sinMirar = false;     // escenas de la supervivencia: puntero capturado pero sin mirar ni teclas
        this.vacio = null; // { y, alCaer } cae al vacío bajo esa altura
        // Ganchos de la supervivencia (en creativo quedan sin uso)
        this.alAterrizar = null;   // fn(bloquesCaidos) al tocar suelo tras caer
        this.puedeCorrer = true;   // con poca hambre no se corre
        this.lento = 1;            // multiplicador de velocidad (comer, tensar el arco, telaraña…)
        this.empuje = new THREE.Vector3(); // retroceso al recibir un golpe (se disipa solo)
        this.yMaxAire = null;      // altura más alta desde que dejó el suelo (daño por caída)
        this.vCaminar = V_CAMINAR; // la supervivencia camina y corre un poco más rápido (main.js)
        this.vCorrer = V_CORRER;
        this.bonoCamino = 1;       // multiplicador de velocidad sobre B.CAMINO (supervivencia: 1,15)
        this.chocoLado = false;    // el último mover() pegó contra una pared (para salir del agua)
        // Salto corriendo (supervivencia): cada salto suma impulso hacia adelante hasta un tope y en el
        // aire se conserva la velocidad (como en Minecraft, saltar corriendo es más rápido que correr)
        this.impulsoSalto = 0;     // m/s que suma cada salto corriendo (0 = desactivado)
        this.topeSalto = 0;        // velocidad horizontal máxima con impulso

        document.addEventListener('pointerlockchange', () => {
            this.activo = document.pointerLockElement === this.el;
            if (!this.activo) this.teclas.clear();
            this.alCambiarActivo && this.alCambiarActivo(this.activo);
        });
        document.addEventListener('mousemove', e => {
            if (!this.activo || this.sinMirar) return;
            this.yaw -= e.movementX * this.sensibilidad;
            this.pitch -= e.movementY * this.sensibilidad;
            this.pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.pitch));
        });
        document.addEventListener('keydown', e => this.tecla(e, true));
        document.addEventListener('keyup', e => this.tecla(e, false));
        window.addEventListener('blur', () => this.teclas.clear());
    }

    tecla(e, abajo) {
        if (!this.activo || this.sinMirar) return;
        const c = e.code;
        if (['Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyR', 'ShiftLeft', 'ControlLeft', 'Tab'].includes(c)) e.preventDefault();
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
            if (c === 'ControlLeft' || c === 'KeyR') this.corre = true; // R sirve de Ctrl: Ctrl+W cierra la pestaña en el navegador
            this.teclas.add(c);
        } else {
            this.teclas.delete(c);
            if (c === 'KeyW' || c === 'ControlLeft' || c === 'KeyR') this.corre = this.teclas.has('ControlLeft') || this.teclas.has('KeyR');
        }
    }

    alternarVuelo() {
        if (this.sinVuelo) return;
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
            if (y < 0) return !this.vacio; // nunca se sale por debajo del mundo (salvo en la arena, que tiene vacío)
            if (y >= ALTO) return false;
            // Chunk sin cargar: volando se atraviesa; caminando es una pared segura
            // para no caer a través de un suelo que aún no existe.
            return !this.vuela && !this.cargadoEn(x, z);
        }
        return TIPO[id] === 1 || TIPO[id] === 2 || TIPO[id] === 6;
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
        const borde = this.agachado && this.enSuelo && this.choca(p.x, p.y - 0.5, p.z);
        if (!this.choca(p.x + dx, p.y, p.z) && !(borde && !this.choca(p.x + dx, p.y - 0.5, p.z))) p.x += dx; else { this.vel.x = 0; if (dx) this.chocoLado = true; }
        if (!this.choca(p.x, p.y, p.z + dz) && !(borde && !this.choca(p.x, p.y - 0.5, p.z + dz))) p.z += dz; else { this.vel.z = 0; if (dz) this.chocoLado = true; }
        const antes = this.enSuelo;
        this.enSuelo = false;
        if (!this.choca(p.x, p.y + dy, p.z)) p.y += dy;
        else {
            if (dy < 0) {
                this.enSuelo = true;
                p.y = Math.floor(p.y + dy) + 1; // apoyar sobre el bloque
                if (!antes && this.yMaxAire !== null && this.alAterrizar) this.alAterrizar(this.yMaxAire - p.y);
                this.yMaxAire = null;
            } else p.y = Math.floor(p.y + ALTURA + dy) - ALTURA - 0.001;
            this.vel.y = 0;
        }
    }

    // ¿Está tocando una escalera de mano? (a la altura de los pies o del cuerpo)
    enEscalera() {
        const p = this.pos;
        return this.mundo.bloque(p.x, p.y + 0.2, p.z) === B.ESCALERA || this.mundo.bloque(p.x, p.y + 1.2, p.z) === B.ESCALERA;
    }

    enLava() {
        const p = this.pos;
        return this.mundo.bloque(p.x, p.y + 0.3, p.z) === B.LAVA || this.mundo.bloque(p.x, p.y + 1.2, p.z) === B.LAVA;
    }

    enAgua() {
        const id = this.mundo.bloque(this.pos.x, this.pos.y + 0.5, this.pos.z);
        return id === B.AGUA;
    }

    actualizar(dt) {
        dt = Math.min(dt, 0.05);
        if (this.congelado) {
            this.vel.set(0, 0, 0);
            this.camara.position.set(this.pos.x, this.pos.y + OJOS, this.pos.z);
            this.camara.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
            return;
        }
        const t = this.teclas;
        const adelante = (t.has('KeyW') ? 1 : 0) - (t.has('KeyS') ? 1 : 0);
        const lado = (t.has('KeyD') ? 1 : 0) - (t.has('KeyA') ? 1 : 0);
        if (!adelante) this.corre = this.corre && (t.has('ControlLeft') || t.has('KeyR'));
        this.agachado = t.has('ShiftLeft') && !this.vuela && !this.sinAgachar;
        if (this.agachado) this.corre = false;

        const sen = Math.sin(this.yaw), cos = Math.cos(this.yaw);
        let ix = -sen * adelante + cos * lado;
        let iz = -cos * adelante - sen * lado;
        const n = Math.hypot(ix, iz);
        if (n > 0) { ix /= n; iz /= n; }

        if (!this.puedeCorrer) this.corre = false;
        const lava = !this.vuela && this.enLava();
        const agua = !this.vuela && (this.enAgua() || lava);
        const escalera = !this.vuela && this.enEscalera();
        let v = this.vuela ? (this.corre ? V_VUELO_RAPIDO : V_VUELO) : (this.agachado ? V_AGACHADO : this.corre ? this.vCorrer : this.vCaminar);
        if (agua) v *= lava ? 0.35 : 0.6;
        else if (this.bonoCamino !== 1 && this.enSuelo && !this.vuela && !escalera && this.mundo.bloque(this.pos.x, this.pos.y - 0.1, this.pos.z) === B.CAMINO) v *= this.bonoCamino;
        v *= this.lento;

        // Suavizado de la velocidad horizontal
        const k = this.vuela || !this.enSuelo ? 6 : 14;
        const a = 1 - Math.exp(-k * dt);
        const rapidez = Math.hypot(this.vel.x, this.vel.z);
        if (this.impulsoSalto && !this.enSuelo && !this.vuela && !agua && n > 0 && rapidez > v) {
            // En el aire con impulso: se conserva la rapidez (con un roce leve) y solo se dobla hacia donde se apunta
            const r = rapidez * Math.exp(-0.35 * dt);
            this.vel.x += (ix * r - this.vel.x) * a;
            this.vel.z += (iz * r - this.vel.z) * a;
        } else {
            this.vel.x += (ix * v - this.vel.x) * a;
            this.vel.z += (iz * v - this.vel.z) * a;
        }

        if (this.vuela) {
            const vy = ((t.has('Space') ? 1 : 0) - (t.has('ShiftLeft') ? 1 : 0)) * (this.corre ? 14 : 9);
            this.vel.y += (vy - this.vel.y) * (1 - Math.exp(-8 * dt));
        } else if (escalera) {
            // Escalera de mano: Espacio o avanzar contra ella sube; Shift se queda quieto; si no, baja despacio
            const sube = t.has('Space') || (adelante > 0 && (this.choca(this.pos.x + ix * 0.3, this.pos.y, this.pos.z + iz * 0.3)));
            this.vel.y = sube ? 2.4 : this.agachado ? 0 : -1.6;
            this.yMaxAire = null;
        } else if (agua) {
            this.vel.y += ((lava ? -1.2 : -2.5) - this.vel.y) * (1 - Math.exp(-3 * dt));
            if (t.has('Space')) {
                this.vel.y = lava ? 2.2 : 4;
                // Contra una orilla nadando: impulso que deja los pies sobre el borde (como Minecraft)
                if (this.chocoLado && (adelante || lado)) this.vel.y = lava ? 5 : 7;
            }
            this.yMaxAire = null;
        } else {
            if (this.cargadoEn(this.pos.x, this.pos.z)) this.vel.y -= GRAVEDAD * dt;
            else this.vel.y = 0; // congela la caída mientras el suelo no esté cargado
            if (this.vel.y < -60) this.vel.y = -60;
            if (t.has('Space') && this.enSuelo) {
                this.vel.y = SALTO; this.enSuelo = false;
                if (this.impulsoSalto && this.corre && adelante > 0) {
                    const r = Math.hypot(this.vel.x, this.vel.z) + this.impulsoSalto;
                    const tope = Math.min(r, this.topeSalto), fx = -sen, fz = -cos;
                    this.vel.x = fx * tope; this.vel.z = fz * tope;
                }
            }
        }

        // Altura máxima en el aire (daño por caída en la supervivencia)
        if (!this.vuela && !this.enSuelo && !agua && !escalera) this.yMaxAire = Math.max(this.yMaxAire ?? this.pos.y, this.pos.y);
        if (this.vuela) this.yMaxAire = null;
        // Retroceso por golpes: se suma al movimiento y se apaga en ~0,3 s
        if (this.empuje.lengthSq() > 0.0001) {
            this.vel.x += this.empuje.x; this.vel.z += this.empuje.z;
            if (this.empuje.y > 0 && this.enSuelo) { this.vel.y = Math.max(this.vel.y, this.empuje.y); this.enSuelo = false; }
            this.empuje.set(0, 0, 0);
        }
        const pasos = Math.max(1, Math.ceil(Math.max(Math.abs(this.vel.x), Math.abs(this.vel.y), Math.abs(this.vel.z)) * dt / 0.4));
        this.chocoLado = false;
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
        if (this.vacio) {
            if (this.pos.y < this.vacio.y) this.vacio.alCaer();
        } else if (this.pos.y < 0) { this.pos.y = this.vuela ? 0 : NIVEL_AGUA + 40; this.vel.y = Math.max(this.vel.y, 0); }
        if (this.pos.y > TECHO) this.pos.y = TECHO;

        this.ojos += ((this.agachado ? OJOS - BAJA_OJOS_AGACHADO : OJOS) - this.ojos) * (1 - Math.exp(-18 * dt));
        this.camara.position.set(this.pos.x, this.pos.y + this.ojos, this.pos.z);
        this.camara.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
    }
}
