// =========================================================
// VENJY · Avatares de los otros jugadores
// Cuerpo de cajas (como el jugador de Minecraft) con la piel pintada por código a
// partir del aspecto que cada jugador anuncia en Presence. Se interpola la posición
// que llega a ~15 Hz para que el movimiento se vea fluido.
// =========================================================
import * as THREE from '../../vendor/three.module.js';

const PIELES = ['#f1c8a5', '#d9a577', '#b37b52', '#8a5a3b'];
const PELOS = ['#2b1a10', '#5a3a1e', '#a8742a', '#d8c070', '#202020', '#7a2b1a'];
const CAMISAS = ['#2f6fd1', '#c0392b', '#2e9e4f', '#8e44ad', '#e08a1e', '#16a5a5', '#d0d0d0', '#d6477a'];
const PANTALONES = ['#2c3e6b', '#3a3a3a', '#5a4a2a', '#2f4f2f'];

// Aspecto compacto que se envía por la red: índices, no colores
export function aspectoDe(nombre, semilla = 0) {
    let h = 2166136261 ^ semilla;
    for (let i = 0; i < nombre.length; i++) h = Math.imul(h ^ nombre.charCodeAt(i), 16777619) >>> 0;
    const n = k => (h >>> k) % 997;
    return { p: n(0) % PIELES.length, h: n(3) % PELOS.length, c: n(7) % CAMISAS.length, l: n(11) % PANTALONES.length };
}

// Pequeño generador para que el "ruido" de la piel sea siempre igual para un aspecto
function azarDe(semilla) {
    let a = semilla >>> 0;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

function lienzo(w, h, pintar) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const x = c.getContext('2d');
    x.imageSmoothingEnabled = false;
    pintar(x, w, h);
    const t = new THREE.CanvasTexture(c);
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.NearestFilter;
    t.generateMipmaps = false;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
}

// Rellena con un color y motas de ruido, como las texturas de Minecraft
function motas(x, w, h, base, azar, fuerza = 0.1) {
    x.fillStyle = base;
    x.fillRect(0, 0, w, h);
    for (let j = 0; j < h; j++) {
        for (let i = 0; i < w; i++) {
            const r = azar();
            if (r < 0.35) { x.fillStyle = `rgba(0,0,0,${fuerza * r * 2})`; x.fillRect(i, j, 1, 1); }
            else if (r > 0.85) { x.fillStyle = `rgba(255,255,255,${fuerza * 0.6})`; x.fillRect(i, j, 1, 1); }
        }
    }
}

const cache = new Map(); // clave de aspecto -> materiales ya pintados

function materialesDe(a) {
    const clave = [a.p, a.h, a.c, a.l].join('-');
    if (cache.has(clave)) return cache.get(clave);
    const azar = azarDe(a.p * 1000 + a.h * 100 + a.c * 10 + a.l + 7);
    const piel = PIELES[a.p], pelo = PELOS[a.h], camisa = CAMISAS[a.c], pantalon = PANTALONES[a.l];
    const mat = tex => new THREE.MeshBasicMaterial({ map: tex });
    const liso = (color, f = 0.1) => mat(lienzo(8, 8, (x, w, h) => motas(x, w, h, color, azar, f)));

    const caraFrente = mat(lienzo(8, 8, (x, w, h) => {
        motas(x, w, h, piel, azar, 0.06);
        x.fillStyle = pelo; x.fillRect(0, 0, 8, 2); x.fillRect(0, 2, 1, 1); x.fillRect(7, 2, 1, 1);
        x.fillStyle = '#ffffff'; x.fillRect(1, 4, 2, 1); x.fillRect(5, 4, 2, 1);
        x.fillStyle = '#3b2a7a'; x.fillRect(2, 4, 1, 1); x.fillRect(5, 4, 1, 1);
        x.fillStyle = 'rgba(120,50,40,0.8)'; x.fillRect(3, 6, 2, 1);
    }));
    const pelito = liso(pelo, 0.2);
    const cabeza = [pelito, pelito, pelito, liso(piel, 0.06), pelito, caraFrente]; // +x -x +y -y +z -z
    const cuerpo = liso(camisa, 0.12);
    const manga = [cuerpo, cuerpo, cuerpo, liso(piel, 0.08), cuerpo, cuerpo];
    const pierna = liso(pantalon, 0.12);
    const zapato = [pierna, pierna, pierna, liso('#4a4a4a', 0.15), pierna, pierna];
    const r = { cabeza, cuerpo, manga, pierna: zapato, todos: [] };
    for (const m of [...cabeza, cuerpo, ...manga, ...zapato]) if (!r.todos.includes(m)) r.todos.push(m);
    cache.set(clave, r);
    return r;
}

function caja(ancho, alto, fondo, mats, pivoteY) {
    const g = new THREE.BoxGeometry(ancho, alto, fondo);
    g.translate(0, pivoteY, 0); // el pivote queda en el extremo de arriba (hombro, cadera, base del cuello)
    return new THREE.Mesh(g, mats);
}

export class Avatar {
    constructor(scene, id, nombre, aspecto) {
        this.scene = scene;
        this.id = id;
        this.nombre = nombre;
        const m = materialesDe(aspecto || aspectoDe(nombre));
        this.mats = m.todos;
        this.grupo = new THREE.Group();

        // Origen en los pies; el modelo mira hacia -Z como la cámara con yaw 0
        this.cuerpo = caja(0.5, 0.75, 0.25, m.cuerpo, -0.375);
        this.cuerpo.position.y = 1.5;
        this.cabeza = caja(0.5, 0.5, 0.5, m.cabeza, 0.25);
        this.cabeza.position.y = 1.5;
        this.brazoI = caja(0.25, 0.75, 0.25, m.manga, -0.375);
        this.brazoI.position.set(-0.375, 1.5, 0);
        this.brazoD = caja(0.25, 0.75, 0.25, m.manga, -0.375);
        this.brazoD.position.set(0.375, 1.5, 0);
        this.piernaI = caja(0.25, 0.75, 0.25, m.pierna, -0.375);
        this.piernaI.position.set(-0.125, 0.75, 0);
        this.piernaD = caja(0.25, 0.75, 0.25, m.pierna, -0.375);
        this.piernaD.position.set(0.125, 0.75, 0);
        this.grupo.add(this.cuerpo, this.cabeza, this.brazoI, this.brazoD, this.piernaI, this.piernaD);
        this.grupo.visible = false; // hasta recibir la primera posición
        scene.add(this.grupo);

        this.crearNombre();
        this.pos = new THREE.Vector3();
        this.objetivo = { x: 0, y: 0, z: 0, yaw: 0, pit: 0, v: 0 };
        this.yaw = 0; this.pit = 0;
        this.fase = 0; this.velocidad = 0;
        this.golpe = 0; this.vivo = true; this.recibido = false;
        this.ultimoMensaje = performance.now();
    }

    crearNombre() {
        const c = document.createElement('canvas');
        c.width = 256; c.height = 40;
        const x = c.getContext('2d');
        const dibujar = () => {
            x.clearRect(0, 0, 256, 40);
            x.font = '24px PixelCraft, monospace';
            const ancho = Math.min(248, x.measureText(this.nombre).width + 16);
            x.fillStyle = 'rgba(0,0,0,0.55)';
            x.fillRect((256 - ancho) / 2, 4, ancho, 32);
            x.fillStyle = '#ffffff';
            x.textAlign = 'center';
            x.textBaseline = 'middle';
            x.fillText(this.nombre, 128, 21);
            this.nombreTex.needsUpdate = true;
        };
        this.nombreTex = new THREE.CanvasTexture(c);
        this.nombreTex.magFilter = THREE.NearestFilter;
        this.nombreTex.colorSpace = THREE.SRGBColorSpace;
        this.sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.nombreTex, transparent: true, depthTest: false, fog: false }));
        this.sprite.scale.set(1.6, 0.25, 1);
        this.sprite.position.y = 2.2;
        this.sprite.renderOrder = 10;
        this.grupo.add(this.sprite);
        dibujar();
        try { document.fonts.load('24px PixelCraft').then(dibujar, () => {}); } catch (e) { /* sin fuentes */ }
    }

    // Llega un mensaje de posición
    recibir(m) {
        this.objetivo = { x: m.x, y: m.y, z: m.z, yaw: m.yaw, pit: m.pit, v: m.v };
        this.ultimoMensaje = performance.now();
        if (!this.recibido) {
            this.recibido = true;
            this.pos.set(m.x, m.y, m.z);
            this.yaw = m.yaw; this.pit = m.pit;
        }
    }

    ponerVivo(v) { this.vivo = v; }
    golpeado() { this.golpe = 0.25; }

    actualizar(dt, tinte, jugadorPos) {
        this.grupo.visible = this.recibido && this.vivo;
        if (!this.grupo.visible) return;
        const o = this.objetivo;
        const k = 1 - Math.exp(-14 * dt);
        const antes = this.pos.clone();
        this.pos.x += (o.x - this.pos.x) * k;
        this.pos.y += (o.y - this.pos.y) * k;
        this.pos.z += (o.z - this.pos.z) * k;
        let dy = o.yaw - this.yaw;
        dy = Math.atan2(Math.sin(dy), Math.cos(dy));
        this.yaw += dy * k;
        this.pit += (o.pit - this.pit) * k;

        const v = Math.hypot(this.pos.x - antes.x, this.pos.z - antes.z) / Math.max(dt, 1e-3);
        this.velocidad += (v - this.velocidad) * (1 - Math.exp(-10 * dt));
        const mueve = this.velocidad > 0.4 && !o.v;
        this.fase += dt * (4 + this.velocidad * 1.1);
        const amp = mueve ? Math.min(0.9, 0.35 + this.velocidad * 0.08) : 0;
        const balanceo = Math.sin(this.fase) * amp;
        this.piernaI.rotation.x = balanceo; this.piernaD.rotation.x = -balanceo;
        this.brazoI.rotation.x = -balanceo; this.brazoD.rotation.x = balanceo;
        if (o.v) { this.piernaI.rotation.x = 0.15; this.piernaD.rotation.x = -0.1; this.brazoI.rotation.x = 0.1; this.brazoD.rotation.x = -0.1; }

        this.grupo.position.copy(this.pos);
        this.grupo.rotation.y = this.yaw;
        this.cabeza.rotation.x = this.pit;

        // Tinte del día y destello rojo al ser golpeado
        if (this.golpe > 0) this.golpe -= dt;
        for (const m of this.mats) {
            if (this.golpe > 0) m.color.setRGB(1, 0.35, 0.35); else m.color.copy(tinte);
        }
        // El nombre se achica un poco con la distancia para no tapar la pantalla
        if (jugadorPos) {
            const d = Math.hypot(jugadorPos.x - this.pos.x, jugadorPos.y - this.pos.y, jugadorPos.z - this.pos.z);
            const s = Math.max(1, Math.min(4, d / 14));
            this.sprite.scale.set(1.6 * s, 0.25 * s, 1);
        }
    }

    // Caja de golpe aproximada (para el combate)
    get centro() { return new THREE.Vector3(this.pos.x, this.pos.y + 0.9, this.pos.z); }

    quitar() {
        this.scene.remove(this.grupo);
        this.sprite.material.map.dispose();
        this.sprite.material.dispose();
        for (const mesh of [this.cuerpo, this.cabeza, this.brazoI, this.brazoD, this.piernaI, this.piernaD]) mesh.geometry.dispose();
    }
}

export class Avatares {
    constructor(scene, materiales) {
        this.scene = scene;
        this.materiales = materiales;
        this.lista = new Map();
    }
    agregar(id, nombre, aspecto) {
        if (this.lista.has(id)) { this.lista.get(id).nombre = nombre; return this.lista.get(id); }
        const a = new Avatar(this.scene, id, nombre, aspecto);
        this.lista.set(id, a);
        return a;
    }
    quitar(id) {
        const a = this.lista.get(id);
        if (a) { a.quitar(); this.lista.delete(id); }
    }
    limpiar() { for (const id of [...this.lista.keys()]) this.quitar(id); }
    actualizar(dt, jugadorPos) {
        const tinte = this.materiales.solido.color;
        for (const a of this.lista.values()) a.actualizar(dt, tinte, jugadorPos);
    }
}
